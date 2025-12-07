import { z } from 'zod';

// ===== SHARED SUB-SCHEMAS =====

export const GenomicLocationSchema = z.object({
  chr: z.string().describe('Chromosome number/letter ("1"-"22", "X", "Y", "MT")'),
  start: z.number().int().positive().describe('Start position (1-based)'),
  end: z.number().int().positive().describe('End position (1-based, inclusive)'),
  build: z.enum(['GRCh37', 'GRCh38']).describe('Genome build'),
});

export const GenePositionSchema = z.object({
  gene: z.string().describe('HGNC gene symbol (uppercase)'),
  position: z.string().describe('Coding position or protein change (e.g., "c.3101_3102del")'),
});

export const PatientGenotypeSchema = z.object({
  gene: z.string().describe('Gene symbol'),
  genotype: z.string().describe('Allele pair notation (e.g., "*1/*3", "TT")'),
});

export const CurrentDoseSchema = z.object({
  value: z.number().positive().describe('Numeric dose value'),
  unit: z.string().describe('Unit (e.g., "mg", "mcg")'),
  frequency: z.string().describe('Frequency (e.g., "daily", "twice daily")'),
});

// ===== TOOL INPUT SCHEMAS =====

// Tool 1: clinvar_get_variant_info
export const ClinvarGetVariantInfoSchema = z.object({
  gene_symbol: z.string().optional().describe('HGNC gene symbol (uppercase). Mutually exclusive with others.'),
  rs_id: z.string().regex(/^rs\d+$/, 'Must start with "rs" followed by digits').optional().describe('dbSNP reference SNP ID'),
  genomic_location: GenomicLocationSchema.optional().describe('Genomic coordinates'),
  hgvs: z.string().optional().describe('HGVS notation'),
  clinvar_id: z.string().regex(/^(VCV|RCV)\d+$/, 'Must start with VCV or RCV followed by digits').optional().describe('ClinVar accession ID'),
  pathogenicity_filter: z.enum(['pathogenic', 'likely_pathogenic', 'benign', 'likely_benign', 'uncertain', 'all']).optional().default('all').describe('Filter results by clinical significance'),
  limit: z.number().int().min(1).max(100).optional().default(10).describe('Maximum number of results'),
  response_format: z.enum(['concise', 'detailed']).optional().default('concise'),
});

// Tool 2: clinvar_check_pathogenicity
export const ClinvarCheckPathogenicitySchema = z.object({
  variant_id: z.string().optional().describe('ClinVar accession ID (VCV/RCV)'),
  gene_position: GenePositionSchema.optional().describe('Gene and position combo'),
  confidence_threshold: z.enum(['high', 'medium', 'any']).optional().default('any').describe('Minimum confidence level for assertions'),
  response_format: z.enum(['concise', 'detailed']).optional().default('concise'),
});

// Tool 3: clinvar_find_variants_in_region
export const ClinvarFindVariantsInRegionSchema = z.object({
  chromosome: z.string().describe('Chromosome identifier'),
  start_position: z.number().int().positive().describe('Region start (1-based, inclusive)'),
  end_position: z.number().int().positive().describe('Region end (1-based, inclusive)'),
  genome_build: z.enum(['GRCh37', 'GRCh38']).describe('Genome build'),
  pathogenicity_filter: z.enum(['pathogenic_only', 'benign_only', 'uncertain_only', 'all']).optional().default('all'),
  consequence_filter: z.array(z.string()).optional().describe('Filter by molecular consequence type'),
  max_results: z.number().int().min(1).max(200).optional().default(50),
  sort_by: z.enum(['clinical_importance', 'position', 'gene']).optional().default('clinical_importance'),
  response_format: z.enum(['concise', 'detailed']).optional().default('concise'),
});

// Tool 4: pharmgkb_get_drug_gene_interactions
export const PharmgkbGetDrugGeneInteractionsSchema = z.object({
  drug_name: z.string().optional().describe('Common or chemical drug name'),
  rxcui: z.string().optional().describe('RxNorm Concept Unique Identifier'),
  evidence_level_filter: z.enum(['1A_only', '1A_and_1B', '2A_and_above', 'all']).optional().default('all'),
  interaction_type_filter: z.array(z.string()).optional().describe('Filter by interaction type (dosage, toxicity, efficacy)'),
  gene_filter: z.array(z.string()).optional().describe('Limit to specific genes'),
  response_format: z.enum(['concise', 'detailed']).optional().default('concise'),
});

// Tool 5: pharmgkb_check_patient_drug_risk
export const PharmgkbCheckPatientDrugRiskSchema = z.object({
  drug_name: z.string().optional().describe('Drug name'),
  rxcui: z.string().optional().describe('RxNorm code'),
  patient_genotypes: z.array(PatientGenotypeSchema).min(1).describe('List of gene-genotype pairs'),
  current_dose: CurrentDoseSchema.optional().describe('Current dosage information'),
  response_format: z.enum(['concise', 'detailed']).optional().default('concise'),
});

// Tool 6: pharmgkb_get_gene_drug_pairs
export const PharmgkbGetGeneDrugPairsSchema = z.object({
  gene_symbol: z.string().optional().describe('HGNC gene symbol'),
  variant: z.string().optional().describe('Specific variant or allele (e.g. rsID, *3)'),
  genotype: z.string().optional().describe('Specific genotype combination. Requires gene_symbol.'),
  drug_class_filter: z.array(z.string()).optional().describe('Filter by drug therapeutic class'),
  evidence_level_filter: z.enum(['1A_only', '1A_and_1B', '2A_and_above', 'all']).optional().default('2A_and_above'),
  clinical_actionability_filter: z.enum(['actionable_only', 'all']).optional().default('all'),
  response_format: z.enum(['concise', 'detailed']).optional().default('concise'),
});

// Tool 7: genomics_clinical_summary
export const GenomicsClinicalSummarySchema = z.object({
  patient_genetic_data: z.object({
    variants: z.array(z.object({
      gene: z.string().optional(),
      variant: z.string().optional(),
      position: z.string().optional(),
    })).optional(),
    genotypes: z.array(PatientGenotypeSchema).optional(),
    raw_vcf: z.string().optional(),
  }).describe('Patient genetic information'),
  current_medications: z.array(z.string()).optional().describe('List of current medications'),
  clinical_context: z.string().optional().describe('Clinical context or question'),
  focus_areas: z.array(z.string()).optional().describe('Specific areas to emphasize'),
  include_carrier_status: z.boolean().optional().default(false),
  pathogenicity_threshold: z.enum(['pathogenic_only', 'likely_pathogenic', 'uncertain_and_above']).optional().default('likely_pathogenic'),
  response_format: z.enum(['concise', 'detailed']).optional().default('concise'),
});

// ===== TYPE DEFINITIONS =====

export type ClinvarGetVariantInfoInput = z.infer<typeof ClinvarGetVariantInfoSchema>;
export type ClinvarCheckPathogenicityInput = z.infer<typeof ClinvarCheckPathogenicitySchema>;
export type ClinvarFindVariantsInRegionInput = z.infer<typeof ClinvarFindVariantsInRegionSchema>;
export type PharmgkbGetDrugGeneInteractionsInput = z.infer<typeof PharmgkbGetDrugGeneInteractionsSchema>;
export type PharmgkbCheckPatientDrugRiskInput = z.infer<typeof PharmgkbCheckPatientDrugRiskSchema>;
export type PharmgkbGetGeneDrugPairsInput = z.infer<typeof PharmgkbGetGeneDrugPairsSchema>;
export type GenomicsClinicalSummaryInput = z.infer<typeof GenomicsClinicalSummarySchema>;

