/**
 * Duplicate detection for health data imports.
 * Ensures we don't import data that conflicts with existing manual entries.
 */

import { db } from "@/server/db";
import { healthJournalEntries, bloodPressureEntries, hourlyHeartRateEntries } from "@/server/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { ParsedHealthRecord } from "./data-mapper";

// Type alias for entry type values (including hourly_heart_rate for tracking)
type EntryType =
  | "weight"
  | "sleep"
  | "glucose"
  | "heart_rate"
  | "hourly_heart_rate"
  | "activity"
  | "blood_pressure"
  | "blood_oxygen"
  | "vo2_max";

/**
 * Get existing journal entry dates for a user.
 * Returns a Set of "type:date" keys for fast lookup.
 * For blood pressure, includes timestamp to allow multiple per day.
 */
export async function getExistingEntryKeys(userId: string, householdMemberId?: string): Promise<Set<string>> {
  const memberCondition = householdMemberId
    ? eq(healthJournalEntries.householdMemberId, householdMemberId)
    : isNull(healthJournalEntries.householdMemberId);

  const existingEntries = await db.query.healthJournalEntries.findMany({
    where: and(eq(healthJournalEntries.userId, userId), memberCondition),
    columns: {
      id: true,
      entryType: true,
      entryDate: true,
    },
    with: {
      bloodPressureEntry: {
        columns: {
          measuredAt: true,
        },
      },
    },
  });

  const keys = new Set<string>();

  for (const entry of existingEntries) {
    // entryDate is stored as a date string in YYYY-MM-DD format
    const dateStr =
      typeof entry.entryDate === "string"
        ? entry.entryDate
        : new Date(entry.entryDate).toISOString().split("T")[0];

    if (entry.entryType === "blood_pressure" && entry.bloodPressureEntry?.measuredAt) {
      // For blood pressure, include timestamp in key to allow multiple per day
      const timestamp = entry.bloodPressureEntry.measuredAt.getTime();
      keys.add(`${entry.entryType}:${dateStr}:${timestamp}`);
    } else {
      keys.add(`${entry.entryType}:${dateStr}`);
    }
  }

  return keys;
}

/**
 * Create the key for a record based on its type.
 * Blood pressure uses timestamp, others use just date.
 */
function getRecordKey(record: ParsedHealthRecord): string {
  if (record.type === "blood_pressure" && record.timestamp) {
    return `${record.type}:${record.date}:${record.timestamp.getTime()}`;
  }
  return `${record.type}:${record.date}`;
}

/**
 * Filter out records that already have entries in the database.
 * Returns records that are safe to import and the count of skipped duplicates.
 */
export function filterDuplicates(
  records: ParsedHealthRecord[],
  existingKeys: Set<string>
): {
  recordsToImport: ParsedHealthRecord[];
  skippedCount: number;
  skippedByType: Record<EntryType, number>;
} {
  const recordsToImport: ParsedHealthRecord[] = [];
  let skippedCount = 0;
  const skippedByType: Record<EntryType, number> = {
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

  // Also track keys we've seen in this import to avoid duplicates within the same import
  const seenInImport = new Set<string>();

  for (const record of records) {
    const key = getRecordKey(record);

    // Skip if already exists in database
    if (existingKeys.has(key)) {
      skippedCount++;
      skippedByType[record.type as EntryType]++;
      continue;
    }

    // Skip if we've already seen this key in the current import
    if (seenInImport.has(key)) {
      skippedCount++;
      skippedByType[record.type as EntryType]++;
      continue;
    }

    seenInImport.add(key);
    recordsToImport.push(record);
  }

  return {
    recordsToImport,
    skippedCount,
    skippedByType,
  };
}
