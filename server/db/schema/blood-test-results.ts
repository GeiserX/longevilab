import {
  pgTable,
  uuid,
  varchar,
  decimal,
  boolean,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { bloodTests } from "./blood-tests";
import { biomarkers } from "./biomarkers";

export const bloodTestResults = pgTable(
  "blood_test_results",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bloodTestId: uuid("blood_test_id")
      .notNull()
      .references(() => bloodTests.id, { onDelete: "cascade" }),
    biomarkerId: uuid("biomarker_id")
      .notNull()
      .references(() => biomarkers.id, { onDelete: "cascade" }),
    value: decimal("value", { precision: 10, scale: 4 }).notNull(),
    unit: varchar("unit", { length: 50 }).notNull(),
    originalValue: decimal("original_value", { precision: 10, scale: 4 }),
    originalUnit: varchar("original_unit", { length: 50 }),
    isOutOfRange: boolean("is_out_of_range").default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("blood_test_biomarker_idx").on(
      table.bloodTestId,
      table.biomarkerId
    ),
  ]
);
