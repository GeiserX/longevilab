/**
 * Duplicate detection for health data imports.
 * Ensures we don't import data that conflicts with existing manual entries.
 */

import { db } from "@/server/db";
import { healthJournalEntries } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { ParsedHealthRecord } from "./data-mapper";

// Type alias for entry type values
type EntryType = "weight" | "sleep" | "glucose";

/**
 * Get existing journal entry dates for a user.
 * Returns a Set of "type:date" keys for fast lookup.
 */
export async function getExistingEntryKeys(userId: string): Promise<Set<string>> {
  const existingEntries = await db.query.healthJournalEntries.findMany({
    where: eq(healthJournalEntries.userId, userId),
    columns: {
      entryType: true,
      entryDate: true,
    },
  });

  const keys = new Set<string>();

  for (const entry of existingEntries) {
    // entryDate is stored as a date string in YYYY-MM-DD format
    const dateStr =
      typeof entry.entryDate === "string"
        ? entry.entryDate
        : new Date(entry.entryDate).toISOString().split("T")[0];

    keys.add(`${entry.entryType}:${dateStr}`);
  }

  return keys;
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
  };

  // Also track keys we've seen in this import to avoid duplicates within the same import
  const seenInImport = new Set<string>();

  for (const record of records) {
    const key = `${record.type}:${record.date}`;

    // Skip if already exists in database
    if (existingKeys.has(key)) {
      skippedCount++;
      skippedByType[record.type]++;
      continue;
    }

    // Skip if we've already seen this key in the current import
    if (seenInImport.has(key)) {
      skippedCount++;
      skippedByType[record.type]++;
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
