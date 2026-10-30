# python pexels.py "woman typing laptop night" [--n 4] [--min 4]
# Downloads vertical stock clips from Pexels into B-roll/stock (free; needs PEXELS_API_KEY in .env,
# get one at pexels.com/api). Saves credit info next to each clip, then run broll_index.py.
import sys, os, json, urllib.request, urllib.parse
HERE = os.path.dirname(os.path.abspath(__file__)); STUDIO = os.path.abspath(os.path.join(HERE, "..", ".."))
env = {}
for line in open(os.path.join(STUDIO, ".env"), encoding="utf-8"):
    if "=" in line and not line.lstrip().startswith("#"):
        k, v = line.strip().split("=", 1); env[k.strip()] = v.strip().strip('"')
key = env.get("PEXELS_API_KEY") or sys.exit("add PEXELS_API_KEY to video-editor/.env (free at pexels.com/api)")
a = sys.argv[1:]; q = a[0]
n = int(a[a.index("--n") + 1]) if "--n" in a else 4
mind = float(a[a.index("--min") + 1]) if "--min" in a else 4
url = "https://api.pexels.com/videos/search?" + urllib.parse.urlencode({"query": q, "orientation": "portrait", "per_page": 20, "size": "medium"})
res = json.load(urllib.request.urlopen(urllib.request.Request(url, headers={"Authorization": key, "User-Agent": "dolly-studio"}), timeout=60))
out = os.path.join(STUDIO, "B-roll", "stock"); os.makedirs(out, exist_ok=True); got = 0
for v in res.get("videos", []):
    if got >= n or v["duration"] < mind: continue
    files = [f for f in v["video_files"] if f.get("height") and f["height"] >= f.get("width", 0) and f["height"] <= 2160]
    if not files: continue
    best = max(files, key=lambda f: f["height"])
    slug = "-".join(q.lower().split())[:40]; name = f"pexels-{v['id']}-{slug}.mp4"; dst = os.path.join(out, name)
    if os.path.exists(dst): continue
    urllib.request.urlretrieve(best["link"], dst)
    json.dump({"source": "pexels", "id": v["id"], "url": v["url"], "by": v["user"]["name"], "query": q},
              open(dst + ".credit.json", "w"))
    got += 1; print("got", name, f'{best["width"]}x{best["height"]}', f'{v["duration"]}s', "by", v["user"]["name"])
print(f"{got} clip(s) -> B-roll/stock. Now: python Setup/scripts/broll_index.py")
