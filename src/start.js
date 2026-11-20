'use strict'

// The host shell flatpak-spawn reaches has a bare PATH without ~/.local/bin,
// where install.sh puts lerd, so that is the fallback after PATH.
const START_SCRIPT = [
  'p=$(command -v lerd) || p="$HOME/.local/bin/lerd"',
  '[ -x "$p" ] || { echo "lerd is not installed on this machine" >&2; exit 127; }',
  'exec "$p" start',
].join('\n')

// startCommand is how the Linux gate starts lerd. The argv is fixed here, never
// taken from the page: under Flatpak it runs on the host, outside the sandbox.
function startCommand({ flatpak }) {
  const sh = ['sh', '-c', START_SCRIPT]
  return flatpak ? { file: 'flatpak-spawn', args: ['--host', ...sh] } : { file: sh[0], args: sh.slice(1) }
}

module.exports = { startCommand }
