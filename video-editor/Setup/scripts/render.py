# python3 render.py <dir with pieces.json, reel.ass, sfx.wav, fonts/> <source video> <OUT.mp4> [precrop_filter]
# env: STAGE=pieces (resumable piece encode)  DENOISE=1 (light afftdn on the voice)
#      GLAM=1 (subtle skin-soften on the footage only — threshold-based, keeps edges/eyes/hair
#      crisp, no colour shift; this is NOT a grade and stays well under app-filter strength)
# No colour grade. Audio joins are soft: each piece carries a short tail that crossfades into the next.
# Optional overlays.json: [{"png", "s", "e", "x", "y", "fin", "fout"}] — placed under the captions.
# Entries that animate.py has processed carry "mov" (+ "mx","my") and are overlaid as
# transparent video clips instead of static PNGs. Run animate.py before render.py.
import json, sys, subprocess, os, wave, math
from array import array
d, src, out = (os.path.abspath(x) for x in sys.argv[1:4])
pre = sys.argv[4] + "," if len(sys.argv) > 4 else ""
wd = os.path.join(d, "work"); os.makedirs(wd, exist_ok=True)
P = json.load(open(os.path.join(d, "pieces.json")))
SR = 48000
files = []
for i, p in enumerate(P):
    dur = p["e"] - p["s"]; f = os.path.join(wd, f"{i:03d}.mkv"); files.append(f)
    if os.path.exists(f): continue
    z = p["z"]
    zoom = f"crop=iw/{z}:ih/{z}:(iw-iw/{z})*0.5:(ih-ih/{z})*0.3,scale=1080:1920:flags=lanczos," if z > 1.001 else ""
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{p['s']:.3f}", "-i", src, "-t", f"{dur:.3f}",
                    "-vf", pre + zoom + "setsar=1,fps=30", "-an", "-c:v", "libx264", "-preset", "veryfast",
                    "-crf", "16", "-g", "30", f + ".tmp.mkv"], check=True)
    os.replace(f + ".tmp.mkv", f)
if os.environ.get("STAGE") == "pieces": sys.exit(0)
# ---- voice track with soft joins
voice = array("h")
prev_tail = 0
for i, p in enumerate(P):
    dur = p["e"] - p["s"]; tail = p.get("tail", 0.0)
    n_body, n_tail = round(dur*SR), round(tail*SR)
    if p.get("mute"):
        cur = array("h", bytes(2*(n_body + n_tail)))
    else:
        raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{p['s']:.3f}", "-i", src, "-t", f"{dur+tail:.3f}",
                              "-vn", "-ac", "1", "-ar", str(SR), "-f", "s16le", "-"], capture_output=True, check=True).stdout
        cur = array("h"); cur.frombytes(raw[:len(raw)//2*2])
        need = n_body + n_tail
        if len(cur) < need: cur.extend(array("h", bytes(2*(need - len(cur)))))
        del cur[need:]
    if i == 0:
        fi = min(len(cur), int(0.01*SR))
        for k in range(fi): cur[k] = int(cur[k]*k/fi)
    n = min(prev_tail, len(cur), len(voice))
    if n > 0:                                            # equal-power crossfade over the previous piece's tail
        base = len(voice) - n
        for k in range(n):
            x = (k + 0.5)/n
            voice[base+k] = max(-32768, min(32767, int(voice[base+k]*math.cos(x*math.pi/2) + cur[k]*math.sin(x*math.pi/2))))
        voice.extend(cur[n:])
    else:
        voice.extend(cur)
    prev_tail = n_tail
fo = int(0.03*SR)
for k in range(min(fo, len(voice))): voice[-1-k] = int(voice[-1-k]*k/fo)
vw = os.path.join(wd, "voice.wav")
with wave.open(vw, "w") as f:
    f.setnchannels(1); f.setsampwidth(2); f.setframerate(SR); f.writeframes(voice.tobytes())
open(os.path.join(wd, "list.txt"), "w").write("".join(f"file '{x}'\n" for x in files))
cat = os.path.join(wd, "cat.mkv")
subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", os.path.join(wd, "list.txt"), "-c", "copy", cat], check=True)
ass = os.path.join(d, "reel.ass").replace("\\", "/").replace(":", "\\:"); fd = os.path.join(d, "fonts").replace("\\", "/").replace(":", "\\:")
# optional picture overlays (overlays.json: [{png, s, e, x, y, fin, fout}]) go under the captions
ov = json.load(open(os.path.join(d, "overlays.json"))) if os.path.exists(os.path.join(d, "overlays.json")) else []
ins, chain, last = [], "", "[0:v]"
if os.environ.get("GLAM"):
    chain += "[0:v]smartblur=lr=1.6:ls=0.55:lt=12[gl];"
    last = "[gl]"
for k, o in enumerate(ov):
    if o.get("mov"):                                     # animated sticker from animate.py
        ins += ["-i", os.path.join(d, o["mov"])]
        x, y = o.get("mx", o["x"]), o.get("my", o["y"])
        chain += f"[{3+k}:v]format=rgba[o{k}];{last}[o{k}]overlay={x}:{y}:eof_action=pass:enable='between(t,{o['s']:.2f},{o['e']:.2f})'[b{k}];"
    else:
        ins += ["-loop", "1", "-t", f"{o['e']+0.1:.2f}", "-i", os.path.join(d, o["png"])]
        fx = "format=rgba"
        if o.get("fin"): fx += f",fade=t=in:st={o['s']:.2f}:d=0.22:alpha=1"
        if o.get("fout"): fx += f",fade=t=out:st={o['e']-0.22:.2f}:d=0.22:alpha=1"
        chain += f"[{3+k}:v]{fx}[o{k}];{last}[o{k}]overlay={o['x']}:{o['y']}:enable='between(t,{o['s']:.2f},{o['e']:.2f})'[b{k}];"
    last = f"[b{k}]"
# DENOISE=1: light FFT noise reduction on the voice (room hiss/fan), applied before EQ and compression
dn = "afftdn=nr=12:nf=-35:tn=1," if os.environ.get("DENOISE") else ""
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", cat, "-i", vw, "-i", os.path.join(d, "sfx.wav")] + ins + ["-filter_complex",
    chain + f"{last}ass='{ass}':fontsdir='{fd}',format=yuv420p[v];"
    f"[1:a]{dn}highpass=f=80,acompressor=threshold=-20dB:ratio=2:attack=10:release=150[vo];[2:a]volume=0.35[s];"
    "[vo][s]amix=inputs=2:duration=first:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=7,aresample=48000[a]",
    "-map", "[v]", "-map", "[a]", "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-c:a", "aac", "-b:a", "192k",
    "-ac", "2", "-movflags", "+faststart", out], check=True)
print("done", out)
