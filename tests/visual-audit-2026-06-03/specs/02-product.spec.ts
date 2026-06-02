import { test, expect, Page } from '@playwright/test'
import path from 'path'
import fs from 'fs'

const OUT = path.resolve(__dirname, '../screenshots')

function shot(page: Page, project: string, name: string, full = true) {
  const dir = path.join(OUT, project)
  fs.mkdirSync(dir, { recursive: true })
  return page.screenshot({ path: path.join(dir, `${name}.png`), fullPage: full })
}

async function getSampleSlugs(page: Page, max = 4): Promise<string[]> {
  await page.goto('/shop', { waitUntil: 'domcontentloaded' })
  await page.locator('a[href^="/shop/"]').first().waitFor({ state: 'attached', timeout: 30_000 })
  const hrefs = await page.locator('a[href^="/shop/"]').evaluateAll(els =>
    Array.from(new Set(els.map(e => (e as HTMLAnchorElement).getAttribute('href')!).filter(Boolean))),
  )
  return hrefs.slice(0, max).map(h => h.replace(/^\/shop\//, ''))
}

test.describe('Product page /shop/[slug]', () => {
  test('sample products render core elements', async ({ page }, info) => {
    const slugs = await getSampleSlugs(page, 4)
    expect(slugs.length, 'sampled slugs').toBeGreaterThanOrEqual(2)

    for (const slug of slugs) {
      await page.goto(`/shop/${slug}`, { waitUntil: 'domcontentloaded' })
      await page.locator('h1').waitFor({ state: 'visible', timeout: 20_000 })
      await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {})

      // 1) gallery: 1+ image
      const galleryImgs = page.locator('img').filter({ hasNot: page.locator('[class*="logo" i]') })
      const imgCount = await galleryImgs.count()
      expect.soft(imgCount, `${slug}: images on page`).toBeGreaterThan(0)

      // 2) h1 + price + CTA
      await expect.soft(page.locator('h1'), `${slug}: h1 visible`).toBeVisible()
      await expect.soft(page.getByText(/₽/).first(), `${slug}: price visible`).toBeVisible()
      const cta = page.getByRole('button', { name: /В корзину|Сохранить изменения/i })
      await expect.soft(cta, `${slug}: CTA visible`).toBeVisible()

      // 3) CTA disabled until size selected
      const ctaDisabled = await cta.isDisabled().catch(() => false)
      expect.soft(ctaDisabled, `${slug}: CTA initially disabled (qty=0)`).toBe(true)

      // 4) Size guide button
      const sizeGuide = page.getByRole('button', { name: /Гид по размерам/i })
      await expect.soft(sizeGuide, `${slug}: size guide button visible`).toBeVisible()

      await shot(page, info.project.name, `product-${slug}`)

      // 5) Increment a size to enable CTA
      const incButtons = page.locator('button:has-text("+")')
      const incCount = await incButtons.count()
      if (incCount > 0) {
        await incButtons.first().click()
        await page.waitForTimeout(300)
        const enabled = await cta.isEnabled().catch(() => false)
        expect.soft(enabled, `${slug}: CTA enabled after +1`).toBe(true)
        await shot(page, info.project.name, `product-${slug}-qty1`)
      }
    }
  })

  test('size guide dialog opens and closes', async ({ page }, info) => {
    const slugs = await getSampleSlugs(page, 1)
    if (slugs.length === 0) test.skip()
    await page.goto(`/shop/${slugs[0]}`, { waitUntil: 'domcontentloaded' })
    await page.locator('h1').waitFor({ state: 'visible' })
    const sizeGuide = page.getByRole('button', { name: /Гид по размерам/i })
    await sizeGuide.click()
    await page.waitForTimeout(500)
    const dialog = page.getByRole('dialog')
    await expect.soft(dialog, 'size guide dialog open').toBeVisible()
    await shot(page, info.project.name, `product-size-guide-open`)
    const closeBtn = page.getByRole('button', { name: /закрыть/i }).or(page.locator('[aria-label="закрыть"]'))
    await closeBtn.first().click().catch(() => {})
    await page.waitForTimeout(500)
    await expect.soft(dialog, 'dialog closed').toBeHidden({ timeout: 5_000 })
  })

  test('404 on nonexistent slug', async ({ page }, info) => {
    const resp = await page.goto('/shop/this-slug-does-not-exist-12345-audit', { waitUntil: 'domcontentloaded' })
    const status = resp?.status() ?? 0
    expect.soft(status, '404 status').toBeGreaterThanOrEqual(400)
    await shot(page, info.project.name, 'product-404')
  })

  test('no x-overflow on product page', async ({ page }, info) => {
    const slugs = await getSampleSlugs(page, 1)
    if (slugs.length === 0) test.skip()
    await page.goto(`/shop/${slugs[0]}`, { waitUntil: 'domcontentloaded' })
    await page.locator('h1').waitFor({ state: 'visible' })
    const ov = await page.evaluate(() => ({ d: document.documentElement.scrollWidth, w: window.innerWidth }))
    console.log(`[${info.project.name}] product page width=${ov.d} viewport=${ov.w} diff=${ov.d - ov.w}`)
    expect.soft(ov.d - ov.w, 'no x-overflow').toBeLessThanOrEqual(2)
  })
})
