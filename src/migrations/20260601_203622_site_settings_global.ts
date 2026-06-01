import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "payload"."enum_site_settings_seo_site_lang" AS ENUM('ru', 'en');
  CREATE TYPE "payload"."enum_site_settings_status" AS ENUM('draft', 'published');
  CREATE TYPE "payload"."enum__site_settings_v_version_seo_site_lang" AS ENUM('ru', 'en');
  CREATE TYPE "payload"."enum__site_settings_v_version_status" AS ENUM('draft', 'published');
  CREATE TABLE "payload"."site_settings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"business_hours" varchar DEFAULT 'ежедневно, 11:00–20:00',
  	"phone" varchar DEFAULT '+7 (812) 904 61 56',
  	"site_name" varchar DEFAULT 'PINHEAD STUDIO',
  	"legal_name" varchar DEFAULT 'ООО ПИНХЭД СТУДИО',
  	"inn" varchar DEFAULT '7810463916',
  	"kpp" varchar DEFAULT '781301001',
  	"copyright_start_year" varchar DEFAULT '2021',
  	"header_c_t_a_label" varchar DEFAULT 'Сделать заказ',
  	"mobile_c_t_a_label" varchar DEFAULT 'проконсультироваться',
  	"default_popup_title" varchar DEFAULT 'Воплощай смелые идеи с любым методом нанесения',
  	"madein_russia_label" varchar DEFAULT 'Сделано в России',
  	"madein_russia_enabled" boolean DEFAULT true,
  	"wholesale_url" varchar DEFAULT 'https://pnhd.ru',
  	"social_telegram_url" varchar DEFAULT 'https://t.me/pnhd_studio',
  	"social_telegram_label" varchar DEFAULT 'Написать в Телеграм',
  	"social_whatsapp_url" varchar DEFAULT 'https://wa.me/79313566552',
  	"social_whatsapp_label" varchar DEFAULT 'Написать в Ватсап',
  	"social_max_url" varchar DEFAULT '',
  	"social_max_label" varchar DEFAULT 'Написать в MAX',
  	"analytics_roistat_id" varchar DEFAULT '',
  	"analytics_yandex_metrica_id" varchar DEFAULT '',
  	"analytics_uiscom_key" varchar DEFAULT '',
  	"analytics_yandex_verification" varchar DEFAULT '',
  	"seo_default_o_g_image_id" integer,
  	"seo_site_lang" "payload"."enum_site_settings_seo_site_lang" DEFAULT 'ru',
  	"_status" "payload"."enum_site_settings_status" DEFAULT 'draft',
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "payload"."_site_settings_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"version_business_hours" varchar DEFAULT 'ежедневно, 11:00–20:00',
  	"version_phone" varchar DEFAULT '+7 (812) 904 61 56',
  	"version_site_name" varchar DEFAULT 'PINHEAD STUDIO',
  	"version_legal_name" varchar DEFAULT 'ООО ПИНХЭД СТУДИО',
  	"version_inn" varchar DEFAULT '7810463916',
  	"version_kpp" varchar DEFAULT '781301001',
  	"version_copyright_start_year" varchar DEFAULT '2021',
  	"version_header_c_t_a_label" varchar DEFAULT 'Сделать заказ',
  	"version_mobile_c_t_a_label" varchar DEFAULT 'проконсультироваться',
  	"version_default_popup_title" varchar DEFAULT 'Воплощай смелые идеи с любым методом нанесения',
  	"version_madein_russia_label" varchar DEFAULT 'Сделано в России',
  	"version_madein_russia_enabled" boolean DEFAULT true,
  	"version_wholesale_url" varchar DEFAULT 'https://pnhd.ru',
  	"version_social_telegram_url" varchar DEFAULT 'https://t.me/pnhd_studio',
  	"version_social_telegram_label" varchar DEFAULT 'Написать в Телеграм',
  	"version_social_whatsapp_url" varchar DEFAULT 'https://wa.me/79313566552',
  	"version_social_whatsapp_label" varchar DEFAULT 'Написать в Ватсап',
  	"version_social_max_url" varchar DEFAULT '',
  	"version_social_max_label" varchar DEFAULT 'Написать в MAX',
  	"version_analytics_roistat_id" varchar DEFAULT '',
  	"version_analytics_yandex_metrica_id" varchar DEFAULT '',
  	"version_analytics_uiscom_key" varchar DEFAULT '',
  	"version_analytics_yandex_verification" varchar DEFAULT '',
  	"version_seo_default_o_g_image_id" integer,
  	"version_seo_site_lang" "payload"."enum__site_settings_v_version_seo_site_lang" DEFAULT 'ru',
  	"version__status" "payload"."enum__site_settings_v_version_status" DEFAULT 'draft',
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean,
  	"autosave" boolean
  );
  
  ALTER TABLE "payload"."site_settings" ADD CONSTRAINT "site_settings_seo_default_o_g_image_id_media_id_fk" FOREIGN KEY ("seo_default_o_g_image_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."_site_settings_v" ADD CONSTRAINT "_site_settings_v_version_seo_default_o_g_image_id_media_id_fk" FOREIGN KEY ("version_seo_default_o_g_image_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "site_settings_seo_seo_default_o_g_image_idx" ON "payload"."site_settings" USING btree ("seo_default_o_g_image_id");
  CREATE INDEX "site_settings__status_idx" ON "payload"."site_settings" USING btree ("_status");
  CREATE INDEX "_site_settings_v_version_seo_version_seo_default_o_g_ima_idx" ON "payload"."_site_settings_v" USING btree ("version_seo_default_o_g_image_id");
  CREATE INDEX "_site_settings_v_version_version__status_idx" ON "payload"."_site_settings_v" USING btree ("version__status");
  CREATE INDEX "_site_settings_v_created_at_idx" ON "payload"."_site_settings_v" USING btree ("created_at");
  CREATE INDEX "_site_settings_v_updated_at_idx" ON "payload"."_site_settings_v" USING btree ("updated_at");
  CREATE INDEX "_site_settings_v_latest_idx" ON "payload"."_site_settings_v" USING btree ("latest");
  CREATE INDEX "_site_settings_v_autosave_idx" ON "payload"."_site_settings_v" USING btree ("autosave");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "payload"."site_settings" CASCADE;
  DROP TABLE "payload"."_site_settings_v" CASCADE;
  DROP TYPE "payload"."enum_site_settings_seo_site_lang";
  DROP TYPE "payload"."enum_site_settings_status";
  DROP TYPE "payload"."enum__site_settings_v_version_seo_site_lang";
  DROP TYPE "payload"."enum__site_settings_v_version_status";`)
}
