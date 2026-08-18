import type { CallToolResult } from '@modelcontextprotocol/server';
import { GenericError, ErrorType, ErrorSeverity } from '../types/errors.js';
import { ERROR_CONFIG, REQUEST_CONFIG } from '../config/appConfig.js';
import { toToolError } from './toolResult.js';

export function classifyError(error: unknown, context?: string): GenericError {
  if (error instanceof GenericError) {
    return error;
  }

  if (error instanceof TypeError && error.message.includes('fetch')) {
    return new GenericError(ErrorType.API_CONNECTION_ERROR, ERROR_CONFIG.DEFAULT_ERROR_MESSAGES.CONNECTION_ERROR, {
      severity: ErrorSeverity.HIGH,
      suggestions: ['Check your internet connection', 'Verify the external API service is accessible', 'Try again in a few moments'],
      details: { originalError: String(error), context },
    });
  }

  if (error instanceof Error && error.name === 'AbortError') {
    return new GenericError(ErrorType.API_TIMEOUT, ERROR_CONFIG.DEFAULT_ERROR_MESSAGES.TIMEOUT_ERROR, {
      severity: ErrorSeverity.MEDIUM,
      suggestions: ['Retry the request', 'The external API service may be experiencing high load'],
      details: { originalError: error.message, context },
    });
  }

  if (error instanceof Error && error.message.includes('HTTP')) {
    const statusMatch = error.message.match(/HTTP (\d+)/);
    const statusCode = statusMatch ? parseInt(statusMatch[1]!, 10) : 0;

    if (ERROR_CONFIG.RETRY_STATUS_CODES.includes(statusCode)) {
      return new GenericError(ErrorType.API_SERVER_ERROR, `External API server error (${statusCode})`, {
        severity: ErrorSeverity.HIGH,
        suggestions: ['Try again later', 'Contact system administrator if problem persists'],
        details: { statusCode, context },
      });
    }

    if (ERROR_CONFIG.PERMANENT_FAILURE_CODES.includes(statusCode)) {
      return new GenericError(ErrorType.API_BAD_REQUEST, `External API returned an error (${statusCode})`, {
        severity: ErrorSeverity.MEDIUM,
        suggestions: ['Verify request parameters', 'Check API documentation'],
        details: { statusCode, context },
      });
    }
  }

  const errorMessage = error instanceof Error ? error.message : String(error);
  return new GenericError(ErrorType.UNKNOWN_ERROR, `Unexpected error: ${errorMessage}`, {
    severity: ErrorSeverity.MEDIUM,
    suggestions: ['Try the request again', 'Check input parameters', 'Contact support if problem persists'],
    details: { originalError: errorMessage, context },
  });
}

export function createComprehensiveErrorResponse(
  error: GenericError,
  partialData?: unknown,
  operationContext?: {
    toolName?: string;
    userInput?: unknown;
    attemptNumber?: number;
  },
): CallToolResult {
  const details: Record<string, unknown> = {
    code: error.code,
    type: error.type,
    severity: error.severity,
    suggestions: error.suggestions ?? [],
    recoverable: error.isRecoverable(),
    retry_delay_ms: error.isRecoverable() ? REQUEST_CONFIG.RETRY_DELAY_MS : 0,
    ...(operationContext?.toolName ? { tool: operationContext.toolName } : {}),
    ...(partialData !== undefined ? { partial_data: partialData } : {}),
    ...(error.details ?? {}),
  };

  return toToolError(error.message, details);
}

export function logError(error: GenericError, context?: string): void {
  if (process.env.VERBOSE_LOGGING !== 'true') {
    return;
  }

  const payload = {
    severity: error.severity,
    type: error.type,
    message: error.message,
    context,
    correlationId: error.correlationId,
  };

  if (error.severity === ErrorSeverity.CRITICAL || error.severity === ErrorSeverity.HIGH) {
    console.error('[genomics-clinical]', payload);
  } else {
    console.warn('[genomics-clinical]', payload);
  }
}
