'use strict'

const path = require('node:path')
const { lerdExePath } = require('./tray')

// The lerd agent on Windows: `lerd.exe --agent` boots the distro at login and
// answers DNS for the site TLD on 127.0.0.1:53. With this app installed, the
// app starts it rather than a Run entry of the agent's own: an unsigned exe
// registered under Run from PowerShell and started through a headless conhost
// reads to Windows Defender as malware making itself persistent, and it has
// quarantined lerd.exe for exactly that. The app is started at login from
// Program Files instead, and keeps the agent running.

// The agent exits with this code when another one already runs in the session.
const ALREADY_RUNNING = 3

const RESTART_MS = 2000
const RETRY_MAX_MS = 60000
// An agent that ran this long was working; one that exits sooner is failing.
const HEALTHY_MS = 60000

// agentCommand is how to start the agent, or null while lerd is not set up on
// Windows: the agent needs both the shim and the config wsl:setup puts beside
// it.
function agentCommand({ localAppData = process.env.LOCALAPPDATA || '', exists }) {
  const exe = lerdExePath(localAppData)
  const conf = path.win32.join(path.win32.dirname(exe), 'lerd-wsl.conf')
  if (!exists(exe) || !exists(conf)) return null
  return { file: exe, args: ['--agent'] }
}

// nextDelay says how long to wait before starting the agent again after it
// exited with code, having run for ranMs. An agent that had been running is
// started again at once: wsl:setup rewriting the config, or an update, stops
// it on purpose. One that keeps failing straight away backs off.
function nextDelay({ code, ranMs, lastDelay }) {
  if (code === ALREADY_RUNNING) return RETRY_MAX_MS
  if (ranMs >= HEALTHY_MS) return RESTART_MS
  return Math.min(Math.max(lastDelay * 2, RESTART_MS), RETRY_MAX_MS)
}

// superviseAgent keeps the agent running. spawn starts it and returns the
// child; command says what to start, or null to look again later. The agent
// outlives this app on purpose: quitting the tray must not take DNS for the
// sites with it.
function superviseAgent({ spawn, command, now = Date.now, schedule = setTimeout, log = () => {} }) {
  let delay = 0

  const start = () => {
    const cmd = command()
    if (!cmd) {
      schedule(start, RETRY_MAX_MS)
      return
    }
    const started = now()
    let child
    try {
      child = spawn(cmd.file, cmd.args)
    } catch (err) {
      log(`starting the lerd agent: ${err.message}`)
      schedule(start, RETRY_MAX_MS)
      return
    }
    let done = false
    const exited = (code) => {
      if (done) return
      done = true
      delay = nextDelay({ code, ranMs: now() - started, lastDelay: delay })
      if (code !== ALREADY_RUNNING) log(`the lerd agent exited with ${code}; starting it again in ${delay} ms`)
      schedule(start, delay)
    }
    child.on('exit', exited)
    // A spawn that fails, an exe gone since the check, says so here.
    child.on('error', (err) => {
      log(`the lerd agent: ${err.message}`)
      exited(null)
    })
  }

  start()
}

module.exports = { ALREADY_RUNNING, agentCommand, nextDelay, superviseAgent }
