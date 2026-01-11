import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  pgEnum,
  jsonb,
} from "drizzle-orm/pg-core";
import { users } from "./users";

// Import status enum
export const healthImportStatusEnum = pgEnum("health_import_status", [
  "pending",
  "extracting",
  "parsing",
  "importing",
  "completed",
  "failed",
]);

// Progress tracking type
export interface HealthImportProgress {
  phase: "extracting" | "parsing" | "importing";
  currentRecord: number;
  totalRecords: number;
  recordsImported: number;
  recordsSkipped: number;
  recordsFailed: number;
  breakdown: {
    weight: { imported: number; skipped: number };
    sleep: { imported: number; skipped: number };
    glucose: { imported: number; skipped: number };
  };
}

// Health data imports tracking table
export const healthDataImports = pgTable("health_data_imports", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),

  // File info
  originalFileName: text("original_file_name").notNull(),
  storedFilePath: text("stored_file_path").notNull(),
  fileSizeBytes: integer("file_size_bytes").notNull(),

  // Processing status
  status: healthImportStatusEnum("status").default("pending").notNull(),
  processingError: text("processing_error"),

  // Progress tracking (stored as JSON for flexibility)
  progress: jsonb("progress").$type<HealthImportProgress>(),

  // Date range filter (only import data within this range)
  importFromDate: timestamp("import_from_date").notNull(),
  importToDate: timestamp("import_to_date").notNull(),

  // Timestamps
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
