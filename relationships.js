/* 纯关系逻辑 + 独立扩展存储。没有任何函数修改核心属性或 turn。 */
(function(root){
  'use strict';
  const data=typeof module!=='undefined'&&module.exports?require('./npc-data.js'):root.NPCData;
  const phone=typeof module!=='undefined'&&module.exports?require('./phone.js'):root.CampusPhone;
  const story=typeof module!=='undefined'&&module.exports?require('./story.js'):root.CampusStory;
  const phoneData=typeof module!=='undefined'&&module.exports?require('./phone-data.js'):root.PhoneData;
  const campus=typeof module!=='undefined'&&module.exports?require('./campus.js'):root.CampusWorld;
  const KEY='university-four-years-v3',CORE_KEY='university-four-years-v1';
  const clone=x=>JSON.parse(JSON.stringify(x));
  const stage=value=>value<20?'陌生':value<40?'认识':value<60?'朋友':value<80?'亲密好友':'深厚羁绊';
  // 用完整规范化核心快照绑定，而非会碰撞的短哈希；核心本身不添加字段。
  const signature=core=>JSON.stringify(core);
  function fresh(runId){return {version:1,runId:runId||('run-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2)),npcs:Object.fromEntries(data.NPCS.map(n=>[n.id,{met:n.met,value:n.initial,stories:n.met?[n.id+':intro']:[],choices:[],romance:'none',ending:'unwritten'}])),interactions:[],claimedTurns:[]};}
  function validate(raw){
    try{
      if(!raw||raw.version!==1||typeof raw.runId!=='string'||raw.runId.length<4||raw.runId.length>100)return null;
      if(!raw.npcs||Object.keys(raw.npcs).length!==6||!Array.isArray(raw.interactions)||raw.interactions.length>32||!Array.isArray(raw.claimedTurns)||raw.claimedTurns.length>32)return null;
      if(new Set(raw.claimedTurns).size!==raw.claimedTurns.length||!raw.claimedTurns.every(t=>Number.isInteger(t)&&t>=0&&t<32))return null;
      if(!raw.claimedTurns.every((t,i)=>i===0||t>raw.claimedTurns[i-1]))return null;
      if(!raw.interactions.every((x,i)=>x&&x.turn===raw.claimedTurns[i]&&data.byId(x.npc)&&Number.isInteger(x.choice)&&x.choice>=0&&x.choice<=2&&Number.isInteger(x.delta)&&x.delta>=0&&x.delta<=6))return null;
      if(raw.interactions.length!==raw.claimedTurns.length)return null;
      for(const n of data.NPCS){
        const p=raw.npcs[n.id];
        if(!p||typeof p.met!=='boolean'||!Number.isInteger(p.value)||p.value<0||p.value>100||p.romance!=='none'||p.ending!=='unwritten')return null;
        if(!Array.isArray(p.stories)||p.stories.length>1||!p.stories.every(s=>s===n.id+':intro')||!Array.isArray(p.choices)||p.choices.length>32)return null;
        const interactions=raw.interactions.filter(x=>x.npc===n.id);
        if(JSON.stringify(p.choices)!==JSON.stringify(interactions.map(x=>({turn:x.turn,choice:x.choice}))))return null;
        if(p.met!==(n.met||interactions.length>0)||p.stories.length!==(p.met?1:0))return null;
        let expected=n.initial;for(const x of interactions){const delta=Math.min(100-expected,[4,5,6][x.choice]);if(x.delta!==delta)return null;expected+=delta;}
        if(p.value!==expected)return null;
      }
      if(raw.story!==undefined&&(!story||!story.validate(raw.story,raw)))return null;
      if(raw.campus!==undefined&&(!campus||!campus.validate(raw.campus,raw)))return null;
      if(raw.phone!==undefined&&(!phone||!phone.validate(raw.phone,raw)))return null;
      const consumers=[...Object.values(raw.story?.completed||{}).filter(r=>r.rewarded).map(r=>r.turn),...Object.entries(raw.phone?.replies||{}).filter(([id,r])=>phoneData?.thread(id)?.options[r.choice]?.relationChoice!==undefined).map(([,r])=>r.turn)];
      if(new Set(consumers).size!==consumers.length)return null;
      return clone(raw);
    }catch{return null;}
  }
  function canInteract(ext,core,id,choice=0){
    const n=data.byId(id);
    if(!n||!Number.isInteger(choice)||choice<0||choice>2)return {ok:false,reason:'没有这个互动选项。'};
    if(core.turn>=32||core.phase==='ending')return {ok:false,reason:'大学旅程已结束，可以回看人物档案与经历。'};
    if(core.phase!=='action')return {ok:false,reason:'请先处理当前事件或学期总结，再来聊聊。'};
    if(ext.claimedTurns.includes(core.turn))return {ok:false,reason:'这一回合已经认真交流过了。完成主要行动后，下回合再来。'};
    if(choice===2&&!(core.counts[n.cooperate]>0))return {ok:false,reason:'先体验一次相关主要行动，再带着自己的经历来合作。'};
    return {ok:true};
  }
  function interact(ext,core,id,choice){
    const check=canInteract(ext,core,id,choice);if(!check.ok)return check;
    const n=data.byId(id),p=ext.npcs[id],before=p.value,newMet=!p.met;
    const delta=Math.min(100-before,choice===2?6:choice===1?5:4);
    p.value+=delta;p.met=true;if(!p.stories.length)p.stories.push(id+':intro');
    p.choices.push({turn:core.turn,choice});ext.claimedTurns.push(core.turn);ext.interactions.push({turn:core.turn,npc:id,choice,delta});
    return {ok:true,delta,newMet,milestone:stage(before)!==stage(p.value),reply:n.replies[choice]};
  }
  function createStore(storage,core){
    let ext=fresh(),anchor=signature(core),mode='legacy',warning='',persistent=true;
    let observedRaw=null,hadCore=false,replacing=false,readUnsafe=false,onChange=()=>{};
    function decode(raw,current){
      try{
        const e=JSON.parse(raw),valid=validate(e.data);
        const lastTurn=Math.min(current.turn-(['summary','ending'].includes(current.phase)?1:0),31);
        if(!valid||valid.claimedTurns.some(t=>t>lastTurn)||valid.story&&!story.compatible(valid,current)||valid.phone&&!phone.compatible(valid,current)||valid.campus&&!campus.compatible(valid,current)||e.schema!==1||typeof e.anchor!=='string'||e.anchor.length>150000||!(e.nextAnchor===null||typeof e.nextAnchor==='string'&&e.nextAnchor.length<=150000))return {mode:'corrupt'};
        if(e.anchor!==signature(current)&&e.nextAnchor!==signature(current))return {mode:'mismatch'};
        return {mode:'bound',data:valid};
      }catch{return {mode:'corrupt'};}
    }
    try{hadCore=storage.getItem(CORE_KEY)!==null;observedRaw=storage.getItem(KEY);}catch{mode='memory';readUnsafe=true;persistent=false;warning='人物与手机记录暂时无法读取，本次互动仅保留在当前页面。';}
    if(observedRaw){
      const decoded=decode(observedRaw,core);mode=decoded.mode;
      if(decoded.data)ext=decoded.data;
      else warning=mode==='mismatch'?'这份人物记录与当前游戏进度不匹配，已隔离，未合并奖励。':'人物扩展数据暂时无法读取，原数据已保留。';
    }
    const blocked=()=>['mismatch','corrupt','conflict'].includes(mode);
    // 旧档无 phone 时仅在内存补齐；初始化和界面渲染不写盘。
    function coordinate(current){campus?.reconcile(ext);story?.reconcile(ext,current);return phone?.reconcile(ext,current);}
    if(!blocked())coordinate(core);
    function changed(kind,result={}){onChange({kind,...result,token:ext.runId+':phone:'+(ext.phone?.triggered.length||0)});}
    function conflict(reason){mode='conflict';warning=reason;return false;}
    // 同一回合的多个页面先读取最新扩展，不能把别的页面刚写入的奖励覆盖掉。
    // 核心进度或局次已变则拒绝旧页面写入；存储被禁用时仍保留本页体验。
    function sync(current){
      if(mode==='conflict')return false;
      let disk;
      try{disk=storage.getItem(CORE_KEY);}catch{readUnsafe=true;persistent=false;return true;}
      if(disk===null&&hadCore)return conflict('存档已在其他页面清除，请刷新后继续。');
      if(disk!==null){
        try{if(signature(JSON.parse(disk))!==signature(current))return conflict('另一个页面的游戏进度发生变化，请刷新后继续。');}
        catch{return conflict('当前核心存档无法读取，已保留原数据，请先备份并刷新。');}
        hadCore=true;
      }
      if(blocked()){readUnsafe=false;return true;} // 启动时隔离的坏扩展不妨碍原游戏继续保存。
      let latest;try{latest=storage.getItem(KEY);}catch{readUnsafe=true;persistent=false;return true;}
      readUnsafe=false;
      if(latest===observedRaw)return true;
      if(latest===null)return conflict('人物记录已在其他页面移除，请刷新后继续。');
      const decoded=decode(latest,current);
      if(!decoded.data)return conflict('人物记录已在其他页面变化或损坏，原数据已保留，请刷新后继续。');
      if(mode==='bound'&&decoded.data.runId!==ext.runId)return conflict('另一个页面已开启新的旅程，请刷新后继续。');
      ext=decoded.data;observedRaw=latest;mode='bound';coordinate(current);return true;
    }
    function persist(nextAnchor=null){
      // 不能把“读取失败”当作“没有旧档”；写权限可用也不覆盖未知记录。
      if(readUnsafe)throw new Error('存档读取暂不可用，保留原数据，仅在本页记录。');
      const raw=JSON.stringify({schema:1,anchor,nextAnchor,data:ext});storage.setItem(KEY,raw);observedRaw=raw;
    }
    function commitCore(nextCore,writeCore){
      if(!replacing&&!sync(JSON.parse(anchor))){const error=new Error(warning);error.code='SAVE_CONFLICT';throw error;}
      if(readUnsafe){persistent=false;const error=new Error('无法确认旧扩展，未覆盖核心与人物手机存档。');error.code='SAVE_UNAVAILABLE';throw error;}
      const next=signature(nextCore);
      // 先记录前后两个可接受锚点，避免核心保存后刷新时误认为串档。
      if(!blocked()){try{persist(next);}catch{persistent=false;}}
      writeCore();anchor=next;hadCore=true;replacing=false;
      // 手机触发必须在核心写入成功之后；若最后扩展写入失败，刷新从核心幂等补回。
      const updates=!blocked()?coordinate(nextCore):null;
      if(!blocked()){try{persist(null);persistent=true;mode='bound';}catch{persistent=false;}}
      changed('core',updates||{});
    }
    function reset(nextCore){ext=fresh();anchor=signature(nextCore);mode='legacy';warning='';persistent=true;replacing=true;readUnsafe=false;}
    function rebuild(current){
      if(!sync(current))return false;
      // 只有明确确认后调用；旧扩展尽量保留一份，不触碰核心游戏键。
      try{const raw=storage.getItem(KEY);if(raw)storage.setItem(KEY+'-previous',raw);}catch{/* 主记录仍保留到下次明确保存。 */}
      reset(current);replacing=false;coordinate(current);try{persist(null);mode='bound';}catch{persistent=false;}changed('reset');return true;
    }
    function perform(current,id,choice){
      if(blocked())return {ok:false,reason:warning+(mode==='conflict'?'':' 如需重新记录，请先确认重建。')};
      if(!sync(current))return {ok:false,reason:warning};
      const result=interact(ext,current,id,choice);
      if(result.ok){anchor=signature(current);const updates=coordinate(current);try{persist(null);persistent=true;mode='bound';}catch{persistent=false;}changed('relationship',updates||{});}
      return result;
    }
    function checkReply(current,id,index){
      if(blocked())return {ok:false,reason:warning};
      if(!phone)return {ok:false,reason:'手机模块未载入。'};
      const check=phone.canReply(ext,current,id,index);
      if(check.ok&&check.relationChoice!==undefined){const relation=canInteract(ext,current,check.npc,check.relationChoice);if(!relation.ok)return relation;}
      return check;
    }
    function refreshPhone(current){
      if(blocked()||!sync(current))return false;coordinate(current);return true;
    }
    function phoneCommand(current,command){
      if(!refreshPhone(current))return {ok:false,reason:warning||'手机记录暂时无法读取。'};
      const before=JSON.stringify(ext);let result;
      if(command.type==='reply'){
        const check=checkReply(current,command.id,command.choice);if(!check.ok)return check;
        let relation=null;if(check.relationChoice!==undefined)relation=interact(ext,current,check.npc,check.relationChoice);
        result=phone.reply(ext,current,command.id,command.choice);if(relation)result.delta=relation.delta;
        coordinate(current);phone.read(ext,current,'chat',check.npc);
      }else if(command.type==='read')result={ok:phone.read(ext,current,command.kind,command.id)};
      else return {ok:false,reason:'未知手机操作。'};
      if(!result.ok)return {ok:false,reason:'这条内容尚未开放。'};
      const updates=coordinate(current);
      if(JSON.stringify(ext)!==before){anchor=signature(current);try{persist(null);persistent=true;mode='bound';}catch{persistent=false;}changed(command.type,updates);}
      return result;
    }
    function storyCommand(current,command){
      if(!story||!refreshPhone(current))return {ok:false,reason:warning||'人物故事暂时无法读取。'};
      let result;
      if(command.type==='start')result=story.start(ext,current,command.id);
      else if(command.type==='defer')result=story.defer(ext,current);
      else if(command.type==='choose'){
        const check=story.canChoose(ext,current,command.id,command.choiceId);if(!check.ok)return check;
        let reward=null;if(command.reward){const available=canInteract(ext,current,check.chapter.characterId,check.choice.rewardIndex);if(!available.ok)return available;reward=interact(ext,current,check.chapter.characterId,check.choice.rewardIndex);}
        result=story.complete(ext,current,command.id,command.choiceId,reward);
      }else return {ok:false,reason:'未知剧情操作。'};
      if(result.ok){anchor=signature(current);const updates=coordinate(current);try{persist(null);persistent=true;mode='bound';}catch{persistent=false;}changed('story',updates||{});}
      return result;
    }
    function campusCommand(current,command){
      if(!campus||!refreshPhone(current))return {ok:false,reason:warning||'校园地图暂时无法读取。'};
      const before=JSON.stringify(ext);let result;
      if(command.type==='visit')result=campus.visit(ext,current,command.id);
      else if(command.type==='start')result=campus.startEvent(ext,current,command.id);
      else if(command.type==='choose')result=campus.choose(ext,current,command.id,command.choiceId);
      else if(command.type==='defer'){ext.campus.activeEvent=null;result={ok:true};}
      else return {ok:false,reason:'未知校园探索操作。'};
      if(result.ok&&JSON.stringify(ext)!==before){anchor=signature(current);const updates=coordinate(current);try{persist(null);persistent=true;mode='bound';}catch{persistent=false;}changed('campus',updates||{});}
      return result;
    }
    function clear(current){reset(current);hadCore=false;replacing=false;try{storage.removeItem(KEY);observedRaw=null;}catch{persistent=false;}}
    return {get data(){return ext;},get mode(){return mode;},get warning(){return warning;},get persistent(){return persistent;},blocked,commitCore,reset,rebuild,perform,clear,checkReply,refreshPhone,phoneCommand,storyCommand,campusCommand,onChange(fn){onChange=fn||(()=>{});}};
  }
  const api={KEY,CORE_KEY,fresh,validate,stage,signature,canInteract,interact,createStore};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.Relationships=api;
})(typeof window!=='undefined'?window:globalThis);
