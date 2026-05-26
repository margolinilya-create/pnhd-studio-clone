-- pnhd-studio-clone initial schema
-- Каталог товаров, блог, галерея принтов

create extension if not exists "pgcrypto";

-- =========================
-- products
-- =========================
create table public.products (
    id                  uuid primary key default gen_random_uuid(),
    slug                text not null unique,
    name                text not null,
    description         text,
    type                text not null,
    price               numeric not null,
    stock               text default 'in_stock',
    color               text,
    stage_color         text,
    category            text,
    is_sale             boolean not null default false,
    is_for_printing     boolean not null default false,
    image_url           text,
    editor_front_view   text,
    editor_back_view    text,
    editor_lsleeve_view text,
    editor_rsleeve_view text,
    shipping_weight     numeric,
    shipping_width      numeric,
    shipping_length     numeric,
    shipping_depth      numeric,
    friends             text default '',
    created_at          timestamptz not null default now()
);

create index products_type_idx on public.products(type);
create index products_category_idx on public.products(category);

-- =========================
-- product_sizes (1:N)
-- =========================
create table public.product_sizes (
    id          uuid primary key default gen_random_uuid(),
    product_id  uuid not null references public.products(id) on delete cascade,
    name        text not null,
    qty         integer not null default 0,
    sort_order  integer not null default 0,
    unique (product_id, name)
);

create index product_sizes_product_id_idx on public.product_sizes(product_id);

-- =========================
-- product_gallery_photos (1:N)
-- =========================
create table public.product_gallery_photos (
    id          uuid primary key default gen_random_uuid(),
    product_id  uuid not null references public.products(id) on delete cascade,
    url         text not null,
    sort_order  integer not null default 0
);

create index product_gallery_photos_product_id_idx on public.product_gallery_photos(product_id);

-- =========================
-- product_links (M:N self-ref, для блока «друзья товара»)
-- =========================
create table public.product_links (
    product_id        uuid not null references public.products(id) on delete cascade,
    linked_product_id uuid not null references public.products(id) on delete cascade,
    primary key (product_id, linked_product_id)
);

-- =========================
-- blog_posts
-- =========================
create table public.blog_posts (
    id          uuid primary key default gen_random_uuid(),
    post_id     serial unique,                  -- для совместимости с фронтом (TBlogPosts.post_id: number)
    slug        text not null unique,
    title       text not null,
    subtitle    text,
    cover       text,
    author      text default 'PNHD STUDIO',
    likes       integer not null default 0,
    hashtags    text[] not null default '{}',
    body_html   text not null default '',
    created_at  timestamptz not null default now()
);

create index blog_posts_created_at_idx on public.blog_posts(created_at desc);

-- =========================
-- gallery_images
-- =========================
create table public.gallery_images (
    id          uuid primary key default gen_random_uuid(),
    src         text not null,
    alt         text default '',
    sort_order  integer not null default 0
);

-- =========================
-- RLS: публичное чтение для anon
-- =========================
alter table public.products              enable row level security;
alter table public.product_sizes         enable row level security;
alter table public.product_gallery_photos enable row level security;
alter table public.product_links         enable row level security;
alter table public.blog_posts            enable row level security;
alter table public.gallery_images        enable row level security;

create policy "public read products"
    on public.products for select
    to anon, authenticated
    using (true);

create policy "public read product_sizes"
    on public.product_sizes for select
    to anon, authenticated
    using (true);

create policy "public read product_gallery_photos"
    on public.product_gallery_photos for select
    to anon, authenticated
    using (true);

create policy "public read product_links"
    on public.product_links for select
    to anon, authenticated
    using (true);

create policy "public read blog_posts"
    on public.blog_posts for select
    to anon, authenticated
    using (true);

create policy "public read gallery_images"
    on public.gallery_images for select
    to anon, authenticated
    using (true);
