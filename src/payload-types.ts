/* tslint:disable */
/* eslint-disable */
/**
 * Stub-файл. Регенерируется при `npm run payload:gen-types` после schema-изменений.
 * Реальный run требует подключения к БД (DATABASE_URI). На этом этапе coexists с
 * существующей схемой как минимальный валидный тип.
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

export interface Media {
  id: string;
  alt?: string | null;
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
    thumbnail?: {
      url?: string | null;
      width?: number | null;
      height?: number | null;
      mimeType?: string | null;
      filesize?: number | null;
      filename?: string | null;
    };
    card?: {
      url?: string | null;
      width?: number | null;
      height?: number | null;
      mimeType?: string | null;
      filesize?: number | null;
      filename?: string | null;
    };
    hero?: {
      url?: string | null;
      width?: number | null;
      height?: number | null;
      mimeType?: string | null;
      filesize?: number | null;
      filename?: string | null;
    };
  };
}

export interface Config {
  collections: {
    users: User;
    media: Media;
  };
  globals: object;
}

declare module 'payload' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  export interface GeneratedTypes extends Config {}
}
