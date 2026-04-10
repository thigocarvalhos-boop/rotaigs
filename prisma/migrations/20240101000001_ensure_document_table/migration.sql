-- Idempotent: create "Document" table if it was not created by the init migration.
-- This handles production databases where the _prisma_migrations table marks
-- 20240101000000_init as applied but the Document table was never physically created.

CREATE TABLE IF NOT EXISTS "Document" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "validade" TIMESTAMP(3),
    "url" TEXT,
    "fileType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- Indexes (IF NOT EXISTS is supported in PostgreSQL 9.5+)
CREATE INDEX IF NOT EXISTS "Document_projectId_idx" ON "Document"("projectId");
CREATE INDEX IF NOT EXISTS "Document_status_idx" ON "Document"("status");

-- Foreign key: only add if it doesn't already exist
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_schema = 'public'
          AND constraint_name = 'Document_projectId_fkey'
    ) THEN
        ALTER TABLE "Document"
            ADD CONSTRAINT "Document_projectId_fkey"
            FOREIGN KEY ("projectId") REFERENCES "Project"("id")
            ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;
