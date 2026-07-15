param(
    [Parameter(Mandatory = $true)]
    [string]$OutputPath
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$directory = Split-Path -Parent $OutputPath
if (-not (Test-Path -LiteralPath $directory)) {
    New-Item -ItemType Directory -Path $directory -Force | Out-Null
}

$size = 256
$bitmap = [System.Drawing.Bitmap]::new($size, $size)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$graphics.Clear([System.Drawing.Color]::Transparent)

$bounds = [System.Drawing.RectangleF]::new(12, 12, 232, 232)
$corner = 54
$path = [System.Drawing.Drawing2D.GraphicsPath]::new()
$path.AddArc($bounds.X, $bounds.Y, $corner, $corner, 180, 90)
$path.AddArc($bounds.Right - $corner, $bounds.Y, $corner, $corner, 270, 90)
$path.AddArc($bounds.Right - $corner, $bounds.Bottom - $corner, $corner, $corner, 0, 90)
$path.AddArc($bounds.X, $bounds.Bottom - $corner, $corner, $corner, 90, 90)
$path.CloseFigure()

$background = [System.Drawing.Drawing2D.LinearGradientBrush]::new(
    $bounds,
    [System.Drawing.Color]::FromArgb(255, 255, 83, 92),
    [System.Drawing.Color]::FromArgb(255, 183, 24, 45),
    135
)
$graphics.FillPath($background, $path)

$highlight = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(130, 255, 255, 255), 3)
$graphics.DrawPath($highlight, $path)

$white = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::White)
$light = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(235, 255, 233, 235))
$muted = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(210, 255, 195, 200))
$fontFamily = [System.Drawing.FontFamily]::new('Segoe UI')
$pFont = [System.Drawing.Font]::new($fontFamily, 73, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
$smallFont = [System.Drawing.Font]::new($fontFamily, 19, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)

$graphics.DrawString('P', $pFont, $white, 40, 36)

$card = [System.Drawing.RectangleF]::new(89, 111, 112, 79)
$cardPath = [System.Drawing.Drawing2D.GraphicsPath]::new()
$radius = 13
$cardPath.AddArc($card.X, $card.Y, $radius, $radius, 180, 90)
$cardPath.AddArc($card.Right - $radius, $card.Y, $radius, $radius, 270, 90)
$cardPath.AddArc($card.Right - $radius, $card.Bottom - $radius, $radius, $radius, 0, 90)
$cardPath.AddArc($card.X, $card.Bottom - $radius, $radius, $radius, 90, 90)
$cardPath.CloseFigure()
$graphics.FillPath($light, $cardPath)

$graphics.FillRectangle([System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 187, 26, 45)), 100, 123, 23, 55)
$graphics.FillRectangle($muted, 131, 127, 54, 8)
$graphics.FillRectangle($muted, 131, 144, 42, 7)
$graphics.FillRectangle($muted, 131, 160, 30, 7)
$graphics.DrawString('POST', $smallFont, [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 172, 22, 39)), 100, 196)

$graphics.Dispose()
$background.Dispose(); $highlight.Dispose(); $white.Dispose(); $light.Dispose(); $muted.Dispose(); $pFont.Dispose(); $smallFont.Dispose(); $fontFamily.Dispose(); $path.Dispose(); $cardPath.Dispose()

$pngStream = [System.IO.MemoryStream]::new()
$bitmap.Save($pngStream, [System.Drawing.Imaging.ImageFormat]::Png)
$bitmap.Dispose()
$png = $pngStream.ToArray()
$pngStream.Dispose()

$fileStream = [System.IO.File]::Open($OutputPath, [System.IO.FileMode]::Create, [System.IO.FileAccess]::Write)
$writer = [System.IO.BinaryWriter]::new($fileStream)
$writer.Write([UInt16]0)
$writer.Write([UInt16]1)
$writer.Write([UInt16]1)
$writer.Write([Byte]0)
$writer.Write([Byte]0)
$writer.Write([Byte]0)
$writer.Write([Byte]0)
$writer.Write([UInt16]1)
$writer.Write([UInt16]32)
$writer.Write([UInt32]$png.Length)
$writer.Write([UInt32]22)
$writer.Write($png)
$writer.Dispose()

Write-Host "Ícone criado em $OutputPath"
