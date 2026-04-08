import { prisma } from "../_lib/prisma.js";
import { authenticate } from "../_lib/auth.js";

export default async function handler(req: any, res: any) {
  const user = authenticate(req, res);
  if (!user) return;

  const { id } = req.query;

  // PUT /api/lessons/:id
  if (req.method === "PUT") {
    const { projeto, licao, categoria } = req.body || {};
    try {
      const lesson = await prisma.lessonLearned.update({
        where: { id },
        data: {
          ...(projeto !== undefined && { projeto }),
          ...(licao !== undefined && { licao }),
          ...(categoria !== undefined && { categoria: categoria || null }),
        },
      });
      return res.json(lesson);
    } catch (error) {
      console.error("[PUT /api/lessons/:id]", error);
      return res.status(404).json({ error: "Lição não encontrada" });
    }
  }

  // DELETE /api/lessons/:id
  if (req.method === "DELETE") {
    try {
      await prisma.lessonLearned.delete({ where: { id } });
      return res.json({ success: true });
    } catch (error) {
      console.error("[DELETE /api/lessons/:id]", error);
      return res.status(404).json({ error: "Lição não encontrada" });
    }
  }

  res.status(405).end();
}
