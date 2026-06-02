import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload"."checkout_messages" ADD COLUMN "empty_cart_title" varchar DEFAULT 'Корзина пуста';
  ALTER TABLE "payload"."checkout_messages" ADD COLUMN "empty_cart_subtitle" varchar DEFAULT 'Похоже, вы ещё не выбрали ни одной позиции. Откройте каталог и подберите модель.';
  ALTER TABLE "payload"."checkout_messages" ADD COLUMN "empty_cart_cta_label" varchar DEFAULT 'Перейти в каталог';
  ALTER TABLE "payload"."checkout_messages" ADD COLUMN "empty_cart_cta_href" varchar DEFAULT '/shop';
  ALTER TABLE "payload"."checkout_messages" ADD COLUMN "empty_checkout_title" varchar DEFAULT 'Нечего оформлять';
  ALTER TABLE "payload"."checkout_messages" ADD COLUMN "empty_checkout_subtitle" varchar DEFAULT 'В корзине пока ничего нет. Сначала выберите модели в каталоге.';
  ALTER TABLE "payload"."checkout_messages" ADD COLUMN "empty_checkout_cta_label" varchar DEFAULT 'Перейти в каталог';
  ALTER TABLE "payload"."checkout_messages" ADD COLUMN "empty_checkout_cta_href" varchar DEFAULT '/shop';
  ALTER TABLE "payload"."checkout_messages" ADD COLUMN "not_found_title" varchar DEFAULT 'Страница не найдена';
  ALTER TABLE "payload"."checkout_messages" ADD COLUMN "not_found_subtitle" varchar DEFAULT 'Возможно, ссылка устарела или товар больше не доступен. Загляните в каталог — там точно найдётся то, что вам нужно.';
  ALTER TABLE "payload"."checkout_messages" ADD COLUMN "not_found_primary_cta_label" varchar DEFAULT 'Перейти в каталог';
  ALTER TABLE "payload"."checkout_messages" ADD COLUMN "not_found_primary_cta_href" varchar DEFAULT '/shop';
  ALTER TABLE "payload"."checkout_messages" ADD COLUMN "not_found_secondary_cta_label" varchar DEFAULT 'На главную';
  ALTER TABLE "payload"."checkout_messages" ADD COLUMN "not_found_secondary_cta_href" varchar DEFAULT '/';
  ALTER TABLE "payload"."_checkout_messages_v" ADD COLUMN "version_empty_cart_title" varchar DEFAULT 'Корзина пуста';
  ALTER TABLE "payload"."_checkout_messages_v" ADD COLUMN "version_empty_cart_subtitle" varchar DEFAULT 'Похоже, вы ещё не выбрали ни одной позиции. Откройте каталог и подберите модель.';
  ALTER TABLE "payload"."_checkout_messages_v" ADD COLUMN "version_empty_cart_cta_label" varchar DEFAULT 'Перейти в каталог';
  ALTER TABLE "payload"."_checkout_messages_v" ADD COLUMN "version_empty_cart_cta_href" varchar DEFAULT '/shop';
  ALTER TABLE "payload"."_checkout_messages_v" ADD COLUMN "version_empty_checkout_title" varchar DEFAULT 'Нечего оформлять';
  ALTER TABLE "payload"."_checkout_messages_v" ADD COLUMN "version_empty_checkout_subtitle" varchar DEFAULT 'В корзине пока ничего нет. Сначала выберите модели в каталоге.';
  ALTER TABLE "payload"."_checkout_messages_v" ADD COLUMN "version_empty_checkout_cta_label" varchar DEFAULT 'Перейти в каталог';
  ALTER TABLE "payload"."_checkout_messages_v" ADD COLUMN "version_empty_checkout_cta_href" varchar DEFAULT '/shop';
  ALTER TABLE "payload"."_checkout_messages_v" ADD COLUMN "version_not_found_title" varchar DEFAULT 'Страница не найдена';
  ALTER TABLE "payload"."_checkout_messages_v" ADD COLUMN "version_not_found_subtitle" varchar DEFAULT 'Возможно, ссылка устарела или товар больше не доступен. Загляните в каталог — там точно найдётся то, что вам нужно.';
  ALTER TABLE "payload"."_checkout_messages_v" ADD COLUMN "version_not_found_primary_cta_label" varchar DEFAULT 'Перейти в каталог';
  ALTER TABLE "payload"."_checkout_messages_v" ADD COLUMN "version_not_found_primary_cta_href" varchar DEFAULT '/shop';
  ALTER TABLE "payload"."_checkout_messages_v" ADD COLUMN "version_not_found_secondary_cta_label" varchar DEFAULT 'На главную';
  ALTER TABLE "payload"."_checkout_messages_v" ADD COLUMN "version_not_found_secondary_cta_href" varchar DEFAULT '/';`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload"."checkout_messages" DROP COLUMN "empty_cart_title";
  ALTER TABLE "payload"."checkout_messages" DROP COLUMN "empty_cart_subtitle";
  ALTER TABLE "payload"."checkout_messages" DROP COLUMN "empty_cart_cta_label";
  ALTER TABLE "payload"."checkout_messages" DROP COLUMN "empty_cart_cta_href";
  ALTER TABLE "payload"."checkout_messages" DROP COLUMN "empty_checkout_title";
  ALTER TABLE "payload"."checkout_messages" DROP COLUMN "empty_checkout_subtitle";
  ALTER TABLE "payload"."checkout_messages" DROP COLUMN "empty_checkout_cta_label";
  ALTER TABLE "payload"."checkout_messages" DROP COLUMN "empty_checkout_cta_href";
  ALTER TABLE "payload"."checkout_messages" DROP COLUMN "not_found_title";
  ALTER TABLE "payload"."checkout_messages" DROP COLUMN "not_found_subtitle";
  ALTER TABLE "payload"."checkout_messages" DROP COLUMN "not_found_primary_cta_label";
  ALTER TABLE "payload"."checkout_messages" DROP COLUMN "not_found_primary_cta_href";
  ALTER TABLE "payload"."checkout_messages" DROP COLUMN "not_found_secondary_cta_label";
  ALTER TABLE "payload"."checkout_messages" DROP COLUMN "not_found_secondary_cta_href";
  ALTER TABLE "payload"."_checkout_messages_v" DROP COLUMN "version_empty_cart_title";
  ALTER TABLE "payload"."_checkout_messages_v" DROP COLUMN "version_empty_cart_subtitle";
  ALTER TABLE "payload"."_checkout_messages_v" DROP COLUMN "version_empty_cart_cta_label";
  ALTER TABLE "payload"."_checkout_messages_v" DROP COLUMN "version_empty_cart_cta_href";
  ALTER TABLE "payload"."_checkout_messages_v" DROP COLUMN "version_empty_checkout_title";
  ALTER TABLE "payload"."_checkout_messages_v" DROP COLUMN "version_empty_checkout_subtitle";
  ALTER TABLE "payload"."_checkout_messages_v" DROP COLUMN "version_empty_checkout_cta_label";
  ALTER TABLE "payload"."_checkout_messages_v" DROP COLUMN "version_empty_checkout_cta_href";
  ALTER TABLE "payload"."_checkout_messages_v" DROP COLUMN "version_not_found_title";
  ALTER TABLE "payload"."_checkout_messages_v" DROP COLUMN "version_not_found_subtitle";
  ALTER TABLE "payload"."_checkout_messages_v" DROP COLUMN "version_not_found_primary_cta_label";
  ALTER TABLE "payload"."_checkout_messages_v" DROP COLUMN "version_not_found_primary_cta_href";
  ALTER TABLE "payload"."_checkout_messages_v" DROP COLUMN "version_not_found_secondary_cta_label";
  ALTER TABLE "payload"."_checkout_messages_v" DROP COLUMN "version_not_found_secondary_cta_href";`)
}
