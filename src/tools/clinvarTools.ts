import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { 
  ClinvarGetVariantInfoSchema, ClinvarGetVariantInfoInput,
  ClinvarCheckPathogenicitySchema, ClinvarCheckPathogenicityInput,
  ClinvarFindVariantsInRegionSchema, ClinvarFindVariantsInRegionInput
} from "../types/genomics.js";
import { clinVarService } from "../services/clinvarService.js";
import { validateGeneSymbol, validateRsid, validateHgvs, validateGenomicLocation } from "../utils/genomicsValidators.js";
import { getResponseFormatter } from "../services/responseFormatter.js";
import { createComprehensiveErrorResponse, classifyError } from "../utils/errorHandler.js";

export function registerClinVarTools(server: McpServer): void {
  const formatter = getResponseFormatter();

  // Tool 1: clinvar_get_variant_info
  server.registerTool(
    "clinvar_get_variant_info",
    {
      title: "ClinVar Variant Info",
      description: "Search ClinVar for genetic variants and retrieve clinical significance, disease associations, and genomic details.",
      inputSchema: ClinvarGetVariantInfoSchema.shape,
    },
    async (input: ClinvarGetVariantInfoInput) => {
      try {
        let searchTerm = "";

        // Determine search term based on input
        if (input.clinvar_id) {
            searchTerm = input.clinvar_id; // Will use direct ID lookup logic if we implemented it, but esearch works too
        } else if (input.gene_symbol) {
            const gene = validateGeneSymbol(input.gene_symbol);
            searchTerm = `${gene}[gene]`;
        } else if (input.rs_id) {
            const rsid = validateRsid(input.rs_id);
            searchTerm = rsid;
        } else if (input.genomic_location) {
            const { chr, start, end, build } = input.genomic_location;
            validateGenomicLocation(chr, start, end, build);
            const buildNum = build === 'GRCh37' ? '37' : '38';
            searchTerm = `${chr}[chr] AND ${start}:${end}[chrpos${buildNum}]`;
        } else if (input.hgvs) {
            const hgvs = validateHgvs(input.hgvs);
            searchTerm = hgvs;
        } else {
            throw new Error("Must provide one of: gene_symbol, rs_id, genomic_location, hgvs, or clinvar_id");
        }

        // 1. Search
        const ids = await clinVarService.searchVariants(searchTerm, input.limit);

        if (ids.length === 0) {
            return formatter.formatGenericToolResponse({
                status: "not_found",
                message: "No variants found for query",
                query: searchTerm
            });
        }

        // 2. Summary
        const rawResults = await clinVarService.getVariantSummary(ids);

        // 3. Process & Filter
        const variants = rawResults.map(r => {
            const germline = r.germline_classification || {};
            return {
                id: r.uid,
                accession: r.accession,
                title: r.title,
                gene: r.genes?.[0]?.symbol,
                clinical_significance: germline.description || "Uncertain significance",
                review_status: germline.review_status || "no assertion criteria provided",
                last_evaluated: germline.last_evaluated,
                diseases: r.germline_classification?.trait_set?.map((t: any) => t.trait_name) || [],
                raw: input.response_format === 'detailed' ? r : undefined
            };
        });

        // Filter by pathogenicity if requested
        let filteredVariants = variants;
        if (input.pathogenicity_filter !== 'all') {
            filteredVariants = variants.filter(v => 
                v.clinical_significance.toLowerCase().includes(input.pathogenicity_filter!.replace('_', ' '))
            );
        }

        return formatter.formatGenericToolResponse({
            status: "success",
            total_found: ids.length,
            count_returned: filteredVariants.length,
            variants: filteredVariants
        });

      } catch (error) {
        return createComprehensiveErrorResponse(classifyError(error), null, { toolName: "clinvar_get_variant_info", userInput: input });
      }
    }
  );

  // Tool 2: clinvar_check_pathogenicity
  server.registerTool(
    "clinvar_check_pathogenicity",
    {
      title: "ClinVar Pathogenicity Check",
      description: "Quick pathogenicity check for a specific variant.",
      inputSchema: ClinvarCheckPathogenicitySchema.shape,
    },
    async (input: ClinvarCheckPathogenicityInput) => {
        try {
            let searchTerm = "";
            if (input.variant_id) {
                searchTerm = input.variant_id;
            } else if (input.gene_position) {
                const gene = validateGeneSymbol(input.gene_position.gene);
                searchTerm = `${gene}[gene] AND ${input.gene_position.position}`;
            } else {
                throw new Error("Must provide variant_id or gene_position");
            }

            const ids = await clinVarService.searchVariants(searchTerm, 1);
            if (ids.length === 0) {
                return formatter.formatGenericToolResponse({ status: "not_found" });
            }

            const results = await clinVarService.getVariantSummary(ids);
            const variant = results[0];
            const sig = variant.germline_classification?.description || "Uncertain";

            // Simplify classification
            let classification = "UNCERTAIN";
            if (sig.toLowerCase().includes("pathogenic")) classification = "PATHOGENIC";
            else if (sig.toLowerCase().includes("benign")) classification = "BENIGN";

            return formatter.formatGenericToolResponse({
                status: "success",
                variant_id: variant.uid,
                classification,
                raw_significance: sig,
                review_status: variant.germline_classification?.review_status,
                recommendation: classification === "PATHOGENIC" ? "Consider clinical action according to guidelines." : "Routine follow-up."
            });

        } catch (error) {
            return createComprehensiveErrorResponse(classifyError(error), null, { toolName: "clinvar_check_pathogenicity", userInput: input });
        }
    }
  );

  // Tool 3: clinvar_find_variants_in_region
  server.registerTool(
    "clinvar_find_variants_in_region",
    {
        title: "ClinVar Region Search",
        description: "Scan a genomic region for all known variants and their clinical significance.",
        inputSchema: ClinvarFindVariantsInRegionSchema.shape,
    },
    async (input: ClinvarFindVariantsInRegionInput) => {
        try {
            validateGenomicLocation(input.chromosome, input.start_position, input.end_position, input.genome_build);
            
            const buildNum = input.genome_build === 'GRCh37' ? '37' : '38';
            const term = `${input.chromosome}[chr] AND ${input.start_position}:${input.end_position}[chrpos${buildNum}]`;

            const ids = await clinVarService.searchVariants(term, input.max_results);
            const results = await clinVarService.getVariantSummary(ids);

            // Calculate summary stats
            let pathogenic = 0, benign = 0, uncertain = 0;
            const genes = new Set<string>();

            const variants = results.map(r => {
                const sig = r.germline_classification?.description || "Uncertain";
                if (sig.toLowerCase().includes("pathogenic")) pathogenic++;
                else if (sig.toLowerCase().includes("benign")) benign++;
                else uncertain++;

                if (r.genes?.[0]?.symbol) genes.add(r.genes[0].symbol);

                return {
                    id: r.uid,
                    gene: r.genes?.[0]?.symbol,
                    significance: sig,
                    diseases: r.germline_classification?.trait_set?.map((t: any) => t.trait_name) || []
                };
            });

            return formatter.formatGenericToolResponse({
                status: "success",
                region: { ...input },
                summary: {
                    total_variants: variants.length,
                    pathogenic,
                    benign,
                    uncertain,
                    genes_affected: Array.from(genes)
                },
                variants: input.response_format === 'concise' ? variants.map(v => ({ id: v.id, gene: v.gene, significance: v.significance })) : variants
            });

        } catch (error) {
            return createComprehensiveErrorResponse(classifyError(error), null, { toolName: "clinvar_find_variants_in_region", userInput: input });
        }
    }
  );
}

