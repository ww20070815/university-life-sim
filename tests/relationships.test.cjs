const {test}=require('node:test'),a=require('node:assert/strict');
const R=require('../relationships.js'),D=require('../npc-data.js'),g=require('../game.js');
function memory(){const map=new Map();return{map,getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};}
function next(s){a.ok(g.takeAction(s,'study',()=>.2));a.ok(g.chooseOption(s,0));if(s.phase==='summary')g.continueTerm(s);}
test('六位成年虚构人物有独立背景、地点、五章设计和教师排除恋爱',()=>{a.equal(D.NPCS.length,6);a.equal(new Set(D.NPCS.map(n=>n.id)).size,6);for(const n of D.NPCS){a.ok(n.age>=18);a.equal(n.chapters.length,5);a.ok(n.background&&n.direction&&n.places.length);}a.equal(D.byId('teacherzhou').romanceEligible,false);a.equal(R.stage(19),'陌生');a.equal(R.stage(20),'认识');a.equal(R.stage(40),'朋友');a.equal(R.stage(60),'亲密好友');a.equal(R.stage(80),'深厚羁绊');});
test('每回合全体人物合计一次奖励，浏览不消费，主属性与回合不被关系函数修改',()=>{const s=g.freshState(),e=R.fresh('test-run'),before=JSON.stringify(s);a.ok(R.canInteract(e,s,'zhixia',0).ok);a.equal(e.interactions.length,0);a.ok(R.interact(e,s,'zhixia',0).ok);for(const n of D.NPCS)for(let i=0;i<3;i++)a.equal(R.interact(e,s,n.id,i).ok,false);a.equal(e.npcs.zhixia.value,16);a.equal(JSON.stringify(s),before);a.ok(R.validate(e));});
test('合作需已有相关行动；待选事件、学期总结和毕业不可额外刷关系',()=>{const s=g.freshState(),e=R.fresh('test-run');a.equal(R.interact(e,s,'zhixia',2).ok,false);g.takeAction(s,'study',()=>.1);a.equal(R.interact(e,s,'zhixia',0).ok,false);g.chooseOption(s,0);a.ok(R.interact(e,s,'zhixia',2).ok);s.phase='summary';a.equal(R.interact(e,s,'shenyan',0).ok,false);s.phase='ending';s.turn=32;a.equal(R.interact(e,s,'shenyan',0).ok,false);});
test('32 回合高关系路线可达上限但不越界，原八结局与核心进度不受影响',()=>{const s=g.freshState(),baseline=g.freshState(),e=R.fresh('test-run');while(s.phase!=='ending'){if(s.phase==='action'){R.interact(e,s,'zhixia',1);a.ok(R.validate(e));for(const v of Object.values(e.npcs))a.ok(v.value>=0&&v.value<=100);g.takeAction(s,'rest',()=>.2);g.takeAction(baseline,'rest',()=>.2);}else if(s.phase==='event'){g.chooseOption(s,0);g.chooseOption(baseline,0);}else{g.continueTerm(s);g.continueTerm(baseline);}}a.equal(e.npcs.zhixia.value,100);a.equal(e.interactions.length,32);a.deepEqual(s,baseline);a.equal(g.judgeEnding(s).id,g.judgeEnding(baseline).id);});
test('旧档首次读取和关系互动只写扩展；刷新保留选择与预算',()=>{const s=g.freshState(),storage=memory(),raw=JSON.stringify(s);storage.setItem(R.CORE_KEY,raw);const store=R.createStore(storage,s);a.equal(storage.getItem(R.KEY),null);a.ok(store.perform(s,'qinghe',1).ok);a.equal(storage.getItem(R.CORE_KEY),raw);const again=R.createStore(storage,s);a.equal(again.data.npcs.qinghe.value,15);a.equal(again.data.npcs.qinghe.met,true);a.equal(again.perform(s,'chengle',0).ok,false);});
test('核心保存双锚点：事件中断和最后扩展写入失败仍可恢复同一人物记录',()=>{const s=g.freshState(),storage=memory();storage.setItem(R.CORE_KEY,JSON.stringify(s));const store=R.createStore(storage,s);store.perform(s,'shenyan',0);g.takeAction(s,'study',()=>.3);const ordinary=storage.setItem;let writes=0;storage.setItem=(k,v)=>{if(k===R.KEY&&++writes===2)throw Error('quota');ordinary(k,v);};store.commitCore(s,()=>storage.setItem(R.CORE_KEY,JSON.stringify(s)));const again=R.createStore(storage,s);a.equal(again.mode,'bound');a.equal(again.data.npcs.shenyan.value,12);a.equal(s.phase,'event');});
test('不同局/坏数据隔离，重建必须显式调用且保留旧扩展，不清除核心档',()=>{const s=g.freshState(),storage=memory(),store=R.createStore(storage,s);storage.setItem(R.CORE_KEY,JSON.stringify(s));store.perform(s,'nanqiao',0);const old=storage.getItem(R.KEY);next(s);storage.setItem(R.CORE_KEY,JSON.stringify(s));const mismatch=R.createStore(storage,s);a.equal(mismatch.mode,'mismatch');a.equal(mismatch.perform(s,'nanqiao',0).ok,false);a.equal(storage.getItem(R.KEY),old);mismatch.rebuild(s);a.equal(storage.getItem(R.KEY+'-previous'),old);a.equal(mismatch.data.npcs.nanqiao.value,5);storage.setItem(R.KEY,'{bad');a.equal(R.createStore(storage,s).mode,'corrupt');a.equal(storage.getItem(R.KEY),'{bad');a.ok(storage.getItem(R.CORE_KEY));});
test('新游戏明确重置关系与局次，禁止继承上一局互动；存储禁用不崩溃',()=>{const s=g.freshState(),storage=memory(),store=R.createStore(storage,s);storage.setItem(R.CORE_KEY,JSON.stringify(s));store.perform(s,'chengle',1);const id=store.data.runId;store.reset(g.freshState());a.notEqual(store.data.runId,id);a.equal(store.data.interactions.length,0);a.equal(store.data.npcs.chengle.value,28);const denied={getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}};const temporary=R.createStore(denied,s);a.equal(temporary.blocked(),false);a.ok(temporary.perform(s,'zhixia',0).ok);a.equal(temporary.persistent,false);});
test('损坏数值、乱序互动、伪造奖励、未来回合不能加载',()=>{const e=R.fresh('test-run');for(const mutate of [x=>x.npcs.zhixia.value=101,x=>x.npcs.teacherzhou.romance='dating',x=>x.claimedTurns=[50],x=>x.npcs.zhixia.choices=[{}]]){const copy=structuredClone(e);mutate(copy);a.equal(R.validate(copy),null);}const s=g.freshState();R.interact(e,s,'zhixia',0);e.interactions[0].delta=6;e.npcs.zhixia.value=18;a.equal(R.validate(e),null);});

test('两个页面共享同回合交流预算，后点击不能覆盖先前人物记录',()=>{
  const s=g.freshState(),storage=memory();storage.setItem(R.CORE_KEY,JSON.stringify(s));
  const first=R.createStore(storage,s),second=R.createStore(storage,s);
  a.ok(first.perform(s,'zhixia',1).ok);
  a.equal(second.perform(s,'shenyan',0).ok,false);
  const disk=JSON.parse(storage.getItem(R.KEY)).data;
  a.equal(disk.npcs.zhixia.value,17);a.equal(disk.npcs.shenyan.value,8);a.deepEqual(disk.claimedTurns,[0]);
});
test('另一页面保存主要行动时合并最新关系，不抹掉已经领取的交流',()=>{
  const s=g.freshState(),storage=memory();storage.setItem(R.CORE_KEY,JSON.stringify(s));
  const first=R.createStore(storage,s),second=R.createStore(storage,s);
  first.perform(s,'qinghe',1);g.takeAction(s,'study',()=>.1);
  second.commitCore(s,()=>storage.setItem(R.CORE_KEY,JSON.stringify(s)));
  const reloaded=R.createStore(storage,s);a.equal(reloaded.data.npcs.qinghe.value,15);a.deepEqual(reloaded.data.claimedTurns,[0]);
});
test('过期页面不能覆盖另一个页面推进后的核心档或新局扩展',()=>{
  for(const newRun of [false,true]){
    const s=g.freshState(),storage=memory();storage.setItem(R.CORE_KEY,JSON.stringify(s));
    const first=R.createStore(storage,s);first.perform(s,'chengle',0);const stale=R.createStore(storage,s);
    if(newRun)first.reset(s);else g.takeAction(s,'study',()=>.1);
    first.commitCore(s,()=>storage.setItem(R.CORE_KEY,JSON.stringify(s)));
    const coreRaw=storage.getItem(R.CORE_KEY),extRaw=storage.getItem(R.KEY),old=g.freshState();
    g.takeAction(old,'rest',()=>.2);
    a.throws(()=>stale.commitCore(old,()=>storage.setItem(R.CORE_KEY,JSON.stringify(old))));
    a.equal(storage.getItem(R.CORE_KEY),coreRaw);a.equal(storage.getItem(R.KEY),extRaw);
  }
});
test('存档在另一个页面被删除或损坏时，旧页面不重新写回关系',()=>{
  for(const broken of [null,'{broken']){
    const s=g.freshState(),storage=memory();storage.setItem(R.CORE_KEY,JSON.stringify(s));
    const store=R.createStore(storage,s);store.perform(s,'zhixia',0);const raw=storage.getItem(R.KEY);
    if(broken===null)storage.removeItem(R.CORE_KEY);else storage.setItem(R.CORE_KEY,broken);
    a.equal(store.perform(s,'qinghe',1).ok,false);a.equal(storage.getItem(R.KEY),raw);a.equal(storage.getItem(R.CORE_KEY),broken);
  }
});
test('六位人物的三类互动、饱和上限与快速重复点击逐一验证',()=>{
  for(const npc of D.NPCS){
    const s=g.freshState(),e=R.fresh('route-'+npc.id);
    for(let turn=0;turn<32;turn++){
      const choice=turn===0?0:turn===1?1:2;
      const result=R.interact(e,s,npc.id,choice);a.ok(result.ok);
      a.equal(result.delta,Math.min([4,5,6][choice],100-(e.npcs[npc.id].value-result.delta)));
      for(let rapid=0;rapid<30;rapid++)a.equal(R.interact(e,s,npc.id,choice).ok,false);
      a.ok(R.validate(e));a.ok(e.npcs[npc.id].value>=0&&e.npcs[npc.id].value<=100);
      a.ok(g.takeAction(s,turn===0?npc.cooperate:'rest',()=>.1));a.ok(g.chooseOption(s,0));if(s.phase==='summary')g.continueTerm(s);
    }
    a.equal(e.npcs[npc.id].value,100);a.equal(e.interactions.length,32);a.equal(s.turn,32);a.equal(s.phase,'ending');
  }
});
test('32 条混合行动完整路线逐步刷新扩展，事件/总结/毕业恢复不重复奖励',()=>{
  for(let seed=0;seed<32;seed++){
    const s=g.freshState(),baseline=g.freshState(),storage=memory();storage.setItem(R.CORE_KEY,JSON.stringify(s));
    let store=R.createStore(storage,s),step=0;
    while(s.phase!=='ending'){
      if(s.phase==='action'){
        store.perform(s,D.NPCS[(seed+s.turn)%6].id,s.turn%2);
        const actions=g.ACTIONS.filter(x=>!x.effects.money||s.stats.money>=-x.effects.money),action=actions[(seed+step)%actions.length].id,random=()=>((seed*13+step*17)%100)/100;
        g.takeAction(s,action,random);g.takeAction(baseline,action,random);
      }else if(s.phase==='event'){
        const event=g.EVENTS.find(e=>e.id===s.pendingEvent),options=event.options.map((o,i)=>({o,i})).filter(x=>!x.o.effects.money||s.stats.money>=-x.o.effects.money),choice=options[(seed+step)%options.length].i;
        g.chooseOption(s,choice);g.chooseOption(baseline,choice);
      }else{g.continueTerm(s);g.continueTerm(baseline);}
      store.commitCore(s,()=>storage.setItem(R.CORE_KEY,JSON.stringify(s)));const data=structuredClone(store.data);store=R.createStore(storage,s);
      a.equal(store.mode,'bound');a.deepEqual(store.data,data);a.deepEqual(s,baseline);
      if(s.phase!=='action')a.equal(store.perform(s,'chengle',0).ok,false);
      step++;
    }
    a.equal(s.turn,32);a.equal(s.summaries.length,8);a.equal(g.judgeEnding(s).id,g.judgeEnding(baseline).id);
  }
});
test('学期总结中不可能已经领取下一回合奖励，坏扩展隔离且原始数据不被覆盖',()=>{
  const s=g.freshState(),e=R.fresh('bad-summary');for(let i=0;i<4;i++)next(s);
  R.interact(e,s,'zhixia',0);s.phase='summary';
  const storage=memory(),raw=JSON.stringify({schema:1,anchor:JSON.stringify(s),nextAnchor:null,data:e});storage.setItem(R.KEY,raw);
  a.equal(R.createStore(storage,s).mode,'corrupt');a.equal(storage.getItem(R.KEY),raw);
});
test('坏扩展不阻断原游戏保存，过期页面重建也不能覆盖新进度的人物记录',()=>{
  const s=g.freshState(),storage=memory();storage.setItem(R.CORE_KEY,JSON.stringify(s));storage.setItem(R.KEY,'{bad');
  const isolated=R.createStore(storage,s),stale=structuredClone(s);g.takeAction(s,'rest',()=>.2);
  isolated.commitCore(s,()=>storage.setItem(R.CORE_KEY,JSON.stringify(s)));
  a.equal(storage.getItem(R.KEY),'{bad');a.equal(storage.getItem(R.CORE_KEY),JSON.stringify(s));
  const raw=storage.getItem(R.KEY);a.equal(isolated.rebuild(stale),false);a.equal(storage.getItem(R.KEY),raw);
});
test('核心写入中断后刷新仍恢复之前的回合、关系和已经领取的次数',()=>{
  const s=g.freshState(),storage=memory();storage.setItem(R.CORE_KEY,JSON.stringify(s));const before=structuredClone(s),store=R.createStore(storage,s);
  store.perform(s,'nanqiao',1);g.takeAction(s,'rest',()=>.2);
  a.throws(()=>store.commitCore(s,()=>{throw Error('core quota');}));
  const again=R.createStore(storage,before);a.equal(again.mode,'bound');a.equal(again.data.npcs.nanqiao.value,10);a.equal(again.perform(before,'qinghe',0).ok,false);
});
