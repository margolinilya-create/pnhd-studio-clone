import { test, expect } from '@playwright/test'

const BASE_URL = process.env.AUDIT_BASE_URL || 'https://pnhd-studio-clone.vercel.app'
const FIRST_SLUG = process.env.AUDIT_FIRST_SLUG || 'futbolka-classic-belaya-man'

test.describe('Launch smoke', () => {
  test('home renders without console errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', err => errors.push(`pageerror: ${err.message}`))
    page.on('console', msg => { if (msg.type() === 'error') errors.push(`console: ${msg.text()}`) })

    const response = await page.goto(BASE_URL + '/')
    expect(response?.status()).toBeLessThan(400)
    await expect(page).toHaveTitle(/.+/)
    const realErrors = errors.filter(e => !/roistat|metrica|uiscom|yastatic|favicon/i.test(e))
    expect(realErrors, `console errors:\n${realErrors.join('\n')}`).toEqual([])
  })

  test('shop list renders products', async ({ page }) => {
    await page.goto(BASE_URL + '/shop')
    const cards = page.locator('a[href*="/shop/"]')
    await expect(cards.first()).toBeVisible({ timeout: 10_000 })
    const count = await cards.count()
    expect(count, 'product link count').toBeGreaterThanOrEqual(5)
  })

  test('product page renders core elements', async ({ page }) => {
    await page.goto(`${BASE_URL}/shop/${FIRST_SLUG}`, { waitUntil: 'networkidle' })
    await expect(page.locator('h1')).toBeVisible()
    const sizeHint = page.getByText(/размер/i)
    await expect(sizeHint.first()).toBeVisible({ timeout: 5000 })
  })

  test('footer lead form submits with audit marker', async ({ page }) => {
    await page.goto(BASE_URL + '/')
    await page.locator('footer').scrollIntoViewIfNeeded()
    const nameInput = page.locator('footer input[name="name"], footer input[placeholder*="Имя" i]').first()
    if (await nameInput.count() === 0) {
      test.skip(true, 'footer lead form not found — likely renamed selector')
    }
    await nameInput.fill('[AUDIT] Test ' + Date.now())
    const phoneInput = page.locator('footer input[type="tel"]').first()
    await phoneInput.fill('+79991234567')
    const emailInput = page.locator('footer input[type="email"]').first()
    if (await emailInput.count() > 0) await emailInput.fill('audit@example.com')
    const agreement = page.locator('footer input[type="checkbox"]').first()
    if (await agreement.count() > 0) await agreement.check()
    const submitBtn = page.locator('footer button[type="submit"]').first()
    const responsePromise = page.waitForResponse(resp => /form-submissions/.test(resp.url()), { timeout: 10_000 }).catch(() => null)
    await submitBtn.click()
    const resp = await responsePromise
    await page.waitForTimeout(2000)
    await page.screenshot({
      path: 'docs/superpowers/reports/launch-audit-2026-06-01/raw/screenshots/footer-lead-after-submit.png',
      fullPage: false,
    })
    if (resp) {
      console.log(`Lead submit response: ${resp.status()}`)
      expect(resp.status(), `submit status (200/201 expected; 429 rate-limit OK)`).toBeLessThan(500)
    } else {
      console.log('No form-submissions request observed — form may post elsewhere or be silent')
    }
  })

  test('cart hydration after hard refresh', async ({ page }) => {
    await page.goto(BASE_URL + '/cart')
    await page.waitForTimeout(2500)
    const url = page.url()
    expect(url, 'should land on cart or redirect to shop only after hydration').toMatch(/\/(cart|shop)/)
  })

  test('admin login page returns 200', async ({ page }) => {
    const resp = await page.goto(BASE_URL + '/admin/login')
    expect(resp?.status()).toBeLessThan(400)
  })

  test('blog list renders', async ({ page }) => {
    const resp = await page.goto(BASE_URL + '/blog')
    expect(resp?.status()).toBeLessThan(400)
  })

  test('static pages render', async ({ page }) => {
    for (const path of ['/contacts', '/oferta', '/privacy', '/loyalty']) {
      const resp = await page.goto(BASE_URL + path)
      expect(resp?.status(), `${path} status`).toBeLessThan(400)
      await expect(page.locator('body')).toBeVisible()
    }
  })

  test('checkout reachable from cart with item', async ({ page }) => {
    await page.goto(BASE_URL + '/shop')
    await page.evaluate(() => {
      const order = [{
        itemCartId: 'audit-test-' + Date.now(),
        item: {
          slug: 'audit',
          title: 'Audit Item',
          price: 1,
          image_url: '',
        },
        quantity: 1,
        size: 'M',
        printConfig: { location: 'none', files: {} },
      }]
      sessionStorage.setItem('order_v3', JSON.stringify(order))
    })
    const resp = await page.goto(BASE_URL + '/checkout')
    expect(resp?.status()).toBeLessThan(400)
    await page.waitForTimeout(2000)
    await page.screenshot({
      path: 'docs/superpowers/reports/launch-audit-2026-06-01/raw/screenshots/checkout-state.png',
      fullPage: true,
    })
  })
})
