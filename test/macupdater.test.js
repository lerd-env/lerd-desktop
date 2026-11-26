'use strict'

const test = require('node:test')
const assert = require('node:assert')
const { feedURL, zipName } = require('../src/macupdater')

test('feedURL asks update.electronjs.org for this arch and version', () => {
  assert.strictEqual(
    feedURL('arm64', '0.2.9'),
    'https://update.electronjs.org/lerd-env/lerd-desktop/darwin-arm64/0.2.9',
  )
})

// update.electronjs.org picks the asset by name: a .zip naming darwin, with
// -arm64 for Apple silicon and anything else taken as x64.
test('zipName is the release asset update.electronjs.org serves for that arch', () => {
  assert.strictEqual(zipName('arm64'), 'Lerd-darwin-arm64.zip')
  assert.strictEqual(zipName('x64'), 'Lerd-darwin-x64.zip')
  assert.match(zipName('x64'), /.*-(mac|darwin|osx).*\.zip$/i)
  assert.doesNotMatch(zipName('x64'), /-arm64/)
})

test('an arch the feed does not serve is refused', () => {
  assert.throws(() => feedURL('ia32', '0.2.9'), /ia32/)
})
