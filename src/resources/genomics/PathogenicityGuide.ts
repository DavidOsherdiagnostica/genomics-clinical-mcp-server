import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

const PathogenicityGuide = {
  "classifications": {
    "Pathogenic": {
      "meaning": "Established to cause disease",
      "clinical_action": "Clinical management should be based on this finding",
      "confidence": "High - supported by multiple lines of evidence",
      "follow_up": "Genetic counseling recommended, cascade testing for family",
      "reporting": "Must be reported in clinical setting"
    },
    "Likely Pathogenic": {
      "meaning": "Very strong evidence for disease-causing, but not definitive",
      "clinical_action": "Often managed similarly to Pathogenic",
      "confidence": "Moderate-High - strong evidence but not meeting all criteria",
      "follow_up": "Genetic counseling recommended, consider family testing",
      "reporting": "Should be reported in clinical setting"
    },
    "Uncertain Significance": {
      "meaning": "Unknown if variant causes disease",
      "clinical_action": "Do not use for clinical decision-making",
      "confidence": "Insufficient evidence either way",
      "follow_up": "May reclassify over time, recheck periodically",
      "reporting": "Report with clear explanation of uncertainty"
    },
    "Likely Benign": {
      "meaning": "Strong evidence variant does not cause disease",
      "clinical_action": "Typically no clinical action needed",
      "confidence": "Moderate-High - likely not disease-causing",
      "follow_up": "Generally no follow-up needed",
      "reporting": "May be included in report for completeness"
    },
    "Benign": {
      "meaning": "Established as not disease-causing",
      "clinical_action": "No clinical action needed",
      "confidence": "High - strong evidence of no pathogenicity",
      "follow_up": "None needed",
      "reporting": "Usually not reported unless specifically requested"
    }
  },
  "review_status_levels": {
    "practice_guideline": {
      "stars": 4,
      "reliability": "Highest - guideline from expert panel",
      "weight": "Use with highest confidence"
    },
    "reviewed_by_expert_panel": {
      "stars": 4,
      "reliability": "Highest - expert panel consensus",
      "weight": "Use with highest confidence"
    },
    "criteria_provided_multiple_submitters": {
      "stars": 3,
      "reliability": "High - multiple independent evaluations agree",
      "weight": "Generally reliable for clinical use"
    },
    "criteria_provided_single_submitter": {
      "stars": 2,
      "reliability": "Moderate - evaluated by one organization",
      "weight": "Use with some caution, consider seeking confirmation"
    },
    "criteria_provided_conflicting": {
      "stars": 1,
      "reliability": "Low - submitters disagree",
      "weight": "Do not use for clinical decisions without expert review"
    },
    "no_assertion_criteria_provided": {
      "stars": 0,
      "reliability": "Very Low - no detailed evaluation",
      "weight": "Should not be used for clinical decisions"
    }
  }
};

export function registerPathogenicityGuide(server: McpServer) {
  server.registerResource(
    "pathogenicity-guide",
    "genomics://pathogenicity-guide",
    {
      title: "ClinVar Pathogenicity Classification Guide",
      description: "Explanation of ClinVar clinical significance terms and what they mean for patient care.",
      schema: z.object({}).passthrough()
    },
    async () => ({
      contents: [{
        uri: "genomics://pathogenicity-guide",
        text: JSON.stringify(PathogenicityGuide, null, 2),
        mimeType: "application/json"
      }]
    })
  );
}

