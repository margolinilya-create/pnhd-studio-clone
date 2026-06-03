import { test, Page } from '@playwright/test'
import path from 'path'
import fs from 'fs'

const OUT = path.resolve(__dirname, '../screenshots/tour')

function shot(page: Page, project: string, name: string) {
  const dir = path.join(OUT, project)
  fs.mkdirSync(dir, { recursive: true })
  return page.screenshot({ path: path.join(dir, `${name}.png`), fullPage: true })
}

const PAGES = [
  { name: 'home', path: '/' },
  { name: 'shop', path: '/shop' },
  { name: 'shop-filter-kids-tshirt', path: '/shop?category=kids&type=tshirt' },
  { name: 'shop-empty-accesorize-tshirt', path: '/shop?category=accesorize&type=tshirt' },
  { name: 'product', path: '/shop/futbolka-classic-belaya-man' },
  { name: 'cart', path: '/cart' },
  { name: 'checkout', path: '/checkout' },
  { name: 'futbolki', path: '/futbolki' },
  { name: 'hudi', path: '/hudi' },
  { name: 'shoppery', path: '/shoppery' },
  { name: 'kepki', path: '/kepki' },
  { name: 'contacts', path: '/contacts' },
  { name: 'loyalty', path: '/loyalty' },
  { name: 'howto', path: '/howto' },
  { name: 'size_chart', path: '/size_chart' },
  { name: 'privacy', path: '/privacy' },
  { name: 'oferta', path: '/oferta' },
  { name: 'blog', path: '/blog' },
  { name: 'methods-dtg', path: '/methods/dtg' },
  { name: 'thanks', path: '/thanks' },
  { name: 'page-404', path: '/shop/non-existent-slug-12345-audit' },
]

for (const p of PAGES) {
  test(`tour ${p.name}`, async ({ page }, info) => {
    await page.goto(p.path, { waitUntil: 'domcontentloaded' })
    // give time for hero animations / fonts
    await page.waitForLoadState('networkidle', { timeout: 25_000 }).catch(() => {})
    await page.waitForTimeout(2000)
    await shot(page, info.project.name, p.name)
  })
}
