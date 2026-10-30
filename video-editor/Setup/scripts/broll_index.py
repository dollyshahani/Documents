# python broll_index.py            -> scans B-roll/{mine,stock,ai}, adds new clips to B-roll/index.json
# For every new clip: duration, size, orientation, and a 4-frame contact sheet (B-roll/_sheets/).
# Claude then LOOKS at each sheet and fills "desc", "tags", "world" (day|night|any) — entries
# with "needs_tags": true are the ones still waiting. Clips are never modified.
import os, json, subprocess, sys
HERE = os.path.dirname(os.path.abspath(__file__))
BR = os.path.abspath(os.path.join(HERE, "..", "..", "B-roll"))
IDX = os.path.join(BR, "index.json")
EXT = (".mp4", ".mov", ".m4v", ".mkv", ".webm")
idx = json.load(open(IDX)) if os.path.exists(IDX) else []
known = {e["file"] for e in idx}
os.makedirs(os.path.join(BR, "_sheets"), exist_ok=True)
added = 0
for src in ("mine", "stock", "ai"):
    folder = os.path.join(BR, src)
    for f in sorted(os.listdir(folder)) if os.path.isdir(folder) else []:
        rel = f"{src}/{f}"
        if not f.lower().endswith(EXT) or rel in known: continue
        p = os.path.join(folder, f)
        info = json.loads(subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
                          "stream=width,height:stream_side_data=rotation:format=duration", "-of", "json", p],
                          capture_output=True, text=True).stdout or "{}")
        st = (info.get("streams") or [{}])[0]; dur = float(info.get("format", {}).get("duration", 0))
        w, h = st.get("width", 0), st.get("height", 0)
        rot = next((abs(int(sd.get("rotation", 0))) for sd in st.get("side_data_list", []) if "rotation" in sd), 0)
        if rot in (90, 270): w, h = h, w
        sheet = f"_sheets/{src}__{os.path.splitext(f)[0]}.jpg"
        n = 4; step = max(dur / (n + 1), 0.1)
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", p, "-vf", f"fps=1/{step:.3f},scale=240:-2,tile={n}x1",
                        "-frames:v", "1", os.path.join(BR, sheet)])
        idx.append({"file": rel, "source": src, "dur": round(dur, 2), "w": w, "h": h, "vertical": h >= w,
                    "sheet": sheet, "desc": "", "tags": [], "world": "", "used_in": [], "needs_tags": True,
                    "ai": src == "ai"})
        added += 1
json.dump(idx, open(IDX, "w"), indent=1)
todo = [e for e in idx if e.get("needs_tags")]
print(f"added {added}; {len(idx)} clips indexed; {len(todo)} waiting for tags")
for e in todo: print("  tag me:", e["file"], "->", e["sheet"])
