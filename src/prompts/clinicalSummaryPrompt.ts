import type { McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod';

const argsSchema = z.object({
  patient_summary: z.string().describe('Brief patient case summary'),
  variants: z.string().optional().describe('Known variants, comma-separated'),
  medications: z.string().optional().describe('Current medications, comma-separated'),
  focus: z.string().optional().describe('Specific focus area (e.g. oncology, anticoagulation)'),
});

export function registerClinicalSummaryPrompt(server: McpServer): void {
  server.registerPrompt(
    'clinical_summary_template',
    {
      title: 'Clinical Genomics Summary Template',
      description:
        'Template for generating an integrated clinical genomics and pharmacogenomics summary.',
      argsSchema,
    },
    async ({ patient_summary, variants, medications, focus }) => ({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Generate an integrated clinical genomics summary.

Patient: ${patient_summary}
${variants ? `Variants: ${variants}` : ''}
${medications ? `Medications: ${medications}` : ''}
${focus ? `Focus: ${focus}` : ''}

Use genomics_clinical_summary with structured patient_genetic_data and current_medications.
Include:
- Disease risk findings from ClinVar
- Pharmacogenetic findings and drug risks
- Immediate actions and medication reviews
- Clear medical disclaimer`,
          },
        },
      ],
    }),
  );
}
