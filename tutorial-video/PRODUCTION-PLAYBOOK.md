# Playbook: narration + music for tutorial videos

How the "קלי קלוח" tutorial got its Hebrew voice and background music. Reuse for future videos.
Scripts: `scripts/voice2.py` (narration), `scripts/music.py` (music + mix), `scripts/plan.py` (shots, captions, timing).

## Principles
- Captions are the narration: every caption `(start, end, text)` in a shot of `plan.py` is both a subtitle and a voice line. Voice is timed to the caption window.
- Voice first, music second. Music is mixed under the voice with sidechain ducking.
- Never claim a voice/music was checked by ear unless it was. There is no listening tool in the sandbox: verify with levels and timing only, and say so.
- Keep silent / no-music / alternative-voice variants next to the final files.

## Narration (offline neural Hebrew)
1. Hugging Face is blocked by the egress proxy (403). Do not work around it.
   GitHub **release assets** download fine with plain `curl -L`.
2. Models (not committed to the repo), into e.g. `/tmp/israwave`:
   `https://github.com/thewh1teagle/israwave/releases/download/v0.1.0/` + `israwave.onnx` (72MB), `nakdimon.onnx` (21MB), `espeak-ng-data.tar.gz` (extract it).
3. `pip install israwave` (pulls `nakdimon-ort`, `espeakng-loader`, `soundfile`). Running third-party model code may need the user's explicit approval in this environment; ask first.
4. `import israwave` fails without PortAudio, so stub it before importing: `sys.modules["sounddevice"] = types.ModuleType("sounddevice")`.
5. Pipeline per line: clean text (replace "—" with ",", drop quotes, U+2011/maqaf to "-") -> `Nakdimon(...).compute(text)` adds nikud -> `IsraWave(...).create(vocalized, rate=r)` -> wav (44.1kHz).
6. Fit to the caption window: synth at `rate=1.0`; if longer than window, `rate = 0.97*window/duration` (rate < 1 = faster) and re-synth; then `atempo` (max 1.3) if still too long.
7. Known nikud fixes (extend `FIX` in `voice2.py` when listening finds more): שֶׁקַף->שֶׁקֶף, מָסַךְ->מָסָךְ, remove space before commas.
8. Place each line with `adelay`, `amix=normalize=0`, `loudnorm=I=-16:TP=-1.5`, `apad=whole_dur=<video seconds>` (without `apad` `-shortest` truncates the video), then mux with `-c:v copy`.
9. The voice is male (SASpeech/Shaul). If a female voice is required, the fallback is espeak-ng (`espeakng-loader` via ctypes, `he+f3`), which is robotic: say so.
10. Licences of the voice data may restrict commercial use: warn the user.

## Music (original, no licence issues)
- `scripts/music.py` synthesizes a track with numpy: 112 BPM, Am-F-C-G, pad, bass, 16th-note pluck arpeggio, four-on-the-floor kick, hats, clap on 2 and 4, sparse intro, outro fade. 1.5s fade in, 3s fade out.
- Mix: `[music] volume=0.22, lowpass=9000` ducked by the narration with `sidechaincompress=threshold=0.015:ratio=10:attack=30:release=500`, then `amix=normalize=0` with the narration and `alimiter=limit=0.95`. Tune with `MUSIC_GAIN`.
- Measured result: voice windows about -18dB, music about -28dB beneath it; gaps -26 to -31dB.
- No stock-music source is reachable; do not download music of unknown licence.

## QC checklist
- ffprobe duration equals video duration; audio and video durations match.
- Mean/peak loudness (`volumedetect`): mean around -20dB, peak below -3dB.
- Per-line: audio duration <= window; music contribution at least 10dB under voice in voice windows.
- Report what could not be verified (listening, pronunciation).

## Environment gotchas (this sandbox)
- Playwright video needs `/opt/pw-browsers/ffmpeg-1013/ffmpeg-linux`; the installed build is 1011 without VP9, so a wrapper script maps `libvpx-vp9 -> libvpx` and raises the bitrate. Recreate it if missing.
- Background jobs: long ffmpeg/Playwright runs must be started in the background; foreground calls time out at 120s.
- Delivery: commit and push to the session branch; deploy only if the user asks.
