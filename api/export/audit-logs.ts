import { prisma } from "../_lib/prisma.js";
import { authenticate } from "../_lib/auth.js";
import { toCsv } from "../_lib/csv.js";

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") return res.status(405).end();

  const user = authenticate(req, res);
  if (!user) return;

  try {
    const logs = await prisma.auditLog.findMany({
      include: { user: true, project: true },
      orderBy: { data: "desc" },
      take: 500,
    });
    const headers = ["ID", "Data", "Usuário", "Ação", "Entidade", "ID Entidade", "Projeto"];
    const rows = logs.map((l: any) => [
      l.id, l.data.toISOString(), l.user.name, l.acao, l.entidade,
      l.entidadeId || "", l.project?.nome || "",
    ]);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=auditoria.csv");
    res.send(toCsv(headers, rows));
  } catch (error) {
    console.error("[GET /api/export/audit-logs]", error);
    res.status(500).json({ error: "Erro ao exportar auditoria" });
  }
}
