import { APP_CONFIG } from '../config/appConfig.js';
import { GenericError, ErrorType, ErrorSeverity } from '../types/errors.js';
import { parsePharmGKBHtml } from './pharmgkbParser.js';
import type { PharmGKBResponse } from '../types/pharmgkb.js';

export class PharmGKBService {
  /**
   * Get drug-gene interactions via Infobutton API
   * Parses HTML response to structured pharmacogenomic data
   */
  async getDrugGeneInteractions(criteria: { drugName?: string; rxcui?: string }): Promise<PharmGKBResponse> {
    const params = new URLSearchParams();
    
    if (criteria.rxcui) {
      params.append('mainSearchCriteria.v.c', criteria.rxcui);
      // OID for RxNorm
      params.append('mainSearchCriteria.v.cs', '2.16.840.1.113883.6.88'); 
    } else if (criteria.drugName) {
      params.append('mainSearchCriteria.v.dn', criteria.drugName);
    } else {
      throw new GenericError(ErrorType.INVALID_INPUT, 'Must provide drugName or rxcui');
    }

    try {
      const url = `${APP_CONFIG.PHARMGKB_BASE_URL}/infobutton?${params.toString()}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      
      // Parse HTML to structured data
      const parsed = parsePharmGKBHtml(html);
      
      return parsed;

    } catch (error) {
      throw this.handleError(error, 'getDrugGeneInteractions');
    }
  }


  private handleError(error: unknown, context: string): GenericError {
    if (error instanceof GenericError) return error;
    
    return new GenericError(
      ErrorType.API_SERVER_ERROR, 
      `PharmGKB API error in ${context}: ${error instanceof Error ? error.message : String(error)}`,
      {
        severity: ErrorSeverity.HIGH,
        details: { originalError: String(error) }
      }
    );
  }
}

export const pharmGKBService = new PharmGKBService();

