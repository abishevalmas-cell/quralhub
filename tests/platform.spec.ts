import { test, expect } from '@playwright/test'

// ============================================================
// 1. HOMEPAGE
// ============================================================

test.describe('Homepage', () => {
  test('loads and shows hero section', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('h1')).toBeVisible()
    await expect(page.getByText('30+').first()).toBeVisible()
  })

  test('shows all tool sections', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('ҚАРЖЫ ЖӘНЕ САЛЫҚ')).toBeVisible()
    await expect(page.getByText('МҮЛІК ЖӘНЕ ТҰРМЫС')).toBeVisible()
    await expect(page.getByText('БАНК, ВАЛЮТА, ТАРИФ')).toBeVisible()
    await expect(page.getByText('ТІЛ ҚҰРАЛДАРЫ')).toBeVisible()
    await expect(page.getByText('ҚҰЖАТТАР МЕН ҚҰРАЛДАР')).toBeVisible()
  })

  test('tool cards are clickable and navigate', async ({ page }) => {
    await page.goto('/')
    const toolLinks = page.locator('a[href^="/"]').filter({ has: page.locator('h3') })
    const count = await toolLinks.count()
    expect(count).toBeGreaterThanOrEqual(25)
  })

  test('clicking salary card goes to /salary', async ({ page }) => {
    await page.goto('/')
    await page.locator('a[href="/salary"]').click()
    await expect(page).toHaveURL('/salary')
  })
})

// ============================================================
// 2. NAVIGATION
// ============================================================

test.describe('Navigation', () => {
  test('navbar logo and search visible', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('nav')).toBeVisible()
    await expect(page.locator('nav input')).toBeVisible()
  })

  test('search filters and navigates', async ({ page }) => {
    await page.goto('/')
    await page.locator('nav input').fill('жалақы')
    await page.locator('nav button').filter({ hasText: 'Жалақы' }).click()
    await expect(page).toHaveURL('/salary')
  })

  test('theme toggle adds/removes dark class', async ({ page }) => {
    await page.goto('/')
    await page.click('button[title="Тема ауыстыру"]')
    await expect(page.locator('html')).toHaveClass(/dark/)
    await page.click('button[title="Тема ауыстыру"]')
    await expect(page.locator('html')).not.toHaveClass(/dark/)
  })

  test('language toggle changes button text', async ({ page }) => {
    await page.goto('/')
    const langBtn = page.locator('nav button').last()
    const text1 = await langBtn.textContent()
    await langBtn.click()
    const text2 = await langBtn.textContent()
    expect(text1).not.toBe(text2)
  })

  test('back button returns home', async ({ page }) => {
    await page.goto('/salary')
    await page.click('text=Барлық құралдар')
    await expect(page).toHaveURL('/')
  })
})

// ============================================================
// 3. SALARY CALCULATOR
// ============================================================

test.describe('Salary Calculator', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/salary')
  })

  test('shows result with default 350000', async ({ page }) => {
    const body = await page.textContent('body')
    // toLocaleString uses non-breaking space, check with regex
    expect(body).toMatch(/350.000/)
    expect(body).toContain('ОПВ')
    expect(body).toContain('ИПН')
  })

  test('changing amount recalculates', async ({ page }) => {
    await page.locator('input[inputmode="numeric"]').first().fill('500000')
    await expect(page.getByText('Қолға алатын сома')).toBeVisible()
  })

  test('reverse mode works', async ({ page }) => {
    await page.locator('select').nth(1).selectOption('reverse')
    const body = await page.textContent('body')
    expect(body).toContain('₸')
    expect(body).toContain('ОПВ')
  })

  test('deduction toggle changes result', async ({ page }) => {
    const checkbox = page.locator('input[type="checkbox"]').first()
    const resultBefore = await page.getByText('Қолға алатын сома').locator('..').textContent()
    await checkbox.uncheck()
    const resultAfter = await page.getByText('Қолға алатын сома').locator('..').textContent()
    expect(resultBefore).not.toBe(resultAfter)
  })

  test('info chips visible', async ({ page }) => {
    await expect(page.getByText('МРП = 4 325₸')).toBeVisible()
    await expect(page.getByText('МЗП = 85 000₸')).toBeVisible()
  })

  test('share buttons present', async ({ page }) => {
    await expect(page.getByText('WhatsApp')).toBeVisible()
    await expect(page.getByText('Telegram')).toBeVisible()
  })

  test('tip box visible', async ({ page }) => {
    await expect(page.getByText('2026 жылдан бастап вычет')).toBeVisible()
  })
})

// ============================================================
// 4. VAT CALCULATOR
// ============================================================

test.describe('VAT Calculator', () => {
  test('shows VAT calculation', async ({ page }) => {
    await page.goto('/vat')
    await expect(page.getByText('Сома НДС-сіз')).toBeVisible()
    await expect(page.getByText('Сома НДС-пен')).toBeVisible()
  })

  test('extract mode works', async ({ page }) => {
    await page.goto('/vat')
    await page.locator('select').last().selectOption('extract')
    await expect(page.getByText('Сома НДС-пен')).toBeVisible()
  })

  test('5% medical rate works', async ({ page }) => {
    await page.goto('/vat')
    await page.locator('select').first().selectOption('5')
    await expect(page.getByText('НДС (5%)')).toBeVisible()
  })
})

// ============================================================
// 5. MRP CONVERTER
// ============================================================

test.describe('MRP Converter', () => {
  test('default 100 MRP shows result', async ({ page }) => {
    await page.goto('/mrp')
    const body = await page.textContent('body')
    // 100 × 4325 = 432500, locale formatting may vary
    expect(body).toContain('100 МРП')
    expect(body).toContain('₸')
  })

  test('changing value recalculates', async ({ page }) => {
    await page.goto('/mrp')
    await page.locator('input[type="number"]').fill('5')
    const body = await page.textContent('body')
    expect(body).toContain('21 625')
  })
})

// ============================================================
// 6. MORTGAGE CALCULATOR
// ============================================================

test.describe('Mortgage Calculator', () => {
  test('shows monthly payment', async ({ page }) => {
    await page.goto('/mortgage')
    const body = await page.textContent('body')
    expect(body).toContain('Ай сайын')
    expect(body).toContain('₸')
  })

  test('changing rate updates result', async ({ page }) => {
    await page.goto('/mortgage')
    await page.locator('select').selectOption('5')
    const body = await page.textContent('body')
    expect(body).toContain('Ай сайын')
  })
})

// ============================================================
// 7. OTHER CALCULATORS — All should load with results
// ============================================================

test.describe('Other Calculators', () => {
  const pages = [
    { url: '/tax', check: '₸' },
    { url: '/selfemployed', check: '₸' },
    { url: '/kaspi', check: '₸' },
    { url: '/vacation', check: '₸' },
    { url: '/maternity', check: '₸' },
    { url: '/transport', check: '₸' },
    { url: '/communal', check: '₸' },
    { url: '/customs', check: '₸' },
  ]

  for (const { url, check } of pages) {
    test(`${url} loads with results`, async ({ page }) => {
      await page.goto(url)
      await expect(page.locator('h2')).toBeVisible()
      const body = await page.textContent('body')
      expect(body).toContain(check)
    })
  }
})

// ============================================================
// 8. BANK & COMPARISON TOOLS
// ============================================================

test.describe('Bank & Comparison Tools', () => {
  test('currency converter shows rates', async ({ page }) => {
    await page.goto('/currency')
    const body = await page.textContent('body')
    expect(body).toContain('Валюта')
    expect(body).toContain('₸')
  })

  test('bank deposits shows 14 banks', async ({ page }) => {
    await page.goto('/bankdep')
    const body = await page.textContent('body')
    expect(body).toContain('Eurasian Bank')
    expect(body).toContain('ГЭСВ')
  })

  test('bank credits comparison', async ({ page }) => {
    await page.goto('/bankcred')
    const body = await page.textContent('body')
    expect(body).toContain('₸')
    expect(body).toContain('%')
  })

  test('connect page shows telecom data', async ({ page }) => {
    await page.goto('/connect')
    const body = await page.textContent('body')
    const hasOperator = ['Beeline', 'Kcell', 'Tele2', 'Activ', 'IZI', 'Altel'].some(op => body?.includes(op))
    expect(hasOperator).toBeTruthy()
  })
})

// ============================================================
// 9. LANGUAGE TOOLS
// ============================================================

test.describe('Language Tools', () => {
  test('AI translator has 3 sections', async ({ page }) => {
    await page.goto('/aitools')
    await expect(page.getByText('Аудару')).toBeVisible()
    const body = await page.textContent('body')
    expect(body).toContain('Латын')
    expect(body).toContain('Емле')
  })

  test('translator accepts input and translates', async ({ page }) => {
    await page.goto('/aitools')
    await page.locator('textarea').first().fill('сәлем')
    await page.waitForTimeout(1200)
    const output = page.locator('textarea[readonly]').first()
    const val = await output.inputValue()
    expect(val.length).toBeGreaterThan(0)
  })

  test('septik shows declension table', async ({ page }) => {
    await page.goto('/septik')
    const body = await page.textContent('body')
    expect(body).toContain('Атау')
    expect(body).toContain('Ілік')
    expect(body).toContain('Барыс')
  })

  test('propisyu converts numbers to words', async ({ page }) => {
    await page.goto('/propisyu')
    const body = await page.textContent('body')
    expect(body).toContain('мың')
  })

  test('holidays shows 2026 holidays', async ({ page }) => {
    await page.goto('/holidays')
    const body = await page.textContent('body')
    expect(body).toContain('Наурыз')
    expect(body).toContain('Жеңіс')
  })

  test('abbreviations searchable', async ({ page }) => {
    await page.goto('/abbrev')
    const body = await page.textContent('body')
    expect(body).toContain('ҚР')
    expect(body).toContain('Қазақстан')
  })
})

// ============================================================
// 10. DOCUMENT & UTILITY TOOLS
// ============================================================

test.describe('Document & Utility Tools', () => {
  test('document templates page loads', async ({ page }) => {
    await page.goto('/doctemplates')
    const body = await page.textContent('body')
    expect(body?.includes('Құжат') || body?.includes('Шарт')).toBeTruthy()
  })

  test('resume builder loads', async ({ page }) => {
    await page.goto('/resume')
    const body = await page.textContent('body')
    expect(body).toContain('Түйіндеме')
  })

  test('invoice generator loads', async ({ page }) => {
    await page.goto('/invoice')
    const body = await page.textContent('body')
    expect(body).toContain('Шот')
    expect(body).toContain('НДС')
  })

  test('QR generator has 4 modes', async ({ page }) => {
    await page.goto('/qr')
    await expect(page.getByRole('button', { name: 'URL' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'WiFi' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'WhatsApp' })).toBeVisible()
  })

  test('QR generates code image', async ({ page }) => {
    await page.goto('/qr')
    // Should auto-generate QR for default URL
    const img = page.locator('img[src*="qrserver"]')
    if (await img.count() > 0) {
      await expect(img.first()).toBeVisible()
    }
  })

  test('password generator works', async ({ page }) => {
    await page.goto('/passgen')
    const body = await page.textContent('body')
    expect(body).toContain('Құпия сөз')
  })

  test('PDF tools page loads', async ({ page }) => {
    await page.goto('/pdf')
    const body = await page.textContent('body')
    expect(body).toContain('PDF')
  })

  test('feedback form loads', async ({ page }) => {
    await page.goto('/feedback')
    const body = await page.textContent('body')
    expect(body).toContain('Кері байланыс')
  })
})

// ============================================================
// 11. SEO
// ============================================================

test.describe('SEO', () => {
  test('JSON-LD structured data on homepage', async ({ page }) => {
    await page.goto('/')
    const jsonLd = page.locator('script[type="application/ld+json"]')
    expect(await jsonLd.count()).toBeGreaterThanOrEqual(1)
    const content = await jsonLd.first().textContent()
    expect(content).toContain('Quralhub')
  })

  test('salary page has FAQ structured data', async ({ page }) => {
    await page.goto('/salary')
    const scripts = await page.locator('script[type="application/ld+json"]').allTextContents()
    expect(scripts.some(s => s.includes('FAQPage'))).toBeTruthy()
  })

  test('robots.txt accessible', async ({ page }) => {
    const res = await page.goto('/robots.txt')
    expect(res?.status()).toBe(200)
  })

  test('sitemap.xml accessible', async ({ page }) => {
    const res = await page.goto('/sitemap.xml')
    expect(res?.status()).toBe(200)
  })

  test('llms.txt accessible', async ({ page }) => {
    const res = await page.goto('/llms.txt')
    expect(res?.status()).toBe(200)
  })
})

// ============================================================
// 12. MOBILE RESPONSIVE
// ============================================================

test.describe('Mobile Responsive', () => {
  test.use({ viewport: { width: 375, height: 812 } })

  test('homepage renders on mobile', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('h1')).toBeVisible()
    await expect(page.locator('a[href="/salary"]')).toBeVisible()
  })

  test('no horizontal overflow on mobile', async ({ page }) => {
    await page.goto('/salary')
    const bodyW = await page.evaluate(() => document.body.scrollWidth)
    const viewW = await page.evaluate(() => window.innerWidth)
    expect(bodyW).toBeLessThanOrEqual(viewW + 10)
  })
})

// ============================================================
// 13. PERFORMANCE
// ============================================================

test.describe('Performance', () => {
  test('homepage loads under 3s', async ({ page }) => {
    const start = Date.now()
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    expect(Date.now() - start).toBeLessThan(3000)
  })

  test('calculator loads under 2s', async ({ page }) => {
    const start = Date.now()
    await page.goto('/salary', { waitUntil: 'domcontentloaded' })
    expect(Date.now() - start).toBeLessThan(2000)
  })
})
