import {
  OAuthError,
  OAuthErrorCode,
  type AuthInfo,
  type OAuthTokenVerifier,
  getOAuthProtectedResourceMetadataUrl,
} from '@modelcontextprotocol/server';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { OAUTH_CONFIG } from '../config/appConfig.js';

export function getResourceServerUrl(): URL {
  const base = OAUTH_CONFIG.RESOURCE_SERVER_URL || `http://localhost:${process.env.PORT || '3000'}`;
  const normalized = base.endsWith('/') ? base.slice(0, -1) : base;
  return new URL('/mcp', `${normalized}/`);
}

export function getProtectedResourceMetadataUrl(): string {
  return getOAuthProtectedResourceMetadataUrl(getResourceServerUrl());
}

class GenomicsOAuthTokenVerifier implements OAuthTokenVerifier {
  private jwks?: ReturnType<typeof createRemoteJWKSet>;

  async verifyAccessToken(token: string): Promise<AuthInfo> {
    if (OAUTH_CONFIG.DEV_TOKEN && token === OAUTH_CONFIG.DEV_TOKEN) {
      return {
        token,
        clientId: 'dev-client',
        scopes: OAUTH_CONFIG.SCOPES,
        expiresAt: Math.floor(Date.now() / 1000) + 3600,
      };
    }

    if (!OAUTH_CONFIG.JWKS_URI || !OAUTH_CONFIG.AUDIENCE) {
      throw new OAuthError(OAuthErrorCode.InvalidToken, 'OAuth verification is not configured');
    }

    if (!this.jwks) {
      this.jwks = createRemoteJWKSet(new URL(OAUTH_CONFIG.JWKS_URI));
    }

    const verifyOptions: { audience: string; issuer?: string } = { audience: OAUTH_CONFIG.AUDIENCE };
    if (OAUTH_CONFIG.ISSUER) {
      verifyOptions.issuer = OAUTH_CONFIG.ISSUER;
    }

    const { payload } = await jwtVerify(token, this.jwks, verifyOptions);

    const exp = typeof payload.exp === 'number' ? payload.exp : Math.floor(Date.now() / 1000) + 300;
    const scopes =
      typeof payload.scope === 'string'
        ? payload.scope.split(' ')
        : Array.isArray(payload.scope)
          ? payload.scope.map(String)
          : OAUTH_CONFIG.SCOPES;

    return {
      token,
      clientId: String(payload.sub ?? payload.client_id ?? 'unknown'),
      scopes,
      expiresAt: exp,
    };
  }
}

export const oauthTokenVerifier = new GenomicsOAuthTokenVerifier();

export function isOAuthRequired(): boolean {
  return OAUTH_CONFIG.ENABLED && OAUTH_CONFIG.REQUIRED;
}
