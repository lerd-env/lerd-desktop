'use strict'

const test = require('node:test')
const assert = require('node:assert')
const {
  tagFromLocation, isNewer, known, announce, checksumFor, checkLatest, downloadInstaller, INSTALLER_ARGS,
} = require('../src/updater')

test('tagFromLocation reads the version GitHub redirects releases/latest to', () => {
  assert.strictEqual(tagFromLocation('https://github.com/lerd-env/lerd-desktop/releases/tag/v0.2.9'), '0.2.9')
  assert.strictEqual(tagFromLocation('https://github.com/lerd-env/lerd-desktop/releases'), null)
  assert.strictEqual(tagFromLocation(null), null)
})

test('isNewer offers only a stable release above the running one', () => {
  assert.strictEqual(isNewer('0.2.9', '0.2.8'), true)
  assert.strictEqual(isNewer('0.10.0', '0.9.9'), true, 'compared as numbers, not text')
  assert.strictEqual(isNewer('0.2.8', '0.2.8'), false)
  assert.strictEqual(isNewer('0.2.7', '0.2.8'), false, 'never a downgrade')
  assert.strictEqual(isNewer('0.3.0-beta.1', '0.2.8'), false, 'never a prerelease')
  assert.strictEqual(isNewer('garbage', '0.2.8'), false)
})

// A check that fails, offline or rate limited, must not hide an update the
// last good check found.
test('known keeps the update a failed check could not confirm', () => {
  assert.strictEqual(known({ latest: '0.2.9' }, null, '0.2.8'), '0.2.9')
  assert.strictEqual(known({ latest: '0.2.9' }, '0.3.0', '0.2.8'), '0.3.0')
  assert.strictEqual(known({}, null, '0.2.8'), null)
})

test('known drops an update the running app has already reached', () => {
  assert.strictEqual(known({ latest: '0.2.9' }, null, '0.2.9'), null)
  assert.strictEqual(known({ latest: '0.2.9' }, '0.2.9', '0.2.9'), null)
})

test('announce tells about each version once, across restarts', () => {
  assert.strictEqual(announce({}, '0.2.9'), true)
  assert.strictEqual(announce({ announced: '0.2.9' }, '0.2.9'), false)
  assert.strictEqual(announce({ announced: '0.2.9' }, '0.3.0'), true)
  assert.strictEqual(announce({}, null), false)
})

test('checksumFor reads the asset line from SHA256SUMS', () => {
  const sums = 'aaa  lerd-desktop-win32-x64.zip\nBBB *Install-Lerd.exe\n'
  assert.strictEqual(checksumFor(sums, 'Install-Lerd.exe'), 'bbb')
  assert.strictEqual(checksumFor(sums, 'Install.exe'), null)
})

test('checkLatest follows no redirect and reads the tag from Location', async () => {
  let asked
  const fetch = async (url, opts) => {
    asked = { url, opts }
    return { status: 302, headers: { get: (h) => (h === 'location' ? 'https://github.com/lerd-env/lerd-desktop/releases/tag/v0.2.9' : null) } }
  }
  assert.strictEqual(await checkLatest({ fetch }), '0.2.9')
  assert.strictEqual(asked.url, 'https://github.com/lerd-env/lerd-desktop/releases/latest')
  assert.strictEqual(asked.opts.redirect, 'manual')
})

test('checkLatest answers null when GitHub cannot be reached', async () => {
  assert.strictEqual(await checkLatest({ fetch: async () => { throw new Error('offline') } }), null)
  assert.strictEqual(await checkLatest({ fetch: async () => ({ status: 429, headers: { get: () => null } }) }), null)
})

function release(files) {
  return async (url) => {
    const name = url.split('/').pop()
    if (!(name in files)) return { ok: false, status: 404 }
    const body = Buffer.from(files[name])
    return { ok: true, status: 200, arrayBuffer: async () => body, text: async () => body.toString() }
  }
}

const sha = (s) => require('node:crypto').createHash('sha256').update(s).digest('hex')

test('downloadInstaller keeps the installer only when it matches the release checksums', async () => {
  const written = {}
  const deps = { dir: 'C:\\tmp', writeFile: async (f, b) => { written[f] = b } }
  const good = release({ 'Install-Lerd.exe': 'setup', SHA256SUMS: `${sha('setup')}  Install-Lerd.exe\n` })
  const file = await downloadInstaller('0.2.9', { fetch: good, ...deps })
  assert.strictEqual(file, 'C:\\tmp\\Install-Lerd-0.2.9.exe')
  assert.strictEqual(written[file].toString(), 'setup')
})

test('downloadInstaller refuses an installer that does not match, and writes nothing', async () => {
  const written = {}
  const deps = { dir: 'C:\\tmp', writeFile: async (f, b) => { written[f] = b } }
  const tampered = release({ 'Install-Lerd.exe': 'evil', SHA256SUMS: `${sha('setup')}  Install-Lerd.exe\n` })
  await assert.rejects(downloadInstaller('0.2.9', { fetch: tampered, ...deps }), /does not match/)
  const unlisted = release({ 'Install-Lerd.exe': 'setup', SHA256SUMS: 'abc  other.zip\n' })
  await assert.rejects(downloadInstaller('0.2.9', { fetch: unlisted, ...deps }), /does not match/)
  assert.deepStrictEqual(written, {})
})

test('downloadInstaller says which file a release is missing', async () => {
  const deps = { dir: 'C:\\tmp', writeFile: async () => {} }
  await assert.rejects(downloadInstaller('0.2.9', { fetch: release({ SHA256SUMS: 'x  Install-Lerd.exe' }), ...deps }), /Install-Lerd.exe: 404/)
  await assert.rejects(downloadInstaller('0.2.9', { fetch: release({}), ...deps }), /SHA256SUMS: 404/)
})

test('the installer runs as an update of the app alone, silently', () => {
  assert.deepStrictEqual(INSTALLER_ARGS, ['/apponly', '/VERYSILENT', '/SUPPRESSMSGBOXES', '/NORESTART'])
})

// LERD_DESKTOP_RELEASES points the check and the download at a mirror, the way
// the installer's LERD_SETUP_LOCAL points it at a local app, so an update can be
// tried end to end before a release exists.
test('the release URL can be pointed at a mirror', async () => {
  const { releasesURL } = require('../src/updater')
  assert.strictEqual(releasesURL({}), 'https://github.com/lerd-env/lerd-desktop/releases')
  assert.strictEqual(releasesURL({ LERD_DESKTOP_RELEASES: 'http://127.0.0.1:8765/releases/' }), 'http://127.0.0.1:8765/releases')
  let asked
  const fetch = async (url) => {
    asked = url
    return { status: 302, headers: { get: () => 'http://127.0.0.1:8765/releases/tag/v0.2.9' } }
  }
  assert.strictEqual(await checkLatest({ fetch, base: 'http://127.0.0.1:8765/releases' }), '0.2.9')
  assert.strictEqual(asked, 'http://127.0.0.1:8765/releases/latest')
})
