'use strict'

const path = require('node:path')
const { app, BrowserWindow, Menu, shell, ipcMain, session } = require('electron')
const { probe, dashboardURL } = require('./detect')

const DASHBOARD_ORIGIN = 'http://127.0.0.1:7073'

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

// Set before the app is ready so the Linux WM_CLASS / taskbar identity reads
// "Lerd" instead of the default "electron".
app.setName('Lerd')

// Claim the lerd:// scheme so clicking a native notification from the daemon
// focuses this window at the right route.
app.setAsDefaultProtocolClient('lerd')

let mainWindow = null

// routeFromDeepLink turns lerd://open/<route> into the dashboard path/hash.
function routeFromDeepLink(url) {
  const m = /^lerd:\/\/open\/?(.*)$/.exec(url || '')
  return m ? m[1] : ''
}

function firstDeepLink(argv) {
  return (argv || []).find((a) => typeof a === 'string' && a.startsWith('lerd://')) || null
}

// handleDeepLink focuses the window and navigates to the notification's route.
function handleDeepLink(url) {
  if (!mainWindow || !url) return
  mainWindow.show()
  mainWindow.focus()
  mainWindow.loadURL('http://127.0.0.1:7073/' + routeFromDeepLink(url))
}

function createWindow() {
  mainWindow = new BrowserWindow({
    title: 'Lerd',
    width: 1280,
    height: 800,
    minWidth: 940,
    minHeight: 600,
    icon: path.join(__dirname, '..', 'assets', 'icon.png'),
    backgroundColor: '#0b0f17',
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js'),
    },
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
