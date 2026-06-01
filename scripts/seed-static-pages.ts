/**
 * Idempotent seed: creates Page documents for /loyalty, /howto, /size_chart
 * with structured array fields (loyaltyLevels, howtoSteps, sizeChartItems).
 *
 * Existing seed script seed-static-pages.mjs handles /oferta and /privacy via REST API
 * and parses HTML out of legacy JSX. This TS seed handles the structured-array pages
 * via Payload local API.
 *
 * Skip-if-exists by slug. Run:
 *   npx tsx --env-file=.env.local scripts/seed-static-pages.ts
 */
import 'dotenv/config';
import { getPayload } from 'payload';

import config from '../src/payload.config';

// Helper: build minimal Lexical SerializedEditorState with paragraph(s) of plain text.
// Supports inline links via inline syntax tokens — kept simple here; for now just plain text.
type LexicalParagraph = {
  type: 'paragraph';
  version: 1;
  direction: 'ltr';
  format: '';
  indent: 0;
  children: { type: 'text'; version: 1; detail: 0; format: 0; mode: 'normal'; style: ''; text: string }[];
};

const lexicalParagraphs = (paragraphs: string[]) => ({
  root: {
    type: 'root' as const,
    children: paragraphs.map(
      (text): LexicalParagraph => ({
        type: 'paragraph',
        version: 1,
        direction: 'ltr',
        format: '',
        indent: 0,
        children: [
          {
            type: 'text',
            version: 1,
            detail: 0,
            format: 0,
            mode: 'normal',
            style: '',
            text,
          },
        ],
      }),
    ),
    direction: 'ltr' as const,
    format: '' as const,
    indent: 0,
    version: 1,
  },
});

const STATIC_PAGES = [
  {
    slug: 'loyalty',
    title: 'Программа лояльности',
    subtitle: 'Бонусы за каждый заказ — оплачивайте до 50% стоимости',
    pageType: 'landing' as const,
    loyaltyLevels: [
      { level: 'Уровень 1', sum: 'до 3 000 ₽', cashback: null, label: 'базовый' },
      { level: 'Уровень 2', sum: 'от 3 000 ₽', cashback: '3%', label: null },
      { level: 'Уровень 3', sum: 'от 10 000 ₽', cashback: '5%', label: null },
      { level: 'Уровень 4', sum: 'от 30 000 ₽', cashback: '7%', label: null },
      { level: 'Уровень 5', sum: 'от 100 000 ₽', cashback: '10%', label: null },
    ],
  },
  {
    slug: 'howto',
    title: 'Как заказать печать',
    subtitle: 'Пошаговая инструкция: от выбора товара до согласования макета',
    pageType: 'landing' as const,
    howtoSteps: [
      {
        title: '1. ВЫБЕРИ ОДЕЖДУ',
        body: lexicalParagraphs([
          'Перейди в каталог и выбери понравившийся товар — футболку, худи, свитшот, лонгслив, кепку или шоппер. Кликни на карточку, чтобы открыть страницу товара.',
        ]),
      },
      {
        title: '2. ВЫБЕРИ РАЗМЕР',
        body: lexicalParagraphs([
          'В правой панели карточки товара укажи нужный размер. Под каждой кнопкой указано количество в наличии — sold out размеры подсвечены.',
        ]),
      },
      {
        title: '3. ВЫБЕРИ МЕСТО ПРИНТА',
        body: lexicalParagraphs([
          'Тыкни на одну из 5 кнопок: «На груди», «На спине», «На рукаве», «На груди и спине» или «Без принта». Под каждой кнопкой появятся слоты для загрузки файлов.',
        ]),
      },
      {
        title: '4. ЗАГРУЗИ МАКЕТ',
        body: lexicalParagraphs([
          'Перетащи в слот PNG, JPG или WEBP (до 20 МБ каждый). Если есть только идея — оставь слот пустым и опиши задачу в комментарии при оформлении: менеджер поможет с макетом.',
        ]),
      },
      {
        title: '5. ОФОРМИ ЗАЯВКУ',
        body: lexicalParagraphs([
          'Нажми «В корзину», открой страницу корзины и оформи заявку. Достаточно имени, телефона и города доставки — менеджер сам уточнит детали.',
        ]),
      },
      {
        title: '6. СОГЛАСУЕМ И ПЕЧАТАЕМ',
        body: lexicalParagraphs([
          'В течение 30 минут с тобой свяжется менеджер: уточнит расположение, размер принта, технологию печати, окончательную стоимость и сроки. После согласования и оплаты отправляем в производство — типичный срок 3-7 рабочих дней + доставка СДЭКом.',
        ]),
      },
    ],
  },
  {
    slug: 'size_chart',
    title: 'Таблицы размеров',
    subtitle: 'Размерные сетки для футболок, худи и других моделей',
    pageType: 'landing' as const,
    // Images intentionally omitted — admin uploads via admin UI.
    // Stub items so admin sees the empty rows + titles ready to attach images.
    sizeChartItems: [
      { type: 'Футболки CLASSIC', label: null },
      { type: 'Футболки OVERSIZE', label: null },
      { type: 'Футболки FREEFIT', label: null },
      { type: 'Футболки BASIC STANDART', label: null },
      { type: 'Футболки PROMO', label: null },
      { type: 'Футболки GILDAN HAMMER', label: null },
      { type: 'Худи CLASSIC', label: null },
    ],
  },
];

async function main() {
  const payload = await getPayload({ config });

  for (const data of STATIC_PAGES) {
    const existing = await payload.find({
      collection: 'pages',
      where: { slug: { equals: data.slug } },
      limit: 1,
    });

    if (existing.docs.length > 0) {
      console.log(`[seed-static-pages] /${data.slug} exists (id=${existing.docs[0].id}) — skipping`);
      continue;
    }

    const created = await payload.create({
      collection: 'pages',
      data: {
        ...data,
        author: 'PNHD STUDIO',
        publishedAt: new Date().toISOString(),
        _status: 'published',
      } as Parameters<typeof payload.create>[0]['data'],
    });
    console.log(`[seed-static-pages] Created /${data.slug} (id=${created.id})`);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error('[seed-static-pages] Failed:', err);
  process.exit(1);
});
