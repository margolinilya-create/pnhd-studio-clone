import { Metadata } from 'next';
import CategoryPage, { buildMetadata } from '@/components/pages-components/category-page/category-page';
import { config } from './config';

export const metadata: Metadata = buildMetadata(config);

export default async function Page() {
  return <CategoryPage config={config} />;
}
