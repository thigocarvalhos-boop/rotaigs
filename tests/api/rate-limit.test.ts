/**
 * Tests for api/_lib/rate-limit.ts — serverless rate limiting.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { rateLimit, getClientIp } from '../../api/_lib/rate-limit';

describe('rateLimit', () => {
  // Use unique keys per test to avoid interference
  let keyCounter = 0;
  const uniqueKey = () => `test-ip-${++keyCounter}-${Date.now()}`;

  it('allows requests within limit', () => {
    const key = uniqueKey();
    for (let i = 0; i < 5; i++) {
      const result = rateLimit(key, 5, 60000);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(5 - (i + 1));
    }
  });

  it('blocks requests exceeding limit', () => {
    const key = uniqueKey();
    for (let i = 0; i < 5; i++) {
      rateLimit(key, 5, 60000);
    }
    const result = rateLimit(key, 5, 60000);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.retryAfterMs).toBeGreaterThan(0);
  });

  it('resets after window expires', () => {
    const key = uniqueKey();
    // Fill up the limit with a tiny window
    for (let i = 0; i < 3; i++) {
      rateLimit(key, 3, 1); // 1ms window
    }
    // Wait for window to expire
    const result = rateLimit(key, 3, 1);
    // With 1ms window, the entry should have expired
    expect(result.allowed).toBe(true);
  });

  it('different keys are independent', () => {
    const key1 = uniqueKey();
    const key2 = uniqueKey();
    // Fill key1
    for (let i = 0; i < 2; i++) {
      rateLimit(key1, 2, 60000);
    }
    expect(rateLimit(key1, 2, 60000).allowed).toBe(false);
    // key2 should still work
    expect(rateLimit(key2, 2, 60000).allowed).toBe(true);
  });
});

describe('getClientIp', () => {
  it('extracts from x-forwarded-for', () => {
    expect(getClientIp({ headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' } })).toBe('1.2.3.4');
  });

  it('extracts from x-real-ip', () => {
    expect(getClientIp({ headers: { 'x-real-ip': '10.0.0.1' } })).toBe('10.0.0.1');
  });

  it('falls back to socket remoteAddress', () => {
    expect(getClientIp({ headers: {}, socket: { remoteAddress: '127.0.0.1' } })).toBe('127.0.0.1');
  });

  it('returns "unknown" when no IP info available', () => {
    expect(getClientIp({ headers: {} })).toBe('unknown');
  });
});
