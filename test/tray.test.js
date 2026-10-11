'use strict'

const test = require('node:test')
const assert = require('node:assert')
const http = require('node:http')
const { menuTemplate, parseRunning, fetchRunning, lerdExePath, trayIconFile } = require('../src/tray')

const noop = () => {}
const actions = { open: noop, start: noop, stop: noop, quit: noop }

test('parseRunning reads nginx.running out of /api/status', () => {
  assert.strictEqual(parseRunning('{"nginx":{"running":true}}'), true)
  assert.strictEqual(parseRunning('{"nginx":{"running":false}}'), false)
  assert.strictEqual(parseRunning('not json'), null)
})

test('menu offers Stop while lerd runs', () => {
  const labels = menuTemplate({ running: true }, actions).map((i) => i.label)
  assert.deepStrictEqual(labels, ['Lerd is running', undefined, 'Open Dashboard', 'Stop Lerd', undefined, 'Quit'])
})

test('menu offers Start while lerd is stopped or unreachable', () => {
  for (const running of [false, null]) {
    const items = menuTemplate({ running }, actions)
    assert.strictEqual(items[0].label, running === null ? 'Lerd is not reachable' : 'Lerd is stopped')
    assert.strictEqual(items[3].label, 'Start Lerd')
  }
})

test('menu shows the command in flight and blocks a second one', () => {
  const items = menuTemplate({ running: false, busy: 'Starting Lerd…' }, actions)
  assert.strictEqual(items[0].label, 'Starting Lerd…')
  assert.strictEqual(items[3].enabled, false)
})

test('menu items call their actions', () => {
  const called = []
  const spy = { open: () => called.push('open'), start: () => called.push('start'), stop: () => called.push('stop'), quit: () => called.push('quit') }
  const items = menuTemplate({ running: true }, spy)
  items[2].click()
  items[3].click()
  items[5].click()
  assert.deepStrictEqual(called, ['open', 'stop', 'quit'])
})

test('fetchRunning asks the dashboard and never rejects', async () => {
  const server = http.createServer((req, res) => {
    assert.strictEqual(req.url, '/api/status')
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end('{"nginx":{"running":true}}')
  })
  await new Promise((r) => server.listen(0, '127.0.0.1', r))
  assert.strictEqual(await fetchRunning({ port: server.address().port }), true)
  server.close()
  assert.strictEqual(await fetchRunning({ port: 1, timeoutMs: 500 }), null)
})

test('lerdExePath points at the shim wsl:setup installs', () => {
  assert.strictEqual(lerdExePath('C:\\Users\\me\\AppData\\Local'), 'C:\\Users\\me\\AppData\\Local\\lerd\\bin\\lerd.exe')
})

test('tray icon follows lerd-tray: red when stopped, mono against the taskbar when running', () => {
  assert.strictEqual(trayIconFile({ running: false, darkTaskbar: true }), 'stopped.png')
  assert.strictEqual(trayIconFile({ running: null, darkTaskbar: false }), 'stopped.png')
  assert.strictEqual(trayIconFile({ running: true, darkTaskbar: true }), 'running-white.png')
  assert.strictEqual(trayIconFile({ running: true, darkTaskbar: false }), 'running-dark.png')
})
