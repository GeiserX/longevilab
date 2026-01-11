/**
 * Streaming XML parser for Apple Health export files.
 * Uses SAX parser for memory-efficient processing of large files.
 */

import sax from "sax";
import { createReadStream } from "fs";
import {
  ParsedHealthRecord,
  SleepSegment,
  SUPPORTED_HEALTH_TYPES,
  isSupportedHealthType,
  mapHealthTypeToJournalType,
  getDateKey,
  getSleepDateKey,
  calculateTotalSleepMinutes,
} from "./data-mapper";

// Progress callback type
export type ProgressCallback = (recordsProcessed: number) => void;

interface ParseOptions {
  importFromDate: Date;
  onProgress?: ProgressCallback;
}

/**
 * Parse Apple Health export XML file using streaming SAX parser.
 * Extracts weight, glucose, and sleep records within the specified date range.
 */
export async function parseHealthExportXml(
  xmlPath: string,
  options: ParseOptions
): Promise<ParsedHealthRecord[]> {
  const { importFromDate, onProgress } = options;

  return new Promise((resolve, reject) => {
    const records: ParsedHealthRecord[] = [];
    // Map of date -> sleep segments for aggregation
    const sleepSegmentsByDate = new Map<string, SleepSegment[]>();

    let recordsProcessed = 0;
    const PROGRESS_INTERVAL = 10000; // Report progress every 10k records

    // Create SAX stream parser (strict mode)
    const saxStream = sax.createStream(true, {
      trim: true,
      normalize: true,
    });

    saxStream.on("opentag", (node) => {
      // We only care about Record elements
      if (node.name !== "Record") {
        return;
      }

      const attrs = node.attributes as Record<string, string>;
      const type = attrs.type;

      // Skip unsupported record types
      if (!type || !isSupportedHealthType(type)) {
        return;
      }

      // Parse the start date
      const startDateStr = attrs.startDate;
      if (!startDateStr) {
        return;
      }

      const startDate = new Date(startDateStr);

      // Skip records before our import date range
      if (startDate < importFromDate) {
        return;
      }

      recordsProcessed++;

      // Report progress periodically
      if (onProgress && recordsProcessed % PROGRESS_INTERVAL === 0) {
        onProgress(recordsProcessed);
      }

      const journalType = mapHealthTypeToJournalType(type);

      if (type === "HKCategoryTypeIdentifierSleepAnalysis") {
        // Sleep records need special handling - aggregate segments by date
        const endDateStr = attrs.endDate;
        if (!endDateStr) {
          return;
        }

        const endDate = new Date(endDateStr);

        // Skip "InBed" records, we only want actual sleep
        // HKCategoryValueSleepAnalysis values:
        // 0 = InBed, 1 = Asleep, 2 = Awake, 3 = Core, 4 = Deep, 5 = REM
        const value = attrs.value;
        if (value === "HKCategoryValueSleepAnalysisInBed") {
          return;
        }

        // Attribute sleep to the date when user woke up
        const dateKey = getSleepDateKey(endDate);

        const segments = sleepSegmentsByDate.get(dateKey) || [];
        segments.push({ start: startDate, end: endDate });
        sleepSegmentsByDate.set(dateKey, segments);
      } else {
        // Weight and glucose records - direct mapping
        const valueStr = attrs.value;
        const unit = attrs.unit;

        if (!valueStr || !unit) {
          return;
        }

        const value = parseFloat(valueStr);
        if (isNaN(value)) {
          return;
        }

        const dateKey = getDateKey(startDate);

        records.push({
          type: journalType,
          date: dateKey,
          value,
          originalUnit: unit,
        });
      }
    });

    saxStream.on("end", () => {
      // Process sleep segments into daily totals
      for (const [dateKey, segments] of sleepSegmentsByDate) {
        const totalMinutes = calculateTotalSleepMinutes(segments);

        // Only include sleep records with meaningful duration (>30 minutes)
        if (totalMinutes >= 30) {
          records.push({
            type: "sleep",
            date: dateKey,
            value: Math.round(totalMinutes),
            originalUnit: "minutes",
          });
        }
      }

      // Final progress update
      if (onProgress) {
        onProgress(recordsProcessed);
      }

      resolve(records);
    });

    saxStream.on("error", (error) => {
      reject(new Error(`XML parsing error: ${error.message}`));
    });

    // Stream the file through the parser
    const fileStream = createReadStream(xmlPath, { encoding: "utf-8" });

    fileStream.on("error", (error) => {
      reject(new Error(`File read error: ${error.message}`));
    });

    fileStream.pipe(saxStream);
  });
}

/**
 * Deduplicate records by keeping only the latest record per date and type.
 * Weight/glucose can have multiple readings per day from iPhone Health.
 */
export function deduplicateRecords(
  records: ParsedHealthRecord[]
): ParsedHealthRecord[] {
  // Map: "type:date" -> record (keeping last one)
  const recordMap = new Map<string, ParsedHealthRecord>();

  for (const record of records) {
    const key = `${record.type}:${record.date}`;

    // For weight and glucose, keep the latest reading of the day
    // For sleep, there should only be one aggregated record per day
    recordMap.set(key, record);
  }

  return Array.from(recordMap.values());
}
