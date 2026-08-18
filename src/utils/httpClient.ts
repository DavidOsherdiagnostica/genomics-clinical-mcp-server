import { CACHE_CONFIG, REQUEST_CONFIG, ERROR_CONFIG } from '../config/appConfig.js';

export interface FetchJsonOptions {
  timeoutMs?: number;
  retries?: number;
  headers?: Record<string, string>;
  cacheTtlMs?: number;
  cacheScope?: 'dynamic' | 'static';
}

interface CacheEntry {
  expiresAt: number;
  body: string;
  contentType: 'json' | 'text';
}

const responseCache = new Map<string, CacheEntry>();

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getDefaultTtlMs(scope: 'dynamic' | 'static'): number {
  return scope === 'static'
    ? CACHE_CONFIG.TTL_STATIC_HOURS * 60 * 60 * 1000
    : CACHE_CONFIG.TTL_DYNAMIC_MINUTES * 60 * 1000;
}

function buildCacheKey(url: string, headers?: Record<string, string>): string {
  return `${url}|${JSON.stringify(headers ?? {})}`;
}

function readCache(key: string): CacheEntry | null {
  const entry = responseCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    responseCache.delete(key);
    return null;
  }
  return entry;
}

function writeCache(key: string, body: string, contentType: 'json' | 'text', ttlMs: number): void {
  responseCache.set(key, {
    expiresAt: Date.now() + ttlMs,
    body,
    contentType,
  });
}

export function clearHttpCache(): void {
  responseCache.clear();
}

export async function fetchWithRetry(
  url: string,
  options: FetchJsonOptions = {},
): Promise<Response> {
  const timeoutMs = options.timeoutMs ?? REQUEST_CONFIG.TIMEOUT_MS;
  const retries = options.retries ?? REQUEST_CONFIG.RETRY_ATTEMPTS;
  const headers = { ...REQUEST_CONFIG.HEADERS, ...options.headers };

  let lastError: unknown;

  for (let attempt = 1; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        headers,
        signal: controller.signal,
      });

      if (
        !response.ok &&
        ERROR_CONFIG.RETRY_STATUS_CODES.includes(response.status) &&
        attempt < retries
      ) {
        await sleep(REQUEST_CONFIG.RETRY_DELAY_MS * attempt);
        continue;
      }

      return response;
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        await sleep(REQUEST_CONFIG.RETRY_DELAY_MS * attempt);
        continue;
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  if (lastError instanceof Error && lastError.name === 'AbortError') {
    throw new Error(`Request timed out after ${timeoutMs}ms`);
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

export async function fetchJson<T>(url: string, options: FetchJsonOptions = {}): Promise<T> {
  const cacheKey = buildCacheKey(url, options.headers);
  const cacheScope = options.cacheScope ?? 'dynamic';
  const ttlMs = options.cacheTtlMs ?? getDefaultTtlMs(cacheScope);

  if (CACHE_CONFIG.ENABLED) {
    const cached = readCache(cacheKey);
    if (cached?.contentType === 'json') {
      return JSON.parse(cached.body) as T;
    }
  }

  const response = await fetchWithRetry(url, options);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const body = await response.text();
  if (CACHE_CONFIG.ENABLED) {
    writeCache(cacheKey, body, 'json', ttlMs);
  }

  return JSON.parse(body) as T;
}

export async function fetchText(url: string, options: FetchJsonOptions = {}): Promise<string> {
  const cacheKey = buildCacheKey(url, options.headers);
  const cacheScope = options.cacheScope ?? 'dynamic';
  const ttlMs = options.cacheTtlMs ?? getDefaultTtlMs(cacheScope);

  if (CACHE_CONFIG.ENABLED) {
    const cached = readCache(cacheKey);
    if (cached?.contentType === 'text') {
      return cached.body;
    }
  }

  const response = await fetchWithRetry(url, options);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const body = await response.text();
  if (CACHE_CONFIG.ENABLED) {
    writeCache(cacheKey, body, 'text', ttlMs);
  }

  return body;
}
