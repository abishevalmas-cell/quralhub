import { test, expect } from '@playwright/test'

/** A white-background PNG with a coloured block in the middle */
function fixture(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const c = document.createElement('canvas')
    c.width = 200
    c.height = 200
    const ctx = c.getContext('2d')!
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, 200, 200)
    ctx.fillStyle = '#c0392b'
    ctx.fillRect(50, 60, 100, 90)
    return c.toDataURL('image/png')
  })
}

const readDoc = (page: import('@playwright/test').Page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem('myterior_collage_doc') ?? 'null'))

test.describe('Collage editor', () => {
  test('imports items, cuts out the background and exports a PNG', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', e => errors.push(String(e)))

    await page.goto('/collage')
    await expect(page.locator('h1')).toContainText('MyTerior')

    const dataUrl = await fixture(page)
    const buffer = Buffer.from(dataUrl.split(',')[1], 'base64')
    await page.setInputFiles('input[type=file][accept="image/*"][multiple]', [
      { name: 'sofa.png', mimeType: 'image/png', buffer },
      { name: 'lamp.png', mimeType: 'image/png', buffer },
    ])

    await expect(page.getByText('sofa')).toBeVisible({ timeout: 20000 })
    await expect(page.getByText('lamp')).toBeVisible()

    // Autosave is debounced; wait for it before reading the document
    await page.waitForTimeout(1500)
    const doc = await readDoc(page)
    expect(doc.items).toHaveLength(2)
    expect(doc.items[0].bgRemoved).toBe(true)
    // The white margin is gone, so the cutout is close to the 100x90 block
    expect(doc.items[0].naturalW).toBeLessThan(120)
    expect(doc.items[0].naturalH).toBeLessThan(110)

    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 20000 }),
      page.getByRole('button', { name: /Скачать коллаж|Суретті жүктеу/ }).click(),
    ])
    expect(download.suggestedFilename()).toMatch(/\.png$/)
    expect(errors).toEqual([])
  })

  test('auto-layout rearranges items and undo restores them', async ({ page }) => {
    await page.goto('/collage')
    const dataUrl = await fixture(page)
    const buffer = Buffer.from(dataUrl.split(',')[1], 'base64')
    await page.setInputFiles('input[type=file][accept="image/*"][multiple]', [
      { name: 'a.png', mimeType: 'image/png', buffer },
      { name: 'b.png', mimeType: 'image/png', buffer },
      { name: 'c.png', mimeType: 'image/png', buffer },
    ])
    await expect(page.getByText('c', { exact: true })).toBeVisible({ timeout: 20000 })
    await page.waitForTimeout(1500)

    const before = (await readDoc(page)).items.map((i: { x: number }) => Math.round(i.x))

    await page.getByRole('button', { name: /Рядами|Қатарлар/ }).click()
    await page.waitForTimeout(1500)
    const laid = (await readDoc(page)).items.map((i: { x: number }) => Math.round(i.x))
    expect(laid).not.toEqual(before)

    await page.getByTitle('Ctrl+Z').click()
    await page.waitForTimeout(1500)
    const undone = (await readDoc(page)).items.map((i: { x: number }) => Math.round(i.x))
    expect(undone).toEqual(before)
  })
})
