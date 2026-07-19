# Flatpak packaging

The Lerd desktop app ships as a Flatpak, built on the Electron BaseApp with a
pinned Electron release as a source (the app has no runtime npm dependencies, so
no `flatpak-node-generator` vendoring is needed).

## Build and install locally

```bash
# One-time: builder + runtimes come from Flathub, no root needed.
flatpak remote-add --user --if-not-exists flathub https://flathub.org/repo/flathub.flatpakrepo
flatpak install --user -y flathub org.flatpak.Builder

# Build into a local repo and install.
flatpak run org.flatpak.Builder --force-clean --user --install-deps-from=flathub \
  --repo=repo build-dir flatpak/sh.lerd.Desktop.yml
flatpak build-bundle repo Lerd.flatpak sh.lerd.Desktop \
  --runtime-repo=https://flathub.org/repo/flathub.flatpakrepo
flatpak install --user -y Lerd.flatpak
flatpak run sh.lerd.Desktop
```

`--share=network` lets the sandbox reach the lerd UI on the host loopback
(`127.0.0.1:7073`), and the exported desktop entry registers the `lerd://`
scheme so native-notification clicks focus the window.

## Distribution before Flathub

Host the built OSTree `repo/` and publish `lerd.flatpakref` pointing at it, so
users install with `flatpak install --user https://lerd.sh/lerd.flatpakref`.
When the Flathub submission (a PR adding `sh.lerd.Desktop` to `flathub/flathub`)
lands, Flathub re-hosts the identical manifest and the ref points there instead.

## Updating the Electron version

Bump the two `archive` sources in `sh.lerd.Desktop.yml` (x86_64 and aarch64) to
the new release URL and its `sha256` from the release's `SHASUMS256.txt`.
