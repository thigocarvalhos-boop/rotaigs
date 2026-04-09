import { prisma } from "../_lib/prisma.js";
import { authenticate, can, sanitizeString, sanitizeNumber, sanitizeInt } from "../_lib/auth.js";
import { auditService } from "../_lib/audit.js";

export default async function handler(req: any, res: any) {
  const user = authenticate(req, res);
  if (!user) return;

  const { id } = req.query;

  // PUT /api/projects/:id
  if (req.method === "PUT") {
    if (!can(user, "projects:update", res)) return;
    const data = req.body || {};
    try {
      const before = await prisma.project.findUnique({ where: { id } });
      if (!before) return res.status(404).json({ error: "Projeto não encontrado" });

      const project = await prisma.project.update({
        where: { id },
        data: {
          ...(data.nome !== undefined && { nome: sanitizeString(data.nome, 200) }),
          ...(data.edital !== undefined && { edital: sanitizeString(data.edital, 200) }),
          ...(data.financiador !== undefined && { financiador: sanitizeString(data.financiador, 200) }),
          ...(data.area !== undefined && { area: sanitizeString(data.area, 100) }),
          ...(data.valor !== undefined && { valor: sanitizeNumber(data.valor, 0) }),
          ...(data.status !== undefined && { status: sanitizeString(data.status, 50) }),
          ...(data.prazo !== undefined && { prazo: new Date(data.prazo) }),
          ...(data.probabilidade !== undefined && { probabilidade: sanitizeInt(data.probabilidade, 0, 100) }),
          ...(data.risco !== undefined && { risco: sanitizeString(data.risco, 20) }),
          ...(data.aderencia !== undefined && { aderencia: sanitizeInt(data.aderencia, 0, 10) }),
          ...(data.territorio !== undefined && { territorio: sanitizeString(data.territorio, 200) }),
          ...(data.publico !== undefined && { publico: sanitizeString(data.publico, 200) }),
          ...(data.competitividade !== undefined && { competitividade: sanitizeString(data.competitividade, 50) }),
          ...(data.proximoPasso !== undefined && { proximoPasso: sanitizeString(data.proximoPasso, 500) }),
          ...(data.ptScore !== undefined && { ptScore: sanitizeInt(data.ptScore, 0, 10) }),
        },
        include: {
          responsavel: true,
          metas: true,
          etapas: true,
          docs: true,
          expenses: { include: { cotacoes: true } },
          compliance: true,
          alerts: true,
        },
      });

      await auditService.log({
        userId: user.id,
        projectId: project.id,
        acao: "UPDATE",
        entidade: "Project",
        entidadeId: project.id,
        antes: before,
        depois: project,
      });

      return res.json(project);
    } catch (error) {
      console.error("[PUT /api/projects/:id]", error);
      return res.status(400).json({ error: "Erro ao atualizar projeto" });
    }
  }

  // DELETE /api/projects/:id
  if (req.method === "DELETE") {
    if (!can(user, "projects:delete", res)) return;
    try {
      const before = await prisma.project.findUnique({ where: { id } });
      if (!before) return res.status(404).json({ error: "Projeto não encontrado" });

      await prisma.$transaction([
        prisma.cotacao.deleteMany({ where: { expense: { projectId: id } } }),
        prisma.expense.deleteMany({ where: { projectId: id } }),
        prisma.meta.deleteMany({ where: { projectId: id } }),
        prisma.etapa.deleteMany({ where: { projectId: id } }),
        prisma.document.deleteMany({ where: { projectId: id } }),
        prisma.complianceCheck.deleteMany({ where: { projectId: id } }),
        prisma.alert.deleteMany({ where: { projectId: id } }),
        prisma.auditLog.deleteMany({ where: { projectId: id } }),
        prisma.project.delete({ where: { id } }),
      ]);

      await auditService.log({
        userId: user.id,
        acao: "DELETE",
        entidade: "Project",
        entidadeId: id,
        antes: before,
      });

      return res.json({ success: true });
    } catch (error) {
      console.error("[DELETE /api/projects/:id]", error);
      return res.status(500).json({ error: "Erro ao excluir projeto" });
    }
  }

  res.status(405).end();
}
