/* 故事中心与阅读器。浏览历史不调用命令；开始/推迟/选择才走统一存档入口。 */
(function(root){
  'use strict';
  function create(bridge){
    const {el,openModal,modalButton,closeModal,renderPhase,getState,getScene,store,sound,toast}=bridge;
    const S=root.CampusStory,D=root.StoryData,N=root.NPCData;
    let selected=null,returnTo=null;
    const ext=()=>store.data;
    function command(value){const result=store.storyCommand(getState(),value);if(!result.ok)toast(result.reason);else if(!store.persistent)toast('存储暂不可用，故事只保留在本页。');return result;}
    function back(){sound?.setScene(getScene());if(returnTo)returnTo();else{closeModal();renderPhase();}}
    function frame(title,desc,reader=false){
      const content=openModal('青春故事与人物羁绊',title,desc);content.parentElement.dataset.kind=reader?'story-reader':'story-center';if(reader&&bridge.layer)bridge.layer.dataset.storyReader='true';
      if(store.blocked()){content.append(el('p','extension-warning',store.warning),modalButton('返回',back,true));return null;}
      if(!store.persistent)content.append(el('p','extension-warning','暂时无法持久保存，刷新可能丢失本页的新选择。'));
      return content;
    }
    function center(){
      sound?.setScene(getScene());selected=null;const c=frame('我们的青春故事','每回合最多展开一段主要人物故事；阅读与普通选择不消耗回合。错过后可补读，毕业后可按前置回顾。');if(!c)return;
      if(ext().story.active){const d=D.byId(ext().story.active.id);c.append(modalButton('继续阅读 · '+d.title,()=>begin(d.storyId)));}
      const pending=ext().story.queue.filter(id=>!ext().story.completed[id]);
      c.append(el('p','relation-budget',getState().phase==='ending'?'毕业回顾 · 不新增回合或关系数值':'待处理 '+pending.length+' 段 · 原校园事件与学期总结优先'));
      if(pending.length){const box=el('div','story-recommendations');for(const id of pending.slice(0,3)){const d=D.byId(id),b=modalButton(N.byId(d.characterId).name+' · '+d.title,()=>begin(id),true);box.append(b);}c.append(box);}
      const grid=el('div','story-people');for(const n of N.NPCS){const p=ext().story.people[n.id],card=el('button','story-person');card.append(seal(n,'calm'),el('strong','',n.name),el('small','',n.role),el('span','',p.chapters+' / 5 章 · '+p.stage));card.addEventListener('click',()=>person(n.id));grid.append(card);}c.append(grid,modalButton('返回校园或原页面',back,true));
    }
    function seal(n,emotion){
      const node=el('div','story-seal',n.name);node.style.setProperty('--npc-color',n.color);
      const asset=n.portraits?.[emotion]||n.portrait;
      if(asset){const image=el('img','story-portrait');image.src=asset;image.alt=n.name+' · '+({calm:'平静',happy:'开心',tired:'疲惫',sad:'沮丧'})[emotion];image.addEventListener('error',()=>image.remove());node.append(image);}return node;
    }
    function person(id){
      selected=id;sound?.setScene(getScene());const n=N.byId(id),p=ext().story.people[id],c=frame(n.name+'的故事',n.role+' · 叙事关系：'+p.stage+' · 原关系 '+ext().npcs[id].value+'/100');if(!c)return;
      c.append(el('p','story-note','叙事关系来自真实章节与选择，不会因为关系数值达到100就自动完成。'+(n.romanceEligible?'友情可以完整通关；恋爱需要明确选择、双方同意和前置。':'本人物仅发展友情或师生指导。')));
      const list=el('div','story-chapters');for(const d of D.chapters.filter(d=>d.characterId===id)){
        const r=ext().story.completed[d.storyId],active=ext().story.active?.id===d.storyId,check=S.canStart(ext(),getState(),d.storyId),eligible=S.eligibility(ext(),getState(),d.storyId);
        const b=el('button','story-chapter');b.append(el('strong','',`第 ${d.chapterId} 章 · ${d.title}`),el('span','',r?'已完成 · 回看':active?'进行中 · 续读':eligible.ok?'已解锁 · '+(check.ok?'可阅读':'待处理'):'未解锁'));
        if(!r&&!check.ok)b.append(el('small','',check.reason));b.addEventListener('click',()=>r?reader(d.storyId,true):begin(d.storyId));b.disabled=!r&&!check.ok;list.append(b);
      }c.append(list);
      const history=S.choicesFor(ext(),id);if(history.length){c.append(el('h3','','关键选择记录'));const list=el('ol','story-history');for(const x of history)list.append(el('li','',x.chapter.title+' · '+x.choice.label+'（'+(x.record.turn===32?'毕业回顾':'第 '+(x.record.turn+1)+' 回合')+'）'));c.append(list);}
      const ending=S.ending(ext(),id);if(ending)c.append(el('h3','',ending.name),el('p','story-ending',ending.text),el('p','term-memory',ending.resolution));
      c.append(modalButton('‹ 返回故事中心',center,true),modalButton('返回校园或原页面',back,true));
    }
    function begin(id){const r=command({type:'start',id});if(r.ok)reader(id,false);else if(selected)person(selected);else center();}
    function reader(id,history){
      const d=D.byId(id),n=N.byId(d.characterId),record=ext().story.completed[id],c=frame(d.title,`${n.name} · 第 ${d.chapterId} 章 · ${history?'已完成记录':getState().phase==='ending'?'毕业回顾补读':'正在阅读'}`,true);if(!c)return;
      sound?.setScene(d.chapterId===5?'graduation':'story');
      const layout=el('div','story-layout'),art=el('div','story-visual'),bg=el('img','story-background');bg.src='./assets/backgrounds/'+d.scene+'.webp';bg.alt='校园故事场景';bg.addEventListener('error',()=>bg.remove());art.append(bg,seal(n,d.emotion),el('small','story-emotion',({calm:'平静',happy:'开心',tired:'疲惫',sad:'沮丧'})[d.emotion]+' · 姓名印记 / 立绘素材待补充'));
      const prose=el('article','story-prose'),echo=S.echo(ext(),id);if(echo)prose.append(el('p','story-echo',echo));for(const text of d.paragraphs)prose.append(el('p','',text));for(const line of d.dialogue){const speech=el('blockquote','story-dialogue');speech.append(el('strong','',N.byId(line.speaker).name),el('p','',line.text));prose.append(speech);}layout.append(art,prose);c.append(layout);
      if(history){const choice=d.choices.find(v=>v.id===record.choiceId);c.append(el('h3','','当时的选择'),el('p','term-memory',choice.label),el('p','story-result',choice.result),el('p','story-note','已保存的历史只读，回看不占故事次数，也不会重复领奖。'),modalButton('返回人物故事',()=>person(n.id),true),modalButton('返回校园或原页面',back,true));return;}
      let withReward=false;const rewardLabel=el('label','story-reward'),checkbox=el('input');checkbox.type='checkbox';checkbox.checked=false;checkbox.setAttribute('aria-label','使用本回合关系交流奖励');
      const shared=root.Relationships.canInteract(ext(),getState(),n.id,0);checkbox.disabled=!shared.ok;rewardLabel.append(checkbox,el('span','','使用本回合关系交流奖励（可选，与聊天/档案共享次数）'));c.append(rewardLabel);
      if(!shared.ok)c.append(el('p','story-note',shared.reason+' 剧情普通选择仍可继续。'));
      const options=el('div','story-options'),updates=[];
      for(const choice of d.choices){
        const button=modalButton('',()=>{const result=command({type:'choose',id,choiceId:choice.id,reward:withReward});if(!result.ok){reader(id,!!ext().story.completed[id]);return;}sound?.effect('confirm',ext().runId+':story:'+id);outcome(d,choice,result);});button.dataset.silent='true';const label=el('strong','',choice.label),hint=el('small');button.append(label,hint);
        function update(){const eligibility=S.canChoose(ext(),getState(),id,choice.id),reward=withReward?root.Relationships.canInteract(ext(),getState(),n.id,choice.rewardIndex):{ok:true};button.disabled=!eligibility.ok||!reward.ok;hint.textContent=!eligibility.ok?eligibility.reason:!reward.ok?reward.reason:withReward?'关系 +'+Math.min(100-ext().npcs[n.id].value,[4,5,6][choice.rewardIndex])+' · 使用共享交流次数':'保存这一选择 · 不增加回合或原属性';}updates.push(update);update();options.append(button);
      }
      checkbox.addEventListener('change',()=>{withReward=checkbox.checked;updates.forEach(fn=>fn());});c.append(options,modalButton('暂时收好，稍后再读',()=>{if(command({type:'defer'}).ok)person(n.id);},true));
    }
    function outcome(d,choice,result){const c=frame('这一页，已成为你们的经历',N.byId(d.characterId).name+' · '+d.title);if(!c)return;c.classList.add('choice-confirmed');c.append(el('p','term-memory',choice.label),el('p','story-result',result.result));const record=ext().story.completed[d.storyId];c.append(el('p','story-note',record.rewarded?'关系 +'+record.delta+'，本回合的共享交流已记录。':'这次选择没有改变原属性或回合。'));
      const end=S.ending(ext(),d.characterId);if(end)c.append(el('h3','',end.name),el('p','story-ending',end.text));const next=D.byId(d.characterId+'-'+(d.chapterId+1));if(next){const status=S.eligibility(ext(),getState(),next.storyId);c.append(el('p','story-note','下一章《'+next.title+'》：'+(status.ok?'条件已满足，可在下回合或毕业回顾中继续。':status.reason)));}c.append(modalButton('查看人物故事与下一章',()=>person(d.characterId)),modalButton('返回校园或原页面',back,true));}
    function appendGraduation(content){
      if(store.blocked())return;const unlocked=N.NPCS.map(n=>S.ending(ext(),n.id)).filter(Boolean);
      content.append(el('h3','','人物关系与毕业番外'));if(!unlocked.length)content.append(el('p','story-note','基础毕业结局已完整保留。人物番外可在完成前置后阅读；没有人物路线也可以正常毕业。'));
      for(const end of unlocked)content.append(el('h3','',N.byId(end.npc).name+' · '+end.name),el('p','story-ending',end.text),el('p','term-memory',end.afterword),el('p','story-result',end.resolution));
      content.append(modalButton('打开人物毕业故事',()=>open(null,null,()=>{closeModal();renderPhase();}),true));
    }
    function open(npc=null,id=null,onBack=null){returnTo=onBack;store.refreshPhone(getState());selected=npc;if(store.blocked()){center();return;}if(id){if(ext().story.completed[id])reader(id,true);else begin(id);}else if(npc)person(npc);else center();}
    return {open,appendGraduation};
  }
  root.StoryUI={create};
})(typeof window!=='undefined'?window:globalThis);
