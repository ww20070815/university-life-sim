const {test}=require('node:test'),a=require('node:assert/strict');
const R=require('../relationships.js'),P=require('../phone.js'),D=require('../phone-data.js'),N=require('../npc-data.js'),g=require('../game.js');
function setup(s=g.freshState(),raw){const map=new Map([[R.CORE_KEY,JSON.stringify(s)]]);if(raw)map.set(R.KEY,raw);const storage={map,getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};return {s,storage,store:R.createStore(storage,s)};}
function commit(f){f.store.commitCore(f.s,()=>f.storage.setItem(R.CORE_KEY,JSON.stringify(f.s)));}
function step(f,action='rest',event=null,choice=0){a.ok(g.takeAction(f.s,action,()=>.2));if(event)f.s.pendingEvent=event;commit(f);a.ok(g.chooseOption(f.s,choice));commit(f);if(f.s.phase==='summary'){a.ok(g.continueTerm(f.s));commit(f);}}
const command=(f,cmd)=>f.store.phoneCommand(f.s,cmd);
test('六人各有独立问候、两组三方向、36 个不同标记及24条分学期动态',()=>{
  a.equal(N.NPCS.length,6);for(const n of N.NPCS){a.ok(D.greeting[n.id].length>20);const ts=D.threads.filter(t=>t.npc===n.id);a.equal(ts.length,2);for(const t of ts){a.equal(t.options.length,3);a.ok(t.options.every(o=>o.answer&&o.label&&o.flag));}a.equal(D.feed.filter(f=>f.npc===n.id).length,4);a.equal(n.portrait,null);}
  a.equal(new Set(D.threads.flatMap(t=>t.options.map(o=>o.flag))).size,36);a.equal(D.feed.length,24);a.equal(D.types.length,6);a.equal(D.categories.length,6);
});
test('旧 V3.1 无 phone 安全只读初始化，原关系与核心不变，不立即写入扩展',()=>{
  const s=g.freshState(),old=R.fresh('legacy-phone');R.interact(old,s,'zhixia',1);const raw=JSON.stringify({schema:1,anchor:JSON.stringify(s),nextAnchor:null,data:old});
  const f=setup(s,raw);a.equal(f.storage.getItem(R.KEY),raw);a.equal(f.storage.getItem(R.CORE_KEY),JSON.stringify(s));a.deepEqual(f.store.data.npcs,old.npcs);a.equal(f.store.data.phone.runId,old.runId);a.ok(R.validate(f.store.data));
  const before=JSON.stringify(f.store.data);P.unread(f.store.data);P.messagesFor(f.store.data,'zhixia');a.equal(JSON.stringify(f.store.data),before);a.equal(f.storage.getItem(R.KEY),raw);
});
test('未认识人物锁定，首次相识只触发一份问候和通知，互动消息幂等',()=>{
  const f=setup();a.equal(command(f,{type:'read',kind:'chat',id:'zhixia'}).ok,false);a.equal(command(f,{type:'reply',id:'zhixia-plan',choice:1}).ok,false);
  a.ok(f.store.perform(f.s,'zhixia',0).ok);for(let i=0;i<20;i++)P.reconcile(f.store.data,f.s);
  a.equal(f.store.data.phone.messages.filter(m=>m.id==='greet:zhixia').length,1);a.equal(f.store.data.phone.notifications.filter(n=>n.id==='met:zhixia').length,1);a.equal(f.store.data.phone.messages.filter(m=>m.id==='talk:0').length,1);a.ok(R.validate(f.store.data));
});
test('普通回复不占用回合或关系预算，选择、后续消息和标记持久保存',()=>{
  const f=setup(),before=JSON.stringify(f.s),relation=JSON.stringify(f.store.data.npcs);
  a.ok(command(f,{type:'reply',id:'chengle-dinner',choice:1}).ok);a.equal(JSON.stringify(f.s),before);a.equal(JSON.stringify(f.store.data.npcs),relation);a.deepEqual(f.store.data.claimedTurns,[]);
  const p=f.store.data.phone;a.equal(p.replies['chengle-dinner'].choice,1);a.ok(p.flags.includes('chengle-try'));a.ok(P.messagesFor(f.store.data,'chengle').some(m=>m.side==='player'&&m.text.includes('小份')));
  a.ok(P.messagesFor(f.store.data,'chengle').some(m=>m.id==='answer:chengle-dinner'));a.ok(R.validate(f.store.data));
  const again=R.createStore(f.storage,f.s);a.deepEqual(again.data.phone,p);for(let i=0;i<50;i++)a.equal(again.phoneCommand(f.s,{type:'reply',id:'chengle-dinner',choice:0}).ok,false);
});
test('关系回复调用同一V3.1结算，六人共享次数，反方向也不能重复领奖',()=>{
  const f=setup(),raw=f.storage.getItem(R.CORE_KEY);const r=command(f,{type:'reply',id:'chengle-dinner',choice:0});a.ok(r.ok);a.equal(r.delta,4);a.equal(f.store.data.npcs.chengle.value,32);a.deepEqual(f.store.data.claimedTurns,[0]);
  for(const n of N.NPCS)a.equal(f.store.perform(f.s,n.id,0).ok,false);a.equal(f.storage.getItem(R.CORE_KEY),raw);a.ok(R.validate(f.store.data));
  const other=setup();a.ok(other.store.perform(other.s,'chengle',1).ok);a.equal(command(other,{type:'reply',id:'chengle-dinner',choice:0}).ok,false);a.ok(command(other,{type:'reply',id:'chengle-dinner',choice:2}).ok);
});
test('事件与总结不许关系回复，但普通回复仍免费，毕业可回看',()=>{
  for(const phase of ['event','summary','ending']){
    const f=setup();if(phase==='event'){g.takeAction(f.s,'rest',()=>.2);commit(f);}else{while(f.s.turn<(phase==='summary'?4:32))step(f);if(phase==='summary')f.s.phase='summary';commit(f);}
    a.equal(command(f,{type:'reply',id:'chengle-dinner',choice:0}).ok,false);a.ok(command(f,{type:'reply',id:'chengle-dinner',choice:1}).ok);a.deepEqual(f.store.data.claimedTurns,[]);
  }
});
test('六人两组聊天和三种回复分支均可真实解锁，合作前置不能绕过',()=>{
  for(const npc of N.NPCS)for(let choice=0;choice<3;choice++){
    const f=setup();if(!f.store.data.npcs[npc.id].met){a.ok(f.store.perform(f.s,npc.id,0).ok);step(f,npc.cooperate);}
    const [first,second]=D.threads.filter(t=>t.npc===npc.id);
    if(!f.store.data.claimedTurns.includes(f.s.turn)){}else step(f,npc.cooperate);
    a.ok(command(f,{type:'reply',id:first.id,choice}).ok);
    while(P.termOf(f.s)<(second.when.minTerm||1)||(f.s.counts[second.when.action]||0)<(second.when.count||0))step(f,second.when.action||'rest');
    if(f.store.data.claimedTurns.includes(f.s.turn))step(f,'rest');
    a.ok(command(f,{type:'reply',id:second.id,choice}).ok,npc.name+' '+choice);a.ok(R.validate(f.store.data));a.equal(f.store.data.phone.replies[second.id].choice,choice);
  }
});
test('动态按真实学期解锁，大一不显示毕业，已读不产生属性或关系收益',()=>{
  const f=setup(),raw=JSON.stringify(f.s);a.equal(D.feed.filter(x=>x.minTerm<=P.termOf(f.s)).length,6);a.equal(command(f,{type:'read',kind:'feed',id:'feed-24'}).ok,false);
  for(let i=0;i<30;i++)a.ok(command(f,{type:'read',kind:'feed',id:'feed-1'}).ok);a.deepEqual(f.store.data.phone.feedRead,['feed-1']);a.equal(JSON.stringify(f.s),raw);a.deepEqual(f.store.data.claimedTurns,[]);
  while(f.s.turn<28)step(f);a.equal(D.feed.filter(x=>x.minTerm<=P.termOf(f.s)).length,24);a.ok(command(f,{type:'read',kind:'feed',id:'feed-24'}).ok);
});
test('通知六分类由真实行为生成，唯一ID不重复，筛选/详情元数据与已读可恢复',()=>{
  const f=setup();step(f,'study','club',0);while(f.s.turn<8)step(f,'skill');step(f,'skill','contest',0);while(f.s.turn<24)step(f,'rest');
  const notices=f.store.data.phone.notifications,ids=notices.map(n=>n.id);a.equal(new Set(ids).size,ids.length);a.deepEqual(new Set(notices.map(n=>P.notice(n.id,f.store.data).category)),new Set(D.categories));
  const n=notices.find(n=>n.id.startsWith('campus:contest:'));a.ok(n);a.equal(P.notice(n.id,f.store.data).target.page,'tasks');a.ok(command(f,{type:'read',kind:'notice',id:n.id}).ok);
  const reloaded=R.createStore(f.storage,f.s);a.equal(reloaded.data.phone.notifications.find(x=>x.id===n.id).read,true);const len=reloaded.data.phone.notifications.length;for(let i=0;i<20;i++)P.reconcile(reloaded.data,f.s);a.equal(reloaded.data.phone.notifications.length,len);
});
test('学期总结确认前不发下一学期通知，确认后仅一次，并正确跨学年',()=>{
  const f=setup();for(let i=0;i<3;i++)step(f);g.takeAction(f.s,'rest',()=>.2);commit(f);g.chooseOption(f.s,0);commit(f);
  a.equal(f.s.phase,'summary');a.equal(P.termOf(f.s),1);a.ok(!f.store.data.phone.notifications.some(n=>n.id==='term:start:2'||n.id==='term:done:1'));
  g.continueTerm(f.s);commit(f);a.ok(f.store.data.phone.notifications.some(n=>n.id==='term:start:2'));a.ok(f.store.data.phone.notifications.some(n=>n.id==='term:done:1'));
  while(f.s.turn<8)step(f);a.equal(P.termOf(f.s),3);a.equal(f.store.data.phone.notifications.filter(n=>n.id==='year:2').length,1);
});
test('任务进度只来自行动/事件/关系/回复，查看与刷新不推进，比赛观摩不冒充参赛',()=>{
  const f=setup(),initial=structuredClone(f.store.data.phone.tasks);for(let i=0;i<20;i++){f.store.refreshPhone(f.s);P.reconcile(f.store.data,f.s);}a.deepEqual(f.store.data.phone.tasks,initial);
  step(f,'study');a.equal(f.store.data.phone.tasks['study-plan'].progress,1);a.equal(f.store.data.phone.tasks['daily-rest'].progress,0);
  while(f.s.turn<8)step(f,'skill');step(f,'skill','contest',1);a.equal(f.store.data.phone.tasks['contest-play'].progress,0);step(f,'skill','contest',0);a.equal(f.store.data.phone.tasks['contest-play'].status,'complete');
  const before=JSON.stringify(f.s),tasks=JSON.stringify(f.store.data.phone.tasks);const again=R.createStore(f.storage,f.s);a.equal(JSON.stringify(again.data.phone.tasks),tasks);a.equal(JSON.stringify(f.s),before);
});
test('新游戏换runId重置手机与关系，角色设置不参与手机状态',()=>{
  const f=setup();command(f,{type:'reply',id:'chengle-dinner',choice:1});const previous=f.store.data.runId;step(f);f.s=g.freshState();f.store.reset(f.s);commit(f);
  a.notEqual(f.store.data.runId,previous);a.equal(f.store.data.phone.runId,f.store.data.runId);a.deepEqual(f.store.data.phone.replies,{});a.deepEqual(f.store.data.phone.feedRead,[]);a.deepEqual(f.store.data.claimedTurns,[]);a.equal(f.store.data.npcs.chengle.value,28);a.ok(R.validate(f.store.data));
});
test('两个页面聊天/已读共用扩展，后打开者合并先前选择，旧页无法覆盖新局',()=>{
  const f=setup(),second=R.createStore(f.storage,f.s);a.ok(command(f,{type:'reply',id:'chengle-dinner',choice:0}).ok);a.equal(second.phoneCommand(f.s,{type:'reply',id:'chengle-dinner',choice:1}).ok,false);
  a.ok(second.phoneCommand(f.s,{type:'read',kind:'feed',id:'feed-1'}).ok);const third=R.createStore(f.storage,f.s);a.equal(third.data.phone.replies['chengle-dinner'].choice,0);a.deepEqual(third.data.phone.feedRead,['feed-1']);
  f.store.reset(f.s);commit(f);const raw=f.storage.getItem(R.KEY);a.equal(second.phoneCommand(f.s,{type:'read',kind:'feed',id:'feed-2'}).ok,false);a.equal(f.storage.getItem(R.KEY),raw);
});
test('核心写入失败不触发未来手机记录；最后扩展失败后刷新可幂等补齐',()=>{
  for(const failCore of [true,false]){
    const f=setup(),old=structuredClone(f.s),oldPhone=structuredClone(f.store.data.phone);command(f,{type:'read',kind:'chat',id:'chengle'});
    g.takeAction(f.s,'study',()=>.2);
    if(failCore){a.throws(()=>f.store.commitCore(f.s,()=>{throw Error('core quota');}));const loaded=R.createStore(f.storage,old);a.ok(!loaded.data.phone.notifications.some(n=>n.id==='action:study'));a.equal(loaded.data.phone.messages.length,oldPhone.messages.length);}
    else{const write=f.storage.setItem;let count=0;f.storage.setItem=(k,v)=>{if(k===R.KEY&&++count===2)throw Error('extension quota');write(k,v);};commit(f);const loaded=R.createStore(f.storage,f.s);a.equal(loaded.mode,'bound');a.equal(loaded.data.phone.notifications.filter(n=>n.id==='action:study').length,1);a.ok(R.validate(loaded.data));}
  }
});
test('坏手机结构、跨局runId、重复ID、伪造关系回复和未来动态隔离保留原文',()=>{
  const base=setup();command(base,{type:'reply',id:'chengle-dinner',choice:1});const envelope=JSON.parse(base.storage.getItem(R.KEY));
  const mutators=[e=>e.data.phone.schemaVersion=99,e=>e.data.phone.runId='another-run',e=>e.data.phone.messages.push(e.data.phone.messages[0]),e=>e.data.phone.replies['chengle-dinner'].choice=0,e=>e.data.phone.feedRead=['feed-24'],e=>e.data.phone.tasks['study-plan'].progress=99,e=>e.data.phone.messages[0].turn=33,e=>e.data.phone.flags=[]];
  for(const mutate of mutators){const e=structuredClone(envelope);mutate(e);const raw=JSON.stringify(e),f=setup(base.s,raw);a.equal(f.store.mode,'corrupt');a.equal(f.storage.getItem(R.KEY),raw);a.equal(command(f,{type:'read',kind:'chat',id:'chengle'}).ok,false);a.equal(f.storage.getItem(R.CORE_KEY),JSON.stringify(base.s));}
});
test('存储禁用和额度不足时本页可用，回复仍防重，既有存档不被删除',()=>{
  const s=g.freshState(),denied={getItem(){throw Error('denied');},setItem(){throw Error('quota');}},store=R.createStore(denied,s);
  a.ok(store.phoneCommand(s,{type:'reply',id:'chengle-dinner',choice:1}).ok);a.equal(store.phoneCommand(s,{type:'reply',id:'chengle-dinner',choice:1}).ok,false);a.equal(store.persistent,false);
  const f=setup();f.storage.setItem=()=>{throw Error('quota');};a.ok(command(f,{type:'reply',id:'chengle-dinner',choice:0}).ok);a.equal(f.store.persistent,false);a.deepEqual(f.store.data.claimedTurns,[0]);a.ok(f.storage.getItem(R.CORE_KEY));
});
test('32回合带聊天完整通关：核心逐步等于原版、毕业任务完成、刷新不重复消息',()=>{
  const f=setup(),old=g.freshState();command(f,{type:'reply',id:'chengle-dinner',choice:1});
  while(f.s.phase!=='ending'){
    g.takeAction(old,'rest',()=>.2);g.chooseOption(old,0);if(old.phase==='summary')g.continueTerm(old);step(f);a.deepEqual(f.s,old);const reloaded=R.createStore(f.storage,f.s);a.equal(reloaded.mode,'bound');a.deepEqual(reloaded.data.phone,f.store.data.phone);f.store=reloaded;
  }
  a.equal(f.s.turn,32);a.equal(f.s.summaries.length,8);a.equal(g.judgeEnding(f.s).id,g.judgeEnding(old).id);a.equal(f.store.data.phone.tasks['term-graduate'].status,'complete');a.ok(R.validate(f.store.data));
});

test('读取失败但写入可用时，仅允许本页体验，不能覆盖无法读取的旧手机记录',()=>{
  for(const failedKey of [R.CORE_KEY,R.KEY]){
    const f=setup();command(f,{type:'reply',id:'chengle-dinner',choice:1});const original=f.storage.getItem(R.KEY),core=f.storage.getItem(R.CORE_KEY);
    const fragile={...f.storage,getItem(k){if(k===failedKey)throw Error('temporary read failure');return f.storage.getItem(k);}};
    const page=R.createStore(fragile,f.s);a.ok(page.phoneCommand(f.s,{type:'reply',id:'chengle-dinner',choice:2}).ok);
    a.equal(f.storage.getItem(R.KEY),original);a.equal(f.storage.getItem(R.CORE_KEY),core);a.equal(page.persistent,false);
    a.equal(page.phoneCommand(f.s,{type:'reply',id:'chengle-dinner',choice:2}).ok,false);
    const moved=structuredClone(f.s);g.takeAction(moved,'rest',()=>.2);let wroteCore=false;
    a.throws(()=>page.commitCore(moved,()=>{wroteCore=true;f.storage.setItem(R.CORE_KEY,JSON.stringify(moved));}));a.equal(wroteCore,false);a.equal(f.storage.getItem(R.CORE_KEY),core);
  }
});
test('已加载页面后来读扩展失败时，不覆盖其他页面刚保存的选择；恢复读取后采用最新档',()=>{
  const f=setup(),page=R.createStore(f.storage,f.s);command(f,{type:'reply',id:'chengle-dinner',choice:1});const original=f.storage.getItem(R.KEY),read=f.storage.getItem;
  f.storage.getItem=k=>{if(k===R.KEY)throw Error('read unavailable');return read(k);};a.ok(page.phoneCommand(f.s,{type:'reply',id:'chengle-dinner',choice:2}).ok);a.equal(read(R.KEY),original);a.equal(page.persistent,false);
  f.storage.getItem=read;a.ok(page.refreshPhone(f.s));a.equal(page.data.phone.replies['chengle-dinner'].choice,1);a.equal(read(R.KEY),original);
});
test('八学期逐步解锁6/12/18/24条动态，毕业后所有已读和普通回复保持可恢复',()=>{
  const f=setup(),expected=[6,6,12,12,18,18,18,24];
  while(f.s.phase!=='ending'){
    a.equal(D.feed.filter(x=>x.minTerm<=P.termOf(f.s)).length,expected[P.termOf(f.s)-1]);step(f);
  }
  for(const feed of D.feed)a.ok(command(f,{type:'read',kind:'feed',id:feed.id}).ok);
  for(const n of [...f.store.data.phone.notifications])a.ok(command(f,{type:'read',kind:'notice',id:n.id}).ok);
  command(f,{type:'reply',id:'chengle-dinner',choice:1});const saved=R.createStore(f.storage,f.s);a.deepEqual(saved.data.phone,f.store.data.phone);a.equal(saved.data.phone.feedRead.length,24);a.ok(saved.data.phone.notifications.every(n=>n.read));
});
