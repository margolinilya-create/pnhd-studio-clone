import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload"."products" ADD COLUMN "meta_title" varchar;
  ALTER TABLE "payload"."products" ADD COLUMN "meta_description" varchar;
  ALTER TABLE "payload"."products" ADD COLUMN "meta_image_id" integer;
  ALTER TABLE "payload"."pages" ADD COLUMN "meta_title" varchar;
  ALTER TABLE "payload"."pages" ADD COLUMN "meta_description" varchar;
  ALTER TABLE "payload"."pages" ADD COLUMN "meta_image_id" integer;
  ALTER TABLE "payload"."products" ADD CONSTRAINT "products_meta_image_id_media_id_fk" FOREIGN KEY ("meta_image_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."pages" ADD CONSTRAINT "pages_meta_image_id_media_id_fk" FOREIGN KEY ("meta_image_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "products_meta_meta_image_idx" ON "payload"."products" USING btree ("meta_image_id");
  CREATE INDEX "pages_meta_meta_image_idx" ON "payload"."pages" USING btree ("meta_image_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload"."products" DROP CONSTRAINT "products_meta_image_id_media_id_fk";
  
  ALTER TABLE "payload"."pages" DROP CONSTRAINT "pages_meta_image_id_media_id_fk";
  
  DROP INDEX "payload"."products_meta_meta_image_idx";
  DROP INDEX "payload"."pages_meta_meta_image_idx";
  ALTER TABLE "payload"."products" DROP COLUMN "meta_title";
  ALTER TABLE "payload"."products" DROP COLUMN "meta_description";
  ALTER TABLE "payload"."products" DROP COLUMN "meta_image_id";
  ALTER TABLE "payload"."pages" DROP COLUMN "meta_title";
  ALTER TABLE "payload"."pages" DROP COLUMN "meta_description";
  ALTER TABLE "payload"."pages" DROP COLUMN "meta_image_id";`)
}
