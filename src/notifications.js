'use strict'

const { DEFAULT_HOST, DEFAULT_PORT } = require('./detect')

// lerd's desktop notifications on Windows. lerd-ui decides what to raise (the
// global toggle, the kind preferences, a focused window holding them back) and,
// while this app listens on /api/desktop/ws, hands each one to it instead of
// raising a PowerShell toast from inside WSL. The app raises it under lerd's
// app id and a click opens the dashboard at its route in this window.

const RETRY_MIN_MS = 1000
const RETRY_MAX_MS = 10000

// parseFrame reads one frame off the socket, or null for anything else.
function parseFrame(data) {
  let frame
  try {
    frame = JSON.parse(String(data))
  } catch {
    return null
  }
  if (!frame || frame.type !== 'notification' || typeof frame.title !== 'string' || !frame.title) return null
  return {
    title: frame.title,
    body: typeof frame.body === 'string' ? frame.body : '',
    route: typeof frame.route === 'string' ? frame.route : '',
    urgency: ['low', 'normal', 'critical'].includes(frame.urgency) ? frame.urgency : 'normal',
  }
}

// notificationOptions maps lerd's urgency the way its own toasts do: a low one
// makes no sound and a critical one stays until it is dismissed.
function notificationOptions({ title, body, urgency }) {
  const options = { title, body, silent: urgency === 'low' }
  if (urgency === 'critical') options.timeoutType = 'never'
  return options
}

// deepLink is the lerd:// link for a notification's route, as lerd-ui builds it
// for its own toasts.
function deepLink(route) {
  return 'lerd://open/' + String(route || '').replace(/^\/+/, '')
}

// listen keeps a socket open to lerd-ui and calls onNotification for each
// notification. lerd is often down (WSL stopped, lerd quit), so a lost or
// refused connection retries, backing off up to RETRY_MAX_MS and starting over
// once one opens. It returns a function that stops listening.
function listen(onNotification, {
  host = DEFAULT_HOST,
  port = DEFAULT_PORT,
  WebSocketImpl = globalThis.WebSocket,
  retryMinMs = RETRY_MIN_MS,
  retryMaxMs = RETRY_MAX_MS,
} = {}) {
  const url = `ws://${host}:${port}/api/desktop/ws`
  let socket = null
  let timer = null
  let delay = retryMinMs
  let stopped = false

  const retry = () => {
    if (stopped || timer) return
    timer = setTimeout(() => {
      timer = null
      open()
    }, delay)
    delay = Math.min(delay * 2, retryMaxMs)
  }

  const open = () => {
    if (stopped) return
    let ws
    try {
      ws = new WebSocketImpl(url)
    } catch {
      retry()
      return
    }
    socket = ws
    ws.addEventListener('open', () => {
      delay = retryMinMs
    })
    ws.addEventListener('message', (event) => {
      const n = parseFrame(event.data)
      if (n) onNotification(n)
    })
    // A refused connection fires error and then close; retry once, on close.
    ws.addEventListener('close', () => {
      if (socket === ws) socket = null
      retry()
    })
    ws.addEventListener('error', () => {})
  }

  open()
  return () => {
    stopped = true
    clearTimeout(timer)
    if (socket) socket.close()
  }
}

module.exports = { parseFrame, notificationOptions, deepLink, listen }
