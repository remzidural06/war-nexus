param(
  [string]$BackupFolderName = 'buildings_backup_before_outline_removal'
)

$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Drawing

$root = Join-Path $PSScriptRoot '..\src\assets\base\buildings'
$root = [System.IO.Path]::GetFullPath($root)
$backup = Join-Path (Split-Path $root -Parent) $BackupFolderName

if (-not (Test-Path $backup)) {
  New-Item -ItemType Directory -Path $backup | Out-Null
}

$files = Get-ChildItem $root -Filter *.png | Sort-Object Name
foreach ($file in $files) {
  Copy-Item $file.FullName (Join-Path $backup $file.Name) -Force
}

function New-Color([int]$a, [int]$r, [int]$g, [int]$b) {
  return [System.Drawing.Color]::FromArgb(
    [Math]::Max(0, [Math]::Min(255, $a)),
    [Math]::Max(0, [Math]::Min(255, $r)),
    [Math]::Max(0, [Math]::Min(255, $g)),
    [Math]::Max(0, [Math]::Min(255, $b))
  )
}

function Get-Brightness([System.Drawing.Color]$color) {
  return ($color.R + $color.G + $color.B) / 3.0
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

      if ($bmp.GetPixel($nx, $ny).A -le 8) {
        return $true
      }
    }
  }

  return $false
}

function Get-SolidNeighborAverage {
  param(
    [System.Drawing.Bitmap]$bmp,
    [int]$x,
    [int]$y
  )

  $sumR = 0
  $sumG = 0
  $sumB = 0
  $count = 0

  for ($oy = -3; $oy -le 3; $oy++) {
    for ($ox = -3; $ox -le 3; $ox++) {
      if ($ox -eq 0 -and $oy -eq 0) {
        continue
      }

      $nx = $x + $ox
      $ny = $y + $oy
      if ($nx -lt 0 -or $ny -lt 0 -or $nx -ge $bmp.Width -or $ny -ge $bmp.Height) {
        continue
      }

      $neighbor = $bmp.GetPixel($nx, $ny)
      $brightness = Get-Brightness $neighbor
      if ($neighbor.A -ge 210 -and $brightness -lt 235) {
        $sumR += $neighbor.R
        $sumG += $neighbor.G
        $sumB += $neighbor.B
        $count++
      }
    }
  }

  if ($count -eq 0) {
    return $null
  }

  return @{
    R = [int]($sumR / $count)
    G = [int]($sumG / $count)
    B = [int]($sumB / $count)
  }
}

foreach ($file in $files) {
  $bmp = New-Object System.Drawing.Bitmap($file.FullName)
  $edits = New-Object 'System.Collections.Generic.List[object]'

  for ($y = 0; $y -lt $bmp.Height; $y++) {
    for ($x = 0; $x -lt $bmp.Width; $x++) {
      $pixel = $bmp.GetPixel($x, $y)
      if ($pixel.A -le 0) {
        continue
      }

      if (-not (HasTransparentNeighbor -bmp $bmp -x $x -y $y)) {
        continue
      }

      $brightness = Get-Brightness $pixel
      $maxChannel = [Math]::Max($pixel.R, [Math]::Max($pixel.G, $pixel.B))
      $minChannel = [Math]::Min($pixel.R, [Math]::Min($pixel.G, $pixel.B))
      $spread = $maxChannel - $minChannel

      $isStrongHalo = $brightness -ge 210 -and $spread -le 60
      $isSoftHalo = $pixel.A -le 235 -and $brightness -ge 180 -and $spread -le 75

      if (-not ($isStrongHalo -or $isSoftHalo)) {
        continue
      }

      $avg = Get-SolidNeighborAverage -bmp $bmp -x $x -y $y
      if ($null -eq $avg) {
        continue
      }

      $blend = if ($isStrongHalo) { 0.92 } else { 0.82 }
      $newR = [int](($avg.R * $blend) + ($pixel.R * (1 - $blend)))
      $newG = [int](($avg.G * $blend) + ($pixel.G * (1 - $blend)))
      $newB = [int](($avg.B * $blend) + ($pixel.B * (1 - $blend)))

      $newA =
        if ($isStrongHalo) {
          [int]($pixel.A * 0.28)
        } elseif ($pixel.A -lt 180) {
          [int]($pixel.A * 0.4)
        } else {
          [int]($pixel.A * 0.68)
        }

      if ($newA -lt 18) {
        $newA = 0
      }

      $edits.Add(@{
        X = $x
        Y = $y
        Color = (New-Color -a $newA -r $newR -g $newG -b $newB)
      }) | Out-Null
    }
  }

  $tempPath = "$($file.FullName).tmp.png"
  if (Test-Path $tempPath) {
    Remove-Item $tempPath -Force
  }

  foreach ($edit in $edits) {
    $bmp.SetPixel($edit.X, $edit.Y, $edit.Color)
  }

  $bmp.Save($tempPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
  Move-Item $tempPath $file.FullName -Force
}

Write-Output "Processed $($files.Count) building assets. Backup: $backup"
