import subprocess,sys,json
from PIL import Image
meta,key,out,t0,t1,step=sys.argv[1],sys.argv[2],sys.argv[3],float(sys.argv[4]),float(sys.argv[5]),float(sys.argv[6])
f=json.load(open(meta))['files'][key]
ph=key=='phone'
W,H=(180,360) if ph else (400,225)
ts=[]; t=t0
while t<t1: ts.append(t); t+=step
cols=10 if ph else 5
rows=(len(ts)+cols-1)//cols
sh=Image.new('RGB',(W*cols,H*rows),'white')
for i,t in enumerate(ts):
    subprocess.run(['ffmpeg','-v','error','-y','-ss',str(t),'-i',f,'-frames:v','1','-vf',f'scale={W}:{H}','work/_g.png'])
    try: sh.paste(Image.open('work/_g.png'),((i%cols)*W,(i//cols)*H))
    except: pass
sh.save(out)
