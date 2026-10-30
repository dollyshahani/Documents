# python make_popups.py [<out_dir>] [--text "LIP · ruby woo" --kind pill|ribbon|card|tag --world day|night --name lip]
# No args: (re)builds the starter library in Pop-ups/{day,night}/ + Pop-ups/index.json.
# With --text: makes ONE custom pop-up (place-time pills, product callouts, STEP n OF 4...) into
# <out_dir> (default: current folder) and prints its size — use for per-reel text.
# Flat paper style per signature-style.md: no glow, no gradients, no shadows. Drawn at 2x, downsampled.
import sys, os, json, math
from PIL import Image, ImageDraw, ImageFont
HERE = os.path.dirname(os.path.abspath(__file__))
STUDIO = os.path.abspath(os.path.join(HERE, "..", ".."))
FONTS = os.path.join(STUDIO, "Signature Style", "fonts")
S = 2  # supersample
C = dict(cream="#FFF8EA", blush="#F4C2C8", cherry="#B3122E", ink="#2A0710", blue="#B0CFE6",
         maroon="#5C0F1E", champagne="#F3E6D3", gold="#B8945A", gold2="#E3C68F", leaf="#4F7A3A")
WORLD = {"day": dict(card=C["cream"], text=C["ink"], pill=C["cherry"], pill_text=C["cream"], ribbon=C["blush"], ribbon_text=C["ink"], line=C["cherry"]),
         "night": dict(card=C["champagne"], text=C["maroon"], pill=C["maroon"], pill_text=C["gold2"], ribbon=C["gold2"], ribbon_text=C["maroon"], line=C["gold"])}

def font(name, size, var=None):
    f = ImageFont.truetype(os.path.join(FONTS, name), size * S)
    if var:
        try: f.set_variation_by_name(var)
        except Exception: pass
    return f
JOST = lambda size, w="SemiBold": font("Jost[wght].ttf", size, w)
BODONI_I = lambda size: font("BodoniModa-Italic[opsz,wght].ttf", size, "Italic")
SCRIPT = lambda size: font("Italianno-Regular.ttf", size)

def finish(im):
    bb = im.getbbox() or (0, 0, 2, 2)
    im = im.crop((max(bb[0] - 4*S, 0), max(bb[1] - 4*S, 0), min(bb[2] + 4*S, im.width), min(bb[3] + 4*S, im.height)))
    return im.resize((im.width // S, im.height // S), Image.LANCZOS)

def canvas(w, h): return Image.new("RGBA", (w*S, h*S), (0, 0, 0, 0))

# ---------- text pop-ups ----------
def pill(text, fill, color, size=38, track=True):
    f = JOST(size, "SemiBold"); t = text
    d0 = ImageDraw.Draw(canvas(1, 1)); tw = d0.textlength(t, font=f); ph = int(size*1.9)*S
    im = canvas(int(tw/S) + size*2 + 20, int(ph/S) + 10); d = ImageDraw.Draw(im)
    d.rounded_rectangle([4*S, 4*S, 4*S + tw + size*2*S, 4*S + ph], ph//2, fill=fill)
    d.text((4*S + size*S + tw/2, 4*S + ph/2), t, font=f, fill=color, anchor="mm")
    return finish(im)

def ribbon(text, fill, color, size=54):
    f = BODONI_I(size); d0 = ImageDraw.Draw(canvas(1, 1)); tw = d0.textlength(text, font=f)
    h, notch = int(size*1.7)*S, int(size*0.5)*S
    w = tw + size*1.6*S
    im = canvas(int(w/S) + 20, int(h/S) + 20); d = ImageDraw.Draw(im); x0, y0 = 6*S, 6*S
    d.polygon([(x0, y0), (x0 + w, y0), (x0 + w - notch, y0 + h/2), (x0 + w, y0 + h), (x0, y0 + h), (x0 + notch, y0 + h/2)], fill=fill)
    d.text((x0 + w/2, y0 + h/2 - size*0.08*S), text, font=f, fill=color, anchor="mm")
    return finish(im)

def card(lines, w_, fill, color, label=None, mono=False):
    big = BODONI_I(64) if not mono else font("Jost[wght].ttf", 36, "Medium")
    pad = 44*S; lh = (78 if not mono else 50)*S
    h = pad*2 + lh*len(lines) + (56*S if label else 0)
    im = canvas(w_, int(h/S) + 10); d = ImageDraw.Draw(im)
    d.rounded_rectangle([4*S, 4*S, (w_-4)*S, 4*S + h], 28*S, fill=fill)
    y = 4*S + pad
    if label:
        d.text((w_*S/2, y + 14*S), label, font=JOST(26, "SemiBold"), fill=C["cherry"], anchor="mm"); y += 56*S
    for ln in lines:
        d.text((w_*S/2, y + lh/2), ln, font=big, fill=color, anchor="mm"); y += lh
    return finish(im)

# ---------- flat stickers ----------
def sparkle(color, r=60):
    im = canvas(r*2 + 10, r*2 + 10); d = ImageDraw.Draw(im); cx = cy = (r + 5)*S; R = r*S; k = 0.18
    d.polygon([(cx, cy - R), (cx + R*k, cy - R*k), (cx + R, cy), (cx + R*k, cy + R*k), (cx, cy + R), (cx - R*k, cy + R*k), (cx - R, cy), (cx - R*k, cy - R*k)], fill=color)
    return finish(im)

def sparkles(color):
    im = canvas(260, 220)
    for (x, y, r) in [(40, 40, 70), (190, 120, 45), (70, 160, 28)]:
        sp = sparkle(color, r).resize((int(r*2.2)*S, int(r*2.2)*S), Image.LANCZOS)
        im.alpha_composite(sp, (x*S - sp.width//2 + 70*S, y*S - sp.height//2 + 20*S))
    return finish(im)

def heart(color, w=160):
    im = canvas(w + 10, w + 10); d = ImageDraw.Draw(im); s = w*S; o = 5*S
    d.ellipse([o, o + s*0.05, o + s*0.55, o + s*0.6], fill=color); d.ellipse([o + s*0.45, o + s*0.05, o + s, o + s*0.6], fill=color)
    d.polygon([(o + s*0.03, o + s*0.42), (o + s*0.97, o + s*0.42), (o + s*0.5, o + s*0.95)], fill=color)
    return finish(im)

def cherries():
    im = canvas(240, 260); d = ImageDraw.Draw(im)
    d.line([(70*S, 170*S), (130*S, 40*S)], fill=C["leaf"], width=7*S); d.line([(170*S, 185*S), (130*S, 40*S)], fill=C["leaf"], width=7*S)
    d.ellipse([125*S, 20*S, 205*S, 60*S], fill=C["leaf"])
    for (x, y) in [(70, 190), (170, 205)]:
        d.ellipse([(x - 46)*S, (y - 46)*S, (x + 46)*S, (y + 46)*S], fill=C["cherry"])
        d.ellipse([(x - 26)*S, (y - 30)*S, (x - 10)*S, (y - 14)*S], fill="#E8566A")
    return finish(im)

def bow(color, knot):
    im = canvas(300, 240); d = ImageDraw.Draw(im); cx, cy = 150*S, 100*S
    d.polygon([(cx, cy), (cx - 130*S, cy - 70*S), (cx - 140*S, cy + 60*S)], fill=color)
    d.polygon([(cx, cy), (cx + 130*S, cy - 70*S), (cx + 140*S, cy + 60*S)], fill=color)
    d.polygon([(cx - 10*S, cy + 10*S), (cx - 70*S, cy + 130*S), (cx - 30*S, cy + 125*S)], fill=color)
    d.polygon([(cx + 10*S, cy + 10*S), (cx + 70*S, cy + 130*S), (cx + 30*S, cy + 125*S)], fill=color)
    d.rounded_rectangle([cx - 28*S, cy - 30*S, cx + 28*S, cy + 30*S], 14*S, fill=knot)
    return finish(im)

def moon(color, bg_cut=True):
    im = canvas(200, 200); d = ImageDraw.Draw(im); d.ellipse([10*S, 10*S, 190*S, 190*S], fill=color)
    mask = canvas(200, 200); ImageDraw.Draw(mask).ellipse([60*S, -10*S, 230*S, 160*S], fill="#000000")
    im.putalpha(Image.composite(Image.new("L", im.size, 0), im.getchannel("A"), mask.getchannel("A")))
    return finish(im)

def code_tag(text, world):
    w = WORLD[world]; return pill(text, C["ink"] if world == "day" else C["maroon"], C["gold2"] if world == "night" else C["cream"], size=34)

def library():
    out = os.path.join(STUDIO, "Pop-ups"); idx = []
    def save(world, name, im, kind, anim, tags):
        os.makedirs(os.path.join(out, world), exist_ok=True)
        p = f"{world}/{name}.png"; im.save(os.path.join(out, p))
        idx.append({"png": p, "world": world, "kind": kind, "anim": anim, "w": im.width, "h": im.height, "tags": tags})
    for world in ("day", "night"):
        w = WORLD[world]
        save(world, "pill-built-with-ai", pill("BUILT WITH AI", w["pill"], w["pill_text"]), "pill", "pop", ["ai", "teaching"])
        for n in range(1, 5):
            save(world, f"pill-step-{n}-of-4", pill(f"STEP {n} OF 4", C["cherry"], C["cream"]), "pill", "pop", ["teaching", "steps"])
        save(world, "pill-save-this", pill("SAVE THIS", w["pill"], w["pill_text"], size=44), "pill", "pulse", ["save", "cta"])
        save(world, "pill-copy-this-prompt", pill("copy this prompt", w["card"], w["text"], size=32), "pill", "rise", ["ai", "prompt"])
        for txt, slug in [("wow. groundbreaking.", "wow"), ("bestie, no.", "bestie-no"), ("noted, darling.", "noted"),
                          ("delulu, but data-backed", "delulu"), ("plot twist.", "plot-twist"), ("it's already mine", "already-mine")]:
            save(world, f"ribbon-{slug}", ribbon(txt, w["ribbon"], w["ribbon_text"]), "ribbon", "pop", ["sass"] + (["story"] if slug == "plot-twist" else []) + (["manifest"] if slug == "already-mine" else []))
        save(world, "card-chapter-01", card(["CHAPTER 01"], 620, w["card"], w["text"]), "card", "rise", ["story"])
        save(world, "tag-build", code_tag("> build(dolly_os)", world), "tag", "pop", ["ai", "code"])
        save(world, "signoff-xo-dolly", finish(_script("xo, dolly", w["line"])), "signoff", "rise", ["signoff"])
        save(world, "signoff-grwm", finish(_script("get ready with me", w["line"])), "signoff", "rise", ["glam"])
        save(world, "sticker-sparkles", sparkles(C["gold2"] if world == "night" else C["cherry"]), "sticker", "float", ["manifest", "sparkle"])
        save(world, "sticker-bow", bow(C["blush"] if world == "day" else C["cherry"], C["cherry"] if world == "day" else C["gold2"]), "sticker", "float", ["manifest", "bow", "glam"])
        save(world, "sticker-heart", heart(C["cherry"]), "sticker", "pop", ["love"])
        save(world, "sticker-moon", moon(C["gold2"] if world == "night" else C["blue"]), "sticker", "float", ["manifest", "night"])
        save(world, "sticker-cherries", cherries(), "sticker", "pop", ["cute", "brand"])
    json.dump(idx, open(os.path.join(out, "index.json"), "w"), indent=1)
    print(f"built {len(idx)} pop-ups into {out}")

def _script(text, color):
    f = SCRIPT(120); tw = ImageDraw.Draw(canvas(1, 1)).textlength(text, font=f)
    im = canvas(int(tw/S) + 40, 190); ImageDraw.Draw(im).text((20*S, 95*S), text, font=f, fill=color, anchor="lm")
    return im

if __name__ == "__main__":
    a = sys.argv[1:]
    if "--text" not in a:
        library()
    else:
        opt = lambda k, d: a[a.index(k) + 1] if k in a else d
        text, kind, world = opt("--text", ""), opt("--kind", "pill"), opt("--world", "day")
        w = WORLD[world]
        im = {"pill": lambda: pill(text, w["pill"], w["pill_text"]),
              "ribbon": lambda: ribbon(text, w["ribbon"], w["ribbon_text"]),
              "card": lambda: card(text.split("|"), 760, w["card"], w["text"], label=opt("--label", None), mono="--mono" in a),
              "tag": lambda: code_tag(text, world)}[kind]()
        od = a[0] if a and not a[0].startswith("--") else "."
        name = opt("--name", kind)
        im.save(os.path.join(od, f"{name}.png")); print(f"{name}.png {im.width}x{im.height}")
