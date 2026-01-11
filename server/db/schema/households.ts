import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  date,
  varchar,
} from "drizzle-orm/pg-core";
import { users } from "./users";

export const households = pgTable("households", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  ownerId: text("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const householdMembers = pgTable("household_members", {
  id: uuid("id").primaryKey().defaultRandom(),
  householdId: uuid("household_id")
    .notNull()
    .references(() => households.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  dateOfBirth: date("date_of_birth"),
  sex: varchar("sex", { length: 20 }),
  relationship: varchar("relationship", { length: 100 }), // "self", "spouse", "child", "parent", "other"
  isPrimary: boolean("is_primary").default(false), // true for account owner
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
