import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerGeneDiseaseMap } from "./GeneDiseaseMap.js";
import { registerPharmacogenes } from "./Pharmacogenes.js";
import { registerGenomeBuilds } from "./GenomeBuilds.js";
import { registerPathogenicityGuide } from "./PathogenicityGuide.js";
import { registerDrugGenePairs } from "./DrugGenePairs.js";
import { registerMetabolizerPhenotypes } from "./MetabolizerPhenotypes.js";
import { registerVariantNomenclature } from "./VariantNomenclature.js";
import { registerTestingIndications } from "./TestingIndications.js";

export function registerGenomicsResources(server: McpServer): void {
  registerGeneDiseaseMap(server);
  registerPharmacogenes(server);
  registerGenomeBuilds(server);
  registerPathogenicityGuide(server);
  registerDrugGenePairs(server);
  registerMetabolizerPhenotypes(server);
  registerVariantNomenclature(server);
  registerTestingIndications(server);
}

