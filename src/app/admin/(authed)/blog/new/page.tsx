import { BlogForm } from '../BlogForm';
export const metadata = { title: 'Новый пост' };
export default function NewPostPage() {
    return <BlogForm initial={null} />;
}
