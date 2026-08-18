import type { McpServer } from '@modelcontextprotocol/server';
import { STATIC_RESOURCE_TTL_MS } from '../../server/createServer.js';

const MetabolizerPhenotypes = {
  "phenotypes": {
    "Ultra-Rapid_Metabolizer": {
      "abbreviation": "UM",
      "activity_score": "> 2.0",
      "frequency": "1-5% depending on population",
      "clinical_implication": "Very fast drug breakdown - may need higher doses or may have toxicity from active metabolites",
      "example_genotypes": {
        "CYP2D6": "Gene duplications (*1/*1xN, *2/*2xN)",
        "CYP2C19": "*17/*17"
      }
    },
    "Rapid_Metabolizer": {
      "abbreviation": "RM",
      "activity_score": "1.5 - 2.0",
      "frequency": "10-30% depending on population",
      "clinical_implication": "Faster than normal metabolism - may need higher doses",
      "example_genotypes": {
        "CYP2C19": "*1/*17"
      }
    },
    "Normal_Metabolizer": {
      "abbreviation": "NM",
      "activity_score": "1.0 - 1.5",
      "frequency": "50-70% in most populations",
      "clinical_implication": "Standard dosing appropriate",
      "example_genotypes": {
        "CYP2C9": "*1/*1",
        "CYP2D6": "*1/*1, *1/*2",
        "CYP2C19": "*1/*1"
      }
    },
    "Intermediate_Metabolizer": {
      "abbreviation": "IM",
      "activity_score": "0.5 - 1.0",
      "frequency": "20-40% depending on gene/population",
      "clinical_implication": "Reduced metabolism - may need lower doses or alternative drug",
      "example_genotypes": {
        "CYP2C9": "*1/*2, *1/*3",
        "CYP2D6": "*1/*4, *2/*4",
        "CYP2C19": "*1/*2"
      }
    },
    "Poor_Metabolizer": {
      "abbreviation": "PM",
      "activity_score": "0 - 0.5",
      "frequency": "2-10% depending on gene/population",
      "clinical_implication": "Little to no enzyme activity - significant dose reduction needed or avoid drug",
      "example_genotypes": {
        "CYP2C9": "*2/*3, *3/*3",
        "CYP2D6": "*4/*4, *5/*6",
        "CYP2C19": "*2/*2, *2/*3"
      }
    }
  },
  "special_cases": {
    "VKORC1": {
      "not_metabolizer_based": true,
      "phenotypes": {
        "High_Dose_Required": "CC genotype at rs9923231 - standard or higher warfarin doses",
        "Intermediate_Dose": "CT genotype - moderate warfarin doses",
        "Low_Dose_Required": "TT genotype - significantly reduced warfarin doses (40-60% of standard)"
      }
    },
    "SLCO1B1": {
      "not_metabolizer_based": true,
      "phenotypes": {
        "Normal_Function": "No *5 alleles - standard statin dosing",
        "Decreased_Function": "*5 heterozygote - increased myopathy risk at high doses",
        "Poor_Function": "*5 homozygote - high myopathy risk, especially with simvastatin 80mg"
      }
    }
  }
};

export function registerMetabolizerPhenotypes(server: McpServer) {
  server.registerResource(
    "metabolizer-phenotypes",
    "genomics://metabolizer-phenotypes",
    {
      title: "Metabolizer Phenotype Definitions",
      description: "Standard definitions for metabolizer phenotypes and their clinical implications.",
      mimeType: 'application/json',
      cacheHint: { ttlMs: STATIC_RESOURCE_TTL_MS, cacheScope: 'public' }
    },
    async () => ({
      contents: [{
        uri: "genomics://metabolizer-phenotypes",
        text: JSON.stringify(MetabolizerPhenotypes, null, 2),
        mimeType: "application/json"
      }]
    })
  );
}

