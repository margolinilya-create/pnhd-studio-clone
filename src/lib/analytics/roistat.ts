// Достаёт значение cookie roistat_visit, который ставит Roistat-скрипт в layout.tsx.
// Если cookie не найден (Roistat не загрузился, AdBlock, SSR), возвращает пустую строку.
export function getRoistatVisit(): string {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(/(?:^|; )roistat_visit=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : '';
}
