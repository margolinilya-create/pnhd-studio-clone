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

export type LeadSource =
  | 'footer'
  | 'popup'
  | 'shop-no-model'
  | 'product-page'
  | 'methods-consultation'
  | 'checkout';

export type LeadStatus = 'new' | 'contacted' | 'done' | 'spam';

export interface Lead {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  comment?: string | null;
  referenceUrl?: string | null;
  source: LeadSource;
  roistatVisit?: string | null;
  userAgent?: string | null;
  attachments?: {
    side?: string | null;
    url: string;
    filename?: string | null;
    id?: string | null;
  }[] | null;
  status: LeadStatus;
  createdAt: string;
  updatedAt: string;
}

export type OrderStatus =
  | 'draft'
  | 'pending_payment'
  | 'paid'
  | 'in_production'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded';
export type PaymentStatus = 'unpaid' | 'awaiting_callback' | 'paid' | 'failed' | 'refunded';
export type ProductionStatus = 'not_started' | 'layout_review' | 'printing' | 'qc' | 'packed';
export type DeliveryType = 'cdek_pvz' | 'cdek_door' | 'self_pickup';
export type PaymentProvider = 'tochka' | 'tbank';

export interface Order {
  id: string;
  orderNumber?: string;
  channel: 'b2c' | 'b2b';
  customer: {
    name: string;
    phone: string;
    email?: string | null;
    roistatVisit?: string | null;
  };
  delivery?: {
    type?: DeliveryType | null;
    cityCode?: string | null;
    cityName?: string | null;
    address?: string | null;
    pvzCode?: string | null;
    cost?: number | null;
  };
  promoCode?: string | Promo | null;
  subtotal: number;
  discount?: number | null;
  shippingCost?: number | null;
  total: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  productionStatus?: ProductionStatus | null;
  paymentProvider?: PaymentProvider | null;
  sbpQrId?: string | null;
  sbpQrUrl?: string | null;
  fiscalReceiptId?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  id: string;
  order: string | Order;
  product: string | Product;
  variant: string | Variant;
  quantity: number;
  pricePerUnit: number;
  printConfig?: unknown;
  lineTotal: number;
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
    leads: Lead;
    orders: Order;
    'order-items': OrderItem;
  };
  globals: object;
}

declare module 'payload' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  export interface GeneratedTypes extends Config {}
}
