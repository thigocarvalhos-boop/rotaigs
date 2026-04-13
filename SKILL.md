# ROTA — Skill de Diagnóstico e Reparação

## O que é este app

**ROTA** (Registro Operacional de Trajetórias e Ações) é uma plataforma full-stack de gestão institucional de projetos para o **Instituto Guia Social (IGS)**, ONG sediada no Recife/PE. Gerencia pipeline de captação de editais, compliance documental, antiglosa e memória organizacional.

**Stack:**
- Frontend: React 19 + TypeScript + Tailwind CSS v4 + Recharts + Framer Motion + Zustand
- Backend (Railway): Express + Prisma ORM + JWT + bcrypt → `server.ts`
- Backend (Vercel): Serverless functions em `api/*.ts` (espelham as rotas do Express)
- Banco: PostgreSQL (Railway internal: `postgres-ha.railway.internal:5432`)
- Build: Vite + nixpacks substituído por Dockerfile

**Dois deployments possíveis:**
| Plataforma | Entry point | Build |
|---|---|---|
| Railway | `server.ts` (Express) | `Dockerfile` |
| Vercel | `api/*.ts` (serverless) | `npm run vercel-build` |

---

## Arquitetura de arquivos críticos

```
/
├── Dockerfile                  ← build para Railway
├── railway.toml                ← builder = "dockerfile"
├── vercel.json                 ← routes: /api/* antes do catch-all SPA
├── package.json                ← scripts: start, build, vercel-build
├── server.ts                   ← Express app completo (Railway)
├── prisma/
│   ├── schema.prisma           ← binaryTargets = ["native","debian-openssl-3.0.x"]
│   └── migrations/             ← histórico de migrações SQL
├── api/                        ← serverless functions (Vercel)
│   ├── _lib/                   ← auth, prisma, audit, alert, csv, rate-limit
│   ├── auth/login.ts
│   ├── auth/refresh.ts
│   ├── projects/[id].ts
│   ├── projects/index.ts
│   ├── documents/[id].ts
│   ├── documents/index.ts
│   ├── alerts/[id]/read.ts
│   ├── alerts/[id]/resolve.ts
│   ├── alerts/index.ts
│   ├── expenses/index.ts
│   ├── lessons/[id].ts
│   ├── lessons/index.ts
│   ├── audit-logs.ts
│   ├── stats.ts
│   ├── health.ts
│   └── seed.ts
├── src/
│   ├── App.tsx                 ← root, fetchData, demo mode logic
│   ├── api/client.ts           ← apiClient com token refresh automático
│   ├── store/authStore.ts      ← Zustand + localStorage tokens
│   ├── views/                  ← LoginView, DashboardView, PipelineView, etc.
│   └── mockData.ts             ← dados de demo quando API indisponível
└── scripts/
    ├── migrate-prod.ts         ← runProductionMigrations() chamado em server.ts
    └── seed-production.ts      ← cria admin@guiasocial.org se não existir
```

---

## Variáveis de ambiente obrigatórias

| Variável | Usado em | Descrição |
|---|---|---|
| `DATABASE_URL` | runtime | `postgresql://user:pass@host:port/db` |
| `JWT_SECRET` | runtime | `openssl rand -base64 32` |
| `JWT_REFRESH_SECRET` | runtime | `openssl rand -base64 32` (diferente do JWT_SECRET) |
| `ADMIN_DEFAULT_PASSWORD` | build + runtime | senha de `admin@guiasocial.org` |
| `SEED_SECRET` | runtime | protege `POST /api/seed` |
| `NODE_ENV` | runtime | `production` em produção |

**Se qualquer uma das três primeiras estiver faltando o app não inicia.**

---

## Catálogo de erros conhecidos com fix definitivo

### ERRO 1 — `Cannot find native binding` (build falha)
```
Error: Cannot find native binding. npm has a bug related to optional dependencies
at Object.<anonymous> (/app/node_modules/@tailwindcss/oxide/index.js:559:11)
```
**Causa:** nixpacks usa `npm ci` que lê o lock file gerado em macOS. O binding nativo `@tailwindcss/oxide-linux-x64-gnu` não está no lock → não é instalado → Tailwind v4 quebra ao carregar `vite.config.ts`.

**Fix:** `railway.toml` com `builder = "dockerfile"` + `Dockerfile` que roda `npm install --include=optional`.

```toml
# railway.toml
[build]
builder = "dockerfile"
```

```dockerfile
# Dockerfile — linha crítica
RUN npm install --include=optional
```

---

### ERRO 2 — `Schema engine error` / OpenSSL (runtime crash loop)
```
Prisma failed to detect the libssl/openssl version to use
Error: Schema engine error
```
**Causa:** `node:20-slim` não tem OpenSSL. O engine do Prisma (binário Rust) precisa de `libssl` para conectar ao PostgreSQL.

**Fix:** instalar OpenSSL no Dockerfile e corrigir `binaryTargets` no schema.

```dockerfile
# Dockerfile
RUN apt-get update -y && \
    apt-get install -y --no-install-recommends openssl && \
    rm -rf /var/lib/apt/lists/*
```

```prisma
// prisma/schema.prisma
generator client {
  provider      = "prisma-client-js"
  binaryTargets = ["native", "debian-openssl-3.0.x"]
}
```

**Nota:** `rhel-openssl-3.0.x` é para Red Hat/CentOS. `node:20-slim` é Debian Bookworm → usar `debian-openssl-3.0.x`.

---

### ERRO 3 — `P3005` / migration history inconsistente (runtime crash loop)
```
No migration found in prisma/migrations
Error: P3005
The database schema is not empty
```
**Causa:** banco já tem tabelas (criadas via SQL direto ou migration de emergência), mas `_prisma_migrations` está vazia ou inconsistente. `prisma migrate deploy` vê banco não-vazio sem histórico de migrations → P3005.

**Fix:** trocar `prisma migrate deploy` por `prisma db push` em todos os scripts.

```json
// package.json
"start": "npx prisma@6.4.1 db push && NODE_ENV=production tsx server.ts"
```

`prisma db push` sincroniza `schema.prisma` com o banco diretamente, sem depender de histórico de migrations. Se o schema já bate com o banco, sai em 0 sem fazer nada.

---

### ERRO 4 — Login retorna HTML em vez de JSON (demo mode forçado)
```javascript
// safeJson() em src/api/client.ts lança:
throw new Error("Servidor indisponível")
// → app entra em modo demo silenciosamente
```
**Causa:** `vercel.json` sem rota `/api/*` antes do catch-all. Toda requisição para `/api/auth/login` recebe `index.html` de volta.

**Fix:**
```json
// vercel.json
{
  "routes": [
    { "src": "/api/(.*)", "dest": "/api/$1" },
    { "handle": "filesystem" },
    { "src": "/(.*)", "dest": "/index.html" }
  ]
}
```

---

### ERRO 5 — `prisma generate` falha no build Vercel (DATABASE_URL ausente)
```
Error validating datasource `db`: the URL must start with the protocol `postgresql://`
```
**Causa:** `prisma generate` precisa que `DATABASE_URL` exista como env var (não conecta, mas valida o formato). Em projetos Vercel novos a variável pode não estar configurada ainda.

**Fix:** usar placeholder inline apenas para o `generate`:
```json
// package.json
"vercel-build": "DATABASE_URL=postgresql://placeholder:placeholder@localhost:5432/placeholder TAILWIND_DISABLE_OXIDE=1 npx prisma@6.4.1 generate && ..."
```
O `DATABASE_URL=...` antes de um comando escopa a variável apenas para aquele processo. Os comandos seguintes usam o valor real do ambiente.

---

### ERRO 6 — Admin não existe, login retorna 401 em produção
```json
{ "error": "Credenciais inválidas" }
```
**Causa:** seed nunca rodou. Em produção, `server.ts` skipar seed se `ADMIN_DEFAULT_PASSWORD` não estiver setado.

**Fix em Railway:** setar `ADMIN_DEFAULT_PASSWORD` nas env vars do Railway. `server.ts` cria o admin automaticamente no primeiro startup.

**Fix em Vercel:** `vercel-build` roda `npx tsx scripts/seed-production.ts` após o `db push`. Admin criado em build time.

**Fix manual (emergência):**
```bash
curl -X POST https://seu-app.railway.app/api/seed \
  -H "x-seed-secret: SEU_SEED_SECRET" \
  -H "Content-Type: application/json"
```

---

### ERRO 7 — Token expira, usuário é deslogado em 15 min
**Causa:** access token tem TTL de 15 minutos por design. O `apiClient` em `src/api/client.ts` deve usar o refresh token automaticamente.

**Diagnóstico:** verificar se `fetchWithRefresh()` está sendo chamado em vez de `fetch()` diretamente. Todas as chamadas autenticadas devem passar por `fetchWithRefresh`.

**Fix:** garantir que `apiClient` sempre chama `fetchWithRefresh`. O `setToken` do authStore persiste no localStorage.

---

### ERRO 8 — CORS em desenvolvimento
```
Access to fetch at 'http://localhost:3000/api/...' from origin 'http://localhost:5173' has been blocked
```
**Causa:** Vite roda na porta 5173, Express na 3000. Em dev o `server.ts` tem `cors({ origin: true })` que aceita qualquer origem — OK. O problema é acessar a porta errada.

**Fix:** em dev, o Vite serve o Express via `middlewareMode`, então tudo fica na porta 3000. Usar `npm run dev` (que sobe `server.ts`) e não `vite dev` separado.

---

## Fluxo de deploy completo (Railway)

```
git push
  ↓
Railway detecta mudança → docker build
  1. apt-get install openssl
  2. npm install --include=optional   ← instala @tailwindcss/oxide-linux-x64-gnu
  3. COPY source
  4. DATABASE_URL=placeholder npm run build
     a. prisma generate              ← gera Prisma Client para debian-openssl-3.0.x
     b. vite build                   ← compila React SPA → dist/
  5. CMD npm start
     a. prisma db push               ← sincroniza schema com banco (idempotente)
     b. tsx server.ts                ← Express na porta $PORT
        ├── seedData()               ← cria admin se ADMIN_DEFAULT_PASSWORD setado
        ├── checkDocumentExpirations()
        └── app.listen()
```

---

## Fluxo de deploy completo (Vercel)

```
git push
  ↓
Vercel detecta mudança → npm run vercel-build
  1. DATABASE_URL=placeholder prisma generate
  2. prisma db push               ← com DATABASE_URL real do Vercel
  3. tsx scripts/seed-production.ts ← cria admin se ADMIN_DEFAULT_PASSWORD setado
  4. vite build → dist/
  ↓
Deploy:
  dist/       → static SPA (servido pelo Vercel CDN)
  api/*.ts    → serverless functions (rotas /api/*)
  ↓
routes em vercel.json:
  /api/* → api/$1 (serverless)
  /*     → dist/index.html (SPA)
```

---

## Como diagnosticar um problema

### Passo 1: identificar o layer do problema

| Sintoma | Layer provável |
|---|---|
| Build falha antes de `vite build` | Dockerfile / nixpacks / npm install |
| Container crasha em loop sem subir | runtime: OpenSSL, DATABASE_URL, P3005 |
| App sobe mas login retorna HTML | vercel.json routes / Vercel deploy |
| Login retorna 401 | Admin não existe / senha errada |
| Login retorna 200 mas token inválido | JWT_SECRET não setado |
| App sobe em modo demo | safeJson() detectou HTML — ver Erro 4 |
| Dados não persistem | DB não conectado / migrations não rodaram |

### Passo 2: verificar logs

**Railway Build Logs:** mostram erros de Docker build
**Railway Deploy Logs:** mostram erros de runtime (OpenSSL, P3005, etc.)
**Vercel Function Logs:** acessar em Vercel → projeto → Functions → ver invocações com erro

### Passo 3: verificar env vars

Antes de qualquer outra coisa, confirmar que todas as 5 variáveis obrigatórias estão setadas na plataforma certa. Metade dos erros de produção são simplesmente variáveis faltando.

---

## Comandos de diagnóstico rápido

```bash
# Testar se o servidor está de pé
curl https://seu-app.railway.app/api/health

# Testar login
curl -X POST https://seu-app.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@guiasocial.org","password":"SUA_SENHA"}'

# Criar admin manualmente (se seed não rodou)
curl -X POST https://seu-app.railway.app/api/seed \
  -H "x-seed-secret: SEU_SEED_SECRET" \
  -H "Content-Type: application/json"

# Verificar se DATABASE_URL está chegando no container
# (adicionar temporariamente ao server.ts, remover depois)
console.log("DB URL set:", !!process.env.DATABASE_URL)
```

---

## Contexto institucional (IGS / ROTA)

- **Organização:** Instituto Guia Social, Ipsep/Recife, CNPJ 08.888.682/0001-22
- **Admin padrão:** `admin@guiasocial.org` / `ADMIN_DEFAULT_PASSWORD`
- **URL Railway:** configurada no dashboard do Railway
- **URL Vercel:** `https://rotaigs.vercel.app`
- **Banco:** PostgreSQL interno Railway (`postgres-ha.railway.internal:5432`)
- **14 projetos reais IGS 2026** populados no banco de produção

---

## O que NÃO fazer

- ❌ Nunca rodar `prisma migrate reset` em produção (destrói todos os dados)
- ❌ Nunca commitar `.env` (está no `.gitignore`)
- ❌ Nunca usar `npm ci` em ambientes Linux quando o lock foi gerado em macOS
- ❌ Nunca usar `node:20-alpine` com Prisma sem mudar o binaryTarget para `linux-musl-openssl-3.0.x`
- ❌ Nunca colocar `TAILWIND_DISABLE_OXIDE=1` como variável de ambiente global no Railway sem garantir que o WASM fallback está instalado
- ❌ Nunca remover a rota `/api/*` do `vercel.json` antes do catch-all SPA
