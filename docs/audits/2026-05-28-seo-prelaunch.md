# SEO & Pre-launch Audit — 2026-05-28

> Scope: SEO-готовность к свитчу `studio.pnhd.ru` → этот код (домен сохраняется).
> Аудитория: ~75% Яндекс / 25% Google, RU-only. Релиз через 2–4 недели.
> Не дублирует [frontend-аудит](2026-05-28-frontend.md) — но ссылается, где правки в одном PR закрывают и его, и SEO-блокеры.

## Summary

Клон **не готов к свитчу со SEO-стороны**. Каркас на месте (App Router metadata API, JSON-LD на главной/категориях/методах, корректный `<html lang="ru">`, edge-middleware с `x-pathname` для канонических ссылок), но реализация местами недоделана и местами стреляет в ноги: **главная страница не имеет текстового `<h1>` (логотип отрисован SVG-путями)**, **`sitemap.xml` и `robots.txt` — статические артефакты 2024 года**, не отражают ни новый каталог, ни новые маршруты, ни ушедший конструктор; **`/admin/*` не закрыт в robots**; на **`/shop/[slug]` отсутствует `Product` JSON-LD** (для e-commerce — критический пробел); **`/blog/[post]` отдаёт только canonical** без title/description/OG/Article schema. Полный список несовпадений старого sitemap (90 URL) с новой маршрутной картой не проработан — без redirect-карты часть трафика и веса со старых SKU-страниц после свитча уйдёт в 404.

**SEO Health Index: 47 / 100 — Poor**. До свитча реалистично поднять до 75–80 за 2 спринта (см. action plan).

---

## SEO Health Index

| Категория                  | Score | Weight | Weighted |
| -------------------------- | ----: | -----: | -------: |
| Crawlability & Indexation  |    35 |     30 |     10.5 |
| Technical Foundations      |    55 |     25 |    13.75 |
| On-Page Optimization       |    45 |     20 |        9 |
| Content Quality & E-E-A-T  |    65 |     15 |     9.75 |
| Authority & Trust Signals  |    40 |     10 |        4 |

**Итог: 47 / 100 → Poor**

Что ограничивает score: статический stale sitemap + отсутствие Product/Article schema + сломанный canonical в root layout + отсутствие h1 на главной + нет redirect-карты для старых URL.

---

## Pre-launch readiness — overall

| Аспект | Готовность | Комментарий |
|---|---|---|
| Meta-tags (title/description) | ⚠️ **60%** | 23 страницы из 27 имеют `metadata`/`generateMetadata`; 4 публичных (`/textile`, `/prints`, `/oferta`, `/thanks`) — без. На многих повторяющиеся keyword-стопки и одинаковый OG-title `'PNHD STUDIO \| Главная'`. |
| Canonical | ❌ **30%** | 17 публичных страниц без явного `alternates.canonical` → наследуют **сломанный** `getCurrentPath()` из root layout (см. P0 #2 frontend-аудита). |
| `metadataBase` | ❌ **35%** | 18 страниц без — соцшаринг отдаёт `localhost:3000` для OG/Twitter image. См. P0 #4 frontend-аудита + P0-SEO #3 ниже. |
| Open Graph | ⚠️ **40%** | На главной есть `opengraph-image.jpg` 1200×630 ✓, но на `/blog/[post]`, `/shop/[slug]`, на 6 категориях и на second-level methods — собственного OG нет; шарится generic-картинка либо ничего. |
| Twitter Cards | ❌ **0%** | Ни одна страница не объявляет `twitter:card` — превью на Twitter/X деградирует. |
| Sitemap.xml | ❌ **stale** | Статический файл [src/app/sitemap.xml](src/app/sitemap.xml) — дата `2024-06-30`, **отсутствуют 30+ страниц** (см. P0-SEO #1). |
| Robots.txt | ❌ **stale + insecure** | Статический файл, не блокирует `/admin/*`, блокирует `/blog/` (!), содержит мёртвые правила `/dtg-pechat` и `*/constructor`. |
| Schema.org JSON-LD | ⚠️ **65%** | Главная (LocalBusiness + WebPage + FAQ + Service) ✓, `/shop` (CollectionPage + ItemList + Breadcrumb) ✓, `/methods/*` (Service+Offer+Breadcrumb) ✓, категории (FAQ+WebPage+Breadcrumb) ✓. **Product отсутствует на /shop/[slug]** ❌. **Article отсутствует на /blog/[post]** ❌. |
| Redirect-карта | ❌ **нет** | 90 URL в [оригинальном sitemap](https://studio.pnhd.ru/sitemap.xml); часть SKU-slug'ов из 2024 не входит в импортированные 25 — после свитча уйдут в 404 с потерей ссылочного веса. |
| Favicon | ✅ | `favicon.ico`/16/32 + `opengraph-image.jpg` в `src/app/` — Next подхватит автоматически. |
| Web Manifest / theme-color | ❌ | Нет `manifest.webmanifest`, нет `<meta name="theme-color">`, нет `apple-touch-icon`. Минорно, но в Яндекс.Браузере на мобильном `theme-color` влияет на цвет адресной строки. |
| Поисковые верификации | ⚠️ | Yandex Webmaster meta (`35381404e7bfd3a4`) — **унаследована от оригинала**, валидна только если переключаемся на тот же домен и старый верификационный код жив. Google Search Console: HTML-файл `google490368b76cb374fd.html` лежит в `public/` — также от оригинала; meta-верификации нет. |
| Аналитика на момент свитча | ⚠️ | Yandex Metrica `86217584`, Roistat `86cd2ab6047bc5c2f8ea632e1183ac10`, uiscom `79obNG5YrzIplUgKXZYSiPbK7agWm7Dk` — все ID оригинала; владелец заменит сам, но **момент cutover'а с DNS** должен быть согласован, иначе double-counting. |
| Внутренняя перелинковка | ⚠️ | Header/footer **не ссылаются** ни на одну категорийную страницу (`/futbolki`, `/hudi`, …) — 6 целевых SEO-лендингов сирот. |

---

## Findings by priority

### 🔴 P0 — Блокеры свитча

| # | Issue | Файл / место | Effort | Why P0 |
|---|---|---|---|---|
| 1 | **`sitemap.xml` — статический stale файл от 2024-06-30** | [src/app/sitemap.xml](src/app/sitemap.xml) | M | Перечисляет 90 старых URL (в т.ч. SKU-слаги которых нет в нашем импорте), но **не включает `/contacts`, `/loyalty`, `/howto`, `/privacy`, `/blog`, `/blog/[post]`, `/futbolki`, `/hudi`, `/kepki`, `/longslivy`, `/svitshoty`, `/shoppery`, `/prints/[slug]`, `/textile/[slug]`** и любые новые SKU. После свитча Яндекс/Google будут краулить мёртвые URL и пропускать новые лендинги. |
| 2 | **`robots.txt` — статический, не блокирует `/admin/*`** | [src/app/robots.txt](src/app/robots.txt) | S | Любой страницей `/admin/login`, `/admin/products` и т.д. могут поделиться через preview-Vercel-URL → попадёт в индекс. **Также блокирует `/blog/`** (наследие — у оригинала, видимо, блог был на Tilda); у нас блог реальный и должен индексироваться. Содержит мёртвые `*/constructor`, `/dtf-pechat` и т.п. |
| 3 | **Главная страница без текстового `<h1>`** | [main-screen.tsx:111-114](src/components/pages-components/main-page/main-screen/main-screen.tsx#L111) | S | `<h1>` закомментирован — заголовок «PINHEAD STUDIO» отрисован SVG-путями (`<path d="…">`). Поисковики читают DOM, не SVG-геометрию → у самой важной страницы сайта **нет H1**. |
| 4 | **Нет `Product` JSON-LD на `/shop/[slug]`** | [src/app/shop/[slug]/page.tsx](src/app/shop/[slug]/page.tsx) | M | E-commerce-критично. Без `Product`+`Offer`+`AggregateRating` в выдаче Яндекса не появятся rich snippets с ценой/наличием, в Google — карточка товара. Для 25 SKU это сразу −20–40% CTR из выдачи на основном коммерческом контуре. |
| 5 | **Нет `Article` / `BlogPosting` + неполные мета на `/blog/[post]`** | [src/app/blog/[post]/page.tsx](src/app/blog/[post]/page.tsx) | S | `generateMetadata` возвращает **только** `alternates.canonical` — нет title/description/openGraph. Title наследуется от root (пустой/мусорный); все блог-посты в выдаче без сниппета. И без `Article` JSON-LD — у Яндекса не появится «дата публикации»/«автор» в выдаче. |
| 6 | **Нет redirect-карты со старого sitemap (90 URL → новая структура)** | [next.config.mjs:4-17](next.config.mjs#L4) | M | Часть SKU-slug'ов из старого sitemap (`futbolka-classic-belaya-man`, `futbolka-promo-belaya-man`, `futbolka-oversize-chernaya-man`, `kepka-atlantis-haki` и т.д.) **не входит** в импортированные 25 → 404 после свитча. Старые URL c `?id=<mongo-id>` (40+ штук) тоже не обработаны (Яндекс по `Clean-param: id` склеит, Google — нет, насоздаёт дублей). |
| 7 | **`metadataBase` не задан на 18 публичных страницах** + **сломанный canonical в root layout** | См. P0 #2 и P0 #4 [frontend-аудита](2026-05-28-frontend.md#-p0--блокеры-релиза); затрагивает 17 страниц без явного `alternates.canonical` (`/contacts`, `/checkout`, `/cart`, `/howto`, `/blog`, `/shop`, `/futbolki`–`/shoppery`, `/textile/[slug]`, `/methods/[slug]/[type]`, `/prints/[slug]`, `/svitshoty` и др.) | S | **Дубль frontend-аудита** — но это блокер именно SEO: пока эти два P0 не закрыты, canonical для большинства страниц будет либо `localhost:3000/...`, либо мусорный из `getCurrentPath()`. Поисковики увидят дубликаты canonical → потеря rank. |
| 8 | **Дубликат правила redirect для `/.well-known/apple-app-site-association`** | [next.config.mjs:12,15](next.config.mjs#L12) | XS | Next падает на duplicate redirect source при `next dev` (warning, не fail), и в production redirect-таблица содержит ошибку (overlapping rules). Тривиальный фикс. Включаю в P0 — он в одной строчке. |

### 🟡 P1 — Желательно к свитчу

| # | Issue | Файл | Effort | Impact |
|---|---|---|---|---|
| 9 | **Нет `Article` schema на `/blog/[post]`** — повторно (см. P0 #5, расширенно) | [blog/[post]/page.tsx](src/app/blog/[post]/page.tsx) | S | Без `headline/author/datePublished/image` — нет «новостных» rich snippets. |
| 10 | **`/contacts` использует `Organization` вместо `LocalBusiness`** | [contacts/page.tsx:20](src/app/contacts/page.tsx#L20) | S | Для локального бизнеса в СПб нужна `LocalBusiness` (как на главной), с `geo`, `openingHours`, `priceRange`, `areaServed`. Сейчас Яндекс.Карты и Google Maps не привяжут карточку. **Также в коде ошибка postalCode**: `194044` вместо `197022` из [constants.tsx:15](src/app/constants.tsx#L15) — рассинхрон с правдой. |
| 11 | **На `/blog/page.tsx` нет `metadataBase`, нет `alternates.canonical`, нет `openGraph`** | [blog/page.tsx:14-28](src/app/blog/page.tsx#L14) | S | Закомментированный openGraph-блок без замены. Лента блога шарится без preview-картинки. |
| 12 | **`/shop/page.tsx` `metadataBase: new URL('https://studio.pnhd.ru/shop')`** | [shop/page.tsx:17](src/app/shop/page.tsx#L17) | XS | Должно быть `https://studio.pnhd.ru` (без `/shop`). При текущей конфигурации `/opengraph-image.jpg` резолвится в `https://studio.pnhd.ru/shop/opengraph-image.jpg` (потенциальный 404). |
| 13 | **`openGraph.url: …?id=${searchParams.id}`** на `/shop/[slug]` | [shop/[slug]/page.tsx:31](src/app/shop/[slug]/page.tsx#L31) | XS | Когда нет ?id (а его обычно нет — это legacy от Mongo-id оригинала), URL получается `…?id=undefined`. В Yandex/Google это уродливо. Убрать query из OG url. |
| 14 | **Категорийные страницы не задают `alternates.canonical`** | [category-page.tsx:32-38](src/components/pages-components/category-page/category-page.tsx#L32) | S | `buildMetadata()` возвращает только title/description/metadataBase. Канонический наследуется от **сломанного** root layout → 6 SEO-критичных лендингов с битым canonical. |
| 15 | **Header и Footer не ссылаются на категорийные страницы** | [header.tsx](src/components/shared-components/header/header.tsx), [footer.tsx](src/components/shared-components/footer/footer.tsx) | S | 6 целевых SEO-страниц `/futbolki`, `/hudi`, `/kepki`, `/longslivy`, `/svitshoty`, `/shoppery` — **сироты**: ссылок ни из header (там только `/shop`, `/contacts`, `/loyalty`, `/blog`), ни из footer. Внутренний PageRank не передаётся. |
| 16 | **Header не ссылается на `/howto`, footer не ссылается на `/loyalty`, `/howto`, `/blog`** | те же | S | `/loyalty` и `/howto` доступны только из header (но не footer). `/blog` доступен только из header. Поисковые краулеры обходят сайт через ссылки — если есть только в header, рейтинг страницы ниже. |
| 17 | **`/howto` страница описывает несуществующий 3D-конструктор** | [howto/page.tsx:41-93](src/app/howto/page.tsx#L41) | M | H1 `HOW TO > КОНСТРУКТОР`, четыре раздела про «выберите место нанесения, нажмите выберите файл…» — относятся к удалённому 3D-конструктору (см. CLAUDE.md §1, §10). Misleading content → bounce → Яндекс понизит. Либо переписать под новый ProductInfo-flow, либо удалить страницу + 301 на `/methods`. |
| 18 | **Категорийный config.tsx (`/futbolki`) тоже ссылается на конструктор** | [futbolki/config.tsx:39](src/app/futbolki/config.tsx#L39) | S | "...создаёте дизайн прямо у нас в студии с помощью конструктора…" — конструктора больше нет. Аналогично проверить все 6 config.tsx + обновить body. |
| 19 | **Alt-атрибуты обложек блога одинаковые: `alt='Обложка поста'`** | [blog/[post]/page.tsx:54](src/app/blog/[post]/page.tsx#L54), [blog/page.tsx:78](src/app/blog/page.tsx#L78) | S | Должно быть `alt={post.title}` — иначе все обложки имеют одинаковый alt. |
| 20 | **Alt в `ProductCard` / `product-photos` = `"card pic"`** | [product-photos.tsx:28](src/components/pages-components/shop-page/product-photos/product-photos.tsx#L28) | S | Должно быть `alt={item.name}` или `alt={item.name + ' — фото ' + (index+1)}`. Сейчас Image SEO/Google Images каталог пропускают. |
| 21 | **Sitemap-генерация не привязана к данным БД** | (нет файла) | M | Когда добавляется новый товар/блог-пост через admin, sitemap.xml **не обновляется** (он статический файл, см. P0 #1). Решение: перевести на `src/app/sitemap.ts` (dynamic) с чтением из Supabase. |
| 22 | **Yandex Webmaster region + Турбо-настройки** не задокументированы | (вне кода) | XS | После cutover нужно: в Webmaster указать регион «Санкт-Петербург», submit нового sitemap, добавить «Оригинальные тексты» для блог-постов, проверить Clean-param совместимость с новой структурой URL (старые `?id=` уйдут после redirect-карты). |
| 23 | **На `/methods/[slug]/[type]` страницы (8 штук) нет `metadataBase` и нет breadcrumb-визуально** | [methods/[slug]/[type]/page.tsx](src/app/methods/[slug]/[type]/page.tsx) | S | JSON-LD breadcrumb есть, но визуально не отрисован → пользователи не понимают, где они в иерархии (UX-фактор для Яндекса). |
| 24 | **Title overshoot на части страниц** (>60 символов) | напр. [main page:23](src/app/page.tsx#L23) — 81 символ; [shop/page.tsx:14](src/app/shop/page.tsx#L14) — 79 | XS | В Google обрезает на ~580px (~60 chars), в Яндексе ~70 chars. «Печать на одежде в Санкт-Петербурге на заказ от 1 штуки цена в Pinhead Studio» обрежется на «…от 1 штуки цена в Pinhe…». Сократить с сохранением ключей. |

### 🟢 P2 — После свитча

| # | Issue | Файл | Effort | Impact |
|---|---|---|---|---|
| 25 | Identical `openGraph.title: 'PNHD STUDIO \| Главная'` на `/shop`, `/contacts`, `/loyalty` | разные | XS | Конкретизировать под содержимое страницы. |
| 26 | На `/shop/[slug]` нет `AggregateRating` — нечем брать (нет отзывов в БД) | — | M | После запуска отзывов — добавить. |
| 27 | Web Manifest + `theme-color` + `apple-touch-icon` | `src/app/` | S | Минорно для SEO; добавляет «Установить приложение» в Chrome, цвет адресной строки в Яндекс.Браузер. |
| 28 | Twitter Card meta | разные | S | `<meta name="twitter:card" content="summary_large_image">` + image — превью в Twitter/X. |
| 29 | На `/methods/[slug]` дубликат `Service` schema (есть и на главной, и на каждом методе с тем же `provider`) | — | S | Не критично, но при переборе одинаковых entity Яндекс может счесть spammy. Оставить детальную только на странице метода, на главной — упростить. |
| 30 | `keywords` meta — рудимент, Google его игнорирует с 2009, Яндекс — давно перестал учитывать как ranking factor | везде | S | Можно оставить, можно удалить — нейтрально. |
| 31 | На категорийных страницах `Product`-`ItemList` JSON-LD сейчас в `<ProductCardsBlock>` отсутствует (он есть на /shop, но не на /futbolki etc.) | category-page.tsx | S | Добавить в `CategoryPage` `ItemList` с продуктами. |
| 32 | `/blog/[post]` `dynamicParams = true` без `revalidate` | [blog/[post]/page.tsx:27](src/app/blog/[post]/page.tsx#L27) | S | (дубль frontend-аудита P2 #34) После публикации поста через admin — `revalidatePath` (уже есть), но страховочный `revalidate = 3600` лишним не будет. |
| 33 | Static-export favicon-PNG/ICO дублируются (`favicon.png`, `favicon.ico`, `favicon-16x16.png`, `favicon-32x32.png`) | `src/app/` | XS | Чистка. |
| 34 | На `/checkout`, `/cart`, `/thanks` есть индексация по умолчанию | — | XS | Должны быть `robots: { index: false }`. Шансы попадания в индекс малы (нет внешних ссылок), но best practice. |
| 35 | На `/admin/login` есть `robots: { index: false, follow: false }` ✓, на admin-(authed) тоже ✓ — но `X-Robots-Tag` HTTP header в middleware не выставляется | [src/middleware.ts](src/middleware.ts) | S | Двойная защита (meta + header) от индексации в случае шеринга preview-URL'ов. |
| 36 | Старая Google verification HTML-файл `google490368b76cb374fd.html` в `public/` от оригинала | [public/google490368b76cb374fd.html](public/google490368b76cb374fd.html) | XS | После переоформления верификации в GSC — удалить либо заменить на свежий. |

---

## Detailed findings

### P0 #1 — Stale статический sitemap.xml

**Что**: [src/app/sitemap.xml](src/app/sitemap.xml) — это **статический XML-файл от 2024-06-30**, который Next.js просто отдаёт как `/sitemap.xml`. В нём 90 URL, из которых:

- ~40 URL с дублирующимся `?id=<mongo-id>` суффиксом (legacy от MongoDB-ID оригинала)
- ~40 URL `/shop/<slug>` без суффикса
- 10 URL `/methods/...` (включая 2-уровневые `/methods/<method>/<type>`)
- `/`, `/cart`, `/checkout`, `/shop`, `/size_chart`, `/oferta`

**Чего нет в sitemap, но есть в коде/каталоге**:
- `/contacts`, `/loyalty`, `/howto`, `/privacy`
- `/blog`, `/blog/<любой_post>`
- `/futbolki`, `/hudi`, `/kepki`, `/longslivy`, `/svitshoty`, `/shoppery` — 6 SEO-целевых категорийных лендингов
- `/prints/<slug>`, `/textile/<slug>` (по `print-methods-data` 3 принта + 2 текстиля)
- `/methods` (есть, но без `/[slug]/[type]` для новых типов)
- Новые SKU из миграции `20260527000004_import_catalog.sql` (25 импортированных товаров — те же slug'и из 2024 sitemap во многом, но ряд slug'ов изменился)

**Чего есть в sitemap, но нет в новом коде/каталоге**:
- Многие SKU-slug'и из 2024 (например `futbolka-classic-belaya-man` — есть в sitemap, нужно проверить, что есть в Supabase: миграция импортировала с пометкой того же slug)
- Дубликаты `?id=...` — после Яндекс `Clean-param: id` склеит, Google `?id=` не знает → дублирует.

**Что сделать**:
1. Удалить статический `src/app/sitemap.xml`.
2. Создать `src/app/sitemap.ts`:
```ts
import { MetadataRoute } from 'next';
import { getAllProducts, getAllProductSlugs } from '@/lib/queries/products';
import { getAllPostSlugs } from '@/lib/queries/blog';
import { SITE_INFO } from '@/app/constants';
import methodsData from '@/app/utils/print-methods-data';
import { ssOptions } from '@/app/utils/method-options-data';
import { textileOptions } from '@/app/utils/textile-options-data';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = SITE_INFO.domain;
  const now = new Date();

  const staticPages = [
    '', '/shop', '/blog', '/contacts', '/loyalty', '/howto',
    '/privacy', '/oferta', '/size_chart', '/methods',
    '/futbolki', '/hudi', '/kepki', '/longslivy', '/svitshoty', '/shoppery',
  ].map((p) => ({ url: base + p, lastModified: now, changeFrequency: 'weekly' as const, priority: 0.7 }));

  const productSlugs = await getAllProductSlugs();
  const productUrls = productSlugs.map((slug) => ({
    url: `${base}/shop/${slug}`, lastModified: now, changeFrequency: 'weekly' as const, priority: 0.8,
  }));

  const postSlugs = await getAllPostSlugs();
  const postUrls = postSlugs.map((slug) => ({
    url: `${base}/blog/${slug}`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.5,
  }));

  const methodUrls = methodsData.map((m) => ({
    url: `${base}/methods/${m.slug}`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.7,
  }));

  const methodTypeUrls = ssOptions.map((o) => ({
    url: `${base}/methods/${o.parent_slug}/${o.type}`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.6,
  }));

  // … также /prints/* и /textile/* если они в sitemap-карте

  return [...staticPages, ...productUrls, ...postUrls, ...methodUrls, ...methodTypeUrls];
}
```
3. Главная (`priority: 1.0`), /shop и каталоги (`0.8`), карточки товаров и method-страницы (`0.7`), блог (`0.5`), служебные (`0.3`).

**Effort**: M (1.5 ч с тестом).

---

### P0 #2 — Stale robots.txt + admin не закрыт

**Что**: [src/app/robots.txt](src/app/robots.txt) — статический файл оригинала, копипаст из старого Tilda-сайта. Проблемы:

1. **`Disallow: /admin` отсутствует** — `/admin/login`, `/admin/products`, `/admin/blog` теоретически попадают в индекс, если на них кто-то сошлётся (например, поделится preview-URL). Защищено уровнем выше `<meta name="robots" content="noindex">` в admin layout — но robots.txt — defense in depth.
2. **`Disallow: /blog/`** — блокирует **весь** блог. В оригинале блог жил отдельным поддоменом/на Tilda; у нас блог — часть сайта, должен индексироваться. **Этот disallow один отрежет всю блог-контент-стратегию**.
3. **Мёртвые правила** — `*/constructor`, `/dtg-pechat`, `/shelkografiya` (это страницы которые сейчас живут под `/methods/<slug>`).
4. `Disallow: /thanks` — ок, `/checkout`, `/cart` — у Yandex заблокированы, у общего User-agent — нет, нужно унифицировать.
5. `Sitemap: https://studio.pnhd.ru/sitemap.xml` — ок, но содержимое sitemap stale (см. P0 #1).
6. `Host: https://studio.pnhd.ru` — устарело по спецификации Яндекса (директива `Host:` отменена в 2018, заменена 301 редиректом). Можно убирать.

**Что сделать**:
1. Удалить статический `src/app/robots.txt`.
2. Создать `src/app/robots.ts`:
```ts
import { MetadataRoute } from 'next';
import { SITE_INFO } from '@/app/constants';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin/', '/api/', '/_next/',
          '/cart', '/checkout', '/thanks',
          '/*?id=',          // legacy mongo-id duplicates
          '/*?utm_',         // tracking params
        ],
      },
      {
        userAgent: 'Yandex',
        allow: '/',
        disallow: [
          '/admin/', '/api/', '/_next/',
          '/cart', '/checkout', '/thanks',
        ],
        // Clean-param пишется отдельной директивой — Next/MetadataRoute не покрывает
      },
    ],
    sitemap: `${SITE_INFO.domain}/sitemap.xml`,
    host: SITE_INFO.domain,
  };
}
```
3. Для **Clean-param** (Yandex-specific, экономит crawl-budget) Next.js не умеет генерить нативно — придётся подмешать вручную в `MetadataRoute.Robots` через дополнительный generator (или оставить статический robots с актуальной картой). Минимум для Яндекса:
   - `Clean-param: id` (старые `?id=mongo-id` после redirect-карты)
   - `Clean-param: utm_source&utm_medium&utm_campaign&utm_term&utm_content`
   - `Clean-param: fbclid&yclid&gclid&_openstat`
   - `Clean-param: itemCartId`

**Effort**: S–M (1 ч).

---

### P0 #3 — Главная без `<h1>`

**Что**: На `/` нет ни одного `<h1>` в HTML. В [src/components/pages-components/main-page/main-screen/main-screen.tsx:111-114](src/components/pages-components/main-page/main-screen/main-screen.tsx#L111) закомментирован:
```tsx
{/* <h1 className={styles.screen_mainTitle}>
    PINHEAD
    <span className={styles.mainTitle_span}> STUDIO</span>
</h1> */}
```
А визуальный заголовок — это `<svg>` с `<path d="…">` — для парсера это бесконечная строка геометрии, не текст.

**Почему критично**:
- Главная — самая важная страница сайта с точки зрения title/anchor.
- В Яндексе/Google **отсутствие H1** — давний сигнал плохой on-page оптимизации (даже если ranking factor сейчас слабый, для пилоринг-кода поисковика это первый признак низкого качества разметки).
- Browser AT (a11y) — screen-readers тоже не видят заголовок.

**Что сделать**: Раскомментировать H1 и оставить SVG как декоративный. Скрыть текст визуально через CSS если дизайн требует только лого (`clip: rect(0 0 0 0)` или `position: absolute; left: -9999px`), но **не `display: none`** (Google игнорирует) и не `visibility: hidden`. Лучше — гибрид: SVG лого + видимый H1 рядом «Печать на одежде в Санкт-Петербурге» — релевантный H1 на лендинг-странице оптимизированный под основной коммерческий запрос.

```tsx
<h1 className={styles.visuallyHidden_h1}>
  Печать на одежде в Санкт-Петербурге — Pinhead Studio
</h1>
<svg aria-hidden="true" ...>...</svg>
```

**Effort**: S (15 мин).

---

### P0 #4 — Нет Product JSON-LD на `/shop/[slug]`

**Что**: 25 product-страниц **не имеют** `Product`+`Offer` schema. Только `<title>`, `<meta description>` и openGraph.

**Почему критично**:
- Без `Product` schema Яндекс и Google **не сделают rich-snippet** в SERP (цена, наличие, бренд). Для e-commerce это разница между «обычной ссылкой» и карточкой товара с фото + ценой → CTR падает на 20–40%.
- Яндекс с 2023 начал отображать товарные сниппеты «прямо из Поиска» — но только при наличии `Product/Offer`.

**Что сделать**: Добавить в `/shop/[slug]/page.tsx` JSON-LD:
```tsx
const jsonLdProduct = {
  "@context": "https://schema.org",
  "@type": "Product",
  "name": item.name,
  "description": item.description,
  "image": item.galleryPhotos?.length
    ? item.galleryPhotos.map(p => p.url)
    : [`${CDN_URL}/${item.slug}_0.jpg`],
  "sku": item.slug,
  "brand": { "@type": "Brand", "name": "PINHEAD STUDIO" },
  "category": item.category,
  "color": item.color,
  "offers": {
    "@type": "Offer",
    "url": `${SITE_INFO.domain}/shop/${item.slug}`,
    "priceCurrency": "RUB",
    "price": String(item.price),
    "availability": item.stock === 'out_of_stock'
      ? "https://schema.org/OutOfStock"
      : "https://schema.org/InStock",
    "seller": { "@type": "Organization", "name": "PINHEAD STUDIO" }
  }
};

const jsonLdBreadcrumb = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "Главная", "item": SITE_INFO.domain },
    { "@type": "ListItem", "position": 2, "name": "Каталог", "item": `${SITE_INFO.domain}/shop` },
    { "@type": "ListItem", "position": 3, "name": item.name, "item": `${SITE_INFO.domain}/shop/${item.slug}` },
  ]
};

return (
  <section className={styles.screen}>
    {/* ...existing JSX... */}
    <MarkupScript jsonLd={jsonLdProduct} />
    <MarkupScript jsonLd={jsonLdBreadcrumb} />
  </section>
);
```

**Effort**: M (1 ч с проверкой через Schema.org Validator).

---

### P0 #5 — `/blog/[post]` пустая метадата + нет Article schema

**Что**: [src/app/blog/[post]/page.tsx:12-21](src/app/blog/[post]/page.tsx#L12) `generateMetadata` возвращает **только** `alternates.canonical`. Ни title, ни description, ни openGraph image (хотя `post.cover` есть в БД).

**Почему критично**:
- В Яндекс/Google ВСЕ блог-посты получают одинаковый title (наследуется от root layout, который сейчас отдаёт мусор из `getCurrentPath`).
- Без description Яндекс/Google склеивают сниппет из первых строк HTML → часто получается несвязный мусор.
- Без `Article` schema нет даты публикации в выдаче, нет автора, нет фото → нет rich snippet.

**Что сделать**:
```tsx
export async function generateMetadata({ params }: { params: { post: string } }): Promise<Metadata> {
  const post = await getPostBySlug(params.post);
  if (!post) return {};
  const url = `${SITE_INFO.domain}/blog/${params.post}`;
  return {
    title: `${post.title} — PNHD>STUDIO`,
    description: post.subtitle ?? `${post.title}. Блог Pinhead Studio о печати на одежде и мерче.`,
    metadataBase: new URL(SITE_INFO.domain),
    alternates: { canonical: url },
    openGraph: {
      type: 'article',
      title: post.title,
      description: post.subtitle ?? undefined,
      url,
      images: post.cover ? [{ url: post.cover, width: 1200, height: 630 }] : undefined,
      siteName: 'PINHEAD STUDIO',
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.subtitle ?? undefined,
      images: post.cover ? [post.cover] : undefined,
    },
  };
}
```

И в JSX:
```tsx
const jsonLdArticle = {
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "headline": post.title,
  "description": post.subtitle,
  "image": post.cover,
  "datePublished": post.createdAt,
  "dateModified": post.updatedAt ?? post.createdAt,
  "author": { "@type": "Person", "name": post.author ?? "PNHD>STUDIO" },
  "publisher": {
    "@type": "Organization",
    "name": "PINHEAD STUDIO",
    "logo": { "@type": "ImageObject", "url": `${SITE_INFO.domain}/opengraph-image.jpg` }
  },
  "mainEntityOfPage": { "@type": "WebPage", "@id": `${SITE_INFO.domain}/blog/${params.post}` }
};
```

**Effort**: S (30 мин).

---

### P0 #6 — Redirect-карта со старого sitemap

**Что**: [Оригинальный sitemap](https://studio.pnhd.ru/sitemap.xml) содержит **90 URL**, многие из которых:
- **SKU-страницы**, индексированные в Яндекс/Google с 2024 и накопившие ссылочный вес
- **Дубли `<slug>?id=<mongo-id>`** — отдельные URL в sitemap

После cutover часть URL'ов точно не существует в клоне:
- Конкретно проверить: какие из 90 SKU-slug'ов **не** в `getAllProductSlugs()` → отдадут 404
- Все `?id=<24-char-hex>` URL — Яндекс склеит по `Clean-param: id` (если он останется в robots), Google нет

**Что сделать**: Сравнить sitemap-список с импортированными slug'ами и сгенерить редирект-карту. Сначала — список slug'ов, которых нет в БД:

```bash
# Получить slug'и из старого sitemap
curl -s https://studio.pnhd.ru/sitemap.xml | \
  grep -oE '<loc>[^<]+/shop/[^?<]+' | \
  sed 's,.*/shop/,,' | sort -u > /tmp/old-slugs.txt

# Получить slug'и из импорта (миграция 20260527000004)
psql ... -c "SELECT slug FROM products ORDER BY slug" -t -A > /tmp/new-slugs.txt

# Diff
comm -23 /tmp/old-slugs.txt /tmp/new-slugs.txt
```

Затем для отсутствующих — добавить в `next.config.mjs`:
```js
async redirects() {
  return [
    // Категория-мосты для удалённых slug'ов
    { source: '/shop/futbolka-classic-belaya-man', destination: '/shop?type=tshirt&color=white', permanent: true },
    { source: '/shop/hudi-classic-chernyj-man',    destination: '/shop?type=hoodie&color=black', permanent: true },
    // … остальные

    // Wildcard для всех ?id=<hex>
    { source: '/shop/:slug{(?:.+)?}', has: [{ type: 'query', key: 'id' }],
      destination: '/shop/:slug', permanent: true },

    // Старые слаги категорий, которые вели на главную (CLAUDE.md упоминает /pechat-na-futbolkah → должны вести на /futbolki)
    { source: '/pechat-na-futbolkah', destination: '/futbolki', permanent: true },
    { source: '/pechat-na-hudi',      destination: '/hudi',     permanent: true },
    { source: '/pechat-na-svitshotah',destination: '/svitshoty', permanent: true },
    { source: '/pechat-na-shopperah', destination: '/shoppery', permanent: true },
    // ... все 14 disallow-rules из старого robots.txt — они существовали как URL'ы

    // Существующие
    { source: '/kak-stirat-futbolki-s-printom', destination: '/blog', permanent: true },
    // … (не дублировать apple-app-site-association — см. P0 #8)
  ];
}
```

См. также таблицу [Redirect-карта](#redirect-карта) ниже.

**Effort**: M (3–4 ч — сравнение списка + написание правил + тестирование).

---

### P0 #7 — `metadataBase` + canonical (cross-ref to frontend audit)

Покрывается [frontend-аудитом P0 #2, P0 #4](2026-05-28-frontend.md). Здесь только подчёркиваю: для SEO это критично потому что:

1. **Canonical через `__dirname.match(/(?<=[\/\\]app[\/\\]).+/)`** — это попытка получить путь страницы из имени файла на build-time. В Next.js App Router это **не работает**: на сервере `__dirname` для root layout == `.next/server/app` (build-out path), не route. Regex `split(/\/\\]/)` синтаксически некорректен и возвращает массив с одним элементом — оригинальной строкой.
2. На странице без явного `alternates.canonical` (17 страниц) canonical-тег будет либо `https://studio.pnhd.ru/` (пустой), либо мусорный → Яндекс/Google склеят разные страницы в одну каноническую → потеря rank.

**Фикс совмещается с P0 #2 frontend-аудита**: переписать на `headers().get('x-pathname')` (middleware уже выставляет), `metadataBase: new URL(SITE_INFO.domain)`, и каждая страница задаёт `alternates.canonical` своим относительным путём.

---

### P0 #8 — Duplicate redirect rule

**Что**: В [next.config.mjs:12,15](next.config.mjs#L12) дважды объявлено правило для `/.well-known/apple-app-site-association`:
```js
{source: '/.well-known/apple-app-site-association', destination: '/', permanent: true},  // line 12
{source: '/shop%20%D0%BE%D1%82%D0%B7%D1%8B%D0%B2%D1%8B', destination: '/shop', permanent: true},
{source: '/tproduct/...', destination: '/shop?type=hoodie', permanent: true},
{source: '/.well-known/apple-app-site-association', destination: '/', permanent: true},  // line 15 — DUPLICATE
```

Next.js при `next dev` выдаёт warning, в production — поведение implementation-defined (последнее правило побеждает, обычно). Косметика, но **в одном PR с redirect-картой** надо убрать.

**Effort**: XS (10 секунд).

---

## Pre-launch checklist

Сгруппировано по разделам. Галочками отмечать перед свитчем.

### Код (PR'ы до merge)

- [ ] **P0 #1**: Удалить static `src/app/sitemap.xml`, добавить `src/app/sitemap.ts` с динамической генерацией из Supabase.
- [ ] **P0 #2**: Удалить static `src/app/robots.txt`, добавить `src/app/robots.ts` (или адаптированный static с актуальными правилами + Clean-param).
- [ ] **P0 #3**: Добавить `<h1>` на главную (видимый или visually-hidden).
- [ ] **P0 #4**: `Product`+`Offer`+`Breadcrumb` JSON-LD на `/shop/[slug]`.
- [ ] **P0 #5**: Полная metadata + `BlogPosting` JSON-LD на `/blog/[post]`.
- [ ] **P0 #6**: Redirect-карта в `next.config.mjs` (см. [таблицу ниже](#redirect-карта-если-применимо)).
- [ ] **P0 #7 / frontend P0 #2 #4**: переписать canonical в root layout через `headers().get('x-pathname')`, выставить `metadataBase` на всех 18 страницах.
- [ ] **P0 #8**: Убрать дубликат apple-app-site-association в `next.config.mjs`.
- [ ] **P1 #10**: Заменить `Organization` → `LocalBusiness` на `/contacts`; починить `postalCode: '197022'`.
- [ ] **P1 #11**: На `/blog/page.tsx` добавить `metadataBase`, `canonical`, `openGraph`, `Blog` JSON-LD.
- [ ] **P1 #14**: `alternates.canonical` в `buildMetadata()` для `CategoryPage`.
- [ ] **P1 #15-16**: Добавить ссылки на категории в footer (минимум) и header (опц.); ссылки на `/loyalty`/`/howto`/`/blog` в footer.
- [ ] **P1 #17-18**: Переписать `/howto` под новый ProductInfo-flow (или удалить + 301 на `/methods`); поправить body 6 категорийных config.tsx (убрать упоминания «конструктора»).
- [ ] **P1 #19-20**: Заменить `alt='Обложка поста'` → `alt={post.title}`; `alt='card pic'` → `alt={item.name}`.
- [ ] **P1 #24**: Сократить title'ы > 60 символов.
- [ ] **frontend P0 #1**: Убрать `<Agentation />` из публичного layout (бьёт по Core Web Vitals = SEO).
- [ ] **frontend P0 #3**: Починить `ProductCardsBlock` image URL fallback (60% каталога с битыми изображениями = плохо для Яндекс/Google Images).
- [ ] **frontend P1 #11-12**: `<img>` → `next/image` на blog + method-advantages.

### Vercel

- [ ] Production alias переключён на `studio.pnhd.ru` (или соответствующий cutover-домен).
- [ ] Env vars `NEXT_PUBLIC_SUPABASE_URL` / `_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` — production OK.
- [ ] Vercel Analytics или Speed Insights включены (опц., но полезно для отслеживания Core Web Vitals — Яндекс/Google смотрят).
- [ ] HTTP → HTTPS redirect автоматический (Vercel делает) ✓.
- [ ] Production deploy с `next build` без warnings про `metadataBase` (если warning остался — значит P0 #4 не закрыт).

### Supabase

- [ ] Все 25 SKU имеют `image_url` / `gallery_photos` (frontend P0 #3 + 15 битых сейчас — критично, рекомендую перезалить через admin до свитча).
- [ ] Хотя бы 5–10 блог-постов с обложками и `body_html` в БД (иначе блог-секция в sitemap будет пустая).
- [ ] `admin_users` правильно заполнен (проверить, что только `mib@pnhd.ru` — никаких тестовых пользователей).

### Yandex Webmaster (после cutover)

- [ ] Подтвердить владение сайта (мета-тег `35381404e7bfd3a4` или заменить, если код доступа от оригинала больше не работает).
- [ ] Указать регион **Санкт-Петербург**.
- [ ] Отправить **новый** sitemap (`https://studio.pnhd.ru/sitemap.xml`) — после деплоя dynamic sitemap.
- [ ] Запустить «Переобход страниц» для главной и `/shop`.
- [ ] Раздел «Турбо-страницы» — **не подключать** (мы быстрые, Турбо ломает дизайн).
- [ ] Раздел «Оригинальные тексты» — добавить блог-посты для защиты от копирования.
- [ ] Проверить «Структура сайта» через 3-7 дней после свитча.
- [ ] Раздел «Удаление URL» — если в индексе остались `/shop/<old-slug>?id=...`, удалить вручную после редиректов.
- [ ] Раздел «Поисковые запросы» — снять бейзлайн позиций по основным запросам ДО свитча, чтобы потом видеть динамику.

### Google Search Console (после cutover)

- [ ] Подтвердить владение (HTML-файл `google490368b76cb374fd.html` от оригинала, либо новый верификатор).
- [ ] Добавить sitemap.
- [ ] Запустить «URL Inspection» для главной + 5 ключевых SKU + 3 категорий.
- [ ] Снять бейзлайн позиций по основным запросам.

### DNS / Cutover

- [ ] **Снять бейзлайн** позиций по 30+ топ-запросам в Яндекс/Google за 24-48 ч до свитча.
- [ ] DNS TTL у текущего домена снижен до 5 мин за 24 ч до свитча (старый sitemap у домена `studio.pnhd.ru` отдаст ту же tilda/старую копию, пока кеши не обновятся).
- [ ] Подготовить план отката (как переключить DNS обратно за 1 минуту, если в первый час обнаружится критический баг).
- [ ] Согласовать момент cutover ID'ов аналитики (Метрика/Roistat) с DNS-переключением — иначе час будет double-counting.

### Monitoring (первые 7 дней после)

- [ ] Vercel Analytics — следить за 5xx/4xx ошибками каждый день.
- [ ] Yandex.Webmaster — раздел «Диагностика», обновлять каждый день; реагировать на ошибки crawler'а сразу.
- [ ] Google Search Console — раздел «Page indexing», проверять каждые 2-3 дня.
- [ ] Лог 404'ов в Vercel → реактивно добавлять redirect'ы для популярных промахов.
- [ ] Trends по органическому трафику в Метрике — ожидаемо просадка 7-14 дней (пока Яндекс переиндексирует), потом восстановление + рост (благодаря новому контенту/schema).

---

## Redirect-карта (если применимо)

**Что готово к включению**: список URL из старого robots.txt-`Disallow` (это были реально существующие в индексе URL'ы Tilda-сайта) + старые SKU не в новой БД + дубли с `?id=`.

| Старый URL | Новый URL | Тип |
|---|---|---|
| `/pechat-na-futbolkah` | `/futbolki` | 301 |
| `/pechat-na-hudi` | `/hudi` | 301 |
| `/pechat-na-svitshotah` | `/svitshoty` | 301 |
| `/pechat-na-shopperah` | `/shoppery` | 301 |
| `/pechat-na-kepkah` | `/kepki` | 301 |
| `/shelkografiya` | `/methods/shelkografiya` | 301 |
| `/dtf-pechat` | `/methods/dtf-pechat` | 301 |
| `/termotransfernaya-pechat` | `/methods/termotransfernaya-pechat` | 301 |
| `/pryamaya-dtg-pechat` | `/methods/pryamaya-dtg-pechat` | 301 |
| `/vishivka` | `/methods/vishivka` | 301 |
| `/pechat-logotipa` | `/methods/pryamaya-dtg-pechat/dtg-pechat-logotipa` | 301 |
| `/pechat-printov` | `/methods` | 301 |
| `/pechat-photo` | `/methods` | 301 |
| `/pechat-familii` | `/methods` | 301 |
| `/store` | `/shop` | 301 |
| `/card` | `/cart` | 301 |
| `/faq` | `/#faq` | 301 |
| `/rules` | `/oferta` | 301 |
| `/shop/<slug>?id=*` | `/shop/<slug>` | 301 (через `has: [{type: 'query', key: 'id'}]`) |
| `/shop/<любой-удалённый-slug>` | `/shop?type=<category>` | 301 (после сверки sitemap × БД) |
| `/*/constructor` | `/shop/[slug]` | 301 (конструктор удалён, см. CLAUDE.md §1) |
| `/methods/pryamay` | `/methods/pryamaya-dtg-pechat` | 301 (typo в robots) |
| `/tproduct/1-974652062611-klassicheskii-hudi-chernii` | `/shop?type=hoodie` | 301 (уже частично есть в next.config) |
| `/zagitova` | `/` | 410 или 301 |
| `/page23123483.html` | `/` | 301 (уже есть в next.config) |

**Action item для владельца**: добиться доступа к Я.Метрике/Webmaster оригинала и выгрузить топ-100 indexed URLs за последние 30 дней — там могут быть страницы, которых нет в sitemap (например, старые UTM-tagged лендинги). Это финализирует redirect-карту.

---

## Что НЕЛЬЗЯ забыть в день свитча

Sequence на cutover-день (T = момент DNS-переключения):

**T −24h**:
1. Снизить DNS TTL до 300 сек у domain `studio.pnhd.ru`.
2. Снять бейзлайн позиций в Яндекс (Wordstat/Webmaster), 30+ запросов.
3. Прогнать `next build && next start` локально, открыть `/`, `/shop`, `/shop/<slug>`, `/blog/<slug>`, `/futbolki`, `/methods/dtf-pechat` — глазами проверить title/canonical/OG в DOM через DevTools.
4. Прогнать `/sitemap.xml` и `/robots.txt` через `https://www.xml-sitemaps.com/validate-xml-sitemap.html` и [Yandex robots validator](https://webmaster.yandex.ru/tools/robotstxt/).

**T −2h**:
1. Финальный `git push main` со всеми SEO P0/P1-фиксами.
2. Дождаться Vercel green deploy.
3. Прогнать `curl -I https://<preview>.vercel.app/` — проверить заголовки `link: rel=canonical`, ничего ли не отдаёт `5xx`.

**T = 0**:
1. **DNS-cutover**: переключить A/CNAME запись `studio.pnhd.ru` на Vercel.
2. **Сразу же**: открыть в incognito `https://studio.pnhd.ru/`, `https://studio.pnhd.ru/sitemap.xml`, `https://studio.pnhd.ru/robots.txt` — глазами проверить.
3. Запустить `curl -A "Yandex" https://studio.pnhd.ru/` — посмотреть какой HTML отдаётся под яндекс-user-agent (на случай anti-bot Vercel Security Checkpoint — он иногда щёлкает по серверным IP).
4. В Yandex Webmaster — кнопка «Переобход» для главной.

**T +30 мин**:
1. Открыть `/admin/login`, залогиниться, посмотреть, что админка работает.
2. Заказать тестовый «лид» через footer-форму — проверить, что Edge Function `create-lead` принимает.
3. В Метрике глянуть «Реальное время» — есть ли посетители.

**T +2h**:
1. Прогнать главные страницы через PageSpeed Insights / Lighthouse — Core Web Vitals не должны провалиться (LCP < 2.5s, CLS < 0.1, INP < 200ms).
2. Если Agentation toolbar всё ещё на проде — насильно убрать (это P0 #1 frontend-аудита).

**T +24h**:
1. Проверить в Я.Webmaster раздел «Диагностика» — ошибок краулера быть не должно.
2. Если в логах Vercel есть 404'ы — сразу разобрать топ-10 и добавить redirect'ы.

**T +7d**:
1. Снять «после»-замер позиций. Ожидаемо: 0–20% просадки на 7-14 дней (пока Яндекс переиндексирует), потом восстановление + рост.

---

## Open questions

1. **Доступ к Яндекс.Метрике/Webmaster оригинала** — есть? Без выгрузки top-100 indexed URLs мы не финализируем redirect-карту. Если нет — придётся реактивно добавлять redirect'ы по 404-логам Vercel в первую неделю.

2. **Какие slug'и старых SKU из sitemap **не** в новой БД?** Я не запускал сравнение `SELECT slug FROM products` vs sitemap, потому что нужны Supabase-credentials. Это **обязательный** шаг до свитча — иначе часть SKU после cutover уйдут в 404 с потерей link equity.

3. **Yandex verification meta `35381404e7bfd3a4`** — это **код оригинала**. Если домен `studio.pnhd.ru` сохраняется и в Webmaster ничего не менялось — должно работать. Если нет — поставить **новый** код владельца (после регистрации сайта в Webmaster под своим аккаунтом). То же про Google `google490368b76cb374fd.html`.

4. **Какой плановый темп публикации блог-постов после свитча?** Если еженедельно — стоит добавить `revalidate = 3600` на `/blog/[post]` (P2 #32). Если редко — текущий `revalidatePath` из admin-action достаточен.

5. **`/howto` страница**: переписать под новый flow (без 3D-конструктора) или удалить + 301 на `/methods`? Контент сейчас misleading.

6. **15/25 товаров с битыми `cdn.pnhd.ru` фото**: можно ли получить исходники для перезаливки? Без них даже после P0-фиксов 60% карточек товара в выдаче будут с no-photo плейсхолдером — провал Google Images SEO.

7. **`<Agentation />` toolbar** на production: оставить только в dev? (см. frontend P0 #1). Это критично для Core Web Vitals (LCP), которые Яндекс/Google используют как фактор ранжирования.

8. **Региональность Яндекса** — после cutover в Webmaster указать регион «Санкт-Петербург». Это вне кода. Без региона Яндекс не показывает сайт в локальном пакете «Услуги печати в СПб».
