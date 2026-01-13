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
    console.log(`[OCR] Processing job ${job.id} for blood test ${job.data.bloodTestId}`);
    try {
      await processOcrJob(job.data);
      console.log(`[OCR] Completed job ${job.id}`);
    } catch (error) {
      console.error(`[OCR] Error processing job ${job.id}:`, error);
      throw error;
    }
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
    console.log(`[LLM] Processing job ${job.id} for blood test ${job.data.bloodTestId}`);
    try {
      await processLlmExtractionJob(job.data);
      console.log(`[LLM] Completed job ${job.id}`);
    } catch (error) {
      console.error(`[LLM] Error processing job ${job.id}:`, error);
      throw error;
    }
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
    console.log(`[Health Export] Processing job ${job.id} for import ${job.data.importId}`);
    try {
      await processHealthExportJob(job.data);
      console.log(`[Health Export] Completed job ${job.id}`);
    } catch (error) {
      console.error(`[Health Export] Error processing job ${job.id}:`, error);
      throw error;
    }
  },
  {
    connection,
    concurrency: HEALTH_EXPORT_CONCURRENCY,
    // Health export jobs can take up to 30 minutes for very large files
    lockDuration: 1800000, // 30 minutes
    lockRenewTime: 60000, // Renew lock every 60 seconds
  }
);

// Log worker startup
console.log("🚀 Workers started:");
console.log(`  - OCR: ${OCR_CONCURRENCY} concurrent jobs`);
console.log(`  - LLM: ${LLM_CONCURRENCY} concurrent jobs`);
console.log(`  - Health Export: ${HEALTH_EXPORT_CONCURRENCY} concurrent jobs`);
console.log(`  - Redis: ${process.env.REDIS_URL || "redis://localhost:6379"}`);

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
