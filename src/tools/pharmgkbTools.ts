import type { McpServer } from '@modelcontextprotocol/server';
import {
  PharmgkbGetDrugGeneInteractionsSchema,
  PharmgkbCheckPatientDrugRiskSchema,
  PharmgkbGetGeneDrugPairsSchema,
} from '../types/genomics.js';
import { pharmGKBService } from '../services/pharmgkbService.js';
import { validateRxcui, validateGeneSymbol } from '../utils/genomicsValidators.js';
import { formatToolResponse } from '../services/responseFormatter.js';
import { createComprehensiveErrorResponse, classifyError } from '../utils/errorHandler.js';
import {
  bestEvidenceLevel,
  filterPharmGKBResponse,
} from '../utils/pharmgkbFilters.js';

const READ_ONLY = { readOnlyHint: true as const, destructiveHint: false as const, openWorldHint: true as const };

export function registerPharmGKBTools(server: McpServer): void {
  server.registerTool(
    'pharmgkb_get_drug_gene_interactions',
    {
      title: 'PharmGKB Drug-Gene Interactions',
      description: 'Get comprehensive pharmacogenomic information for a drug.',
      inputSchema: PharmgkbGetDrugGeneInteractionsSchema,
      annotations: READ_ONLY,
    },
    async (input) => {
      try {
        if (input.rxcui) validateRxcui(input.rxcui);

        const criteria: { drugName?: string; rxcui?: string } = {};
        if (input.drug_name) criteria.drugName = input.drug_name;
        if (input.rxcui) criteria.rxcui = input.rxcui;

        const rawData = await pharmGKBService.getDrugGeneInteractions(criteria);
        const data = filterPharmGKBResponse(rawData, {
          evidenceLevelFilter: input.evidence_level_filter,
          ...(input.interaction_type_filter ? { interactionTypeFilter: input.interaction_type_filter } : {}),
          ...(input.gene_filter ? { geneFilter: input.gene_filter } : {}),
        });

        if (input.response_format === 'concise') {
          return formatToolResponse({
            status: 'success',
            drug: data.drugName,
            has_data: data.hasData,
            filters_applied: {
              evidence_level: input.evidence_level_filter,
              interaction_types: input.interaction_type_filter,
              genes: input.gene_filter,
            },
            summary: {
              total_guidelines: data.summary.totalGuidelines,
              total_labels: data.summary.totalLabels,
              genes_affected: data.summary.genesAffected,
              testing_required: data.summary.testingRecommended,
              annotations_after_filter: data.summary.totalAnnotations,
            },
            key_guidelines: data.guidelines.map((g) => ({
              source: g.source,
              title: g.title,
              url: g.url,
            })),
            key_annotations: data.annotations.slice(0, 10).map((ann) => ({
              title: ann.title,
              evidence_level: ann.evidenceLevel,
              type: ann.type,
              genes: ann.genes,
            })),
            fda_warnings: data.labels
              .filter((l) => l.testingLevel === 'Required' || l.testingLevel === 'Recommended')
              .map((l) => ({
                title: l.title,
                testing_level: l.testingLevel,
                alerts: l.alerts,
              })),
          });
        }

        return formatToolResponse(
          {
            status: 'success',
            drug: data.drugName,
            has_data: data.hasData,
            filters_applied: {
              evidence_level: input.evidence_level_filter,
              interaction_types: input.interaction_type_filter,
              genes: input.gene_filter,
            },
            summary: data.summary,
            guidelines: data.guidelines,
            labels: data.labels,
            annotations: data.annotations,
          },
          { detailed: true },
        );
      } catch (error) {
        return createComprehensiveErrorResponse(classifyError(error), null, {
          toolName: 'pharmgkb_get_drug_gene_interactions',
          userInput: input,
        });
      }
    },
  );

  server.registerTool(
    'pharmgkb_check_patient_drug_risk',
    {
      title: 'PharmGKB Patient Drug Risk',
      description: 'Assess drug safety and dosing for a patient with known genotypes.',
      inputSchema: PharmgkbCheckPatientDrugRiskSchema,
      annotations: READ_ONLY,
    },
    async (input) => {
      try {
        const criteria: { drugName?: string; rxcui?: string } = {};
        if (input.drug_name) criteria.drugName = input.drug_name;
        if (input.rxcui) criteria.rxcui = input.rxcui;

        const data = await pharmGKBService.getDrugGeneInteractions(criteria);

        if (!data.hasData) {
          return formatToolResponse({
            status: 'no_data',
            message: `No pharmacogenomic data found for ${input.drug_name || input.rxcui}`,
            patient_genotypes: input.patient_genotypes,
            drug: { name: input.drug_name, rxcui: input.rxcui },
          });
        }

        const relevantGenes = new Set<string>();
        data.annotations.forEach((ann) => ann.genes.forEach((gene) => relevantGenes.add(gene)));
        data.summary.genesAffected.forEach((gene) => relevantGenes.add(gene));

        const matchedGenes: Array<{
          gene: string;
          patient_genotype: string;
          relevant_annotations: Array<{ title: string; effect: string; evidence_level: string }>;
          relevant_guidelines: Array<{ source?: string; title: string; url: string }>;
          fda_labels: Array<{ title: string; testing_level?: string }>;
        }> = [];

        input.patient_genotypes.forEach((pg) => {
          if (!relevantGenes.has(pg.gene)) return;

          const relevantAnnotations = data.annotations
            .filter((ann) => ann.genes.includes(pg.gene))
            .map((ann) => {
              const alleles = pg.genotype.split('/').map((a) => a.trim());
              const matchedEffect = ann.genotypeEffects.find((ge) =>
                alleles.some((allele) => ge.variant === allele || ge.variant.includes(allele)),
              );

              return {
                title: ann.title,
                effect: matchedEffect?.effect || ann.genotypeEffects[0]?.effect || 'See annotation for details',
                evidence_level: ann.evidenceLevel,
              };
            });

          matchedGenes.push({
            gene: pg.gene,
            patient_genotype: pg.genotype,
            relevant_annotations: relevantAnnotations,
            relevant_guidelines: data.guidelines.filter((g) =>
              g.title.toLowerCase().includes(pg.gene.toLowerCase()),
            ),
            fda_labels: data.labels.filter(
              (l) => l.testingLevel === 'Required' || l.testingLevel === 'Recommended',
            ),
          });
        });

        let riskLevel: 'high' | 'moderate' | 'low' | 'normal' = 'normal';
        const warnings: string[] = [];

        if (data.labels.some((l) => l.testingLevel === 'Required')) {
          riskLevel = 'high';
          warnings.push('FDA requires genetic testing for this drug');
        } else if (data.labels.some((l) => l.testingLevel === 'Recommended')) {
          riskLevel = 'moderate';
          warnings.push('FDA recommends genetic testing for this drug');
        }

        if (matchedGenes.length > 0) {
          warnings.push(`Patient has genotypes in ${matchedGenes.length} pharmacogene(s) relevant to this drug`);
        }

        return formatToolResponse({
          status: 'success',
          risk_level: riskLevel,
          patient_genotypes: input.patient_genotypes,
          drug: { name: input.drug_name || data.drugName, rxcui: input.rxcui },
          matched_genes: matchedGenes,
          warnings,
          recommendation:
            matchedGenes.length > 0
              ? 'Review guidelines and annotations for patient-specific dosing recommendations'
              : 'No direct genotype matches found, but review general guidelines',
          summary: data.summary,
        });
      } catch (error) {
        return createComprehensiveErrorResponse(classifyError(error), null, {
          toolName: 'pharmgkb_check_patient_drug_risk',
          userInput: input,
        });
      }
    },
  );

  server.registerTool(
    'pharmgkb_get_gene_drug_pairs',
    {
      title: 'PharmGKB Gene-Drug Pairs',
      description: 'Find all drugs affected by a specific gene or genetic variant.',
      inputSchema: PharmgkbGetGeneDrugPairsSchema,
      annotations: READ_ONLY,
    },
    async (input) => {
      try {
        if (!input.gene_symbol) {
          throw new Error('gene_symbol is required for gene-centric drug lookup');
        }

        const gene = validateGeneSymbol(input.gene_symbol);
        const geneMatches = await pharmGKBService.searchGene(gene);

        if (geneMatches.length === 0) {
          return formatToolResponse({
            status: 'not_found',
            message: `No ClinPGx gene record found for ${gene}`,
            gene_symbol: gene,
          });
        }

        const pairs = await pharmGKBService.getGeneDrugPairs({
          geneSymbol: gene,
          ...(input.variant ? { variant: input.variant } : {}),
          ...(input.genotype ? { genotype: input.genotype } : {}),
          evidenceLevelFilter: input.evidence_level_filter,
          ...(input.drug_class_filter ? { drugClassFilter: input.drug_class_filter } : {}),
          clinicalActionabilityFilter: input.clinical_actionability_filter,
        });

        if (pairs.length === 0) {
          return formatToolResponse({
            status: 'success',
            gene_symbol: gene,
            variant: input.variant,
            genotype: input.genotype,
            total_drugs: 0,
            message: 'No drugs matched the requested filters for this gene',
            filters_applied: {
              evidence_level: input.evidence_level_filter,
              drug_classes: input.drug_class_filter,
              clinical_actionability: input.clinical_actionability_filter,
            },
            drugs: [],
          });
        }

        const conciseDrugs = pairs.map((pair) => ({
          id: pair.drugId,
          name: pair.drugName,
          best_evidence_level: bestEvidenceLevel(pair.evidenceLevels),
          interaction_types: pair.interactionTypes,
          actionable: pair.actionable,
        }));

        const detailedPairs = await Promise.all(
          pairs.slice(0, 10).map(async (pair) => {
            try {
              const interaction = await pharmGKBService.getDrugGeneInteractions({ drugName: pair.drugName });
              const filtered = filterPharmGKBResponse(interaction, {
                evidenceLevelFilter: input.evidence_level_filter,
                geneFilter: [gene],
              });
              return {
                drug_id: pair.drugId,
                drug_name: pair.drugName,
                best_evidence_level: bestEvidenceLevel(pair.evidenceLevels),
                interaction_types: pair.interactionTypes,
                has_guideline: pair.hasGuideline,
                has_label: pair.hasLabel,
                actionable: pair.actionable,
                sources: pair.sources,
                genes_affected: filtered.summary.genesAffected,
                guidelines: filtered.guidelines.length,
                evidence_summary: filtered.summary,
              };
            } catch {
              return {
                drug_id: pair.drugId,
                drug_name: pair.drugName,
                best_evidence_level: bestEvidenceLevel(pair.evidenceLevels),
                interaction_types: pair.interactionTypes,
                has_guideline: pair.hasGuideline,
                has_label: pair.hasLabel,
                actionable: pair.actionable,
                sources: pair.sources,
                genes_affected: [gene],
                guidelines: 0,
              };
            }
          }),
        );

        return formatToolResponse(
          {
            status: 'success',
            gene_symbol: gene,
            variant: input.variant,
            genotype: input.genotype,
            total_drugs: pairs.length,
            filters_applied: {
              evidence_level: input.evidence_level_filter,
              drug_classes: input.drug_class_filter,
              clinical_actionability: input.clinical_actionability_filter,
            },
            drugs: input.response_format === 'concise' ? conciseDrugs : detailedPairs,
          },
          { detailed: input.response_format === 'detailed' },
        );
      } catch (error) {
        return createComprehensiveErrorResponse(classifyError(error), null, {
          toolName: 'pharmgkb_get_gene_drug_pairs',
          userInput: input,
        });
      }
    },
  );
}
