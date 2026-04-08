import { prisma } from "../_lib/prisma.js";
import { authenticate, can } from "../_lib/auth.js";
import { auditService } from "../_lib/audit.js";

export default async function handler(req: any, res: any) {
  const user = authenticate(req, res);
  if (!user) return;

  // GET /api/documents
  if (req.method === "GET") {
    try {
      const docs = await prisma.document.findMany({
        include: { project: true },
        orderBy: { nome: "asc" },
      });
      return res.json(docs);
    } catch (error) {
      console.error("[GET /api/documents]", error);
      return res.status(500).json({ error: "Erro ao buscar documentos" });
    }
  }

  // POST /api/documents
  if (req.method === "POST") {
    if (!can(user, "documents:create", res)) return;
    const { projectId, nome, validade, url, fileType } = req.body || {};
    try {
      const doc = await prisma.document.create({
        data: {
          projectId,
          nome,
          validade: validade ? new Date(validade) : null,
          url: url || null,
          fileType: fileType || null,
          status: "Pendente",
        },
      });

      await auditService.log({
        userId: user.id,
        projectId,
        acao: "UPLOAD",
        entidade: "Document",
        entidadeId: doc.id,
        depois: doc,
      });

      return res.status(201).json(doc);
    } catch (error) {
      console.error("[POST /api/documents]", error);
      return res.status(400).json({ error: "Erro ao salvar documento" });
    }
  }

  res.status(405).end();
}
