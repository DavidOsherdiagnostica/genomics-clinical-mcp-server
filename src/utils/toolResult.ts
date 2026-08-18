import type { CallToolResult } from '@modelcontextprotocol/server';

const MEDICAL_DISCLAIMER =
  'For research and clinical decision support only. Not a substitute for professional medical advice, diagnosis, or treatment.';

export function toToolResult(
  data: unknown,
  options: { detailed?: boolean; summary?: string } = {},
): CallToolResult {
  const payload = {
    ...(typeof data === 'object' && data !== null ? data : { result: data }),
    _disclaimer: MEDICAL_DISCLAIMER,
  };

  const text = options.summary ?? JSON.stringify(payload, null, 2);

  const result: CallToolResult = {
    content: [{ type: 'text', text }],
    isError: false,
  };

  if (options.detailed) {
    result.structuredContent = payload as Record<string, unknown>;
  }

  return result;
}

export function toToolError(message: string, details?: Record<string, unknown>): CallToolResult {
  const payload = {
    error: message,
    ...(details ?? {}),
    _disclaimer: MEDICAL_DISCLAIMER,
  };

  return {
    content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }],
    isError: true,
  };
}
