$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Drawing

$root = Join-Path $PSScriptRoot '..\src\assets\base\buildings'
$root = [System.IO.Path]::GetFullPath($root)
$backup = Join-Path (Split-Path $root -Parent) 'buildings_backup_before_ground_blend'

if (-not (Test-Path $backup)) {
  New-Item -ItemType Directory -Path $backup | Out-Null
}

Get-ChildItem $root -Filter *.png | ForEach-Object {
  Copy-Item $_.FullName (Join-Path $backup $_.Name) -Force
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

  for ($oy = -2; $oy -le 2; $oy++) {
    for ($ox = -2; $ox -le 2; $ox++) {
      if ($ox -eq 0 -and $oy -eq 0) {
        continue
      }

      $nx = $x + $ox
      $ny = $y + $oy
      if ($nx -lt 0 -or $ny -lt 0 -or $nx -ge $bmp.Width -or $ny -ge $bmp.Height) {
        continue
      }

      $neighbor = $bmp.GetPixel($nx, $ny)
      $neighborBrightness = Get-Brightness $neighbor
      if ($neighbor.A -ge 200 -and $neighborBrightness -lt 245) {
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

Get-ChildItem $root -Filter *.png | ForEach-Object {
  $bmp = New-Object System.Drawing.Bitmap($_.FullName)
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
      $channelSpread = $maxChannel - $minChannel

      $isHalo =
        ($brightness -ge 212 -and $channelSpread -le 40) -or
        ($pixel.A -le 235 -and $brightness -ge 190 -and $channelSpread -le 55)

      if (-not $isHalo) {
        continue
      }

      $avg = Get-NeighborAverage -bmp $bmp -x $x -y $y
      if ($null -eq $avg) {
        continue
      }

      $newR = [int](($avg.R * 0.8) + ($pixel.R * 0.2))
      $newG = [int](($avg.G * 0.8) + ($pixel.G * 0.2))
      $newB = [int](($avg.B * 0.8) + ($pixel.B * 0.2))
      $edits.Add(@{
        X = $x
        Y = $y
        Color = (New-Color -a $pixel.A -r $newR -g $newG -b $newB)
      }) | Out-Null
    }
  }

  foreach ($edit in $edits) {
    $bmp.SetPixel($edit.X, $edit.Y, $edit.Color)
  }

  $tempPath = "$($_.FullName).tmp.png"
  if (Test-Path $tempPath) {
    Remove-Item $tempPath -Force
  }
  $bmp.Save($tempPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
  Move-Item $tempPath $_.FullName -Force
}

Write-Output "Processed $((Get-ChildItem $root -Filter *.png).Count) building assets. Backup: $backup"
