import { execSync } from "child_process";

/**
 * Sincroniza o schema Prisma com o banco de dados em produção.
 *
 * Usa `prisma db push` em vez de `prisma migrate deploy` porque:
 *   - O banco foi criado via SQL direto (migration de emergência), então a
 *     tabela _prisma_migrations está vazia ou inconsistente.
 *   - `migrate deploy` lança P3005 quando encontra banco não-vazio sem
 *     histórico de migrations correspondente.
 *   - `db push` sincroniza schema.prisma → banco diretamente, sem depender
 *     de histórico de migrations. Se o schema já bate com o banco, retorna 0
 *     sem alterar nada.
 */
export async function runProductionMigrations(): Promise<void> {
  if (process.env.NODE_ENV !== "production") {
    console.log("[migrate-prod] Skipped: not in production mode.");
    return;
  }

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl || (!dbUrl.startsWith("postgresql://") && !dbUrl.startsWith("postgres://"))) {
    console.warn("[migrate-prod] DATABASE_URL not set or invalid — skipping.");
    return;
  }

  console.log("[migrate-prod] Running prisma db push...");
  try {
    execSync("npx prisma@6.4.1 db push", {
      stdio: "inherit",
      env: { ...process.env },
    });
    console.log("[migrate-prod] Schema sync complete.");
  } catch (error) {
    console.error("[migrate-prod] db push failed:", error);
    process.exit(1);
  }
}
