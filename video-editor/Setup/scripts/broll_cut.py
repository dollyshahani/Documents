# python broll_cut.py <project_dir> <B-roll/clip> <clip_start_s> <dur_s> <at_s_in_reel>
# Makes a FULL-SCREEN cutaway and prepends it to <project_dir>/overlays.json, so render.py lays it
# over her footage (under stickers + captions) from at_s to at_s+dur. Uses render.py's existing
# "mov" overlay path — no changes to render.py. Silent: her voice carries through (audio comes
# only from pieces). Cover-crop to 1080x1920, NO colour change, no speed change, hard cut in/out.
# Run AFTER animate.py (animate.py ignores entries without "anim", so order doesn't break it either).
# At the gate: cutaways are full-screen, so they are the one allowed exception to the face rule.
import sys, os, json, subprocess
d, clip, cs, dur, at = sys.argv[1], sys.argv[2], float(sys.argv[3]), float(sys.argv[4]), float(sys.argv[5])
os.makedirs(os.path.join(d, "broll"), exist_ok=True)
ovp = os.path.join(d, "overlays.json"); ov = json.load(open(ovp)) if os.path.exists(ovp) else []
ov = [o for o in ov if not (o.get("broll") and abs(o["s"] - at) < 0.01)]   # re-running the same slot replaces it
k = sum(1 for o in ov if o.get("broll"))
rel = f"broll/cut{k}_{at:.2f}.mp4"; out = os.path.join(d, rel)
subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{cs:.3f}", "-t", f"{dur:.3f}", "-i", clip, "-an",
                "-vf", f"scale=1080:1920:force_original_aspect_ratio=increase:flags=lanczos,crop=1080:1920,setsar=1,fps=30,"
                       f"tpad=start_duration={at:.3f}:start_mode=add:color=black",
                "-c:v", "libx264", "-preset", "veryfast", "-crf", "17", "-pix_fmt", "yuv420p", out], check=True)
entry = {"broll": clip.replace("\\", "/"), "png": "", "mov": rel, "x": 0, "y": 0, "mx": 0, "my": 0,
         "s": round(at, 2), "e": round(at + dur, 2)}
ov.insert(sum(1 for o in ov if o.get("broll")), entry)                     # b-roll first = under the stickers
json.dump(ov, open(ovp, "w"), indent=1)
print(f"cutaway {rel}: {at:.2f}-{at+dur:.2f}s from {clip} @ {cs:.2f}s")
