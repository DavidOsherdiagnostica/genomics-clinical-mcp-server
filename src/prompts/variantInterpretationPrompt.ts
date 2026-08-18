import { completable, type McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod';
import { COMMON_GENES, filterPrefix } from '../completions/index.js';

const argsSchema = z.object({
  gene_symbol: completable(z.string().describe('HGNC gene symbol'), (value) =>
    filterPrefix(COMMON_GENES, value ?? ''),
  ),
  variant_notation: z.string().describe('Variant in HGVS, rsID, or ClinVar ID format'),
  clinical_context: z.string().optional().describe('Relevant clinical context or indication'),
});

export function registerVariantInterpretationPrompt(server: McpServer): void {
  server.registerPrompt(
    'variant_interpretation_workflow',
    {
      title: 'Variant Interpretation Workflow',
      description:
        'Structured ACMG-style workflow for interpreting a genetic variant using ClinVar and reference resources.',
      argsSchema,
    },
    async ({ gene_symbol, variant_notation, clinical_context }) => ({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Guide me through variant interpretation for ${gene_symbol} variant ${variant_notation}.
${clinical_context ? `Clinical context: ${clinical_context}` : ''}

Use this workflow:
1. Validate nomenclature and genome build assumptions.
2. Query ClinVar with clinvar_get_variant_info or clinvar_check_pathogenicity.
3. Assess pathogenicity class, review status, and disease associations.
4. Cross-check gene-disease-map and pathogenicity-guide resources.
5. Summarize clinical significance, uncertainty, and recommended follow-up testing.
6. Include medical disclaimer: not a substitute for genetic counseling.`,
          },
        },
      ],
    }),
  );
}
