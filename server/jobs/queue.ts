import { Queue, QueueEvents, ConnectionOptions } from "bullmq";
import IORedis from "ioredis";

// Redis connection for BullMQ
const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

// Create Redis connection with BullMQ-compatible options
const redis = new IORedis(redisUrl, {
  maxRetriesPerRequest: null,
});

// Export connection with proper type for BullMQ
export const connection = redis as unknown as ConnectionOptions;

// Export redis instance for direct access (e.g., shutdown)
export { redis };

// Job data types
export interface OcrJobData {
  bloodTestId: string;
  filePath: string;
  priority?: number;
}

export interface LlmExtractionJobData {
  bloodTestId: string;
  priority?: number;
}

export interface HealthExportJobData {
  importId: string;
  filePath: string;
  userId: string;
  importFromDate: string; // ISO date string
}

// Queue names
export const QUEUE_NAMES = {
  OCR: "ocr-processing",
  LLM_EXTRACTION: "llm-extraction",
  HEALTH_EXPORT: "health-export-processing",
} as const;

// Configurable backoff delay (default 30s instead of 5s for better external API handling)
const BACKOFF_DELAY = parseInt(process.env.QUEUE_BACKOFF_DELAY || "30000", 10);

// Job priority levels
export const JOB_PRIORITY = {
  HIGH: 1,
  NORMAL: 5,
  LOW: 10,
} as const;

// Create queues with improved default options
export const ocrQueue = new Queue<OcrJobData>(QUEUE_NAMES.OCR, {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: BACKOFF_DELAY,
    },
    removeOnComplete: {
      age: 24 * 3600, // Keep completed jobs for 24 hours
      count: 100,
    },
    removeOnFail: {
      age: 7 * 24 * 3600, // Keep failed jobs for 7 days
    },
  },
});

export const llmExtractionQueue = new Queue<LlmExtractionJobData>(
  QUEUE_NAMES.LLM_EXTRACTION,
  {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: BACKOFF_DELAY,
      },
      removeOnComplete: {
        age: 24 * 3600,
        count: 100,
      },
      removeOnFail: {
        age: 7 * 24 * 3600,
      },
    },
  }
);

// Health export queue with longer timeouts for large file processing
export const healthExportQueue = new Queue<HealthExportJobData>(
  QUEUE_NAMES.HEALTH_EXPORT,
  {
    connection,
    defaultJobOptions: {
      attempts: 2, // Fewer retries for large file processing
      backoff: {
        type: "fixed",
        delay: 60000, // 1 minute between retries
      },
      removeOnComplete: {
        age: 7 * 24 * 3600, // Keep completed jobs for 7 days
        count: 50,
      },
      removeOnFail: {
        age: 30 * 24 * 3600, // Keep failed jobs for 30 days
      },
    },
  }
);

// Queue events for monitoring
export const ocrQueueEvents = new QueueEvents(QUEUE_NAMES.OCR, { connection });
export const llmQueueEvents = new QueueEvents(QUEUE_NAMES.LLM_EXTRACTION, {
  connection,
});
export const healthExportQueueEvents = new QueueEvents(
  QUEUE_NAMES.HEALTH_EXPORT,
  { connection }
);

// Helper function to add OCR job with priority support
export async function queueOcrJob(data: OcrJobData, priority?: number) {
  return ocrQueue.add("process-pdf", data, {
    jobId: `ocr-${data.bloodTestId}`,
    priority: priority ?? JOB_PRIORITY.NORMAL,
  });
}

// Helper function to add LLM extraction job with priority support
export async function queueLlmExtractionJob(
  data: LlmExtractionJobData,
  priority?: number
) {
  return llmExtractionQueue.add("extract-biomarkers", data, {
    jobId: `llm-${data.bloodTestId}`,
    priority: priority ?? JOB_PRIORITY.NORMAL,
  });
}

// Helper function to add health export processing job
export async function queueHealthExportJob(data: HealthExportJobData) {
  return healthExportQueue.add("process-health-export", data, {
    jobId: `health-export-${data.importId}`,
  });
}

// Graceful shutdown
export async function closeQueues() {
  await ocrQueue.close();
  await llmExtractionQueue.close();
  await healthExportQueue.close();
  await ocrQueueEvents.close();
  await llmQueueEvents.close();
  await healthExportQueueEvents.close();
  await redis.quit();
}
