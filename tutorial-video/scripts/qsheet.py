import subprocess,sys
from PIL import Image
v,out=sys.argv[1],sys.argv[2]; ts=[float(x) for x in sys.argv[3:]]
W,H=(640,360) if 'vert' not in v else (360,640)
cols=3 if W>H else 6
rows=(len(ts)+cols-1)//cols
sh=Image.new('RGB',(W*cols,H*rows))
for i,t in enumerate(ts):
    subprocess.run(['ffmpeg','-v','error','-y','-ss',str(t),'-i',v,'-frames:v','1','-vf',f'scale={W}:{H}','work/_f.png'],check=True)
    sh.paste(Image.open('work/_f.png'),((i%cols)*W,(i//cols)*H))
sh.save(out)
