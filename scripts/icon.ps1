<#
.SYNOPSIS
  Draws assets/icon.ico, the Windows app's icon, from assets/icon.png.

  Its frames are PNGs, which every Windows since Vista reads. Run it again when
  the logo changes:

    powershell -File scripts/icon.ps1
#>

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$assets = Join-Path $PSScriptRoot '..\assets'
$logo = [System.Drawing.Image]::FromFile((Join-Path $assets 'icon.png'))
$sizes = @(16, 24, 32, 48, 64, 256)

$frames = foreach ($s in $sizes) {
    $bmp = New-Object System.Drawing.Bitmap $s, $s
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = 'HighQualityBicubic'
    $g.SmoothingMode = 'HighQuality'
    $g.PixelOffsetMode = 'HighQuality'
    $g.Clear([System.Drawing.Color]::Transparent)
    $g.DrawImage($logo, 0, 0, $s, $s)
    $g.Dispose()
    $ms = New-Object System.IO.MemoryStream
    $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    , $ms.ToArray()
}
$logo.Dispose()

$out = New-Object System.IO.BinaryWriter ([System.IO.File]::Create((Join-Path $assets 'icon.ico')))
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
