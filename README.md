# Longevilab

An open-source, self-hosted personal health monitoring application that allows you to upload blood test PDFs, extract biomarker data using OCR and LLM processing, and track your health metrics over time.

## Features

- **PDF Blood Test Upload**: Upload blood test PDFs and automatically extract biomarker data
- **OCR Processing**: Uses Datalab.to for high-quality PDF text extraction
- **LLM Extraction**: AI-powered extraction of biomarker values and reference ranges
- **Apple Health Import**: Import health data from Apple Health exports
- **Biological Age Calculation**: Calculate your biological age using the PhenoAge algorithm
- **Trend Visualization**: Track biomarker trends over time with interactive charts
- **Reference Ranges**: Compare your values against age and sex-specific reference ranges
- **Self-Hosted**: Full control over your health data

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript (strict mode)
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Better Auth (self-hosted)
- **API**: tRPC for end-to-end type safety
- **Background Jobs**: BullMQ with Redis
- **UI**: shadcn/ui + Tailwind CSS v4
- **OCR**: Datalab.to API
- **LLM**: Vercel AI SDK (supports OpenAI, Anthropic, Ollama)

## Quick Start (Docker)

The easiest way to run Bloodwork Tracker is with Docker Compose.

### Prerequisites

- Docker and Docker Compose installed
- API keys for:
  - [Datalab.to](https://datalab.to) - for PDF OCR processing
  - [OpenAI](https://platform.openai.com) - for LLM extraction (or another supported provider)

### 1. Clone the repository

```bash
git clone https://github.com/gianniskotsas/longevilab.git
cd longevilab
```

### 2. Create environment file

```bash
cp .env.example .env
```

Edit `.env` and fill in the required values:

```env
# Required
BETTER_AUTH_SECRET=your-secret-key-min-32-chars-here
DATALAB_API_KEY=your-datalab-api-key
OPENAI_API_KEY=your-openai-api-key

# Optional - customize these as needed
POSTGRES_USER=bloodwork
POSTGRES_PASSWORD=bloodwork
POSTGRES_DB=bloodwork
```

### 3. Start the services

```bash
cd docker
docker compose up -d
```

This will start:
- **PostgreSQL** - Database
- **Redis** - Queue backend
- **Migrate** - Runs database migrations (one-time)
- **Seed** - Seeds biomarker reference data (one-time)
- **App** - Next.js application on port 3000
- **Worker** - Background job processor

### 4. Access the application

Open http://localhost:3000 in your browser.

### Verify services are running

```bash
docker compose ps
```

All services should show as "healthy" or "running".

### View logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f app
docker compose logs -f worker
```

### Stop services

```bash
docker compose down
```

## Manual Setup (Development)

### Prerequisites

- Node.js 20+
- pnpm
- PostgreSQL 16+
- Redis 7+

### 1. Install dependencies

```bash
pnpm install
```

### 2. Set up environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local` with your configuration.

### 3. Set up the database

```bash
# Run migrations
pnpm db:migrate

# Seed biomarker reference data
pnpm db:seed
```

### 4. Start development servers

In separate terminals:

```bash
# Start Next.js dev server
pnpm dev

# Start background worker
pnpm worker
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | - | PostgreSQL connection string |
| `REDIS_URL` | Yes | - | Redis connection string |
| `BETTER_AUTH_SECRET` | Yes | - | Secret key for authentication (min 32 chars) |
| `BETTER_AUTH_URL` | Yes | - | Application URL for auth |
| `DATALAB_API_KEY` | Yes | - | Datalab.to API key for OCR |
| `OPENAI_API_KEY` | No* | - | OpenAI API key for LLM extraction |
| `ANTHROPIC_API_KEY` | No* | - | Anthropic API key (alternative LLM) |
| `OLLAMA_BASE_URL` | No* | - | Ollama base URL (local LLM) |
| `LLM_PROVIDER` | No | `openai` | LLM provider to use |
| `STORAGE_TYPE` | No | `local` | File storage type (`local` or `s3`) |
| `STORAGE_LOCAL_PATH` | No | `./uploads` | Local storage path |
| `S3_ENDPOINT` | No | - | S3-compatible endpoint |
| `S3_BUCKET` | No | - | S3 bucket name |
| `S3_ACCESS_KEY` | No | - | S3 access key |
| `S3_SECRET_KEY` | No | - | S3 secret key |
| `OCR_WORKER_CONCURRENCY` | No | `5` | Number of concurrent OCR jobs |
| `LLM_WORKER_CONCURRENCY` | No | `3` | Number of concurrent LLM jobs |
| `HEALTH_EXPORT_WORKER_CONCURRENCY` | No | `1` | Number of concurrent health export jobs |

*At least one LLM provider is required.

## Commands

```bash
# Development
pnpm dev                # Start Next.js dev server
pnpm worker             # Start background worker
pnpm build              # Build for production
pnpm start              # Start production server

# Database
pnpm db:generate        # Generate Drizzle migrations
pnpm db:migrate         # Run migrations
pnpm db:push            # Push schema changes (dev)
pnpm db:studio          # Open Drizzle Studio
pnpm db:seed            # Seed biomarker data

# Code Quality
pnpm lint               # Run ESLint
pnpm typecheck          # Run TypeScript compiler
```

## Architecture

```
bloodwork-tracker/
├── app/                    # Next.js App Router
│   ├── (auth)/             # Authentication routes
│   ├── (dashboard)/        # Protected dashboard routes
│   └── api/                # API routes
├── components/             # React components
│   └── ui/                 # shadcn/ui components
├── server/
│   ├── db/                 # Drizzle schema and migrations
│   ├── trpc/               # tRPC routers
│   ├── jobs/               # BullMQ job processors
│   └── services/           # Business logic
│       ├── ocr/            # Datalab.to integration
│       ├── llm/            # LLM extraction
│       ├── health-export/  # Apple Health import
│       └── biological-age/ # PhenoAge calculation
├── lib/                    # Utility functions
└── docker/                 # Docker configuration
```

### Data Flow

1. **Upload**: User uploads blood test PDF
2. **OCR Queue**: PDF is queued for OCR processing via Datalab.to
3. **LLM Queue**: OCR text is queued for LLM extraction
4. **Review**: User reviews and confirms extracted values
5. **Storage**: Confirmed values are stored in PostgreSQL
6. **Analysis**: Trends and biological age are calculated

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check endpoint |
| `/api/upload` | POST | Upload blood test PDF |
| `/api/upload/health-export` | POST | Upload Apple Health export |
| `/api/download/[id]` | GET | Download original file |
| `/api/trpc/*` | * | tRPC API routes |

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Use TypeScript strict mode
- Follow existing code patterns
- Add type definitions for all new code
- Use tRPC for new API endpoints
- Use HugeIcons for icons (never Lucide)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Datalab.to](https://datalab.to) for OCR processing
- [shadcn/ui](https://ui.shadcn.com) for UI components
- [Better Auth](https://better-auth.com) for authentication
- [Drizzle ORM](https://orm.drizzle.team) for database access
