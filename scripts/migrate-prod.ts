import { execSync } from "child_process";

/**
 * Sync Prisma schema in production.
 *
 * Uses `prisma db push` instead of `prisma migrate deploy` because the
 * production database was initialized outside Prisma Migrate and can already
 * contain tables while `_prisma_migrations` is empty/inconsistent.
 *
 * In that scenario `migrate deploy` fails with P3005 (non-empty schema with no
 * valid migration history). `db push` is idempotent for aligned schemas and
 * avoids blocking startup.
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
