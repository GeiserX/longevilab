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

// Structured logging helper for JSON output
function log(
  level: "info" | "error" | "warn",
  queue: string,
  jobId: string | undefined,
  message: string,
  meta?: Record<string, unknown>
) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    queue,
    jobId: jobId || "system",
    message,
    ...meta,
  };

  if (level === "error") {
    console.error(JSON.stringify(logEntry));
  } else if (level === "warn") {
    console.warn(JSON.stringify(logEntry));
  } else {
    console.log(JSON.stringify(logEntry));
  }
}

log("info", "system", undefined, "Starting blood test processing workers", {
  ocrConcurrency: OCR_CONCURRENCY,
  llmConcurrency: LLM_CONCURRENCY,
  healthExportConcurrency: HEALTH_EXPORT_CONCURRENCY,
});

// OCR Worker with increased concurrency for I/O-bound operations
const ocrWorker = new Worker<OcrJobData>(
  QUEUE_NAMES.OCR,
  async (job: Job<OcrJobData>) => {
    const startTime = Date.now();
    log("info", "OCR", job.id, "Processing job started", {
      bloodTestId: job.data.bloodTestId,
      attempt: job.attemptsMade + 1,
    });

    try {
      await processOcrJob(job.data);
      const duration = Date.now() - startTime;
      log("info", "OCR", job.id, "Job completed successfully", {
        bloodTestId: job.data.bloodTestId,
        durationMs: duration,
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      log("error", "OCR", job.id, "Job failed", {
        bloodTestId: job.data.bloodTestId,
        error: error instanceof Error ? error.message : String(error),
        durationMs: duration,
        attempt: job.attemptsMade + 1,
        maxAttempts: job.opts.attempts,
      });
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
    const startTime = Date.now();
    log("info", "LLM", job.id, "Processing job started", {
      bloodTestId: job.data.bloodTestId,
      attempt: job.attemptsMade + 1,
    });

    try {
      await processLlmExtractionJob(job.data);
      const duration = Date.now() - startTime;
      log("info", "LLM", job.id, "Job completed successfully", {
        bloodTestId: job.data.bloodTestId,
        durationMs: duration,
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      log("error", "LLM", job.id, "Job failed", {
        bloodTestId: job.data.bloodTestId,
        error: error instanceof Error ? error.message : String(error),
        durationMs: duration,
        attempt: job.attemptsMade + 1,
        maxAttempts: job.opts.attempts,
      });
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
    const startTime = Date.now();
    log("info", "HEALTH_EXPORT", job.id, "Processing job started", {
      importId: job.data.importId,
      attempt: job.attemptsMade + 1,
    });

    try {
      await processHealthExportJob(job.data);
      const duration = Date.now() - startTime;
      log("info", "HEALTH_EXPORT", job.id, "Job completed successfully", {
        importId: job.data.importId,
        durationMs: duration,
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      log("error", "HEALTH_EXPORT", job.id, "Job failed", {
        importId: job.data.importId,
        error: error instanceof Error ? error.message : String(error),
        durationMs: duration,
        attempt: job.attemptsMade + 1,
        maxAttempts: job.opts.attempts,
      });
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

// Worker event handlers with structured logging
ocrWorker.on("completed", (job) => {
  log("info", "OCR", job.id, "Job marked completed");
});

ocrWorker.on("failed", (job, error) => {
  log("error", "OCR", job?.id, "Job marked failed", {
    error: error.message,
    willRetry: (job?.attemptsMade ?? 0) < (job?.opts.attempts ?? 3),
  });
});

ocrWorker.on("stalled", (jobId) => {
  log("warn", "OCR", jobId, "Job stalled - will be retried");
});

llmWorker.on("completed", (job) => {
  log("info", "LLM", job.id, "Job marked completed");
});

llmWorker.on("failed", (job, error) => {
  log("error", "LLM", job?.id, "Job marked failed", {
    error: error.message,
    willRetry: (job?.attemptsMade ?? 0) < (job?.opts.attempts ?? 3),
  });
});

llmWorker.on("stalled", (jobId) => {
  log("warn", "LLM", jobId, "Job stalled - will be retried");
});

healthExportWorker.on("completed", (job) => {
  log("info", "HEALTH_EXPORT", job.id, "Job marked completed");
});

healthExportWorker.on("failed", (job, error) => {
  log("error", "HEALTH_EXPORT", job?.id, "Job marked failed", {
    error: error.message,
    willRetry: (job?.attemptsMade ?? 0) < (job?.opts.attempts ?? 2),
  });
});

healthExportWorker.on("stalled", (jobId) => {
  log("warn", "HEALTH_EXPORT", jobId, "Job stalled - will be retried");
});

// Worker health monitoring - logs status every 60 seconds
const healthCheckInterval = setInterval(() => {
  log("info", "system", undefined, "Worker health check", {
    ocrWorker: {
      running: ocrWorker.isRunning(),
      paused: ocrWorker.isPaused(),
    },
    llmWorker: {
      running: llmWorker.isRunning(),
      paused: llmWorker.isPaused(),
    },
    healthExportWorker: {
      running: healthExportWorker.isRunning(),
      paused: healthExportWorker.isPaused(),
    },
  });
}, 60000);

// Graceful shutdown
async function shutdown() {
  log("info", "system", undefined, "Shutting down workers...");
  clearInterval(healthCheckInterval);
  await ocrWorker.close();
  await llmWorker.close();
  await healthExportWorker.close();
  await redis.quit();
  log("info", "system", undefined, "Workers shut down gracefully");
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

log("info", "system", undefined, "Workers started and listening for jobs");
