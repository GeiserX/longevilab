import {
  pgTable,
  uuid,
  varchar,
  text,
  jsonb,
  integer,
  decimal,
} from "drizzle-orm/pg-core";

export const biomarkers = pgTable("biomarkers", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  canonicalUnit: varchar("canonical_unit", { length: 50 }).notNull(),
  description: text("description"),
  aliases: jsonb("aliases").$type<string[]>().default([]),
});

export const referenceRanges = pgTable("reference_ranges", {
  id: uuid("id").primaryKey().defaultRandom(),
  biomarkerId: uuid("biomarker_id")
    .notNull()
    .references(() => biomarkers.id, { onDelete: "cascade" }),
  minAge: integer("min_age").default(0),
  maxAge: integer("max_age").default(150),
  sex: varchar("sex", { length: 20 }),
  minValue: decimal("min_value", { precision: 10, scale: 4 }),
  maxValue: decimal("max_value", { precision: 10, scale: 4 }),
  unit: varchar("unit", { length: 50 }).notNull(),
});
