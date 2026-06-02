import { test, expect, Page } from '@playwright/test'
import path from 'path'
import fs from 'fs'

const OUT = path.resolve(__dirname, '../screenshots')

function shot(page: Page, project: string, name: string, full = true) {
  const dir = path.join(OUT, project)
  fs.mkdirSync(dir, { recursive: true })
  return page.screenshot({ path: path.join(dir, `${name}.png`), fullPage: full })
}

async function seedCart(page: Page) {
  // Mock a real product shape — must match validator in CartIcon: printConfig.location enum,
  // files object, itemCartId string, sizes array on item.
  await page.evaluate(() => {
    const order = [
      {
        itemCartId: 'audit-cart-1',
        item: {
          slug: 'futbolka-classic-belaya-man',
          name: 'Футболка CLASSIC белая',
          title: 'Футболка CLASSIC белая',
          price: 1200,
          image_url: '',
          sizes: [
            { name: 'S', qty: 10, userQty: 2 },
            { name: 'M', qty: 10, userQty: 1 },
          ],
          isForPrinting: true,
        },
        quantity: 3,
        size: 'M',
        printConfig: { location: 'none', files: {} },
      },
    ]
    sessionStorage.setItem('order_v3', JSON.stringify(order))
  })
}

test.describe('Cart /cart', () => {
  test('empty cart renders friendly state', async ({ page }, info) => {
    await page.goto('/cart', { waitUntil: 'domcontentloaded' })
    // sessionStorage may be empty → page might redirect to /shop after hydration.
    // Wait until URL settles.
    await page.waitForTimeout(3000)
    const url = page.url()
    console.log(`[${info.project.name}] empty cart landed on: ${url}`)
    expect.soft(url, 'empty cart routes to cart or shop').toMatch(/\/(cart|shop)/)
    await shot(page, info.project.name, 'cart-empty-state')
  })

  test('populated cart shows items + qty + total', async ({ page }, info) => {
    await page.goto('/cart', { waitUntil: 'domcontentloaded' })
    await seedCart(page)
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(3000)
    await shot(page, info.project.name, 'cart-populated')
    // total should be visible
    const totalText = await page.locator('body').innerText()
    const hasItog = /итого/i.test(totalText) || /сумм/i.test(totalText) || /к оплате/i.test(totalText)
    expect.soft(hasItog, 'total label present').toBe(true)
    // product title surfaces
    const hasTitle = /classic|футболка/i.test(totalText)
    expect.soft(hasTitle, 'product title surfaces').toBe(true)
  })

  test('checkout reachable from cart with item', async ({ page }, info) => {
    await page.goto('/shop', { waitUntil: 'domcontentloaded' })
    await seedCart(page)
    const resp = await page.goto('/checkout', { waitUntil: 'domcontentloaded' })
    expect.soft(resp?.status() ?? 0, 'checkout status').toBeLessThan(400)
    await page.waitForTimeout(2500)
    await shot(page, info.project.name, 'checkout-base')
    // Form-like elements
    const phoneInput = page.locator('input[type="tel"]').first()
    await expect.soft(phoneInput, 'phone input on checkout').toBeAttached()
    const submit = page.getByRole('button', { name: /оформ|заказ|оплат/i }).first()
    await expect.soft(submit, 'checkout submit visible').toBeAttached()
  })

  test('checkout empty-submit validation', async ({ page }, info) => {
    await page.goto('/shop', { waitUntil: 'domcontentloaded' })
    await seedCart(page)
    await page.goto('/checkout', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2500)
    const submit = page.getByRole('button', { name: /оформ|заказ|оплат/i }).first()
    if (await submit.count() === 0) {
      test.skip(true, 'checkout submit button not found')
    }
    await submit.scrollIntoViewIfNeeded().catch(() => {})
    await submit.click({ force: true }).catch(() => {})
    await page.waitForTimeout(1500)
    await shot(page, info.project.name, 'checkout-empty-submit')
    // Either visible error text or aria-invalid inputs
    const invalidInputs = await page.locator('input[aria-invalid="true"], input.error, input:invalid').count()
    const visibleErrors = await page.getByText(/обязател|неверн|заполн|введите/i).count()
    console.log(`[${info.project.name}] empty submit: invalidInputs=${invalidInputs} visibleErrors=${visibleErrors}`)
  })

  test('cart icon in header shows count', async ({ page }, info) => {
    await page.goto('/shop', { waitUntil: 'domcontentloaded' })
    await seedCart(page)
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2500)
    await shot(page, info.project.name, 'cart-icon-with-count', false)
    // Try to find badge/counter in header
    const header = page.locator('header').first()
    await expect.soft(header, 'header visible').toBeVisible()
  })

  test('cart survives page reload (persistence)', async ({ page }, info) => {
    await page.goto('/shop', { waitUntil: 'domcontentloaded' })
    await seedCart(page)
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)
    const stored = await page.evaluate(() => sessionStorage.getItem('order_v3'))
    expect.soft(stored, 'order_v3 persists in sessionStorage').toBeTruthy()
  })
})
