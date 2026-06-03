# BUG-009 — (Vermutung) Cart-валидатор отвергает корректный заявленный shape

| Поле | Значение |
|---|---|
| Severity | 🟡 Minor / Test-side caveat |
| Страница | `/cart` |
| Скриншот | [desktop-1280/cart-populated.png](../../../../tests/visual-audit-2026-06-03/screenshots/desktop-1280/cart-populated.png) |

## Что увидел

Тест `seedCart()` записал в `sessionStorage.order_v3` shape:

```json
[{
  "itemCartId": "audit-cart-1",
  "item": {
    "slug": "futbolka-classic-belaya-man",
    "name": "Футболка CLASSIC белая",
    "title": "Футболка CLASSIC белая",
    "price": 1200,
    "image_url": "",
    "sizes": [{"name":"S","qty":10,"userQty":2},{"name":"M","qty":10,"userQty":1}],
    "isForPrinting": true
  },
  "quantity": 3,
  "size": "M",
  "printConfig": { "location": "none", "files": {} }
}]
```

После reload на `/cart` страница рендерит **только заголовок «Корзина»** и **никакого товара**. Это значит: либо `restoreCart`-валидатор в `CartIcon` (по CLAUDE.md §4) отверг payload как malformed (defensive check post-audit), либо CartClient не редиректит при пустом, но рендерит пустую сетку.

## Почему это важно для отчёта

- Большинство `cart-populated`, `checkout-base`, `checkout-empty-submit` тестов в аудите **не отражают real-state** корзины с товаром
- Чтобы получить настоящие скриншоты cart-with-items нужно либо
  - Знать exact shape `IProduct + ICartOrderElement` (включая ВСЕ обязательные поля)
  - Либо добавлять товар через UI (открыть `/shop/<slug>` → выбрать размер → клик «В корзину»)

## Что предложить

1. Найти `validateStoredCart` (или эквивалент) в `src/components/header/cart-icon/` или `src/redux/cart-slice/` — задокументировать invariant
2. Либо переписать аудит-тест cart на UI-flow (медленнее но точнее)
3. Никакого product-side баги тут нет — это test-fragility

## Следующее действие для аудита

- Перезапустить cart/checkout тесты с UI-driven seeding (open product page → add to cart)
