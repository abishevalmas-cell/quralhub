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
    expect(doc.items[0].cutoutMethod).toBe('subject')
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

  test('detects the subject on every kind of background', async ({ page }) => {
    await page.goto('/collage')

    // Each fixture is the same object over a different backdrop
    const fixtures = await page.evaluate(() => {
      const make = (paint: (ctx: CanvasRenderingContext2D) => void, opaque = true) => {
        const c = document.createElement('canvas')
        c.width = 300
        c.height = 300
        const ctx = c.getContext('2d')!
        if (opaque) {
          ctx.fillStyle = '#ffffff'
          ctx.fillRect(0, 0, 300, 300)
        }
        paint(ctx)
        return c.toDataURL('image/png')
      }
      const object = (ctx: CanvasRenderingContext2D) => {
        ctx.fillStyle = '#2e5d4b'
        ctx.beginPath()
        ctx.roundRect(90, 80, 120, 150, 20)
        ctx.fill()
        ctx.fillStyle = '#c99b3f'
        ctx.fillRect(120, 110, 60, 40)
      }
      return {
        white: make(object),
        colored: make(ctx => { ctx.fillStyle = '#b8c9d9'; ctx.fillRect(0, 0, 300, 300); object(ctx) }),
        gradient: make(ctx => {
          const g = ctx.createLinearGradient(0, 0, 0, 300)
          g.addColorStop(0, '#efe6d8')
          g.addColorStop(1, '#9c8f7c')
          ctx.fillStyle = g
          ctx.fillRect(0, 0, 300, 300)
          object(ctx)
        }),
        dark: make(ctx => { ctx.fillStyle = '#1b1b1f'; ctx.fillRect(0, 0, 300, 300); object(ctx) }),
        transparent: make(object, false),
        touching: make(ctx => {
          ctx.fillStyle = '#f2f2f2'
          ctx.fillRect(0, 0, 300, 300)
          ctx.fillStyle = '#7a4b32'
          ctx.fillRect(0, 60, 220, 240)
        }),
        watermark: make(ctx => {
          object(ctx)
          ctx.fillStyle = '#999999'
          ctx.font = '16px sans-serif'
          ctx.fillText('marketplace.com', 10, 290)
        }),
      }
    })

    const names = Object.keys(fixtures)
    await page.setInputFiles('input[type=file][accept="image/*"][multiple]',
      names.map(n => ({
        name: `${n}.png`,
        mimeType: 'image/png',
        buffer: Buffer.from((fixtures as Record<string, string>)[n].split(',')[1], 'base64'),
      })))
    await expect(page.getByText('watermark')).toBeVisible({ timeout: 30000 })
    await page.waitForTimeout(1500)

    const doc = await readDoc(page)
    const report = await page.evaluate(async (items: { name: string; src: string }[]) => {
      const out: { name: string; w: number; h: number; centreAlpha: number }[] = []
      for (const it of items) {
        const img = new Image()
        await new Promise(r => { img.onload = r; img.src = it.src })
        const c = document.createElement('canvas')
        c.width = img.naturalWidth
        c.height = img.naturalHeight
        const ctx = c.getContext('2d')!
        ctx.drawImage(img, 0, 0)
        const d = ctx.getImageData(0, 0, c.width, c.height).data
        const mid = ((((c.height / 2) | 0) * c.width) + ((c.width / 2) | 0)) * 4
        out.push({ name: it.name, w: c.width, h: c.height, centreAlpha: d[mid + 3] })
      }
      return out
    }, doc.items.map((i: { name: string; src: string }) => ({ name: i.name, src: i.src })))

    const method = (name: string) =>
      doc.items.find((i: { name: string }) => i.name === name).cutoutMethod

    for (const r of report) {
      // The object itself must never be eaten
      expect(r.centreAlpha, `${r.name}: object was erased`).toBeGreaterThan(200)
      // …and the background must be gone, so the crop is tight around it
      expect(r.w, `${r.name}: not cropped`).toBeLessThan(260)
      expect(r.h, `${r.name}: not cropped`).toBeLessThan(280)
    }

    expect(method('transparent')).toBe('alpha')
    for (const n of ['white', 'colored', 'gradient', 'dark', 'touching', 'watermark']) {
      expect(method(n), n).toBe('subject')
    }
  })

  test('the eraser clears a background the automatic pass cannot read', async ({ page }) => {
    await page.goto('/collage')

    // Import with the automatic pass off, so only the eraser acts
    await page.getByText(/Убирать фон при загрузке|Жүктегенде фонды алу/).click()

    const fixture = await page.evaluate(() => {
      const c = document.createElement('canvas')
      c.width = 300
      c.height = 300
      const ctx = c.getContext('2d')!
      ctx.fillStyle = '#1f6feb'
      ctx.fillRect(0, 0, 300, 300)
      ctx.fillStyle = '#2e5d4b'
      ctx.beginPath()
      ctx.roundRect(90, 90, 120, 150, 18)
      ctx.fill()
      return c.toDataURL('image/png')
    })

    await page.setInputFiles('input[type=file][accept="image/*"][multiple]', [
      { name: 'room.png', mimeType: 'image/png', buffer: Buffer.from(fixture.split(',')[1], 'base64') },
    ])
    await expect(page.getByText('room')).toBeVisible({ timeout: 20000 })
    await page.waitForTimeout(1500)

    const clearPct = async () => {
      const doc = await readDoc(page)
      return page.evaluate(async (src: string) => {
        const img = new Image()
        await new Promise(r => { img.onload = r; img.src = src })
        const c = document.createElement('canvas')
        c.width = img.naturalWidth
        c.height = img.naturalHeight
        const ctx = c.getContext('2d')!
        ctx.drawImage(img, 0, 0)
        const d = ctx.getImageData(0, 0, c.width, c.height).data
        let clear = 0
        for (let i = 3; i < d.length; i += 4) if (d[i] < 20) clear++
        return Math.round((clear / (c.width * c.height)) * 100)
      }, doc.items[0].src)
    }

    expect(await clearPct()).toBeLessThan(2)

    await page.getByRole('button', { name: /Стереть фон кликом|Фонды өшіру/ }).click()
    await page.locator('section .relative.flex').first()
      .evaluate(el => el.scrollIntoView({ block: 'center' }))
    await page.waitForTimeout(400)

    const item = page.locator('img[alt="room"]')
    const b = (await item.boundingBox())!
    await page.mouse.click(b.x + b.width * 0.08, b.y + b.height * 0.08)
    await page.waitForTimeout(2000)

    expect(await clearPct()).toBeGreaterThan(40)
  })
})
