/**
 * Genomics Application Configuration Constants for MCP Server
 */

// ===== API CONFIGURATION =====
export const APP_CONFIG = {
  CLINVAR_BASE_URL: process.env.CLINVAR_BASE_URL || 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils',
  PHARMGKB_BASE_URL: process.env.PHARMGKB_BASE_URL || 'https://api.clinpgx.org/v1',
  NCBI_API_KEY: process.env.NCBI_API_KEY || '',
  API_VERSION: process.env.API_VERSION || '2.0.0',
  DEFAULT_DATA_SOURCE: 'genomics_clinical_data',
} as const;

// ===== REQUEST CONFIGURATION =====
export const REQUEST_CONFIG = {
  TIMEOUT_MS: parseInt(process.env.API_TIMEOUT_MS || '30000', 10),
  RETRY_ATTEMPTS: parseInt(process.env.API_RETRY_ATTEMPTS || '3', 10),
  RETRY_DELAY_MS: parseInt(process.env.API_RETRY_DELAY_MS || '1000', 10),
  HEADERS: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'User-Agent': 'Genomics-Clinical-MCP-Server/2.0.0',
  },
} as const;

// ===== CACHE CONFIGURATION =====
export const CACHE_CONFIG = {
  ENABLED: process.env.ENABLE_CACHE === 'true',
  TTL_STATIC_HOURS: parseInt(process.env.CACHE_TTL_STATIC_HOURS || '24', 10),
  TTL_DYNAMIC_MINUTES: parseInt(process.env.CACHE_TTL_DYNAMIC_MINUTES || '30', 10),
} as const;

// ===== HTTP / SECURITY CONFIGURATION =====
export const HTTP_CONFIG = {
  HOST: process.env.HOST || '127.0.0.1',
  PORT: parseInt(process.env.PORT || '3000', 10),
  CORS_ORIGINS: (process.env.CORS_ORIGINS || 'http://localhost:3000,http://127.0.0.1:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  ALLOWED_HOSTS: (process.env.ALLOWED_HOSTS || '127.0.0.1,localhost')
    .split(',')
    .map((host) => host.trim())
    .filter(Boolean),
} as const;

// ===== OAUTH CONFIGURATION =====
export const OAUTH_CONFIG = {
  ENABLED: process.env.OAUTH_ENABLED === 'true',
  REQUIRED: process.env.OAUTH_REQUIRED === 'true',
  ISSUER: process.env.OAUTH_ISSUER || '',
  AUDIENCE: process.env.OAUTH_AUDIENCE || '',
  JWKS_URI: process.env.OAUTH_JWKS_URI || '',
  AUTHORIZATION_ENDPOINT: process.env.OAUTH_AUTHORIZATION_ENDPOINT || '',
  TOKEN_ENDPOINT: process.env.OAUTH_TOKEN_ENDPOINT || '',
  RESOURCE_SERVER_URL: process.env.OAUTH_RESOURCE_SERVER_URL || '',
  RESOURCE_DOCUMENTATION: process.env.OAUTH_RESOURCE_DOCUMENTATION || 'https://github.com/DavidOsherdiagnostica/genomics-clinical-mcp-server',
  SCOPES: (process.env.OAUTH_SCOPES || 'genomics:read,genomics:tools').split(',').map((s) => s.trim()),
  DEV_TOKEN: process.env.OAUTH_DEV_TOKEN || '',
} as const;

// ===== MCP SERVER CONFIGURATION =====
export const MCP_SERVER_CONFIG = {
  SERVER_NAME: process.env.MCP_SERVER_NAME || 'genomics-clinical',
  SERVER_VERSION: process.env.MCP_SERVER_VERSION || '2.0.0',
  SERVER_INSTRUCTIONS: `Clinical genomics and pharmacogenomics decision support. Integrates ClinVar variant pathogenicity data with PharmGKB/ClinPGx drug-gene interaction guidelines.

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
- detailed: Full technical data, IDs, and metadata for downstream processing.

Medical Disclaimer:
For research and clinical decision support only. Not a substitute for professional medical advice.`,

  CAPABILITIES: {
    RESOURCES: true,
    TOOLS: true,
    PROMPTS: true,
    COMPLETIONS: true,
  },

  RESPONSE_LIMITS: {
    MAX_SEARCH_RESULTS: 50,
    MAX_SUGGESTIONS: 20,
  },
} as const;

// ===== ERROR HANDLING =====
export const ERROR_CONFIG = {
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  VERBOSE_LOGGING: process.env.VERBOSE_LOGGING === 'true',
  RETRY_STATUS_CODES: [408, 429, 500, 502, 503, 504] as number[],
  PERMANENT_FAILURE_CODES: [400, 401, 403, 404] as number[],
  DEFAULT_ERROR_MESSAGES: {
    CONNECTION_ERROR: 'Unable to connect to the external API service',
    TIMEOUT_ERROR: 'Request to external API timed out',
    RATE_LIMIT_ERROR: 'Too many requests to external API - please wait before trying again',
    INVALID_RESPONSE: 'Received unexpected or invalid response from external API',
    NO_RESULTS: 'No results found matching your criteria',
  },
} as const;

// ===== RATE LIMITING =====
export const RATE_LIMIT_CONFIG = {
  REQUESTS_PER_MINUTE: parseInt(process.env.RATE_LIMIT_REQUESTS_PER_MINUTE || '60', 10),
  BURST_SIZE: parseInt(process.env.RATE_LIMIT_BURST_SIZE || '10', 10),
} as const;

// ===== DEBUG AND DEVELOPMENT =====
export const DEBUG_CONFIG = {
  ENABLED: process.env.DEBUG_MODE === 'true',
  MOCK_RESPONSES: process.env.MOCK_API_RESPONSES === 'true',
  LOG_API_CALLS: process.env.VERBOSE_LOGGING === 'true',
} as const;
