/* V3.1 人物与声音设置 UI。通过桥接调用现有弹窗，不另建游戏回合。 */
(function(root){
  'use strict';
  function create(bridge){
    const {el,openModal,modalButton,closeModal,renderPhase,getState,store,toast,visual,sound}=bridge;
    let returnTo=null;
    function back(){sound.setScene(bridge.getScene());if(returnTo)returnTo();else{closeModal();renderPhase();}}
    function people(){
      const s=getState(),content=openModal('我们的青春故事 · 人物档案','在校园里，遇见彼此','查看档案不消耗回合。每回合可与一位人物认真交流一次；主要行动仍然只有一次，互动只影响人物关系。');
      if(store.blocked()){
        content.append(el('p','extension-warning',store.warning));
        if(store.mode!=='conflict')content.append(modalButton('为当前旅程重新建立人物记录',()=>{
          const c=openModal('保留原游戏进度','确认重建人物记录？','原核心进度和属性不变。旧扩展会尽量备份到独立键；人物关系、校园手机、故事与校园探索记录会重新建立。请先备份需要保留的旧数据。');
          c.append(modalButton('确认重建当前局人物记录',()=>{if(!store.rebuild(getState()))toast(store.warning);people();}),modalButton('保留原记录，返回',people,true));
        }));
      }
      content.append(el('p','relation-budget',s.turn>=32?'大学旅程已结束 · 可以回看关系与经历':store.data.claimedTurns.includes(s.turn)?'本回合交流已记录 · 下次主要行动结算后再来':'本回合可交流 1 次 · 六位人物共享次数'));
      const list=el('div','npc-list');
      for(const npc of root.NPCData.NPCS){
        const p=store.data.npcs[npc.id],button=el('button','npc-card');
        const seal=el('span','npc-seal',npc.name.slice(-2));seal.style.setProperty('--npc-color',npc.color);
        if(npc.portrait){const image=el('img','npc-portrait');image.src=npc.portrait;image.alt=npc.name+'立绘';image.loading='lazy';image.addEventListener('error',()=>image.remove());seal.append(image);}
        const text=el('span');text.append(el('strong','',npc.name),el('small','',npc.role+' · '+(p.met?root.Relationships.stage(p.value):'尚未相识')));
        button.append(seal,text,el('span','npc-score',p.value+' / 100'));button.addEventListener('click',()=>profile(npc.id));list.append(button);
      }
      content.append(list,modalButton('回到校园',back,true));
    }
    function profile(id){
      const npc=root.NPCData.byId(id),p=store.data.npcs[id],s=getState();
      const content=openModal('人物档案 / '+npc.role,npc.name,npc.background);
      content.append(el('p','npc-traits',`${npc.age} 岁 · ${npc.traits}`),el('p','',`常见地点：${npc.places.join('、')}`),el('p','term-memory',npc.direction));
      content.append(el('p','relation-budget',`${p.met?'已认识':'尚未相识'} · ${root.Relationships.stage(p.value)} · 关系 ${p.value}/100`));
      content.append(el('p','modal-desc',npc.intro));
      const plot=store.data.story?.people[id];if(plot&&root.StoryData){content.append(el('h3','','人物故事 · '+plot.chapters+' / 5 章'),el('p','story-note','叙事关系：'+plot.stage+'；需要真实章节与选择，不由数值自动决定。'));const chapters=el('ol','story-profile-progress');for(const d of root.StoryData.chapters.filter(d=>d.characterId===id))chapters.append(el('li','',d.title+' · '+(store.data.story.completed[d.storyId]?'已完成':store.data.story.active?.id===d.storyId?'进行中':root.CampusStory.eligibility(store.data,s,d.storyId).ok?'已解锁':'未解锁')));content.append(chapters,modalButton('阅读人物故事',()=>bridge.showStories?.(id,null,()=>profile(id)),true));}
      const options=el('div','npc-interactions');
      npc.topics.forEach((topic,index)=>{const check=root.Relationships.canInteract(store.data,s,id,index),gain=Math.min(100-p.value,[4,5,6][index]),button=modalButton(topic+' · '+(gain?'关系 +'+gain:'关系已满'),()=>{
        const result=store.perform(getState(),id,index);if(!result.ok){toast(result.reason);return;}
        const c=openModal('一次认真倾听，成为关系的起点',npc.name+' · '+topic,result.reply);sound.setScene('story');
        sound.effect(result.newMet?'message':result.milestone?'achievement':'confirm',store.data.runId+':friend:'+getState().turn);
        c.append(el('p','term-memory',`关系 +${result.delta} · ${root.Relationships.stage(store.data.npcs[id].value)} ${store.data.npcs[id].value}/100`));
        if(result.milestone)c.classList.add('bond-spark');
        if(!store.persistent)c.append(el('p','extension-warning','存储暂不可用：人物变化只保留在当前页面。'));
        c.append(modalButton('查看人物档案',()=>{sound.setScene(visual.sceneFor(getState()));profile(id);}),modalButton('回到校园',back,true));
      });button.disabled=!check.ok||store.blocked();button.dataset.silent='true';button.title=check.reason||'';if(!check.ok)button.append(el('small','',check.reason));options.append(button);});
      content.append(options);
      if(p.choices.length){const list=el('ol','relationship-history');for(const record of p.choices.slice(-6).reverse())list.append(el('li','',`第 ${record.turn+1} 回合 · ${npc.topics[record.choice]}`));content.append(el('h3','','一起经历的日常'),list);}
      if(!npc.romanceEligible)content.append(el('p','modal-hint',npc.id==='teacherzhou'?'你们发展的是师生指导与信任。':'有些陪伴，是值得珍惜的友情。'));
      content.append(modalButton('返回人物档案列表',people,true),modalButton('回到校园',back,true));
    }
    function audioSettings(){
      const content=openModal('让校园，有自己的声音','声音与音乐','首次进入保持安静。音乐与音效均由你主动开启；轻风可以单独控制。声音设置不影响游戏存档。');
      const status=el('p','audio-status');status.setAttribute('role','status');
      const update=()=>{const s=sound.getStatus();status.textContent=s.status+' 当前场景：《'+s.track+'》。';};
      function control(label,key,volumeKey){
        const s=sound.getStatus().settings,box=el('div','audio-control'),line=el('label','audio-switch'),input=el('input');input.type='checkbox';input.checked=s[key];input.setAttribute('aria-label',label+'开关');line.append(input,el('span','',label));
        input.addEventListener('change',()=>{sound.configure({[key]:input.checked,muted:false});sound.unlock();update();});box.append(line);
        const rangeLabel=el('label','audio-range'),range=el('input'),value=el('output','',Math.round(s[volumeKey]*100)+'%');range.type='range';range.min='0';range.max='100';range.step='1';range.value=String(Math.round(s[volumeKey]*100));range.setAttribute('aria-label',label+'音量');rangeLabel.append(el('span','','音量'),range,value);
        range.addEventListener('input',()=>{const v=Number(range.value);sound.configure({[volumeKey]:v/100});value.textContent=v+'%';update();});box.append(rangeLabel);content.append(box);
      }
      control('背景音乐','music','musicVolume');control('短音效','sfx','sfxVolume');control('轻风环境音','ambient','ambientVolume');
      content.append(status,modalButton('启用本次声音 / 重试播放',()=>{sound.retry();update();}),modalButton('全部静音',()=>{sound.mute();audioSettings();},true));
      const preview=el('div','sound-previews');
      const labels={click:'按钮',confirm:'选项确认',increase:'属性增加',decrease:'属性减少',message:'新消息',achievement:'关系里程碑 / 成就',term:'学期结束',graduation:'毕业完成'};
      for(const [id,label] of Object.entries(labels)){const b=el('button','sound-preview','试听：'+label);b.dataset.silent='true';b.addEventListener('click',()=>{sound.unlock();if(!sound.effect(id))toast('先开启短音效，再试听。');});preview.append(b);}
      content.append(preview,el('p','modal-hint','四首配乐为项目原创的轻柔合成器纯音乐，非真实乐器录音。消息提示已接入校园手机，完整成就系统尚未开放。'),modalButton('恢复默认声音设置（全部关闭）',()=>{sound.resetDefaults();audioSettings();},true),modalButton('返回游戏',()=>{sound.onStatus(null);back();},true));
      sound.onStatus(update);update();
    }
    return {people:()=>{returnTo=null;people();},profile:(id,onBack)=>{returnTo=onBack||null;profile(id);},audioSettings:()=>{returnTo=null;audioSettings();}};
  }
  root.CompanionUI={create};
})(typeof window!=='undefined'?window:globalThis);
