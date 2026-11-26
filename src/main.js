'use strict'

const path = require('node:path')
const { execFile, spawn } = require('node:child_process')
const os = require('node:os')
const fs = require('node:fs')
const { app, BrowserWindow, Menu, Notification, Tray, nativeTheme, shell, ipcMain, session, screen, clipboard } = require('electron')
const { installAction } = require('./install')
const { startCommand } = require('./start')
const { probe, dashboardURL } = require('./detect')
const windowstate = require('./windowstate')
const { navigation, isDashboard } = require('./navigation')
const { protocolClient } = require('./protocol')
const tray = require('./tray')
const updater = require('./updater')
const macupdater = require('./macupdater')
const titlebar = require('./titlebar')
const notifications = require('./notifications')
const agent = require('./agent')

const STATE_FILE = 'window-state.json'
const SAVE_DELAY_MS = 400
const TRAY_POLL_MS = 30000
// Pointing at the tray refreshes the menu, at most this often.
const TRAY_HOVER_MS = 3000
// A started update holds its tray item this long, past the UAC prompt.
const UPDATE_RETRY_MS = 60000

// On Windows the app lives in the tray: closing the window hides it so the
// dashboard keeps delivering notifications, and it starts hidden at login,
// from the Run entry lerd's Windows installer writes.
const IS_WINDOWS = process.platform === 'win32'
// Elsewhere there is no tray to bring a hidden window back from.
const START_HIDDEN = IS_WINDOWS && process.argv.includes('--hidden')

// The AppUserModelID lerd's own Windows toasts use. Sharing it gives the app's
// notifications lerd's name and logo and a single "Lerd" entry in Windows'
// notification settings. The installer registers it under
// HKCU\Software\Classes\AppUserModelId, which is all Windows needs to show
// them; no Start menu shortcut has to carry it.
const WINDOWS_APP_ID = 'sh.lerd.Lerd'

// grantDashboardPermissions lets the first-party lerd dashboard use notifications
// (and the other permissions it asks for) without a prompt, so its "Allow
// notifications" toggle results in real native notifications. Only the loopback
// dashboard origin is trusted; everything else is denied.
function grantDashboardPermissions() {
  const ses = session.defaultSession
  ses.setPermissionRequestHandler((_wc, _permission, callback, details) => {
    callback(isDashboard(details.requestingUrl))
  })
  ses.setPermissionCheckHandler((_wc, _permission, requestingOrigin) => isDashboard(requestingOrigin))
}

// Set before the app is ready so the Linux WM_CLASS / Wayland app_id identifies
// the window. Under Flatpak it must equal the Flatpak id (the desktop file name)
// so KDE/Wayland matches the window to sh.lerd.Desktop.desktop and shows the
// icon; in the dev run it reads "Lerd" for a clean taskbar label.
app.setName(process.env.FLATPAK_ID || 'Lerd')
if (IS_WINDOWS) app.setAppUserModelId(WINDOWS_APP_ID)

// Chromium's Wayland color management lifts dark tones on KDE (#292c30 is drawn
// as #2d3033), so the header no longer matches the window's own title bar.
app.commandLine.appendSwitch('disable-features', 'WaylandWpColorManagerV1')

// Claim the lerd:// scheme so clicking a native notification from the daemon
// focuses this window at the right route; protocolClient says when someone
// else registers it instead.
const lerdScheme = protocolClient({
  platform: process.platform,
  flatpak: !!process.env.FLATPAK_ID,
  isPackaged: app.isPackaged,
  execPath: process.execPath,
  appPath: app.getAppPath(),
})
if (lerdScheme) app.setAsDefaultProtocolClient(...lerdScheme)

let mainWindow = null
// pageOnShow is the dashboard page a window hidden to the tray goes back to.
let pageOnShow = null
let quitting = false

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
  if (mainWindow.isDestroyed()) createWindow()
  let route = routeFromDeepLink(url)
  if (route && !route.startsWith('#')) route = '#' + route
  // Loaded before show, so showing a window from the tray keeps this page.
  mainWindow.loadURL('http://127.0.0.1:7073/' + route)
  mainWindow.show()
  mainWindow.focus()
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
    show: !START_HIDDEN,
    backgroundColor: '#0b0f17',
    autoHideMenuBar: true,
    ...titlebar.windowOptions(process.platform),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js'),
    },
  })

  if (windowstate.maximizesNow(state, START_HIDDEN)) mainWindow.maximize()
  else if (state.maximized) mainWindow.once('show', () => mainWindow.maximize())

  mainWindow.on('resize', scheduleSave)
  mainWindow.on('move', scheduleSave)
  mainWindow.on('maximize', saveWindowState)
  mainWindow.on('unmaximize', saveWindowState)
  mainWindow.on('close', (e) => {
    clearTimeout(saveTimer)
    saveWindowState()
    if (IS_WINDOWS && !quitting) {
      e.preventDefault()
      mainWindow.hide()
    }
  })
  // A page left loaded in the tray keeps polling lerd as if someone watched it,
  // and a window that starts hidden even reports itself visible to it. So the
  // tray holds no page: it is unloaded on hide and brought back on show.
  // Notifications are unaffected, they reach the app on its own socket.
  if (IS_WINDOWS) {
    mainWindow.on('hide', () => {
      pageOnShow = windowstate.pageToRestore(mainWindow.webContents.getURL())
      mainWindow.loadURL('about:blank')
    })
    mainWindow.on('show', () => {
      const url = mainWindow.webContents.getURL()
      if (url !== 'about:blank' && url !== '') return
      if (pageOnShow) mainWindow.loadURL(pageOnShow)
      else showDashboardOrGate()
    })
  }
  // Signing out or shutting down closes the window without passing through
  // before-quit; hiding it then would hold Windows up.
  mainWindow.on('session-end', () => {
    quitting = true
  })

  // With the window closed the app only raises notifications, and lerd's tray
  // is where Lerd lives then, so it leaves the Dock until a window is back.
  if (process.platform === 'darwin') {
    app.dock.show()
    mainWindow.on('closed', () => app.dock.hide())
  }

  // Every page load drops injected CSS, so the strip goes back on each one.
  if (process.platform === 'darwin') {
    mainWindow.webContents.on('dom-ready', () => mainWindow.webContents.insertCSS(titlebar.STRIP_CSS))
  }

  // Keep the window titled "Lerd" rather than inheriting the dashboard's <title>.
  mainWindow.on('page-title-updated', (e) => e.preventDefault())

  mainWindow.webContents.on('will-navigate', (e, url) => {
    const action = navigation(url)
    if (action === 'allow') return
    e.preventDefault()
    if (action === 'external') shell.openExternal(url)
  })

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

// On macOS closing the window destroys it while the app runs on, so a
// notification click brings up a new one.
function showWindow() {
  if (mainWindow.isDestroyed()) {
    createWindow()
    showDashboardOrGate()
    return
  }
  mainWindow.show()
  mainWindow.focus()
}

// runLerd runs a lerd command inside the distro, through the Windows shim or,
// without it, wsl.exe; either boots WSL if it has to. It runs from the home
// folder: the app's own is System32, which WSL would mount as the command's
// working directory. done gets lerd's last line of output when it fails.
function runLerd(args, done) {
  const cmd = tray.lerdCommand(args, { exists: fs.existsSync, read: (f) => fs.readFileSync(f, 'utf8') })
  if (!cmd) return done('Lerd is not set up on Windows. Run lerd wsl:setup inside WSL.')
  // wsl.exe writes its own errors in UTF-16 unless asked for UTF-8.
  const env = { ...process.env, WSL_UTF8: '1' }
  execFile(cmd.file, cmd.args, { windowsHide: true, cwd: os.homedir(), env }, (err, stdout, stderr) => {
    done(err ? tray.lastLine(stderr) || tray.lastLine(stdout) || err.message : null)
  })
}

// A notification collected while it is still on screen, or in the action
// centre, loses its click, so the latest few are held on to.
const KEEP_NOTIFICATIONS = 20
const shownNotifications = []

function notify(options, onClick = showWindow) {
  if (!Notification.isSupported()) return
  // macOS shows the app's own icon already and draws a passed one again beside it.
  const icon = process.platform === 'darwin' ? undefined : path.join(__dirname, '..', 'assets', 'icon.png')
  const n = new Notification({ ...options, icon })
  n.on('click', onClick)
  n.show()
  shownNotifications.push(n)
  if (shownNotifications.length > KEEP_NOTIFICATIONS) shownNotifications.shift()
}

// startAgent keeps lerd's Windows agent running: DNS for the sites and the
// distro booted at login. windowsHide gives it a console with no window, which
// the wsl.exe it starts shares rather than opening one of their own.
function startAgent() {
  agent.superviseAgent({
    command: () => agent.agentCommand({ exists: fs.existsSync }),
    spawn: (file, args) => spawn(file, args, { windowsHide: true, stdio: 'ignore', cwd: os.homedir() }),
    log: (msg) => console.log(`[agent] ${msg}`),
  })
}

// startMacUpdate keeps the macOS app current; a click on the ready notice
// restarts into the new version, and leaving it applies it at the next quit.
function startMacUpdate() {
  const { autoUpdater } = require('electron')
  macupdater.start({
    autoUpdater,
    arch: process.arch,
    version: app.getVersion(),
    log: (msg) => console.log(`[update] ${msg}`),
    onReady: () => notify(
      { title: 'A Lerd Desktop update is ready', body: 'Click to restart into it, or it applies the next time you quit.', silent: true },
      () => autoUpdater.quitAndInstall(),
    ),
  })
}

// listenForNotifications raises the notifications lerd-ui hands this app
// rather than toasting them itself; a click opens their route here.
function listenForNotifications() {
  notifications.listen((n) => {
    notify(notifications.notificationOptions(n), () => handleDeepLink(notifications.deepLink(n.route)))
  })
}

// setupTray draws lerd's own tray menu. It reads the menu every TRAY_POLL_MS,
// when the pointer reaches the icon and right after each action.
function setupTray() {
  const trayDir = path.join(__dirname, '..', 'assets', 'tray')
  let menu = null
  let busy = ''
  // Set from a Quit Lerd lerd took until lerd stops answering.
  let lerdQuitting = false
  let lastRead = 0

  const iconFile = () => path.join(trayDir, tray.trayIconFile({
    running: menu ? menu.running : null,
    highContrast: menu ? menu.high_contrast_icon : false,
    darkTaskbar: nativeTheme.shouldUseDarkColorsForSystemIntegratedUI,
  }))
  // Quitting the app leaves lerd running; lerd's own Quit Lerd stops lerd and
  // leaves the app, which can start it again.
  const quitApp = () => app.quit()
  const icon = new Tray(iconFile())
  icon.on('click', showWindow)

  const draw = () => {
    icon.setImage(iconFile())
    icon.setToolTip(tray.tooltip(menu))
    const template = menu
      ? tray.menuFromTray(menu, {
        busy,
        icon: (state) => {
          const file = tray.dotFile(state)
          return file ? path.join(trayDir, file) : undefined
        },
        action: runAction,
        openDashboard: showWindow,
        quitApp,
      })
      : tray.downMenu({ busy }, { openDashboard: showWindow, start: startLerd, quitApp })
    // The update sits just above Quit Lerd Desktop, whichever menu is up.
    if (update.available) template.splice(template.length - 1, 0, updateItem())
    icon.setContextMenu(Menu.buildFromTemplate(template))
  }

  // Lerd Desktop's own update. The installer's /apponly swaps the app and
  // leaves lerd alone; it asks for UAC itself and closes this app once allowed,
  // so a declined prompt leaves the app running and the item still offered.
  const update = { file: path.join(app.getPath('userData'), 'update.json'), state: {}, available: null, starting: false }
  try {
    update.state = JSON.parse(fs.readFileSync(update.file, 'utf8')) || {}
  } catch {
    update.state = {}
  }
  const saveUpdate = () => fs.promises.writeFile(update.file, JSON.stringify(update.state)).catch(() => {})

  const updateItem = () => ({
    label: update.starting ? `Updating Lerd Desktop to ${update.available}…` : `Update Lerd Desktop to ${update.available}`,
    enabled: !update.starting,
    click: applyUpdate,
  })

  const applyUpdate = async () => {
    if (!update.available || update.starting) return
    update.starting = true
    draw()
    try {
      const file = await updater.downloadInstaller(update.available, {
        fetch, dir: app.getPath('temp'), writeFile: fs.promises.writeFile,
      })
      const child = spawn(file, updater.INSTALLER_ARGS, { detached: true, stdio: 'ignore' })
      child.on('error', (err) => notify({ title: "Couldn't update Lerd Desktop", body: err.message, silent: false }))
      child.unref()
    } catch (err) {
      notify({ title: "Couldn't update Lerd Desktop", body: err.message, silent: false })
    }
    // Long enough for the UAC prompt; past it the item can be clicked again.
    setTimeout(() => {
      update.starting = false
      draw()
    }, UPDATE_RETRY_MS)
  }

  const checkUpdate = async () => {
    const fetched = await updater.checkLatest({ fetch })
    if (fetched) update.state.latest = fetched
    update.available = updater.known(update.state, fetched, app.getVersion())
    if (updater.announce(update.state, update.available)) {
      update.state.announced = update.available
      // A click on a Windows toast never reaches the app, so it points at the tray.
      notify({ title: `Lerd Desktop ${update.available} is available`, body: 'Update it from the tray menu. Lerd keeps running.', silent: true })
    }
    saveUpdate()
    draw()
  }

  // Polls can overlap a slow one; only the latest read is drawn.
  let reads = 0
  const refresh = async () => {
    const n = ++reads
    lastRead = Date.now()
    const read = await tray.fetchTray()
    if (n !== reads) return
    // While lerd quits its API still serves the old menu; the tray already
    // shows it gone.
    if (lerdQuitting && read) return
    menu = read
    draw()
  }

  const runAction = async (action) => {
    if (busy) return
    busy = tray.busyLabel(action)
    draw()
    const res = await tray.postAction(action)
    if (tray.quitAccepted(action, res)) {
      // Lerd answers before it stops, which takes seconds: show it gone at
      // once, holding Start Lerd until it really is.
      menu = null
      lerdQuitting = true
      draw()
      await tray.waitUntilDown()
      lerdQuitting = false
    }
    busy = ''
    // A 409 means the menu changed under the click: the refresh redraws it.
    const note = tray.notification(res)
    if (note) notify(note)
    refresh()
  }

  const startLerd = () => {
    if (busy) return
    busy = tray.busyLabel('start')
    draw()
    runLerd(['start'], async (failure) => {
      // The shim can return before lerd's API answers; wait for it so the
      // menu turns over at once rather than at the next poll.
      if (!failure) await tray.waitUntilUp()
      busy = ''
      notify(tray.startNotification(failure))
      refresh()
    })
  }

  // The taskbar can turn light or dark on its own, apart from the apps.
  nativeTheme.on('updated', draw)
  icon.on('mouse-enter', () => {
    if (Date.now() - lastRead > TRAY_HOVER_MS) refresh()
  })
  draw()
  refresh()
  // A store updates the app everywhere else; on Windows the app does it.
  if (app.isPackaged) {
    setTimeout(checkUpdate, updater.FIRST_CHECK_MS)
    setInterval(checkUpdate, updater.CHECK_EVERY_MS)
  }
  setInterval(refresh, TRAY_POLL_MS)
}

function wireIpc() {
  ipcMain.handle('lerd:probe', () => probe())
  ipcMain.handle('lerd:load-dashboard', () => mainWindow.loadURL(dashboardURL()))
  ipcMain.handle('lerd:open-install', () => {
    const action = installAction(process.platform)
    if (action.copy) {
      clipboard.writeText(action.copy)
      return 'copied'
    }
    if (action.run) {
      execFile(action.run.file, action.run.args, () => {})
      return 'terminal'
    }
    shell.openExternal(action.open)
    return 'opened'
  })
  // Resolves '' once lerd started, else lerd's last line of output.
  ipcMain.handle('lerd:start', () => new Promise((resolve) => {
    if (process.platform !== 'linux') return resolve('Starting lerd from the app works on Linux only.')
    const cmd = startCommand({ flatpak: Boolean(process.env.FLATPAK_ID) })
    execFile(cmd.file, cmd.args, { cwd: os.homedir() }, (err, stdout, stderr) => {
      resolve(err ? tray.lastLine(stderr) || tray.lastLine(stdout) || err.message : '')
    })
  }))
}

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  // A second launch (including a lerd:// click on Linux/Windows) focuses this
  // instance and follows the deep link if one is present in the new argv.
  app.on('second-instance', (_e, argv) => {
    // A deep link shows the window itself, at its own page.
    const dl = firstDeepLink(argv)
    if (dl) handleDeepLink(dl)
    else if (mainWindow && windowstate.asksForWindow(argv)) {
      mainWindow.show()
      mainWindow.focus()
    }
  })

  // macOS delivers deep links here rather than via argv.
  app.on('open-url', (_e, url) => {
    _e.preventDefault()
    handleDeepLink(url)
  })

  app.whenReady().then(() => {
    grantDashboardPermissions()
    wireIpc()
    // macOS keeps the default menu: without it Cmd+C, Cmd+V and Cmd+Q do nothing.
    if (process.platform !== 'darwin') Menu.setApplicationMenu(null)
    createWindow()
    if (IS_WINDOWS) {
      setupTray()
      listenForNotifications()
      startAgent()
    } else if (process.platform === 'darwin') {
      // lerd has no notifier of its own on macOS, so the app raises them.
      listenForNotifications()
      if (app.isPackaged) startMacUpdate()
    }
    const coldDeepLink = firstDeepLink(process.argv)
    if (coldDeepLink) handleDeepLink(coldDeepLink)
    else if (!START_HIDDEN) showDashboardOrGate()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length > 0) return
      createWindow()
      showDashboardOrGate()
    })
  })

  // The tray's Quit Lerd Desktop passes here; let the window close.
  app.on('before-quit', () => {
    quitting = true
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })
}
