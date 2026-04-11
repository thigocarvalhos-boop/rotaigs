<div align="center">

# ROTA — Inteligência Institucional

**Plataforma de gestão de ciclo completo de projetos com foco em compliance, antiglosa e governança institucional.**

</div>

## Funcionalidades

- **Dashboard** — Visão executiva do pipeline com KPIs, alertas e gráficos
- **Pipeline de Projetos** — Gestão do ciclo de vida completo (Oportunidade → Concluído)
- **Banco de Editais** — Monitoramento de oportunidades de financiamento
- **Alertas e Prazos** — Monitoramento proativo de datas críticas e documentos
- **Gestão Documental** — Biblioteca institucional de certidões e documentos
- **Módulo Antiglosa** — Auditoria preventiva de despesas com validação de conformidade
- **Memória Organizacional** — Inteligência acumulada, logs de auditoria e lições aprendidas

## Tecnologias

- **Frontend:** React 19 · TypeScript · Tailwind CSS v4 · Recharts · Framer Motion · Zustand
- **Backend:** Express · Prisma ORM · JWT Auth · bcrypt
- **Banco de Dados:** PostgreSQL (opcional — funciona em modo demo sem BD)

## Como Executar

### Pré-requisitos

- Node.js 18+
- PostgreSQL (opcional)

### 1. Instalar dependências

```bash
npm install
```

### 2. Configurar variáveis de ambiente (opcional)

Copie `.env.example` para `.env` e configure:

```bash
cp .env.example .env
```

> **Nota:** Sem `DATABASE_URL`, o site funciona em modo demonstração com dados de exemplo.

### 3. Configurar banco de dados (opcional)

Se tiver PostgreSQL configurado:

```bash
npx prisma@6.4.1 migrate dev
```

### 4. Executar em desenvolvimento

```bash
npm run dev
```

O servidor estará disponível em **http://localhost:3000**

### 5. Build para produção

```bash
npm run build
npm run start
```

## Credenciais

Com o banco de dados configurado, o seed cria automaticamente:

| Campo | Valor |
|-------|-------|
| **E-mail** | `admin@guiasocial.org` |
| **Senha** | `admin123` |

Sem banco de dados, clique em "Entrar" e aceite o modo demonstração.
