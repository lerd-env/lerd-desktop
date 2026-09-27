'use strict'

const http = require('node:http')
const path = require('node:path')
const { DEFAULT_HOST, DEFAULT_PORT } = require('./detect')

// The Windows tray. On Linux lerd-tray owns the tray, so this only runs on
// Windows, where lerd lives in WSL and nothing else can show one.

// parseRunning reads whether lerd's stack is up from /api/status, the same
// field lerd-tray uses. null means the answer could not be read.
function parseRunning(body) {
  try {
    return JSON.parse(body).nginx.running === true
  } catch {
    return null
  }
}

// fetchRunning polls /api/status. It resolves null when the dashboard does not
// answer, which on Windows usually means WSL itself is down, and never rejects.
function fetchRunning({ host = DEFAULT_HOST, port = DEFAULT_PORT, timeoutMs = 1500 } = {}) {
  return new Promise((resolve) => {
    const req = http.get({ host, port, path: '/api/status', timeout: timeoutMs }, (res) => {
      let body = ''
      res.setEncoding('utf8')
      res.on('data', (chunk) => (body += chunk))
      res.on('end', () => resolve(res.statusCode === 200 ? parseRunning(body) : null))
    })
    req.on('timeout', () => req.destroy())
    req.on('error', () => resolve(null))
  })
}

function statusLabel(running) {
  if (running === null) return 'Lerd is not reachable'
  return running ? 'Lerd is running' : 'Lerd is stopped'
}

// menuTemplate is the tray menu for a given state. Starting is offered when lerd
// is unreachable too: `lerd start` through the shim boots WSL on the way. busy
// names a start or stop still running, which can take minutes, and holds the
// toggle until it finishes.
function menuTemplate({ running, busy }, { open, start, stop, quit }) {
  const toggle = running ? { label: 'Stop Lerd', click: stop } : { label: 'Start Lerd', click: start }
  return [
    { label: busy || statusLabel(running), enabled: false },
    { type: 'separator' },
    { label: 'Open Dashboard', click: open },
    { ...toggle, enabled: !busy },
    { type: 'separator' },
    { label: 'Quit', click: quit },
  ]
}

// lerdExePath is where `lerd wsl:setup` puts the Windows shim that runs lerd
// inside the distro.
function lerdExePath(localAppData = process.env.LOCALAPPDATA || '') {
  return path.win32.join(localAppData, 'lerd', 'bin', 'lerd.exe')
}

module.exports = { parseRunning, fetchRunning, menuTemplate, lerdExePath }
