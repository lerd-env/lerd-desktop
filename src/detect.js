'use strict'

const http = require('node:http')

const DEFAULT_HOST = '127.0.0.1'
const DEFAULT_PORT = 7073

// parseVersion pulls the running lerd version out of the /api/version body.
// The endpoint returns { current, latest, has_update }; current is what we show.
function parseVersion(body) {
  try {
    const data = JSON.parse(body)
    return typeof data.current === 'string' ? data.current : ''
  } catch {
    return ''
  }
}

// probe asks the lerd UI whether it is up. Resolves { up, version } and never
// rejects, so callers can poll it in a loop without try/catch.
function probe({ host = DEFAULT_HOST, port = DEFAULT_PORT, timeoutMs = 1500 } = {}) {
  return new Promise((resolve) => {
    const req = http.get({ host, port, path: '/api/version', timeout: timeoutMs }, (res) => {
      let body = ''
      res.setEncoding('utf8')
      res.on('data', (chunk) => (body += chunk))
      res.on('end', () => {
        if (res.statusCode === 200) resolve({ up: true, version: parseVersion(body) })
        else resolve({ up: false, version: '' })
      })
    })
    req.on('timeout', () => req.destroy())
    req.on('error', () => resolve({ up: false, version: '' }))
  })
}

// dashboardURL is what a live UI is loaded from. Loopback bypasses lerd's auth
// gate and keeps write requests same-origin so they pass its CSRF check.
function dashboardURL({ host = DEFAULT_HOST, port = DEFAULT_PORT } = {}) {
  return `http://${host}:${port}/`
}

module.exports = { probe, parseVersion, dashboardURL, DEFAULT_HOST, DEFAULT_PORT }
