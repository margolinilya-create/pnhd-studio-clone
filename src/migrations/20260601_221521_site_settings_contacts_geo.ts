import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload"."site_settings" ADD COLUMN "opening_hours" varchar DEFAULT 'Пн-Пт 11:00-20:00';
  ALTER TABLE "payload"."site_settings" ADD COLUMN "contacts_email" varchar DEFAULT 'studio@pnhd.ru';
  ALTER TABLE "payload"."site_settings" ADD COLUMN "contacts_address_street" varchar DEFAULT 'ул. Чапыгина, д. 1';
  ALTER TABLE "payload"."site_settings" ADD COLUMN "contacts_address_locality" varchar DEFAULT 'Санкт-Петербург';
  ALTER TABLE "payload"."site_settings" ADD COLUMN "contacts_address_postal_code" varchar DEFAULT '197022';
  ALTER TABLE "payload"."site_settings" ADD COLUMN "contacts_address_country" varchar DEFAULT 'RU';
  ALTER TABLE "payload"."site_settings" ADD COLUMN "geo_latitude" numeric DEFAULT 59.972;
  ALTER TABLE "payload"."site_settings" ADD COLUMN "geo_longitude" numeric DEFAULT 30.318;
  ALTER TABLE "payload"."_site_settings_v" ADD COLUMN "version_opening_hours" varchar DEFAULT 'Пн-Пт 11:00-20:00';
  ALTER TABLE "payload"."_site_settings_v" ADD COLUMN "version_contacts_email" varchar DEFAULT 'studio@pnhd.ru';
  ALTER TABLE "payload"."_site_settings_v" ADD COLUMN "version_contacts_address_street" varchar DEFAULT 'ул. Чапыгина, д. 1';
  ALTER TABLE "payload"."_site_settings_v" ADD COLUMN "version_contacts_address_locality" varchar DEFAULT 'Санкт-Петербург';
  ALTER TABLE "payload"."_site_settings_v" ADD COLUMN "version_contacts_address_postal_code" varchar DEFAULT '197022';
  ALTER TABLE "payload"."_site_settings_v" ADD COLUMN "version_contacts_address_country" varchar DEFAULT 'RU';
  ALTER TABLE "payload"."_site_settings_v" ADD COLUMN "version_geo_latitude" numeric DEFAULT 59.972;
  ALTER TABLE "payload"."_site_settings_v" ADD COLUMN "version_geo_longitude" numeric DEFAULT 30.318;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload"."site_settings" DROP COLUMN "opening_hours";
  ALTER TABLE "payload"."site_settings" DROP COLUMN "contacts_email";
  ALTER TABLE "payload"."site_settings" DROP COLUMN "contacts_address_street";
  ALTER TABLE "payload"."site_settings" DROP COLUMN "contacts_address_locality";
  ALTER TABLE "payload"."site_settings" DROP COLUMN "contacts_address_postal_code";
  ALTER TABLE "payload"."site_settings" DROP COLUMN "contacts_address_country";
  ALTER TABLE "payload"."site_settings" DROP COLUMN "geo_latitude";
  ALTER TABLE "payload"."site_settings" DROP COLUMN "geo_longitude";
  ALTER TABLE "payload"."_site_settings_v" DROP COLUMN "version_opening_hours";
  ALTER TABLE "payload"."_site_settings_v" DROP COLUMN "version_contacts_email";
  ALTER TABLE "payload"."_site_settings_v" DROP COLUMN "version_contacts_address_street";
  ALTER TABLE "payload"."_site_settings_v" DROP COLUMN "version_contacts_address_locality";
  ALTER TABLE "payload"."_site_settings_v" DROP COLUMN "version_contacts_address_postal_code";
  ALTER TABLE "payload"."_site_settings_v" DROP COLUMN "version_contacts_address_country";
  ALTER TABLE "payload"."_site_settings_v" DROP COLUMN "version_geo_latitude";
  ALTER TABLE "payload"."_site_settings_v" DROP COLUMN "version_geo_longitude";`)
}
