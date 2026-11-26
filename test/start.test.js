'use strict'

const test = require('node:test')
const assert = require('node:assert')
const { execFileSync } = require('node:child_process')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { startCommand } = require('../src/start')

test('the Flatpak starts lerd on the host through flatpak-spawn', () => {
  const cmd = startCommand({ flatpak: true })
  assert.strictEqual(cmd.file, 'flatpak-spawn')
  assert.deepStrictEqual(cmd.args.slice(0, 3), ['--host', 'sh', '-c'])
})

test('a dev run starts lerd directly, there is no flatpak-spawn outside the sandbox', () => {
  assert.strictEqual(startCommand({ flatpak: false }).file, 'sh')
})

// The script runs on Linux and macOS; Windows CI has no sh.
const NO_SH = process.platform === 'win32' && 'no sh on Windows'

// The host side of flatpak-spawn has a bare PATH without ~/.local/bin, where
// install.sh puts lerd, so the script falls back to it.
function runScript(home, pathDirs) {
  const { args } = startCommand({ flatpak: false })
  return execFileSync('sh', args, { env: { HOME: home, PATH: pathDirs }, encoding: 'utf8' }).trim()
}

function fakeLerd(dir) {
  fs.mkdirSync(dir, { recursive: true })
  const file = path.join(dir, 'lerd')
  fs.writeFileSync(file, '#!/bin/sh\necho "$0 $*"\n', { mode: 0o755 })
  return file
}

test('the script finds lerd in ~/.local/bin when it is not on PATH', { skip: NO_SH }, () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'lerd-start-'))
  const lerd = fakeLerd(path.join(home, '.local', 'bin'))
  assert.strictEqual(runScript(home, '/usr/bin:/bin'), `${lerd} start`)
})

test('the script prefers lerd on PATH, where a package puts it', { skip: NO_SH }, () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'lerd-start-'))
  fakeLerd(path.join(home, '.local', 'bin'))
  const onPath = fakeLerd(path.join(home, 'pkg'))
  assert.strictEqual(runScript(home, `${path.join(home, 'pkg')}:/usr/bin:/bin`), `${onPath} start`)
})

test('the script fails with a readable message when lerd is not installed', { skip: NO_SH }, () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'lerd-start-'))
  assert.throws(() => runScript(home, '/usr/bin:/bin'), (err) => {
    assert.match(String(err.stderr), /lerd is not installed/)
    return true
  })
})
