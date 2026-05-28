/* tslint:disable */
/* eslint-disable */
/**
 * Stub-файл. Регенерируется через `npm run payload:gen-types` при наличии DATABASE_URI.
 * Здесь — минимальный валидный набор типов, чтобы TS-чек проходил без подключения к БД.
 */

export interface User {
  id: string;
  email: string;
  roles?: ('admin' | 'brand_manager' | 'marketing' | 'operations' | 'sales')[];
  password?: string | null;
  resetPasswordToken?: string | null;
  resetPasswordExpiration?: string | null;
  salt?: string | null;
  hash?: string | null;
  loginAttempts?: number | null;
  lockUntil?: string | null;
  createdAt: string;
  updatedAt: string;
}

type MediaSize = {
  url?: string | null;
  width?: number | null;
  height?: number | null;
  mimeType?: string | null;
  filesize?: number | null;
  filename?: string | null;
};

export interface Media {
  id: string;
  alt?: string | null;
  tag?: 'product' | 'blog' | 'gallery_prints' | 'drops' | 'misc' | null;
  updatedAt: string;
  createdAt: string;
  url?: string | null;
  thumbnailURL?: string | null;
  filename?: string | null;
  mimeType?: string | null;
  filesize?: number | null;
  width?: number | null;
  height?: number | null;
  focalX?: number | null;
  focalY?: number | null;
  sizes?: {
    thumbnail?: MediaSize;
    card?: MediaSize;
    hero?: MediaSize;
  };
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  parent?: string | Category | null;
  createdAt: string;
  updatedAt: string;
}

export type ProductType = 'tshirt' | 'hoodie' | 'longsleeve' | 'sweatshirt' | 'cap' | 'totebag';
export type ProductChannel = 'b2c' | 'b2b';
export type ProductPrintMethod = 'dtg' | 'dtf' | 'silkscreen' | 'embroidery' | 'thermo';
export type ProductStatus = 'draft' | 'published' | 'archived';

export interface Product {
  id: string;
  slug: string;
  name: string;
  description?: unknown;
  type: ProductType;
  category?: string | Category | null;
  channels: ProductChannel[];
  printMethods?: ProductPrintMethod[] | null;
  status: ProductStatus;
  coverMedia?: string | Media | null;
  galleryMedia?: { image: string | Media; id?: string | null }[] | null;
  editorViews?: {
    frontView?: string | Media | null;
    backView?: string | Media | null;
    lsleeveView?: string | Media | null;
    rsleeveView?: string | Media | null;
  };
  shippingParams?: {
    weight?: number | null;
    width?: number | null;
    length?: number | null;
    depth?: number | null;
  };
  friendsProducts?: { product: string | Product; id?: string | null }[] | null;
  isSale?: boolean | null;
  isForPrinting?: boolean | null;
  color?: string | null;
  stageColor?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Variant {
  id: string;
  product: string | Product;
  size: string;
  color?: string | null;
  sku: string;
  stockQty: number;
  sortOrder?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface Price {
  id: string;
  variant: string | Variant;
  currency: 'RUB';
  amount: number;
  validFrom?: string | null;
  validUntil?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type PageType = 'blog' | 'landing';
export type PageStatus = 'draft' | 'published';

export interface Page {
  id: string;
  title: string;
  slug: string;
  pageType: PageType;
  subtitle?: string | null;
  cover?: string | Media | null;
  author?: string | null;
  hashtags?: { tag: string; id?: string | null }[] | null;
  body?: unknown;
  bodyHtml?: string | null;
  likes?: number | null;
  legacyPostId?: number | null;
  publishedAt?: string | null;
  status: PageStatus;
  createdAt: string;
  updatedAt: string;
}

export type DropStatus = 'teaser' | 'live' | 'sold_out' | 'archived';

export interface Drop {
  id: string;
  name: string;
  slug: string;
  description?: unknown;
  coverMedia?: string | Media | null;
  releaseAt?: string | null;
  products?: { product: string | Product; id?: string | null }[] | null;
  status: DropStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Promo {
  id: string;
  code: string;
  discountType: 'percent' | 'fixed';
  discountValue: number;
  validFrom?: string | null;
  validUntil?: string | null;
  usageLimit?: number | null;
  usageCount?: number | null;
  appliesTo?: { product: string | Product; id?: string | null }[] | null;
  createdAt: string;
  updatedAt: string;
}

export interface Config {
  collections: {
    users: User;
    media: Media;
    categories: Category;
    products: Product;
    variants: Variant;
    prices: Price;
    pages: Page;
    drops: Drop;
    promos: Promo;
  };
  globals: object;
}

declare module 'payload' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  export interface GeneratedTypes extends Config {}
}
