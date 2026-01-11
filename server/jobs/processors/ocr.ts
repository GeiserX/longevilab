/**
 * OCR Job Processor
 * Downloads PDF from storage, processes through OCR, and queues LLM extraction
 */
import { eq } from "drizzle-orm";
import { db } from "../../db";
import { bloodTests } from "../../db/schema";
import { storage } from "../../services/storage";
import { extractTextFromPdf } from "../../services/ocr";
import { queueLlmExtractionJob, type OcrJobData } from "../queue";

export async function processOcrJob(data: OcrJobData): Promise<void> {
  const { bloodTestId, filePath } = data;

  try {
    // Update status to processing
    await db
      .update(bloodTests)
      .set({
        status: "processing",
        updatedAt: new Date(),
      })
      .where(eq(bloodTests.id, bloodTestId));

    // Download the PDF from storage
    console.log(`[OCR] Downloading PDF from ${filePath}`);
    const pdfBuffer = await storage.download(filePath);

    // Process through OCR
    console.log(`[OCR] Processing PDF (${pdfBuffer.length} bytes)`);
    const { text, pageCount } = await extractTextFromPdf(pdfBuffer, filePath);

    if (!text || text.trim().length === 0) {
      throw new Error("OCR returned empty text");
    }

    console.log(`[OCR] Extracted ${text.length} characters from ${pageCount} pages`);

    // Save OCR text to database
    await db
      .update(bloodTests)
      .set({
        ocrText: text,
        updatedAt: new Date(),
      })
      .where(eq(bloodTests.id, bloodTestId));

    // Queue LLM extraction job
    console.log(`[OCR] Queuing LLM extraction job for blood test ${bloodTestId}`);
    await queueLlmExtractionJob({ bloodTestId });

  } catch (error) {
    console.error(`[OCR] Error processing blood test ${bloodTestId}:`, error);

    // Update status to failed
    await db
      .update(bloodTests)
      .set({
        status: "failed",
        processingError: error instanceof Error ? error.message : "Unknown error during OCR processing",
        updatedAt: new Date(),
      })
      .where(eq(bloodTests.id, bloodTestId));

    throw error;
  }
}
