import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "payload"."enum_navigation_status" AS ENUM('draft', 'published');
  CREATE TYPE "payload"."enum__navigation_v_version_status" AS ENUM('draft', 'published');
  CREATE TABLE "payload"."navigation_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"href" varchar,
  	"hash" varchar,
  	"is_external" boolean DEFAULT false,
  	"show_in_header" boolean DEFAULT true,
  	"show_in_footer" boolean DEFAULT true,
  	"show_in_mobile" boolean DEFAULT true
  );
  
  CREATE TABLE "payload"."navigation" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"_status" "payload"."enum_navigation_status" DEFAULT 'draft',
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "payload"."_navigation_v_version_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"href" varchar,
  	"hash" varchar,
  	"is_external" boolean DEFAULT false,
  	"show_in_header" boolean DEFAULT true,
  	"show_in_footer" boolean DEFAULT true,
  	"show_in_mobile" boolean DEFAULT true,
  	"_uuid" varchar
  );
  
  CREATE TABLE "payload"."_navigation_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"version__status" "payload"."enum__navigation_v_version_status" DEFAULT 'draft',
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean,
  	"autosave" boolean
  );
  
  ALTER TABLE "payload"."navigation_items" ADD CONSTRAINT "navigation_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."navigation"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."_navigation_v_version_items" ADD CONSTRAINT "_navigation_v_version_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."_navigation_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "navigation_items_order_idx" ON "payload"."navigation_items" USING btree ("_order");
  CREATE INDEX "navigation_items_parent_id_idx" ON "payload"."navigation_items" USING btree ("_parent_id");
  CREATE INDEX "navigation__status_idx" ON "payload"."navigation" USING btree ("_status");
  CREATE INDEX "_navigation_v_version_items_order_idx" ON "payload"."_navigation_v_version_items" USING btree ("_order");
  CREATE INDEX "_navigation_v_version_items_parent_id_idx" ON "payload"."_navigation_v_version_items" USING btree ("_parent_id");
  CREATE INDEX "_navigation_v_version_version__status_idx" ON "payload"."_navigation_v" USING btree ("version__status");
  CREATE INDEX "_navigation_v_created_at_idx" ON "payload"."_navigation_v" USING btree ("created_at");
  CREATE INDEX "_navigation_v_updated_at_idx" ON "payload"."_navigation_v" USING btree ("updated_at");
  CREATE INDEX "_navigation_v_latest_idx" ON "payload"."_navigation_v" USING btree ("latest");
  CREATE INDEX "_navigation_v_autosave_idx" ON "payload"."_navigation_v" USING btree ("autosave");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "payload"."navigation_items" CASCADE;
  DROP TABLE "payload"."navigation" CASCADE;
  DROP TABLE "payload"."_navigation_v_version_items" CASCADE;
  DROP TABLE "payload"."_navigation_v" CASCADE;
  DROP TYPE "payload"."enum_navigation_status";
  DROP TYPE "payload"."enum__navigation_v_version_status";`)
}
