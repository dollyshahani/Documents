# The @dollybuilds world — "a lucky girl who builds" (locked Oct 28, 2026)

The brand covers AI, yaps, storytelling, teaching AI, makeup+fashion voiceovers, and
manifestation — manifestation is ONE lane, never the whole identity.
Reference canvas (page "v5 · the full world"): https://claude.ai/artifact/7eZfhZuevb1UMudSrjHdRW
Her reel studio page (manual sticker placement): https://claude.ai/artifact/Di19pmPGwLXZjye8j7sZG2

## Two worlds, one brand
- **DAY** (default; Manifest with AI series, yaps, stories, glam voiceovers) — window light.
  cream `#FFF8EA` · blush `#F4C2C8` · cherry `#B3122E` · ink `#2A0710` · baby blue `#B0CFE6` (tiny accents only)
- **NIGHT** (Built with AI series, founder lessons, big statements) — black outfit, red lip, darker frame.
  maroon `#5C0F1E` · cherry `#B3122E` · champagne `#F3E6D3` · antique gold `#B8945A` / `#E3C68F`

## Fonts (TTFs live in `fonts/`; fetch from the google/fonts GitHub repo if missing:
ofl/jost/, ofl/bodonimoda/, ofl/italianno/ — fall back to Inter and say so)
- **Hook titles: plain white, no shadow, no decorative font games.** (She rejected Bodoni
  italic titles Oct 2026 — this overrides anything older, including the v5 canvas.)
- **Jost 500/600** — captions, labels, pills.
- **Bodoni Moda italic** — sass ribbons, chapter cards, in-design display text only. Never the hook title.
- **Italianno** — tiny sign-offs only ("xo, dolly", "get ready with me").

## Format templates (which pop-ups each kind of reel gets)
- **Yap** (default talking video): hook + captions + 2-3 word-timed stickers/ribbons.
- **Storytelling:** cream "CHAPTER 01" card with italic episode name; place-time pill
  ("NEW YORK · 2024", dark pill, gold text); "plot twist." gold ribbon on the turn.
- **Teaching AI / Built with AI:** "STEP n OF 4" cherry pill; cream prompt card with the
  actual prompt in monospace + "copy this prompt" label (people screenshot it);
  `> build(...)` code tag; "BUILT WITH AI" pill.
- **Glam voiceover (GRWM):** "get ready with me" in Italianno; product callouts on thin
  gold leader lines ("LIP · [shade]" cream pills); swatch dots; outfit pill.
- **Manifest with AI:** bow + sparkles, "it's already mine" ribbon, moon; 2-3 elements max.
- **Sass lines** (any format, on ribbons/pills, never blocky caps): "wow. groundbreaking.",
  "bestie, no.", "noted, darling.", "delulu, but data-backed", "SAVE THIS".

## Sticker rules
Flat vector/paper style: bows, cherries, martini, heel, ace-of-hearts card, pearls,
sparkles; wand/cursor/laptop for AI; lipstick/perfume/mirror/hanger for glam.
Rendered as transparent PNGs (PIL) and placed via `overlays.json`
(`[{"png","s","e","x","y","anim"}]`, x/y = top-left at 1080x1920). Animated by default
(animate.py): `pop` for cards/pills/ribbons, `rise` for prompt cards and callouts, `float`
for bows/sparkles/moon, `pulse` for SAVE THIS. Static (`fin`/`fout` fades instead of `anim`)
only when stillness is the point. Max 2-3 on screen at once.
Day world = cream/blush/cherry; night world = maroon/gold/champagne.

## Safe zones (1080x1920)
- Nothing in the top 220px. Side margins ≥130px. Captions end by y≈1590 (bottom 330 is IG UI).
- **Face ellipse: center ~(540,720), radii 250x330 — always clear.**
- Sweet zone for cards: y 1000-1400.
