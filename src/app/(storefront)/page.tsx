import React from "react";

import MainScreen from "@/components/pages-components/main-page/main-screen/main-screen";
import PhotosScreen from "@/components/pages-components/main-page/photos-screen/photos-screen";
import PrintMethodsScreen from "@/components/pages-components/main-page/print-methods-screen/print-methods-screen";
import ShopLeadScreen from "@/components/pages-components/main-page/shop-lead-screen/shop-lead-screen";
import StagesScreen from "@/components/pages-components/main-page/stages-screen/stages-screen";
import PriceScreen from "@/components/pages-components/main-page/price-screen/price-screen";
import HowToScreen from "@/components/pages-components/main-page/howto-screen/howto-screen";
import FeedbackScreen from "@/components/pages-components/main-page/feedback-screen/feedback-screen";
import FaqScreen from "@/components/pages-components/main-page/faq-screen/faq-screen";
import MapScreen from "@/components/pages-components/main-page/map-screen/map-screen";
import { Metadata } from "next";
import MarkupScript from "@/components/shared-components/markup-script/markup-script";
import {
    FAQPageJsonLD,
    getLocalBusinessJsonLD,
    getServiceJsonLD,
    getWebPageJsonLD,
} from "@/app/utils/markups";
import { resolveDomain } from "@/lib/site/domain";
import CatalogLeadScreen from "@/components/pages-components/main-page/catalogLeadScreen/catalogLeadScreen";
import SinceScreen from "@/components/pages-components/main-page/sinceScreen/sinceScreen";
import FormScreen from "@/components/pages-components/main-page/formScreen/FormScreen";
import { getHomePage } from "@/lib/queries/home-page";
import type { HomePage, Media } from "@/payload-types";

export async function generateMetadata(): Promise<Metadata> {
    return {
        title: 'Печать на одежде в Санкт-Петербурге на заказ от 1 штуки цена в Pinhead Studio',
        description: 'Печать на одежде на заказ от 1 штуки в Санкт-Петербурге по выгодной цене в Pinhead Studio. Сколько стоит печать на одежде смотрите онлайн на нашем сайте.',
        keywords: 'печать на футболках, санкт-петербург, недорого, на заказ, цена, от 1 шт, срочный, заказать, хороший, сделать, стоимость, доставка, быстрый, качественный, черный, оверсайз, белый, онлайн, спортивный, свой дизайн, конструктор, создать макет, нанесение, собственный, толстовка, худи, студия, услуги, каталог, а3, а4, одежда, свитшот',
        metadataBase: new URL(resolveDomain()),
        alternates: {
            canonical: '/',
        },
        openGraph: {
            type: 'website',
            title: 'PNHD STUDIO | Главная',
            images: '/opengraph-image.jpg',
        },
    };
}

type HomeSection = NonNullable<HomePage['sections']>[number];

/**
 * Extract URL/alt from a Payload upload field that's either an ID (number) or
 * a fully-populated Media doc. We only care about URL+alt at render time.
 */
function resolveMedia(field: number | Media | null | undefined): { url?: string | null; alt?: string | null } | null {
    if (!field || typeof field === 'number') return null;
    return { url: field.url, alt: field.alt };
}

/**
 * Renders one section block based on `blockType` discriminator.
 * The switch is intentional — keeps all rendering decisions in one place
 * and makes adding a new block type a single-place edit.
 */
function renderSection(section: HomeSection, key: number): React.ReactNode {
    switch (section.blockType) {
        case 'hero':
            return (
                <MainScreen
                    key={key}
                    rotatingTitles={section.rotatingTitles}
                    methodsList={section.methodsList}
                    featureBullets={section.featureBullets}
                    ctaLabel={section.ctaLabel}
                    ctaHref={section.ctaHref}
                    showLoyaltyBanner={section.showLoyaltyBanner}
                    loyaltyEyebrow={section.loyaltyEyebrow}
                    loyaltyTitle={section.loyaltyTitle}
                    loyaltyHref={section.loyaltyHref}
                />
            );
        case 'category-grid':
            return (
                <CatalogLeadScreen
                    key={key}
                    sectionTitle={section.sectionTitle}
                    subtitle={section.subtitle}
                    items={section.items?.map((it) => ({
                        title: it.title,
                        href: it.href,
                        bgColor: it.bgColor,
                        color: it.color,
                        imageSlug: it.imageSlug,
                        image: resolveMedia(it.image),
                    })) ?? null}
                />
            );
        case 'methods-list': {
            const excluded = (section.excludedSlugs ?? '')
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean);
            return (
                <PrintMethodsScreen
                    key={key}
                    excludedMethods={excluded}
                    sectionTitle={section.sectionTitle}
                    sectionSubtitle={section.sectionSubtitle}
                />
            );
        }
        case 'stages':
            return (
                <StagesScreen
                    key={key}
                    sectionTitle={section.sectionTitle}
                    ctaHref={section.ctaHref}
                    items={section.items?.map((it) => ({
                        title: it.title,
                        text: it.text,
                        imageSlug: it.imageSlug,
                        image: resolveMedia(it.image),
                    })) ?? null}
                />
            );
        case 'pricing-table':
            return (
                <PriceScreen
                    key={key}
                    sectionTitle={section.sectionTitle}
                    sectionSubtitle={section.sectionSubtitle}
                    mainBlockText={section.mainBlockText}
                    mainBlockCtaLabel={section.mainBlockCtaLabel}
                    mainBlockPopupTitle={section.mainBlockPopupTitle}
                    sideInfoText={section.sideInfoText}
                    rows={section.rows?.map((r) => ({
                        method: r.method,
                        caption: r.caption,
                        cells: r.cells ?? null,
                    })) ?? null}
                />
            );
        case 'about':
            return (
                <SinceScreen
                    key={key}
                    title={section.title}
                    highlight={section.highlight}
                    subtitle={section.subtitle}
                    items={section.items?.map((it) => ({ title: it.title, text: it.text })) ?? null}
                />
            );
        case 'testimonials':
            return (
                <FeedbackScreen
                    key={key}
                    sectionTitle={section.sectionTitle}
                    ratingValue={section.ratingValue}
                    ratingText={section.ratingText}
                    yandexUrl={section.yandexUrl}
                    googleUrl={section.googleUrl}
                    items={section.items?.map((it) => ({
                        author: it.author,
                        text: it.text,
                        rating: it.rating ?? undefined,
                    })) ?? null}
                />
            );
        case 'faq':
            return (
                <FaqScreen
                    key={key}
                    sectionTitle={section.sectionTitle}
                    items={section.items?.map((it) => ({ question: it.question, answer: it.answer })) ?? null}
                />
            );
        case 'cta': {
            // 2 visual variants currently in use:
            //   - 'shop' / 'generic'  → ShopLeadScreen (зелёная плашка с TeeClient)
            //   - 'form'              → FormScreen (леворукий блок + LeadButton)
            if (section.variant === 'form') {
                return (
                    <FormScreen
                        key={key}
                        title={section.title}
                        description={section.description}
                        ctaLabel={section.ctaLabel}
                    />
                );
            }
            return (
                <ShopLeadScreen
                    key={key}
                    title={section.title}
                    subtitle={section.subtitle}
                    ctaLabel={section.ctaLabel}
                    ctaHref={section.ctaHref}
                    isExternal={section.isExternal}
                />
            );
        }
        default:
            return null;
    }
}

/**
 * Static fallback for the initial render — preserves the historical layout
 * order in case Payload returns an empty/missing sections array.
 */
function renderStaticFallback() {
    return (
        <>
            <MainScreen />
            <CatalogLeadScreen />
            <PhotosScreen />
            <PrintMethodsScreen />
            <ShopLeadScreen />
            <StagesScreen />
            <PriceScreen />
            <SinceScreen />
            <FormScreen />
            <HowToScreen />
            <FeedbackScreen />
            <FaqScreen />
            <MapScreen />
        </>
    );
}

const App = async () => {
    // Промисы пускаем в параллель — каждая factory async, но друг от друга
    // не зависят. cache() внутри markups.ts дедупит getSiteSettings() между
    // LocalBusiness + Service.
    const [localBusinessJsonLd, webPageJsonLd, serviceJsonLd, homePage] = await Promise.all([
        getLocalBusinessJsonLD(),
        getWebPageJsonLD(),
        getServiceJsonLD(),
        getHomePage(),
    ]);

    const sections = homePage?.sections ?? [];

    return (
        <>
            {sections.length > 0 ? (
                <>
                    {sections.map((section, idx) => renderSection(section, idx))}
                    {/* Visual-only sections: PhotosScreen / HowToScreen / MapScreen.
                        Kept as static positions in the layout (no editable content)
                        until a future wave folds them into blocks too. */}
                    <PhotosScreen />
                    <HowToScreen />
                    <MapScreen />
                </>
            ) : (
                renderStaticFallback()
            )}

            <MarkupScript jsonLd={localBusinessJsonLd} />
            <MarkupScript jsonLd={webPageJsonLd} />
            <MarkupScript jsonLd={FAQPageJsonLD} />
            <MarkupScript jsonLd={serviceJsonLd} />
        </>
    );
}

export default App;
