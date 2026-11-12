/* 统一剧情引擎：纯函数只改 ext.story；所有落盘及数值奖励由原关系 store 管理。 */
(function(root){
  'use strict';
  const node=typeof module!=='undefined'&&module.exports;
  const D=node?require('./story-data.js'):root.StoryData,N=node?require('./npc-data.js'):root.NPCData;
  if(!D||!N)return;
  const copy=x=>JSON.parse(JSON.stringify(x)),own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
  const termOf=s=>s.phase==='summary'?s.turn/4:Math.floor(Math.min(s.turn,31)/4)+1;
  function fresh(runId){return {schemaVersion:1,runId,active:null,triggered:[],completed:{},slots:{},flags:[],people:{},partner:null,rewards:[],queue:[]};}
  const records=story=>Object.entries(story.completed).sort((a,b)=>a[1].sequence-b[1].sequence);
  function choicesFor(ext,npc){return records(ext.story).filter(([id])=>D.byId(id).characterId===npc).map(([id,r])=>({chapter:D.byId(id),record:r,choice:D.byId(id).choices.find(c=>c.id===r.choiceId)}));}
  function derive(story){
    const people=Object.fromEntries(N.NPCS.map(n=>[n.id,{stage:'普通认识',route:'friend',ending:null,trust:0,depth:0,chapters:0}]));let partner=null;const flags=[],rewards=[];
    for(const [id,r] of records(story)){
      const d=D.byId(id),choice=d.choices.find(c=>c.id===r.choiceId),p=people[d.characterId];p.chapters++;p.trust++;
      if(['support','collaborate','interest','romance'].includes(choice.approach))p.depth++;
      if(choice.approach==='interest')p.route='interested';
      if(d.chapterId===4&&choice.approach==='romance'){partner=d.characterId;p.route='dating';}
      if(d.chapterId===4&&choice.approach!=='romance')p.route='friend';
      if(d.chapterId===5){
        p.ending=choice.approach==='romance'?'romance':choice.approach==='bond'&&p.depth>=3?'bond':'friend';
        if(p.ending!=='romance'){if(partner===d.characterId)partner=null;p.route='friend';}
      }
      p.stage=p.route==='dating'?'特殊关系':p.chapters>=3&&p.depth>=2?'深厚羁绊':p.chapters>=2?'彼此信任':'逐渐熟悉';
      flags.push(id+'#'+choice.flag);if(r.rewarded)rewards.push(id);
    }
    return {people,partner,flags,rewards};
  }
  function reconcile(ext,s){
    if(!ext.story)ext.story=fresh(ext.runId);
    const t=ext.story,before=JSON.stringify(t);Object.assign(t,derive(t));
    t.queue=D.chapters.filter(d=>!own(t.completed,d.storyId)&&eligibility(ext,s,d.storyId).ok).sort((a,b)=>priority(ext,s,b)-priority(ext,s,a)||a.storyId.localeCompare(b.storyId)).map(d=>d.storyId);
    return {changed:before!==JSON.stringify(t)};
  }
  function priority(ext,s,d){return d.priority+(ext.story.people[d.characterId]?.chapters||0)*4+(d.actions.includes(s.lastAction)?3:0)+(ext.npcs[d.characterId]?.value||0)/100;}
  function eligibility(ext,s,id){
    const d=D.byId(id),t=ext.story;if(!d||!t)return {ok:false,reason:'剧情资料尚未载入。'};
    if(!ext.npcs[d.characterId]?.met)return {ok:false,reason:'先在人物档案中认识这位人物。'};
    if(d.previous&&!own(t.completed,d.previous))return {ok:false,reason:'先完成上一章《'+D.byId(d.previous).title+'》。'};
    if(s.turn<d.minTurn||termOf(s)<d.minTerm)return {ok:false,reason:('第 '+d.minTerm+' 学期起开放；错过后可补读。')};
    if(d.chapterId===5&&s.phase!=='ending')return {ok:false,reason:'先完成原大学旅程并拆开毕业信。'};
    const p=t.people[d.characterId];
    if(ext.npcs[d.characterId].value<d.minRelation&&(p?.trust||0)<d.trustAlternative)return {ok:false,reason:'需要关系 '+d.minRelation+'，或通过前章建立剧情信任。'};
    if(d.actionCount&&d.actions.length&&!d.actions.some(a=>s.counts[a]>=d.actionCount))return {ok:false,reason:'需要相关主要行动至少 '+d.actionCount+' 次：'+d.actions.join(' / ').replace(/study/g,'认真学习').replace(/skill/g,'技能训练').replace(/social/g,'社交活动').replace(/work/g,'校园兼职').replace(/exercise/g,'健身运动').replace(/relax/g,'娱乐放松').replace(/rest/g,'好好休息')+'。'};
    if(d.chatFlagsAny.length&&!d.chatFlagsAny.some(f=>ext.phone?.flags.includes(f)))return {ok:false,reason:'先在校园手机回复这位人物的第一组日常；普通回复也可以。'};
    return {ok:true};
  }
  function canStart(ext,s,id){
    const t=ext.story;if(t?.completed[id])return {ok:false,reason:'本章已完成，可以回看记录。'};
    const check=eligibility(ext,s,id);if(!check.ok)return check;
    if(!['action','ending'].includes(s.phase))return {ok:false,reason:'先处理原校园事件或学期总结，再来阅读。'};
    if(t.active&&t.active.id!==id)return {ok:false,reason:'先完成或暂时收好正在阅读的章节。'};
    if(s.turn<32&&t.slots[s.turn]&&t.slots[s.turn]!==id)return {ok:false,reason:'本回合已经展开一段人物故事。完成主要行动后再来，或毕业后回顾补读。'};
    return {ok:true};
  }
  function canChoose(ext,s,id,choiceId){
    const check=canStart(ext,s,id);if(!check.ok)return check;
    if(ext.story.active?.id!==id)return {ok:false,reason:'请先打开这一章。'};
    const d=D.byId(id),choice=d.choices.find(c=>c.id===choiceId);if(!choice)return {ok:false,reason:'没有这个剧情选项。'};
    if(['interest','romance'].includes(choice.approach)&&!N.byId(d.characterId).romanceEligible)return {ok:false,reason:'这位人物只发展友情或师生指导。'};
    if(choice.approach==='romance'){
      const p=ext.story.people[d.characterId];
      if(!N.byId(d.characterId).romanceEligible)return {ok:false,reason:'这位人物只发展友情或师生指导。'};
      if(d.chapterId===4){
        if(p.route!=='interested'||p.depth<2||ext.npcs[d.characterId].value<60)return {ok:false,reason:'需要第三章明确表达兴趣、真实信任及关系至少 60；也可以完整选择友情。'};
        if(ext.story.partner&&ext.story.partner!==d.characterId)return {ok:false,reason:'已有确认的恋爱关系，请尊重彼此的约定。'};
      }else if(d.chapterId===5&&ext.story.partner!==d.characterId)return {ok:false,reason:'需要在第四章由双方明确确认关系。'};
    }
    return {ok:true,choice,chapter:d};
  }
  function start(ext,s,id){const check=canStart(ext,s,id);if(!check.ok)return check;const t=ext.story;if(!t.triggered.includes(id))t.triggered.push(id);t.active={id,turn:s.turn};if(s.turn<32)t.slots[s.turn]=id;return {ok:true};}
  function defer(ext,s){if(!ext.story?.active)return {ok:false,reason:'没有正在阅读的章节。'};ext.story.active=null;reconcile(ext,s);return {ok:true};}
  function complete(ext,s,id,choiceId,reward=null){
    const check=canChoose(ext,s,id,choiceId);if(!check.ok)return check;
    const t=ext.story;if(s.turn<32)t.slots[s.turn]=id;
    t.completed[id]={choiceId,turn:s.turn,sequence:Object.keys(t.completed).length+1,rewarded:!!reward,delta:reward?.delta||0};t.active=null;reconcile(ext,s);
    return {ok:true,result:check.choice.result,flag:id+'#'+check.choice.flag,ending:t.people[check.chapter.characterId].ending};
  }
  function validate(raw,ext){
    try{
      if(!raw||raw.schemaVersion!==1||raw.runId!==ext.runId||!raw.completed||Array.isArray(raw.completed)||Object.keys(raw.completed).length>30||!raw.slots||Array.isArray(raw.slots)||Object.keys(raw.slots).length>32)return null;
      const ids=a=>Array.isArray(a)&&a.length<=30&&new Set(a).size===a.length&&a.every(id=>!!D.byId(id));
      if(!ids(raw.triggered)||!ids(raw.queue)||!Array.isArray(raw.flags)||raw.flags.length>30||!ids(raw.rewards))return null;
      if(raw.active!==null&&(!raw.active||!D.byId(raw.active.id)||!Number.isInteger(raw.active.turn)||raw.active.turn<0||raw.active.turn>32||!raw.triggered.includes(raw.active.id)||raw.completed[raw.active.id]))return null;
      for(const [turn,id] of Object.entries(raw.slots))if(!/^(?:[0-9]|[12]\d|3[01])$/.test(turn)||!D.byId(id)||D.byId(id).chapterId===5||Number(turn)<D.byId(id).minTurn||!raw.triggered.includes(id))return null;
      const seen=new Set(),rewardTurns=new Set(),depth={};let partner=null,lastTurn=-1;
      for(const [id,r] of records(raw)){
        const d=D.byId(id),choice=d?.choices.find(c=>c.id===r?.choiceId);
        if(!d||!choice||r.sequence!==seen.size+1||!Number.isInteger(r.turn)||r.turn<d.minTurn||r.turn>32||r.turn<lastTurn||typeof r.rewarded!=='boolean'||!Number.isInteger(r.delta)||r.delta<0||r.delta>6||!raw.triggered.includes(id)||!ext.npcs[d.characterId]?.met)return null;
        if(d.previous&&!seen.has(d.previous))return null;
        if(d.chapterId===5&&r.turn!==32||r.turn<32&&raw.slots[r.turn]!==id)return null;
        if(r.rewarded){if(r.turn===32||rewardTurns.has(r.turn)||!ext.interactions.some(x=>x.turn===r.turn&&x.npc===d.characterId&&x.choice===choice.rewardIndex&&x.delta===r.delta))return null;rewardTurns.add(r.turn);}else if(r.delta!==0)return null;
        if(choice.approach==='interest'&&!N.byId(d.characterId).romanceEligible)return null;
        if(choice.approach==='romance'){
          if(!N.byId(d.characterId).romanceEligible||ext.npcs[d.characterId].value<60)return null;
          if(d.chapterId===4){const prior=raw.completed[d.characterId+'-3'],prevChoice=prior&&D.byId(d.characterId+'-3').choices.find(c=>c.id===prior.choiceId);if(prevChoice?.approach!=='interest'||(depth[d.characterId]||0)<2||partner&&partner!==d.characterId)return null;partner=d.characterId;}
          else if(d.chapterId!==5||partner!==d.characterId)return null;
        }
        if(d.chapterId===5&&choice.approach!=='romance'&&partner===d.characterId)partner=null;
        if(['support','collaborate','interest','romance'].includes(choice.approach))depth[d.characterId]=(depth[d.characterId]||0)+1;
        seen.add(id);lastTurn=r.turn;
      }
      const projected=derive(raw);for(const key of ['people','partner','flags','rewards'])if(JSON.stringify(raw[key])!==JSON.stringify(projected[key]))return null;
      return copy(raw);
    }catch{return null;}
  }
  function compatible(ext,s){
    const t=ext.story;if(!t)return true;
    if(t.active&&t.active.turn>s.turn||Object.keys(t.slots).some(turn=>Number(turn)>Math.min(s.turn,31))||t.triggered.some(id=>!eligibility(ext,s,id).ok))return false;
    for(const [id,r] of records(t))if(r.turn>s.turn||!eligibility(ext,s,id).ok)return false;
    return true;
  }
  function echo(ext,id){const d=D.byId(id);if(!d?.previous)return '';const r=ext.story.completed[d.previous],choice=r&&D.byId(d.previous).choices.find(c=>c.id===r.choiceId);return choice?(d.echo[choice.approach]||d.echo.space||''):'';}
  function followup(ext,id){const d=D.byId(id),r=ext.story?.completed[id],choice=r&&d.choices.find(c=>c.id===r.choiceId);return choice?(D.followups[d.characterId][choice.approach]||D.followups[d.characterId].space):'';}
  function ending(ext,npc){const p=ext.story?.people[npc];if(!p?.ending)return null;const d=D.endings[npc]?.[p.ending];if(!d)return null;const fourth=ext.story.completed[npc+'-4'],choice=fourth&&D.byId(npc+'-4').choices.find(c=>c.id===fourth.choiceId),fifth=ext.story.completed[npc+'-5'],resolution=fifth&&D.byId(npc+'-5').choices.find(c=>c.id===fifth.choiceId);return {...d,kind:p.ending,npc,afterword:choice?.result||'',resolution:resolution?.result||''};}
  const api={fresh,reconcile,eligibility,canStart,canChoose,start,defer,complete,validate,compatible,echo,ending,followup,choicesFor};
  if(node)module.exports=api;else root.CampusStory=api;
})(typeof window!=='undefined'?window:globalThis);
