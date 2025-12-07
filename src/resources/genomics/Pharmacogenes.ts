import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

const Pharmacogenes = {
  "CYP2C9": {
    "full_name": "Cytochrome P450 2C9",
    "function": "Drug metabolism enzyme",
    "drug_classes_affected": ["Anticoagulants", "NSAIDs", "Antidiabetics"],
    "key_drugs": ["warfarin", "phenytoin", "celecoxib", "losartan"],
    "alleles_tested": ["*2", "*3", "*5", "*6", "*8", "*11"],
    "clinical_actionability": "High - dose adjustments often needed",
    "testing_recommended_for": ["warfarin", "phenytoin"]
  },
  "CYP2C19": {
    "full_name": "Cytochrome P450 2C19",
    "function": "Drug metabolism enzyme",
    "drug_classes_affected": ["Antiplatelet agents", "Antidepressants", "PPIs"],
    "key_drugs": ["clopidogrel", "escitalopram", "omeprazole"],
    "alleles_tested": ["*2", "*3", "*17"],
    "clinical_actionability": "High - may need alternative drugs",
    "testing_recommended_for": ["clopidogrel"]
  },
  "CYP2D6": {
    "full_name": "Cytochrome P450 2D6",
    "function": "Drug metabolism enzyme",
    "drug_classes_affected": ["Antidepressants", "Antipsychotics", "Opioids", "Beta-blockers"],
    "key_drugs": ["codeine", "tramadol", "tamoxifen", "metoprolol"],
    "alleles_tested": ["*2", "*3", "*4", "*5", "*6", "*10", "*17", "*41"],
    "clinical_actionability": "High - both reduced and increased activity problematic",
    "testing_recommended_for": ["codeine", "tamoxifen"]
  },
  "VKORC1": {
    "full_name": "Vitamin K Epoxide Reductase Complex Subunit 1",
    "function": "Drug target - vitamin K recycling",
    "drug_classes_affected": ["Anticoagulants"],
    "key_drugs": ["warfarin"],
    "alleles_tested": ["rs9923231 (c.-1639G>A)"],
    "clinical_actionability": "Very High - major dose determinant",
    "testing_recommended_for": ["warfarin"]
  },
  "SLCO1B1": {
    "full_name": "Solute Carrier Organic Anion Transporter 1B1",
    "function": "Drug transporter",
    "drug_classes_affected": ["Statins"],
    "key_drugs": ["simvastatin", "atorvastatin"],
    "alleles_tested": ["rs4149056 (*5)"],
    "clinical_actionability": "Moderate - myopathy risk with high doses",
    "testing_recommended_for": ["simvastatin"]
  },
  "TPMT": {
    "full_name": "Thiopurine S-Methyltransferase",
    "function": "Drug metabolism enzyme",
    "drug_classes_affected": ["Immunosuppressants", "Chemotherapy"],
    "key_drugs": ["azathioprine", "6-mercaptopurine"],
    "alleles_tested": ["*2", "*3A", "*3B", "*3C"],
    "clinical_actionability": "Very High - severe toxicity risk",
    "testing_recommended_for": ["azathioprine", "6-mercaptopurine"]
  },
  "DPYD": {
    "full_name": "Dihydropyrimidine Dehydrogenase",
    "function": "Drug metabolism enzyme",
    "drug_classes_affected": ["Chemotherapy"],
    "key_drugs": ["5-fluorouracil", "capecitabine"],
    "alleles_tested": ["*2A", "c.1679T>G", "c.2846A>T"],
    "clinical_actionability": "Very High - life-threatening toxicity risk",
    "testing_recommended_for": ["5-fluorouracil", "capecitabine"]
  },
  "UGT1A1": {
    "full_name": "UDP Glucuronosyltransferase 1A1",
    "function": "Drug metabolism enzyme",
    "drug_classes_affected": ["Chemotherapy"],
    "key_drugs": ["irinotecan"],
    "alleles_tested": ["*28", "*6"],
    "clinical_actionability": "High - dose reduction needed",
    "testing_recommended_for": ["irinotecan"]
  }
};

export function registerPharmacogenes(server: McpServer) {
  server.registerResource(
    "pharmacogenes",
    "genomics://pharmacogenes",
    {
      title: "VIP Pharmacogenes",
      description: "PharmGKB Very Important Pharmacogenes (VIP) list with primary drug classes affected and clinical actionability.",
      schema: z.object({}).passthrough()
    },
    async () => ({
      contents: [{
        uri: "genomics://pharmacogenes",
        text: JSON.stringify(Pharmacogenes, null, 2),
        mimeType: "application/json"
      }]
    })
  );
}

