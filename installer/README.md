<p align="center">
  <img src="branding/icon-512.png" width="104" height="104" alt="Lerd">
</p>

<h1 align="center">Lerd for Windows</h1>

<p align="center">
  The one-click installer that brings <a href="https://lerd.sh">Lerd</a> to Windows.<br>
  Download <code>Install-Lerd.exe</code>, click through a wizard, and get the whole local PHP stack, no terminal required.
</p>

<p align="center">
  <a href="https://lerd.sh"><img src="https://img.shields.io/badge/part%20of-lerd-ff2d20" alt="Part of Lerd"></a>
  <a href="https://lerd.sh/getting-started/wsl2"><img src="https://img.shields.io/badge/docs-lerd.sh-blue" alt="Docs"></a>
  <img src="https://img.shields.io/badge/Windows-10%202004%2B%20%C2%B7%2011-0078d4" alt="Windows 10 2004+ and 11">
  <img src="https://img.shields.io/badge/arch-x64%20%C2%B7%20Arm64-lightgrey" alt="x64 and Arm64">
  <a href="../LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License: MIT"></a>
</p>

Lerd runs Nginx, PHP-FPM and every service as rootless containers, with a dashboard, a TUI, a CLI and an MCP server for your AI assistant. On Windows that stack lives inside WSL2, and getting there by hand means switching on Windows features, rebooting, installing a distro, enabling systemd, wiring up networking and DNS, and trusting a certificate. **This installer does all of it for you.**

That's the whole point: **Lerd on Windows should feel like any other Windows app.** You get a wizard, a Start menu entry and a tray icon. Your `.test` sites work in your Windows browser over HTTPS, with no warning, and notifications show up as Windows notifications. When you want it gone, it's under Add/Remove Programs like everything else.

## What you get

- 🧙 **A wizard, not a tutorial.** It asks for a Linux username, a password and two choices, and does the rest.
- 🐧 **WSL2 and Ubuntu 24.04, set up right.** It turns on the Windows features and installs the latest WSL from Microsoft. It creates your Linux user and enables systemd, which Lerd needs.
- 🔁 **Survives the reboot.** When Windows needs a restart, the installer picks up where it left off after you sign back in.
- 🌐 **`.test` domains in your Windows browser**, over HTTPS with Lerd's certificate trusted by Windows. Or plain `.localhost` over HTTP if you prefer.
- 🖥️ **The Lerd desktop app.** The dashboard in its own window and Lerd's icon in the tray, with native Windows notifications for mail, failing workers and finished jobs. It starts with Windows.
- 🛟 **Safe to run again.** Every step checks before it acts, so if anything fails, run it again and it carries on from that point. The step under way shows above the progress bar, and Show details opens the full live log.
- 🧹 **Clean uninstall.** Remove it from Add/Remove Programs. You choose whether to keep your Linux distro and your data, and either way it removes everything Lerd added to Windows.
- 🔄 **Always the latest Lerd.** The installer carries no Lerd binaries, it fetches the current release, so an older installer never installs an older Lerd.

## Install

Download `Install-Lerd.exe` from the [latest release](https://github.com/lerd-env/lerd-desktop/releases/latest) of the Lerd desktop app and run it. You need Windows 10 version 2004 (build 19041) or newer, or Windows 11, on x64 or Arm64.

> The installer is in beta, like Lerd's Windows support. Every push to `main` also builds `Install-Lerd.exe` as an artifact on the [Actions tab](https://github.com/lerd-env/lerd-desktop/actions/workflows/windows.yml). Prefer doing it by hand? The [WSL2 guide](https://lerd.sh/getting-started/wsl2) covers every step.

## How it works

The installer is a bootstrapper: it prepares Windows and hands Lerd itself to `install.sh`, the way `install.ps1` does from a PowerShell window. It ships with the desktop app and carries the app's version.

1. **WSL features.** Enables `Microsoft-Windows-Subsystem-Linux` and `VirtualMachinePlatform` and offers the restart they need. Setup registers itself in `RunOnce` and resumes after you sign back in with the same account.
2. **WSL.** Installs the latest MSI from github.com/microsoft/WSL. Setup only ever runs the real `wsl.exe` in `C:\Program Files\WSL`; the System32 stub opens its own window offering to install WSL.
3. **Ubuntu-24.04**, with a Linux user from the wizard's username and password page. The password reaches `chpasswd` through `WSLENV`, never a command line.
4. **Options page**: `.test` with HTTPS (default) or `.localhost` over HTTP, and whether Lerd manages Node.js. Lerd's installers take the defaults, and a change runs `lerd dns:disable` or `lerd node:unmanage` afterwards. Skipped when Lerd is already installed.
5. **Packages.** Installs Podman and the packages `install.sh` checks for, and turns on linger. The package list lives in `InstallPackages` in `lerd.iss`; keep it in step with `install.sh`.
6. **Desktop app.** Downloads `lerd-desktop-win32-<arch>.zip` from the latest lerd-env/lerd-desktop release into `{app}\desktop`, unless that release is the one already there, and registers it for the signed-in user: the `sh.lerd.Lerd` app ID with Lerd's logo, which its notifications are posted under, the `lerd://` scheme, a Start menu shortcut and a `lerd-desktop` Run entry that starts it hidden in the tray at sign-in. The app holds Lerd's tray icon and notifications on Windows, keeps Lerd's agent running, and has no installer of its own. It comes before Lerd so that `wsl:setup` finds it and leaves the agent to it: started from a Run entry of its own, the unsigned agent reads to Windows Defender as malware making itself persistent, and Defender has quarantined it for that.
7. **Lerd.** Runs `install.sh`.
8. **Certificate.** Imports Lerd's root CA into the Windows user's store from Setup itself, so Windows' confirmation comes to the front. Declining only leaves a browser warning.
9. **Windows integration**: `lerd wsl:setup`, which puts `lerd.exe` and its shims on PATH and, behind one administrator prompt, adds the DNS rule for the site TLD and the `lerd-lan` firewall rule that lets the local network reach LAN shares. Then `lerd notify target native`, since the desktop app only receives Lerd's notifications from the native sink.
10. **Start.** Restarts WSL, waits for the dashboard, and starts the desktop app in the tray, which starts Lerd's agent. The finish page offers to open the app, ends with `install.sh`'s GitHub star note, and has an unticked option to open github.com/lerd-env/lerd.

Every Linux command runs under `setsid -w ... </dev/null`: Setup's hidden console still gives WSL a pty, and a question read from `/dev/tty` would wait forever. Detached, every question takes its default. The user has passwordless sudo (`/etc/sudoers.d/zz-lerd-setup`) only while steps 7 to 9 run.

The full log is in `%TEMP%\Setup Log *.txt`. Silent installs are not supported, since the Linux user's password comes from the wizard.

Uninstalling asks whether to keep the distro, which runs `lerd uninstall --keep-data` inside it, or to delete it with everything in it. Either way it removes Lerd's Windows side: PATH entry, login agent, DNS rule, the `lerd-lan` firewall rule and `%LOCALAPPDATA%\lerd`, the desktop app with its registration, and the root certificate Setup trusted, after Windows asks to confirm. A silent uninstall has nobody to answer that question, so it leaves the certificate trusted and notes it in its log.

## Contributing

### Build

```powershell
winget install JRSoftware.InnoSetup
.\build.ps1                      # -> dist\Install-Lerd.exe
.\build.ps1 -Version 0.2.0       # overrides the version in lerd.iss
```

`build.ps1` generates the icon and wizard images into `assets\` from `branding\`, which holds copies of Lerd's logo (`internal/ui/icons/icon-512.png`) and license, so the build needs nothing outside this repo. Copy them again if Lerd's change. `assets\` and `dist\` are not committed.

### Testing an unreleased build

`/local=<folder>` (or the `LERD_SETUP_LOCAL` environment variable) installs Lerd from a Windows folder holding `install.sh`, `lerd` and `lerd.exe` instead of the latest release. `make build` in a lerd checkout leaves `lerd` and `lerd.exe` in `build\`; copy `install.sh` beside them:

```powershell
dist\Install-Lerd.exe /local=C:\path\to\lerd\build
```

The same folder can hold an unreleased desktop app: `npm run package:win` in lerd-desktop leaves `lerd-desktop-win32-x64.zip` (and the arm64 one) in its `dist\`; copy the one for the machine beside the rest. Setup takes the app from there when it is present, and from the latest lerd-desktop release otherwise.

### Versions and releases

The installer takes the desktop app's version from `package.json`, so a release names one thing. `.github/workflows/windows.yml` builds it after packaging the app on every push to `main` and every pull request and keeps it as a run artifact, and a published release gets `Install-Lerd.exe` beside the app's zips.

### When this needs updating

The installer only changes when one of the things it relies on does:

| It relies on | Update it when |
|---|---|
| The package list in `InstallPackages` | `install.sh` starts requiring another package |
| `Ubuntu-24.04` | a newer Ubuntu LTS should be the default |
| `https://lerd.sh/install.sh`, `lerd wsl:setup`, `lerd dns:disable`, `lerd node:unmanage`, `lerd uninstall --keep-data` | one of them moves or changes its meaning |
| Lerd's root CA at mkcert's CAROOT, `~/.local/share/mkcert/rootCA.pem` unless `CAROOT` or `XDG_DATA_HOME` is set | Lerd moves it |
| Lerd's Windows side: `%LOCALAPPDATA%\lerd`, the `lerd` Run key, the NRPT rule commented `lerd`, the `lerd-lan` Hyper-V firewall rule, the `sh.lerd.Lerd` toast app ID | Lerd changes how `wsl:setup` installs it, so uninstalling still cleans up |
| microsoft/WSL release assets named `*.x64.msi` / `*.arm64.msi` | Microsoft renames them |
| lerd-env/lerd-desktop release assets named `lerd-desktop-win32-x64.zip` / `lerd-desktop-win32-arm64.zip`, with `lerd-desktop.exe` at their root | lerd-desktop renames them or the executable |
| `lerd notify target native` | Lerd renames the command, or the desktop app's notifications move off the native sink |

## License

MIT, see [LICENSE](../LICENSE).
