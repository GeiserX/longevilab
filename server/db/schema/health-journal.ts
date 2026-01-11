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

// Enums
export const journalEntryTypeEnum = pgEnum("journal_entry_type", [
  "weight",
  "sleep",
  "glucose",
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
  durationMinutes: integer("duration_minutes").notNull(),
  quality: integer("quality").notNull(), // 1-5 scale: Poor, Fair, Good, Very Good, Excellent
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
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
