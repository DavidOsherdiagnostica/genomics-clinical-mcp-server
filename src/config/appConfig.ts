/**
 * Genomics Application Configuration Constants for MCP Server
 * This file contains general configuration settings for the MCP server and its components.
 * Customize these values for your specific API integration.
 */

// ===== API CONFIGURATION =====
export const APP_CONFIG = {
  CLINVAR_BASE_URL: process.env.CLINVAR_BASE_URL || 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils',
  // PharmGKB retired the api.pharmgkb.org hostname on 2026-07-20 in favor of ClinPGx; same endpoints/format.
  PHARMGKB_BASE_URL: process.env.PHARMGKB_BASE_URL || 'https://api.clinpgx.org/v1',
  API_VERSION: process.env.API_VERSION || '1.0.0',
  DEFAULT_DATA_SOURCE: 'genomics_clinical_data', // Default source for response metadata
} as const;

// ===== REQUEST CONFIGURATION =====
export const REQUEST_CONFIG = {
  TIMEOUT_MS: parseInt(process.env.API_TIMEOUT_MS || '30000'), // Request timeout in milliseconds
  RETRY_ATTEMPTS: parseInt(process.env.API_RETRY_ATTEMPTS || '3'), // Number of retry attempts for API calls
  RETRY_DELAY_MS: parseInt(process.env.API_RETRY_DELAY_MS || '1000'), // Delay between retries in milliseconds

  HEADERS: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'User-Agent': 'Genomics-Clinical-MCP-Server/1.0.0', // Customize your User-Agent
    // Add any other default headers required by your API
  },
} as const;

// ===== CACHE CONFIGURATION =====
export const CACHE_CONFIG = {
  ENABLED: process.env.ENABLE_CACHE === 'true', // Enable or disable caching
  TTL_STATIC_HOURS: parseInt(process.env.CACHE_TTL_STATIC_HOURS || '24'), // Time-to-live for static data (hours)
  TTL_DYNAMIC_MINUTES: parseInt(process.env.CACHE_TTL_DYNAMIC_MINUTES || '30'), // Time-to-live for dynamic data (minutes)
} as const;

// ===== MCP SERVER CONFIGURATION =====
export const MCP_SERVER_CONFIG = {
  SERVER_NAME: process.env.MCP_SERVER_NAME || 'genomics-clinical',
  SERVER_VERSION: process.env.MCP_SERVER_VERSION || '1.0.0',
  SERVER_INSTRUCTIONS: `Clinical genomics and pharmacogenomics decision support. Integrates ClinVar variant pathogenicity data with PharmGKB drug-gene interaction guidelines.

Supported Formats:
- Gene symbols: HGNC standard (e.g., BRCA1, TP53, CFTR)
- rsIDs: dbSNP reference SNPs (e.g., rs9923231)
- HGVS notation: Standard variant nomenclature (e.g., NM_007294.4:c.3101_3102del)
- Genomic locations: Chromosome/pos with GRCh37 or GRCh38
- ClinVar IDs: VCV or RCV identifiers
- Drug names: Chemical or brand names
- RxCUI codes: RxNorm identifiers
- Gene-allele pairs: GENE*ALLELE format (e.g., CYP2C9*3)
- Genotypes: Allele pairs (e.g., *1/*3)

Validation:
Inputs are automatically validated. Invalid inputs return detailed error messages with correct format examples.

Response Formats:
- concise: Clinically relevant info, optimal for human-readable summaries.
- detailed: Full technical data, IDs, and metadata for downstream processing.`,

  CAPABILITIES: {
    RESOURCES: true,
    TOOLS: true,
    PROMPTS: true,
    LOGGING: true,
  },

  RESPONSE_LIMITS: {
    MAX_SEARCH_RESULTS: 50, // Max results to return for search-like tools
    MAX_SUGGESTIONS: 20, // Max suggestions for autocomplete-like tools
  },
} as const;

// ===== ERROR HANDLING =====
export const ERROR_CONFIG = {
  LOG_LEVEL: process.env.LOG_LEVEL || 'info', // Logging level (e.g., 'info', 'warn', 'error')
  VERBOSE_LOGGING: process.env.VERBOSE_LOGGING === 'true', // Enable verbose logging

  RETRY_STATUS_CODES: [408, 429, 500, 502, 503, 504] as number[], // HTTP status codes that trigger a retry
  PERMANENT_FAILURE_CODES: [400, 401, 403, 404] as number[], // HTTP status codes that indicate a permanent failure

  DEFAULT_ERROR_MESSAGES: {
    CONNECTION_ERROR: 'Unable to connect to the external API service',
    TIMEOUT_ERROR: 'Request to external API timed out',
    RATE_LIMIT_ERROR: 'Too many requests to external API - please wait before trying again',
    INVALID_RESPONSE: 'Received unexpected or invalid response from external API',
    NO_RESULTS: 'No results found matching your criteria',
    // Add other generic error messages as needed
  },
} as const;

// ===== RATE LIMITING =====
export const RATE_LIMIT_CONFIG = {
  REQUESTS_PER_MINUTE: parseInt(process.env.RATE_LIMIT_REQUESTS_PER_MINUTE || '60'),
  BURST_SIZE: parseInt(process.env.RATE_LIMIT_BURST_SIZE || '10'),

  // No specific endpoint limits here; implement in individual tools if needed
} as const;

// ===== DEBUG AND DEVELOPMENT =====
export const DEBUG_CONFIG = {
  ENABLED: process.env.DEBUG_MODE === 'true',
  MOCK_RESPONSES: process.env.MOCK_API_RESPONSES === 'true',
  LOG_API_CALLS: process.env.VERBOSE_LOGGING === 'true',

  // No sample data here; implement in individual tools or mock services if needed
} as const;
