# Tech debt — frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Закрыть Cosmetic / tech-debt пункты: убрать Three.js из synchronous-bundle (`dynamic({ssr:false})`), снести копипасту 6 категорийных страниц в один `<CategoryPage>` + 6 конфигов, добавить active-link highlight в admin sidebar.

**Architecture:** `<Tee>` сейчас импортируется напрямую двумя screen'ами на главной — обёртка `next/dynamic` с `ssr: false` и `loading` placeholder'ом разгружает initial bundle (~600KB gzipped экономии). Категорийные страницы (`/futbolki`, `/hudi`, `/kepki`, `/longslivy`, `/svitshoty`, `/shoppery`) собираются в один shared async server component `<CategoryPage>`, который принимает `{slug, productType, h1, metaDescription, faqSet, bodyContent}` — каждый `page.tsx` остаётся как ~20-строчная shell. URL'ы не трогаются, SEO/canonical stay intact. AdminShell получает `usePathname()`-based highlighting через `selected` prop у `<ListItemButton>`.

**Tech Stack:** Next.js 14 App Router + `dynamic()`, React Server Components, MUI v7 (`ListItemButton selected`), `usePathname()` из `next/navigation`.

---

## File structure

**Создаются:**
- `src/components/shared-components/3d-tee/tee-placeholder.tsx` — статичный fallback пока 3D грузится
- `src/components/pages-components/category-page/category-page.tsx` — shared async server component
- `src/components/pages-components/category-page/category-page.module.css` — стили (если не получится переиспользовать `contacts/page.module.css`)
- `src/app/futbolki/config.tsx` — конфиг (с JSX bodyContent → расширение `.tsx`)
- `src/app/hudi/config.tsx`
- `src/app/kepki/config.tsx`
- `src/app/longslivy/config.tsx`
- `src/app/svitshoty/config.tsx`
- `src/app/shoppery/config.tsx`

**Модифицируются:**
- `src/components/pages-components/main-page/main-screen/main-screen.tsx` — `<Tee>` через `next/dynamic`
- `src/components/pages-components/main-page/shop-lead-screen/shop-lead-screen.tsx` — то же
- `src/app/futbolki/page.tsx` — shrink to shell
- `src/app/hudi/page.tsx`
- `src/app/kepki/page.tsx`
- `src/app/longslivy/page.tsx`
- `src/app/svitshoty/page.tsx`
- `src/app/shoppery/page.tsx`
- `src/app/admin/_components/AdminShell.tsx` — active-link highlight
- `CLAUDE.md` — обновить §3, §10, §11

---

## Task 1: TeePlaceholder component

**Files:**
- Create: `src/components/shared-components/3d-tee/tee-placeholder.tsx`

- [ ] **Step 1: Write placeholder component**

```tsx
// src/components/shared-components/3d-tee/tee-placeholder.tsx
//
// Статичный fallback пока 3D-сцена (three+drei+maath) асинхронно грузится.
// Visual ~3D Tee proportions чтобы не было layout shift.

import React from 'react';

const TeePlaceholder: React.FC = () => {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        aspectRatio: '1 / 1',
        background:
          'linear-gradient(135deg, rgba(0,0,0,0.04) 0%, rgba(0,0,0,0.08) 50%, rgba(0,0,0,0.04) 100%)',
        backgroundSize: '200% 200%',
        animation: 'tee-placeholder-pulse 2s ease-in-out infinite',
        borderRadius: 8,
      }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 200 220" width="60%" height="60%" fill="none" stroke="rgba(0,0,0,0.18)" strokeWidth={2}>
        <path d="M50 30 L80 15 Q100 25 120 15 L150 30 L180 60 L155 75 L155 200 L45 200 L45 75 L20 60 Z" />
      </svg>
      <style jsx>{`
        @keyframes tee-placeholder-pulse {
          0%, 100% { background-position: 0% 0%; }
          50% { background-position: 100% 100%; }
        }
      `}</style>
    </div>
  );
};

export default TeePlaceholder;
```

- [ ] **Step 2: Typecheck**

```bash
npx tsc --noEmit
```

Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/components/shared-components/3d-tee/tee-placeholder.tsx
git commit -m "feat(3d): add TeePlaceholder fallback for dynamic-loaded Tee"
```

---

## Task 2: Wrap Tee in dynamic() — main-screen

**Files:**
- Modify: `src/components/pages-components/main-page/main-screen/main-screen.tsx:11`

- [ ] **Step 1: Read current import**

```bash
sed -n '1,20p' src/components/pages-components/main-page/main-screen/main-screen.tsx
```

Expected: видишь строку `import Tee from '@/components/shared-components/3d-tee/3d-tee';` (line 11).

Также проверь — это server- или client-component? Если файл начинается с `'use client'` — порядок import'ов и применение `dynamic()` — стандартное. Если server-component — `dynamic({ssr: false})` всё равно работает (Next.js поддерживает это с App Router в Server Components, но nicer всё-таки если file marked `'use client'` где `<Tee>` используется в JSX).

- [ ] **Step 2: Replace static import with dynamic**

Edit `src/components/pages-components/main-page/main-screen/main-screen.tsx`:

Заменить строку 11 `import Tee from '@/components/shared-components/3d-tee/3d-tee';` на:

```tsx
import dynamic from 'next/dynamic';
import TeePlaceholder from '@/components/shared-components/3d-tee/tee-placeholder';

const Tee = dynamic(() => import('@/components/shared-components/3d-tee/3d-tee'), {
  ssr: false,
  loading: () => <TeePlaceholder />,
});
```

Если файл — Server Component (нет `'use client'` в начале), то `ssr: false` в Server Components не поддерживается — нужно либо добавить `'use client'` к файлу (если уже не стоит и логика клиентская), либо вынести `<Tee>` в маленькую client-wrapper. Проще всего — wrapper:

Если main-screen.tsx — Server Component, создать `src/components/pages-components/main-page/main-screen/tee-client.tsx`:

```tsx
'use client';

import dynamic from 'next/dynamic';
import TeePlaceholder from '@/components/shared-components/3d-tee/tee-placeholder';

const Tee = dynamic(() => import('@/components/shared-components/3d-tee/3d-tee'), {
  ssr: false,
  loading: () => <TeePlaceholder />,
});

export default function TeeClient({ backdropStatus, fov }: { backdropStatus: boolean; fov: number }) {
  return <Tee backdropStatus={backdropStatus} fov={fov} />;
}
```

И в main-screen.tsx импортировать `TeeClient` вместо `Tee`, использовать в JSX как `<TeeClient backdropStatus={...} fov={...} />`.

Решение принимается в Step 1 после `head -1` файла. Если уже `'use client'` — inline dynamic; если Server Component — через wrapper.

- [ ] **Step 3: Build**

```bash
npm run build
```

Expected: проходит. Бандл-output должен показать вынесенные chunks для three/drei.

- [ ] **Step 4: Manual smoke**

```bash
npm run dev
```

Открыть `/` — на первом fold должна быть футболка. Сначала проявляется placeholder (pulse), потом подменяется на 3D. В DevTools Network — три/drei chunks грузятся отдельно от main bundle.

- [ ] **Step 5: Commit**

```bash
git add src/components/pages-components/main-page/main-screen/ 2>/dev/null
git commit -m "perf(3d): dynamic-import Tee in main-screen via TeeClient wrapper"
```

(имя коммита подстраивается под выбранную в Step 2 стратегию — inline или wrapper.)

---

## Task 3: Wrap Tee in dynamic() — shop-lead-screen

**Files:**
- Modify: `src/components/pages-components/main-page/shop-lead-screen/shop-lead-screen.tsx:10`

- [ ] **Step 1: Read current state**

```bash
head -15 src/components/pages-components/main-page/shop-lead-screen/shop-lead-screen.tsx
```

Запоминаем — `'use client'` стоит или нет?

- [ ] **Step 2: Apply same strategy as Task 2**

Если inline возможно (file = `'use client'`) — заменить import на `dynamic()` блок (см. Task 2 Step 2).

Если server-component — либо вынести через client-wrapper (как Task 2), либо переиспользовать ровно тот же `TeeClient` что создан в Task 2 (если на странице identical вызов).

Проверь сигнатуру `<Tee>` в существующем JSX — если props те же `{backdropStatus, fov}`, переиспользуй `TeeClient` из Task 2 без копирования. Если props разные — отдельный wrapper.

- [ ] **Step 3: Build + smoke**

```bash
npm run build && npm run dev
```

Открыть `/shop` — на shop-lead-screen-блоке должна появиться футболка через placeholder.

- [ ] **Step 4: Commit**

```bash
git add src/components/pages-components/main-page/shop-lead-screen/
git commit -m "perf(3d): dynamic-import Tee in shop-lead-screen"
```

---

## Task 4: CategoryPage — shared component

**Files:**
- Create: `src/components/pages-components/category-page/category-page.tsx`

- [ ] **Step 1: Write CategoryPage**

```tsx
// src/components/pages-components/category-page/category-page.tsx
//
// Shared SEO-страница категории (futbolki, hudi, kepki, longslivy, svitshoty, shoppery).
// Заменяет 6 копипаст-файлов: data-config вынесен в src/app/{slug}/config.tsx,
// рендеринг + JSON-LD централизован здесь.

import React from 'react';
import { Metadata } from 'next';
import styles from '@/app/contacts/page.module.css';
import { SITE_INFO } from '@/app/constants';
import { IProduct } from '@/app/utils/types';
import { getAllProducts } from '@/lib/queries/products';
import MarkupScript from '@/components/shared-components/markup-script/markup-script';
import FaqSection from '@/components/pages-components/main-page/faq-screen/faq-screen';
import ProductCardsBlock from '@/components/pages-components/shop-page/product-cards-block/product-cards-block';

export interface ICategoryFaqItem {
  title: string;
  text: string;
}

export interface ICategoryPageConfig {
  slug: string;           // 'futbolki' | 'hudi' | ...
  productType: string;    // 'tshirt' | 'hoodie' | ...
  h1: string;
  metaTitle: string;
  metaDescription: string;
  faqSet: Array<ICategoryFaqItem>;
  bodyContent: React.ReactNode;  // SEO copy: <h2>...</h2><p>...</p> etc.
}

export function buildMetadata(config: ICategoryPageConfig): Metadata {
  return {
    title: config.metaTitle,
    description: config.metaDescription,
    metadataBase: new URL('https://studio.pnhd.ru'),
  };
}

async function CategoryPage({ config }: { config: ICategoryPageConfig }) {
  const shopData: Array<IProduct> = await getAllProducts({ type: config.productType });

  const breadcrumbItems = [
    { '@type': 'ListItem', position: 1, name: 'Главная', item: SITE_INFO.domain },
    { '@type': 'ListItem', position: 2, name: config.h1, item: `${SITE_INFO.domain}/${config.slug}` },
  ];

  const jsonLdBreadcrumbList = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbItems,
  };

  const jsonLdWebpage = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: config.h1,
    description: config.metaDescription,
    url: `${SITE_INFO.domain}/${config.slug}`,
    breadcrumb: { '@type': 'BreadcrumbList', itemListElement: breadcrumbItems },
  };

  const jsonLdFaq = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: config.faqSet.map((q) => ({
      '@type': 'Question',
      name: q.title,
      acceptedAnswer: { '@type': 'Answer', text: q.text },
    })),
  };

  return (
    <>
      <MarkupScript jsonLd={jsonLdBreadcrumbList} />
      <MarkupScript jsonLd={jsonLdWebpage} />
      <MarkupScript jsonLd={jsonLdFaq} />
      <div className="breadcrumbs">
        <a className={'breadcrumb-item'} href="/">Главная</a>
        <span className={'breadcrumb-item'}>{config.h1}</span>
      </div>
      <div className={styles.title_wrapper}>
        <h1 className={styles.page_title}>{config.h1}</h1>
      </div>

      {shopData && shopData.length > 0 && <ProductCardsBlock shopData={shopData} />}

      {config.bodyContent}

      <FaqSection faqSet={config.faqSet} />
    </>
  );
}

export default CategoryPage;
```

- [ ] **Step 2: Typecheck**

```bash
npx tsc --noEmit
```

Expected: clean. Если `ProductCardsBlock` или `FaqSection` имеют типизированные props, которые не match — fix import paths.

- [ ] **Step 3: Commit**

```bash
git add src/components/pages-components/category-page/category-page.tsx
git commit -m "feat(seo): shared CategoryPage component для категорийных страниц"
```

---

## Task 5: Configs для 6 категорий

**Files:**
- Create: `src/app/futbolki/config.tsx`
- Create: `src/app/hudi/config.tsx`
- Create: `src/app/kepki/config.tsx`
- Create: `src/app/longslivy/config.tsx`
- Create: `src/app/svitshoty/config.tsx`
- Create: `src/app/shoppery/config.tsx`

- [ ] **Step 1: Create futbolki config**

Прочитать оригинал:

```bash
cat src/app/futbolki/page.tsx
```

Из него скопировать:
- `metadata.title` → `metaTitle`
- `metadata.description` → `metaDescription`
- `h1` → `h1`
- `faqSet` → `faqSet`
- JSX между `<h2>Печать на футболках в СПб за 15 минут!</h2>` и `<FaqSection .../>` → `bodyContent`

Write `src/app/futbolki/config.tsx`:

```tsx
// src/app/futbolki/config.tsx
import React from 'react';
import { ICategoryPageConfig } from '@/components/pages-components/category-page/category-page';

export const config: ICategoryPageConfig = {
  slug: 'futbolki',
  productType: 'tshirt',
  h1: 'Печать на футболках в Санкт-Петербурге',
  metaTitle: 'Печать принтов на футболках в СПб — нанесение принта на одежду на заказ от 1 шт',
  metaDescription: 'Печать принта на футболках на заказ в Санкт-Петербурге. Срочное нанесение любого дизайна по выгодным ценам от 1 шт за 15 минут. Доставка готовых заказов по СПб и всей России.',
  faqSet: [
    {
      title: 'Сколько стоит печать на футболке?',
      text: 'Окончательная цена на печать принта зависит от нескольких факторов: размера изображения, количества цветов, выбранного метода нанесения (например, прямая цифровая печать) и самой футболки из нашего каталога. Чтобы точно рассчитать стоимость вашего заказа, отправьте нам макет или опишите вашу идею.',
    },
    {
      title: 'Какой срок выполнения заказа?',
      text: 'Стандартный срок работы над заказом — 1-3 дня. Если вам нужна срочная печать от 15 минут в Санкт-Петербурге, обсудите эту возможность с нашим менеджером. Мы делаем всё возможное, чтобы вы получили свою уникальную футболку как можно быстрее, без потери в качестве.',
    },
    {
      title: 'Вы помогаете с созданием дизайна?',
      text: 'Конечно! Если у вас есть только идея, эскиз или фото, наши дизайнеры помогут создать готовый к печати макет. Мы работаем с любым форматом изображений и дорабатываем дизайн до совершенства, чтобы принт на футболке выглядел именно так, как вы задумали.',
    },
    {
      title: 'Печать будет держаться после стирки?',
      text: 'При правильном уходе (рекомендуется стирка при 30°C, выворачивание наизнанку) ваш принт сохранит яркость и четкость после множества стирок. Мы гарантируем стойкость нанесения печати.',
    },
    {
      title: 'Можно ли напечатать логотип или фотографию?',
      text: 'Да! Мы специализируемся на печати любых изображений: от корпоративных логотипов для мерча до личных фотографий и авторских иллюстраций.',
    },
  ],
  bodyContent: (
    <>
      <h2>Печать на футболках в СПб за 15 минут!</h2>
      <p>Хотите превратить любую идею в реальность? Мы делаем печать принта на футболку всего за 15 минут! Не нужно ждать дни или недели &mdash; вы можете сделать срочный заказ от 1 штуки и получить готовую вещь практически сразу. Это идеальный способ создать подарок, памятный сувенир или просто обновить гардероб уникальной вещью.</p>
      <h2>Как это работает? Быстро, просто, удобно</h2>
      <ol>
        <li>Приносите готовое изображение или фото на флешке, присылаете онлайн или создаете дизайн прямо у нас в студии с помощью конструктора. Хотите напечатать логотип, смешную надпись или портрет? Всё возможно!</li>
        <li>В нашем каталоге вы найдете футболки разных размеров, стилей и цветов: классические белые и черные, мужские, женские и детские модели. Подберем идеальную основу из мягкого качественного текстиля.</li>
        <li>Мы используем технологию прямой печати по ткани. Это позволяет мгновенно переносить даже сложные цветные изображения с фотографической четкостью. Ваш принт будет ярким и стойким.</li>
        <li>Готово! Через 15 минут вы забираете уникальную футболку. Нужна доставка по Санкт-Петербургу? Организуем!</li>
      </ol>
      <h2>Почему стоит заказать печать у нас?</h2>
      <p>Хотите узнать, почему стоит заказать печать именно у нас? Наши клиенты выбирают наши услуги снова и снова, и на то есть веские причины.</p>
      <p>В первую очередь, мы ценим ваше время, поэтому предлагаем рекордную скорость работы &mdash; создание уникальной футболки с принтом занимает всего 15 минут от момента утверждения макета до готового изделия. Мы не просто обещаем, а гарантируем такой результат благодаря отработанной технологии прямой печати по ткани.</p>
      <p>Во-вторых, мы создаем доступные условия для каждого: вы можете сделать заказ даже от одной штуки, не переплачивая за оптовую партию, что особенно удобно для личных проектов или пробного тиража. Если у вас нет готового изображения, наши дизайнеры оперативно помогут создать яркий дизайн или адаптировать ваше фото, логотип или любую графику для нанесения.</p>
      <p>Мы гордимся оптимальным соотношением цены и качества, используя только современное оборудование и проверенные материалы, чтобы ваш принт на футболке, толстовке или другом текстиле оставался ярким после многих стирок.</p>
      <p>Для вашего удобства мы предлагаем гибкую оплату и быструю доставку по Санкт-Петербургу (СПб), а также подробные контакты и адрес нашей студии вы всегда найдете на сайте.</p>
      <p>Убедиться в высоком уровне наших услуг можно по реальным отзывам клиентов, которые уже оценили скорость, креативность и надежность нашей печати на одежде.</p>
      <h2>Что еще можно напечатать?</h2>
      <p>Наша печать доступна не только на футболках! Вы можете перенести свой дизайн на толстовки, текстильные сумки шопперы и другую одежду. Создайте собственный стиль для себя, семьи или друзей.</p>
      <p>Заказать печать на футболках в Санкт-Петербурге проще простого. Приезжайте в нашу студию по адресу в СПб или свяжитесь с нами онлайн, чтобы обсудить ваш заказ. Создайте свою уникальную историю на ткани уже сегодня</p>
    </>
  ),
};
```

- [ ] **Step 2: Create hudi config**

Прочитать `src/app/hudi/page.tsx`, по той же схеме создать `src/app/hudi/config.tsx`:

```tsx
import React from 'react';
import { ICategoryPageConfig } from '@/components/pages-components/category-page/category-page';

export const config: ICategoryPageConfig = {
  slug: 'hudi',
  productType: 'hoodie',
  h1: 'Печать на худи',
  metaTitle: 'Печать принта на худи в СПб - закажите толстовки с нанесением в Санкт-Петербурге | Pinhead Studio',
  metaDescription: 'Печать на худи на заказ в СПб. Нанесение принтов, логотипа и дизайна на текстиль от 15 минут. Закажите качественную печать на толстовках и худи от 1 шт по выгодной цене.',
  faqSet: [
    /* скопировать из src/app/hudi/page.tsx faqSet (5 items) */
  ],
  bodyContent: (
    <>
      {/* скопировать JSX между <h2>Печать принта на худи в СПб от 15 минут</h2> и <FaqSection/> */}
    </>
  ),
};
```

**Не пиши заглушки в реальный файл** — скопируй полный faqSet array и bodyContent JSX из `src/app/hudi/page.tsx` (строки 68-89 для faqSet, строки 116-146 для JSX-body).

- [ ] **Step 3: Create kepki config**

Аналогично, из `src/app/kepki/page.tsx`:

```tsx
import React from 'react';
import { ICategoryPageConfig } from '@/components/pages-components/category-page/category-page';

export const config: ICategoryPageConfig = {
  slug: 'kepki',
  productType: 'cap',
  h1: 'Кепки с логотипом',
  metaTitle: 'Кепки и бейсболки с логотипом на заказ - нанесение принтов от 1 штуки по выгодной цене',
  metaDescription: 'Кепки и бейсболки с логотипом на заказ. Печать и вышивка на кепках от 1 штуки. Оперативная доставка по Санкт-Петербургу и России. Выгодные цены и специальные условия для заказа оптом.',
  faqSet: [
    /* строки 68-89 из src/app/kepki/page.tsx */
  ],
  bodyContent: (
    <>
      {/* строки 116-146 из src/app/kepki/page.tsx */}
    </>
  ),
};
```

- [ ] **Step 4: Create longslivy config**

Прочитать `src/app/longslivy/page.tsx`, скопировать поля. `productType: 'longsleeve'`.

- [ ] **Step 5: Create svitshoty config**

Прочитать `src/app/svitshoty/page.tsx`, скопировать поля. `productType: 'sweatshirt'`.

- [ ] **Step 6: Create shoppery config**

Прочитать `src/app/shoppery/page.tsx`, скопировать поля. `productType: 'totebag'`.

- [ ] **Step 7: Typecheck**

```bash
npx tsc --noEmit
```

Expected: clean.

- [ ] **Step 8: Commit**

```bash
git add src/app/futbolki/config.tsx src/app/hudi/config.tsx src/app/kepki/config.tsx \
        src/app/longslivy/config.tsx src/app/svitshoty/config.tsx src/app/shoppery/config.tsx
git commit -m "feat(seo): extract category page configs (6 files, JSX bodyContent)"
```

---

## Task 6: Replace 6 page.tsx files with shells

**Files:**
- Modify: `src/app/futbolki/page.tsx`
- Modify: `src/app/hudi/page.tsx`
- Modify: `src/app/kepki/page.tsx`
- Modify: `src/app/longslivy/page.tsx`
- Modify: `src/app/svitshoty/page.tsx`
- Modify: `src/app/shoppery/page.tsx`

- [ ] **Step 1: Rewrite futbolki page.tsx**

Replace **entire** `src/app/futbolki/page.tsx` content with:

```tsx
import { Metadata } from 'next';
import CategoryPage, { buildMetadata } from '@/components/pages-components/category-page/category-page';
import { config } from './config';

export const metadata: Metadata = buildMetadata(config);

export default async function Page() {
  return <CategoryPage config={config} />;
}
```

- [ ] **Step 2: Rewrite hudi page.tsx**

Идентично Step 1, но с импортом из `./config` локального файла. (Файл создан в Task 5 Step 2.) Структура всех 6 page.tsx одинакова, отличается только `import { config } from './config';` который тянет локальный config.

- [ ] **Step 3: Rewrite kepki page.tsx**

См. Step 1, тот же 8-строчный shell.

- [ ] **Step 4: Rewrite longslivy page.tsx**

См. Step 1.

- [ ] **Step 5: Rewrite svitshoty page.tsx**

См. Step 1.

- [ ] **Step 6: Rewrite shoppery page.tsx**

См. Step 1.

- [ ] **Step 7: Build + typecheck**

```bash
npm run build && npx tsc --noEmit
```

Expected: проходит. Все 6 страниц должны SSR'иться (это server-component async function). В output build'а — 6 prerendered routes.

- [ ] **Step 8: Manual diff smoke**

```bash
npm run dev
```

Для каждой страницы:
- Открыть `http://localhost:3000/{slug}` для slug ∈ {futbolki, hudi, kepki, longslivy, svitshoty, shoppery}
- Сравнить с продом `https://pnhd-studio-clone.vercel.app/{slug}` (или git stash основной branch — restore старую версию — открыть рядом).
- Проверить:
  - `<title>` и `<meta description>` идентичны
  - JSON-LD breadcrumb/webpage/faq генерится (View Source → search для `application/ld+json`)
  - Каталог товаров заполняется (грид cards)
  - SEO body (h2, p, ul/ol) совпадает с оригиналом
  - FAQ-секция в самом низу совпадает

- [ ] **Step 9: Commit**

```bash
git add src/app/futbolki/page.tsx src/app/hudi/page.tsx src/app/kepki/page.tsx \
        src/app/longslivy/page.tsx src/app/svitshoty/page.tsx src/app/shoppery/page.tsx
git commit -m "refactor(seo): shrink 6 category pages to CategoryPage shells"
```

---

## Task 7: Active-link в admin sidebar

**Files:**
- Modify: `src/app/admin/_components/AdminShell.tsx`

- [ ] **Step 1: Add usePathname + isActive logic**

Edit `src/app/admin/_components/AdminShell.tsx`:

Добавить import `usePathname` после строки `import Link from 'next/link';`:

```tsx
import { usePathname } from 'next/navigation';
```

В компоненте `AdminShell` перед `return (...)` добавить:

```tsx
    const pathname = usePathname();
    const isActive = (href: string) => {
        if (href === '/admin') return pathname === '/admin';
        return pathname.startsWith(href);
    };
```

В JSX render-loop — модифицировать `<ListItemButton>`:

```tsx
{NAV.map((n) => (
    <ListItem key={n.href} disablePadding>
        <ListItemButton component={Link} href={n.href} selected={isActive(n.href)}>
            <ListItemText primary={n.label} />
        </ListItemButton>
    </ListItem>
))}
```

(MUI `ListItemButton selected={true}` автоматически применит accent-background. Дополнительной стилизации не нужно если default theme устраивает.)

- [ ] **Step 2: Typecheck**

```bash
npx tsc --noEmit
```

Expected: clean.

- [ ] **Step 3: Manual smoke**

```bash
npm run dev
```

Залогиниться в `/admin/login` → пройтись по sidebar (Дашборд, Товары, Блог, Принты, Заявки). На каждой странице соответствующий пункт sidebar должен быть подсвечен (фон акцентным цветом).

Edge case: открыть `/admin/products/{slug}` (страница редактирования товара) — пункт «Товары» должен оставаться активным благодаря `startsWith`.

Edge case: `/admin` (Дашборд) — только эта страница, не другие — благодаря отдельной ветке `pathname === '/admin'`.

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/_components/AdminShell.tsx
git commit -m "feat(admin): active-link highlighting в sidebar"
```

---

## Task 8: Update CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Update §3 (Routing map)**

Найти строку про категорийные страницы:

```markdown
| `/futbolki`, `/hudi`, `/kepki`, `/longslivy`, `/svitshoty`, `/shoppery` | SSR | статика | ✅ (6 копипаст-страниц — кандидат на generic-рефакторинг) |
```

Заменить на:

```markdown
| `/futbolki`, `/hudi`, `/kepki`, `/longslivy`, `/svitshoty`, `/shoppery` | SSR | Supabase `products` (через generic `<CategoryPage>` + local `config.tsx`) | ✅ (рефакторинг 2026-05-27) |
```

- [ ] **Step 2: Update §10 (Critical files)**

Добавить строки в таблицу:

```markdown
| [src/components/pages-components/category-page/category-page.tsx](src/components/pages-components/category-page/category-page.tsx) | Shared SEO-страница категории (futbolki/hudi/kepki/longslivy/svitshoty/shoppery). Принимает `ICategoryPageConfig` |
| [src/components/shared-components/3d-tee/tee-placeholder.tsx](src/components/shared-components/3d-tee/tee-placeholder.tsx) | Static fallback для асинхронно-грузящегося 3D Tee |
```

- [ ] **Step 3: Update §11 (Known issues)**

В подсекции «🟢 Сделано» добавить новый блок:

```markdown
### 🟢 Сделано (батч 2026-05-27, tech debt)
- [x] Three.js (`<Tee>`) — `next/dynamic({ssr:false})` + placeholder в main-screen + shop-lead-screen
- [x] 6 категорийных страниц → один `<CategoryPage>` + 6 локальных `config.tsx`
- [x] Active-link highlighting в admin sidebar (`usePathname` + `selected`)
```

Из таблицы «🟡 Известные косяки» вычеркнуть:
- «Three.js в общем бандле»
- «6 копипаст-страниц категорий»
- «Active-link highlight в sidebar» (если был там)

Также вычеркнуть из §11 «🟡 Известные косяки»: `dynamicParams=false на /blog/[post]` (уже исправлено).

- [ ] **Step 4: Bump «Last full update» строку**

В шапке CLAUDE.md (она могла быть уже обновлена в PR1 — проверить):

```markdown
> **Last full update:** 2026-05-27 после батча «pre-launch hardening + tech-debt frontend».
```

- [ ] **Step 5: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: refresh CLAUDE.md after tech-debt frontend batch"
```

---

## Task 9: Final integration check + PR

- [ ] **Step 1: Build + typecheck clean**

```bash
npm run build && npx tsc --noEmit
```

Expected: passes. В output build'а — все 6 категорийных route'ов prerender'ятся.

- [ ] **Step 2: Bundle-size sanity check**

```bash
# Если есть @next/bundle-analyzer:
# ANALYZE=true npm run build

# Иначе просто прочитать что вывел npm run build:
npm run build 2>&1 | grep -A 30 "Route (app)"
```

Expected: First Load JS для `/` и `/shop` должен заметно упасть по сравнению с baseline (~600KB gzipped экономии от three+drei chunks).

- [ ] **Step 3: Manual full-flow smoke**

```bash
npm run dev
```

Прогнать:
1. `/` — главная, 3D Tee грузится через placeholder. Каталог, FAQ, lead-form.
2. `/shop` — каталог, 3D Tee на shop-lead-screen через placeholder.
3. `/futbolki`, `/hudi`, `/kepki`, `/longslivy`, `/svitshoty`, `/shoppery` — каждая отдаёт identical content по сравнению с production.
4. `/admin/login` → залогиниться → пройтись по sidebar — active-link работает.

- [ ] **Step 4: Push branch + open PR**

```bash
git push -u origin <branch-name>
gh pr create --title "perf+refactor: tech-debt frontend (3D dynamic + category shells + admin active-link)" \
  --body "$(cat <<'EOF'
## Summary
- `<Tee>` wrapped in `next/dynamic({ssr:false})` with placeholder — `main-screen` + `shop-lead-screen`. ~600KB gzipped initial bundle savings on `/` and `/shop`.
- 6 копипаст-категорийных страниц (futbolki/hudi/kepki/longslivy/svitshoty/shoppery) → один shared `<CategoryPage>` + 6 локальных `config.tsx`. URL'ы и SEO contracts не тронуты.
- Admin sidebar: `usePathname` + `selected` prop на `ListItemButton` для active-link highlighting.

Per [docs/superpowers/specs/2026-05-27-prelaunch-hardening-design.md](docs/superpowers/specs/2026-05-27-prelaunch-hardening-design.md).

## Test plan
- [ ] `npm run build` passes; First Load JS на `/` и `/shop` падает (three/drei chunks отдельно)
- [ ] Все 6 категорийных URL отдают тот же content что и production (визуальный diff)
- [ ] JSON-LD breadcrumb/webpage/faq генерится для каждой категории (View Source)
- [ ] Admin sidebar: правильный пункт подсвечивается на каждой `/admin/*` странице

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 5: Wait for owner merge approval**

После того как пользователь подтвердил merge — план PR2 завершён.

---

## Self-review checklist (выполнить перед началом implementation)

- [ ] PR1 уже merge'нут (этот PR ставит CART_STORAGE_KEY=order_v3 в зависимость, но Task 5 здесь не трогает storage)
- [ ] `TeeClient` wrapper создан если main-screen / shop-lead-screen — server-component
- [ ] 6 config'ов содержат ПОЛНЫЕ faqSet и bodyContent (не заглушки) — каждый сверяется с оригиналом строка-в-строку
- [ ] page.tsx shells — exactly 8 строк, не больше (короче — лучше)
- [ ] AdminShell `selected={isActive(...)}` — точное название prop'а MUI (не `active`, не `current`)
