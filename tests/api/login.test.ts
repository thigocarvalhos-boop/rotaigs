/**
 * Tests for api/auth/login.ts — login validation logic.
 * Tests the handler's input validation without database access.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.stubEnv('JWT_SECRET', 'test-secret-key-for-testing-only-32chars!!');
vi.stubEnv('JWT_REFRESH_SECRET', 'test-refresh-secret-key-32chars!!');

// Mock Prisma
vi.mock('../../api/_lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

// Mock audit service
vi.mock('../../api/_lib/audit', () => ({
  auditService: {
    log: vi.fn(),
  },
}));

const { default: handler } = await import('../../api/auth/login');

function createMockRes() {
  let statusCode = 200;
  let body: any = null;
  const res: any = {
    status: (code: number) => {
      statusCode = code;
      return res;
    },
    json: (data: any) => {
      body = data;
      return res;
    },
    end: () => res,
    getStatusCode: () => statusCode,
    getBody: () => body,
  };
  return res;
}

describe('POST /api/auth/login', () => {
  it('rejects non-POST methods', async () => {
    const res = createMockRes();
    await handler({ method: 'GET', body: {} }, res);
    expect(res.getStatusCode()).toBe(405);
  });

  it('rejects missing email/password', async () => {
    const res = createMockRes();
    await handler({ method: 'POST', body: {} }, res);
    expect(res.getStatusCode()).toBe(400);
    expect(res.getBody().error).toContain('obrigatórios');
  });

  it('rejects non-string email', async () => {
    const res = createMockRes();
    await handler({ method: 'POST', body: { email: 123, password: 'password1234' } }, res);
    expect(res.getStatusCode()).toBe(400);
    expect(res.getBody().error).toContain('inválidos');
  });

  it('rejects non-string password', async () => {
    const res = createMockRes();
    await handler({ method: 'POST', body: { email: 'test@test.com', password: 12345678 } }, res);
    expect(res.getStatusCode()).toBe(400);
    expect(res.getBody().error).toContain('inválidos');
  });

  it('rejects short password (< 8 chars)', async () => {
    const res = createMockRes();
    await handler({ method: 'POST', body: { email: 'test@test.com', password: 'short' } }, res);
    expect(res.getStatusCode()).toBe(400);
    expect(res.getBody().error).toContain('8 caracteres');
  });

  it('returns 401 for non-existent user', async () => {
    const { prisma } = await import('../../api/_lib/prisma');
    (prisma.user.findUnique as any).mockResolvedValue(null);

    const res = createMockRes();
    await handler(
      { method: 'POST', body: { email: 'noone@test.com', password: 'password1234' } },
      res
    );
    expect(res.getStatusCode()).toBe(401);
    expect(res.getBody().error).toBe('Credenciais inválidas');
  });

  it('returns 401 for wrong password', async () => {
    const bcrypt = await import('bcryptjs');
    const { prisma } = await import('../../api/_lib/prisma');
    const hashed = await bcrypt.hash('correctpassword', 12);
    (prisma.user.findUnique as any).mockResolvedValue({
      id: 'u1',
      email: 'admin@test.com',
      password: hashed,
      name: 'Admin',
      role: 'SUPER_ADMIN',
    });

    const res = createMockRes();
    await handler(
      { method: 'POST', body: { email: 'admin@test.com', password: 'wrongpassword' } },
      res
    );
    expect(res.getStatusCode()).toBe(401);
    expect(res.getBody().error).toBe('Credenciais inválidas');
  });

  it('returns tokens for valid credentials', async () => {
    const bcrypt = await import('bcryptjs');
    const { prisma } = await import('../../api/_lib/prisma');
    const hashed = await bcrypt.hash('correctpassword', 12);
    (prisma.user.findUnique as any).mockResolvedValue({
      id: 'u1',
      email: 'admin@test.com',
      password: hashed,
      name: 'Admin',
      role: 'SUPER_ADMIN',
    });

    const res = createMockRes();
    await handler(
      { method: 'POST', body: { email: 'admin@test.com', password: 'correctpassword' } },
      res
    );
    expect(res.getStatusCode()).toBe(200);
    const body = res.getBody();
    expect(body.accessToken).toBeDefined();
    expect(body.refreshToken).toBeDefined();
    expect(body.user.email).toBe('admin@test.com');
    expect(body.user.role).toBe('SUPER_ADMIN');
    // Verify password is not in response
    expect(body.user.password).toBeUndefined();

    // Verify the token is HS256
    const jwt = await import('jsonwebtoken');
    const decoded = jwt.default.decode(body.accessToken, { complete: true }) as any;
    expect(decoded.header.alg).toBe('HS256');
  });
});
