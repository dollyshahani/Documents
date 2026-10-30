# python3 transcribe.py <audio_or_video> <out_prefix> [--text-only]
# -> <out_prefix>.txt (timestamped lines) and <out_prefix>_words.json
import sys, json, subprocess, numpy as np
from faster_whisper import WhisperModel
src, out = sys.argv[1], sys.argv[2]
raw = subprocess.run(["ffmpeg","-v","error","-i",src,"-vn","-f","s16le","-ac","1","-ar","16000","-"],capture_output=True,check=True).stdout
a = np.frombuffer(raw, np.int16).astype(np.float32)/32768
m = WhisperModel("small.en", device="cpu", compute_type="int8")
segs, _ = m.transcribe(a, word_timestamps=True, beam_size=5)
lines, words = [], []
for s in segs:
    lines.append(f"[{s.start:6.2f}] {s.text.strip()}")
    words += [{"w": w.word.strip(), "s": round(w.start,2), "e": round(w.end,2)} for w in s.words]
open(out+".txt","w").write("\n".join(lines))
json.dump(words, open(out+"_words.json","w"))
print("\n".join(lines) if "--text-only" not in sys.argv else " ".join(x["w"] for x in words))
