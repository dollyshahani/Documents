# python animate.py <dir>
# Turns static sticker PNGs into animated pop-ups. Reads <dir>/overlays.json; every entry
# with an "anim" key gets a transparent animated clip (work/anim<k>.mov, qtrle+alpha) that
# starts at t=0 (invisible until its "s"), and the entry gains "mov" + adjusted "mx","my".
# Run AFTER overlays.json is written, BEFORE render.py. Entries without "anim" stay static.
# Anims (subtle, never AI-looking): pop (classic overshoot entrance), rise (slide up+fade),
# float (entrance + gentle bob — bows, sparkles), pulse (entrance + soft breathe — SAVE THIS).
# All get a 0.22s fade-down exit at "e".
import json, os, sys, math, subprocess, shutil
from PIL import Image
d = sys.argv[1]
FPS = 30
ov = json.load(open(os.path.join(d, "overlays.json")))
wd = os.path.join(d, "work"); os.makedirs(wd, exist_ok=True)
def ease_out_back(p, k=1.70158):
    p -= 1; return p*p*((k+1)*p + k) + 1
for n_, o in enumerate(ov):
    if "anim" not in o: continue
    img = Image.open(os.path.join(d, o["png"])).convert("RGBA")
    W, H = img.size
    dur = o["e"] - o["s"]; nfr = max(int(dur*FPS), 2)
    cw, ch = int(W*1.25) + 2, int(H*1.25) + 60          # room for overshoot + bob
    fdir = os.path.join(wd, f"anim{n_}"); shutil.rmtree(fdir, ignore_errors=True); os.makedirs(fdir)
    ENT, EXIT = 0.38, 0.22
    for f in range(nfr):
        t = f/FPS
        sc, dy, al = 1.0, 0, 1.0
        if t < ENT:
            p = t/ENT
            if o["anim"] == "rise":
                dy = int((1-p)*(1-p)*46); al = p
            else:                                        # pop / float / pulse entrance
                sc = max(ease_out_back(p), 0.02); al = min(p/0.3, 1.0)
        else:
            tt = t - ENT
            if o["anim"] == "float": dy = int(6*math.sin(2*math.pi*tt/2.3))
            if o["anim"] == "pulse": sc = 1 + 0.045*math.sin(2*math.pi*tt/1.6)
        if t > dur - EXIT:
            q = max((dur - t)/EXIT, 0.0); al *= q; sc *= 0.96 + 0.04*q
        fr = Image.new("RGBA", (cw, ch), (0, 0, 0, 0))
        iw, ih = max(int(W*sc), 1), max(int(H*sc), 1)
        im2 = img.resize((iw, ih), Image.LANCZOS)
        if al < 1:
            im2.putalpha(im2.getchannel("A").point(lambda v: int(v*al)))
        fr.alpha_composite(im2, ((cw-iw)//2, (ch-ih)//2 + dy))
        fr.save(os.path.join(fdir, f"f{f:04d}.png"))
    mov = os.path.join(wd, f"anim{n_}.mov")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-framerate", str(FPS), "-i", os.path.join(fdir, "f%04d.png"),
                    "-vf", f"tpad=start_duration={o['s']:.2f}:start_mode=add:color=black@0.0",
                    "-c:v", "qtrle", "-pix_fmt", "argb", mov], check=True)
    o["mov"] = os.path.relpath(mov, d)
    o["mx"] = o["x"] - (cw - W)//2                      # keep the PNG's intended top-left
    o["my"] = o["y"] - (ch - H)//2
    shutil.rmtree(fdir)
json.dump(ov, open(os.path.join(d, "overlays.json"), "w"))
print("animated", sum(1 for o in ov if "mov" in o), "of", len(ov), "overlays")
