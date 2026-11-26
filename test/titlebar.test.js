'use strict'

const test = require('node:test')
const assert = require('node:assert')
const { windowOptions, STRIP_CSS } = require('../src/titlebar')

test('macOS hides the title bar and keeps the window buttons', () => {
  assert.deepStrictEqual(windowOptions('darwin'), { titleBarStyle: 'hidden' })
})

test('Windows and Linux keep their own title bar', () => {
  assert.deepStrictEqual(windowOptions('win32'), {})
  assert.deepStrictEqual(windowOptions('linux'), {})
})

// The dashboard's root fills the viewport, so the strip has to come out of its
// height, or the page grows a scrollbar the size of the strip.
test('the strip is draggable and taken out of the page height', () => {
  assert.match(STRIP_CSS, /-webkit-app-region:\s*drag/)
  assert.match(STRIP_CSS, /padding-top:\s*28px/)
  assert.match(STRIP_CSS, /calc\(100vh - 28px\)/)
})

test('the strip is painted like the dashboard nav rail, light and dark', () => {
  assert.match(STRIP_CSS, /var\(--color-lerd-header-light\)/)
  assert.match(STRIP_CSS, /\.dark body::before \{ background: var\(--color-lerd-header\); \}/)
})
