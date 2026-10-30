# python3 plan.py <audio.wav 16k mono> <words.json> <cuts.json> <out_dir>
# env: PAUSES=natural|chatty|jumpy (default natural; USE chatty)  ZOOMCUTS=1
# cuts.json: list in REEL ORDER. Each item is either
#   {"say": "exact words she says, start to end of the kept line", "zoom": 1.0}
#   {"raw": [start_s, end_s], "mute": true}      # visual-only moments (reveal etc.)
# Back-to-back kept lines are MERGED into one piece, so the reel only cuts where something was removed.
# Writes out_dir/pieces.json and out_dir/words_cut.json.
import sys, json, re, wave, difflib, numpy as np
wav, wj, cj, od = sys.argv[1:5]
import os
PMIN, KB, KA, PM = {"natural": (90, 0.35, 0.30, 3), "chatty": (50, 0.15, 0.12, 0), "jumpy": (25, 0.08, 0.06, 0)}[os.environ.get("PAUSES", "natural")]
W = json.load(open(wj)); C = json.load(open(cj))
with wave.open(wav) as f:
    sr = f.getframerate(); a = np.frombuffer(f.readframes(f.getnframes()), np.int16).astype(np.float32)/32768
hop = sr//100
e = np.sqrt(np.convolve(a**2, np.ones(hop)/hop, "same")[::hop]) + 1e-9
db = 20*np.log10(e)
TH = max(np.percentile(db, 20) + 6, -45)
norm = lambda t: re.sub(r"[^a-z0-9']", "", t.lower())
toks = [norm(x["w"]) for x in W]
def find(say):
    q = [norm(t) for t in say.split() if norm(t)]
    best = (0, 0, 0)
    for i in range(len(toks)):
        for L in range(max(1, len(q)-3), len(q)+4):
            if i+L > len(toks): continue
            r = difflib.SequenceMatcher(None, q, toks[i:i+L]).ratio()
            if r > best[0]: best = (r, i, i+L-1)
    return best
def fr(t): return int(min(max(t, 0), len(db)/100 - 0.01)*100)
def cushion_start(i0):
    s = W[i0]["s"]; lo = (W[i0-1]["e"] + 0.02) if i0 > 0 else 0
    a0, a1 = fr(max(s - 0.20, lo)), fr(s + 0.06)
    if a1 > a0:
        i = a0 + int(np.argmin(db[a0:a1]))
        if db[i] < TH: return max(i/100 - 0.04, lo)
    return max(s - 0.06, lo)
def cushion_end(i1, last):
    e_ = W[i1]["e"]; hi = (W[i1+1]["s"] - 0.03) if i1+1 < len(W) else e_ + 1.0
    hi = max(hi, e_ + 0.02)
    j = fr(e_ - 0.10)
    while j < fr(min(e_ + 0.50, hi)):
        if (db[j:j+15] < TH).all():
            return min(j/100 + (0.45 if last else 0.18), hi)
        j += 1
    return min(e_ + 0.15, hi)
# ---- 1. find every line
L = []
for k, c in enumerate(C):
    if "raw" in c:
        L.append({"raw": c["raw"], "mute": bool(c.get("mute")), "z": c.get("zoom", 1.0)}); continue
    r, i0, i1 = find(c["say"])
    print(f"{r:.2f}  {' '.join(x['w'] for x in W[i0:i1+1])}")
    L.append({"i0": i0, "i1": i1, "z": c.get("zoom", 1.0)})
# ---- 2. merge lines that run on in the source (next line starts at the very next word, or within 1.0 s)
M = []
for l in L:
    p = M[-1] if M else None
    if p and "i0" in l and "i0" in p and l["z"] == p["z"] and 0 <= l["i0"] - p["i1"] <= 1 and W[l["i0"]]["s"] - W[p["i1"]]["e"] < 1.0:
        p["i1"] = l["i1"]; continue
    M.append(dict(l))
P = []
for k, m in enumerate(M):
    if "raw" in m:
        P.append({"s": m["raw"][0], "e": m["raw"][1], "z": m["z"], "mute": m["mute"], "w": None}); continue
    st, en = cushion_start(m["i0"]), cushion_end(m["i1"], k == len(M)-1)
    # pause removal. PAUSES=natural (default: only >=0.9 s), chatty (>=0.5 s), jumpy (>=0.25 s)
    parts, cur, j, run = [], st, fr(st) + 20, None
    while j < fr(en) - 20:
        if db[j] < TH - PM:
            run = j if run is None else run
        else:
            if run is not None and j - run >= PMIN:
                parts.append((cur, run/100 + KB)); cur = j/100 - KA
            run = None
        j += 1
    parts.append((cur, en))
    for s0, s1 in parts:
        P.append({"s": round(s0, 2), "e": round(s1, 2), "z": m["z"], "mute": False, "w": [m["i0"], m["i1"]]})
# ---- 3. refine the outer edges of each kept block by re-listening to a short snippet
from faster_whisper import WhisperModel
Mdl = WhisperModel("small.en", device="cpu", compute_type="int8")
def snip(t0, t1):
    seg, _ = Mdl.transcribe(a[int(t0*sr):int(t1*sr)], word_timestamps=True, beam_size=5)
    return [(norm(w.word), t0 + w.start, t0 + w.end) for s_ in seg for w in s_.words if norm(w.word)]
for n, p in enumerate(P):
    if not p["w"]: continue
    first_piece = n == 0 or P[n-1]["w"] != p["w"]; last_piece = n+1 == len(P) or P[n+1]["w"] != p["w"]
    if first_piece:
        want = toks[p["w"][0]]; got = snip(p["s"], min(p["s"] + 2.0, p["e"]))
        k = next((i for i, g in enumerate(got) if g[0] == want), None)
        if k:
            ns = max(got[k][1] - 0.06, got[k-1][2])
            a0, a1 = fr(ns - 0.06), fr(ns + 0.15)
            i = a0 + int(np.argmin(db[a0:a1]))
            p["s"] = round(i/100 if db[i] < TH else ns, 2)
    if last_piece:
        want = toks[p["w"][1]]; got = snip(max(p["e"] - 2.0, p["s"]), p["e"])
        k = max((i for i, g in enumerate(got) if g[0] == want), default=None)
        if k is not None and k + 1 < len(got):
            p["e"] = round(max(got[k][2] + 0.08, min(got[k+1][1] - 0.03, p["e"])), 2)
# ---- 4. confirm each outer edge by ear; nudge to the next quiet point if a stray word is heard
for n, p in enumerate(P):
    if not p["w"]: continue
    if n == 0 or P[n-1]["w"] != p["w"]:
        want = toks[p["w"][0]]
        for _ in range(3):
            got = snip(p["s"], min(p["s"] + 1.5, p["e"]))
            if not got or got[0][0].startswith(want) or want.startswith(got[0][0]): break
            a0, a1 = fr(p["s"] + 0.02), fr(p["s"] + 0.30)
            p["s"] = round(a0/100 + int(np.argmin(db[a0:a1]))/100, 2)
    if n+1 == len(P) or P[n+1]["w"] != p["w"]:
        want = toks[p["w"][1]]
        for _ in range(3):
            got = snip(max(p["e"] - 1.5, p["s"]), p["e"])
            if not got or got[-1][0].endswith(want) or want.endswith(got[-1][0]): break
            a0, a1 = fr(p["e"] - 0.30), fr(p["e"] - 0.02)
            p["e"] = round(a0/100 + int(np.argmin(db[a0:a1]))/100, 2)
# ---- zoom: every cut switches framing so jump cuts read as camera moves. Lines marked with zoom >= 1.1
# in cuts.json alternate 1.15 / 1.04; everything else alternates 1.00 / 1.08.
if os.environ.get("ZOOMCUTS"):
    for n, p in enumerate(P):
        if p.get("mute"): continue
        hi = p["z"] >= 1.1
        p["z"] = (1.15 if hi else 1.0) if n % 2 == 0 else (1.04 if hi else 1.08)
# ---- 5. audio tail for soft joins: up to 0.06 s of the source after each cut, only if it is clear of the next word
for p in P:
    nxt = next((x["s"] for x in W if x["s"] >= p["e"] - 0.02), p["e"] + 1)
    p["tail"] = round(max(0.0, min(0.06, nxt - p["e"] - 0.02)), 3)
P[-1]["tail"] = 0.0
t, out = 0.0, []
for n, p in enumerate(P):
    p["t"] = round(t, 2)
    if p["w"]:
        for k in range(p["w"][0], p["w"][1]+1):
            x = W[k]
            if p["s"] - 0.12 <= x["s"] < p["e"] - 0.05:
                out.append({"w": x["w"], "s": round(t + max(x["s"] - p["s"], 0), 2), "e": round(t + min(x["e"], p["e"]) - p["s"], 2)})
    t += p["e"] - p["s"]
json.dump(P, open(f"{od}/pieces.json", "w")); json.dump(out, open(f"{od}/words_cut.json", "w"))
print(f"pieces {len(P)} (cuts {len(P)-1})  length {t:.1f}s  (match < 0.80 = check that line)")
chk = np.concatenate([a[int(p["s"]*sr):int(p["e"]*sr)] * (0 if p.get("mute") else 1) for p in P])
seg, _ = Mdl.transcribe(chk, beam_size=5)
print("LISTEN-BACK:", " ".join(s_.text.strip() for s_ in seg))
