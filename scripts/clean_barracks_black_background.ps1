param(
  [string]$BackupFolderName = 'buildings_backup_before_barracks_black_cleanup'
)

$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Drawing

$targetRoot = Join-Path $PSScriptRoot '..\src\assets\base\buildings'
$targetRoot = [System.IO.Path]::GetFullPath($targetRoot)
$backupRoot = Join-Path (Split-Path $targetRoot -Parent) $BackupFolderName

if (-not (Test-Path $backupRoot)) {
  New-Item -ItemType Directory -Path $backupRoot | Out-Null
}

$files = Get-ChildItem $targetRoot -Filter 'barracks_t*.png' | Sort-Object Name
foreach ($file in $files) {
  Copy-Item $file.FullName (Join-Path $backupRoot $file.Name) -Force
}

function Is-NearBlack {
  param([System.Drawing.Color]$Color)

  return $Color.A -ge 5 -and $Color.R -le 38 -and $Color.G -le 38 -and $Color.B -le 38
}

function Is-DarkMatte {
  param([System.Drawing.Color]$Color)

  $max = [Math]::Max($Color.R, [Math]::Max($Color.G, $Color.B))
  $min = [Math]::Min($Color.R, [Math]::Min($Color.G, $Color.B))
  $spread = $max - $min
  $brightness = ($Color.R + $Color.G + $Color.B) / 3.0
  return $Color.A -gt 0 -and $brightness -le 58 -and $spread -le 18
}

function HasTransparentNeighbor {
  param(
    [System.Drawing.Bitmap]$bmp,
    [int]$x,
    [int]$y
  )

  for ($oy = -1; $oy -le 1; $oy++) {
    for ($ox = -1; $ox -le 1; $ox++) {
      if ($ox -eq 0 -and $oy -eq 0) {
        continue
      }
      $nx = $x + $ox
      $ny = $y + $oy
      if ($nx -lt 0 -or $ny -lt 0 -or $nx -ge $bmp.Width -or $ny -ge $bmp.Height) {
        return $true
      }
      if ($bmp.GetPixel($nx, $ny).A -le 4) {
        return $true
      }
    }
  }

  return $false
}

foreach ($file in $files) {
  $bmp = New-Object System.Drawing.Bitmap($file.FullName)
  $visited = New-Object 'System.Collections.Generic.HashSet[string]'
  $queue = New-Object 'System.Collections.Generic.Queue[object]'

  function Enqueue-IfBlack([int]$x, [int]$y) {
    if ($x -lt 0 -or $y -lt 0 -or $x -ge $bmp.Width -or $y -ge $bmp.Height) {
      return
    }
    $key = "$x,$y"
    if ($visited.Contains($key)) {
      return
    }
    $pixel = $bmp.GetPixel($x, $y)
    if (Is-NearBlack $pixel) {
      $visited.Add($key) | Out-Null
      $queue.Enqueue(@($x, $y))
    }
  }

  for ($x = 0; $x -lt $bmp.Width; $x++) {
    Enqueue-IfBlack $x 0
    Enqueue-IfBlack $x ($bmp.Height - 1)
  }
  for ($y = 0; $y -lt $bmp.Height; $y++) {
    Enqueue-IfBlack 0 $y
    Enqueue-IfBlack ($bmp.Width - 1) $y
  }

  while ($queue.Count -gt 0) {
    $point = $queue.Dequeue()
    $x = $point[0]
    $y = $point[1]
    $bmp.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(0, 0, 0, 0))

    Enqueue-IfBlack ($x - 1) $y
    Enqueue-IfBlack ($x + 1) $y
    Enqueue-IfBlack $x ($y - 1)
    Enqueue-IfBlack $x ($y + 1)
  }

  $edits = New-Object 'System.Collections.Generic.List[object]'
  for ($y = 0; $y -lt $bmp.Height; $y++) {
    for ($x = 0; $x -lt $bmp.Width; $x++) {
      $pixel = $bmp.GetPixel($x, $y)
      if (-not (Is-DarkMatte $pixel)) {
        continue
      }
      if (-not (HasTransparentNeighbor -bmp $bmp -x $x -y $y)) {
        continue
      }
      $edits.Add(@{ X = $x; Y = $y }) | Out-Null
    }
  }

  foreach ($edit in $edits) {
    $bmp.SetPixel($edit.X, $edit.Y, [System.Drawing.Color]::FromArgb(0, 0, 0, 0))
  }

  $tempPath = "$($file.FullName).tmp.png"
  if (Test-Path $tempPath) {
    Remove-Item $tempPath -Force
  }
  $bmp.Save($tempPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
  Move-Item $tempPath $file.FullName -Force
}

Write-Output "Cleaned black background for $($files.Count) barracks assets. Backup: $backupRoot"
