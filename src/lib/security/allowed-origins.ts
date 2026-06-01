// Список origin'ов, которым разрешено посылать stateful POST'ы
// (form-submissions, orders, и т.п.) с фронта.
//
// Источник правды — env var `ALLOWED_ORIGINS` (CSV). Если не задан — fallback на
// домены которые ДЕЙСТВИТЕЛЬНО хостят сайт (studio.pnhd.ru + текущие Vercel-aliases
// + localhost для dev). Vercel preview URLs покрываются regex'ом — иначе каждый
// PR-preview deploy ломал бы submission'ы.
//
// Закрывает audit B9 (CSRF whitelist не включает Vercel-aliases).

const STATIC_FALLBACK = [
  'http://localhost:3000',
  'https://studio.pnhd.ru',
  'https://pnhd-studio-clone.vercel.app',
  'https://pnhd-studio-clone-margolinilya-creates-projects.vercel.app',
  'https://pnhd-studio-clone-git-main-margolinilya-creates-projects.vercel.app',
];

// Vercel preview deployments — `pnhd-studio-clone-<hash>-margolinilya-creates-projects.vercel.app`
const VERCEL_PREVIEW_RE = /^https:\/\/pnhd-studio-clone(?:-[a-z0-9-]+)?-margolinilya-creates-projects\.vercel\.app$/;

export const getAllowedOriginList = (): string[] => {
  if (process.env.ALLOWED_ORIGINS) {
    return process.env.ALLOWED_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean);
  }
  return STATIC_FALLBACK;
};

export const isAllowedOrigin = (origin: string | null): boolean => {
  if (!origin) return false;
  const list = getAllowedOriginList();
  if (list.includes(origin)) return true;
  // Если env var НЕ задан — также пускаем Vercel preview URLs.
  if (!process.env.ALLOWED_ORIGINS && VERCEL_PREVIEW_RE.test(origin)) return true;
  return false;
};
