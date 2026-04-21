FROM node:20-slim

# Prisma's schema engine (used by Prisma CLI commands such as `prisma db push`) is a Rust binary
# that links against OpenSSL.  node:20-slim is a minimal Debian image with no
# OpenSSL — the engine fails at runtime with "Schema engine error".
RUN apt-get update -y && \
    apt-get install -y --no-install-recommends openssl && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# ── Layer 1: dependencies ────────────────────────────────────────────────────
# Copy manifests first so Docker reuses this layer when only source changes.
COPY package*.json ./
COPY prisma ./prisma

# CRITICAL: use `npm install` (not `npm ci`) with --include=optional
#
# npm ci reproduces the lock file exactly.  The lock was likely generated on
# macOS/Windows, so @tailwindcss/oxide-linux-x64-gnu (the native Rust binding
# required by Tailwind v4 on Linux) was never added to it.  npm ci therefore
# skips it and the build crashes at Vite config-load time with
# "Cannot find native binding" (oxide/index.js:559).
#
# npm install --include=optional resolves packages fresh for the current
# platform, fetching the correct linux-x64-gnu binding automatically.
RUN npm install --include=optional

# ── Layer 2: source ──────────────────────────────────────────────────────────
COPY . .

# ── Layer 3: build ───────────────────────────────────────────────────────────
# DATABASE_URL is only needed here so `prisma generate` can parse the schema
# directive — it never opens a connection during generate.
# The real DATABASE_URL is injected at runtime via Railway env vars.
RUN DATABASE_URL=postgresql://placeholder:placeholder@localhost:5432/placeholder \
    npm run build

# ── Runtime ──────────────────────────────────────────────────────────────────
# npm start = `npx prisma@6.4.1 db push && NODE_ENV=production tsx server.ts`
# Requires DATABASE_URL, JWT_SECRET, JWT_REFRESH_SECRET in Railway env vars.
CMD ["npm", "start"]
