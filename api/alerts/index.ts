import { prisma } from "../_lib/prisma.js";
import { authenticate, can } from "../_lib/auth.js";

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") return res.status(405).end();

  const user = authenticate(req, res);
  if (!user) return;
  if (!can(user, "alerts:read", res)) return;

  try {
    const isAdmin = ["SUPER_ADMIN", "DIRETORIA"].includes(user.role);
    const alerts = await prisma.alert.findMany({
      where: {
        status: "PENDENTE",
        ...(isAdmin ? {} : { project: { responsavelId: user.id } }),
      },
      include: { project: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(alerts);
  } catch (error) {
    console.error("[GET /api/alerts]", error);
    res.status(500).json({ error: "Erro ao buscar alertas" });
  }
}
