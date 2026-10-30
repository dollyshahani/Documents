# python photos_index.py   -> indexes Photos/ (jpg/png/heic, any subfolders) into Photos/index.json and
# makes numbered contact sheets (Photos/_sheets/sheet_NN.jpg, 20 per sheet). Claude LOOKS at the sheets
# and fills "desc", "tags", "vibe" per photo so it can pick 3 that match an identity statement.
import os, json
from PIL import Image, ImageOps, ImageDraw
try:
    import pillow_heif; pillow_heif.register_heif_opener()
except ImportError:
    pass
HERE = os.path.dirname(os.path.abspath(__file__)); PH = os.path.abspath(os.path.join(HERE, "..", "..", "Photos"))
IDX = os.path.join(PH, "index.json"); idx = json.load(open(IDX)) if os.path.exists(IDX) else []
known = {e["file"] for e in idx}; new = []
for root, _, files in os.walk(PH):
    if "_sheets" in root: continue
    for f in sorted(files):
        if f.lower().endswith((".jpg", ".jpeg", ".png", ".heic", ".webp")):
            rel = os.path.relpath(os.path.join(root, f), PH).replace("\\", "/")
            if rel not in known: new.append(rel)
os.makedirs(os.path.join(PH, "_sheets"), exist_ok=True)
start = len(idx)
for i in range(0, len(new), 20):
    batch = new[i:i+20]; sheet = Image.new("RGB", (5*220, 4*260), "white"); dr = ImageDraw.Draw(sheet)
    n = (start + i)//20 + 1; name = f"_sheets/sheet_{n:02d}.jpg"
    for j, rel in enumerate(batch):
        try:
            im = ImageOps.fit(ImageOps.exif_transpose(Image.open(os.path.join(PH, rel))).convert("RGB"), (210, 230))
        except Exception as e:
            print("skip", rel, e); continue
        x, y = (j % 5)*220 + 5, (j//5)*260 + 5
        sheet.paste(im, (x, y)); dr.text((x, y + 234), f"{start + i + j}: {rel[:28]}", fill="black")
        idx.append({"n": start + i + j, "file": rel, "sheet": name, "desc": "", "tags": [], "vibe": "",
                    "used_in": [], "needs_tags": True})
    sheet.save(os.path.join(PH, name), quality=85)
json.dump(idx, open(IDX, "w"), indent=1)
print(f"added {len(new)}; {len(idx)} photos; sheets in Photos/_sheets/ — tag the ones with needs_tags")
