import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET as string;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET as string;

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

export function authenticate(req: any, res: any): any | null {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    res.status(401).json({ error: "Acesso negado" });
    return null;
  }
  try {
    return jwt.verify(token, JWT_SECRET);
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
