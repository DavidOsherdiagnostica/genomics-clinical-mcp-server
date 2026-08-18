import type { McpServer } from '@modelcontextprotocol/server';
import { STATIC_RESOURCE_TTL_MS } from '../../server/createServer.js';

const GeneDiseaseMap = {
  "BRCA1": {
    "primary_diseases": ["Hereditary Breast Cancer", "Hereditary Ovarian Cancer"],
    "inheritance": "Autosomal Dominant",
    "penetrance": "High (45-85% lifetime risk)",
    "omim_ids": ["114480", "604370"],
    "screening_recommendations": "Annual MRI starting age 25-30, consider prophylactic surgery"
  },
  "BRCA2": {
    "primary_diseases": ["Hereditary Breast Cancer", "Hereditary Ovarian Cancer", "Pancreatic Cancer"],
    "inheritance": "Autosomal Dominant",
    "penetrance": "High (40-80% lifetime risk)",
    "omim_ids": ["600185", "612555"],
    "screening_recommendations": "Annual MRI starting age 25-30, pancreatic screening if family history"
  },
  "CFTR": {
    "primary_diseases": ["Cystic Fibrosis"],
    "inheritance": "Autosomal Recessive",
    "penetrance": "Complete (if two pathogenic variants)",
    "omim_ids": ["219700"],
    "screening_recommendations": "Carrier screening recommended for couples planning pregnancy"
  },
  "TP53": {
    "primary_diseases": ["Li-Fraumeni Syndrome", "Multiple Cancers"],
    "inheritance": "Autosomal Dominant",
    "penetrance": "Very High (>90% lifetime cancer risk)",
    "omim_ids": ["151623"],
    "screening_recommendations": "Annual whole body MRI, frequent cancer screening protocols"
  },
  "APOE": {
    "primary_diseases": ["Alzheimer Disease (risk factor)", "Cardiovascular Disease"],
    "inheritance": "Complex/Polygenic",
    "penetrance": "Variable (e4 allele increases risk 3-15x)",
    "omim_ids": ["104300"],
    "screening_recommendations": "Not routinely screened, risk factor not deterministic"
  },
  "FMR1": {
    "primary_diseases": ["Fragile X Syndrome"],
    "inheritance": "X-Linked",
    "penetrance": "Complete for full mutation",
    "omim_ids": ["300624"],
    "screening_recommendations": "Carrier screening in women with family history or developmental delay"
  }
};

export function registerGeneDiseaseMap(server: McpServer) {
  server.registerResource(
    "gene-disease-map",
    "genomics://gene-disease-map",
    {
      title: "Common Gene-Disease Associations",
      description: "Quick reference map of well-established gene-disease relationships for the most clinically relevant genes.",
      mimeType: 'application/json',
      cacheHint: { ttlMs: STATIC_RESOURCE_TTL_MS, cacheScope: 'public' }
    },
    async () => ({
      contents: [{
        uri: "genomics://gene-disease-map",
        text: JSON.stringify(GeneDiseaseMap, null, 2),
        mimeType: "application/json"
      }]
    })
  );
}

