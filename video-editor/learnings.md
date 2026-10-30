# Learnings — read at the start of every session, append after every approved video

Rules below come from real corrections Dolly made. Newer entries override older ones.

## Oct 2026 — the choppy month (the reason the pipeline exists)
- She disliked ALL early edits: choppy, abrupt jumps, story not smooth. Fixes now default:
  merged phrases (few cuts), PAUSES=chatty presets, ZOOMCUTS alternation, equal-power
  audio crossfades, light single-pass denoise. Do not regress toward snappy editing.
- Color grading removed permanently. Never add a grade.
- Typewriter hook title rejected → static title, whole line at once, no click sound.
- Bodoni Moda italic hook titles rejected → **plain white, no shadow**. Bodoni stays for
  ribbons/cards only.
- A reel delivered with only title + captions + one ribbon was not enough → she expects
  pop-up stickers/overlays, word-timed, on every reel.
- "Day with me" / vlog reels: a slow, dissolve-heavy cut was rejected → movement, take the
  viewer along; the first 2 seconds must visually SHOW what the hook claims.
- Stray word leaked through a join once (a "but" after "watched") → always read plan.py's
  LISTEN-BACK line against the approved script; trim the piece end by hand if needed.
- Misheard names recur: Jun Yuh, Claude, Higgsfield — fix at caption time with --fix.
- Zoom alternation broke after manual piece edits → after ANY hand edit to pieces.json,
  check no two consecutive pieces share the same zoom, and keep the title shots un-zoomed.
- Her room noise sits near the silence-detector floor → chatty/jumpy presets use the
  un-tightened threshold (already wired into plan.py as PM=0).

## Oct 30, 2026
- Pop-ups upgraded from static PNGs to animated (animate.py: pop/rise/float/pulse).
  Animated is now the default for stickers.
- She wants a built-in "pretty" pass → GLAM=1 in render.py: subtle edge-preserving
  skin-soften, no colour change. On by default for talking-head reels. This does NOT
  break the no-color-grade rule (it touches texture, never colour).
- Lashes/makeup-style filters are shoot-time, not post: she uses a beauty-camera app
  (Ulike) while filming; the pipeline only softens, never reshapes her face.
- Clips reach the PC via LocalSend from her phone straight into Raw/.
- Her PC is Windows: run every script as `py -3.12 Setup/scripts/<script>.py ...` (plain `python`
  opens the Microsoft Store alias; `python3` doesn't exist). Set env vars PowerShell-style
  (`$env:PAUSES="chatty"; $env:ZOOMCUTS="1"; py -3.12 ...`). Smart App Control is off (it blocked
  PyAV). HF symlink warnings during transcription are harmless.
- Identity statements get 3 of her photos as polaroid pop-ups (photo_popups.py). iPhone
  HEIC photos need `py -3.12 -m pip install pillow-heif` once.

## Standing
- Privacy cuts are absolute: remove every line that reveals the thing, indirect ones included.
- Keep her original order by default; her re-recorded intro often sits at the END of a take.
- No speed-up. Nothing AI-looking. Her face stays clear of all graphics.
- Trial reels: vary only the title between versions.
