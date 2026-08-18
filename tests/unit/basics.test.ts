import { describe, expect, it } from 'vitest';
import { filterPrefix, COMMON_GENES, COMMON_DRUGS } from '../../src/completions/index.ts';
import { validateGeneSymbol, validateRsid } from '../../src/utils/genomicsValidators.ts';

describe('completions helpers', () => {
  it('filters gene prefixes', () => {
    expect(filterPrefix(COMMON_GENES, 'BRC')).toContain('BRCA1');
  });

  it('filters drug prefixes', () => {
    expect(filterPrefix(COMMON_DRUGS, 'war')).toContain('warfarin');
  });
});

describe('genomics validators', () => {
  it('validates gene symbols', () => {
    expect(validateGeneSymbol('brca1')).toBe('BRCA1');
  });

  it('validates rsIDs', () => {
    expect(validateRsid('rs9923231')).toBe('rs9923231');
  });
});
