import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

const DrugGenePairs = {
  "warfarin": {
    "genes": ["CYP2C9", "VKORC1", "CYP4F2"],
    "fda_label": "Yes - on FDA Biomarker List",
    "cpic_guideline": "Yes - Level A",
    "testing_recommendation": "Consider testing before initiating therapy",
    "key_message": "Genotype-guided dosing reduces bleeding risk and improves time in therapeutic range"
  },
  "clopidogrel": {
    "genes": ["CYP2C19"],
    "fda_label": "Yes - boxed warning for poor metabolizers",
    "cpic_guideline": "Yes - Level A",
    "testing_recommendation": "Consider testing for acute coronary syndrome or post-PCI",
    "key_message": "Poor metabolizers have reduced platelet inhibition - consider alternative antiplatelet"
  },
  "simvastatin": {
    "genes": ["SLCO1B1"],
    "fda_label": "Yes - mentions SLCO1B1",
    "cpic_guideline": "Yes - Level A",
    "testing_recommendation": "Optional - mainly for myopathy risk assessment",
    "key_message": "Homozygous *5 carriers have high myopathy risk with 80mg dose"
  },
  "codeine": {
    "genes": ["CYP2D6"],
    "fda_label": "Yes - contraindicated in ultra-rapid metabolizers",
    "cpic_guideline": "Yes - Level A",
    "testing_recommendation": "Consider for pediatric use or breastfeeding mothers",
    "key_message": "Ultra-rapid metabolizers risk toxic morphine levels, poor metabolizers get no effect"
  },
  "azathioprine": {
    "genes": ["TPMT", "NUDT15"],
    "fda_label": "Yes - recommends TPMT testing",
    "cpic_guideline": "Yes - Level A for both genes",
    "testing_recommendation": "Test before starting therapy",
    "key_message": "Deficient metabolizers risk severe bone marrow toxicity - requires major dose reduction"
  },
  "5-fluorouracil": {
    "genes": ["DPYD"],
    "fda_label": "Yes - recommends DPYD testing",
    "cpic_guideline": "Yes - Level A",
    "testing_recommendation": "Consider testing before chemotherapy",
    "key_message": "DPYD deficiency can cause life-threatening toxicity"
  },
  "irinotecan": {
    "genes": ["UGT1A1"],
    "fda_label": "Yes - recommends testing",
    "cpic_guideline": "Yes - Level A",
    "testing_recommendation": "Consider for higher doses (>250 mg/m2)",
    "key_message": "Homozygous *28 carriers need dose reduction to avoid severe diarrhea/neutropenia"
  },
  "tamoxifen": {
    "genes": ["CYP2D6"],
    "fda_label": "Mentions CYP2D6 but no specific recommendation",
    "cpic_guideline": "No - evidence mixed",
    "testing_recommendation": "Not routinely recommended",
    "key_message": "Controversial - poor metabolizers may have reduced efficacy"
  },
  "metformin": {
    "genes": ["SLC22A1", "SLC22A2", "SLC47A1"],
    "fda_label": "No",
    "cpic_guideline": "No",
    "testing_recommendation": "Not recommended",
    "key_message": "Genetic testing not currently clinically useful for metformin"
  }
};

export function registerDrugGenePairs(server: McpServer) {
  server.registerResource(
    "drug-gene-pairs",
    "genomics://drug-gene-pairs",
    {
      title: "High-Priority Drug-Gene Interactions",
      description: "Quick lookup of most clinically important drug-gene pairs with FDA/CPIC recommendations.",
      schema: z.object({}).passthrough()
    },
    async () => ({
      contents: [{
        uri: "genomics://drug-gene-pairs",
        text: JSON.stringify(DrugGenePairs, null, 2),
        mimeType: "application/json"
      }]
    })
  );
}

