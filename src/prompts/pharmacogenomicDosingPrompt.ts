import { completable, type McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod';
import { COMMON_DRUGS, filterPrefix } from '../completions/index.js';

const argsSchema = z.object({
  drug_name: completable(z.string().describe('Medication name'), (value) =>
    filterPrefix(COMMON_DRUGS, value ?? ''),
  ),
  patient_genotypes: z
    .string()
    .describe('Comma-separated gene:genotype pairs, e.g. CYP2C9:*1/*3, VKORC1:GA'),
  clinical_question: z
    .string()
    .optional()
    .describe('Specific dosing or safety question'),
});

export function registerPharmacogenomicDosingPrompt(server: McpServer): void {
  server.registerPrompt(
    'pharmacogenomic_dosing_review',
    {
      title: 'Pharmacogenomic Dosing Review',
      description:
        'CPIC-oriented review of drug dosing and safety based on patient pharmacogenotypes.',
      argsSchema,
    },
    async ({ drug_name, patient_genotypes, clinical_question }) => ({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Review pharmacogenomic implications for ${drug_name}.
Patient genotypes: ${patient_genotypes}
${clinical_question ? `Question: ${clinical_question}` : ''}

Steps:
1. Call pharmgkb_get_drug_gene_interactions for ${drug_name}.
2. Parse CPIC/DPWG/FDA label recommendations.
3. Call pharmgkb_check_patient_drug_risk with parsed genotypes.
4. Summarize risk level, actionable genes, and dosing recommendations.
5. Note evidence levels and whether confirmatory testing is needed.`,
          },
        },
      ],
    }),
  );
}
