import { prisma } from "../_lib/prisma.js";
import { authenticate } from "../_lib/auth.js";
import { toCsv } from "../_lib/csv.js";

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") return res.status(405).end();

  const user = authenticate(req, res);
  if (!user) return;

  try {
    const lessons = await prisma.lessonLearned.findMany({ orderBy: { createdAt: "desc" } });
    const headers = ["ID", "Projeto", "Lição", "Categoria", "Autor", "Data"];
    const rows = lessons.map((l: any) => [
      l.id, l.projeto, l.licao, l.categoria || "", l.autor || "",
      l.createdAt.toISOString().split("T")[0],
    ]);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=licoes-aprendidas.csv");
    res.send(toCsv(headers, rows));
  } catch (error) {
    console.error("[GET /api/export/lessons]", error);
    res.status(500).json({ error: "Erro ao exportar lições" });
  }
}
