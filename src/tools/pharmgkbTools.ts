import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { 
  PharmgkbGetDrugGeneInteractionsSchema, PharmgkbGetDrugGeneInteractionsInput,
  PharmgkbCheckPatientDrugRiskSchema, PharmgkbCheckPatientDrugRiskInput,
  PharmgkbGetGeneDrugPairsSchema, PharmgkbGetGeneDrugPairsInput
} from "../types/genomics.js";
import { pharmGKBService } from "../services/pharmgkbService.js";
import { validateRxcui } from "../utils/genomicsValidators.js";
import { getResponseFormatter } from "../services/responseFormatter.js";
import { createComprehensiveErrorResponse, classifyError } from "../utils/errorHandler.js";

export function registerPharmGKBTools(server: McpServer): void {
  const formatter = getResponseFormatter();

  // Tool 4: pharmgkb_get_drug_gene_interactions
  server.registerTool(
    "pharmgkb_get_drug_gene_interactions",
    {
      title: "PharmGKB Drug-Gene Interactions",
      description: "Get comprehensive pharmacogenomic information for a drug.",
      inputSchema: PharmgkbGetDrugGeneInteractionsSchema.shape,
    },
    async (input: PharmgkbGetDrugGeneInteractionsInput) => {
      try {
        if (input.rxcui) validateRxcui(input.rxcui);
        
        const criteria: { drugName?: string; rxcui?: string } = {};
        if (input.drug_name) criteria.drugName = input.drug_name;
        if (input.rxcui) criteria.rxcui = input.rxcui;
        
        const data = await pharmGKBService.getDrugGeneInteractions(criteria);

        // Return structured data with all parsed information
        if (input.response_format === 'concise') {
          return formatter.formatGenericToolResponse({
            status: "success",
            drug: data.drugName,
            has_data: data.hasData,
            summary: {
              total_guidelines: data.summary.totalGuidelines,
              total_labels: data.summary.totalLabels,
              genes_affected: data.summary.genesAffected,
              testing_required: data.summary.testingRecommended
            },
            key_guidelines: data.guidelines.map(g => ({
              source: g.source,
              title: g.title,
              url: g.url
            })),
            fda_warnings: data.labels.filter(l => l.testingLevel === 'Required' || l.testingLevel === 'Recommended')
              .map(l => ({
                title: l.title,
                testing_level: l.testingLevel,
                alerts: l.alerts
              }))
          });
        } else {
          // detailed format - return everything
          return formatter.formatGenericToolResponse({
            status: "success",
            drug: data.drugName,
            has_data: data.hasData,
            summary: data.summary,
            guidelines: data.guidelines,
            labels: data.labels,
            annotations: data.annotations
          });
        }

      } catch (error) {
        return createComprehensiveErrorResponse(classifyError(error), null, { toolName: "pharmgkb_get_drug_gene_interactions", userInput: input });
      }
    }
  );

  // Tool 5: pharmgkb_check_patient_drug_risk
  server.registerTool(
    "pharmgkb_check_patient_drug_risk",
    {
        title: "PharmGKB Patient Drug Risk",
        description: "Assess drug safety and dosing for a patient with known genotypes.",
        inputSchema: PharmgkbCheckPatientDrugRiskSchema.shape,
    },
    async (input: PharmgkbCheckPatientDrugRiskInput) => {
        try {
            // 1. Get generic interactions
            const criteria: { drugName?: string; rxcui?: string } = {};
            if (input.drug_name) criteria.drugName = input.drug_name;
            if (input.rxcui) criteria.rxcui = input.rxcui;

            const data = await pharmGKBService.getDrugGeneInteractions(criteria);

            // Now we have structured data - let's match patient genotypes
            if (!data.hasData) {
              return formatter.formatGenericToolResponse({
                status: "no_data",
                message: `No pharmacogenomic data found for ${input.drug_name || input.rxcui}`,
                patient_genotypes: input.patient_genotypes,
                drug: {
                  name: input.drug_name,
                  rxcui: input.rxcui
                }
              });
            }

            // Extract genes from annotations - genes are already parsed correctly!
            const relevantGenes = new Set<string>();
            data.annotations.forEach(ann => {
              // Use the properly parsed genes array from each annotation
              ann.genes.forEach(gene => relevantGenes.add(gene));
            });
            // Also add genes from summary
            data.summary.genesAffected.forEach(gene => relevantGenes.add(gene));

            // Match patient genotypes with drug data
            const matchedGenes: Array<{
              gene: string;
              patient_genotype: string;
              relevant_annotations: Array<{ title: string; effect: string; evidence_level: string }>;
              relevant_guidelines: Array<{ source?: string; title: string; url: string }>;
              fda_labels: Array<{ title: string; testing_level?: string }>;
            }> = [];

            input.patient_genotypes.forEach(pg => {
              if (relevantGenes.has(pg.gene)) {
                // Find annotations that include this patient's gene
                const relevantAnnotations = data.annotations
                  .filter(ann => ann.genes.includes(pg.gene))
                  .map(ann => {
                    // Try to find the patient's genotype in the effects table
                    // Extract allele from genotype (e.g., "*1/*3" -> check for "*1" and "*3")
                    const alleles = pg.genotype.split('/').map(a => a.trim());
                    const matchedEffect = ann.genotypeEffects.find(ge => 
                      alleles.some(allele => ge.variant === allele || ge.variant.includes(allele))
                    );
                    
                    return {
                      title: ann.title,
                      effect: matchedEffect?.effect || 
                              ann.genotypeEffects[0]?.effect || 
                              "See annotation for details",
                      evidence_level: ann.evidenceLevel,
                      matched_allele: matchedEffect?.variant
                    };
                  });

                const relevantGuidelines = data.guidelines.filter(g => {
                  const drugNameToCheck = input.drug_name || data.drugName || '';
                  return g.title.toLowerCase().includes(pg.gene.toLowerCase()) || 
                         g.title.toLowerCase().includes(drugNameToCheck.toLowerCase());
                });

                const fdaLabels = data.labels.filter(l => 
                  l.testingLevel === 'Required' || l.testingLevel === 'Recommended'
                );

                matchedGenes.push({
                  gene: pg.gene,
                  patient_genotype: pg.genotype,
                  relevant_annotations: relevantAnnotations,
                  relevant_guidelines: relevantGuidelines,
                  fda_labels: fdaLabels
                });
              }
            });

            // Assess overall risk
            let riskLevel: 'high' | 'moderate' | 'low' | 'normal' = 'normal';
            const warnings: string[] = [];

            if (data.labels.some(l => l.testingLevel === 'Required')) {
              riskLevel = 'high';
              warnings.push('FDA requires genetic testing for this drug');
            } else if (data.labels.some(l => l.testingLevel === 'Recommended')) {
              riskLevel = 'moderate';
              warnings.push('FDA recommends genetic testing for this drug');
            }

            if (matchedGenes.length > 0) {
              warnings.push(`Patient has genotypes in ${matchedGenes.length} pharmacogene(s) relevant to this drug`);
            }

            return formatter.formatGenericToolResponse({
              status: "success",
              risk_level: riskLevel,
              patient_genotypes: input.patient_genotypes,
              drug: {
                name: input.drug_name || data.drugName,
                rxcui: input.rxcui
              },
              matched_genes: matchedGenes,
              warnings: warnings,
              recommendation: matchedGenes.length > 0 
                ? "Review guidelines and annotations for patient-specific dosing recommendations"
                : "No direct genotype matches found, but review general guidelines",
              summary: data.summary
            });

        } catch (error) {
            return createComprehensiveErrorResponse(classifyError(error), null, { toolName: "pharmgkb_check_patient_drug_risk", userInput: input });
        }
    }
  );

  // Tool 6: pharmgkb_get_gene_drug_pairs
  server.registerTool(
    "pharmgkb_get_gene_drug_pairs",
    {
        title: "PharmGKB Gene-Drug Pairs",
        description: "Find all drugs affected by a specific gene or genetic variant.",
        inputSchema: PharmgkbGetGeneDrugPairsSchema.shape,
    },
    async (input: PharmgkbGetGeneDrugPairsInput) => {
        // Note: The generic Infobutton API is Drug-centric. 
        // A gene-centric search typically requires a different API endpoint or scraping.
        // For this template, we will return a "not implemented" or a mock response 
        // explaining the limitation of the Infobutton API for this specific reverse-lookup query
        // unless we want to implement a broader search.
        
        return formatter.formatGenericToolResponse({
            status: "partial_success",
            message: "The current PharmGKB Infobutton integration is drug-centric. Gene-centric lookup requires full API access or database dump.",
            query: input
        });
    }
  );
}

