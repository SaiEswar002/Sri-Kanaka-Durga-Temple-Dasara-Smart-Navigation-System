Add-Type -AssemblyName System.Drawing

$srcPath = "public/icons/icon-main.png"
if (!(Test-Path $srcPath)) {
    Write-Error "icon-main.png not found"
    exit 1
}

$fullSrc = (Resolve-Path $srcPath).Path
$srcImg = [System.Drawing.Image]::FromFile($fullSrc)

function Resize-Image($img, [int]$width, [int]$height, [string]$outPath) {
    $bmp = New-Object System.Drawing.Bitmap($width, $height)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)
    $g.DrawImage($img, 0, 0, $width, $height)
    $g.Dispose()
    
    $fullOut = Join-Path (Get-Location) $outPath
    $parentDir = Split-Path $fullOut -Parent
    if (!(Test-Path $parentDir)) {
        New-Item -ItemType Directory -Path $parentDir -Force | Out-Null
    }
    
    $bmp.Save($fullOut, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Host "Generated: $outPath ($width x $height)"
}

function Create-Maskable($img, [int]$size, [string]$outPath) {
    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    
    # Fill background with temple maroon
    $brush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml('#7a1425'))
    $g.FillRectangle($brush, 0, 0, $size, $size)
    $brush.Dispose()
    
    # Safe zone: draw icon scaled to ~82% in center (leaving padding so circular/squircle mask doesn't clip outer gold coin ring)
    $iconSize = [int]($size * 0.82)
    $offset = [int](($size - $iconSize) / 2)
    $g.DrawImage($img, $offset, $offset, $iconSize, $iconSize)
    $g.Dispose()
    
    $fullOut = Join-Path (Get-Location) $outPath
    $bmp.Save($fullOut, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Host "Generated Maskable: $outPath ($size x $size)"
}

# 1. Standard PWA Icons
Resize-Image $srcImg 512 512 "public/icons/icon-512.png"
Resize-Image $srcImg 192 192 "public/icons/icon-192.png"
Create-Maskable $srcImg 512 "public/icons/icon-maskable-512.png"

# 2. Apple Touch Icon (180x180)
Resize-Image $srcImg 180 180 "public/icons/apple-touch-icon.png"

# 3. Favicons
Resize-Image $srcImg 32 32 "public/icons/favicon-32x32.png"
Resize-Image $srcImg 16 16 "public/icons/favicon-16x16.png"
Resize-Image $srcImg 48 48 "public/favicon.ico"

# 4. Next.js App Router root icons
Resize-Image $srcImg 32 32 "src/app/icon.png"
Resize-Image $srcImg 180 180 "src/app/apple-icon.png"

$srcImg.Dispose()
Write-Host "All icons processed successfully from icon-main.png!"
