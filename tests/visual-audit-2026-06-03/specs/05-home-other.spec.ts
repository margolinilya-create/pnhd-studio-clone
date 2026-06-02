import { test, expect, Page } from '@playwright/test'
import path from 'path'
import fs from 'fs'

const OUT = path.resolve(__dirname, '../screenshots')

function shot(page: Page, project: string, name: string, full = true) {
  const dir = path.join(OUT, project)
  fs.mkdirSync(dir, { recursive: true })
  return page.screenshot({ path: path.join(dir, `${name}.png`), fullPage: full })
}

test.describe('Home + other pages', () => {
  test('home renders core sections', async ({ page }, info) => {
    const errors: string[] = []
    page.on('pageerror', err => errors.push(`pageerror: ${err.message}`))
    page.on('console', m => { if (m.type() === 'error') errors.push(`console: ${m.text()}`) })

    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})
    await shot(page, info.project.name, 'home-full')

    // Hero
    await expect.soft(page.locator('h1').first(), 'h1 visible').toBeVisible()

    // Filter noise (analytics, fonts, RSC streaming, third-party)
    const noise =
      /roistat|metrica|uiscom|yastatic|favicon|hydrat|preload|chunk|font/i
    const realErrors = errors.filter(e => !noise.test(e))
    console.log(`[${info.project.name}] home pageerrors filtered=${realErrors.length} total=${errors.length}`)
    realErrors.slice(0, 5).forEach(e => console.log(`  ${e}`))
  })

  test('static pages render', async ({ page }, info) => {
    for (const p of ['/contacts', '/loyalty', '/privacy', '/oferta', '/howto', '/size_chart']) {
      const resp = await page.goto(p, { waitUntil: 'domcontentloaded' })
      const status = resp?.status() ?? 0
      expect.soft(status, `${p} status`).toBeLessThan(400)
      await page.waitForTimeout(1500)
      await shot(page, info.project.name, `page${p.replace(/\//g, '-')}`)
      const ov = await page.evaluate(() => ({ d: document.documentElement.scrollWidth, w: window.innerWidth }))
      expect.soft(ov.d - ov.w, `${p} no x-overflow`).toBeLessThanOrEqual(2)
    }
  })

  test('methods landing renders', async ({ page }, info) => {
    // top-level method page (e.g. /methods/dtg)
    const resp = await page.goto('/methods/dtg', { waitUntil: 'domcontentloaded' })
    if ((resp?.status() ?? 0) >= 400) {
      console.log('/methods/dtg returned non-200, trying alt')
      const alt = await page.goto('/methods/dtg-pechat', { waitUntil: 'domcontentloaded' })
      console.log(`/methods/dtg-pechat status: ${alt?.status()}`)
    }
    await shot(page, info.project.name, 'methods-dtg')
  })

  test('blog list', async ({ page }, info) => {
    const resp = await page.goto('/blog', { waitUntil: 'domcontentloaded' })
    expect.soft(resp?.status() ?? 0, 'blog status').toBeLessThan(400)
    await page.waitForTimeout(1500)
    await shot(page, info.project.name, 'blog-list')
  })

  test('thanks page renders', async ({ page }, info) => {
    const resp = await page.goto('/thanks', { waitUntil: 'domcontentloaded' })
    expect.soft(resp?.status() ?? 0, 'thanks status').toBeLessThan(400)
    await shot(page, info.project.name, 'thanks-page')
  })

  test('no x-overflow on home', async ({ page }, info) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {})
    const ov = await page.evaluate(() => ({ d: document.documentElement.scrollWidth, w: window.innerWidth }))
    console.log(`[${info.project.name}] home width=${ov.d} viewport=${ov.w} diff=${ov.d - ov.w}`)
    expect.soft(ov.d - ov.w, 'no x-overflow').toBeLessThanOrEqual(2)
  })
})
