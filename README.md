# pnhd-studio-clone

Клон production-сайта [studio.pnhd.ru](https://studio.pnhd.ru) — e-commerce печати на одежде. Каталог, упрощённый flow «выбор размера + расположение принта + загрузка картинки» прямо на product page, лид-формы с пайплайном Supabase → Bitrix24.

> **Внутренняя документация**: [CLAUDE.md](CLAUDE.md) — единственный полный источник правды (архитектура, схемы Supabase, deploy, известные косяки). README — короткая шапка.

## Стек

- Next.js 14 (App Router) · React 18 · TypeScript strict
- Redux Toolkit + RTK Query + listener middleware (sessionStorage persist)
- MUI v7 + CSS Modules
- Supabase (Postgres + Storage + Edge Functions, EU region)
- Hosting: Vercel (auto-deploy `main`)

## Быстрый старт

```bash
npm install
cp .env.example .env.local        # заполни Supabase URL + anon key
npm run dev                        # http://localhost:3000
```

Минимум env-переменных:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<publishable/anon key>
```

Edge Function `create-lead` использует свои секреты (Supabase Dashboard → Edge Functions → Secrets): `BITRIX_WEBHOOK_URL`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `ALLOWED_ORIGINS` — все опциональные.

## Структура

```
src/
├── app/                       # App Router pages
│   ├── shop/[slug]/           # product page с новой ProductInfo панелью
│   ├── cart/, checkout/       # корзина (Redux + sessionStorage), чекаут (TODO)
│   ├── blog/, methods/, ...   # SSR-страницы (Supabase + статика)
│   └── layout.tsx             # <html lang="ru">, Roistat/Metrica скрипты
├── components/
│   ├── pages-components/      # компоненты страниц
│   │   └── shop-page/product-info/  # ⭐ новый блок: size-grid + print-selector + upload-slot
│   └── shared-components/     # header, footer, popup, lead-form, ...
├── redux/
│   ├── cart-slice/             # printConfig schema, ровные reducer'ы
│   ├── middleware/cart-persist.ts  # sessionStorage без побочек в редьюсерах
│   ├── lead-slice/, utils-slice/
│   └── store.ts
├── lib/
│   ├── supabase/               # server + browser клиенты
│   ├── queries/                # getAllProducts, getProductBySlug, getAllPosts...
│   ├── storage/upload-print.ts # загрузка в user-uploads/prints/
│   └── analytics/roistat.ts    # cookie helper
└── api/api.ts                  # RTK Query (createLead → Supabase Functions)

supabase/
├── migrations/                 # 6 миграций (initial → seed → bucket → leads → harden → import)
└── functions/create-lead/      # Edge Function с rate-limit + Bitrix24 + Telegram
```

## Команды

```bash
npm run dev        # dev server
npm run build      # production build (Next.js)
npm run lint       # next lint
npm run start      # serve production build
```

Применить миграцию Supabase:
```bash
# через MCP в Claude:
# mcp__claude_ai_Supabase__apply_migration(project_id, name, query)
# или через CLI:
supabase db push
```

Деплой Edge Function:
```bash
# через MCP в Claude:
# mcp__claude_ai_Supabase__deploy_edge_function(project_id, name, ...)
# или через CLI:
supabase functions deploy create-lead --no-verify-jwt
```

## Дальше читать

- **[CLAUDE.md](CLAUDE.md)** — архитектура, состояние Supabase, лид-пайплайн, roadmap, conventions
- **[supabase/migrations/](supabase/migrations/)** — SQL схемы, RLS policies
- **[supabase/functions/create-lead/index.ts](supabase/functions/create-lead/index.ts)** — Edge Function
