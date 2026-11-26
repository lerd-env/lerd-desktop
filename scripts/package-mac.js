'use strict'

// Packages the macOS app into dist/Lerd-<arch>.dmg, one per architecture,
// holding Lerd.app beside an Applications link to drag it onto.
//
//   npm run package:mac
//
// With LERD_MAC_SIGN_IDENTITY set, the app and the DMG are signed with that
// Developer ID and notarized with the App Store Connect key in APPLE_API_KEY,
// APPLE_API_KEY_ID and APPLE_API_ISSUER, so Gatekeeper opens them without asking.
// Without it the app is signed ad hoc: Apple silicon refuses to run any binary
// without a signature, and packaging breaks the one Electron ships with.

const path = require('node:path')
const fs = require('node:fs')
const { execFileSync } = require('node:child_process')
const { zipName } = require('../src/macupdater')

const ROOT = path.join(__dirname, '..')
const OUT = path.join(ROOT, 'dist')
const ARCHS = ['x64', 'arm64']
const NOTARY_KEYS = ['APPLE_API_KEY', 'APPLE_API_KEY_ID', 'APPLE_API_ISSUER']

// Only what the app runs from goes in, as in package-win.js.
const IGNORE = [
  /^\/(test|scripts|flatpak|installer|dist|build|build-dir|repo|node_modules)(\/|$)/,
  /^\/\.[^/]+/,
  /^\/package-lock\.json$/,
  /^\/README/,
  /\.flatpak(ref)?$/,
]

// signing is the Developer ID setup the environment asks for, or null for ad hoc.
function signing(env) {
  if (!env.LERD_MAC_SIGN_IDENTITY) return null
  const missing = NOTARY_KEYS.filter((k) => !env[k])
  if (missing.length) throw new Error(`LERD_MAC_SIGN_IDENTITY is set but ${missing.join(', ')} is not`)
  return {
    identity: env.LERD_MAC_SIGN_IDENTITY,
    key: env.APPLE_API_KEY,
    keyId: env.APPLE_API_KEY_ID,
    issuer: env.APPLE_API_ISSUER,
  }
}

// Packager signs every helper with osx-sign's own entitlements; the main app
// only needs JIT for V8, not the camera, microphone and location it grants.
function signOptions(sign) {
  return {
    identity: sign.identity,
    optionsForFile: (file) => (file.endsWith('Lerd.app') ? { entitlements: ['com.apple.security.cs.allow-jit'] } : null),
  }
}

function dmg(appDir, file) {
  const stage = path.join(OUT, `dmg-${path.basename(file, '.dmg')}`)
  fs.rmSync(stage, { recursive: true, force: true })
  fs.mkdirSync(stage, { recursive: true })
  fs.cpSync(path.join(appDir, 'Lerd.app'), path.join(stage, 'Lerd.app'), { recursive: true, verbatimSymlinks: true })
  fs.symlinkSync('/Applications', path.join(stage, 'Applications'))
  fs.rmSync(file, { force: true })
  execFileSync('hdiutil', ['create', '-volname', 'Lerd', '-srcfolder', stage, '-format', 'UDZO', file], { stdio: 'inherit' })
  fs.rmSync(stage, { recursive: true, force: true })
}

// The app inside is already notarized and stapled; the DMG gets its own ticket
// so the first open is not held up checking it online.
function notarizeDmg(file, sign) {
  const run = (cmd, args) => execFileSync(cmd, args, { stdio: 'inherit' })
  run('codesign', ['--sign', sign.identity, '--timestamp', file])
  run('xcrun', ['notarytool', 'submit', file, '--key', sign.key, '--key-id', sign.keyId, '--issuer', sign.issuer, '--wait'])
  run('xcrun', ['stapler', 'staple', file])
}

async function main() {
  const sign = signing(process.env)
  const { packager } = await import('@electron/packager')
  const dirs = await packager({
    dir: ROOT,
    out: OUT,
    overwrite: true,
    platform: 'darwin',
    arch: ARCHS,
    name: 'Lerd',
    appBundleId: 'sh.lerd.Desktop',
    appCategoryType: 'public.app-category.developer-tools',
    icon: path.join(ROOT, 'assets', 'icon.icns'),
    asar: true,
    ignore: IGNORE,
    // Info.plist has to declare lerd:// before setAsDefaultProtocolClient takes it.
    protocols: [{ name: 'Lerd', schemes: ['lerd'] }],
    osxSign: sign ? signOptions(sign) : undefined,
    osxNotarize: sign ? { appleApiKey: sign.key, appleApiKeyId: sign.keyId, appleApiIssuer: sign.issuer } : undefined,
  })
  for (const dir of dirs) {
    const arch = ARCHS.find((a) => dir.endsWith(`-darwin-${a}`))
    if (!sign) execFileSync('codesign', ['--force', '--deep', '--sign', '-', path.join(dir, 'Lerd.app')], { stdio: 'inherit' })
    const file = path.join(OUT, `Lerd-${arch}.dmg`)
    dmg(dir, file)
    if (sign) notarizeDmg(file, sign)
    console.log(file)
    // The app's own update downloads this; ditto keeps the signature's symlinks.
    const zip = path.join(OUT, zipName(arch))
    fs.rmSync(zip, { force: true })
    execFileSync('ditto', ['-c', '-k', '--keepParent', path.join(dir, 'Lerd.app'), zip], { stdio: 'inherit' })
    console.log(zip)
  }
}

module.exports = { signing }

if (require.main === module) {
  main().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
