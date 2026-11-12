const {test}=require('node:test'),a=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
test('真实声音点击监听器：禁用按钮无成功音，行动不叠加普通音，减少动画不添特效',()=>{
 const listeners={},map=new Map([['university-four-years-audio-v3',JSON.stringify({sfx:true})]]);let motion=true,reduced=false,added=0;
 const node=()=>({gain:{value:0},connect(){},disconnect(){}});
 const ctx={state:'running',sampleRate:8000,destination:{},resume:()=>Promise.resolve(),createGain:node,createMediaElementSource:node,createBuffer:(c,n)=>({getChannelData:()=>new Float32Array(n)}),createBufferSource:()=>({...node(),start(){},stop(){this.onended?.();}})};
 const context={Audio:class{constructor(){this.paused=true;}play(){this.paused=false;return Promise.resolve();}pause(){this.paused=true;}},AudioContext:class{constructor(){return ctx;}},localStorage:{getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v)},CampusVisual:{getSettings:()=>({motion})},matchMedia:()=>({matches:reduced}),document:{addEventListener:(name,fn)=>listeners[name]=fn},setInterval,clearInterval};context.window=context;vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(__dirname,'../audio.js'),'utf8'),context);
 listeners.pointerdown();const button={disabled:true,dataset:{},offsetWidth:1,getAttribute:()=>null,classList:{contains:()=>false,remove(){},add(){added++;}}};const event={target:{closest:()=>button}};
 listeners.click(event);a.equal(context.CampusAudio.getStatus().voices,0);a.equal(added,0);
 button.disabled=false;button.classList.contains=x=>x==='action';listeners.click(event);a.equal(context.CampusAudio.getStatus().voices,0);
 button.classList.contains=()=>false;listeners.click(event);a.equal(context.CampusAudio.getStatus().voices,1);
 motion=false;added=0;listeners.click(event);a.equal(added,0);motion=true;reduced=true;listeners.click(event);a.equal(added,0);
});
