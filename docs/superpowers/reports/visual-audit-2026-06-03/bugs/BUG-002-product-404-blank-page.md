# BUG-002 — 404 страница товара полностью белая

| Поле | Значение |
|---|---|
| Severity | 🔴 Critical (SEO + UX) |
| Страница | `/shop/<non-existent-slug>` |
| Viewport | 375×812 (вероятно все) |
| Браузер | Chromium 1.60 headless |
| Скриншот | [mobile-375/product-404.png](../../../../tests/visual-audit-2026-06-03/screenshots/mobile-375/product-404.png) |

## Что видно

При переходе на `/shop/this-slug-does-not-exist-12345-audit` сервер возвращает HTTP 404, но страница рендерится как **полностью пустой белый экран**:

- Нет хедера сайта
- Нет футера
- Нет сообщения «Страница не найдена» / «404»
- Нет CTA «Вернуться в каталог»

## Ожидание

- Корректная 404 страница с identity-визуалом сайта
- Хедер + футер на месте (чтобы пользователь мог продолжить навигацию)
- Заголовок «Страница не найдена» / «Товар недоступен»
- Иллюстрация (опционально)
- CTA «Перейти в каталог» / «На главную»
- (Опционально) поиск или популярные товары

## Почему это критично

- **SEO**: поисковики, попавшие на битый slug, видят пустую страницу — снижение domain trust
- **UX**: пользователь, прошедший по битой ссылке (старая закладка, expired share-link), попадает в тупик без выхода
- **Brand**: пустой белый экран = «сайт сломался» в восприятии

## Воспроизведение

```bash
curl -i http://localhost:3000/shop/test-non-existent
# 404 + пустой HTML
```

Браузером: открыть `http://localhost:3000/shop/test-non-existent` → белый экран.

## Возможные причины

- В [src/app/(storefront)/shop/[slug]/page.tsx](../../../../src/app/(storefront)/shop/[slug]/page.tsx) обработчик `notFound()` срабатывает, но **`not-found.tsx`** на уровне route group либо отсутствует, либо отдаёт пустой layout
- Layout `(storefront)/layout.tsx` не оборачивает 404 (Next.js Layout не применяется к `not-found.tsx` если не выставлен явно)

## Что сделать

1. Создать `src/app/(storefront)/shop/[slug]/not-found.tsx` (либо общий `src/app/(storefront)/not-found.tsx`) с identity-сайтом + CTA
2. Убедиться что `not-found.tsx` импортирует хедер/футер (через segment `(storefront)`)
3. Установить metadata `robots: noindex` на 404 странице
