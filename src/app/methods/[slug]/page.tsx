import React from "react";
import styles from "./page.module.css";
import methodsData from "@/app/utils/print-methods-data";
import Image from "next/image";
import PriceScreen from "@/components/pages-components/main-page/price-screen/price-screen";
import MapScreen from "@/components/pages-components/main-page/map-screen/map-screen";
import {Metadata} from "next";
import DtfCalculator from "@/components/pages-components/method-page/dtf-calculator/dtf-calculator";
import Link from "next/link";
import {ssOptions} from "@/app/utils/method-options-data";
import {prices} from "@/app/utils/constants";
import MarkupScript from "@/components/shared-components/markup-script/markup-script";
import PrintMethodsScreen from "@/components/pages-components/main-page/print-methods-screen/print-methods-screen";
import {type} from "node:os";
import { SITE_INFO } from "@/app/constants";
import AdvantagesComponent from "@/components/pages-components/method-page/advantages/advantages";

export const generateMetadata = async (props: { params: Promise<{ slug: string }> }): Promise<Metadata> => {
  const params = await props.params;
  const method = methodsData.find((item) => item.slug === params.slug);
  const currentUrl = SITE_INFO.domain+'/methods/'+params.slug

  return {
    title: method?.meta.metaTitle,
    description: method?.meta.metaDescription,
    keywords: method?.meta.metaKeywords,
    openGraph: {
      type: 'website',
      url: currentUrl,
      title: method?.ruName,
      description: method?.brief_subtitle,
      siteName: SITE_INFO.name,
    },
    alternates: {
      canonical: currentUrl,
    },
  }
}


const MethodPage: React.FC<{
  params: Promise<{ slug: string }>;
}> = async props => {
  const params = await props.params;

  const method = methodsData.find((item) => item.slug === params.slug);
  const options = ssOptions.filter((item) => item.parent === method?.name);

  const jsonLdWebPage = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": method?.main_title ?? "",
    "description": method?.meta.metaDescription ?? "",
    "url": `https://studio.pnhd.ru/methods/${method?.slug}`
    ,
    "mainEntity": {
      "@type": "Service",
      "name": method?.main_title ?? ""
    },
    "primaryImageOfPage": {
      "@type": "ImageObject",
      "url": `https://studio.pnhd.ru${method?.images.main.src ?? ""}`,
    }
  }
  const offers: object[] = [];

  prices.forEach((priceGroup) => {
    priceGroup.prices.forEach((price) => {
      const cleanedPrice = price.price.replace(/Р\./g, '').trim();
      if (cleanedPrice.includes('/')) {
        const [whitePrice, colorPrice] = cleanedPrice.split('/').map(p => p.trim());
        offers.push({
          "@type": "Offer",
          "price": whitePrice,
          "priceCurrency": "RUB",
          "description": `${priceGroup.name} ${price.format} на белой ткани`,
          "availability": "https://schema.org/InStock"
        });
        offers.push({
          "@type": "Offer",
          "price": colorPrice,
          "priceCurrency": "RUB",
          "description": `${priceGroup.name} ${price.format} на цветной ткани`,
          "availability": "https://schema.org/InStock"
        });
      } else {
        offers.push({
          "@type": "Offer",
          "price": cleanedPrice,
          "priceCurrency": "RUB",
          "description": `${priceGroup.name} ${price.format}`,
          "availability": "https://schema.org/InStock"
        });
      }
    });
  });

  const jsonLdService = {
    "@context": "https://schema.org",
    "@type": "Service",
    "name": method?.main_title ?? "",
    "description": method?.brief_subtitle ?? "",
    "provider": {
      "@type": "LocalBusiness",
      "name": "PNHD>STUDIO",
      "address": {
        "@type": "PostalAddress",
        "addressLocality": "Санкт-Петербург",
        "streetAddress": "ул. Чапыгина, д. 1"
      }
    },
    "areaServed": "Санкт-Петербург",
    "offers": offers
  }
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
        "name": "Методы печати",
        "item": "https://studio.pnhd.ru/methods"
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": `${method?.main_title ?? ""}`,
        "item": `https://studio.pnhd.ru/methods/${method?.slug ?? ""}`
      }
    ]
  }

  return (
    <>
      {method && (
        <>
          <section className={styles.method_mainScreen}>
            <div className={styles.method_titleWrapper}>
              <h1
                className={styles.method_title}
              >{`METHODS> ${method.main_title}`}</h1>
            </div>
            <Image
              src={method.images.main}
              alt="обложка"
              className={styles.method_cover}
            />
          </section>
          <section className={styles.method_brief}>
            <div className={styles.main_text_wrapper}>
              <h2 className={styles.brief_title}>КРАТКО</h2>
              <p className={styles.brief_text}>{method.brief_subtitle}</p>
            </div>
            {/* <div className={styles.blocks_wrapper}>
                            <div className={styles.block}>
                                <h2 className={styles.brief_title}>ПЛЮСЫ</h2>
                                <ul className={styles.pros_list}>
                                    {option.pros && option.pros.split(',').map((item, index) => (
                                        <li className={styles.pros_list_item} key={index}>{item}</li>
                                    ))}
                                </ul>
                            </div>
                            <div className={styles.block}>
                                <h2 className={styles.brief_title}>МИНУСЫ</h2>
                                <ul className={styles.pros_list}>
                                    {option.cons && option.cons.split(',').map((item, index) => (
                                        <li className={styles.pros_list_item} key={index}>{item}</li>
                                    ))}
                                </ul>
                            </div>
                        </div> */}
          </section>

          <section className={styles.method_gallery}>
            {method.images.gallery.map((item, index) => (
              <Image
                className={styles.gallery_img}
                alt="print sample"
                src={item}
                loading="lazy"
                decoding="async"
                key={index}
              />
            ))}
          </section>

          <section className={styles.method_description}>
            <h2 className={styles.brief_title}>{method.faq.title}</h2>
            <div className={styles.brief_text} dangerouslySetInnerHTML={{__html: Array.isArray(method.faq.description) ? method.faq.description.join('') : method.faq.description}}></div>
            <ul className={styles.description_list}>
              {method.faq.variants.map((item, index) => (
                <li className={styles.description_listItem} key={index}>
                  <h3 className={styles.listItem_title}>{'> '}{item.screen_heading}</h3>
                  <p className={styles.listItem_text}>{item.screen_description}</p>
                </li>
              ))}
            </ul>
          </section>

          {method.name === 'DTF' && <DtfCalculator/>}
          <PriceScreen/>
          <AdvantagesComponent />
          <PrintMethodsScreen excludedMethods={[params.slug]}/>
          <MapScreen/>
          <section className={styles.more_block}>
            <div className={styles.main_text_wrapper}>
              <h3 className={styles.brief_title}>ЧТО ДАЛЬШЕ?</h3>
              <div className={styles.link_wrapper}>
                <Link href='/methods'>К методам печати</Link>
                <Link href='/'>На главную</Link>
                <Link href='/shop'>В каталог</Link>
              </div>
            </div>
            <div className={styles.main_text_wrapper}>
              <h3 className={styles.brief_title}>ЧТО ЕЩЕ ПОЧИТАТЬ?</h3>
              <div className={styles.link_wrapper}>
                {options && options.map((item, index) => (
                  <Link href={`/methods/${item.slug}/${item.type}`} key={index}>{item.title} {item.subtitle}</Link>
                ))}
              </div>
            </div>
          </section>
          <MarkupScript jsonLd={jsonLdWebPage}/>
          <MarkupScript jsonLd={jsonLdService}/>
          <MarkupScript jsonLd={jsonLdBreadcrumbList}/>
        </>
      )}
    </>
  );
};
export default MethodPage;
