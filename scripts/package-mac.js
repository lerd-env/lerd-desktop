'use strict'

// Packages the macOS app into dist/Lerd-<arch>.dmg, one per architecture,
// holding Lerd.app beside an Applications link to drag it onto.
//
//   npm run package:mac
//
// The app is not signed with a Developer ID, so it is signed ad hoc: Apple
// silicon refuses to run any binary without a signature, and packaging breaks
// the one Electron ships with. Gatekeeper still asks on first open.

const path = require('node:path')
const fs = require('node:fs')
const { execFileSync } = require('node:child_process')

const ROOT = path.join(__dirname, '..')
const OUT = path.join(ROOT, 'dist')
const ARCHS = ['x64', 'arm64']

// Only what the app runs from goes in, as in package-win.js.
const IGNORE = [
  /^\/(test|scripts|flatpak|installer|dist|build|build-dir|repo|node_modules)(\/|$)/,
  /^\/\.[^/]+/,
  /^\/package-lock\.json$/,
  /^\/README/,
  /\.flatpak(ref)?$/,
]

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

async function main() {
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
  })
  for (const dir of dirs) {
    const arch = ARCHS.find((a) => dir.endsWith(`-darwin-${a}`))
    execFileSync('codesign', ['--force', '--deep', '--sign', '-', path.join(dir, 'Lerd.app')], { stdio: 'inherit' })
    const file = path.join(OUT, `Lerd-${arch}.dmg`)
    dmg(dir, file)
    console.log(file)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
