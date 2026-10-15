'use strict'

const test = require('node:test')
const assert = require('node:assert')
const http = require('node:http')
const tray = require('../src/tray')

const noop = () => {}

// A menu shaped like the one lerd serves at /api/tray.
const MENU = {
  running: true,
  high_contrast_icon: false,
  items: [
    { label: 'Running', state: 'running' },
    { separator: true },
    { label: 'Open Dashboard', action: 'dashboard', tooltip: 'Open the Lerd web dashboard' },
    { label: 'Stop Lerd', action: 'stop' },
    { label: 'Services (1/2)', items: [
      { label: 'mysql', state: 'running', action: 'service stop mysql' },
    ] },
    { label: 'Settings', items: [
      { label: 'Notifications', checked: true, action: 'notify off' },
      { label: 'Managed service LAN access', checked: true, detail: 'Armed (LAN exposure off)', action: 'lan services off' },
    ] },
    { label: 'Version v1.40.0' },
  ],
}

function draw(opts = {}) {
  return tray.menuFromTray(MENU, { icon: (s) => `dot-${s}`, action: noop, openDashboard: noop, ...opts })
}

test('menuFromTray keeps lerd\'s order, separators and submenus', () => {
  const items = draw()
  assert.deepStrictEqual(items.map((i) => i.label || i.type),
    ['Running', 'separator', 'Open Dashboard', 'Stop Lerd', 'Services (1/2)', 'Settings', 'Version v1.40.0', 'Quit Lerd Desktop'])
  assert.deepStrictEqual(items[4].submenu.map((i) => i.label), ['mysql'])
})

test('menuFromTray ends with the app\'s own quit, which stays usable while lerd works', () => {
  let quits = 0
  const items = draw({ busy: tray.busyLabel('quit'), quitApp: () => quits++ })
  const last = items[items.length - 1]
  assert.strictEqual(last.label, 'Quit Lerd Desktop')
  assert.notStrictEqual(last.enabled, false)
  last.click()
  assert.strictEqual(quits, 1)
})

test('menuFromTray gives each state its dot and leaves stated rows enabled', () => {
  const [status] = draw()
  assert.strictEqual(status.icon, 'dot-running')
  assert.notStrictEqual(status.enabled, false)
  assert.strictEqual(status.click, undefined)
  assert.strictEqual(draw()[4].submenu[0].icon, 'dot-running')
})

test('menuFromTray disables a plain row without an action', () => {
  assert.strictEqual(draw()[6].enabled, false)
})

test('menuFromTray draws toggles as checkboxes and puts the detail in the label', () => {
  const [notifications, lan] = draw()[5].submenu
  assert.strictEqual(notifications.type, 'checkbox')
  assert.strictEqual(notifications.checked, true)
  assert.strictEqual(lan.label, 'Managed service LAN access: Armed (LAN exposure off)')
})

test('menuFromTray posts actions but opens the dashboard itself', () => {
  const posted = []
  let opened = 0
  const items = draw({ action: (a) => posted.push(a), openDashboard: () => opened++ })
  items[2].click()
  items[3].click()
  items[4].submenu[0].click()
  assert.strictEqual(opened, 1)
  assert.deepStrictEqual(posted, ['stop', 'service stop mysql'])
})

test('menuFromTray holds every action but the dashboard while one runs', () => {
  const items = draw({ busy: tray.busyLabel('stop') })
  assert.deepStrictEqual(items[0], { label: 'Stopping Lerd…', enabled: false })
  // The busy row comes first, so lerd's items move down one.
  assert.strictEqual(items[4].enabled, false)
  assert.strictEqual(items[5].submenu[0].enabled, false)
  assert.strictEqual(items[6].submenu[0].enabled, false)
  assert.notStrictEqual(items[3].enabled, false)
})

test('busyLabel words lerd\'s lifecycle and falls back to the action id', () => {
  assert.strictEqual(tray.busyLabel('quit'), 'Quitting Lerd…')
  assert.strictEqual(tray.busyLabel('service stop redis'), 'lerd service stop redis…')
})

test('quitAccepted only follows a Quit Lerd that lerd took', () => {
  const ok = { status: 200, result: { ok: true, title: 'Lerd stopped' } }
  assert.strictEqual(tray.quitAccepted('quit', ok), true)
  assert.strictEqual(tray.quitAccepted('stop', ok), false)
  assert.strictEqual(tray.quitAccepted('quit', { status: 409, result: null }), false)
  assert.strictEqual(tray.quitAccepted('quit', { status: 200, result: { ok: false } }), false)
})

test('waitUntilDown waits for lerd to stop answering, and gives up in time', async () => {
  let reads = 0
  const goesDown = async () => (++reads < 3 ? MENU : null)
  assert.strictEqual(await tray.waitUntilDown({ fetch: goesDown, intervalMs: 1 }), true)
  assert.strictEqual(reads, 3)
  assert.strictEqual(await tray.waitUntilDown({ fetch: async () => MENU, intervalMs: 5, timeoutMs: 20 }), false)
})

test('waitUntilUp waits for lerd to answer', async () => {
  let reads = 0
  const comesUp = async () => (++reads < 3 ? null : MENU)
  assert.strictEqual(await tray.waitUntilUp({ fetch: comesUp, intervalMs: 1 }), true)
  assert.strictEqual(reads, 3)
})

test('startNotification says lerd started, quietly, or why it did not', () => {
  assert.deepStrictEqual(tray.startNotification(null), { title: 'Lerd started', body: '', silent: true })
  assert.deepStrictEqual(tray.startNotification('podman is not running'),
    { title: "Couldn't start Lerd", body: 'podman is not running', silent: false })
})

test('downMenu offers to start lerd, and holds it while it starts', () => {
  const called = []
  const handlers = { openDashboard: () => called.push('open'), start: () => called.push('start'), quitApp: () => called.push('quit') }
  const items = tray.downMenu({}, handlers)
  assert.deepStrictEqual(items.map((i) => i.label || i.type),
    ['Lerd is not running', 'separator', 'Open Dashboard', 'Start Lerd', 'separator', 'Quit Lerd Desktop'])
  items[2].click()
  items[3].click()
  items[5].click()
  assert.deepStrictEqual(called, ['open', 'start', 'quit'])
  const busy = tray.downMenu({ busy: 'Starting Lerd…' }, handlers)
  assert.strictEqual(busy[0].label, 'Starting Lerd…')
  assert.strictEqual(busy[3].enabled, false)
})

test('notification shows lerd\'s words, quietly on success', () => {
  assert.deepStrictEqual(tray.notification({ status: 200, result: { ok: true, title: 'redis started' } }),
    { title: 'redis started', body: '', silent: true })
  assert.deepStrictEqual(tray.notification({ status: 200, result: { ok: false, title: "Couldn't start redis", body: 'port taken' } }),
    { title: "Couldn't start redis", body: 'port taken', silent: false })
})

test('notification stays quiet when lerd has nothing to say or the menu moved', () => {
  assert.strictEqual(tray.notification({ status: 200, result: { ok: true } }), null)
  assert.strictEqual(tray.notification({ status: 409, result: null }), null)
})

test('notification says so when lerd could not be reached', () => {
  assert.strictEqual(tray.notification({ status: 0, result: null }).silent, false)
})

test('fetchTray reads the menu and never rejects', async () => {
  const server = http.createServer((req, res) => {
    assert.strictEqual(req.url, '/api/tray')
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(JSON.stringify(MENU))
  })
  await new Promise((r) => server.listen(0, '127.0.0.1', r))
  assert.deepStrictEqual(await tray.fetchTray({ port: server.address().port }), MENU)
  server.close()
  assert.strictEqual(await tray.fetchTray({ port: 1, timeoutMs: 500 }), null)
})

test('parseTray turns away a body without items', () => {
  assert.strictEqual(tray.parseTray('{"running":true}'), null)
  assert.strictEqual(tray.parseTray('not json'), null)
})

test('postAction sends the CSRF header and reads both kinds of answer', async () => {
  const server = http.createServer((req, res) => {
    let body = ''
    req.on('data', (c) => (body += c))
    req.on('end', () => {
      assert.strictEqual(req.method, 'POST')
      assert.strictEqual(req.url, '/api/tray/action')
      assert.strictEqual(req.headers['x-lerd-csrf'], '1')
      const { action } = JSON.parse(body)
      if (action === 'stale') {
        res.writeHead(409)
        res.end('the tray menu has no action stale')
        return
      }
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ ok: true, title: `${action} done` }))
    })
  })
  await new Promise((r) => server.listen(0, '127.0.0.1', r))
  const port = server.address().port
  assert.deepStrictEqual(await tray.postAction('stop', { port }), { status: 200, result: { ok: true, title: 'stop done' } })
  assert.deepStrictEqual(await tray.postAction('stale', { port }), { status: 409, result: null })
  server.close()
  assert.deepStrictEqual(await tray.postAction('stop', { port: 1 }), { status: 0, result: null })
})

test('tray icon follows lerd-tray: red when down, green on request, mono otherwise', () => {
  assert.strictEqual(tray.trayIconFile({ running: false, darkTaskbar: true }), 'stopped.png')
  assert.strictEqual(tray.trayIconFile({ running: null, highContrast: true }), 'stopped.png')
  assert.strictEqual(tray.trayIconFile({ running: true, highContrast: true, darkTaskbar: true }), 'running-green.png')
  assert.strictEqual(tray.trayIconFile({ running: true, darkTaskbar: true }), 'running-white.png')
  assert.strictEqual(tray.trayIconFile({ running: true, darkTaskbar: false }), 'running-dark.png')
})

test('dotFile knows lerd\'s four states', () => {
  assert.strictEqual(tray.dotFile('warning'), require('node:path').join('dots', 'warning.png'))
  assert.strictEqual(tray.dotFile('sparkly'), null)
})

test('lastLine picks the line lerd ended on', () => {
  assert.strictEqual(tray.lastLine('Starting…\r\nError: podman is not running\r\n\r\n'), 'Error: podman is not running')
  assert.strictEqual(tray.lastLine(''), '')
})

test('tooltip tells running, stopped and unreachable apart', () => {
  assert.strictEqual(tray.tooltip({ running: true }), 'Lerd is running')
  assert.strictEqual(tray.tooltip({ running: false }), 'Lerd is stopped')
  assert.strictEqual(tray.tooltip(null), 'Lerd is not running')
})

test('parseWslConf reads the distro and lerd\'s path', () => {
  assert.deepStrictEqual(tray.parseWslConf('distro=Ubuntu-24.04\r\nlerd=/home/me/.local/bin/lerd\r\ntld=test\r\n'),
    { distro: 'Ubuntu-24.04', lerd: '/home/me/.local/bin/lerd' })
  assert.strictEqual(tray.parseWslConf('tld=test\n'), null)
})

const WIN = { localAppData: 'C:\\Users\\me\\AppData\\Local', programFiles: 'C:\\Program Files', systemRoot: 'C:\\Windows' }
const CONF = 'distro=Ubuntu-24.04\nlerd=/home/me/.local/bin/lerd\n'
const files = (present) => ({
  exists: (f) => f in present,
  read: (f) => {
    if (!(f in present)) throw new Error('ENOENT')
    return present[f]
  },
})

test('lerdCommand runs lerd through the shim when it is there', () => {
  const shim = 'C:\\Users\\me\\AppData\\Local\\lerd\\bin\\lerd.exe'
  assert.deepStrictEqual(tray.lerdCommand(['start'], { ...WIN, ...files({ [shim]: '' }) }), { file: shim, args: ['start'] })
})

test('lerdCommand falls back to wsl.exe when the shim is gone', () => {
  const conf = 'C:\\Users\\me\\AppData\\Local\\lerd\\bin\\lerd-wsl.conf'
  const wsl = 'C:\\Program Files\\WSL\\wsl.exe'
  assert.deepStrictEqual(tray.lerdCommand(['start'], { ...WIN, ...files({ [conf]: CONF, [wsl]: '' }) }), {
    file: wsl,
    args: ['-d', 'Ubuntu-24.04', '--cd', '~', '--exec', '/home/me/.local/bin/lerd', 'start'],
  })
  assert.strictEqual(tray.lerdCommand(['start'], { ...WIN, ...files({ [conf]: CONF }) }).file,
    'C:\\Windows\\System32\\wsl.exe', 'System32\'s wsl.exe when the WSL package is not where it installs')
})

test('lerdCommand gives up when lerd was never set up on Windows', () => {
  assert.strictEqual(tray.lerdCommand(['start'], { ...WIN, ...files({}) }), null)
})

test('lerdExePath points at the shim wsl:setup installs', () => {
  assert.strictEqual(tray.lerdExePath('C:\\Users\\me\\AppData\\Local'), 'C:\\Users\\me\\AppData\\Local\\lerd\\bin\\lerd.exe')
})
