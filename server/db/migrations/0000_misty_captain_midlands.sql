CREATE TYPE "public"."blood_test_status" AS ENUM('pending', 'processing', 'review', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."frequency" AS ENUM('daily', 'twice_daily', 'weekly', 'as_needed', 'other');--> statement-breakpoint
CREATE TYPE "public"."glucose_reading_type" AS ENUM('fasting', 'post_meal', 'random');--> statement-breakpoint
CREATE TYPE "public"."journal_entry_type" AS ENUM('weight', 'sleep', 'glucose');--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"name" varchar(255) NOT NULL,
	"date_of_birth" date,
	"sex" varchar(20),
	"preferred_units" varchar(10) DEFAULT 'metric',
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verifications" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "biomarkers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"category" varchar(100) NOT NULL,
	"canonical_unit" varchar(50) NOT NULL,
	"description" text,
	"aliases" jsonb DEFAULT '[]'::jsonb,
	CONSTRAINT "biomarkers_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "reference_ranges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"biomarker_id" uuid NOT NULL,
	"min_age" integer DEFAULT 0,
	"max_age" integer DEFAULT 150,
	"sex" varchar(20),
	"min_value" numeric(10, 4),
	"max_value" numeric(10, 4),
	"unit" varchar(50) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "biomarker_education" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"biomarker_id" uuid NOT NULL,
	"description" text,
	"why_it_matters" text,
	"if_low" text,
	"if_high" text,
	"how_to_improve" text,
	"related_biomarker_codes" jsonb DEFAULT '[]'::jsonb,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "biomarker_education_biomarker_id_unique" UNIQUE("biomarker_id")
);
--> statement-breakpoint
CREATE TABLE "blood_tests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"test_date" date NOT NULL,
	"lab_name" varchar(255),
	"original_file_path" varchar(500) NOT NULL,
	"ocr_text" text,
	"status" "blood_test_status" DEFAULT 'pending' NOT NULL,
	"processing_error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "blood_test_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"blood_test_id" uuid NOT NULL,
	"biomarker_id" uuid NOT NULL,
	"value" numeric(10, 4) NOT NULL,
	"unit" varchar(50) NOT NULL,
	"original_value" numeric(10, 4),
	"original_unit" varchar(50),
	"is_out_of_range" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "glucose_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"journal_entry_id" uuid NOT NULL,
	"value" numeric(5, 2) NOT NULL,
	"reading_type" "glucose_reading_type" NOT NULL,
	CONSTRAINT "glucose_entries_journal_entry_id_unique" UNIQUE("journal_entry_id")
);
--> statement-breakpoint
CREATE TABLE "health_journal_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"entry_type" "journal_entry_type" NOT NULL,
	"entry_date" date NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "medications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" varchar(255) NOT NULL,
	"dosage" varchar(100),
	"frequency" "frequency",
	"start_date" date NOT NULL,
	"end_date" date,
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sleep_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"journal_entry_id" uuid NOT NULL,
	"duration_minutes" integer NOT NULL,
	"quality" integer NOT NULL,
	CONSTRAINT "sleep_entries_journal_entry_id_unique" UNIQUE("journal_entry_id")
);
--> statement-breakpoint
CREATE TABLE "supplements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" varchar(255) NOT NULL,
	"dosage" varchar(100),
	"frequency" "frequency",
	"start_date" date NOT NULL,
	"end_date" date,
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "weight_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"journal_entry_id" uuid NOT NULL,
	"weight" numeric(5, 2) NOT NULL,
	"body_fat_percentage" numeric(4, 2),
	"waist_circumference" numeric(5, 2),
	CONSTRAINT "weight_entries_journal_entry_id_unique" UNIQUE("journal_entry_id")
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reference_ranges" ADD CONSTRAINT "reference_ranges_biomarker_id_biomarkers_id_fk" FOREIGN KEY ("biomarker_id") REFERENCES "public"."biomarkers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "biomarker_education" ADD CONSTRAINT "biomarker_education_biomarker_id_biomarkers_id_fk" FOREIGN KEY ("biomarker_id") REFERENCES "public"."biomarkers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blood_tests" ADD CONSTRAINT "blood_tests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blood_test_results" ADD CONSTRAINT "blood_test_results_blood_test_id_blood_tests_id_fk" FOREIGN KEY ("blood_test_id") REFERENCES "public"."blood_tests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blood_test_results" ADD CONSTRAINT "blood_test_results_biomarker_id_biomarkers_id_fk" FOREIGN KEY ("biomarker_id") REFERENCES "public"."biomarkers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "glucose_entries" ADD CONSTRAINT "glucose_entries_journal_entry_id_health_journal_entries_id_fk" FOREIGN KEY ("journal_entry_id") REFERENCES "public"."health_journal_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "health_journal_entries" ADD CONSTRAINT "health_journal_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medications" ADD CONSTRAINT "medications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sleep_entries" ADD CONSTRAINT "sleep_entries_journal_entry_id_health_journal_entries_id_fk" FOREIGN KEY ("journal_entry_id") REFERENCES "public"."health_journal_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplements" ADD CONSTRAINT "supplements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weight_entries" ADD CONSTRAINT "weight_entries_journal_entry_id_health_journal_entries_id_fk" FOREIGN KEY ("journal_entry_id") REFERENCES "public"."health_journal_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "blood_test_biomarker_idx" ON "blood_test_results" USING btree ("blood_test_id","biomarker_id");