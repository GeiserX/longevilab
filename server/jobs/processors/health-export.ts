/**
 * Job processor for iPhone Health export processing.
 * Called by the BullMQ worker to process uploaded health export ZIP files.
 */

import { HealthExportJobData } from "../queue";
import { processHealthExport } from "@/server/services/health-export";
import { storage } from "@/server/services/storage";

/**
 * Process a health export job.
 * Downloads the ZIP file from storage and runs the import pipeline.
 */
export async function processHealthExportJob(
  data: HealthExportJobData
): Promise<void> {
  const { importId, filePath, userId, householdMemberId, importFromDate } = data;

  // Get the full file path from storage
  const fullPath = storage.getPath(filePath);

  // Run the import process
  await processHealthExport(importId, fullPath, userId, householdMemberId, importFromDate);
}
