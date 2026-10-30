# python3 build_ass.py <out_dir> "Title line 1|Title line 2" [--title-secs 5] [--title-size 92] [--typewriter] [--fix Higgs=Higgsfield,Field=]
# Reads out_dir/words_cut.json -> out_dir/reel.ass + out_dir/sfx.wav (silent unless --typewriter).
# Title: static, PLAIN WHITE, no shadow (her standing preference, Oct 2026).
# Captions follow natural speech groups: break at punctuation or a pause, max ~4 words / 20 characters per card.
import sys, json, re, wave, math, random
od, title = sys.argv[1], sys.argv[2].split("|")
args = sys.argv[3:]
hold = float(args[args.index("--title-secs")+1]) if "--title-secs" in args else 5.0
fix = {}
if "--fix" in args:
    for kv in args[args.index("--fix")+1].split(","):
        k, v = kv.split("="); fix[k] = v or None
W = json.load(open(f"{od}/words_cut.json")); ws = []
for w in W:
    t = w["w"]
    if t.startswith("-") and ws: ws[-1]["w"] += t; ws[-1]["e"] = w["e"]; continue
    if t.startswith(".") and ws: ws[-1]["w"] += t; ws[-1]["e"] = w["e"]; continue      # "a" + ".m."
    core = re.sub(r"[^\w']", "", t)
    if core in fix:
        if fix[core] is None:
            if ws: ws[-1]["e"] = w["e"]
            continue
        t = t.replace(core, fix[core])
    ws.append(dict(w, w=t))
clean = lambda t: re.sub(r"[^\w'\- ]", "", t) if not re.fullmatch(r"[\w.]+\.m\.?", t) else t.rstrip(".,")
chunks, cur = [], []
for i, w in enumerate(ws):
    nxt = ws[i+1] if i+1 < len(ws) else None
    cur.append(w)
    txt = " ".join(clean(x["w"]) for x in cur)
    nxt_txt = (txt + " " + clean(nxt["w"])) if nxt else txt
    if (not nxt or re.search(r"[,.?!]$", w["w"]) or nxt["s"] - w["e"] > 0.3
            or len(cur) >= 4 or len(nxt_txt) > 20):
        chunks.append(cur); cur = []
def ts(t):
    t = max(t, 0); return f"{int(t//3600)}:{int(t%3600//60):02d}:{t%60:05.2f}"
# SAFE ZONES (1080x1920): nothing in top 220, captions end by y~1590 (bottom 330 is IG UI), clear of the right-side buttons
hdr = """[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Cap,Inter,72,&H00FFFFFF,&H00FFFFFF,&H00000000,&H90000000,-1,0,0,0,100,100,0,0,1,0,2,8,140,140,1440,1
Style: Title,Inter ExtraBold,76,&H00FFFFFF,&H00FFFFFF,&H00000000,&H00000000,-1,0,0,0,100,100,0,0,1,0,0,8,130,130,228,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
ev = []
for k, c in enumerate(chunks):
    st, en = c[0]["s"], c[-1]["e"]
    if k+1 < len(chunks):
        if chunks[k+1][0]["s"] - en < 0.35: en = chunks[k+1][0]["s"]
        en = min(max(en, st + 0.35), chunks[k+1][0]["s"])
    ev.append(f"Dialogue: 1,{ts(st)},{ts(en)},Cap,,0,0,0,,{{\\fscx94\\fscy94\\t(0,90,\\fscx100\\fscy100)}}" + " ".join(clean(x["w"]) for x in c))
size = int(args[args.index("--title-size")+1]) if "--title-size" in args else 92
hdr = hdr.replace("Inter ExtraBold,76", f"Inter ExtraBold,{size}")
clicks = []
if "--typewriter" not in args:                                   # default: whole title at once, no click sound
    ev.append(f"Dialogue: 2,{ts(0)},{ts(hold)},Title,,0,0,0,,{{\\fad(120,250)}}" + "\\N".join(title))
    chars = []
else:
    chars = list(title[0]) + (["\\N"] + list(title[1]) if len(title) > 1 else [])
t0, dt, shown = 0.08, 0.045, ""
for i, ch in enumerate(chars):
    shown += ch; t = t0 + i*dt; nt = t0 + (i+1)*dt if i+1 < len(chars) else hold
    rest = "".join(chars[i+1:])
    txt = shown + ("{\\alpha&HFF&}" + rest if rest else "")
    fade = "" if rest else "{\\fad(0,250)}"
    ev.append(f"Dialogue: 2,{ts(t)},{ts(nt)},Title,,0,0,0,,{fade}{txt}")
    if ch.strip() and ch != "\\N": clicks.append(t)
open(f"{od}/reel.ass", "w").write(hdr + "\n".join(ev) + "\n")
sr = 48000; n = int(sr*(hold + 1)); y = [0.0]*n; random.seed(1)
for t in clicks:
    i0 = int(t*sr); g = random.uniform(0.7, 1.0); prev = 0.0
    for j in range(int(0.018*sr)):
        env = math.exp(-9*j/(0.018*sr)); nz = random.gauss(0, 1)*env
        y[i0+j] += g*(0.6*(nz - prev) + 0.3*math.sin(2*math.pi*2400*j/sr)*env); prev = nz
pk = max(max(abs(v) for v in y), 1e-9) if clicks else 1.0
with wave.open(f"{od}/sfx.wav", "w") as f:
    f.setnchannels(1); f.setsampwidth(2); f.setframerate(sr)
    f.writeframes(b"".join(int(v/pk*0.5*32767).to_bytes(2, "little", signed=True) for v in y))
print(len(chunks), "caption chunks; title clicks", len(clicks))
