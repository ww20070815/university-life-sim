/* 校园纯逻辑。这里只改 ext.campus，绝不改核心属性、人物关系或剧情选择。 */
(function(root){
  'use strict';
  const node=typeof module!=='undefined'&&module.exports;
  const D=node?require('./campus-data.js'):root.CampusData,N=node?require('./npc-data.js'):root.NPCData;
  if(!D||!N)return;
  const copy=x=>JSON.parse(JSON.stringify(x));
  function time(s){
    const index=s.phase==='summary'?Math.max(0,s.turn-1):Math.min(s.turn,31),term=Math.floor(index/4)+1;
    return {index,year:Math.floor(index/8)+1,term,semester:term%2?1:2,within:index%4,season:['autumn','autumn','winter','winter','spring','spring','summer','summer'][index%8],weather:['sunny','cloudy','overcast','rain','afterRain'][(Math.floor(index/2)+Math.floor(index/8)*2)%5]};
  }
  function fresh(runId){return {schemaVersion:1,runId,visitedLocations:[],discoveredNPCs:[],visits:[],discoveries:[],triggeredEvents:[],completedLocationEvents:{},campusFlags:[],currentLocation:null,activeEvent:null};}
  function reconcile(ext){if(!ext.campus)ext.campus=fresh(ext.runId);}
  function open(s,id){const l=D.byId(id);return !!l&&time(s).term>=l.open.minTerm;}
  function npcPositions(s,ext){
    const t=time(s);return N.NPCS.map(n=>{
      const rule=D.npcRules[n.id],p=ext.npcs[n.id],chapters=ext.story?.people[n.id]?.chapters||0;
      let locationId=rule.locations[(t.year+t.semester+t.within+rule.offset+(p.met?1:0)+Math.floor(p.value/20)+chapters)%rule.locations.length];
      const active=ext.story?.active?.id;
      if(active&&active.startsWith(n.id+'-'))locationId=rule.locations.find(id=>D.byId(id).storyIds.includes(active))||locationId;
      else if(n.id==='zhixia'&&s.lastEvent==='finals')locationId='library';
      else if(n.id==='shenyan'&&['contest','project'].includes(s.lastEvent))locationId='lab';
      else if(n.id==='teacherzhou'&&s.lastEvent==='project')locationId='lab';
      else if(n.id==='chengle'&&s.lastEvent==='sports')locationId='track';
      else if(n.id==='chengle'&&['gaming','conflict'].includes(s.lastEvent))locationId='dorm';
      else if(n.id==='nanqiao'&&s.lastEvent==='club')locationId='club';
      const description=rule.notes[(chapters+t.within)%rule.notes.length]+' '+D.seasons[t.season].line;
      return {id:n.id,locationId,met:p.met,stage:ext.story?.people[n.id]?.stage||'普通认识',description};
    });
  }
  function visit(ext,s,id){
    if(!open(s,id))return {ok:false,reason:'这个地点暂未开放。'};reconcile(ext);const c=ext.campus,before=JSON.stringify(c),t=time(s);c.currentLocation=id;
    if(!c.visits.some(v=>v.locationId===id&&v.term===t.term)){c.visits.push({locationId:id,turn:s.turn,term:t.term});if(!c.visitedLocations.includes(id))c.visitedLocations.push(id);}
    for(const n of npcPositions(s,ext).filter(n=>n.locationId===id))if(!c.discoveredNPCs.includes(n.id)){c.discoveredNPCs.push(n.id);c.discoveries.push({npcId:n.id,locationId:id,turn:s.turn,term:t.term});}
    return {ok:true,changed:before!==JSON.stringify(c)};
  }
  function prerequisites(ext,s,event,{temporal=true,attendance=true}={}){
    const w=event.when,t=time(s),memory=s.phase==='ending';
    if(w.minTerm&&t.term<w.minTerm)return {ok:false,reason:'第 '+w.minTerm+' 学期起可体验。'};
    if(w.actions&&Object.entries(w.actions).some(([id,count])=>s.counts[id]<count))return {ok:false,reason:'先完成相关主要行动：'+Object.entries(w.actions).map(([id,n])=>({study:'认真学习',skill:'技能训练',social:'社交活动',exercise:'健身运动'})[id]+' '+n+' 次').join('、')+'。'};
    if(w.met&&!ext.npcs[w.met]?.met)return {ok:false,reason:'先在人物档案中认识'+N.byId(w.met).name+'。'};
    if(w.previous&&!ext.campus?.completedLocationEvents[w.previous])return {ok:false,reason:'先体验《'+D.event(w.previous).title+'》。'};
    if(temporal&&!memory){
      if(w.minWithin!==undefined&&t.within<w.minWithin)return {ok:false,reason:'本学期后半段可体验。'};
      if(w.seasons&&!w.seasons.includes(t.season))return {ok:false,reason:'适合'+w.seasons.map(k=>D.seasons[k].name).join('、')+'；以后仍可遇见，毕业可回顾。'};
      if(w.weathers&&!w.weathers.includes(t.weather))return {ok:false,reason:'等待'+w.weathers.map(k=>D.weathers[k].name).join('或')+'，毕业也可回顾。'};
    }
    if(attendance&&!memory&&w.here&&!npcPositions(s,ext).some(n=>n.id===w.here&&n.locationId===event.locationId))return {ok:false,reason:N.byId(w.here).name+'今天在别处，可查看地图行踪；人物故事不受此限制。'};
    return {ok:true};
  }
  function canEvent(ext,s,id){
    const event=D.event(id),c=ext.campus;if(!event||!c)return {ok:false,reason:'没有这段地点日常。'};
    if(c.completedLocationEvents[id])return {ok:false,reason:'这段日常已完成，可以只读回看。'};
    if(!open(s,event.locationId))return {ok:false,reason:'地点暂未开放。'};
    const resumed=c.triggeredEvents.some(e=>e.id===id);return prerequisites(ext,s,event,{temporal:!resumed,attendance:!resumed});
  }
  function startEvent(ext,s,id){
    const check=canEvent(ext,s,id);if(!check.ok)return check;
    const event=D.event(id),c=ext.campus;if(c.currentLocation!==event.locationId)return {ok:false,reason:'请先进入'+D.byId(event.locationId).name+'。'};
    if(!c.triggeredEvents.some(e=>e.id===id))c.triggeredEvents.push({id,turn:s.turn,term:time(s).term});c.activeEvent=id;return {ok:true};
  }
  function choose(ext,s,id,choiceId){
    const c=ext.campus,event=D.event(id),choice=event?.options.find(o=>o.id===choiceId);
    if(!c||!choice||c.activeEvent!==id||c.completedLocationEvents[id])return {ok:false,reason:'这段地点日常已记录，或尚未开始。'};
    c.completedLocationEvents[id]={choiceId,turn:s.turn,term:time(s).term,sequence:Object.keys(c.completedLocationEvents).length+1};c.campusFlags.push(id+'#'+choiceId);c.activeEvent=null;
    return {ok:true,result:choice.result};
  }
  function canAct(ext,s,locationId,action){
    if(!open(s,locationId)||ext.campus?.currentLocation!==locationId||!D.byId(locationId).actions.includes(action))return {ok:false,reason:'请先到对应地点选择这里提供的行动。'};
    if(s.phase!=='action'||s.turn>=32)return {ok:false,reason:'主要行动已用，或需要先处理原事件/总结；阅读与探索仍免费。'};return {ok:true};
  }
  function validate(c,ext){
    try{
      if(!c||c.schemaVersion!==1||c.runId!==ext.runId)return null;
      const array=(x,n)=>Array.isArray(x)&&x.length<=n,unique=a=>new Set(a).size===a.length;
      const stamp=r=>r&&Number.isInteger(r.turn)&&r.turn>=0&&r.turn<=32&&Number.isInteger(r.term)&&r.term>=1&&r.term<=8&&(r.term===Math.floor(Math.min(r.turn,31)/4)+1||r.turn>0&&r.turn%4===0&&r.term===r.turn/4);
      if(!array(c.visitedLocations,10)||!array(c.discoveredNPCs,6)||!array(c.visits,80)||!array(c.discoveries,6)||!array(c.triggeredEvents,30)||!array(c.campusFlags,30)||!c.completedLocationEvents||Array.isArray(c.completedLocationEvents)||Object.keys(c.completedLocationEvents).length>30)return null;
      if(!unique(c.visitedLocations)||!c.visitedLocations.every(id=>D.byId(id))||!unique(c.discoveredNPCs)||!c.discoveredNPCs.every(id=>N.byId(id)))return null;
      if(!c.visits.every(v=>stamp(v)&&D.byId(v.locationId))||!unique(c.visits.map(v=>v.term+':'+v.locationId)))return null;
      if(JSON.stringify(c.visitedLocations)!==JSON.stringify([...new Set(c.visits.map(v=>v.locationId))]))return null;
      if(!c.discoveries.every(d=>stamp(d)&&D.npcRules[d.npcId]?.locations.includes(d.locationId)&&c.visits.some(v=>v.locationId===d.locationId&&v.term===d.term&&v.turn<=d.turn))||!unique(c.discoveries.map(d=>d.npcId))||JSON.stringify(c.discoveredNPCs)!==JSON.stringify(c.discoveries.map(d=>d.npcId)))return null;
      if(!c.triggeredEvents.every(t=>stamp(t)&&D.event(t.id)&&c.visits.some(v=>v.locationId===D.event(t.id).locationId&&v.term===t.term&&v.turn<=t.turn))||!unique(c.triggeredEvents.map(t=>t.id)))return null;
      if(c.currentLocation!==null&&(!D.byId(c.currentLocation)||!c.visitedLocations.includes(c.currentLocation)))return null;
      if(c.activeEvent!==null&&(!D.event(c.activeEvent)||!c.triggeredEvents.some(t=>t.id===c.activeEvent)||c.completedLocationEvents[c.activeEvent]))return null;
      const records=Object.entries(c.completedLocationEvents).sort((a,b)=>a[1].sequence-b[1].sequence),flags=[];let last=-1;
      for(const [id,r] of records){
        const e=D.event(id),start=c.triggeredEvents.find(t=>t.id===id);if(!e||!start||!stamp(r)||r.turn<start.turn||r.term<start.term||r.turn<last||r.sequence!==flags.length+1||!e.options.some(o=>o.id===r.choiceId))return null;
        if(e.when.previous&&(!c.completedLocationEvents[e.when.previous]||c.completedLocationEvents[e.when.previous].sequence>=r.sequence))return null;
        flags.push(id+'#'+r.choiceId);last=r.turn;
      }
      if(JSON.stringify(c.campusFlags)!==JSON.stringify(flags))return null;return copy(c);
    }catch{return null;}
  }
  function compatible(ext,s){
    const c=ext.campus;if(!c)return true;const now=time(s);
    if([...c.visits,...c.discoveries,...c.triggeredEvents,...Object.values(c.completedLocationEvents)].some(r=>r.turn>s.turn||r.term>now.term))return false;
    for(const t of c.triggeredEvents)if(!prerequisites(ext,s,D.event(t.id),{temporal:false,attendance:false}).ok)return false;return true;
  }
  const api={fresh,reconcile,time,open,npcPositions,visit,canEvent,startEvent,choose,canAct,validate,compatible};
  if(node)module.exports=api;else root.CampusWorld=api;
})(typeof window!=='undefined'?window:globalThis);
