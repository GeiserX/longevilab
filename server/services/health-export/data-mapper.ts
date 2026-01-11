/**
 * Data mapping and unit conversion utilities for iPhone Health export data.
 * Converts Apple Health record types and units to canonical journal entry format.
 */

// Apple Health type identifiers we support
export const SUPPORTED_HEALTH_TYPES = {
  "HKQuantityTypeIdentifierBodyMass": "weight",
  "HKQuantityTypeIdentifierBloodGlucose": "glucose",
  "HKCategoryTypeIdentifierSleepAnalysis": "sleep",
} as const;

export type AppleHealthType = keyof typeof SUPPORTED_HEALTH_TYPES;
export type JournalEntryType = (typeof SUPPORTED_HEALTH_TYPES)[AppleHealthType];

// Parsed record from Apple Health XML
export interface ParsedHealthRecord {
  type: JournalEntryType;
  date: string; // YYYY-MM-DD
  value: number;
  originalUnit: string;
  startDate?: Date;
  endDate?: Date;
}

// Sleep segment for aggregation
export interface SleepSegment {
  start: Date;
  end: Date;
}

/**
 * Convert weight value to kg (canonical unit)
 */
export function convertWeightToKg(value: number, unit: string): number {
  const unitLower = unit.toLowerCase();

  if (unitLower === "kg") {
    return value;
  }

  if (unitLower === "lb" || unitLower === "lbs") {
    return value * 0.453592;
  }

  if (unitLower === "st" || unitLower === "stone") {
    // 1 stone = 6.35029 kg
    return value * 6.35029;
  }

  // Default to assuming kg if unknown
  console.warn(`Unknown weight unit: ${unit}, assuming kg`);
  return value;
}

/**
 * Convert glucose value to mmol/L (canonical unit)
 */
export function convertGlucoseToMmolL(value: number, unit: string): number {
  const unitLower = unit.toLowerCase();

  if (unitLower === "mmol/l" || unitLower === "mmol") {
    return value;
  }

  if (unitLower === "mg/dl" || unitLower === "mg/l") {
    // 1 mg/dL = 0.0555 mmol/L
    return value / 18.0182;
  }

  // Default to assuming mmol/L if unknown
  console.warn(`Unknown glucose unit: ${unit}, assuming mmol/L`);
  return value;
}

/**
 * Calculate total sleep duration from segments, merging overlapping ones.
 * Handles Apple Health's fragmented sleep data (multiple segments per night).
 */
export function calculateTotalSleepMinutes(segments: SleepSegment[]): number {
  if (segments.length === 0) {
    return 0;
  }

  // Sort segments by start time
  const sorted = [...segments].sort(
    (a, b) => a.start.getTime() - b.start.getTime()
  );

  // Merge overlapping segments
  const merged: SleepSegment[] = [];

  for (const segment of sorted) {
    if (merged.length === 0) {
      merged.push({ ...segment });
    } else {
      const last = merged[merged.length - 1];

      // Check if segments overlap (or are adjacent within 1 minute)
      if (segment.start.getTime() <= last.end.getTime() + 60000) {
        // Extend the last segment if this one goes further
        if (segment.end.getTime() > last.end.getTime()) {
          last.end = segment.end;
        }
      } else {
        // Non-overlapping segment
        merged.push({ ...segment });
      }
    }
  }

  // Sum total duration in minutes
  return merged.reduce((total, seg) => {
    const durationMs = seg.end.getTime() - seg.start.getTime();
    return total + durationMs / 60000;
  }, 0);
}

/**
 * Check if an Apple Health type is one we support importing
 */
export function isSupportedHealthType(
  type: string
): type is keyof typeof SUPPORTED_HEALTH_TYPES {
  return type in SUPPORTED_HEALTH_TYPES;
}

/**
 * Map Apple Health type identifier to our journal entry type
 */
export function mapHealthTypeToJournalType(
  healthType: AppleHealthType
): JournalEntryType {
  return SUPPORTED_HEALTH_TYPES[healthType];
}

/**
 * Get the date portion (YYYY-MM-DD) from a Date object
 */
export function getDateKey(date: Date): string {
  return date.toISOString().split("T")[0];
}

/**
 * Determine sleep date based on end time.
 * Sleep that ends before 12:00 is attributed to the previous day.
 */
export function getSleepDateKey(endDate: Date): string {
  const hour = endDate.getHours();

  // If sleep ends before noon, it's likely from the previous night
  if (hour < 12) {
    const prevDay = new Date(endDate);
    prevDay.setDate(prevDay.getDate() - 1);
    return getDateKey(prevDay);
  }

  return getDateKey(endDate);
}
