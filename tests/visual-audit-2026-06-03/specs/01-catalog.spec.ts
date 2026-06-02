import { test, expect, Page } from '@playwright/test'
import path from 'path'
import fs from 'fs'

const OUT = path.resolve(__dirname, '../screenshots')

function shot(page: Page, project: string, name: string, opts: { full?: boolean } = {}) {
  const dir = path.join(OUT, project)
  fs.mkdirSync(dir, { recursive: true })
  return page.screenshot({
    path: path.join(dir, `${name}.png`),
    fullPage: opts.full ?? true,
  })
}

async function gotoShop(page: Page, query = '') {
  const url = `/shop${query}`
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await page.locator('a[href*="/shop/"]').first().waitFor({ state: 'attached', timeout: 20_000 }).catch(() => {})
  await page.waitForLoadState('networkidle', { timeout: 25_000 }).catch(() => {})
}

// ProductCardsBlock uses IntersectionObserver pagination (PAGE_SIZE=8).
// Scroll to load all cards before counting.
async function scrollLoadAll(page: Page) {
  let prev = 0
  for (let i = 0; i < 8; i++) {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await page.waitForTimeout(800)
    const cur = await page.locator('a[href^="/shop/"]').count()
    if (cur === prev) break
    prev = cur
  }
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.waitForTimeout(300)
}

const PROJECTS_INTERACTIVE = ['mobile-375', 'tablet-768', 'desktop-1280']

test.describe('Catalog /shop', () => {
  test('base render + breadcrumbs + product count', async ({ page }, info) => {
    await gotoShop(page)
    await shot(page, info.project.name, 'catalog-base')

    // Breadcrumbs
    const breadcrumbs = page.locator('text=Главная').first()
    await expect.soft(breadcrumbs, 'breadcrumb "Главная" visible').toBeVisible()
    const breadcrumbsCatalog = page.getByText('Каталог').first()
    await expect.soft(breadcrumbsCatalog).toBeVisible()

    // Product cards
    const productLinks = page.locator('a[href^="/shop/"]')
    const cardCount = await productLinks.count()
    // Expected ≥ 20 per CLAUDE.md (25 imported). If lower → potential bug:
    // either products are missing 'b2c' channel or status≠'published'.
    expect.soft(cardCount, 'product card link count (expect 25 per CLAUDE.md)').toBeGreaterThanOrEqual(20)

    // H1
    await expect.soft(page.locator('h1')).toContainText(/Каталог/i)
  })

  test('each category filter applied independently', async ({ page }, info) => {
    const cats = [
      { value: 'man', label: 'Мужское' },
      { value: 'woman', label: 'Женское' },
      { value: 'kids', label: 'Детское' },
      { value: 'accesorize', label: 'Аксессуары' },
    ]
    for (const c of cats) {
      await gotoShop(page, `?category=${c.value}`)
      const pill = page.getByRole('button', { name: c.label }).first()
      await expect.soft(pill, `category pill "${c.label}" visible`).toBeVisible()
      await expect.soft(pill, `category pill "${c.label}" active`).toHaveAttribute('aria-pressed', 'true')
      await shot(page, info.project.name, `catalog-cat-${c.value}`)
    }
  })

  test('each type filter applied independently', async ({ page }, info) => {
    const types = [
      { value: 'tshirt', label: 'Футболка' },
      { value: 'longsleeve', label: 'Лонгслив' },
      { value: 'sweatshirt', label: 'Свитшот' },
      { value: 'hoodie', label: 'Худи' },
      { value: 'totebag', label: 'Шоппер' },
      { value: 'cap', label: 'Кепка' },
    ]
    for (const t of types) {
      await gotoShop(page, `?type=${t.value}`)
      const pill = page.getByRole('button', { name: t.label }).first()
      await expect.soft(pill, `type pill "${t.label}" visible`).toBeVisible()
      await expect.soft(pill, `type pill "${t.label}" active`).toHaveAttribute('aria-pressed', 'true')
      const productLinks = page.locator('a[href^="/shop/"]')
      const cnt = await productLinks.count()
      expect.soft(cnt, `non-zero products for type=${t.value}`).toBeGreaterThan(0)
      await shot(page, info.project.name, `catalog-type-${t.value}`)
    }
  })

  test('combined filter category=kids + type=tshirt non-empty', async ({ page }, info) => {
    await gotoShop(page, '?category=kids&type=tshirt')
    const links = page.locator('a[href^="/shop/"]')
    const cnt = await links.count()
    expect.soft(cnt, 'kids+tshirt non-empty').toBeGreaterThan(0)
    await shot(page, info.project.name, 'catalog-combo-kids-tshirt')
  })

  test('empty combinations render gracefully', async ({ page }, info) => {
    // accesorize + tshirt should be empty (no accessory tshirts)
    for (const q of ['?category=accesorize&type=tshirt', '?category=kids&type=hoodie', '?category=kids&type=cap']) {
      await gotoShop(page, q)
      await shot(page, info.project.name, `catalog-empty${q.replace(/[?&=]/g, '_')}`)
      const linksCount = await page.locator('a[href^="/shop/"]').count()
      // empty grid should not break layout — verify h1 + filter group still rendered
      await expect.soft(page.locator('h1')).toBeVisible()
      await expect.soft(page.locator('[role="group"]')).toBeVisible()
      // Document if empty placeholder is missing entirely
      const hasHints = await page
        .getByText(/ничего не найдено|пуст|подбер[её]м|не нашл/i)
        .count()
      console.log(`[empty ${q}] cards=${linksCount} hints=${hasHints}`)
    }
  })

  test('sort ASC and DESC + toggle off', async ({ page }, info) => {
    await gotoShop(page, '?priceSort=ASC')
    const ascPill = page.getByRole('button', { name: /по возрастанию/i })
    await expect.soft(ascPill, 'ASC pill active').toHaveAttribute('aria-pressed', 'true')
    await shot(page, info.project.name, 'catalog-sort-asc')

    await gotoShop(page, '?priceSort=DESC')
    const descPill = page.getByRole('button', { name: /по убыванию/i })
    await expect.soft(descPill, 'DESC pill active').toHaveAttribute('aria-pressed', 'true')
    await shot(page, info.project.name, 'catalog-sort-desc')

    // Toggle off via click
    await descPill.click()
    await page.waitForURL(/\/shop(\?|$)(?!.*priceSort)/, { timeout: 10_000 }).catch(() => {})
    await shot(page, info.project.name, 'catalog-sort-desc-toggled-off')
  })

  test('reset button clears filters', async ({ page }, info) => {
    await gotoShop(page, '?category=man&type=tshirt&priceSort=ASC')
    const reset = page.getByRole('button', { name: /сбросить/i })
    await expect.soft(reset, 'reset visible').toBeVisible()
    await reset.click()
    await page.waitForURL(url => url.pathname === '/shop' && url.search === '', { timeout: 10_000 }).catch(() => {})
    await shot(page, info.project.name, 'catalog-after-reset')
    // No pills active
    const activePills = await page.locator('button[aria-pressed="true"]').count()
    expect.soft(activePills, 'no active pills after reset').toBe(0)
  })

  test('NoModel block visible at bottom with form fields', async ({ page }, info) => {
    await gotoShop(page)
    const noModelHeading = page.getByText(/не нашли|нет нужн|свой запрос/i).first()
    await noModelHeading.scrollIntoViewIfNeeded().catch(() => {})
    await shot(page, info.project.name, 'catalog-no-model-block')
    const nameInput = page.locator('input[name="name"], input[placeholder*="Имя" i]').first()
    const phoneInput = page.locator('input[type="tel"]').first()
    const checkbox = page.locator('input[type="checkbox"]').first()
    const submit = page.locator('button[type="submit"]').first()
    await expect.soft(nameInput, 'name input').toBeVisible()
    await expect.soft(phoneInput, 'phone input').toBeVisible()
    await expect.soft(checkbox, 'agreement checkbox').toBeAttached()
    await expect.soft(submit, 'submit button').toBeVisible()
  })

  test('filter state persists in URL after back-nav', async ({ page }, info) => {
    await gotoShop(page, '?category=man&type=tshirt')
    const firstProduct = page.locator('a[href^="/shop/"]').first()
    const href = await firstProduct.getAttribute('href')
    await firstProduct.click()
    await page.waitForLoadState('domcontentloaded')
    await page.goBack({ waitUntil: 'domcontentloaded' })
    await page.locator('a[href^="/shop/"]').first().waitFor({ state: 'attached', timeout: 20_000 }).catch(() => {})
    const url = new URL(page.url())
    expect.soft(url.searchParams.get('category'), 'category preserved after back-nav').toBe('man')
    expect.soft(url.searchParams.get('type'), 'type preserved after back-nav').toBe('tshirt')
    await shot(page, info.project.name, 'catalog-after-backnav')
  })

  test('horizontal-scroll regression check (no x-overflow)', async ({ page }, info) => {
    await gotoShop(page)
    const overflow = await page.evaluate(() => {
      const docW = document.documentElement.scrollWidth
      const winW = window.innerWidth
      return { docW, winW, diff: docW - winW }
    })
    console.log(`[${info.project.name}] page width=${overflow.docW} viewport=${overflow.winW} diff=${overflow.diff}`)
    expect.soft(overflow.diff, 'no horizontal overflow').toBeLessThanOrEqual(2)
  })
})

