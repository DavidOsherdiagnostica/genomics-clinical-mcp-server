import type { McpServer } from '@modelcontextprotocol/server';
import {
  ClinvarGetVariantInfoSchema,
  ClinvarCheckPathogenicitySchema,
  ClinvarFindVariantsInRegionSchema,
} from '../types/genomics.js';
import { clinVarService } from '../services/clinvarService.js';
import { validateGeneSymbol, validateRsid, validateHgvs, validateGenomicLocation } from '../utils/genomicsValidators.js';
import {
  classifySignificance,
  mapClinVarRecord,
  matchesConsequenceFilter,
  matchesPathogenicityFilter,
  matchesRegionPathogenicityFilter,
  meetsConfidenceThreshold,
  getConfidenceLevel,
  sortClinVarRecords,
} from '../utils/clinvarHelpers.js';
import { formatToolResponse } from '../services/responseFormatter.js';
import { createComprehensiveErrorResponse, classifyError } from '../utils/errorHandler.js';

const READ_ONLY = { readOnlyHint: true as const, destructiveHint: false as const, openWorldHint: true as const };

export function registerClinVarTools(server: McpServer): void {
  server.registerTool(
    'clinvar_get_variant_info',
    {
      title: 'ClinVar Variant Info',
      description:
        'Search ClinVar for genetic variants and retrieve clinical significance, disease associations, and genomic details.',
      inputSchema: ClinvarGetVariantInfoSchema,
      annotations: READ_ONLY,
    },
    async (input) => {
      const started = Date.now();
      try {
        let searchTerm = '';

        if (input.clinvar_id) {
          searchTerm = input.clinvar_id;
        } else if (input.gene_symbol) {
          const gene = validateGeneSymbol(input.gene_symbol);
          searchTerm = `${gene}[gene]`;
        } else if (input.rs_id) {
          searchTerm = validateRsid(input.rs_id);
        } else if (input.genomic_location) {
          const { chr, start, end, build } = input.genomic_location;
          validateGenomicLocation(chr, start, end, build);
          const buildNum = build === 'GRCh37' ? '37' : '38';
          searchTerm = `${chr}[chr] AND ${start}:${end}[chrpos${buildNum}]`;
        } else if (input.hgvs) {
          searchTerm = validateHgvs(input.hgvs);
        } else {
          throw new Error('Must provide one of: gene_symbol, rs_id, genomic_location, hgvs, or clinvar_id');
        }

        const ids = await clinVarService.searchVariants(searchTerm, input.limit);
        if (ids.length === 0) {
          return formatToolResponse(
            { status: 'not_found', message: 'No variants found for query', query: searchTerm },
            { queryStartTime: started },
          );
        }

        const rawResults = await clinVarService.getVariantSummary(ids);
        const detailed = input.response_format === 'detailed';
        const mapped = rawResults.map((record) => mapClinVarRecord(record, detailed));
        const filteredVariants = mapped.filter((variant) =>
          matchesPathogenicityFilter(variant.significance, input.pathogenicity_filter ?? 'all'),
        );

        return formatToolResponse(
          {
            status: 'success',
            total_found: ids.length,
            count_returned: filteredVariants.length,
            variants: filteredVariants.map((variant) => ({
              id: variant.uid,
              accession: variant.accession,
              title: variant.title,
              gene: variant.gene,
              clinical_significance: variant.significance,
              review_status: variant.review_status,
              molecular_consequences: variant.consequences,
              position: variant.position,
              diseases: variant.diseases,
              raw: detailed ? variant.raw : undefined,
            })),
          },
          { detailed, queryStartTime: started },
        );
      } catch (error) {
        return createComprehensiveErrorResponse(classifyError(error), null, {
          toolName: 'clinvar_get_variant_info',
          userInput: input,
        });
      }
    },
  );

  server.registerTool(
    'clinvar_check_pathogenicity',
    {
      title: 'ClinVar Pathogenicity Check',
      description: 'Quick pathogenicity check for a specific variant.',
      inputSchema: ClinvarCheckPathogenicitySchema,
      annotations: READ_ONLY,
    },
    async (input) => {
      try {
        let searchTerm = '';
        if (input.variant_id) {
          searchTerm = input.variant_id;
        } else if (input.gene_position) {
          const gene = validateGeneSymbol(input.gene_position.gene);
          searchTerm = `${gene}[gene] AND ${input.gene_position.position}`;
        } else {
          throw new Error('Must provide variant_id or gene_position');
        }

        const ids = await clinVarService.searchVariants(searchTerm, 1);
        if (ids.length === 0) {
          return formatToolResponse({ status: 'not_found' });
        }

        const results = await clinVarService.getVariantSummary(ids);
        const variant = mapClinVarRecord(results[0], input.response_format === 'detailed');
        const classification = classifySignificance(variant.significance);
        const confidence = getConfidenceLevel(variant.review_status);
        const meetsThreshold = meetsConfidenceThreshold(variant.review_status, input.confidence_threshold ?? 'any');

        const response = {
          status: 'success' as const,
          variant_id: variant.uid,
          accession: variant.accession,
          classification,
          raw_significance: variant.significance,
          review_status: variant.review_status,
          confidence_level: confidence,
          meets_confidence_threshold: meetsThreshold,
          molecular_consequences: variant.consequences,
          recommendation: meetsThreshold
            ? classification === 'PATHOGENIC'
              ? 'Consider clinical action according to guidelines.'
              : 'Routine follow-up.'
            : `Classification reported as "${variant.significance}" but review status "${variant.review_status ?? 'unknown'}" does not meet ${input.confidence_threshold} confidence threshold. Interpret cautiously.`,
          raw: input.response_format === 'detailed' ? variant.raw : undefined,
        };

        return formatToolResponse(response, { detailed: input.response_format === 'detailed' });
      } catch (error) {
        return createComprehensiveErrorResponse(classifyError(error), null, {
          toolName: 'clinvar_check_pathogenicity',
          userInput: input,
        });
      }
    },
  );

  server.registerTool(
    'clinvar_find_variants_in_region',
    {
      title: 'ClinVar Region Search',
      description: 'Scan a genomic region for all known variants and their clinical significance.',
      inputSchema: ClinvarFindVariantsInRegionSchema,
      annotations: READ_ONLY,
    },
    async (input) => {
      try {
        validateGenomicLocation(input.chromosome, input.start_position, input.end_position, input.genome_build);

        const buildNum = input.genome_build === 'GRCh37' ? '37' : '38';
        const term = `${input.chromosome}[chr] AND ${input.start_position}:${input.end_position}[chrpos${buildNum}]`;

        const ids = await clinVarService.searchVariants(term, input.max_results);
        const results = await clinVarService.getVariantSummary(ids);
        const detailed = input.response_format === 'detailed';

        const mapped = results
          .map((record) => mapClinVarRecord(record, detailed))
          .filter((variant) => matchesRegionPathogenicityFilter(variant.significance, input.pathogenicity_filter ?? 'all'))
          .filter((variant) => matchesConsequenceFilter(variant.consequences, input.consequence_filter));

        const sorted = sortClinVarRecords(mapped, input.sort_by ?? 'clinical_importance');

        let pathogenic = 0;
        let benign = 0;
        let uncertain = 0;
        const genes = new Set<string>();

        for (const variant of sorted) {
          const sig = variant.significance.toLowerCase();
          if (sig.includes('pathogenic') && !sig.includes('benign')) pathogenic++;
          else if (sig.includes('benign')) benign++;
          else uncertain++;
          if (variant.gene) genes.add(variant.gene);
        }

        const variants = sorted.map((variant) => ({
          id: variant.uid,
          gene: variant.gene,
          position: variant.position,
          significance: variant.significance,
          molecular_consequences: variant.consequences,
          diseases: variant.diseases,
          review_status: detailed ? variant.review_status : undefined,
          raw: detailed ? variant.raw : undefined,
        }));

        return formatToolResponse(
          {
            status: 'success',
            region: { ...input },
            filters_applied: {
              pathogenicity: input.pathogenicity_filter,
              consequences: input.consequence_filter,
              sort_by: input.sort_by,
            },
            summary: {
              total_variants: variants.length,
              pathogenic,
              benign,
              uncertain,
              genes_affected: Array.from(genes),
            },
            variants:
              input.response_format === 'concise'
                ? variants.map((variant) => ({
                    id: variant.id,
                    gene: variant.gene,
                    position: variant.position,
                    significance: variant.significance,
                  }))
                : variants,
          },
          { detailed },
        );
      } catch (error) {
        return createComprehensiveErrorResponse(classifyError(error), null, {
          toolName: 'clinvar_find_variants_in_region',
          userInput: input,
        });
      }
    },
  );
}
