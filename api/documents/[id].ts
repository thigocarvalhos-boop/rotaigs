import { prisma } from "../_lib/prisma.js";
import { authenticate, can } from "../_lib/auth.js";
import { auditService } from "../_lib/audit.js";

export default async function handler(req: any, res: any) {
  const user = authenticate(req, res);
  if (!user) return;

  const { id } = req.query;

  // PUT /api/documents/:id
  if (req.method === "PUT") {
    if (!can(user, "documents:update", res)) return;
    const data = req.body || {};
    try {
      const before = await prisma.document.findUnique({ where: { id } });
      if (!before) return res.status(404).json({ error: "Documento não encontrado" });

      const doc = await prisma.document.update({
        where: { id },
        data: {
          ...(data.nome !== undefined && { nome: data.nome }),
          ...(data.status !== undefined && { status: data.status }),
          ...(data.validade !== undefined && { validade: data.validade ? new Date(data.validade) : null }),
          ...(data.url !== undefined && { url: data.url || null }),
          ...(data.fileType !== undefined && { fileType: data.fileType || null }),
        },
        include: { project: true },
      });

      await auditService.log({
        userId: user.id,
        projectId: doc.projectId,
        acao: "UPDATE",
        entidade: "Document",
        entidadeId: doc.id,
        antes: before,
        depois: doc,
      });

      return res.json(doc);
    } catch (error) {
      console.error("[PUT /api/documents/:id]", error);
      return res.status(400).json({ error: "Erro ao atualizar documento" });
    }
  }

  // DELETE /api/documents/:id
  if (req.method === "DELETE") {
    if (!can(user, "documents:update", res)) return;
    try {
      const doc = await prisma.document.findUnique({ where: { id } });
      if (!doc) return res.status(404).json({ error: "Documento não encontrado" });
      await prisma.document.delete({ where: { id } });
      return res.json({ success: true });
    } catch (error) {
      console.error("[DELETE /api/documents/:id]", error);
      return res.status(500).json({ error: "Erro ao excluir documento" });
    }
  }

  res.status(405).end();
}
