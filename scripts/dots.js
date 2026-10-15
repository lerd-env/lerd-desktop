'use strict'

// Draws the tray menu's state dots into assets/tray/dots: a 16px PNG and its
// @2x, which Electron picks on high-DPI screens. Windows menus draw emoji in
// monochrome, so the state lerd sends becomes a real menu icon. The colours
// are the ones lerd's own Windows tray used.
//
//   node scripts/dots.js

const fs = require('node:fs')
const path = require('node:path')
const zlib = require('node:zlib')

const COLORS = {
  running: [0x2e, 0xcc, 0x40],
  stopped: [0xe7, 0x4c, 0x3c],
  warning: [0xf1, 0xc4, 0x0f],
  disabled: [0xb0, 0xb0, 0xb0],
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})

function crc32(buf) {
  let c = 0xffffffff
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

// dot draws an anti-aliased disc on a transparent square, sampling each pixel
// 4x4 times for its coverage.
function dot(size, [r, g, b]) {
  const radius = size * 0.34
  const rows = []
  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 4)
    for (let x = 0; x < size; x++) {
      let hits = 0
      for (let sy = 0; sy < 4; sy++) {
        for (let sx = 0; sx < 4; sx++) {
          const dx = x + (sx + 0.5) / 4 - size / 2
          const dy = y + (sy + 0.5) / 4 - size / 2
          if (dx * dx + dy * dy <= radius * radius) hits++
        }
      }
      row.set([r, g, b, Math.round((hits / 16) * 255)], 1 + x * 4)
    }
    rows.push(row)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr.set([8, 6, 0, 0, 0], 8) // 8-bit RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(Buffer.concat(rows))),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

const dir = path.join(__dirname, '..', 'assets', 'tray', 'dots')
fs.mkdirSync(dir, { recursive: true })
for (const [state, rgb] of Object.entries(COLORS)) {
  fs.writeFileSync(path.join(dir, `${state}.png`), dot(16, rgb))
  fs.writeFileSync(path.join(dir, `${state}@2x.png`), dot(32, rgb))
}
