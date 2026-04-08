import { prisma } from "../_lib/prisma.js";
import { authenticate } from "../_lib/auth.js";
import { toCsv } from "../_lib/csv.js";

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") return res.status(405).end();

  const user = authenticate(req, res);
  if (!user) return;

  try {
    const alerts = await prisma.alert.findMany({ include: { project: true } });
    const headers = ["ID", "Título", "Mensagem", "Nível", "Tipo", "Status", "Projeto", "Prazo", "Criado em"];
    const rows = alerts.map((a: any) => [
      a.id, a.titulo, a.mensagem, a.nivel, a.tipo, a.status,
      a.project?.nome || "Geral",
      a.prazo ? a.prazo.toISOString().split("T")[0] : "N/A",
      a.createdAt.toISOString().split("T")[0],
    ]);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=alertas.csv");
    res.send(toCsv(headers, rows));
  } catch (error) {
    console.error("[GET /api/export/alerts]", error);
    res.status(500).json({ error: "Erro ao exportar alertas" });
  }
}
