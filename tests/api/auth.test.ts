/**
 * Tests for api/_lib/auth.ts — sanitization helpers and authenticate function.
 * These are the most critical security primitives in the system.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// We test the sanitization functions directly by importing the module.
// Since auth.ts has module-level side effects (JWT_SECRET check), we mock env first.
vi.stubEnv('JWT_SECRET', 'test-secret-key-for-testing-only-32chars!!');
vi.stubEnv('JWT_REFRESH_SECRET', 'test-refresh-secret-key-32chars!!');

// Dynamic import after env is set
const { sanitizeString, sanitizeNumber, sanitizeInt, authenticate, can, PERMISSIONS } = await import('../../api/_lib/auth');

describe('sanitizeString', () => {
  it('returns empty string for non-string input', () => {
    expect(sanitizeString(undefined)).toBe('');
    expect(sanitizeString(null)).toBe('');
    expect(sanitizeString(123)).toBe('');
    expect(sanitizeString({})).toBe('');
    expect(sanitizeString([])).toBe('');
  });

  it('strips HTML tags', () => {
    expect(sanitizeString('<script>alert("xss")</script>Hello')).toBe('alert(xss)Hello');
    expect(sanitizeString('<b>bold</b>')).toBe('bold');
    expect(sanitizeString('<img src="x" onerror="alert(1)">')).toBe('');
  });

  it('strips dangerous characters', () => {
    // '<world>' is first stripped as HTML tag, leaving 'hello'
    expect(sanitizeString('hello<world>')).toBe('hello');
    expect(sanitizeString("it's a \"test\"")).toBe('its a test');
    expect(sanitizeString('a&b')).toBe('ab');
  });

  it('trims whitespace', () => {
    expect(sanitizeString('  hello  ')).toBe('hello');
  });

  it('truncates to maxLength', () => {
    const long = 'a'.repeat(1000);
    expect(sanitizeString(long, 10)).toBe('a'.repeat(10));
    expect(sanitizeString(long)).toBe('a'.repeat(500)); // default maxLength
  });

  it('handles empty string', () => {
    expect(sanitizeString('')).toBe('');
  });

  it('preserves safe content', () => {
    expect(sanitizeString('Projeto Guia Digital 2026')).toBe('Projeto Guia Digital 2026');
    expect(sanitizeString('R$ 320.000,00 - FMCA/COMDICA')).toBe('R$ 320.000,00 - FMCA/COMDICA');
  });
});

describe('sanitizeNumber', () => {
  it('parses valid numbers', () => {
    expect(sanitizeNumber(42)).toBe(42);
    expect(sanitizeNumber('3.14')).toBe(3.14);
    expect(sanitizeNumber('100')).toBe(100);
  });

  it('returns min for NaN', () => {
    expect(sanitizeNumber('abc')).toBe(0);
    expect(sanitizeNumber(undefined)).toBe(0);
    expect(sanitizeNumber(null)).toBe(0);
    expect(sanitizeNumber('abc', 5)).toBe(5);
  });

  it('clamps to min/max', () => {
    expect(sanitizeNumber(-10, 0)).toBe(0);
    expect(sanitizeNumber(200, 0, 100)).toBe(100);
    expect(sanitizeNumber(50, 0, 100)).toBe(50);
  });
});

describe('sanitizeInt', () => {
  it('rounds to nearest integer', () => {
    expect(sanitizeInt(3.7)).toBe(4);
    expect(sanitizeInt(3.2)).toBe(3);
  });

  it('clamps to min/max', () => {
    expect(sanitizeInt(-5, 0)).toBe(0);
    expect(sanitizeInt(150, 0, 100)).toBe(100);
  });

  it('returns min for NaN', () => {
    expect(sanitizeInt('abc')).toBe(0);
    expect(sanitizeInt(undefined, 1)).toBe(1);
  });
});

describe('authenticate', () => {
  let mockReq: any;
  let mockRes: any;
  let resStatus: number;
  let resBody: any;

  beforeEach(() => {
    resStatus = 0;
    resBody = null;
    mockReq = { headers: {} };
    mockRes = {
      status: (code: number) => {
        resStatus = code;
        return { json: (body: any) => { resBody = body; } };
      },
    };
  });

  it('returns null and 401 when no authorization header', () => {
    const result = authenticate(mockReq, mockRes);
    expect(result).toBeNull();
    expect(resStatus).toBe(401);
    expect(resBody.error).toBe('Acesso negado');
  });

  it('returns null and 401 for invalid token', () => {
    mockReq.headers.authorization = 'Bearer invalid-token';
    const result = authenticate(mockReq, mockRes);
    expect(result).toBeNull();
    expect(resStatus).toBe(401);
    expect(resBody.error).toBe('Token inválido');
  });

  it('returns decoded payload for valid HS256 token', async () => {
    const jwt = await import('jsonwebtoken');
    const token = jwt.default.sign(
      { id: 'user-1', email: 'admin@test.com', role: 'SUPER_ADMIN' },
      'test-secret-key-for-testing-only-32chars!!',
      { algorithm: 'HS256', expiresIn: '1h' }
    );
    mockReq.headers.authorization = `Bearer ${token}`;
    const result = authenticate(mockReq, mockRes);
    expect(result).not.toBeNull();
    expect(result.id).toBe('user-1');
    expect(result.email).toBe('admin@test.com');
    expect(result.role).toBe('SUPER_ADMIN');
  });

  it('rejects token with wrong algorithm (none)', async () => {
    // Craft a token with alg:none — this should be rejected
    const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({ id: 'hacker', role: 'SUPER_ADMIN' })).toString('base64url');
    const fakeToken = `${header}.${payload}.`;
    mockReq.headers.authorization = `Bearer ${fakeToken}`;
    const result = authenticate(mockReq, mockRes);
    expect(result).toBeNull();
    expect(resStatus).toBe(401);
  });
});

describe('can (RBAC)', () => {
  let mockRes: any;
  let resStatus: number;
  let resBody: any;

  beforeEach(() => {
    resStatus = 0;
    resBody = null;
    mockRes = {
      status: (code: number) => {
        resStatus = code;
        return { json: (body: any) => { resBody = body; } };
      },
    };
  });

  it('returns true for allowed role', () => {
    expect(can({ role: 'SUPER_ADMIN' }, 'projects:create', mockRes)).toBe(true);
    expect(can({ role: 'DIRETORIA' }, 'projects:create', mockRes)).toBe(true);
    expect(can({ role: 'COORDENACAO' }, 'projects:create', mockRes)).toBe(true);
  });

  it('returns false and 403 for unauthorized role', () => {
    const result = can({ role: 'LEITURA' }, 'projects:create', mockRes);
    expect(result).toBe(false);
    expect(resStatus).toBe(403);
    expect(resBody.error).toBe('Acesso negado');
  });

  it('returns false for unknown role', () => {
    const result = can({ role: 'HACKER' }, 'projects:delete', mockRes);
    expect(result).toBe(false);
    expect(resStatus).toBe(403);
  });

  it('returns false for missing user', () => {
    const result = can(null, 'projects:delete', mockRes);
    expect(result).toBe(false);
  });

  it('documents:delete restricted to SUPER_ADMIN and DIRETORIA only', () => {
    expect(can({ role: 'SUPER_ADMIN' }, 'documents:delete', mockRes)).toBe(true);
    expect(can({ role: 'DIRETORIA' }, 'documents:delete', mockRes)).toBe(true);
    expect(can({ role: 'COORDENACAO' }, 'documents:delete', mockRes)).toBe(false);
    expect(can({ role: 'DOCUMENTAL' }, 'documents:delete', mockRes)).toBe(false);
  });

  it('PERMISSIONS map includes expected critical entries', () => {
    expect(PERMISSIONS['projects:create']).toBeDefined();
    expect(PERMISSIONS['projects:delete']).toBeDefined();
    expect(PERMISSIONS['documents:delete']).toBeDefined();
    expect(PERMISSIONS['expenses:create']).toBeDefined();
  });
});
