-- Initial migration: drop any corrupted state and create entire schema from scratch
-- Safe to run on fresh or corrupted databases (uses DROP IF EXISTS)

-- Drop all application tables (reverse FK dependency order)
DROP TABLE IF EXISTS "LessonLearned" CASCADE;
DROP TABLE IF EXISTS "AuditLog" CASCADE;
DROP TABLE IF EXISTS "Alert" CASCADE;
DROP TABLE IF EXISTS "ComplianceCheck" CASCADE;
DROP TABLE IF EXISTS "Document" CASCADE;
DROP TABLE IF EXISTS "Cotacao" CASCADE;
DROP TABLE IF EXISTS "Expense" CASCADE;
DROP TABLE IF EXISTS "Etapa" CASCADE;
DROP TABLE IF EXISTS "Meta" CASCADE;
DROP TABLE IF EXISTS "Project" CASCADE;
DROP TABLE IF EXISTS "User" CASCADE;

-- Drop wrong-schema tables from corrupted 001_init migration (if they exist)
DROP TABLE IF EXISTS comments CASCADE;
DROP TABLE IF EXISTS posts CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop Role enum if exists
DROP TYPE IF EXISTS "Role" CASCADE;

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'DIRETORIA', 'COORDENACAO', 'ELABORADOR', 'DOCUMENTAL', 'FINANCEIRO', 'MONITORAMENTO', 'LEITURA');

-- CreateTable: User
CREATE TABLE "User" (
    "id"        TEXT NOT NULL,
    "email"     TEXT NOT NULL,
    "password"  TEXT NOT NULL,
    "name"      TEXT NOT NULL,
    "role"      "Role" NOT NULL DEFAULT 'LEITURA',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Project
CREATE TABLE "Project" (
    "id"              TEXT NOT NULL,
    "nome"            TEXT NOT NULL,
    "edital"          TEXT NOT NULL,
    "financiador"     TEXT NOT NULL,
    "area"            TEXT NOT NULL,
    "valor"           DOUBLE PRECISION NOT NULL,
    "status"          TEXT NOT NULL,
    "prazo"           TIMESTAMP(3) NOT NULL,
    "responsavelId"   TEXT NOT NULL,
    "probabilidade"   INTEGER NOT NULL,
    "risco"           TEXT NOT NULL,
    "aderencia"       INTEGER NOT NULL,
    "territorio"      TEXT NOT NULL,
    "publico"         TEXT NOT NULL,
    "competitividade" TEXT NOT NULL,
    "proximoPasso"    TEXT NOT NULL,
    "ptScore"         INTEGER NOT NULL,
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Meta
CREATE TABLE "Meta" (
    "id"        TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "indicador" TEXT NOT NULL,
    "meta"      DOUBLE PRECISION NOT NULL,
    "alcancado" DOUBLE PRECISION NOT NULL,
    "unidade"   TEXT NOT NULL,
    "budget"    DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "Meta_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Etapa
CREATE TABLE "Etapa" (
    "id"        TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "nome"      TEXT NOT NULL,
    "inicio"    TIMESTAMP(3) NOT NULL,
    "fim"       TIMESTAMP(3) NOT NULL,
    "status"    TEXT NOT NULL,
    "peso"      DOUBLE PRECISION NOT NULL,

    CONSTRAINT "Etapa_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Expense
CREATE TABLE "Expense" (
    "id"            TEXT NOT NULL,
    "projectId"     TEXT NOT NULL,
    "descricao"     TEXT NOT NULL,
    "valor"         DOUBLE PRECISION NOT NULL,
    "data"          TIMESTAMP(3) NOT NULL,
    "categoria"     TEXT NOT NULL,
    "status"        TEXT NOT NULL,
    "justificativa" TEXT,
    "vincMetaId"    TEXT NOT NULL,
    "vincEtapaId"   TEXT NOT NULL,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Cotacao
CREATE TABLE "Cotacao" (
    "id"         TEXT NOT NULL,
    "expenseId"  TEXT NOT NULL,
    "fornecedor" TEXT NOT NULL,
    "valor"      DOUBLE PRECISION NOT NULL,
    "data"       TIMESTAMP(3) NOT NULL,
    "vencedora"  BOOLEAN NOT NULL,
    "docUrl"     TEXT,

    CONSTRAINT "Cotacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Document (CRITICAL - fixes P2021 error)
CREATE TABLE "Document" (
    "id"        TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "nome"      TEXT NOT NULL,
    "status"    TEXT NOT NULL,
    "validade"  TIMESTAMP(3),
    "url"       TEXT,
    "fileType"  TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ComplianceCheck
CREATE TABLE "ComplianceCheck" (
    "id"        TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "item"      TEXT NOT NULL,
    "status"    TEXT NOT NULL,
    "data"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComplianceCheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Alert
CREATE TABLE "Alert" (
    "id"        TEXT NOT NULL,
    "projectId" TEXT,
    "titulo"    TEXT NOT NULL,
    "mensagem"  TEXT NOT NULL,
    "nivel"     TEXT NOT NULL,
    "status"    TEXT NOT NULL,
    "tipo"      TEXT NOT NULL,
    "prazo"     TIMESTAMP(3),
    "lido"      BOOLEAN NOT NULL DEFAULT false,
    "lidoEm"    TIMESTAMP(3),
    "lidoPor"   TEXT,
    "resolucao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- CreateTable: AuditLog
CREATE TABLE "AuditLog" (
    "id"         TEXT NOT NULL,
    "userId"     TEXT NOT NULL,
    "projectId"  TEXT,
    "acao"       TEXT NOT NULL,
    "entidade"   TEXT NOT NULL,
    "entidadeId" TEXT,
    "antes"      TEXT,
    "depois"     TEXT,
    "data"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable: LessonLearned
CREATE TABLE "LessonLearned" (
    "id"        TEXT NOT NULL,
    "projeto"   TEXT NOT NULL,
    "licao"     TEXT NOT NULL,
    "categoria" TEXT,
    "autor"     TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LessonLearned_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: User
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex: Project
CREATE INDEX "Project_responsavelId_idx" ON "Project"("responsavelId");
CREATE INDEX "Project_status_idx" ON "Project"("status");

-- CreateIndex: Meta
CREATE INDEX "Meta_projectId_idx" ON "Meta"("projectId");

-- CreateIndex: Etapa
CREATE INDEX "Etapa_projectId_idx" ON "Etapa"("projectId");

-- CreateIndex: Expense
CREATE INDEX "Expense_projectId_idx" ON "Expense"("projectId");
CREATE INDEX "Expense_vincMetaId_idx" ON "Expense"("vincMetaId");

-- CreateIndex: Cotacao
CREATE INDEX "Cotacao_expenseId_idx" ON "Cotacao"("expenseId");

-- CreateIndex: Document
CREATE INDEX "Document_projectId_idx" ON "Document"("projectId");
CREATE INDEX "Document_status_idx" ON "Document"("status");

-- CreateIndex: ComplianceCheck
CREATE INDEX "ComplianceCheck_projectId_idx" ON "ComplianceCheck"("projectId");

-- CreateIndex: Alert
CREATE INDEX "Alert_projectId_idx" ON "Alert"("projectId");
CREATE INDEX "Alert_status_idx" ON "Alert"("status");

-- CreateIndex: AuditLog
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");
CREATE INDEX "AuditLog_projectId_idx" ON "AuditLog"("projectId");
CREATE INDEX "AuditLog_data_idx" ON "AuditLog"("data");

-- AddForeignKey: Project -> User
ALTER TABLE "Project" ADD CONSTRAINT "Project_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: Meta -> Project
ALTER TABLE "Meta" ADD CONSTRAINT "Meta_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: Etapa -> Project
ALTER TABLE "Etapa" ADD CONSTRAINT "Etapa_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: Expense -> Project
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: Cotacao -> Expense
ALTER TABLE "Cotacao" ADD CONSTRAINT "Cotacao_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "Expense"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: Document -> Project
ALTER TABLE "Document" ADD CONSTRAINT "Document_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: ComplianceCheck -> Project
ALTER TABLE "ComplianceCheck" ADD CONSTRAINT "ComplianceCheck_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: Alert -> Project (nullable, SET NULL on delete)
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: AuditLog -> User
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: AuditLog -> Project (nullable, SET NULL on delete)
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
