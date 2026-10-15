'use strict'

const test = require('node:test')
const assert = require('node:assert')
const { protocolClient } = require('../src/protocol')

const base = {
  flatpak: false,
  isPackaged: false,
  execPath: 'C:\\dev\\node_modules\\electron\\dist\\electron.exe',
  appPath: 'C:\\dev\\lerd-desktop',
}

test('Linux and macOS claim lerd:// as before', () => {
  assert.deepStrictEqual(protocolClient({ ...base, platform: 'linux' }), ['lerd'])
  assert.deepStrictEqual(protocolClient({ ...base, platform: 'darwin', isPackaged: true }), ['lerd'])
})

test('the Flatpak leaves lerd:// to its desktop entry', () => {
  assert.strictEqual(protocolClient({ ...base, platform: 'linux', flatpak: true }), null)
})

test('the installed Windows app leaves lerd:// to the installer', () => {
  assert.strictEqual(protocolClient({ ...base, platform: 'win32', isPackaged: true }), null)
})

test('a Windows dev run registers electron.exe with the app folder', () => {
  assert.deepStrictEqual(protocolClient({ ...base, platform: 'win32' }),
    ['lerd', base.execPath, [base.appPath]])
})
