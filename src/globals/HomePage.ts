import type { GlobalConfig } from 'payload';

import { hasRole } from '../access/hasRole.ts';
import { AboutBlock } from '../blocks/AboutBlock.ts';
import { CategoryGridBlock } from '../blocks/CategoryGridBlock.ts';
import { CTABlock } from '../blocks/CTABlock.ts';
import { FAQBlock } from '../blocks/FAQBlock.ts';
import { HeroBlock } from '../blocks/HeroBlock.ts';
import { MethodsListBlock } from '../blocks/MethodsListBlock.ts';
import { PricingTableBlock } from '../blocks/PricingTableBlock.ts';
import { StagesBlock } from '../blocks/StagesBlock.ts';
import { TestimonialsBlock } from '../blocks/TestimonialsBlock.ts';
import {
  buildPreviewUrl,
  PREVIEW_BREAKPOINTS,
  publicReadOrDraftAccess,
  VERSIONS_WITH_DRAFTS,
} from '../lib/payload/shared-config.ts';

export const HomePage: GlobalConfig = {
  slug: 'home-page',
  label: 'Home Page (главная)',
  admin: {
    group: 'Pages',
    description:
      'Главная страница сайта. Блоки можно перетаскивать для изменения порядка. Каждый блок — своя секция с настраиваемым содержимым.',
    livePreview: {
      url: () => buildPreviewUrl('/'),
      breakpoints: PREVIEW_BREAKPOINTS,
    },
  },
  access: {
    read: publicReadOrDraftAccess,
    update: hasRole('admin', 'marketing'),
  },
  versions: VERSIONS_WITH_DRAFTS,
  fields: [
    {
      name: 'sections',
      type: 'blocks',
      label: 'Секции страницы',
      minRows: 0,
      blocks: [
        HeroBlock,
        CategoryGridBlock,
        MethodsListBlock,
        StagesBlock,
        PricingTableBlock,
        AboutBlock,
        TestimonialsBlock,
        FAQBlock,
        CTABlock,
      ],
    },
  ],
};
