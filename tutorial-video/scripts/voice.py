#!/usr/bin/env python3
"""Hebrew narration track (espeak-ng 'he' female variant, offline) timed to the caption windows; muxes it into the videos."""
import sys, os, re, ctypes, wave, subprocess, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import plan
import espeakng_loader as E
os.chdir(plan.ROOT)
lib = ctypes.CDLL(E.get_library_path())
SR = lib.espeak_Initialize(1, 0, E.get_data_path().encode(), 0)
CB = ctypes.CFUNCTYPE(ctypes.c_int, ctypes.POINTER(ctypes.c_short), ctypes.c_int, ctypes.c_void_p)
buf = bytearray()
def _cb(w, n, ev):
    if w and n > 0: buf.extend(ctypes.string_at(w, n * 2))
    return 0
_c = CB(_cb); lib.espeak_SetSynthCallback(_c)
VOICE = os.environ.get("VOICE", "he+f3").encode()
def synth(text, rate, path):
    buf.clear()
    lib.espeak_SetVoiceByName(VOICE)
    lib.espeak_SetParameter(1, int(rate), 0); lib.espeak_SetParameter(3, 58, 0); lib.espeak_SetParameter(2, 100, 0)
    t = text.encode("utf-8"); lib.espeak_Synth(t, len(t) + 1, 0, 0, 0, 1, None, None); lib.espeak_Synchronize()
    w = wave.open(path, "wb"); w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(bytes(buf)); w.close()
    return len(buf) / 2 / SR
def clean(t):
    t = t.replace("—", ",").replace("״", "").replace("‑", "-").replace("־", "-")
    return re.sub(r"\s+", " ", t).strip()
def main():
    shots = plan.build_shots(); T = 0.0; lines = []
    os.makedirs("work/voice", exist_ok=True)
    for s in shots:
        for (a, b, txt) in s["caps"]:
            lines.append((T + a, T + b, clean(txt)))
        T += s["dur"]
    total = T; inputs = []; filt = []
    for i, (a, b, txt) in enumerate(lines):
        p = f"work/voice/l{i}.wav"; win = b - a - 0.15
        rate = 150; d = synth(txt, rate, p)
        if d > win:
            rate = min(240, rate * d / win * 1.02); d = synth(txt, rate, p)
        tempo = 1.0 if d <= win else min(1.4, d / win)
        print(f"line {i}: {d:.2f}s window {win:.2f}s rate {int(rate)} tempo {tempo:.2f}")
        inputs += ["-i", p]
        filt.append(f"[{i}:a]atempo={tempo:.3f},adelay={int((a + 0.05) * 1000)}|{int((a + 0.05) * 1000)}[a{i}]")
    mix = "".join(f"[a{i}]" for i in range(len(lines)))
    filt.append(f"{mix}amix=inputs={len(lines)}:normalize=0,loudnorm=I=-16:TP=-1.5,apad=whole_dur={total},aformat=sample_rates=44100:channel_layouts=stereo[aout]")
    subprocess.run(["ffmpeg", "-v", "error", "-y"] + inputs + ["-filter_complex", ";".join(filt), "-map", "[aout]", "-t", f"{total}", "-c:a", "aac", "-b:a", "128k", "work/narration.m4a"], check=True)
    for fmt, outn in (("land", "kalei-kalut-tutorial"), ("vert", "kalei-kalut-tutorial-vertical")):
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", f"work/{fmt}-video.mp4", "-i", "work/narration.m4a", "-map", "0:v", "-map", "1:a",
                        "-c:v", "copy", "-c:a", "aac", "-b:a", "128k", "-shortest", "-movflags", "+faststart", f"final/{outn}.mp4"], check=True)
    print("done", total)
main()
