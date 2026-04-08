import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../_lib/prisma.js";
import { auditService } from "../_lib/audit.js";
import { JWT_SECRET, JWT_REFRESH_SECRET } from "../_lib/auth.js";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).end();

  if (!JWT_SECRET || !JWT_REFRESH_SECRET) {
    console.error("[POST /api/auth/login] JWT_SECRET ou JWT_REFRESH_SECRET não configurados");
    return res.status(500).json({ error: "Configuração do servidor incompleta. Verifique as variáveis de ambiente JWT_SECRET e JWT_REFRESH_SECRET." });
  }

  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: "Email e senha são obrigatórios" });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ error: "Credenciais inválidas" });

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(401).json({ error: "Credenciais inválidas" });

    const accessToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: "15m" }
    );
    const refreshToken = jwt.sign(
      { id: user.id },
      JWT_REFRESH_SECRET,
      { expiresIn: "7d" }
    );

    await auditService.log({
      userId: user.id,
      acao: "LOGIN",
      entidade: "User",
      entidadeId: user.id,
    });

    res.json({
      accessToken,
      refreshToken,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    console.error("[POST /api/auth/login]", error);
    const msg = error instanceof Error ? error.message : "";
    if (msg.includes("Can't reach database") || msg.includes("connect")) {
      return res.status(500).json({ error: "Não foi possível conectar ao banco de dados. Verifique DATABASE_URL." });
    }
    if (msg.includes("does not exist") || msg.includes("relation")) {
      return res.status(500).json({ error: "Tabelas não encontradas. Execute as migrations do Prisma." });
    }
    res.status(500).json({ error: "Erro interno no servidor" });
  }
}
