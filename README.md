# Genomics Clinical MCP Server

A Model Context Protocol (MCP) server providing clinical genomics and pharmacogenomics decision support. Integrates ClinVar variant pathogenicity data with PharmGKB drug-gene interaction guidelines.

## Features

### Tools

- **ClinVar Tools**:
  - `clinvar_get_variant_info` - Search ClinVar for genetic variants and retrieve clinical significance
  - `clinvar_check_pathogenicity` - Quick pathogenicity check for specific variants
  - `clinvar_find_variants_in_region` - Scan genomic regions for known variants

- **PharmGKB Tools**:
  - `pharmgkb_get_drug_gene_interactions` - Get comprehensive pharmacogenomic information for drugs (parses HTML from InfoButton API into structured data: guidelines, drug labels, clinical annotations)
  - `pharmgkb_check_patient_drug_risk` - Assess drug safety and dosing for patients with known genotypes (matches patient genotypes with drug-gene interactions)
  - `pharmgkb_get_gene_drug_pairs` - Find all drugs affected by specific genes or variants (note: currently limited by drug-centric API)

- **Integrated Tools**:
  - `genomics_clinical_summary` - Generate comprehensive clinical summary integrating genetic variant data (ClinVar) with pharmacogenomic implications (PharmGKB), matching patient genotypes to drug interactions

### Resources

- Gene-Disease Associations
- VIP Pharmacogenes Reference
- Genome Build Reference (GRCh37/GRCh38)
- ClinVar Pathogenicity Classification Guide
- High-Priority Drug-Gene Interactions
- Metabolizer Phenotype Definitions
- Variant Nomenclature Guide
- Genetic Testing Indications

## Supported Formats

- **Gene symbols**: HGNC standard (e.g., BRCA1, TP53, CFTR)
- **rsIDs**: dbSNP reference SNPs (e.g., rs9923231)
- **HGVS notation**: Standard variant nomenclature (e.g., NM_007294.4:c.3101_3102del)
- **Genomic locations**: Chromosome/position with GRCh37 or GRCh38
- **ClinVar IDs**: VCV or RCV identifiers
- **Drug names**: Chemical or brand names
- **RxCUI codes**: RxNorm identifiers
- **Gene-allele pairs**: GENE*ALLELE format (e.g., CYP2C9*3)
- **Genotypes**: Allele pairs (e.g., *1/*3)

## Response Formats

All tools support two response formats:

- **`concise`**: Returns clinically relevant information optimized for human-readable summaries
  - Includes key findings, risk levels, and actionable recommendations
  - Omits technical metadata and detailed cross-references
  
- **`detailed`**: Returns complete technical data including:
  - Full IDs, metadata, and cross-references
  - Complete annotation details and evidence levels
  - Raw data structures for downstream processing

## PharmGKB HTML Parsing

The server includes a robust HTML parser for PharmGKB InfoButton API responses that extracts:

- **Guidelines**: CPIC, DPWG, CPNDS, and other dosing guidelines with sources and summaries
- **Drug Labels**: FDA and other regulatory labels with testing recommendations (Required/Recommended/Actionable/Informative)
- **Clinical Annotations**: Evidence-based genotype-phenotype relationships with:
  - Evidence levels (1A, 1B, 2A, 2B, 3, 4)
  - Annotation types (Dosage, Toxicity, Metabolism/PK, Efficacy)
  - Gene associations
  - Genotype-specific effects and recommendations

The parser automatically extracts affected genes and identifies when genetic testing is recommended, enabling sophisticated patient-specific risk analysis.

## Getting Started

### Prerequisites

- Node.js (v20 or higher)
- npm or yarn

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/DavidOsherProceed/genomics-clinical-mcp-server.git
   cd genomics-clinical-mcp-server
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   ```bash
   cp env_vars.txt .env
   # Edit .env with your preferred settings
   ```

4. **Build the project:**
   ```bash
   npm run build
   ```

5. **Run the server:**
   
   **Stdio mode (for Claude Desktop):**
   ```bash
   npm run start:stdio
   ```
   
   **HTTP mode:**
   ```bash
   npm run start:http
   ```

## Configuration

Key environment variables (see `src/config/appConfig.ts` for defaults):

- `CLINVAR_BASE_URL` - ClinVar E-utilities API endpoint (default: https://eutils.ncbi.nlm.nih.gov/entrez/eutils)
- `PHARMGKB_BASE_URL` - PharmGKB API endpoint (default: https://api.pharmgkb.org/v1)
- `MCP_SERVER_NAME` - Server identifier (default: genomics-clinical)
- `LOG_LEVEL` - Logging verbosity (info, warn, error)
- `PORT` - HTTP server port (default: 3000)
- `API_TIMEOUT_MS` - API request timeout (default: 30000)
- `API_RETRY_ATTEMPTS` - Number of retry attempts for failed requests (default: 3)

## Usage

### With Claude Desktop

Add to your Claude Desktop MCP configuration:

```json
{
  "mcpServers": {
    "genomics-clinical": {
      "command": "node",
      "args": ["path/to/genomics-clinical-mcp-server/dist/index.js"]
    }
  }
}
```

### API Integration

The server provides tools and resources accessible via the Model Context Protocol. Tools can be called by AI agents to:

- Look up variant pathogenicity from ClinVar with disease associations
- Check pharmacogenetic interactions from PharmGKB with structured parsing of guidelines, labels, and annotations
- Match patient genotypes to drug-gene interactions for personalized risk assessment
- Generate integrated clinical summaries combining variant data with pharmacogenomic implications
- Access reference data for genes, drugs, and testing guidelines

### Example Use Cases

**Patient Drug Risk Assessment:**
```json
{
  "drug_name": "warfarin",
  "patient_genotypes": [
    { "gene": "CYP2C9", "genotype": "*2/*3" },
    { "gene": "VKORC1", "genotype": "CT" }
  ]
}
```
Returns matched genes, relevant annotations, FDA labels, and dosing recommendations.

**Clinical Summary:**
```json
{
  "patient_genetic_data": {
    "variants": ["BRCA1:c.3101_3102del"],
    "genotypes": [{ "gene": "CYP2D6", "genotype": "*4/*4" }]
  },
  "current_medications": ["tamoxifen"]
}
```
Integrates ClinVar pathogenicity data with PharmGKB drug interactions for comprehensive clinical decision support.

## Medical Disclaimer

**IMPORTANT**: This software is provided for **educational and informational purposes only**. It is **NOT intended for medical diagnosis, treatment, or clinical decision-making**.

- Always consult qualified healthcare professionals for medical advice
- Verify all genetic and medication information with official sources
- This software is not a substitute for professional medical judgment
- The authors assume no responsibility for medical decisions based on this software

## Development

For detailed development guidelines, see `AGENTS.md` which includes:
- Project Overview and Core Components
- Extending the Server (Prompts, Tools, Resources)
- Key Development Principles (MCP SDK Compliance, Type Safety)
- Contribution Guidelines

## License

Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)

For commercial use, please contact:
- LinkedIn: [David Osher](https://linkedin.com/in/david-osher)
- GitHub: Open an issue in the repository for commercial inquiries

See `LICENSE` file for full terms and conditions.
