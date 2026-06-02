import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "payload"."enum_home_page_blocks_category_grid_items_color" AS ENUM('black', 'white');
  CREATE TYPE "payload"."enum_home_page_blocks_category_grid_items_image_slug" AS ENUM('tshirt', 'sweatshirt', 'hoodie', 'pullover', 'totebag', 'cap');
  CREATE TYPE "payload"."enum_home_page_blocks_stages_items_image_slug" AS ENUM('stage1', 'stage2', 'stage3', 'stage4');
  CREATE TYPE "payload"."enum_home_page_blocks_cta_variant" AS ENUM('shop', 'form', 'generic');
  CREATE TYPE "payload"."enum_home_page_status" AS ENUM('draft', 'published');
  CREATE TYPE "payload"."enum__home_page_v_blocks_category_grid_items_color" AS ENUM('black', 'white');
  CREATE TYPE "payload"."enum__home_page_v_blocks_category_grid_items_image_slug" AS ENUM('tshirt', 'sweatshirt', 'hoodie', 'pullover', 'totebag', 'cap');
  CREATE TYPE "payload"."enum__home_page_v_blocks_stages_items_image_slug" AS ENUM('stage1', 'stage2', 'stage3', 'stage4');
  CREATE TYPE "payload"."enum__home_page_v_blocks_cta_variant" AS ENUM('shop', 'form', 'generic');
  CREATE TYPE "payload"."enum__home_page_v_version_status" AS ENUM('draft', 'published');
  CREATE TABLE "payload"."home_page_blocks_hero_rotating_titles" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "payload"."home_page_blocks_hero_methods_list" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "payload"."home_page_blocks_hero_feature_bullets" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "payload"."home_page_blocks_hero" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"cta_label" varchar DEFAULT 'перейти в каталог',
  	"cta_href" varchar DEFAULT '/shop',
  	"show_loyalty_banner" boolean DEFAULT true,
  	"loyalty_eyebrow" varchar DEFAULT 'Программа лояльности Pinhead Studio',
  	"loyalty_title" varchar DEFAULT 'Оплачивайте до 50% заказа бонусами',
  	"loyalty_href" varchar DEFAULT '/loyalty',
  	"block_name" varchar
  );
  
  CREATE TABLE "payload"."home_page_blocks_category_grid_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"href" varchar,
  	"bg_color" varchar DEFAULT '#F3F4F3',
  	"color" "payload"."enum_home_page_blocks_category_grid_items_color" DEFAULT 'black',
  	"image_id" integer,
  	"image_slug" "payload"."enum_home_page_blocks_category_grid_items_image_slug"
  );
  
  CREATE TABLE "payload"."home_page_blocks_category_grid" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"section_title" varchar DEFAULT 'Каталог одежды',
  	"subtitle" varchar DEFAULT 'отражай индивидуальность в мерче',
  	"block_name" varchar
  );
  
  CREATE TABLE "payload"."home_page_blocks_methods_list" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"section_title" varchar DEFAULT 'воплощай смелые идеи',
  	"section_subtitle" varchar DEFAULT 'с любым методом нанесения',
  	"excluded_slugs" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "payload"."home_page_blocks_stages_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"text" varchar,
  	"image_id" integer,
  	"image_slug" "payload"."enum_home_page_blocks_stages_items_image_slug"
  );
  
  CREATE TABLE "payload"."home_page_blocks_stages" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"section_title" varchar DEFAULT 'почувствуй себя дизайнером и собери мерч в онлайн-конструкторе',
  	"cta_href" varchar DEFAULT '/shop',
  	"block_name" varchar
  );
  
  CREATE TABLE "payload"."home_page_blocks_pricing_table_rows_cells" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"format" varchar,
  	"price" varchar
  );
  
  CREATE TABLE "payload"."home_page_blocks_pricing_table_rows" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"method" varchar,
  	"caption" varchar
  );
  
  CREATE TABLE "payload"."home_page_blocks_pricing_table" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"section_title" varchar DEFAULT 'Рассчитайте стоимость уникального мерча',
  	"section_subtitle" varchar DEFAULT 'Делаем яркие принты на любом текстиле: от скромного логотипа до сложных полноцветных изображений на всей поверхности вещи.',
  	"main_block_text" varchar DEFAULT 'Скидки на тиражи от 10 штук уточняй у менеджеров',
  	"main_block_cta_label" varchar DEFAULT 'Заказать срочную печать',
  	"main_block_popup_title" varchar DEFAULT 'Срочный тираж — обсудим сроки и стоимость',
  	"side_info_text" varchar DEFAULT 'При печати на своей вещи стоимость не увеличивается',
  	"block_name" varchar
  );
  
  CREATE TABLE "payload"."home_page_blocks_about_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"text" varchar
  );
  
  CREATE TABLE "payload"."home_page_blocks_about" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar DEFAULT 'Создаем мерч с 2015 года',
  	"highlight" varchar DEFAULT '2015',
  	"subtitle" varchar DEFAULT 'Мы не просто наносим принты — мы воплощаем ваши идеи. От безумных рисунков до личных фраз, которые будут видны издалека. Создаём стильную одежду для вас, ваших друзей и всей семьи, используя передовые технологии.',
  	"block_name" varchar
  );
  
  CREATE TABLE "payload"."home_page_blocks_testimonials_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"author" varchar,
  	"text" varchar,
  	"rating" numeric DEFAULT 5,
  	"photo_id" integer
  );
  
  CREATE TABLE "payload"."home_page_blocks_testimonials" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"section_title" varchar DEFAULT 'когда говорят о топовых принтах и заботливом сервисе, говорят о нас',
  	"rating_value" varchar DEFAULT '5,0',
  	"rating_text" varchar DEFAULT 'Оценка на Yandex и Google',
  	"yandex_url" varchar DEFAULT 'https://yandex.ru/profile/183887374171',
  	"google_url" varchar DEFAULT 'https://maps.app.goo.gl/vhWL7yY1VUQUGZ5SA',
  	"block_name" varchar
  );
  
  CREATE TABLE "payload"."home_page_blocks_faq_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"question" varchar,
  	"answer" varchar
  );
  
  CREATE TABLE "payload"."home_page_blocks_faq" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"section_title" varchar DEFAULT 'frequently asked questions',
  	"block_name" varchar
  );
  
  CREATE TABLE "payload"."home_page_blocks_cta" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"title" varchar,
  	"subtitle" varchar,
  	"description" varchar,
  	"cta_label" varchar,
  	"cta_href" varchar,
  	"is_external" boolean DEFAULT false,
  	"variant" "payload"."enum_home_page_blocks_cta_variant" DEFAULT 'shop',
  	"block_name" varchar
  );
  
  CREATE TABLE "payload"."home_page" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"_status" "payload"."enum_home_page_status" DEFAULT 'draft',
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "payload"."_home_page_v_blocks_hero_rotating_titles" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"text" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "payload"."_home_page_v_blocks_hero_methods_list" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"text" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "payload"."_home_page_v_blocks_hero_feature_bullets" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"text" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "payload"."_home_page_v_blocks_hero" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"cta_label" varchar DEFAULT 'перейти в каталог',
  	"cta_href" varchar DEFAULT '/shop',
  	"show_loyalty_banner" boolean DEFAULT true,
  	"loyalty_eyebrow" varchar DEFAULT 'Программа лояльности Pinhead Studio',
  	"loyalty_title" varchar DEFAULT 'Оплачивайте до 50% заказа бонусами',
  	"loyalty_href" varchar DEFAULT '/loyalty',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "payload"."_home_page_v_blocks_category_grid_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"href" varchar,
  	"bg_color" varchar DEFAULT '#F3F4F3',
  	"color" "payload"."enum__home_page_v_blocks_category_grid_items_color" DEFAULT 'black',
  	"image_id" integer,
  	"image_slug" "payload"."enum__home_page_v_blocks_category_grid_items_image_slug",
  	"_uuid" varchar
  );
  
  CREATE TABLE "payload"."_home_page_v_blocks_category_grid" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"section_title" varchar DEFAULT 'Каталог одежды',
  	"subtitle" varchar DEFAULT 'отражай индивидуальность в мерче',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "payload"."_home_page_v_blocks_methods_list" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"section_title" varchar DEFAULT 'воплощай смелые идеи',
  	"section_subtitle" varchar DEFAULT 'с любым методом нанесения',
  	"excluded_slugs" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "payload"."_home_page_v_blocks_stages_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"text" varchar,
  	"image_id" integer,
  	"image_slug" "payload"."enum__home_page_v_blocks_stages_items_image_slug",
  	"_uuid" varchar
  );
  
  CREATE TABLE "payload"."_home_page_v_blocks_stages" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"section_title" varchar DEFAULT 'почувствуй себя дизайнером и собери мерч в онлайн-конструкторе',
  	"cta_href" varchar DEFAULT '/shop',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "payload"."_home_page_v_blocks_pricing_table_rows_cells" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"format" varchar,
  	"price" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "payload"."_home_page_v_blocks_pricing_table_rows" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"method" varchar,
  	"caption" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "payload"."_home_page_v_blocks_pricing_table" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"section_title" varchar DEFAULT 'Рассчитайте стоимость уникального мерча',
  	"section_subtitle" varchar DEFAULT 'Делаем яркие принты на любом текстиле: от скромного логотипа до сложных полноцветных изображений на всей поверхности вещи.',
  	"main_block_text" varchar DEFAULT 'Скидки на тиражи от 10 штук уточняй у менеджеров',
  	"main_block_cta_label" varchar DEFAULT 'Заказать срочную печать',
  	"main_block_popup_title" varchar DEFAULT 'Срочный тираж — обсудим сроки и стоимость',
  	"side_info_text" varchar DEFAULT 'При печати на своей вещи стоимость не увеличивается',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "payload"."_home_page_v_blocks_about_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"text" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "payload"."_home_page_v_blocks_about" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar DEFAULT 'Создаем мерч с 2015 года',
  	"highlight" varchar DEFAULT '2015',
  	"subtitle" varchar DEFAULT 'Мы не просто наносим принты — мы воплощаем ваши идеи. От безумных рисунков до личных фраз, которые будут видны издалека. Создаём стильную одежду для вас, ваших друзей и всей семьи, используя передовые технологии.',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "payload"."_home_page_v_blocks_testimonials_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"author" varchar,
  	"text" varchar,
  	"rating" numeric DEFAULT 5,
  	"photo_id" integer,
  	"_uuid" varchar
  );
  
  CREATE TABLE "payload"."_home_page_v_blocks_testimonials" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"section_title" varchar DEFAULT 'когда говорят о топовых принтах и заботливом сервисе, говорят о нас',
  	"rating_value" varchar DEFAULT '5,0',
  	"rating_text" varchar DEFAULT 'Оценка на Yandex и Google',
  	"yandex_url" varchar DEFAULT 'https://yandex.ru/profile/183887374171',
  	"google_url" varchar DEFAULT 'https://maps.app.goo.gl/vhWL7yY1VUQUGZ5SA',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "payload"."_home_page_v_blocks_faq_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"question" varchar,
  	"answer" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "payload"."_home_page_v_blocks_faq" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"section_title" varchar DEFAULT 'frequently asked questions',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "payload"."_home_page_v_blocks_cta" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"title" varchar,
  	"subtitle" varchar,
  	"description" varchar,
  	"cta_label" varchar,
  	"cta_href" varchar,
  	"is_external" boolean DEFAULT false,
  	"variant" "payload"."enum__home_page_v_blocks_cta_variant" DEFAULT 'shop',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "payload"."_home_page_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"version__status" "payload"."enum__home_page_v_version_status" DEFAULT 'draft',
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean,
  	"autosave" boolean
  );
  
  ALTER TABLE "payload"."home_page_blocks_hero_rotating_titles" ADD CONSTRAINT "home_page_blocks_hero_rotating_titles_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."home_page_blocks_hero"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."home_page_blocks_hero_methods_list" ADD CONSTRAINT "home_page_blocks_hero_methods_list_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."home_page_blocks_hero"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."home_page_blocks_hero_feature_bullets" ADD CONSTRAINT "home_page_blocks_hero_feature_bullets_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."home_page_blocks_hero"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."home_page_blocks_hero" ADD CONSTRAINT "home_page_blocks_hero_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."home_page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."home_page_blocks_category_grid_items" ADD CONSTRAINT "home_page_blocks_category_grid_items_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."home_page_blocks_category_grid_items" ADD CONSTRAINT "home_page_blocks_category_grid_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."home_page_blocks_category_grid"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."home_page_blocks_category_grid" ADD CONSTRAINT "home_page_blocks_category_grid_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."home_page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."home_page_blocks_methods_list" ADD CONSTRAINT "home_page_blocks_methods_list_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."home_page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."home_page_blocks_stages_items" ADD CONSTRAINT "home_page_blocks_stages_items_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."home_page_blocks_stages_items" ADD CONSTRAINT "home_page_blocks_stages_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."home_page_blocks_stages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."home_page_blocks_stages" ADD CONSTRAINT "home_page_blocks_stages_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."home_page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."home_page_blocks_pricing_table_rows_cells" ADD CONSTRAINT "home_page_blocks_pricing_table_rows_cells_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."home_page_blocks_pricing_table_rows"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."home_page_blocks_pricing_table_rows" ADD CONSTRAINT "home_page_blocks_pricing_table_rows_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."home_page_blocks_pricing_table"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."home_page_blocks_pricing_table" ADD CONSTRAINT "home_page_blocks_pricing_table_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."home_page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."home_page_blocks_about_items" ADD CONSTRAINT "home_page_blocks_about_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."home_page_blocks_about"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."home_page_blocks_about" ADD CONSTRAINT "home_page_blocks_about_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."home_page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."home_page_blocks_testimonials_items" ADD CONSTRAINT "home_page_blocks_testimonials_items_photo_id_media_id_fk" FOREIGN KEY ("photo_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."home_page_blocks_testimonials_items" ADD CONSTRAINT "home_page_blocks_testimonials_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."home_page_blocks_testimonials"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."home_page_blocks_testimonials" ADD CONSTRAINT "home_page_blocks_testimonials_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."home_page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."home_page_blocks_faq_items" ADD CONSTRAINT "home_page_blocks_faq_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."home_page_blocks_faq"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."home_page_blocks_faq" ADD CONSTRAINT "home_page_blocks_faq_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."home_page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."home_page_blocks_cta" ADD CONSTRAINT "home_page_blocks_cta_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."home_page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."_home_page_v_blocks_hero_rotating_titles" ADD CONSTRAINT "_home_page_v_blocks_hero_rotating_titles_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."_home_page_v_blocks_hero"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."_home_page_v_blocks_hero_methods_list" ADD CONSTRAINT "_home_page_v_blocks_hero_methods_list_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."_home_page_v_blocks_hero"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."_home_page_v_blocks_hero_feature_bullets" ADD CONSTRAINT "_home_page_v_blocks_hero_feature_bullets_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."_home_page_v_blocks_hero"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."_home_page_v_blocks_hero" ADD CONSTRAINT "_home_page_v_blocks_hero_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."_home_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."_home_page_v_blocks_category_grid_items" ADD CONSTRAINT "_home_page_v_blocks_category_grid_items_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."_home_page_v_blocks_category_grid_items" ADD CONSTRAINT "_home_page_v_blocks_category_grid_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."_home_page_v_blocks_category_grid"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."_home_page_v_blocks_category_grid" ADD CONSTRAINT "_home_page_v_blocks_category_grid_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."_home_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."_home_page_v_blocks_methods_list" ADD CONSTRAINT "_home_page_v_blocks_methods_list_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."_home_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."_home_page_v_blocks_stages_items" ADD CONSTRAINT "_home_page_v_blocks_stages_items_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."_home_page_v_blocks_stages_items" ADD CONSTRAINT "_home_page_v_blocks_stages_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."_home_page_v_blocks_stages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."_home_page_v_blocks_stages" ADD CONSTRAINT "_home_page_v_blocks_stages_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."_home_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."_home_page_v_blocks_pricing_table_rows_cells" ADD CONSTRAINT "_home_page_v_blocks_pricing_table_rows_cells_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."_home_page_v_blocks_pricing_table_rows"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."_home_page_v_blocks_pricing_table_rows" ADD CONSTRAINT "_home_page_v_blocks_pricing_table_rows_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."_home_page_v_blocks_pricing_table"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."_home_page_v_blocks_pricing_table" ADD CONSTRAINT "_home_page_v_blocks_pricing_table_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."_home_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."_home_page_v_blocks_about_items" ADD CONSTRAINT "_home_page_v_blocks_about_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."_home_page_v_blocks_about"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."_home_page_v_blocks_about" ADD CONSTRAINT "_home_page_v_blocks_about_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."_home_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."_home_page_v_blocks_testimonials_items" ADD CONSTRAINT "_home_page_v_blocks_testimonials_items_photo_id_media_id_fk" FOREIGN KEY ("photo_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."_home_page_v_blocks_testimonials_items" ADD CONSTRAINT "_home_page_v_blocks_testimonials_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."_home_page_v_blocks_testimonials"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."_home_page_v_blocks_testimonials" ADD CONSTRAINT "_home_page_v_blocks_testimonials_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."_home_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."_home_page_v_blocks_faq_items" ADD CONSTRAINT "_home_page_v_blocks_faq_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."_home_page_v_blocks_faq"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."_home_page_v_blocks_faq" ADD CONSTRAINT "_home_page_v_blocks_faq_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."_home_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."_home_page_v_blocks_cta" ADD CONSTRAINT "_home_page_v_blocks_cta_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."_home_page_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "home_page_blocks_hero_rotating_titles_order_idx" ON "payload"."home_page_blocks_hero_rotating_titles" USING btree ("_order");
  CREATE INDEX "home_page_blocks_hero_rotating_titles_parent_id_idx" ON "payload"."home_page_blocks_hero_rotating_titles" USING btree ("_parent_id");
  CREATE INDEX "home_page_blocks_hero_methods_list_order_idx" ON "payload"."home_page_blocks_hero_methods_list" USING btree ("_order");
  CREATE INDEX "home_page_blocks_hero_methods_list_parent_id_idx" ON "payload"."home_page_blocks_hero_methods_list" USING btree ("_parent_id");
  CREATE INDEX "home_page_blocks_hero_feature_bullets_order_idx" ON "payload"."home_page_blocks_hero_feature_bullets" USING btree ("_order");
  CREATE INDEX "home_page_blocks_hero_feature_bullets_parent_id_idx" ON "payload"."home_page_blocks_hero_feature_bullets" USING btree ("_parent_id");
  CREATE INDEX "home_page_blocks_hero_order_idx" ON "payload"."home_page_blocks_hero" USING btree ("_order");
  CREATE INDEX "home_page_blocks_hero_parent_id_idx" ON "payload"."home_page_blocks_hero" USING btree ("_parent_id");
  CREATE INDEX "home_page_blocks_hero_path_idx" ON "payload"."home_page_blocks_hero" USING btree ("_path");
  CREATE INDEX "home_page_blocks_category_grid_items_order_idx" ON "payload"."home_page_blocks_category_grid_items" USING btree ("_order");
  CREATE INDEX "home_page_blocks_category_grid_items_parent_id_idx" ON "payload"."home_page_blocks_category_grid_items" USING btree ("_parent_id");
  CREATE INDEX "home_page_blocks_category_grid_items_image_idx" ON "payload"."home_page_blocks_category_grid_items" USING btree ("image_id");
  CREATE INDEX "home_page_blocks_category_grid_order_idx" ON "payload"."home_page_blocks_category_grid" USING btree ("_order");
  CREATE INDEX "home_page_blocks_category_grid_parent_id_idx" ON "payload"."home_page_blocks_category_grid" USING btree ("_parent_id");
  CREATE INDEX "home_page_blocks_category_grid_path_idx" ON "payload"."home_page_blocks_category_grid" USING btree ("_path");
  CREATE INDEX "home_page_blocks_methods_list_order_idx" ON "payload"."home_page_blocks_methods_list" USING btree ("_order");
  CREATE INDEX "home_page_blocks_methods_list_parent_id_idx" ON "payload"."home_page_blocks_methods_list" USING btree ("_parent_id");
  CREATE INDEX "home_page_blocks_methods_list_path_idx" ON "payload"."home_page_blocks_methods_list" USING btree ("_path");
  CREATE INDEX "home_page_blocks_stages_items_order_idx" ON "payload"."home_page_blocks_stages_items" USING btree ("_order");
  CREATE INDEX "home_page_blocks_stages_items_parent_id_idx" ON "payload"."home_page_blocks_stages_items" USING btree ("_parent_id");
  CREATE INDEX "home_page_blocks_stages_items_image_idx" ON "payload"."home_page_blocks_stages_items" USING btree ("image_id");
  CREATE INDEX "home_page_blocks_stages_order_idx" ON "payload"."home_page_blocks_stages" USING btree ("_order");
  CREATE INDEX "home_page_blocks_stages_parent_id_idx" ON "payload"."home_page_blocks_stages" USING btree ("_parent_id");
  CREATE INDEX "home_page_blocks_stages_path_idx" ON "payload"."home_page_blocks_stages" USING btree ("_path");
  CREATE INDEX "home_page_blocks_pricing_table_rows_cells_order_idx" ON "payload"."home_page_blocks_pricing_table_rows_cells" USING btree ("_order");
  CREATE INDEX "home_page_blocks_pricing_table_rows_cells_parent_id_idx" ON "payload"."home_page_blocks_pricing_table_rows_cells" USING btree ("_parent_id");
  CREATE INDEX "home_page_blocks_pricing_table_rows_order_idx" ON "payload"."home_page_blocks_pricing_table_rows" USING btree ("_order");
  CREATE INDEX "home_page_blocks_pricing_table_rows_parent_id_idx" ON "payload"."home_page_blocks_pricing_table_rows" USING btree ("_parent_id");
  CREATE INDEX "home_page_blocks_pricing_table_order_idx" ON "payload"."home_page_blocks_pricing_table" USING btree ("_order");
  CREATE INDEX "home_page_blocks_pricing_table_parent_id_idx" ON "payload"."home_page_blocks_pricing_table" USING btree ("_parent_id");
  CREATE INDEX "home_page_blocks_pricing_table_path_idx" ON "payload"."home_page_blocks_pricing_table" USING btree ("_path");
  CREATE INDEX "home_page_blocks_about_items_order_idx" ON "payload"."home_page_blocks_about_items" USING btree ("_order");
  CREATE INDEX "home_page_blocks_about_items_parent_id_idx" ON "payload"."home_page_blocks_about_items" USING btree ("_parent_id");
  CREATE INDEX "home_page_blocks_about_order_idx" ON "payload"."home_page_blocks_about" USING btree ("_order");
  CREATE INDEX "home_page_blocks_about_parent_id_idx" ON "payload"."home_page_blocks_about" USING btree ("_parent_id");
  CREATE INDEX "home_page_blocks_about_path_idx" ON "payload"."home_page_blocks_about" USING btree ("_path");
  CREATE INDEX "home_page_blocks_testimonials_items_order_idx" ON "payload"."home_page_blocks_testimonials_items" USING btree ("_order");
  CREATE INDEX "home_page_blocks_testimonials_items_parent_id_idx" ON "payload"."home_page_blocks_testimonials_items" USING btree ("_parent_id");
  CREATE INDEX "home_page_blocks_testimonials_items_photo_idx" ON "payload"."home_page_blocks_testimonials_items" USING btree ("photo_id");
  CREATE INDEX "home_page_blocks_testimonials_order_idx" ON "payload"."home_page_blocks_testimonials" USING btree ("_order");
  CREATE INDEX "home_page_blocks_testimonials_parent_id_idx" ON "payload"."home_page_blocks_testimonials" USING btree ("_parent_id");
  CREATE INDEX "home_page_blocks_testimonials_path_idx" ON "payload"."home_page_blocks_testimonials" USING btree ("_path");
  CREATE INDEX "home_page_blocks_faq_items_order_idx" ON "payload"."home_page_blocks_faq_items" USING btree ("_order");
  CREATE INDEX "home_page_blocks_faq_items_parent_id_idx" ON "payload"."home_page_blocks_faq_items" USING btree ("_parent_id");
  CREATE INDEX "home_page_blocks_faq_order_idx" ON "payload"."home_page_blocks_faq" USING btree ("_order");
  CREATE INDEX "home_page_blocks_faq_parent_id_idx" ON "payload"."home_page_blocks_faq" USING btree ("_parent_id");
  CREATE INDEX "home_page_blocks_faq_path_idx" ON "payload"."home_page_blocks_faq" USING btree ("_path");
  CREATE INDEX "home_page_blocks_cta_order_idx" ON "payload"."home_page_blocks_cta" USING btree ("_order");
  CREATE INDEX "home_page_blocks_cta_parent_id_idx" ON "payload"."home_page_blocks_cta" USING btree ("_parent_id");
  CREATE INDEX "home_page_blocks_cta_path_idx" ON "payload"."home_page_blocks_cta" USING btree ("_path");
  CREATE INDEX "home_page__status_idx" ON "payload"."home_page" USING btree ("_status");
  CREATE INDEX "_home_page_v_blocks_hero_rotating_titles_order_idx" ON "payload"."_home_page_v_blocks_hero_rotating_titles" USING btree ("_order");
  CREATE INDEX "_home_page_v_blocks_hero_rotating_titles_parent_id_idx" ON "payload"."_home_page_v_blocks_hero_rotating_titles" USING btree ("_parent_id");
  CREATE INDEX "_home_page_v_blocks_hero_methods_list_order_idx" ON "payload"."_home_page_v_blocks_hero_methods_list" USING btree ("_order");
  CREATE INDEX "_home_page_v_blocks_hero_methods_list_parent_id_idx" ON "payload"."_home_page_v_blocks_hero_methods_list" USING btree ("_parent_id");
  CREATE INDEX "_home_page_v_blocks_hero_feature_bullets_order_idx" ON "payload"."_home_page_v_blocks_hero_feature_bullets" USING btree ("_order");
  CREATE INDEX "_home_page_v_blocks_hero_feature_bullets_parent_id_idx" ON "payload"."_home_page_v_blocks_hero_feature_bullets" USING btree ("_parent_id");
  CREATE INDEX "_home_page_v_blocks_hero_order_idx" ON "payload"."_home_page_v_blocks_hero" USING btree ("_order");
  CREATE INDEX "_home_page_v_blocks_hero_parent_id_idx" ON "payload"."_home_page_v_blocks_hero" USING btree ("_parent_id");
  CREATE INDEX "_home_page_v_blocks_hero_path_idx" ON "payload"."_home_page_v_blocks_hero" USING btree ("_path");
  CREATE INDEX "_home_page_v_blocks_category_grid_items_order_idx" ON "payload"."_home_page_v_blocks_category_grid_items" USING btree ("_order");
  CREATE INDEX "_home_page_v_blocks_category_grid_items_parent_id_idx" ON "payload"."_home_page_v_blocks_category_grid_items" USING btree ("_parent_id");
  CREATE INDEX "_home_page_v_blocks_category_grid_items_image_idx" ON "payload"."_home_page_v_blocks_category_grid_items" USING btree ("image_id");
  CREATE INDEX "_home_page_v_blocks_category_grid_order_idx" ON "payload"."_home_page_v_blocks_category_grid" USING btree ("_order");
  CREATE INDEX "_home_page_v_blocks_category_grid_parent_id_idx" ON "payload"."_home_page_v_blocks_category_grid" USING btree ("_parent_id");
  CREATE INDEX "_home_page_v_blocks_category_grid_path_idx" ON "payload"."_home_page_v_blocks_category_grid" USING btree ("_path");
  CREATE INDEX "_home_page_v_blocks_methods_list_order_idx" ON "payload"."_home_page_v_blocks_methods_list" USING btree ("_order");
  CREATE INDEX "_home_page_v_blocks_methods_list_parent_id_idx" ON "payload"."_home_page_v_blocks_methods_list" USING btree ("_parent_id");
  CREATE INDEX "_home_page_v_blocks_methods_list_path_idx" ON "payload"."_home_page_v_blocks_methods_list" USING btree ("_path");
  CREATE INDEX "_home_page_v_blocks_stages_items_order_idx" ON "payload"."_home_page_v_blocks_stages_items" USING btree ("_order");
  CREATE INDEX "_home_page_v_blocks_stages_items_parent_id_idx" ON "payload"."_home_page_v_blocks_stages_items" USING btree ("_parent_id");
  CREATE INDEX "_home_page_v_blocks_stages_items_image_idx" ON "payload"."_home_page_v_blocks_stages_items" USING btree ("image_id");
  CREATE INDEX "_home_page_v_blocks_stages_order_idx" ON "payload"."_home_page_v_blocks_stages" USING btree ("_order");
  CREATE INDEX "_home_page_v_blocks_stages_parent_id_idx" ON "payload"."_home_page_v_blocks_stages" USING btree ("_parent_id");
  CREATE INDEX "_home_page_v_blocks_stages_path_idx" ON "payload"."_home_page_v_blocks_stages" USING btree ("_path");
  CREATE INDEX "_home_page_v_blocks_pricing_table_rows_cells_order_idx" ON "payload"."_home_page_v_blocks_pricing_table_rows_cells" USING btree ("_order");
  CREATE INDEX "_home_page_v_blocks_pricing_table_rows_cells_parent_id_idx" ON "payload"."_home_page_v_blocks_pricing_table_rows_cells" USING btree ("_parent_id");
  CREATE INDEX "_home_page_v_blocks_pricing_table_rows_order_idx" ON "payload"."_home_page_v_blocks_pricing_table_rows" USING btree ("_order");
  CREATE INDEX "_home_page_v_blocks_pricing_table_rows_parent_id_idx" ON "payload"."_home_page_v_blocks_pricing_table_rows" USING btree ("_parent_id");
  CREATE INDEX "_home_page_v_blocks_pricing_table_order_idx" ON "payload"."_home_page_v_blocks_pricing_table" USING btree ("_order");
  CREATE INDEX "_home_page_v_blocks_pricing_table_parent_id_idx" ON "payload"."_home_page_v_blocks_pricing_table" USING btree ("_parent_id");
  CREATE INDEX "_home_page_v_blocks_pricing_table_path_idx" ON "payload"."_home_page_v_blocks_pricing_table" USING btree ("_path");
  CREATE INDEX "_home_page_v_blocks_about_items_order_idx" ON "payload"."_home_page_v_blocks_about_items" USING btree ("_order");
  CREATE INDEX "_home_page_v_blocks_about_items_parent_id_idx" ON "payload"."_home_page_v_blocks_about_items" USING btree ("_parent_id");
  CREATE INDEX "_home_page_v_blocks_about_order_idx" ON "payload"."_home_page_v_blocks_about" USING btree ("_order");
  CREATE INDEX "_home_page_v_blocks_about_parent_id_idx" ON "payload"."_home_page_v_blocks_about" USING btree ("_parent_id");
  CREATE INDEX "_home_page_v_blocks_about_path_idx" ON "payload"."_home_page_v_blocks_about" USING btree ("_path");
  CREATE INDEX "_home_page_v_blocks_testimonials_items_order_idx" ON "payload"."_home_page_v_blocks_testimonials_items" USING btree ("_order");
  CREATE INDEX "_home_page_v_blocks_testimonials_items_parent_id_idx" ON "payload"."_home_page_v_blocks_testimonials_items" USING btree ("_parent_id");
  CREATE INDEX "_home_page_v_blocks_testimonials_items_photo_idx" ON "payload"."_home_page_v_blocks_testimonials_items" USING btree ("photo_id");
  CREATE INDEX "_home_page_v_blocks_testimonials_order_idx" ON "payload"."_home_page_v_blocks_testimonials" USING btree ("_order");
  CREATE INDEX "_home_page_v_blocks_testimonials_parent_id_idx" ON "payload"."_home_page_v_blocks_testimonials" USING btree ("_parent_id");
  CREATE INDEX "_home_page_v_blocks_testimonials_path_idx" ON "payload"."_home_page_v_blocks_testimonials" USING btree ("_path");
  CREATE INDEX "_home_page_v_blocks_faq_items_order_idx" ON "payload"."_home_page_v_blocks_faq_items" USING btree ("_order");
  CREATE INDEX "_home_page_v_blocks_faq_items_parent_id_idx" ON "payload"."_home_page_v_blocks_faq_items" USING btree ("_parent_id");
  CREATE INDEX "_home_page_v_blocks_faq_order_idx" ON "payload"."_home_page_v_blocks_faq" USING btree ("_order");
  CREATE INDEX "_home_page_v_blocks_faq_parent_id_idx" ON "payload"."_home_page_v_blocks_faq" USING btree ("_parent_id");
  CREATE INDEX "_home_page_v_blocks_faq_path_idx" ON "payload"."_home_page_v_blocks_faq" USING btree ("_path");
  CREATE INDEX "_home_page_v_blocks_cta_order_idx" ON "payload"."_home_page_v_blocks_cta" USING btree ("_order");
  CREATE INDEX "_home_page_v_blocks_cta_parent_id_idx" ON "payload"."_home_page_v_blocks_cta" USING btree ("_parent_id");
  CREATE INDEX "_home_page_v_blocks_cta_path_idx" ON "payload"."_home_page_v_blocks_cta" USING btree ("_path");
  CREATE INDEX "_home_page_v_version_version__status_idx" ON "payload"."_home_page_v" USING btree ("version__status");
  CREATE INDEX "_home_page_v_created_at_idx" ON "payload"."_home_page_v" USING btree ("created_at");
  CREATE INDEX "_home_page_v_updated_at_idx" ON "payload"."_home_page_v" USING btree ("updated_at");
  CREATE INDEX "_home_page_v_latest_idx" ON "payload"."_home_page_v" USING btree ("latest");
  CREATE INDEX "_home_page_v_autosave_idx" ON "payload"."_home_page_v" USING btree ("autosave");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "payload"."home_page_blocks_hero_rotating_titles" CASCADE;
  DROP TABLE "payload"."home_page_blocks_hero_methods_list" CASCADE;
  DROP TABLE "payload"."home_page_blocks_hero_feature_bullets" CASCADE;
  DROP TABLE "payload"."home_page_blocks_hero" CASCADE;
  DROP TABLE "payload"."home_page_blocks_category_grid_items" CASCADE;
  DROP TABLE "payload"."home_page_blocks_category_grid" CASCADE;
  DROP TABLE "payload"."home_page_blocks_methods_list" CASCADE;
  DROP TABLE "payload"."home_page_blocks_stages_items" CASCADE;
  DROP TABLE "payload"."home_page_blocks_stages" CASCADE;
  DROP TABLE "payload"."home_page_blocks_pricing_table_rows_cells" CASCADE;
  DROP TABLE "payload"."home_page_blocks_pricing_table_rows" CASCADE;
  DROP TABLE "payload"."home_page_blocks_pricing_table" CASCADE;
  DROP TABLE "payload"."home_page_blocks_about_items" CASCADE;
  DROP TABLE "payload"."home_page_blocks_about" CASCADE;
  DROP TABLE "payload"."home_page_blocks_testimonials_items" CASCADE;
  DROP TABLE "payload"."home_page_blocks_testimonials" CASCADE;
  DROP TABLE "payload"."home_page_blocks_faq_items" CASCADE;
  DROP TABLE "payload"."home_page_blocks_faq" CASCADE;
  DROP TABLE "payload"."home_page_blocks_cta" CASCADE;
  DROP TABLE "payload"."home_page" CASCADE;
  DROP TABLE "payload"."_home_page_v_blocks_hero_rotating_titles" CASCADE;
  DROP TABLE "payload"."_home_page_v_blocks_hero_methods_list" CASCADE;
  DROP TABLE "payload"."_home_page_v_blocks_hero_feature_bullets" CASCADE;
  DROP TABLE "payload"."_home_page_v_blocks_hero" CASCADE;
  DROP TABLE "payload"."_home_page_v_blocks_category_grid_items" CASCADE;
  DROP TABLE "payload"."_home_page_v_blocks_category_grid" CASCADE;
  DROP TABLE "payload"."_home_page_v_blocks_methods_list" CASCADE;
  DROP TABLE "payload"."_home_page_v_blocks_stages_items" CASCADE;
  DROP TABLE "payload"."_home_page_v_blocks_stages" CASCADE;
  DROP TABLE "payload"."_home_page_v_blocks_pricing_table_rows_cells" CASCADE;
  DROP TABLE "payload"."_home_page_v_blocks_pricing_table_rows" CASCADE;
  DROP TABLE "payload"."_home_page_v_blocks_pricing_table" CASCADE;
  DROP TABLE "payload"."_home_page_v_blocks_about_items" CASCADE;
  DROP TABLE "payload"."_home_page_v_blocks_about" CASCADE;
  DROP TABLE "payload"."_home_page_v_blocks_testimonials_items" CASCADE;
  DROP TABLE "payload"."_home_page_v_blocks_testimonials" CASCADE;
  DROP TABLE "payload"."_home_page_v_blocks_faq_items" CASCADE;
  DROP TABLE "payload"."_home_page_v_blocks_faq" CASCADE;
  DROP TABLE "payload"."_home_page_v_blocks_cta" CASCADE;
  DROP TABLE "payload"."_home_page_v" CASCADE;
  DROP TYPE "payload"."enum_home_page_blocks_category_grid_items_color";
  DROP TYPE "payload"."enum_home_page_blocks_category_grid_items_image_slug";
  DROP TYPE "payload"."enum_home_page_blocks_stages_items_image_slug";
  DROP TYPE "payload"."enum_home_page_blocks_cta_variant";
  DROP TYPE "payload"."enum_home_page_status";
  DROP TYPE "payload"."enum__home_page_v_blocks_category_grid_items_color";
  DROP TYPE "payload"."enum__home_page_v_blocks_category_grid_items_image_slug";
  DROP TYPE "payload"."enum__home_page_v_blocks_stages_items_image_slug";
  DROP TYPE "payload"."enum__home_page_v_blocks_cta_variant";
  DROP TYPE "payload"."enum__home_page_v_version_status";`)
}
