param(
  [string]$BackupFolderName = 'buildings_backup_before_barracks_floodfill'
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

function Is-BlackBg {
  param([System.Drawing.Color]$color)
  return $color.A -ge 250 -and $color.R -le 6 -and $color.G -le 6 -and $color.B -le 6
}

foreach ($file in $files) {
  $sourceBmp = New-Object System.Drawing.Bitmap($file.FullName)
  $bmp = New-Object System.Drawing.Bitmap($sourceBmp.Width, $sourceBmp.Height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics = [System.Drawing.Graphics]::FromImage($bmp)
  $graphics.DrawImage($sourceBmp, 0, 0, $sourceBmp.Width, $sourceBmp.Height)
  $graphics.Dispose()
  $sourceBmp.Dispose()
  $queue = New-Object 'System.Collections.Generic.Queue[object]'
  $visited = New-Object 'System.Collections.Generic.HashSet[string]'

  function Try-Enqueue([int]$x, [int]$y) {
    if ($x -lt 0 -or $y -lt 0 -or $x -ge $bmp.Width -or $y -ge $bmp.Height) {
      return
    }

    $key = "$x,$y"
    if ($visited.Contains($key)) {
      return
    }

    $pixel = $bmp.GetPixel($x, $y)
    if (Is-BlackBg $pixel) {
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
    $bmp.SetPixel($point.X, $point.Y, [System.Drawing.Color]::FromArgb(0, 0, 0, 0))

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

Write-Output "Flood-filled pure black background for $($files.Count) barracks assets. Backup: $backupRoot"
