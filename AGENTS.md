# AGENTS.md — Longevilab (Blood Work Tracker)

> Forked from [gianniskotsas/longevilab](https://github.com/gianniskotsas/longevilab). Upstream tracked as `upstream` remote.

## Project Overview

Self-hosted blood work tracker with PDF OCR extraction, LLM-powered biomarker parsing, trend visualization, biological age calculation (PhenoAge), and Apple Health import.

## Tech Stack

- **Framework**: Next.js 15 (App Router, TypeScript strict)
- **Database**: PostgreSQL 16 + Drizzle ORM
- **Queue**: BullMQ + Redis 7
- **Auth**: Better Auth (self-hosted)
- **API**: tRPC (end-to-end type safety)
- **OCR**: Datalab.to API
- **LLM**: Vercel AI SDK (OpenAI, Anthropic, or Ollama)
- **UI**: shadcn/ui + Tailwind CSS v4

## Docker Images

Two images, both pushed to Docker Hub via GHA:

| Image | Dockerfile | Purpose |
|-------|-----------|---------|
| `drumsergio/longevilab` | `docker/Dockerfile` | Next.js app (port 3000) |
| `drumsergio/longevilab-worker` | `docker/Dockerfile.worker` | BullMQ background worker (OCR + LLM jobs) |

## Deployment

Deployed on **geiserback** via Portainer GitOps.

- Compose: `giteaer/geiserback` -> `longevilab/docker-compose.yml`
- App URL: `http://geiserback.mango-alpha.ts.net:3250`
- Postgres: sidecar (not shared with other services)
- Redis: sidecar
- Uploads: `/mnt/user/appdata/longevilab/uploads/`

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `REDIS_URL` | Yes | Redis connection string |
| `BETTER_AUTH_SECRET` | Yes | Auth secret (32+ chars) |
| `BETTER_AUTH_URL` | Yes | App URL for auth callbacks |
| `DATALAB_API_KEY` | Yes* | Datalab.to OCR key |
| `LLM_PROVIDER` | No | `openai`, `anthropic`, or `ollama` |
| `OLLAMA_BASE_URL` | No | Ollama endpoint (if using Ollama) |
| `OPENAI_API_KEY` | No | OpenAI key (if using OpenAI) |
| `ANTHROPIC_API_KEY` | No | Anthropic key (if using Anthropic) |

*PDF extraction won't work without Datalab.to key.

## Development

```bash
pnpm install
cp .env.example .env.local
# Edit .env.local
pnpm dev      # Next.js dev server
pnpm worker   # Background worker (separate terminal)
```

## Key Directories

```
app/                 # Next.js App Router pages
components/          # React components (shadcn/ui)
server/
  db/                # Drizzle schema + migrations + seed
  trpc/              # tRPC routers
  jobs/              # BullMQ job processors
  services/          # Business logic (OCR, LLM, PhenoAge)
docker/              # Dockerfiles + compose
```

## Rules

1. Use HugeIcons (never Lucide) per upstream convention.
2. All new API endpoints via tRPC.
3. TypeScript strict mode.
4. Docker Hub images: `drumsergio/longevilab` and `drumsergio/longevilab-worker`.
5. Semver tags only (never `:latest` in compose).
