"""Render captioned diagram films; no presenter synthesis, voice or claimed telemetry."""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import subprocess,json,math,textwrap
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'assets/media';OUT.mkdir(exist_ok=True)
BOLD='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
REG='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
MONO='/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf'
def f(size,bold=False,mono=False):return ImageFont.truetype(MONO if mono else BOLD if bold else REG,size)
def wrapped(draw,text,xy,width,font,color,spacing=8):
 words=text.split();lines=[];line=''
 for word in words:
  trial=(line+' '+word).strip()
  if draw.textlength(trial,font=font)>width and line:lines.append(line);line=word
  else:line=trial
 if line:lines.append(line)
 x,y=xy
 for line in lines:draw.text((x,y),line,font=font,fill=color);y+=font.size+spacing
 return y
projects=json.loads((ROOT/'content/videos.json').read_text())
for v in projects:
 fps=6;dur=v['duration'];scenes=v['scenes'];step=dur/len(scenes)
 cmd=['ffmpeg','-hide_banner','-loglevel','error','-y','-f','rawvideo','-pix_fmt','rgb24','-s','1280x720','-r',str(fps),'-i','-','-vf','fps=24','-c:v','libx264','-preset','fast','-crf','23','-pix_fmt','yuv420p','-movflags','+faststart',str(OUT/(v['id']+'.mp4'))]
 proc=subprocess.Popen(cmd,stdin=subprocess.PIPE)
 for i in range(dur*fps):
  t=i/fps;idx=min(len(scenes)-1,int(t/step));scene=scenes[idx];im=Image.new('RGB',(1280,720),'#080d13');d=ImageDraw.Draw(im)
  for gx in range(0,1280,48):d.line((gx,0,gx,720),fill='#101c25')
  for gy in range(0,720,48):d.line((0,gy,1280,gy),fill='#101c25')
  d.text((60,35),'RITESH MAMIDI  /  BUILD NOTES',font=f(16,mono=True),fill='#79edc5')
  d.text((60,79),v['title'],font=f(34,True),fill='#f2f1eb')
  d.text((60,132),'ILLUSTRATIVE WORKFLOW · NOT LIVE TELEMETRY',font=f(13,mono=True),fill='#94abae')
  x0=60;w=238;y=210;h=105
  for j,node in enumerate(v['nodes']):
   x=x0+j*302;active=j==int(t*0.65)%4;d.rounded_rectangle((x,y,x+w,y+h),radius=18,fill='#15352e' if active else '#111d27',outline='#79edc5' if active else '#38515a',width=2)
   d.text((x+18,y+20),f'0{j+1}',font=f(14,mono=True),fill='#89bda9');d.text((x+18,y+50),node,font=f(25,True),fill='#e6f1ec')
   if j<3:
    d.line((x+w+4,y+53,x+298,y+53),fill='#385c52',width=2)
    phase=(t*.8-j*.2)%1;px=x+w+4+phase*56;d.ellipse((px-5,y+48,px+5,y+58),fill='#79edc5')
  wrapped(d,scene['detail'],(60,350),1150,f(21), '#79edc5')
  d.rounded_rectangle((45,427,1235,625),radius=20,fill='#0d1822',outline='#2e424d')
  wrapped(d,scene['text'],(70,455),1130,f(27), '#f1f3ee',10)
  d.text((60,654),'riteshmamidi0905-lab.github.io',font=f(16,mono=True),fill='#a7bbbc')
  d.text((1015,654),f'{idx+1:02}/{len(scenes):02}  ·  {int(t):03}s',font=f(14,mono=True),fill='#a7bbbc')
  d.rectangle((60,693,1220,697),fill='#203c35');d.rectangle((60,693,60+1160*t/dur,697),fill='#79edc5')
  if i==0 and v['id'].endswith('teaser'):im.save(OUT/(v['poster']+'-poster.webp'),quality=88)
  proc.stdin.write(im.tobytes())
 proc.stdin.close();assert proc.wait()==0
 def stamp(t):return f'{int(t)//3600:02}:{int(t)//60%60:02}:{int(t)%60:02}.{int(t*1000)%1000:03}'
 text='WEBVTT\n\n'+''.join(f'{j+1}\n{stamp(j*step)} --> {stamp((j+1)*step)}\n{x["text"]}\n\n' for j,x in enumerate(scenes))
 (OUT/(v['id']+'.vtt')).write_text(text)
 print(v['id'],dur,'seconds',flush=True)
