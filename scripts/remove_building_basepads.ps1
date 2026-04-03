param(
  [string]$BackupFolderName = 'buildings_backup_before_basepad_removal'
)

$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Drawing

$targetRoot = Join-Path $PSScriptRoot '..\src\assets\base\buildings'
$targetRoot = [System.IO.Path]::GetFullPath($targetRoot)
$backupRoot = Join-Path (Split-Path $targetRoot -Parent) $BackupFolderName

if (-not (Test-Path $backupRoot)) {
  New-Item -ItemType Directory -Path $backupRoot | Out-Null
}

$files = Get-ChildItem $targetRoot -Filter *.png | Sort-Object Name
foreach ($file in $files) {
  Copy-Item $file.FullName (Join-Path $backupRoot $file.Name) -Force
}

function Get-Brightness([System.Drawing.Color]$color) {
  return ($color.R + $color.G + $color.B) / 3.0
}

function Get-Spread([System.Drawing.Color]$color) {
  $max = [Math]::Max($color.R, [Math]::Max($color.G, $color.B))
  $min = [Math]::Min($color.R, [Math]::Min($color.G, $color.B))
  return $max - $min
}

function Is-PadCandidate {
  param(
    [System.Drawing.Color]$Color,
    [int]$Y,
    [int]$Height
  )

  if ($Color.A -le 4) {
    return $true
  }

  $brightness = Get-Brightness $Color
  $spread = Get-Spread $Color

  if ($brightness -lt 58 -or $brightness -gt 220) {
    return $false
  }

  $isEarth =
    (($Color.R -ge $Color.G -and $Color.G -ge $Color.B) -and $Color.R -ge 80) -or
    (($Color.G -ge $Color.R -and $Color.R -ge $Color.B) -and $Color.G -ge 70)

  $isLowerHalf = $Y -ge [int]($Height * 0.28)

  return $isEarth -and $spread -le 95 -and $isLowerHalf
}

foreach ($file in $files) {
  $source = New-Object System.Drawing.Bitmap($file.FullName)
  $bmp = New-Object System.Drawing.Bitmap($source.Width, $source.Height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics = [System.Drawing.Graphics]::FromImage($bmp)
  $graphics.DrawImage($source, 0, 0, $source.Width, $source.Height)
  $graphics.Dispose()
  $source.Dispose()

  $visited = New-Object 'System.Collections.Generic.HashSet[string]'
  $queue = New-Object 'System.Collections.Generic.Queue[object]'

  function Try-Enqueue([int]$x, [int]$y) {
    if ($x -lt 0 -or $y -lt 0 -or $x -ge $bmp.Width -or $y -ge $bmp.Height) {
      return
    }

    $key = "$x,$y"
    if ($visited.Contains($key)) {
      return
    }

    $pixel = $bmp.GetPixel($x, $y)
    if (Is-PadCandidate -Color $pixel -Y $y -Height $bmp.Height) {
      $visited.Add($key) | Out-Null
      $queue.Enqueue([PSCustomObject]@{ X = $x; Y = $y })
    }
  }

  for ($x = 0; $x -lt $bmp.Width; $x++) {
    Try-Enqueue $x 0
    Try-Enqueue $x ($bmp.Height - 1)
  }

  for ($y = 0; $y -lt $bmp.Height; $y++) {
    Try-Enqueue 0 $y
    Try-Enqueue ($bmp.Width - 1) $y
  }

  while ($queue.Count -gt 0) {
    $point = $queue.Dequeue()
    $pixel = $bmp.GetPixel($point.X, $point.Y)
    if ($pixel.A -gt 0) {
      $bmp.SetPixel($point.X, $point.Y, [System.Drawing.Color]::FromArgb(0, 0, 0, 0))
    }

    Try-Enqueue ($point.X - 1) $point.Y
    Try-Enqueue ($point.X + 1) $point.Y
    Try-Enqueue $point.X ($point.Y - 1)
    Try-Enqueue $point.X ($point.Y + 1)
  }

  $tempPath = "$($file.FullName).tmp.png"
  if (Test-Path $tempPath) {
    Remove-Item $tempPath -Force
  }

  $bmp.Save($tempPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
  Move-Item $tempPath $file.FullName -Force
}

Write-Output "Removed connected base pads from $($files.Count) building assets. Backup: $backupRoot"
