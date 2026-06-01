import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "payload"."enum_checkout_messages_status" AS ENUM('draft', 'published');
  CREATE TYPE "payload"."enum__checkout_messages_v_version_status" AS ENUM('draft', 'published');
  CREATE TABLE "payload"."checkout_messages_thanks_c_t_as" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"href" varchar
  );
  
  CREATE TABLE "payload"."checkout_messages" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"cart_page_title" varchar DEFAULT 'Корзина покупок',
  	"cart_manager_disclaimer" varchar DEFAULT 'Стоимость печати рассчитывается менеджером',
  	"checkout_submit_label" varchar DEFAULT 'Оформить заявку',
  	"checkout_disclaimer" varchar DEFAULT 'Стоимость печати рассчитается менеджером по вашему макету. Финальная цена будет согласована перед оплатой.',
  	"thanks_heading" varchar DEFAULT 'СПАСИБО!',
  	"thanks_body" jsonb,
  	"thanks_callback_promise_minutes" numeric DEFAULT 30,
  	"_status" "payload"."enum_checkout_messages_status" DEFAULT 'draft',
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "payload"."_checkout_messages_v_version_thanks_c_t_as" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"href" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "payload"."_checkout_messages_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"version_cart_page_title" varchar DEFAULT 'Корзина покупок',
  	"version_cart_manager_disclaimer" varchar DEFAULT 'Стоимость печати рассчитывается менеджером',
  	"version_checkout_submit_label" varchar DEFAULT 'Оформить заявку',
  	"version_checkout_disclaimer" varchar DEFAULT 'Стоимость печати рассчитается менеджером по вашему макету. Финальная цена будет согласована перед оплатой.',
  	"version_thanks_heading" varchar DEFAULT 'СПАСИБО!',
  	"version_thanks_body" jsonb,
  	"version_thanks_callback_promise_minutes" numeric DEFAULT 30,
  	"version__status" "payload"."enum__checkout_messages_v_version_status" DEFAULT 'draft',
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean,
  	"autosave" boolean
  );
  
  ALTER TABLE "payload"."checkout_messages_thanks_c_t_as" ADD CONSTRAINT "checkout_messages_thanks_c_t_as_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."checkout_messages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."_checkout_messages_v_version_thanks_c_t_as" ADD CONSTRAINT "_checkout_messages_v_version_thanks_c_t_as_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."_checkout_messages_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "checkout_messages_thanks_c_t_as_order_idx" ON "payload"."checkout_messages_thanks_c_t_as" USING btree ("_order");
  CREATE INDEX "checkout_messages_thanks_c_t_as_parent_id_idx" ON "payload"."checkout_messages_thanks_c_t_as" USING btree ("_parent_id");
  CREATE INDEX "checkout_messages__status_idx" ON "payload"."checkout_messages" USING btree ("_status");
  CREATE INDEX "_checkout_messages_v_version_thanks_c_t_as_order_idx" ON "payload"."_checkout_messages_v_version_thanks_c_t_as" USING btree ("_order");
  CREATE INDEX "_checkout_messages_v_version_thanks_c_t_as_parent_id_idx" ON "payload"."_checkout_messages_v_version_thanks_c_t_as" USING btree ("_parent_id");
  CREATE INDEX "_checkout_messages_v_version_version__status_idx" ON "payload"."_checkout_messages_v" USING btree ("version__status");
  CREATE INDEX "_checkout_messages_v_created_at_idx" ON "payload"."_checkout_messages_v" USING btree ("created_at");
  CREATE INDEX "_checkout_messages_v_updated_at_idx" ON "payload"."_checkout_messages_v" USING btree ("updated_at");
  CREATE INDEX "_checkout_messages_v_latest_idx" ON "payload"."_checkout_messages_v" USING btree ("latest");
  CREATE INDEX "_checkout_messages_v_autosave_idx" ON "payload"."_checkout_messages_v" USING btree ("autosave");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "payload"."checkout_messages_thanks_c_t_as" CASCADE;
  DROP TABLE "payload"."checkout_messages" CASCADE;
  DROP TABLE "payload"."_checkout_messages_v_version_thanks_c_t_as" CASCADE;
  DROP TABLE "payload"."_checkout_messages_v" CASCADE;
  DROP TYPE "payload"."enum_checkout_messages_status";
  DROP TYPE "payload"."enum__checkout_messages_v_version_status";`)
}
