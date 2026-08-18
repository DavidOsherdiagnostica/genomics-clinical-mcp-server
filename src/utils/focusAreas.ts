const FOCUS_KEYWORDS: Record<string, string[]> = {
  pharmacogenomics: ['pharmacogen', 'drug', 'medication', 'cpic', 'dosing', 'cyp', 'metabolizer'],
  oncology: ['cancer', 'tumor', 'oncology', 'brca', 'chemotherapy', 'carcinoma'],
  cardiology: ['cardiac', 'heart', 'warfarin', 'clopidogrel', 'anticoagul', 'statin'],
  neurology: ['epilep', 'seizure', 'neuro', 'phenytoin'],
  carrier: ['carrier', 'heterozygous', 'recessive'],
};

export function matchesFocusArea(text: string, focusAreas: string[] | undefined): boolean {
  if (!focusAreas?.length) return true;
  const haystack = text.toLowerCase();
  return focusAreas.some((area) => {
    const normalized = area.toLowerCase();
    if (haystack.includes(normalized)) return true;
    const aliases = FOCUS_KEYWORDS[normalized] ?? [];
    return aliases.some((alias) => haystack.includes(alias));
  });
}

export function filterByFocusAreas<T extends object>(
  items: T[],
  focusAreas: string[] | undefined,
  fields: Array<keyof T>,
): T[] {
  if (!focusAreas?.length) return items;
  return items.filter((item) => {
    const text = fields.map((field) => String(item[field] ?? '')).join(' ');
    return matchesFocusArea(text, focusAreas);
  });
}
