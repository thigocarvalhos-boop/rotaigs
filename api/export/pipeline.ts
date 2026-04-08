import { prisma } from "../_lib/prisma.js";
import { authenticate } from "../_lib/auth.js";
import { toCsv } from "../_lib/csv.js";

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") return res.status(405).end();

  const user = authenticate(req, res);
  if (!user) return;

  try {
    const projects = await prisma.project.findMany({ include: { responsavel: true } });
    const headers = ["ID", "Nome", "Edital", "Financiador", "Área", "Valor", "Status", "Prazo", "Probabilidade", "Risco", "Responsável"];
    const rows = projects.map((p: any) => [
      p.id, p.nome, p.edital, p.financiador, p.area,
      String(p.valor), p.status,
      p.prazo.toISOString().split("T")[0],
      String(p.probabilidade), p.risco, p.responsavel.name,
    ]);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=pipeline.csv");
    res.send(toCsv(headers, rows));
  } catch (error) {
    console.error("[GET /api/export/pipeline]", error);
    res.status(500).json({ error: "Erro ao exportar pipeline" });
  }
}
