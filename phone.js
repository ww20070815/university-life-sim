/* 手机纯逻辑：只修改 ext.phone；关系收益交给 relationships.js，绝不修改核心规则。 */
(function(root){
  'use strict';
  const node=typeof module!=='undefined'&&module.exports;
  const D=node?require('./phone-data.js'):root.PhoneData,N=node?require('./npc-data.js'):root.NPCData;
  const Story=node?require('./story.js'):root.CampusStory,Stories=node?require('./story-data.js'):root.StoryData;
  if(!D||!N)return; // 部分脚本加载失败时保留原游戏，不初始化不完整的手机模块。
  const copy=x=>JSON.parse(JSON.stringify(x));
  const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
  const termOf=s=>s.phase==='summary'?s.turn/4:Math.floor(Math.min(s.turn,31)/4)+1;
  const termName=t=>['大一','大二','大三','大四'][Math.floor((t-1)/2)]+' · 第'+(t%2?'一':'二')+'学期';
  const completedTerms=s=>s.summaries.length-(s.phase==='summary'?1:0);
  const stamp=t=>t===32?'毕业时':'第 '+(t+1)+' 回合';
  function fresh(runId){return {schemaVersion:1,runId,messages:[],replies:{},flags:[],feedRead:[],notifications:[],tasks:{},triggered:[]};}
  function eligible(when,s,ext,npc){return (!when.minTerm||termOf(s)>=when.minTerm)&&(!when.action||s.counts[when.action]>=(when.count||1))&&(!when.minRelation||ext.npcs[npc]?.value>=when.minRelation);}
  function requirement(when){const parts=[];if(when.minTerm)parts.push(termName(when.minTerm)+'起');if(when.action)parts.push(({study:'认真学习',skill:'技能训练',social:'社交活动',exercise:'健身运动'})[when.action]+'至少 '+(when.count||1)+' 次');if(when.minRelation)parts.push('关系至少 '+when.minRelation);return parts.join('，')||'认识后开放';}
  const eventNames={finals:'期末考试',club:'社团招新',contest:'参加编程比赛',project:'老师推荐参加项目',sports:'运动会报名',market:'校园创意集市',internship:'实习申请',recruit:'秋季招聘',farewell:'毕业前的选择'};
  function events(s,id){return s.logs.filter(l=>l.title.startsWith(eventNames[id]+' · '));}
  function measure(key,s,ext){
    if(own(s.counts,key))return s.counts[key];
    if(key==='met')return Object.values(ext.npcs).filter(n=>n.met).length;
    if(key==='interactions')return ext.interactions.length;
    if(key==='replies')return Object.keys(ext.phone.replies).length;
    if(key==='terms')return completedTerms(s);
    if(key==='graduate')return s.phase==='ending'?1:0;
    if(key==='contest')return events(s,key).filter(l=>l.title.includes(' · 组队挑战')).length;
    return events(s,key).length;
  }
  function taskCategory(type){return ({人物:'人物',学业:'学业',竞赛:'竞赛',社团:'社团'})[type]||'学期';}
  // 通知只保存 ID/时间/已读，文字与跳转目标由本地数据解释，避免存档混入可执行内容。
  function notice(id,ext){
    const parts=id.split(':'),[kind,key,value]=parts,npc=N.byId(key);
    if(parts.length!==(['term','campus'].includes(kind)?3:2))return null;
    if(['story','story-done'].includes(kind)&&Stories?.byId(key)){const d=Stories.byId(key);return {category:'人物',title:N.byId(d.characterId).name+' · '+d.title+(kind==='story'?'可阅读':'已记录'),text:kind==='story'?'人物故事可稍后处理，不抢占原校园事件；每回合最多展开一段。毕业后可按前置顺序回顾补读。':'选择已保存，可以重读经历与结果，不会重复领取关系奖励。',target:{page:'stories',npc:d.characterId,story:key}};}
    if(kind==='met'&&npc)return {category:'人物',title:npc.name+' 已加入通讯录',text:npc.role+' · '+npc.direction,target:{page:'chat',npc:key}};
    if(kind==='talk'){
      const x=ext.interactions.find(x=>String(x.turn)===key),n=x&&N.byId(x.npc);
      if(n)return {category:'人物',title:'和'+n.name+'的交流已记录',text:'这次认真交流已计入本回合共享次数。手机里可以继续阅读和普通回复。',target:{page:'chat',npc:n.id}};
    }
    if(kind==='term'&&['start','done'].includes(key)&&/^[1-8]$/.test(value))return {category:'学期',title:termName(Number(value))+(key==='start'?' · 校园安排':' · 回顾已收好'),text:key==='start'?'按自己的节奏安排四次主要行动。阅读手机不消耗行动次数。':'总结已经确认。你完成的学习、休息和校园经历会留在任务记录里。',target:{page:'tasks',filter:'学期'}};
    if(kind==='year'&&/^[1-4]$/.test(key))return {category:'学期',title:['大一','大二','大三','大四'][Number(key)-1]+'，你好',text:'校园动态会随着学年更新。去看看大家最近关心的事情，也为自己留一些探索的空间。',target:{page:'feed'}};
    if(kind==='action'&&['study','skill','social','exercise','rest','work','relax'].includes(key))return {category:key==='skill'?'竞赛':key==='social'?'社团':'学业',title:'一次'+({study:'学习',skill:'技能训练',social:'社交活动',exercise:'运动',rest:'休息',work:'兼职',relax:'放松'})[key]+'已记录',text:'这是来自真实主要行动的记录。部分聊天与任务会因此开放，不需要额外领取奖励。',target:{page:'tasks',filter:key==='skill'?'竞赛':key==='social'?'社团':'全部'}};
    if(kind==='campus'&&eventNames[key]&&/^(?:[1-9]|[12]\d|3[0-2])$/.test(value))return {category:['internship','recruit'].includes(key)?'实习与就业':['contest','project'].includes(key)?'竞赛':key==='finals'?'学业':key==='farewell'?'学期':'社团',title:eventNames[key]+' · 已留在经历里',text:'第 '+value+' 回合的选择已完成。相关任务根据实际选择更新，阅读此通知不会重复结算。',target:{page:'tasks',filter:key==='contest'?'竞赛':key==='finals'?'学业':'全部'}};
    if(kind==='opportunity'&&['contest','internship','recruit'].includes(key))return {category:key==='contest'?'竞赛':'实习与就业',title:({contest:'技术社的练习赛消息',internship:'可以开始了解实习了',recruit:'校园招聘季提醒'})[key],text:({contest:'大二起，技能达到原事件条件后，有机会遇到编程比赛。先练基本功，比赛仍由原事件触发。',internship:'先整理已有作品，了解岗位任务。实习申请仍通过原有校园事件展开，手机不额外消耗回合。',recruit:'岗位没有唯一标准答案。原有秋季招聘事件会带来了解不同方向的机会。'})[key],target:{page:'tasks',filter:key==='contest'?'竞赛':'全部'}};
    if(kind==='task'){
      const t=D.tasks.find(t=>t.id===key);if(t)return {category:taskCategory(t.type),title:'任务记录完成 · '+t.name,text:t.desc+' 进度来自真实经历，没有额外数值奖励。',target:{page:'tasks',filter:'已完成',task:t.id}};
    }
    return null;
  }
  function message(id,ext){
    const [kind,key]=id.split(':');
    if(kind==='story'&&ext.story?.completed[key]&&Stories?.byId(key))return {npc:Stories.byId(key).characterId,side:'npc',text:Story.followup(ext,key)};
    if(kind==='greet'&&N.byId(key))return {npc:key,side:'npc',text:D.greeting[key]};
    const t=D.thread(key),reply=ext.phone?.replies[key];
    if(t&&kind==='prompt')return {npc:t.npc,side:'npc',text:t.text};
    if(t&&reply&&['player','answer'].includes(kind))return {npc:t.npc,side:kind==='player'?'player':'npc',text:kind==='player'?t.options[reply.choice].label:t.options[reply.choice].answer};
    if(kind==='talk'){
      const x=ext.interactions.find(x=>String(x.turn)===key);if(x)return {npc:x.npc,side:'npc',text:N.byId(x.npc).replies[x.choice]};
    }
    return null;
  }
  function validate(p,ext){
    try{
      if(!p||p.schemaVersion!==1||p.runId!==ext.runId)return null;
      const array=(x,max)=>Array.isArray(x)&&x.length<=max,unique=x=>new Set(x).size===x.length,turn=t=>Number.isInteger(t)&&t>=0&&t<=32;
      if(!array(p.messages,140)||!array(p.notifications,200)||!array(p.feedRead,24)||!array(p.flags,12)||!array(p.triggered,400)||!p.replies||typeof p.replies!=='object'||Array.isArray(p.replies)||Object.keys(p.replies).length>12||!p.tasks||typeof p.tasks!=='object'||Array.isArray(p.tasks))return null;
      const rewards=[];
      for(const [id,r] of Object.entries(p.replies)){
        const t=D.thread(id);if(!t||!r||!Number.isInteger(r.choice)||r.choice<0||r.choice>2||!turn(r.turn)||!ext.npcs[t.npc].met)return null;
        const choice=t.options[r.choice];
        if(choice.relationChoice!==undefined){if(!ext.interactions.some(x=>x.turn===r.turn&&x.npc===t.npc&&x.choice===choice.relationChoice))return null;rewards.push(r.turn);}
        if(!['prompt','player','answer'].every(kind=>p.messages.some(m=>m.id===kind+':'+id)))return null;
        if(!['player','answer'].every(kind=>p.messages.some(m=>m.id===kind+':'+id&&m.turn===r.turn)))return null;
      }
      if(!unique(rewards)||!unique(p.flags)||JSON.stringify([...p.flags].sort())!==JSON.stringify(Object.entries(p.replies).map(([id,r])=>D.thread(id).options[r.choice].flag).sort()))return null;
      const bound={...ext,phone:p};
      if(!unique(p.messages.map(m=>m?.id))||!p.messages.every(m=>m&&typeof m.id==='string'&&m.id.split(':').length===2&&turn(m.turn)&&typeof m.read==='boolean'&&ext.npcs[m.npc]?.met&&message(m.id,bound)?.npc===m.npc))return null;
      if(!unique(p.notifications.map(n=>n?.id))||!p.notifications.every(n=>n&&typeof n.id==='string'&&n.id.length<100&&turn(n.turn)&&typeof n.read==='boolean'&&notice(n.id,bound)))return null;
      if(!unique(p.feedRead)||!p.feedRead.every(id=>D.feed.some(f=>f.id===id)))return null;
      if(Object.keys(p.tasks).length>D.tasks.length)return null;
      for(const [id,t] of Object.entries(p.tasks)){
        const def=D.tasks.find(t=>t.id===id);if(!def||!t||!Number.isInteger(t.progress)||t.progress<0||t.progress>def.goal||!['locked','active','complete'].includes(t.status)||!(t.completedTurn===null||turn(t.completedTurn))||(t.status==='complete')!==(t.progress===def.goal)||(t.status==='complete')!==(t.completedTurn!==null))return null;
      }
      const triggers=[...p.messages.map(m=>'message:'+m.id),...p.notifications.map(n=>'notice:'+n.id)];
      if(!unique(p.triggered)||JSON.stringify([...p.triggered].sort())!==JSON.stringify(triggers.sort()))return null;
      return copy(p);
    }catch{return null;}
  }
  function reconcile(ext,s){
    if(!ext.phone)ext.phone=fresh(ext.runId);
    const p=ext.phone,before=JSON.stringify(p),triggered=new Set(p.triggered);let newMessages=0;
    const add=(kind,id,turn,extra)=>{
      const token=kind+':'+id;if(triggered.has(token))return;
      triggered.add(token);p.triggered.push(token);
      if(kind==='message'){p.messages.push({id,turn,read:false,...extra});newMessages++;}else p.notifications.push({id,turn,read:false});
    };
    for(const npc of N.NPCS)if(ext.npcs[npc.id].met){
      const first=ext.interactions.find(x=>x.npc===npc.id)?.turn||0;
      add('message','greet:'+npc.id,first,{npc:npc.id});add('notice','met:'+npc.id,first);
    }
    for(const t of D.threads)if(ext.npcs[t.npc].met&&eligible(t.when,s,ext,t.npc))add('message','prompt:'+t.id,s.turn,{npc:t.npc});
    for(const x of ext.interactions){
      const viaChat=Object.entries(p.replies).some(([id,r])=>r.turn===x.turn&&D.thread(id).options[r.choice].relationChoice!==undefined);
      if(!viaChat)add('message','talk:'+x.turn,x.turn,{npc:x.npc});
      add('notice','talk:'+x.turn,x.turn);
    }
    const actionNames={study:'认真学习',skill:'技能训练',social:'社交活动',exercise:'健身运动',rest:'好好休息',work:'校园兼职',relax:'娱乐放松'};
    for(const [action,count] of Object.entries(s.counts))if(count>0){const first=s.logs.filter(l=>l.title===actionNames[action]).at(-1);add('notice','action:'+action,first?Math.max(0,first.turn-1):s.turn);}
    for(const id of Object.keys(eventNames))for(const l of events(s,id))add('notice','campus:'+id+':'+l.turn,Math.max(0,l.turn-1));
    for(let t=1;t<=termOf(s);t++)add('notice','term:start:'+t,Math.min(s.turn,(t-1)*4));
    for(let t=1;t<=completedTerms(s);t++)add('notice','term:done:'+t,Math.min(s.turn,t*4));
    for(let y=1;y<=Math.ceil(termOf(s)/2);y++)add('notice','year:'+y,(y-1)*8);
    if(termOf(s)>=3&&s.counts.skill>0)add('notice','opportunity:contest',s.turn);
    if(termOf(s)>=5)add('notice','opportunity:internship',s.turn);
    if(termOf(s)>=7)add('notice','opportunity:recruit',s.turn);
    for(const t of D.tasks){
      const open=eligible(t.when,s,ext,t.npc),progress=open?Math.min(t.goal,measure(t.measure,s,ext)):0,done=progress===t.goal;
      const previous=p.tasks[t.id];p.tasks[t.id]={progress,status:done?'complete':open?'active':'locked',completedTurn:done?(previous?.completedTurn??s.turn):null};
      if(done)add('notice','task:'+t.id,p.tasks[t.id].completedTurn);
    }
    if(Story&&ext.story)for(const d of Stories.chapters){
      const done=ext.story.completed[d.storyId];
      if(done||Story.eligibility(ext,s,d.storyId).ok)add('notice','story:'+d.storyId,done?.turn??s.turn);
      if(done){add('notice','story-done:'+d.storyId,done.turn);add('message','story:'+d.storyId,done.turn,{npc:d.characterId});}
    }
    return {changed:JSON.stringify(p)!==before,newMessages};
  }
  function canReply(ext,s,id,index){
    const t=D.thread(id);
    if(!t||!Number.isInteger(index)||!t.options[index])return {ok:false,reason:'没有这个回复方向。'};
    if(!ext.npcs[t.npc].met||!eligible(t.when,s,ext,t.npc)||!ext.phone?.messages.some(m=>m.id==='prompt:'+id))return {ok:false,reason:'这段聊天还没有开放。'};
    if(own(ext.phone.replies,id))return {ok:false,reason:'这段聊天已经回复，选择已保存。'};
    return {ok:true,npc:t.npc,relationChoice:t.options[index].relationChoice};
  }
  function compatible(ext,s){
    const p=ext.phone;if(!p)return true;
    if([...p.messages,...p.notifications,...Object.values(p.replies)].some(x=>x.turn>s.turn))return false;
    if(p.feedRead.some(id=>D.feed.find(f=>f.id===id).minTerm>termOf(s)))return false;
    if(p.messages.some(m=>m.id.startsWith('prompt:')&&!eligible(D.thread(m.id.split(':')[1]).when,s,ext,m.npc)))return false;
    // 通知只能来自真实核心记录；允许旧手机快照缺少新通知，随后幂等补齐。
    const canonical={...ext,phone:fresh(ext.runId)};canonical.phone.replies=copy(p.replies);canonical.phone.flags=[...p.flags];reconcile(canonical,s);
    const allowed=new Set(canonical.phone.notifications.map(n=>n.id));return p.notifications.every(n=>allowed.has(n.id));
  }
  function reply(ext,s,id,index){
    const check=canReply(ext,s,id,index);if(!check.ok)return check;
    const t=D.thread(id),p=ext.phone;p.replies[id]={choice:index,turn:s.turn};p.flags.push(t.options[index].flag);
    for(const kind of ['player','answer']){const key=kind+':'+id;p.messages.push({id:key,npc:t.npc,turn:s.turn,read:kind==='player'});p.triggered.push('message:'+key);}
    return {ok:true,flag:t.options[index].flag};
  }
  function read(ext,s,kind,id){
    const p=ext.phone;if(kind==='chat'){
      if(!ext.npcs[id]?.met)return false;for(const m of p.messages)if(m.npc===id)m.read=true;return true;
    }
    if(kind==='feed'){
      if(!D.feed.some(f=>f.id===id&&f.minTerm<=termOf(s)))return false;if(!p.feedRead.includes(id))p.feedRead.push(id);return true;
    }
    if(kind==='notice'){const n=p.notifications.find(n=>n.id===id);if(!n)return false;n.read=true;return true;}
    return false;
  }
  function unread(ext){const p=ext.phone;return p?p.messages.filter(m=>!m.read&&message(m.id,ext)?.side==='npc').length+p.notifications.filter(n=>!n.read).length:0;}
  function messagesFor(ext,id){return (ext.phone?.messages||[]).map((m,i)=>({...m,...message(m.id,ext),order:i})).filter(m=>m.npc===id).sort((a,b)=>a.turn-b.turn||a.order-b.order);}
  const api={fresh,validate,compatible,reconcile,eligible,requirement,termOf,termName,completedTerms,stamp,notice,message,canReply,reply,read,unread,messagesFor};
  if(node)module.exports=api;else root.CampusPhone=api;
})(typeof window!=='undefined'?window:globalThis);
