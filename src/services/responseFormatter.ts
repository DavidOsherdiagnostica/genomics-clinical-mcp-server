import type { CallToolResult } from '@modelcontextprotocol/server';
import { toToolResult } from '../utils/toolResult.js';
import { APP_CONFIG } from '../config/appConfig.js';

export function formatToolResponse(
  data: unknown,
  options: { detailed?: boolean; queryStartTime?: number } = {},
): CallToolResult {
  const queryTime = options.queryStartTime ? Date.now() - options.queryStartTime : undefined;
  const enriched =
    typeof data === 'object' && data !== null
      ? {
          ...(data as Record<string, unknown>),
          metadata: {
            data_source: APP_CONFIG.DEFAULT_DATA_SOURCE,
            api_version: APP_CONFIG.API_VERSION,
            ...(queryTime !== undefined ? { query_time_ms: queryTime } : {}),
            generated_at: new Date().toISOString(),
          },
        }
      : data;

  return toToolResult(enriched, {
    ...(options.detailed ? { detailed: true } : {}),
  });
}
