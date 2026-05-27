import { StaticImageData } from "next/image";


export interface IProduct {
  _id: string;
  slug: string;
  name: string;
  description: string;
  links: string[];
  type: string;
  price: number;
  shippingParams: {
    weight: number;
    width: number;
    length: number;
    depth: number;
  };
  stock: string;
  color: string;
  stageColor: string;
  category: string;
  isSale: boolean;
  isForPrinting: boolean;
  image_url: string;
  galleryPhotos: string[];
  editor_front_view: string;
  editor_back_view: string;
  editor_lsleeve_view: string;
  editor_rsleeve_view: string;
  sizes: Array<{ name: string; qty: number; userQty?: number }>;
  friends: string;
}
export type TPrintLocation = 'none' | 'front' | 'back' | 'sleeve' | 'both';
export type TPrintSide = 'front' | 'back' | 'sleeve';

export interface IPrintFileRef {
  url: string;
  filename: string;
  sizeBytes: number;
  path: string;  // путь внутри bucket `user-uploads` для последующего storage.remove()
}

export interface IPrintConfig {
  location: TPrintLocation;
  files: Partial<Record<TPrintSide, IPrintFileRef>>;
}

export interface ICartOrderElement {
  itemCartId: string;
  item: IProduct;
  printConfig: IPrintConfig;
}
export interface ICdekCitySearchResponse {
  city: string,
  city_uuid: string,
  code: number,
  country: string,
  country_code: string,
  fias_guid: string,
  fias_region_guid: string
  kladr_code: string,
  latitude: number,
  longitude: number,
  payment_limit: number,
  region: string,
  region_code: number,
  sub_region: string,
  time_zone: string,
}
export interface ICdekPointsResponse {
  address_comment: string,
  allowed_cod: boolean,
  code: string,
  dimensions?: Array<{width: number, height: number, depth: number}>
  fulfillment: boolean,
  have_cash: boolean,
  have_cashless: boolean,
  have_fast_payment_system: boolean,
  is_dressing_room: boolean,
  is_handout: boolean,
  is_ltl: boolean,
  is_reception: boolean,
  location: ICdekCitySearchResponse,
  name: string,
  nearest_station: string,
  note: string,
  office_image_list: Array<{ url: string }>,
  owner_code: string
  phones: Array<{ number: string }>
  take_only: boolean,
  type: string,
  uuid: string,
  weight_max: number,
  weight_min: number,
  work_time: string,
  work_time_list: Array<{day: number, time: string}>,
}
export interface ICdekPriceResponse {
  
calendar_max: number,
calendar_min: number,
currency: string,
delivery_sum: number,
period_max: number,
period_min: number,
services : Array<{
  code: string,
  discount_percent: number,
  discount_sum: number,
  sum: number,
  total_sum: number,
}>
total_sum: number,
weight_calc: number,
}
interface IAdditionalOrderParams {
    item_price?: number,
    printPrice?: number,
    qty?: Array<{name: string, qty: number, userQty?: number}>
    qtyAll?: number,
    front_print?: string,
    back_print?: string,
    lsleeve_print?: string,
    rsleeve_print?: string,
    textile?: string,
}
export type TUserOrderItem = IProduct & IAdditionalOrderParams;

export interface IOrderBody {
  order_total_price: number,
  order_discounted_price: number,
  order_promocode?: any,
  owner_name: string,
  owner_phone: string,
  owner_email: string,
  order_key: string,
  items: Array<TUserOrderItem>,
  isShipping: boolean,
  shipping_city?: ICdekCitySearchResponse,
  shipping_point?: ICdekPointsResponse,
  shipping_price: number,
  packages: Array<{ height: string,
  length: string,
  weight: string,
  width: string,}>,
  roistat: string,
}

export type TOptionsData = {
        parent?: string,
        slug: string,
        type?: string,
        title: string,
        subtitle: string,
        mainText: string,
        pros?: string,
        cons?: string,
        summaryText?: string,
        robotsText: {__html: string},
        cover: StaticImageData | string,
        gallery?: Array<StaticImageData | string>,
        meta: {
            metaTitle: string,
            metaDescription: string,
            metaKeywords: string,
        }
}


export type TBlogPosts = {
  posts: Array<{
    post_id: number;
    title: string;
    subtitle: string;
    slug: string;
    createdAt: string;
    cover: string;
    likes: number;
    hashtags: Array<string>;
    blog: {__html: string};
    author: string
  }>
}