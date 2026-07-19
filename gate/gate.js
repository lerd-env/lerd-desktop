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

document.getElementById('install').addEventListener('click', () => window.lerd.openInstall())
document.getElementById('retry').addEventListener('click', check)

// Poll until lerd comes online, then the main process swaps in the dashboard.
setInterval(check, 2000)
check()
