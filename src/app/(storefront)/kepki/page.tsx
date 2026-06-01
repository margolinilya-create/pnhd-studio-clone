import { Metadata } from 'next';
import CategoryPage, { buildCategoryMetadata } from '@/components/pages-components/category-page/category-page';
import { config } from './config';

export async function generateMetadata(): Promise<Metadata> {
  return await buildCategoryMetadata(config);
}

export default async function Page() {
  return <CategoryPage config={config} />;
}
