<div align="center">

<img src="assets/icon.svg" width="104" alt="Lerd Desktop" />

# Lerd Desktop

> Your local PHP dev dashboard in a dedicated window, with native desktop
> notifications. No browser tab to hunt for, no permission prompts.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Linux-lightgrey)]()
[![Flathub](https://img.shields.io/badge/Flathub-coming%20soon-4a90d9?logo=flathub&logoColor=white)](https://lerd.sh)
[![Docs](https://img.shields.io/badge/docs-lerd.sh-blue)](https://lerd.sh)
[![Companion to Lerd](https://img.shields.io/badge/for-Lerd-ff2d20)](https://github.com/lerd-env/lerd)

</div>

Lerd Desktop is the companion app for [Lerd](https://lerd.sh), the rootless,
Podman-native local PHP development environment. It wraps the Lerd dashboard in a
sandboxed native window and lets the Lerd daemon pop **native desktop
notifications** — for captured mail, worker failures, and finished operations —
so you can stop keeping a browser tab open just to catch them.

It's a thin shell by design: no dependency on Lerd's internals, it simply talks
to the Lerd services already running on your machine.

## Why a desktop app?

- **A window of its own.** The dashboard lives in a real app with its own icon,
  Alt-Tab entry, and taskbar slot, not lost among thirty browser tabs.
- **Notifications without a browser.** Native `org.freedesktop.Notifications` from
  the Lerd daemon, so alerts appear even with nothing open, and with no browser
  permission prompt to grant.
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
- 📦 **Sandboxed Flatpak**, rootless, heading to Flathub — installs into your user
  space with no system pollution
- 🐧 **Wayland and X11**, at home on GNOME, KDE, and Hyprland, with the correct
  app id so your compositor shows the Lerd icon
- 🪶 **Zero coupling** to Lerd's codebase — it reaches the dashboard over the
  local loopback and nothing more

## Requirements

Lerd Desktop is a front-end for [Lerd](https://lerd.sh) — install and start Lerd
first:

```bash
curl -fsSL https://lerd.sh/install.sh | bash
```

## Install

```bash
flatpak install --user https://lerd.sh/lerd.flatpakref
```

Then launch **Lerd** from your app menu, or run `lerd dashboard` — when the app is
installed it opens there instead of the browser. Coming soon to Flathub.

## How it works

The app points a native window at the Lerd UI on `http://127.0.0.1:7073`. Loading
from the loopback origin means write actions pass Lerd's same-origin CSRF gate and
the first-party dashboard is granted notification permission automatically. If
Lerd isn't running yet, a gate screen polls until it comes online and offers to
install it. External links open in your real browser; the window stays on the
dashboard.

## Build from source

Development run:

```bash
npm ci
npm start
```

Building the Flatpak locally (no root) is covered in
[`flatpak/README.md`](flatpak/README.md).

## License

MIT — see [LICENSE](LICENSE).
