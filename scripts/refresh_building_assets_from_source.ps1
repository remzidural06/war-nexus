$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Drawing

$sourceRoot = 'C:\Users\User\Desktop\War Nexus\assets'
$targetRoot = Join-Path $PSScriptRoot '..\src\assets\base\buildings'
$targetRoot = [System.IO.Path]::GetFullPath($targetRoot)
$backupRoot = Join-Path (Split-Path $targetRoot -Parent) 'buildings_backup_before_source_refresh'

if (-not (Test-Path $backupRoot)) {
  New-Item -ItemType Directory -Path $backupRoot | Out-Null
}

$mapping = @{
  'hq_t1.png' = 'hq_t1.png'
  'hq_t2.png' = 'hq_t2.png'
  'hq_t3.png' = 'hq_t3.png'
  'oil_refinery_t1.png' = 'oil_refinery_t1.png'
  'oil_refinery_t2.png' = 'oil_refinery_t2.png'
  'oil_refinery_t3.png' = 'oil_refinery_t3.png'
  'power_plant_t1.png' = 'power_plant_t1.png'
  'power_plant_t2.png' = 'power_plant_t2.png'
  'power_plant_t3.png' = 'power_plant_t3.png'
  'research_lab_t1.png' = 'research_lab_t1.png'
  'research_lab_t2.png' = 'research_lab_t2.png'
  'research_lab_t3.png' = 'research_lab_t3.png'
  'barracks_t1.png' = 'barracks_t1.png'
  'barracks_t2.png' = 'barracks_t2.png'
  'barracks_t3.png' = 'barracks_t3.png'
  'ammo_factory_t1.png' = 'ammo_factory_t1.png'
  'ammo_factory_t2.png' = 'ammo_factory_t2.png'
  'ammo_factory_t3.png' = 'ammo_factory_t3.png'
  'hospital_t1.png' = 'hospital_t1.png.png'
  'hospital_t2.png' = 'hospital_t2.png.png'
  'hospital_t3.png' = 'hospital_t3.png.png'
  'warehouse_t1.png' = 'supply_depot_t1.png'
  'warehouse_t2.png' = 'supply_depot_t2.png'
  'warehouse_t3.png' = 'supply_depot_t3.png'
}

foreach ($targetName in $mapping.Keys) {
  $targetPath = Join-Path $targetRoot $targetName
  if (Test-Path $targetPath) {
    Copy-Item $targetPath (Join-Path $backupRoot $targetName) -Force
  }

  $sourcePath = Join-Path $sourceRoot $mapping[$targetName]
  if (-not (Test-Path $sourcePath)) {
    throw "Missing source asset: $sourcePath"
  }

  Copy-Item $sourcePath $targetPath -Force
}

function Is-NearBlack {
  param([System.Drawing.Color]$Color)

  return $Color.A -ge 20 -and $Color.R -le 28 -and $Color.G -le 28 -and $Color.B -le 28
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

Get-ChildItem $targetRoot -Filter *.png | ForEach-Object {
  Clear-BlackBackground $_.FullName
}

Write-Output "Refreshed $($mapping.Count) building assets from $sourceRoot and cleared border-black backgrounds. Backup: $backupRoot"
