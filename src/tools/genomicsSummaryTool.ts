import type { McpServer } from '@modelcontextprotocol/server';
import { GenomicsClinicalSummarySchema } from '../types/genomics.js';
import { clinVarService } from '../services/clinvarService.js';
import { pharmGKBService } from '../services/pharmgkbService.js';
import { mapClinVarRecord, matchesPathogenicityThreshold } from '../utils/clinvarHelpers.js';
import { parseVcfContent } from '../utils/vcfParser.js';
import { filterByFocusAreas } from '../utils/focusAreas.js';
import { formatToolResponse } from '../services/responseFormatter.js';
import { createComprehensiveErrorResponse, classifyError } from '../utils/errorHandler.js';

const READ_ONLY = { readOnlyHint: true as const, destructiveHint: false as const, openWorldHint: true as const };

interface DrugRiskFinding {
  medication: string;
  status: string;
  risk_level?: 'high' | 'moderate' | 'low';
  matched_patient_genotypes?: string[];
  guidelines_available?: number;
  warnings?: string[];
  genes_affected?: string[];
  drug_name?: string;
  message?: string;
}

interface VariantFinding {
  variant: string;
  gene?: string;
  classification?: string;
  diseases: string[];
  review_status?: string;
  carrier_status?: string;
  zygosity?: string;
  meets_pathogenicity_threshold: boolean;
  source: 'explicit_variant' | 'vcf';
}

export function registerGenomicsSummaryTool(server: McpServer): void {
  server.registerTool(
    'genomics_clinical_summary',
    {
      title: 'Genomics Clinical Summary',
      description:
        'Generate comprehensive clinical summary integrating genetic variant data with pharmacogenomic implications.',
      inputSchema: GenomicsClinicalSummarySchema,
      annotations: READ_ONLY,
    },
    async (input) => {
      try {
        const findings: VariantFinding[] = [];
        const drugRisks: DrugRiskFinding[] = [];
        const threshold = input.pathogenicity_threshold ?? 'likely_pathogenic';
        const parsedVcfVariants = input.patient_genetic_data.raw_vcf
          ? parseVcfContent(input.patient_genetic_data.raw_vcf, 25)
          : [];

        const variantInputs: Array<{
          term: string;
          gene?: string;
          carrier_status?: string;
          zygosity?: string;
          source: 'explicit_variant' | 'vcf';
        }> = [];

        for (const variant of input.patient_genetic_data.variants ?? []) {
          let term = '';
          if (variant.variant) term = variant.variant;
          else if (variant.gene && variant.position) term = `${variant.gene}[gene] AND ${variant.position}`;

          if (term) {
            variantInputs.push({
              term,
              source: 'explicit_variant',
              ...(variant.gene ? { gene: variant.gene } : {}),
            });
          }
        }

        if (parsedVcfVariants.length > 0) {
          for (const parsed of parsedVcfVariants) {
            variantInputs.push({
              term: parsed.search_term,
              zygosity: parsed.zygosity,
              source: 'vcf',
              ...(input.include_carrier_status
                ? {
                    carrier_status: parsed.is_carrier
                      ? 'carrier'
                      : parsed.zygosity === 'homozygous_alt'
                        ? 'affected/homozygous'
                        : 'non-carrier',
                  }
                : {}),
            });
          }
        }

        for (const variantInput of variantInputs) {
          try {
            const ids = await clinVarService.searchVariants(variantInput.term, 1);
            if (ids.length === 0) continue;

            const details = await clinVarService.getVariantSummary(ids);
            const mapped = mapClinVarRecord(details[0], input.response_format === 'detailed');
            const meetsThreshold = matchesPathogenicityThreshold(mapped.significance, threshold);

            if (!meetsThreshold) continue;

            const resolvedGene = mapped.gene ?? variantInput.gene;
            findings.push({
              variant: variantInput.term,
              classification: mapped.significance,
              diseases: mapped.diseases,
              meets_pathogenicity_threshold: meetsThreshold,
              source: variantInput.source,
              ...(resolvedGene ? { gene: resolvedGene } : {}),
              ...(mapped.review_status ? { review_status: mapped.review_status } : {}),
              ...(variantInput.carrier_status ? { carrier_status: variantInput.carrier_status } : {}),
              ...(variantInput.zygosity ? { zygosity: variantInput.zygosity } : {}),
            });
          } catch {
            // Continue with remaining variants
          }
        }

        if (input.current_medications) {
          for (const med of input.current_medications) {
            try {
              const data = await pharmGKBService.getDrugGeneInteractions({ drugName: med });

              if (!data.hasData) {
                drugRisks.push({
                  medication: med,
                  status: 'no_data',
                  message: 'No pharmacogenomic data available',
                });
                continue;
              }

              const relevantGenes = new Set<string>();
              data.annotations.forEach((ann) => ann.genes.forEach((gene) => relevantGenes.add(gene)));
              data.summary.genesAffected.forEach((gene) => relevantGenes.add(gene));

              const matchedGenes: string[] = [];
              input.patient_genetic_data.genotypes?.forEach((pg) => {
                if (relevantGenes.has(pg.gene)) {
                  matchedGenes.push(`${pg.gene}:${pg.genotype}`);
                }
              });

              let riskLevel: 'high' | 'moderate' | 'low' = 'low';
              const warnings: string[] = [];

              if (data.labels.some((l) => l.testingLevel === 'Required')) {
                riskLevel = 'high';
                warnings.push('FDA requires genetic testing');
              } else if (data.labels.some((l) => l.testingLevel === 'Recommended')) {
                riskLevel = 'moderate';
                warnings.push('FDA recommends genetic testing');
              }

              drugRisks.push({
                medication: med,
                status: 'analyzed',
                risk_level: riskLevel,
                matched_patient_genotypes: matchedGenes,
                guidelines_available: data.summary.totalGuidelines,
                warnings,
                genes_affected: Array.from(relevantGenes),
                drug_name: data.drugName || med,
              });
            } catch {
              drugRisks.push({
                medication: med,
                status: 'error',
                message: 'Failed to retrieve pharmacogenomic data',
              });
            }
          }
        }

        const focusedFindings = filterByFocusAreas(findings, input.focus_areas, [
          'variant',
          'gene',
          'classification',
          'diseases',
        ]);
        const focusedDrugRisks = filterByFocusAreas(drugRisks, input.focus_areas, [
          'medication',
          'drug_name',
          'genes_affected',
          'warnings',
        ]);

        const diseaseFindings = input.focus_areas?.length ? focusedFindings : findings;
        const pharmacogeneticFindings = input.focus_areas?.length ? focusedDrugRisks : drugRisks;

        return formatToolResponse(
          {
            status: 'success',
            clinical_context: input.clinical_context,
            filters_applied: {
              pathogenicity_threshold: threshold,
              focus_areas: input.focus_areas,
              include_carrier_status: input.include_carrier_status,
              vcf_provided: Boolean(input.patient_genetic_data.raw_vcf),
            },
            executive_summary: `Found ${findings.length} clinically relevant variants (threshold: ${threshold}) and analyzed ${drugRisks.length} medications for pharmacogenomic interactions.`,
            disease_risk_findings: diseaseFindings,
            pharmacogenetic_findings: pharmacogeneticFindings,
            clinical_action_plan: {
              immediate_actions: [
                ...diseaseFindings
                  .filter((finding) => finding.classification?.toLowerCase().includes('pathogenic'))
                  .map(
                    (finding) =>
                      `Consult genetics for ${finding.variant} (${finding.classification}${finding.carrier_status ? `, ${finding.carrier_status}` : ''})`,
                  ),
                ...pharmacogeneticFindings
                  .filter((drug) => drug.risk_level === 'high')
                  .map((drug) => `URGENT: Review ${drug.medication} - FDA requires genetic testing`),
              ],
              medication_reviews: pharmacogeneticFindings
                .filter((drug) => Array.isArray(drug.matched_patient_genotypes) && drug.matched_patient_genotypes.length > 0)
                .map(
                  (drug) =>
                    `Review ${drug.medication} dosing - patient has relevant genotypes: ${(drug.matched_patient_genotypes as string[]).join(', ')}`,
                ),
            },
            summary_statistics: {
              total_variants_analyzed:
                (input.patient_genetic_data.variants?.length ?? 0) + parsedVcfVariants.length,
              pathogenic_variants_found: findings.filter((finding) =>
                finding.classification?.toLowerCase().includes('pathogenic'),
              ).length,
              carrier_variants_found: findings.filter((finding) => finding.carrier_status === 'carrier').length,
              medications_analyzed: input.current_medications?.length || 0,
              high_risk_medications: drugRisks.filter((drug) => drug.risk_level === 'high').length,
            },
          },
          { detailed: input.response_format === 'detailed' },
        );
      } catch (error) {
        return createComprehensiveErrorResponse(classifyError(error), null, {
          toolName: 'genomics_clinical_summary',
          userInput: input,
        });
      }
    },
  );
}
