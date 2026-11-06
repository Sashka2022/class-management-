#!/usr/bin/env python3
"""Edit plan + assembler.  usage: plan.py prep | make land|vert"""
import json, sys, os, subprocess, html
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)
W = os.path.join(ROOT, "work")
FPS = 30
BLUE, DARK, TEAL, NAVY = "#456cc3", "#315298", "#087e82", "#1d2b4f"

def meta(s):
    return json.load(open(f"raw/{s}.meta.json"))
def mark(m, label):
    t0 = m["starts"]["teacher"]
    return [(x["t"] - t0) / 1000 for x in m["marks"] if x["label"] == label][0]

# ---- layouts -------------------------------------------------------------
LAY = {
 "land": dict(w=1920, h=1080,
   single=[dict(x=80, y=150, w=1760, h=700)],
   split=[dict(x=980, y=150, w=910, h=600), dict(x=30, y=150, w=910, h=600)],   # teacher(right), proj(left)
   triple=[dict(x=1130, y=150, w=760, h=600), dict(x=510, y=150, w=580, h=600), dict(x=30, y=150, w=440, h=600)],
   cap=dict(x=80, y=870, w=1760, h=150, fs=46),
   title=dict(top=34, right=60, fs=40), logo=dict(left=60, top=26)),
 "vert": dict(w=1080, h=1920,
   single=[dict(x=20, y=250, w=1040, h=1000)],
   split=[dict(x=20, y=250, w=1040, h=620), dict(x=20, y=890, w=1040, h=620)],
   triple=[dict(x=20, y=250, w=520, h=640), dict(x=560, y=250, w=500, h=640), dict(x=20, y=910, w=1040, h=600)],
   cap=dict(x=40, y=1580, w=1000, h=250, fs=56),
   title=dict(top=120, right=40, fs=44), logo=dict(left=40, top=26)),
}

# ---- shots ---------------------------------------------------------------
# panels: (source key, src start, region0, region1)  region = (cx, cy, rw, rh) in source px
FULL = (960, 540, 1920, 1080)
SHOTS = []
def shot(**k): SHOTS.append(k)

def build_shots():
    L, Le, Mo, He, Gr, Ha, Ph = (meta(s) for s in ["login", "lesson", "mode", "hearts", "groups", "hats", "phone"])
    shot(kind="card", id="intro", dur=6.0,
         caps=[(0.3, 5.8, "פחות זמן בניהול הטכני של השיעור. יותר זמן עם התלמידים.")])
    shot(id="login", scene="login", layout="single", title="1 · כניסה לכיתה", dur=7.0, speed=1.0,
         panels=[("teacher", mark(L, "login-screen") + 4.4, (960, 540, 1920, 800), (700, 520, 1450, 640))],
         labels=["מסך המורה"],
         caps=[(0.2, 6.8, "נכנסות לכיתה עם סיסמה, ובלחיצה אחת מגיעות לממשק המורה.")])
    shot(id="open", scene="login", layout="split", title="1 · פתיחת השיעור וההקרנה", dur=8.0, speed=1.0,
         panels=[("teacher", mark(L, "lesson-open") + 0.6, (900, 500, 1500, 760), (900, 520, 1300, 640)),
                 ("proj", mark(L, "lesson-open") + 0.6, FULL, FULL)],
         labels=["מסך המורה", "מסך ההקרנה"],
         caps=[(0.2, 7.8, "מסך ההקרנה נפתח בחלון נפרד — וכל מעבר שקף שלך מופיע בו מיד.")])
    shot(id="lesson", scene="lesson", layout="split", title="2 · שקפים, שלבי שיעור וטיימר", dur=11.0, speed=1.0,
         panels=[("teacher", mark(Le, "slide2") + 4.3, (780, 560, 1420, 760), (780, 560, 1300, 700)),
                 ("proj", mark(Le, "slide2") + 4.3, FULL, FULL)],
         labels=["מסך המורה", "מסך ההקרנה"],
         caps=[(0.2, 5.4, "עוברות בין שלבי השיעור ומפעילות טיימר."), (5.5, 10.8, "דקה נוספת בלחיצה — והכיתה רואה את הזמן על הלוח.")])
    shot(id="mode", scene="mode", layout="split", title="3 · מצב כיתה", dur=9.2, speed=1.0,
         panels=[("teacher", mark(Mo, "start") + 2.0, (960, 540, 1500, 840), (960, 540, 1200, 760)),
                 ("proj", mark(Mo, "start") + 2.0, FULL, FULL)],
         labels=["מסך המורה", "מסך ההקרנה"],
         caps=[(0.2, 4.6, "הקשבה, עבודה שקטה, זוגות או קבוצות —"), (4.7, 9.0, "בחירה אחת, והמסר מופיע על המסך בלי מילה.")])
    shot(id="pairs", scene="mode", layout="split", title="3 · מצב כיתה", dur=5.2, speed=1.0,
         panels=[("teacher", mark(Mo, "pairs") - 3.4, (960, 540, 1500, 840), (960, 540, 1500, 840)),
                 ("proj", mark(Mo, "pairs") - 3.4, FULL, FULL)],
         labels=["מסך המורה", "מסך ההקרנה"],
         caps=[(0.2, 5.0, "ומחליפות למצב זוגות — ההקרנה מתעדכנת מיד.")])
    shot(id="hearts", scene="hearts", layout="split", title="4 · לבבות ומשוב", dur=11.0, speed=1.25,
         panels=[("teacher", mark(He, "students") + 0.8, (1000, 760, 1500, 700), (1000, 860, 1300, 520)),
                 ("proj", mark(He, "students") + 0.8, (960, 700, 1920, 760), (960, 880, 1700, 420))],
         labels=["מסך המורה", "מסך ההקרנה"],
         caps=[(0.2, 5.4, "נותנות לב לתלמידה או לתלמיד על מאמץ ושיתוף פעולה —"), (5.5, 10.8, "והלב נרשם ומופיע גם בהקרנה.")])
    shot(id="groups", scene="groups", layout="split", title="5 · קבוצות ותפקידים", dur=14.0, speed=1.25,
         panels=[("teacher", mark(Gr, "groups-page") + 0.5, (1000, 560, 1500, 900), (1000, 600, 1500, 900)),
                 ("proj", mark(Gr, "groups-page") + 0.5, FULL, FULL)],
         labels=["מסך המורה", "מסך ההקרנה"],
         caps=[(0.2, 6.0, "מסמנות חלוקת תפקידים אוטומטית, ולוחצות על חלוקה חדשה —"), (6.1, 10.2, "הכיתה מתחלקת אקראית, עם תפקיד לכל תלמיד."), (10.3, 13.8, "פרסום להקרנה — וכולם רואים את הקבוצות.")])
    shot(id="hats", scene="hats", layout="split", title="6 · הקרנת קבוצות וכובעי חשיבה", dur=13.6, speed=1.25,
         panels=[("teacher", mark(Ha, "split") - 1.5, (1000, 600, 1500, 900), (1000, 600, 1500, 900)),
                 ("proj", mark(Ha, "split") - 1.5, FULL, FULL)],
         labels=["מסך המורה", "מסך ההקרנה"],
         caps=[(0.2, 6.0, "מפעילות את כובעי החשיבה ומחלקות אותם אוטומטית —"), (6.1, 13.3, "וההקרנה מציגה לכל קבוצה את הכובע ואת הדרך לחשוב עכשיו.")])
    shot(id="phone", scene="phone", layout="triple", title="7 · שליטה מהנייד", dur=18.0, speed=1.0,
         panels=[("teacher", mark(Ph, "code") - 3.0, (960, 540, 1500, 840), (960, 540, 1500, 840)),
                 ("phone", 0, (270, 540, 540, 1080), (270, 540, 540, 1080)),
                 ("proj", mark(Ph, "code") - 3.0, FULL, FULL)],
         labels=["מחשב המורה", "הנייד", "מסך ההקרנה"],
         caps=[(0.2, 6.0, "מחברות את הנייד בקוד חיבור חד־פעמי."), (6.1, 12.0, "מהנייד לוחצות ״הבא״ —"), (12.1, 17.8, "והשקף עובר בהקרנה, בזמן אמת.")])
    shot(id="phone-fix", skip=True)
    shot(kind="card", id="outro", dur=6.5,
         caps=[(0.3, 6.2, "קלי קלוח — פחות ניהול, יותר תלמידים.")])
    return [s for s in SHOTS if not s.get("skip")]

# ---- overlay html --------------------------------------------------------
def logo_html(L):
    return f'<div style="position:absolute;left:{L["logo"]["left"]}px;top:{L["logo"]["top"]}px;display:flex;align-items:center;gap:14px;direction:rtl"><img src="file://{W}/logo.webp" style="width:78px;height:78px;border-radius:50%"><div style="color:{DARK};font-weight:800;font-size:40px">קלי קלוח</div></div>'

def chrome(L, s):
    lay = L[s["layout"]]
    bg = "linear-gradient(160deg,#f6f8fd,#e3eafa)"
    rects = "".join(f'<div style="position:absolute;left:{r["x"]-6}px;top:{r["y"]-6}px;width:{r["w"]+12}px;height:{r["h"]+12}px;background:#fff;border-radius:10px;box-shadow:0 10px 30px rgba(49,82,152,.25)"></div>' for r in lay)
    t = L["title"]
    title = f'<div style="position:absolute;right:{t["right"]}px;top:{t["top"]}px;background:{DARK};color:#fff;font-weight:700;font-size:{t["fs"]}px;padding:12px 32px;border-radius:50px">{html.escape(s["title"])}</div>'
    return dict(html=rects + title + logo_html(L), bg=bg)

def labels_overlay(L, s):
    lay = L[s["layout"]]; out = ""
    for r, lb in zip(lay, s["labels"]):
        out += f'<div style="position:absolute;left:{r["x"]+14}px;top:{r["y"]+14}px;background:rgba(29,43,79,.88);color:#fff;font-weight:700;font-size:26px;padding:6px 20px;border-radius:30px">{html.escape(lb)}</div>'
    return out

def cap_html(L, text):
    c = L["cap"]
    return f'<div style="position:absolute;left:{c["x"]}px;top:{c["y"]}px;width:{c["w"]}px;height:{c["h"]}px;background:rgba(29,43,79,.95);border-radius:26px;display:flex;align-items:center;justify-content:center;text-align:center;padding:0 40px;color:#fff;font-weight:700;font-size:{c["fs"]}px;line-height:1.3">{html.escape(text)}</div>'

def card_html(L, s):
    w, h = L["w"], L["h"]
    if s["id"] == "intro":
        big, sub = "פחות זמן בניהול הטכני של השיעור.", "יותר זמן עם התלמידים."
    else:
        big, sub = "פחות ניהול.", "יותר תלמידים."
    vert = w < h
    return dict(bg=f"linear-gradient(160deg,#315298,#456cc3 60%,#087e82)", html=f'''
<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:{40 if not vert else 60}px;text-align:center">
 <img src="file://{W}/logo.webp" style="width:{210 if not vert else 300}px;height:auto;border-radius:50%;box-shadow:0 12px 40px rgba(0,0,0,.3)">
 <div style="font-weight:800;font-size:{64 if not vert else 76}px;color:#fff;padding:0 60px">{big}</div>
 <div style="font-weight:800;font-size:{84 if not vert else 96}px;color:#ffd978">{sub}</div>
 <div style="font-weight:400;font-size:34px;color:#dbe6ff;margin-top:20px">קלי קלוח · מרחב למחשבות ולמידה</div>
</div>''')

# ---- prep: overlays list -------------------------------------------------
def prep():
    shots = build_shots(); items = []
    for fmt, L in LAY.items():
        for s in shots:
            base = f"work/ov-{fmt}-{s['id']}"
            if s.get("kind") == "card":
                c = card_html(L, s); items.append(dict(file=base + "-bg.png", w=L["w"], h=L["h"], html=c["html"], bg=c["bg"]))
            else:
                c = chrome(L, s); items.append(dict(file=base + "-bg.png", w=L["w"], h=L["h"], html=c["html"], bg=c["bg"]))
                items.append(dict(file=base + "-lab.png", w=L["w"], h=L["h"], html=labels_overlay(L, s)))
            for i, (a, b, txt) in enumerate(s["caps"]):
                cap_bottom = s.get("kind") == "card"
                if cap_bottom: continue
                items.append(dict(file=f"{base}-cap{i}.png", w=L["w"], h=L["h"], html=cap_html(L, txt)))
    json.dump(items, open("work/items.json", "w"), ensure_ascii=False)
    print(len(items), "overlays")

# ---- make ----------------------------------------------------------------
def panel_filter(inp, rect, p, speed, D, src_w, src_h, label):
    key, t0, r0, r1 = p
    pw, ph = rect["w"], rect["h"]; asp = pw / ph
    def box(r):
        cx, cy, rw, rh = r
        cw = max(rw, rh * asp); cw = min(cw, src_w, src_h * asp); ch = cw / asp
        cx = min(max(cx, cw / 2), src_w - cw / 2); cy = min(max(cy, ch / 2), src_h - ch / 2)
        return cx, cy, cw
    a, b = box(r0), box(r1)
    u = f"min(t/{D},1)"
    cw = f"({a[2]}+({b[2]}-{a[2]})*{u})"
    cx = f"({a[0]}+({b[0]}-{a[0]})*{u})"
    cy = f"({a[1]}+({b[1]}-{a[1]})*{u})"
    f = f"({pw}/{cw})"
    return (f"[{inp}]setpts=(PTS-STARTPTS)/{speed},fps={FPS},"
            f"scale=w='trunc(iw*{f}/2)*2':h='trunc(ih*{f}/2)*2':eval=frame:flags=bicubic,"
            f"crop={pw}:{ph}:x='max(0,min(iw-{pw},{cx}*{f}-{pw}/2))':y='max(0,min(ih-{ph},{cy}*{f}-{ph}/2))',setsar=1[{label}]")

def make(fmt):
    L = LAY[fmt]; shots = build_shots(); clips = []; srt = []; narr = []; T = 0.0
    os.makedirs("work/clips", exist_ok=True)
    for s in shots:
        out = f"work/clips/{fmt}-{s['id']}.mp4"; base = f"work/ov-{fmt}-{s['id']}"; D = s["dur"]
        if s.get("kind") == "card":
            cmd = ["ffmpeg", "-v", "error", "-y", "-loop", "1", "-framerate", str(FPS), "-t", str(D), "-i", base + "-bg.png",
                   "-vf", f"fade=t=in:st=0:d=0.5,fade=t=out:st={D-0.5}:d=0.5,format=yuv420p", "-c:v", "libx264", "-crf", "17", "-r", str(FPS), out]
        else:
            m = meta(s["scene"]); lay = L[s["layout"]]
            inputs = ["-loop", "1", "-framerate", str(FPS), "-t", str(D), "-i", base + "-bg.png"]
            filt = []; idx = 1; labs = []
            for i, p in enumerate(s["panels"]):
                key, t0 = p[0], p[1]
                src = m["files"][key]
                off = 0.0 if key != "proj" else (m["starts"]["proj"] - m["starts"]["teacher"]) / 1000
                start = max(0, t0 - off) if key != "phone" else max(0, t0 + (m["starts"]["teacher"] - m["starts"]["phone"]) / 1000)
                if key == "phone":
                    start = max(0, mark(m, "code") - 3.0 + (m["starts"]["teacher"] - m["starts"]["phone"]) / 1000) if "t_phone" not in s else s["t_phone"]
                inputs += ["-ss", f"{start:.3f}", "-t", f"{D*s['speed']+0.5:.3f}", "-i", src]
                sw, sh = (540, 1080) if key == "phone" else (1920, 1080)
                filt.append(panel_filter(f"{idx}:v", lay[i], p, s["speed"], D, sw, sh, f"p{i}")); idx += 1
            chain = "[0:v]"
            for i in range(len(s["panels"])):
                filt.append(f"{chain}[p{i}]overlay={lay[i]['x']}:{lay[i]['y']}:eof_action=pass[o{i}]"); chain = f"[o{i}]"
            inputs += ["-loop", "1", "-framerate", str(FPS), "-t", str(D), "-i", base + "-lab.png"]
            filt.append(f"{chain}[{idx}:v]overlay=0:0[l]"); chain = "[l]"; idx += 1
            for j, (a, b, txt) in enumerate(s["caps"]):
                inputs += ["-loop", "1", "-framerate", str(FPS), "-t", str(D), "-i", f"{base}-cap{j}.png"]
                filt.append(f"{chain}[{idx}:v]overlay=0:0:enable='between(t,{a},{b})'[c{j}]"); chain = f"[c{j}]"; idx += 1
            filt.append(f"{chain}format=yuv420p[v]")
            cmd = ["ffmpeg", "-v", "error", "-y"] + inputs + ["-filter_complex", ";".join(filt), "-map", "[v]", "-t", str(D),
                   "-c:v", "libx264", "-crf", "17", "-preset", "fast", "-r", str(FPS), out]
        r = subprocess.run(cmd, capture_output=True, text=True)
        if r.returncode: print("FFMPEG FAIL", s["id"], r.stderr[-1500:]); sys.exit(1)
        for (a, b, txt) in s["caps"]:
            srt.append((T + a, T + b, txt)); narr.append(txt)
        clips.append(out); T += D; print("clip", fmt, s["id"], "ok", round(T, 1))
    open(f"work/{fmt}-list.txt", "w").write("".join(f"file '{os.path.abspath(c)}'\n" for c in clips))
    final = f"work/{fmt}-video.mp4"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", f"work/{fmt}-list.txt",
                    "-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo", "-shortest", "-c:v", "copy", "-c:a", "aac", "-b:a", "96k", "-movflags", "+faststart", final], check=True)
    def ts(x):
        h, m_, s_ = int(x // 3600), int(x % 3600 // 60), x % 60
        return f"{h:02d}:{m_:02d}:{int(s_):02d},{int(round((s_ - int(s_)) * 1000)):03d}"
    open(f"work/{fmt}.srt", "w").write("".join(f"{i+1}\n{ts(a)} --> {ts(b)}\n{t}\n\n" for i, (a, b, t) in enumerate(srt)))
    open(f"work/{fmt}-narration.txt", "w").write("\n".join(narr) + "\n")
    print("total", round(T, 1))

if __name__ == "__main__":
    if sys.argv[1] == "prep": prep()
    else: make(sys.argv[2])
