import { Metadata } from "next";

import { buildMetadata } from "@/app/_lib/build-metadata";
import { getCheckoutMessages } from "@/lib/queries/checkout-messages";

import CheckoutClient from "./checkoutClient";

export async function generateMetadata(): Promise<Metadata> {
    return await buildMetadata({
        title: 'Оформление заказа',
        description: 'Оформите заказ на сайте Studio PNHD. Удобный процесс покупки с выбором способов оплаты и доставки',
        path: '/checkout',
    });
}

export default async function Page() {
    const messages = await getCheckoutMessages();
    return (
        <CheckoutClient
            submitLabel={messages?.checkoutSubmitLabel ?? 'Оформить заявку'}
            disclaimer={messages?.checkoutDisclaimer ?? null}
            emptyState={{
                title: messages?.emptyCheckoutTitle ?? 'Нечего оформлять',
                subtitle: messages?.emptyCheckoutSubtitle ?? null,
                ctaLabel: messages?.emptyCheckoutCtaLabel ?? 'Перейти в каталог',
                ctaHref: messages?.emptyCheckoutCtaHref ?? '/shop',
            }}
        />
    );
}
