#!/usr/bin/env python3
"""Original upbeat background track (numpy synth, no samples/licences) + sidechain-ducked mix under the narration."""
import numpy as np, wave, subprocess, os, sys
os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SR = 44100; BPM = 112; DUR = 107.5
beat = 60 / BPM; N = int(DUR * SR); rng = np.random.default_rng(7)
out = np.zeros((N, 2))
def add(sig, t0, pan=0.0, gain=1.0):
    i = int(t0 * SR)
    if i >= N: return
    sig = sig[: N - i] * gain
    out[i:i + len(sig), 0] += sig * (1 - max(pan, 0)); out[i:i + len(sig), 1] += sig * (1 + min(pan, 0))
def env(n, a, r): 
    t = np.arange(n) / SR; return np.minimum(t / a, 1) * np.exp(-t / r)
def kick():
    n = int(.28 * SR); t = np.arange(n) / SR; f = 50 + 110 * np.exp(-t * 30)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 11)
def hat(open_=False):
    n = int((.18 if open_ else .05) * SR); x = rng.standard_normal(n); x = np.diff(x, prepend=0)
    return x * np.exp(-np.arange(n) / SR * (22 if open_ else 90))
def clap():
    n = int(.2 * SR); x = rng.standard_normal(n); t = np.arange(n) / SR
    x = np.convolve(x, np.ones(6) / 6, "same"); return x * (np.exp(-t * 28) + .6 * np.exp(-((t - .012) ** 2) * 6e4))
def tone(f, d, kind="pluck"):
    n = int(d * SR); t = np.arange(n) / SR
    if kind == "bass": s = np.sin(2 * np.pi * f * t) + .35 * np.sin(4 * np.pi * f * t); return s * env(n, .005, d * .5)
    if kind == "pad": s = sum(np.sin(2 * np.pi * f * (1 + k * .003) * t) for k in (-1, 0, 1)); return s * np.minimum(t / .5, 1) * np.minimum((d - t) / .5, 1) * .3
    s = np.sin(2 * np.pi * f * t) + .4 * np.sin(4 * np.pi * f * t) + .2 * np.sin(6 * np.pi * f * t); return s * env(n, .003, .22)
mid = lambda m: 440 * 2 ** ((m - 69) / 12)
prog = [(57, [57, 60, 64]), (53, [53, 57, 60]), (48, [48, 52, 55]), (55, [55, 59, 62])]   # Am F C G
bars = int(DUR / (4 * beat)) + 1
for b in range(bars):
    t0 = b * 4 * beat; root, ch = prog[b % 4]
    sec = 0 if t0 < 5.5 else (2 if t0 > DUR - 8 else 1)   # intro / groove / outro
    for m in ch: add(tone(mid(m), 4 * beat, "pad"), t0, 0, .25)
    if sec >= 1 or t0 > 2.5:
        for i in range(8):
            add(tone(mid(root - 12 + (12 if i % 4 == 3 else 0)), beat * .5, "bass"), t0 + i * beat / 2, 0, .45 if i % 2 == 0 else .3)
    for i in range(16):
        m = ch[[0, 1, 2, 1][i % 4]] + 12 + (12 if i % 8 >= 6 else 0)
        add(tone(mid(m), beat / 2, "pluck"), t0 + i * beat / 4, .35 if i % 2 else -.35, .16 if sec else .1)
    if sec == 1:
        for i in range(4): add(kick(), t0 + i * beat, 0, .9)
        for i in range(8): add(hat(i % 4 == 3), t0 + i * beat / 2 + beat / 4 * (i % 2 == 1) * 0, .2, .13)
        for i in (1, 3): add(clap(), t0 + i * beat, 0, .35)
    elif sec == 0 and b > 0:
        add(kick(), t0, 0, .6); add(kick(), t0 + 2 * beat, 0, .6)
    else:
        add(kick(), t0, 0, .7)
peak = np.abs(out).max(); out = out / peak * .8
fade = np.minimum(np.arange(N) / SR / 1.5, 1) * np.minimum((DUR - np.arange(N) / SR) / 3.0, 1)
out *= fade[:, None]
w = wave.open("work/music.wav", "wb"); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
w.writeframes((out * 32767).astype("<i2").tobytes()); w.close()
# mix: music -> lowpass, level, sidechain ducked by narration
g = float(os.environ.get("MUSIC_GAIN", "0.22"))
flt = (f"[0:a]asplit=2[nm][nk];"
       f"[1:a]volume={g},lowpass=f=9000[m];"
       f"[m][nk]sidechaincompress=threshold=0.015:ratio=10:attack=30:release=500:makeup=1[md];"
       f"[nm][md]amix=inputs=2:normalize=0:duration=first,alimiter=limit=0.95[aout]")
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", "work/narration2.m4a", "-i", "work/music.wav", "-filter_complex", flt, "-map", "[aout]", "-t", str(DUR), "-c:a", "aac", "-b:a", "192k", "work/mix.m4a"], check=True)
for fmt, outn in (("land", "kalei-kalut-tutorial"), ("vert", "kalei-kalut-tutorial-vertical")):
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", f"work/{fmt}-video.mp4", "-i", "work/mix.m4a", "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", f"final/{outn}.mp4"], check=True)
print("ok")
