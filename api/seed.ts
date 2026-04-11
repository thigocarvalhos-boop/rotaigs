import bcrypt from "bcryptjs";
import { prisma } from "./_lib/prisma.js";

const ADMIN_EMAIL = "admin@guiasocial.org";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).end();

  // Require SEED_SECRET env var to authorize seeding
  const seedSecret = process.env.SEED_SECRET;
  if (!seedSecret) {
    return res.status(403).json({ error: "SEED_SECRET não configurado no servidor" });
  }
  const provided = req.headers["x-seed-secret"] || req.body?.seedSecret;
  if (provided !== seedSecret) {
    return res.status(403).json({ error: "Acesso negado" });
  }

  const password = process.env.ADMIN_DEFAULT_PASSWORD;
  if (!password) {
    return res.status(500).json({ error: "ADMIN_DEFAULT_PASSWORD não configurado. Defina uma senha segura." });
  }

  try {
    const existing = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });
    if (existing) {
      return res.json({ message: "Admin já existe", userId: existing.id });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const admin = await prisma.user.create({
      data: {
        email: ADMIN_EMAIL,
        password: hashedPassword,
        name: "Administrador ROTA",
        role: "SUPER_ADMIN",
      },
    });

    res.status(201).json({ message: "Admin criado", userId: admin.id });
  } catch (error) {
    console.error("[POST /api/seed]", error);
    res.status(500).json({ error: "Falha ao executar seed" });
  }
}
