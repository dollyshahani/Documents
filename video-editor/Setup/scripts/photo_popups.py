# python photo_popups.py <project_dir> <at_s> <dur_s> <photo1> <photo2> <photo3> [--world day|night] [--y 1065]
# Identity statements ("I'm a girl who builds", "I'm becoming...") get THREE of her photos as
# polaroid pop-ups, popping in one after another (0.25 s apart) on the statement, all leaving together.
# Flat paper style (cream/champagne frame, slight tilt, no shadow/glow). Placed in the sweet zone
# below her face ellipse and above the captions. Appends to <project_dir>/overlays.json with
# anim "pop" — run BEFORE animate.py. iPhone HEIC works if pillow-heif is installed.
import sys, os, json
from PIL import Image, ImageOps
try:
    import pillow_heif; pillow_heif.register_heif_opener()
except ImportError:
    pass
a = sys.argv[1:]
d, at, dur, photos = a[0], float(a[1]), float(a[2]), a[3:6]
opt = lambda k, v: a[a.index(k) + 1] if k in a else v
world, y0 = opt("--world", "day"), int(opt("--y", 1065))
FRAME = {"day": "#FFF8EA", "night": "#F3E6D3"}[world]
PW, PH, B, BB = 210, 262, 12, 40            # photo size, border, polaroid bottom
TILT = [-5, 3, -2]
X = [150, 410, 670]                          # inside the 130px side margins once tilted
os.makedirs(os.path.join(d, "popups"), exist_ok=True)
ovp = os.path.join(d, "overlays.json"); ov = json.load(open(ovp)) if os.path.exists(ovp) else []
for k, src in enumerate(photos):
    im = ImageOps.exif_transpose(Image.open(src)).convert("RGB")
    im = ImageOps.fit(im, (PW*2, PH*2), Image.LANCZOS, centering=(0.5, 0.4))
    card = Image.new("RGBA", ((PW + 2*B)*2, (PH + B + BB)*2), FRAME)
    card.paste(im, (B*2, B*2))
    card = card.resize((PW + 2*B, PH + B + BB), Image.LANCZOS).rotate(TILT[k], expand=True, resample=Image.BICUBIC)
    name = f"popups/id_{at:.2f}_{k}.png"; card.save(os.path.join(d, name))
    ov = [o for o in ov if o.get("png") != name]
    ov.append({"png": name, "s": round(at + 0.25*k, 2), "e": round(at + dur, 2), "x": X[k], "y": y0 + (0, 18, 6)[k],
               "anim": "pop", "identity": os.path.basename(src)})
    print(f"{name} {card.width}x{card.height} at x={X[k]}  from {src}")
json.dump(ov, open(ovp, "w"), indent=1)
