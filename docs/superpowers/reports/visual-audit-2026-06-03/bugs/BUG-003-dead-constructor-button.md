# BUG-003 — Кнопка «ПЕРЕЙТИ В КОНСТРУКТОР» в /contacts ведёт в никуда

| Поле | Значение |
|---|---|
| Severity | 🟠 Major (dead link, путает пользователя) |
| Страница | `/contacts` |
| Viewport | 375 (виден на всех) |
| Браузер | Chromium 1.60 headless |
| Скриншот | [mobile-375/page-contacts.png](../../../../tests/visual-audit-2026-06-03/screenshots/mobile-375/page-contacts.png) |

## Что видно

В колонке контактных данных под адресом расположена кнопка-CTA **«ПЕРЕЙТИ В КОНСТРУКТОР»** (бирюзовая, фирменный стиль).

Per CLAUDE.md §1 проект уже прошёл removal батч 2026-05-27: «3D-конструктор **полностью удалён**. Папка `src/app/shop/[slug]/constructor/` снесена». То есть конструктора больше нет — кнопка либо отдаёт 404, либо редиректит на `/shop/<slug>`.

## Ожидание

- Удалить кнопку «ПЕРЕЙТИ В КОНСТРУКТОР»
- На её месте — либо CTA «ПЕРЕЙТИ В КАТАЛОГ», либо ничего

## Воспроизведение

1. Открыть `http://localhost:3000/contacts`
2. Проскроллить до контактного блока
3. Нажать «ПЕРЕЙТИ В КОНСТРУКТОР»

## Возможные причины

- Жёстко зашитый CTA в [src/components/pages-components/contacts-page/](../../../../src/components/pages-components/contacts-page/) либо в Pages-коллекции Payload, забытый при removal-батче
- Возможно тот же CTA встречается и в других местах (footer, popup, методы) — нужен grep

## Найденные места после grep

```
src/components/pages-components/main-page/map-screen/map-screen.tsx
  <button type='button' className={styles.contacts_leadButton}>перейти в конструктор</button>

src/components/pages-components/main-page/stages-screen/stages-screen.tsx
  text: 'Добавь в конструктор текстиль нужного фасона и размера',
```

`map-screen.tsx` рендерится **и в /contacts, и в footer-блоке `/` (главная)** — т.е. dead-кнопка висит сразу в 2+ местах. Кнопка вообще без `onClick` — клик на неё **ничего не делает**.

`stages-screen.tsx` содержит legacy copy «Добавь в конструктор…» — текст не отражает текущий flow (конструктора нет).

## Что сделать

1. В `map-screen.tsx` — удалить кнопку, либо заменить на `<Link href="/shop">перейти в каталог</Link>`
2. В `stages-screen.tsx` — переписать step «Добавь в конструктор…» под текущий flow «Выбери модель и расположение принта на странице товара»
3. Дополнительный grep — найти ВСЕ упоминания «конструктор» в copy / labels и почистить:

```bash
grep -rn "конструктор\|КОНСТРУКТОР" src/
```
