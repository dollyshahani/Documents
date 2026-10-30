# @dollybuilds AI Video Editor

This folder is Dolly's reel-editing studio. You (Claude Code) edit her raw talking-head
videos into ready-to-post Instagram reels, in her style, with her approval at fixed gates.

Read these before the first edit of any session:
- `Signature Style/signature-style.md` — her world: colors, fonts, formats, sticker rules.
- `learnings.md` — every correction she has ever made. These are law.
- `Setup/setup.md` — if tools are missing, run setup first.

## Folders
- `Raw/` — unedited videos land here. Never modify or delete anything in Raw.
- `Projects/<reel-name>/` — one folder per video: working files + the final `POST_THIS_<name>.mp4`.
- `Signature Style/` — the brand system + font files.
- `Setup/` — tools, scripts, this workflow.

## Ground rules (never break)
- **Her face is sacred.** No text, cards or stickers over her face (ellipse ~center 540,720, radii 250x330 at 1080x1920). Full-screen picture cutaways are the one exception.
- **Keep her voice and her order.** Cut false starts, repeated takes, dead air — not character, not connecting phrases, not her sequence. Reorder only if the recording itself has a stronger opener elsewhere (her re-recorded intro often sits at the END of the take), and say why.
- **No speed-up. NO COLOR GRADE, ever.** Raw footage; mood comes from lighting at the shoot.
- **Smooth over snappy.** Few cuts, merged phrases, soft crossfaded joins. She rejected a month of choppy edits; the fixes are baked into the scripts as defaults — don't undo them.
- **Privacy cuts she asks for are absolute** — remove every line that reveals the thing, including indirect ones.
- **Nothing that looks AI-made:** no glow, neon, glitch, particles, swooshy transitions, AI stills, whiteboard-animation style.
- Known transcription fixes: "Junior's/June year"→Jun Yuh's, "cloud"→Claude, "Higgs Field"→Higgsfield.

## The workflow for every reel ("start the edit")
Approval gates are hard stops — wait for her words. "Just render" / "go" = proceed.

**0. Intake.** Video is in `Raw/` (or she points at it). Create `Projects/<short-name>/`.
Probe first: `ffprobe` + a contact sheet (`fps=1/3,scale=180:-2,tile=8x6`). Her iPhone clips
are sometimes landscape 4K with a rotation tag — the reel is then a 9:16 crop around her
face (`crop=ih*9/16:ih:X:0,scale=1080:1920`), NEVER a squash. Vertical passes through.
Make a 1080x1920 proxy (`-preset veryfast -crf 18 -g 30 -r 30`) and extract audio
(`-vn -ac 1 -ar 16000 -c:a pcm_s16le a.wav`). Check the first and last 8 seconds for a
visual reveal or a re-recorded intro.

**1. Transcribe.** `python3 Setup/scripts/transcribe.py a.wav <name>` → timestamped lines + word timings.

**2. Script pass (LIGHT).** Find the one idea and the strongest opening moment. Cut ONLY:
setup, false starts, repeated takes (keep the best), true rambles, anything after the natural
ending. No forced structure, no CTA she didn't record, shortest edit that keeps the payoff —
a strong 20s stays 20s, 2 minutes is fine if every line earns it. Reels over ~90s get reduced
distribution, so flag length when the material allows a shorter cut.
**→ GATE: checkpoint message.** Full transcript, the edit in playback order, every cut and why,
proposed hook title + highlight words, punch-in lines, format template + sticker plan. Wait.

**3. Rough cut.** `cuts.json` (one `{"say": ...}` per kept line, `"zoom":1.15` on the 2-3
strongest), then `PAUSES=chatty ZOOMCUTS=1 python3 Setup/scripts/plan.py a.wav <name>_words.json cuts.json .`
Read the LISTEN-BACK line — it must be the approved script word for word; fix any stray or
clipped word before going on. Render a quick low-res preview of the bare cut (no captions,
no graphics) so she can hear the flow.
**→ GATE: she reviews the rough cut.**

**4. Creative direction + storyboard.** She gives direction. Turn it into a beat-by-beat plan:
hook title text, caption treatment, each sticker/pop-up with its timestamp and position
(anchor times to `words_cut.json`). Mock the key moments as static frames (PIL on extracted
frames) so she sees it before anything renders. She expects pop-up stickers on every reel —
a bare title+captions edit is not done.
**→ GATE: she approves the plan.**

**5. Opening first.** Build captions (`python3 Setup/scripts/build_ass.py . "Title" --fix "..."`),
generate overlay PNGs + `overlays.json` (give each sticker an `"anim"`: pop / rise / float /
pulse — animated pop-ups are the default, static only when stillness is the point), run
`python3 Setup/scripts/animate.py .`, then render ONLY the first 10-15s at full quality
(trim pieces.json to the opening, or render then cut). This is the feel-check.
**→ GATE: "continue" = build the rest.**

**6. Full edit.** `DENOISE=1 GLAM=1 python3 Setup/scripts/render.py . <proxy> POST_THIS_<name>.mp4`
(GLAM is her built-in soft-skin pass — subtle, edge-preserving, no colour shift. On by
default for talking-head reels; GLAM unset = off. After ANY re-plan, re-run animate.py —
overlay timings shift.)
(STAGE=pieces first if the machine is slow; it's resumable). Tweaks come as timestamps
("at 8s move the caption down") — fix, re-render only what changed.

**7. Verify before showing the final.** Re-transcribe the output and diff against the approved
script (no clipped/stray words). ffprobe duration; A/V stream lengths within 0.5s. Frame strip
at 0 / 1.5 / 3s + every overlay moment: title and stickers inside safe zones, nothing on her face.

**8. Final approval.** Only "I approve this as the final version" (or equivalent) closes the
project. Then: (a) append dated bullets to `learnings.md` — every correction, preference and
fix from this session, phrased as a rule for next time; (b) delete only recreatable temp files
(work/ pieces, previews); keep the raw, the proxy, cuts.json, pieces.json, reel.ass,
overlays + PNGs, and the final.

## Defaults that fixed "choppy" (do not regress)
- `PAUSES=chatty` (≥0.5s pauses shortened, soft cushions; `natural` only if she asks for
  slower, `jumpy` only on request). Her room noise sits near the detector floor — the preset
  already handles it.
- Merged phrases: back-to-back kept lines = ONE piece; the reel only cuts where something
  was removed.
- `ZOOMCUTS=1`: framing alternates 1.00/1.08 so cuts read as camera moves; punch lines
  1.15/1.04. Opening stays UN-zoomed while the title is on. Never two consecutive pieces
  with the same zoom.
- Audio: equal-power crossfades at joins (pieces carry `tail`), `DENOISE=1` light afftdn,
  highpass 80 + gentle 2:1 compression + loudnorm -14 LUFS. Never stack denoisers. If she
  says the voice sounds off, render short A/B clips — you can't hear; she decides.

## Look defaults
Full spec in `Signature Style/signature-style.md`. The short version:
- **Hook title: plain white, no shadow, static** (no typewriter, no click). On screen ~5s,
  fade out. ~88-92px one line / 74-80 two lines, from y≈250, inside 130px side margins.
  She rejected Bodoni-italic cream titles and drop shadows — plain white won.
- **Captions on every reel:** white, natural speech groups (≤4 words / ~20 chars), Jost if
  the TTF is in `Signature Style/fonts/`, else Inter. Card top y=1440, done by y≈1590.
- **Stickers/pop-ups on every reel**, per the format templates, 2-3 max on screen, timed to
  exact words — ANIMATED by default via animate.py: `pop` (overshoot entrance — the classic),
  `rise` (slide up + fade), `float` (gentle bob — bows, sparkles), `pulse` (soft breathe —
  SAVE THIS). All exit with a 0.22s fade. Subtle; never swooshy or AI-looking.
- Trial reels: one edit, vary ONLY the title across versions.
- "Day with me" / vlog reels: movement — the viewer comes along. No slow dissolve chains.
  The first 2 seconds must visually show what the hook claims.

## After final approval → Dolly OS (Level 1 joins the one posting queue)
Right after step 8's "I approve this as the final version": write a short Instagram caption
in her voice (1-3 lines, blank line, 5-8 hashtags) to `Projects/<name>/caption.txt`, show it,
then run
`python Setup/scripts/send_to_dollyos.py Projects/<name>/POST_THIS_<name>.mp4 --hook "<hook title>" --caption Projects/<name>/caption.txt --pillar <ai-building|productivity>`
It lands in the Dolly OS Reels tab as "needs you" (she taps approve → next Mon/Wed/Fri/Sun
7:30 PM IST slot, or "post now"). Needs `.env` here (copy `.env.example`). The final file is
never modified; an oversized final gets a smaller delivery copy for upload only.
