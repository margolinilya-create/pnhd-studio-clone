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
