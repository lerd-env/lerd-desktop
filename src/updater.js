'use strict'

// The Windows app's own update. Lerd Desktop on Windows has no store to update
// it, so the app checks for a newer release, offers it in the tray, and hands
// it to the installer's /apponly mode, which swaps the app and leaves WSL and
// lerd alone, the way flatpak update does on Linux.

const crypto = require('node:crypto')
const path = require('node:path')

const RELEASES = 'https://github.com/lerd-env/lerd-desktop/releases'
const INSTALLER = 'Install-Lerd.exe'
const INSTALLER_ARGS = ['/apponly', '/VERYSILENT', '/SUPPRESSMSGBOXES', '/NORESTART']
const CHECK_EVERY_MS = 24 * 60 * 60 * 1000
const FIRST_CHECK_MS = 60 * 1000

// releasesURL is where releases come from. LERD_DESKTOP_RELEASES points it at a
// mirror, as LERD_SETUP_LOCAL points the installer at a local app.
function releasesURL(env = process.env) {
  return (env.LERD_DESKTOP_RELEASES || RELEASES).replace(/\/+$/, '')
}

// tagFromLocation reads the version releases/latest redirects to. That redirect
// is not GitHub's API, so it is not held to the API's 60 calls an hour.
function tagFromLocation(location) {
  const m = /\/releases\/tag\/v?([^/?#]+)$/.exec(location || '')
  return m ? m[1] : null
}

function parts(v) {
  const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(String(v || ''))
  return m ? m.slice(1).map(Number) : null
}

// isNewer is true only for a stable release above the running one.
function isNewer(latest, current) {
  const a = parts(latest)
  const b = parts(current)
  if (!a || !b) return false
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] > b[i]
  return false
}

// known is the update to offer: what this check found, or, when it found
// nothing, what the last good one did, so being offline never hides it.
function known(state, fetched, current) {
  const latest = fetched || state.latest || null
  return isNewer(latest, current) ? latest : null
}

// announce is true the first time a version is offered, restarts included.
function announce(state, latest) {
  return Boolean(latest) && state.announced !== latest
}

function checksumFor(sums, name) {
  for (const line of String(sums).split(/\r?\n/)) {
    const m = /^([0-9a-fA-F]{64}|\S+)\s+\*?(.+)$/.exec(line.trim())
    if (m && m[2] === name) return m[1].toLowerCase()
  }
  return null
}

// checkLatest is the newest release's version, or null when GitHub did not say.
async function checkLatest({ fetch, base = releasesURL() }) {
  try {
    const res = await fetch(`${base}/latest`, { method: 'HEAD', redirect: 'manual' })
    if (res.status < 300 || res.status >= 400) return null
    return tagFromLocation(res.headers.get('location'))
  } catch {
    return null
  }
}

async function get(fetch, url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${url.split('/').pop()}: ${res.status}`)
  return res
}

// downloadInstaller fetches the installer of exactly that release and keeps it
// only when it matches the release's SHA256SUMS, which CI signs.
async function downloadInstaller(version, { fetch, dir, writeFile, releases = releasesURL() }) {
  const base = `${releases}/download/v${version}`
  const sums = await (await get(fetch, `${base}/SHA256SUMS`)).text()
  const body = Buffer.from(await (await get(fetch, `${base}/${INSTALLER}`)).arrayBuffer())
  const got = crypto.createHash('sha256').update(body).digest('hex')
  if (got !== checksumFor(sums, INSTALLER)) {
    throw new Error(`${INSTALLER} ${version} does not match the release's SHA256SUMS`)
  }
  const file = path.win32.join(dir, `Install-Lerd-${version}.exe`)
  await writeFile(file, body)
  return file
}

module.exports = {
  CHECK_EVERY_MS, FIRST_CHECK_MS, INSTALLER_ARGS,
  releasesURL, tagFromLocation, isNewer, known, announce, checksumFor, checkLatest, downloadInstaller,
}
