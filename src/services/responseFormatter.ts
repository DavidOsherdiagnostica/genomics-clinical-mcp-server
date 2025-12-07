/**
 * Generic Response Formatting Service for MCP Server
 * Orchestrates the transformation of raw data into AI-optimized MCP response formats
 * with generic context and suggestions
 */

import type {
  McpResponse,
  McpSuccessResponse,
} from '../types/mcp.js';
import { createMcpSuccessResponse } from '../utils/formatters.js';
import { APP_CONFIG } from '../config/appConfig.js';

// ===== RESPONSE FORMATTER SERVICE =====

export class GenericResponseFormatterService {
  /**
   * Formats generic data into an AI-optimized MCP success response.
   * This method provides a basic structure that can be enhanced by individual tools.
   *
   * @param processedData The data already processed by the tool's logic.
   * @param queryStartTime Optional. The timestamp when the query started for latency calculation.
   * @returns A structured McpSuccessResponse.
   */
  formatGenericToolResponse(
    processedData: any,
    queryStartTime?: number,
  ): McpSuccessResponse<any> {
    const startTime = Date.now();
    const queryTime = queryStartTime ? Date.now() - queryStartTime : Date.now() - startTime;

    // Default generic metadata, notes, warnings, and next actions
    const genericMetadata = {
      total_results: Array.isArray(processedData) ? processedData.length : 1,
      query_time: `${queryTime}ms`,
      data_source: APP_CONFIG.DEFAULT_DATA_SOURCE,
      last_updated: new Date().toISOString(),
      api_version: APP_CONFIG.API_VERSION,
      // Add other generic metadata fields as needed
    };

    const genericClinicalNotes = [
      'Information provided is for general reference.',
      'Always consult relevant experts for specific advice.',
    ];

    const genericWarnings: string[] = []; // Tools can add specific warnings
    const genericNextActions: Array<{ tool: string; reason: string; parameters_hint: string }> = [];

    return createMcpSuccessResponse(processedData, {
      totalResults: genericMetadata.total_results,
      queryTime: queryTime,
      additionalInfo: {
        ...genericMetadata,
        notes: genericClinicalNotes,
        warnings: genericWarnings,
        next_actions: genericNextActions,
      },
    });
  }
}

// ===== SINGLETON INSTANCE =====

let formatterInstance: GenericResponseFormatterService | null = null;

/**
 * Gets singleton instance of the generic response formatter
 */
export function getResponseFormatter(): GenericResponseFormatterService {
  if (!formatterInstance) {
    formatterInstance = new GenericResponseFormatterService();
  }
  return formatterInstance;
}
