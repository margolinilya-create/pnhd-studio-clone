import 'server-only';

import { cache } from 'react';

import { getSiteSettings } from '@/lib/queries/site-settings';
import { resolveDomain } from '@/lib/site/domain';

// Хелпер: strip non-digit characters from phone string for tel:/JSON-LD raw format
// ("+7 (812) 904-61-56" -> "+78129046156"). Сохраняет ведущий '+'.
const toRawPhone = (phone: string): string => phone.replace(/[^\d+]/g, '');

// Конвертация JSON-LD в async-factories (см. W-SEO-01 / Wave 0.1.5 task D):
// раньше эти константы дёргали SITE_INFO.domain + хардкодили phone/email/address
// модулем-импортом. После задачи A в SiteSettings лежат contacts/openingHours,
// читаем оттуда. cache() — per-request dedupe, если один и тот же JSON-LD
// импортируется на нескольких subtree'ах.

export const getLocalBusinessJsonLD = cache(async () => {
  const settings = await getSiteSettings();
  const base = resolveDomain().replace(/\/$/, '');
  const phone = settings?.phone ?? '+7 (812) 904 61 56';
  const email = settings?.contacts?.email ?? 'studio@pnhd.ru';
  const addr = settings?.contacts?.address;
  const openingHours = settings?.openingHours ?? 'Пн-Пт 11:00-20:00';

  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "name": "PNHD>STUDIO",
    "description": "Печать на одежде на заказ от 1 штуки в Санкт-Петербурге по выгодной цене в ПИНХЭД СТУДИЯ. Сколько стоит печать на одежде смотрите онлайн на нашем сайте.",
    "url": `${base}/`,
    "telephone": toRawPhone(phone),
    "email": email,
    "address": {
      "@type": "PostalAddress",
      "streetAddress": addr?.street ?? 'ул. Чапыгина, д. 1',
      "addressLocality": addr?.locality ?? 'Санкт-Петербург',
      "postalCode": addr?.postalCode ?? '197022',
      "addressCountry": addr?.country ?? 'RU',
    },
    "openingHours": [openingHours],
    "priceRange": "₽",
    "areaServed": "Санкт-Петербург и область",
  };
});

export const getWebPageJsonLD = cache(async () => {
  const base = resolveDomain().replace(/\/$/, '');
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": "PNHD>STUDIO",
    "description": "Печать на одежде на заказ от 1 штуки в Санкт-Петербурге по выгодной цене в ПИНХЭД СТУДИЯ. Сколько стоит печать на одежде смотрите онлайн на нашем сайте.",
    "url": `${base}/`,
    "mainEntity": {
      "@type": "Service",
      "name": "Печать на одежде",
      "description": "Печать на одежде в Санкт-Петербурге на заказ",
    },
  };
});

// FAQPageJsonLD — pure content (FAQ Q&A) без domain/contact зависимостей.
// Оставляем static const'ом — миграция в Payload (если когда-то понадобится) —
// уже отдельная задача (FAQ-коллекция).
export const FAQPageJsonLD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "Как к вам проехать?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Повернуть с Каменноостровского проспекта на улицу Чапыгина и пройти к следующему крыльцу после Wildberries",
      },
    },
    {
      "@type": "Question",
      "name": "Можно ли сделать шелкографию на 1 штуку?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Шелкография — тиражный метод печати, делаем её только для заказов от 50 штук. Ближайший аналог — DTF",
      },
    },
    {
      "@type": "Question",
      "name": "Есть ли доставка?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "По СПб можно вызвать к нам курьера любой службы. Укажи номер заказа в комментариях и вызови доставку до двери. По РФ доставляем через СДЭК. Если нужна другая транспортная компания, то её можно вызвать самостоятельно",
      },
    },
    {
      "@type": "Question",
      "name": "Можно ли вышить/напечатать логотип известного бренда?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Мы можем отказать в печати логотипа бренда, чтобы не нарушать авторские права, либо запросить подтверждение прав",
      },
    },
  ],
};

export const getServiceJsonLD = cache(async () => {
  const settings = await getSiteSettings();
  const base = resolveDomain().replace(/\/$/, '');
  const phone = settings?.phone ?? '+7 (812) 904 61 56';

  return {
    "@context": "https://schema.org",
    "@type": "Service",
    "serviceType": "Печать на одежде",
    "provider": {
      "@type": "LocalBusiness",
      "name": "PNHD>STUDIO",
    },
    "description": "Печать на одежде в Санкт-Петербурге на заказ",
    "areaServed": "Санкт-Петербург и область",
    "availableChannel": {
      "@type": "ServiceChannel",
      "serviceUrl": `${base}/`,
      "servicePhone": toRawPhone(phone),
    },
  };
});

export const getCatalogPageBreadCrumbsJsonLD = cache(async () => {
  const base = resolveDomain().replace(/\/$/, '');
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Главная", "item": `${base}/` },
      { "@type": "ListItem", "position": 2, "name": "Каталог", "item": `${base}/shop` },
    ],
  };
});

export const getCatalogPageNavigationJsonLD = cache(async () => {
  const base = resolveDomain().replace(/\/$/, '');
  return {
    "@context": "https://schema.org",
    "@type": "SiteNavigationElement",
    "name": "Каталог",
    "url": `${base}/shop`,
    "description": "Каталог одежды и сумок для печати в Санкт-Петербурге. Печать на футболках,толстовках, шопперах на заказ от 1 штуки по выгодной цене в ПИНХЭД СТУДИЯ",
  };
});
