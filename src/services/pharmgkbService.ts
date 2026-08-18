import { APP_CONFIG } from '../config/appConfig.js';
import { GenericError, ErrorType, ErrorSeverity } from '../types/errors.js';
import { parsePharmGKBHtml } from './pharmgkbParser.js';
import type { PharmGKBResponse } from '../types/pharmgkb.js';
import { fetchJson, fetchText } from '../utils/httpClient.js';
import {
  type ClinicalActionabilityFilter,
  type EvidenceLevelFilter,
  annotationMatchesVariant,
  isActionableClinicalAnnotation,
  isActionableGuidelineAnnotation,
  matchesDrugClassFilter,
  matchesEvidenceLevel,
} from '../utils/pharmgkbFilters.js';

interface ClinPgxListResponse<T = Record<string, unknown>> {
  data?: T[];
  status?: string;
}

interface ClinPgxGeneRecord {
  id?: string;
  symbol?: string;
  name?: string;
  objCls?: string;
}

interface ClinPgxClinicalAnnotation {
  id?: string;
  name?: string;
  objCls?: string;
  types?: string[];
  levelOfEvidence?: { term?: string };
  relatedChemicals?: Array<{ id?: string; name?: string; objCls?: string }>;
  relatedGuidelines?: unknown[];
  relatedLabels?: unknown[];
  location?: {
    displayName?: string;
    haplotypes?: Array<{ symbol?: string; name?: string }>;
  };
  relatedVariations?: Array<{ name?: string; symbol?: string }>;
}

interface ClinPgxGuidelineAnnotation {
  id?: string;
  name?: string;
  relatedChemicals?: Array<{ id?: string; name?: string; objCls?: string }>;
  dosingInformation?: boolean;
  hasTestingInfo?: boolean;
  alternateDrugAvailable?: boolean;
  source?: string;
}

export interface GeneDrugPairSearch {
  geneSymbol: string;
  variant?: string;
  genotype?: string;
  evidenceLevelFilter?: EvidenceLevelFilter;
  drugClassFilter?: string[];
  clinicalActionabilityFilter?: ClinicalActionabilityFilter;
}

export interface GeneDrugPairEntry {
  drugId: string;
  drugName: string;
  evidenceLevels: string[];
  interactionTypes: string[];
  hasGuideline: boolean;
  hasLabel: boolean;
  actionable: boolean;
  sources: Array<'clinical_annotation' | 'guideline_annotation'>;
}

export class PharmGKBService {
  async getDrugGeneInteractions(criteria: { drugName?: string; rxcui?: string }): Promise<PharmGKBResponse> {
    const params = new URLSearchParams();

    if (criteria.rxcui) {
      params.append('mainSearchCriteria.v.c', criteria.rxcui);
      params.append('mainSearchCriteria.v.cs', '2.16.840.1.113883.6.88');
    } else if (criteria.drugName) {
      params.append('mainSearchCriteria.v.dn', criteria.drugName);
    } else {
      throw new GenericError(ErrorType.INVALID_INPUT, 'Must provide drugName or rxcui');
    }

    try {
      const url = `${APP_CONFIG.PHARMGKB_BASE_URL}/infobutton?${params.toString()}`;
      const html = await fetchText(url, {
        headers: {
          Accept: 'text/html,application/xhtml+xml,*/*',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });
      return parsePharmGKBHtml(html);
    } catch (error) {
      throw this.handleError(error, 'getDrugGeneInteractions');
    }
  }

  async searchGene(query: string): Promise<Array<{ id: string; name: string; symbol?: string }>> {
    try {
      const url = `${APP_CONFIG.PHARMGKB_BASE_URL}/data/gene?symbol=${encodeURIComponent(query)}`;
      const result = await fetchJson<ClinPgxListResponse<ClinPgxGeneRecord>>(url);

      return (result.data ?? [])
        .filter((item) => item.id && (item.symbol || item.name))
        .map((item) => {
          const gene: { id: string; name: string; symbol?: string } = {
            id: item.id!,
            name: item.symbol ?? item.name!,
          };
          if (item.symbol) {
            gene.symbol = item.symbol;
          }
          return gene;
        });
    } catch (error) {
      if (error instanceof Error && error.message.includes('HTTP 404')) {
        return [];
      }
      throw this.handleError(error, 'searchGene');
    }
  }

  async getGeneDrugPairs(search: GeneDrugPairSearch): Promise<GeneDrugPairEntry[]> {
    try {
      const genes = await this.searchGene(search.geneSymbol);
      if (genes.length === 0) {
        return [];
      }

      const clinicalUrl =
        `${APP_CONFIG.PHARMGKB_BASE_URL}/data/clinicalAnnotation?` +
        `location.genes.symbol=${encodeURIComponent(search.geneSymbol)}`;
      const guidelineUrl =
        `${APP_CONFIG.PHARMGKB_BASE_URL}/data/guidelineAnnotation?` +
        `relatedGenes.symbol=${encodeURIComponent(search.geneSymbol)}`;

      const [clinical, guidelines] = await Promise.all([
        fetchJson<ClinPgxListResponse<ClinPgxClinicalAnnotation>>(clinicalUrl),
        fetchJson<ClinPgxListResponse<ClinPgxGuidelineAnnotation>>(guidelineUrl),
      ]);

      const evidenceFilter = search.evidenceLevelFilter ?? '2A_and_above';
      const actionabilityFilter = search.clinicalActionabilityFilter ?? 'all';
      const pairMap = new Map<string, GeneDrugPairEntry>();

      for (const annotation of clinical.data ?? []) {
        if (!annotationMatchesVariant(annotation, search.variant, search.genotype)) {
          continue;
        }

        const evidenceTerm = annotation.levelOfEvidence?.term;
        if (!matchesEvidenceLevel(evidenceTerm, evidenceFilter)) {
          continue;
        }

        const actionable = isActionableClinicalAnnotation(annotation);
        if (actionabilityFilter === 'actionable_only' && !actionable) {
          continue;
        }

        for (const chemical of annotation.relatedChemicals ?? []) {
          if (!chemical.id || !chemical.name || chemical.objCls !== 'Chemical') continue;
          if (!matchesDrugClassFilter(chemical.name, search.drugClassFilter, search.geneSymbol)) continue;

          this.mergeGeneDrugPair(pairMap, chemical.id, chemical.name, {
            ...(evidenceTerm ? { evidenceTerm } : {}),
            interactionTypes: annotation.types ?? [],
            hasGuideline: (annotation.relatedGuidelines?.length ?? 0) > 0,
            hasLabel: (annotation.relatedLabels?.length ?? 0) > 0,
            actionable,
            source: 'clinical_annotation',
          });
        }
      }

      for (const guideline of guidelines.data ?? []) {
        const actionable = isActionableGuidelineAnnotation(guideline);
        if (actionabilityFilter === 'actionable_only' && !actionable) {
          continue;
        }

        for (const chemical of guideline.relatedChemicals ?? []) {
          if (!chemical.id || !chemical.name || chemical.objCls !== 'Chemical') continue;
          if (!matchesDrugClassFilter(chemical.name, search.drugClassFilter, search.geneSymbol)) continue;

          this.mergeGeneDrugPair(pairMap, chemical.id, chemical.name, {
            evidenceTerm: '1A',
            interactionTypes: guideline.dosingInformation ? ['Dosage'] : [],
            hasGuideline: true,
            hasLabel: false,
            actionable: true,
            source: 'guideline_annotation',
          });
        }
      }

      return Array.from(pairMap.values()).sort((a, b) => a.drugName.localeCompare(b.drugName));
    } catch (error) {
      throw this.handleError(error, 'getGeneDrugPairs');
    }
  }

  /** @deprecated Use getGeneDrugPairs for filter support */
  async searchDrugsByGene(geneSymbol: string): Promise<Array<{ id: string; name: string }>> {
    const pairs = await this.getGeneDrugPairs({
      geneSymbol,
      evidenceLevelFilter: 'all',
      clinicalActionabilityFilter: 'all',
    });
    return pairs.map((pair) => ({ id: pair.drugId, name: pair.drugName }));
  }

  private mergeGeneDrugPair(
    pairMap: Map<string, GeneDrugPairEntry>,
    drugId: string,
    drugName: string,
    update: {
      evidenceTerm?: string;
      interactionTypes: string[];
      hasGuideline: boolean;
      hasLabel: boolean;
      actionable: boolean;
      source: 'clinical_annotation' | 'guideline_annotation';
    },
  ): void {
    const existing = pairMap.get(drugId);
    if (!existing) {
      pairMap.set(drugId, {
        drugId,
        drugName,
        evidenceLevels: update.evidenceTerm ? [update.evidenceTerm] : [],
        interactionTypes: [...new Set(update.interactionTypes)],
        hasGuideline: update.hasGuideline,
        hasLabel: update.hasLabel,
        actionable: update.actionable,
        sources: [update.source],
      });
      return;
    }

    if (update.evidenceTerm) {
      existing.evidenceLevels = [...new Set([...existing.evidenceLevels, update.evidenceTerm])];
    }
    existing.interactionTypes = [...new Set([...existing.interactionTypes, ...update.interactionTypes])];
    existing.hasGuideline = existing.hasGuideline || update.hasGuideline;
    existing.hasLabel = existing.hasLabel || update.hasLabel;
    existing.actionable = existing.actionable || update.actionable;
    if (!existing.sources.includes(update.source)) {
      existing.sources.push(update.source);
    }
  }

  private handleError(error: unknown, context: string): GenericError {
    if (error instanceof GenericError) return error;

    return new GenericError(
      ErrorType.API_SERVER_ERROR,
      `PharmGKB API error in ${context}: ${error instanceof Error ? error.message : String(error)}`,
      {
        severity: ErrorSeverity.HIGH,
        details: { originalError: String(error) },
      },
    );
  }
}

export const pharmGKBService = new PharmGKBService();
