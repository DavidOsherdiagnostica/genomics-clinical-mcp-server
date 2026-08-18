import { describe, expect, it } from 'vitest';
import {
  annotationMatchesVariant,
  filterPharmGKBResponse,
  matchesDrugClassFilter,
  matchesEvidenceLevel,
  normalizeEvidenceLevel,
} from '../../src/utils/pharmgkbFilters.js';

describe('pharmgkbFilters', () => {
  it('normalizes evidence levels from ClinPGx and InfoButton formats', () => {
    expect(normalizeEvidenceLevel('Level 1A')).toBe('1A');
    expect(normalizeEvidenceLevel('1B')).toBe('1B');
  });

  it('applies evidence level thresholds', () => {
    expect(matchesEvidenceLevel('1A', '2A_and_above')).toBe(true);
    expect(matchesEvidenceLevel('3', '2A_and_above')).toBe(false);
    expect(matchesEvidenceLevel('1A', '1A_only')).toBe(true);
    expect(matchesEvidenceLevel('1B', '1A_only')).toBe(false);
  });

  it('matches drug class filters using curated classes and ClinPGx class chemicals', () => {
    expect(matchesDrugClassFilter('warfarin', ['Anticoagulants'], 'CYP2C9')).toBe(true);
    expect(matchesDrugClassFilter('ibuprofen', ['NSAID'], 'CYP2C9')).toBe(true);
    expect(
      matchesDrugClassFilter('Antiinflammatory agents, non-steroids', ['NSAID'], 'CYP2C9'),
    ).toBe(true);
    expect(matchesDrugClassFilter('metformin', ['NSAID'], 'CYP2C9')).toBe(false);
  });

  it('matches variant and genotype filters against ClinPGx annotation location', () => {
    const annotation = {
      name: 'CYP2C9*1, CYP2C9*3; warfarin (level 1A Dosage)',
      location: {
        displayName: 'CYP2C9*1, CYP2C9*3',
        haplotypes: [{ symbol: 'CYP2C9*3', name: '*3' }],
      },
    };

    expect(annotationMatchesVariant(annotation, '*3')).toBe(true);
    expect(annotationMatchesVariant(annotation, undefined, '*1/*3')).toBe(true);
    expect(annotationMatchesVariant(annotation, '*2')).toBe(false);
  });

  it('filters parsed PharmGKB responses by evidence, type, and gene', () => {
    const filtered = filterPharmGKBResponse(
      {
        guidelines: [{ title: 'CPIC warfarin and CYP2C9', url: 'https://example.com' }],
        labels: [],
        annotations: [
          {
            title: 'CYP2C9 dosage',
            evidenceLevel: 'Level 1A',
            type: 'Dosage',
            genes: ['CYP2C9'],
          },
          {
            title: 'CYP2C19 metabolism',
            evidenceLevel: 'Level 3',
            type: 'Metabolism/PK',
            genes: ['CYP2C19'],
          },
        ],
        summary: {
          totalGuidelines: 1,
          totalLabels: 0,
          totalAnnotations: 2,
          genesAffected: ['CYP2C9', 'CYP2C19'],
          testingRecommended: false,
        },
      },
      {
        evidenceLevelFilter: '2A_and_above',
        interactionTypeFilter: ['dosage'],
        geneFilter: ['CYP2C9'],
      },
    );

    expect(filtered.annotations).toHaveLength(1);
    expect(filtered.annotations[0]?.genes).toEqual(['CYP2C9']);
    expect(filtered.summary.totalAnnotations).toBe(1);
  });
});
