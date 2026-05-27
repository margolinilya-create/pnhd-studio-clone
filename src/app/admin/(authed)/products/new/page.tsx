import { ProductForm } from '../ProductForm';

export const metadata = { title: 'Новый товар' };

export default function NewProductPage() {
    return <ProductForm initial={null} />;
}
