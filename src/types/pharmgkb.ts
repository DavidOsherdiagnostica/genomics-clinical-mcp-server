/**
 * PharmGKB InfoButton Parser - TypeScript Types
 * Structured types for parsing PharmGKB HTML responses
 */

/**
 * Clinical dosing guideline from CPIC, DPWG, etc.
 */
export interface Guideline {
  title: string;
  url: string;
  summary?: string;
  source?: string;  // CPIC, DPWG, CPNDS, AHA, RNPGx, etc.
}

/**
 * FDA or regulatory drug label with PGx information
 */
export interface DrugLabel {
  title: string;
  url: string;
  alerts: string[];
  testingLevel?: 'Required' | 'Recommended' | 'Actionable' | 'Informative';
}

/**
 * Effect of a specific genotype/variant on drug response
 */
export interface GenotypeEffect {
  variant: string;  // e.g., "*1", "*2", "AA", "rs123456"
  effect: string;   // Clinical description
}

/**
 * Clinical annotation linking variant to drug effect
 */
export interface ClinicalAnnotation {
  title: string;
  url: string;
  evidenceLevel: string;  // Level 1A, Level 1B, Level 2A, Level 2B, Level 3, Level 4
  type: string;           // Dosage, Toxicity, Efficacy, Metabolism/PK
  genes: string[];
  variant?: string;       // Main variant (e.g., "rs9923231")
  genotypeEffects: GenotypeEffect[];
}

/**
 * Complete parsed response from PharmGKB InfoButton
 */
export interface PharmGKBResponse {
  drugName?: string | undefined;
  hasData: boolean;
  guidelines: Guideline[];
  labels: DrugLabel[];
  annotations: ClinicalAnnotation[];
  summary: {
    totalGuidelines: number;
    totalLabels: number;
    totalAnnotations: number;
    genesAffected: string[];
    testingRecommended: boolean;
  };
}

