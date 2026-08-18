import type { McpServer } from '@modelcontextprotocol/server';
import { STATIC_RESOURCE_TTL_MS } from '../../server/createServer.js';

const TestingIndications = {
  "cancer_risk": {
    "strong_indicators": [
      "Multiple first-degree relatives with same cancer type",
      "Cancer diagnosed at unusually young age (<50 for breast, <40 for colon)",
      "Multiple primary cancers in same individual",
      "Rare cancer types (male breast cancer, ovarian cancer)",
      "Known pathogenic variant in family"
    ],
    "genes_to_consider": ["BRCA1", "BRCA2", "TP53", "PTEN", "MLH1", "MSH2", "MSH6", "APC"],
    "testing_type": "Multi-gene cancer panel",
    "follow_up": "Genetic counseling essential"
  },
  "pre_medication": {
    "warfarin": {
      "consider_testing": "Initiation of warfarin therapy",
      "genes": ["CYP2C9", "VKORC1"],
      "benefit": "Reduced bleeding risk, faster achievement of therapeutic INR",
      "strength": "Optional but recommended by FDA/CPIC"
    },
    "clopidogrel": {
      "consider_testing": "Post-PCI or ACS",
      "genes": ["CYP2C19"],
      "benefit": "Identify patients needing alternative antiplatelet",
      "strength": "Consider for high-risk patients"
    },
    "chemotherapy": {
      "consider_testing": "Before starting azathioprine, 5-FU, irinotecan",
      "genes": ["TPMT", "DPYD", "UGT1A1"],
      "benefit": "Prevent severe/life-threatening toxicity",
      "strength": "Strongly recommended"
    }
  },
  "carrier_screening": {
    "preconception": {
      "indications": "Planning pregnancy, especially if consanguinity or ethnic risk",
      "common_conditions": ["Cystic Fibrosis", "Sickle Cell", "Tay-Sachs", "Fragile X"],
      "genes": ["CFTR", "HBB", "HEXA", "FMR1"],
      "timing": "Before or early in pregnancy"
    }
  },
  "unexplained_symptoms": {
    "drug_toxicity": {
      "scenario": "Unexpected severe side effects from medication",
      "consider": "Pharmacogenetic testing for relevant genes",
      "examples": "Severe myopathy on standard statin dose → SLCO1B1"
    },
    "treatment_failure": {
      "scenario": "Drug not working despite adequate dosing/compliance",
      "consider": "Metabolizer status testing",
      "examples": "Clopidogrel resistance → CYP2C19 PM"
    }
  }
};

export function registerTestingIndications(server: McpServer) {
  server.registerResource(
    "testing-indications",
    "genomics://testing-indications",
    {
      title: "Genetic Testing Indications",
      description: "When to consider genetic testing based on clinical scenario.",
      mimeType: 'application/json',
      cacheHint: { ttlMs: STATIC_RESOURCE_TTL_MS, cacheScope: 'public' }
    },
    async () => ({
      contents: [{
        uri: "genomics://testing-indications",
        text: JSON.stringify(TestingIndications, null, 2),
        mimeType: "application/json"
      }]
    })
  );
}

