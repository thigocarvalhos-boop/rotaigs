import bcrypt from "bcryptjs";
import { prisma } from "./_lib/prisma.js";

const ADMIN_EMAIL = "admin@guiasocial.org";
const ADMIN_DEFAULT_PASSWORD = "admin123";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    const existing = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });
    if (existing) {
      return res.json({ message: "Admin já existe", userId: existing.id });
    }

    const hashedPassword = await bcrypt.hash(ADMIN_DEFAULT_PASSWORD, 12);
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
    const detail = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: "Falha ao executar seed", detail });
  }
}
