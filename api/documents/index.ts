import { prisma } from "../_lib/prisma.js";
import { authenticate, can, sanitizeString, sanitizeInt } from "../_lib/auth.js";
import { auditService } from "../_lib/audit.js";

export default async function handler(req: any, res: any) {
  const user = authenticate(req, res);
  if (!user) return;

  // GET /api/documents
  if (req.method === "GET") {
    try {
      const page = sanitizeInt(req.query?.page, 1);
      const limit = Math.min(sanitizeInt(req.query?.limit, 1, 100) || 50, 100);
      const skip = (page - 1) * limit;

      const [docs, total] = await Promise.all([
        prisma.document.findMany({
          include: { project: true },
          orderBy: { nome: "asc" },
          skip,
          take: limit,
        }),
        prisma.document.count(),
      ]);
      return res.json({ data: docs, total, page, limit });
    } catch (error) {
      console.error("[GET /api/documents]", error);
      return res.status(500).json({ error: "Erro ao buscar documentos" });
    }
  }

  // POST /api/documents
  if (req.method === "POST") {
    if (!can(user, "documents:create", res)) return;
    const { projectId, nome, validade, url, fileType } = req.body || {};

    const sanitizedNome = sanitizeString(nome, 200);
    if (!projectId || !sanitizedNome) {
      return res.status(400).json({ error: "projectId e nome são obrigatórios" });
    }

    try {
      const doc = await prisma.document.create({
        data: {
          projectId,
          nome: sanitizedNome,
          validade: validade ? new Date(validade) : null,
          url: url ? sanitizeString(url, 500) : null,
          fileType: fileType ? sanitizeString(fileType, 10) : null,
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
