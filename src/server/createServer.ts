import { McpServer } from '@modelcontextprotocol/server';
import { MCP_SERVER_CONFIG, CACHE_CONFIG } from '../config/appConfig.js';
import { registerClinVarTools } from '../tools/clinvarTools.js';
import { registerPharmGKBTools } from '../tools/pharmgkbTools.js';
import { registerGenomicsSummaryTool } from '../tools/genomicsSummaryTool.js';
import { registerGenomicsResources } from '../resources/genomics/index.js';
import { registerGenomicsPrompts } from '../prompts/index.js';

export function createGenomicsServer(): McpServer {
  const server = new McpServer(
    {
      name: MCP_SERVER_CONFIG.SERVER_NAME,
      version: MCP_SERVER_CONFIG.SERVER_VERSION,
    },
    {
      instructions: MCP_SERVER_CONFIG.SERVER_INSTRUCTIONS,
      capabilities: {
        tools: {},
        resources: {},
        prompts: {},
      },
    },
  );

  registerGenomicsResources(server);
  registerGenomicsPrompts(server);
  registerClinVarTools(server);
  registerPharmGKBTools(server);
  registerGenomicsSummaryTool(server);

  return server;
}

export const STATIC_RESOURCE_TTL_MS = CACHE_CONFIG.TTL_STATIC_HOURS * 60 * 60 * 1000;
