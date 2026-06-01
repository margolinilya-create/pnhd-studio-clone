import { test } from '@playwright/test'

const BASE_URL = process.env.AUDIT_BASE_URL || 'https://pnhd-studio-clone.vercel.app'
const FIRST_SLUG = process.env.AUDIT_FIRST_SLUG || 'futbolka-classic-belaya-man'

const SCREENS = [
  { name: 'home', path: '/' },
  { name: 'shop', path: '/shop' },
  { name: 'product', path: `/shop/${FIRST_SLUG}` },
  { name: 'cart', path: '/cart' },
  { name: 'checkout', path: '/checkout' },
  { name: 'blog', path: '/blog' },
  { name: 'contacts', path: '/contacts' },
]

for (const { name, path: p } of SCREENS) {
  test(`screenshot-${name}`, async ({ page }, testInfo) => {
    await page.goto(BASE_URL + p, { waitUntil: 'networkidle' }).catch(() => page.goto(BASE_URL + p))
    await page.waitForTimeout(1500)
    const device = testInfo.project.name
    await page.screenshot({
      path: `docs/superpowers/reports/launch-audit-2026-06-01/raw/screenshots/${device}-${name}.png`,
      fullPage: true,
    })
  })
}
