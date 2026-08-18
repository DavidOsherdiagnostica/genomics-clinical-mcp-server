import { describe, expect, it } from 'vitest';
import {
  mapClinVarRecord,
  matchesConsequenceFilter,
  matchesRegionPathogenicityFilter,
  meetsConfidenceThreshold,
  sortClinVarRecords,
  matchesPathogenicityThreshold,
} from '../../src/utils/clinvarHelpers.js';
import { parseVcfContent } from '../../src/utils/vcfParser.js';
import { filterByFocusAreas } from '../../src/utils/focusAreas.js';

const sampleRecord = {
  uid: '4884209',
  accession: 'VCV004884209',
  title: 'NM_007294.4(BRCA1):c.241_256del (p.Gln81fs)',
  gene_sort: 'BRCA1',
  location_sort: '00000000000043104913',
  genes: [{ symbol: 'BRCA1' }],
  molecular_consequence_list: ['frameshift variant', 'intron variant'],
  germline_classification: {
    description: 'Pathogenic',
    review_status: 'reviewed by expert panel',
    trait_set: [{ trait_name: 'Breast-ovarian cancer, familial, susceptibility to, 1' }],
  },
  variation_set: [
    {
      variation_loc: [{ status: 'current', assembly_name: 'GRCh38', start: '43104913', stop: '43104928' }],
    },
  ],
};

describe('clinvarHelpers', () => {
  it('maps esummary records with consequence and position', () => {
    const mapped = mapClinVarRecord(sampleRecord);
    expect(mapped.gene).toBe('BRCA1');
    expect(mapped.position).toBe(43104913);
    expect(mapped.consequences).toContain('frameshift variant');
  });

  it('filters region pathogenicity and consequences', () => {
    expect(matchesRegionPathogenicityFilter('Pathogenic', 'pathogenic_only')).toBe(true);
    expect(matchesRegionPathogenicityFilter('Benign', 'pathogenic_only')).toBe(false);
    expect(matchesConsequenceFilter(['frameshift variant'], ['frameshift'])).toBe(true);
  });

  it('evaluates review status confidence', () => {
    expect(meetsConfidenceThreshold('reviewed by expert panel', 'high')).toBe(true);
    expect(meetsConfidenceThreshold('no assertion criteria provided', 'high')).toBe(false);
    expect(meetsConfidenceThreshold('criteria provided, single submitter', 'medium')).toBe(true);
  });

  it('sorts by clinical importance', () => {
    const sorted = sortClinVarRecords(
      [
        { ...mapClinVarRecord(sampleRecord), significance: 'Benign' },
        { ...mapClinVarRecord(sampleRecord), significance: 'Pathogenic' },
      ],
      'clinical_importance',
    );
    expect(sorted[0]?.significance).toBe('Pathogenic');
  });

  it('applies summary pathogenicity thresholds', () => {
    expect(matchesPathogenicityThreshold('Pathogenic', 'pathogenic_only')).toBe(true);
    expect(matchesPathogenicityThreshold('Likely pathogenic', 'pathogenic_only')).toBe(false);
    expect(matchesPathogenicityThreshold('Likely pathogenic', 'likely_pathogenic')).toBe(true);
    expect(matchesPathogenicityThreshold('Uncertain significance', 'uncertain_and_above')).toBe(true);
    expect(matchesPathogenicityThreshold('Benign', 'uncertain_and_above')).toBe(false);
  });
});

describe('vcfParser', () => {
  it('parses variants and carrier zygosity from VCF', () => {
    const vcf = `#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\tFORMAT\tSAMPLE
17\t43044295\trs80357906\tG\tA\t.\t.\t.\tGT\t0/1`;

    const variants = parseVcfContent(vcf, 5);
    expect(variants).toHaveLength(1);
    expect(variants[0]?.rsid).toBe('rs80357906');
    expect(variants[0]?.zygosity).toBe('heterozygous');
    expect(variants[0]?.is_carrier).toBe(true);
  });
});

describe('focusAreas', () => {
  it('filters findings by focus area keywords', () => {
    const filtered = filterByFocusAreas(
      [
        { variant: 'BRCA1', diseases: 'Breast cancer', gene: 'BRCA1' },
        { variant: 'CYP2C9', diseases: 'Drug response', gene: 'CYP2C9' },
      ],
      ['oncology'],
      ['variant', 'diseases', 'gene'],
    );

    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.gene).toBe('BRCA1');
  });
});
