export const COMMON_GENES = [
  'BRCA1', 'BRCA2', 'TP53', 'CFTR', 'CYP2C9', 'CYP2C19', 'CYP2D6', 'CYP3A4',
  'VKORC1', 'SLCO1B1', 'TPMT', 'DPYD', 'UGT1A1', 'G6PD', 'HLA-B',
];

export const COMMON_DRUGS = [
  'warfarin', 'clopidogrel', 'simvastatin', 'codeine', 'tamoxifen', 'azathioprine',
  'capecitabine', 'fluorouracil', 'phenytoin', 'omeprazole', 'escitalopram',
  'metoprolol', 'tramadol', 'irinotecan', 'abacavir', 'carbamazepine',
];

export function filterPrefix(values: string[], prefix: string): string[] {
  const normalized = prefix.toLowerCase();
  return values.filter((value) => value.toLowerCase().startsWith(normalized)).slice(0, 20);
}

export function registerCompletions(): void {
  // Completions are provided via completable() wrappers on prompt/tool schemas.
}
