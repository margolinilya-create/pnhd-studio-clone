import { LoginForm } from './LoginForm';

export const metadata = { title: 'Вход — PNHD admin', robots: { index: false, follow: false } };

export default async function LoginPage(
    props: {
        searchParams: Promise<{ next?: string; error?: string }>;
    }
) {
    const searchParams = await props.searchParams;
    const next = searchParams.next ?? '/admin';
    const initialError =
        searchParams.error === 'forbidden' ? 'Доступ запрещён' : null;

    return (
        <LoginForm next={next} initialError={initialError} />
    );
}
