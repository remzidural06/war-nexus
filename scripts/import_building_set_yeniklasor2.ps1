param(
  [string]$BackupFolderName = 'buildings_backup_before_yeniklasor2_import'
)

$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Drawing

$desktopRoot = 'C:\Users\User\Desktop'
$sourceRoot = Get-ChildItem $desktopRoot -Directory |
  Where-Object { $_.Name -like 'Yeni klas* (2)' } |
  Select-Object -First 1 -ExpandProperty FullName

if (-not $sourceRoot) {
  throw "Yeni set klasörü bulunamadı."
}

$targetRoot = Join-Path $PSScriptRoot '..\src\assets\base\buildings'
$targetRoot = [System.IO.Path]::GetFullPath($targetRoot)
$backupRoot = Join-Path (Split-Path $targetRoot -Parent) $BackupFolderName

if (-not (Test-Path $backupRoot)) {
  New-Item -ItemType Directory -Path $backupRoot | Out-Null
}

$copyList = @(
  'hq_t1.png',
  'hq_t2.png',
  'hq_t3.png',
  'oil_refinery_t1.png',
  'oil_refinery_t2.png',
  'oil_refinery_t3.png',
  'power_plant_t1.png',
  'power_plant_t2.png',
  'power_plant_t3.png',
  'research_lab_t1.png',
  'research_lab_t2.png',
  'research_lab_t3.png',
  'barracks_t1.png',
  'barracks_t2.png',
  'barracks_t3.png',
  'ammo_factory_t1.png',
  'ammo_factory_t2.png',
  'ammo_factory_t3.png',
  'hospital_t1.png',
  'hospital_t2.png',
  'hospital_t3.png'
)

Get-ChildItem $targetRoot -Filter *.png | ForEach-Object {
  Copy-Item $_.FullName (Join-Path $backupRoot $_.Name) -Force
}

foreach ($name in $copyList) {
  $sourcePath = Join-Path $SourceRoot $name
  if (-not (Test-Path $sourcePath)) {
    throw "Missing source asset: $sourcePath"
  }

  Copy-Item $sourcePath (Join-Path $targetRoot $name) -Force
}

function Is-NearBlack {
  param([System.Drawing.Color]$Color)

  return $Color.A -ge 12 -and $Color.R -le 30 -and $Color.G -le 30 -and $Color.B -le 30
}

function Clear-BlackBackground {
  param([string]$Path)

  $bmp = New-Object System.Drawing.Bitmap($Path)
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

  $tempPath = "$Path.tmp.png"
  if (Test-Path $tempPath) {
    Remove-Item $tempPath -Force
  }

  $bmp.Save($tempPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
  Move-Item $tempPath $Path -Force
}

$processed = foreach ($name in $copyList) {
  $targetPath = Join-Path $targetRoot $name
  Clear-BlackBackground $targetPath
  $name
}

Write-Output "Imported $($processed.Count) new building assets from $SourceRoot. Preserved existing warehouse_t1/t2/t3. Backup: $backupRoot"
