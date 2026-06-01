'use client';

import dynamic from 'next/dynamic';

// `@pbe/react-yandex-maps` тянет full.js (~706 KB transferred / ~3.1 MB uncompressed)
// синхронно на каждый импорт. Раньше MapComponent статически импортировался
// в RSC-страницы — JS чанк попадал в initial bundle. Закрывает audit B15:
// дёргаем только когда компонент реально нужен и только в browser.
//
// SSR=false: yandex-maps SDK browser-only (нет document'а на сервере → crash).
// Loading null: на странице уже есть заголовок-placeholder секции — карта
// просто появляется когда подгрузилась.
const LazyMapComponent = dynamic(() => import('./map-component'), {
  ssr: false,
  loading: () => null,
});

export default LazyMapComponent;
