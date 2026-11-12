"""原创程序作曲：轻柔钢琴式敲击、木吉他式拨弦与淡弦乐。
无采样、无外部旋律或录音。可重复生成项目内四首 PCM WAV。
音色是合成近似，不冒充真实乐器录音。运行游戏不需要 Python/numpy。
"""
from pathlib import Path
import numpy as np
import wave, json

OUT=Path(__file__).resolve().parent.parent/'assets/audio/bgm'
RATE=22050
SCORES={
 'campus':('校园午后',76,[72,76,79,76,74,72,69,67,72,74,76,79,76,74,72,0]),
 'library':('书页与阳光',68,[76,0,74,72,0,69,72,0,74,0,76,79,0,76,74,0]),
 'story':('晚风正好',72,[69,72,76,74,72,0,69,67,69,72,74,76,74,72,69,0]),
 'graduation':('未完的夏天',74,[67,72,76,79,76,74,72,0,69,72,76,81,79,76,72,0])
}
def hz(note):return 440*2**((note-69)/12)
def add_tone(buf,at,note,duration,gain,kind):
    if not note:return
    t=np.arange(int(duration*RATE))/RATE;f=hz(note)
    if kind=='piano':
        env=(1-np.exp(-t*90))*np.exp(-t/1.15)
        signal=sum(a*np.sin(2*np.pi*f*k*t)*np.exp(-t*k*.12) for k,a in [(1,1),(2,.27),(3,.1),(4,.035)])
    elif kind=='guitar':
        env=(1-np.exp(-t*150))*np.exp(-t/.75)
        signal=sum(np.sin(2*np.pi*f*k*t)/k**2.2 for k in range(1,6))
    else:
        env=np.sin(np.pi*np.minimum(t/duration,1))**2
        signal=(np.sin(2*np.pi*f*t)+.14*np.sin(2*np.pi*f*1.0015*t))*.5
    # 尾音环绕叠加，时间轴首尾属于同一个周期，避免硬切。
    values=(signal*env*gain).astype(np.float32)
    indices=(int(at*RATE)+np.arange(len(values)))%len(buf)
    np.add.at(buf,indices,values)

metadata=[]
for key,(name,bpm,melody) in SCORES.items():
    beat=60/bpm;duration=beat*4*16;buf=np.zeros(round(duration*RATE),dtype=np.float32)
    chords=[(48,55,60,64),(45,52,57,60),(53,60,65,69),(55,62,67,71)]
    for bar in range(16):
        chord=chords[bar%4];start=bar*4*beat
        for index,note in enumerate(chord):add_tone(buf,start+index*beat*.5,note+12,2.6,.045,'guitar')
        for note in chord[1:]:add_tone(buf,start,note,4*beat,.019,'strings')
        # 两个原创乐句交替，留出空拍，避免持续密集音符。
        phrase=melody[(bar%8)*2:(bar%8)*2+2]
        for i,note in enumerate(phrase):add_tone(buf,start+(i*2+.15)*beat,note,3.6,.11 if key!='library' else .085,'piano')
    # 固定安全峰值，不做过重低音或响度压缩。首尾用短平滑消除量化阶跃。
    peak=float(np.max(np.abs(buf)));buf*=.48/max(peak,.48)
    n=int(RATE*.025);buf[:n]*=np.linspace(0,1,n);buf[-n:]*=np.linspace(1,0,n)
    target=OUT/(key+'.wav')
    with wave.open(str(target),'wb') as out:
        out.setnchannels(1);out.setsampwidth(2);out.setframerate(RATE);out.writeframes((buf*32767).astype('<i2').tobytes())
    metadata.append({'id':key,'title':name,'bpm':bpm,'seconds':round(duration,2),'bytes':target.stat().st_size,'peak':round(float(np.max(np.abs(buf))),3),'format':'PCM WAV, mono, 22050 Hz, 16-bit'})
    print(name,metadata[-1])
(OUT.parent/'catalog.json').write_text(json.dumps(metadata,ensure_ascii=False,indent=2),encoding='utf-8')
