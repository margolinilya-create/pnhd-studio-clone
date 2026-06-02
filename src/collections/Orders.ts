import type { CollectionBeforeChangeHook, CollectionConfig } from 'payload';

import { hasRole } from '../access/hasRole.ts';
import { isAuthenticated } from '../access/isAuthenticated.ts';

const assignOrderNumber: CollectionBeforeChangeHook = async ({ data, operation, req }) => {
  if (operation !== 'create') return data;
  if (data.orderNumber) return data;

  const now = new Date();
  const yyyymmdd = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, '0')}${String(
    now.getUTCDate(),
  ).padStart(2, '0')}`;

  const prefix = `PNHD-${yyyymmdd}-`;
  const existing = await req.payload.find({
    collection: 'orders',
    where: { orderNumber: { like: prefix } },
    sort: '-orderNumber',
    limit: 1,
    pagination: false,
  });

  let nextSeq = 1;
  const last = existing.docs[0] as { orderNumber?: string } | undefined;
  if (last?.orderNumber) {
    const lastSeq = Number(last.orderNumber.split('-')[2] ?? '0');
    if (Number.isFinite(lastSeq)) nextSeq = lastSeq + 1;
  }

  data.orderNumber = `${prefix}${String(nextSeq).padStart(4, '0')}`;
  return data;
};

export const Orders: CollectionConfig = {
  slug: 'orders',
  admin: {
    useAsTitle: 'orderNumber',
    defaultColumns: ['orderNumber', 'customer.name', 'status', 'paymentStatus', 'total', 'createdAt'],
  },
  access: {
    create: hasRole('admin'),
    read: isAuthenticated,
    update: hasRole('admin', 'operations'),
    delete: hasRole('admin'),
  },
  hooks: {
    beforeChange: [assignOrderNumber],
  },
  fields: [
    {
      name: 'orderNumber',
      type: 'text',
      unique: true,
      index: true,
      admin: { readOnly: true, description: 'PNHD-YYYYMMDD-NNNN (auto-generated)' },
    },
    {
      name: 'channel',
      type: 'select',
      required: true,
      defaultValue: 'b2c',
      options: [
        { label: 'B2C', value: 'b2c' },
        { label: 'B2B', value: 'b2b' },
      ],
    },
    {
      name: 'customer',
      type: 'group',
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'phone', type: 'text', required: true },
        { name: 'email', type: 'email' },
        {
          name: 'note',
          type: 'textarea',
          maxLength: 2000,
          label: 'Комментарий клиента (из /checkout)',
        },
        { name: 'roistatVisit', type: 'text' },
      ],
    },
    {
      name: 'delivery',
      type: 'group',
      fields: [
        {
          name: 'type',
          type: 'select',
          options: [
            { label: 'CDEK ПВЗ', value: 'cdek_pvz' },
            { label: 'CDEK курьер', value: 'cdek_door' },
            { label: 'Самовывоз', value: 'self_pickup' },
          ],
        },
        { name: 'cityCode', type: 'text' },
        { name: 'cityName', type: 'text' },
        { name: 'address', type: 'text' },
        { name: 'pvzCode', type: 'text' },
        { name: 'cost', type: 'number', defaultValue: 0, label: 'Стоимость доставки, копейки' },
      ],
    },
    {
      name: 'promoCode',
      type: 'relationship',
      relationTo: 'promos',
    },
    {
      name: 'subtotal',
      type: 'number',
      required: true,
      defaultValue: 0,
      label: 'Сумма товаров, копейки',
    },
    {
      name: 'discount',
      type: 'number',
      defaultValue: 0,
      label: 'Скидка, копейки',
    },
    {
      name: 'shippingCost',
      type: 'number',
      defaultValue: 0,
      label: 'Стоимость доставки, копейки',
    },
    {
      name: 'total',
      type: 'number',
      required: true,
      defaultValue: 0,
      label: 'Итого, копейки',
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'draft',
      options: [
        { label: 'Черновик', value: 'draft' },
        { label: 'Ожидает оплаты', value: 'pending_payment' },
        { label: 'Оплачен', value: 'paid' },
        { label: 'В производстве', value: 'in_production' },
        { label: 'Отправлен', value: 'shipped' },
        { label: 'Доставлен', value: 'delivered' },
        { label: 'Отменён', value: 'cancelled' },
        { label: 'Возврат', value: 'refunded' },
      ],
    },
    {
      name: 'paymentStatus',
      type: 'select',
      required: true,
      defaultValue: 'unpaid',
      options: [
        { label: 'Не оплачен', value: 'unpaid' },
        { label: 'Ожидание callback', value: 'awaiting_callback' },
        { label: 'Оплачен', value: 'paid' },
        { label: 'Ошибка', value: 'failed' },
        { label: 'Возврат', value: 'refunded' },
      ],
    },
    {
      name: 'productionStatus',
      type: 'select',
      defaultValue: 'not_started',
      options: [
        { label: 'Не начат', value: 'not_started' },
        { label: 'Согласование макета', value: 'layout_review' },
        { label: 'В печати', value: 'printing' },
        { label: 'Контроль качества', value: 'qc' },
        { label: 'Упакован', value: 'packed' },
      ],
    },
    {
      name: 'paymentProvider',
      type: 'select',
      admin: { readOnly: true, description: 'Заполняется Phase 5 hook (СБП Tochka/T-Bank — отложено)' },
      options: [
        { label: 'Точка Банк', value: 'tochka' },
        { label: 'Т-Банк', value: 'tbank' },
      ],
    },
    { name: 'sbpQrId', type: 'text', admin: { readOnly: true } },
    { name: 'sbpQrUrl', type: 'text', admin: { readOnly: true } },
    {
      name: 'fiscalReceiptId',
      type: 'text',
      admin: { readOnly: true, description: 'Заполняется Phase 6 hook (КОМТЕТ Касса — отложено)' },
    },
    {
      name: 'notes',
      type: 'textarea',
      label: 'Заметки operations',
    },
  ],
};
