CREATE TABLE "hourly_heart_rate_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"household_member_id" uuid,
	"recorded_at" timestamp NOT NULL,
	"entry_date" date NOT NULL,
	"hour" integer NOT NULL,
	"avg_heart_rate" integer NOT NULL,
	"min_heart_rate" integer,
	"max_heart_rate" integer,
	"reading_count" integer DEFAULT 1,
	"source" varchar(50) DEFAULT 'apple_health' NOT NULL,
	"import_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "health_journal_entries" ADD COLUMN "household_member_id" uuid;--> statement-breakpoint
ALTER TABLE "sleep_entries" ADD COLUMN "time_in_bed_minutes" integer;--> statement-breakpoint
ALTER TABLE "sleep_entries" ADD COLUMN "awake_minutes" integer;--> statement-breakpoint
ALTER TABLE "sleep_entries" ADD COLUMN "rem_minutes" integer;--> statement-breakpoint
ALTER TABLE "sleep_entries" ADD COLUMN "core_minutes" integer;--> statement-breakpoint
ALTER TABLE "sleep_entries" ADD COLUMN "deep_minutes" integer;--> statement-breakpoint
ALTER TABLE "health_data_imports" ADD COLUMN "household_member_id" uuid;--> statement-breakpoint
ALTER TABLE "hourly_heart_rate_entries" ADD CONSTRAINT "hourly_heart_rate_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hourly_heart_rate_entries" ADD CONSTRAINT "hourly_heart_rate_entries_household_member_id_household_members_id_fk" FOREIGN KEY ("household_member_id") REFERENCES "public"."household_members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hourly_heart_rate_entries" ADD CONSTRAINT "hourly_heart_rate_entries_import_id_health_data_imports_id_fk" FOREIGN KEY ("import_id") REFERENCES "public"."health_data_imports"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "health_journal_entries" ADD CONSTRAINT "health_journal_entries_household_member_id_household_members_id_fk" FOREIGN KEY ("household_member_id") REFERENCES "public"."household_members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "health_data_imports" ADD CONSTRAINT "health_data_imports_household_member_id_household_members_id_fk" FOREIGN KEY ("household_member_id") REFERENCES "public"."household_members"("id") ON DELETE set null ON UPDATE no action;