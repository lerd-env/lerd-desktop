'use strict'

const test = require('node:test')
const assert = require('node:assert')
const { installAction, INSTALL_COMMAND } = require('../src/install')

test('on Linux the install command is copied, since the Flatpak cannot open a host terminal', () => {
  assert.deepStrictEqual(installAction('linux'), { copy: INSTALL_COMMAND })
})

test('on macOS the install runs in a new Terminal window', () => {
  assert.deepStrictEqual(installAction('darwin'), {
    run: {
      file: 'osascript',
      args: ['-e', 'tell application "Terminal" to activate', '-e', `tell application "Terminal" to do script "${INSTALL_COMMAND}"`],
    },
  })
})

test('on Windows the install opens lerd.sh', () => {
  assert.deepStrictEqual(installAction('win32'), { open: 'https://lerd.sh' })
})
