import { execSync } from "child_process";

/**
 * Runs `prisma migrate deploy` in production to ensure the database schema
 * is up to date before the server starts accepting requests.
 *
 * Only executes in production (NODE_ENV=production). In development,
 * `prisma migrate dev` is handled separately.
 *
 * Exits the process with code 1 if the migration fails in production,
 * so the deployment platform (Vercel / Railway) will mark the deployment
 * as failed and avoid routing traffic to a server with a mismatched schema.
 */
export async function runProductionMigrations(): Promise<void> {
  if (process.env.NODE_ENV !== "production") {
    console.log("[migrate-prod] Skipped: not in production mode.");
    return;
  }

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl || (!dbUrl.startsWith("postgresql://") && !dbUrl.startsWith("postgres://"))) {
    console.warn("[migrate-prod] DATABASE_URL not set or invalid — skipping migration.");
    return;
  }

  console.log("[migrate-prod] Running prisma migrate deploy...");
  try {
    execSync("npx prisma@6.4.1 migrate deploy", {
      stdio: "inherit",
      env: { ...process.env },
    });
    console.log("[migrate-prod] Migrations applied successfully.");
  } catch (error) {
    console.error("[migrate-prod] Migration failed:", error);
    process.exit(1);
  }
}
