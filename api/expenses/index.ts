import { prisma } from "../_lib/prisma.js";
import { authenticate, can, sanitizeString, sanitizeNumber } from "../_lib/auth.js";
import { auditService } from "../_lib/audit.js";
import { alertService } from "../_lib/alert.js";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).end();

  const user = authenticate(req, res);
  if (!user) return;
  if (!can(user, "expenses:create", res)) return;

  const { projectId, descricao, valor, vincMetaId, vincEtapaId, cotacoes, data, categoria } = req.body || {};

  const sanitizedDescricao = sanitizeString(descricao, 500);
  const sanitizedCategoria = sanitizeString(categoria, 100);
  const sanitizedValor = sanitizeNumber(valor, 0);

  if (!projectId || !sanitizedDescricao || sanitizedValor <= 0 || !data || !sanitizedCategoria) {
    return res.status(400).json({ error: "Campos obrigatórios: projectId, descricao, valor, data, categoria" });
  }

  try {
    if (!vincMetaId || !vincEtapaId) {
      return res.status(400).json({ error: "Vínculo com Meta e Etapa é obrigatório para evitar glosa." });
    }

    if (sanitizedValor > 1000 && (!Array.isArray(cotacoes) || cotacoes.length < 3)) {
      return res.status(400).json({
        error: "Despesas acima de R$ 1.000,00 exigem no mínimo 3 cotações para conformidade institucional.",
        actionRequired: "Anexar cotações faltantes",
      });
    }

    const meta = await prisma.meta.findUnique({ where: { id: vincMetaId } });
    if (!meta) return res.status(404).json({ error: "Meta não encontrada" });

    const existingExpenses = await prisma.expense.findMany({
      where: { vincMetaId, status: "VALIDADO" },
    });
    const totalSpent = existingExpenses.reduce((sum: number, e: any) => sum + e.valor, 0);

    if (totalSpent + sanitizedValor > meta.budget) {
      await alertService.create({
        projectId,
        titulo: "Tentativa de Estouro de Orçamento",
        mensagem: `Tentativa de lançar despesa de R$ ${sanitizedValor} na meta ${meta.descricao} (Saldo: R$ ${meta.budget - totalSpent})`,
        nivel: "N4",
        tipo: "ORCAMENTO",
      });
      return res.status(400).json({ error: "Saldo insuficiente na meta para esta despesa." });
    }

    const etapa = await prisma.etapa.findUnique({ where: { id: vincEtapaId } });
    if (!etapa) return res.status(404).json({ error: "Etapa não encontrada" });

    const expenseDate = new Date(data);
    if (expenseDate < etapa.inicio || expenseDate > etapa.fim) {
      return res.status(400).json({ error: "Data da despesa fora do cronograma da etapa vinculada." });
    }

    const expense = await prisma.expense.create({
      data: {
        projectId,
        descricao: sanitizedDescricao,
        valor: sanitizedValor,
        data: expenseDate,
        categoria: sanitizedCategoria,
        status: "VALIDADO",
        vincMetaId,
        vincEtapaId,
        cotacoes: {
          create: Array.isArray(cotacoes) ? cotacoes.map((c: any) => ({
            fornecedor: sanitizeString(c.fornecedor, 200),
            valor: sanitizeNumber(c.valor, 0),
            data: new Date(c.data),
            vencedora: Boolean(c.vencedora),
            docUrl: c.docUrl ? sanitizeString(c.docUrl, 500) : null,
          })) : [],
        },
      },
    });

    await auditService.log({
      userId: user.id,
      projectId,
      acao: "CREATE",
      entidade: "Expense",
      entidadeId: expense.id,
      depois: expense,
    });

    res.status(201).json(expense);
  } catch (error) {
    console.error("[POST /api/expenses]", error);
    res.status(500).json({ error: "Erro ao processar despesa" });
  }
}
