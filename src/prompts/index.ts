import { registerVariantInterpretationPrompt } from './variantInterpretationPrompt.js';
import { registerPharmacogenomicDosingPrompt } from './pharmacogenomicDosingPrompt.js';
import { registerClinicalSummaryPrompt } from './clinicalSummaryPrompt.js';
import type { McpServer } from '@modelcontextprotocol/server';

export function registerGenomicsPrompts(server: McpServer): void {
  registerVariantInterpretationPrompt(server);
  registerPharmacogenomicDosingPrompt(server);
  registerClinicalSummaryPrompt(server);
}
