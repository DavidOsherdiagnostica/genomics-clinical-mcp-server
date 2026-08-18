import 'dotenv/config';
import rateLimit from 'express-rate-limit';
import { createMcpHandler } from '@modelcontextprotocol/server';
import {
  createMcpExpressApp,
  getOAuthProtectedResourceMetadataUrl,
  mcpAuthMetadataRouter,
  requireBearerAuth,
} from '@modelcontextprotocol/express';
import { toNodeHandler } from '@modelcontextprotocol/node';
import { HTTP_CONFIG, MCP_SERVER_CONFIG, OAUTH_CONFIG, RATE_LIMIT_CONFIG } from './config/appConfig.js';
import { createGenomicsServer } from './server/createServer.js';
import { getResourceServerUrl, isOAuthRequired, oauthTokenVerifier } from './middleware/oauth.js';

export function setupHttpServer(port: number = HTTP_CONFIG.PORT) {
  const app = createMcpExpressApp({
    host: HTTP_CONFIG.HOST,
    allowedHosts: HTTP_CONFIG.ALLOWED_HOSTS,
    allowedOrigins: HTTP_CONFIG.CORS_ORIGINS,
  });

  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: MCP_SERVER_CONFIG.SERVER_NAME,
      version: MCP_SERVER_CONFIG.SERVER_VERSION,
      protocol: '2026-07-28',
      oauth_enabled: OAUTH_CONFIG.ENABLED,
    });
  });

  if (OAUTH_CONFIG.ENABLED && OAUTH_CONFIG.ISSUER) {
    app.use(
      mcpAuthMetadataRouter({
        resourceServerUrl: getResourceServerUrl(),
        oauthMetadata: {
          issuer: OAUTH_CONFIG.ISSUER,
          authorization_endpoint: OAUTH_CONFIG.AUTHORIZATION_ENDPOINT || `${OAUTH_CONFIG.ISSUER}/authorize`,
          token_endpoint: OAUTH_CONFIG.TOKEN_ENDPOINT || `${OAUTH_CONFIG.ISSUER}/oauth/token`,
          jwks_uri: OAUTH_CONFIG.JWKS_URI || `${OAUTH_CONFIG.ISSUER}/.well-known/jwks.json`,
          response_types_supported: ['code'],
          grant_types_supported: ['authorization_code', 'refresh_token'],
          code_challenge_methods_supported: ['S256'],
          scopes_supported: OAUTH_CONFIG.SCOPES,
        },
      }),
    );
  }

  const mcpHandler = createMcpHandler(() => createGenomicsServer(), { legacy: 'stateless' });
  const nodeHandler = toNodeHandler(mcpHandler);

  const limiter = rateLimit({
    windowMs: 60_000,
    max: RATE_LIMIT_CONFIG.REQUESTS_PER_MINUTE,
    standardHeaders: true,
    legacyHeaders: false,
  });

  const authGate = requireBearerAuth({
    verifier: oauthTokenVerifier,
    requiredScopes: OAUTH_CONFIG.SCOPES,
    resourceMetadataUrl: getOAuthProtectedResourceMetadataUrl(getResourceServerUrl()),
  });

  const handleMcp = (req: any, res: any) => nodeHandler(req, res, req.body);

  app.use('/mcp', limiter);

  if (isOAuthRequired()) {
    app.post('/mcp', authGate, handleMcp);
    app.get('/mcp', authGate, handleMcp);
    app.delete('/mcp', authGate, handleMcp);
  } else {
    app.post('/mcp', handleMcp);
    app.get('/mcp', handleMcp);
    app.delete('/mcp', handleMcp);
  }

  return app.listen(port, HTTP_CONFIG.HOST, () => {
    console.error(
      `[genomics-clinical] MCP HTTP server on http://${HTTP_CONFIG.HOST}:${port}/mcp (OAuth ${OAUTH_CONFIG.ENABLED ? 'enabled' : 'disabled'})`,
    );
  });
}

export async function setupStdioServer() {
  const { serveStdio } = await import('@modelcontextprotocol/server/stdio');
  return serveStdio(() => createGenomicsServer(), { legacy: 'serve' });
}

if (process.argv[1]?.endsWith('server.ts') || process.argv[1]?.endsWith('server.js')) {
  if (process.argv.includes('--http')) {
    setupHttpServer(parseInt(process.env.PORT || String(HTTP_CONFIG.PORT), 10));
  } else {
    setupStdioServer();
  }
}
