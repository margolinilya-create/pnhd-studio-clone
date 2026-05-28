import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "payload"."enum_users_roles" AS ENUM('admin', 'brand_manager', 'marketing', 'operations', 'sales');
  CREATE TYPE "payload"."enum_media_tag" AS ENUM('product', 'blog', 'gallery_prints', 'drops', 'misc');
  CREATE TYPE "payload"."enum_products_channels" AS ENUM('b2c', 'b2b');
  CREATE TYPE "payload"."enum_products_print_methods" AS ENUM('dtg', 'dtf', 'silkscreen', 'embroidery', 'thermo');
  CREATE TYPE "payload"."enum_products_type" AS ENUM('tshirt', 'hoodie', 'longsleeve', 'sweatshirt', 'cap', 'totebag');
  CREATE TYPE "payload"."enum_products_status" AS ENUM('draft', 'published', 'archived');
  CREATE TYPE "payload"."enum_prices_currency" AS ENUM('RUB');
  CREATE TYPE "payload"."enum_pages_page_type" AS ENUM('blog', 'landing');
  CREATE TYPE "payload"."enum_pages_status" AS ENUM('draft', 'published');
  CREATE TYPE "payload"."enum_drops_status" AS ENUM('teaser', 'live', 'sold_out', 'archived');
  CREATE TYPE "payload"."enum_promos_discount_type" AS ENUM('percent', 'fixed');
  CREATE TYPE "payload"."enum_leads_source" AS ENUM('footer', 'popup', 'shop-no-model', 'product-page', 'methods-consultation', 'checkout');
  CREATE TYPE "payload"."enum_leads_status" AS ENUM('new', 'contacted', 'done', 'spam');
  CREATE TYPE "payload"."enum_orders_channel" AS ENUM('b2c', 'b2b');
  CREATE TYPE "payload"."enum_orders_delivery_type" AS ENUM('cdek_pvz', 'cdek_door', 'self_pickup');
  CREATE TYPE "payload"."enum_orders_status" AS ENUM('draft', 'pending_payment', 'paid', 'in_production', 'shipped', 'delivered', 'cancelled', 'refunded');
  CREATE TYPE "payload"."enum_orders_payment_status" AS ENUM('unpaid', 'awaiting_callback', 'paid', 'failed', 'refunded');
  CREATE TYPE "payload"."enum_orders_production_status" AS ENUM('not_started', 'layout_review', 'printing', 'qc', 'packed');
  CREATE TYPE "payload"."enum_orders_payment_provider" AS ENUM('tochka', 'tbank');
  CREATE TABLE "payload"."users_roles" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "payload"."enum_users_roles",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "payload"."users_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "payload"."users" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "payload"."media" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"alt" varchar,
  	"tag" "payload"."enum_media_tag" DEFAULT 'misc',
  	"prefix" varchar DEFAULT 'media',
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric,
  	"sizes_thumbnail_url" varchar,
  	"sizes_thumbnail_width" numeric,
  	"sizes_thumbnail_height" numeric,
  	"sizes_thumbnail_mime_type" varchar,
  	"sizes_thumbnail_filesize" numeric,
  	"sizes_thumbnail_filename" varchar,
  	"sizes_card_url" varchar,
  	"sizes_card_width" numeric,
  	"sizes_card_height" numeric,
  	"sizes_card_mime_type" varchar,
  	"sizes_card_filesize" numeric,
  	"sizes_card_filename" varchar,
  	"sizes_hero_url" varchar,
  	"sizes_hero_width" numeric,
  	"sizes_hero_height" numeric,
  	"sizes_hero_mime_type" varchar,
  	"sizes_hero_filesize" numeric,
  	"sizes_hero_filename" varchar
  );
  
  CREATE TABLE "payload"."categories" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"parent_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."products_channels" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "payload"."enum_products_channels",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "payload"."products_print_methods" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "payload"."enum_products_print_methods",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "payload"."products_gallery_media" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" integer NOT NULL
  );
  
  CREATE TABLE "payload"."products_friends_products" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"product_id" integer NOT NULL
  );
  
  CREATE TABLE "payload"."products" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"slug" varchar NOT NULL,
  	"name" varchar NOT NULL,
  	"description" jsonb,
  	"type" "payload"."enum_products_type" DEFAULT 'tshirt' NOT NULL,
  	"category_id" integer,
  	"status" "payload"."enum_products_status" DEFAULT 'draft' NOT NULL,
  	"cover_media_id" integer,
  	"editor_views_front_view_id" integer,
  	"editor_views_back_view_id" integer,
  	"editor_views_lsleeve_view_id" integer,
  	"editor_views_rsleeve_view_id" integer,
  	"shipping_params_weight" numeric,
  	"shipping_params_width" numeric,
  	"shipping_params_length" numeric,
  	"shipping_params_depth" numeric,
  	"is_sale" boolean DEFAULT false,
  	"is_for_printing" boolean DEFAULT true,
  	"color" varchar,
  	"stage_color" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."variants" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"product_id" integer NOT NULL,
  	"size" varchar NOT NULL,
  	"color" varchar,
  	"sku" varchar NOT NULL,
  	"stock_qty" numeric DEFAULT 0 NOT NULL,
  	"sort_order" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."prices" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"variant_id" integer NOT NULL,
  	"currency" "payload"."enum_prices_currency" DEFAULT 'RUB' NOT NULL,
  	"amount" numeric NOT NULL,
  	"valid_from" timestamp(3) with time zone,
  	"valid_until" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."pages_hashtags" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"tag" varchar NOT NULL
  );
  
  CREATE TABLE "payload"."pages" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"page_type" "payload"."enum_pages_page_type" DEFAULT 'blog' NOT NULL,
  	"subtitle" varchar,
  	"cover_id" integer,
  	"author" varchar DEFAULT 'PNHD STUDIO',
  	"body" jsonb,
  	"body_html" varchar,
  	"likes" numeric DEFAULT 0,
  	"legacy_post_id" numeric,
  	"published_at" timestamp(3) with time zone,
  	"status" "payload"."enum_pages_status" DEFAULT 'draft' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."drops_products" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"product_id" integer NOT NULL
  );
  
  CREATE TABLE "payload"."drops" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"description" jsonb,
  	"cover_media_id" integer,
  	"release_at" timestamp(3) with time zone,
  	"status" "payload"."enum_drops_status" DEFAULT 'teaser' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."promos_applies_to" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"product_id" integer NOT NULL
  );
  
  CREATE TABLE "payload"."promos" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"code" varchar NOT NULL,
  	"discount_type" "payload"."enum_promos_discount_type" DEFAULT 'percent' NOT NULL,
  	"discount_value" numeric NOT NULL,
  	"valid_from" timestamp(3) with time zone,
  	"valid_until" timestamp(3) with time zone,
  	"usage_limit" numeric,
  	"usage_count" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."leads_attachments" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"side" varchar,
  	"url" varchar NOT NULL,
  	"filename" varchar
  );
  
  CREATE TABLE "payload"."leads" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"phone" varchar NOT NULL,
  	"email" varchar,
  	"comment" varchar,
  	"reference_url" varchar,
  	"source" "payload"."enum_leads_source" NOT NULL,
  	"roistat_visit" varchar,
  	"user_agent" varchar,
  	"status" "payload"."enum_leads_status" DEFAULT 'new' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."orders" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order_number" varchar,
  	"channel" "payload"."enum_orders_channel" DEFAULT 'b2c' NOT NULL,
  	"customer_name" varchar NOT NULL,
  	"customer_phone" varchar NOT NULL,
  	"customer_email" varchar,
  	"customer_roistat_visit" varchar,
  	"delivery_type" "payload"."enum_orders_delivery_type",
  	"delivery_city_code" varchar,
  	"delivery_city_name" varchar,
  	"delivery_address" varchar,
  	"delivery_pvz_code" varchar,
  	"delivery_cost" numeric DEFAULT 0,
  	"promo_code_id" integer,
  	"subtotal" numeric DEFAULT 0 NOT NULL,
  	"discount" numeric DEFAULT 0,
  	"shipping_cost" numeric DEFAULT 0,
  	"total" numeric DEFAULT 0 NOT NULL,
  	"status" "payload"."enum_orders_status" DEFAULT 'draft' NOT NULL,
  	"payment_status" "payload"."enum_orders_payment_status" DEFAULT 'unpaid' NOT NULL,
  	"production_status" "payload"."enum_orders_production_status" DEFAULT 'not_started',
  	"payment_provider" "payload"."enum_orders_payment_provider",
  	"sbp_qr_id" varchar,
  	"sbp_qr_url" varchar,
  	"fiscal_receipt_id" varchar,
  	"notes" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."order_items" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order_id" integer NOT NULL,
  	"product_id" integer NOT NULL,
  	"variant_id" integer NOT NULL,
  	"quantity" numeric DEFAULT 1 NOT NULL,
  	"price_per_unit" numeric NOT NULL,
  	"print_config" jsonb,
  	"line_total" numeric NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."payload_kv" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"data" jsonb NOT NULL
  );
  
  CREATE TABLE "payload"."payload_locked_documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"global_slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."payload_locked_documents_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer,
  	"media_id" integer,
  	"categories_id" integer,
  	"products_id" integer,
  	"variants_id" integer,
  	"prices_id" integer,
  	"pages_id" integer,
  	"drops_id" integer,
  	"promos_id" integer,
  	"leads_id" integer,
  	"orders_id" integer,
  	"order_items_id" integer
  );
  
  CREATE TABLE "payload"."payload_preferences" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"value" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."payload_preferences_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer
  );
  
  CREATE TABLE "payload"."payload_migrations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"batch" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload"."users_roles" ADD CONSTRAINT "users_roles_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "payload"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."users_sessions" ADD CONSTRAINT "users_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."categories" ADD CONSTRAINT "categories_parent_id_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "payload"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."products_channels" ADD CONSTRAINT "products_channels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "payload"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."products_print_methods" ADD CONSTRAINT "products_print_methods_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "payload"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."products_gallery_media" ADD CONSTRAINT "products_gallery_media_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."products_gallery_media" ADD CONSTRAINT "products_gallery_media_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."products_friends_products" ADD CONSTRAINT "products_friends_products_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "payload"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."products_friends_products" ADD CONSTRAINT "products_friends_products_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."products" ADD CONSTRAINT "products_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "payload"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."products" ADD CONSTRAINT "products_cover_media_id_media_id_fk" FOREIGN KEY ("cover_media_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."products" ADD CONSTRAINT "products_editor_views_front_view_id_media_id_fk" FOREIGN KEY ("editor_views_front_view_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."products" ADD CONSTRAINT "products_editor_views_back_view_id_media_id_fk" FOREIGN KEY ("editor_views_back_view_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."products" ADD CONSTRAINT "products_editor_views_lsleeve_view_id_media_id_fk" FOREIGN KEY ("editor_views_lsleeve_view_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."products" ADD CONSTRAINT "products_editor_views_rsleeve_view_id_media_id_fk" FOREIGN KEY ("editor_views_rsleeve_view_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."variants" ADD CONSTRAINT "variants_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "payload"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."prices" ADD CONSTRAINT "prices_variant_id_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "payload"."variants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."pages_hashtags" ADD CONSTRAINT "pages_hashtags_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."pages" ADD CONSTRAINT "pages_cover_id_media_id_fk" FOREIGN KEY ("cover_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."drops_products" ADD CONSTRAINT "drops_products_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "payload"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."drops_products" ADD CONSTRAINT "drops_products_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."drops"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."drops" ADD CONSTRAINT "drops_cover_media_id_media_id_fk" FOREIGN KEY ("cover_media_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."promos_applies_to" ADD CONSTRAINT "promos_applies_to_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "payload"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."promos_applies_to" ADD CONSTRAINT "promos_applies_to_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."promos"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."leads_attachments" ADD CONSTRAINT "leads_attachments_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."leads"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."orders" ADD CONSTRAINT "orders_promo_code_id_promos_id_fk" FOREIGN KEY ("promo_code_id") REFERENCES "payload"."promos"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "payload"."orders"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."order_items" ADD CONSTRAINT "order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "payload"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."order_items" ADD CONSTRAINT "order_items_variant_id_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "payload"."variants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "payload"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "payload"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "payload"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_categories_fk" FOREIGN KEY ("categories_id") REFERENCES "payload"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_products_fk" FOREIGN KEY ("products_id") REFERENCES "payload"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_variants_fk" FOREIGN KEY ("variants_id") REFERENCES "payload"."variants"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_prices_fk" FOREIGN KEY ("prices_id") REFERENCES "payload"."prices"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_pages_fk" FOREIGN KEY ("pages_id") REFERENCES "payload"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_drops_fk" FOREIGN KEY ("drops_id") REFERENCES "payload"."drops"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_promos_fk" FOREIGN KEY ("promos_id") REFERENCES "payload"."promos"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_leads_fk" FOREIGN KEY ("leads_id") REFERENCES "payload"."leads"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_orders_fk" FOREIGN KEY ("orders_id") REFERENCES "payload"."orders"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_order_items_fk" FOREIGN KEY ("order_items_id") REFERENCES "payload"."order_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "payload"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "payload"."users"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "users_roles_order_idx" ON "payload"."users_roles" USING btree ("order");
  CREATE INDEX "users_roles_parent_idx" ON "payload"."users_roles" USING btree ("parent_id");
  CREATE INDEX "users_sessions_order_idx" ON "payload"."users_sessions" USING btree ("_order");
  CREATE INDEX "users_sessions_parent_id_idx" ON "payload"."users_sessions" USING btree ("_parent_id");
  CREATE INDEX "users_updated_at_idx" ON "payload"."users" USING btree ("updated_at");
  CREATE INDEX "users_created_at_idx" ON "payload"."users" USING btree ("created_at");
  CREATE UNIQUE INDEX "users_email_idx" ON "payload"."users" USING btree ("email");
  CREATE INDEX "media_updated_at_idx" ON "payload"."media" USING btree ("updated_at");
  CREATE INDEX "media_created_at_idx" ON "payload"."media" USING btree ("created_at");
  CREATE UNIQUE INDEX "media_filename_idx" ON "payload"."media" USING btree ("filename");
  CREATE INDEX "media_sizes_thumbnail_sizes_thumbnail_filename_idx" ON "payload"."media" USING btree ("sizes_thumbnail_filename");
  CREATE INDEX "media_sizes_card_sizes_card_filename_idx" ON "payload"."media" USING btree ("sizes_card_filename");
  CREATE INDEX "media_sizes_hero_sizes_hero_filename_idx" ON "payload"."media" USING btree ("sizes_hero_filename");
  CREATE UNIQUE INDEX "categories_slug_idx" ON "payload"."categories" USING btree ("slug");
  CREATE INDEX "categories_parent_idx" ON "payload"."categories" USING btree ("parent_id");
  CREATE INDEX "categories_updated_at_idx" ON "payload"."categories" USING btree ("updated_at");
  CREATE INDEX "categories_created_at_idx" ON "payload"."categories" USING btree ("created_at");
  CREATE INDEX "products_channels_order_idx" ON "payload"."products_channels" USING btree ("order");
  CREATE INDEX "products_channels_parent_idx" ON "payload"."products_channels" USING btree ("parent_id");
  CREATE INDEX "products_print_methods_order_idx" ON "payload"."products_print_methods" USING btree ("order");
  CREATE INDEX "products_print_methods_parent_idx" ON "payload"."products_print_methods" USING btree ("parent_id");
  CREATE INDEX "products_gallery_media_order_idx" ON "payload"."products_gallery_media" USING btree ("_order");
  CREATE INDEX "products_gallery_media_parent_id_idx" ON "payload"."products_gallery_media" USING btree ("_parent_id");
  CREATE INDEX "products_gallery_media_image_idx" ON "payload"."products_gallery_media" USING btree ("image_id");
  CREATE INDEX "products_friends_products_order_idx" ON "payload"."products_friends_products" USING btree ("_order");
  CREATE INDEX "products_friends_products_parent_id_idx" ON "payload"."products_friends_products" USING btree ("_parent_id");
  CREATE INDEX "products_friends_products_product_idx" ON "payload"."products_friends_products" USING btree ("product_id");
  CREATE UNIQUE INDEX "products_slug_idx" ON "payload"."products" USING btree ("slug");
  CREATE INDEX "products_category_idx" ON "payload"."products" USING btree ("category_id");
  CREATE INDEX "products_cover_media_idx" ON "payload"."products" USING btree ("cover_media_id");
  CREATE INDEX "products_editor_views_editor_views_front_view_idx" ON "payload"."products" USING btree ("editor_views_front_view_id");
  CREATE INDEX "products_editor_views_editor_views_back_view_idx" ON "payload"."products" USING btree ("editor_views_back_view_id");
  CREATE INDEX "products_editor_views_editor_views_lsleeve_view_idx" ON "payload"."products" USING btree ("editor_views_lsleeve_view_id");
  CREATE INDEX "products_editor_views_editor_views_rsleeve_view_idx" ON "payload"."products" USING btree ("editor_views_rsleeve_view_id");
  CREATE INDEX "products_updated_at_idx" ON "payload"."products" USING btree ("updated_at");
  CREATE INDEX "products_created_at_idx" ON "payload"."products" USING btree ("created_at");
  CREATE INDEX "variants_product_idx" ON "payload"."variants" USING btree ("product_id");
  CREATE UNIQUE INDEX "variants_sku_idx" ON "payload"."variants" USING btree ("sku");
  CREATE INDEX "variants_updated_at_idx" ON "payload"."variants" USING btree ("updated_at");
  CREATE INDEX "variants_created_at_idx" ON "payload"."variants" USING btree ("created_at");
  CREATE INDEX "prices_variant_idx" ON "payload"."prices" USING btree ("variant_id");
  CREATE INDEX "prices_updated_at_idx" ON "payload"."prices" USING btree ("updated_at");
  CREATE INDEX "prices_created_at_idx" ON "payload"."prices" USING btree ("created_at");
  CREATE INDEX "pages_hashtags_order_idx" ON "payload"."pages_hashtags" USING btree ("_order");
  CREATE INDEX "pages_hashtags_parent_id_idx" ON "payload"."pages_hashtags" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "pages_slug_idx" ON "payload"."pages" USING btree ("slug");
  CREATE INDEX "pages_cover_idx" ON "payload"."pages" USING btree ("cover_id");
  CREATE INDEX "pages_updated_at_idx" ON "payload"."pages" USING btree ("updated_at");
  CREATE INDEX "pages_created_at_idx" ON "payload"."pages" USING btree ("created_at");
  CREATE INDEX "drops_products_order_idx" ON "payload"."drops_products" USING btree ("_order");
  CREATE INDEX "drops_products_parent_id_idx" ON "payload"."drops_products" USING btree ("_parent_id");
  CREATE INDEX "drops_products_product_idx" ON "payload"."drops_products" USING btree ("product_id");
  CREATE UNIQUE INDEX "drops_slug_idx" ON "payload"."drops" USING btree ("slug");
  CREATE INDEX "drops_cover_media_idx" ON "payload"."drops" USING btree ("cover_media_id");
  CREATE INDEX "drops_updated_at_idx" ON "payload"."drops" USING btree ("updated_at");
  CREATE INDEX "drops_created_at_idx" ON "payload"."drops" USING btree ("created_at");
  CREATE INDEX "promos_applies_to_order_idx" ON "payload"."promos_applies_to" USING btree ("_order");
  CREATE INDEX "promos_applies_to_parent_id_idx" ON "payload"."promos_applies_to" USING btree ("_parent_id");
  CREATE INDEX "promos_applies_to_product_idx" ON "payload"."promos_applies_to" USING btree ("product_id");
  CREATE UNIQUE INDEX "promos_code_idx" ON "payload"."promos" USING btree ("code");
  CREATE INDEX "promos_updated_at_idx" ON "payload"."promos" USING btree ("updated_at");
  CREATE INDEX "promos_created_at_idx" ON "payload"."promos" USING btree ("created_at");
  CREATE INDEX "leads_attachments_order_idx" ON "payload"."leads_attachments" USING btree ("_order");
  CREATE INDEX "leads_attachments_parent_id_idx" ON "payload"."leads_attachments" USING btree ("_parent_id");
  CREATE INDEX "leads_updated_at_idx" ON "payload"."leads" USING btree ("updated_at");
  CREATE INDEX "leads_created_at_idx" ON "payload"."leads" USING btree ("created_at");
  CREATE UNIQUE INDEX "orders_order_number_idx" ON "payload"."orders" USING btree ("order_number");
  CREATE INDEX "orders_promo_code_idx" ON "payload"."orders" USING btree ("promo_code_id");
  CREATE INDEX "orders_updated_at_idx" ON "payload"."orders" USING btree ("updated_at");
  CREATE INDEX "orders_created_at_idx" ON "payload"."orders" USING btree ("created_at");
  CREATE INDEX "order_items_order_idx" ON "payload"."order_items" USING btree ("order_id");
  CREATE INDEX "order_items_product_idx" ON "payload"."order_items" USING btree ("product_id");
  CREATE INDEX "order_items_variant_idx" ON "payload"."order_items" USING btree ("variant_id");
  CREATE INDEX "order_items_updated_at_idx" ON "payload"."order_items" USING btree ("updated_at");
  CREATE INDEX "order_items_created_at_idx" ON "payload"."order_items" USING btree ("created_at");
  CREATE UNIQUE INDEX "payload_kv_key_idx" ON "payload"."payload_kv" USING btree ("key");
  CREATE INDEX "payload_locked_documents_global_slug_idx" ON "payload"."payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX "payload_locked_documents_updated_at_idx" ON "payload"."payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX "payload_locked_documents_created_at_idx" ON "payload"."payload_locked_documents" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_order_idx" ON "payload"."payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "payload"."payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX "payload_locked_documents_rels_path_idx" ON "payload"."payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX "payload_locked_documents_rels_users_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("users_id");
  CREATE INDEX "payload_locked_documents_rels_media_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("media_id");
  CREATE INDEX "payload_locked_documents_rels_categories_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("categories_id");
  CREATE INDEX "payload_locked_documents_rels_products_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("products_id");
  CREATE INDEX "payload_locked_documents_rels_variants_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("variants_id");
  CREATE INDEX "payload_locked_documents_rels_prices_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("prices_id");
  CREATE INDEX "payload_locked_documents_rels_pages_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("pages_id");
  CREATE INDEX "payload_locked_documents_rels_drops_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("drops_id");
  CREATE INDEX "payload_locked_documents_rels_promos_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("promos_id");
  CREATE INDEX "payload_locked_documents_rels_leads_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("leads_id");
  CREATE INDEX "payload_locked_documents_rels_orders_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("orders_id");
  CREATE INDEX "payload_locked_documents_rels_order_items_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("order_items_id");
  CREATE INDEX "payload_preferences_key_idx" ON "payload"."payload_preferences" USING btree ("key");
  CREATE INDEX "payload_preferences_updated_at_idx" ON "payload"."payload_preferences" USING btree ("updated_at");
  CREATE INDEX "payload_preferences_created_at_idx" ON "payload"."payload_preferences" USING btree ("created_at");
  CREATE INDEX "payload_preferences_rels_order_idx" ON "payload"."payload_preferences_rels" USING btree ("order");
  CREATE INDEX "payload_preferences_rels_parent_idx" ON "payload"."payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX "payload_preferences_rels_path_idx" ON "payload"."payload_preferences_rels" USING btree ("path");
  CREATE INDEX "payload_preferences_rels_users_id_idx" ON "payload"."payload_preferences_rels" USING btree ("users_id");
  CREATE INDEX "payload_migrations_updated_at_idx" ON "payload"."payload_migrations" USING btree ("updated_at");
  CREATE INDEX "payload_migrations_created_at_idx" ON "payload"."payload_migrations" USING btree ("created_at");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "payload"."users_roles" CASCADE;
  DROP TABLE "payload"."users_sessions" CASCADE;
  DROP TABLE "payload"."users" CASCADE;
  DROP TABLE "payload"."media" CASCADE;
  DROP TABLE "payload"."categories" CASCADE;
  DROP TABLE "payload"."products_channels" CASCADE;
  DROP TABLE "payload"."products_print_methods" CASCADE;
  DROP TABLE "payload"."products_gallery_media" CASCADE;
  DROP TABLE "payload"."products_friends_products" CASCADE;
  DROP TABLE "payload"."products" CASCADE;
  DROP TABLE "payload"."variants" CASCADE;
  DROP TABLE "payload"."prices" CASCADE;
  DROP TABLE "payload"."pages_hashtags" CASCADE;
  DROP TABLE "payload"."pages" CASCADE;
  DROP TABLE "payload"."drops_products" CASCADE;
  DROP TABLE "payload"."drops" CASCADE;
  DROP TABLE "payload"."promos_applies_to" CASCADE;
  DROP TABLE "payload"."promos" CASCADE;
  DROP TABLE "payload"."leads_attachments" CASCADE;
  DROP TABLE "payload"."leads" CASCADE;
  DROP TABLE "payload"."orders" CASCADE;
  DROP TABLE "payload"."order_items" CASCADE;
  DROP TABLE "payload"."payload_kv" CASCADE;
  DROP TABLE "payload"."payload_locked_documents" CASCADE;
  DROP TABLE "payload"."payload_locked_documents_rels" CASCADE;
  DROP TABLE "payload"."payload_preferences" CASCADE;
  DROP TABLE "payload"."payload_preferences_rels" CASCADE;
  DROP TABLE "payload"."payload_migrations" CASCADE;
  DROP TYPE "payload"."enum_users_roles";
  DROP TYPE "payload"."enum_media_tag";
  DROP TYPE "payload"."enum_products_channels";
  DROP TYPE "payload"."enum_products_print_methods";
  DROP TYPE "payload"."enum_products_type";
  DROP TYPE "payload"."enum_products_status";
  DROP TYPE "payload"."enum_prices_currency";
  DROP TYPE "payload"."enum_pages_page_type";
  DROP TYPE "payload"."enum_pages_status";
  DROP TYPE "payload"."enum_drops_status";
  DROP TYPE "payload"."enum_promos_discount_type";
  DROP TYPE "payload"."enum_leads_source";
  DROP TYPE "payload"."enum_leads_status";
  DROP TYPE "payload"."enum_orders_channel";
  DROP TYPE "payload"."enum_orders_delivery_type";
  DROP TYPE "payload"."enum_orders_status";
  DROP TYPE "payload"."enum_orders_payment_status";
  DROP TYPE "payload"."enum_orders_production_status";
  DROP TYPE "payload"."enum_orders_payment_provider";`)
}
