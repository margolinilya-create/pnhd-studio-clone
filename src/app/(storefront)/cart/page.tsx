import { Metadata } from "next";

import { buildMetadata } from "@/app/_lib/build-metadata";
import { getCheckoutMessages } from "@/lib/queries/checkout-messages";

import CartClient from "./CartClient";

export async function generateMetadata(): Promise<Metadata> {
    const messages = await getCheckoutMessages();
    const title = messages?.cartPageTitle ?? 'Корзина покупок';
    return await buildMetadata({
        title: `${title} | Оформление заказа`,
        description: 'Ваши товары в корзине. Проверьте выбранные товары перед оформлением заказа.',
        path: '/cart',
    });
}

export default async function Page() {
    const messages = await getCheckoutMessages();
    return (
        <CartClient
            disclaimer={messages?.cartManagerDisclaimer ?? null}
            emptyState={{
                title: messages?.emptyCartTitle ?? 'Корзина пуста',
                subtitle: messages?.emptyCartSubtitle ?? null,
                ctaLabel: messages?.emptyCartCtaLabel ?? 'Перейти в каталог',
                ctaHref: messages?.emptyCartCtaHref ?? '/shop',
            }}
        />
    );
}
