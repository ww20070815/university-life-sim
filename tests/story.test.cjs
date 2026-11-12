const {test}=require('node:test'),a=require('node:assert/strict');
const R=require('../relationships.js'),S=require('../story.js'),D=require('../story-data.js'),N=require('../npc-data.js'),P=require('../phone-data.js'),g=require('../game.js');
function setup(s=g.freshState(),raw){const map=new Map([[R.CORE_KEY,JSON.stringify(s)]]);if(raw)map.set(R.KEY,raw);const storage={getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};return {s,storage,store:R.createStore(storage,s)};}
function save(f){f.store.commitCore(f.s,()=>f.storage.setItem(R.CORE_KEY,JSON.stringify(f.s)));}
function step(f,npc='chengle',boost=false){
  if(boost&&!f.store.data.claimedTurns.includes(f.s.turn))f.store.perform(f.s,npc,1);
  const action=D.actions[npc].find(id=>!g.ACTIONS.find(a=>a.id===id).effects.money||f.s.stats.money>=-g.ACTIONS.find(a=>a.id===id).effects.money)||'work';
  a.ok(g.takeAction(f.s,action,()=>.2));save(f);a.ok(g.chooseOption(f.s,0));save(f);if(f.s.phase==='summary'){g.continueTerm(f.s);save(f);}
}
function prepare(f,npc,ch,boost=false){
  if(!f.store.data.npcs[npc].met){a.ok(f.store.perform(f.s,npc,0).ok);if(ch<5)step(f,npc,boost);}
  const chat=P.threads.find(t=>t.npc===npc);if(!f.store.data.phone.replies[chat.id])a.ok(f.store.phoneCommand(f.s,{type:'reply',id:chat.id,choice:1}).ok);
  const id=npc+'-'+ch;let guard=0;
  while((!S.eligibility(f.store.data,f.s,id).ok||!S.canStart(f.store.data,f.s,id).ok)&&f.s.turn<32&&guard++<40)step(f,npc,boost);
  a.ok(S.eligibility(f.store.data,f.s,id).ok,JSON.stringify(S.eligibility(f.store.data,f.s,id)));return id;
}
function finish(f,id,approach,reward=false){
  const choice=D.byId(id).choices.find(c=>c.approach===approach);a.ok(choice,'应存在 '+id+' '+approach);
  const before=JSON.stringify(f.s);a.ok(f.store.storyCommand(f.s,{type:'start',id}).ok);
  const result=f.store.storyCommand(f.s,{type:'choose',id,choiceId:choice.id,reward});a.ok(result.ok,JSON.stringify(result));a.equal(JSON.stringify(f.s),before);
  a.ok(R.validate(f.store.data),'完整扩展必须合法');const raw=structuredClone(f.store.data);f.store=R.createStore(f.storage,f.s);a.equal(f.store.mode,'bound');a.deepEqual(f.store.data,raw);return result;
}
test('六人30章唯一，正文不少于200字、三选项结果独立、16种番外且没有空白模板',()=>{
  a.equal(D.chapters.length,30);a.equal(new Set(D.chapters.map(d=>d.storyId)).size,30);
  for(const n of N.NPCS){const chapters=D.chapters.filter(d=>d.characterId===n.id);a.equal(chapters.length,5);a.deepEqual(chapters.map(d=>d.chapterId),[1,2,3,4,5]);a.deepEqual(n.chapters,chapters.map(d=>d.title));a.equal(n.portrait,null);for(const d of chapters){a.ok(d.paragraphs.join('').length>=200);a.equal(d.choices.length,3);a.equal(new Set(d.choices.map(c=>c.result)).size,3);a.ok(d.choices.every(c=>c.result.length>=30&&c.flag&&c.label));a.ok(d.chapterId===1||Object.keys(d.echo).length>=3);a.ok(require('node:fs').existsSync(require('node:path').join(__dirname,'../assets/backgrounds',d.scene+'.webp')));}}
  a.equal(new Set(D.chapters.map(d=>d.paragraphs.join(''))).size,30);a.ok(D.chapters.every(d=>d.dialogue.length&&d.dialogue.every(line=>line.speaker===d.characterId&&line.text.length>=25)));a.ok(D.chapters.every(d=>d.chapterId===5?d.nextId===null:!!d.nextConditions));a.equal(Object.values(D.endings).reduce((n,x)=>n+Object.keys(x).length,0),16);
});
test('章节、相识、行动、聊天和学年资格不能无条件跳过；锁定提示可读',()=>{
  const f=setup();a.equal(S.canStart(f.store.data,f.s,'zhixia-1').ok,false);a.equal(S.canStart(f.store.data,f.s,'chengle-2').ok,false);
  f.store.perform(f.s,'zhixia',0);a.equal(S.canStart(f.store.data,f.s,'zhixia-1').ok,false);step(f,'zhixia');finish(f,'zhixia-1','space');
  a.equal(S.eligibility(f.store.data,f.s,'zhixia-2').ok,false);while(f.s.turn<8)step(f,'zhixia');a.match(S.eligibility(f.store.data,f.s,'zhixia-2').reason,/手机/);
  f.store.phoneCommand(f.s,{type:'reply',id:'zhixia-plan',choice:1});a.ok(S.eligibility(f.store.data,f.s,'zhixia-2').ok);a.equal(S.canStart(f.store.data,f.s,'zhixia-4').ok,false);
});
test('每回合一段主要故事，推迟/刷新可续读，完成后不能重选或领取奖励',()=>{
  const f=setup();f.store.perform(f.s,'zhixia',0);step(f,'zhixia');a.ok(f.store.storyCommand(f.s,{type:'start',id:'chengle-1'}).ok);a.ok(f.store.storyCommand(f.s,{type:'defer'}).ok);
  a.equal(f.store.storyCommand(f.s,{type:'start',id:'zhixia-1'}).ok,false);f.store=R.createStore(f.storage,f.s);a.ok(f.store.storyCommand(f.s,{type:'start',id:'chengle-1'}).ok);
  const started=JSON.stringify(f.store.data.story);f.store=R.createStore(f.storage,f.s);a.equal(JSON.stringify(f.store.data.story),started);
  a.ok(f.store.storyCommand(f.s,{type:'choose',id:'chengle-1',choiceId:'listen'}).ok);for(let i=0;i<100;i++)a.equal(f.store.storyCommand(f.s,{type:'choose',id:'chengle-1',choiceId:'rules',reward:true}).ok,false);
  a.equal(f.store.storyCommand(f.s,{type:'start',id:'zhixia-1'}).ok,false);step(f,'zhixia');a.ok(f.store.storyCommand(f.s,{type:'start',id:'zhixia-1'}).ok);
});
test('原事件与总结优先，主动故事不抢占；毕业前不能开始第五章',()=>{
  const f=setup();g.takeAction(f.s,'rest',()=>.2);save(f);a.equal(f.store.storyCommand(f.s,{type:'start',id:'chengle-1'}).ok,false);g.chooseOption(f.s,0);save(f);
  while(f.s.turn<4)step(f);f.s.phase='summary';save(f);a.equal(S.canStart(f.store.data,f.s,'chengle-1').ok,false);a.equal(S.canStart(f.store.data,f.s,'chengle-5').ok,false);
});
test('六位人物普通友情与深厚羁绊均完整通关，章节刷新和番外保留，原核心不变',()=>{
  for(const n of N.NPCS)for(const bond of [false,true]){
    const f=setup();for(let ch=1;ch<=5;ch++){const id=prepare(f,n.id,ch);finish(f,id,ch===5?(bond?'bond':'space'):(bond?'collaborate':D.byId(id).choices.some(c=>c.approach==='space')?'space':'support'));}
    a.equal(f.s.turn,32);a.equal(f.s.summaries.length,8);const end=S.ending(f.store.data,n.id);a.equal(end.kind,bond?'bond':'friend');a.ok(end.name&&end.text&&end.afterword&&end.resolution);a.equal(f.store.data.story.partner,null);a.equal(f.store.data.npcs[n.id].romance,'none');
  }
});
test('四条恋爱路线必须明确兴趣、双方确认和必要关系；结局不依赖主角外观',()=>{
  for(const n of N.NPCS.filter(n=>n.romanceEligible)){
    const f=setup();for(let ch=1;ch<=3;ch++){const id=prepare(f,n.id,ch,true);finish(f,id,ch===3?'interest':'collaborate');}
    a.equal(f.store.data.story.partner,null);const fourth=prepare(f,n.id,4,true);a.ok(f.store.data.npcs[n.id].value>=60);finish(f,fourth,'romance');a.equal(f.store.data.story.partner,n.id);
    finish(f,prepare(f,n.id,5),'romance');a.equal(S.ending(f.store.data,n.id).kind,'romance');a.equal(f.store.data.story.people[n.id].route,'dating');
  }
});
test('关系达到100不会自动恋爱；拒绝恋爱保持原关系，可完成第五章友情',()=>{
  const f=setup();for(let ch=1;ch<=3;ch++)finish(f,prepare(f,'zhixia',ch,true),ch===3?'interest':'collaborate');const fourth=prepare(f,'zhixia',4,true),before=f.store.data.npcs.zhixia.value;
  a.equal(f.store.data.story.partner,null);finish(f,fourth,'space');a.equal(f.store.data.npcs.zhixia.value,before);a.equal(f.store.data.story.partner,null);finish(f,prepare(f,'zhixia',5),'space');a.equal(S.ending(f.store.data,'zhixia').kind,'friend');
});
test('没有表达兴趣或关系不足不能确认恋爱，程乐与周老师没有恋爱选项',()=>{
  for(const npc of ['chengle','teacherzhou'])for(const d of D.chapters.filter(d=>d.characterId===npc))a.ok(d.choices.every(c=>!['interest','romance'].includes(c.approach)));
  const f=setup();for(let ch=1;ch<=3;ch++)finish(f,prepare(f,'zhixia',ch),ch===3?'interest':'space');const id=prepare(f,'zhixia',4);f.store.storyCommand(f.s,{type:'start',id});a.equal(S.canChoose(f.store.data,f.s,id,'consent').ok,false);a.ok(f.store.storyCommand(f.s,{type:'choose',id,choiceId:'friend'}).ok);
});
test('六人关键选择分别产生不同前章回声、记录和未来结果，不靠更改基础结局',()=>{
  for(const n of N.NPCS){const echoes=[];for(const approach of ['support','collaborate','space']){const f=setup();finish(f,prepare(f,n.id,1),approach);echoes.push(S.echo(f.store.data,n.id+'-2'));a.ok(f.store.data.story.flags[0].startsWith(n.id+'-1#'));}a.equal(new Set(echoes).size,3);a.ok(echoes.every(Boolean));}
});
test('剧情关系奖励严格共用预算，与聊天/档案互斥，普通选择仍可完成',()=>{
  const f=setup();f.store.perform(f.s,'chengle',0);a.ok(f.store.storyCommand(f.s,{type:'start',id:'chengle-1'}).ok);a.equal(f.store.storyCommand(f.s,{type:'choose',id:'chengle-1',choiceId:'listen',reward:true}).ok,false);
  a.ok(f.store.storyCommand(f.s,{type:'choose',id:'chengle-1',choiceId:'listen',reward:false}).ok);a.equal(f.store.data.story.rewards.length,0);
  const paid=setup(),before=paid.store.data.npcs.chengle.value;finish(paid,'chengle-1','support',true);a.equal(paid.store.data.npcs.chengle.value,before+5);a.deepEqual(paid.store.data.claimedTurns,[0]);a.deepEqual(paid.store.data.story.rewards,['chengle-1']);
  a.equal(paid.store.phoneCommand(paid.s,{type:'reply',id:'chengle-dinner',choice:0}).ok,false);a.equal(paid.store.perform(paid.s,'zhixia',0).ok,false);a.ok(paid.store.phoneCommand(paid.s,{type:'reply',id:'chengle-dinner',choice:1}).ok);
});
test('旧档毕业后按前置顺序补读，不增加回合或关系，不必玩人物线也能毕业',()=>{
  const f=setup();while(f.s.turn<32)step(f);const original=JSON.stringify(f.s),ending=g.judgeEnding(f.s).id,relation=JSON.stringify(f.store.data.npcs);
  for(let ch=1;ch<=5;ch++)finish(f,prepare(f,'chengle',ch),'space');a.equal(JSON.stringify(f.s),original);a.equal(JSON.stringify(f.store.data.npcs),relation);a.equal(g.judgeEnding(f.s).id,ending);a.equal(f.store.data.story.rewards.length,0);
});
test('V3.2无story旧扩展只读补齐，保留原phone选择和两个存档字符串',()=>{
  const f=setup();f.store.phoneCommand(f.s,{type:'reply',id:'chengle-dinner',choice:1});const e=JSON.parse(f.storage.getItem(R.KEY));delete e.data.story;e.data.phone.notifications=e.data.phone.notifications.filter(n=>!n.id.startsWith('story'));e.data.phone.triggered=e.data.phone.triggered.filter(t=>!t.startsWith('notice:story'));
  const raw=JSON.stringify(e),core=f.storage.getItem(R.CORE_KEY);f.storage.setItem(R.KEY,raw);const old=R.createStore(f.storage,f.s);a.equal(f.storage.getItem(R.KEY),raw);a.equal(f.storage.getItem(R.CORE_KEY),core);a.deepEqual(old.data.phone.replies,e.data.phone.replies);a.equal(Object.keys(old.data.story.completed).length,0);a.ok(R.validate(old.data));
});
test('多页面的不同剧情选择不会互相覆盖，新游戏重置故事与手机，旧页拒绝写入',()=>{
  const f=setup();f.store.storyCommand(f.s,{type:'start',id:'chengle-1'});const second=R.createStore(f.storage,f.s);a.ok(f.store.storyCommand(f.s,{type:'choose',id:'chengle-1',choiceId:'listen'}).ok);const raw=f.storage.getItem(R.KEY);a.equal(second.storyCommand(f.s,{type:'choose',id:'chengle-1',choiceId:'rules'}).ok,false);a.equal(f.storage.getItem(R.KEY),raw);
  const oldRun=f.store.data.runId;f.store.reset(f.s);save(f);a.notEqual(f.store.data.runId,oldRun);a.deepEqual(f.store.data.story.completed,{});a.deepEqual(f.store.data.story.triggered,[]);a.deepEqual(f.store.data.phone.replies,{});const newRaw=f.storage.getItem(R.KEY);a.equal(second.storyCommand(f.s,{type:'start',id:'chengle-1'}).ok,false);a.equal(f.storage.getItem(R.KEY),newRaw);
});
test('坏story结构、runId、跳章、伪造恋爱/奖励安全隔离，原文和核心不覆盖',()=>{
  const f=setup();finish(f,'chengle-1','support');const e=JSON.parse(f.storage.getItem(R.KEY));
  for(const change of [x=>x.data.story.runId='other',x=>x.data.story.schemaVersion=99,x=>x.data.story.active={id:'teacherzhou-4',turn:0},x=>x.data.story.completed['chengle-1'].sequence=3,x=>x.data.story.completed['chengle-1'].rewarded=true,x=>x.data.story.partner='teacherzhou',x=>x.data.story.flags=[],x=>x.data.story.completed['chengle-5']=x.data.story.completed['chengle-1']]){const broken=structuredClone(e);change(broken);const raw=JSON.stringify(broken),page=setup(f.s,raw);a.ok(page.store.blocked());a.equal(page.storage.getItem(R.KEY),raw);a.equal(page.storage.getItem(R.CORE_KEY),JSON.stringify(f.s));}
});
test('存储读取失败不覆盖故事，写入失败本页仍防重，刷新不会凭空补发奖励',()=>{
  const f=setup();f.store.storyCommand(f.s,{type:'start',id:'chengle-1'});const raw=f.storage.getItem(R.KEY),read=f.storage.getItem;
  f.storage.getItem=k=>{if(k===R.KEY)throw Error('read denied');return read(k);};a.ok(f.store.storyCommand(f.s,{type:'choose',id:'chengle-1',choiceId:'listen',reward:true}).ok);a.equal(read(R.KEY),raw);a.equal(f.store.persistent,false);a.equal(f.store.storyCommand(f.s,{type:'choose',id:'chengle-1',choiceId:'listen',reward:true}).ok,false);
  f.storage.getItem=read;const page=R.createStore(f.storage,f.s);a.equal(Object.keys(page.data.story.completed).length,0);a.deepEqual(page.data.claimedTurns,[]);
});
test('已有恋人时不能无条件确认另一位，友情仍可完成',()=>{
  const f=setup();for(let t=0;t<32;t++){
    const npc=t%2?'shenyan':'zhixia';if(!f.store.data.npcs[npc].met)f.store.perform(f.s,npc,0);else f.store.perform(f.s,npc,1);
    const chat=P.threads.find(x=>x.npc===npc);if(!f.store.data.phone.replies[chat.id])f.store.phoneCommand(f.s,{type:'reply',id:chat.id,choice:1});step(f,npc);
  }
  a.ok(f.store.data.npcs.zhixia.value>=60&&f.store.data.npcs.shenyan.value>=60);
  for(const npc of ['zhixia','shenyan'])for(let ch=1;ch<=3;ch++)finish(f,prepare(f,npc,ch),ch===3?'interest':'collaborate');finish(f,'zhixia-4','romance');
  a.ok(f.store.storyCommand(f.s,{type:'start',id:'shenyan-4'}).ok);a.equal(f.store.storyCommand(f.s,{type:'choose',id:'shenyan-4',choiceId:'consent'}).ok,false);a.ok(f.store.storyCommand(f.s,{type:'choose',id:'shenyan-4',choiceId:'friend'}).ok);finish(f,'shenyan-5','space');finish(f,'zhixia-5','romance');a.equal(f.store.data.story.partner,'zhixia');
});
test('同一次关系记录不能同时冒充聊天与剧情两份奖励',()=>{
  const f=setup();finish(f,'chengle-1','space',true);const copy=structuredClone(f.store.data),Phone=require('../phone.js');a.ok(Phone.reply(copy,f.s,'chengle-dinner',0).ok);Phone.reconcile(copy,f.s);a.ok(Phone.validate(copy.phone,copy));a.equal(R.validate(copy),null);
});
test('故事进行中保存核心的双锚点恢复，不丢当前章，不在事件阶段完成故事',()=>{
  const f=setup();f.store.storyCommand(f.s,{type:'start',id:'chengle-1'});g.takeAction(f.s,'rest',()=>.2);
  const write=f.storage.setItem;let n=0;f.storage.setItem=(k,v)=>{if(k===R.KEY&&++n===2)throw Error('last write failed');write(k,v);};save(f);f.storage.setItem=write;f.store=R.createStore(f.storage,f.s);a.equal(f.store.mode,'bound');a.equal(f.store.data.story.active.id,'chengle-1');a.equal(f.store.storyCommand(f.s,{type:'choose',id:'chengle-1',choiceId:'listen'}).ok,false);
  g.chooseOption(f.s,0);save(f);a.ok(f.store.storyCommand(f.s,{type:'choose',id:'chengle-1',choiceId:'listen'}).ok);a.equal(f.s.turn,1);a.ok(R.validate(f.store.data));
});
test('一局同时保存30章、12组聊天和24条动态，不超存档限额且毕业番外完整恢复',()=>{
  const f=setup(),Phone=require('../phone.js');for(let turn=0;turn<32;turn++){
    const npc=N.NPCS[turn%6].id;if(!f.store.data.npcs[npc].met)f.store.perform(f.s,npc,0);
    for(const t of P.threads)if(Phone.canReply(f.store.data,f.s,t.id,1).ok)f.store.phoneCommand(f.s,{type:'reply',id:t.id,choice:1});step(f,npc);
  }
  for(const t of P.threads)if(Phone.canReply(f.store.data,f.s,t.id,1).ok)f.store.phoneCommand(f.s,{type:'reply',id:t.id,choice:1});
  const original=JSON.stringify(f.s);for(const n of N.NPCS)for(let ch=1;ch<=5;ch++)finish(f,prepare(f,n.id,ch),ch===5?'space':ch===4?'collaborate':'support');
  for(const feed of P.feed)f.store.phoneCommand(f.s,{type:'read',kind:'feed',id:feed.id});
  a.equal(Object.keys(f.store.data.story.completed).length,30);a.equal(Object.keys(f.store.data.phone.replies).length,12);a.equal(f.store.data.phone.messages.filter(m=>m.id.startsWith('story:')).length,30);a.equal(f.store.data.phone.feedRead.length,24);a.equal(f.store.data.story.queue.length,0);a.ok(R.validate(f.store.data));a.equal(JSON.stringify(f.s),original);a.ok(f.storage.getItem(R.KEY).length<150000);
  f.store=R.createStore(f.storage,f.s);a.equal(f.store.mode,'bound');for(const n of N.NPCS)a.equal(S.ending(f.store.data,n.id).kind,'friend');
});
