import React from "react";
import styles from "./page.module.css";
import {Metadata} from "next";
import MapScreen from "@/components/pages-components/main-page/map-screen/map-screen";
import MarkupScript from "@/components/shared-components/markup-script/markup-script";
import { resolveDomain } from "@/lib/site/domain";
import { buildMetadata } from "@/app/_lib/build-metadata";
import { getSiteSettings } from "@/lib/queries/site-settings";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  const siteName = settings?.siteName ?? 'PINHEAD STUDIO';
  const legalName = settings?.legalName ?? 'ООО ПИНХЭД СТУДИО';
  return await buildMetadata({
    title: `Контакты ${siteName} — печать на одежде в Санкт-Петербурге`,
    description: `Контакты студии печати на одежде ${legalName} в Санкт-Петербурге: печать принтов на футболках, создание мерча для брендов, широкоформатная печать.`,
    path: '/contacts',
    image: '/opengraph-image.jpg',
  });
}

const Page = async () => {
  const settings = await getSiteSettings();
  const base = resolveDomain();
  const phone = settings?.phone ?? '+7 (812) 904 61 56';
  const phoneRaw = phone.replace(/[^\d+]/g, '');
  const legalName = settings?.legalName ?? 'ООО ПИНХЭД СТУДИО';
  const siteName = settings?.siteName ?? 'PINHEAD STUDIO';
  const email = settings?.contacts?.email ?? 'studio@pnhd.ru';
  const addr = settings?.contacts?.address;
  const geo = settings?.geo;
  const openingHours = settings?.openingHours ?? 'Mo-Fr 11:00-20:00';

  const jsonLdLocalBusiness = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${base}/#localbusiness`,
    "name": legalName,
    "alternateName": siteName,
    "url": base,
    "description": "Студия печати на одежде в Санкт-Петербурге: печать принтов на футболках, создание мерча для брендов, широкоформатная печать.",
    "image": `${base}/opengraph-image.jpg`,
    "telephone": phoneRaw,
    "email": email,
    "priceRange": "₽₽",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": addr?.street ?? 'ул. Чапыгина, д. 1',
      "addressLocality": addr?.locality ?? 'Санкт-Петербург',
      "postalCode": addr?.postalCode ?? '197022',
      "addressCountry": addr?.country ?? 'RU',
    },
    "geo": {
      "@type": "GeoCoordinates",
      // Координаты ул. Чапыгина, 1, СПб (Аптекарский остров)
      "latitude": geo?.latitude ?? 59.972,
      "longitude": geo?.longitude ?? 30.318,
    },
    "openingHoursSpecification": [
      {
        "@type": "OpeningHoursSpecification",
        "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        "opens": "11:00",
        "closes": "20:00"
      }
    ],
    "openingHours": [openingHours],
    "contactPoint": {
      "@type": "ContactPoint",
      "telephone": phoneRaw,
      "contactType": "customer service",
      "email": email,
      "availableLanguage": ["Russian"]
    },
    "sameAs": [
      "https://vk.com/pinheadspb",
      "https://t.me/pnhd_studio_bot"
    ]
  };
  const jsonLdBreadcrumbList = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Главная",
        "item": `${base}/`
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Контакты",
        "item": `${base}/contacts`
      }
    ]
  }

  return (
    <>
      <div className={styles.title_wrapper}>
        <h1 className={styles.page_title}>Контакты</h1>
      </div>
      <MapScreen />
      <section className={styles.method_brief}>
        <div className={styles.main_text_wrapper}>
          <h2 className={styles.brief_title}>Реквизиты</h2>
          <p className={styles.brief_text}>
            - Наименование организации: ООО ПИНХЭД СТУДИО<br/>
            - ИНН:7810463916<br/>
            - КПП: 781301001
          </p>
        </div>
      </section>
      <MarkupScript jsonLd={jsonLdLocalBusiness}/>
      <MarkupScript jsonLd={jsonLdBreadcrumbList}/>
    </>
  )
}

export default Page;
