import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "payload"."enum_categories_status" AS ENUM('draft', 'published');
  CREATE TYPE "payload"."enum__categories_v_version_status" AS ENUM('draft', 'published');
  CREATE TABLE "payload"."categories_faq_set" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"text" varchar
  );
  
  CREATE TABLE "payload"."_categories_v_version_faq_set" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"text" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "payload"."_categories_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_name" varchar,
  	"version_slug" varchar,
  	"version_h1" varchar,
  	"version_meta_title" varchar,
  	"version_meta_description" varchar,
  	"version_product_type" varchar,
  	"version_body_content" jsonb,
  	"version_hero_image_id" integer,
  	"version_is_landing" boolean DEFAULT false,
  	"version_parent_id" integer,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "payload"."enum__categories_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean,
  	"autosave" boolean
  );
  
  ALTER TABLE "payload"."categories" ALTER COLUMN "name" DROP NOT NULL;
  ALTER TABLE "payload"."categories" ALTER COLUMN "slug" DROP NOT NULL;
  ALTER TABLE "payload"."categories" ADD COLUMN "h1" varchar;
  ALTER TABLE "payload"."categories" ADD COLUMN "meta_title" varchar;
  ALTER TABLE "payload"."categories" ADD COLUMN "meta_description" varchar;
  ALTER TABLE "payload"."categories" ADD COLUMN "product_type" varchar;
  ALTER TABLE "payload"."categories" ADD COLUMN "body_content" jsonb;
  ALTER TABLE "payload"."categories" ADD COLUMN "hero_image_id" integer;
  ALTER TABLE "payload"."categories" ADD COLUMN "is_landing" boolean DEFAULT false;
  ALTER TABLE "payload"."categories" ADD COLUMN "_status" "payload"."enum_categories_status" DEFAULT 'draft';
  ALTER TABLE "payload"."categories_faq_set" ADD CONSTRAINT "categories_faq_set_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."_categories_v_version_faq_set" ADD CONSTRAINT "_categories_v_version_faq_set_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."_categories_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."_categories_v" ADD CONSTRAINT "_categories_v_parent_id_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "payload"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."_categories_v" ADD CONSTRAINT "_categories_v_version_hero_image_id_media_id_fk" FOREIGN KEY ("version_hero_image_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."_categories_v" ADD CONSTRAINT "_categories_v_version_parent_id_categories_id_fk" FOREIGN KEY ("version_parent_id") REFERENCES "payload"."categories"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "categories_faq_set_order_idx" ON "payload"."categories_faq_set" USING btree ("_order");
  CREATE INDEX "categories_faq_set_parent_id_idx" ON "payload"."categories_faq_set" USING btree ("_parent_id");
  CREATE INDEX "_categories_v_version_faq_set_order_idx" ON "payload"."_categories_v_version_faq_set" USING btree ("_order");
  CREATE INDEX "_categories_v_version_faq_set_parent_id_idx" ON "payload"."_categories_v_version_faq_set" USING btree ("_parent_id");
  CREATE INDEX "_categories_v_parent_idx" ON "payload"."_categories_v" USING btree ("parent_id");
  CREATE INDEX "_categories_v_version_version_slug_idx" ON "payload"."_categories_v" USING btree ("version_slug");
  CREATE INDEX "_categories_v_version_version_hero_image_idx" ON "payload"."_categories_v" USING btree ("version_hero_image_id");
  CREATE INDEX "_categories_v_version_version_parent_idx" ON "payload"."_categories_v" USING btree ("version_parent_id");
  CREATE INDEX "_categories_v_version_version_updated_at_idx" ON "payload"."_categories_v" USING btree ("version_updated_at");
  CREATE INDEX "_categories_v_version_version_created_at_idx" ON "payload"."_categories_v" USING btree ("version_created_at");
  CREATE INDEX "_categories_v_version_version__status_idx" ON "payload"."_categories_v" USING btree ("version__status");
  CREATE INDEX "_categories_v_created_at_idx" ON "payload"."_categories_v" USING btree ("created_at");
  CREATE INDEX "_categories_v_updated_at_idx" ON "payload"."_categories_v" USING btree ("updated_at");
  CREATE INDEX "_categories_v_latest_idx" ON "payload"."_categories_v" USING btree ("latest");
  CREATE INDEX "_categories_v_autosave_idx" ON "payload"."_categories_v" USING btree ("autosave");
  ALTER TABLE "payload"."categories" ADD CONSTRAINT "categories_hero_image_id_media_id_fk" FOREIGN KEY ("hero_image_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "categories_hero_image_idx" ON "payload"."categories" USING btree ("hero_image_id");
  CREATE INDEX "categories__status_idx" ON "payload"."categories" USING btree ("_status");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload"."categories_faq_set" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload"."_categories_v_version_faq_set" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload"."_categories_v" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "payload"."categories_faq_set" CASCADE;
  DROP TABLE "payload"."_categories_v_version_faq_set" CASCADE;
  DROP TABLE "payload"."_categories_v" CASCADE;
  ALTER TABLE "payload"."categories" DROP CONSTRAINT "categories_hero_image_id_media_id_fk";
  
  DROP INDEX "payload"."categories_hero_image_idx";
  DROP INDEX "payload"."categories__status_idx";
  ALTER TABLE "payload"."categories" ALTER COLUMN "name" SET NOT NULL;
  ALTER TABLE "payload"."categories" ALTER COLUMN "slug" SET NOT NULL;
  ALTER TABLE "payload"."categories" DROP COLUMN "h1";
  ALTER TABLE "payload"."categories" DROP COLUMN "meta_title";
  ALTER TABLE "payload"."categories" DROP COLUMN "meta_description";
  ALTER TABLE "payload"."categories" DROP COLUMN "product_type";
  ALTER TABLE "payload"."categories" DROP COLUMN "body_content";
  ALTER TABLE "payload"."categories" DROP COLUMN "hero_image_id";
  ALTER TABLE "payload"."categories" DROP COLUMN "is_landing";
  ALTER TABLE "payload"."categories" DROP COLUMN "_status";
  DROP TYPE "payload"."enum_categories_status";
  DROP TYPE "payload"."enum__categories_v_version_status";`)
}
