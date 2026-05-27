# Master Plan — Pre-launch для production-свитча

> **Дата плана**: 2026-05-28
> **Цель**: production-свитч `studio.pnhd.ru` на этот код через 2-4 недели
> **Источники**: [frontend-аудит](2026-05-28-frontend.md), [SEO-аудит](2026-05-28-seo-prelaunch.md), [user-flow-аудит](2026-05-28-user-flow.md), [security-аудит](2026-05-28-security.md)
> **Решения владельца**: см. секцию «Зафиксированные решения» ниже

---

## Executive Summary

Проект — **не "клон, который надо доделать"**, а зрелый Next.js + Supabase + Vercel e-commerce с работающей админкой, импортированным каталогом (25 SKU), Edge Functions с rate-limit, listener-middleware'ами и тройной защитой admin'а. **Архитектурно — готов.**

Что мешает свитчу через 2-4 недели — **сумма мелких пробоин в трёх плоскостях**:

1. **Воронка прорезана в трёх местах**: `/howto` обещает удалённый 3D-конструктор → `/cart` имеет нерабочую кнопку «Изменить размер» → `/checkout` встречает demo-alert. Любого пользователя теряем в одной из этих точек.
2. **SEO-каркас сломан**: статический stale `sitemap.xml` от 2024, `robots.txt` блокирует весь блог, нет H1 на главной, нет Product JSON-LD на 25 SKU, нет redirect-карты со старого sitemap (90 URL).
3. **Security**: rate-limit обходится X-Forwarded-For за 5 минут, public bucket `user-uploads` разрешает листинг (анон может выгрузить реестр клиентских макетов), хранение ПДн в Supabase EU — **прямое нарушение 152-ФЗ** (1-6 млн ₽ штраф за первое нарушение).

**Хорошие новости**: всё это — **короткие фиксы**. По моей оценке — **20-26 часов работы** на одного разработчика для закрытия P0+P1. С запасом укладываемся в 2-4 недели.

**Из них критический спринт 0** (5-6 часов): закрывает 4 эксплуатируемые уязвимости + сломанный canonical + Agentation в продакшене. **После него production уже не уязвим к exploit'ам с улицы**, можно дальше работать без спешки.

---

## Зафиксированные решения владельца (2026-05-28)

| # | Вопрос | Решение |
|---|---|---|
| 1 | 152-ФЗ архитектура | **Вариант B**: лиды → Bitrix24 напрямую через Edge Function, без записи в `public.leads`. Supabase Storage для файлов принтов **остаётся** (не ПДн). |
| 2 | Bitrix24 webhook URL | Владелец возьмёт сам и выставит в Supabase secret `BITRIX_WEBHOOK_URL`. |
| 3 | Уведомление Роскомнадзора | ✅ Уже сделано. |
| 4 | /checkout стратегия | **Вариант B**: упростить до лид-формы (имя/тел/город/комментарий) на отдельной странице, без CDEK API. |
| 5 | 2D-превью принта | **Качественное решение**, 1-2 дня (не CSS-MVP overlay). |
| 6 | B2B (`/optom`) | **Отложили** на после релиза. Header-ссылка «оптовый отдел» остаётся на `pnhd.ru`. |
| 7 | /loyalty | **Оставляем как есть**, интеграция с Teyca — отдельным треком после релиза. |
| 8 | Файлы принтов в Bitrix24 | Ссылки на Supabase Storage в payload лида (не attachments). |
| 9 | Sentry | **Free tier** (5k events/мес), подключаем до релиза. |
| 10 | Яндекс SmartCaptcha | **Приняли риск спама**. Добавляем реактивно, если случится. |
| 11 | GitHub Actions CI | **Базовый** (build + typecheck на PR), без branch protection. |

### Принятые риски (документируем явно)

- ⚠️ **Spam-риск без CAPTCHA**: после фикса S1 (X-Forwarded-For) лимит 3/мин с уникального IP. Ботнет из 50 IP может слать 9000 заявок/час в Bitrix24. Реактивно подключим SmartCaptcha если случится.
- ⚠️ **Прямой push в main**: CI не блокирует main-ветку, владелец пушит напрямую. Один кривой commit → Vercel auto-deploy в production за 1 минуту. Митигация — `npm run build` перед каждым push.

---

## 21 P0 + 51 P1 находок: сводка по аудитам

| Аудит | P0 | P1 | P2 | Health Index |
|---|---:|---:|---:|---:|
| Frontend | 4 | 14 | 17 | — |
| SEO | 8 | 16+ | — | **47/100 — Poor** |
| User Flow | 9 | 19 | 8+ | **54/100 — Below average** |
| Security | 5 | 16 | 10 | **30/100 — Below average for pre-prod** |
| **Всего** | **26** | **65+** | **35+** | — |

После выполнения всех PR ниже — **Health Indexes реалистично поднимаются до 75-80**.

---

## Разбивка по 6 PR

PR'ы пронумерованы по порядку выполнения. Зелёным выделены те, которые **снимают эксплуатируемые уязвимости** — их делаем первыми.

| PR | Название | Время | Что закрывает | Приоритет |
|---|---|---|---|---|
| **#1** | 🔥 Critical security hotfix | 2-3 ч | S1, S2, S3, S5, S16, frontend P0 #1 (Agentation) | **P0 — день 1** |
| **#2** | 🛠 152-ФЗ migration: Bitrix24-only flow | 4-6 ч | S4, удаление `leads` table из `create-lead` | **P0 — день 1-2** |
| **#3** | 🌐 SEO foundation | 6-8 ч | SEO P0 #1-#8 + frontend P0 #2-#4 | **P0 — день 3-4** |
| **#4** | 🎯 Funnel critical fixes | 6-8 ч | User Flow U1, U2, U3, U6, U7, U16, U24 | **P0 — день 5-6** |
| **#5** | ⭐ Main feature: 2D preview + UX polish | 12-16 ч | User Flow U8, U10, U12, U19 + frontend P1 cluster | **P1 — неделя 2** |
| **#6** | 📊 Observability + CI + final polish | 8-10 ч | Sentry, CI, security headers full, P1 cleanup | **P1 — неделя 2-3** |

**Итого работы**: ~40-50 часов разработки + время на код-ревью / тестирование.

---

## PR #1 — 🔥 Critical security hotfix

**Время**: 2-3 часа
**Когда**: первый день работы
**Почему первый**: после merge — production уже **не уязвим** к exploit'ам с улицы. Можно дальше работать без спешки.

### Что входит

#### 1.1. Frontend P0 #1: убрать Agentation из public layout

**Файл**: `src/app/layout.tsx:113`
**Эффект**: −417 KB JS-чанка на каждой публичной странице, +значимый прирост LCP.

```tsx
// src/app/layout.tsx
{process.env.NODE_ENV !== 'production' && <Agentation />}
```

#### 1.2. Security S1: rate-limit XFF bypass

**Файл**: `supabase/functions/create-lead/index.ts:114-120`
**Эксплойт сейчас**: `curl -X POST … -H "X-Forwarded-For: $RANDOM.$RANDOM.$RANDOM.$RANDOM"` обходит rate-limit за 5 минут.

**Что сделать**:
- Использовать `req.headers.get('cf-connecting-ip')` или Supabase-провайдерский header (нужно проверить через `console.log` все headers в Edge Function один раз)
- Если Supabase Edge Functions проксирует Deno, может быть `req.headers.get('x-real-ip')` от Supabase gateway
- Fallback на `X-Forwarded-For` только из allowlist'а доверенных IP'шников (Vercel + Supabase ranges)

**Verify**: после фикса прогнать curl с разными X-Forwarded-For — rate-limit должен срабатывать.

#### 1.3. Security S2: drop public listing на user-uploads bucket

**Файл**: новая миграция `supabase/migrations/20260528000001_user_uploads_no_listing.sql`
**Эксплойт сейчас**: `curl https://<supabase>/storage/v1/object/list/user-uploads` возвращает массив всех клиентских принтов.

```sql
-- Drop SELECT (listing) policy for anon on user-uploads
drop policy if exists "anon_can_list_user_uploads" on storage.objects;

-- Anon оставляем только INSERT под prints/ префиксом + чтение конкретного объекта по path
create policy "anon_can_read_specific" on storage.objects
  for select to anon
  using (bucket_id = 'user-uploads' and name like 'prints/%');
-- Read-by-path работает; listing /list endpoint больше не вернёт массив
```

**Verify**: после миграции `curl .../object/list/user-uploads` → пустой массив или 403.

#### 1.4. Security S3: regex sanitizer fix

**Файл**: `supabase/functions/create-lead/index.ts:91-98`
**Что сейчас сломано**: regex `replace(/[…\n…/g, …)` имеет literal newline в character class, charset не закрывается → матчит непредсказуемо. Защита фиктивна.

**Что сделать**: переписать через explicit hex codes:
```ts
.replace(/[\u0000-\u001F\u007F]/g, ' ')  // control chars
.trim()
.slice(0, MAX_LEN);
```

#### 1.5. Security S5: добавить security headers

**Файл**: `next.config.mjs`
**Эксплойт сейчас**: на /admin/login можно сделать clickjacking через iframe.

```js
async headers() {
  return [
    {
      source: '/:path*',
      headers: [
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
        // CSP — добавим в PR #6 в Report-Only режиме (нужны Roistat/Metrica/uiscom whitelist'ы)
      ],
    },
  ];
}
```

#### 1.6. Security S16: убрать X-Powered-By

**Файл**: `next.config.mjs`
```js
poweredByHeader: false,
```

### Acceptance criteria

- [ ] Build проходит без warnings
- [ ] `curl -I https://<preview>.vercel.app/` показывает X-Frame-Options, X-Content-Type-Options, Referrer-Policy
- [ ] `curl -I` не показывает X-Powered-By
- [ ] Production curl: тест с подменой X-Forwarded-For не обходит rate-limit
- [ ] `curl .../storage/v1/object/list/user-uploads` не возвращает массив файлов
- [ ] Agentation toolbar не появляется в production-сборке (`NEXT_PUBLIC_VERCEL_ENV=production`)

---

## PR #2 — 🛠 152-ФЗ migration: Bitrix24-only flow

**Время**: 4-6 часов
**Когда**: после PR #1
**Почему**: закрывает прямое нарушение закона. Штраф 1-6 млн ₽ за первое нарушение.

### Что меняется в архитектуре

**Было**:
```
LeadForm → create-lead Edge Function → INSERT public.leads (EU!)
                                    → POST Bitrix24 webhook
                                    → Telegram notification
```

**Станет**:
```
LeadForm → create-lead Edge Function → POST Bitrix24 webhook (RU юрисдикция)
                                    → Telegram notification
                                    → НЕ INSERT в public.leads
```

ip_hash, user-agent, validation остаются в логах Edge Function (Supabase logs, 1 час retention) — это не нарушение, т.к. логи не структурированное хранение ПДн.

### Что входит

#### 2.1. Bitrix24 webhook готовность

**Не код**: владелец заходит в Bitrix24 → Приложения → Разработчикам → Другое → Входящий вебхук → выдать права `crm` → копировать URL вида `https://<portal>.bitrix24.ru/rest/<user>/<token>/`.

Затем в Supabase Dashboard → Edge Functions → Secrets:
```
BITRIX_WEBHOOK_URL=https://<portal>.bitrix24.ru/rest/<user>/<token>/
```

#### 2.2. Edge Function `create-lead` — удалить INSERT в leads

**Файл**: `supabase/functions/create-lead/index.ts`

Удалить весь блок, который делает `supabase.from('leads').insert(...)`. Оставить:
- валидацию (length, regex, source whitelist)
- rate-limit (но без записи — через in-memory или KV, или Bitrix24 query)
- POST в Bitrix24
- Telegram notification

**Внимание про rate-limit**: сейчас он использует `SELECT COUNT(*) FROM leads WHERE ip_hash=$1 AND created_at > now() - 60s`. После удаления записи в leads — нужна альтернатива:

**Вариант A (рекомендую)**: использовать Supabase KV (Edge Function поддерживает Deno KV). Хранить `ip_hash → count` с TTL 60 сек.

**Вариант B**: сохранять только `ip_hash + created_at` в отдельной таблице `rate_limit_log`. Не ПДн (хэш + timestamp), не нарушает 152-ФЗ. Авто-удаление через pg_cron каждые 5 минут.

Я бы взял **Вариант A** — проще и без новой таблицы.

#### 2.3. Файлы принтов как ссылки в Bitrix24 payload

**Файл**: `supabase/functions/create-lead/index.ts`

В payload, который идёт в Bitrix24, добавить поле:
```ts
{
  TITLE: `Заявка с ${source}`,
  NAME: name,
  PHONE: [{ VALUE: phone, VALUE_TYPE: 'WORK' }],
  EMAIL: email ? [{ VALUE: email, VALUE_TYPE: 'WORK' }] : undefined,
  COMMENTS: [
    comment,
    '',
    'Файлы принтов:',
    ...(attachments ?? []).map(a => `${a.side}: ${a.url}`),
  ].join('\n'),
  UF_CRM_REFERENCE: reference_url,
  UF_CRM_ROISTAT: roistat_visit,
}
```

Где `attachments` приходят в payload фронта из cart items.

#### 2.4. Frontend: расширить LeadForm payload

**Файлы**:
- `src/api/api.ts` — `createLead` mutation
- `src/components/shared-components/lead-form/lead-form.tsx`
- `src/components/pages-components/noModelBlock/NoModelBlockForm.tsx`

Добавить optional `attachments?: Array<{side: string; url: string}>` в payload. Заполняется только из cart-связанных форм (popup в /cart, /checkout). На главной footer-форме — undefined.

#### 2.5. Миграция: удалить public.leads (опционально)

**Файл**: `supabase/migrations/20260528000002_drop_leads_table.sql`

```sql
-- Backup перед удалением (на случай если кто-то захочет восстановить)
-- Сначала экспорт через pg_dump или Supabase Dashboard → Table Editor → Export

drop table if exists public.leads cascade;
-- pg_cron job cleanup-old-leads тоже удалить
select cron.unschedule('cleanup-old-leads');
```

**ВАЖНО**: только после того как Bitrix24 интеграция отработала **хотя бы 24 часа на production** и владелец убедился что лиды доходят. Иначе можем потерять заявки в transition'е.

Рекомендую: **в PR #2 НЕ удалять table**. Просто перестать в неё писать. Удалить через 2 недели после релиза.

#### 2.6. Обновить /privacy

**Файл**: `src/app/privacy/page.tsx`

Убрать упоминания «храним в Supabase», заменить на «передаём в систему управления отношениями с клиентами Bitrix24, хранилище на территории РФ».

### Acceptance criteria

- [ ] Edge Function `create-lead` не пишет в `public.leads`
- [ ] Лид приходит в Bitrix24 (проверить через тестовую заявку)
- [ ] Файлы принтов из корзины оказываются в комментарии Bitrix24-лида как ссылки
- [ ] Rate-limit работает через KV/альтернативный механизм
- [ ] `/privacy` обновлён
- [ ] **`public.leads` НЕ удалена** в этом PR (страховка на 2 недели)

---

## PR #3 — 🌐 SEO foundation

**Время**: 6-8 часов
**Когда**: после PR #2
**Почему**: после свитча DNS Яндекс/Google переиндексируют сайт. Без этих фиксов — потеря трафика на 30-50% в первый месяц.

### Что входит

#### 3.1. Dynamic sitemap.ts из Supabase

**Файлы**:
- Удалить `src/app/sitemap.xml`
- Создать `src/app/sitemap.ts`

См. подробный код в SEO-аудите P0 #1 (стр. 132-173).

#### 3.2. Dynamic robots.ts

**Файлы**:
- Удалить `src/app/robots.txt`
- Создать `src/app/robots.ts`

Disallow: `/admin/`, `/api/`, `/_next/`, `/cart`, `/checkout`, `/thanks`, `/*?id=`, `/*?utm_`.

#### 3.3. H1 на главной

**Файл**: `src/components/pages-components/main-page/main-screen/main-screen.tsx:111`

Раскомментировать H1, оставить SVG как декоративный с `aria-hidden`. Опционально — добавить visually-hidden второй H1 с релевантным текстом «Печать на одежде в Санкт-Петербурге — Pinhead Studio».

#### 3.4. Product JSON-LD на /shop/[slug]

**Файл**: `src/app/shop/[slug]/page.tsx`

См. подробный код в SEO-аудите P0 #4 (стр. 276-317). Добавить Product + Offer + BreadcrumbList.

#### 3.5. Article JSON-LD + полная metadata на /blog/[post]

**Файл**: `src/app/blog/[post]/page.tsx`

См. подробный код в SEO-аудите P0 #5 (стр. 333-379).

#### 3.6. Redirect-карта в next.config.mjs

**Файл**: `next.config.mjs`

Добавить redirects из SEO-аудита (стр. 549-576). 25+ маппингов: `/pechat-na-futbolkah → /futbolki`, `/store → /shop`, `/*/constructor → /shop/[slug]`, etc.

Также — убрать **дубликат** правила `/.well-known/apple-app-site-association` (Frontend P0 #8).

#### 3.7. Canonical через headers().get('x-pathname')

**Файлы**:
- `src/app/layout.tsx`
- `src/app/utils/constants.ts` — удалить `getCurrentPath()`

```tsx
// src/app/layout.tsx
import { headers } from 'next/headers';

export async function generateMetadata(): Promise<Metadata> {
  const pathname = headers().get('x-pathname') ?? '/';
  return {
    verification: { yandex: '35381404e7bfd3a4' },
    metadataBase: new URL(SITE_INFO.domain),
    alternates: { canonical: pathname },
  };
}
```

#### 3.8. metadataBase на 18 страницах

**Файлы**: все `src/app/**/page.tsx` без metadataBase.

Создать helper `src/app/_lib/build-metadata.ts`:
```ts
export function buildMetadata(params: {
  title: string;
  description: string;
  path: string;
  image?: string;
}): Metadata {
  const url = SITE_INFO.domain + params.path;
  return {
    title: params.title,
    description: params.description,
    metadataBase: new URL(SITE_INFO.domain),
    alternates: { canonical: params.path },
    openGraph: {
      title: params.title,
      description: params.description,
      url,
      siteName: 'PINHEAD STUDIO',
      type: 'website',
      images: params.image ? [{ url: params.image, width: 1200, height: 630 }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: params.title,
      description: params.description,
      images: params.image ? [params.image] : undefined,
    },
  };
}
```

Применить во всех страницах без metadataBase.

#### 3.9. Image URL fix в ProductCardsBlock

**Файл**: `src/components/pages-components/shop-page/product-cards-block/product-cards-block.tsx:41`

```tsx
// Было:
const url = item?.image_url ? `${apiBaseUrl}${item.image_url}` : '';
// Стало:
const url = item?.image_url ?? '';
```

#### 3.10. LocalBusiness на /contacts

**Файл**: `src/app/contacts/page.tsx`

Заменить `Organization` на `LocalBusiness` schema с координатами офиса. Починить postal code (`197022`, не `194044`).

### Acceptance criteria

- [ ] `next build` без warnings про metadataBase
- [ ] `curl https://<preview>/sitemap.xml` возвращает актуальный XML со всеми текущими URL
- [ ] `curl https://<preview>/robots.txt` блокирует `/admin/*`, разрешает `/blog/`
- [ ] Главная имеет ровно 1 `<h1>` в HTML
- [ ] Validator schema.org: Product+Offer на любом /shop/[slug] проходит
- [ ] Validator schema.org: BlogPosting на любом /blog/[post] проходит
- [ ] Все ключевые URL имеют корректный `<link rel="canonical">` через view-source
- [ ] OG-image на каждой странице резолвится в `https://studio.pnhd.ru/...` (не localhost)

---

## PR #4 — 🎯 Funnel critical fixes

**Время**: 6-8 часов
**Когда**: после PR #3
**Почему**: закрывает 3 точки дропа в воронке. Без этого — пользователь не дойдёт до Bitrix24.

### Что входит

#### 4.1. /howto переписать

**Файл**: `src/app/howto/page.tsx`

Удалить весь контент про 3D-конструктор. Переписать под новый flow:
1. Выбери одежду из каталога
2. Выбери размер
3. Выбери расположение принта (на груди / спине / рукаве)
4. Загрузи свой PNG/JPG
5. Оформи заявку
6. Менеджер свяжется в течение 30 минут, согласуете макет

#### 4.2. /cart кнопка «Изменить размер»

**Файл**: `src/components/pages-components/cart-page/product-description/product-description.tsx:32`

Простейшее решение: убрать `onClick={() => {}}` и сделать `<Link href="/shop/${slug}">`. Возврат на product page с возможностью пересохранить.

Опционально (P1, отложить): inline-drawer с SizeGrid внутри /cart. Сложнее, не блокер.

#### 4.3. /checkout → лид-форма (Вариант B)

**Файлы**:
- `src/app/checkout/page.tsx` или `checkoutClient.tsx`

Заменить весь сложный checkout-flow на простую форму:
```tsx
// Шапка
<h1>Оформление заявки</h1>

// Сводка корзины (что заказывают)
<OrderSummary items={cartItems} />

// Форма
<form>
  <TextField name="name" required label="Имя" />
  <MuiTelInput name="phone" required label="Телефон" />
  <TextField name="city" required label="Город доставки" />
  <TextField name="email" type="email" label="Email (опц.)" />
  <TextField name="comment" multiline rows={3} label="Комментарий" />
  <Checkbox required label="Согласен с политикой обработки ПДн" />
  <Button type="submit">Оформить заявку</Button>
</form>

// Подсказка
«Менеджер свяжется в течение 30 минут для согласования макета и доставки»
```

Submit → `createLead` mutation с `source: 'checkout'`, attachments из cart items → редирект на /thanks.

Добавить `'checkout'` в enum `LeadSource` в `src/api/api.ts` и в Edge Function `ALLOWED_SOURCES`.

#### 4.4. /thanks страница улучшить

**Файл**: `src/app/thanks/page.tsx`

Добавить понятный текст: «Заявка отправлена. Менеджер свяжется с вами в течение 30 минут на номер `<phone>` для согласования макета и условий доставки.»

#### 4.5. U6: H1 + понятный заголовок на главной

Покрыто PR #3 #3.3.

#### 4.6. U7: Header «Сделать заказ» → внутренний popup

**Файл**: `src/components/shared-components/header/header.tsx:40`

Заменить ссылку на `t.me/pnhd_studio` на `<LeadButton>` с popup-формой. Telegram-ссылка остаётся в footer + в /contacts.

#### 4.7. U16: cart link query={id} убрать

**Файл**: `src/components/pages-components/cart-page/product-description/product-description.tsx:17-25`

Убрать `?id=${elem.item._id}` из href — для импортированных товаров `_id` undefined.

#### 4.8. U24: feedback внешние ссылки rel="noopener"

**Файл**: `src/components/pages-components/main-page/feedback-screen/feedback-block.tsx:60-65`

Добавить `rel="noopener"` на ссылки на Yandex/Google отзывы.

### Acceptance criteria

- [ ] /howto не упоминает 3D-конструктор
- [ ] /cart кнопка «Изменить размер» работает (хотя бы ведёт на /shop/[slug])
- [ ] /checkout — это работающая форма, отправляет в Bitrix24
- [ ] /thanks показывает понятный текст
- [ ] Header «Сделать заказ» открывает popup, не Telegram
- [ ] `getCurrentPath` не используется (заменено через PR #3)
- [ ] cart link без `?id=undefined`

---

## PR #5 — ⭐ Main feature: 2D preview + UX polish

**Время**: 12-16 часов (1.5-2 дня)
**Когда**: после PR #4
**Почему**: ключевая ценностная фича твоего проекта. Главная обещает «напечатаем для тебя» — product page должен показывать **как это будет выглядеть**.

### Что входит

#### 5.1. 2D-превью принта на одежде (качественное решение)

**Файлы**:
- `src/components/pages-components/shop-page/product-info/upload-slot.tsx`
- `src/components/pages-components/shop-page/product-info/print-preview.tsx` (новый)
- `src/components/pages-components/shop-page/product-photos/product-photos.tsx`

**Подход (качественный, 1-2 дня)**:

1. **Маппинг "side → relative position"** для каждого типа одежды. В `src/components/pages-components/shop-page/product-info/print-config.ts` добавить:
```ts
export const PRINT_POSITIONS: Record<string, Record<TPrintSide, {top, left, width}>> = {
  tshirt: {
    front: { top: '35%', left: '37%', width: '26%' },
    back: { top: '30%', left: '37%', width: '26%' },
    sleeve: { top: '38%', left: '7%', width: '15%' },
  },
  hoodie: { /* свои координаты */ },
  // ...
};
```

2. **`PrintPreview` компонент** — рендерит товар-фото + наложенный принт:
```tsx
<div style={{ position: 'relative' }}>
  <Image src={productPhoto} ... />
  {printConfig.location !== 'none' && Object.entries(printConfig.files).map(([side, file]) => file && (
    <div
      key={side}
      style={{
        position: 'absolute',
        ...PRINT_POSITIONS[productType][side as TPrintSide],
      }}
    >
      <img src={file.url} alt="Превью принта" style={{ width: '100%', mixBlendMode: 'multiply', opacity: 0.92 }} />
    </div>
  ))}
</div>
```

3. **Подсказка под превью**: «Это примерное расположение. Финальный масштаб и позиционирование согласуются с дизайнером перед печатью.»

4. **Toggle "С принтом / Без принта"** под превью — для пользователя, который хочет посмотреть, как выглядит одежда без его макета.

5. **Применить в /cart**: тот же `PrintPreview` рендерится в product-description.tsx — пользователь видит финальный вид заказа.

#### 5.2. U10: Цена принта на product page

**Файл**: `src/components/pages-components/shop-page/product-info/product-info.tsx`

Добавить мини-таблицу прайса рядом с upload-slot:
```tsx
<details>
  <summary>Стоимость принта</summary>
  <table>
    <thead><tr><th>Формат</th><th>DTG</th><th>DTF</th></tr></thead>
    <tbody>
      <tr><td>А6 (5×7)</td><td>400 ₽</td><td>500 ₽</td></tr>
      <tr><td>А5 (10×15)</td><td>500 ₽</td><td>650 ₽</td></tr>
      <tr><td>А4 (15×21)</td><td>650 ₽</td><td>800 ₽</td></tr>
      <tr><td>А3 (30×40)</td><td>800 ₽</td><td>900 ₽</td></tr>
      <tr><td>А3+ (33×48)</td><td>900 ₽</td><td>1100 ₽</td></tr>
    </tbody>
  </table>
  <small>Окончательную цену рассчитает менеджер по вашему макету.</small>
</details>
```

#### 5.3. U12: Иконки силуэтов одежды для чипов

**Файл**: `src/components/pages-components/shop-page/product-info/print-selector.tsx`

5 SVG-иконок (футболка): без принта, с подсветкой груди, спины, рукава, обеих сторон. Можно использовать одну SVG-силуэт с разными `<g>` слоями подсветки.

Альтернатива (быстрее): использовать существующее product-фото в миниатюре + CSS-зону подсветки (`box-shadow inset`).

#### 5.4. U13: «Без принта» в конец списка

**Файл**: `src/components/pages-components/shop-page/product-info/print-config.ts:3-9`

Переставить `'none'` в конец массива `PRINT_OPTIONS`.

#### 5.5. U19: Progress bar в upload-slot

**Файлы**:
- `src/lib/storage/upload-print.ts` — заменить `supabase.storage.upload()` на XHR с onProgress
- `src/components/pages-components/shop-page/product-info/upload-slot.tsx` — добавить state и MUI LinearProgress

```tsx
const xhr = new XMLHttpRequest();
xhr.upload.onprogress = (e) => {
  if (e.lengthComputable) {
    setProgress(Math.round(100 * e.loaded / e.total));
  }
};
xhr.open('POST', uploadUrl);
xhr.setRequestHeader('Authorization', `Bearer ${anonKey}`);
xhr.send(file);
```

#### 5.6. U14: «Гид по размерам» inline-модалка

**Файл**: `src/components/pages-components/shop-page/product-info/product-info.tsx:108-110`

Заменить `target="_blank"` на MUI Dialog с содержимым /size_chart.

#### 5.7. Frontend P1 #6 + #10: ProductCardsBlock observer + memo

**Файлы**:
- `src/components/pages-components/shop-page/product-cards-block/product-cards-block.tsx` — `OBSERVER_OPTIONS` в module-level const
- `src/components/pages-components/shop-page/product-card/product-card.tsx` — обернуть в `React.memo`

#### 5.8. Frontend P1 #5: dynamic-load Tiptap

**Файл**: `src/app/admin/(authed)/blog/BlogForm.tsx`

```tsx
import dynamic from 'next/dynamic';
const TiptapEditor = dynamic(() => import('./TiptapEditor').then(m => m.TiptapEditor), {
  ssr: false,
  loading: () => <div>Загрузка редактора…</div>,
});
```

#### 5.9. Frontend P1 #11-12: `<img>` → next/image

**Файлы**:
- `src/app/blog/[post]/page.tsx:54` и `src/app/blog/page.tsx:78`
- `src/components/pages-components/method-page/advantages/advantages.tsx:7,12,17`

### Acceptance criteria

- [ ] На /shop/[slug] после загрузки PNG появляется превью принта поверх товар-фото
- [ ] В /cart превью с принтом сохраняется
- [ ] Цена принта видна на product page (как мини-таблица или accordion)
- [ ] 5 чипов имеют визуальные иконки/подсветки зоны
- [ ] Upload показывает progress bar
- [ ] Гид по размерам открывается в модалке, не новой вкладке
- [ ] Tiptap не блокирует First Load на /admin/blog/[slug]

---

## PR #6 — 📊 Observability + CI + final polish

**Время**: 8-10 часов
**Когда**: финальный спринт перед свитчем
**Почему**: даёт видимость на момент cutover + блокирует кривые коммиты.

### Что входит

#### 6.1. Sentry установка

**Установка**:
```bash
npx @sentry/wizard@latest -i nextjs
```

Wizard сам спросит DSN, настроит next.config.mjs, добавит `sentry.client.config.ts` и `sentry.server.config.ts`.

**Что инструментировать дополнительно**:
- Edge Functions — `Sentry.init` в начале `index.ts` (есть `@sentry/deno`)
- Server Actions — оборачиваем критические в try/catch с `Sentry.captureException`

**Env** в Vercel:
```
SENTRY_DSN=<from sentry.io>
NEXT_PUBLIC_SENTRY_DSN=<same>
SENTRY_ORG=<your-org>
SENTRY_PROJECT=<your-project>
SENTRY_AUTH_TOKEN=<for source maps upload>
```

#### 6.2. GitHub Actions CI

**Файл**: `.github/workflows/ci.yml`

```yaml
name: CI
on: [pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npx tsc --noEmit  # typecheck
      - run: npm run lint
      - run: npm run build
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
```

В GitHub → Settings → Secrets → добавить три ключа.

**Branch protection не настраиваем** (по решению владельца).

#### 6.3. Security P1: ip_hash с солью

**Файл**: `supabase/functions/create-lead/index.ts`

Добавить env `IP_HASH_SALT` (random hex-32) в Supabase secrets. Использовать `sha256(ip + salt)` вместо `sha256(ip)`.

#### 6.4. Security P1: timing-safe cleanup secret compare

**Файл**: `supabase/functions/cleanup-user-uploads/index.ts:27`

```ts
import { timingSafeEqual } from 'jsr:@std/crypto/timing-safe-equal';
// Заменить !== на timingSafeEqual(...)
```

#### 6.5. Security P1: hardening upload-image.ts

**Файл**: `src/app/admin/_lib/upload-image.ts`

- Добавить magic-bytes проверку через `file-type` или `sharp().metadata()`
- Pre-size-check до `file.arrayBuffer()` (избегаем OOM)
- Runtime валидация `bucket` параметра (zod)

#### 6.6. Security P1: uploadPrintFile magic-byte check

**Файл**: `src/lib/storage/upload-print.ts`

Аналогично — magic-bytes валидация на server-side (Edge Function или Server Action).

#### 6.7. Security P1: Leaked Password Protection включить

Supabase Dashboard → Authentication → Settings → включить "Leaked Password Protection".

#### 6.8. Security P1: revoke execute is_admin от anon

**Файл**: новая миграция `supabase/migrations/20260528000003_revoke_is_admin_anon.sql`

```sql
revoke execute on function public.is_admin() from anon;
revoke execute on function public.is_admin() from authenticated;
-- Оставить только service_role (используется в Server Actions)
```

#### 6.9. Security P1: zod на updateLeadStatus

**Файл**: `src/app/admin/(authed)/leads/actions.ts:11`

```ts
const StatusSchema = z.enum(['new', 'contacted', 'done', 'spam']);
const validatedStatus = StatusSchema.parse(status);
```

#### 6.10. Security P1: убрать pnhdstudioapi.ru из image whitelist

**Файл**: `next.config.mjs:26-29`

Удалить домен из `remotePatterns`. Если используется где-то в `<Image src>` — заменить на placeholder или Supabase URL.

#### 6.11. CSP в Report-Only режиме

**Файл**: `next.config.mjs` headers()

```js
{
  key: 'Content-Security-Policy-Report-Only',
  value: [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cloud.roistat.com https://mc.yandex.ru https://cdn.uiscom.ru https://browser.sentry-cdn.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https://cdn.pnhd.ru https://*.supabase.co https://mc.yandex.ru",
    "connect-src 'self' https://*.supabase.co https://mc.yandex.ru https://sentry.io",
    "frame-ancestors 'none'",
  ].join('; '),
}
```

CSP в Report-Only собирает violations без блокирования. Через 1-2 недели — переключим в enforce.

#### 6.12. P1 cleanup из User Flow

- U13: «Без принта» в конец чипов
- U18: footer LeadForm — добавить optional textarea «Комментарий»
- U22: header «студия 11-20 · заявки 24/7»
- U25: feedback-block key={index} → key={item.id}
- U27: visual breadcrumb на /methods/[slug]/[type]
- U28: footer-form CTA текст «Рассчитаем стоимость» вместо «Консультация»
- U30: блог в header + footer
- U32: alt-tag «ГОЙДА» → «Россия»

#### 6.13. Удалить orphan-файлы и мёртвые экспорты

- `src/app/utils/server-actions.ts` (orphan)
- `ruPrintLocation()` из cart-utils
- `getShopData`, `getPosts` из constants.ts
- `@mui/x-data-grid` из package.json (не используется)
- `agentation` package
- 13 MB мёртвых GLB файлов из `public/` (после батча 2026-05-27)

### Acceptance criteria

- [ ] Sentry получает test error из production деплоя
- [ ] GitHub Actions проходит на test PR
- [ ] Leaked Password Protection в Supabase Dashboard включён
- [ ] CSP-Report-Only header виден в `curl -I`
- [ ] `public/` не содержит мёртвых .glb (кроме `shirt_baked_collapsed.glb`)
- [ ] `npm run build` стал на ~13 МБ легче

---

## Pre-launch checklist (day -1 до cutover)

Прохожу глазами каждый пункт прежде чем переключать DNS.

### Код merged в main
- [ ] PR #1 (security hotfix) merged + production deployed
- [ ] PR #2 (152-ФЗ migration) merged + Bitrix24 testing prowed (минимум 24ч)
- [ ] PR #3 (SEO foundation) merged
- [ ] PR #4 (funnel fixes) merged
- [ ] PR #5 (main feature) merged
- [ ] PR #6 (observability + CI) merged

### Supabase
- [ ] Все миграции применены (включая 20260528000001, 20260528000002 если не отложена, 20260528000003)
- [ ] `BITRIX_WEBHOOK_URL` выставлен в secrets
- [ ] `IP_HASH_SALT` выставлен в secrets
- [ ] `CLEANUP_SECRET` rotated если был старый
- [ ] Leaked Password Protection включён
- [ ] Бэкап БД сделан (Supabase Dashboard → Settings → Database → Backups → "Take a snapshot")

### Vercel
- [ ] `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SENTRY_DSN` — все в production env
- [ ] Production deploy зелёный
- [ ] `next build` без warnings

### Tracking IDs (твоя задача)
- [ ] Yandex Metrica counter заменён на твой в `src/app/layout.tsx:76+`
- [ ] Roistat ID заменён на твой
- [ ] uiscom ID заменён на твой (или удалить если не используешь)
- [ ] Yandex Webmaster: новый сайт зарегистрирован, верификация подтверждена
- [ ] Google Search Console: то же
- [ ] Yandex Webmaster: указан регион "Санкт-Петербург"

### Smoke tests (вручную в incognito)
- [ ] Главная: H1 видимый или скринридер-доступный, hero загружается без FOUC
- [ ] /shop: 25 SKU видны, фильтры работают
- [ ] /shop/<любой-slug>: загрузка PNG → превью на одежде появляется
- [ ] /cart: товары с принтом отображаются с превью
- [ ] /checkout: форма работает, submit → Bitrix24 (проверить пришёл ли лид)
- [ ] /thanks: показывается после успешного submit
- [ ] /blog/<post>: title, description, OG image — корректные
- [ ] Footer лид-форма: submit → Bitrix24
- [ ] Popup лид-форма: submit → Bitrix24
- [ ] /admin/login: вход работает
- [ ] /admin: dashboard загружается
- [ ] /admin/products: список 25 SKU
- [ ] /admin/products/<slug>: редактирование товара, сохранение
- [ ] /admin/blog/<slug>: Tiptap редактор работает
- [ ] /admin/gallery: загрузка картинки
- [ ] curl -I production: HSTS + X-Frame-Options + X-Content-Type-Options + CSP-Report-Only
- [ ] curl production /sitemap.xml: актуальный
- [ ] curl production /robots.txt: блокирует /admin/

### Мониторинг готов
- [ ] Sentry alerting настроен (минимум — email на ошибки)
- [ ] Telegram bot уведомляет о новых лидах (есть в PR #2)
- [ ] Vercel email-уведомления на failed deploys

---

## Day-of-switch playbook

**T -24h** (за день до):
- [ ] Снизить DNS TTL у `studio.pnhd.ru` до 300 сек
- [ ] Снять бейзлайн позиций в Яндекс Webmaster + Google Search Console (топ-30 запросов)
- [ ] Финальный smoke-test на preview-домене
- [ ] Финальный merge всех PR в main → production deploy
- [ ] Бэкап Supabase БД

**T -2h**:
- [ ] Прогон `next build && next start` локально
- [ ] Проверка прода через `curl -A "Yandex" https://<vercel-preview>/` — Yandex видит правильный HTML
- [ ] Подтверждение: Sentry получает события

**T = 0** (вторник, не пятница, 10:00 утра):
- [ ] **Переключить DNS** `studio.pnhd.ru` на Vercel
- [ ] Открыть в incognito `https://studio.pnhd.ru/` — корректно?
- [ ] `curl -A "Yandex" https://studio.pnhd.ru/` — Yandex user-agent видит правильный HTML?
- [ ] Yandex Webmaster → «Переобход страниц» → главная

**T +30 мин**:
- [ ] Тестовый лид через footer-форму — лид в Bitrix24?
- [ ] Заходим в /admin/login — работает?
- [ ] Yandex Metrica → Real Time → есть посетители?

**T +2h**:
- [ ] PageSpeed Insights / Lighthouse на главную → Core Web Vitals в норме?
- [ ] Sentry dashboard — нет ли всплеска ошибок?

**T +24h**:
- [ ] Yandex Webmaster → Диагностика → нет ошибок краулера?
- [ ] Vercel logs → топ-10 404 → редиректы добавить если нужно

**T +7d**:
- [ ] Снять «после» позиции, сравнить с бейзлайном

---

## Incident response (что делать если упадёт)

### Сценарий 1: «Сайт упал / 5xx burst»
1. Vercel Dashboard → Deployments → текущий production → Logs
2. Если ошибка очевидна → `git revert <commit>` + `git push main`
3. Если не очевидна → Vercel Dashboard → previous green deploy → "Promote to Production"

### Сценарий 2: «Спам в Bitrix24»
1. Supabase Dashboard → Edge Functions → `create-lead` → Logs → найти pattern
2. Если ботнет (много IP с одним UA) → временно отключить Edge Function
3. **Включить SmartCaptcha** (тот самый риск, который приняли)
4. Или временно ужесточить rate-limit (1/мин)

### Сценарий 3: «Не приходят лиды в Bitrix24»
1. Проверить `BITRIX_WEBHOOK_URL` в Supabase secrets
2. Supabase Dashboard → Edge Functions → Logs → найти `bitrix_error`
3. Тестовый curl на webhook напрямую — отвечает Bitrix24?
4. Если Bitrix24 down → fallback на Telegram уведомление (есть)

### Сценарий 4: «DNS rollback срочно нужен»
1. DNS provider → переключить A/CNAME обратно на старый сервер (Tilda / старый Vercel)
2. TTL 300 сек = пользователи увидят откат через 5 минут (worst case)

---

## Что отложено на после релиза

Эти задачи не блокеры свитча, но в первые 1-3 месяца после стоит сделать:

### Месяц 1
- **B2B landing `/optom`** (3-4 часа) — закрывает сегменты 3, 4 из User Flow аудита
- **`leads` table удалить** (если Bitrix24 отработал 2 недели стабильно)
- **CAPTCHA** (если случился спам)
- **CSP перевести в enforce mode** (после периода Report-Only)
- **Перезалить 15 битых картинок товаров** через admin UI

### Месяц 2
- **Teyca integration на /loyalty** — реальная программа лояльности
- **Playwright E2E tests** — для основных сценариев
- **Vitest unit tests** — cart-slice, restore validation, Edge Function валидаторы
- **2FA для админов** через Supabase MFA

### Месяц 3
- **CDEK + платёжный шлюз** (если решишь сделать полноценный e-commerce)
- **Audit log** для admin actions
- **Vercel logs export** в Logflare/Axiom для долгосрочного retention

---

## Open questions (что ещё нужно решить владельцу)

Эти вопросы не блокеры запуска плана, но потребуют решения в процессе:

1. **Real X-Forwarded-For format в Supabase Edge** — нужен один тестовый запрос с известного IP для понимания, сколько hops добавляет Supabase gateway. Это нужно для корректной реализации фикса S1. Если не получится определить — fallback на `req.headers.get('x-real-ip')`.

2. **Tracking IDs замена** — когда? Если до DNS-свитча — будет час double-counting (старый Roistat собирает данные на старом домене, новый — на новом). Рекомендация: **поменять прямо в день свитча**, после переключения DNS.

3. **15 битых картинок товаров** — есть ли исходники? Если есть — залить через admin UI до свитча. Если нет — придётся жить с placeholder, переснять/получить позже.

4. **/blog контент** — если пустой, /sitemap.xml не будет включать постов. Минимум 3-5 постов с обложками до свитча.

5. **`docs/runbooks/` папка** — рекомендую создать и положить туда incident response плейбук из security-аудита (стр. 534-568). Один раз в спокойный день — несколько часов на оформление, потом спасёт в кризисе.

---

## Финальная сводка времени

| PR | Время | Накопительно |
|---|---:|---:|
| #1 — Security hotfix | 2-3 ч | 2-3 ч |
| #2 — 152-ФЗ migration | 4-6 ч | 6-9 ч |
| #3 — SEO foundation | 6-8 ч | 12-17 ч |
| #4 — Funnel fixes | 6-8 ч | 18-25 ч |
| #5 — 2D preview + UX | 12-16 ч | 30-41 ч |
| #6 — Observability + CI | 8-10 ч | 38-51 ч |
| **Итого работы** | **~38-51 ч** | **5-7 рабочих дней** |

В календарных днях при 1 разработчике 4-6 часов в день — **2-3 недели**. У тебя 2-4 недели до свитча = **с запасом**.

---

## Что делать прямо сейчас

1. **Сохранить этот файл** в `docs/audits/2026-05-28-master-plan.md`
2. **Прочитать целиком** ещё раз (~15 минут)
3. **Получить Bitrix24 webhook URL** (это блокер PR #2)
4. **Начать PR #1** — за 2-3 часа production будет защищён
5. **Дальше — по порядку**

При вопросах по конкретному PR — приходи, дам промт для Claude Code для запуска работ.
