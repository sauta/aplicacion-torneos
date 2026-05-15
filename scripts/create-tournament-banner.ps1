param(
  [Parameter(Mandatory = $true)]
  [string]$Source,

  [Parameter(Mandatory = $true)]
  [string]$Output,

  [int]$Width = 1920,
  [int]$Height = 600
)

Add-Type -AssemblyName System.Drawing

$sourceImage = [System.Drawing.Image]::FromFile($Source)
$canvas = New-Object System.Drawing.Bitmap $Width, $Height
$graphics = [System.Drawing.Graphics]::FromImage($canvas)
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

try {
  $graphics.Clear([System.Drawing.Color]::FromArgb(9, 8, 14))

  $coverScale = [Math]::Max($Width / $sourceImage.Width, $Height / $sourceImage.Height)
  $coverWidth = [int][Math]::Ceiling($sourceImage.Width * $coverScale)
  $coverHeight = [int][Math]::Ceiling($sourceImage.Height * $coverScale)
  $coverX = [int](($Width - $coverWidth) / 2)
  $coverY = [int](($Height - $coverHeight) / 2)

  $smallBackground = New-Object System.Drawing.Bitmap 96, 30
  $smallGraphics = [System.Drawing.Graphics]::FromImage($smallBackground)
  $smallGraphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $smallGraphics.DrawImage($sourceImage, [int]($coverX / 20), [int]($coverY / 20), [int]($coverWidth / 20), [int]($coverHeight / 20))
  $smallGraphics.Dispose()
  $graphics.DrawImage($smallBackground, 0, 0, $Width, $Height)
  $smallBackground.Dispose()

  $darkBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(132, 8, 7, 13))
  $redBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(56, 126, 9, 38))
  $graphics.FillRectangle($darkBrush, 0, 0, $Width, $Height)
  $graphics.FillRectangle($redBrush, [int]($Width * 0.58), 0, [int]($Width * 0.42), $Height)
  $darkBrush.Dispose()
  $redBrush.Dispose()

  $cropX = 0
  $cropY = [int]($sourceImage.Height * 0.27)
  $cropWidth = $sourceImage.Width
  $cropHeight = [int]($sourceImage.Height * 0.45)
  $sourceRect = New-Object System.Drawing.Rectangle $cropX, $cropY, $cropWidth, $cropHeight

  $logoMaxWidth = [int]($Width * 0.58)
  $logoMaxHeight = [int]($Height * 0.86)
  $logoScale = [Math]::Min($logoMaxWidth / $cropWidth, $logoMaxHeight / $cropHeight)
  $logoWidth = [int][Math]::Round($cropWidth * $logoScale)
  $logoHeight = [int][Math]::Round($cropHeight * $logoScale)
  $logoX = [int](($Width - $logoWidth) / 2)
  $logoY = [int](($Height - $logoHeight) / 2)
  $logoBitmap = New-Object System.Drawing.Bitmap $logoWidth, $logoHeight
  $logoGraphics = [System.Drawing.Graphics]::FromImage($logoBitmap)
  $logoGraphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $logoGraphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $logoGraphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $logoGraphics.DrawImage($sourceImage, 0, 0, $sourceRect, [System.Drawing.GraphicsUnit]::Pixel)
  $logoGraphics.Dispose()

  $feather = [Math]::Max(54, [int]($logoHeight * 0.12))
  for ($y = 0; $y -lt $logoBitmap.Height; $y++) {
    for ($x = 0; $x -lt $logoBitmap.Width; $x++) {
      $edgeDistance = [Math]::Min([Math]::Min($x, $logoBitmap.Width - 1 - $x), [Math]::Min($y, $logoBitmap.Height - 1 - $y))
      $alphaFactor = [Math]::Min(1.0, $edgeDistance / $feather)
      if ($alphaFactor -lt 1.0) {
        $pixel = $logoBitmap.GetPixel($x, $y)
        $alpha = [int]($pixel.A * $alphaFactor)
        $logoBitmap.SetPixel($x, $y, [System.Drawing.Color]::FromArgb($alpha, $pixel.R, $pixel.G, $pixel.B))
      }
    }
  }

  $graphics.DrawImage($logoBitmap, $logoX, $logoY, $logoWidth, $logoHeight)
  $logoBitmap.Dispose()

  $encoder = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq "image/jpeg" }
  $encoderParams = New-Object System.Drawing.Imaging.EncoderParameters 1
  $encoderParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter ([System.Drawing.Imaging.Encoder]::Quality), 92L
  $canvas.Save($Output, $encoder, $encoderParams)
}
finally {
  $graphics.Dispose()
  $canvas.Dispose()
  $sourceImage.Dispose()
}
