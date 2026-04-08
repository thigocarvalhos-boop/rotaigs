import { prisma } from "./_lib/prisma.js";
import { authenticate, can } from "./_lib/auth.js";

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") return res.status(405).end();

  const user = authenticate(req, res);
  if (!user) return;
  if (!can(user, "audit-logs:read", res)) return;

  try {
    const logs = await prisma.auditLog.findMany({
      include: { user: true, project: true },
      orderBy: { data: "desc" },
      take: 50,
    });
    res.json(logs);
  } catch (error) {
    console.error("[GET /api/audit-logs]", error);
    res.status(500).json({ error: "Erro ao buscar logs" });
  }
}
