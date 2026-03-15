/**
 * OCR Service — local Tesseract (default) or Datalab.to cloud API
 *
 * When DATALAB_API_KEY is set, uses the Datalab.to Marker API.
 * Otherwise, uses local Tesseract OCR via pdftoppm + tesseract CLI
 * (same engine Paperless-ngx uses under the hood).
 *
 * Required system packages for local OCR: tesseract-ocr, poppler-utils
 */

import { execFile } from "node:child_process";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { writeFile } from "node:fs/promises";

const execFileAsync = promisify(execFile);

const DATALAB_API_URL = "https://www.datalab.to/api/v1/marker";

// Polling configuration with exponential backoff
const INITIAL_POLL_INTERVAL_MS = 2000;
const MAX_POLL_INTERVAL_MS = 10000;
const BACKOFF_MULTIPLIER = 1.2;
const MAX_POLL_ATTEMPTS = 300;
const MAX_CONSECUTIVE_ERRORS = 10;

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

/**
 * Route to local or cloud OCR based on DATALAB_API_KEY presence.
 */
export async function extractTextFromPdf(pdfBuffer: Buffer, filename: string): Promise<OcrResult> {
  const apiKey = process.env.DATALAB_API_KEY;

  if (apiKey) {
    return extractWithDatalab(pdfBuffer, filename, apiKey);
  }

  return extractWithTesseract(pdfBuffer);
}

// ---------------------------------------------------------------------------
// Local OCR: pdftoppm → tesseract
// ---------------------------------------------------------------------------

async function extractWithTesseract(pdfBuffer: Buffer): Promise<OcrResult> {
  const workDir = await mkdtemp(join(tmpdir(), "ocr-"));

  try {
    const pdfPath = join(workDir, "input.pdf");
    await writeFile(pdfPath, pdfBuffer);

    // Convert PDF pages to PNG images (300 DPI for good OCR quality)
    await execFileAsync("pdftoppm", ["-png", "-r", "300", pdfPath, join(workDir, "page")], {
      timeout: 120_000,
    });

    // Find generated page images, sorted
    const files = await readdir(workDir);
    const pageFiles = files.filter((f) => f.startsWith("page") && f.endsWith(".png")).sort();

    if (pageFiles.length === 0) {
      throw new Error("pdftoppm produced no page images");
    }

    // OCR each page with Tesseract (eng+spa for Spanish blood work)
    const langs = process.env.TESSERACT_LANGS || "eng+spa";
    const pageTexts: string[] = [];

    for (const pageFile of pageFiles) {
      const imgPath = join(workDir, pageFile);
      const { stdout } = await execFileAsync(
        "tesseract",
        [imgPath, "stdout", "-l", langs, "--psm", "6"],
        { timeout: 60_000, maxBuffer: 10 * 1024 * 1024 },
      );
      pageTexts.push(stdout);
    }

    const text = pageTexts.join("\n\n---\n\n");

    if (!text.trim()) {
      throw new Error("Tesseract OCR returned empty text");
    }

    return { text, pageCount: pageFiles.length };
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------------------
// Cloud OCR: Datalab.to Marker API
// ---------------------------------------------------------------------------

async function extractWithDatalab(pdfBuffer: Buffer, filename: string, apiKey: string): Promise<OcrResult> {
  const formData = new FormData();
  formData.append("file", new Blob([pdfBuffer as BlobPart], { type: "application/pdf" }), filename);
  formData.append("output_format", "markdown");
  formData.append("force_ocr", "true");
  formData.append("mode", "accurate");

  const submitResponse = await fetch(DATALAB_API_URL, {
    method: "POST",
    headers: { "X-API-Key": apiKey },
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
        headers: { "X-API-Key": apiKey },
      });
    } catch {
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

    consecutiveErrors = 0;

    let statusResult: DatalabStatusResponse;
    try {
      statusResult = (await statusResponse.json()) as DatalabStatusResponse;
    } catch {
      continue;
    }

    if (statusResult.status === "complete") {
      const text = statusResult.markdown || statusResult.text || "";
      return { text, pageCount: statusResult.page_count || 1 };
    }

    if (statusResult.status === "failed") {
      throw new Error(`OCR processing failed: ${statusResult.error || "Unknown error from Datalab.to"}`);
    }
  }

  const totalWaitTimeSec = Math.round(totalWaitTimeMs / 1000);
  throw new Error(`OCR processing timed out after ${MAX_POLL_ATTEMPTS} attempts (${totalWaitTimeSec}s). The Datalab.to API may be experiencing issues.`);
}
