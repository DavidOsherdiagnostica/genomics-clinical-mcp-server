export type EvidenceLevelFilter = '1A_only' | '1A_and_1B' | '2A_and_above' | 'all';
export type ClinicalActionabilityFilter = 'actionable_only' | 'all';

const EVIDENCE_RANK: Record<string, number> = {
  '1A': 6,
  '1B': 5,
  '2A': 4,
  '2B': 3,
  '3': 2,
  '4': 1,
};

const CLASS_ALIASES: Record<string, string[]> = {
  nsaid: ['nsaid', 'nsaids', 'antiinflammatory', 'anti-inflammatory', 'non-steroid'],
  anticoagulant: ['anticoagulant', 'anticoagulants', 'coumarin', 'vitamin k antagonist'],
  antidiabetic: ['antidiabetic', 'antidiabetics', 'sulfonylurea', 'hypoglycemic'],
  antiplatelet: ['antiplatelet', 'antiplatelet agents', 'platelet'],
  antidepressant: ['antidepressant', 'antidepressants', 'ssri', 'snri', 'tricyclic'],
  ppi: ['ppi', 'ppis', 'proton pump'],
  opioid: ['opioid', 'opioids', 'narcotic'],
  statin: ['statin', 'statins', 'hmg-coa'],
  antiepileptic: ['antiepileptic', 'antiepileptics', 'aed', 'seizure'],
  chemotherapy: ['chemotherapy', 'chemotherapeutic', 'antineoplastic'],
  immunosuppressant: ['immunosuppressant', 'immunosuppressants', 'thiopurine'],
  beta_blocker: ['beta-blocker', 'beta blocker', 'beta-blockers'],
  antipsychotic: ['antipsychotic', 'antipsychotics'],
};

/** Curated therapeutic classes for common PGx drugs (ClinPGx chemicals do not expose ATC classes). */
export const DRUG_THERAPEUTIC_CLASSES: Record<string, string[]> = {
  warfarin: ['Anticoagulants'],
  acenocoumarol: ['Anticoagulants'],
  phenprocoumon: ['Anticoagulants'],
  fluindione: ['Anticoagulants'],
  ibuprofen: ['NSAIDs'],
  celecoxib: ['NSAIDs'],
  diclofenac: ['NSAIDs'],
  meloxicam: ['NSAIDs'],
  naproxen: ['NSAIDs'],
  indomethacin: ['NSAIDs'],
  ketoprofen: ['NSAIDs'],
  piroxicam: ['NSAIDs'],
  aceclofenac: ['NSAIDs'],
  lornoxicam: ['NSAIDs'],
  tenoxicam: ['NSAIDs'],
  lumiracoxib: ['NSAIDs'],
  ketorolac: ['NSAIDs'],
  flurbiprofen: ['NSAIDs'],
  nabumeton: ['NSAIDs'],
  tolbutamide: ['Antidiabetics'],
  glimepiride: ['Antidiabetics'],
  glyburide: ['Antidiabetics'],
  gliclazide: ['Antidiabetics'],
  clopidogrel: ['Antiplatelet agents'],
  aspirin: ['Antiplatelet agents'],
  phenytoin: ['Antiepileptics'],
  fosphenytoin: ['Antiepileptics'],
  clobazam: ['Antiepileptics'],
  'valproic acid': ['Antiepileptics'],
  amitriptyline: ['Antidepressants'],
  citalopram: ['Antidepressants'],
  clomipramine: ['Antidepressants'],
  trimipramine: ['Antidepressants'],
  doxepin: ['Antidepressants'],
  omeprazole: ['PPIs'],
  escitalopram: ['Antidepressants'],
  codeine: ['Opioids'],
  tramadol: ['Opioids'],
  methadone: ['Opioids'],
  simvastatin: ['Statins'],
  fluvastatin: ['Statins'],
  atorvastatin: ['Statins'],
  azathioprine: ['Immunosuppressants', 'Chemotherapy'],
  '5-fluorouracil': ['Chemotherapy'],
  capecitabine: ['Chemotherapy'],
  busulfan: ['Chemotherapy'],
  irinotecan: ['Chemotherapy'],
  tamoxifen: ['Antineoplastics'],
  metoprolol: ['Beta-blockers'],
  losartan: ['Antihypertensives'],
  irbesartan: ['Antihypertensives'],
  olanzapine: ['Antipsychotics'],
  bupropion: ['Antidepressants'],
};

const GENE_DRUG_CLASSES: Record<string, string[]> = {
  CYP2C9: ['Anticoagulants', 'NSAIDs', 'Antidiabetics'],
  CYP2C19: ['Antiplatelet agents', 'Antidepressants', 'PPIs'],
  CYP2D6: ['Antidepressants', 'Antipsychotics', 'Opioids', 'Beta-blockers'],
  VKORC1: ['Anticoagulants'],
  SLCO1B1: ['Statins'],
  TPMT: ['Immunosuppressants', 'Chemotherapy'],
  DPYD: ['Chemotherapy'],
  UGT1A1: ['Chemotherapy'],
};

export function normalizeEvidenceLevel(level: string | undefined): string | undefined {
  if (!level) return undefined;
  const match = level.match(/\b(1A|1B|2A|2B|3|4)\b/i);
  return match ? match[1]!.toUpperCase().replace(/(\d)([AB])/, '$1$2') : level.trim();
}

export function evidenceLevelsForFilter(filter: EvidenceLevelFilter): Set<string> {
  switch (filter) {
    case '1A_only':
      return new Set(['1A']);
    case '1A_and_1B':
      return new Set(['1A', '1B']);
    case '2A_and_above':
      return new Set(['1A', '1B', '2A', '2B']);
    default:
      return new Set(['1A', '1B', '2A', '2B', '3', '4']);
  }
}

export function matchesEvidenceLevel(level: string | undefined, filter: EvidenceLevelFilter): boolean {
  if (filter === 'all') return true;
  const normalized = normalizeEvidenceLevel(level);
  if (!normalized) return false;
  return evidenceLevelsForFilter(filter).has(normalized);
}

export function compareEvidenceLevels(a: string, b: string): number {
  return (EVIDENCE_RANK[b] ?? 0) - (EVIDENCE_RANK[a] ?? 0);
}

export function bestEvidenceLevel(levels: Iterable<string>): string | undefined {
  const sorted = [...levels].sort(compareEvidenceLevels);
  return sorted[0];
}

export function matchesInteractionType(
  annotationType: string | undefined,
  filters: string[] | undefined,
): boolean {
  if (!filters?.length) return true;
  if (!annotationType) return false;
  const typeLower = annotationType.toLowerCase();
  return filters.some((filter) => {
    const f = filter.toLowerCase();
    if (typeLower.includes(f)) return true;
    if (f === 'dosage' && typeLower.includes('dosage')) return true;
    if (f === 'toxicity' && typeLower.includes('toxicity')) return true;
    if (f === 'efficacy' && typeLower.includes('efficacy')) return true;
    if ((f === 'metabolism' || f === 'pk') && typeLower.includes('metabolism')) return true;
    return false;
  });
}

export function matchesGeneFilter(genes: string[], filters: string[] | undefined): boolean {
  if (!filters?.length) return true;
  const normalized = new Set(genes.map((g) => g.toUpperCase()));
  return filters.some((gene) => normalized.has(gene.toUpperCase()));
}

export function matchesDrugClassFilter(
  drugName: string,
  filters: string[] | undefined,
  geneSymbol?: string,
): boolean {
  if (!filters?.length) return true;

  const drugLower = drugName.toLowerCase();

  for (const filter of filters) {
    const f = filter.toLowerCase();

    if (drugLower.includes(f)) return true;

    for (const [key, aliases] of Object.entries(CLASS_ALIASES)) {
      if (f.includes(key) || key.includes(f)) {
        if (aliases.some((alias) => drugLower.includes(alias))) return true;
      }
    }

    const mappedClasses = DRUG_THERAPEUTIC_CLASSES[drugLower] ?? [];
    if (mappedClasses.some((cls) => cls.toLowerCase().includes(f) || f.includes(cls.toLowerCase()))) {
      return true;
    }

    if (geneSymbol) {
      const geneClasses = GENE_DRUG_CLASSES[geneSymbol.toUpperCase()] ?? [];
      if (
        mappedClasses.length > 0 &&
        geneClasses.some((cls) => mappedClasses.includes(cls)) &&
        geneClasses.some((cls) => cls.toLowerCase().includes(f) || f.includes(cls.toLowerCase()))
      ) {
        return true;
      }
    }
  }

  return false;
}

export interface VariantMatchContext {
  name?: string;
  location?: {
    displayName?: string;
    haplotypes?: Array<{ symbol?: string; name?: string }>;
  };
  relatedVariations?: Array<{ name?: string; symbol?: string }>;
}

export function annotationMatchesVariant(
  annotation: VariantMatchContext,
  variant?: string,
  genotype?: string,
): boolean {
  if (!variant && !genotype) return true;

  const parts: string[] = [];
  if (annotation.name) parts.push(annotation.name);
  if (annotation.location?.displayName) parts.push(annotation.location.displayName);
  for (const haplotype of annotation.location?.haplotypes ?? []) {
    if (haplotype.symbol) parts.push(haplotype.symbol);
    if (haplotype.name) parts.push(haplotype.name);
  }
  for (const variation of annotation.relatedVariations ?? []) {
    if (variation.name) parts.push(variation.name);
    if (variation.symbol) parts.push(variation.symbol);
  }

  const haystack = parts.join(' ').toLowerCase();

  if (variant) {
    const normalizedVariant = variant.toLowerCase();

    if (normalizedVariant.startsWith('rs')) {
      if (!haystack.includes(normalizedVariant)) return false;
    } else if (normalizedVariant.includes('*')) {
      const allele = normalizedVariant.includes('cyp')
        ? normalizedVariant.match(/\*[\w]+/)?.[0]
        : normalizedVariant.startsWith('*')
          ? normalizedVariant
          : `*${normalizedVariant}`;
      if (!allele) return false;
      const allelePattern = new RegExp(
        `${allele.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:\\b|[\\s,;/])`,
        'i',
      );
      if (!allelePattern.test(haystack)) return false;
    } else if (!haystack.includes(normalizedVariant)) {
      return false;
    }
  }

  if (genotype) {
    const alleles = genotype.split('/').map((allele) => allele.trim().toLowerCase()).filter(Boolean);
    if (
      alleles.length > 0 &&
      !alleles.every((allele) => {
        if (allele.startsWith('*')) {
          const allelePattern = new RegExp(
            `${allele.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:\\b|[\\s,;/])`,
            'i',
          );
          return allelePattern.test(haystack);
        }
        return haystack.includes(allele);
      })
    ) {
      return false;
    }
  }

  return true;
}

export function isActionableClinicalAnnotation(annotation: {
  levelOfEvidence?: { term?: string };
  relatedGuidelines?: unknown[];
  relatedLabels?: unknown[];
}): boolean {
  const term = normalizeEvidenceLevel(annotation.levelOfEvidence?.term);
  if (term === '1A' || term === '1B') return true;
  if ((annotation.relatedGuidelines?.length ?? 0) > 0) return true;
  if ((annotation.relatedLabels?.length ?? 0) > 0) return true;
  return false;
}

export function isActionableGuidelineAnnotation(annotation: {
  dosingInformation?: boolean;
  hasTestingInfo?: boolean;
  alternateDrugAvailable?: boolean;
}): boolean {
  return (
    annotation.dosingInformation === true ||
    annotation.hasTestingInfo === true ||
    annotation.alternateDrugAvailable === true
  );
}

export function filterPharmGKBResponse<
  T extends {
    guidelines: Array<{ title: string; source?: string }>;
    labels: unknown[];
    annotations: Array<{
      title: string;
      evidenceLevel: string;
      type: string;
      genes: string[];
    }>;
    summary: {
      totalGuidelines: number;
      totalLabels: number;
      totalAnnotations: number;
      genesAffected: string[];
      testingRecommended: boolean;
    };
  },
>(
  data: T,
  options: {
    evidenceLevelFilter?: EvidenceLevelFilter;
    interactionTypeFilter?: string[];
    geneFilter?: string[];
  },
): T {
  const evidenceFilter = options.evidenceLevelFilter ?? 'all';
  const annotations = data.annotations.filter(
    (annotation) =>
      matchesEvidenceLevel(annotation.evidenceLevel, evidenceFilter) &&
      matchesInteractionType(annotation.type, options.interactionTypeFilter) &&
      matchesGeneFilter(annotation.genes, options.geneFilter),
  );

  const guidelines = data.guidelines.filter((guideline) => {
    if (!options.geneFilter?.length) return true;
    const title = guideline.title.toLowerCase();
    return options.geneFilter.some((gene) => title.includes(gene.toLowerCase()));
  });

  const genesAffected = new Set<string>();
  annotations.forEach((annotation) => annotation.genes.forEach((gene) => genesAffected.add(gene)));
  guidelines.forEach((guideline) => {
    for (const gene of options.geneFilter ?? data.summary.genesAffected) {
      if (guideline.title.toLowerCase().includes(gene.toLowerCase())) {
        genesAffected.add(gene);
      }
    }
  });

  return {
    ...data,
    guidelines,
    annotations,
    summary: {
      ...data.summary,
      totalGuidelines: guidelines.length,
      totalLabels: data.labels.length,
      totalAnnotations: annotations.length,
      genesAffected: [...genesAffected],
      testingRecommended: data.summary.testingRecommended,
    },
  };
}
