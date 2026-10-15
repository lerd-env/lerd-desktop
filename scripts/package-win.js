'use strict'

// Packages the Windows app into dist/lerd-desktop-win32-<arch>.zip, one per
// architecture, for lerd's Windows installer to download from the release and
// unpack under Program Files. The zip holds the app folder's contents at its
// root, lerd-desktop.exe among them. The installer, not this, registers the
// app with Windows, so nothing here is an installer of its own.
//
//   npm run package:win
//
// The executable is lerd-desktop.exe rather than Lerd.exe so it never reads as
// lerd.exe, the agent and shim lerd puts on the Windows PATH.

const path = require('node:path')
const fs = require('node:fs')
const { execFileSync } = require('node:child_process')

const ROOT = path.join(__dirname, '..')
const OUT = path.join(ROOT, 'dist')
const ARCHS = ['x64', 'arm64']

// Only what the app runs from goes in: src, gate and assets, and package.json.
// It has no runtime dependencies, so node_modules stays out whole.
const IGNORE = [
  /^\/(test|scripts|flatpak|dist|build|build-dir|repo|node_modules)(\/|$)/,
  /^\/\.[^/]+/,
  /^\/package-lock\.json$/,
  /^\/README/,
  /\.flatpakref$/,
]

// Windows' own tar writes zips; Git's or MSYS's GNU tar would not.
function zip(dir, file) {
  const tar = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'tar.exe')
  fs.rmSync(file, { force: true })
  execFileSync(tar, ['-a', '-c', '-f', file, '-C', dir, '.'], { stdio: 'inherit' })
}

async function main() {
  const { packager } = await import('@electron/packager')
  const dirs = await packager({
    dir: ROOT,
    out: OUT,
    overwrite: true,
    platform: 'win32',
    arch: ARCHS,
    executableName: 'lerd-desktop',
    icon: path.join(ROOT, 'assets', 'icon.ico'),
    asar: true,
    ignore: IGNORE,
    win32metadata: {
      CompanyName: 'Lerd',
      FileDescription: 'Lerd',
      ProductName: 'Lerd',
    },
  })
  for (const dir of dirs) {
    const arch = ARCHS.find((a) => dir.endsWith(`-win32-${a}`))
    const file = path.join(OUT, `lerd-desktop-win32-${arch}.zip`)
    zip(dir, file)
    console.log(file)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
