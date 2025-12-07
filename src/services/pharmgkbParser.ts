/**
 * PharmGKB InfoButton HTML Parser
 * 
 * Parses HTML responses from PharmGKB InfoButton API to structured data.
 * Extracts guidelines, drug labels, and clinical annotations with genotype-phenotype effects.
 */

import * as cheerio from 'cheerio';
import type { CheerioAPI } from 'cheerio';
import type {
  PharmGKBResponse,
  Guideline,
  DrugLabel,
  ClinicalAnnotation,
  GenotypeEffect,
} from '../types/pharmgkb.js';

export class PharmGKBParser {
  private $: CheerioAPI | null = null;

  /**
   * Parse HTML response to structured data
   */
  parse(html: string): PharmGKBResponse {
    this.$ = cheerio.load(html);

    // Check for "no data" case
    if (!this.hasData()) {
      return {
        drugName: this.extractDrugNameFromNoData(),
        hasData: false,
        guidelines: [],
        labels: [],
        annotations: [],
        summary: {
          totalGuidelines: 0,
          totalLabels: 0,
          totalAnnotations: 0,
          genesAffected: [],
          testingRecommended: false,
        },
      };
    }

    // Parse all sections
    const drugName = this.extractDrugName();
    const guidelines = this.parseGuidelines();
    const labels = this.parseLabels();
    const annotations = this.parseAnnotations();

    // Extract genes from annotations
    const genesAffected = new Set<string>();
    annotations.forEach(ann => {
      ann.genes.forEach(gene => genesAffected.add(gene));
    });

    // Check if testing is recommended
    const testingRecommended = labels.some(l => 
      l.testingLevel === 'Required' || l.testingLevel === 'Recommended'
    );

    return {
      drugName,
      hasData: true,
      guidelines,
      labels,
      annotations,
      summary: {
        totalGuidelines: guidelines.length,
        totalLabels: labels.length,
        totalAnnotations: annotations.length,
        genesAffected: Array.from(genesAffected),
        testingRecommended,
      },
    };
  }

  // ========================================================================
  // DETECTION METHODS
  // ========================================================================

  private hasData(): boolean {
    if (!this.$) return false;

    const mainSection = this.$('section.main');
    if (mainSection.length > 0) {
      const text = mainSection.text().toLowerCase();
      if (text.includes('no significant data')) {
        return false;
      }
    }
    return true;
  }

  private extractDrugNameFromNoData(): string | undefined {
    if (!this.$) return undefined;

    const mainSection = this.$('section.main');
    if (mainSection.length > 0) {
      const text = mainSection.text();
      // "ClinPGx has no significant data for metformin."
      const match = text.match(/no significant data for (.+?)\./);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    return undefined;
  }

  private extractDrugName(): string | undefined {
    if (!this.$) return undefined;

    const h2 = this.$('h2');
    if (h2.length > 0) {
      const link = h2.find('a');
      if (link.length > 0) {
        return link.text().trim();
      }
    }
    return undefined;
  }

  // ========================================================================
  // GUIDELINES PARSING
  // ========================================================================

  private parseGuidelines(): Guideline[] {
    if (!this.$) return [];

    const guidelines: Guideline[] = [];
    const section = this.$('section.dosing-guidelines');

    if (section.length === 0) return guidelines;

    section.find('article').each((_: number, article: any) => {
      if (!this.$) return;
      const guideline = this.parseGuidelineArticle(this.$(article));
      if (guideline) {
        guidelines.push(guideline);
      }
    });

    return guidelines;
  }

  private parseGuidelineArticle($article: any): Guideline | null {
    const link = $article.find('a');
    if (link.length === 0) return null;

    const h4 = link.find('h4');
    const title = h4.text().trim();
    const url = link.attr('href') || '';

    const p = $article.find('p');
    const summary = p.length > 0 ? p.text().trim() : undefined;

    const source = this.extractGuidelineSource(title);

    if (!title) return null;

    return { 
      title, 
      url, 
      summary, 
      ...(source !== undefined && { source })
    };
  }

  private extractGuidelineSource(title: string): string | undefined {
    const sources = ['CPIC', 'DPWG', 'CPNDS', 'AHA', 'FDA', 'EMA', 'HCSC', 'RNPGx'];
    const titleUpper = title.toUpperCase();

    for (const source of sources) {
      if (titleUpper.includes(source)) {
        return source;
      }
    }

    return undefined;
  }

  // ========================================================================
  // LABELS PARSING
  // ========================================================================

  private parseLabels(): DrugLabel[] {
    if (!this.$) return [];

    const labels: DrugLabel[] = [];
    const section = this.$('section.drug-labels');

    if (section.length === 0) return labels;

    section.find('article').each((_: number, article: any) => {
      if (!this.$) return;
      const label = this.parseLabelArticle(this.$(article));
      if (label) {
        labels.push(label);
      }
    });

    return labels;
  }

  private parseLabelArticle($article: any): DrugLabel | null {
    if (!this.$) return null;
    const link = $article.find('a');
    if (link.length === 0) return null;

    const h4 = link.find('h4');
    const title = h4.text().trim();
    const url = link.attr('href') || '';

    const alerts: string[] = [];
    let testingLevel: DrugLabel['testingLevel'];

    $article.find('div.alert').each((_: number, alert: any) => {
      if (!this.$) return;
      const $alert = this.$(alert);
      const alertText = $alert.text().trim();
      alerts.push(alertText);

      const classes = $alert.attr('class')?.split(' ') || [];
      if (classes.includes('testing-genetic-testing-required')) {
        testingLevel = 'Required';
      } else if (classes.includes('testing-genetic-testing-recommended') || classes.includes('testing-testing-recommended')) {
        testingLevel = 'Recommended';
      } else if (classes.includes('testing-actionable-pgx')) {
        testingLevel = 'Actionable';
      } else if (classes.includes('testing-informative-pgx')) {
        testingLevel = 'Informative';
      }
    });

    if (!title) return null;

    return { 
      title, 
      url, 
      alerts, 
      ...(testingLevel !== undefined && { testingLevel })
    };
  }

  // ========================================================================
  // ANNOTATIONS PARSING (MOST COMPLEX)
  // ========================================================================

  private parseAnnotations(): ClinicalAnnotation[] {
    if (!this.$) return [];

    const annotations: ClinicalAnnotation[] = [];
    const section = this.$('section.clinical-annotations');

    if (section.length === 0) return annotations;

    // Find all annotation links
    section.find('a[href*="/clinicalAnnotation/"]').each((_: number, link: any) => {
      if (!this.$) return;
      const annotation = this.parseAnnotation(this.$(link));
      if (annotation) {
        annotations.push(annotation);
      }
    });

    return annotations;
  }

  private parseAnnotation($link: any): ClinicalAnnotation | null {
    if (!this.$) return null;

    const h4 = $link.find('h4');
    const title = h4.text().trim();
    const url = $link.attr('href') || '';

    if (!title) return null;

    // Find the two tables that follow this link
    let infoTable: any | null = null;
    let genotypeTable: any | null = null;

    let current = $link;
    for (let i = 0; i < 20; i++) {
      current = current.next();
      if (current.length === 0 || !this.$) break;

      // Stop if we hit the next annotation
      if (current.is('a') && current.attr('href')?.includes('/clinicalAnnotation/')) {
        break;
      }

      if (current.is('table')) {
        const classes = current.attr('class')?.split(' ') || [];

        // First table: info table (has class "clinical-annotation")
        if (classes.includes('clinical-annotation')) {
          infoTable = current;
        }
        // Second table: genotype table (no class)
        else if (classes.length === 0 && infoTable !== null) {
          genotypeTable = current;
          break;
        }
      }
    }

    if (!infoTable) return null;

    // Parse info table
    const info = this.parseInfoTable(infoTable);

    // Parse genotype table (if exists)
    const genotypeEffects = genotypeTable
      ? this.parseGenotypeTable(genotypeTable)
      : [];

    return {
      title,
      url,
      evidenceLevel: info.level || 'Unknown',
      type: info.type || 'Unknown',
      genes: info.genes || [],
      ...(info.variant !== undefined && { variant: info.variant }),
      genotypeEffects,
    };
  }

  private parseInfoTable($table: any): {
    level?: string;
    type?: string;
    genes?: string[];
    variant?: string;
  } {
    const info: {
      level?: string;
      type?: string;
      genes?: string[];
      variant?: string;
    } = {};

    if (!this.$) return info;

    $table.find('tr').each((_: number, row: any) => {
      if (!this.$) return;
      const $row = this.$(row);
      const th = $row.find('th');
      const td = $row.find('td');

      if (th.length === 0 || td.length === 0) return;

      const key = th.text().trim().toLowerCase();
      const value = td.text().trim();

      if (key.includes('level')) {
        info.level = value;
      } else if (key.includes('type')) {
        info.type = value;
      } else if (key.includes('gene')) {
        info.genes = value.split(',').map((g) => g.trim());
      } else if (key.includes('variant')) {
        info.variant = value;
      }
    });

    return info;
  }

  private parseGenotypeTable($table: any): GenotypeEffect[] {
    const effects: GenotypeEffect[] = [];

    if (!this.$) return effects;

    const tbody = $table.find('tbody');
    if (tbody.length === 0) return effects;

    tbody.find('tr').each((_: number, row: any) => {
      if (!this.$) return;
      const $row = this.$(row);
      const tds = $row.find('td');

      if (tds.length < 2) return;

      const variant = this.$(tds[0]).text().trim();
      const effect = this.$(tds[1]).text().trim();

      if (variant && effect) {
        effects.push({ variant, effect });
      }
    });

    return effects;
  }
}

/**
 * Convenience function to parse PharmGKB HTML
 */
export function parsePharmGKBHtml(html: string): PharmGKBResponse {
  const parser = new PharmGKBParser();
  return parser.parse(html);
}

