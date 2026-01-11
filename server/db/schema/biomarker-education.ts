import {
  pgTable,
  uuid,
  text,
  jsonb,
  timestamp,
} from "drizzle-orm/pg-core";
import { biomarkers } from "./biomarkers";

// Biomarker education content for expandable rows
export const biomarkerEducation = pgTable("biomarker_education", {
  id: uuid("id").primaryKey().defaultRandom(),
  biomarkerId: uuid("biomarker_id")
    .notNull()
    .references(() => biomarkers.id, { onDelete: "cascade" })
    .unique(),
  description: text("description"), // What the biomarker measures
  whyItMatters: text("why_it_matters"), // Health implications
  ifLow: text("if_low"), // Symptoms and causes when low
  ifHigh: text("if_high"), // Symptoms and causes when high
  howToImprove: text("how_to_improve"), // Foods, lifestyle, supplements
  relatedBiomarkerCodes: jsonb("related_biomarker_codes").$type<string[]>().default([]), // Array of related biomarker codes
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
