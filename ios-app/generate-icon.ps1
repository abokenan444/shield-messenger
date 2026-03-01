Add-Type -AssemblyName System.Drawing

function Create-ShieldIcon([int]$size, [string]$path) {
    $bmp = New-Object System.Drawing.Bitmap $size, $size
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    
    # Black background
    $g.Clear([System.Drawing.Color]::FromArgb(0, 0, 0))
    
    $s = $size / 100.0
    
    # Shield outer (green gradient)
    $shieldPoints = @(
        [System.Drawing.PointF]::new(50*$s, 5*$s),
        [System.Drawing.PointF]::new(10*$s, 25*$s),
        [System.Drawing.PointF]::new(10*$s, 55*$s),
        [System.Drawing.PointF]::new(30*$s, 75*$s),
        [System.Drawing.PointF]::new(50*$s, 90*$s),
        [System.Drawing.PointF]::new(70*$s, 75*$s),
        [System.Drawing.PointF]::new(90*$s, 55*$s),
        [System.Drawing.PointF]::new(90*$s, 25*$s)
    )
    $greenBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
        [System.Drawing.PointF]::new(0, 5*$s),
        [System.Drawing.PointF]::new(0, 90*$s),
        [System.Drawing.Color]::FromArgb(0, 255, 65),
        [System.Drawing.Color]::FromArgb(0, 143, 17)
    )
    $g.FillPolygon($greenBrush, $shieldPoints)
    
    # Inner shield (black)
    $innerPoints = @(
        [System.Drawing.PointF]::new(50*$s, 14*$s),
        [System.Drawing.PointF]::new(18*$s, 30*$s),
        [System.Drawing.PointF]::new(18*$s, 52*$s),
        [System.Drawing.PointF]::new(34*$s, 69*$s),
        [System.Drawing.PointF]::new(50*$s, 80*$s),
        [System.Drawing.PointF]::new(66*$s, 69*$s),
        [System.Drawing.PointF]::new(82*$s, 52*$s),
        [System.Drawing.PointF]::new(82*$s, 30*$s)
    )
    $blackBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(0, 0, 0))
    $g.FillPolygon($blackBrush, $innerPoints)
    
    # Green neon border on inner shield
    $greenPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(0, 255, 65), [Math]::Max(1.5*$s, 1))
    $g.DrawPolygon($greenPen, $innerPoints)
    
    # $M text
    $fontSize = 26 * $s
    $font = New-Object System.Drawing.Font("Arial", $fontSize, [System.Drawing.FontStyle]::Bold)
    $textBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(0, 255, 65))
    $sf = New-Object System.Drawing.StringFormat
    $sf.Alignment = [System.Drawing.StringAlignment]::Center
    $sf.LineAlignment = [System.Drawing.StringAlignment]::Center
    $g.DrawString("`$M", $font, $textBrush, [System.Drawing.RectangleF]::new(0, -2*$s, $size, $size), $sf)
    
    # Checkmark at bottom
    $checkPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(0, 255, 65), [Math]::Max(3*$s, 2))
    $checkPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $checkPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $g.DrawLine($checkPen, [System.Drawing.PointF]::new(40*$s, 68*$s), [System.Drawing.PointF]::new(48*$s, 74*$s))
    $g.DrawLine($checkPen, [System.Drawing.PointF]::new(48*$s, 74*$s), [System.Drawing.PointF]::new(62*$s, 60*$s))
    
    $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
    Write-Host "Created: $path ($size x $size)"
}

$basePath = "C:\Users\YASSE\Desktop\secure-legion\ios-app\ShieldMessenger\ios\ShieldMessenger\Images.xcassets\AppIcon.appiconset"

# Generate all required sizes
$sizes = @{
    "icon-20@2x" = 40
    "icon-20@3x" = 60
    "icon-29@2x" = 58
    "icon-29@3x" = 87
    "icon-40@2x" = 80
    "icon-40@3x" = 120
    "icon-60@2x" = 120
    "icon-60@3x" = 180
    "icon-1024" = 1024
}

foreach ($entry in $sizes.GetEnumerator()) {
    Create-ShieldIcon -size $entry.Value -path "$basePath\$($entry.Key).png"
}

Write-Host "All icons generated!"
