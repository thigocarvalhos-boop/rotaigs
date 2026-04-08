import { prisma } from "../_lib/prisma.js";
import { authenticate, can } from "../_lib/auth.js";
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
          ...(data.nome !== undefined && { nome: data.nome }),
          ...(data.edital !== undefined && { edital: data.edital }),
          ...(data.financiador !== undefined && { financiador: data.financiador }),
          ...(data.area !== undefined && { area: data.area }),
          ...(data.valor !== undefined && { valor: data.valor }),
          ...(data.status !== undefined && { status: data.status }),
          ...(data.prazo !== undefined && { prazo: new Date(data.prazo) }),
          ...(data.probabilidade !== undefined && { probabilidade: data.probabilidade }),
          ...(data.risco !== undefined && { risco: data.risco }),
          ...(data.aderencia !== undefined && { aderencia: data.aderencia }),
          ...(data.territorio !== undefined && { territorio: data.territorio }),
          ...(data.publico !== undefined && { publico: data.publico }),
          ...(data.competitividade !== undefined && { competitividade: data.competitividade }),
          ...(data.proximoPasso !== undefined && { proximoPasso: data.proximoPasso }),
          ...(data.ptScore !== undefined && { ptScore: data.ptScore }),
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

      await prisma.cotacao.deleteMany({ where: { expense: { projectId: id } } });
      await prisma.expense.deleteMany({ where: { projectId: id } });
      await prisma.meta.deleteMany({ where: { projectId: id } });
      await prisma.etapa.deleteMany({ where: { projectId: id } });
      await prisma.document.deleteMany({ where: { projectId: id } });
      await prisma.complianceCheck.deleteMany({ where: { projectId: id } });
      await prisma.alert.deleteMany({ where: { projectId: id } });
      await prisma.auditLog.deleteMany({ where: { projectId: id } });
      await prisma.project.delete({ where: { id } });

      // Log deletion after all records removed; omit projectId so the entry persists
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
