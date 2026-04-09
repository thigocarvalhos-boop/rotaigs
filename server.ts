import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { body, validationResult } from "express-validator";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { prisma } from "./src/lib/prisma";
import { auditService } from "./src/services/auditService";
import { alertService } from "./src/services/alertService";

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

if (!JWT_SECRET || !JWT_REFRESH_SECRET) {
  console.error("FATAL: JWT_SECRET e JWT_REFRESH_SECRET são obrigatórios. Configure o .env.");
  process.exit(1);
}

// --- Input sanitization helper ---
function sanitizeString(value: unknown, maxLength = 500): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/<[^>]*>/g, "") // strip HTML tags
    .replace(/[<>"'&]/g, "") // strip dangerous chars
    .trim()
    .slice(0, maxLength);
}

function sanitizeNumber(value: unknown, min = 0, max = Number.MAX_SAFE_INTEGER): number {
  const n = Number(value);
  if (isNaN(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function sanitizeInt(value: unknown, min = 0, max = Number.MAX_SAFE_INTEGER): number {
  return Math.round(sanitizeNumber(value, min, max));
}

// --- CSV Helper ---
function toCsv(headers: string[], rows: string[][]): string {
  const escape = (v: string) => {
    if (v == null) return "";
    const s = String(v);
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const lines = [headers.map(escape).join(",")];
  for (const row of rows) {
    lines.push(row.map(escape).join(","));
  }
  return "\uFEFF" + lines.join("\r\n"); // BOM for Excel UTF-8
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  const dbUrl = process.env.DATABASE_URL;
  const dbAvailable = dbUrl && (dbUrl.startsWith("postgresql://") || dbUrl.startsWith("postgres://"));

  if (!dbAvailable) {
    console.warn("⚠️  DATABASE_URL não configurada. A API estará indisponível — o frontend usará dados de demonstração.");
  }

  // ============================================
  // SECURITY MIDDLEWARE
  // ============================================
  app.use(helmet({
    contentSecurityPolicy: false, // Vite dev server needs inline scripts
    crossOriginEmbedderPolicy: false,
  }));

  app.use(cors({
    origin: process.env.CORS_ORIGIN || true, // Allow same-origin in dev; set explicit origin in production
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }));

  app.use(express.json({ limit: "1mb" }));

  // Rate limiting for login
  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 attempts per window
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Muitas tentativas de login. Tente novamente em 15 minutos." },
  });

  // General API rate limiter
  const apiLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 200, // 200 requests per minute
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use("/api/", apiLimiter);

  // Logging Middleware
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  });

  // Seed Initial Data
  if (dbAvailable) {
    const seedData = async () => {
      if (process.env.NODE_ENV === "production") {
        console.warn("SEED: ignorado em ambiente de produção. Execute manualmente via npm run seed.");
        return;
      }

      try {
        const adminEmail = "admin@guiasocial.org";
        let admin = await prisma.user.findUnique({ where: { email: adminEmail } });
        
        if (!admin) {
          const defaultPw = process.env.ADMIN_DEFAULT_PASSWORD;
          if (!defaultPw) {
            console.error("SEED: ADMIN_DEFAULT_PASSWORD não definida. Não é possível criar admin sem senha segura.");
            return;
          }
          const hashedPassword = await bcrypt.hash(defaultPw, 12);
          admin = await prisma.user.create({
            data: {
              email: adminEmail,
              password: hashedPassword,
              name: "Administrador ROTA",
              role: "SUPER_ADMIN"
            }
          });
          console.log("Seed: Admin user created.");
        }

        const projectCount = await prisma.project.count();
        if (projectCount === 0) {
          const project = await prisma.project.create({
            data: {
              nome: "Guia Digital Teen 2026",
              edital: "FMCA/COMDICA",
              financiador: "Fundo Municipal da Criança",
              area: "Digital",
              valor: 320000,
              status: "Inscrito",
              prazo: new Date("2026-04-15"),
              responsavelId: admin.id,
              probabilidade: 72,
              risco: "Médio",
              aderencia: 5,
              territorio: "RPA 6 — Pina / Ipsep",
              publico: "Adolescentes 12–18 anos",
              competitividade: "Alta",
              proximoPasso: "Aguardar resultado do edital",
              ptScore: 8,
              metas: {
                create: [
                  { descricao: "Certificar jovens em tecnologia", indicador: "Jovens certificados", meta: 500, alcancado: 380, unidade: "Jovens", budget: 150000 },
                  { descricao: "Inserção no mercado de trabalho", indicador: "Jovens empregados", meta: 50, alcancado: 12, unidade: "Jovens", budget: 100000 }
                ]
              },
              etapas: {
                create: [
                  { nome: "Mobilização", inicio: new Date("2026-01-01"), fim: new Date("2026-02-28"), status: "Concluído", peso: 20 },
                  { nome: "Execução das Aulas", inicio: new Date("2026-03-01"), fim: new Date("2026-07-31"), status: "Em curso", peso: 60 }
                ]
              },
              docs: {
                create: [
                  { nome: "Estatuto Social", status: "Aprovado", validade: null, fileType: "PDF" },
                  { nome: "CNPJ", status: "Aprovado", validade: null, fileType: "PDF" },
                  { nome: "CND Federal", status: "Aprovado", validade: new Date("2026-05-20"), fileType: "PDF" }
                ]
              }
            }
          });

          await prisma.alert.create({
            data: {
              projectId: project.id,
              titulo: "Documento Vencendo",
              mensagem: "CND Municipal Recife vence em 15 dias.",
              nivel: "N4",
              status: "PENDENTE",
              tipo: "DOCUMENTO",
              prazo: new Date("2026-04-25")
            }
          });

          console.log("Seed: Initial project and alerts created.");
        }

        const lessonCount = await prisma.lessonLearned.count();
        if (lessonCount === 0) {
          await prisma.lessonLearned.createMany({
            data: [
              { projeto: "Guia Alimenta Recife", licao: "Aumentar detalhamento da metodologia de busca ativa para editais de assistência social.", categoria: "Metodologia", autor: "Viviane Castro" },
              { projeto: "Maré Delas", licao: "Confirmar disponibilidade de local parceiro antes da submissão para evitar diligência de infraestrutura.", categoria: "Infraestrutura", autor: "Rodrigo Nery" },
              { projeto: "Cidadania +60", licao: "Focar em indicadores de inclusão digital para editais de conselhos de idosos.", categoria: "Indicadores", autor: "Alice Thorpe" },
            ]
          });
          console.log("Seed: Initial lessons created.");
        }
      } catch (error) {
        console.error("Seed: Erro ao popular dados iniciais. Verifique a conexão com o banco de dados.", error);
      }
    };
    await seedData();
  }

  // Verificar expiração de documentos a cada hora
  if (dbAvailable) {
    try {
      await alertService.checkDocumentExpirations();
      setInterval(() => alertService.checkDocumentExpirations(), 60 * 60 * 1000);
    } catch (error) {
      console.error("AlertService: Erro ao verificar expirações.", error);
    }
  }

  // ============================================
  // AUTH MIDDLEWARE
  // ============================================
  const authenticate = (req: any, res: any, next: any) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "Acesso negado" });
    try {
      const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ["HS256"] });
      req.user = decoded;
      next();
    } catch (err) {
      res.status(401).json({ error: "Token inválido" });
    }
  };

  // RBAC Middleware
  const PERMISSIONS: Record<string, string[]> = {
    "expenses:create":   ["SUPER_ADMIN", "DIRETORIA", "COORDENACAO", "FINANCEIRO"],
    "documents:create":  ["SUPER_ADMIN", "DIRETORIA", "COORDENACAO", "DOCUMENTAL"],
    "documents:update":  ["SUPER_ADMIN", "DIRETORIA", "COORDENACAO", "DOCUMENTAL"],
    "documents:delete":  ["SUPER_ADMIN", "DIRETORIA"],
    "audit-logs:read":   ["SUPER_ADMIN", "DIRETORIA", "MONITORAMENTO"],
    "alerts:read":       ["SUPER_ADMIN", "DIRETORIA", "COORDENACAO", "MONITORAMENTO", "FINANCEIRO", "ELABORADOR"],
    "projects:create":   ["SUPER_ADMIN", "DIRETORIA", "COORDENACAO"],
    "projects:update":   ["SUPER_ADMIN", "DIRETORIA", "COORDENACAO"],
    "projects:delete":   ["SUPER_ADMIN", "DIRETORIA"],
    "stats:read":        ["SUPER_ADMIN", "DIRETORIA", "COORDENACAO", "MONITORAMENTO"],
  };

  const can = (permission: string) => (req: any, res: any, next: any) => {
    const allowed = PERMISSIONS[permission] || [];
    if (!allowed.includes(req.user?.role)) {
      return res.status(403).json({
        error: "Acesso negado",
        requiredRoles: allowed,
        currentRole: req.user?.role || "desconhecido"
      });
    }
    next();
  };

  // ============================================
  // API Routes
  // ============================================
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // ============================================
  // AUTH ENDPOINT (with rate limiting)
  // ============================================
  app.post("/api/auth/login", loginLimiter, [
    body("email").isEmail().withMessage("E-mail inválido"),
    body("password").isLength({ min: 8 }).withMessage("Senha deve ter no mínimo 8 caracteres")
  ], async (req: any, res: any) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email, password } = req.body;
    
    try {
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) return res.status(401).json({ error: "Credenciais inválidas" });

      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) return res.status(401).json({ error: "Credenciais inválidas" });

      const accessToken = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: "15m", algorithm: "HS256" }
      );
      const refreshToken = jwt.sign(
        { id: user.id },
        JWT_REFRESH_SECRET,
        { expiresIn: "7d", algorithm: "HS256" }
      );
      
      await auditService.log({
        userId: user.id,
        acao: "LOGIN",
        entidade: "User",
        entidadeId: user.id
      });

      res.json({
        accessToken,
        refreshToken,
        user: { id: user.id, name: user.name, email: user.email, role: user.role }
      });
    } catch (error) {
      console.error("[POST /api/auth/login]", error);
      res.status(500).json({ error: "Erro interno no servidor" });
    }
  });

  app.post("/api/auth/refresh", async (req: any, res: any) => {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(401).json({ error: "Refresh token ausente" });
    try {
      const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET, { algorithms: ["HS256"] }) as any;
      const user = await prisma.user.findUnique({ where: { id: decoded.id } });
      if (!user) return res.status(401).json({ error: "Usuário não encontrado" });
      const accessToken = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: "15m", algorithm: "HS256" }
      );
      res.json({ accessToken });
    } catch {
      res.status(401).json({ error: "Refresh token inválido ou expirado" });
    }
  });

  // ============================================
  // PROJECT ROUTES — full CRUD with validation
  // ============================================
  app.get("/api/projects", authenticate, async (req: any, res: any) => {
    try {
      const page = sanitizeInt(req.query.page, 1);
      const limit = sanitizeInt(req.query.limit, 1, 100) || 50;
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
            compliance: true
          },
          skip,
          take: limit,
          orderBy: { updatedAt: "desc" },
        }),
        prisma.project.count(),
      ]);
      res.json({ data: projects, total, page, limit });
    } catch (error) {
      console.error("[GET /api/projects]", error);
      res.status(500).json({ error: "Erro ao buscar projetos" });
    }
  });

  app.post("/api/projects", authenticate, can("projects:create"), [
    body("nome").trim().notEmpty().withMessage("Nome é obrigatório").isLength({ max: 200 }),
    body("prazo").notEmpty().withMessage("Prazo é obrigatório").isISO8601(),
    body("valor").optional().isFloat({ min: 0 }).withMessage("Valor deve ser positivo"),
    body("probabilidade").optional().isInt({ min: 0, max: 100 }),
    body("aderencia").optional().isInt({ min: 0, max: 10 }),
    body("ptScore").optional().isInt({ min: 0, max: 10 }),
  ], async (req: any, res: any) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const data = req.body;
    try {
      const project = await prisma.project.create({
        data: {
          nome: sanitizeString(data.nome, 200),
          edital: sanitizeString(data.edital, 200),
          financiador: sanitizeString(data.financiador, 200),
          area: sanitizeString(data.area, 100),
          valor: sanitizeNumber(data.valor, 0),
          status: sanitizeString(data.status || "Triagem", 50),
          prazo: new Date(data.prazo),
          responsavelId: req.user.id,
          probabilidade: sanitizeInt(data.probabilidade, 0, 100),
          risco: sanitizeString(data.risco || "Baixo", 20),
          aderencia: sanitizeInt(data.aderencia, 0, 10),
          territorio: sanitizeString(data.territorio, 200),
          publico: sanitizeString(data.publico, 200),
          competitividade: sanitizeString(data.competitividade, 50),
          proximoPasso: sanitizeString(data.proximoPasso, 500),
          ptScore: sanitizeInt(data.ptScore, 0, 10)
        }
      });

      await auditService.log({
        userId: req.user.id,
        projectId: project.id,
        acao: "CREATE",
        entidade: "Project",
        entidadeId: project.id,
        depois: project
      });

      res.status(201).json(project);
    } catch (error) {
      console.error("[POST /api/projects]", error);
      res.status(400).json({ error: "Erro ao criar projeto" });
    }
  });

  app.put("/api/projects/:id", authenticate, can("projects:update"), async (req: any, res: any) => {
    const { id } = req.params;
    const data = req.body;
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
          alerts: true
        }
      });

      await auditService.log({
        userId: req.user.id,
        projectId: project.id,
        acao: "UPDATE",
        entidade: "Project",
        entidadeId: project.id,
        antes: before,
        depois: project
      });

      res.json(project);
    } catch (error) {
      console.error("[PUT /api/projects/:id]", error);
      res.status(400).json({ error: "Erro ao atualizar projeto" });
    }
  });

  // DELETE with $transaction for data integrity
  app.delete("/api/projects/:id", authenticate, can("projects:delete"), async (req: any, res: any) => {
    const { id } = req.params;
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

      // Log deletion after transaction completes
      await auditService.log({
        userId: req.user.id,
        acao: "DELETE",
        entidade: "Project",
        entidadeId: id,
        antes: before
      });

      res.json({ success: true });
    } catch (error) {
      console.error("[DELETE /api/projects/:id]", error);
      res.status(500).json({ error: "Erro ao excluir projeto" });
    }
  });

  // ============================================
  // EXPENSE ROUTES with Anti-glosa & validation
  // ============================================
  app.post("/api/expenses", authenticate, can("expenses:create"), [
    body("projectId").notEmpty().withMessage("ID do projeto é obrigatório"),
    body("descricao").trim().notEmpty().withMessage("Descrição é obrigatória").isLength({ max: 500 }),
    body("valor").isFloat({ min: 0.01 }).withMessage("Valor deve ser positivo"),
    body("vincMetaId").notEmpty().withMessage("Vínculo com Meta é obrigatório"),
    body("vincEtapaId").notEmpty().withMessage("Vínculo com Etapa é obrigatório"),
    body("data").notEmpty().isISO8601().withMessage("Data é obrigatória"),
    body("categoria").trim().notEmpty().withMessage("Categoria é obrigatória"),
  ], async (req: any, res: any) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { projectId, descricao, valor, vincMetaId, vincEtapaId, cotacoes, data, categoria } = req.body;
    
    try {
      if (valor > 1000 && (!cotacoes || cotacoes.length < 3)) {
        return res.status(400).json({ 
          error: "Despesas acima de R$ 1.000,00 exigem no mínimo 3 cotações para conformidade institucional.",
          actionRequired: "Anexar cotações faltantes"
        });
      }

      const meta = await prisma.meta.findUnique({ where: { id: vincMetaId } });
      if (!meta) return res.status(404).json({ error: "Meta não encontrada" });

      const existingExpenses = await prisma.expense.findMany({
        where: { vincMetaId, status: "VALIDADO" }
      });
      const totalSpent = existingExpenses.reduce((sum, e) => sum + e.valor, 0);

      if (totalSpent + valor > meta.budget) {
        await alertService.create({
          projectId,
          titulo: "Tentativa de Estouro de Orçamento",
          mensagem: `Tentativa de lançar despesa de R$ ${valor} na meta ${meta.descricao} (Saldo: R$ ${meta.budget - totalSpent})`,
          nivel: "N4",
          tipo: "ORCAMENTO"
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
          descricao: sanitizeString(descricao, 500),
          valor: sanitizeNumber(valor, 0),
          data: expenseDate,
          categoria: sanitizeString(categoria, 100),
          status: "VALIDADO",
          vincMetaId,
          vincEtapaId,
          cotacoes: {
            create: cotacoes?.map((c: any) => ({
              fornecedor: sanitizeString(c.fornecedor, 200),
              valor: sanitizeNumber(c.valor, 0),
              data: new Date(c.data),
              vencedora: Boolean(c.vencedora),
              docUrl: c.docUrl ? sanitizeString(c.docUrl, 500) : null
            }))
          }
        }
      });

      await auditService.log({
        userId: req.user.id,
        projectId,
        acao: "CREATE",
        entidade: "Expense",
        entidadeId: expense.id,
        depois: expense
      });

      res.status(201).json(expense);
    } catch (error) {
      console.error("[POST /api/expenses]", error);
      res.status(500).json({ error: "Erro ao processar despesa" });
    }
  });

  // ============================================
  // DOCUMENT ROUTES — full CRUD with validation
  // ============================================
  app.get("/api/documents", authenticate, async (req: any, res: any) => {
    try {
      const page = sanitizeInt(req.query.page, 1);
      const limit = sanitizeInt(req.query.limit, 1, 100) || 50;
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
      res.json({ data: docs, total, page, limit });
    } catch (error) {
      console.error("[GET /api/documents]", error);
      res.status(500).json({ error: "Erro ao buscar documentos" });
    }
  });

  app.post("/api/documents", authenticate, can("documents:create"), [
    body("projectId").notEmpty().withMessage("ID do projeto é obrigatório"),
    body("nome").trim().notEmpty().withMessage("Nome é obrigatório").isLength({ max: 200 }),
  ], async (req: any, res: any) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { projectId, nome, validade, url, fileType } = req.body;
    try {
      const doc = await prisma.document.create({
        data: {
          projectId,
          nome: sanitizeString(nome, 200),
          validade: validade ? new Date(validade) : null,
          url: url ? sanitizeString(url, 500) : null,
          fileType: fileType ? sanitizeString(fileType, 10) : null,
          status: "Pendente"
        }
      });

      await auditService.log({
        userId: req.user.id,
        projectId,
        acao: "UPLOAD",
        entidade: "Document",
        entidadeId: doc.id,
        depois: doc
      });

      res.status(201).json(doc);
    } catch (error) {
      console.error("[POST /api/documents]", error);
      res.status(400).json({ error: "Erro ao salvar documento" });
    }
  });

  app.put("/api/documents/:id", authenticate, can("documents:update"), async (req: any, res: any) => {
    const { id } = req.params;
    const data = req.body;
    try {
      const before = await prisma.document.findUnique({ where: { id } });
      if (!before) return res.status(404).json({ error: "Documento não encontrado" });

      const doc = await prisma.document.update({
        where: { id },
        data: {
          ...(data.nome !== undefined && { nome: sanitizeString(data.nome, 200) }),
          ...(data.status !== undefined && { status: sanitizeString(data.status, 50) }),
          ...(data.validade !== undefined && { validade: data.validade ? new Date(data.validade) : null }),
          ...(data.url !== undefined && { url: data.url ? sanitizeString(data.url, 500) : null }),
          ...(data.fileType !== undefined && { fileType: data.fileType ? sanitizeString(data.fileType, 10) : null }),
        },
        include: { project: true }
      });

      await auditService.log({
        userId: req.user.id,
        projectId: doc.projectId,
        acao: "UPDATE",
        entidade: "Document",
        entidadeId: doc.id,
        antes: before,
        depois: doc
      });

      res.json(doc);
    } catch (error) {
      console.error("[PUT /api/documents/:id]", error);
      res.status(400).json({ error: "Erro ao atualizar documento" });
    }
  });

  // Fixed: documents:delete permission instead of documents:update
  app.delete("/api/documents/:id", authenticate, can("documents:delete"), async (req: any, res: any) => {
    const { id } = req.params;
    try {
      const doc = await prisma.document.findUnique({ where: { id } });
      if (!doc) return res.status(404).json({ error: "Documento não encontrado" });

      await prisma.document.delete({ where: { id } });

      await auditService.log({
        userId: req.user.id,
        projectId: doc.projectId,
        acao: "DELETE",
        entidade: "Document",
        entidadeId: id,
        antes: doc
      });

      res.json({ success: true });
    } catch (error) {
      console.error("[DELETE /api/documents/:id]", error);
      res.status(500).json({ error: "Erro ao excluir documento" });
    }
  });

  // ============================================
  // ALERT ROUTES
  // ============================================
  app.get("/api/alerts", authenticate, can("alerts:read"), async (req: any, res: any) => {
    try {
      const isAdmin = ["SUPER_ADMIN", "DIRETORIA"].includes(req.user.role);
      const alerts = await prisma.alert.findMany({
        where: {
          status: "PENDENTE",
          ...(isAdmin ? {} : { project: { responsavelId: req.user.id } })
        },
        include: { project: true },
        orderBy: { createdAt: "desc" },
        take: 100,
      });
      res.json(alerts);
    } catch (error) {
      console.error("[GET /api/alerts]", error);
      res.status(500).json({ error: "Erro ao buscar alertas" });
    }
  });

  app.patch("/api/alerts/:id/read", authenticate, async (req: any, res: any) => {
    try {
      const alert = await prisma.alert.update({
        where: { id: req.params.id },
        data: { lido: true, lidoEm: new Date(), lidoPor: req.user.id }
      });
      res.json(alert);
    } catch {
      res.status(404).json({ error: "Alerta não encontrado" });
    }
  });

  app.patch("/api/alerts/:id/resolve", authenticate, async (req: any, res: any) => {
    const resolucao = sanitizeString(req.body?.resolucao, 1000);
    if (!resolucao) {
      return res.status(400).json({ error: "Campo 'resolucao' é obrigatório para encerrar o alerta" });
    }
    try {
      const alert = await prisma.alert.update({
        where: { id: req.params.id },
        data: { status: "RESOLVIDO", resolucao, lido: true, lidoEm: new Date(), lidoPor: req.user.id }
      });
      res.json(alert);
    } catch {
      res.status(404).json({ error: "Alerta não encontrado" });
    }
  });

  // ============================================
  // AUDIT LOGS (paginated)
  // ============================================
  app.get("/api/audit-logs", authenticate, can("audit-logs:read"), async (req: any, res: any) => {
    try {
      const page = sanitizeInt(req.query.page, 1);
      const limit = sanitizeInt(req.query.limit, 1, 100) || 50;
      const skip = (page - 1) * limit;

      const [logs, total] = await Promise.all([
        prisma.auditLog.findMany({
          include: { user: true, project: true },
          orderBy: { data: "desc" },
          skip,
          take: limit,
        }),
        prisma.auditLog.count(),
      ]);
      res.json({ data: logs, total, page, limit });
    } catch (error) {
      console.error("[GET /api/audit-logs]", error);
      res.status(500).json({ error: "Erro ao buscar logs" });
    }
  });

  // ============================================
  // STATS
  // ============================================
  app.get("/api/stats", authenticate, can("stats:read"), async (req, res) => {
    try {
      const [totalProjects, approvedProjects, totalValue] = await Promise.all([
        prisma.project.count(),
        prisma.project.count({ where: { status: "Aprovado" } }),
        prisma.project.aggregate({ _sum: { valor: true } })
      ]);

      res.json({
        totalProjects,
        approvedProjects,
        totalValue: totalValue._sum.valor || 0,
        approvalRate: totalProjects > 0 ? (approvedProjects / totalProjects) * 100 : 0
      });
    } catch (error) {
      console.error("[GET /api/stats]", error);
      res.status(500).json({ error: "Erro ao buscar estatísticas" });
    }
  });

  // ============================================
  // LESSONS LEARNED — full CRUD with validation
  // ============================================
  app.get("/api/lessons", authenticate, async (req: any, res: any) => {
    try {
      const lessons = await prisma.lessonLearned.findMany({
        orderBy: { createdAt: "desc" },
        take: 200,
      });
      res.json(lessons);
    } catch (error) {
      console.error("[GET /api/lessons]", error);
      res.status(500).json({ error: "Erro ao buscar lições aprendidas" });
    }
  });

  app.post("/api/lessons", authenticate, [
    body("projeto").trim().notEmpty().withMessage("Projeto é obrigatório").isLength({ max: 200 }),
    body("licao").trim().notEmpty().withMessage("Lição é obrigatória").isLength({ max: 2000 }),
    body("categoria").optional().isLength({ max: 100 }),
  ], async (req: any, res: any) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { projeto, licao, categoria } = req.body;
    try {
      const lesson = await prisma.lessonLearned.create({
        data: {
          projeto: sanitizeString(projeto, 200),
          licao: sanitizeString(licao, 2000),
          categoria: categoria ? sanitizeString(categoria, 100) : null,
          autor: req.user.email
        }
      });
      res.status(201).json(lesson);
    } catch (error) {
      console.error("[POST /api/lessons]", error);
      res.status(400).json({ error: "Erro ao criar lição aprendida" });
    }
  });

  app.put("/api/lessons/:id", authenticate, async (req: any, res: any) => {
    const { id } = req.params;
    const { projeto, licao, categoria } = req.body;
    try {
      const lesson = await prisma.lessonLearned.update({
        where: { id },
        data: {
          ...(projeto !== undefined && { projeto: sanitizeString(projeto, 200) }),
          ...(licao !== undefined && { licao: sanitizeString(licao, 2000) }),
          ...(categoria !== undefined && { categoria: categoria ? sanitizeString(categoria, 100) : null }),
        }
      });
      res.json(lesson);
    } catch (error) {
      console.error("[PUT /api/lessons/:id]", error);
      res.status(404).json({ error: "Lição não encontrada" });
    }
  });

  app.delete("/api/lessons/:id", authenticate, async (req: any, res: any) => {
    const { id } = req.params;
    try {
      await prisma.lessonLearned.delete({ where: { id } });
      res.json({ success: true });
    } catch (error) {
      console.error("[DELETE /api/lessons/:id]", error);
      res.status(404).json({ error: "Lição não encontrada" });
    }
  });

  // ============================================
  // CSV EXPORT ROUTES
  // ============================================
  app.get("/api/export/pipeline", authenticate, async (req, res) => {
    try {
      const projects = await prisma.project.findMany({ include: { responsavel: true } });
      const headers = ["ID", "Nome", "Edital", "Financiador", "Área", "Valor", "Status", "Prazo", "Probabilidade", "Risco", "Responsável"];
      const rows = projects.map(p => [
        p.id, p.nome, p.edital, p.financiador, p.area,
        String(p.valor), p.status,
        p.prazo.toISOString().split("T")[0],
        String(p.probabilidade), p.risco, p.responsavel.name
      ]);
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", "attachment; filename=pipeline.csv");
      res.send(toCsv(headers, rows));
    } catch (error) {
      console.error("[GET /api/export/pipeline]", error);
      res.status(500).json({ error: "Erro ao exportar pipeline" });
    }
  });

  app.get("/api/export/captacao", authenticate, async (req, res) => {
    try {
      const projects = await prisma.project.findMany({
        where: { status: { in: ["Aprovado", "Captado", "Execução", "Formalização"] } },
        include: { responsavel: true }
      });
      const headers = ["ID", "Nome", "Financiador", "Valor", "Status", "Prazo", "Responsável"];
      const rows = projects.map(p => [
        p.id, p.nome, p.financiador, String(p.valor), p.status,
        p.prazo.toISOString().split("T")[0], p.responsavel.name
      ]);
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", "attachment; filename=captacao.csv");
      res.send(toCsv(headers, rows));
    } catch (error) {
      console.error("[GET /api/export/captacao]", error);
      res.status(500).json({ error: "Erro ao exportar captação" });
    }
  });

  app.get("/api/export/documents", authenticate, async (req, res) => {
    try {
      const docs = await prisma.document.findMany({ include: { project: true } });
      const headers = ["ID", "Nome", "Projeto", "Status", "Validade", "Tipo Arquivo", "URL"];
      const rows = docs.map(d => [
        d.id, d.nome, d.project.nome, d.status,
        d.validade ? d.validade.toISOString().split("T")[0] : "Permanente",
        d.fileType || "N/A", d.url || ""
      ]);
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", "attachment; filename=documentos.csv");
      res.send(toCsv(headers, rows));
    } catch (error) {
      console.error("[GET /api/export/documents]", error);
      res.status(500).json({ error: "Erro ao exportar documentos" });
    }
  });

  app.get("/api/export/alerts", authenticate, async (req, res) => {
    try {
      const alerts = await prisma.alert.findMany({ include: { project: true } });
      const headers = ["ID", "Título", "Mensagem", "Nível", "Tipo", "Status", "Projeto", "Prazo", "Criado em"];
      const rows = alerts.map(a => [
        a.id, a.titulo, a.mensagem, a.nivel, a.tipo, a.status,
        a.project?.nome || "Geral",
        a.prazo ? a.prazo.toISOString().split("T")[0] : "N/A",
        a.createdAt.toISOString().split("T")[0]
      ]);
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", "attachment; filename=alertas.csv");
      res.send(toCsv(headers, rows));
    } catch (error) {
      console.error("[GET /api/export/alerts]", error);
      res.status(500).json({ error: "Erro ao exportar alertas" });
    }
  });

  app.get("/api/export/audit-logs", authenticate, async (req, res) => {
    try {
      const logs = await prisma.auditLog.findMany({ include: { user: true, project: true }, orderBy: { data: "desc" }, take: 500 });
      const headers = ["ID", "Data", "Usuário", "Ação", "Entidade", "ID Entidade", "Projeto"];
      const rows = logs.map(l => [
        l.id, l.data.toISOString(), l.user.name, l.acao, l.entidade,
        l.entidadeId || "", l.project?.nome || ""
      ]);
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", "attachment; filename=auditoria.csv");
      res.send(toCsv(headers, rows));
    } catch (error) {
      console.error("[GET /api/export/audit-logs]", error);
      res.status(500).json({ error: "Erro ao exportar auditoria" });
    }
  });

  app.get("/api/export/lessons", authenticate, async (req, res) => {
    try {
      const lessons = await prisma.lessonLearned.findMany({ orderBy: { createdAt: "desc" } });
      const headers = ["ID", "Projeto", "Lição", "Categoria", "Autor", "Data"];
      const rows = lessons.map(l => [
        l.id, l.projeto, l.licao, l.categoria || "", l.autor || "",
        l.createdAt.toISOString().split("T")[0]
      ]);
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", "attachment; filename=licoes-aprendidas.csv");
      res.send(toCsv(headers, rows));
    } catch (error) {
      console.error("[GET /api/export/lessons]", error);
      res.status(500).json({ error: "Erro ao exportar lições" });
    }
  });

  // ============================================
  // VITE / STATIC SERVING
  // ============================================
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`ROTA Production-Ready Server running on http://localhost:${PORT}`);
  });
}

process.on("unhandledRejection", (reason) => {
  console.error("[unhandledRejection]", reason);
});
process.on("uncaughtException", (error) => {
  console.error("[uncaughtException]", error);
});

startServer();
