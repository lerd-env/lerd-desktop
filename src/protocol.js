'use strict'

// protocolClient says how the app should claim the lerd:// scheme, so a click
// on a lerd notification opens it at the notification's route. It returns the
// arguments for app.setAsDefaultProtocolClient, or null when the app must
// leave the scheme alone:
//
// - Under Flatpak the manifest's desktop entry registers it, and xdg-settings,
//   which Electron shells out to, isn't in the sandbox.
// - On Windows the installer registers the installed app. A dev run registers
//   itself, and since its executable is the bare electron.exe, it passes the
//   app's folder for Windows to hand back before the URL.
function protocolClient({ platform, flatpak, isPackaged, execPath, appPath }) {
  if (flatpak) return null
  if (platform !== 'win32') return ['lerd']
  if (isPackaged) return null
  return ['lerd', execPath, [appPath]]
}

module.exports = { protocolClient }
