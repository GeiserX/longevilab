import {
  pgTable,
  uuid,
  varchar,
  text,
  date,
  timestamp,
  decimal,
  integer,
  boolean,
  pgEnum,
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { healthDataImports } from "./health-data-imports";
import { householdMembers } from "./households";

// Enums
export const journalEntryTypeEnum = pgEnum("journal_entry_type", [
  "weight",
  "sleep",
  "glucose",
  "heart_rate",
  "activity",
  "blood_pressure",
  "blood_oxygen",
  "vo2_max",
]);

export const glucoseReadingTypeEnum = pgEnum("glucose_reading_type", [
  "fasting",
  "post_meal",
  "random",
]);

export const frequencyEnum = pgEnum("frequency", [
  "daily",
  "twice_daily",
  "weekly",
  "as_needed",
  "other",
]);

// Base journal entry table (for weight, sleep, glucose entries)
export const healthJournalEntries = pgTable("health_journal_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  householdMemberId: uuid("household_member_id").references(
    () => householdMembers.id,
    { onDelete: "set null" }
  ),
  entryType: journalEntryTypeEnum("entry_type").notNull(),
  entryDate: date("entry_date").notNull(),
  notes: text("notes"),
  // Source tracking for imported data
  source: varchar("source", { length: 50 }).default("manual").notNull(), // "manual" | "apple_health"
  importId: uuid("import_id").references(() => healthDataImports.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Weight-specific data
export const weightEntries = pgTable("weight_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  journalEntryId: uuid("journal_entry_id")
    .notNull()
    .references(() => healthJournalEntries.id, { onDelete: "cascade" })
    .unique(),
  weight: decimal("weight", { precision: 5, scale: 2 }).notNull(), // kg (canonical)
  bodyFatPercentage: decimal("body_fat_percentage", { precision: 4, scale: 2 }),
  waistCircumference: decimal("waist_circumference", { precision: 5, scale: 2 }), // cm (canonical)
});

// Sleep-specific data
export const sleepEntries = pgTable("sleep_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  journalEntryId: uuid("journal_entry_id")
    .notNull()
    .references(() => healthJournalEntries.id, { onDelete: "cascade" })
    .unique(),
  durationMinutes: integer("duration_minutes").notNull(), // Total asleep time (excluding awake)
  quality: integer("quality").notNull(), // 1-5 scale: Poor, Fair, Good, Very Good, Excellent
  // Sleep stage breakdown (all in minutes)
  timeInBedMinutes: integer("time_in_bed_minutes"), // Total time in bed
  awakeMinutes: integer("awake_minutes"), // Time awake during sleep period
  remMinutes: integer("rem_minutes"), // REM sleep duration
  coreMinutes: integer("core_minutes"), // Core/Light sleep duration
  deepMinutes: integer("deep_minutes"), // Deep sleep duration
});

// Glucose-specific data
export const glucoseEntries = pgTable("glucose_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  journalEntryId: uuid("journal_entry_id")
    .notNull()
    .references(() => healthJournalEntries.id, { onDelete: "cascade" })
    .unique(),
  value: decimal("value", { precision: 5, scale: 2 }).notNull(), // mmol/L (canonical)
  readingType: glucoseReadingTypeEnum("reading_type").notNull(),
});

// Heart rate-specific data (daily aggregated)
export const heartRateEntries = pgTable("heart_rate_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  journalEntryId: uuid("journal_entry_id")
    .notNull()
    .references(() => healthJournalEntries.id, { onDelete: "cascade" })
    .unique(),
  restingHeartRate: integer("resting_heart_rate"), // bpm
  heartRateVariability: decimal("heart_rate_variability", { precision: 5, scale: 2 }), // ms (SDNN)
  walkingHeartRate: integer("walking_heart_rate"), // bpm
});

// Hourly heart rate readings for detailed tracking
export const hourlyHeartRateEntries = pgTable("hourly_heart_rate_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  householdMemberId: uuid("household_member_id").references(
    () => householdMembers.id,
    { onDelete: "set null" }
  ),
  recordedAt: timestamp("recorded_at").notNull(), // Hour timestamp
  entryDate: date("entry_date").notNull(), // Date portion for easy querying
  hour: integer("hour").notNull(), // 0-23
  avgHeartRate: integer("avg_heart_rate").notNull(), // Average HR for the hour
  minHeartRate: integer("min_heart_rate"), // Minimum HR
  maxHeartRate: integer("max_heart_rate"), // Maximum HR
  readingCount: integer("reading_count").default(1), // Number of readings aggregated
  source: varchar("source", { length: 50 }).default("apple_health").notNull(),
  importId: uuid("import_id").references(() => healthDataImports.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Activity-specific data (daily aggregated)
export const activityEntries = pgTable("activity_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  journalEntryId: uuid("journal_entry_id")
    .notNull()
    .references(() => healthJournalEntries.id, { onDelete: "cascade" })
    .unique(),
  steps: integer("steps"), // count
  distance: decimal("distance", { precision: 7, scale: 3 }), // km (canonical)
  activeCalories: integer("active_calories"), // kcal
  exerciseMinutes: integer("exercise_minutes"), // minutes
  standHours: integer("stand_hours"), // hours (0-24)
  flightsClimbed: integer("flights_climbed"), // floors
});

// Blood pressure-specific data (multiple readings per day allowed)
export const bloodPressureEntries = pgTable("blood_pressure_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  journalEntryId: uuid("journal_entry_id")
    .notNull()
    .references(() => healthJournalEntries.id, { onDelete: "cascade" })
    .unique(),
  systolic: integer("systolic").notNull(), // mmHg
  diastolic: integer("diastolic").notNull(), // mmHg
  pulse: integer("pulse"), // bpm (optional)
  measuredAt: timestamp("measured_at"), // time of reading
});

// Blood oxygen-specific data
export const bloodOxygenEntries = pgTable("blood_oxygen_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  journalEntryId: uuid("journal_entry_id")
    .notNull()
    .references(() => healthJournalEntries.id, { onDelete: "cascade" })
    .unique(),
  percentage: decimal("percentage", { precision: 5, scale: 2 }).notNull(), // 0-100%
});

// VO2 Max-specific data
export const vo2MaxEntries = pgTable("vo2_max_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  journalEntryId: uuid("journal_entry_id")
    .notNull()
    .references(() => healthJournalEntries.id, { onDelete: "cascade" })
    .unique(),
  value: decimal("value", { precision: 5, scale: 2 }).notNull(), // mL/kg/min
});

// Medications (Active List model - tracks current/historical medications)
export const medications = pgTable("medications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  dosage: varchar("dosage", { length: 100 }),
  frequency: frequencyEnum("frequency"),
  startDate: date("start_date").notNull(),
  endDate: date("end_date"),
  notes: text("notes"),
  website: varchar("website", { length: 500 }),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Supplements (Active List model - tracks current/historical supplements)
export const supplements = pgTable("supplements", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  dosage: varchar("dosage", { length: 100 }),
  frequency: frequencyEnum("frequency"),
  startDate: date("start_date").notNull(),
  endDate: date("end_date"),
  notes: text("notes"),
  website: varchar("website", { length: 500 }),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
