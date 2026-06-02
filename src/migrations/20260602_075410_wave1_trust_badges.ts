import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "payload"."enum_products_badge" AS ENUM('none', 'hot', 'new', 'sale', 'order');
  CREATE TYPE "payload"."enum_products_sale_percent" AS ENUM('5', '10', '20', '30', '50');
  CREATE TYPE "payload"."enum_site_settings_trust_items_icon" AS ENUM('factory', 'return', 'quality', 'shipping');
  CREATE TYPE "payload"."enum__site_settings_v_version_trust_items_icon" AS ENUM('factory', 'return', 'quality', 'shipping');
  CREATE TABLE "payload"."site_settings_trust_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"icon" "payload"."enum_site_settings_trust_items_icon",
  	"text" varchar
  );
  
  CREATE TABLE "payload"."_site_settings_v_version_trust_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"icon" "payload"."enum__site_settings_v_version_trust_items_icon",
  	"text" varchar,
  	"_uuid" varchar
  );
  
  ALTER TABLE "payload"."products" ADD COLUMN "badge" "payload"."enum_products_badge" DEFAULT 'none';
  ALTER TABLE "payload"."products" ADD COLUMN "sale_percent" "payload"."enum_products_sale_percent";
  ALTER TABLE "payload"."site_settings_trust_items" ADD CONSTRAINT "site_settings_trust_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."_site_settings_v_version_trust_items" ADD CONSTRAINT "_site_settings_v_version_trust_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."_site_settings_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "site_settings_trust_items_order_idx" ON "payload"."site_settings_trust_items" USING btree ("_order");
  CREATE INDEX "site_settings_trust_items_parent_id_idx" ON "payload"."site_settings_trust_items" USING btree ("_parent_id");
  CREATE INDEX "_site_settings_v_version_trust_items_order_idx" ON "payload"."_site_settings_v_version_trust_items" USING btree ("_order");
  CREATE INDEX "_site_settings_v_version_trust_items_parent_id_idx" ON "payload"."_site_settings_v_version_trust_items" USING btree ("_parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "payload"."site_settings_trust_items" CASCADE;
  DROP TABLE "payload"."_site_settings_v_version_trust_items" CASCADE;
  ALTER TABLE "payload"."products" DROP COLUMN "badge";
  ALTER TABLE "payload"."products" DROP COLUMN "sale_percent";
  DROP TYPE "payload"."enum_products_badge";
  DROP TYPE "payload"."enum_products_sale_percent";
  DROP TYPE "payload"."enum_site_settings_trust_items_icon";
  DROP TYPE "payload"."enum__site_settings_v_version_trust_items_icon";`)
}
