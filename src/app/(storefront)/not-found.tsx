import EmptyState from '@/components/pages-components/cart-page/empty-state/empty-state';
import { getCheckoutMessages } from '@/lib/queries/checkout-messages';

const NotFound = async () => {
    const messages = await getCheckoutMessages();
    return (
        <EmptyState
            title={messages?.notFoundTitle ?? 'Страница не найдена'}
            subtitle={
                messages?.notFoundSubtitle ??
                'Возможно, ссылка устарела или товар больше не доступен. Загляните в каталог — там точно найдётся то, что вам нужно.'
            }
            ctaLabel={messages?.notFoundPrimaryCtaLabel ?? 'Перейти в каталог'}
            ctaHref={messages?.notFoundPrimaryCtaHref ?? '/shop'}
            secondaryCtaLabel={messages?.notFoundSecondaryCtaLabel ?? 'На главную'}
            secondaryCtaHref={messages?.notFoundSecondaryCtaHref ?? '/'}
        />
    );
};

export default NotFound;
