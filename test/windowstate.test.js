'use strict'

const test = require('node:test')
const assert = require('node:assert')
const fs = require('node:fs')
const path = require('node:path')
const {
  normalize,
  read,
  write,
  DEFAULT_WIDTH,
  DEFAULT_HEIGHT,
  MIN_WIDTH,
  MIN_HEIGHT,
} = require('../src/windowstate')

const ONE_SCREEN = [{ x: 0, y: 0, width: 1920, height: 1080 }]
const DEFAULTS = { width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT, maximized: false }

test('normalize falls back to the default size when there is nothing usable', () => {
  assert.deepStrictEqual(normalize(null, ONE_SCREEN), DEFAULTS)
  assert.deepStrictEqual(normalize('not an object', ONE_SCREEN), DEFAULTS)
  assert.deepStrictEqual(normalize({}, ONE_SCREEN), DEFAULTS)
  assert.deepStrictEqual(normalize({ width: 'wide', height: null }, ONE_SCREEN), DEFAULTS)
})

test('normalize keeps a saved size and position that still fit a display', () => {
  const state = normalize({ x: 200, y: 100, width: 1500, height: 950 }, ONE_SCREEN)
  assert.deepStrictEqual(state, { x: 200, y: 100, width: 1500, height: 950, maximized: false })
})

test('normalize clamps a size below the window minimums', () => {
  const state = normalize({ width: 400, height: 300 }, ONE_SCREEN)
  assert.strictEqual(state.width, MIN_WIDTH)
  assert.strictEqual(state.height, MIN_HEIGHT)
})

test('normalize drops a position no display can show and keeps the size', () => {
  const state = normalize({ x: 9000, y: 9000, width: 1150, height: 720 }, ONE_SCREEN)
  assert.strictEqual(state.width, 1150)
  assert.strictEqual(state.height, 720)
  assert.strictEqual(state.x, undefined)
  assert.strictEqual(state.y, undefined)
})

test('normalize keeps a position on a second display', () => {
  const twoScreens = ONE_SCREEN.concat([{ x: 1920, y: 0, width: 2560, height: 1440 }])
  const state = normalize({ x: 2400, y: 300, width: 1400, height: 900 }, twoScreens)
  assert.strictEqual(state.x, 2400)
  assert.strictEqual(state.y, 300)
})

test('normalize carries the maximized flag and nothing looser', () => {
  assert.strictEqual(normalize({ maximized: true }, ONE_SCREEN).maximized, true)
  assert.strictEqual(normalize({ maximized: 'yes' }, ONE_SCREEN).maximized, false)
})

test('read hands back null for a missing or unreadable file', (t) => {
  const dir = fs.mkdtempSync(path.join(__dirname, 'state-'))
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }))

  assert.strictEqual(read(path.join(dir, 'nothing.json')), null)

  const broken = path.join(dir, 'broken.json')
  fs.writeFileSync(broken, '{ not json')
  assert.strictEqual(read(broken), null)
})

test('write then read round trips a frame', (t) => {
  const dir = fs.mkdtempSync(path.join(__dirname, 'state-'))
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }))

  const file = path.join(dir, 'window-state.json')
  const frame = { x: 250, y: 150, width: 1440, height: 900, maximized: false }
  write(file, frame)

  assert.deepStrictEqual(read(file), frame)
  assert.deepStrictEqual(normalize(read(file), ONE_SCREEN), frame)
})
