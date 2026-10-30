# python send_to_dollyos.py <Projects/name/POST_THIS_name.mp4> --hook "Hook title" --caption caption.txt [--pillar ai-building|productivity]
# After final approval: puts the reel into the Dolly OS Reels tab as "needs you" (review),
# so it shares the one schedule + Instagram poster with the automatic reels. Sends her the push.
# Needs video-editor/.env with SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, APP_URL, CRON_SECRET.
# Stdlib only. The final itself is never touched; a smaller delivery copy is made if it's over the
# storage upload limit (Supabase free tier: 50 MB per file).
import sys, os, json, time, subprocess, tempfile, urllib.request
here = os.path.dirname(os.path.abspath(__file__))
env = {}
for line in open(os.path.join(here, "..", "..", ".env"), encoding="utf-8"):
    if "=" in line and not line.lstrip().startswith("#"):
        k, v = line.strip().split("=", 1); env[k.strip()] = v.strip().strip('"')
SB, KEY = env["SUPABASE_URL"].rstrip("/"), env["SUPABASE_SERVICE_ROLE_KEY"]
args = sys.argv[1:]
src = os.path.abspath(args[0])
opt = lambda name, d=None: args[args.index(name) + 1] if name in args else d
hook = opt("--hook", os.path.basename(src))
cap_arg = opt("--caption", "")
caption = open(cap_arg, encoding="utf-8").read().strip() if cap_arg and os.path.exists(cap_arg) else cap_arg
pillar = opt("--pillar", "")
name = os.path.basename(os.path.dirname(src)) or "reel"

def req(method, url, data=None, headers=None):
    h = {"apikey": KEY, "Authorization": f"Bearer {KEY}"}; h.update(headers or {})
    with urllib.request.urlopen(urllib.request.Request(url, data=data, headers=h, method=method), timeout=600) as r:
        return r.read()

up, LIMIT = src, 45 * 1024 * 1024
if os.path.getsize(src) > LIMIT:
    dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", src],
                               capture_output=True, text=True, check=True).stdout)
    kbps = int(LIMIT * 8 / 1000 / dur * 0.9) - 192              # fit under the limit, leave room for audio
    up = os.path.join(tempfile.gettempdir(), f"{name}_delivery.mp4")
    print(f"final is {os.path.getsize(src)/1e6:.0f} MB -> delivery copy at ~{kbps} kbps")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", src, "-c:v", "libx264", "-preset", "slow", "-b:v", f"{kbps}k",
                    "-maxrate", f"{int(kbps*1.5)}k", "-bufsize", f"{kbps*2}k", "-pix_fmt", "yuv420p",
                    "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", up], check=True)

obj = f"upload-{name}-{int(time.time())}.mp4"
with open(up, "rb") as f:
    req("POST", f"{SB}/storage/v1/object/reels/{obj}", f.read(), {"Content-Type": "video/mp4", "x-upsert": "true"})
url = f"{SB}/storage/v1/object/public/reels/{obj}"
row = json.loads(req("POST", f"{SB}/rest/v1/reels", json.dumps({
    "status": "review", "source": "upload", "topic": name, "pillar": pillar, "hook": hook,
    "caption": caption, "video_url": url}).encode(),
    {"Content-Type": "application/json", "Prefer": "return=representation"}))[0]
print("in Dolly OS review queue:", row["id"], url)
if env.get("APP_URL"):
    try:
        urllib.request.urlopen(urllib.request.Request(
            env["APP_URL"].rstrip("/") + "/api/cron/reel-ready", json.dumps({"id": row["id"]}).encode(), method="POST",
            headers={"Content-Type": "application/json", "Authorization": f"Bearer {env.get('CRON_SECRET', '')}"}), timeout=60)
        print("push sent")
    except Exception as e:
        print("push failed (reel is still queued):", e)
