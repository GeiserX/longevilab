ALTER TYPE "public"."journal_entry_type" ADD VALUE 'heart_rate';--> statement-breakpoint
ALTER TYPE "public"."journal_entry_type" ADD VALUE 'activity';--> statement-breakpoint
ALTER TYPE "public"."journal_entry_type" ADD VALUE 'blood_pressure';--> statement-breakpoint
ALTER TYPE "public"."journal_entry_type" ADD VALUE 'blood_oxygen';--> statement-breakpoint
ALTER TYPE "public"."journal_entry_type" ADD VALUE 'vo2_max';--> statement-breakpoint
CREATE TABLE "activity_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"journal_entry_id" uuid NOT NULL,
	"steps" integer,
	"distance" numeric(7, 3),
	"active_calories" integer,
	"exercise_minutes" integer,
	"stand_hours" integer,
	"flights_climbed" integer,
	CONSTRAINT "activity_entries_journal_entry_id_unique" UNIQUE("journal_entry_id")
);
--> statement-breakpoint
CREATE TABLE "blood_oxygen_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"journal_entry_id" uuid NOT NULL,
	"percentage" numeric(5, 2) NOT NULL,
	CONSTRAINT "blood_oxygen_entries_journal_entry_id_unique" UNIQUE("journal_entry_id")
);
--> statement-breakpoint
CREATE TABLE "blood_pressure_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"journal_entry_id" uuid NOT NULL,
	"systolic" integer NOT NULL,
	"diastolic" integer NOT NULL,
	"pulse" integer,
	"measured_at" timestamp,
	CONSTRAINT "blood_pressure_entries_journal_entry_id_unique" UNIQUE("journal_entry_id")
);
--> statement-breakpoint
CREATE TABLE "heart_rate_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"journal_entry_id" uuid NOT NULL,
	"resting_heart_rate" integer,
	"heart_rate_variability" numeric(5, 2),
	"walking_heart_rate" integer,
	CONSTRAINT "heart_rate_entries_journal_entry_id_unique" UNIQUE("journal_entry_id")
);
--> statement-breakpoint
CREATE TABLE "vo2_max_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"journal_entry_id" uuid NOT NULL,
	"value" numeric(5, 2) NOT NULL,
	CONSTRAINT "vo2_max_entries_journal_entry_id_unique" UNIQUE("journal_entry_id")
);
--> statement-breakpoint
ALTER TABLE "activity_entries" ADD CONSTRAINT "activity_entries_journal_entry_id_health_journal_entries_id_fk" FOREIGN KEY ("journal_entry_id") REFERENCES "public"."health_journal_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blood_oxygen_entries" ADD CONSTRAINT "blood_oxygen_entries_journal_entry_id_health_journal_entries_id_fk" FOREIGN KEY ("journal_entry_id") REFERENCES "public"."health_journal_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blood_pressure_entries" ADD CONSTRAINT "blood_pressure_entries_journal_entry_id_health_journal_entries_id_fk" FOREIGN KEY ("journal_entry_id") REFERENCES "public"."health_journal_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "heart_rate_entries" ADD CONSTRAINT "heart_rate_entries_journal_entry_id_health_journal_entries_id_fk" FOREIGN KEY ("journal_entry_id") REFERENCES "public"."health_journal_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vo2_max_entries" ADD CONSTRAINT "vo2_max_entries_journal_entry_id_health_journal_entries_id_fk" FOREIGN KEY ("journal_entry_id") REFERENCES "public"."health_journal_entries"("id") ON DELETE cascade ON UPDATE no action;