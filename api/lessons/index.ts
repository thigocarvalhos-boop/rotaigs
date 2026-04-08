import { prisma } from "../_lib/prisma.js";
import { authenticate } from "../_lib/auth.js";

export default async function handler(req: any, res: any) {
  const user = authenticate(req, res);
  if (!user) return;

  // GET /api/lessons
  if (req.method === "GET") {
    try {
      const lessons = await prisma.lessonLearned.findMany({
        orderBy: { createdAt: "desc" },
      });
      return res.json(lessons);
    } catch (error) {
      console.error("[GET /api/lessons]", error);
      return res.status(500).json({ error: "Erro ao buscar lições aprendidas" });
    }
  }

  // POST /api/lessons
  if (req.method === "POST") {
    const { projeto, licao, categoria } = req.body || {};
    if (!projeto?.trim() || !licao?.trim()) {
      return res.status(400).json({ error: "Campos 'projeto' e 'licao' são obrigatórios" });
    }
    try {
      const lesson = await prisma.lessonLearned.create({
        data: {
          projeto,
          licao,
          categoria: categoria || null,
          autor: user.email,
        },
      });
      return res.status(201).json(lesson);
    } catch (error) {
      console.error("[POST /api/lessons]", error);
      return res.status(400).json({ error: "Erro ao criar lição aprendida" });
    }
  }

  res.status(405).end();
}
