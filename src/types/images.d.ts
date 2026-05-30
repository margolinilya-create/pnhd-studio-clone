// Дублирует декларации из next/image-types/global.d.ts, который Next.js
// инжектит в next-env.d.ts только при наличии сгенерированного .next/.
// В CI без `next build` next-env.d.ts ссылается на тип, но сам тип-декларация
// не подхватывается — tsc валится на каждом `import logo from './x.png'`.
// Этот файл — стабильный backup.

declare module '*.png' {
  const content: import('next/dist/shared/lib/image-external').StaticImageData;
  export default content;
}

declare module '*.jpg' {
  const content: import('next/dist/shared/lib/image-external').StaticImageData;
  export default content;
}

declare module '*.jpeg' {
  const content: import('next/dist/shared/lib/image-external').StaticImageData;
  export default content;
}

declare module '*.gif' {
  const content: import('next/dist/shared/lib/image-external').StaticImageData;
  export default content;
}

declare module '*.webp' {
  const content: import('next/dist/shared/lib/image-external').StaticImageData;
  export default content;
}

declare module '*.avif' {
  const content: import('next/dist/shared/lib/image-external').StaticImageData;
  export default content;
}

declare module '*.svg' {
  // any — чтобы не конфликтовать с @svgr/webpack / babel-plugin-inline-react-svg.
  const content: any;
  export default content;
}

declare module '*.ico' {
  const content: import('next/dist/shared/lib/image-external').StaticImageData;
  export default content;
}
