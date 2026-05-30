import { postgresAdapter } from '@payloadcms/db-postgres';
import { seoPlugin } from '@payloadcms/plugin-seo';
import { lexicalEditor } from '@payloadcms/richtext-lexical';
import { s3Storage } from '@payloadcms/storage-s3';
import path from 'path';
import { buildConfig } from 'payload';
import { fileURLToPath } from 'url';

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
