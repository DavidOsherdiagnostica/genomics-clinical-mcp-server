import type { McpServer } from '@modelcontextprotocol/server';
import { STATIC_RESOURCE_TTL_MS } from '../../server/createServer.js';

const GenomeBuilds = {
  "builds": {
    "GRCh38": {
      "aliases": ["hg38", "b38"],
      "release_date": "2013-12",
      "current_patch": "p14",
      "status": "Current standard",
      "use_for": "All new analyses, clinical reporting since 2020",
      "chromosome_names": "Standard (1-22, X, Y, MT)"
    },
    "GRCh37": {
      "aliases": ["hg19", "b37"],
      "release_date": "2009-02",
      "current_patch": "p13",
      "status": "Legacy but widely used",
      "use_for": "Older reports, some databases still use this",
      "chromosome_names": "Standard (1-22, X, Y, MT)"
    }
  },
  "important_differences": [
    "Positions can differ by thousands of bases between builds",
    "Some variants shifted to different contigs",
    "Mitochondrial genome completely restructured",
    "Always verify build before clinical interpretation"
  ],
  "example_position_differences": {
    "BRCA1_common_variant": {
      "GRCh38": "chr17:43,092,429",
      "GRCh37": "chr17:41,244,446",
      "difference_bp": "1,847,983"
    },
    "CFTR_common_variant": {
      "GRCh38": "chr7:117,559,590",
      "GRCh37": "chr7:117,199,644",
      "difference_bp": "359,946"
    }
  },
  "conversion_tools": [
    "NCBI Remap - https://www.ncbi.nlm.nih.gov/genome/tools/remap",
    "UCSC LiftOver - https://genome.ucsc.edu/cgi-bin/hgLiftOver"
  ]
};

export function registerGenomeBuilds(server: McpServer) {
  server.registerResource(
    "genome-builds",
    "genomics://genome-builds",
    {
      title: "Genome Build Reference",
      description: "Information about genome builds and coordinate system differences.",
      mimeType: 'application/json',
      cacheHint: { ttlMs: STATIC_RESOURCE_TTL_MS, cacheScope: 'public' }
    },
    async () => ({
      contents: [{
        uri: "genomics://genome-builds",
        text: JSON.stringify(GenomeBuilds, null, 2),
        mimeType: "application/json"
      }]
    })
  );
}

