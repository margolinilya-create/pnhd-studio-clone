import { test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import fs from 'fs'
import path from 'path'

const BASE_URL = process.env.AUDIT_BASE_URL || 'https://pnhd-studio-clone.vercel.app'
const FIRST_SLUG = process.env.AUDIT_FIRST_SLUG || 'futbolka-classic-belaya-man'
const OUT = 'docs/superpowers/reports/launch-audit-2026-06-01/raw'

const PAGES: { name: string; path: string }[] = [
  { name: 'home', path: '/' },
  { name: 'shop', path: '/shop' },
  { name: 'product', path: `/shop/${FIRST_SLUG}` },
  { name: 'cart', path: '/cart' },
  { name: 'blog', path: '/blog' },
]

for (const { name, path: pagePath } of PAGES) {
  test(`axe-${name}`, async ({ page }) => {
    await page.goto(BASE_URL + pagePath, { waitUntil: 'networkidle' }).catch(() => page.goto(BASE_URL + pagePath))
    await page.waitForTimeout(1500)
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()
    fs.writeFileSync(path.join(OUT, `axe-${name}.json`), JSON.stringify(results, null, 2))
  })
}
