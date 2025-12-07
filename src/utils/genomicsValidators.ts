/**
 * Genomics Validation Utilities
 * Implements specific validators defined in Specification.md
 */

import { z } from 'zod';
import { GenericError, ErrorType, ErrorSeverity } from '../types/errors.js';

/**
 * Validates HGNC gene symbol format
 */
export function validateGeneSymbol(input: string): string {
  const normalized = input.trim().toUpperCase();
  if (!/^[A-Z0-9-]{1,15}$/.test(normalized)) {
    throw new GenericError(ErrorType.INVALID_INPUT, `Invalid gene symbol: ${input}`, {
      severity: ErrorSeverity.LOW,
      suggestions: ['Use standard HGNC symbol (e.g., BRCA1, TP53)', 'Ensure uppercase letters and numbers only'],
      details: { input, expected: 'Uppercase alphanumeric, 1-15 chars' }
    });
  }
  return normalized;
}

/**
 * Validates dbSNP rsID format
 */
export function validateRsid(input: string): string {
  const normalized = input.trim().toLowerCase();
  if (!/^rs\d{1,15}$/.test(normalized)) {
    throw new GenericError(ErrorType.INVALID_INPUT, `Invalid rsID: ${input}`, {
      severity: ErrorSeverity.LOW,
      suggestions: ['Must start with "rs" followed by digits', 'Example: rs9923231'],
      details: { input, expected: 'rs[digits]' }
    });
  }
  return normalized;
}

/**
 * Validates HGVS notation
 */
export function validateHgvs(input: string): string {
  const normalized = input.trim();
  // Basic HGVS check - looks for reference sequence prefix or standard notation markers
  if (!/^([A-Z]{2}_\d+\.\d+:|[cgmnrp]\.)/.test(normalized)) {
    throw new GenericError(ErrorType.INVALID_INPUT, `Invalid HGVS notation: ${input}`, {
      severity: ErrorSeverity.LOW,
      suggestions: [
        'Include reference sequence (e.g., NM_007294.4:c.3101_3102del)',
        'Use standard prefixes (c., p., g., m., n., r.)'
      ],
      details: { input, expected: 'HGVS standard format' }
    });
  }
  return normalized;
}

/**
 * Validates genomic location
 */
export function validateGenomicLocation(chr: string, start: number, end: number, build: string): void {
  const validChrs = new Set([...Array.from({length: 22}, (_, i) => String(i + 1)), 'X', 'Y', 'MT']);
  const normalizedChr = chr.replace(/^chr/i, '').toUpperCase();

  if (!validChrs.has(normalizedChr)) {
    throw new GenericError(ErrorType.INVALID_INPUT, `Invalid chromosome: ${chr}`, {
      severity: ErrorSeverity.LOW,
      suggestions: ['Use 1-22, X, Y, or MT'],
      details: { input: chr }
    });
  }

  if (start < 1 || !Number.isInteger(start)) {
    throw new GenericError(ErrorType.INVALID_INPUT, `Invalid start position: ${start}`, {
      severity: ErrorSeverity.LOW,
      suggestions: ['Start position must be a positive integer'],
      details: { input: start }
    });
  }

  if (end < start || !Number.isInteger(end)) {
    throw new GenericError(ErrorType.INVALID_INPUT, `Invalid end position: ${end}`, {
      severity: ErrorSeverity.LOW,
      suggestions: ['End position must be greater than or equal to start position'],
      details: { start, end }
    });
  }

  if (!['GRCh37', 'GRCh38'].includes(build)) {
    throw new GenericError(ErrorType.INVALID_INPUT, `Invalid genome build: ${build}`, {
      severity: ErrorSeverity.LOW,
      suggestions: ['Use GRCh37 or GRCh38'],
      details: { input: build }
    });
  }
}

/**
 * Validates RxNorm CUI
 */
export function validateRxcui(input: string): string {
  const normalized = input.trim();
  if (!/^\d{1,8}$/.test(normalized)) {
    throw new GenericError(ErrorType.INVALID_INPUT, `Invalid RxCUI: ${input}`, {
      severity: ErrorSeverity.LOW,
      suggestions: ['RxCUI must be a numeric string', 'Length 1-8 digits'],
      details: { input }
    });
  }
  return normalized;
}

/**
 * Validates Genotype format
 */
export function validateGenotype(input: string): string {
  const normalized = input.trim();
  // Basic check for star alleles or nucleotide pairs
  // Examples: *1/*3, *2, T/T, TT, C/G
  if (!/^(\*[\d\w]+(\/\*[\d\w]+)?|[ATCGatcg](\/[ATCGatcg])?|[ATCGatcg]{2})$/.test(normalized)) {
    throw new GenericError(ErrorType.INVALID_INPUT, `Invalid genotype format: ${input}`, {
      severity: ErrorSeverity.LOW,
      suggestions: ['Use star allele format (e.g., *1/*3)', 'Use nucleotide format (e.g., T/T or TT)'],
      details: { input }
    });
  }
  return normalized;
}

