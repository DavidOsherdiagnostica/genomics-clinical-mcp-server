export interface ParsedVcfVariant {
  chrom: string;
  pos: number;
  ref: string;
  alt: string;
  rsid?: string;
  genotype?: string;
  zygosity: 'homozygous_alt' | 'heterozygous' | 'homozygous_ref' | 'unknown';
  is_carrier: boolean;
  search_term: string;
}

function parseGenotype(gt: string): ParsedVcfVariant['zygosity'] {
  const alleles = gt.split(/[/|]/).map((allele) => allele.trim());
  if (alleles.length < 2) return 'unknown';

  const hasAlt = alleles.some((allele) => allele !== '0' && allele !== '.');
  const hasRef = alleles.some((allele) => allele === '0');
  const allAlt = alleles.every((allele) => allele !== '0' && allele !== '.');

  if (allAlt) return 'homozygous_alt';
  if (hasAlt && hasRef) return 'heterozygous';
  if (!hasAlt) return 'homozygous_ref';
  return 'unknown';
}

export function parseVcfContent(vcf: string, maxVariants = 50): ParsedVcfVariant[] {
  const lines = vcf.split(/\r?\n/).filter((line) => line && !line.startsWith('#'));
  const variants: ParsedVcfVariant[] = [];

  for (const line of lines) {
    if (variants.length >= maxVariants) break;

    const columns = line.split('\t');
    if (columns.length < 5) continue;

    const [chrom, pos, id, ref, alt] = columns;
    if (!chrom || !pos || !ref || !alt || alt === '.') continue;

    const format = columns[8];
    const sample = columns[9];
    let genotype: string | undefined;
    let zygosity: ParsedVcfVariant['zygosity'] = 'unknown';

    if (format && sample) {
      const gtIndex = format.split(':').indexOf('GT');
      if (gtIndex >= 0) {
        genotype = sample.split(':')[gtIndex];
        if (genotype) {
          zygosity = parseGenotype(genotype);
        }
      }
    }

    const firstAlt = alt.split(',')[0];
    const rsid = id && id !== '.' ? id : undefined;
    const searchTerm = rsid ?? `${chrom}[chr] AND ${pos}[chrpos]`;

    variants.push({
      chrom,
      pos: parseInt(pos, 10),
      ref,
      alt: firstAlt ?? alt,
      ...(rsid ? { rsid } : {}),
      ...(genotype ? { genotype } : {}),
      zygosity,
      is_carrier: zygosity === 'heterozygous',
      search_term: searchTerm,
    });
  }

  return variants;
}
