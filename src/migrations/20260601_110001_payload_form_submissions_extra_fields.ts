import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload"."form_submissions" ADD COLUMN "ip_hash" varchar;
  ALTER TABLE "payload"."form_submissions" ADD COLUMN "user_agent" varchar;
  ALTER TABLE "payload"."form_submissions" ADD COLUMN "bitrix_lead_id" varchar;
  ALTER TABLE "payload"."form_submissions" ADD COLUMN "bitrix_error" varchar;
  CREATE INDEX "form_submissions_ip_hash_idx" ON "payload"."form_submissions" USING btree ("ip_hash");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX "payload"."form_submissions_ip_hash_idx";
  ALTER TABLE "payload"."form_submissions" DROP COLUMN "ip_hash";
  ALTER TABLE "payload"."form_submissions" DROP COLUMN "user_agent";
  ALTER TABLE "payload"."form_submissions" DROP COLUMN "bitrix_lead_id";
  ALTER TABLE "payload"."form_submissions" DROP COLUMN "bitrix_error";`)
}
