<#
.SYNOPSIS
  Builds Install-Lerd.exe, the Inno Setup installer for lerd on Windows (WSL2).

.PARAMETER Version
  The installer's own version, not lerd's. Defaults to the one in lerd.iss.
#>
param(
    [string]$Version
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

# Copies of lerd's logo and license, so the build needs nothing outside this repo.
$branding = Join-Path $PSScriptRoot 'branding'
$assets = Join-Path $PSScriptRoot 'assets'
New-Item -ItemType Directory -Force $assets | Out-Null
$logo = [System.Drawing.Image]::FromFile((Join-Path $branding 'icon-512.png'))

function Resize([System.Drawing.Image]$img, [int]$w, [int]$h, [System.Drawing.Color]$bg, [double]$scale) {
    $bmp = New-Object System.Drawing.Bitmap $w, $h
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = 'HighQualityBicubic'
    $g.SmoothingMode = 'HighQuality'
    $g.PixelOffsetMode = 'HighQuality'
    $g.Clear($bg)
    $side = [int]([Math]::Min($w, $h) * $scale)
    $g.DrawImage($img, [int](($w - $side) / 2), [int](($h - $side) / 2), $side, $side)
    $g.Dispose()
    $bmp
}

# An .ico whose frames are PNGs, which every Windows since Vista reads.
function Write-Ico([string]$path, [int[]]$sizes) {
    $frames = foreach ($s in $sizes) {
        $bmp = Resize $logo $s $s ([System.Drawing.Color]::Transparent) 1.0
        $ms = New-Object System.IO.MemoryStream
        $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
        $bmp.Dispose()
        , $ms.ToArray()
    }
    $out = New-Object System.IO.BinaryWriter ([System.IO.File]::Create($path))
    $out.Write([uint16]0); $out.Write([uint16]1); $out.Write([uint16]$sizes.Count)
    $offset = 6 + 16 * $sizes.Count
    for ($i = 0; $i -lt $sizes.Count; $i++) {
        $s = $sizes[$i] % 256 # 256 is written as 0
        $out.Write([byte]$s); $out.Write([byte]$s); $out.Write([byte]0); $out.Write([byte]0)
        $out.Write([uint16]1); $out.Write([uint16]32)
        $out.Write([uint32]$frames[$i].Length); $out.Write([uint32]$offset)
        $offset += $frames[$i].Length
    }
    foreach ($f in $frames) { $out.Write($f) }
    $out.Close()
}

Write-Ico (Join-Path $assets 'lerd.ico') @(16, 24, 32, 48, 64, 256)

# Wizard images at 100%, 125%, 150%, 200% and 250% DPI, as Inno's modern style expects.
$i = 0
foreach ($scale in 1.0, 1.25, 1.5, 2.0, 2.5) {
    # Inno puts the header image flush against the window's right edge, so the
    # logo gets a white margin of its own inside the box.
    $small = Resize $logo ([int](58 * $scale)) ([int](58 * $scale)) ([System.Drawing.Color]::White) 0.7
    $small.Save((Join-Path $assets "wizard-small-$i.bmp"), [System.Drawing.Imaging.ImageFormat]::Bmp)
    $small.Dispose()
    $large = Resize $logo ([int](164 * $scale)) ([int](314 * $scale)) ([System.Drawing.Color]::White) 0.8
    $large.Save((Join-Path $assets "wizard-$i.bmp"), [System.Drawing.Imaging.ImageFormat]::Bmp)
    $large.Dispose()
    $i++
}
$logo.Dispose()

Copy-Item (Join-Path $branding 'LICENSE') (Join-Path $assets 'LICENSE.txt') -Force

$iscc = @(
    (Join-Path $env:LOCALAPPDATA 'Programs\Inno Setup 6\ISCC.exe'),
    (Join-Path ${env:ProgramFiles(x86)} 'Inno Setup 6\ISCC.exe'),
    (Join-Path $env:ProgramFiles 'Inno Setup 6\ISCC.exe')
) | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $iscc) { throw 'ISCC.exe not found; install Inno Setup 6 (winget install JRSoftware.InnoSetup)' }

$isccArgs = @()
if ($Version) { $isccArgs += "/DAppVersion=$Version" }
$isccArgs += Join-Path $PSScriptRoot 'lerd.iss'
& $iscc $isccArgs
if ($LASTEXITCODE -ne 0) { throw "ISCC failed with exit code $LASTEXITCODE" }
