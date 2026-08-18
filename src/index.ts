import 'dotenv/config';
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import { createGenomicsServer } from './server/createServer.js';

serveStdio(() => createGenomicsServer(), { legacy: 'serve' });
