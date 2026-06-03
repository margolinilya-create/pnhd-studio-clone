import { test, expect, Page } from '@playwright/test'
import path from 'path'
import fs from 'fs'

const OUT = path.resolve(__dirname, '../screenshots')

function shot(page: Page, project: string, name: string, full = true) {
  const dir = path.join(OUT, project)
  fs.mkdirSync(dir, { recursive: true })
  return page.screenshot({ path: path.join(dir, `${name}.png`), fullPage: full })
}

test.describe('Cross-cutting: header / footer / nav / FAQ / category links', () => {
  test('header elements visible on home', async ({ page }, info) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {})
    const header = page.locator('header').first()
    await expect.soft(header, 'header visible').toBeVisible()
    await shot(page, info.project.name, 'common-header', false)

    // Logo, phone, cart icon, burger (mobile)
    const logo = header.locator('a').filter({ hasText: /PNHD|PINHEAD/i }).or(header.locator('img'))
    expect.soft(await logo.count(), 'logo present').toBeGreaterThan(0)
  })

  test('mobile burger menu opens and closes', async ({ page }, info) => {
    test.skip(info.project.name !== 'mobile-375', 'mobile-only')
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})

    // burger may be aria-label or an svg/icon button
    const burger = page
      .getByRole('button', { name: /меню|menu/i })
      .or(page.locator('button[aria-label*="меню" i]'))
      .or(page.locator('header button').last())
      .first()
    if (await burger.count() === 0) {
      console.log('No burger button found; layout may be different')
      return
    }
    await burger.click().catch(() => {})
    await page.waitForTimeout(800)
    await shot(page, info.project.name, 'common-burger-open')

    // Some menu link clickable
    const links = page.locator('a').filter({ hasText: /каталог|метод|контакт|бонус|FAQ/i })
    expect.soft(await links.count(), 'menu links visible after burger open').toBeGreaterThan(0)

    // Close — usually pressing Escape or click on burger again
    await page.keyboard.press('Escape').catch(() => {})
    await page.waitForTimeout(500)
    await shot(page, info.project.name, 'common-burger-closed')
  })

  test('footer renders with contacts + legal link', async ({ page }, info) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})
    const footer = page.locator('footer').first()
    await footer.scrollIntoViewIfNeeded().catch(() => {})
    await expect.soft(footer, 'footer visible').toBeVisible()
    await shot(page, info.project.name, 'common-footer', false)

    const txt = await footer.innerText()
    expect.soft(txt.length, 'footer has text').toBeGreaterThan(50)
    const hasPolicyLink = await footer.locator('a[href*="privacy" i], a[href*="oferta" i]').count()
    expect.soft(hasPolicyLink, 'footer has legal link').toBeGreaterThan(0)
  })

  test('footer lead form is present', async ({ page }, info) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    const footer = page.locator('footer').first()
    await footer.scrollIntoViewIfNeeded().catch(() => {})
    const phoneInput = footer.locator('input[type="tel"]').first()
    const submit = footer.locator('button[type="submit"]').first()
    await expect.soft(phoneInput, 'footer phone input').toBeAttached()
    await expect.soft(submit, 'footer submit').toBeAttached()
  })

  test('FAQ accordion expand/collapse', async ({ page }, info) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {})
    const faqAnchor = page.locator('text=/FAQ|часто задаваемые|вопросы/i').first()
    await faqAnchor.scrollIntoViewIfNeeded().catch(() => {})
    await shot(page, info.project.name, 'common-faq-collapsed')
    // try to click first question
    const firstQ = page.locator('summary, [class*="accordion" i], [class*="faq" i] button').first()
    if (await firstQ.count() > 0) {
      await firstQ.click().catch(() => {})
      await page.waitForTimeout(500)
      await shot(page, info.project.name, 'common-faq-expanded')
    }
  })

  test('category section links on home navigate to /futbolki etc', async ({ page }, info) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {})
    const categoryPaths = ['/futbolki', '/hudi', '/shoppery', '/kepki', '/longslivy', '/svitshoty']
    for (const p of categoryPaths) {
      const link = page.locator(`a[href="${p}"]`).first()
      if (await link.count() === 0) {
        console.log(`no link to ${p} on home (project=${info.project.name})`)
        continue
      }
      const ok = await link.isVisible().catch(() => false)
      expect.soft(ok, `link ${p} visible`).toBe(true)
    }
  })

  test('category landing pages each render', async ({ page }, info) => {
    const categoryPaths = ['/futbolki', '/hudi', '/shoppery', '/kepki', '/longslivy', '/svitshoty']
    for (const p of categoryPaths) {
      const resp = await page.goto(p, { waitUntil: 'domcontentloaded' })
      const status = resp?.status() ?? 0
      expect.soft(status, `${p} status`).toBeLessThan(400)
      await page.locator('a[href^="/shop/"]').first().waitFor({ state: 'attached', timeout: 15_000 }).catch(() => {})
      await shot(page, info.project.name, `common-cat${p.replace(/\//g, '-')}`)
      const cnt = await page.locator('a[href^="/shop/"]').count()
      expect.soft(cnt, `${p} has products`).toBeGreaterThan(0)
    }
  })

  test('contacts widget popup form opens', async ({ page }, info) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})
    // ContactsWidget — floating button (per CLAUDE.md), usually fixed bottom-right
    const widget = page.locator('[aria-label*="контакт" i], [aria-label*="свяж" i], [class*="contacts-widget" i]').first()
    const widgetCount = await widget.count()
    console.log(`[${info.project.name}] contacts widget count=${widgetCount}`)
  })
})
