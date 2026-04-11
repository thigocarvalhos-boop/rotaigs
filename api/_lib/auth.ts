import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

if (!JWT_SECRET || !JWT_REFRESH_SECRET) {
  console.error("FATAL: JWT_SECRET e JWT_REFRESH_SECRET são obrigatórios. Configure as variáveis de ambiente.");
}

export { JWT_SECRET, JWT_REFRESH_SECRET };

export const PERMISSIONS: Record<string, string[]> = {
  "expenses:create":  ["SUPER_ADMIN", "DIRETORIA", "COORDENACAO", "FINANCEIRO"],
  "documents:create": ["SUPER_ADMIN", "DIRETORIA", "COORDENACAO", "DOCUMENTAL"],
  "documents:update": ["SUPER_ADMIN", "DIRETORIA", "COORDENACAO", "DOCUMENTAL"],
  "documents:delete": ["SUPER_ADMIN", "DIRETORIA"],
  "audit-logs:read":  ["SUPER_ADMIN", "DIRETORIA", "MONITORAMENTO"],
  "alerts:read":      ["SUPER_ADMIN", "DIRETORIA", "COORDENACAO", "MONITORAMENTO", "FINANCEIRO", "ELABORADOR"],
  "projects:create":  ["SUPER_ADMIN", "DIRETORIA", "COORDENACAO"],
  "projects:update":  ["SUPER_ADMIN", "DIRETORIA", "COORDENACAO"],
  "projects:delete":  ["SUPER_ADMIN", "DIRETORIA"],
  "stats:read":       ["SUPER_ADMIN", "DIRETORIA", "COORDENACAO", "MONITORAMENTO"],
};

// --- Input sanitization helpers (shared across all Vercel API handlers) ---
export function sanitizeString(value: unknown, maxLength = 500): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/<[^>]*>/g, "")
    .replace(/[<>"'&]/g, "")
    .trim()
    .slice(0, maxLength);
}

export function sanitizeNumber(value: unknown, min = 0, max = Number.MAX_SAFE_INTEGER): number {
  const n = Number(value);
  if (isNaN(n)) return min;
  return Math.max(min, Math.min(max, n));
}

export function sanitizeInt(value: unknown, min = 0, max = Number.MAX_SAFE_INTEGER): number {
  return Math.round(sanitizeNumber(value, min, max));
}

export function authenticate(req: any, res: any): any | null {
  if (!JWT_SECRET) {
    res.status(500).json({ error: "Configuração do servidor incompleta." });
    return null;
  }
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    res.status(401).json({ error: "Acesso negado" });
    return null;
  }
  try {
    return jwt.verify(token, JWT_SECRET, { algorithms: ["HS256"] });
  } catch {
    res.status(401).json({ error: "Token inválido" });
    return null;
  }
}

export function can(user: any, permission: string, res: any): boolean {
  const allowed = PERMISSIONS[permission] || [];
  if (!allowed.includes(user?.role)) {
    res.status(403).json({
      error: "Acesso negado",
      requiredRoles: allowed,
      currentRole: user?.role || "desconhecido",
    });
    return false;
  }
  return true;
}
