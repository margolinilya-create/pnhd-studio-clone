import { TPrintLocation, TPrintSide } from '@/app/utils/types';

export const PRINT_OPTIONS: ReadonlyArray<{ id: TPrintLocation; label: string }> = [
  { id: 'none', label: 'Без принта' },
  { id: 'front', label: 'На груди' },
  { id: 'back', label: 'На спине' },
  { id: 'sleeve', label: 'На рукаве' },
  { id: 'both', label: 'С двух сторон' },
];

export const SIDES_FOR_LOCATION: Readonly<Record<TPrintLocation, ReadonlyArray<TPrintSide>>> = {
  none: [],
  front: ['front'],
  back: ['back'],
  sleeve: ['sleeve'],
  both: ['front', 'back'],
};
