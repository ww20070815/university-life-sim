// 用最小 DOM 适配器验证存档边界；视觉布局由真实浏览器检查，不由此适配器判断。
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const v1=require('./fixtures/v1-game.cjs');
const R=require('../relationships.js');
const KEY='university-four-years-v1';

class Element {
  constructor(tag='div'){this.tagName=tag;this.children=[];this.dataset={};this.style={setProperty(){}};this.listeners={};this.classList={add(){},remove(){}};this.hidden=true;this.textContent='';this.isConnected=true;}
  append(...children){for(const child of children)child.parentElement=this;this.children.push(...children);}
  prepend(...children){for(const child of children)child.parentElement=this;this.children.unshift(...children);}
  replaceChildren(...children){this.children=[...children];}
  setAttribute(k,v){this[k]=v;}
  removeAttribute(k){delete this[k];}
  addEventListener(name,fn){this.listeners[name]=fn;}
  querySelector(name){return this.children.find(c=>c.className===name.slice(1))||new Element();}
  querySelectorAll(){return [];}
  focus(){} remove(){if(this.parentElement)this.parentElement.children=this.parentElement.children.filter(c=>c!==this);}
  click(){if(!this.disabled)this.listeners.click?.({});}
}
function harness(save,settings=null,withV3=false,extension=null,options={}){
  const elements=new Map(),storage=new Map(),writes=[],sceneCalls=[];
  if(save!==undefined)storage.set(KEY,save);
  if(settings)storage.set('university-four-years-visual-v2',JSON.stringify(settings));
  if(extension!==null)storage.set(R.KEY,extension);
  const node=id=>{if(!elements.has(id))elements.set(id,new Element());return elements.get(id);};
  node('modal-content').parentElement=node('.modal');
  const listeners={};
  const document={getElementById:node,createElement:tag=>new Element(tag),createElementNS:(_,tag)=>new Element(tag),querySelector:node,querySelectorAll:()=>[],documentElement:new Element(),hidden:false,addEventListener:(name,fn)=>{(listeners[name]||=[]).push(fn);},activeElement:null};
  const context={document,localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>{storage.set(k,v);writes.push(k);},removeItem:k=>storage.delete(k)},Image:class{},requestAnimationFrame:fn=>fn(),setTimeout:()=>1,clearTimeout(){},scrollTo(){},console};
  context.window=context;context.globalThis=context;
  if(withV3)context.CampusAudio={setScene:s=>sceneCalls.push(s),effect(){},settlement(){},newRun(){}};
  vm.createContext(context);
  for(const file of (withV3?['npc-data.js','phone-data.js','story-data.js','story.js','campus-data.js','campus.js','phone.js','relationships.js','visual.js','companion-ui.js','story-ui.js','campus-art.js','campus-ui.js','phone-ui.js','game.js']:['visual.js','game.js']))if(!(options.omitPhone&&file==='phone.js')&&!(options.omitStory&&file==='story.js')&&!(options.omitStoryUI&&file==='story-ui.js')&&!(options.omitCampusUI&&file==='campus-ui.js')&&!(options.omitCampusArt&&file==='campus-art.js'))vm.runInContext(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),context);
  return {node,storage,writes,sceneCalls,setHidden:hidden=>{document.hidden=hidden;for(const fn of listeners.visibilitychange||[])fn();},pageHidden:()=>document.documentElement.dataset.pageHidden};
}
function fixtures(){
  const s=v1.freshState(),result={};
  while(s.phase!=='ending'){
    if(s.turn===8&&s.phase==='action')result.action=structuredClone(s);
    if(s.turn===9&&s.phase==='event')result.event=structuredClone(s);
    if(s.turn===12&&s.phase==='summary')result.summary=structuredClone(s);
    if(s.phase==='action')v1.takeAction(s,'rest',()=>.2);
    else if(s.phase==='event')v1.chooseOption(s,0);
    else v1.continueTerm(s);
  }
  result.ending=structuredClone(s);return result;
}
test('真实 V1 四种阶段经 V2 页面初始化、补选角色后，旧档字符串保持原样',()=>{
  for(const [phase,state] of Object.entries(fixtures())){
    const raw=JSON.stringify(state),ui=harness(raw);
    assert.equal(ui.storage.get(KEY),raw);assert.equal(ui.writes.includes(KEY),false);
    assert.equal(ui.node('home-continue').disabled,false);
    ui.node('home-continue').click();
    assert.equal(ui.node('modal-content').children.find(x=>x.id==='modal-title').textContent,'给原来的旅程，一个新形象');
    const confirm=ui.node('modal-content').children.find(x=>x.textContent==='确认形象，继续旅程 →');assert.ok(confirm);confirm.click();
    assert.equal(ui.storage.get(KEY),raw,phase);
    assert.deepEqual(JSON.parse(ui.storage.get(KEY)),state);
    assert.equal(ui.writes.includes(KEY),false,phase);
    assert.ok(ui.writes.includes('university-four-years-visual-v2'));
    assert.equal(ui.node('game-view').hidden,false);
  }
});
test('已有角色设置不重写游戏档；坏档保留原文；无存档访问不自动创建新档',()=>{
  const raw=JSON.stringify(fixtures().event),ui=harness(raw,{character:'female',motion:false});
  ui.node('home-continue').click();assert.equal(ui.storage.get(KEY),raw);assert.equal(ui.writes.includes(KEY),false);
  const broken='{broken json';assert.equal(harness(broken).storage.get(KEY),broken);
  assert.equal(harness(undefined).storage.has(KEY),false);
});
test('后台与前台切换只更新动画可见性，不写入或清除原存档',()=>{
  const raw=JSON.stringify(fixtures().event),ui=harness(raw,{character:'female',motion:true});
  ui.node('home-continue').click();
  ui.setHidden(true);assert.equal(ui.pageHidden(),'true');
  ui.setHidden(false);assert.equal(ui.pageHidden(),'false');
  assert.equal(ui.storage.get(KEY),raw);assert.equal(ui.writes.includes(KEY),false);
});
test('V3 模块加载后 V1 四种旧档仍只读，未自动建立扩展或改写核心',()=>{
  for(const state of Object.values(fixtures())){const raw=JSON.stringify(state),ui=harness(raw,{character:'female',motion:true},true);ui.node('home-continue').click();assert.equal(ui.storage.get(KEY),raw);assert.equal(ui.writes.includes(KEY),false);assert.equal(ui.storage.has('university-four-years-v3'),false);}
});
test('真实 V3 人物弹窗一次互动只写扩展，重复交流按钮禁用，核心字符串不变',()=>{
  const raw=JSON.stringify(v1.freshState()),ui=harness(raw,{character:'male'},true);ui.node('home-continue').click();ui.node('open-friends').click();
  const list=ui.node('modal-content').children.find(x=>x.className==='npc-list');assert.equal(list.children.length,6);list.children[0].click();
  const button=ui.node('modal-content').children.find(x=>x.className==='npc-interactions').children[1];button.click();assert.equal(ui.storage.get(KEY),raw);
  for(let rapid=0;rapid<100;rapid++)button.click(); // 即使旧按钮回调排队，也只能结算一次。
  const ext=JSON.parse(ui.storage.get('university-four-years-v3'));assert.equal(ext.data.npcs.zhixia.value,17);assert.deepEqual(ext.data.claimedTurns,[0]);
  ui.node('modal-content').children.find(x=>x.textContent==='查看人物档案').click();
  const choices=ui.node('modal-content').children.find(x=>x.className==='npc-interactions').children;assert.ok(choices.every(x=>x.disabled));choices[0].click();assert.equal(JSON.parse(ui.storage.get('university-four-years-v3')).data.npcs.zhixia.value,17);
});

function withRelationship(state,id='zhixia',choice=1){
  const coreRaw=JSON.stringify(state),map=new Map([[KEY,coreRaw]]);
  const store=R.createStore({getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v)},state);
  store.perform(state,id,choice);return map.get(R.KEY);
}
test('有关系记录时刷新和切换男女主不改写关系、属性、回合或已用预算',()=>{
  const state=fixtures().action,raw=JSON.stringify(state),ext=withRelationship(state);
  for(const character of ['male','female']){
    const ui=harness(raw,{character},true,ext);ui.node('home-continue').click();
    ui.node('change-character').click();
    const grid=ui.node('modal-content').children.find(x=>x.className==='character-grid');
    grid.children.find(x=>x.dataset.choice!==character).click();
    ui.node('modal-content').children.find(x=>x.textContent==='确认形象，继续旅程 →').click();
    assert.equal(ui.storage.get(KEY),raw);assert.equal(ui.storage.get(R.KEY),ext);
    assert.notEqual(JSON.parse(ui.storage.get('university-four-years-visual-v2')).character,character);
    ui.node('open-friends').click();ui.node('modal-content').children.find(x=>x.className==='npc-list').children[0].click();
    assert.ok(ui.node('modal-content').children.find(x=>x.className==='npc-interactions').children.every(x=>x.disabled));
  }
});
test('实际新游戏确认流程重置六人及预算，新局不继承上一局关系',()=>{
  const state=fixtures().action,raw=JSON.stringify(state),ext=withRelationship(state),ui=harness(raw,{character:'female'},true,ext);
  ui.node('home-continue').click();ui.node('new-game').click();
  ui.node('modal-content').children.find(x=>x.textContent==='确认开始新游戏').click();
  ui.node('modal-content').children.find(x=>x.textContent==='以这个身份，开启四年 →').click();
  assert.deepEqual(JSON.parse(ui.storage.get(KEY)),v1.freshState());
  const current=JSON.parse(ui.storage.get(R.KEY));assert.notEqual(current.data.runId,JSON.parse(ext).data.runId);
  assert.deepEqual(current.data.claimedTurns,[]);assert.deepEqual(current.data.npcs,R.fresh().npcs);
});
test('六份档案均可查看；周老师只有师生关系；人物按钮显示实际封顶收益',()=>{
  const state=v1.freshState(),data=R.fresh('cap-label-test');
  for(let i=0;i<17;i++){R.interact(data,state,'zhixia',1);v1.takeAction(state,'rest',()=>.1);v1.chooseOption(state,0);if(state.phase==='summary')v1.continueTerm(state);}
  assert.equal(data.npcs.zhixia.value,97);
  const ext=JSON.stringify({schema:1,anchor:JSON.stringify(state),nextAnchor:null,data}),ui=harness(JSON.stringify(state),{character:'male'},true,ext);
  ui.node('home-continue').click();
  for(let i=0;i<6;i++){
    ui.node('open-friends').click();const list=ui.node('modal-content').children.find(x=>x.className==='npc-list');list.children[i].click();
    const content=ui.node('modal-content'),options=content.children.find(x=>x.className==='npc-interactions');assert.equal(options.children.length,3);
    if(i===0){assert.ok(options.children.every(x=>x.textContent.endsWith('关系 +3')));options.children[0].click();content.children.find(x=>x.textContent==='查看人物档案').click();assert.ok(content.children.find(x=>x.className==='npc-interactions').children.every(x=>x.textContent.endsWith('关系已满')));}
    if(i===5)assert.ok(content.children.some(x=>x.textContent==='你们发展的是师生指导与信任。'));
  }
});

function descendants(root){return [root,...root.children.flatMap(descendants)];}
function byText(ui,text){const nodes=descendants(ui.node('modal-content')),node=nodes.find(n=>n.tagName==='button'&&n.textContent===text)||nodes.find(n=>n.textContent===text);assert.ok(node,'应存在按钮/文本：'+text);return node;}
test('真实手机首页与任务渲染不写存档，锁定联系人不能提前打开聊天',()=>{
  const raw=JSON.stringify(v1.freshState()),ui=harness(raw,{character:'female'},true);ui.node('home-continue').click();ui.node('open-phone').click();
  assert.equal(ui.node('modal-content').children.find(n=>n.id==='modal-title').textContent,'校园手机');assert.equal(ui.writes.length,0);
  byText(ui,'聊天').click();const contacts=descendants(ui.node('modal-content')).filter(n=>n.className==='phone-contact');assert.equal(contacts.length,6);assert.equal(contacts.filter(n=>n.disabled).length,5);contacts[0].click();assert.equal(ui.writes.length,0);
  byText(ui,'任务').click();const tasks=descendants(ui.node('modal-content')).filter(n=>n.className?.startsWith('phone-task '));assert.equal(tasks.length,13);tasks[0].click();
  assert.ok(byText(ui,'当前进度 0 / 2'));assert.ok(byText(ui,'开放条件：进入校园即可记录'));assert.equal(ui.writes.length,0);assert.equal(ui.storage.get(KEY),raw);
});
test('真实聊天已读、普通回复与历史保存；旧按钮重复调用不能重复回复',()=>{
  const raw=JSON.stringify(v1.freshState()),ui=harness(raw,{character:'male'},true);ui.node('home-continue').click();ui.node('open-phone').click();byText(ui,'聊天').click();
  descendants(ui.node('modal-content')).filter(n=>n.className==='phone-contact')[2].click();
  const reply=byText(ui,'建议先点小份，给未知留点余地 · 普通回复');reply.click();for(let i=0;i<20;i++)reply.click();
  const data=JSON.parse(ui.storage.get(R.KEY)).data;assert.equal(data.phone.replies['chengle-dinner'].choice,1);assert.equal(Object.keys(data.phone.replies).length,1);assert.deepEqual(data.claimedTurns,[]);assert.equal(data.npcs.chengle.value,28);assert.ok(descendants(ui.node('modal-content')).some(n=>n.textContent.includes('通过！新品不惊艳')));assert.equal(ui.storage.get(KEY),raw);assert.equal(data.phone.messages.filter(m=>m.id==='answer:chengle-dinner').length,1);
});
test('真实通知分类、详情跳转和动态已读可使用，不触发额外属性奖励',()=>{
  const raw=JSON.stringify(v1.freshState()),ui=harness(raw,{character:'female'},true);ui.node('home-continue').click();ui.node('open-phone').click();byText(ui,'通知').click();byText(ui,'人物').click();
  const notice=descendants(ui.node('modal-content')).find(n=>n.className==='notice-card'&&descendants(n).some(t=>t.textContent==='程乐 已加入通讯录'));assert.ok(notice);notice.click();byText(ui,'查看相关内容 →').click();assert.equal(byText(ui,'程乐').id,'modal-title');
  byText(ui,'动态').click();const feed=descendants(ui.node('modal-content')).find(n=>n.className==='feed-card');feed.click();assert.ok(byText(ui,'已读'));const data=JSON.parse(ui.storage.get(R.KEY)).data;assert.equal(data.phone.feedRead.length,1);assert.ok(data.phone.notifications.some(n=>n.read));assert.equal(ui.storage.get(KEY),raw);
});
test('UI 切换男女主保留手机；明确新游戏后手机回复与已读正确重置',()=>{
  const s=v1.freshState(),ui=harness(JSON.stringify(s),{character:'female'},true);ui.node('home-continue').click();ui.node('open-phone').click();byText(ui,'聊天').click();descendants(ui.node('modal-content')).filter(n=>n.className==='phone-contact')[2].click();byText(ui,'投老窗口一票，稳稳吃饱 · 普通回复').click();const ext=ui.storage.get(R.KEY);
  byText(ui,'回到校园').click();ui.node('change-character').click();descendants(ui.node('modal-content')).find(n=>n.dataset.choice==='male').click();byText(ui,'确认形象，继续旅程 →').click();assert.equal(ui.storage.get(R.KEY),ext);
  ui.node('new-game').click();byText(ui,'确认开始新游戏').click();byText(ui,'以这个身份，开启四年 →').click();const fresh=JSON.parse(ui.storage.get(R.KEY)).data;assert.deepEqual(fresh.phone.replies,{});assert.deepEqual(fresh.phone.feedRead,[]);assert.notEqual(fresh.runId,JSON.parse(ext).data.runId);assert.ok(fresh.phone.messages.every(m=>!m.read));
});
test('手机逻辑脚本加载失败时原游戏仍可恢复，入口有提示且不删写旧档',()=>{
  const raw=JSON.stringify(fixtures().action),ui=harness(raw,{character:'female'},true,null,{omitPhone:true});
  ui.node('home-continue').click();ui.node('open-phone').click();assert.ok(ui.node('toast').textContent.includes('模块未载入'));assert.equal(ui.node('game-view').hidden,false);assert.equal(ui.storage.get(KEY),raw);assert.equal(ui.writes.length,0);
});
test('待选事件、总结、毕业均可打开手机，返回恢复原阶段且不推进回合',()=>{
  for(const phase of ['event','summary','ending']){
    const s=fixtures()[phase],raw=JSON.stringify(s),ui=harness(raw,{character:'female'},true);ui.node('home-continue').click();
    const title=ui.node('modal-content').children.find(n=>n.id==='modal-title').textContent;
    byText(ui,'查看校园手机 · 不推进回合').click();assert.equal(byText(ui,'校园手机').id,'modal-title');byText(ui,'聊天').click();descendants(ui.node('modal-content')).filter(n=>n.className==='phone-contact')[2].click();
    const choices=descendants(ui.node('modal-content')).filter(n=>n.tagName==='button'&&n.textContent.startsWith('分享今天路上的小发现'));assert.equal(choices.length,1);assert.equal(choices[0].disabled,true);
    byText(ui,'回到校园').click();assert.equal(ui.node('modal-content').children.find(n=>n.id==='modal-title').textContent,title);assert.equal(ui.storage.get(KEY),raw);
  }
});

test('故事中心、人物进度与历史可浏览，开始/选择才写扩展，快速旧回调不能重选',()=>{
  const raw=JSON.stringify(v1.freshState()),ui=harness(raw,{character:'female'},true);ui.node('home-continue').click();ui.node('open-stories').click();assert.equal(ui.writes.length,0);
  const people=descendants(ui.node('modal-content')).filter(n=>n.className==='story-person');assert.equal(people.length,6);people[2].click();const chapters=descendants(ui.node('modal-content')).filter(n=>n.className==='story-chapter');assert.equal(chapters.length,5);assert.equal(chapters[0].disabled,false);assert.ok(chapters.slice(1).every(n=>n.disabled));
  chapters[0].click();const choice=descendants(ui.node('modal-content')).find(n=>n.className==='story-options').children[0];choice.click();for(let i=0;i<25;i++)choice.click();
  const data=JSON.parse(ui.storage.get(R.KEY)).data;assert.equal(data.story.completed['chengle-1'].choiceId,'listen');assert.equal(Object.keys(data.story.completed).length,1);assert.equal(data.npcs.chengle.value,28);assert.equal(ui.storage.get(KEY),raw);assert.deepEqual(data.claimedTurns,[]);
  byText(ui,'返回人物故事').click();descendants(ui.node('modal-content')).find(n=>n.className==='story-chapter').click();assert.ok(byText(ui,'已保存的历史只读，回看不占故事次数，也不会重复领奖。'));
});
test('勾选剧情共享奖励只结算一次，切换男女主保留故事，明确新局才重置',()=>{
  const raw=JSON.stringify(v1.freshState()),ui=harness(raw,{character:'female'},true);ui.node('home-continue').click();ui.node('open-stories').click();byText(ui,'程乐 · 宿舍第一夜').click();
  const toggle=descendants(ui.node('modal-content')).find(n=>n['aria-label']==='使用本回合关系交流奖励');toggle.checked=true;toggle.listeners.change();descendants(ui.node('modal-content')).find(n=>n.className==='story-options').children[0].click();
  const ext=ui.storage.get(R.KEY);assert.equal(JSON.parse(ext).data.npcs.chengle.value,33);assert.deepEqual(JSON.parse(ext).data.claimedTurns,[0]);byText(ui,'返回校园或原页面').click();
  ui.node('change-character').click();descendants(ui.node('modal-content')).find(n=>n.dataset.choice==='male').click();byText(ui,'确认形象，继续旅程 →').click();assert.equal(ui.storage.get(R.KEY),ext);
  ui.node('new-game').click();byText(ui,'确认开始新游戏').click();byText(ui,'以这个身份，开启四年 →').click();const data=JSON.parse(ui.storage.get(R.KEY)).data;assert.deepEqual(data.story.completed,{});assert.deepEqual(data.story.triggered,[]);assert.notEqual(data.runId,JSON.parse(ext).data.runId);
});
test('校园手机故事入口与通知跳转连接真实阅读器，可推迟并返回手机',()=>{
  const ui=harness(JSON.stringify(v1.freshState()),{character:'male'},true);ui.node('home-continue').click();ui.node('open-phone').click();
  descendants(ui.node('modal-content')).find(n=>n.tagName==='button'&&n.textContent.startsWith('人物故事 ·')).click();assert.equal(byText(ui,'我们的青春故事').id,'modal-title');byText(ui,'返回校园或原页面').click();assert.equal(byText(ui,'校园手机').id,'modal-title');
  byText(ui,'通知').click();const notice=descendants(ui.node('modal-content')).find(n=>n.className==='notice-card'&&descendants(n).some(t=>t.textContent==='程乐 · 宿舍第一夜可阅读'));assert.ok(notice);notice.click();byText(ui,'查看相关内容 →').click();assert.equal(byText(ui,'宿舍第一夜').id,'modal-title');byText(ui,'暂时收好，稍后再读').click();assert.equal(JSON.parse(ui.storage.get(R.KEY)).data.story.active,null);
});
test('故事脚本缺失时入口提示可用，原游戏和真实旧存档不被重写',()=>{
  for(const options of [{omitStory:true},{omitStoryUI:true}]){const raw=JSON.stringify(v1.freshState()),ui=harness(raw,{character:'male'},true,null,options);ui.node('home-continue').click();ui.node('open-stories').click();assert.ok(ui.node('toast').textContent.includes('故事模块未载入'));assert.equal(ui.storage.get(KEY),raw);assert.equal(ui.writes.length,0);}
});

test('校园地图首页渲染只读，十个建筑均可进入，电脑/手机SVG和记录入口真实存在',()=>{
 const raw=JSON.stringify(v1.freshState()),ui=harness(raw,{character:'male'},true);ui.node('home-continue').click();ui.node('open-map').click();assert.equal(ui.writes.length,0);
 const pins=()=>descendants(ui.node('modal-content')).filter(n=>n.className==='campus-pin');assert.equal(pins().length,10);assert.equal(descendants(ui.node('modal-content')).filter(n=>n.tagName==='svg').length,2);
 for(const id of ['library','classroom','lab','dorm','canteen','track','club','lake','plaza','avenue']){pins().find(n=>n.dataset.location===id).click();assert.equal(JSON.parse(ui.storage.get(R.KEY)).data.campus.currentLocation,id);}
 byText(ui,'查看校园探索记录').click();assert.ok(byText(ui,'已访问 10 / 10'));assert.equal(ui.storage.get(KEY),raw);assert.deepEqual(JSON.parse(ui.storage.get(R.KEY)).data.claimedTurns,[]);
});
test('地点日常旧按钮快速连点只完成一次；刷新、角色更换、回看均保留选择',()=>{
 const raw=JSON.stringify(v1.freshState()),ui=harness(raw,{character:'male'},true);ui.node('home-continue').click();ui.node('open-map').click();descendants(ui.node('modal-content')).find(n=>n.dataset.location==='dorm').click();byText(ui,'公共桌上的大扫除 · 去看看').click();
 const choice=byText(ui,'先询问物品归属，再分区整理');choice.click();for(let i=0;i<25;i++)choice.click();const ext=ui.storage.get(R.KEY);assert.equal(Object.keys(JSON.parse(ext).data.campus.completedLocationEvents).length,1);assert.equal(ui.storage.get(KEY),raw);
 byText(ui,'返回校园或原页面').click();ui.node('change-character').click();descendants(ui.node('modal-content')).find(n=>n.dataset.choice==='female').click();byText(ui,'确认形象，继续旅程 →').click();assert.equal(ui.storage.get(R.KEY),ext);
 const again=harness(raw,{character:'female'},true,ext);again.node('home-continue').click();again.node('open-map').click();byText(again,'公共桌上的大扫除 · 已记录').click();assert.ok(byText(again,'只读回看，不会重复记录或发放收益。'));assert.equal(again.storage.get(R.KEY),ext);
});
test('地图行动与原行动区共用一次结算，旧回调不得二次行动，余额不足按钮禁用',()=>{
 const raw=JSON.stringify(v1.freshState()),ui=harness(raw,{character:'male'},true);ui.node('home-continue').click();ui.node('open-map').click();descendants(ui.node('modal-content')).find(n=>n.dataset.location==='library').click();
 const action=descendants(ui.node('modal-content')).find(n=>n.className==='modal-button'&&n.children.some(c=>c.textContent==='认真学习 · 使用唯一主要行动'));assert.ok(action);action.click();const saved=ui.storage.get(KEY);for(let i=0;i<20;i++)action.click();assert.equal(ui.storage.get(KEY),saved);assert.equal(JSON.parse(saved).counts.study,1);assert.equal(JSON.parse(saved).phase,'event');assert.equal(JSON.parse(saved).turn,0);
 const low=v1.freshState();low.stats.money=0;const poor=harness(JSON.stringify(low),{character:'male'},true);poor.node('home-continue').click();poor.node('open-map').click();descendants(poor.node('modal-content')).find(n=>n.dataset.location==='plaza').click();const paid=descendants(poor.node('modal-content')).find(n=>n.tagName==='button'&&n.children.some(c=>c.textContent==='社交活动 · 使用唯一主要行动'));assert.ok(paid.disabled);paid.click();assert.equal(poor.storage.get(KEY),JSON.stringify(low));
});
test('原事件待选、学期总结、毕业均可往返地图，不丢待选阶段，不额外写核心',()=>{
 for(const phase of ['event','summary','ending']){const state=fixtures()[phase],raw=JSON.stringify(state),ui=harness(raw,{character:'female'},true);ui.node('home-continue').click();const title=ui.node('modal-content').children.find(n=>n.id==='modal-title').textContent;byText(ui,'查看校园地图 · 自由浏览').click();descendants(ui.node('modal-content')).find(n=>n.dataset.location==='lake').click();assert.ok(descendants(ui.node('modal-content')).filter(n=>n.className==='modal-button').filter(n=>n.children.some(c=>c.textContent.includes('使用唯一主要行动'))).every(n=>n.disabled));byText(ui,'返回校园或原页面').click();assert.equal(ui.node('modal-content').children.find(n=>n.id==='modal-title').textContent,title);assert.equal(ui.storage.get(KEY),raw);}
});
test('地图人物档案、已认识聊天和原故事中心往返保留地点，锁定条件不绕过',()=>{
 const raw=JSON.stringify(v1.freshState()),ui=harness(raw,{character:'male'},true);ui.node('home-continue').click();ui.node('open-map').click();byText(ui,'程乐 · 学生宿舍').click();byText(ui,'查看程乐的档案').click();assert.equal(byText(ui,'程乐').id,'modal-title');byText(ui,'回到校园').click();assert.ok(byText(ui,'同住的日常'));
 byText(ui,'打开和程乐的聊天').click();assert.ok(byText(ui,'程乐'));byText(ui,'回到校园').click();assert.ok(byText(ui,'同住的日常'));assert.equal(ui.storage.get(KEY),raw);
 const locked=descendants(ui.node('modal-content')).find(n=>n.tagName==='button'&&n.textContent.startsWith('程乐 · ')&&n.disabled);assert.ok(locked.disabled);locked.click();assert.deepEqual(JSON.parse(ui.storage.get(R.KEY)).data.story.completed,{});
 byText(ui,'程乐 · 宿舍第一夜').click();assert.equal(byText(ui,'宿舍第一夜').id,'modal-title');byText(ui,'暂时收好，稍后再读').click();byText(ui,'返回校园或原页面').click();assert.ok(byText(ui,'同住的日常'));ui.node('open-phone').click();descendants(ui.node('modal-content')).find(n=>n.tagName==='button'&&n.textContent.startsWith('校园地图 ·')).click();byText(ui,'返回校园或原页面').click();assert.equal(byText(ui,'校园手机').id,'modal-title');
});
test('新游戏明确确认才重置探索，旧局记录不进入新局；脚本缺失有可用回退',()=>{
 const raw=JSON.stringify(v1.freshState()),ui=harness(raw,{character:'male'},true);ui.node('home-continue').click();ui.node('open-map').click();descendants(ui.node('modal-content')).find(n=>n.dataset.location==='dorm').click();const old=JSON.parse(ui.storage.get(R.KEY)).data.runId;byText(ui,'返回校园或原页面').click();ui.node('new-game').click();byText(ui,'确认开始新游戏').click();byText(ui,'以这个身份，开启四年 →').click();const ext=JSON.parse(ui.storage.get(R.KEY)).data;assert.notEqual(ext.runId,old);assert.deepEqual(ext.campus.visitedLocations,[]);
 const absent=harness(raw,{character:'male'},true,null,{omitCampusUI:true});absent.node('home-continue').click();absent.node('open-map').click();assert.match(absent.node('toast').textContent,/地图模块未载入/);assert.equal(absent.storage.get(KEY),raw);
 const noArt=harness(raw,{character:'male'},true,null,{omitCampusArt:true});noArt.node('home-continue').click();noArt.node('open-map').click();assert.ok(byText(noArt,'校园插画暂未载入，可使用下方地点按钮继续探索。'));assert.equal(descendants(noArt.node('modal-content')).filter(n=>n.className==='campus-pin').length,10);
});
test('SVG建筑可点、背景失败保留可用地点界面、动画设置独立保存且复用原音频场景',()=>{
 const raw=JSON.stringify(v1.freshState()),ui=harness(raw,{character:'male'},true);ui.node('home-continue').click();ui.node('open-map').click();
 const building=descendants(ui.node('modal-content')).find(n=>n['data-building']==='library');assert.ok(building);building.click();assert.ok(byText(ui,'书页与日光'));assert.equal(ui.sceneCalls.at(-1),'library');
 const hero=descendants(ui.node('modal-content')).find(n=>n.className==='campus-place-hero'),image=hero.children.find(n=>n.tagName==='img');image.listeners.error();assert.equal(hero.children.some(n=>n.tagName==='img'),false);assert.ok(hero.children.some(n=>n.textContent==='图书馆'));
 const extension=ui.storage.get(R.KEY);descendants(ui.node('modal-content')).find(n=>n.tagName==='button'&&n.textContent.startsWith('环境动画：')).click();assert.equal(JSON.parse(ui.storage.get('university-four-years-visual-v2')).motion,false);assert.equal(ui.storage.get(R.KEY),extension);
 descendants(ui.node('modal-content')).find(n=>n.dataset.location==='lake').click();assert.equal(ui.sceneCalls.at(-1),'campus');assert.equal(ui.storage.get(KEY),raw);
});
