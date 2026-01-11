/**
 * Health export service - orchestrates iPhone Health data import.
 * Handles ZIP extraction, XML parsing, and database insertion.
 */

import { createReadStream, existsSync, rmSync } from "fs";
import { mkdir, rm } from "fs/promises";
import { join, dirname } from "path";
import unzipper from "unzipper";
import { db } from "@/server/db";
import {
  healthDataImports,
  healthJournalEntries,
  weightEntries,
  sleepEntries,
  glucoseEntries,
  HealthImportProgress,
} from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { parseHealthExportXml, deduplicateRecords } from "./xml-parser";
import { getExistingEntryKeys, filterDuplicates } from "./duplicate-detector";
import {
  convertWeightToKg,
  convertGlucoseToMmolL,
  ParsedHealthRecord,
} from "./data-mapper";
import { redis } from "@/server/jobs/queue";

// Batch size for database insertions
const BATCH_SIZE = 100;

/**
 * Update import status in database
 */
async function updateImportStatus(
  importId: string,
  status: "pending" | "extracting" | "parsing" | "importing" | "completed" | "failed",
  progress?: HealthImportProgress,
  error?: string
) {
  const updates: Record<string, unknown> = {
    status,
    updatedAt: new Date(),
  };

  if (progress) {
    updates.progress = progress;
  }

  if (error) {
    updates.processingError = error;
  }

  if (status === "extracting") {
    updates.startedAt = new Date();
  }

  if (status === "completed" || status === "failed") {
    updates.completedAt = new Date();
  }

  await db
    .update(healthDataImports)
    .set(updates)
    .where(eq(healthDataImports.id, importId));

  // Publish progress update for real-time UI updates
  if (progress) {
    await redis.publish(
      `health-import:${importId}`,
      JSON.stringify({ status, progress })
    );
  }
}

/**
 * Extract the export.xml file from the Apple Health export ZIP
 */
async function extractHealthExportXml(
  zipPath: string,
  importId: string
): Promise<string> {
  const extractDir = join(dirname(zipPath), `health-export-${importId}`);

  // Create extraction directory
  await mkdir(extractDir, { recursive: true });

  return new Promise((resolve, reject) => {
    let xmlPath: string | null = null;

    createReadStream(zipPath)
      .pipe(unzipper.Parse())
      .on("entry", async (entry) => {
        const fileName = entry.path;

        // Look for export.xml or Export.xml in any directory
        if (
          fileName.endsWith("export.xml") ||
          fileName.endsWith("Export.xml")
        ) {
          const targetPath = join(extractDir, "export.xml");
          xmlPath = targetPath;

          entry.pipe(
            require("fs").createWriteStream(targetPath)
          );
        } else {
          // Skip other files
          entry.autodrain();
        }
      })
      .on("close", () => {
        if (xmlPath && existsSync(xmlPath)) {
          resolve(xmlPath);
        } else {
          reject(
            new Error(
              "Could not find export.xml in the ZIP file. Please ensure you exported your data from the Health app correctly."
            )
          );
        }
      })
      .on("error", (error) => {
        reject(new Error(`Failed to extract ZIP file: ${error.message}`));
      });
  });
}

/**
 * Import records to database in batches
 */
async function importRecordsToDatabase(
  importId: string,
  userId: string,
  records: ParsedHealthRecord[],
  onProgress: (progress: HealthImportProgress) => void
): Promise<{
  imported: { weight: number; sleep: number; glucose: number };
  failed: number;
}> {
  const imported = { weight: 0, sleep: 0, glucose: 0 };
  let failed = 0;

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);

    await db.transaction(async (tx) => {
      for (const record of batch) {
        try {
          // Create base journal entry
          const [journalEntry] = await tx
            .insert(healthJournalEntries)
            .values({
              userId,
              entryType: record.type,
              entryDate: record.date,
              source: "apple_health",
              importId,
            })
            .returning();

          // Create type-specific entry
          if (record.type === "weight") {
            const weightKg = convertWeightToKg(record.value, record.originalUnit);

            await tx.insert(weightEntries).values({
              journalEntryId: journalEntry.id,
              weight: weightKg.toFixed(2),
            });

            imported.weight++;
          } else if (record.type === "sleep") {
            await tx.insert(sleepEntries).values({
              journalEntryId: journalEntry.id,
              durationMinutes: Math.round(record.value),
              quality: 3, // Default to "Good" since Apple Health doesn't track subjective quality
            });

            imported.sleep++;
          } else if (record.type === "glucose") {
            const glucoseMmolL = convertGlucoseToMmolL(
              record.value,
              record.originalUnit
            );

            await tx.insert(glucoseEntries).values({
              journalEntryId: journalEntry.id,
              value: glucoseMmolL.toFixed(2),
              readingType: "random", // Default since Apple Health doesn't track fasting state
            });

            imported.glucose++;
          }
        } catch (error) {
          console.error(
            `Failed to import record ${record.type}:${record.date}:`,
            error
          );
          failed++;
        }
      }
    });

    // Update progress after each batch
    const currentRecord = Math.min(i + BATCH_SIZE, records.length);
    onProgress({
      phase: "importing",
      currentRecord,
      totalRecords: records.length,
      recordsImported: imported.weight + imported.sleep + imported.glucose,
      recordsSkipped: 0, // Already filtered
      recordsFailed: failed,
      breakdown: {
        weight: { imported: imported.weight, skipped: 0 },
        sleep: { imported: imported.sleep, skipped: 0 },
        glucose: { imported: imported.glucose, skipped: 0 },
      },
    });
  }

  return { imported, failed };
}

/**
 * Clean up temporary files after import
 */
async function cleanupTempFiles(zipPath: string, importId: string) {
  try {
    const extractDir = join(dirname(zipPath), `health-export-${importId}`);
    if (existsSync(extractDir)) {
      rmSync(extractDir, { recursive: true, force: true });
    }
  } catch (error) {
    console.error("Failed to clean up temp files:", error);
    // Don't throw - cleanup failure shouldn't fail the import
  }
}

/**
 * Clean up partial import on failure
 */
async function rollbackPartialImport(importId: string) {
  try {
    // Delete any journal entries that were created for this import
    await db
      .delete(healthJournalEntries)
      .where(eq(healthJournalEntries.importId, importId));
  } catch (error) {
    console.error("Failed to rollback partial import:", error);
  }
}

/**
 * Main processing function for health export import
 */
export async function processHealthExport(
  importId: string,
  filePath: string,
  userId: string,
  importFromDate: string
): Promise<void> {
  const fromDate = new Date(importFromDate);

  try {
    // Phase 1: Extract ZIP
    await updateImportStatus(importId, "extracting");
    console.log(`[HealthExport] Extracting ZIP file for import ${importId}`);

    const xmlPath = await extractHealthExportXml(filePath, importId);
    console.log(`[HealthExport] XML extracted to ${xmlPath}`);

    // Phase 2: Parse XML
    await updateImportStatus(importId, "parsing");
    console.log(`[HealthExport] Parsing XML for import ${importId}`);

    let lastProgressUpdate = 0;
    const records = await parseHealthExportXml(xmlPath, {
      importFromDate: fromDate,
      onProgress: (recordsProcessed) => {
        // Throttle progress updates to every 5 seconds
        const now = Date.now();
        if (now - lastProgressUpdate > 5000) {
          lastProgressUpdate = now;
          updateImportStatus(importId, "parsing", {
            phase: "parsing",
            currentRecord: recordsProcessed,
            totalRecords: 0, // Unknown until complete
            recordsImported: 0,
            recordsSkipped: 0,
            recordsFailed: 0,
            breakdown: {
              weight: { imported: 0, skipped: 0 },
              sleep: { imported: 0, skipped: 0 },
              glucose: { imported: 0, skipped: 0 },
            },
          });
        }
      },
    });

    console.log(
      `[HealthExport] Parsed ${records.length} records for import ${importId}`
    );

    // Deduplicate records within the import
    const dedupedRecords = deduplicateRecords(records);
    console.log(
      `[HealthExport] Deduplicated to ${dedupedRecords.length} records`
    );

    // Phase 3: Filter duplicates against existing data
    const existingKeys = await getExistingEntryKeys(userId);
    const { recordsToImport, skippedCount, skippedByType } = filterDuplicates(
      dedupedRecords,
      existingKeys
    );

    console.log(
      `[HealthExport] ${recordsToImport.length} new records to import, ${skippedCount} duplicates skipped`
    );

    // Phase 4: Import to database
    await updateImportStatus(importId, "importing", {
      phase: "importing",
      currentRecord: 0,
      totalRecords: recordsToImport.length,
      recordsImported: 0,
      recordsSkipped: skippedCount,
      recordsFailed: 0,
      breakdown: {
        weight: { imported: 0, skipped: skippedByType.weight },
        sleep: { imported: 0, skipped: skippedByType.sleep },
        glucose: { imported: 0, skipped: skippedByType.glucose },
      },
    });

    const progressCallback = async (progress: HealthImportProgress) => {
      // Add skipped counts to progress
      progress.recordsSkipped = skippedCount;
      progress.breakdown.weight.skipped = skippedByType.weight;
      progress.breakdown.sleep.skipped = skippedByType.sleep;
      progress.breakdown.glucose.skipped = skippedByType.glucose;

      await updateImportStatus(importId, "importing", progress);
    };

    const { imported, failed } = await importRecordsToDatabase(
      importId,
      userId,
      recordsToImport,
      progressCallback
    );

    // Mark as completed
    await updateImportStatus(importId, "completed", {
      phase: "importing",
      currentRecord: recordsToImport.length,
      totalRecords: recordsToImport.length,
      recordsImported: imported.weight + imported.sleep + imported.glucose,
      recordsSkipped: skippedCount,
      recordsFailed: failed,
      breakdown: {
        weight: { imported: imported.weight, skipped: skippedByType.weight },
        sleep: { imported: imported.sleep, skipped: skippedByType.sleep },
        glucose: { imported: imported.glucose, skipped: skippedByType.glucose },
      },
    });

    console.log(
      `[HealthExport] Import ${importId} completed. Imported: ${imported.weight + imported.sleep + imported.glucose}, Skipped: ${skippedCount}, Failed: ${failed}`
    );

    // Cleanup
    await cleanupTempFiles(filePath, importId);
  } catch (error) {
    console.error(`[HealthExport] Import ${importId} failed:`, error);

    // Rollback any partial imports
    await rollbackPartialImport(importId);

    // Cleanup temp files
    await cleanupTempFiles(filePath, importId);

    // Mark as failed
    await updateImportStatus(
      importId,
      "failed",
      undefined,
      error instanceof Error ? error.message : "Unknown error occurred"
    );

    throw error;
  }
}
