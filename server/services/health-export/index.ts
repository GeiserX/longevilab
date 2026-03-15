/**
 * Health export service - orchestrates iPhone Health data import.
 * Handles ZIP extraction, XML parsing, and database insertion.
 */

import { createReadStream, createWriteStream, existsSync, rmSync } from "fs";
import { mkdir } from "fs/promises";
import { join, dirname } from "path";
import unzipper from "unzipper";
import { db } from "@/server/db";
import {
  healthDataImports,
  healthJournalEntries,
  weightEntries,
  sleepEntries,
  glucoseEntries,
  heartRateEntries,
  hourlyHeartRateEntries,
  activityEntries,
  bloodPressureEntries,
  bloodOxygenEntries,
  vo2MaxEntries,
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

// Type for import counts
interface ImportCounts {
  weight: number;
  sleep: number;
  glucose: number;
  heart_rate: number;
  hourly_heart_rate: number;
  activity: number;
  blood_pressure: number;
  blood_oxygen: number;
  vo2_max: number;
}

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
        const fileName = entry.path.normalize("NFC");

        // Look for export.xml, Export.xml, or exportación.xml in any directory
        if (
          fileName.endsWith("export.xml") ||
          fileName.endsWith("Export.xml") ||
          fileName.endsWith("exportación.xml") ||
          fileName.endsWith("Exportación.xml")
        ) {
          const targetPath = join(extractDir, "export.xml");
          xmlPath = targetPath;

          entry.pipe(createWriteStream(targetPath));
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
  householdMemberId: string | undefined,
  records: ParsedHealthRecord[],
  onProgress: (progress: HealthImportProgress) => void
): Promise<{
  imported: ImportCounts;
  failed: number;
}> {
  const imported: ImportCounts = {
    weight: 0,
    sleep: 0,
    glucose: 0,
    heart_rate: 0,
    hourly_heart_rate: 0,
    activity: 0,
    blood_pressure: 0,
    blood_oxygen: 0,
    vo2_max: 0,
  };
  let failed = 0;

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);

    await db.transaction(async (tx) => {
      for (const record of batch) {
        try {
          // Handle hourly heart rate separately - it doesn't use journal entries
          if (record.type === "hourly_heart_rate") {
            const hrData = record.subType ? JSON.parse(record.subType) : {};

            await tx.insert(hourlyHeartRateEntries).values({
              userId,
              householdMemberId,
              recordedAt: new Date(`${record.date}T${String(hrData.hour).padStart(2, "0")}:00:00`),
              entryDate: record.date,
              hour: hrData.hour,
              avgHeartRate: Math.round(record.value),
              minHeartRate: hrData.min ?? null,
              maxHeartRate: hrData.max ?? null,
              readingCount: hrData.count ?? 1,
              source: "apple_health",
              importId,
            });

            imported.hourly_heart_rate++;
            continue; // Skip journal entry creation
          }

          // Create base journal entry (for all types except hourly_heart_rate)
          const [journalEntry] = await tx
            .insert(healthJournalEntries)
            .values({
              userId,
              householdMemberId,
              entryType: record.type as "weight" | "sleep" | "glucose" | "heart_rate" | "activity" | "blood_pressure" | "blood_oxygen" | "vo2_max",
              entryDate: record.date,
              source: "apple_health",
              importId,
            })
            .returning();

          // Create type-specific entry
          if (record.type === "weight") {
            const weightKg = convertWeightToKg(record.value, record.originalUnit);

            // Parse body fat percentage from subType if available
            let bodyFatPercentage: string | null = null;
            if (record.subType) {
              try {
                const weightData = JSON.parse(record.subType);
                if (weightData.bodyFatPercentage !== undefined && weightData.bodyFatPercentage !== null) {
                  bodyFatPercentage = weightData.bodyFatPercentage.toFixed(2);
                }
              } catch (e) {
                // Ignore parsing errors
              }
            }

            await tx.insert(weightEntries).values({
              journalEntryId: journalEntry.id,
              weight: weightKg.toFixed(2),
              bodyFatPercentage,
            });

            imported.weight++;
          } else if (record.type === "sleep") {
            // Parse sleep stage data from subType if available
            let sleepStageData: {
              timeInBedMinutes?: number;
              awakeMinutes?: number;
              remMinutes?: number;
              coreMinutes?: number;
              deepMinutes?: number;
            } = {};
            if (record.subType) {
              try {
                sleepStageData = JSON.parse(record.subType);
              } catch (e) {
                // Ignore parsing errors
              }
            }

            await tx.insert(sleepEntries).values({
              journalEntryId: journalEntry.id,
              durationMinutes: Math.round(record.value),
              quality: 3, // Default to "Good" since Apple Health doesn't track subjective quality
              timeInBedMinutes: sleepStageData.timeInBedMinutes ?? null,
              awakeMinutes: sleepStageData.awakeMinutes ?? null,
              remMinutes: sleepStageData.remMinutes ?? null,
              coreMinutes: sleepStageData.coreMinutes ?? null,
              deepMinutes: sleepStageData.deepMinutes ?? null,
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
          } else if (record.type === "heart_rate") {
            // Parse heart rate data from subType JSON
            const hrData = record.subType ? JSON.parse(record.subType) : {};

            await tx.insert(heartRateEntries).values({
              journalEntryId: journalEntry.id,
              restingHeartRate: hrData.restingHR ?? null,
              heartRateVariability: hrData.hrv?.toFixed(2) ?? null,
              walkingHeartRate: hrData.walkingHR ?? null,
            });

            imported.heart_rate++;
          } else if (record.type === "activity") {
            // Parse activity data from subType JSON
            const activityData = record.subType ? JSON.parse(record.subType) : {};

            await tx.insert(activityEntries).values({
              journalEntryId: journalEntry.id,
              steps: activityData.steps ?? null,
              distance: activityData.distance?.toFixed(3) ?? null,
              activeCalories: activityData.activeCalories ?? null,
              exerciseMinutes: activityData.exerciseMinutes ?? null,
              standHours: activityData.standHours ?? null,
              flightsClimbed: activityData.flightsClimbed ?? null,
            });

            imported.activity++;
          } else if (record.type === "blood_pressure") {
            // Parse blood pressure data from subType JSON
            const bpData = record.subType ? JSON.parse(record.subType) : {};

            await tx.insert(bloodPressureEntries).values({
              journalEntryId: journalEntry.id,
              systolic: bpData.systolic,
              diastolic: bpData.diastolic,
              measuredAt: record.timestamp ?? null,
            });

            imported.blood_pressure++;
          } else if (record.type === "blood_oxygen") {
            await tx.insert(bloodOxygenEntries).values({
              journalEntryId: journalEntry.id,
              percentage: record.value.toFixed(2),
            });

            imported.blood_oxygen++;
          } else if (record.type === "vo2_max") {
            await tx.insert(vo2MaxEntries).values({
              journalEntryId: journalEntry.id,
              value: record.value.toFixed(2),
            });

            imported.vo2_max++;
          }
        } catch {
          failed++;
        }
      }
    });

    // Update progress after each batch
    const currentRecord = Math.min(i + BATCH_SIZE, records.length);
    const totalImported = Object.values(imported).reduce((a, b) => a + b, 0);

    onProgress({
      phase: "importing",
      currentRecord,
      totalRecords: records.length,
      recordsImported: totalImported,
      recordsSkipped: 0, // Already filtered
      recordsFailed: failed,
      breakdown: {
        weight: { imported: imported.weight, skipped: 0 },
        sleep: { imported: imported.sleep, skipped: 0 },
        glucose: { imported: imported.glucose, skipped: 0 },
        heart_rate: { imported: imported.heart_rate, skipped: 0 },
        hourly_heart_rate: { imported: imported.hourly_heart_rate, skipped: 0 },
        activity: { imported: imported.activity, skipped: 0 },
        blood_pressure: { imported: imported.blood_pressure, skipped: 0 },
        blood_oxygen: { imported: imported.blood_oxygen, skipped: 0 },
        vo2_max: { imported: imported.vo2_max, skipped: 0 },
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
    // Clean up the extracted directory
    const extractDir = join(dirname(zipPath), `health-export-${importId}`);
    if (existsSync(extractDir)) {
      rmSync(extractDir, { recursive: true, force: true });
    }

    // Clean up the original zip file
    if (existsSync(zipPath)) {
      rmSync(zipPath, { force: true });
    }
  } catch {
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
  } catch {
    // Ignore rollback errors
  }
}

/**
 * Create empty progress with all types initialized
 */
function createEmptyProgress(phase: "extracting" | "parsing" | "importing"): HealthImportProgress {
  return {
    phase,
    currentRecord: 0,
    totalRecords: 0,
    recordsImported: 0,
    recordsSkipped: 0,
    recordsFailed: 0,
    breakdown: {
      weight: { imported: 0, skipped: 0 },
      sleep: { imported: 0, skipped: 0 },
      glucose: { imported: 0, skipped: 0 },
      heart_rate: { imported: 0, skipped: 0 },
      hourly_heart_rate: { imported: 0, skipped: 0 },
      activity: { imported: 0, skipped: 0 },
      blood_pressure: { imported: 0, skipped: 0 },
      blood_oxygen: { imported: 0, skipped: 0 },
      vo2_max: { imported: 0, skipped: 0 },
    },
  };
}

/**
 * Main processing function for health export import
 */
export async function processHealthExport(
  importId: string,
  filePath: string,
  userId: string,
  householdMemberId: string | undefined,
  importFromDate: string
): Promise<void> {
  const fromDate = new Date(importFromDate);

  try {
    // Phase 1: Extract ZIP
    await updateImportStatus(importId, "extracting");

    const xmlPath = await extractHealthExportXml(filePath, importId);

    // Phase 2: Parse XML
    await updateImportStatus(importId, "parsing");

    let lastProgressUpdate = 0;
    const records = await parseHealthExportXml(xmlPath, {
      importFromDate: fromDate,
      onProgress: (recordsProcessed) => {
        // Throttle progress updates to every 5 seconds
        const now = Date.now();
        if (now - lastProgressUpdate > 5000) {
          lastProgressUpdate = now;
          const progress = createEmptyProgress("parsing");
          progress.currentRecord = recordsProcessed;
          updateImportStatus(importId, "parsing", progress);
        }
      },
    });

    // Deduplicate records within the import
    const dedupedRecords = deduplicateRecords(records);

    // Phase 3: Filter duplicates against existing data
    const existingKeys = await getExistingEntryKeys(userId);

    const { recordsToImport, skippedCount, skippedByType } = filterDuplicates(
      dedupedRecords,
      existingKeys
    );

    // Phase 4: Import to database
    const importingProgress = createEmptyProgress("importing");
    importingProgress.totalRecords = recordsToImport.length;
    importingProgress.recordsSkipped = skippedCount;
    importingProgress.breakdown.weight.skipped = skippedByType.weight;
    importingProgress.breakdown.sleep.skipped = skippedByType.sleep;
    importingProgress.breakdown.glucose.skipped = skippedByType.glucose;
    importingProgress.breakdown.heart_rate.skipped = skippedByType.heart_rate;
    importingProgress.breakdown.hourly_heart_rate.skipped = skippedByType.hourly_heart_rate || 0;
    importingProgress.breakdown.activity.skipped = skippedByType.activity;
    importingProgress.breakdown.blood_pressure.skipped = skippedByType.blood_pressure;
    importingProgress.breakdown.blood_oxygen.skipped = skippedByType.blood_oxygen;
    importingProgress.breakdown.vo2_max.skipped = skippedByType.vo2_max;

    await updateImportStatus(importId, "importing", importingProgress);

    const progressCallback = async (progress: HealthImportProgress) => {
      // Add skipped counts to progress
      progress.recordsSkipped = skippedCount;
      progress.breakdown.weight.skipped = skippedByType.weight;
      progress.breakdown.sleep.skipped = skippedByType.sleep;
      progress.breakdown.glucose.skipped = skippedByType.glucose;
      progress.breakdown.heart_rate.skipped = skippedByType.heart_rate;
      progress.breakdown.hourly_heart_rate.skipped = skippedByType.hourly_heart_rate || 0;
      progress.breakdown.activity.skipped = skippedByType.activity;
      progress.breakdown.blood_pressure.skipped = skippedByType.blood_pressure;
      progress.breakdown.blood_oxygen.skipped = skippedByType.blood_oxygen;
      progress.breakdown.vo2_max.skipped = skippedByType.vo2_max;

      await updateImportStatus(importId, "importing", progress);
    };

    const { imported, failed } = await importRecordsToDatabase(
      importId,
      userId,
      householdMemberId,
      recordsToImport,
      progressCallback
    );

    // Calculate total imported
    const totalImported = Object.values(imported).reduce((a, b) => a + b, 0);

    // Mark as completed
    const completedProgress = createEmptyProgress("importing");
    completedProgress.currentRecord = recordsToImport.length;
    completedProgress.totalRecords = recordsToImport.length;
    completedProgress.recordsImported = totalImported;
    completedProgress.recordsSkipped = skippedCount;
    completedProgress.recordsFailed = failed;
    completedProgress.breakdown = {
      weight: { imported: imported.weight, skipped: skippedByType.weight },
      sleep: { imported: imported.sleep, skipped: skippedByType.sleep },
      glucose: { imported: imported.glucose, skipped: skippedByType.glucose },
      heart_rate: { imported: imported.heart_rate, skipped: skippedByType.heart_rate },
      hourly_heart_rate: { imported: imported.hourly_heart_rate, skipped: skippedByType.hourly_heart_rate || 0 },
      activity: { imported: imported.activity, skipped: skippedByType.activity },
      blood_pressure: { imported: imported.blood_pressure, skipped: skippedByType.blood_pressure },
      blood_oxygen: { imported: imported.blood_oxygen, skipped: skippedByType.blood_oxygen },
      vo2_max: { imported: imported.vo2_max, skipped: skippedByType.vo2_max },
    };

    await updateImportStatus(importId, "completed", completedProgress);

    // Cleanup
    await cleanupTempFiles(filePath, importId);
  } catch (error) {
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
