import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import { Queue, ConnectionOptions } from "bullmq";
import IORedis from "ioredis";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
const redis = new IORedis(redisUrl, {
  maxRetriesPerRequest: null,
});
const connection = redis as unknown as ConnectionOptions;

const ocrQueue = new Queue("ocr-processing", {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: { age: 24 * 3600, count: 100 },
    removeOnFail: { age: 7 * 24 * 3600 },
  },
});

const failedJobs = [
  {
    bloodTestId: "a9d59503-e345-4227-8274-b5070bb78192",
    filePath: "d35e7340-a27d-40e6-afd9-39c35a142b55.pdf",
  },
  {
    bloodTestId: "6addcbfe-6664-440f-8c3b-b3bfe175dba9",
    filePath: "141d5f2c-dda2-4f46-a177-824b9ee74cc5.pdf",
  },
];

async function main() {
  console.log("Re-queuing failed OCR jobs with fresh IDs...\n");

  for (const job of failedJobs) {
    // Use a fresh job ID with timestamp
    const jobId = `ocr-${job.bloodTestId}-${Date.now()}`;

    console.log(`Queuing OCR job for blood test ${job.bloodTestId}`);
    console.log(`Job ID: ${jobId}`);

    await ocrQueue.add("process-pdf", job, { jobId });
    console.log("  Queued successfully!\n");

    // Small delay to ensure unique timestamps
    await new Promise((r) => setTimeout(r, 100));
  }

  console.log("All jobs queued!");

  await ocrQueue.close();
  await redis.quit();
  process.exit(0);
}

main().catch(console.error);
