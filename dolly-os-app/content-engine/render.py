"""Reel renderer — runs on GitHub Actions (see .github/workflows/reels.yml).

Picks up reels Claude scripted (status 'scripted'), voices them, builds a
1080x1920 video with punchy on-screen text + word-by-word captions, uploads it
to Supabase storage and pings Dolly OS so she gets the approval push.

Two looks:
  - faceless (default): bold text over colour, voiced by TTS.
  - avatar: if the row has avatar_url (a talking-head clip, e.g. from Higgsfield),
    that clip is the picture + sound and captions are laid over it.

Local smoke test without network:  python render.py --test out.mp4 [ai-building|productivity]
"""

import asyncio
import os
import subprocess
import sys
import tempfile
import time
from pathlib import Path

import requests
from PIL import Image, ImageDraw, ImageFont

W, H = 1080, 1920
HERE = Path(__file__).parent
FONTS = {"jost": str(HERE / "fonts" / "Jost.ttf"), "script": str(HERE / "fonts" / "Italianno.ttf")}
VOICE = os.environ.get("VOICE", "en-IN-NeerjaNeural")
RATE = os.environ.get("TTS_RATE", "+8%")

# @dollybuilds Signature Style (video-editor/Signature Style/signature-style.md).
# DAY = cream/blush/cherry (productivity, manifest, yaps); NIGHT = maroon/gold/champagne (Built with AI).
# Beats alternate between the two backgrounds of a world so cuts still read.
WORLDS = {
    "day": {"bg": ["#FFF8EA", "#F4C2C8"], "text": "#2A0710", "hi": "#B3122E", "soft": "#2A071099"},
    "night": {"bg": ["#5C0F1E", "#2A0710"], "text": "#F3E6D3", "hi": "#E3C68F", "soft": "#F3E6D399"},
}
WORLD = WORLDS["day"]
PILL = None  # e.g. "BUILT WITH AI" on night reels

SB_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
SB_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")


def sb_headers(extra=None):
    h = {"apikey": SB_KEY, "Authorization": f"Bearer {SB_KEY}"}
    h.update(extra or {})
    return h


def run(cmd):
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)


def duration(path):
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)],
        check=True, capture_output=True, text=True,
    ).stdout
    return float(out.strip())


# ---------- script → segments ----------

def use_world(pillar):
    global WORLD, PILL
    night = pillar == "ai-building"
    WORLD = WORLDS["night" if night else "day"]
    PILL = "BUILT WITH AI" if night else None


def segments_of(script):
    segs = [{"say": script["hook"], "screen": script["hook"]}]
    segs += [{"say": b["say"], "screen": b["screen"]} for b in script.get("beats", [])]
    if script.get("cta"):
        segs.append({"say": script["cta"], "screen": "Follow @dollybuilds"})
    segs[-1]["last"] = True
    return segs


# ---------- voice ----------

async def tts_segment(text, mp3_path):
    """Returns word timings [(word, start, end)] in seconds relative to the clip."""
    import edge_tts

    try:
        comm = edge_tts.Communicate(text, VOICE, rate=RATE, boundary="WordBoundary")
    except TypeError:  # older edge-tts: word boundaries are the default
        comm = edge_tts.Communicate(text, VOICE, rate=RATE)
    words = []
    with open(mp3_path, "wb") as f:
        async for chunk in comm.stream():
            if chunk["type"] == "audio":
                f.write(chunk["data"])
            elif chunk["type"] == "WordBoundary":
                start = chunk["offset"] / 1e7
                words.append((chunk["text"], start, start + chunk["duration"] / 1e7))
    return words


def even_words(text, start, end):
    """Spread words across a span, weighted by length — used when we have no timings."""
    words = text.split()
    total = sum(len(w) + 2 for w in words) or 1
    t, out = start, []
    for w in words:
        d = (end - start) * (len(w) + 2) / total
        out.append((w, t, t + d))
        t += d
    return out


def voice_all(segs, work, fake=False):
    """Voice each segment, join into one wav. Returns (wav, timeline) where the
    timeline is a list of segments with absolute word timings."""
    gap = 0.12
    parts, t = [], 0.0
    for i, seg in enumerate(segs):
        clip = work / f"seg{i}.wav"
        if fake:
            secs = max(1.2, len(seg["say"].split()) * 0.33)
            run(["ffmpeg", "-y", "-f", "lavfi", "-i", f"sine=frequency=220:duration={secs}",
                 "-ar", "48000", "-ac", "1", str(clip)])
            words = even_words(seg["say"], 0, secs)
        else:
            mp3 = work / f"seg{i}.mp3"
            words = asyncio.run(tts_segment(seg["say"], mp3))
            run(["ffmpeg", "-y", "-i", str(mp3), "-af", f"apad=pad_dur={gap}",
                 "-ar", "48000", "-ac", "1", str(clip)])
            if not words:
                words = even_words(seg["say"], 0, duration(mp3))
        d = duration(clip)
        seg = dict(seg, start=t, end=t + d, words=[(w, t + a, t + b) for w, a, b in words])
        parts.append((clip, seg))
        t += d

    listfile = work / "audio.txt"
    listfile.write_text("".join(f"file '{p}'\n" for p, _ in parts))
    wav = work / "voice.wav"
    run(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(listfile), "-c", "copy", str(wav)])
    return wav, [s for _, s in parts]


# ---------- drawing ----------

def font(size, weight="SemiBold", face="jost"):
    try:
        f = ImageFont.truetype(FONTS[face], size)
        if face == "jost":
            f.set_variation_by_name(weight)
        return f
    except OSError:
        return ImageFont.load_default(size)


def wrap(draw, text, fnt, max_w):
    lines, line = [], ""
    for word in text.split():
        trial = f"{line} {word}".strip()
        if draw.textlength(trial, font=fnt) <= max_w or not line:
            line = trial
        else:
            lines.append(line)
            line = word
    if line:
        lines.append(line)
    return lines


def fit_text(draw, text, max_w, max_h, start=150, floor=60):
    size = start
    while size > floor:
        fnt = font(size)
        lines = wrap(draw, text, fnt, max_w)
        if len(lines) * size * 1.12 <= max_h and all(draw.textlength(l, font=fnt) <= max_w for l in lines):
            return fnt, lines, size
        size -= 6
    fnt = font(floor)
    return fnt, wrap(draw, text, fnt, max_w), floor


def chunk_of(words, idx, size=3):
    start = (idx // size) * size
    return start, words[start:start + size]


def draw_frame(seg, seg_idx, word_idx, t, total, transparent=False):
    w_ = WORLD
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0) if transparent else w_["bg"][seg_idx % 2])
    d = ImageDraw.Draw(img)

    if not transparent:
        d.text((W / 2, 250), "@dollybuilds", font=font(40, "Medium"), fill=w_["soft"], anchor="mm")
        if PILL:
            pf = font(36, "SemiBold")
            pw = d.textlength(PILL, font=pf) + 64
            d.rounded_rectangle([(W - pw) / 2, 300, (W + pw) / 2, 368], 34, fill="#B3122E")
            d.text((W / 2, 334), PILL, font=pf, fill="#F3E6D3", anchor="mm")
        # Headline: the beat's on-screen text, sentence case, upper-middle.
        fnt, lines, size = fit_text(d, seg["screen"], W - 260, 560, start=128)
        y = 460 + (560 - len(lines) * size * 1.12) / 2
        for line in lines:
            lw = d.textlength(line, font=fnt)
            d.text(((W - lw) / 2, y), line, font=fnt, fill=w_["text"])
            y += size * 1.12
        if seg.get("last"):
            d.text((W / 2, 1180), "xo, dolly", font=font(110, face="script"), fill=w_["hi"], anchor="mm")

    # Caption: speech group, current word highlighted. Over video: white (her caption rule).
    words = seg["words"]
    if words and word_idx >= 0:
        first, chunk = chunk_of(words, word_idx)
        cfnt = font(76, "SemiBold")
        texts = [w for w, _, _ in chunk]
        space = d.textlength(" ", font=cfnt)
        line_w = sum(d.textlength(w, font=cfnt) for w in texts) + space * (len(texts) - 1)
        if line_w > W - 280:
            cfnt = font(int(76 * (W - 280) / line_w), "SemiBold")
            space = d.textlength(" ", font=cfnt)
            line_w = sum(d.textlength(w, font=cfnt) for w in texts) + space * (len(texts) - 1)
        x, y = (W - line_w) / 2, 1440
        for i, w in enumerate(texts):
            active = first + i == word_idx
            if transparent:
                d.text((x, y), w, font=cfnt, fill="#FFFFFF", stroke_width=3, stroke_fill="#00000080")
            else:
                d.text((x, y), w, font=cfnt, fill=w_["hi"] if active else w_["text"])
            x += d.textlength(w, font=cfnt) + space

    # Progress bar (thin, under the IG UI zone so it never fights the captions)
    d.rectangle([0, H - 8, int(W * min(1, t / total)), H], fill="#FFFFFF" if transparent else w_["hi"])
    return img


def render_frames(timeline, total, work, transparent=False):
    """One image per caption change; returns an ffmpeg concat list."""
    events = []  # (time, seg_idx, word_idx)
    for si, seg in enumerate(timeline):
        events.append((seg["start"], si, -1))
        for wi, (_, a, _) in enumerate(seg["words"]):
            events.append((max(a, seg["start"]), si, wi))
    events.sort(key=lambda e: e[0])
    events.append((total, None, None))

    lines = []
    for n, (t, si, wi) in enumerate(events[:-1]):
        dur = events[n + 1][0] - t
        if dur <= 0.005:
            continue
        path = work / f"f{n:05d}.png"
        draw_frame(timeline[si], si, wi, t, total, transparent).save(path)
        lines.append(f"file '{path}'\nduration {dur:.3f}\n")
    lines.append(f"file '{path}'\n")  # concat demuxer needs the last file twice
    listfile = work / "frames.txt"
    listfile.write_text("".join(lines))
    return listfile


# ---------- assembling ----------

ENC = ["-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p", "-r", "30",
       "-c:a", "aac", "-b:a", "160k", "-ar", "48000", "-movflags", "+faststart"]


def build_faceless(script, out, work, fake=False):
    wav, timeline = voice_all(segments_of(script), work, fake)
    total = duration(wav) + 0.4
    frames = render_frames(timeline, total, work)
    run(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(frames), "-i", str(wav),
         "-af", "apad=pad_dur=0.4", "-t", f"{total:.2f}", *ENC, str(out)])


def build_avatar(script, avatar_url, out, work):
    src = work / "avatar.mp4"
    src.write_bytes(requests.get(avatar_url, timeout=120).content)
    total = duration(src)
    segs = segments_of(script)
    # No word timings for a pre-made clip: spread the script over its length.
    weights = [len(s["say"]) for s in segs]
    t, timeline = 0.0, []
    for s, w in zip(segs, weights):
        span = total * w / sum(weights)
        timeline.append(dict(s, start=t, end=t + span, words=even_words(s["say"], t, t + span)))
        t += span
    frames = render_frames(timeline, total, work, transparent=True)
    run(["ffmpeg", "-y", "-i", str(src), "-f", "concat", "-safe", "0", "-i", str(frames),
         "-filter_complex",
         f"[0:v]scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H}[bg];[bg][1:v]overlay=0:0:shortest=1[v]",
         "-map", "[v]", "-map", "0:a?", *ENC, str(out)])


# ---------- pipeline ----------

def claim(reel_id):
    r = requests.patch(
        f"{SB_URL}/rest/v1/reels?id=eq.{reel_id}&status=eq.scripted",
        headers=sb_headers({"Content-Type": "application/json", "Prefer": "return=representation"}),
        json={"status": "rendering"}, timeout=30,
    )
    r.raise_for_status()
    rows = r.json()
    return rows[0] if rows else None


def update(reel_id, patch):
    requests.patch(f"{SB_URL}/rest/v1/reels?id=eq.{reel_id}",
                   headers=sb_headers({"Content-Type": "application/json"}),
                   json=patch, timeout=30).raise_for_status()


def upload(reel_id, path):
    name = f"{reel_id}-{int(time.time())}.mp4"  # new name per render: no stale CDN copies
    with open(path, "rb") as f:
        r = requests.post(f"{SB_URL}/storage/v1/object/reels/{name}",
                          headers=sb_headers({"Content-Type": "video/mp4", "x-upsert": "true"}),
                          data=f, timeout=300)
    r.raise_for_status()
    return f"{SB_URL}/storage/v1/object/public/reels/{name}"


def notify(reel_id):
    app = os.environ.get("APP_URL", "").rstrip("/")
    if not app:
        return
    try:
        requests.post(f"{app}/api/cron/reel-ready", json={"id": reel_id}, timeout=60,
                      headers={"Authorization": f"Bearer {os.environ.get('CRON_SECRET', '')}"})
    except requests.RequestException as e:
        print(f"  notify failed: {e}")


def main():
    r = requests.get(f"{SB_URL}/rest/v1/reels?status=eq.scripted&select=id&order=created_at&limit=3",
                     headers=sb_headers(), timeout=30)
    r.raise_for_status()
    ids = [row["id"] for row in r.json()]
    print(f"{len(ids)} reel(s) to render")
    for reel_id in ids:
        reel = claim(reel_id)
        if not reel:
            continue
        print(f"rendering {reel_id}: {reel['hook']}")
        try:
            with tempfile.TemporaryDirectory() as tmp:
                work = Path(tmp)
                out = work / "reel.mp4"
                use_world(reel.get("pillar"))
                if reel.get("avatar_url"):
                    build_avatar(reel["script"], reel["avatar_url"], out, work)
                else:
                    build_faceless(reel["script"], out, work)
                url = upload(reel_id, out)
            update(reel_id, {"status": "review", "video_url": url, "error": None})
            notify(reel_id)
            print(f"  ready → {url}")
        except Exception as e:  # keep going with the next reel
            msg = e.stderr.decode()[-500:] if isinstance(e, subprocess.CalledProcessError) else str(e)
            update(reel_id, {"status": "failed", "error": msg[:500]})
            print(f"  failed: {msg}")


if __name__ == "__main__":
    if len(sys.argv) >= 3 and sys.argv[1] == "--test":  # --test out.mp4 [ai-building|productivity]
        use_world(sys.argv[3] if len(sys.argv) > 3 else "productivity")
        demo = {
            "hook": "I let Claude run my Instagram for a week",
            "beats": [
                {"say": "Every morning it writes a reel script from what I shipped.", "screen": "Claude writes the script"},
                {"say": "A GitHub Action voices it and edits the video.", "screen": "Robots do the edit"},
                {"say": "I get a push, watch it, and tap approve.", "screen": "I just tap approve"},
                {"say": "Then it posts itself at the best time.", "screen": "It posts itself"},
            ],
            "cta": "Follow for the build breakdown.",
        }
        with tempfile.TemporaryDirectory() as tmp:
            build_faceless(demo, Path(sys.argv[2]).resolve(), Path(tmp), fake=True)
        print("wrote", sys.argv[2])
    else:
        main()
