'use strict'

const http = require('node:http')
const path = require('node:path')
const { DEFAULT_HOST, DEFAULT_PORT } = require('./detect')

// The Windows tray. On Linux and macOS lerd-tray owns the tray, so this only
// runs on Windows, where lerd lives in WSL. The tray holds no menu of its own:
// it draws the one lerd serves at /api/tray and posts each click back to
// /api/tray/action. Only while that API is down does it fall back to a menu of
// its own, which can start lerd.

// fetchTray reads the menu from /api/tray. It resolves null when the dashboard
// does not answer, which on Windows usually means WSL itself is down, and
// never rejects.
function fetchTray({ host = DEFAULT_HOST, port = DEFAULT_PORT, timeoutMs = 1500 } = {}) {
  return new Promise((resolve) => {
    const req = http.get({ host, port, path: '/api/tray', timeout: timeoutMs }, (res) => {
      let body = ''
      res.setEncoding('utf8')
      res.on('data', (chunk) => (body += chunk))
      res.on('end', () => resolve(res.statusCode === 200 ? parseTray(body) : null))
    })
    req.on('timeout', () => req.destroy())
    req.on('error', () => resolve(null))
  })
}

function parseTray(body) {
  try {
    const tray = JSON.parse(body)
    return tray && Array.isArray(tray.items) ? tray : null
  } catch {
    return null
  }
}

// postAction runs one menu action. Starting or stopping can take minutes, so
// it waits as long as lerd does. It resolves { status, result }, status 0 when
// lerd could not be reached, and never rejects.
function postAction(action, { host = DEFAULT_HOST, port = DEFAULT_PORT } = {}) {
  return new Promise((resolve) => {
    const payload = JSON.stringify({ action })
    const req = http.request({
      host,
      port,
      path: '/api/tray/action',
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'content-length': Buffer.byteLength(payload),
        'x-lerd-csrf': '1',
      },
    }, (res) => {
      let body = ''
      res.setEncoding('utf8')
      res.on('data', (chunk) => (body += chunk))
      res.on('end', () => {
        let result = null
        try {
          result = JSON.parse(body)
        } catch {
          // A 409 or 403 answers in plain text.
        }
        resolve({ status: res.statusCode, result })
      })
    })
    req.on('error', () => resolve({ status: 0, result: null }))
    req.end(payload)
  })
}

// The dashboard opens in the app's own window rather than through lerd, which
// would open another one over lerd://.
const DASHBOARD = 'dashboard'

const QUIT = 'quit'

const BUSY_LABELS = { start: 'Starting Lerd…', stop: 'Stopping Lerd…', [QUIT]: 'Quitting Lerd…' }

// busyLabel names the action in flight. Other action ids are lerd's own
// arguments.
function busyLabel(action) {
  return BUSY_LABELS[action] || `lerd ${action}…`
}

// quitAccepted tells whether lerd took a Quit Lerd. Lerd answers before it
// stops, and its API, which goes down with it, keeps serving the old menu for
// the seconds that takes.
function quitAccepted(action, { status, result }) {
  return action === QUIT && status === 200 && !!result && result.ok === true
}

// waitUntil polls the menu until lerd answers (up) or stops answering, so the
// tray redraws once lerd has really started or gone rather than at the next
// poll. It resolves whether lerd got there in time.
async function waitUntil(up, { timeoutMs = 60000, intervalMs = 1000, fetch = fetchTray } = {}) {
  const until = Date.now() + timeoutMs
  while (Date.now() < until) {
    if (!!(await fetch()) === up) return true
    await new Promise((r) => setTimeout(r, intervalMs))
  }
  return false
}

const waitUntilDown = (opts) => waitUntil(false, opts)
const waitUntilUp = (opts) => waitUntil(true, opts)

// startNotification tells how starting lerd through the shim went, in the
// words lerd's own Start Lerd uses. failure is lerd's last line, or null.
function startNotification(failure) {
  if (failure) return { title: "Couldn't start Lerd", body: failure, silent: false }
  return { title: 'Lerd started', body: '', silent: true }
}

// menuFromTray turns lerd's menu into an Electron menu template. icon maps a
// state to its dot image; busy names an action still running, and while it
// runs every other action waits. An item with a state stays enabled even
// without an action, since Windows greys the icon of a disabled item; clicking
// it does nothing. The app's own quit follows lerd's Quit Lerd, which stops
// lerd and leaves the app running.
function menuFromTray(tray, { busy = '', icon, action, openDashboard, quitApp }) {
  const convert = (item) => {
    if (item.separator) return { type: 'separator' }
    const label = item.detail ? `${item.label}: ${item.detail}` : item.label
    const out = { label }
    if (item.tooltip) out.toolTip = item.tooltip
    if (item.state && icon) out.icon = icon(item.state)
    if (Array.isArray(item.items)) {
      out.submenu = item.items.map(convert)
      return out
    }
    if (typeof item.checked === 'boolean') {
      out.type = 'checkbox'
      out.checked = item.checked
    }
    if (item.action === DASHBOARD) {
      out.click = openDashboard
    } else if (item.action) {
      out.enabled = !busy
      out.click = () => action(item.action)
    } else if (!out.icon) {
      out.enabled = false
    }
    return out
  }
  const items = tray.items.map(convert)
  if (busy) items.unshift({ label: busy, enabled: false })
  items.push(quitAppItem(quitApp))
  return items
}

// quitAppItem closes the app alone; lerd keeps running in WSL.
function quitAppItem(quitApp) {
  return { label: 'Quit Lerd Desktop', toolTip: 'Close this app and leave Lerd running', click: quitApp }
}

// downMenu is the tray while lerd's API does not answer: starting lerd through
// the shim boots WSL on the way.
function downMenu({ busy = '' }, { openDashboard, start, quitApp }) {
  return [
    { label: busy || 'Lerd is not running', enabled: false },
    { type: 'separator' },
    { label: 'Open Dashboard', click: openDashboard },
    { label: 'Start Lerd', enabled: !busy, click: start },
    { type: 'separator' },
    quitAppItem(quitApp),
  ]
}

// notification is what to tell the user about an action's outcome, or null
// when there is nothing to say. Lerd words it; a failure makes a sound.
function notification({ status, result }) {
  if (status === 0) {
    return { title: "Couldn't reach Lerd", body: 'The action may not have run.', silent: false }
  }
  if (status !== 200 || !result || !result.title) return null
  return { title: result.title, body: result.body || '', silent: result.ok === true }
}

// trayIconFile picks the icon the way lerd-tray does on Linux: the red L while
// lerd is stopped or unreachable, which reads on any taskbar, and while it runs
// either the green L the high-contrast setting asks for or a monochrome L
// against the taskbar's own colour. The files live in assets/tray.
function trayIconFile({ running, highContrast, darkTaskbar }) {
  if (running !== true) return 'stopped.png'
  if (highContrast) return 'running-green.png'
  return darkTaskbar ? 'running-white.png' : 'running-dark.png'
}

// dotFile is the menu icon for an item's state, null for one it does not know.
function dotFile(state) {
  return ['running', 'stopped', 'warning', 'disabled'].includes(state) ? path.join('dots', `${state}.png`) : null
}

// lastLine is the last line lerd printed, the one that says why it failed.
function lastLine(output) {
  const lines = String(output || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  return lines.length ? lines[lines.length - 1] : ''
}

function tooltip(tray) {
  if (!tray) return 'Lerd is not running'
  return tray.running ? 'Lerd is running' : 'Lerd is stopped'
}

// lerdExePath is where `lerd wsl:setup` puts the Windows shim that runs lerd
// inside the distro.
function lerdExePath(localAppData = process.env.LOCALAPPDATA || '') {
  return path.win32.join(localAppData, 'lerd', 'bin', 'lerd.exe')
}

// parseWslConf reads lerd-wsl.conf, which wsl:setup writes beside the shim:
// key=value lines naming the distro and lerd's path inside it.
function parseWslConf(text) {
  const conf = {}
  for (const line of String(text || '').split(/\r?\n/)) {
    const i = line.indexOf('=')
    if (i > 0) conf[line.slice(0, i).trim()] = line.slice(i + 1).trim()
  }
  return conf.distro && conf.lerd ? { distro: conf.distro, lerd: conf.lerd } : null
}

// lerdCommand is how to run lerd with args from Windows: through the shim
// when it is there, and otherwise straight through wsl.exe with what
// lerd-wsl.conf says, the way the shim itself does. Antivirus has been seen to
// quarantine the unsigned shim and leave its config, and the tray's Start Lerd
// must still work then. Starting any command boots WSL on the way. It returns
// null when lerd was never set up on Windows. exists and read stand in for the
// file system.
function lerdCommand(args, {
  localAppData = process.env.LOCALAPPDATA || '',
  programFiles = process.env.ProgramFiles || 'C:\\Program Files',
  systemRoot = process.env.SystemRoot || 'C:\\Windows',
  exists,
  read,
}) {
  const shim = lerdExePath(localAppData)
  if (exists(shim)) return { file: shim, args }
  let conf = null
  try {
    conf = parseWslConf(read(path.win32.join(localAppData, 'lerd', 'bin', 'lerd-wsl.conf')))
  } catch {
    return null
  }
  if (!conf) return null
  // The WSL package's own wsl.exe; System32's is a stub until it is installed.
  const packaged = path.win32.join(programFiles, 'WSL', 'wsl.exe')
  const wsl = exists(packaged) ? packaged : path.win32.join(systemRoot, 'System32', 'wsl.exe')
  return { file: wsl, args: ['-d', conf.distro, '--cd', '~', '--exec', conf.lerd, ...args] }
}

module.exports = {
  DASHBOARD,
  fetchTray,
  parseTray,
  postAction,
  busyLabel,
  quitAccepted,
  waitUntilDown,
  waitUntilUp,
  startNotification,
  menuFromTray,
  downMenu,
  notification,
  trayIconFile,
  dotFile,
  lastLine,
  tooltip,
  lerdExePath,
  parseWslConf,
  lerdCommand,
}
