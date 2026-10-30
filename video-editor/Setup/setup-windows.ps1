# One-paste setup for Dolly's Windows PC. Run in PowerShell (normal, not admin):
#   Set-ExecutionPolicy -Scope Process Bypass; & "$HOME\Documents\dolly\video-editor\Setup\setup-windows.ps1"
# or paste the whole file into PowerShell. Safe to re-run: skips what's already there.
$ErrorActionPreference = "Continue"
$Repo   = "https://github.com/dollyshahani/Documents.git"
$Branch = "claude/admiring-cori-md95wa"
$Root   = "$HOME\Documents\dolly"
$Studio = "$Root\video-editor"
$report = @()

function Refresh-Path {
  $env:Path = [Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [Environment]::GetEnvironmentVariable("Path", "User")
}
function Install($id, $cmd) {
  if (Get-Command $cmd -ErrorAction SilentlyContinue) { $script:report += "ok   $id (already installed)"; return }
  Write-Host "installing $id..." -ForegroundColor Cyan
  winget install -e --id $id --silent --accept-source-agreements --accept-package-agreements | Out-Null
  Refresh-Path
  if (Get-Command $cmd -ErrorAction SilentlyContinue) { $script:report += "ok   $id (installed)" } else { $script:report += "FAIL $id - open a NEW PowerShell and re-run this script" }
}

# 1. tools
Install "Git.Git" "git"
Install "Gyan.FFmpeg" "ffmpeg"
Install "Python.Python.3.12" "py"
winget install -e --id LocalSend.LocalSend --silent --accept-source-agreements --accept-package-agreements | Out-Null
$report += "ok   LocalSend (installed or already there)"

# 2. the studio folder
if (-not (Test-Path "$Root\.git")) {
  Write-Host "cloning (a GitHub sign-in window may pop up)..." -ForegroundColor Cyan
  git clone $Repo $Root
}
git -C $Root fetch origin $Branch
git -C $Root checkout $Branch
git -C $Root pull origin $Branch
if (Test-Path "$Studio\CLAUDE.md") { $report += "ok   studio at $Studio" } else { $report += "FAIL clone - check GitHub sign-in, re-run" }

# 3. python packages + the Whisper model (one-time ~480 MB download)
$py = if (Get-Command py -ErrorAction SilentlyContinue) { "py" } else { "python" }
& $py -m pip install --quiet --upgrade faster-whisper numpy pillow
& $py -c "import faster_whisper, PIL, numpy; print('ok')"
if ($LASTEXITCODE -eq 0) { $report += "ok   python packages" } else { $report += "FAIL python packages" }
Write-Host "downloading the Whisper model (one time)..." -ForegroundColor Cyan
& $py -c "from faster_whisper import WhisperModel; WhisperModel('small.en', device='cpu', compute_type='int8'); print('model ok')"
if ($LASTEXITCODE -eq 0) { $report += "ok   Whisper small.en model" } else { $report += "FAIL Whisper model download" }

# 4. checks: libass + a 2s colour-bars caption render using her fonts
if ((ffmpeg -hide_banner -filters 2>$null | Select-String " ass ")) { $report += "ok   ffmpeg has libass" } else { $report += "FAIL ffmpeg without libass - winget install Gyan.FFmpeg" }
$t = Join-Path $env:TEMP "dolly-setup-test"; New-Item -ItemType Directory -Force $t | Out-Null
Copy-Item -Recurse -Force "$Studio\Signature Style\fonts" "$t\fonts"
@"
[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Cap,Jost,72,&H00FFFFFF,&H00FFFFFF,&H00000000,&H90000000,-1,0,0,0,100,100,0,0,1,0,2,8,140,140,1440,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 1,0:00:00.00,0:00:02.00,Cap,,0,0,0,,setup test caption
"@ | Set-Content -Encoding utf8 "$t\t.ass"
Push-Location $t
ffmpeg -v error -y -f lavfi -i smptebars=s=1080x1920:d=2 -vf "ass=t.ass:fontsdir=fonts" -c:v libx264 -pix_fmt yuv420p bars.mp4
Pop-Location
if (Test-Path "$t\bars.mp4") { $report += "ok   render test ($t\bars.mp4)" } else { $report += "FAIL render test" }

# 5. Dolly OS hand-off config
if (-not (Test-Path "$Studio\.env")) { Copy-Item "$Studio\.env.example" "$Studio\.env"; $report += "todo fill in $Studio\.env (Supabase URL/key, app URL, CRON_SECRET)" }

# 6. LocalSend: open it so the save folder can be set
Start-Process "LocalSend" -ErrorAction SilentlyContinue
Set-Clipboard "$Studio\Raw"

Write-Host "`n===== REPORT =====" -ForegroundColor Green
$report | ForEach-Object { Write-Host $_ }
Write-Host @"

LAST STEP (30 seconds) - LocalSend just opened:
  Settings -> Receive -> Destination -> paste (already copied):  $Studio\Raw
  turn ON 'Quick Save', allow it through the firewall on Private networks.
  Phone: install LocalSend, same Wi-Fi, Send -> pick the clip -> tap this PC.

Then open Claude Code in $Studio and say: start the edit
"@ -ForegroundColor Yellow
