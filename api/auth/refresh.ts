import jwt from "jsonwebtoken";
import { prisma } from "../_lib/prisma.js";
import { JWT_SECRET, JWT_REFRESH_SECRET } from "../_lib/auth.js";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).end();

  const { refreshToken } = req.body || {};
  if (!refreshToken) return res.status(401).json({ error: "Refresh token ausente" });

  try {
    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as any;
    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user) return res.status(401).json({ error: "Usuário não encontrado" });

    const accessToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: "15m" }
    );
    res.json({ accessToken });
  } catch {
    res.status(401).json({ error: "Refresh token inválido ou expirado" });
  }
}
