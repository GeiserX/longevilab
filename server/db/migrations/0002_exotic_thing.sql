CREATE TYPE "public"."health_import_status" AS ENUM('pending', 'extracting', 'parsing', 'importing', 'completed', 'failed');--> statement-breakpoint
CREATE TABLE "health_data_imports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"original_file_name" text NOT NULL,
	"stored_file_path" text NOT NULL,
	"file_size_bytes" integer NOT NULL,
	"status" "health_import_status" DEFAULT 'pending' NOT NULL,
	"processing_error" text,
	"progress" jsonb,
	"import_from_date" timestamp NOT NULL,
	"import_to_date" timestamp NOT NULL,
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "health_journal_entries" ADD COLUMN "source" varchar(50) DEFAULT 'manual' NOT NULL;--> statement-breakpoint
ALTER TABLE "health_journal_entries" ADD COLUMN "import_id" uuid;--> statement-breakpoint
ALTER TABLE "health_data_imports" ADD CONSTRAINT "health_data_imports_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "health_journal_entries" ADD CONSTRAINT "health_journal_entries_import_id_health_data_imports_id_fk" FOREIGN KEY ("import_id") REFERENCES "public"."health_data_imports"("id") ON DELETE set null ON UPDATE no action;