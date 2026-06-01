import 'dotenv/config';
import { getPayload } from 'payload';
import config from '../src/payload.config';

// Helper: build a minimal Lexical SerializedEditorState containing a single paragraph with plain text.
// The `confirmationMessage` field is a richText (Lexical) field, so it expects:
//   { root: { type: 'root', children: [{ type: 'paragraph', ... }], direction, format, indent, version } }
// A bare array like [{ children: [{ text: '...' }] }] is NOT valid — that was the Slate shape.
const lexicalMessage = (text: string) => ({
  root: {
    type: 'root',
    children: [
      {
        type: 'paragraph',
        version: 1,
        direction: 'ltr' as const,
        format: '' as const,
        indent: 0,
        children: [
          {
            type: 'text',
            version: 1,
            detail: 0,
            format: 0,
            mode: 'normal' as const,
            style: '',
            text,
          },
        ],
      },
    ],
    direction: 'ltr' as const,
    format: '' as const,
    indent: 0,
    version: 1,
  },
});

const FORMS = [
  {
    title: 'Footer Lead',
    fields: [
      { blockType: 'text' as const, name: 'name', label: 'Имя', required: true, width: 100 },
      { blockType: 'text' as const, name: 'phone', label: 'Телефон', required: true, width: 100 },
      { blockType: 'email' as const, name: 'email', label: 'Email', required: false, width: 100 },
      { blockType: 'checkbox' as const, name: 'agreement', label: 'Согласие на обработку', required: true },
    ],
    confirmationType: 'message' as const,
    confirmationMessage: lexicalMessage('Спасибо! Мы свяжемся с вами в ближайшее время.'),
  },
  {
    title: 'Popup Lead',
    fields: [
      { blockType: 'text' as const, name: 'name', label: 'Имя', required: true, width: 100 },
      { blockType: 'text' as const, name: 'phone', label: 'Телефон', required: true, width: 100 },
      { blockType: 'email' as const, name: 'email', label: 'Email', required: false, width: 100 },
      { blockType: 'checkbox' as const, name: 'agreement', label: 'Согласие на обработку', required: true },
    ],
    confirmationType: 'message' as const,
    confirmationMessage: lexicalMessage('Заявка отправлена!'),
  },
  {
    title: 'Shop — нет модели',
    fields: [
      { blockType: 'text' as const, name: 'name', label: 'Имя', required: true, width: 100 },
      { blockType: 'text' as const, name: 'phone', label: 'Телефон', required: true, width: 100 },
      { blockType: 'textarea' as const, name: 'comment', label: 'Что ищете', required: false },
    ],
    confirmationType: 'message' as const,
    confirmationMessage: lexicalMessage('Заявка принята, ответим в течение дня.'),
  },
  {
    title: 'Product Page Consultation',
    fields: [
      { blockType: 'text' as const, name: 'name', label: 'Имя', required: true, width: 100 },
      { blockType: 'text' as const, name: 'phone', label: 'Телефон', required: true, width: 100 },
      { blockType: 'text' as const, name: 'referenceUrl', label: 'Ссылка на референс', required: false },
      { blockType: 'textarea' as const, name: 'comment', label: 'Комментарий', required: false },
    ],
    confirmationType: 'message' as const,
    confirmationMessage: lexicalMessage('Спасибо!'),
  },
  {
    title: 'Methods — консультация',
    fields: [
      { blockType: 'text' as const, name: 'name', label: 'Имя', required: true, width: 100 },
      { blockType: 'text' as const, name: 'phone', label: 'Телефон', required: true, width: 100 },
      { blockType: 'text' as const, name: 'methodSlug', label: 'Метод печати', required: false },
      { blockType: 'textarea' as const, name: 'comment', label: 'Комментарий', required: false },
    ],
    confirmationType: 'message' as const,
    confirmationMessage: lexicalMessage('Спасибо!'),
  },
];

async function main() {
  const payload = await getPayload({ config });

  for (const form of FORMS) {
    const existing = await payload.find({
      collection: 'forms',
      where: { title: { equals: form.title } },
      limit: 1,
    });

    if (existing.docs.length > 0) {
      console.log(`skip: form "${form.title}" already exists (id=${existing.docs[0].id})`);
      continue;
    }

    const created = await payload.create({
      collection: 'forms',
      data: {
        title: form.title,
        fields: form.fields,
        confirmationType: form.confirmationType,
        confirmationMessage: form.confirmationMessage,
      },
    });
    console.log(`created: form "${form.title}" (id=${created.id})`);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
