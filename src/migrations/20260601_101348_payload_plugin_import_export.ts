import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "payload"."enum_exports_format" AS ENUM('csv', 'json');
  CREATE TYPE "payload"."enum_exports_sort_order" AS ENUM('asc', 'desc');
  CREATE TYPE "payload"."enum_exports_drafts" AS ENUM('yes', 'no');
  CREATE TYPE "payload"."enum_imports_import_mode" AS ENUM('create', 'update', 'upsert');
  CREATE TYPE "payload"."enum_imports_status" AS ENUM('pending', 'completed', 'partial', 'failed');
  ALTER TYPE "payload"."enum_payload_jobs_log_task_slug" ADD VALUE 'createCollectionExport' BEFORE 'schedulePublish';
  ALTER TYPE "payload"."enum_payload_jobs_log_task_slug" ADD VALUE 'createCollectionImport' BEFORE 'schedulePublish';
  ALTER TYPE "payload"."enum_payload_jobs_task_slug" ADD VALUE 'createCollectionExport' BEFORE 'schedulePublish';
  ALTER TYPE "payload"."enum_payload_jobs_task_slug" ADD VALUE 'createCollectionImport' BEFORE 'schedulePublish';
  CREATE TABLE "payload"."exports" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"format" "payload"."enum_exports_format" DEFAULT 'csv' NOT NULL,
  	"limit" numeric,
  	"page" numeric DEFAULT 1,
  	"sort" varchar,
  	"sort_order" "payload"."enum_exports_sort_order",
  	"drafts" "payload"."enum_exports_drafts" DEFAULT 'yes',
  	"collection_slug" varchar DEFAULT 'products' NOT NULL,
  	"where" jsonb DEFAULT '{}'::jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric
  );
  
  CREATE TABLE "payload"."exports_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "payload"."imports" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"collection_slug" varchar DEFAULT 'products' NOT NULL,
  	"import_mode" "payload"."enum_imports_import_mode",
  	"match_field" varchar DEFAULT 'id',
  	"status" "payload"."enum_imports_status" DEFAULT 'pending',
  	"summary_imported" numeric,
  	"summary_updated" numeric,
  	"summary_total" numeric,
  	"summary_issues" numeric,
  	"summary_issue_details" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric
  );
  
  ALTER TABLE "payload"."exports_texts" ADD CONSTRAINT "exports_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "payload"."exports"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "exports_updated_at_idx" ON "payload"."exports" USING btree ("updated_at");
  CREATE INDEX "exports_created_at_idx" ON "payload"."exports" USING btree ("created_at");
  CREATE UNIQUE INDEX "exports_filename_idx" ON "payload"."exports" USING btree ("filename");
  CREATE INDEX "exports_texts_order_parent" ON "payload"."exports_texts" USING btree ("order","parent_id");
  CREATE INDEX "imports_updated_at_idx" ON "payload"."imports" USING btree ("updated_at");
  CREATE INDEX "imports_created_at_idx" ON "payload"."imports" USING btree ("created_at");
  CREATE UNIQUE INDEX "imports_filename_idx" ON "payload"."imports" USING btree ("filename");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "payload"."exports" CASCADE;
  DROP TABLE "payload"."exports_texts" CASCADE;
  DROP TABLE "payload"."imports" CASCADE;
  ALTER TABLE "payload"."payload_jobs_log" ALTER COLUMN "task_slug" SET DATA TYPE text;
  DROP TYPE "payload"."enum_payload_jobs_log_task_slug";
  CREATE TYPE "payload"."enum_payload_jobs_log_task_slug" AS ENUM('inline', 'schedulePublish');
  ALTER TABLE "payload"."payload_jobs_log" ALTER COLUMN "task_slug" SET DATA TYPE "payload"."enum_payload_jobs_log_task_slug" USING "task_slug"::"payload"."enum_payload_jobs_log_task_slug";
  ALTER TABLE "payload"."payload_jobs" ALTER COLUMN "task_slug" SET DATA TYPE text;
  DROP TYPE "payload"."enum_payload_jobs_task_slug";
  CREATE TYPE "payload"."enum_payload_jobs_task_slug" AS ENUM('inline', 'schedulePublish');
  ALTER TABLE "payload"."payload_jobs" ALTER COLUMN "task_slug" SET DATA TYPE "payload"."enum_payload_jobs_task_slug" USING "task_slug"::"payload"."enum_payload_jobs_task_slug";
  DROP TYPE "payload"."enum_exports_format";
  DROP TYPE "payload"."enum_exports_sort_order";
  DROP TYPE "payload"."enum_exports_drafts";
  DROP TYPE "payload"."enum_imports_import_mode";
  DROP TYPE "payload"."enum_imports_status";`)
}
