/* 音频表现层：不读取或写入游戏存档。所有播放失败都在本模块消化。 */
(function(root){
  'use strict';
  const KEY='university-four-years-audio-v3';
  const DEFAULTS={music:false,sfx:false,ambient:false,musicVolume:.35,sfxVolume:.65,ambientVolume:.15,muted:false};
  const TRACKS={campus:'校园午后',library:'书页与阳光',story:'晚风正好',graduation:'未完的夏天'};
  const EFFECTS={click:[440],confirm:[440,554],increase:[523,659],decrease:[440,392],message:[587,740],achievement:[523,659,784],term:[392,523,659],graduation:[523,659,784,1046]};
  function normalize(raw){const result={...DEFAULTS};for(const k of Object.keys(result)){if(typeof result[k]==='boolean'&&typeof raw?.[k]==='boolean')result[k]=raw[k];else if(typeof result[k]==='number'&&typeof raw?.[k]==='number'&&Number.isFinite(raw[k]))result[k]=Math.max(0,Math.min(1,raw[k]));}return result;}
  function createController(options={}){
    let settings=normalize(null),storage=options.storage;
    try{settings=normalize(JSON.parse(storage?.getItem(KEY)));}catch{/* 默认静音。 */}
    const makeAudio=options.makeAudio||(()=>new root.Audio());
    const makeContext=options.makeContext||(()=>new (root.AudioContext||root.webkitAudioContext)());
    const mediaGraph=options.mediaGraph!==false&&root.location?.protocol!=='file:';
    const tick=options.setInterval||setInterval,untick=options.clearInterval||clearInterval,now=options.now||(()=>Date.now());
    const decks=[makeAudio(),makeAudio()];decks.forEach(d=>{d.loop=true;d.preload='none';d.volume=0;});
    const gains=[0,0],nodes=[],sources=[],buffers=new Map(),voices=new Set(),heard=new Set();
    let ctx=null,contextTried=false,wind=null,windGain=null,desired='campus',active=-1,sequence=0,fadeTimer=null,loading=false,unlocked=false,hidden=false,status='声音默认关闭，可在声音设置中开启。',listener=null;
    const failed=new Set();
    function notify(message){if(message)status=message;try{listener?.(getStatus());}catch{}}
    function volumes(){for(let i=0;i<2;i++){const v=settings.music&&!settings.muted&&!hidden?gains[i]*settings.musicVolume:0;try{if(nodes[i]){nodes[i].gain.value=v;decks[i].volume=1;}else decks[i].volume=v;}catch{}}if(windGain)windGain.gain.value=settings.ambient&&!settings.muted&&!hidden&&unlocked?settings.ambientVolume*.045:0;}
    function cancelFade(){if(fadeTimer!==null){untick(fadeTimer);fadeTimer=null;}}
    function stopVoices(){for(const v of voices)try{v.stop();}catch{}voices.clear();}
    function stopMusic(){sequence++;loading=false;cancelFade();decks.forEach(d=>{try{d.pause();}catch{}});gains.fill(0);volumes();}
    function ensureContext(){
      if(contextTried)return;contextTried=true;
      try{ctx=makeContext();
        for(let i=0;i<2;i++)if(mediaGraph&&ctx.createMediaElementSource){sources[i]=ctx.createMediaElementSource(decks[i]);nodes[i]=ctx.createGain();sources[i].connect(nodes[i]);nodes[i].connect(ctx.destination);}
        ctx.onstatechange=()=>{if(ctx.state==='interrupted'){unlocked=false;stopMusic();stopVoices();notify('系统中断了声音，轻触按钮后可继续。');}};
      }catch{ctx=null;notify('浏览器音频能力受限，音乐使用基础播放模式。');}
    }
    function ensureWind(){
      if(!ctx||!settings.ambient)return;if(wind){volumes();return;}
      try{const buffer=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate),a=buffer.getChannelData(0);let value=0,seed=731;
        for(let i=0;i<a.length;i++){seed=(seed*16807)%2147483647;value=.985*value+.015*(seed/2147483647*2-1);a[i]=value;}
        wind=ctx.createBufferSource();wind.buffer=buffer;wind.loop=true;const filter=ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=650;windGain=ctx.createGain();wind.connect(filter);filter.connect(windGain);windGain.connect(ctx.destination);wind.start();volumes();
      }catch{notify('轻风音暂不可用，其他功能不受影响。');}
    }
    async function startTrack(id){
      if(!unlocked||hidden||!settings.music||settings.muted||failed.has(id))return;
      const ticket=++sequence;cancelFade();
      // 快速切换时以更响的旧通道为起点，第三个播放器永远不会创建。
      let old=gains[0]>=gains[1]?0:1;if(active<0)old=-1;
      const existing=decks.findIndex(d=>d.datasetTrack===id);
      const slot=existing>=0?existing:(old===0?1:0);
      if(slot===old&&!decks[slot].paused){
        active=slot;const other=1-slot,began=now(),from=gains[slot],otherFrom=gains[other];
        fadeTimer=tick(()=>{const p=Math.min(1,(now()-began)/1500);gains[slot]=from+(1-from)*p;gains[other]=otherFrom*(1-p);volumes();if(p>=1){cancelFade();decks[other].pause();notify('正在播放《'+TRACKS[id]+'》');}},50);
        notify('正在柔和切换到《'+TRACKS[id]+'》');return;
      }
      if(slot===old)old=-1;
      const incoming=decks[slot];incoming.pause();gains[slot]=0;
      if(incoming.datasetTrack!==id){incoming.src='./assets/audio/bgm/'+id+'.wav';incoming.datasetTrack=id;}
      incoming.playTicket=ticket;loading=true;volumes();
      try{await incoming.play();}catch{if(ticket===sequence){loading=false;failed.add(id);notify('《'+TRACKS[id]+'》加载或播放失败，游戏仍可继续。');}return;}
      if(ticket!==sequence||hidden||settings.muted||!settings.music){if(incoming.playTicket===ticket)incoming.pause();return;}
      loading=false;active=slot;const began=now(),oldGain=old<0?0:gains[old];
      fadeTimer=tick(()=>{const p=Math.min(1,(now()-began)/1500);gains[slot]=p;if(old>=0&&old!==slot)gains[old]=oldGain*(1-p);volumes();
        if(p>=1){cancelFade();for(let i=0;i<2;i++)if(i!==slot){decks[i].pause();gains[i]=0;}notify('正在播放《'+TRACKS[id]+'》');}
      },50);
      notify('正在柔和切换到《'+TRACKS[id]+'》');
    }
    function setScene(scene){const id=scene==='library'?'library':scene==='story'?'story':scene==='graduation'?'graduation':'campus';if(id===desired){if(unlocked&&settings.music&&!hidden&&!settings.muted&&!loading&&decks.every(d=>d.paused))void startTrack(id);return;}desired=id;void startTrack(id);}
    function unlock(){
      unlocked=true;if(settings.muted||hidden)return;
      if(settings.music||settings.sfx||settings.ambient){ensureContext();try{const p=ctx?.resume();p?.catch(()=>notify('请再次轻触声音设置中的启用按钮。'));}catch{}ensureWind();if(!loading&&decks.every(d=>d.paused))void startTrack(desired);}
    }
    function configure(patch){settings=normalize({...settings,...patch});try{storage?.setItem(KEY,JSON.stringify(settings));}catch{notify('声音设置仅在当前页面保留。');}
      if(settings.muted||!settings.music)stopMusic();if(settings.muted||!settings.sfx)stopVoices();volumes();
      if((settings.muted||!settings.ambient)&&wind){try{wind.stop();wind.disconnect();windGain.disconnect();}catch{}wind=null;windGain=null;}
      if(unlocked&&!settings.muted&&(settings.music||settings.sfx||settings.ambient)){ensureContext();ensureWind();if(settings.music&&!loading&&decks.every(d=>d.paused))void startTrack(desired);}
      if(settings.muted)notify('全部声音已静音，重新开启任一声音开关可恢复。');
      else if(!settings.music&&!settings.sfx&&!settings.ambient)notify('声音已关闭；可以按需开启音乐、音效或轻风。');
      else if(!unlocked)notify('声音偏好已保存，轻触启用按钮后播放。');
      else if(!settings.music)notify('背景音乐已关闭，其他声音按设置播放。');
      else notify();
    }
    function effect(name,token){
      if(!EFFECTS[name]||!settings.sfx||settings.muted||hidden||!unlocked||!ctx)return false;
      const key=token?name+':'+token:null;if(key&&heard.has(key))return false;if(key){heard.add(key);if(heard.size>256)heard.delete(heard.values().next().value);}
      try{let buffer=buffers.get(name);if(!buffer){const notes=EFFECTS[name],duration=name==='click'?.075:notes.length*.11+.18;buffer=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*duration),ctx.sampleRate);const a=buffer.getChannelData(0);
          notes.forEach((f,n)=>{const start=Math.floor(n*.09*ctx.sampleRate);for(let i=start;i<a.length;i++){const t=(i-start)/ctx.sampleRate;a[i]+=Math.sin(2*Math.PI*f*t)*(1-Math.exp(-t*180))*Math.exp(-t*19)*.12;}});buffers.set(name,buffer);}
        if(voices.size>=4){const first=voices.values().next().value;first.stop();voices.delete(first);}
        const source=ctx.createBufferSource(),gain=ctx.createGain();source.buffer=buffer;gain.gain.value=settings.sfxVolume*.5;source.connect(gain);gain.connect(ctx.destination);voices.add(source);source.onended=()=>{voices.delete(source);try{source.disconnect();gain.disconnect();}catch{}};source.start();return true;
      }catch{return false;}
    }
    function settlement(actual,token){const values=Object.values(actual);if(values.some(v=>v>0))effect('increase',token);else if(values.some(v=>v<0))effect('decrease',token);}
    function visibility(isHidden){hidden=isHidden;if(hidden){stopMusic();stopVoices();try{ctx?.suspend()?.catch(()=>{});}catch{}notify('页面在后台，声音已暂停。');}else{unlocked=false;notify('轻触任意按钮可恢复已开启的声音。');}}
    function getStatus(){return {settings:{...settings},desired,track:TRACKS[desired],unlocked,hidden,loading,playing:decks.filter(d=>!d.paused).length,voices:voices.size,status};}
    decks.forEach((deck,index)=>deck.addEventListener?.('error',()=>{
      if(!deck.error)return;if(deck.datasetTrack)failed.add(deck.datasetTrack);sequence++;loading=false;cancelFade();deck.pause();gains[index]=0;
      const other=1-index;if(!decks[other].paused){active=other;gains[other]=1;}else active=-1;
      volumes();notify('音频资源暂时无法加载，其他游戏功能不受影响。');
    }));
    return {configure,unlock,setScene,effect,settlement,visibility,getStatus,onStatus:fn=>{listener=fn;},retry:()=>{failed.clear();unlock();if(active>=0&&decks[active].datasetTrack!==desired)void startTrack(desired);},resetDefaults:()=>configure({...DEFAULTS}),mute:()=>configure({muted:true}),newRun:()=>heard.clear()};
  }
  const api={KEY,DEFAULTS,TRACKS,EFFECTS,normalize,createController};
  if(typeof module!=='undefined'&&module.exports){module.exports=api;return;}
  let storage;try{storage=root.localStorage;}catch{}
  const player=createController({storage});root.CampusAudio=player;
  document.addEventListener('pointerdown',()=>{const s=player.getStatus().settings;if(!s.muted&&(s.music||s.sfx||s.ambient))player.unlock();},{passive:true});
  document.addEventListener('visibilitychange',()=>player.visibility(document.hidden));
  root.addEventListener?.('pagehide',()=>player.visibility(true));
  root.addEventListener?.('pageshow',event=>{if(event.persisted)player.visibility(document.hidden);});
  document.addEventListener('click',event=>{
    const button=event.target.closest?.('button,[role="button"]');if(!button||button.disabled||button.getAttribute('aria-disabled')==='true')return;
    if(!button.classList.contains('action')&&!button.classList.contains('choice')&&!button.dataset.silent)player.effect('click');
    const reduced=!root.CampusVisual?.getSettings().motion||root.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if(!reduced){button.classList.remove('tap-glow');void button.offsetWidth;button.classList.add('tap-glow');}
  });
})(typeof window!=='undefined'?window:globalThis);
