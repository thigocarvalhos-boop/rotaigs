/**
 * Tests for src/utils/format.ts — utility functions used across the frontend.
 */
import { describe, it, expect } from 'vitest';
import { fmt, isDocExpired, isDocExpiringSoon, docStatusColor, docStatusLabel, cn } from '../../src/utils/format';

describe('fmt (currency formatter)', () => {
  it('formats millions', () => {
    expect(fmt(1000000)).toBe('R$ 1.0M');
    expect(fmt(2500000)).toBe('R$ 2.5M');
  });

  it('formats thousands', () => {
    expect(fmt(1000)).toBe('R$ 1k');
    expect(fmt(320000)).toBe('R$ 320k');
  });

  it('formats small values', () => {
    expect(fmt(500)).toBe('R$ 500');
    expect(fmt(0)).toBe('R$ 0');
  });
});

describe('isDocExpired', () => {
  it('returns false for null/undefined', () => {
    expect(isDocExpired(null)).toBe(false);
    expect(isDocExpired(undefined)).toBe(false);
  });

  it('returns true for past date', () => {
    expect(isDocExpired('2020-01-01')).toBe(true);
  });

  it('returns false for future date', () => {
    const future = new Date(Date.now() + 365 * 86400000).toISOString();
    expect(isDocExpired(future)).toBe(false);
  });
});

describe('isDocExpiringSoon', () => {
  it('returns false for null/undefined', () => {
    expect(isDocExpiringSoon(null)).toBe(false);
    expect(isDocExpiringSoon(undefined)).toBe(false);
  });

  it('returns true for date within 30 days', () => {
    const soon = new Date(Date.now() + 10 * 86400000).toISOString();
    expect(isDocExpiringSoon(soon)).toBe(true);
  });

  it('returns false for already expired', () => {
    expect(isDocExpiringSoon('2020-01-01')).toBe(false);
  });

  it('returns false for date far in the future', () => {
    const far = new Date(Date.now() + 365 * 86400000).toISOString();
    expect(isDocExpiringSoon(far)).toBe(false);
  });

  it('respects custom days parameter', () => {
    const inFiveDays = new Date(Date.now() + 5 * 86400000).toISOString();
    expect(isDocExpiringSoon(inFiveDays, 3)).toBe(false);
    expect(isDocExpiringSoon(inFiveDays, 7)).toBe(true);
  });
});

describe('docStatusColor', () => {
  it('returns red for expired', () => {
    expect(docStatusColor('Aprovado', '2020-01-01')).toContain('red');
  });

  it('returns amber for expiring soon', () => {
    const soon = new Date(Date.now() + 10 * 86400000).toISOString();
    expect(docStatusColor('Aprovado', soon)).toContain('amber');
  });

  it('returns emerald for approved and valid', () => {
    const future = new Date(Date.now() + 365 * 86400000).toISOString();
    expect(docStatusColor('Aprovado', future)).toContain('emerald');
  });

  it('returns amber for non-approved', () => {
    const future = new Date(Date.now() + 365 * 86400000).toISOString();
    expect(docStatusColor('Pendente', future)).toContain('amber');
  });
});

describe('docStatusLabel', () => {
  it('returns "Vencido" for expired', () => {
    expect(docStatusLabel('Aprovado', '2020-01-01')).toBe('Vencido');
  });

  it('returns "A Vencer" for expiring soon', () => {
    const soon = new Date(Date.now() + 10 * 86400000).toISOString();
    expect(docStatusLabel('Aprovado', soon)).toBe('A Vencer');
  });

  it('returns original status when not expiring', () => {
    const future = new Date(Date.now() + 365 * 86400000).toISOString();
    expect(docStatusLabel('Aprovado', future)).toBe('Aprovado');
    expect(docStatusLabel('Pendente', future)).toBe('Pendente');
  });
});

describe('cn (classnames merger)', () => {
  it('merges classnames', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('handles conditional classnames', () => {
    expect(cn('base', false && 'hidden', 'extra')).toBe('base extra');
  });

  it('merges tailwind classes (last wins)', () => {
    const result = cn('text-red-500', 'text-blue-500');
    expect(result).toBe('text-blue-500');
  });
});
