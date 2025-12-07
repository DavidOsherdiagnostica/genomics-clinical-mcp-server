import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

const VariantNomenclature = {
  "nomenclature_systems": {
    "HGVS": {
      "full_name": "Human Genome Variation Society",
      "purpose": "Standardized way to describe variants",
      "levels": {
        "genomic": {
          "prefix": "g.",
          "example": "NC_000017.11:g.43092429del",
          "description": "Position on chromosome"
        },
        "coding": {
          "prefix": "c.",
          "example": "NM_007294.4:c.3101_3102del",
          "description": "Position in coding sequence"
        },
        "protein": {
          "prefix": "p.",
          "example": "NP_009225.1:p.Asn1034fs",
          "description": "Effect on protein"
        }
      }
    },
    "dbSNP": {
      "full_name": "Database of Single Nucleotide Polymorphisms",
      "purpose": "Unique identifier for variants",
      "format": "rs followed by number",
      "example": "rs9923231",
      "note": "Same rsID across different builds, but position may differ"
    },
    "Star_Allele": {
      "full_name": "Star Allele Nomenclature",
      "purpose": "Name pharmacogenetic alleles",
      "format": "GENE*NUMBER",
      "example": "CYP2C9*2",
      "note": "Each star allele represents specific variant(s)",
      "reference_database": "PharmVar"
    }
  },
  "common_variant_types": {
    "SNV": "Single Nucleotide Variant - one base changed (A>G)",
    "deletion": "One or more bases removed (del)",
    "insertion": "One or more bases added (ins)",
    "duplication": "Segment copied (dup)",
    "delins": "Deletion followed by insertion",
    "frameshift": "Insertion/deletion causing reading frame shift (fs)",
    "nonsense": "Creates stop codon (Ter or *)",
    "missense": "Changes amino acid",
    "silent": "Doesn't change amino acid (synonymous)"
  },
  "example_same_variant_different_systems": {
    "variant_description": "VKORC1 common variant affecting warfarin",
    "dbSNP": "rs9923231",
    "HGVS_genomic_GRCh38": "NC_000016.10:g.31096368C>T",
    "HGVS_genomic_GRCh37": "NC_000016.9:g.31107689C>T",
    "HGVS_coding": "NM_024006.5:c.-1639G>A",
    "clinical_name": "VKORC1 -1639G>A",
    "note": "Same variant, multiple ways to describe it"
  }
};

export function registerVariantNomenclature(server: McpServer) {
  server.registerResource(
    "variant-nomenclature",
    "genomics://variant-nomenclature",
    {
      title: "Variant Nomenclature Guide",
      description: "Quick reference for understanding different variant naming systems and how they relate.",
      schema: z.object({}).passthrough()
    },
    async () => ({
      contents: [{
        uri: "genomics://variant-nomenclature",
        text: JSON.stringify(VariantNomenclature, null, 2),
        mimeType: "application/json"
      }]
    })
  );
}

