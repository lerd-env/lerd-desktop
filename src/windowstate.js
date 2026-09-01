'use strict'

const fs = require('node:fs')

const DEFAULT_WIDTH = 1280
const DEFAULT_HEIGHT = 800
const MIN_WIDTH = 940
const MIN_HEIGHT = 600

// onSomeWorkArea reports whether a frame still overlaps a display, so a window
// last closed on a monitor that is now unplugged does not open out of reach.
function onSomeWorkArea(frame, workAreas) {
  return workAreas.some(
    (area) =>
      frame.x < area.x + area.width &&
      frame.x + frame.width > area.x &&
      frame.y < area.y + area.height &&
      frame.y + frame.height > area.y
  )
}

// normalize turns a saved frame into bounds the window can open with. Anything
// unusable falls back to the default size, since a window that opens at the old
// default beats one that refuses to open.
function normalize(saved, workAreas = []) {
  const state = { width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT, maximized: false }
  if (!saved || typeof saved !== 'object') return state

  if (Number.isFinite(saved.width)) state.width = Math.max(MIN_WIDTH, Math.round(saved.width))
  if (Number.isFinite(saved.height)) state.height = Math.max(MIN_HEIGHT, Math.round(saved.height))
  state.maximized = saved.maximized === true

  if (Number.isFinite(saved.x) && Number.isFinite(saved.y)) {
    const frame = {
      x: Math.round(saved.x),
      y: Math.round(saved.y),
      width: state.width,
      height: state.height,
    }
    if (onSomeWorkArea(frame, workAreas)) {
      state.x = frame.x
      state.y = frame.y
    }
  }

  return state
}

// read hands back whatever is on disk, or null when there is nothing usable.
// normalize is what decides if the contents make sense.
function read(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch {
    return null
  }
}

// write is synchronous because it also runs from the window's close handler,
// where an async write would not finish.
function write(file, state) {
  try {
    fs.writeFileSync(file, JSON.stringify(state, null, 2))
  } catch {
    // A lost frame is not worth failing a close over.
  }
}

module.exports = { normalize, read, write, DEFAULT_WIDTH, DEFAULT_HEIGHT, MIN_WIDTH, MIN_HEIGHT }
