/* 校园地图与地点界面。渲染只读；访问、开始/选择事件均交给既有关系store。 */
(function(root){
  'use strict';
  function create(bridge){
    const {el,openModal,modalButton,closeModal,renderPhase,getState,getScene,store,toast,sound}=bridge;
    const C=root.CampusWorld,D=root.CampusData,N=root.NPCData;let selected=null,returnTo=null,cachedArt=null;
    const ext=()=>store.data;
    function action(command){const result=store.campusCommand(getState(),command);if(!result.ok)toast(result.reason);else if(!store.persistent)toast('存储暂不可用，探索变化只保留在本页。');return result;}
    function back(){sound?.setScene(getScene());if(returnTo)returnTo();else{closeModal();renderPhase();}}
    function frame(title,desc){const c=openModal('我的大学校园 / 自由探索',title,desc);c.parentElement.dataset.kind='campus';if(store.blocked()){c.append(el('p','extension-warning',store.warning),modalButton('返回原页面',back,true));return null;}if(!store.persistent)c.append(el('p','extension-warning','探索记录暂时只能保存在本页，刷新可能丢失新变化。'));return c;}
    function labels(c){const t=C.time(getState()),line=el('div','campus-status');line.append(el('strong','',getState().phase==='ending'?'毕业回顾':['大一','大二','大三','大四'][t.year-1]+' · 第'+(t.semester===1?'一':'二')+'学期'),el('span','',D.seasons[t.season].name+' · '+D.weathers[t.weather].name),el('span','','已访问 '+ext().campus.visitedLocations.length+' / 10'));c.append(line);}
    function go(id){if(action({type:'visit',id}).ok){selected=id;map();if(root.matchMedia?.('(max-width:767px)').matches)root.requestAnimationFrame(()=>bridge.document.getElementById('campus-place-detail')?.scrollIntoView?.({block:'start',behavior:'auto'}));}}
    function contact(npc){bridge.showProfile(npc,()=>go(selected));}
    function story(id){const d=root.StoryData.byId(id);bridge.showStories(d.characterId,id,()=>go(selected));}
    function map(){
      const c=frame('我的大学校园','点击建筑与步道进入地点。访问、查看人物和地点日常不消耗主要行动；标注的成长行动仍占原回合。');if(!c)return;labels(c);
      const t=C.time(getState()),world=el('div','campus-world');world.dataset.season=t.season;world.dataset.weather=t.weather;
      const board=el('div','campus-map');board.setAttribute('aria-label','十个可探索的校园地点');
      if(root.CampusArt){if(!cachedArt)cachedArt=[root.CampusArt.render(bridge.document,false,go),root.CampusArt.render(bridge.document,true,go)];board.append(...cachedArt);}else board.append(el('p','campus-art-fallback','校园插画暂未载入，可使用下方地点按钮继续探索。'));
      const fx=el('div','campus-weatherfx');fx.setAttribute('aria-hidden','true');board.append(fx);
      const positions=C.npcPositions(getState(),ext());
      for(const l of D.locations){const b=el('button','campus-pin');b.dataset.location=l.id;b.setAttribute('aria-label','进入'+l.name);b.setAttribute('aria-pressed',String(selected===l.id));for(const [key,v] of Object.entries({'--map-x':l.wide[0]+'%','--map-y':l.wide[1]+'%','--phone-x':l.portrait[0]+'%','--phone-y':l.portrait[1]+'%'}))b.style.setProperty(key,v);
        const npcs=positions.filter(n=>n.locationId===l.id);b.append(el('strong','',l.name),el('small','',npcs.length?'可遇见 '+npcs.length+' 人':ext().campus.visitedLocations.includes(l.id)?'已访问':'去看看'));b.addEventListener('click',()=>go(l.id));board.append(b);
      }
      const detail=el('section','campus-detail');detail.id='campus-place-detail';detail.setAttribute('aria-label','校园地点详情');
      if(selected)location(detail,D.byId(selected),positions);else detail.append(el('h3','','校园不只有一条路'),el('p','',D.seasons[t.season].line+' '+D.weathers[t.weather].line),el('p','campus-note','先选择一处建筑或步道。下面的行踪提示可以带你找到人物；见过某人不等于已经相识，不会自动增加关系。'));
      world.append(board,detail);c.append(world);
      c.append(el('h3','','此刻的校园行踪'));const people=el('div','campus-routes');for(const n of positions){const b=el('button','campus-route',N.byId(n.id).name+' · '+D.byId(n.locationId).name);b.addEventListener('click',()=>go(n.locationId));people.append(b);}c.append(people);
      const settings=bridge.visual.getSettings();c.append(modalButton('查看校园探索记录',records,true),modalButton('环境动画：'+(settings.motion?'开启':'关闭')+'（与原动画设置同步）',()=>{bridge.visual.toggleMotion();map();},true),modalButton('返回校园或原页面',back,true));
      sound?.setScene(selected==='library'?'library':getState().phase==='ending'?'graduation':'campus');
    }
    function location(box,l,positions){
      const t=C.time(getState()),hero=el('div','campus-place-hero');hero.dataset.location=l.id;hero.dataset.weather=t.weather;const image=el('img');image.src=l.background;image.alt=l.name+'的校园氛围背景';image.loading='lazy';image.decoding='async';image.addEventListener('error',()=>image.remove());hero.append(image,el('div','campus-weatherfx'),el('span','campus-place-title',l.name));box.append(hero,el('h3','',l.theme),el('p','campus-intro',l.intro),el('p','campus-note',D.seasons[t.season].line+' '+D.weathers[t.weather].line));
      box.append(el('h3','','在这里遇见'));const here=positions.filter(n=>n.locationId===l.id);for(const n of here){const npc=N.byId(n.id),card=el('div','campus-npc'),stamp=el('span','npc-seal',npc.name.slice(-2));stamp.style.setProperty('--npc-color',npc.color);card.append(stamp,el('strong','',npc.name),el('p','',n.description),el('small','campus-note',n.met?'已认识 · '+n.stage:'尚未认识，查看档案后可按原次数交流'),modalButton('查看'+npc.name+'的档案',()=>contact(n.id),true));box.append(card);}if(!here.length)box.append(el('p','campus-note','此刻没有熟悉的人在这里。人物行踪可在地图下方查找，已解锁故事不会因此消失。'));
      for(const n of here.filter(n=>n.met))box.append(modalButton('打开和'+N.byId(n.id).name+'的聊天',()=>bridge.showChat(n.id,()=>go(l.id)),true));
      box.append(el('h3','','地点日常 · 免费体验'));for(const e of D.events.filter(e=>e.locationId===l.id)){
        const done=ext().campus.completedLocationEvents[e.id],check=C.canEvent(ext(),getState(),e.id),button=modalButton(e.title+(done?' · 已记录':ext().campus.triggeredEvents.some(t=>t.id===e.id)?' · 续读':' · 去看看'),()=>done?event(e.id,true):begin(e.id),true);button.disabled=!done&&!check.ok;if(!done&&!check.ok)button.append(el('small','campus-lock',check.reason));box.append(button);
      }
      box.append(el('p','campus-note','地点日常只记录选择，不发放属性、金钱、物品或关系收益，也不代替正式学习、运动和竞赛。'));
      box.append(el('h3','','在这里安排本回合'));for(const id of l.actions){const d=bridge.actions.find(a=>a.id===id),check=C.canAct(ext(),getState(),l.id,id),b=modalButton('',()=>{bridge.performAction(l.id,id);});b.dataset.silent='true';b.classList.add('campus-action');b.append(el('strong','',d.name+' · 使用唯一主要行动'),el('small','',bridge.effectsText(d.effects)));b.disabled=!check.ok||!bridge.affordable(d.effects);if(b.disabled)b.append(el('small','campus-lock',!check.ok?check.reason:'余额不足'));box.append(b);}
      box.append(el('h3','','相关人物故事'));for(const id of l.storyIds){const d=root.StoryData?.byId(id);if(!d)continue;const complete=ext().story?.completed[id],check=root.CampusStory?.canStart(ext(),getState(),id),b=modalButton(N.byId(d.characterId).name+' · '+d.title+(complete?' · 回看':''),()=>story(id),true);b.disabled=!complete&&!check?.ok;if(b.disabled)b.append(el('small','campus-lock',check?.reason||'故事模块暂未载入。'));box.append(b);}box.append(el('p','campus-note','沿用原人物章节与恋爱前置；人物不在此处时也可由故事中心继续。'),modalButton('返回校园地图',()=>{selected=null;map();},true));
    }
    function begin(id){if(action({type:'start',id}).ok)event(id,false);}
    function event(id,history){
      const e=D.event(id),r=ext().campus.completedLocationEvents[id],c=frame(e.title,D.byId(e.locationId).name+' · '+(history?'已记录的地点日常':getState().phase==='ending'?'校园回顾 · 无数值奖励':'地点日常 · 免费，不推进回合'));if(!c)return;
      for(const p of e.text)c.append(el('p','campus-event-prose',p));
      if(history){const choice=e.options.find(o=>o.id===r.choiceId);c.append(el('p','term-memory',choice.label),el('p','campus-event-result',choice.result),el('p','campus-note','只读回看，不会重复记录或发放收益。'));}
      else for(const choice of e.options){const b=modalButton(choice.label,()=>{const result=action({type:'choose',id,choiceId:choice.id});if(result.ok){sound?.effect('confirm',ext().runId+':campus:'+id);const outcome=frame('一段校园日常，已记下',e.title);if(!outcome)return;outcome.classList.add('choice-confirmed');outcome.append(el('p','term-memory',choice.label),el('p','campus-event-result',result.result),el('p','campus-note','原属性、关系、金钱和回合保持不变。'),modalButton('回到这个地点',()=>go(e.locationId)),modalButton('返回校园或原页面',back,true));}else if(ext().campus.completedLocationEvents[id])event(id,true);});b.dataset.silent='true';c.append(b);}
      c.append(modalButton(history?'返回这个地点':'暂时收好，返回地点',()=>{if(!history)action({type:'defer'});go(e.locationId);},true),modalButton('返回校园或原页面',back,true));
    }
    function records(){const c=frame('我的校园足迹','探索只是生活的一部分，不是毕业考核；没有强制全收集要求。');if(!c)return;labels(c);const data=ext().campus,t=C.time(getState());
      for(const l of D.locations){const b=modalButton(l.name+' · '+(data.visitedLocations.includes(l.id)?'已访问':'尚未访问'),()=>go(l.id),true);c.append(b);}
      c.append(el('h3','','已解锁场景'),el('p','campus-note',data.visitedLocations.map(id=>D.byId(id).name).join('、')||'还没有实地打开场景。'),el('h3','','曾经遇见的人'),el('p','campus-note',data.discoveredNPCs.map(id=>N.byId(id).name).join('、')||'访问地点后会记下见过的人，不自动变成好友。'),el('h3','','本学期足迹'));
      const current=data.visits.filter(v=>v.term===t.term);c.append(el('p','campus-note',current.map(v=>D.byId(v.locationId).name).join('、')||'本学期尚未记录访问。'),el('h3','','已完成的地点日常'));
      for(const [id,r] of Object.entries(data.completedLocationEvents).sort((a,b)=>a[1].sequence-b[1].sequence)){const b=modalButton(D.event(id).title+' · 第'+r.term+'学期',()=>event(id,true),true);c.append(b);}if(!Object.keys(data.completedLocationEvents).length)c.append(el('p','campus-note','还没有完成地点日常。遇见合适的时机再慢慢读。'));
      if(data.activeEvent)c.append(modalButton('继续未读完的地点日常',()=>event(data.activeEvent,false)));c.append(modalButton('返回校园地图',map,true),modalButton('返回校园或原页面',back,true));
    }
    function open(onBack=null){returnTo=onBack;store.refreshPhone(getState());selected=ext().campus?.currentLocation||null;map();}
    return {open};
  }
  root.CampusUI={create};
})(typeof window!=='undefined'?window:globalThis);
