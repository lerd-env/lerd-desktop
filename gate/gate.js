'use strict'

const statusEl = document.getElementById('status')

async function check() {
  const { up } = await window.lerd.probe()
  if (up) {
    statusEl.textContent = 'Lerd is up. Loading dashboard…'
    statusEl.classList.add('live')
    window.lerd.loadDashboard()
    return true
  }
  return false
}

const installBtn = document.getElementById('install')
if (window.lerd.platform === 'linux') installBtn.textContent = 'Copy install command'
installBtn.addEventListener('click', async () => {
  const result = await window.lerd.openInstall()
  if (result === 'copied') statusEl.textContent = 'Install command copied. Paste it into a terminal, this window opens the dashboard once lerd runs.'
  if (result === 'terminal') statusEl.textContent = 'Installing in Terminal. This window opens the dashboard once lerd runs.'
})
document.getElementById('retry').addEventListener('click', check)

// Poll until lerd comes online, then the main process swaps in the dashboard.
setInterval(check, 2000)
check()
