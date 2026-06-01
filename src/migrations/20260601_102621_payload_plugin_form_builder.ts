import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "payload"."enum_forms_confirmation_type" AS ENUM('message', 'redirect');
  CREATE TABLE "payload"."forms_blocks_checkbox" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"label" varchar,
  	"width" numeric,
  	"required" boolean,
  	"default_value" boolean,
  	"block_name" varchar
  );
  
  CREATE TABLE "payload"."forms_blocks_email" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"label" varchar,
  	"width" numeric,
  	"required" boolean,
  	"block_name" varchar
  );
  
  CREATE TABLE "payload"."forms_blocks_message" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"message" jsonb,
  	"block_name" varchar
  );
  
  CREATE TABLE "payload"."forms_blocks_select_options" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"value" varchar NOT NULL
  );
  
  CREATE TABLE "payload"."forms_blocks_select" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"label" varchar,
  	"width" numeric,
  	"default_value" varchar,
  	"placeholder" varchar,
  	"required" boolean,
  	"block_name" varchar
  );
  
  CREATE TABLE "payload"."forms_blocks_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"label" varchar,
  	"width" numeric,
  	"default_value" varchar,
  	"required" boolean,
  	"block_name" varchar
  );
  
  CREATE TABLE "payload"."forms_blocks_textarea" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"label" varchar,
  	"width" numeric,
  	"default_value" varchar,
  	"required" boolean,
  	"block_name" varchar
  );
  
  CREATE TABLE "payload"."forms_emails" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"email_to" varchar,
  	"cc" varchar,
  	"bcc" varchar,
  	"reply_to" varchar,
  	"email_from" varchar,
  	"subject" varchar DEFAULT 'You''ve received a new message.' NOT NULL,
  	"message" jsonb
  );
  
  CREATE TABLE "payload"."forms" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"submit_button_label" varchar,
  	"confirmation_type" "payload"."enum_forms_confirmation_type" DEFAULT 'message',
  	"confirmation_message" jsonb,
  	"redirect_url" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."form_submissions_submission_data" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"field" varchar NOT NULL,
  	"value" varchar NOT NULL
  );
  
  CREATE TABLE "payload"."form_submissions" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"form_id" integer NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD COLUMN "forms_id" integer;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD COLUMN "form_submissions_id" integer;
  ALTER TABLE "payload"."forms_blocks_checkbox" ADD CONSTRAINT "forms_blocks_checkbox_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."forms"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."forms_blocks_email" ADD CONSTRAINT "forms_blocks_email_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."forms"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."forms_blocks_message" ADD CONSTRAINT "forms_blocks_message_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."forms"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."forms_blocks_select_options" ADD CONSTRAINT "forms_blocks_select_options_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."forms_blocks_select"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."forms_blocks_select" ADD CONSTRAINT "forms_blocks_select_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."forms"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."forms_blocks_text" ADD CONSTRAINT "forms_blocks_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."forms"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."forms_blocks_textarea" ADD CONSTRAINT "forms_blocks_textarea_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."forms"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."forms_emails" ADD CONSTRAINT "forms_emails_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."forms"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."form_submissions_submission_data" ADD CONSTRAINT "form_submissions_submission_data_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."form_submissions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."form_submissions" ADD CONSTRAINT "form_submissions_form_id_forms_id_fk" FOREIGN KEY ("form_id") REFERENCES "payload"."forms"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "forms_blocks_checkbox_order_idx" ON "payload"."forms_blocks_checkbox" USING btree ("_order");
  CREATE INDEX "forms_blocks_checkbox_parent_id_idx" ON "payload"."forms_blocks_checkbox" USING btree ("_parent_id");
  CREATE INDEX "forms_blocks_checkbox_path_idx" ON "payload"."forms_blocks_checkbox" USING btree ("_path");
  CREATE INDEX "forms_blocks_email_order_idx" ON "payload"."forms_blocks_email" USING btree ("_order");
  CREATE INDEX "forms_blocks_email_parent_id_idx" ON "payload"."forms_blocks_email" USING btree ("_parent_id");
  CREATE INDEX "forms_blocks_email_path_idx" ON "payload"."forms_blocks_email" USING btree ("_path");
  CREATE INDEX "forms_blocks_message_order_idx" ON "payload"."forms_blocks_message" USING btree ("_order");
  CREATE INDEX "forms_blocks_message_parent_id_idx" ON "payload"."forms_blocks_message" USING btree ("_parent_id");
  CREATE INDEX "forms_blocks_message_path_idx" ON "payload"."forms_blocks_message" USING btree ("_path");
  CREATE INDEX "forms_blocks_select_options_order_idx" ON "payload"."forms_blocks_select_options" USING btree ("_order");
  CREATE INDEX "forms_blocks_select_options_parent_id_idx" ON "payload"."forms_blocks_select_options" USING btree ("_parent_id");
  CREATE INDEX "forms_blocks_select_order_idx" ON "payload"."forms_blocks_select" USING btree ("_order");
  CREATE INDEX "forms_blocks_select_parent_id_idx" ON "payload"."forms_blocks_select" USING btree ("_parent_id");
  CREATE INDEX "forms_blocks_select_path_idx" ON "payload"."forms_blocks_select" USING btree ("_path");
  CREATE INDEX "forms_blocks_text_order_idx" ON "payload"."forms_blocks_text" USING btree ("_order");
  CREATE INDEX "forms_blocks_text_parent_id_idx" ON "payload"."forms_blocks_text" USING btree ("_parent_id");
  CREATE INDEX "forms_blocks_text_path_idx" ON "payload"."forms_blocks_text" USING btree ("_path");
  CREATE INDEX "forms_blocks_textarea_order_idx" ON "payload"."forms_blocks_textarea" USING btree ("_order");
  CREATE INDEX "forms_blocks_textarea_parent_id_idx" ON "payload"."forms_blocks_textarea" USING btree ("_parent_id");
  CREATE INDEX "forms_blocks_textarea_path_idx" ON "payload"."forms_blocks_textarea" USING btree ("_path");
  CREATE INDEX "forms_emails_order_idx" ON "payload"."forms_emails" USING btree ("_order");
  CREATE INDEX "forms_emails_parent_id_idx" ON "payload"."forms_emails" USING btree ("_parent_id");
  CREATE INDEX "forms_updated_at_idx" ON "payload"."forms" USING btree ("updated_at");
  CREATE INDEX "forms_created_at_idx" ON "payload"."forms" USING btree ("created_at");
  CREATE INDEX "form_submissions_submission_data_order_idx" ON "payload"."form_submissions_submission_data" USING btree ("_order");
  CREATE INDEX "form_submissions_submission_data_parent_id_idx" ON "payload"."form_submissions_submission_data" USING btree ("_parent_id");
  CREATE INDEX "form_submissions_form_idx" ON "payload"."form_submissions" USING btree ("form_id");
  CREATE INDEX "form_submissions_updated_at_idx" ON "payload"."form_submissions" USING btree ("updated_at");
  CREATE INDEX "form_submissions_created_at_idx" ON "payload"."form_submissions" USING btree ("created_at");
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_forms_fk" FOREIGN KEY ("forms_id") REFERENCES "payload"."forms"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_form_submissions_fk" FOREIGN KEY ("form_submissions_id") REFERENCES "payload"."form_submissions"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_forms_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("forms_id");
  CREATE INDEX "payload_locked_documents_rels_form_submissions_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("form_submissions_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload"."forms_blocks_checkbox" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload"."forms_blocks_email" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload"."forms_blocks_message" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload"."forms_blocks_select_options" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload"."forms_blocks_select" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload"."forms_blocks_text" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload"."forms_blocks_textarea" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload"."forms_emails" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload"."forms" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload"."form_submissions_submission_data" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload"."form_submissions" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "payload"."forms_blocks_checkbox" CASCADE;
  DROP TABLE "payload"."forms_blocks_email" CASCADE;
  DROP TABLE "payload"."forms_blocks_message" CASCADE;
  DROP TABLE "payload"."forms_blocks_select_options" CASCADE;
  DROP TABLE "payload"."forms_blocks_select" CASCADE;
  DROP TABLE "payload"."forms_blocks_text" CASCADE;
  DROP TABLE "payload"."forms_blocks_textarea" CASCADE;
  DROP TABLE "payload"."forms_emails" CASCADE;
  DROP TABLE "payload"."forms" CASCADE;
  DROP TABLE "payload"."form_submissions_submission_data" CASCADE;
  DROP TABLE "payload"."form_submissions" CASCADE;
  ALTER TABLE "payload"."payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_forms_fk";
  
  ALTER TABLE "payload"."payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_form_submissions_fk";
  
  DROP INDEX "payload"."payload_locked_documents_rels_forms_id_idx";
  DROP INDEX "payload"."payload_locked_documents_rels_form_submissions_id_idx";
  ALTER TABLE "payload"."payload_locked_documents_rels" DROP COLUMN "forms_id";
  ALTER TABLE "payload"."payload_locked_documents_rels" DROP COLUMN "form_submissions_id";
  DROP TYPE "payload"."enum_forms_confirmation_type";`)
}
