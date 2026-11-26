'use strict'

// The macOS app's own update. Squirrel.Mac, inside Electron, downloads a signed
// zip of the app from update.electronjs.org, which reads this repository's
// releases, and swaps it in when the app quits. It refuses an unsigned app, so
// only a Developer ID build updates itself.

const FEED = 'https://update.electronjs.org/lerd-env/lerd-desktop'
const ARCHS = ['x64', 'arm64']
const CHECK_EVERY_MS = 24 * 60 * 60 * 1000
const FIRST_CHECK_MS = 60 * 1000

function checkArch(arch) {
  if (!ARCHS.includes(arch)) throw new Error(`no macOS update feed for arch ${arch}`)
  return arch
}

function feedURL(arch, version) {
  return `${FEED}/darwin-${checkArch(arch)}/${version}`
}

// zipName is shared with scripts/package-mac.js, so the asset a release carries
// is the one the feed looks for.
function zipName(arch) {
  return `Lerd-darwin-${checkArch(arch)}.zip`
}

// start checks after a minute and then daily; onReady fires once an update is
// downloaded, and installing it is the app's quitAndInstall.
function start({ autoUpdater, arch, version, onReady, log }) {
  autoUpdater.setFeedURL({ url: feedURL(arch, version) })
  autoUpdater.on('update-downloaded', () => onReady())
  // Offline, rate limited, or an ad hoc build Squirrel will not touch: the
  // next check tries again, and nothing needs the user's attention.
  autoUpdater.on('error', (err) => log(`update check failed: ${err.message}`))
  setTimeout(() => autoUpdater.checkForUpdates(), FIRST_CHECK_MS)
  setInterval(() => autoUpdater.checkForUpdates(), CHECK_EVERY_MS)
}

module.exports = { feedURL, zipName, start }
