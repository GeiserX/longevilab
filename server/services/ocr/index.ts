/**
 * OCR Service using Datalab.to Marker API
 * https://documentation.datalab.to/docs/recipes/marker/conversion-api-overview
 */

const DATALAB_API_URL = "https://www.datalab.to/api/v1/marker";

// Polling configuration with exponential backoff
const INITIAL_POLL_INTERVAL_MS = 2000; // Start with 2 seconds
const MAX_POLL_INTERVAL_MS = 10000; // Cap at 10 seconds
const BACKOFF_MULTIPLIER = 1.2; // Increase by 20% each time
const MAX_POLL_ATTEMPTS = 300; // ~15-20 minutes with backoff
const MAX_CONSECUTIVE_ERRORS = 10; // Fail fast if too many consecutive errors

interface DatalabSubmitResponse {
  success: boolean;
  request_id: string;
  request_check_url: string;
}

interface DatalabStatusResponse {
  status: "processing" | "complete" | "failed";
  success?: boolean;
  markdown?: string;
  text?: string;
  json?: string;
  error?: string;
  page_count?: number;
  output_format?: string;
  metadata?: Record<string, unknown>;
}

export interface OcrResult {
  text: string;
  pageCount: number;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function calculateBackoffDelay(attempt: number): number {
  const delay = INITIAL_POLL_INTERVAL_MS * Math.pow(BACKOFF_MULTIPLIER, attempt);
  return Math.min(delay, MAX_POLL_INTERVAL_MS);
}

export async function extractTextFromPdf(pdfBuffer: Buffer, filename: string): Promise<OcrResult> {
  const apiKey = process.env.DATALAB_API_KEY;

  if (!apiKey) {
    throw new Error("DATALAB_API_KEY environment variable is not set");
  }

  // Submit the PDF for processing
  const formData = new FormData();
  // Create Blob from Buffer - use type assertion for Node.js Buffer compatibility
  formData.append("file", new Blob([pdfBuffer as BlobPart], { type: "application/pdf" }), filename);
  formData.append("output_format", "markdown");
  formData.append("force_ocr", "true"); // Force OCR for blood test documents
  formData.append("mode", "accurate"); // Use accurate mode for medical documents

  const submitResponse = await fetch(DATALAB_API_URL, {
    method: "POST",
    headers: {
      "X-API-Key": apiKey,
    },
    body: formData,
  });

  if (!submitResponse.ok) {
    const errorText = await submitResponse.text();
    throw new Error(`Failed to submit PDF to OCR: ${submitResponse.status} - ${errorText}`);
  }

  const submitResult = (await submitResponse.json()) as DatalabSubmitResponse;

  if (!submitResult.success || !submitResult.request_check_url) {
    throw new Error("Failed to submit PDF for OCR processing");
  }

  // Poll for results with exponential backoff
  let attempts = 0;
  let consecutiveErrors = 0;
  let totalWaitTimeMs = 0;

  while (attempts < MAX_POLL_ATTEMPTS) {
    attempts++;
    const delay = calculateBackoffDelay(attempts);
    await sleep(delay);
    totalWaitTimeMs += delay;

    let statusResponse: Response;
    try {
      statusResponse = await fetch(submitResult.request_check_url, {
        headers: {
          "X-API-Key": apiKey,
        },
      });
    } catch (fetchError) {
      consecutiveErrors++;

      if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
        throw new Error(`OCR polling failed: ${MAX_CONSECUTIVE_ERRORS} consecutive network errors`);
      }
      continue;
    }

    if (!statusResponse.ok) {
      consecutiveErrors++;

      if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
        throw new Error(`OCR polling failed: ${MAX_CONSECUTIVE_ERRORS} consecutive HTTP errors (last: ${statusResponse.status})`);
      }
      continue;
    }

    // Reset consecutive errors on successful response
    consecutiveErrors = 0;

    let statusResult: DatalabStatusResponse;
    try {
      statusResult = (await statusResponse.json()) as DatalabStatusResponse;
    } catch {
      continue;
    }

    if (statusResult.status === "complete") {
      const text = statusResult.markdown || statusResult.text || "";
      return {
        text,
        pageCount: statusResult.page_count || 1,
      };
    }

    if (statusResult.status === "failed") {
      throw new Error(`OCR processing failed: ${statusResult.error || "Unknown error from Datalab.to"}`);
    }

    // Still processing, continue polling
  }

  const totalWaitTimeSec = Math.round(totalWaitTimeMs / 1000);
  throw new Error(`OCR processing timed out after ${MAX_POLL_ATTEMPTS} attempts (${totalWaitTimeSec}s). The Datalab.to API may be experiencing issues.`);
}
