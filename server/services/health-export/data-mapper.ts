/**
 * Data mapping and unit conversion utilities for iPhone Health export data.
 * Converts Apple Health record types and units to canonical journal entry format.
 */

// Apple Health type identifiers we support
export const SUPPORTED_HEALTH_TYPES = {
  // Existing types
  "HKQuantityTypeIdentifierBodyMass": "weight",
  "HKQuantityTypeIdentifierBodyFatPercentage": "weight", // Body fat stored in weight entries
  "HKQuantityTypeIdentifierBloodGlucose": "glucose",
  "HKCategoryTypeIdentifierSleepAnalysis": "sleep",

  // Heart rate types (daily aggregated)
  "HKQuantityTypeIdentifierRestingHeartRate": "heart_rate",
  "HKQuantityTypeIdentifierHeartRateVariabilitySDNN": "heart_rate",
  "HKQuantityTypeIdentifierWalkingHeartRateAverage": "heart_rate",
  // Individual heart rate readings (for hourly aggregation)
  "HKQuantityTypeIdentifierHeartRate": "hourly_heart_rate",

  // Activity types
  "HKQuantityTypeIdentifierStepCount": "activity",
  "HKQuantityTypeIdentifierDistanceWalkingRunning": "activity",
  "HKQuantityTypeIdentifierActiveEnergyBurned": "activity",
  "HKQuantityTypeIdentifierAppleExerciseTime": "activity",
  "HKQuantityTypeIdentifierAppleStandTime": "activity",
  "HKQuantityTypeIdentifierFlightsClimbed": "activity",

  // Blood pressure
  "HKQuantityTypeIdentifierBloodPressureSystolic": "blood_pressure",
  "HKQuantityTypeIdentifierBloodPressureDiastolic": "blood_pressure",

  // Other health metrics
  "HKQuantityTypeIdentifierOxygenSaturation": "blood_oxygen",
  "HKQuantityTypeIdentifierVO2Max": "vo2_max",
} as const;

// Subtypes for records that map to the same journal entry type
export type HeartRateSubType = "restingHR" | "hrv" | "walkingHR";
export type ActivitySubType = "steps" | "distance" | "calories" | "exercise" | "stand" | "flights";
export type BloodPressureSubType = "systolic" | "diastolic";
export type WeightSubType = "bodyMass" | "bodyFat";

// Sleep stage types
export type SleepStageType = "inBed" | "awake" | "rem" | "core" | "deep" | "asleep";

// Map Apple Health sleep values to stage types
export const SLEEP_VALUE_TO_STAGE: Record<string, SleepStageType> = {
  "HKCategoryValueSleepAnalysisInBed": "inBed",
  "HKCategoryValueSleepAnalysisAsleep": "asleep", // Legacy value (pre-iOS 16)
  "HKCategoryValueSleepAnalysisAwake": "awake",
  "HKCategoryValueSleepAnalysisAsleepCore": "core",
  "HKCategoryValueSleepAnalysisAsleepDeep": "deep",
  "HKCategoryValueSleepAnalysisAsleepREM": "rem",
};

// Map Apple Health type to subtype
export const HEALTH_TYPE_TO_SUBTYPE: Record<string, string> = {
  "HKQuantityTypeIdentifierBodyMass": "bodyMass",
  "HKQuantityTypeIdentifierBodyFatPercentage": "bodyFat",
  "HKQuantityTypeIdentifierRestingHeartRate": "restingHR",
  "HKQuantityTypeIdentifierHeartRateVariabilitySDNN": "hrv",
  "HKQuantityTypeIdentifierWalkingHeartRateAverage": "walkingHR",
  "HKQuantityTypeIdentifierStepCount": "steps",
  "HKQuantityTypeIdentifierDistanceWalkingRunning": "distance",
  "HKQuantityTypeIdentifierActiveEnergyBurned": "calories",
  "HKQuantityTypeIdentifierAppleExerciseTime": "exercise",
  "HKQuantityTypeIdentifierAppleStandTime": "stand",
  "HKQuantityTypeIdentifierFlightsClimbed": "flights",
  "HKQuantityTypeIdentifierBloodPressureSystolic": "systolic",
  "HKQuantityTypeIdentifierBloodPressureDiastolic": "diastolic",
};

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
  subType?: string; // e.g., "systolic" | "diastolic" | "restingHR" | "hrv" | "steps" etc.
  timestamp?: Date; // For records that need time-of-day (e.g., blood pressure)
}

// Sleep segment for aggregation
export interface SleepSegment {
  start: Date;
  end: Date;
}

// Extended sleep segment with stage information
export interface SleepSegmentWithStage extends SleepSegment {
  stage: SleepStageType;
}

// Sleep stage durations result
export interface SleepStageDurations {
  timeInBedMinutes: number;
  awakeMinutes: number;
  remMinutes: number;
  coreMinutes: number;
  deepMinutes: number;
  totalAsleepMinutes: number;
}

// Hourly heart rate data for aggregation
export interface HourlyHeartRateData {
  values: number[];
  min: number;
  max: number;
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
  return value;
}

/**
 * Convert distance value to km (canonical unit)
 */
export function convertDistanceToKm(value: number, unit: string): number {
  const unitLower = unit.toLowerCase();

  if (unitLower === "km") {
    return value;
  }

  if (unitLower === "mi" || unitLower === "mile" || unitLower === "miles") {
    // 1 mile = 1.60934 km
    return value * 1.60934;
  }

  if (unitLower === "m" || unitLower === "meter" || unitLower === "meters") {
    // 1 meter = 0.001 km
    return value / 1000;
  }

  if (unitLower === "ft" || unitLower === "feet" || unitLower === "foot") {
    // 1 foot = 0.0003048 km
    return value * 0.0003048;
  }

  // Default to assuming km if unknown
  return value;
}

/**
 * Convert energy value to kcal (canonical unit)
 */
export function convertCaloriesToKcal(value: number, unit: string): number {
  const unitLower = unit.toLowerCase();

  if (unitLower === "kcal" || unitLower === "cal" || unitLower === "kilocalorie" || unitLower === "kilocalories") {
    // Apple Health uses "Cal" which actually means kcal (dietary calories)
    return value;
  }

  if (unitLower === "kj" || unitLower === "kilojoule" || unitLower === "kilojoules") {
    // 1 kJ = 0.239006 kcal
    return value * 0.239006;
  }

  if (unitLower === "j" || unitLower === "joule" || unitLower === "joules") {
    // 1 J = 0.000239006 kcal
    return value * 0.000239006;
  }

  // Default to assuming kcal if unknown
  return value;
}

/**
 * Convert time value to minutes (canonical unit for exercise/stand time)
 */
export function convertTimeToMinutes(value: number, unit: string): number {
  const unitLower = unit.toLowerCase();

  if (unitLower === "min" || unitLower === "minute" || unitLower === "minutes") {
    return value;
  }

  if (unitLower === "hr" || unitLower === "hour" || unitLower === "hours" || unitLower === "h") {
    return value * 60;
  }

  if (unitLower === "s" || unitLower === "sec" || unitLower === "second" || unitLower === "seconds") {
    return value / 60;
  }

  // Default to assuming minutes if unknown
  return value;
}

/**
 * Get subtype from Apple Health type identifier
 */
export function getSubTypeForHealthType(healthType: string): string | undefined {
  return HEALTH_TYPE_TO_SUBTYPE[healthType];
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
 * Calculate sleep stage durations from segments with stage information.
 * Returns breakdown of time spent in each sleep stage.
 */
export function calculateSleepStageDurations(
  segments: SleepSegmentWithStage[]
): SleepStageDurations {
  const durations: SleepStageDurations = {
    timeInBedMinutes: 0,
    awakeMinutes: 0,
    remMinutes: 0,
    coreMinutes: 0,
    deepMinutes: 0,
    totalAsleepMinutes: 0,
  };

  for (const segment of segments) {
    const durationMs = segment.end.getTime() - segment.start.getTime();
    const durationMin = durationMs / 60000;

    switch (segment.stage) {
      case "inBed":
        durations.timeInBedMinutes += durationMin;
        break;
      case "awake":
        durations.awakeMinutes += durationMin;
        break;
      case "rem":
        durations.remMinutes += durationMin;
        durations.totalAsleepMinutes += durationMin;
        break;
      case "core":
        durations.coreMinutes += durationMin;
        durations.totalAsleepMinutes += durationMin;
        break;
      case "deep":
        durations.deepMinutes += durationMin;
        durations.totalAsleepMinutes += durationMin;
        break;
      case "asleep":
        // Legacy "asleep" value (pre-iOS 16) - count as core sleep
        durations.coreMinutes += durationMin;
        durations.totalAsleepMinutes += durationMin;
        break;
    }
  }

  return durations;
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
