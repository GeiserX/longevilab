/**
 * Streaming XML parser for Apple Health export files.
 * Uses SAX parser for memory-efficient processing of large files.
 */

import sax from "sax";
import { createReadStream } from "fs";
import {
  ParsedHealthRecord,
  SleepSegmentWithStage,
  HourlyHeartRateData,
  isSupportedHealthType,
  mapHealthTypeToJournalType,
  getDateKey,
  getSleepDateKey,
  calculateSleepStageDurations,
  getSubTypeForHealthType,
  convertDistanceToKm,
  convertCaloriesToKcal,
  convertTimeToMinutes,
  SLEEP_VALUE_TO_STAGE,
} from "./data-mapper";

// Progress callback type
export type ProgressCallback = (recordsProcessed: number) => void;

interface ParseOptions {
  importFromDate: Date;
  onProgress?: ProgressCallback;
}

// Intermediate structures for aggregation
interface DailyActivityData {
  steps: number;
  distance: number; // km
  activeCalories: number; // kcal
  exerciseMinutes: number;
  standMinutes: number;
  flightsClimbed: number;
}

interface DailyHeartRateData {
  restingHR: number | null;
  hrv: number | null;
  walkingHRValues: number[];
}

interface BloodPressureReading {
  timestamp: Date;
  systolic: number | null;
  diastolic: number | null;
}

interface DailyWeightData {
  bodyMass: number | null;
  bodyMassUnit: string | null;
  bodyFatPercentage: number | null;
}

/**
 * Parse Apple Health export XML file using streaming SAX parser.
 * Extracts health records within the specified date range.
 */
export async function parseHealthExportXml(
  xmlPath: string,
  options: ParseOptions
): Promise<ParsedHealthRecord[]> {
  const { importFromDate, onProgress } = options;

  return new Promise((resolve, reject) => {
    const records: ParsedHealthRecord[] = [];

    // Map of date -> sleep segments with stage info for aggregation
    const sleepSegmentsByDate = new Map<string, SleepSegmentWithStage[]>();

    // Map of date -> daily activity data for aggregation
    const activityByDate = new Map<string, DailyActivityData>();

    // Map of date -> heart rate data for aggregation (daily summary)
    const heartRateByDate = new Map<string, DailyHeartRateData>();

    // Map of "YYYY-MM-DD:HH" -> hourly heart rate data for aggregation
    const hourlyHeartRateData = new Map<string, HourlyHeartRateData>();

    // Map of "date:timestamp" -> blood pressure reading for pairing systolic/diastolic
    const bloodPressureReadings = new Map<string, BloodPressureReading>();

    // Map of date -> weight data for aggregation (body mass + body fat percentage)
    const weightByDate = new Map<string, DailyWeightData>();

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
      const subType = getSubTypeForHealthType(type);
      const dateKey = getDateKey(startDate);

      if (type === "HKCategoryTypeIdentifierSleepAnalysis") {
        // Sleep records need special handling - aggregate segments by date with stage info
        const endDateStr = attrs.endDate;
        if (!endDateStr) {
          return;
        }

        const endDate = new Date(endDateStr);
        const value = attrs.value;

        // Map the Apple Health sleep value to our stage type
        const stage = SLEEP_VALUE_TO_STAGE[value];
        if (!stage) {
          // Skip unknown sleep values
          return;
        }

        // Attribute sleep to the date when user woke up
        const sleepDateKey = getSleepDateKey(endDate);

        const segments = sleepSegmentsByDate.get(sleepDateKey) || [];
        segments.push({ start: startDate, end: endDate, stage });
        sleepSegmentsByDate.set(sleepDateKey, segments);
      } else if (journalType === "hourly_heart_rate") {
        // Individual heart rate readings - aggregate by hour
        const valueStr = attrs.value;
        const unit = attrs.unit;

        if (!valueStr || !unit) {
          return;
        }

        const value = parseFloat(valueStr);
        if (isNaN(value) || value < 30 || value > 250) {
          // Skip invalid heart rate values
          return;
        }

        // Create hourly key (YYYY-MM-DD:HH)
        const hour = startDate.getHours();
        const hourKey = `${dateKey}:${hour.toString().padStart(2, "0")}`;

        let hourlyData = hourlyHeartRateData.get(hourKey);
        if (!hourlyData) {
          hourlyData = { values: [], min: value, max: value };
          hourlyHeartRateData.set(hourKey, hourlyData);
        }

        hourlyData.values.push(value);
        hourlyData.min = Math.min(hourlyData.min, value);
        hourlyData.max = Math.max(hourlyData.max, value);
      } else if (journalType === "activity") {
        // Activity metrics - aggregate by day
        const valueStr = attrs.value;
        const unit = attrs.unit;

        if (!valueStr || !unit) {
          return;
        }

        const value = parseFloat(valueStr);
        if (isNaN(value)) {
          return;
        }

        // Get or create daily activity data
        let dailyActivity = activityByDate.get(dateKey);
        if (!dailyActivity) {
          dailyActivity = {
            steps: 0,
            distance: 0,
            activeCalories: 0,
            exerciseMinutes: 0,
            standMinutes: 0,
            flightsClimbed: 0,
          };
          activityByDate.set(dateKey, dailyActivity);
        }

        // Add value to appropriate field based on subType
        switch (subType) {
          case "steps":
            dailyActivity.steps += Math.round(value);
            break;
          case "distance":
            dailyActivity.distance += convertDistanceToKm(value, unit);
            break;
          case "calories":
            dailyActivity.activeCalories += Math.round(convertCaloriesToKcal(value, unit));
            break;
          case "exercise":
            dailyActivity.exerciseMinutes += Math.round(convertTimeToMinutes(value, unit));
            break;
          case "stand":
            dailyActivity.standMinutes += Math.round(convertTimeToMinutes(value, unit));
            break;
          case "flights":
            dailyActivity.flightsClimbed += Math.round(value);
            break;
        }
      } else if (journalType === "heart_rate") {
        // Heart rate metrics - aggregate by day
        const valueStr = attrs.value;
        const unit = attrs.unit;

        if (!valueStr || !unit) {
          return;
        }

        const value = parseFloat(valueStr);
        if (isNaN(value)) {
          return;
        }

        // Get or create daily heart rate data
        let dailyHR = heartRateByDate.get(dateKey);
        if (!dailyHR) {
          dailyHR = {
            restingHR: null,
            hrv: null,
            walkingHRValues: [],
          };
          heartRateByDate.set(dateKey, dailyHR);
        }

        // Store value based on subType
        switch (subType) {
          case "restingHR":
            // Keep the latest resting HR for the day
            dailyHR.restingHR = Math.round(value);
            break;
          case "hrv":
            // Keep the latest HRV for the day (SDNN in ms)
            dailyHR.hrv = value;
            break;
          case "walkingHR":
            // Collect all walking HR values to average later
            dailyHR.walkingHRValues.push(value);
            break;
        }
      } else if (journalType === "blood_pressure") {
        // Blood pressure - pair systolic/diastolic by timestamp
        const valueStr = attrs.value;
        const unit = attrs.unit;

        if (!valueStr || !unit) {
          return;
        }

        const value = parseFloat(valueStr);
        if (isNaN(value)) {
          return;
        }

        // Use timestamp to pair systolic and diastolic
        const timestampKey = `${dateKey}:${startDate.getTime()}`;

        let bpReading = bloodPressureReadings.get(timestampKey);
        if (!bpReading) {
          bpReading = {
            timestamp: startDate,
            systolic: null,
            diastolic: null,
          };
          bloodPressureReadings.set(timestampKey, bpReading);
        }

        if (subType === "systolic") {
          bpReading.systolic = Math.round(value);
        } else if (subType === "diastolic") {
          bpReading.diastolic = Math.round(value);
        }
      } else if (journalType === "blood_oxygen" || journalType === "vo2_max") {
        // Blood oxygen and VO2 Max - direct mapping
        const valueStr = attrs.value;
        const unit = attrs.unit;

        if (!valueStr || !unit) {
          return;
        }

        const value = parseFloat(valueStr);
        if (isNaN(value)) {
          return;
        }

        // For SpO2, Apple stores as decimal (0.95 = 95%), convert to percentage
        let finalValue = value;
        if (journalType === "blood_oxygen" && value <= 1) {
          finalValue = value * 100;
        }

        records.push({
          type: journalType,
          date: dateKey,
          value: finalValue,
          originalUnit: unit,
          timestamp: startDate,
        });
      } else if (journalType === "weight") {
        // Weight and body fat percentage - aggregate by day
        const valueStr = attrs.value;
        const unit = attrs.unit;

        if (!valueStr || !unit) {
          return;
        }

        const value = parseFloat(valueStr);
        if (isNaN(value)) {
          return;
        }

        // Get or create daily weight data
        let dailyWeight = weightByDate.get(dateKey);
        if (!dailyWeight) {
          dailyWeight = {
            bodyMass: null,
            bodyMassUnit: null,
            bodyFatPercentage: null,
          };
          weightByDate.set(dateKey, dailyWeight);
        }

        // Store value based on subType
        if (subType === "bodyFat") {
          // Body fat is stored as decimal (0.25 = 25%), convert to percentage
          let bodyFatPct = value;
          if (bodyFatPct <= 1) {
            bodyFatPct = bodyFatPct * 100;
          }
          dailyWeight.bodyFatPercentage = bodyFatPct;
        } else {
          // Body mass
          dailyWeight.bodyMass = value;
          dailyWeight.bodyMassUnit = unit;
        }
      } else {
        // Glucose records - direct mapping
        const valueStr = attrs.value;
        const unit = attrs.unit;

        if (!valueStr || !unit) {
          return;
        }

        const value = parseFloat(valueStr);
        if (isNaN(value)) {
          return;
        }

        records.push({
          type: journalType,
          date: dateKey,
          value,
          originalUnit: unit,
        });
      }
    });

    saxStream.on("end", () => {
      // Process sleep segments into daily totals with stage breakdown
      for (const [dateKey, segments] of sleepSegmentsByDate) {
        const stageDurations = calculateSleepStageDurations(segments);

        // Only include sleep records with meaningful duration (>30 minutes)
        if (stageDurations.totalAsleepMinutes >= 30) {
          records.push({
            type: "sleep",
            date: dateKey,
            value: Math.round(stageDurations.totalAsleepMinutes),
            originalUnit: "minutes",
            subType: JSON.stringify({
              timeInBedMinutes: Math.round(stageDurations.timeInBedMinutes),
              awakeMinutes: Math.round(stageDurations.awakeMinutes),
              remMinutes: Math.round(stageDurations.remMinutes),
              coreMinutes: Math.round(stageDurations.coreMinutes),
              deepMinutes: Math.round(stageDurations.deepMinutes),
            }),
          });
        }
      }

      // Process hourly heart rate data into records
      for (const [hourKey, data] of hourlyHeartRateData) {
        const [dateKey, hourStr] = hourKey.split(":");
        const avgHR = Math.round(
          data.values.reduce((a, b) => a + b, 0) / data.values.length
        );

        records.push({
          type: "hourly_heart_rate",
          date: dateKey,
          value: avgHR,
          originalUnit: "bpm",
          subType: JSON.stringify({
            hour: parseInt(hourStr, 10),
            min: Math.round(data.min),
            max: Math.round(data.max),
            count: data.values.length,
          }),
        });
      }

      // Process activity data into daily records
      for (const [dateKey, activity] of activityByDate) {
        // Only create activity record if there's meaningful data
        if (
          activity.steps > 0 ||
          activity.distance > 0 ||
          activity.activeCalories > 0 ||
          activity.exerciseMinutes > 0
        ) {
          // Convert stand minutes to hours (Apple counts hours with standing)
          const standHours = Math.min(24, Math.round(activity.standMinutes / 60));

          records.push({
            type: "activity",
            date: dateKey,
            value: activity.steps, // Primary value is steps
            originalUnit: "count",
            subType: JSON.stringify({
              steps: activity.steps,
              distance: Math.round(activity.distance * 1000) / 1000, // Round to 3 decimals
              activeCalories: activity.activeCalories,
              exerciseMinutes: activity.exerciseMinutes,
              standHours,
              flightsClimbed: activity.flightsClimbed,
            }),
          });
        }
      }

      // Process heart rate data into daily records
      for (const [dateKey, hrData] of heartRateByDate) {
        // Only create heart rate record if there's meaningful data
        if (hrData.restingHR !== null || hrData.hrv !== null || hrData.walkingHRValues.length > 0) {
          // Calculate average walking HR if there are values
          const walkingHR =
            hrData.walkingHRValues.length > 0
              ? Math.round(
                  hrData.walkingHRValues.reduce((a, b) => a + b, 0) / hrData.walkingHRValues.length
                )
              : null;

          records.push({
            type: "heart_rate",
            date: dateKey,
            value: hrData.restingHR || 0, // Primary value is resting HR
            originalUnit: "bpm",
            subType: JSON.stringify({
              restingHR: hrData.restingHR,
              hrv: hrData.hrv !== null ? Math.round(hrData.hrv * 100) / 100 : null, // Round to 2 decimals
              walkingHR,
            }),
          });
        }
      }

      // Process blood pressure readings into records
      for (const [, reading] of bloodPressureReadings) {
        // Only create BP record if we have both systolic and diastolic
        if (reading.systolic !== null && reading.diastolic !== null) {
          const dateKey = getDateKey(reading.timestamp);

          records.push({
            type: "blood_pressure",
            date: dateKey,
            value: reading.systolic, // Primary value is systolic
            originalUnit: "mmHg",
            timestamp: reading.timestamp,
            subType: JSON.stringify({
              systolic: reading.systolic,
              diastolic: reading.diastolic,
            }),
          });
        }
      }

      // Process weight data into daily records
      for (const [dateKey, weightData] of weightByDate) {
        // Only create weight record if there's body mass data
        if (weightData.bodyMass !== null && weightData.bodyMassUnit !== null) {
          records.push({
            type: "weight",
            date: dateKey,
            value: weightData.bodyMass,
            originalUnit: weightData.bodyMassUnit,
            // Include body fat percentage in subType if available
            subType: weightData.bodyFatPercentage !== null
              ? JSON.stringify({ bodyFatPercentage: Math.round(weightData.bodyFatPercentage * 100) / 100 })
              : undefined,
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
 * For blood pressure, we keep all readings (multiple per day allowed).
 * For blood oxygen and VO2 max, we keep the latest per day.
 */
export function deduplicateRecords(
  records: ParsedHealthRecord[]
): ParsedHealthRecord[] {
  // Map: "type:date" -> record (keeping last one)
  // For blood pressure, we use "type:date:timestamp" to keep all readings
  const recordMap = new Map<string, ParsedHealthRecord>();

  for (const record of records) {
    let key: string;

    if (record.type === "blood_pressure" && record.timestamp) {
      // For blood pressure, keep all readings (unique by timestamp)
      key = `${record.type}:${record.date}:${record.timestamp.getTime()}`;
    } else if (record.type === "hourly_heart_rate" && record.subType) {
      // For hourly heart rate, keep per-hour granularity
      const hrData = JSON.parse(record.subType);
      key = `${record.type}:${record.date}:${hrData.hour}`;
    } else {
      // For other types, keep the latest reading of the day
      key = `${record.type}:${record.date}`;
    }

    recordMap.set(key, record);
  }

  return Array.from(recordMap.values());
}
