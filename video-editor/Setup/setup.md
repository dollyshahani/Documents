# Setup — run once per computer ("run setup")

Claude Code: check each item, install what's missing, then report what was installed
and what still needs a real recording to test.

## Tools
1. **ffmpeg + ffprobe** — cutting, rendering, inspecting.
   macOS: `brew install ffmpeg` (needs libass support — the default brew build has it).
   Windows: `winget install ffmpeg` or download a full build; confirm `ffmpeg -version` shows libass.
2. **Python 3.10+** with:
   `pip install faster-whisper numpy pillow`
   (faster-whisper = transcription with word timings; pillow = sticker/title PNGs)
3. **Fonts** — download TTFs into `Signature Style/fonts/` from the google/fonts GitHub repo:
   `ofl/jost/` (Jost), `ofl/bodonimoda/` (Bodoni Moda), `ofl/italianno/` (Italianno).
   If unavailable, Inter or system fonts are the fallback — say so when used.
4. Optional, for future animated overlays: Node.js + Playwright. Not required for the
   current pipeline (static PNG pop-ups with fades).

## Checks
- `ffmpeg -version`, `ffprobe -version`
- `python3 -c "import faster_whisper, PIL, numpy; print('ok')"`
- Render test: generate 2s of color bars, burn a one-line .ass caption, confirm output plays.

## Windows notes
- Use `python` (not `python3`) if `python3` isn't recognized.
- The `VAR=1 python ...` command style is POSIX; on Windows set env vars the shell's way
  (PowerShell: `$env:PAUSES="chatty"`) — Claude Code: adapt the commands, don't skip the vars.
- Phone → Raw/: LocalSend (free, open-source, localsend.org) on both the phone and this PC,
  same Wi-Fi; set LocalSend's save folder on the PC to this project's `Raw/` folder so every
  clip she sends lands ready to edit.

## Scripts
The four scripts in `Setup/scripts/` are debugged and tested on approved renders —
use them as-is, don't rewrite them from scratch. Env vars:
- `PAUSES=natural|chatty|jumpy` (use chatty) — pause-removal preset in plan.py
- `ZOOMCUTS=1` — zoom alternation in plan.py
- `DENOISE=1` — light voice denoise in render.py
- `STAGE=pieces` — resumable piece-encode pass in render.py (for slow machines / long clips)
