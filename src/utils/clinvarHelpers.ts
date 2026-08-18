export interface ClinVarSummaryRecord {
  uid: string;
  accession?: string;
  title?: string;
  gene?: string;
  significance: string;
  review_status?: string;
  consequences: string[];
  position: number;
  diseases: string[];
  raw?: unknown;
}

const CLINICAL_IMPORTANCE_RANK: Record<string, number> = {
  pathogenic: 5,
  likely_pathogenic: 4,
  uncertain: 3,
  likely_benign: 2,
  benign: 1,
};

const HIGH_CONFIDENCE_STATUSES = [
  'reviewed by expert panel',
  'practice guideline',
  'criteria provided, multiple submitters, no conflicts',
];

const MEDIUM_CONFIDENCE_STATUSES = [
  ...HIGH_CONFIDENCE_STATUSES,
  'criteria provided, single submitter',
  'criteria provided, conflicting classifications',
];

export function mapClinVarRecord(record: Record<string, unknown>, includeRaw = false): ClinVarSummaryRecord {
  const germline = (record.germline_classification ?? {}) as Record<string, unknown>;
  const variationSet = (record.variation_set as Array<Record<string, unknown>> | undefined) ?? [];
  const locations = (variationSet[0]?.variation_loc as Array<Record<string, unknown>> | undefined) ?? [];
  const currentLoc =
    locations.find((loc) => loc.status === 'current') ??
    locations.find((loc) => loc.assembly_name === 'GRCh38') ??
    locations[0];

  const position =
    currentLoc?.start !== undefined
      ? parseInt(String(currentLoc.start), 10)
      : parseInt(String(record.location_sort ?? '0'), 10);

  const gene = ((record.genes as Array<{ symbol?: string }> | undefined)?.[0]?.symbol ??
    record.gene_sort) as string | undefined;

  return {
    uid: String(record.uid),
    ...(record.accession ? { accession: record.accession as string } : {}),
    ...(record.title ? { title: record.title as string } : {}),
    ...(gene ? { gene } : {}),
    significance: (germline.description as string | undefined) || 'Uncertain significance',
    ...(germline.review_status ? { review_status: germline.review_status as string } : {}),
    consequences: (record.molecular_consequence_list as string[] | undefined) ?? [],
    position: Number.isFinite(position) ? position : 0,
    diseases:
      ((germline.trait_set as Array<{ trait_name?: string }> | undefined) ?? [])
        .map((trait) => trait.trait_name)
        .filter((name): name is string => Boolean(name)) ?? [],
    ...(includeRaw ? { raw: record } : {}),
  };
}

export function classifySignificance(significance: string): 'PATHOGENIC' | 'BENIGN' | 'UNCERTAIN' {
  const sig = significance.toLowerCase();
  if (sig.includes('pathogenic') && !sig.includes('benign')) return 'PATHOGENIC';
  if (sig.includes('benign')) return 'BENIGN';
  return 'UNCERTAIN';
}

export function matchesPathogenicityFilter(
  significance: string,
  filter: 'pathogenic' | 'likely_pathogenic' | 'benign' | 'likely_benign' | 'uncertain' | 'all',
): boolean {
  if (filter === 'all') return true;
  return significance.toLowerCase().includes(filter.replace('_', ' '));
}

export function matchesRegionPathogenicityFilter(
  significance: string,
  filter: 'pathogenic_only' | 'benign_only' | 'uncertain_only' | 'all',
): boolean {
  if (filter === 'all') return true;
  const sig = significance.toLowerCase();

  switch (filter) {
    case 'pathogenic_only':
      return sig.includes('pathogenic') && !sig.includes('benign');
    case 'benign_only':
      return sig.includes('benign');
    case 'uncertain_only':
      return (
        sig.includes('uncertain') ||
        sig.includes('not provided') ||
        sig.includes('conflicting') ||
        (!sig.includes('pathogenic') && !sig.includes('benign'))
      );
    default:
      return true;
  }
}

export function matchesConsequenceFilter(consequences: string[], filters: string[] | undefined): boolean {
  if (!filters?.length) return true;
  const joined = consequences.join(' ').toLowerCase();
  return filters.some((filter) => {
    const normalized = filter.toLowerCase().replace(/_/g, ' ');
    return joined.includes(normalized) || normalized.includes(joined);
  });
}

export function meetsConfidenceThreshold(
  reviewStatus: string | undefined,
  threshold: 'high' | 'medium' | 'any',
): boolean {
  if (threshold === 'any') return true;
  const status = (reviewStatus ?? '').toLowerCase();
  if (!status) return false;

  const allowed =
    threshold === 'high'
      ? HIGH_CONFIDENCE_STATUSES
      : MEDIUM_CONFIDENCE_STATUSES;

  return allowed.some((entry) => status.includes(entry));
}

export function getConfidenceLevel(reviewStatus: string | undefined): 'high' | 'medium' | 'low' {
  if (meetsConfidenceThreshold(reviewStatus, 'high')) return 'high';
  if (meetsConfidenceThreshold(reviewStatus, 'medium')) return 'medium';
  return 'low';
}

export function clinicalImportanceScore(significance: string): number {
  const sig = significance.toLowerCase();
  if (sig.includes('likely') && sig.includes('pathogenic')) return CLINICAL_IMPORTANCE_RANK.likely_pathogenic!;
  if (sig.includes('pathogenic')) return CLINICAL_IMPORTANCE_RANK.pathogenic!;
  if (sig.includes('likely') && sig.includes('benign')) return CLINICAL_IMPORTANCE_RANK.likely_benign!;
  if (sig.includes('benign')) return CLINICAL_IMPORTANCE_RANK.benign!;
  return CLINICAL_IMPORTANCE_RANK.uncertain!;
}

export function sortClinVarRecords(
  records: ClinVarSummaryRecord[],
  sortBy: 'clinical_importance' | 'position' | 'gene',
): ClinVarSummaryRecord[] {
  const sorted = [...records];
  switch (sortBy) {
    case 'position':
      sorted.sort((a, b) => a.position - b.position);
      break;
    case 'gene':
      sorted.sort((a, b) => (a.gene ?? '').localeCompare(b.gene ?? ''));
      break;
    default:
      sorted.sort((a, b) => {
        const scoreDiff = clinicalImportanceScore(b.significance) - clinicalImportanceScore(a.significance);
        return scoreDiff !== 0 ? scoreDiff : a.position - b.position;
      });
  }
  return sorted;
}

export function matchesPathogenicityThreshold(
  significance: string | undefined,
  threshold: 'pathogenic_only' | 'likely_pathogenic' | 'uncertain_and_above',
): boolean {
  if (!significance) return threshold === 'uncertain_and_above';
  const sig = significance.toLowerCase();

  switch (threshold) {
    case 'pathogenic_only':
      return sig === 'pathogenic' || (sig.includes('pathogenic') && !sig.includes('likely') && !sig.includes('benign'));
    case 'likely_pathogenic':
      return sig.includes('pathogenic') && !sig.includes('benign');
    case 'uncertain_and_above':
      return !sig.includes('benign');
    default:
      return true;
  }
}
