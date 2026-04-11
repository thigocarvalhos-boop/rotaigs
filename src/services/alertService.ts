// src/services/alertService.ts
import { prisma } from "../lib/prisma";

function isMissingTableError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: string }).code === "P2021"
  );
}

export const alertService = {
  async create({
    projectId,
    titulo,
    mensagem,
    nivel,
    tipo,
  }: {
    projectId?: string;
    titulo: string;
    mensagem: string;
    nivel: string;
    tipo: string;
  }) {
    return prisma.alert.create({
      data: { projectId, titulo, mensagem, nivel, tipo, status: "PENDENTE" },
    });
  },

  async checkDocumentExpirations() {
    try {
      const horizon = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const docs = await prisma.document.findMany({
        where: {
          validade: { lte: horizon },
          status: { not: "VENCIDO" },
        },
      });

      for (const doc of docs) {
        const isExpired = doc.validade && doc.validade < new Date();
        await alertService.create({
          projectId: doc.projectId,
          titulo: isExpired ? "Documento Vencido" : "Documento a Vencer",
          mensagem: `O documento "${doc.nome}" ${isExpired ? "venceu" : "vencerá"} em ${doc.validade?.toLocaleDateString("pt-BR")}.`,
          nivel: isExpired ? "N4" : "N2",
          tipo: "DOCUMENTO",
        });
        if (isExpired) {
          await prisma.document.update({
            where: { id: doc.id },
            data: { status: "VENCIDO" },
          });
        }
      }
    } catch (err: unknown) {
      if (isMissingTableError(err)) {
        console.warn(
          "[AlertService] checkDocumentExpirations: tabela 'Document' não encontrada (P2021). " +
          "Execute 'npx prisma@6.4.1 migrate deploy' para aplicar as migrações pendentes. Serviço ignorado até que o schema esteja sincronizado."
        );
        return;
      }
      // Re-throw unexpected errors so callers can decide how to handle them
      throw err;
    }
  },

  async checkBudgetOverrun(projectId: string) {
    const metas = await prisma.meta.findMany({
      where: { projectId },
      include: { project: { include: { expenses: true } } },
    });

    for (const meta of metas) {
      const metaExpenses = meta.project.expenses.filter(
        (e) => e.vincMetaId === meta.id && e.status === "VALIDADO"
      );
      const totalSpent = metaExpenses.reduce((sum, e) => sum + e.valor, 0);
      if (totalSpent > meta.budget) {
        await alertService.create({
          projectId,
          titulo: "Orçamento Estourado",
          mensagem: `Meta "${meta.descricao}" ultrapassou o orçamento. Gasto: R$\u00a0${totalSpent.toLocaleString("pt-BR")}, Limite: R$\u00a0${meta.budget.toLocaleString("pt-BR")}`,
          nivel: "N4",
          tipo: "ORCAMENTO",
        });
      }
    }
  },
};
