import { prisma } from "./_lib/prisma.js";
import { authenticate, can } from "./_lib/auth.js";

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") return res.status(405).end();

  const user = authenticate(req, res);
  if (!user) return;
  if (!can(user, "stats:read", res)) return;

  try {
    const [totalProjects, approvedProjects, totalValue] = await Promise.all([
      prisma.project.count(),
      prisma.project.count({ where: { status: "Aprovado" } }),
      prisma.project.aggregate({ _sum: { valor: true } }),
    ]);

    res.json({
      totalProjects,
      approvedProjects,
      totalValue: totalValue._sum.valor || 0,
      approvalRate: totalProjects > 0 ? (approvedProjects / totalProjects) * 100 : 0,
    });
  } catch (error) {
    console.error("[GET /api/stats]", error);
    res.status(500).json({ error: "Erro ao buscar estatísticas" });
  }
}
