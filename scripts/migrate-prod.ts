import { execSync } from "child_process";

/**
 * Syncs Prisma schema to production database.
 *
 * Uses `prisma db push` instead of `prisma migrate deploy` because some
 * production environments were initialized outside Prisma migrations.
 * In that case, `migrate deploy` fails with P3005.
 */
export async function runProductionMigrations(): Promise<void> {
  if (process.env.NODE_ENV !== "production") {
    console.log("[migrate-prod] Skipped: not in production mode.");
    return;
  }

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl || (!dbUrl.startsWith("postgresql://") && !dbUrl.startsWith("postgres://"))) {
    console.warn("[migrate-prod] DATABASE_URL not set or invalid — skipping schema sync.");
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
