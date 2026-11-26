'use strict'

// The host shell flatpak-spawn reaches, and an app opened from Finder, have a
// bare PATH without ~/.local/bin, where install.sh puts lerd, or Homebrew's bin.
const START_SCRIPT = [
  'p=$(command -v lerd) || for p in "$HOME/.local/bin/lerd" /opt/homebrew/bin/lerd /usr/local/bin/lerd; do [ -x "$p" ] && break; done',
  '[ -x "$p" ] || { echo "lerd is not installed on this machine" >&2; exit 127; }',
  'exec "$p" start',
].join('\n')

// startCommand is how the gate starts lerd on Linux and macOS. The argv is fixed here, never
// taken from the page: under Flatpak it runs on the host, outside the sandbox.
function startCommand({ flatpak }) {
  const sh = ['sh', '-c', START_SCRIPT]
  return flatpak ? { file: 'flatpak-spawn', args: ['--host', ...sh] } : { file: sh[0], args: sh.slice(1) }
}

module.exports = { startCommand }
