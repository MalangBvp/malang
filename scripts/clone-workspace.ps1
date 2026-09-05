# Clone all five MalangBvp repos into Documents\project-adi and drop a Cursor workspace there.
$ErrorActionPreference = "Stop"

if ($env:PROJECT_ADI) {
  $Dest = $env:PROJECT_ADI
} else {
  $Docs = [Environment]::GetFolderPath("MyDocuments")
  if (-not $Docs) { $Docs = Join-Path $HOME "Documents" }
  $Dest = Join-Path $Docs "project-adi"
}

New-Item -ItemType Directory -Force -Path $Dest | Out-Null
Set-Location $Dest

function Clone-IfMissing([string]$Name, [string]$Url) {
  $gitDir = Join-Path $Dest (Join-Path $Name ".git")
  if (Test-Path $gitDir) {
    Write-Host "already present: $Name"
  } else {
    git clone $Url $Name
  }
}

Clone-IfMissing "malang" "https://github.com/malangbvp/malang.git"
Clone-IfMissing "malang-tools" "https://github.com/malangbvp/malang-tools.git"
Clone-IfMissing "media" "https://github.com/malangbvp/media.git"
Clone-IfMissing "redirector" "https://github.com/malangbvp/redirector.git"
Clone-IfMissing ".github" "https://github.com/malangbvp/.github.git"

$SrcWorkspace = Join-Path $Dest "malang\docs\project-adi.code-workspace"
$OutWorkspace = Join-Path $Dest "project-adi.code-workspace"
if (Test-Path $SrcWorkspace) {
  Copy-Item $SrcWorkspace $OutWorkspace -Force
} else {
  @'
{
  "folders": [
    { "name": "malang", "path": "malang" },
    { "name": "malang-tools", "path": "malang-tools" },
    { "name": "media", "path": "media" },
    { "name": "redirector", "path": "redirector" },
    { "name": ".github", "path": ".github" }
  ],
  "settings": {
    "files.exclude": { "**/.git": true }
  }
}
'@ | Set-Content -Path $OutWorkspace -Encoding UTF8
}

Write-Host ""
Write-Host "Workspace ready:"
Write-Host "  $Dest"
Write-Host ""
Write-Host "Open in Cursor:"
Write-Host "  cursor `"$OutWorkspace`""
Write-Host "  code `"$OutWorkspace`""
