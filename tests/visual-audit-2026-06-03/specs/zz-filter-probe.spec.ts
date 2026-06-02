import { test, expect } from '@playwright/test'

// Targeted probe to confirm whether the client-side filter actually works.
// Hypothesis: SSR ignores ?category=, ?type=, ?priceSort= and ProductFilterComp
// re-renders on the client. After hydration the count should reflect the filter.
const CASES = [
  { q: '?category=accesorize', expectMin: 8, expectMax: 11, label: 'accesorize' },
  { q: '?category=kids', expectMin: 2, expectMax: 2, label: 'kids' },
  { q: '?category=accesorize&type=tshirt', expectMin: 0, expectMax: 0, label: 'accesorize+tshirt empty' },
  { q: '?type=hoodie', expectMin: 3, expectMax: 3, label: 'hoodie' },
]

for (const c of CASES) {
  test(`filter probe ${c.label}`, async ({ page }) => {
    await page.goto(`/shop${c.q}`, { waitUntil: 'domcontentloaded' })
    // Wait long enough for hydration + filter useEffect + re-render
    await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {})
    await page.waitForTimeout(3000)
    // Trigger scroll to load all cards (PAGE_SIZE=8 paginated, but filtered set may be smaller)
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await page.waitForTimeout(1500)
    await page.evaluate(() => window.scrollTo(0, 0))

    const count = await page.locator('a[href^="/shop/"]').evaluateAll(els =>
      Array.from(new Set(els.map(e => (e as HTMLAnchorElement).getAttribute('href')!).filter(Boolean))).length
    )
    console.log(`[filter probe] ${c.q} → ${count} (expect ${c.expectMin}..${c.expectMax})`)
    expect.soft(count, `${c.label}: count`).toBeGreaterThanOrEqual(c.expectMin)
    expect.soft(count, `${c.label}: count`).toBeLessThanOrEqual(c.expectMax)
  })
}
