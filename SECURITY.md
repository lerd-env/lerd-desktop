# Security policy

## Supported versions

Security fixes land on `main` and ship in the next release. Only the latest release is supported, so update before reporting: `flatpak update sh.lerd.Desktop` on Linux, or the latest installer on Windows.

## Reporting a vulnerability

Please do not open a public issue. Report it privately through [GitHub's vulnerability reporting](https://github.com/lerd-env/lerd-desktop/security/advisories/new) instead, with the app version, your OS, and the steps to reproduce.

You will get a reply within a few days. Once a fix is merged, the advisory is published and the reporter credited unless they prefer otherwise.

Lerd Desktop wraps the dashboard that lerd itself serves, so a vulnerability in the dashboard, the CLI or lerd's services belongs to [lerd-env/lerd](https://github.com/lerd-env/lerd/security/advisories/new).
