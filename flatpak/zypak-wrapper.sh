#!/bin/sh
# Launch the bundled Electron under zypak (from the Electron BaseApp) so the
# Chromium sandbox works inside the Flatpak. /app/main holds our package.json.
# The hint defaults to auto (Wayland, else X11). A command-line switch beats the
# env var in Electron, so we forward ELECTRON_OZONE_PLATFORM_HINT ourselves.
exec zypak-wrapper /app/main/electron/electron --ozone-platform-hint="${ELECTRON_OZONE_PLATFORM_HINT:-auto}" /app/main "$@"
