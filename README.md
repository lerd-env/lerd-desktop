<div align="center">

<img src="assets/icon.svg" width="104" alt="Lerd Desktop" />

# Lerd Desktop

> Your local PHP dev dashboard in a dedicated window, with native desktop
> notifications. No browser tab to hunt for, no permission prompts.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Linux%20%7C%20Windows-lightgrey)]()
[![Flathub](https://img.shields.io/badge/Flathub-coming%20soon-4a90d9?logo=flathub&logoColor=white)](https://lerd.sh)
[![Docs](https://img.shields.io/badge/docs-lerd.sh-blue)](https://lerd.sh)
[![Companion to Lerd](https://img.shields.io/badge/for-Lerd-ff2d20)](https://github.com/lerd-env/lerd)

![The Lerd dashboard](flatpak/screenshots/dashboard.png)

</div>

Lerd Desktop is the companion app for [Lerd](https://lerd.sh)
([source](https://github.com/lerd-env/lerd)), the rootless, Podman-native local
PHP development environment. It wraps the Lerd dashboard in a
sandboxed native window and lets the Lerd daemon pop **native desktop
notifications** — for captured mail, worker failures, and finished operations —
so you can stop keeping a browser tab open just to catch them.

On Windows, where Lerd runs inside WSL, the app is also Lerd's home on the
Windows side: it holds Lerd's tray icon, raises its notifications as Windows
notifications, keeps Lerd running from sign-in, and ships with
`Install-Lerd.exe`, the wizard that sets all of it up.

It's a thin shell by design: no dependency on Lerd's internals, it simply talks
to the Lerd services already running on your machine.

## Why a desktop app?

- **A window of its own.** The dashboard lives in a real app with its own icon,
  Alt-Tab entry, and taskbar slot, not lost among thirty browser tabs.
- **Notifications without a browser.** Native `org.freedesktop.Notifications` on
  Linux and Windows notifications under Lerd's own name on Windows, so alerts
  appear even with nothing open, and with no browser permission prompt to grant.
- **Lerd's tray on Windows.** WSL has nowhere to draw a tray, so the app draws the
  same menu `lerd-tray` shows on Linux: status, services, PHP, toggles and actions.
- **Click straight to the thing.** A click on a notification focuses the window
  and jumps to the captured email, the failing worker, or the finished service.
- **Opens where you already are.** `lerd dashboard` and the tray's *Open
  Dashboard* focus the running app through its `lerd://` scheme instead of
  spawning yet another tab.

## Features

- 🪟 **Dedicated window** around the live Lerd dashboard, loaded straight from the
  local UI, with a clean chrome-less frame
- 🔔 **Native desktop notifications** delivered by the Lerd daemon — mail, worker
  failures, finished operations — no browser, no permission prompt
- 🎯 **Click-to-open**: notifications and `lerd://` deep links focus the window at
  the right route, launching it if it isn't already running
- 📦 **Sandboxed Flatpak** on Linux, rootless, heading to Flathub, installing into
  your user space with no system pollution
- 🐧 **Wayland and X11**, at home on GNOME, KDE, and Hyprland, with the correct
  app id so your compositor shows the Lerd icon
- 🧙 **One wizard on Windows**: `Install-Lerd.exe` sets up WSL, Ubuntu, Lerd and
  this app, and removes it all again from Add/Remove Programs
- 🗂️ **Windows tray** with Lerd's live menu, coloured status dots and the same
  actions as `lerd-tray`, closing the window keeps the app in the tray
- 🚀 **Lerd from sign-in on Windows**: the app starts hidden at login and keeps
  Lerd's agent running, which boots WSL and answers `.test` lookups
- 🪶 **Zero coupling** to Lerd's codebase — it reaches the dashboard over the
  local loopback and nothing more

## Install

### Linux

Lerd Desktop is a front-end for [Lerd](https://lerd.sh), so install and start
Lerd first:

```bash
curl -fsSL https://lerd.sh/install.sh | bash
```

Then the app:

```bash
flatpak install --user https://lerd.sh/lerd.flatpakref
```

Launch **Lerd** from your app menu, or run `lerd dashboard`: when the app is
installed it opens there instead of the browser. Coming soon to Flathub.

If Lerd isn't installed yet, the app's start screen copies the install command
for you to paste into a terminal.

### Windows

Download `Install-Lerd.exe` from the
[latest release](https://github.com/lerd-env/lerd-desktop/releases/latest) and run
it. It installs everything, Lerd included, so there is nothing to set up first.
It needs Windows 10 version 2004 or newer, or Windows 11, on x64 or Arm64, and
it is not code-signed yet, so SmartScreen asks before the first run. What it does
step by step is in [installer/README.md](installer/README.md), and the
[WSL2 guide](https://lerd.sh/getting-started/wsl2) covers the Lerd side.

### The window never shows up on Wayland

Some hybrid Intel and NVIDIA laptops crash under a Wayland session before the
window appears, with `failed to import supplied dmabufs` on stderr. Running the
app on X11 avoids it:

```bash
flatpak override --user --socket=x11 --env=ELECTRON_OZONE_PLATFORM_HINT=x11 sh.lerd.Desktop
```

`flatpak override --user --reset sh.lerd.Desktop` undoes it.

## How it works

The app points a native window at the Lerd UI on `http://127.0.0.1:7073`. Loading
from the loopback origin means write actions pass Lerd's same-origin CSRF gate and
the first-party dashboard is granted notification permission automatically. If
Lerd isn't running yet, a gate screen polls until it comes online and offers to
install it. External links open in your real browser; the window stays on the
dashboard.

On Windows the app does a few more things, all of them only there:

- **Tray.** It reads the menu Lerd serves at `/api/tray`, every 30 seconds, when
  the pointer reaches the icon and after each action, and posts clicks to
  `/api/tray/action`. Lerd builds the menu, so a Lerd update changes it with no
  app release.
- **Notifications.** It listens on `/api/desktop/ws` and raises each notification
  Lerd sends under the `sh.lerd.Lerd` app id. A click opens the dashboard at that
  notification's route.
- **Lerd's agent.** It starts `lerd.exe --agent` and starts it again if it stops.
  The agent boots WSL at sign-in and answers `.test` lookups for Windows.
- **Closing** hides the window to the tray. Quit Lerd stops Lerd and keeps the
  app; Quit Lerd Desktop closes the app and leaves Lerd running.

## Build from source

Development run and tests:

```bash
npm ci
npm start
npm test
```

Building the Flatpak locally (no root) is covered in
[`flatpak/README.md`](flatpak/README.md). On Windows, `npm run package:win` leaves
`lerd-desktop-win32-x64.zip` and the arm64 one in `dist/`, and
[`installer/README.md`](installer/README.md) builds `Install-Lerd.exe` around them.
On macOS, `npm run package:mac` leaves `Lerd-x64.dmg` and `Lerd-arm64.dmg` in
`dist/`. CI builds the Windows ones on every pull request, and a published release
carries them.

## License

MIT — see [LICENSE](LICENSE).
