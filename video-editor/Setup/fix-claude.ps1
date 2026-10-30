# Finds Claude Code (installs it if missing), puts it on PATH, makes the Dolly Studio icon on the
# REAL desktop (OneDrive-aware), and starts the edit. Run:
#   cd $HOME\Documents\dolly; git pull; powershell -ExecutionPolicy Bypass -File .\video-editor\Setup\fix-claude.ps1
$Studio = (Resolve-Path "$PSScriptRoot\..").Path
function Find-Claude {
  $c = Get-Command claude -ErrorAction SilentlyContinue
  if ($c) { return $c.Source }
  foreach ($root in @("$HOME\.local\bin", "$env:LOCALAPPDATA", "$env:APPDATA\npm", "$env:ProgramFiles")) {
    if (-not (Test-Path $root)) { continue }
    $f = Get-ChildItem $root -Recurse -Depth 4 -ErrorAction SilentlyContinue -Include claude.exe, claude.cmd | Select-Object -First 1
    if ($f) { return $f.FullName }
  }
  return $null
}
$exe = Find-Claude
if (-not $exe) {
  Write-Host "Claude Code not found - installing (watch for errors below)..." -ForegroundColor Cyan
  irm https://claude.ai/install.ps1 | iex
  $exe = Find-Claude
}
if (-not $exe) {
  Write-Host "`nCould not install Claude Code. Screenshot this whole window and send it to Claude." -ForegroundColor Red
  Read-Host "Press Enter to close"; exit 1
}
Write-Host "Claude Code: $exe" -ForegroundColor Green
$dir = Split-Path $exe
$userPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($userPath -notlike "*$dir*") { [Environment]::SetEnvironmentVariable("Path", "$userPath;$dir", "User"); Write-Host "added to PATH: $dir" }
Set-Content -Encoding ascii "$Studio\Setup\claude-path.txt" $exe
$desk = [Environment]::GetFolderPath("Desktop")
$s = (New-Object -ComObject WScript.Shell).CreateShortcut("$desk\Dolly Studio.lnk")
$s.TargetPath = "$Studio\Start Studio.cmd"; $s.WorkingDirectory = $Studio; $s.Save()
Write-Host "icon: $desk\Dolly Studio.lnk" -ForegroundColor Green
Write-Host "starting the edit..." -ForegroundColor Cyan
Start-Process -FilePath "$Studio\Start Studio.cmd" -WorkingDirectory $Studio
