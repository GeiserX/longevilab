import {
  pgTable,
  uuid,
  varchar,
  text,
  date,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { householdMembers } from "./households";

export const bloodTestStatusEnum = pgEnum("blood_test_status", [
  "pending",
  "processing",
  "review",
  "completed",
  "failed",
]);

export const bloodTests = pgTable("blood_tests", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  householdMemberId: uuid("household_member_id").references(
    () => householdMembers.id,
    { onDelete: "set null" }
  ),
  testDate: date("test_date").notNull(),
  labName: varchar("lab_name", { length: 255 }),
  originalFilePath: varchar("original_file_path", { length: 500 }).notNull(),
  ocrText: text("ocr_text"),
  status: bloodTestStatusEnum("status").default("pending").notNull(),
  processingError: text("processing_error"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
