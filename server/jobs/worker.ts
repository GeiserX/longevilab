import "dotenv/config";
import { Worker, Job } from "bullmq";
import {
  connection,
  redis,
  QUEUE_NAMES,
  OcrJobData,
  LlmExtractionJobData,
  HealthExportJobData,
} from "./queue";
import { processOcrJob } from "./processors/ocr";
import { processLlmExtractionJob } from "./processors/llm-extraction";
import { processHealthExportJob } from "./processors/health-export";

// Configurable concurrency via environment variables
// OCR: Higher concurrency (5) as it's I/O bound (waiting on external Datalab API)
// LLM: Lower concurrency (3) as it's API rate-limited
// Health Export: Low concurrency (1) as it's memory intensive (large file processing)
const OCR_CONCURRENCY = parseInt(process.env.OCR_WORKER_CONCURRENCY || "5", 10);
const LLM_CONCURRENCY = parseInt(process.env.LLM_WORKER_CONCURRENCY || "3", 10);
const HEALTH_EXPORT_CONCURRENCY = parseInt(
  process.env.HEALTH_EXPORT_WORKER_CONCURRENCY || "1",
  10
);

// OCR Worker with increased concurrency for I/O-bound operations
const ocrWorker = new Worker<OcrJobData>(
  QUEUE_NAMES.OCR,
  async (job: Job<OcrJobData>) => {
    await processOcrJob(job.data);
  },
  {
    connection,
    concurrency: OCR_CONCURRENCY,
    // OCR jobs can take up to 10 minutes for large PDFs
    lockDuration: 600000, // 10 minutes
    lockRenewTime: 30000, // Renew lock every 30 seconds
  }
);

// LLM Extraction Worker with moderate concurrency for API-bound operations
const llmWorker = new Worker<LlmExtractionJobData>(
  QUEUE_NAMES.LLM_EXTRACTION,
  async (job: Job<LlmExtractionJobData>) => {
    await processLlmExtractionJob(job.data);
  },
  {
    connection,
    concurrency: LLM_CONCURRENCY,
  }
);

// Health Export Worker with low concurrency for memory-intensive large file processing
const healthExportWorker = new Worker<HealthExportJobData>(
  QUEUE_NAMES.HEALTH_EXPORT,
  async (job: Job<HealthExportJobData>) => {
    await processHealthExportJob(job.data);
  },
  {
    connection,
    concurrency: HEALTH_EXPORT_CONCURRENCY,
    // Health export jobs can take up to 30 minutes for very large files
    lockDuration: 1800000, // 30 minutes
    lockRenewTime: 60000, // Renew lock every 60 seconds
  }
);

// Graceful shutdown
async function shutdown() {
  await ocrWorker.close();
  await llmWorker.close();
  await healthExportWorker.close();
  await redis.quit();
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
