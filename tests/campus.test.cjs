const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const C=require('../campus.js'),D=require('../campus-data.js'),N=require('../npc-data.js'),R=require('../relationships.js'),S=require('../story.js'),SD=require('../story-data.js'),g=require('../game.js');
function setup(s=g.freshState(),raw){const disk=new Map([[R.CORE_KEY,JSON.stringify(s)]]);if(raw)disk.set(R.KEY,raw);const storage={getItem:k=>disk.get(k)||null,setItem:(k,v)=>disk.set(k,v),removeItem:k=>disk.delete(k)};return {s,disk,storage,store:R.createStore(storage,s)};}
const cmd=(f,c)=>f.store.campusCommand(f.s,c);
function save(f){f.store.commitCore(f.s,()=>f.storage.setItem(R.CORE_KEY,JSON.stringify(f.s)));}
function step(f,id='rest'){a.ok(g.takeAction(f.s,id,()=>.2));save(f);const event=g.EVENTS.find(e=>e.id===f.s.pendingEvent),choice=event.options.findIndex(o=>f.s.stats.money>=-(o.effects.money||0));a.ok(g.chooseOption(f.s,choice));save(f);if(f.s.phase==='summary'){g.continueTerm(f.s);save(f);}}
function ready(){const f=setup();for(let i=0;i<32;i++){const npc=N.NPCS[i%6];if(!f.store.data.npcs[npc.id].met)f.store.perform(f.s,npc.id,0);step(f,['study','skill','skill','study','skill','social','exercise','work'][i%8]);}return f;}
test('十处地点配置完整、动作复用原七种、真实相对背景与原30章关联全部有效',()=>{
 a.equal(D.locations.length,10);a.equal(new Set(D.locations.map(l=>l.id)).size,10);
 for(const l of D.locations){a.ok(l.name&&l.intro.length>30&&l.theme&&l.open);a.match(l.background,/^\.\/assets\//);a.ok(fs.existsSync(path.join(__dirname,'..',l.background)));a.ok(l.actions.length);for(const id of l.actions)a.ok(g.ACTIONS.some(x=>x.id===id));for(const id of l.storyIds)a.ok(SD.byId(id));a.ok(l.wide.every(n=>n>0&&n<100));a.notDeepEqual(l.wide,l.portrait);}
 a.deepEqual([...new Set(D.locations.flatMap(l=>l.storyIds))].sort(),SD.chapters.map(d=>d.storyId).sort());a.equal(new Set(D.locations.flatMap(l=>l.actions)).size,7);
});
test('30条原创地点事件各有双分支、独立后果与条件，未附加任何数值奖励',()=>{
 a.equal(D.events.length,30);a.equal(new Set(D.events.map(e=>e.id)).size,30);a.equal(new Set(D.events.map(e=>e.text.join(''))).size,30);
 for(const l of D.locations)a.equal(D.events.filter(e=>e.locationId===l.id).length,3);
 for(const e of D.events){a.ok(e.when&&e.title&&e.text.join('').length>60);a.equal(e.options.length,2);a.equal(new Set(e.options.map(o=>o.result)).size,2);a.ok(e.options.every(o=>o.label&&o.result.length>20&&!o.effects));}
});
test('访问无回合或关系收益、同学期去重，十地点可找到全部六人且不自动相识',()=>{
 const f=setup(),core=JSON.stringify(f.s),other=JSON.stringify({...f.store.data,campus:undefined});
 for(let repeat=0;repeat<10;repeat++)for(const l of D.locations)a.ok(cmd(f,{type:'visit',id:l.id}).ok);
 a.equal(JSON.stringify(f.s),core);a.equal(JSON.stringify({...f.store.data,campus:undefined}),other);a.equal(f.store.data.campus.visits.length,10);a.equal(f.store.data.campus.discoveredNPCs.length,6);a.ok(R.validate(f.store.data));
 a.equal(cmd(f,{type:'visit',id:'missing'}).ok,false);a.equal(f.disk.get(R.CORE_KEY),core);
});
test('NPC排期稳定、跨回合与关系/章节动态变化，始终位于配置的地点',()=>{
 const f=setup(),seen=Object.fromEntries(N.NPCS.map(n=>[n.id,new Set()]));
 for(let turn=0;turn<32;turn++){const s={...f.s,turn};const first=C.npcPositions(s,f.store.data);a.deepEqual(first,C.npcPositions(s,f.store.data));for(const n of first){a.ok(D.npcRules[n.id].locations.includes(n.locationId));seen[n.id].add(n.locationId);}}
 for(const set of Object.values(seen))a.ok(set.size>=2);
 for(const n of N.NPCS){const s={...f.s,turn:10},before=C.npcPositions(s,f.store.data).find(p=>p.id===n.id).locationId;const ext=structuredClone(f.store.data);ext.story.people[n.id].chapters++;a.notEqual(C.npcPositions(s,ext).find(p=>p.id===n.id).locationId,before);}
 const at=(event,id)=>C.npcPositions({...f.s,lastEvent:event},f.store.data).find(p=>p.id===id).locationId;
 a.equal(at('finals','zhixia'),'library');a.equal(at('project','shenyan'),'lab');a.equal(at('project','teacherzhou'),'lab');a.equal(at('gaming','chengle'),'dorm');a.equal(at('sports','chengle'),'track');a.equal(at('club','nanqiao'),'club');
});
test('32回合覆盖四季五天气，总结与毕业仍对应原学期，计算无状态写入',()=>{
 const f=setup(),before=JSON.stringify(f),seasons=new Set(),weathers=new Set();
 for(let turn=0;turn<32;turn++){const t=C.time({...f.s,turn});seasons.add(t.season);weathers.add(t.weather);a.equal(t.term,Math.floor(turn/4)+1);}
 for(let turn=4;turn<=32;turn+=4){const t=C.time({...f.s,turn,phase:'summary'});a.equal(t.term,turn/4);a.equal(t.within,3);}
 a.equal(C.time({...f.s,turn:32,phase:'ending'}).term,8);a.equal(seasons.size,4);a.equal(weathers.size,5);a.equal(JSON.stringify(f),before);
});
test('事件行动、人物、季节、天气、地点及前置条件真实限制，原剧情不因到访解锁',()=>{
 const f=setup(),story=JSON.stringify(f.store.data.story);cmd(f,{type:'visit',id:'library'});
 for(const id of ['library-reference','library-finals','library-familiar','plaza-graduation','lake-after-rain','avenue-spring'])a.equal(C.canEvent(f.store.data,f.s,id).ok,false,id);
 a.equal(cmd(f,{type:'start',id:'classroom-room'}).ok,false);a.equal(S.canStart(f.store.data,f.s,'zhixia-1').ok,false);a.equal(S.canStart(f.store.data,f.s,'chengle-4').ok,false);a.equal(JSON.stringify(f.store.data.story),story);
 step(f,'study');a.ok(C.canEvent(f.store.data,f.s,'library-reference').ok);a.equal(C.canEvent(f.store.data,f.s,'lab-prepare').ok,false);
});
test('全部30事件的60种选择均可实际完成与恢复，原核心/奖励/剧情预算不变',()=>{
 for(let side=0;side<2;side++){const f=ready(),core=f.disk.get(R.CORE_KEY),before=JSON.stringify({...f.store.data,campus:undefined});
  for(const e of D.events){a.ok(cmd(f,{type:'visit',id:e.locationId}).ok);a.ok(cmd(f,{type:'start',id:e.id}).ok,e.id);f.store=R.createStore(f.storage,f.s);a.equal(f.store.mode,'bound');const result=cmd(f,{type:'choose',id:e.id,choiceId:e.options[side].id});a.ok(result.ok,e.id);a.equal(result.result,e.options[side].result);for(let i=0;i<5;i++)a.equal(cmd(f,{type:'choose',id:e.id,choiceId:e.options[1-side].id}).ok,false);a.ok(R.validate(f.store.data),e.id);}
  a.equal(f.store.data.campus.triggeredEvents.length,30);a.equal(Object.keys(f.store.data.campus.completedLocationEvents).length,30);a.equal(f.disk.get(R.CORE_KEY),core);a.equal(JSON.stringify({...f.store.data,campus:undefined}),before);a.equal(f.s.turn,32);f.store=R.createStore(f.storage,f.s);a.equal(f.store.mode,'bound');a.ok(R.validate(f.store.data));
 }
});
test('已开始地点事件跨天气可续读，推迟不丢历史且不能从过期选项重选',()=>{
 const f=setup();cmd(f,{type:'visit',id:'avenue'});a.ok(cmd(f,{type:'start',id:'avenue-leaves'}).ok);a.ok(cmd(f,{type:'defer'}).ok);
 for(let i=0;i<4;i++)step(f);a.notEqual(C.time(f.s).season,'autumn');a.ok(C.canEvent(f.store.data,f.s,'avenue-leaves').ok);cmd(f,{type:'visit',id:'avenue'});a.ok(cmd(f,{type:'start',id:'avenue-leaves'}).ok);
 const e=D.event('avenue-leaves');a.ok(cmd(f,{type:'choose',id:e.id,choiceId:e.options[0].id}).ok);a.equal(cmd(f,{type:'start',id:e.id}).ok,false);a.equal(f.store.data.campus.triggeredEvents.length,1);a.ok(R.validate(f.store.data));
});
test('每学期足迹最多十条、八学期80条，探索全程不改变32行动与原八总结',()=>{
 const f=setup();for(let turn=0;turn<32;turn++){for(const l of D.locations)cmd(f,{type:'visit',id:l.id});step(f);a.ok(R.validate(f.store.data));}
 a.equal(f.store.data.campus.visits.length,80);a.equal(f.s.turn,32);a.equal(f.s.summaries.length,8);a.equal(Object.values(f.s.counts).reduce((a,b)=>a+b,0),32);a.equal(f.s.phase,'ending');a.ok(g.validateSave(f.s));
});
test('地图成长行动只能在正确地点和原action阶段，原事件/总结/毕业不额外行动',()=>{
 const f=setup();a.equal(C.canAct(f.store.data,f.s,'library','study').ok,false);cmd(f,{type:'visit',id:'library'});a.ok(C.canAct(f.store.data,f.s,'library','study').ok);a.equal(C.canAct(f.store.data,f.s,'library','work').ok,false);
 for(const phase of ['event','summary','ending'])a.equal(C.canAct(f.store.data,{...f.s,phase},'library','study').ok,false);
 a.ok(g.takeAction(f.s,'study',()=>.2));a.equal(C.canAct(f.store.data,f.s,'library','study').ok,false);a.equal(g.takeAction(f.s,'study'),false);a.equal(f.s.counts.study,1);
});
test('V1/V2和V3.3无campus旧档只读初始化，保留人物、手机、故事及核心原文',()=>{
 const f=setup();f.store.perform(f.s,'zhixia',1);const old=JSON.parse(f.disk.get(R.KEY));delete old.data.campus;const raw=JSON.stringify(old),other=JSON.stringify(old.data),core=f.disk.get(R.CORE_KEY);f.disk.set(R.KEY,raw);
 f.store=R.createStore(f.storage,f.s);a.equal(f.disk.get(R.KEY),raw);a.equal(f.disk.get(R.CORE_KEY),core);a.ok(f.store.data.campus);a.equal(JSON.stringify({...f.store.data,campus:undefined}),other);a.equal(f.store.mode,'bound');cmd(f,{type:'visit',id:'dorm'});a.equal(f.disk.get(R.CORE_KEY),core);a.ok(R.validate(f.store.data));
});
test('刷新保留事件待选/足迹；明确新局才重置并隔离旧局次',()=>{
 const f=setup();cmd(f,{type:'visit',id:'dorm'});cmd(f,{type:'start',id:'dorm-clean'});const raw=f.disk.get(R.KEY),before=structuredClone(f.store.data);f.store=R.createStore(f.storage,f.s);a.deepEqual(f.store.data,before);a.equal(f.disk.get(R.KEY),raw);
 const stale=R.createStore(f.storage,f.s),oldRun=f.store.data.runId;f.s=g.freshState();f.store.reset(f.s);save(f);a.notEqual(f.store.data.runId,oldRun);a.deepEqual(f.store.data.campus.visitedLocations,[]);a.equal(f.store.data.campus.activeEvent,null);a.equal(stale.campusCommand(f.s,{type:'visit',id:'lake'}).ok,false);
});
test('同局双页合并探索与选择，不覆盖关系或手机回复；同一事件只完成一次',()=>{
 const f=setup(),b=R.createStore(f.storage,f.s);cmd(f,{type:'visit',id:'dorm'});a.ok(b.campusCommand(f.s,{type:'start',id:'dorm-clean'}).ok);a.ok(f.store.perform(f.s,'zhixia',1).ok);
 const e=D.event('dorm-clean');a.ok(b.campusCommand(f.s,{type:'choose',id:e.id,choiceId:e.options[0].id}).ok);a.equal(cmd(f,{type:'choose',id:e.id,choiceId:e.options[1].id}).ok,false);a.equal(b.data.npcs.zhixia.value,17);a.equal(Object.keys(b.data.campus.completedLocationEvents).length,1);a.ok(R.validate(b.data));
});
test('核心已推进的过期页面不能写探索，原扩展损坏不被静默覆盖',()=>{
 const f=setup(),stale=R.createStore(f.storage,f.s),old=structuredClone(f.s);cmd(f,{type:'visit',id:'dorm'});step(f);const raw=f.disk.get(R.KEY);a.equal(stale.campusCommand(old,{type:'visit',id:'lake'}).ok,false);a.equal(f.disk.get(R.KEY),raw);
 const bad=JSON.parse(raw);bad.data.campus.runId='other-run';const broken=JSON.stringify(bad);f.disk.set(R.KEY,broken);const isolated=R.createStore(f.storage,f.s);a.equal(isolated.mode,'corrupt');a.equal(isolated.campusCommand(f.s,{type:'visit',id:'lake'}).ok,false);a.equal(f.disk.get(R.KEY),broken);
});
test('campus损坏/未来时间/非法地点与选项被隔离，原核心仍安全可读',()=>{
 const f=setup();cmd(f,{type:'visit',id:'dorm'});cmd(f,{type:'start',id:'dorm-clean'});cmd(f,{type:'choose',id:'dorm-clean',choiceId:D.event('dorm-clean').options[0].id});const good=JSON.parse(f.disk.get(R.KEY));
 for(const mutate of [d=>d.campus.schemaVersion=99,d=>d.campus.visitedLocations.push('void'),d=>d.campus.discoveredNPCs.push('void'),d=>d.campus.visits[0].turn=32,d=>d.campus.completedLocationEvents['dorm-clean'].choiceId='void',d=>d.campus.campusFlags=[],d=>d.campus.activeEvent='void',d=>d.campus.triggeredEvents.push(d.campus.triggeredEvents[0])]){const e=structuredClone(good);mutate(e.data);const raw=JSON.stringify(e),bad=setup(f.s,raw);a.ok(bad.store.blocked());a.equal(bad.disk.get(R.KEY),raw);a.ok(g.validateSave(JSON.parse(bad.disk.get(R.CORE_KEY))));}
});
test('读取失败不覆盖未知旧档，写入失败仅保留本页，不阻断原游戏规则',()=>{
 let writes=0;const s=g.freshState(),store=R.createStore({getItem(){throw Error('denied');},setItem(){writes++;}},s);a.ok(store.campusCommand(s,{type:'visit',id:'lake'}).ok);a.equal(writes,0);a.equal(store.persistent,false);a.ok(g.takeAction(s,'rest',()=>.2));
 const f=setup(),quota=R.createStore({...f.storage,setItem(){throw Error('quota');}},f.s);a.ok(quota.campusCommand(f.s,{type:'visit',id:'dorm'}).ok);a.equal(quota.persistent,false);a.equal(quota.data.campus.visitedLocations[0],'dorm');a.equal(f.disk.has(R.KEY),false);
});
test('核心双锚点中断恢复仍保留探索，原事件待选/总结/毕业各阶段可浏览',()=>{
 const f=setup();cmd(f,{type:'visit',id:'dorm'});let failFinal=false;const storage={...f.storage,setItem(k,v){if(k===R.KEY&&failFinal&&JSON.parse(v).nextAnchor===null)throw Error('quota');f.storage.setItem(k,v);}};f.store=R.createStore(storage,f.s);
 g.takeAction(f.s,'rest',()=>.2);failFinal=true;f.store.commitCore(f.s,()=>f.storage.setItem(R.CORE_KEY,JSON.stringify(f.s)));const restored=R.createStore(f.storage,f.s);a.equal(restored.mode,'bound');a.deepEqual(restored.data.campus.visitedLocations,['dorm']);
 for(const phase of ['event','summary','ending']){const s={...f.s,phase,turn:phase==='event'?0:phase==='summary'?4:32};a.ok(C.open(s,'lake'));}
});
test('代码原生两套地图含全部建筑、零外部请求，地图脚本预算与减少动画样式明确',()=>{
 class E{constructor(tag){this.tag=tag;this.attrs={};this.children=[];}setAttribute(k,v){this.attrs[k]=v;}append(x){this.children.push(x);}}
 const art=require('../campus-art.js'),doc={createElementNS:(_,tag)=>new E(tag)},walk=e=>[e,...e.children.flatMap(walk)];
 const wide=art.render(doc),phone=art.render(doc,true);a.equal(wide.attrs.viewBox,'0 0 1200 800');a.equal(phone.attrs.viewBox,'0 0 480 1000');for(const root of [wide,phone]){a.equal(walk(root).filter(e=>e.attrs['data-building']).length,10);a.equal(walk(root).some(e=>e.tag==='image'||e.tag==='script'),false);a.ok(walk(root).length<700);}
 const css=fs.readFileSync(path.join(__dirname,'../style.css'),'utf8');a.match(css,/prefers-reduced-motion:reduce/);a.match(css,/html\[data-motion=off\] \.campus-weatherfx/);a.match(css,/\.campus-art\.portrait \{ display:block/);a.match(css,/max-width:1180px/);
 a.ok(['campus.js','campus-ui.js','campus-data.js','campus-art.js'].reduce((n,f)=>n+fs.statSync(path.join(__dirname,'..',f)).size,0)<100000);
});
