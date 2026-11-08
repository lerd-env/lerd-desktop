'use strict'

// Property tests: fast-check feeds each function a few hundred generated inputs
// and shrinks any failure to the smallest one that still breaks the rule.

const test = require('node:test')
const assert = require('node:assert')
const fc = require('fast-check')
const { navigation, isDashboard, DASHBOARD_ORIGIN } = require('../src/navigation')
const { normalize, MIN_WIDTH, MIN_HEIGHT } = require('../src/windowstate')
const { parseVersion } = require('../src/detect')

// URLs the window could be asked to load: web, file, the dashboard and look-alikes.
const urls = fc.oneof(
  fc.webUrl({ withQueryParameters: true, withFragments: true }),
  fc.webPath().map((p) => DASHBOARD_ORIGIN + p),
  fc.string().map((s) => DASHBOARD_ORIGIN + s),
  fc.string().map((s) => 'file:///' + encodeURI(s)),
  fc.constantFrom('http://127.0.0.1:7073@evil.example/', 'http://127.0.0.1:70730/', 'http://127.0.0.1:7073.evil.example/')
)

test('navigation only lets the window load the dashboard or a local file', () => {
  fc.assert(
    fc.property(urls, (url) => {
      let parsed
      try {
        parsed = new URL(url)
      } catch {
        return
      }
      if (navigation(url) === 'allow') {
        assert.ok(parsed.origin === DASHBOARD_ORIGIN || parsed.protocol === 'file:', url)
      }
    })
  )
})

test('isDashboard never throws and holds only for the dashboard origin', () => {
  fc.assert(
    fc.property(fc.oneof(urls, fc.string()), (url) => {
      let origin = null
      try {
        origin = new URL(url).origin
      } catch {}
      assert.strictEqual(isDashboard(url), origin === DASHBOARD_ORIGIN)
    })
  )
})

const area = fc.record({
  x: fc.integer({ min: -5000, max: 5000 }),
  y: fc.integer({ min: -5000, max: 5000 }),
  width: fc.integer({ min: 1, max: 8000 }),
  height: fc.integer({ min: 1, max: 8000 }),
})

// Shaped like the file the app writes, with any key missing and any value off:
// fractions, negatives, NaN, Infinity or not a number at all.
const anyNumber = fc.oneof(fc.double(), fc.integer(), fc.anything())
const savedState = fc.record(
  { width: anyNumber, height: anyNumber, x: anyNumber, y: anyNumber, maximized: fc.anything() },
  { requiredKeys: [] }
)

test('a saved window state, whatever it holds, opens a usable window', () => {
  fc.assert(
    fc.property(fc.oneof(savedState, fc.anything()), fc.array(area, { maxLength: 3 }), (saved, workAreas) => {
      const s = normalize(saved, workAreas)
      assert.ok(Number.isInteger(s.width) && s.width >= MIN_WIDTH)
      assert.ok(Number.isInteger(s.height) && s.height >= MIN_HEIGHT)
      assert.strictEqual(typeof s.maximized, 'boolean')
      if ('x' in s || 'y' in s) {
        assert.ok(Number.isInteger(s.x) && Number.isInteger(s.y))
        const onScreen = workAreas.some(
          (a) => s.x < a.x + a.width && s.x + s.width > a.x && s.y < a.y + a.height && s.y + s.height > a.y
        )
        assert.ok(onScreen, 'a position is only kept when it is on a display')
      }
    })
  )
})

test('parseVersion never throws and always answers with a string', () => {
  fc.assert(
    fc.property(fc.oneof(fc.string(), fc.json(), fc.jsonValue().map((v) => JSON.stringify({ current: v }))), (body) => {
      assert.strictEqual(typeof parseVersion(body), 'string')
    })
  )
})
