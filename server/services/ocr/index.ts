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

  console.log(`[OCR] Submitted job ${submitResult.request_id}, polling for results with exponential backoff...`);

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
      console.error(`[OCR] Network error on attempt ${attempts} (${consecutiveErrors} consecutive):`, fetchError);

      if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
        throw new Error(`OCR polling failed: ${MAX_CONSECUTIVE_ERRORS} consecutive network errors`);
      }
      continue;
    }

    if (!statusResponse.ok) {
      consecutiveErrors++;
      const errorBody = await statusResponse.text().catch(() => "");
      console.warn(
        `[OCR] Poll attempt ${attempts} failed - HTTP ${statusResponse.status} (${consecutiveErrors} consecutive errors)`,
        errorBody ? `Response: ${errorBody.substring(0, 200)}` : ""
      );

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
    } catch (parseError) {
      console.error(`[OCR] Failed to parse response on attempt ${attempts}:`, parseError);
      continue;
    }

    // Log detailed status for debugging
    if (attempts % 10 === 0 || statusResult.status !== "processing") {
      const waitTimeSec = Math.round(totalWaitTimeMs / 1000);
      console.log(`[OCR] Attempt ${attempts} (${waitTimeSec}s elapsed) - Status: ${statusResult.status}`, {
        requestId: submitResult.request_id,
        status: statusResult.status,
        success: statusResult.success,
        pageCount: statusResult.page_count,
        hasMarkdown: !!statusResult.markdown,
        hasText: !!statusResult.text,
        error: statusResult.error || undefined,
      });
    }

    if (statusResult.status === "complete") {
      const text = statusResult.markdown || statusResult.text || "";
      const waitTimeSec = Math.round(totalWaitTimeMs / 1000);
      console.log(`[OCR] Completed after ${attempts} attempts (${waitTimeSec}s), extracted ${text.length} characters from ${statusResult.page_count || 1} pages`);
      return {
        text,
        pageCount: statusResult.page_count || 1,
      };
    }

    if (statusResult.status === "failed") {
      console.error(`[OCR] Datalab.to reported failure:`, {
        requestId: submitResult.request_id,
        error: statusResult.error,
        metadata: statusResult.metadata,
      });
      throw new Error(`OCR processing failed: ${statusResult.error || "Unknown error from Datalab.to"}`);
    }

    // Still processing, continue polling
  }

  const totalWaitTimeSec = Math.round(totalWaitTimeMs / 1000);
  throw new Error(`OCR processing timed out after ${MAX_POLL_ATTEMPTS} attempts (${totalWaitTimeSec}s). The Datalab.to API may be experiencing issues.`);
}
