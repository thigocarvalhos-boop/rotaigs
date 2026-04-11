import { prisma } from "../_lib/prisma.js";
import { authenticate, can, sanitizeString, sanitizeNumber, sanitizeInt } from "../_lib/auth.js";
import { auditService } from "../_lib/audit.js";

export default async function handler(req: any, res: any) {
  const user = authenticate(req, res);
  if (!user) return;

  // GET /api/projects
  if (req.method === "GET") {
    try {
      const page = sanitizeInt(req.query?.page, 1);
      const limit = Math.min(sanitizeInt(req.query?.limit, 1, 100) || 50, 100);
      const skip = (page - 1) * limit;

      const [projects, total] = await Promise.all([
        prisma.project.findMany({
          include: {
            responsavel: true,
            alerts: true,
            metas: true,
            etapas: true,
            docs: true,
            expenses: { include: { cotacoes: true } },
            compliance: true,
          },
          skip,
          take: limit,
          orderBy: { updatedAt: "desc" },
        }),
        prisma.project.count(),
      ]);
      return res.json({ data: projects, total, page, limit });
    } catch (error) {
      console.error("[GET /api/projects]", error);
      return res.status(500).json({ error: "Erro ao buscar projetos" });
    }
  }

  // POST /api/projects
  if (req.method === "POST") {
    if (!can(user, "projects:create", res)) return;
    const data = req.body || {};

    const nome = sanitizeString(data.nome, 200);
    if (!nome) {
      return res.status(400).json({ error: "Nome é obrigatório" });
    }
    if (!data.prazo) {
      return res.status(400).json({ error: "Prazo é obrigatório" });
    }

    try {
      const project = await prisma.project.create({
        data: {
          nome,
          edital: sanitizeString(data.edital, 200),
          financiador: sanitizeString(data.financiador, 200),
          area: sanitizeString(data.area, 100),
          valor: sanitizeNumber(data.valor, 0),
          status: sanitizeString(data.status || "Triagem", 50),
          prazo: new Date(data.prazo),
          responsavelId: user.id,
          probabilidade: sanitizeInt(data.probabilidade, 0, 100),
          risco: sanitizeString(data.risco || "Baixo", 20),
          aderencia: sanitizeInt(data.aderencia, 0, 10),
          territorio: sanitizeString(data.territorio, 200),
          publico: sanitizeString(data.publico, 200),
          competitividade: sanitizeString(data.competitividade, 50),
          proximoPasso: sanitizeString(data.proximoPasso, 500),
          ptScore: sanitizeInt(data.ptScore, 0, 10),
        },
      });

      await auditService.log({
        userId: user.id,
        projectId: project.id,
        acao: "CREATE",
        entidade: "Project",
        entidadeId: project.id,
        depois: project,
      });

      return res.status(201).json(project);
    } catch (error) {
      console.error("[POST /api/projects]", error);
      return res.status(400).json({ error: "Erro ao criar projeto" });
    }
  }

  res.status(405).end();
}
