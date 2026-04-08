import { prisma } from "../_lib/prisma.js";
import { authenticate } from "../_lib/auth.js";
import { toCsv } from "../_lib/csv.js";

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") return res.status(405).end();

  const user = authenticate(req, res);
  if (!user) return;

  try {
    const docs = await prisma.document.findMany({ include: { project: true } });
    const headers = ["ID", "Nome", "Projeto", "Status", "Validade", "Tipo Arquivo", "URL"];
    const rows = docs.map((d: any) => [
      d.id, d.nome, d.project.nome, d.status,
      d.validade ? d.validade.toISOString().split("T")[0] : "Permanente",
      d.fileType || "N/A", d.url || "",
    ]);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=documentos.csv");
    res.send(toCsv(headers, rows));
  } catch (error) {
    console.error("[GET /api/export/documents]", error);
    res.status(500).json({ error: "Erro ao exportar documentos" });
  }
}
