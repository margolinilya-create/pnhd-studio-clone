import React from "react";
import styles from "./page.module.css";
import {Metadata} from "next";
import MapScreen from "@/components/pages-components/main-page/map-screen/map-screen";
import MarkupScript from "@/components/shared-components/markup-script/markup-script";
import { SITE_INFO, CONTACTS } from "@/app/constants";
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

const Page: React.FC = () => {

  const jsonLdLocalBusiness = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${SITE_INFO.domain}/#localbusiness`,
    "name": SITE_INFO.legal_name,
    "alternateName": SITE_INFO.name,
    "url": SITE_INFO.domain,
    "description": "Студия печати на одежде в Санкт-Петербурге: печать принтов на футболках, создание мерча для брендов, широкоформатная печать.",
    "image": `${SITE_INFO.domain}/opengraph-image.jpg`,
    "telephone": CONTACTS.phone.raw,
    "email": CONTACTS.email,
    "priceRange": "₽₽",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": CONTACTS.address.street,
      "addressLocality": CONTACTS.address.locality,
      "postalCode": CONTACTS.address.postal_code,
      "addressCountry": "RU"
    },
    "geo": {
      "@type": "GeoCoordinates",
      // Координаты ул. Чапыгина, 1, СПб (Аптекарский остров)
      "latitude": 59.972,
      "longitude": 30.318
    },
    "openingHoursSpecification": [
      {
        "@type": "OpeningHoursSpecification",
        "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        "opens": "11:00",
        "closes": "20:00"
      }
    ],
    "contactPoint": {
      "@type": "ContactPoint",
      "telephone": CONTACTS.phone.raw,
      "contactType": "customer service",
      "email": CONTACTS.email,
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
        "item": "https://studio.pnhd.ru/"
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Контакты",
        "item": "https://studio.pnhd.ru/contacts"
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