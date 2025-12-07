import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { GenomicsClinicalSummarySchema, GenomicsClinicalSummaryInput } from "../types/genomics.js";
import { clinVarService } from "../services/clinvarService.js";
import { pharmGKBService } from "../services/pharmgkbService.js";
import { getResponseFormatter } from "../services/responseFormatter.js";
import { createComprehensiveErrorResponse, classifyError } from "../utils/errorHandler.js";

export function registerGenomicsSummaryTool(server: McpServer): void {
  const formatter = getResponseFormatter();

  server.registerTool(
    "genomics_clinical_summary",
    {
      title: "Genomics Clinical Summary",
      description: "Generate comprehensive clinical summary integrating genetic variant data with pharmacogenomic implications.",
      inputSchema: GenomicsClinicalSummarySchema.shape,
    },
    async (input: GenomicsClinicalSummaryInput) => {
      try {
        const findings: any[] = [];
        const drugRisks: any[] = [];

        // 1. Analyze Disease Risk (ClinVar)
        if (input.patient_genetic_data.variants) {
            for (const v of input.patient_genetic_data.variants) {
                let term = "";
                if (v.variant) term = v.variant;
                else if (v.gene && v.position) term = `${v.gene}[gene] AND ${v.position}`;
                
                if (term) {
                    try {
                        const ids = await clinVarService.searchVariants(term, 1);
                        if (ids.length > 0) {
                            const details = await clinVarService.getVariantSummary(ids);
                            findings.push({
                                variant: term,
                                classification: details[0].germline_classification?.description,
                                diseases: details[0].germline_classification?.trait_set?.map((t: any) => t.trait_name) || []
                            });
                        }
                    } catch (e) {
                        // Log but continue
                        console.error(`Failed to analyze variant ${term}`, e);
                    }
                }
            }
        }

        // 2. Analyze Pharmacogenetics (PharmGKB)
        if (input.current_medications) {
            for (const med of input.current_medications) {
                try {
                    const data = await pharmGKBService.getDrugGeneInteractions({ drugName: med });
                    
                    if (!data.hasData) {
                        drugRisks.push({
                            medication: med,
                            status: "no_data",
                            message: "No pharmacogenomic data available"
                        });
                        continue;
                    }

                    // Match patient genotypes with drug's pharmacogenes
                    // Use properly parsed genes from annotations and summary
                    const relevantGenes = new Set<string>();
                    data.annotations.forEach(ann => {
                        ann.genes.forEach(gene => relevantGenes.add(gene));
                    });
                    // Also use genes from summary
                    data.summary.genesAffected.forEach(gene => relevantGenes.add(gene));

                    const matchedGenes: string[] = [];
                    if (input.patient_genetic_data.genotypes) {
                        input.patient_genetic_data.genotypes.forEach(pg => {
                            if (relevantGenes.has(pg.gene)) {
                                matchedGenes.push(`${pg.gene}:${pg.genotype}`);
                            }
                        });
                    }

                    // Assess risk level
                    let riskLevel: 'high' | 'moderate' | 'low' = 'low';
                    const warnings: string[] = [];

                    if (data.labels.some(l => l.testingLevel === 'Required')) {
                        riskLevel = 'high';
                        warnings.push('FDA requires genetic testing');
                    } else if (data.labels.some(l => l.testingLevel === 'Recommended')) {
                        riskLevel = 'moderate';
                        warnings.push('FDA recommends genetic testing');
                    }

                    drugRisks.push({
                        medication: med,
                        status: "analyzed",
                        risk_level: riskLevel,
                        matched_patient_genotypes: matchedGenes,
                        guidelines_available: data.summary.totalGuidelines,
                        fda_labels: data.labels.filter(l => 
                            l.testingLevel === 'Required' || l.testingLevel === 'Recommended'
                        ).map(l => l.title),
                        warnings: warnings,
                        genes_affected: Array.from(relevantGenes),
                        drug_name: data.drugName || med
                    });

                } catch (e) {
                     console.error(`Failed to analyze medication ${med}`, e);
                     drugRisks.push({
                         medication: med,
                         status: "error",
                         message: "Failed to retrieve pharmacogenomic data"
                     });
                }
            }
        }

        return formatter.formatGenericToolResponse({
            status: "success",
            executive_summary: `Found ${findings.length} variants with clinical significance and analyzed ${drugRisks.length} medications for pharmacogenomic interactions.`,
            disease_risk_findings: findings,
            pharmacogenetic_findings: drugRisks,
            clinical_action_plan: {
                immediate_actions: [
                    ...findings.filter(f => f.classification?.toLowerCase().includes('pathogenic'))
                        .map(f => `Consult genetics for ${f.variant} (${f.classification})`),
                    ...drugRisks.filter(d => d.risk_level === 'high')
                        .map(d => `URGENT: Review ${d.medication} - FDA requires genetic testing`)
                ],
                medication_reviews: drugRisks
                    .filter(d => d.matched_patient_genotypes && d.matched_patient_genotypes.length > 0)
                    .map(d => `Review ${d.medication} dosing - patient has relevant genotypes: ${d.matched_patient_genotypes.join(', ')}`),
                follow_up: [
                    ...drugRisks.filter(d => d.risk_level === 'moderate')
                        .map(d => `Consider genetic testing before continuing ${d.medication}`)
                ]
            },
            summary_statistics: {
                total_variants_analyzed: input.patient_genetic_data.variants?.length || 0,
                pathogenic_variants_found: findings.filter(f => 
                    f.classification?.toLowerCase().includes('pathogenic')
                ).length,
                medications_analyzed: input.current_medications?.length || 0,
                high_risk_medications: drugRisks.filter(d => d.risk_level === 'high').length,
                moderate_risk_medications: drugRisks.filter(d => d.risk_level === 'moderate').length,
                patient_genotypes_matched: drugRisks.reduce((sum, d) => 
                    sum + (d.matched_patient_genotypes?.length || 0), 0
                )
            }
        });

      } catch (error) {
        return createComprehensiveErrorResponse(classifyError(error), null, { toolName: "genomics_clinical_summary", userInput: input });
      }
    }
  );
}

