$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$baseDir = Join-Path $root 'src\assets\base'
$buildingDir = Join-Path $baseDir 'buildings'
$terrainDir = Join-Path $baseDir 'terrain'
New-Item -ItemType Directory -Force -Path $buildingDir | Out-Null
New-Item -ItemType Directory -Force -Path $terrainDir | Out-Null

function New-RoundRectPath {
  param([float]$X, [float]$Y, [float]$Width, [float]$Height, [float]$Radius)
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $d = $Radius * 2
  $path.AddArc($X, $Y, $d, $d, 180, 90)
  $path.AddArc($X + $Width - $d, $Y, $d, $d, 270, 90)
  $path.AddArc($X + $Width - $d, $Y + $Height - $d, $d, $d, 0, 90)
  $path.AddArc($X, $Y + $Height - $d, $d, $d, 90, 90)
  $path.CloseFigure()
  return $path
}

function Fill-RoundRect {
  param($Graphics, $Brush, [float]$X, [float]$Y, [float]$Width, [float]$Height, [float]$Radius)
  $path = New-RoundRectPath -X $X -Y $Y -Width $Width -Height $Height -Radius $Radius
  $Graphics.FillPath($Brush, $path)
  $path.Dispose()
}

function Draw-RoundRect {
  param($Graphics, $Pen, [float]$X, [float]$Y, [float]$Width, [float]$Height, [float]$Radius)
  $path = New-RoundRectPath -X $X -Y $Y -Width $Width -Height $Height -Radius $Radius
  $Graphics.DrawPath($Pen, $path)
  $path.Dispose()
}

function New-Brush([string]$Hex, [int]$Alpha = 255) {
  $color = [System.Drawing.ColorTranslator]::FromHtml($Hex)
  return New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb($Alpha, $color.R, $color.G, $color.B))
}

function New-Pen([string]$Hex, [float]$Width = 1, [int]$Alpha = 255) {
  $color = [System.Drawing.ColorTranslator]::FromHtml($Hex)
  return New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb($Alpha, $color.R, $color.G, $color.B), $Width)
}

function Draw-Terrain {
  param($Path)
  $w = 1080
  $h = 720
  $bmp = New-Object System.Drawing.Bitmap $w, $h
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.Clear([System.Drawing.ColorTranslator]::FromHtml('#c69d62'))

  $skyTop = New-Brush '#647472'
  $skyMid = New-Brush '#a7a58c'
  $skyLow = New-Brush '#e6c98d'
  $duneA = New-Brush '#d2b174' 170
  $duneB = New-Brush '#c59d60' 160
  $road = New-Pen '#8f744b' 22 120
  $roadSmall = New-Pen '#9d8256' 12 100
  $runway = New-Brush '#a29a8d' 220
  $commandZone = New-Brush '#d7b77d' 110
  $industryZone = New-Brush '#b28e5f' 95
  $green = New-Brush '#7f8657' 110
  $water = New-Brush '#3f6574' 170
  $light = New-Brush '#f4dca1' 120
  $building = New-Brush '#b59464' 95
  $darkBuilding = New-Brush '#8a6d46' 75

  $g.FillRectangle($skyTop, 0, 0, $w, 120)
  $g.FillRectangle($skyMid, 0, 110, $w, 120)
  $g.FillRectangle($skyLow, 0, 220, $w, 70)
  $g.FillEllipse($light, 700, 60, 260, 260)
  $g.FillEllipse($duneA, -120, 220, 420, 150)
  $g.FillEllipse($duneB, 760, 240, 380, 130)

  $pts = [System.Drawing.Point[]]@(
    (New-Object System.Drawing.Point(340, 60)),
    (New-Object System.Drawing.Point(520, 70)),
    (New-Object System.Drawing.Point(500, 400)),
    (New-Object System.Drawing.Point(310, 380))
  )
  $g.FillPolygon($runway, $pts)
  $g.FillRectangle((New-Brush '#efece2' 200), 394, 120, 16, 170)
  $g.DrawCurve($road, [System.Drawing.Point[]]@(
      (New-Object System.Drawing.Point(40, 650)),
      (New-Object System.Drawing.Point(180, 590)),
      (New-Object System.Drawing.Point(420, 620)),
      (New-Object System.Drawing.Point(800, 600)),
      (New-Object System.Drawing.Point(1040, 660))
    ))
  $g.DrawCurve($roadSmall, [System.Drawing.Point[]]@(
      (New-Object System.Drawing.Point(250, 620)),
      (New-Object System.Drawing.Point(340, 500)),
      (New-Object System.Drawing.Point(550, 500)),
      (New-Object System.Drawing.Point(760, 560))
    ))

  Fill-RoundRect $g $commandZone 340 420 360 170 60
  Fill-RoundRect $g $industryZone 760 370 220 220 36
  Fill-RoundRect $g $green 40 500 240 180 44
  Fill-RoundRect $g $green 830 560 170 110 40
  $g.FillPie($water, 920, 510, 220, 220, 0, 90)

  foreach ($x in 120, 170, 214, 448, 510, 566, 754, 800, 838) {
    foreach ($y in 340, 390, 470, 530) {
      $brush = if (($x + $y) % 2 -eq 0) { $building } else { $darkBuilding }
      Fill-RoundRect $g $brush $x $y (Get-Random -Minimum 24 -Maximum 54) (Get-Random -Minimum 16 -Maximum 30) 6
    }
  }

  Fill-RoundRect $g $light 300 610 470 32 16
  Fill-RoundRect $g $building 894 602 66 34 10
  Fill-RoundRect $g $building 490 212 120 28 12

  $bmp.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose()
  $bmp.Dispose()
}

function Draw-BaseShadow {
  param($Graphics, [int]$Width = 420, [int]$Height = 260)
  $shadow = New-Brush '#4a2d16' 90
  $pad = New-Brush '#8f6e44' 70
  $glow = New-Brush '#efdca6' 40
  $Graphics.FillEllipse($shadow, 56, 198, 320, 34)
  $Graphics.FillEllipse($pad, 72, 186, 292, 26)
  $Graphics.FillEllipse($glow, 100, 174, 236, 40)
  $shadow.Dispose(); $pad.Dispose(); $glow.Dispose()
}

function Draw-HQ {
  param($Graphics, [int]$Tier)
  $base = New-Brush '#e0c7a1'
  $roof = New-Brush '#7aa4be'
  $hall = New-Brush '#c1a06f'
  $wing = New-Brush '#cfb38a'
  $glass = New-Brush '#e9dec6' 210
  $steel = New-Brush '#9fb3b9'
  $gate = New-Brush '#7f6443'
  $accent = New-Brush '#67d2ff' 180
  $linePen = New-Pen '#705734' 2 190

  Fill-RoundRect $Graphics $base 92 70 240 122 26
  Draw-RoundRect $Graphics $linePen 92 70 240 122 26
  Fill-RoundRect $Graphics $roof 108 82 208 18 9
  Fill-RoundRect $Graphics $hall 136 120 152 50 18
  Fill-RoundRect $Graphics $wing 184 90 56 52 12
  Fill-RoundRect $Graphics $glass 152 130 120 10 5
  $Graphics.FillRectangle($gate, 282, 84, 6, 44)
  $Graphics.FillEllipse($steel, 188, 150, 48, 48)
  $font = New-Object System.Drawing.Font('Segoe UI', 12, [System.Drawing.FontStyle]::Bold)
  $Graphics.DrawString('H', $font, (New-Brush '#fffaf0'), 202, 162)
  Fill-RoundRect $Graphics $gate 200 176 24 10 4

  if ($Tier -ge 2) {
    Fill-RoundRect $Graphics $wing 98 122 36 28 10
    Fill-RoundRect $Graphics $wing 290 122 36 28 10
    Fill-RoundRect $Graphics $glass 146 180 132 8 4
    Fill-RoundRect $Graphics $accent 168 102 88 6 3
  }
  if ($Tier -ge 3) {
    Fill-RoundRect $Graphics $base 122 58 180 14 7
    $Graphics.FillRectangle($gate, 108, 92, 10, 28)
    $Graphics.FillRectangle($gate, 304, 92, 10, 28)
    Fill-RoundRect $Graphics $glass 170 74 82 6 3
  }

  $font.Dispose()
  $base.Dispose(); $roof.Dispose(); $hall.Dispose(); $wing.Dispose(); $glass.Dispose(); $steel.Dispose(); $gate.Dispose(); $accent.Dispose(); $linePen.Dispose()
}

function Draw-Refinery {
  param($Graphics, [int]$Tier)
  $base = New-Brush '#d1ae7c'
  $hall = New-Brush '#ad8354'
  $stack = New-Brush '#795c37'
  $tankA = New-Brush '#b38d57'
  $tankB = New-Brush '#c49b63'
  $pipe = New-Brush '#897048'
  $light = New-Brush '#f0deb7' 180
  $smoke = New-Brush '#685847' 30
  $pen = New-Pen '#674a26' 2 180

  Fill-RoundRect $Graphics $base 68 84 284 108 20
  Draw-RoundRect $Graphics $pen 68 84 284 108 20
  Fill-RoundRect $Graphics $light 82 94 256 12 6
  Fill-RoundRect $Graphics $hall 132 122 164 46 14
  Fill-RoundRect $Graphics $pipe 84 154 224 10 5
  $Graphics.FillRectangle($stack, 286, 92, 18, 46)
  $Graphics.FillRectangle($stack, 256, 102, 12, 32)
  $Graphics.FillEllipse($tankA, 86, 126, 34, 34)
  $Graphics.FillEllipse($smoke, 276, 78, 42, 24)

  if ($Tier -ge 2) {
    $Graphics.FillEllipse($tankB, 114, 118, 40, 40)
    $Graphics.FillRectangle($stack, 94, 96, 8, 36)
    $Graphics.FillEllipse((New-Brush '#f7ca6f' 220), 91, 88, 14, 14)
  }
  if ($Tier -ge 3) {
    $Graphics.FillRectangle($stack, 238, 104, 10, 30)
    Fill-RoundRect $Graphics $hall 212 166 84 12 6
    Fill-RoundRect $Graphics $light 186 112 72 6 3
  }

  $base.Dispose(); $hall.Dispose(); $stack.Dispose(); $tankA.Dispose(); $tankB.Dispose(); $pipe.Dispose(); $light.Dispose(); $smoke.Dispose(); $pen.Dispose()
}

function Draw-Barracks {
  param($Graphics, [int]$Tier)
  $base = New-Brush '#d7c29c'
  $roof = New-Brush '#648050'
  $hall = New-Brush '#b0966d'
  $tent = New-Brush '#8f9964'
  $yard = New-Brush '#68754b'
  $line = New-Brush '#efe8bf' 220
  $track = New-Brush '#7d6845' 130
  $post = New-Brush '#7d6845'
  $pen = New-Pen '#6d5735' 2 180

  Fill-RoundRect $Graphics $base 90 86 240 106 20
  Draw-RoundRect $Graphics $pen 90 86 240 106 20
  Fill-RoundRect $Graphics $roof 104 98 212 14 8
  Fill-RoundRect $Graphics $hall 126 130 168 38 12
  Fill-RoundRect $Graphics $tent 102 130 30 18 6
  Fill-RoundRect $Graphics $yard 158 156 96 12 6
  Fill-RoundRect $Graphics $track 108 176 204 8 4
  Fill-RoundRect $Graphics $line 124 182 168 4 2

  if ($Tier -ge 2) { Fill-RoundRect $Graphics $tent 288 130 30 18 6 }
  if ($Tier -ge 3) {
    $Graphics.FillRectangle($post, 292, 104, 10, 30)
    Fill-RoundRect $Graphics $tent 108 110 32 14 6
  }

  $base.Dispose(); $roof.Dispose(); $hall.Dispose(); $tent.Dispose(); $yard.Dispose(); $line.Dispose(); $track.Dispose(); $post.Dispose(); $pen.Dispose()
}

function Draw-ResearchLab {
  param($Graphics, [int]$Tier)
  $base = New-Brush '#e3d7bd'
  $pod = New-Brush '#beb39a'
  $glass = New-Brush '#9ad9ed' 190
  $steel = New-Brush '#dfe8eb'
  $cyan = New-Brush '#72d7ff' 220
  $pen = New-Pen '#666253' 2 170

  Fill-RoundRect $Graphics $base 96 92 226 98 20
  Draw-RoundRect $Graphics $pen 96 92 226 98 20
  Fill-RoundRect $Graphics $glass 110 110 42 20 8
  Fill-RoundRect $Graphics $pod 138 132 146 36 14
  $Graphics.FillRectangle($glass, 202, 98, 12, 40)
  $Graphics.FillEllipse($steel, 272, 106, 24, 24)
  $Graphics.FillEllipse($cyan, 198, 150, 20, 20)
  if ($Tier -ge 2) {
    Fill-RoundRect $Graphics $pod 274 132 24 20 8
    $Graphics.FillEllipse($cyan, 274, 98, 12, 12)
  }
  if ($Tier -ge 3) {
    $ringPen = New-Pen '#89c8e4' 2 150
    $Graphics.DrawEllipse($ringPen, 268, 94, 26, 26)
    $Graphics.FillEllipse($steel, 118, 114, 18, 18)
    $ringPen.Dispose()
  }
  $base.Dispose(); $pod.Dispose(); $glass.Dispose(); $steel.Dispose(); $cyan.Dispose(); $pen.Dispose()
}

function Draw-PowerPlant {
  param($Graphics, [int]$Tier)
  $base = New-Brush '#d7ca9f'
  $block = New-Brush '#b8aa84'
  $green = New-Brush '#8ea275'
  $light = New-Brush '#cfe79e' 180
  $pen = New-Pen '#6c6648' 2 170

  Fill-RoundRect $Graphics $base 100 96 220 96 18
  Draw-RoundRect $Graphics $pen 100 96 220 96 18
  Fill-RoundRect $Graphics $block 142 134 136 34 12
  Fill-RoundRect $Graphics $green 108 108 204 8 4
  $Graphics.FillRectangle($green, 204, 98, 8, 34)
  Fill-RoundRect $Graphics $green 110 138 22 22 8
  Fill-RoundRect $Graphics $green 288 138 22 22 8
  $Graphics.FillEllipse($light, 110, 150, 20, 20)
  if ($Tier -ge 2) {
    Fill-RoundRect $Graphics $green 282 114 22 18 6
    $Graphics.FillRectangle($green, 116, 104, 6, 24)
  }
  if ($Tier -ge 3) {
    $Graphics.FillRectangle($green, 298, 104, 6, 24)
    Fill-RoundRect $Graphics $light 154 108 112 10 4
  }
  $base.Dispose(); $block.Dispose(); $green.Dispose(); $light.Dispose(); $pen.Dispose()
}

function Draw-AmmoFactory {
  param($Graphics, [int]$Tier)
  $base = New-Brush '#d4bc97'
  $block = New-Brush '#b18e65'
  $bunker = New-Brush '#7d5f3d'
  $rack = New-Brush '#6b5845'
  $crate = New-Brush '#9b7e58'
  $pen = New-Pen '#6d5233' 2 170

  Fill-RoundRect $Graphics $base 88 92 238 100 18
  Draw-RoundRect $Graphics $pen 88 92 238 100 18
  Fill-RoundRect $Graphics $block 136 132 160 38 12
  Fill-RoundRect $Graphics $bunker 102 112 36 18 6
  Fill-RoundRect $Graphics $crate 104 154 36 10 4
  Fill-RoundRect $Graphics $rack 104 168 30 6 3
  Fill-RoundRect $Graphics $bunker 288 146 24 18 6
  if ($Tier -ge 2) {
    Fill-RoundRect $Graphics $crate 284 112 24 18 6
    Fill-RoundRect $Graphics $bunker 144 146 24 14 5
  }
  if ($Tier -ge 3) {
    Fill-RoundRect $Graphics $rack 102 170 36 5 3
    Fill-RoundRect $Graphics $bunker 196 166 26 12 5
  }
  $base.Dispose(); $block.Dispose(); $bunker.Dispose(); $rack.Dispose(); $crate.Dispose(); $pen.Dispose()
}

$buildingTargets = @(
  @{ name = 'hq'; drawer = 'Draw-HQ' },
  @{ name = 'power_plant'; drawer = 'Draw-PowerPlant' },
  @{ name = 'research_lab'; drawer = 'Draw-ResearchLab' },
  @{ name = 'oil_refinery'; drawer = 'Draw-Refinery' },
  @{ name = 'ammo_factory'; drawer = 'Draw-AmmoFactory' },
  @{ name = 'barracks'; drawer = 'Draw-Barracks' }
)

foreach ($target in $buildingTargets) {
  foreach ($tier in 1..3) {
    $bmp = New-Object System.Drawing.Bitmap 420, 260
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.Clear([System.Drawing.Color]::Transparent)
    Draw-BaseShadow -Graphics $g
    & $target.drawer $g $tier
    $path = Join-Path $buildingDir ("{0}_t{1}.png" -f $target.name, $tier)
    $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
  }
}

Draw-Terrain -Path (Join-Path $terrainDir 'base_scene.png')

Write-Output "Generated building assets in $buildingDir"
Write-Output "Generated terrain asset in $terrainDir"

