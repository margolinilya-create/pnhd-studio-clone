import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "payload"."enum_cookie_bar_status" AS ENUM('draft', 'published');
  CREATE TYPE "payload"."enum__cookie_bar_v_version_status" AS ENUM('draft', 'published');
  CREATE TABLE "payload"."cookie_bar" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"enabled" boolean DEFAULT true,
  	"title" varchar DEFAULT 'МЫ СОБИРАЕМ КУКИ!',
  	"description" jsonb,
  	"button_label" varchar DEFAULT 'ПОНЯЛ, СОГЛАСЕН!',
  	"_status" "payload"."enum_cookie_bar_status" DEFAULT 'draft',
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "payload"."_cookie_bar_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"version_enabled" boolean DEFAULT true,
  	"version_title" varchar DEFAULT 'МЫ СОБИРАЕМ КУКИ!',
  	"version_description" jsonb,
  	"version_button_label" varchar DEFAULT 'ПОНЯЛ, СОГЛАСЕН!',
  	"version__status" "payload"."enum__cookie_bar_v_version_status" DEFAULT 'draft',
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean,
  	"autosave" boolean
  );
  
  CREATE INDEX "cookie_bar__status_idx" ON "payload"."cookie_bar" USING btree ("_status");
  CREATE INDEX "_cookie_bar_v_version_version__status_idx" ON "payload"."_cookie_bar_v" USING btree ("version__status");
  CREATE INDEX "_cookie_bar_v_created_at_idx" ON "payload"."_cookie_bar_v" USING btree ("created_at");
  CREATE INDEX "_cookie_bar_v_updated_at_idx" ON "payload"."_cookie_bar_v" USING btree ("updated_at");
  CREATE INDEX "_cookie_bar_v_latest_idx" ON "payload"."_cookie_bar_v" USING btree ("latest");
  CREATE INDEX "_cookie_bar_v_autosave_idx" ON "payload"."_cookie_bar_v" USING btree ("autosave");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "payload"."cookie_bar" CASCADE;
  DROP TABLE "payload"."_cookie_bar_v" CASCADE;
  DROP TYPE "payload"."enum_cookie_bar_status";
  DROP TYPE "payload"."enum__cookie_bar_v_version_status";`)
}
