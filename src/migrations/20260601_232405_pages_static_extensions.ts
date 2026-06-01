import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "payload"."pages_loyalty_levels" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"level" varchar,
  	"sum" varchar,
  	"cashback" varchar,
  	"label" varchar
  );
  
  CREATE TABLE "payload"."pages_howto_steps" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"body" jsonb,
  	"image_id" integer
  );
  
  CREATE TABLE "payload"."pages_size_chart_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"type" varchar,
  	"label" varchar,
  	"image_id" integer
  );
  
  CREATE TABLE "payload"."_pages_v_version_loyalty_levels" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"level" varchar,
  	"sum" varchar,
  	"cashback" varchar,
  	"label" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "payload"."_pages_v_version_howto_steps" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"body" jsonb,
  	"image_id" integer,
  	"_uuid" varchar
  );
  
  CREATE TABLE "payload"."_pages_v_version_size_chart_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"type" varchar,
  	"label" varchar,
  	"image_id" integer,
  	"_uuid" varchar
  );
  
  ALTER TABLE "payload"."pages_loyalty_levels" ADD CONSTRAINT "pages_loyalty_levels_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."pages_howto_steps" ADD CONSTRAINT "pages_howto_steps_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."pages_howto_steps" ADD CONSTRAINT "pages_howto_steps_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."pages_size_chart_items" ADD CONSTRAINT "pages_size_chart_items_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."pages_size_chart_items" ADD CONSTRAINT "pages_size_chart_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."_pages_v_version_loyalty_levels" ADD CONSTRAINT "_pages_v_version_loyalty_levels_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."_pages_v_version_howto_steps" ADD CONSTRAINT "_pages_v_version_howto_steps_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."_pages_v_version_howto_steps" ADD CONSTRAINT "_pages_v_version_howto_steps_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."_pages_v_version_size_chart_items" ADD CONSTRAINT "_pages_v_version_size_chart_items_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."_pages_v_version_size_chart_items" ADD CONSTRAINT "_pages_v_version_size_chart_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "pages_loyalty_levels_order_idx" ON "payload"."pages_loyalty_levels" USING btree ("_order");
  CREATE INDEX "pages_loyalty_levels_parent_id_idx" ON "payload"."pages_loyalty_levels" USING btree ("_parent_id");
  CREATE INDEX "pages_howto_steps_order_idx" ON "payload"."pages_howto_steps" USING btree ("_order");
  CREATE INDEX "pages_howto_steps_parent_id_idx" ON "payload"."pages_howto_steps" USING btree ("_parent_id");
  CREATE INDEX "pages_howto_steps_image_idx" ON "payload"."pages_howto_steps" USING btree ("image_id");
  CREATE INDEX "pages_size_chart_items_order_idx" ON "payload"."pages_size_chart_items" USING btree ("_order");
  CREATE INDEX "pages_size_chart_items_parent_id_idx" ON "payload"."pages_size_chart_items" USING btree ("_parent_id");
  CREATE INDEX "pages_size_chart_items_image_idx" ON "payload"."pages_size_chart_items" USING btree ("image_id");
  CREATE INDEX "_pages_v_version_loyalty_levels_order_idx" ON "payload"."_pages_v_version_loyalty_levels" USING btree ("_order");
  CREATE INDEX "_pages_v_version_loyalty_levels_parent_id_idx" ON "payload"."_pages_v_version_loyalty_levels" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_version_howto_steps_order_idx" ON "payload"."_pages_v_version_howto_steps" USING btree ("_order");
  CREATE INDEX "_pages_v_version_howto_steps_parent_id_idx" ON "payload"."_pages_v_version_howto_steps" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_version_howto_steps_image_idx" ON "payload"."_pages_v_version_howto_steps" USING btree ("image_id");
  CREATE INDEX "_pages_v_version_size_chart_items_order_idx" ON "payload"."_pages_v_version_size_chart_items" USING btree ("_order");
  CREATE INDEX "_pages_v_version_size_chart_items_parent_id_idx" ON "payload"."_pages_v_version_size_chart_items" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_version_size_chart_items_image_idx" ON "payload"."_pages_v_version_size_chart_items" USING btree ("image_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "payload"."pages_loyalty_levels" CASCADE;
  DROP TABLE "payload"."pages_howto_steps" CASCADE;
  DROP TABLE "payload"."pages_size_chart_items" CASCADE;
  DROP TABLE "payload"."_pages_v_version_loyalty_levels" CASCADE;
  DROP TABLE "payload"."_pages_v_version_howto_steps" CASCADE;
  DROP TABLE "payload"."_pages_v_version_size_chart_items" CASCADE;`)
}
