#!/bin/sh
# Launch the bundled Electron under zypak (from the Electron BaseApp) so the
# Chromium sandbox works inside the Flatpak. /app/main holds our package.json.
# --ozone-platform-hint=auto uses Wayland when available and falls back to X11.
exec zypak-wrapper /app/main/electron/electron --ozone-platform-hint=auto /app/main "$@"
