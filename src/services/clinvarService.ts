import { APP_CONFIG } from '../config/appConfig.js';
import { GenericError, ErrorType, ErrorSeverity } from '../types/errors.js';
import { fetchJson } from '../utils/httpClient.js';

interface ESearchResult {
  esearchresult: {
    count: string;
    retmax: string;
    retstart: string;
    idlist: string[];
    errorlist?: unknown;
  };
}

interface ESummaryResult {
  result: {
    uids: string[];
    [key: string]: unknown;
  };
}

export class ClinVarService {
  private db = 'clinvar';

  private buildParams(params: Record<string, string>): URLSearchParams {
    const searchParams = new URLSearchParams(params);
    if (APP_CONFIG.NCBI_API_KEY) {
      searchParams.set('api_key', APP_CONFIG.NCBI_API_KEY);
    }
    return searchParams;
  }

  async searchVariants(term: string, limit: number = 20): Promise<string[]> {
    const params = this.buildParams({
      db: this.db,
      term,
      retmode: 'json',
      retmax: limit.toString(),
      usehistory: 'y',
    });

    try {
      const url = `${APP_CONFIG.CLINVAR_BASE_URL}/esearch.fcgi?${params.toString()}`;
      const data = await fetchJson<ESearchResult>(url);

      if (data.esearchresult.errorlist) {
        throw new GenericError(ErrorType.API_BAD_REQUEST, 'ClinVar search error', {
          details: { errorlist: data.esearchresult.errorlist as Record<string, unknown> },
        });
      }

      return data.esearchresult.idlist ?? [];
    } catch (error) {
      throw this.handleError(error, 'searchVariants');
    }
  }

  async getVariantSummary(ids: string[]): Promise<any[]> {
    if (ids.length === 0) return [];

    const chunks: string[][] = [];
    for (let i = 0; i < ids.length; i += 100) {
      chunks.push(ids.slice(i, i + 100));
    }

    let allResults: any[] = [];

    for (const chunk of chunks) {
      const params = this.buildParams({
        db: this.db,
        id: chunk.join(','),
        retmode: 'json',
      });

      try {
        const url = `${APP_CONFIG.CLINVAR_BASE_URL}/esummary.fcgi?${params.toString()}`;
        const data = await fetchJson<ESummaryResult>(url);
        const results = data.result.uids.map((uid) => data.result[uid]);
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
        details: { originalError: String(error) },
      },
    );
  }
}

export const clinVarService = new ClinVarService();
