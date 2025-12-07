import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { MCP_SERVER_CONFIG } from "./config/appConfig.js";

// Import generic tool and prompt registrations
import { registerTemplatePrompt } from "./prompts/templatePrompt.js";


// Import Genomics tools
import { registerClinVarTools } from "./tools/clinvarTools.js";
import { registerPharmGKBTools } from "./tools/pharmgkbTools.js";
import { registerGenomicsSummaryTool } from "./tools/genomicsSummaryTool.js";

// Import Genomics Resources
import { registerGenomicsResources } from "./resources/genomics/index.js";

// Create generic MCP Server
const server = new McpServer({
  name: MCP_SERVER_CONFIG.SERVER_NAME,
  version: MCP_SERVER_CONFIG.SERVER_VERSION,
  instructions: MCP_SERVER_CONFIG.SERVER_INSTRUCTIONS
});

// Register generic prompts, tools, and resources
registerTemplatePrompt(server);
// registerTemplateResource(server); // REMOVED template resource

// Register Genomics Resources
registerGenomicsResources(server);

// Register Genomics Tools
registerClinVarTools(server);
registerPharmGKBTools(server);
registerGenomicsSummaryTool(server);

// Start MCP in stdio mode
const transport = new StdioServerTransport();
server.connect(transport).then(() => {
  // console.log("MCP Server connected in stdio mode."); // Remove for clean JSON output
});
