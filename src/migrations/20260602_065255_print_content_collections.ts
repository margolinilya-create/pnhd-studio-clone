import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "payload"."print_type_items_gallery" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"path" varchar
  );
  
  CREATE TABLE "payload"."print_type_items" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"slug" varchar NOT NULL,
  	"parent_slug" varchar NOT NULL,
  	"type_slug" varchar NOT NULL,
  	"title" varchar,
  	"subtitle" varchar,
  	"main_text" varchar,
  	"pros" varchar,
  	"cons" varchar,
  	"body_html" varchar,
  	"cover_path" varchar,
  	"meta_title" varchar,
  	"meta_description" varchar,
  	"meta_keywords" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."prints_pages_gallery" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"path" varchar
  );
  
  CREATE TABLE "payload"."prints_pages" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"slug" varchar NOT NULL,
  	"title" varchar,
  	"subtitle" varchar,
  	"main_text" varchar,
  	"body_html" varchar,
  	"cover_path" varchar,
  	"meta_title" varchar,
  	"meta_description" varchar,
  	"meta_keywords" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."textile_pages_gallery" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"path" varchar
  );
  
  CREATE TABLE "payload"."textile_pages" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"slug" varchar NOT NULL,
  	"title" varchar,
  	"subtitle" varchar,
  	"main_text" varchar,
  	"pros" varchar,
  	"cons" varchar,
  	"body_html" varchar,
  	"cover_path" varchar,
  	"meta_title" varchar,
  	"meta_description" varchar,
  	"meta_keywords" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD COLUMN "print_type_items_id" integer;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD COLUMN "prints_pages_id" integer;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD COLUMN "textile_pages_id" integer;
  ALTER TABLE "payload"."print_type_items_gallery" ADD CONSTRAINT "print_type_items_gallery_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."print_type_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."prints_pages_gallery" ADD CONSTRAINT "prints_pages_gallery_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."prints_pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."textile_pages_gallery" ADD CONSTRAINT "textile_pages_gallery_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."textile_pages"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "print_type_items_gallery_order_idx" ON "payload"."print_type_items_gallery" USING btree ("_order");
  CREATE INDEX "print_type_items_gallery_parent_id_idx" ON "payload"."print_type_items_gallery" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "print_type_items_slug_idx" ON "payload"."print_type_items" USING btree ("slug");
  CREATE INDEX "print_type_items_updated_at_idx" ON "payload"."print_type_items" USING btree ("updated_at");
  CREATE INDEX "print_type_items_created_at_idx" ON "payload"."print_type_items" USING btree ("created_at");
  CREATE INDEX "prints_pages_gallery_order_idx" ON "payload"."prints_pages_gallery" USING btree ("_order");
  CREATE INDEX "prints_pages_gallery_parent_id_idx" ON "payload"."prints_pages_gallery" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "prints_pages_slug_idx" ON "payload"."prints_pages" USING btree ("slug");
  CREATE INDEX "prints_pages_updated_at_idx" ON "payload"."prints_pages" USING btree ("updated_at");
  CREATE INDEX "prints_pages_created_at_idx" ON "payload"."prints_pages" USING btree ("created_at");
  CREATE INDEX "textile_pages_gallery_order_idx" ON "payload"."textile_pages_gallery" USING btree ("_order");
  CREATE INDEX "textile_pages_gallery_parent_id_idx" ON "payload"."textile_pages_gallery" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "textile_pages_slug_idx" ON "payload"."textile_pages" USING btree ("slug");
  CREATE INDEX "textile_pages_updated_at_idx" ON "payload"."textile_pages" USING btree ("updated_at");
  CREATE INDEX "textile_pages_created_at_idx" ON "payload"."textile_pages" USING btree ("created_at");
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_print_type_items_fk" FOREIGN KEY ("print_type_items_id") REFERENCES "payload"."print_type_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_prints_pages_fk" FOREIGN KEY ("prints_pages_id") REFERENCES "payload"."prints_pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_textile_pages_fk" FOREIGN KEY ("textile_pages_id") REFERENCES "payload"."textile_pages"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_print_type_items_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("print_type_items_id");
  CREATE INDEX "payload_locked_documents_rels_prints_pages_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("prints_pages_id");
  CREATE INDEX "payload_locked_documents_rels_textile_pages_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("textile_pages_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload"."print_type_items_gallery" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload"."print_type_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload"."prints_pages_gallery" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload"."prints_pages" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload"."textile_pages_gallery" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload"."textile_pages" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "payload"."print_type_items_gallery" CASCADE;
  DROP TABLE "payload"."print_type_items" CASCADE;
  DROP TABLE "payload"."prints_pages_gallery" CASCADE;
  DROP TABLE "payload"."prints_pages" CASCADE;
  DROP TABLE "payload"."textile_pages_gallery" CASCADE;
  DROP TABLE "payload"."textile_pages" CASCADE;
  ALTER TABLE "payload"."payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_print_type_items_fk";
  
  ALTER TABLE "payload"."payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_prints_pages_fk";
  
  ALTER TABLE "payload"."payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_textile_pages_fk";
  
  DROP INDEX "payload"."payload_locked_documents_rels_print_type_items_id_idx";
  DROP INDEX "payload"."payload_locked_documents_rels_prints_pages_id_idx";
  DROP INDEX "payload"."payload_locked_documents_rels_textile_pages_id_idx";
  ALTER TABLE "payload"."payload_locked_documents_rels" DROP COLUMN "print_type_items_id";
  ALTER TABLE "payload"."payload_locked_documents_rels" DROP COLUMN "prints_pages_id";
  ALTER TABLE "payload"."payload_locked_documents_rels" DROP COLUMN "textile_pages_id";`)
}
