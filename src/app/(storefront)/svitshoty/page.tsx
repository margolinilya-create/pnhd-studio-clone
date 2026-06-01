import { Metadata } from 'next';
import CategoryPage, { buildCategoryMetadata } from '@/components/pages-components/category-page/category-page';

const SLUG = 'svitshoty';

export async function generateMetadata(): Promise<Metadata> {
  return await buildCategoryMetadata(SLUG);
}

export default async function Page() {
  return <CategoryPage slug={SLUG} />;
}
