param(
  [string[]]$Patterns = @('power_plant_*.png', 'oil_refinery_*.png')
)

$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Drawing

$root = Join-Path $PSScriptRoot '..\src\assets\base\buildings'
$root = [System.IO.Path]::GetFullPath($root)
$backup = Join-Path (Split-Path $root -Parent) 'buildings_backup_before_power_refinery_soften'

if (-not (Test-Path $backup)) {
  New-Item -ItemType Directory -Path $backup | Out-Null
}

$files = foreach ($pattern in $Patterns) {
  Get-ChildItem $root -Filter $pattern
}

$files = $files | Sort-Object FullName -Unique

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

      if ($bmp.GetPixel($nx, $ny).A -le 10) {
        return $true
      }
    }
  }

  return $false
}

function Get-NeighborAverage {
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

      $isHalo =
        ($brightness -ge 188 -and $spread -le 55) -or
        ($pixel.A -le 240 -and $brightness -ge 175 -and $spread -le 65)

      if (-not $isHalo) {
        continue
      }

      $avg = Get-NeighborAverage -bmp $bmp -x $x -y $y
      if ($null -eq $avg) {
        continue
      }

      $newR = [int](($avg.R * 0.88) + ($pixel.R * 0.12))
      $newG = [int](($avg.G * 0.88) + ($pixel.G * 0.12))
      $newB = [int](($avg.B * 0.88) + ($pixel.B * 0.12))
      $newA = if ($pixel.A -lt 220) { [int]($pixel.A * 0.94) } else { $pixel.A }

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

Write-Output "Processed $($files.Count) selected building assets. Backup: $backup"
