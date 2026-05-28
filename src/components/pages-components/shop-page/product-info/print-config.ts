import { TPrintLocation, TPrintSide } from '@/app/utils/types';

// «Без принта» в конце — самый «нейтральный» выбор показывается последним,
// чтобы пользователь по умолчанию шёл по hot-path (выбрать принт).
export const PRINT_OPTIONS: ReadonlyArray<{ id: TPrintLocation; label: string }> = [
  { id: 'front', label: 'На груди' },
  { id: 'back', label: 'На спине' },
  { id: 'sleeve', label: 'На рукаве' },
  { id: 'both', label: 'С двух сторон' },
  { id: 'none', label: 'Без принта' },
];

export const SIDES_FOR_LOCATION: Readonly<Record<TPrintLocation, ReadonlyArray<TPrintSide>>> = {
  none: [],
  front: ['front'],
  back: ['back'],
  sleeve: ['sleeve'],
  both: ['front', 'back'],
};

/**
 * Относительные координаты прямоугольника принта для overlay-предпросмотра.
 * Значения в процентах от размера фото-контейнера.
 * Используется в PrintPreview (PR #5).
 *
 * Эти координаты — «приблизительные», финальное расположение согласует менеджер.
 */
export type PrintRect = { top: string; left: string; width: string };

export const PRINT_POSITIONS: Record<string, Partial<Record<TPrintSide, PrintRect>>> = {
  // Defaults under unknown type — используется как fallback
  default: {
    front: { top: '34%', left: '37%', width: '26%' },
    back: { top: '30%', left: '37%', width: '26%' },
    sleeve: { top: '38%', left: '8%', width: '14%' },
  },
  tshirt: {
    front: { top: '34%', left: '37%', width: '26%' },
    back: { top: '30%', left: '37%', width: '26%' },
    sleeve: { top: '38%', left: '8%', width: '14%' },
  },
  longsleeve: {
    front: { top: '32%', left: '37%', width: '26%' },
    back: { top: '30%', left: '37%', width: '26%' },
    sleeve: { top: '46%', left: '5%', width: '12%' },
  },
  hoodie: {
    front: { top: '40%', left: '37%', width: '26%' },
    back: { top: '28%', left: '37%', width: '26%' },
    sleeve: { top: '46%', left: '6%', width: '13%' },
  },
  sweatshirt: {
    front: { top: '36%', left: '37%', width: '26%' },
    back: { top: '30%', left: '37%', width: '26%' },
    sleeve: { top: '44%', left: '7%', width: '13%' },
  },
  cap: {
    front: { top: '42%', left: '37%', width: '26%' },
    back: { top: '42%', left: '37%', width: '26%' },
    sleeve: { top: '42%', left: '37%', width: '26%' },
  },
  totebag: {
    front: { top: '32%', left: '30%', width: '40%' },
    back: { top: '32%', left: '30%', width: '40%' },
    sleeve: { top: '32%', left: '30%', width: '40%' },
  },
};

export function getPrintRect(productType: string, side: TPrintSide): PrintRect {
  const byType = PRINT_POSITIONS[productType] ?? PRINT_POSITIONS.default;
  return byType[side] ?? PRINT_POSITIONS.default[side]!;
}

export const PRINT_PRICE_TABLE: ReadonlyArray<{
  format: string;
  dtg: number;
  dtf: number;
}> = [
  { format: 'А6 (5×7 см)', dtg: 400, dtf: 500 },
  { format: 'А5 (10×15 см)', dtg: 500, dtf: 650 },
  { format: 'А4 (15×21 см)', dtg: 650, dtf: 800 },
  { format: 'А3 (30×40 см)', dtg: 800, dtf: 900 },
  { format: 'А3+ (33×48 см)', dtg: 900, dtf: 1100 },
];
