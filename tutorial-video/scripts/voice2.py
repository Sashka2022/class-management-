#!/usr/bin/env python3
"""Neural Hebrew narration: Nakdimon diacritization + israwave (ONNX VITS) -> timed track -> mux.
Models (not committed): https://github.com/thewh1teagle/israwave/releases/tag/v0.1.0 (israwave.onnx, nakdimon.onnx, espeak-ng-data)."""
import sys, os, re, types, subprocess
sys.modules["sounddevice"] = types.ModuleType("sounddevice")  # PortAudio not needed (we only save files)
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import plan, soundfile as sf
from israwave import IsraWave
from nakdimon_ort import Nakdimon
M = os.environ.get("ISRAWAVE_DIR", "/tmp/israwave")
tts = IsraWave(f"{M}/israwave.onnx", f"{M}/espeak-ng-data"); nak = Nakdimon(f"{M}/nakdimon.onnx")
os.chdir(plan.ROOT)
def clean(t):
    t = t.replace("—", ",").replace("״", "").replace("‑", "-").replace("־", "-")
    return re.sub(r"\s+", " ", t).strip()
FIX = {"שֶׁקַף": "שֶׁקֶף", "מָסַךְ": "מָסָךְ", " ,": ",", "מִפְעִילוּת": "מַפְעִילוֹת"}
def fix(v):
    for a, b in FIX.items(): v = v.replace(a, b)
    return v
def synth(text, rate, path):
    w = tts.create(text, rate=rate); sf.write(path, w.samples, w.sample_rate); return len(w.samples) / w.sample_rate
def main():
    shots = plan.build_shots(); T = 0.0; lines = []
    os.makedirs("work/voice2", exist_ok=True)
    for s in shots:
        for (a, b, txt) in s["caps"]: lines.append((T + a, T + b, clean(txt)))
        T += s["dur"]
    total = T; inputs = []; filt = []; log = []
    for i, (a, b, txt) in enumerate(lines):
        v = fix(nak.compute(txt)); p = f"work/voice2/l{i}.wav"; win = b - a - 0.2
        rate = 1.0; d = synth(v, rate, p)
        if d > win:
            rate = max(0.6, 0.97 * win / d); d = synth(v, rate, p)
        tempo = 1.0 if d <= win else min(1.3, d / win)
        log.append(f"{i}\t{a:.2f}\t{d:.2f}\t{win:.2f}\trate={rate:.2f}\ttempo={tempo:.2f}\t{v}")
        inputs += ["-i", p]
        filt.append(f"[{i}:a]atempo={tempo:.3f},adelay={int((a + 0.1) * 1000)}|{int((a + 0.1) * 1000)}[a{i}]")
    open("work/voice2.log", "w").write("\n".join(log) + "\n"); print("\n".join(log))
    mix = "".join(f"[a{i}]" for i in range(len(lines)))
    filt.append(f"{mix}amix=inputs={len(lines)}:normalize=0,loudnorm=I=-16:TP=-1.5,apad=whole_dur={total},aformat=sample_rates=44100:channel_layouts=stereo[aout]")
    subprocess.run(["ffmpeg", "-v", "error", "-y"] + inputs + ["-filter_complex", ";".join(filt), "-map", "[aout]", "-t", f"{total}", "-c:a", "aac", "-b:a", "160k", "work/narration2.m4a"], check=True)
    for fmt, outn in (("land", "kalei-kalut-tutorial"), ("vert", "kalei-kalut-tutorial-vertical")):
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", f"work/{fmt}-video.mp4", "-i", "work/narration2.m4a", "-map", "0:v", "-map", "1:a",
                        "-c:v", "copy", "-c:a", "aac", "-b:a", "160k", "-shortest", "-movflags", "+faststart", f"final/{outn}.mp4"], check=True)
    print("done", total)
main()
