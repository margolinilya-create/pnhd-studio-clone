import { postgresAdapter } from '@payloadcms/db-postgres';
import { formBuilderPlugin } from '@payloadcms/plugin-form-builder';
import { importExportPlugin } from '@payloadcms/plugin-import-export';
import { redirectsPlugin } from '@payloadcms/plugin-redirects';
import { seoPlugin } from '@payloadcms/plugin-seo';
import { lexicalEditor } from '@payloadcms/richtext-lexical';
import { s3Storage } from '@payloadcms/storage-s3';
import path from 'path';
import { buildConfig } from 'payload';
import { fileURLToPath } from 'url';

import { notifyBitrix } from '@/hooks/notifyBitrix';
import { rateLimitFormSubmissions } from '@/hooks/rateLimitFormSubmissions';
import { Categories } from './collections/Categories.ts';
import { Drops } from './collections/Drops.ts';
import { Leads } from './collections/Leads.ts';
import { Media } from './collections/Media.ts';
import { OrderItems } from './collections/OrderItems.ts';
import { Orders } from './collections/Orders.ts';
import { Pages } from './collections/Pages.ts';
import { Prices } from './collections/Prices.ts';
import { Products } from './collections/Products.ts';
import { Promos } from './collections/Promos.ts';
import { Users } from './collections/Users.ts';
import { Variants } from './collections/Variants.ts';

const collections = [Users, Media, Categories, Products, Variants, Prices, Pages, Drops, Promos, Leads, Orders, OrderItems];

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

export default buildConfig({
  admin: {
    user: 'users',
  },
  routes: {
    admin: '/admin',
    api: '/api',
    graphQL: '/graphql',
    graphQLPlayground: '/graphql-playground',
  },
  collections,
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URI || '',
    },
    schemaName: 'payload',
  }),
  plugins: [
    redirectsPlugin({
      collections: ['pages', 'products'],
      overrides: {
        admin: {
          group: 'SEO',
          description:
            'Перенаправления URL. From — старый путь (например /old-product). To — внутренний документ или внешний URL. Применяется через middleware на storefront.',
        },
      },
    }),
    importExportPlugin({
      collections: [
        { slug: 'products' },
        { slug: 'pages' },
        { slug: 'leads' },
      ],
      overrideExportCollection: ({ collection }) => ({
        ...collection,
        admin: {
          ...collection.admin,
          group: 'System',
        },
      }),
      overrideImportCollection: ({ collection }) => ({
        ...collection,
        admin: {
          ...collection.admin,
          group: 'System',
        },
      }),
    }),
    formBuilderPlugin({
      fields: {
        text: true,
        textarea: true,
        email: true,
        checkbox: true,
        select: true,
        number: false,
        message: true,
        country: false,
        state: false,
        payment: false,
      },
      // redirectRelationships omitted (empty array [] is truthy → causes Payload to create a
      // "reference" relationship field with empty relationTo, which fails sanitization).
      // Omitting the key keeps the field absent entirely; redirect after submit is handled on the frontend.
      formOverrides: {
        admin: { group: 'Forms' },
      },
      formSubmissionOverrides: {
        admin: {
          group: 'Forms',
          defaultColumns: ['form', 'createdAt'],
        },
        fields: ({ defaultFields }) => [
          ...defaultFields,
          {
            name: 'ipHash',
            type: 'text',
            admin: { readOnly: true, position: 'sidebar' },
            index: true,
          },
          {
            name: 'userAgent',
            type: 'text',
            admin: { readOnly: true, position: 'sidebar', hidden: true },
          },
          {
            name: 'bitrixLeadId',
            type: 'text',
            admin: { readOnly: true, position: 'sidebar' },
          },
          {
            name: 'bitrixError',
            type: 'textarea',
            admin: { readOnly: true, position: 'sidebar' },
          },
        ],
        hooks: {
          beforeOperation: [rateLimitFormSubmissions],
          afterChange: [notifyBitrix],
        },
      },
    }),
    s3Storage({
      collections: {
        media: {
          prefix: 'media',
        },
      },
      bucket: process.env.S3_BUCKET || '',
      config: {
        endpoint: process.env.S3_ENDPOINT,
        region: process.env.S3_REGION,
        credentials: {
          accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
          secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
        },
        forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
      },
    }),
    seoPlugin({
      collections: ['products', 'pages'],
      uploadsCollection: 'media',
      generateTitle: ({ doc }) => {
        const t = (doc as { title?: string; name?: string }).title
          ?? (doc as { name?: string }).name
          ?? '';
        return t ? `${t} — pnhd.studio` : 'pnhd.studio';
      },
      generateDescription: ({ doc }) => {
        return (doc as { subtitle?: string; description?: string }).subtitle
          ?? '';
      },
      tabbedUI: true,
    }),
  ],
  cors: process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean)
    : ['http://localhost:3000', 'https://studio.pnhd.ru'],
  csrf: process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean)
    : ['http://localhost:3000', 'https://studio.pnhd.ru'],
});
