# Performance Findings

> Performance engineer pass для launch-readiness audit (2026-06-01)
> Артефакты: `docs/superpowers/reports/launch-audit-2026-06-01/raw/lighthouse-*.json` (6 файлов)
> Прод-URL: `https://pnhd-studio-clone.vercel.app`

---

## TL;DR

**Mobile launch — НЕ ГОТОВ.** Lighthouse `Performance` < 30 на двух из трёх ключевых страниц, LCP 7.8–20.6 секунд (норма Google ≤ 2.5 s), CLS 0.68–0.71 на shop/product (норма ≤ 0.1). Это автоматический ranking hit в Google и ужасный first-impression на 3G/middle-tier телефонах.

**Desktop — приемлемо**, но всё ещё с заметным lag'ом на home (Perf 39, LCP 4.0s — главная страница).

**Главные виновники** (по убыванию impact'а):

1. 🔴 **3D-Tee грузит ~8.6 MB ассетов синхронно** на главной (`Glitch2.jpg` 6.6 MB texture + `potsdamer_platz_1k.hdr` 1.2 MB env-map + `shirt_baked_collapsed.glb` 1 MB model). Dynamic-import самого компонента сделан правильно, но ассеты внутри грузятся eagerly через `useTexture.preload` / `useGLTF.preload` сразу при mount.
2. 🔴 **Custom fonts вне `next/font`** (NeueMachina, DrukTextWideCyr) — `font-display: swap` без `size-adjust` + без preload → катастрофический CLS 0.71 на shop mobile.
3. 🔴 **Yandex Maps full.js (705 KB transfer)** статически импортирован в `<MapComponent>` на главной — eagerly грузится до FCP.
4. 🟡 **`unoptimized` prop у `next/image`** в `product-card.tsx` и `product-photos.tsx` — обходит весь next/image pipeline (resize/webp/avif/lazy). На product page это ещё и LCP-image без `priority`.
5. 🟡 **Bundle-analyzer не подключён**, нет visibility в распределение vendor chunks.

---

## Lighthouse summary

Значения метрик — из «lab» прогонов Lighthouse (mobile = throttled 4x CPU + slow-4G, desktop = no throttle). На реальных мобильных пользователях метрики обычно лучше, но порядок проблем тот же.

| Page | Viewport | Perf | A11y | BP | SEO | LCP (s) | FCP (s) | CLS | TBT (ms) | SI (s) |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `/` | mobile | **27** 🔴 | 91 | 73 | 100 | **20.6** 🔴 | 4.2 | 0.01 ✅ | **24054** 🔴 | 15.5 |
| `/` | desktop | **39** 🟡 | 92 | 73 | 100 | 4.0 🟡 | 1.0 | 0.03 ✅ | 1512 | 4.3 |
| `/shop` | mobile | **11** 🔴 | 87 | 73 | 100 | 7.8 🔴 | 2.8 | **0.71** 🔴 | 3352 🔴 | 8.5 |
| `/shop` | desktop | **49** 🟡 | 88 | 73 | 100 | 4.3 🟡 | 0.7 | **0.68** 🔴 | 0 ✅ | 2.5 |
| `/shop/futbolka-classic-belaya-man` | mobile | **61** 🟡 | 87 | 73 | 100 | **12.9** 🔴 | 2.0 | 0.04 ✅ | 333 | 5.6 |
| `/shop/futbolka-classic-belaya-man` | desktop | **79** ✅ | 88 | 73 | 100 | 2.7 ✅ | 0.9 | 0.00 ✅ | 116 | 1.9 |

**Прочтение по доменам:**

- **Performance** — главный pain. Mobile-home Perf=27 в зелёную зону вытянуть нельзя без серьёзной работы над 3D-ассетами.
- **A11y 87–92** — стабильно среднее, конкретные findings (button-name, link-name, color-contrast) разбираются в `03-accessibility-findings.md`.
- **Best Practices 73 везде** — одна и та же проблема: 6 third-party cookies (Yandex Metrica + Roistat + uiscom) + `Uncaught TypeError` в `cs.min.js` (uiscom widget). Это вне нашего кода.
- **SEO 100 везде** ✅.

### Top 5 opportunities (mobile, агрегировано по 3 страницам)

| # | Audit | Сводно | Impact |
|---|---|---|---|
| 1 | `largest-contentful-paint` | LCP > 7.8 s на /shop, > 12.9 s на product, > 20 s на home | core ranking |
| 2 | `mainthread-work-breakdown` | 11–44 секунд main-thread work на mobile | блокирует TTI |
| 3 | `bootup-time` | 2–37 секунд script execution | пользователь не может tap'нуть |
| 4 | `layout-shifts` | CLS 0.71 на /shop из-за late web-fonts | core ranking |
| 5 | `redirects` | стабильно ~900 ms на каждую страницу (Vercel HTTPS redirect) | -1 s на каждом cold visit |
| 6 | `total-byte-weight` | 12.2 MB на home mobile | bandwidth + повторный трафик |

---

## Bundle composition (top JS chunks on home mobile)

| Chunk / URL | Transfer (KB) | Uncompressed (KB) | Что это |
|---|---:|---:|---|
| `yastatic.net/.../maps-front-jsapi-v2-1/2.1.79/full.js` | **706** | 3133 | **Yandex Maps** — грузится на home потому что `<MapComponent>` импортирован статически |
| `_next/static/chunks/b536a0f1.*.js` | 172 | 672 | Vendor (Three.js / react-three/drei) — нужен только для 3D-Tee |
| `_next/static/chunks/7665-*.js` | 122 | 398 | Vendor (Three.js core) |
| `mc.yandex.ru/metrika/tag.js` | 93 | 282 | Yandex Metrica |
| `_next/static/chunks/4bd1b696-*.js` | 56 | 173 | App common |
| `_next/static/chunks/7672.*.js` | 56 | 168 | Likely MUI / Emotion vendor |
| `app.uiscom.ru/static/cs.min.js` | 50 | 143 | uiscom chat widget |

**Unused JS** (Lighthouse coverage):
- Yandex Maps full.js — **516 KB wasted** (73% не выполняется на home)
- `b536a0f1` chunk — 84 KB wasted
- `7665-*` chunk — 79 KB wasted

**bundle-analyzer** — НЕ подключён. В `package.json` нет `@next/bundle-analyzer`. Чтобы получить точную картину vendor-распределения — рекомендую временно подключить (см. NICE-TO-HAVE раздел).

---

## 🔴 BLOCKERS (мобильный launch)

### B1. 3D-Tee грузит 8.6 MB на главной — главный убийца LCP/TBT

**Файлы:**
- `/Users/margolinilya/studio/pnhd-studio/src/components/shared-components/3d-tee/3d-tee.tsx` (lines 20, 72, 75, 135–136)
- `/Users/margolinilya/studio/pnhd-studio/public/Glitch2.jpg` — **6.6 MB** JPEG texture
- `/Users/margolinilya/studio/pnhd-studio/public/potsdamer_platz_1k.hdr` — 1.2 MB HDR env-map
- `/Users/margolinilya/studio/pnhd-studio/public/shirt_baked_collapsed.glb` — 1.0 MB 3D model
- `/Users/margolinilya/studio/pnhd-studio/src/components/pages-components/main-page/main-screen/tee-client.tsx` — dynamic wrapper

**Что происходит:** компонент 3d-tee.tsx загружается через `next/dynamic({ ssr: false })` — это работает. Но как только React mountит компонент, **сразу** дёргаются:
```ts
const texture = useTexture('/Glitch2.jpg');                       // 6.6 MB
const { nodes, materials } = useGLTF('/shirt_baked_collapsed.glb'); // 1 MB
<Environment files="/potsdamer_platz_1k.hdr" />                    // 1.2 MB

useGLTF.preload('/shirt_baked_collapsed.glb');
['/whiteTexture.png', '/Glitch2.jpg'].forEach(useTexture.preload);
```

Эти `.preload()` вызовы выполняются на module-import — это значит как только chunk загрузится в браузер, начинают качаться 8.6 MB. На 3G это catastrophically slow.

**Главный виновник LCP=20.6s на home mobile**: главный hero-блок (`main-screen_screen_largeBlock`) — это контейнер 3D-Tee. Браузер ждёт пока модель отрендерится, чтобы засчитать LCP.

**Fix (приоритет, от дешёвого к дорогому):**

1. **Сжать Glitch2.jpg**. Это PNG-like JPEG 6.6 MB — большинство 3D-textures отлично работают в 512×512 webp на 100–200 KB. Просто `cwebp -q 85 Glitch2.jpg -o Glitch2.webp` + поменять ссылку в `useTexture`. Ожидаемое сокращение: ~6.4 MB → ~100 KB.
2. **Перевести `.hdr` в `.exr` или KTX2**. Three.js поддерживает `RGBELoader` для HDR но это 1.2 MB неподобающе. Альтернатива — сцена без `<Environment>`, просто `<ambientLight>` + `<directionalLight>` (визуально похоже для футболки).
3. **`useGLTF.preload` и `useTexture.preload` вызовы убрать** или обернуть в `requestIdleCallback`. Они не должны срабатывать на import.
4. **Mount Tee только после первой interaction / scroll-into-view**. Заменить `<TeeClient>` на статичную картинку футболки (как в commented-out коде `main-screen.tsx:41`), и подгружать 3D только когда юзер скроллит / hover'ит / тапает.

**Verification:**
```bash
# Network throttling Slow 3G, navigate /, check that:
# - FCP < 2s (currently 4.2s)
# - No /Glitch2.jpg request until user interaction
# - LCP < 4s (currently 20.6s)
```

### B2. CLS 0.71 на /shop mobile — custom fonts без `next/font/local`

**Файлы:**
- `/Users/margolinilya/studio/pnhd-studio/src/vendors/fonts/font.css` (15 `@font-face` declarations)
- `/Users/margolinilya/studio/pnhd-studio/src/app/(storefront)/layout.tsx` (`Inter` через `next/font/google`, но кастомные шрифты — нет)

**Что происходит:** на /shop mobile CLS=0.71 (норма ≤ 0.1, иначе Google понижает в ranking'е). По Lighthouse `cls-culprits-insight` основной сдвиг (0.69) — на `<footer>` блок когда подгружаются `druktextwidecyr-medium.woff2`, `NeueMachina-Ultrabold.woff`, `NeueMachina-Regular.woff`, `NeueMachina-Black.woff`.

Кастомные шрифты подключаются через ванильный `@font-face` в `src/vendors/fonts/font.css`. У них стоит `font-display: swap` (это хорошо — нет FOIT), но:
1. Шрифты не preload'ятся через `<link rel="preload">` — браузер обнаруживает их только когда парсит CSS.
2. Нет `size-adjust` / `ascent-override` для fallback-шрифта → визуальный сдвиг при подмене на загруженный шрифт.
3. Footer на /shop появляется ниже viewport, шрифт там грузится позже → именно его перерасчёт даёт 0.69 балла CLS.

**Fix:**

1. **Мигрировать на `next/font/local`** — он сам генерирует размерно-точные fallback-шрифты:
```ts
// src/app/(storefront)/layout.tsx
import localFont from 'next/font/local';
const neueMachina = localFont({
  src: [
    { path: '../../vendors/fonts/Neue_Machina/NeueMachina-Regular.woff2', weight: '400', style: 'normal' },
    { path: '../../vendors/fonts/Neue_Machina/NeueMachina-Medium.woff2', weight: '500', style: 'normal' },
    // ...
  ],
  variable: '--font-neue-machina',
  display: 'swap',
});
```
Это автоматически добавит preload + правильный fallback с size-adjust.

2. **Или (как быстрый fix):** добавить `<link rel="preload" as="font" type="font/woff2" href="..." crossorigin>` для критичных весов (Regular/Medium) в layout.

3. **Reserve space для footer**: установить `min-height: 731px` (по Lighthouse boundingRect — это финальная высота footer'а) на `<footer>` в CSS, чтобы пустое место не схлопывалось.

**Note:** на product page (`/shop/[slug]`) CLS = 0.04 — там, видимо, footer уже стабилизирован к моменту первого paint'а. На shop mobile он рендерится после грид'а 25 карточек.

**Verification:**
- DevTools → Performance → record load → Layout Shifts trace → footer перестаёт мигать.

### B3. Yandex Maps 706 KB на главной — статически импортирован

**Файлы:**
- `/Users/margolinilya/studio/pnhd-studio/src/components/pages-components/main-page/map-screen/map-component.tsx`

**Что происходит:** `<MapComponent>` импортирует `{ YMaps, Map, Placemark, ZoomControl }` напрямую (line 4). Это статический import — Webpack тянет `@pbe/react-yandex-maps` в main bundle. На любом home-visit грузится `yastatic.net/.../full.js` 706 KB (3.1 MB uncompressed) с координатами магазина в Петербурге.

Карта находится в самой нижней секции главной (map_wrapper), на 14-th screen scroll. Юзер 95% не доходит — а 706 KB уже скачано.

**Аналог уже сделан правильно** на `/checkout`: `src/components/pages-components/checkout-page/delivery-map/delivery-map.tsx` использует `dynamic(() => import('@pbe/react-yandex-maps').then(...))`. Скопировать паттерн в `map-component.tsx`.

**Fix:**
```tsx
// map-component.tsx
'use client';
import dynamic from 'next/dynamic';

const YMaps = dynamic(() => import('@pbe/react-yandex-maps').then(m => m.YMaps), { ssr: false, loading: () => <div style={{ height: 400 }} /> });
const Map = dynamic(() => import('@pbe/react-yandex-maps').then(m => m.Map), { ssr: false });
// ... etc

const MapComponent = () => { /* ... */ }
```

Дополнительно — обернуть всю секцию в `IntersectionObserver` / `next/dynamic({ loading: ..., ssr: false })` с lazy `import()` срабатывающим только когда секция в viewport. Tools: `react-intersection-observer` или own hook.

**Expected savings:** -706 KB transfer, -3 s scripting на home mobile.

---

## 🟡 WARNINGS

### W1. `next/image` с `unoptimized` на каталоге и product page

**Файлы:**
- `/Users/margolinilya/studio/pnhd-studio/src/components/pages-components/shop-page/product-card/product-card.tsx:40`
- `/Users/margolinilya/studio/pnhd-studio/src/components/pages-components/shop-page/product-photos/product-photos.tsx:33`

Оба компонента используют `<Image ... unoptimized />`. Это значит:
- Next/image не делает resize → user на mobile грузит full-resolution `1500×2000` JPG вместо `400×600`.
- Не конвертирует в webp/avif → +50–70% bytes vs modern format.
- Тем не менее остаётся `loading="lazy"` — это OK, но не покрывает оптимизацию.

**Почему так сделано:** `image_url` указывает на `cdn.pnhd.ru` (внешний CDN), и был, видимо, страх что Next.js не сможет проксировать. Но `cdn.pnhd.ru` уже в `next.config.mjs.images.remotePatterns` (line 89) — `next/image` бы прекрасно работало через `/_next/image?url=...`.

**Fix:**
1. Убрать `unoptimized` prop.
2. Убрать ручной fallback на `no%20photo.png` — лучше через onError просто прятать или показывать CSS placeholder. Текущая цепочка `cdn.pnhd.ru → apiBaseUrl → no photo.png` сломанна (apiBaseUrl мёртв 502).
3. На product page добавить `priority` для первого фото (LCP-image).
4. Установить корректные `sizes` атрибут для responsive:
```tsx
<Image
  src={imageSrc}
  alt={item.name}
  width={371}
  height={556}
  sizes="(max-width: 768px) 50vw, 371px"
  priority={index === 0}
  // НЕ unoptimized
/>
```

**Expected impact:** product mobile LCP с 12.9 s → ~3–4 s; product card grid trafficc -60%.

### W2. CSS background-images без оптимизации (PNG 119–896 KB)

**Файлы:**
- `/Users/margolinilya/studio/pnhd-studio/src/components/pages-components/main-page/main-screen/main-screen.module.css:96` — `main_screen_image.png` 896 KB
- `/Users/margolinilya/studio/pnhd-studio/src/components/shared-components/footer/footer.module.css:82` — `footer_form_bg.png` 119 KB

`url(../../../../../public/main_screen_image.png)` — Webpack видит и копирует в bundle с хэшем, но без resize/webp. На mobile грузится full-res PNG в небольшую секцию.

**Fix:**
- Конвертировать в `.webp` через `cwebp -q 85 main_screen_image.png` (одноразовая команда — должно дать ~60–80% savings).
- Если хочется right way — вытащить background в `<Image>` с `priority` или `<picture>` с `<source type="image/webp">`.

### W3. Bundle analyzer не подключён

**Файлы:**
- `/Users/margolinilya/studio/pnhd-studio/next.config.mjs`
- `/Users/margolinilya/studio/pnhd-studio/package.json`

В deps нет `@next/bundle-analyzer`. Невозможно понять, что именно сидит в `7665-*.js` (122 KB) и `b536a0f1.*.js` (172 KB). Подозреваю Three.js + react-three/fiber + drei.

**Fix (временный, для разовой проверки):**
```bash
npm install --save-dev @next/bundle-analyzer
```
В `next.config.mjs`:
```js
import bundleAnalyzer from '@next/bundle-analyzer';
const withBundleAnalyzer = bundleAnalyzer({ enabled: process.env.ANALYZE === 'true' });
export default withPayload(withBundleAnalyzer(withSentryConfig(nextConfig, ...)));
```
Запустить `ANALYZE=true npm run build` → откроется `.next/analyze/client.html` с интерактивным treemap. Использовать для финального triage'а.

### W4. MUI top-level destructured import в `dtf-calculator.tsx`

**Файл:** `/Users/margolinilya/studio/pnhd-studio/src/components/pages-components/method-page/dtf-calculator/dtf-calculator.tsx:4-5`

```ts
import { Box } from "@mui/material";
import { TextField } from "@mui/material";
```

Все остальные 4 файла используют правильный deep-path (`@mui/material/TextField`). В Next.js 14 + Webpack 5 tree-shake обычно справляется с top-level — но deep-path надёжнее и совместим с `transpilePackages`. Это редко-используемый калькулятор (одна страница метода печати), поэтому low-impact.

**Fix:**
```ts
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
```

### W5. Console errors (Best Practices 73 везде)

В каждом Lighthouse прогоне 3 ошибки:
1. `cllctr.roistat.com/counter.js` — ERR_CONNECTION_CLOSED. Roistat counter падает (404/connection). Если Roistat тут не используется бизнесом, удалить из layout.
2. `/favicon.ico` 404 — нет favicon в public/ или nextjs not serving. Кладёт +1 ошибка.
3. `Uncaught TypeError: Cannot read properties of undefined (reading 'app_key')` в `cs.min.js` (uiscom widget) — config widget'а инициализирован неправильно.

**Fix:** все три — config/cleanup задачи. Не блокеры, но снимают `BP` score с 73 → 95+. Решать совместно с заменой tracking-ID (см. `CLAUDE.md §11`).

### W6. Vercel HTTP→HTTPS redirect стоит ~900 ms на mobile sim

Lighthouse фиксирует ~900 ms `redirects` audit на каждой странице. Это HTTP-to-HTTPS upgrade от Vercel. На реальном пользователе это срабатывает один раз за сессию (после first visit HSTS preload устраняет). Но Lighthouse считает каждый раз.

**Fix:** добавить `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` header в `next.config.mjs`. Vercel также сам ставит этот header при `headers()` config. Сейчас в `next.config.mjs` есть `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `CSP-Report-Only` — но **нет HSTS**. Добавить.

```js
{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' }
```

### W7. Нет `images.formats` в `next.config.mjs`

Дефолт Next.js — `['image/webp']`. AVIF даёт +20–30% savings vs WebP но Next.js по умолчанию не включает (CPU cost на serverless function). Для e-commerce с приоритетом mobile это стоит включить:

```js
images: {
  remotePatterns: [...],
  formats: ['image/avif', 'image/webp'],
},
```

---

## 🟢 NICE-TO-HAVE

### N1. ISR для категорийных страниц

`/blog`, `/blog/[post]`, `/privacy`, `/oferta` имеют `export const revalidate = 60`. Но `/shop`, `/shop/[slug]`, `/futbolki`, `/hudi` и т.д. — нет revalidate, что значит они либо SSG-однажды (а данные товаров устаревают), либо force-dynamic.

**Fix:** добавить `export const revalidate = 300` (5 минут) в shop / category page'ы. Каталог меняется редко, но ISR даст автоматический пересборок при изменениях через admin.

### N2. Three.js dynamic-load — переехать на `IntersectionObserver`

Сейчас Tee на главной mount'ится сразу как компонент в DOM. Заменить на:
```tsx
const [shouldLoadTee, setShouldLoadTee] = useState(false);
useEffect(() => {
  const observer = new IntersectionObserver(([e]) => e.isIntersecting && setShouldLoadTee(true));
  if (ref.current) observer.observe(ref.current);
  return () => observer.disconnect();
}, []);

return <div ref={ref}>{shouldLoadTee ? <TeeClient ... /> : <TeePlaceholder />}</div>;
```
Это даёт `defer` без затрат на лишний библиотечный hook.

### N3. Удалить мёртвый `apiBaseUrl` fallback в product-photos

`product-photos.tsx:36` использует `${apiBaseUrl}${el}` как fallback — `apiBaseUrl = 'https://pnhdstudioapi.ru'` (мёртвый, 502). Каждое 404 от cdn.pnhd.ru вызывает второй failed request. Удалить middle layer.

### N4. Lighthouse в CI

После launch — добавить `lighthouse-ci` на PR-deploys, чтобы регрессии ловились на review. Сейчас вне scope.

### N5. Установить performance budget

После того как home Perf поднимется в зелёную зону — заморозить через budget в `next.config.mjs` или Lighthouse CI:
- LCP < 2.5s
- TBT < 200ms
- CLS < 0.1
- Total transfer < 1.5 MB on mobile

---

## Verification log

| Шаг | Команда / артефакт | Результат |
|---|---|---|
| Lighthouse home mobile | `raw/lighthouse-home-mobile.json` | Perf 27, LCP 20.6s, TBT 24s |
| Lighthouse home desktop | `raw/lighthouse-home-desktop.json` | Perf 39, LCP 4.0s |
| Lighthouse shop mobile | `raw/lighthouse-shop-mobile.json` | Perf 11, CLS **0.71**, footer late-font shift |
| Lighthouse shop desktop | `raw/lighthouse-shop-desktop.json` | Perf 49, CLS **0.68** (same footer issue) |
| Lighthouse product mobile | `raw/lighthouse-shop_futbolka-classic-belaya-man-mobile.json` | Perf 61, LCP 12.9s |
| Lighthouse product desktop | `raw/lighthouse-shop_futbolka-classic-belaya-man-desktop.json` | Perf 79, LCP 2.7s ✅ |
| Top byte-weight на home | `jq .audits["network-requests"]` | `Glitch2.jpg` 6.6 MB + `.hdr` 1.2 MB + `.glb` 1.0 MB + ya-maps 706 KB |
| LCP element home | `lcp-discovery-insight.details.items[1]` | `main-screen_screen_largeBlock` (3D tee container) |
| CLS culprit shop | `cls-culprits-insight.details.items[1]` | `<footer>` shift caused by late `NeueMachina-*.woff` + `druktextwidecyr-medium.woff2` |
| Dynamic import audit | `grep -rn "next/dynamic" src/` | OK для `tee-client.tsx` и `agentation-loader.tsx`. `map-component.tsx` — НЕ dynamic. |
| Dead-imports после удаления конструктора | `grep -rn "konva\|@ffmpeg\|constructor-slice\|printConstructor" src/` | 0 hit ✅ — чисто |
| MUI tree-shake check | `grep -rn "@mui/material" src/` | 6 файлов, 1 файл (`dtf-calculator.tsx`) с top-level destructure |
| `next/font` adoption | `grep -rn "next/font" src/` | Только `Inter` через `next/font/google`. Кастомные шрифты — vanilla `@font-face` |
| Bundle analyzer | `package.json` deps | НЕ установлен — невозможно сделать treemap без подключения |
| ISR config | `grep -rn "export const revalidate" src/app/` | `/blog`, `/blog/[post]`, `/privacy`, `/oferta` = 60s. `/shop*` — нет revalidate |
| Image optimization | `next.config.mjs` `images.formats` | Не задан → дефолт `webp`. AVIF выключен |
| HSTS header | `next.config.mjs` `headers()` | Отсутствует — есть CSP+X-Frame+Permissions, нет Strict-Transport-Security |
| Console errors | `errors-in-console` | 3 errors: Roistat counter ERR_CONNECTION_CLOSED, /favicon.ico 404, uiscom `app_key` undefined |

---

## Suggested fix priority (по убыванию ROI)

1. **B1 — сжать `Glitch2.jpg` до webp 100 KB** (1 команда, -6.5 MB)
2. **B3 — `dynamic()` для `<MapComponent>`** (5 строк, -706 KB main)
3. **W1 — убрать `unoptimized` + добавить `priority` на product LCP image** (10 строк, product mobile LCP 12.9 → ~3s)
4. **B2 — мигрировать кастомные шрифты на `next/font/local`** (30 минут работы, CLS 0.71 → ~0.05)
5. **B1 — оптимизировать `.hdr`+`.glb` или заменить env-map на ambient light** (1–2 часа, -2 MB)
6. **W2 — webp для background-images** (5 минут)
7. **W6 — HSTS header** (1 строчка, -900 ms на cold mobile)
8. **W3 — подключить bundle-analyzer**, сделать treemap, ещё раз пройтись
9. **W7 — `formats: ['avif', 'webp']`** (1 строка)
10. **W5 — починить/удалить uiscom + Roistat counter + favicon** (Best Practices 73 → 95)
