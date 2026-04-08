import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../_lib/prisma.js";
import { auditService } from "../_lib/audit.js";
import { JWT_SECRET, JWT_REFRESH_SECRET } from "../_lib/auth.js";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).end();

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
    res.status(500).json({ error: "Erro interno no servidor" });
  }
}
