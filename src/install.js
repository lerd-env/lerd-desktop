'use strict'

const INSTALL_COMMAND = 'curl -fsSL https://lerd.sh/install.sh | bash'

// installAction is what the gate's Install button does. The Linux Flatpak has
// no host access to open a terminal, so it hands over the command; the macOS
// app is unsandboxed and runs it in Terminal, where the installer can prompt.
function installAction(platform) {
  if (platform === 'linux') return { copy: INSTALL_COMMAND }
  if (platform === 'darwin') {
    return {
      run: {
        file: 'osascript',
        args: ['-e', 'tell application "Terminal" to activate', '-e', `tell application "Terminal" to do script "${INSTALL_COMMAND}"`],
      },
    }
  }
  return { open: 'https://lerd.sh' }
}

module.exports = { installAction, INSTALL_COMMAND }
