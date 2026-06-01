# SEO Audit — pnhd-studio-clone

**Дата:** 2026-06-01
**Скоуп:** `https://pnhd-studio-clone.vercel.app` (production Vercel deploy; canonical-домен — `https://studio.pnhd.ru` — пока не переключён).
**Метод:** статический аудит исходников (`src/app/**`, `src/components/pages-components/category-page/**`, `next.config.mjs`, `src/middleware.ts`). Curl/WebFetch против prod **запрещены инструментами** — все findings выведены из кода. Verification log в конце.

**TL;DR:** базовая SEO-инфра уже на месте — есть `robots.ts`, `sitemap.ts`, `generateMetadata` на всех ключевых маршрутах, JSON-LD Organization/Product/BlogPosting/LocalBusiness/FAQPage, единый `buildMetadata` хелпер с canonical + OG + Twitter. Главные пробелы — **`SITE_INFO.domain` зашит на `studio.pnhd.ru`** (canonical на live-Vercel-URL указывает на чужой домен → деплой неиндексируем by design), **6 категорийных страниц используют локальный `buildMetadata`-stub без canonical/OG/Twitter** (это duplicate-content vs `/shop?type=...`), `/admin/login` отдаёт публичное HTML без noindex (приватные URL могут утечь через bot-краулер не уважающий robots), и нет `error.tsx`. Blockers нет, основная работа — починить категорийные мета-теги и определиться с canonical-доменом.

---

## BLOCKERS (🔴)

Нет блокеров.

Все ключевые SEO-критичные элементы (`<html lang="ru">`, robots с disallow `/admin/`, sitemap.xml, og:image на shareable-страницах, JSON-LD Product/Article, generateMetadata на главной/shop/blog) присутствуют.

---

## WARNINGS (🟡)

### 🟡 W-SEO-01 — Канонический домен прибит к `studio.pnhd.ru`, текущий prod хостится на `pnhd-studio-clone.vercel.app`

`src/app/constants.tsx:2`:
```
export const SITE_INFO = { domain: 'https://studio.pnhd.ru', ... }
```

Этот URL участвует в `metadataBase`, всех `canonical`, `og:url`, JSON-LD `url`/`mainEntityOfPage` — везде в [src/app/_lib/build-metadata.ts:30-40](src/app/_lib/build-metadata.ts), [shop/[slug]/page.tsx:52](src/app/(storefront)/shop/[slug]/page.tsx), [blog/[post]/page.tsx](src/app/(storefront)/blog/[post]/page.tsx), [contacts/page.tsx:60-78](src/app/(storefront)/contacts/page.tsx), [methods/[slug]/page.tsx:21](src/app/(storefront)/methods/[slug]/page.tsx), [markups.ts](src/app/utils/markups.ts).

**Что это значит сегодня:**
- Каждая страница на `pnhd-studio-clone.vercel.app` отдаёт `<link rel="canonical" href="https://studio.pnhd.ru/...">` — для Google это сигнал "не индексируй меня, индексируй studio.pnhd.ru".
- Но `studio.pnhd.ru` сейчас обслуживается **оригинальным** прод-сайтом (см. CLAUDE.md §1). Получается: клон ссылается canonical'ом на чужой контент, который у нас не управляется и потенциально содержит другие meta-теги, цены, ассортимент. Google разрешит конфликт в пользу studio.pnhd.ru → клон вообще не появится в индексе по своему URL.
- Sitemap.xml и robots.ts тоже отдают `host: 'https://studio.pnhd.ru'` и `sitemap: 'https://studio.pnhd.ru/sitemap.xml'`. Бот, попавший на pnhd-studio-clone.vercel.app/robots.txt, прочитает "sitemap живёт на другом домене" и уйдёт туда.

**Это intentional?** Да, проект задуман как **замена** studio.pnhd.ru (см. CLAUDE.md §1: "клон production-сайта"). После cutover'а (CNAME-переключение) canonical окажется корректным.

**Рекомендация:**
- **До cutover'а:** добавить env-driven override `process.env.NEXT_PUBLIC_SITE_DOMAIN` с fallback на текущее значение. Тогда preview-деплои/staging смогут указать `pnhd-studio-clone.vercel.app` и не загрязнять production-разметку. **Либо** оставить как есть и положить на Vercel-URL `<meta name="robots" content="noindex">` (но это слома проверочные деплои).
- **На cutover:** удостовериться что DNS переключился ДО первого crawl'а Googlebot'а — иначе на сутки-двое будут отдаваться 308-redirect'ы или canonical-mismatch.
- Этот item не блокирует MVP-launch, но **обязателен** в day-1-after-launch чеклисте.

**Файлы:** `src/app/constants.tsx:2`.

---

### 🟡 W-SEO-02 — 6 категорийных страниц (`/futbolki`, `/hudi`, `/kepki`, `/longslivy`, `/svitshoty`, `/shoppery`) без canonical / OG / Twitter

[src/components/pages-components/category-page/category-page.tsx:33-39](src/components/pages-components/category-page/category-page.tsx):
```ts
export function buildMetadata(config: ICategoryPageConfig): Metadata {
  return {
    title: config.metaTitle,
    description: config.metaDescription,
    metadataBase: new URL('https://studio.pnhd.ru'),
  };
}
```

Это **локальный stub** `buildMetadata`, который импортируется во всех 6 категорийных `page.tsx` (см. [futbolki/page.tsx:2](src/app/(storefront)/futbolki/page.tsx), и аналогичные `hudi/page.tsx`, `kepki/page.tsx`, ...). В отличие от полноценного `src/app/_lib/build-metadata.ts`, эта версия **не возвращает** `alternates.canonical`, `openGraph`, `twitter`.

**Последствия:**
- Нет canonical → Google решает сам, и при наличии query-string-вариантов (utm, гэхтрек) каждый URL станет отдельной страницей. Хуже того, `/shop?type=tshirt` и `/futbolki` отдают **тот же контент** (`getAllProducts({ type: 'tshirt' })`) — без явных canonical'ов это **классический duplicate-content** между `/shop` и категориями.
- Нет og:image → шеринг `/futbolki` в Telegram/VK/Twitter покажет голую ссылку без preview.
- Нет twitter:card → плохой preview в Twitter/X.

**Рекомендация:** удалить локальный `buildMetadata` из `category-page.tsx`, заимпортить из `@/app/_lib/build-metadata`, в каждом category `page.tsx` вызвать с `path: '/${config.slug}'` и `image: '/opengraph-image.jpg'`. Для разрешения duplicate-content между `/futbolki` и `/shop?type=tshirt` — оставить `/futbolki` как canonical, а на `/shop` с активным фильтром через `useSearchParams` отдать canonical → `/futbolki`. **Либо** через `next.config.mjs redirects` отдавать 301 с `/shop?type=tshirt` → `/futbolki`.

**Файлы:** `src/components/pages-components/category-page/category-page.tsx:33-39`, 6 category `page.tsx` файлов.

---

### 🟡 W-SEO-03 — `/admin/login` доступен без noindex; крошки админ-UI могут попасть в индекс через rogue-bot

`robots.ts` отдаёт `Disallow: /admin/` (см. `src/app/(storefront)/robots.ts:11`). Это валидно для Googlebot, Yandex, Bing — они уважают robots.

**Но:**
1. Robots — это **обещание боту**, а не enforcement. Любой bot, игнорирующий robots (LLM-краулеры типа GPTBot если не whitelisted, scrapers, archive.org), может зайти на `/admin/login` и проиндексировать форму логина / любую утечку метаданных.
2. После авторизации Payload-shell в `<title>` пишет "PNHD Studio Admin · Products" и т.п. — если бот залогинится через украденную сессию или если есть public-readable пути типа `/admin/api/...`, эти URL-крошки могут утечь.
3. На `/admin/login` нет `<meta name="robots" content="noindex,nofollow">` дополнительно к robots.txt. Best practice — **defence in depth**: и robots, и meta-noindex, и X-Robots-Tag header.

**Severity:** 🟡, не 🔴, потому что:
- За RLS + middleware + `requireAdmin()` тройная защита, реальные данные не утекают.
- Payload-admin шеллу самому по себе SEO-индексация не вредит, max — будет странно выглядеть в Google.

**Рекомендация:** в `next.config.mjs` `headers()` добавить условный header для `/admin/:path*`:
```ts
{ source: '/admin/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] }
```
Это покрывает и кооперативных, и не-кооперативных ботов. Тривиальная правка.

**Файлы:** `next.config.mjs:23-36`.

---

### 🟡 W-SEO-04 — Отсутствует `error.tsx` (500-страница); fallback Next.js на дефолтный шаблон с английским текстом

Поиск `find src/app -name "error.tsx" -o -name "global-error.tsx"` → пусто. Только [src/app/(storefront)/not-found.tsx](src/app/(storefront)/not-found.tsx) (русский 404, без noindex meta) и `src/app/(payload)/admin/[[...segments]]/not-found.tsx` (Payload-внутренняя).

**Что произойдёт при unhandled-runtime-error в RSC:**
- Next.js покажет дефолтный fallback "Application error: a client-side exception has occurred" (англ.) с stack trace в dev и пустую страницу в prod.
- Никакого 5xx-noindex'а нет → Google зафиксирует страницу как 500 (хорошо — выкинет из индекса), Yandex может на soft-404 повестись.

**Рекомендация:**
1. Добавить `src/app/(storefront)/error.tsx` — русский fallback "Что-то пошло не так, обновите страницу", `noindex,nofollow` мета.
2. Опционально — `src/app/global-error.tsx` для catastrophic-RSC-crash'ей (когда даже `(storefront)/layout.tsx` упал).
3. На `not-found.tsx` рекомендую тоже навесить `noindex` через `metadata` export — текущая 404-страница может индексироваться (хотя Next.js обычно отдаёт HTTP 404 → Google и так выкинет, но чище явно).

**Файлы:** `src/app/(storefront)/not-found.tsx`, отсутствие `src/app/(storefront)/error.tsx`.

---

### 🟡 W-SEO-05 — `/prints` и `/textile` index-страницы пустые (рендерят `<></>`), но листятся в sitemap.xml как priority 0.6

[src/app/(storefront)/prints/page.tsx](src/app/(storefront)/prints/page.tsx) и [textile/page.tsx](src/app/(storefront)/textile/page.tsx) — оба возвращают `<></>` без metadata. В sitemap.xml ([sitemap.ts:27-28](src/app/(storefront)/sitemap.ts)) включены `/methods`, `/prints`, `/textile` с priority 0.6.

Результат:
- Google зайдёт по sitemap, увидит пустую страницу → soft-404 / "Crawled, not indexed".
- Засоряет crawl-бюджет на проекте, где crawl-бюджет важен (Yandex/Google не любят пустоту).
- `/methods/page.tsx` — рабочий, рендерит контент. `/prints` и `/textile` — нет.

**Рекомендация:**
- **Либо** наполнить `/prints/page.tsx` и `/textile/page.tsx` контентом (список доступных принт-стилей / тканей с превью), добавить metadata + canonical.
- **Либо** убрать `/prints` и `/textile` из `STATIC_ROUTES` в `sitemap.ts:27-28` и сделать 301-redirect на `/methods` через `next.config.mjs redirects`.

**Файлы:** `src/app/(storefront)/prints/page.tsx`, `src/app/(storefront)/textile/page.tsx`, `src/app/(storefront)/sitemap.ts:27-28`.

---

### 🟡 W-SEO-06 — JSON-LD на главной хардкодит `studio.pnhd.ru` (даже когда `SITE_INFO.domain` сменят)

[src/app/utils/markups.ts](src/app/utils/markups.ts) — все 5 экспортов (`LocalBusinessJsonLD`, `WebPageJsonLD`, `FAQPageJsonLD`, `ServiceJsonLD`, `CatalogPageBreadCrumbsJsonLD`) содержат буквальное `"url": "https://studio.pnhd.ru/..."` — без подстановки из `SITE_INFO.domain`.

**Последствие:** даже если домен сменят (например, миграция на `pnhd.store` или какой-то новый), JSON-LD продолжит указывать на старый. Возникнет рассинхрон между `<link rel="canonical">` (через `SITE_INFO.domain`) и `mainEntity.url` / `LocalBusiness.url` (хардкод).

В отличие от `markups.ts`, [shop/[slug]/page.tsx productJsonLd()](src/app/(storefront)/shop/[slug]/page.tsx:52) и [contacts/page.tsx jsonLdLocalBusiness](src/app/(storefront)/contacts/page.tsx:21-24) — построены через `SITE_INFO.domain` правильно.

**Рекомендация:** переделать `markups.ts` в функции (а не константы), принимающие `domain` параметром, либо использовать `SITE_INFO.domain` напрямую внутри. Замена тривиальная.

**Файлы:** `src/app/utils/markups.ts:6, 24, 86, 99, 105, 114`.

---

### 🟡 W-SEO-07 — `og:image` на главной/shop = 832 KB JPG; превью-картинки в Twitter/Telegram грузятся медленно

[src/app/(storefront)/opengraph-image.jpg](src/app/(storefront)/opengraph-image.jpg) — 832 KB. Шеринг в Twitter/Telegram/VK сначала загрузит OG-image, потом покажет preview. На 4G это ~2-3 сек.

**Рекомендация:** пересохранить в 1200×630 WebP / progressive JPG ≤ 200 KB (типовая практика). Картинка не критичная — но 832 KB для соц-превью — оверкилл.

**Severity:** низкий 🟡 — функциональность работает.

**Файлы:** `src/app/(storefront)/opengraph-image.jpg`.

---

### 🟡 W-SEO-08 — `/shop`-страница в `metadataBase` указывает `https://studio.pnhd.ru/shop` (с трейлинговым путём вместо корня)

[src/app/(storefront)/shop/page.tsx:18](src/app/(storefront)/shop/page.tsx):
```ts
metadataBase: new URL('https://studio.pnhd.ru/shop'),
```

`metadataBase` должен быть **корнем** домена (`https://studio.pnhd.ru`). Когда Next.js резолвит относительные URL (например, в `og:image: '/opengraph-image.jpg'`), он делает `new URL('/opengraph-image.jpg', metadataBase)`. С базой `https://studio.pnhd.ru/shop` (без trailing slash) результат будет `https://studio.pnhd.ru/opengraph-image.jpg` (корректно — `/` обнуляет path), но это работает случайно.

Если поставят `og:image: 'opengraph-image.jpg'` (без слеша), получится `https://studio.pnhd.ru/shopopengraph-image.jpg`. Ловушка ждёт первого, кто скопирует pattern.

**Рекомендация:** заменить на `metadataBase: new URL('https://studio.pnhd.ru')`. То же самое в `cart/page.tsx:7`, `checkout/page.tsx:7`, `oferta/page.tsx:14`, `privacy/page.tsx:14`, `size_chart/page.tsx:48`, `loyalty/page.tsx:15`, `page.tsx:26` (главная) — везде проставлено вручную одной и той же строкой, но `/shop/page.tsx` — единственный с `/shop` суффиксом. Переход на `buildMetadata` helper решает централизованно.

**Файлы:** `src/app/(storefront)/shop/page.tsx:18`.

---

## NICE-TO-HAVE (🟢)

### 🟢 N-SEO-01 — Twitter `creator` / `site` handles не заданы

[build-metadata.ts:55-60](src/app/_lib/build-metadata.ts) рендерит:
```ts
twitter: { card: 'summary_large_image', title, description, images }
```

Минимум для preview есть. Для атрибуции postов в Twitter Analytics стоит добавить `site: '@pnhd_studio'` (если есть Twitter-аккаунт). Не критично — RU-аудитория в основном в VK/TG/Yandex.

---

### 🟢 N-SEO-02 — `keywords` meta всё ещё используется на главной/shop/methods (см. `page.tsx:25`, `shop/page.tsx:17`)

Google/Bing **игнорируют** `<meta name="keywords">` с 2009. Yandex — пользуется частично, но как минор-сигнал. Текущий контент keywords-полей одинаковый на разных страницах ("печать на футболках, санкт-петербург, недорого, ..." × 30 слов) — это **keyword stuffing** для Yandex, может негативно сказаться.

**Рекомендация:** либо удалить `keywords` поля везде, либо переписать уникальными ключами для каждой страницы (главная — про "печать", shop — про "каталог одежды", методы — конкретные технологии).

**Файлы:** `src/app/(storefront)/page.tsx:25`, `shop/page.tsx:17`, `methods/page.tsx:12`, `loyalty/page.tsx:13`.

---

### 🟢 N-SEO-03 — `WebSite` schema (search-action) отсутствует на главной

На главной есть `LocalBusinessJsonLD`, `WebPageJsonLD`, `FAQPageJsonLD`, `ServiceJsonLD` (см. [markups.ts](src/app/utils/markups.ts)), но нет **`WebSite`** schema с `potentialAction: SearchAction` — Google использует это для rich-search-box. Пока у нас нет полноценного site-search (только фильтр на `/shop`), но если планируется — добавить:

```json
{
  "@type": "WebSite",
  "url": "https://studio.pnhd.ru",
  "potentialAction": {
    "@type": "SearchAction",
    "target": "https://studio.pnhd.ru/shop?q={search_term_string}",
    "query-input": "required name=search_term_string"
  }
}
```

---

### 🟢 N-SEO-04 — Sitemap не сегментирован; при росте >1000 URL Google потребует index-sitemap

[sitemap.ts:51-107](src/app/(storefront)/sitemap.ts) возвращает один монолитный массив. Сейчас ~50 URL — далеко от лимита 50 000. Но если будет рост блога / каталога — стоит будет сделать sub-sitemaps (`sitemap-products.xml`, `sitemap-blog.xml`) через App Router multi-sitemap pattern. Не приоритет на launch.

---

### 🟢 N-SEO-05 — Yandex Webmaster verification стоит только в `(storefront)/layout.tsx:22`, не в Payload-admin

[src/app/(storefront)/layout.tsx:20-24](src/app/(storefront)/layout.tsx):
```ts
export const metadata: Metadata = {
  verification: { yandex: "35381404e7bfd3a4" },
  ...
};
```

Это **правильно** — Yandex проверочный мета-тег только на storefront-роутах, не на admin. Но **если Yandex Webmaster crawl попадает на /admin/login** (через переход с/sitemap или раньше индексированной ссылки), verification отсутствует — Yandex может посчитать сайт частично-неподтверждённым. На практике не проблема, но best-practice — verification HTML-tag через `<head>` глобально + DNS-TXT (более надёжно).

---

### 🟢 N-SEO-06 — Favicon set неполный (нет apple-touch-icon-180.png, нет manifest.json для PWA)

[src/app/(storefront)/](src/app/(storefront)/):
- `favicon.ico` ✅
- `favicon-16x16.png` ✅
- `favicon-32x32.png` ✅
- `favicon.png` ✅
- Нет `apple-touch-icon.png` (180×180) → iOS Safari shortcut будет показывать дефолтный.
- Нет `manifest.json` → нет PWA-readiness (не critical для e-comm).

---

## Verification log

Все findings выведены из статического анализа кода. WebFetch и curl против `pnhd-studio-clone.vercel.app` запрещены инструментами в этой сессии (permission denied). Я НЕ верифицировал:

- Реальный HTML `<head>` на prod — `<title>`, `<meta>`, `<link rel=canonical>`, `<script type=application/ld+json>` могут отличаться от того, что код намерен отдать (например, из-за Sentry-wrapping или Vercel-injected тегов).
- HTTPS-редирект (`http://pnhd-studio-clone.vercel.app/` → `308 https://...`) — Vercel это включает по умолчанию, но **не проверено**.
- Реальный `/robots.txt` и `/sitemap.xml` (как Next.js обрабатывает `robots.ts`/`sitemap.ts` внутри route group `(storefront)` — теоретически валидно, **на практике стоит проверить curl'ом**).
- OG-image accessibility — `https://pnhd-studio-clone.vercel.app/opengraph-image.jpg` доступен ли публично, отдаёт ли `Content-Type: image/jpeg`, размер.

**Рекомендую дополнительный шаг:** ручной `curl -sI` против prod-URL и одной из товарных страниц, чтобы подтвердить реальные header'ы. Эта работа в скоупе security audit либо отдельно — она не блокирует данный SEO-аудит.

---

## Сводная таблица — что было запрошено vs что нашли

| Checklist item | Статус | Файлы / детали |
|---|---|---|
| 1. Meta tags на всех routes (`<title>`, `<meta description>`) | ✅ ВСЕ | Главная, /shop, /shop/[slug], /blog, /blog/[post], /cart, /checkout, /contacts, /oferta, /privacy, /size_chart, /howto, /loyalty, /futbolki, /hudi, /kepki, /longslivy, /svitshoty, /shoppery, /methods, /methods/[slug], /methods/[slug]/[type], /prints/[slug], /textile/[slug], /thanks — везде через `metadata` или `generateMetadata`. **/prints и /textile** (parent index) — без metadata, пустые страницы — см. W-SEO-05. |
| 2. OpenGraph на главной, /shop/[slug], /blog/[post] | ✅ ЕСТЬ | Главная: `og:type=website`, `og:title`, `og:images=/opengraph-image.jpg` ([page.tsx:30-34](src/app/(storefront)/page.tsx)). Shop/[slug]: через `buildMetadata` → `og:title`, `og:description`, `og:url`, `og:image`, `og:type=website`, `og:siteName`, `og:locale=ru_RU` ([build-metadata.ts:42-54](src/app/_lib/build-metadata.ts)). Blog/[post]: `og:type=article` через тот же helper. **Категорийные** — НЕТ OG (см. W-SEO-02). |
| 3. Twitter cards | ✅ ЕСТЬ | Через `buildMetadata` → `twitter: { card: 'summary_large_image' }`. Применяется на /shop/[slug], /blog/[post], /contacts, /howto, /thanks, /blog. **Категорийные, /, /shop, /cart, /checkout, /oferta, /privacy, /size_chart, /loyalty, /methods/*** — НЕТ (используют статический `metadata` без twitter). См. W-SEO-02 для категорийных. |
| 4. JSON-LD structured data | ⚠️ ЧАСТИЧНО | Главная: `LocalBusiness`, `WebPage`, `FAQPage`, `Service` ✅ ([markups.ts](src/app/utils/markups.ts)). Но НЕТ **`Organization`** и **`WebSite`** (последний — см. N-SEO-03). /shop/[slug]: `Product` + `BreadcrumbList` ✅ ([shop/[slug]/page.tsx:51-96](src/app/(storefront)/shop/[slug]/page.tsx)). /blog/[post]: `BlogPosting` ✅ ([blog/[post]/page.tsx:70-93](src/app/(storefront)/blog/[post]/page.tsx)). /contacts: `LocalBusiness` + `BreadcrumbList` ✅ ([contacts/page.tsx:18-80](src/app/(storefront)/contacts/page.tsx)). Категорийные: `BreadcrumbList` + `WebPage` + `FAQPage` ✅ ([category-page.tsx:49-72](src/components/pages-components/category-page/category-page.tsx)). /shop (каталог): `CollectionPage` + `BreadcrumbList` + `SiteNavigationElement` ✅. |
| 5. Canonical URLs | ⚠️ ЧАСТИЧНО | Главная ✅ (`alternates.canonical: '/'`). /shop/[slug] ✅ (через buildMetadata). /blog/[post] ✅. /contacts, /howto, /thanks, /blog ✅. /loyalty ✅ (явный). /methods/[slug] ✅ (явный). **/shop НЕТ** (нет `alternates`). **6 категорийных НЕТ** (см. W-SEO-02). /cart, /checkout, /oferta, /privacy, /size_chart, /methods, /prints/[slug], /textile/[slug], /methods/[slug]/[type] — НЕТ. Для большинства это OK (robots disallow или не важные SEO-страницы), но для **категорий — критично**. |
| 6. Sitemap | ✅ ЕСТЬ | [src/app/(storefront)/sitemap.ts](src/app/(storefront)/sitemap.ts) — 19 static-routes + динамически products + blog posts + methods + prints + textile. Lives внутри route group `(storefront)` — это работает (Next.js игнорирует круглые скобки в URL). **Caveat:** ссылка на `studio.pnhd.ru` (см. W-SEO-01); включает пустые `/prints` и `/textile` (см. W-SEO-05). |
| 7. robots.txt | ✅ ЕСТЬ | [src/app/(storefront)/robots.ts](src/app/(storefront)/robots.ts). Disallow `/admin/`, `/api/`, `/_next/`, `/cart`, `/checkout`, `/thanks`, `*?id=`, `*?utm_`. Host + sitemap-pointer заданы. **Caveat:** host = studio.pnhd.ru, см. W-SEO-01. /admin защищён через robots, но **defence-in-depth** через X-Robots-Tag header нет — см. W-SEO-03. |
| 8. 404 / 500 pages | ⚠️ ЧАСТИЧНО | 404: [src/app/(storefront)/not-found.tsx](src/app/(storefront)/not-found.tsx) — есть, русский, **без noindex meta** (приемлемо т.к. возвращается с HTTP 404). 500: `error.tsx` / `global-error.tsx` **отсутствует** — см. W-SEO-04. |
| 9. HTTPS redirect | ❓ НЕ ПРОВЕРЕН | Vercel включает по умолчанию, **но curl запрещён в этой сессии**. Vercel-deployments всегда отдают `308 https://` на `http://`. Считаем ✅ с дисклеймером. |
| 10. `<html lang="ru">` | ✅ ЕСТЬ | [src/app/layout.tsx:9](src/app/layout.tsx) — корневой layout. Применяется ко всем sub-route group'ам включая admin. |

---

## Priority-action list (для launch-cutover)

Топ-3 действия, которые имеет смысл сделать **до** того, как DNS переключат:

1. **W-SEO-02** — починить `buildMetadata` для 6 категорийных. Замена `import { buildMetadata } from './category-page'` → `from '@/app/_lib/build-metadata'` + правка params. Тривиально, ~30 мин. Без этого `/futbolki` и др. неиндексируемы как уникальные (нет canonical/OG), и Google может смержить их с `/shop`.

2. **W-SEO-01** — определиться с canonical-доменом. Если cutover **скоро** (≤ 2 нед.) — оставить как есть, на live-Vercel-URL вкатить временный `noindex` через middleware/headers (отдельный header для всего `pnhd-studio-clone.vercel.app`). Если cutover **через месяц+** — добавить env-override через `NEXT_PUBLIC_SITE_DOMAIN`.

3. **W-SEO-03** — добавить `X-Robots-Tag: noindex, nofollow` header для `/admin/:path*` в `next.config.mjs`. 4-строчная правка, защита от не-кооперативных ботов.

Остальное (W-SEO-04…08, NICE-TO-HAVE) — можно делать инкрементально после launch.
