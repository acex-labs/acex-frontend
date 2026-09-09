import { chromium } from 'playwright'

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } })
await page.goto('http://localhost:5173/maptest.html', { waitUntil: 'networkidle' }).catch(() => {})
await page.waitForSelector('.leaflet-container', { timeout: 20000 })
await page.waitForTimeout(2500)

const report = await page.evaluate(() => {
  const probe = (x, y) => {
    const stack = document.elementsFromPoint(x, y).map(el =>
      (typeof el.className === 'string' ? el.className : el.tagName).slice(0, 70)
    )
    const overlayIdx = stack.findIndex(c => c.includes('bg-black/60'))
    const leafletIdx = stack.findIndex(c => c.includes('leaflet'))
    return { overlayIdx, leafletIdx, bug: leafletIdx !== -1 && (overlayIdx === -1 || leafletIdx < overlayIdx), top5: stack.slice(0, 5) }
  }
  const wrapper = document.querySelector('#map-new > div')
  return {
    isolationOnWrapper: wrapper ? getComputedStyle(wrapper).isolation : 'NO-WRAPPER',
    overOldMap:    probe(window.innerWidth * 0.25, 200),
    overFixedMap:  probe(window.innerWidth * 0.74, 200),
    overModalCard: probe(window.innerWidth / 2, window.innerHeight / 2),
  }
})
console.log(JSON.stringify(report, null, 2))
await page.screenshot({ path: '/var/folders/3_/nggf6pzs1fs1qdhq2k7y9xfc0000gn/T/opencode/mapz.png' })
await browser.close()
