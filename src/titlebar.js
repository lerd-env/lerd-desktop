'use strict'

// macOS draws its title bar in its own grey, apart from the dashboard. Hidden,
// the window buttons sit on a strip painted by the page instead, and
// the strip moves the window as the title bar did.

const STRIP = 28

// The strip takes the colour of the dashboard's nav rail, so the two read as one
// frame; #app > .h-screen is the dashboard's root, which would otherwise still
// claim the full viewport under it.
const STRIP_CSS = `
body { padding-top: ${STRIP}px; box-sizing: border-box; }
#app > .h-screen { height: calc(100vh - ${STRIP}px); }
body::before {
  content: '';
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: ${STRIP}px;
  z-index: 2147483647;
  background: var(--color-lerd-header-light);
  -webkit-app-region: drag;
}
.dark body::before { background: var(--color-lerd-header); }
`

function windowOptions(platform) {
  return platform === 'darwin' ? { titleBarStyle: 'hidden' } : {}
}

module.exports = { windowOptions, STRIP_CSS }
