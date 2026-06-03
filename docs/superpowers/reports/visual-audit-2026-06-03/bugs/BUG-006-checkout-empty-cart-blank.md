# BUG-006 — /checkout без позиций — пустой экран без заголовка

| Поле | Значение |
|---|---|
| Severity | 🔴 Critical (funnel + UX) |
| Страница | `/checkout` (sessionStorage пуст) |
| Viewport | 375 (vis 768 и 1280 та же ситуация) |
| Скриншоты | [tour/m-375/checkout.png](../../../../tests/visual-audit-2026-06-03/screenshots/tour/m-375/checkout.png), [tour/d-1280/checkout.png](../../../../tests/visual-audit-2026-06-03/screenshots/tour/d-1280/checkout.png) |

## Что видно

При прямом заходе на `/checkout` без товара в `order_v3`:

- Хедер
- (Никакого H1, никакого «Корзина пуста», никаких полей оформления)
- Сразу футер с лид-формой
- Внизу — большой логотип «ПИНХЭД СТУДИЯ»

Та же история, что и [BUG-001](BUG-001-empty-cart-shows-lead-form.md), но на checkout даже **нет заголовка** «Корзина пуста» — просто **header → footer**.

## Почему критично

По CLAUDE.md есть редирект "isHydrated && order.length === 0 → router.push('/shop')". Но на скриншоте он **не сработал** — пользователь остался на `/checkout` с пустой страницей.

## Что предложить

1. Либо реально включить редирект `/checkout` → `/shop` при пустой корзине (поверять `checkoutClient` компонент)
2. Либо отрисовать empty-state с H1 «Корзина пуста» и CTA «Перейти в каталог»

См. также: [BUG-001](BUG-001-empty-cart-shows-lead-form.md).
