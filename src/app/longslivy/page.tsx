import React from "react";
import styles from "@/app/contacts/page.module.css";
import {Metadata} from "next";
import MarkupScript from "@/components/shared-components/markup-script/markup-script";
import FaqSection from '@/components/pages-components/main-page/faq-screen/faq-screen';
import {SITE_INFO} from "@/app/constants";
import {IProduct} from "@/app/utils/types";
import { getAllProducts } from "@/lib/queries/products";
import ProductCardsBlock from "@/components/pages-components/shop-page/product-cards-block/product-cards-block";

export const metadata: Metadata = {
    title: 'Печать принта на лонгсливах - нанесение принтов и логотипов на заказ от 1 шт',
    description: 'Печать принта на лонгсливах на заказ в СПб✅Нанесение любого дизайна на одежду✅ Быстрое изготовление партий от 1 шт.✅Выгодные цены и доставка по всей России',
    metadataBase: new URL('https://studio.pnhd.ru'),
};

const Page: React.FC = async () => {
    const shopData: Array<IProduct> = await getAllProducts({type: 'longsleeve'});
    const slug = 'longslivy';
    const h1 = 'Печать на лонгсливах в СПб';
    const jsonLdBreadcrumbList = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {
                "@type": "ListItem",
                "position": 1,
                "name": "Главная",
                "item": SITE_INFO.domain
            },
            {
                "@type": "ListItem",
                "position": 2,
                "name": h1,
                "item": SITE_INFO.domain+'/'+slug
            }
        ]
    }
    const jsonLdWebpage = {
        "@context": "https://schema.org",
        "@type": "WebPage",
        "name": h1,
        "description": metadata.description,
        "url": SITE_INFO.domain+'/'+slug,
        "breadcrumb": {
            "@type": "BreadcrumbList",
            "itemListElement": [
                {
                    "@type": "ListItem",
                    "position": 1,
                    "name": "Главная",
                    "item": SITE_INFO.domain
                },
                {
                    "@type": "ListItem",
                    "position": 2,
                    "name": h1,
                    "item": SITE_INFO.domain+'/'+slug
                }
            ]
        }
    }
    const jsonLdFaq = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [] as any[]
    }
    const faqSet = [
        {
            title: 'Какой метод нанесения вы используете для печати?',
            text: 'Мы используем современный метод прямой цифровой печати. Этот способ нанесения позволяет переносить на одежду изображения любой сложности с фотографическим качеством, сохраняя при этом мягкость ткани. Печать получается яркой и очень долговечной.',
        },
        {
            title: 'Можно ли сделать заказ с собственным дизайном',
            text: 'Конечно! Это основное направление нашей работы. Вы можете прислать любое изображение, рисунок, логотип или даже просто текст (например, имя) в удобном формате. Мы подготовим макет для печати и согласуем его с вами перед началом работ.',
        },
        {
            title: 'Сколько времени занимает весь процесс?',
            text: 'Весь процесс от оформления заказа до получения готовой вещи обычно занимает от 2 до 5 дней. Срок зависит от сложности дизайна и текущей загрузки studio. Точные сроки мы называем индивидуально при обсуждении вашего заказа.',
        },
        {
            title: 'Насколько стойкой будет печать после стирок?',
            text: 'При правильном уходе нанесенное изображение сохраняет свои качества очень долго. Мы рекомендуем стирать изделие при температуре до 40°C, выворачивая наизнанку, и не использовать агрессивные отбеливатели. Наша печать выдерживает множество стирок, не теряя яркости.',
        },
        {
            title: 'Можно ли посмотреть отзывы ваших клиентов?',
            text: 'Да, с отзывами о нашей работе и примерами готовых работ вы можете ознакомиться в специальном разделе на сайте или в наших социальных сетях. Мы ценим честную обратную связь.',
        },
    ]
    for (let faqItem of faqSet){
        jsonLdFaq['mainEntity'].push({
            "@type": "Question",
            "name": faqItem['title'],
            "acceptedAnswer": {
                "@type": "Answer",
                "text": faqItem['text']
            }
        })
    }

    return (
        <>
            <MarkupScript jsonLd={jsonLdBreadcrumbList}/>
            <MarkupScript jsonLd={jsonLdWebpage}/>
            <MarkupScript jsonLd={jsonLdFaq}/>
            <div className="breadcrumbs">
                <a className={'breadcrumb-item'} href="/">Главная</a>
                <span className={'breadcrumb-item'}>{h1}</span>
            </div>
            <div className={styles.title_wrapper}>
                <h1 className={styles.page_title}>{h1}</h1>
            </div>

            {shopData && shopData.length > 0 && <ProductCardsBlock shopData={shopData}/>}

            <h2>Печать принта на лонгсливах на заказ</h2>
            <p>Лонгслив &mdash; идеальный формат для прохладной погоды, тренировок или создания стильного повседневного образа. Хочешь, чтобы эта удобная одежда стала по-настоящему уникальной? Мы предлагаем качественную печать на лонгсливах в Санкт-Петербурге. Перенесем любой твой дизайн, имя, любимое фото или графику &mdash; и уже через несколько дней ты получишь вещь, которой больше нет ни у кого.</p>
            <h2>Как проходит процесс?</h2>
            <ul>
                <li>Выбор и заказ. В нашем каталоге ты найдешь лонгсливы разных фасонов и цветов. Определись с моделью и оформи заказ онлайн или в нашей studio.</li>
                <li>Подготовка макета. Присылай свое изображение в любом формате. Если нужно, наши дизайнеры помогут его доработать для идеального результата.</li>
                <li>Печать и нанесение. Мы используем современный цифровой метод нанесения. Эта технология гарантирует яркие краски и отличную детализацию, а изображение будет стойким к стиркам.</li>
                <li>Готово! После завершения всех этапов работ ты можешь забрать свой уникальный лонгслив или заказать курьерскую доставку по городу.</li>
            </ul>
            <h2>Почему стоит обратиться к нам?</h2>
            <ul>
                <li>Индивидуальный подход. Мы печатаем от одной вещи, помогая реализовать твою личную идею.</li>
                <li>Качество результата. Используем проверенные материалы, чтобы печать радовала тебя долго.</li>
                <li>Скорость и простота. Четкие этапы работы и короткие сроки исполнения.</li>
                <li>Доверие. Наша репутация подтверждена реальными отзывами довольных клиентов.</li>
            </ul>

            <p>Готов создать свою авторскую вещь? Загляни в каталог на сайте, чтобы выбрать основу, и свяжись с нами по контактам, указанным ниже, чтобы обсудить свой заказ!</p>

            <FaqSection faqSet={faqSet}/>
        </>
    )
}

export default Page;