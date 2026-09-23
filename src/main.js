'use strict'

const path = require('node:path')
const { app, BrowserWindow, Menu, shell, ipcMain, session, screen } = require('electron')
const { probe, dashboardURL } = require('./detect')
const windowstate = require('./windowstate')

const DASHBOARD_ORIGIN = 'http://127.0.0.1:7073'
const STATE_FILE = 'window-state.json'
const SAVE_DELAY_MS = 400

// grantDashboardPermissions lets the first-party lerd dashboard use notifications
// (and the other permissions it asks for) without a prompt, so its "Allow
// notifications" toggle results in real native notifications. Only the loopback
// dashboard origin is trusted; everything else is denied.
function grantDashboardPermissions() {
  const ses = session.defaultSession
  const trusted = (url) => typeof url === 'string' && url.startsWith(DASHBOARD_ORIGIN)
  ses.setPermissionRequestHandler((_wc, _permission, callback, details) => {
    callback(trusted(details.requestingUrl))
  })
  ses.setPermissionCheckHandler((_wc, _permission, requestingOrigin) => {
    return requestingOrigin === DASHBOARD_ORIGIN
  })
}

// Set before the app is ready so the Linux WM_CLASS / Wayland app_id identifies
// the window. Under Flatpak it must equal the Flatpak id (the desktop file name)
// so KDE/Wayland matches the window to sh.lerd.Desktop.desktop and shows the
// icon; in the dev run it reads "Lerd" for a clean taskbar label.
app.setName(process.env.FLATPAK_ID || 'Lerd')

// Claim the lerd:// scheme so clicking a native notification from the daemon
// focuses this window at the right route. Under Flatpak the manifest's desktop
// entry already registers it, and the host tool this shells out to (xdg-settings)
// isn't in the sandbox, so skip it there.
if (!process.env.FLATPAK_ID) {
  app.setAsDefaultProtocolClient('lerd')
}

let mainWindow = null

// routeFromDeepLink turns lerd://open/<route> into the dashboard path/hash.
function routeFromDeepLink(url) {
  const m = /^lerd:\/\/open\/?(.*)$/.exec(url || '')
  return m ? m[1] : ''
}

function firstDeepLink(argv) {
  return (argv || []).find((a) => typeof a === 'string' && a.startsWith('lerd://')) || null
}

// handleDeepLink focuses the window and navigates to the route. The dashboard is
// hash-routed, so a bare path (e.g. from a desktop action, lerd://open/sites) is
// normalized to a hash; notification routes already carry the '#'.
function handleDeepLink(url) {
  if (!mainWindow || !url) return
  mainWindow.show()
  mainWindow.focus()
  let route = routeFromDeepLink(url)
  if (route && !route.startsWith('#')) route = '#' + route
  mainWindow.loadURL('http://127.0.0.1:7073/' + route)
}

// The frame sits with the rest of the app's state, so it follows the Flatpak's
// userData directory rather than a path of our own.
function stateFile() {
  return path.join(app.getPath('userData'), STATE_FILE)
}

// saveWindowState stores the normal frame rather than the live one, so a window
// closed while maximized comes back maximized and still knows its old size.
function saveWindowState() {
  if (!mainWindow || mainWindow.isDestroyed()) return
  try {
    const bounds = mainWindow.getNormalBounds()
    windowstate.write(stateFile(), {
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      maximized: mainWindow.isMaximized(),
    })
  } catch {
    // Reading the frame can fail on a window already on its way out.
  }
}

let saveTimer = null

// resize and move fire dozens of times through a single drag, so they debounce.
// The maximize and close handlers write straight away.
function scheduleSave() {
  clearTimeout(saveTimer)
  saveTimer = setTimeout(saveWindowState, SAVE_DELAY_MS)
}

function createWindow() {
  const workAreas = screen.getAllDisplays().map((display) => display.workArea)
  const state = windowstate.normalize(windowstate.read(stateFile()), workAreas)

  mainWindow = new BrowserWindow({
    title: 'Lerd',
    width: state.width,
    height: state.height,
    x: state.x,
    y: state.y,
    minWidth: windowstate.MIN_WIDTH,
    minHeight: windowstate.MIN_HEIGHT,
    icon: path.join(__dirname, '..', 'assets', 'icon.png'),
    backgroundColor: '#0b0f17',
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js'),
    },
  })

  if (state.maximized) mainWindow.maximize()

  mainWindow.on('resize', scheduleSave)
  mainWindow.on('move', scheduleSave)
  mainWindow.on('maximize', saveWindowState)
  mainWindow.on('unmaximize', saveWindowState)
  mainWindow.on('close', () => {
    clearTimeout(saveTimer)
    saveWindowState()
  })

  // Keep the window titled "Lerd" rather than inheriting the dashboard's <title>.
  mainWindow.on('page-title-updated', (e) => e.preventDefault())

  // Dashboard links to external sites open in the real browser, not new windows.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://127.0.0.1:7073') || url.startsWith('http://localhost:7073')) {
      return { action: 'allow' }
    }
    shell.openExternal(url)
    return { action: 'deny' }
  })

  return mainWindow
}

// showDashboardOrGate loads the live UI when it is up, otherwise the gate page,
// which polls until lerd comes online and then advances on its own.
async function showDashboardOrGate() {
  const { up } = await probe()
  if (up) {
    mainWindow.loadURL(dashboardURL())
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'gate', 'gate.html'))
  }
}

function wireIpc() {
  ipcMain.handle('lerd:probe', () => probe())
  ipcMain.handle('lerd:load-dashboard', () => mainWindow.loadURL(dashboardURL()))
  ipcMain.handle('lerd:open-install', () => shell.openExternal('https://lerd.sh'))
}

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  // A second launch (including a lerd:// click on Linux/Windows) focuses this
  // instance and follows the deep link if one is present in the new argv.
  app.on('second-instance', (_e, argv) => {
    if (mainWindow) {
      mainWindow.show()
      mainWindow.focus()
    }
    const dl = firstDeepLink(argv)
    if (dl) handleDeepLink(dl)
  })

  // macOS delivers deep links here rather than via argv.
  app.on('open-url', (_e, url) => {
    _e.preventDefault()
    handleDeepLink(url)
  })

  app.whenReady().then(() => {
    grantDashboardPermissions()
    wireIpc()
    Menu.setApplicationMenu(null)
    createWindow()
    const coldDeepLink = firstDeepLink(process.argv)
    if (coldDeepLink) handleDeepLink(coldDeepLink)
    else showDashboardOrGate()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })
}
