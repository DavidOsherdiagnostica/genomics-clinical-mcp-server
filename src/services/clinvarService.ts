import { APP_CONFIG } from '../config/appConfig.js';
import { GenericError, ErrorType, ErrorSeverity } from '../types/errors.js';

// Response types for ClinVar E-utilities
interface ESearchResult {
  esearchresult: {
    count: string;
    retmax: string;
    retstart: string;
    idlist: string[];
    querykey?: string;
    webenv?: string;
    errorlist?: any;
  };
}

interface ESummaryResult {
  result: {
    uids: string[];
    [key: string]: any; // Dynamic keys for variant IDs
  };
}

export class ClinVarService {
  private db = 'clinvar';

  /**
   * Search for variants in ClinVar
   */
  async searchVariants(term: string, limit: number = 20): Promise<string[]> {
    const params = new URLSearchParams({
      db: this.db,
      term: term,
      retmode: 'json',
      retmax: limit.toString(),
      usehistory: 'y', // Useful for large result sets, though we just get IDs here
    });

    try {
      // We use the generic client but need to handle the GET request structure
      // The generic client currently defaults to POST. 
      // We'll use a specific implementation for E-utilities or adapt the generic client if it supported GET.
      // Since GenericApiClient is hardcoded to POST in the template (lines 39-44), 
      // we need to bypass it or add GET support. 
      // For this implementation, I will use fetch directly to avoid modifying the core template too much,
      // but I will use the template's error handling.
      
      const url = `${APP_CONFIG.CLINVAR_BASE_URL}/esearch.fcgi?${params.toString()}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json() as ESearchResult;

      if (data.esearchresult.errorlist) {
        throw new GenericError(ErrorType.API_BAD_REQUEST, 'ClinVar search error', {
          details: data.esearchresult.errorlist
        });
      }

      return data.esearchresult.idlist;
    } catch (error) {
      throw this.handleError(error, 'searchVariants');
    }
  }

  /**
   * Get summary details for specific variants
   */
  async getVariantSummary(ids: string[]): Promise<any[]> {
    if (ids.length === 0) return [];

    // Batch in groups of 100 to avoid URL length issues
    const chunks = [];
    for (let i = 0; i < ids.length; i += 100) {
      chunks.push(ids.slice(i, i + 100));
    }

    let allResults: any[] = [];

    for (const chunk of chunks) {
      const params = new URLSearchParams({
        db: this.db,
        id: chunk.join(','),
        retmode: 'json',
      });

      try {
        const url = `${APP_CONFIG.CLINVAR_BASE_URL}/esummary.fcgi?${params.toString()}`;
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json() as ESummaryResult;
        
        // Transform the weird ESummary JSON structure (id as key) to array
        const results = data.result.uids.map(uid => data.result[uid]);
        allResults = [...allResults, ...results];
      } catch (error) {
         throw this.handleError(error, 'getVariantSummary');
      }
    }

    return allResults;
  }

  private handleError(error: unknown, context: string): GenericError {
    if (error instanceof GenericError) return error;
    
    return new GenericError(
      ErrorType.API_SERVER_ERROR, 
      `ClinVar API error in ${context}: ${error instanceof Error ? error.message : String(error)}`,
      {
        severity: ErrorSeverity.HIGH,
        details: { originalError: String(error) }
      }
    );
  }
}

export const clinVarService = new ClinVarService();

