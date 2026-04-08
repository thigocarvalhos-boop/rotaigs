import { prisma } from "../_lib/prisma.js";
import { authenticate, can } from "../_lib/auth.js";
import { auditService } from "../_lib/audit.js";

export default async function handler(req: any, res: any) {
  const user = authenticate(req, res);
  if (!user) return;

  // GET /api/projects
  if (req.method === "GET") {
    try {
      const projects = await prisma.project.findMany({
        include: {
          responsavel: true,
          alerts: true,
          metas: true,
          etapas: true,
          docs: true,
          expenses: { include: { cotacoes: true } },
          compliance: true,
        },
      });
      return res.json(projects);
    } catch (error) {
      console.error("[GET /api/projects]", error);
      return res.status(500).json({ error: "Erro ao buscar projetos" });
    }
  }

  // POST /api/projects
  if (req.method === "POST") {
    if (!can(user, "projects:create", res)) return;
    const data = req.body || {};
    try {
      const project = await prisma.project.create({
        data: {
          nome: data.nome,
          edital: data.edital || "",
          financiador: data.financiador || "",
          area: data.area || "",
          valor: data.valor || 0,
          status: data.status || "Triagem",
          prazo: new Date(data.prazo),
          responsavelId: user.id,
          probabilidade: data.probabilidade || 0,
          risco: data.risco || "Baixo",
          aderencia: data.aderencia || 0,
          territorio: data.territorio || "",
          publico: data.publico || "",
          competitividade: data.competitividade || "",
          proximoPasso: data.proximoPasso || "",
          ptScore: data.ptScore || 0,
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
