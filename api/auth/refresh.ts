import jwt from "jsonwebtoken";
import { prisma } from "../_lib/prisma.js";
import { JWT_SECRET, JWT_REFRESH_SECRET } from "../_lib/auth.js";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).end();

  if (!JWT_SECRET || !JWT_REFRESH_SECRET) {
    return res.status(500).json({ error: "Configuração do servidor incompleta." });
  }

  const { refreshToken } = req.body || {};
  if (!refreshToken) return res.status(401).json({ error: "Refresh token ausente" });

  try {
    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET, { algorithms: ["HS256"] }) as any;
    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user) return res.status(401).json({ error: "Usuário não encontrado" });

    const accessToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: "15m", algorithm: "HS256" }
    );
    res.json({ accessToken });
  } catch {
    res.status(401).json({ error: "Refresh token inválido ou expirado" });
  }
}
