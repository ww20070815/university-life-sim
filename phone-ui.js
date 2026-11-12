/* 校园手机界面。render 函数只读状态；已读、回复仅由明确的点击调用统一 store。 */
(function(root){
  'use strict';
  function create(bridge){
    const {el,openModal,modalButton,closeModal,renderPhase,getState,store,toast,sound,showPeople}=bridge;
    const P=root.CampusPhone,D=root.PhoneData,N=root.NPCData;
    let current={page:'home'},noticeFilter='全部',taskFilter='全部',returnTo=null;
    const ext=()=>store.data;
    function seal(npc){const node=el('span','npc-seal',npc.name.slice(-2));node.style.setProperty('--npc-color',npc.color);if(npc.portrait){const image=el('img','npc-portrait');image.src=npc.portrait;image.alt=npc.name+'立绘';image.addEventListener('error',()=>image.remove());node.append(image);}return node;}
    function badge(){const n=store.blocked()?0:P.unread(ext()),button=bridge.button;if(button){button.textContent='校园手机'+(n?' · '+n+' 条未读':'');button.setAttribute('aria-label','校园手机'+(n?'，'+n+' 条未读':''));}}
    function action(command){const result=store.phoneCommand(getState(),command);badge();if(!result.ok)toast(result.reason);else if(!store.persistent)toast('存储暂不可用：手机记录只保留在当前页面。');return result;}
    function back(){if(returnTo)returnTo();else{closeModal();renderPhase();}}
    function go(page,id){
      if(page==='chat'&&!action({type:'read',kind:'chat',id}).ok)return;
      if(page==='feed-detail'&&!action({type:'read',kind:'feed',id}).ok)return;
      if(page==='notice-detail'&&!action({type:'read',kind:'notice',id}).ok)return;
      current={page,id};render();
    }
    function frame(title,desc){
      const c=openModal('校园通信 / '+P.termName(P.termOf(getState())),title,desc);c.parentElement.dataset.kind='phone';
      if(store.blocked()){c.append(el('p','extension-warning',store.warning),modalButton('查看人物存档提示',showPeople),modalButton('回到校园',back,true));return null;}
      const top=el('div','phone-top');top.append(el('span','',P.stamp(getState().turn)),el('span','phone-status','本地通信 · '+(store.persistent?'已连接':'仅本页')));c.append(top);
      if(!store.persistent)c.append(el('p','extension-warning','浏览器存储暂不可用，刷新可能丢失本页新记录。'));
      if(current.page!=='home')c.append(modalButton('‹ 手机首页',()=>go('home'),true));
      const body=el('section','phone-body');c.append(body);
      const nav=el('nav','phone-nav');nav.setAttribute('aria-label','校园手机应用');
      for(const [page,label] of [['chats','聊天'],['feed','动态'],['notices','通知'],['tasks','任务']]){
        const selected=({chat:'chats','feed-detail':'feed','notice-detail':'notices','task-detail':'tasks'})[current.page]||current.page;
        const b=el('button','phone-tab',label);b.type='button';b.setAttribute('aria-pressed',String(selected===page));b.addEventListener('click',()=>go(page));nav.append(b);
      }
      c.append(nav,modalButton('回到校园',back,true));return body;
    }
    function home(){
      const s=getState(),p=ext().phone,b=frame('校园手机','把消息慢慢读完，把日子认真过好。');if(!b)return;
      const cover=el('div','phone-cover');cover.append(el('span','eyebrow','今天，也有人与你同行'),el('strong','',P.termName(P.termOf(s))),el('p','',s.phase==='ending'?'四年的消息仍留在这里，欢迎慢慢回看。':'阅读与普通回复不消耗回合。带关系收益的回复与人物档案共享本回合的一次交流。'));b.append(cover);
      const grid=el('div','phone-apps'),items=[['chats','言','聊天',p.messages.filter(m=>!m.read&&P.message(m.id,ext())?.side==='npc').length+' 条未读消息'],['feed','叶','校园动态',D.feed.filter(f=>f.minTerm<=P.termOf(s)).length+' 条已开放'],['notices','笺','通知中心',p.notifications.filter(n=>!n.read).length+' 条未读通知'],['tasks','迹','任务记录',Object.values(p.tasks).filter(t=>t.status==='complete').length+' 项已完成']];
      for(const [page,icon,title,sub] of items){const a=el('button','phone-app');a.append(el('span','phone-app-icon',icon),el('strong','',title),el('small','',sub));a.addEventListener('click',()=>go(page));grid.append(a);}b.append(grid);
      if(root.CampusStory&&ext().story)b.append(modalButton('人物故事 · '+Object.keys(ext().story.completed).length+' / 30 章',()=>bridge.showStories?.(null,null,open),true));
      if(root.CampusWorld&&ext().campus)b.append(modalButton('校园地图 · 已访问 '+ext().campus.visitedLocations.length+' / 10 处',()=>bridge.showCampus?.(open),true));
      b.append(el('p','phone-footnote','所有内容保存在当前浏览器，未连接真实社交平台。'));
    }
    function chats(){
      const b=frame('消息','未认识的人物只显示简介；先在人物档案里相识，再慢慢聊。');if(!b)return;
      const list=el('div','phone-contacts');
      for(const npc of N.NPCS){
        const met=ext().npcs[npc.id].met,msgs=P.messagesFor(ext(),npc.id),unread=msgs.filter(m=>!m.read&&m.side==='npc').length,card=el('button','phone-contact');card.disabled=!met;
        const text=el('span');text.append(el('strong','',npc.name),el('small','',met?(msgs.at(-1)?.text||npc.role):npc.role+' · '+npc.traits));
        card.append(seal(npc),text,el('span',unread?'phone-dot':'phone-read',met?(unread?unread+' 未读':'已读'):'未认识'));card.addEventListener('click',()=>go('chat',npc.id));list.append(card);
      }
      b.append(list,modalButton('去人物档案认识新朋友',showPeople,true));
    }
    function chat(id){
      const npc=N.byId(id);if(!npc||!ext().npcs[id].met)return chats();
      const b=frame(npc.name,npc.role+' · '+npc.traits);if(!b)return;
      const heading=el('div','phone-chat-person');heading.append(seal(npc),el('p','',npc.id==='teacherzhou'?'师生指导 · 留言不必即时回复':'在校园，也在各自的生活里。'));b.append(heading);
      const history=el('ol','chat-history');history.setAttribute('role','log');history.setAttribute('aria-label','和'+npc.name+'的聊天记录');history.setAttribute('aria-live','polite');
      for(const m of P.messagesFor(ext(),id)){const row=el('li','chat-row '+(m.side==='player'?'from-player':'from-npc'));row.dataset.message=m.id;row.append(el('small','chat-time',(m.side==='player'?'我':npc.name)+' · '+P.stamp(m.turn)),el('p','chat-bubble',m.text));history.append(row);}b.append(history);
      const pending=D.threads.filter(t=>t.npc===id&&ext().phone.messages.some(m=>m.id==='prompt:'+t.id)&&!ext().phone.replies[t.id]);
      for(const t of pending){
        const block=el('fieldset','phone-replies');block.append(el('legend','',t.title+' · 选择一个回复方向'));
        t.options.forEach((o,i)=>{const check=store.checkReply(getState(),t.id,i),gain=o.relationChoice===undefined?null:Math.min(100-ext().npcs[id].value,[4,5,6][o.relationChoice]),button=modalButton(o.label+(gain===null?' · 普通回复':' · 关系 +'+gain),()=>{
          const result=action({type:'reply',id:t.id,choice:i});if(result.ok){sound?.effect('message',ext().runId+':chat:'+t.id);toast(result.delta===undefined?'这次选择已记下。':'关系 +'+result.delta+'，已使用本回合交流次数。');}render();
        });button.dataset.silent='true';button.disabled=!check.ok;button.title=check.reason||'';if(!check.ok)button.append(el('small','',check.reason));block.append(button);});b.append(block);
      }
      if(!pending.length)b.append(el('p','phone-footnote','暂时没有待回复的消息。已保存的选择可以在聊天记录中回看。'));
      for(const t of D.threads.filter(t=>t.npc===id&&!ext().phone.messages.some(m=>m.id==='prompt:'+t.id)))b.append(el('p','phone-lock','下一段日常 · '+t.title+'：'+P.requirement(t.when)));
      b.append(modalButton('‹ 返回聊天列表',()=>go('chats'),true));
      // 只滚动 DOM，不写入存档，也不等待动画后再结算。
      root.requestAnimationFrame(()=>{history.scrollTop=history.scrollHeight;});
    }
    function feed(){
      const b=frame('校园动态','在别人的日常里，看见同一个校园的不同角落。');if(!b)return;
      const list=el('div','phone-feed');
      for(const f of D.feed.filter(f=>f.minTerm<=P.termOf(getState())).slice().reverse()){
        const n=N.byId(f.npc),card=el('button','feed-card'),line=el('span','feed-author');line.append(seal(n),el('strong','',n.name),el('small','',P.termName(f.minTerm)));
        card.append(line,el('span','feed-tag',f.tag),el('p','',f.text.length>45?f.text.slice(0,45)+'…':f.text),el('small','phone-read',ext().phone.feedRead.includes(f.id)?'已读 · 再看一遍':'打开动态 · 未读'));card.addEventListener('click',()=>go('feed-detail',f.id));list.append(card);
      }b.append(list,el('p','phone-footnote','后续动态随学期开放。浏览与已读标记均没有数值奖励。'));
    }
    function feedDetail(id){const f=D.feed.find(f=>f.id===id);if(!f)return feed();const n=N.byId(f.npc),b=frame(n.name+'的校园日常',P.termName(f.minTerm)+' · '+f.tag);if(!b)return;b.append(seal(n),el('p','feed-full',f.text),el('p','phone-read','已读'),modalButton('‹ 返回校园动态',()=>go('feed'),true));}
    function filters(body,labels,value,onSelect){const list=el('div','phone-filters');list.setAttribute('aria-label','筛选');for(const name of labels){const button=el('button','phone-filter',name);button.setAttribute('aria-pressed',String(name===value));button.addEventListener('click',()=>onSelect(name));list.append(button);}body.append(list);}
    function notices(){
      const b=frame('通知中心','课程、活动和人物的来信，都有迹可循。');if(!b)return;
      filters(b,['全部',...D.categories],noticeFilter,name=>{noticeFilter=name;render();});
      const list=el('div','phone-notices'),items=ext().phone.notifications.slice().reverse().filter(n=>noticeFilter==='全部'||P.notice(n.id,ext()).category===noticeFilter);
      for(const n of items){const d=P.notice(n.id,ext()),button=el('button','notice-card');button.append(el('small','',d.category+' · '+P.stamp(n.turn)),el('strong','',d.title),el('span',n.read?'phone-read':'phone-dot',n.read?'已读':'未读'));button.addEventListener('click',()=>go('notice-detail',n.id));list.append(button);}b.append(list);if(!items.length)b.append(el('p','phone-footnote','这一类暂时没有通知。之后的真实经历会带来新消息。'));
    }
    function noticeDetail(id){
      const n=ext().phone.notifications.find(n=>n.id===id),d=n&&P.notice(id,ext());if(!d)return notices();const b=frame(d.title,d.category+' · '+P.stamp(n.turn));if(!b)return;b.append(el('p','notice-full',d.text),el('p','phone-read','已读'),modalButton('查看相关内容 →',()=>{if(d.target.page==='stories'){bridge.showStories?.(d.target.npc,d.target.story,()=>go('notices'));return;}if(d.target.filter)taskFilter=d.target.filter;if(d.target.task)go('task-detail',d.target.task);else go(d.target.page,d.target.npc);}),modalButton('‹ 返回通知中心',()=>go('notices'),true));
    }
    function tasks(){
      const b=frame('成长足迹','任务记录你真实做过的事。没有领取按钮，也不会额外改变属性。');if(!b)return;
      filters(b,['全部','进行中','已完成',...D.types],taskFilter,name=>{taskFilter=name;render();});
      let count=0;
      for(const t of D.tasks){const progress=ext().phone.tasks[t.id];if(!progress)continue;if(!(taskFilter==='全部'||taskFilter===t.type||taskFilter==='已完成'&&progress.status==='complete'||taskFilter==='进行中'&&progress.status==='active'))continue;count++;
        const card=el('button','phone-task '+progress.status);card.dataset.task=t.id;const head=el('span','task-heading');head.append(el('small','',t.type),el('strong','',t.name),el('span','',progress.status==='complete'?'已完成':progress.status==='locked'?'未开放':'进行中'));
        const bar=el('div','phone-task-track');bar.setAttribute('role','progressbar');bar.setAttribute('aria-label',t.name);bar.setAttribute('aria-valuenow',progress.progress);bar.setAttribute('aria-valuemax',t.goal);bar.setAttribute('aria-valuemin',0);const fill=el('span');fill.style.width=(progress.progress/t.goal*100)+'%';bar.append(fill);
        card.append(head,el('p','',t.condition),bar,el('small','',progress.progress+' / '+t.goal+' · 查看记录'));card.addEventListener('click',()=>go('task-detail',t.id));b.append(card);
      }if(!count)b.append(el('p','phone-footnote','这里暂时没有任务记录。完成真实行动后再来看看。'));
    }
    function taskDetail(id){
      const t=D.tasks.find(t=>t.id===id),p=ext().phone.tasks[id];if(!t||!p)return tasks();const b=frame(t.name,t.type+'任务 · '+(p.status==='complete'?'已完成':p.status==='locked'?'未开放':'进行中'));if(!b)return;
      b.append(el('p','notice-full',t.desc),el('p','term-memory','完成条件：'+t.condition),el('p','','开放条件：'+(Object.keys(t.when).length?P.requirement(t.when):'进入校园即可记录')),el('p','relation-budget','当前进度 '+p.progress+' / '+t.goal));
      if(p.completedTurn!==null)b.append(el('p','phone-read','记录完成于 '+P.stamp(p.completedTurn)));
      if(t.npc){const n=N.byId(t.npc);b.append(el('p','','相关人物：'+n.name));if(ext().npcs[t.npc].met)b.append(modalButton('打开和'+n.name+'的聊天',()=>go('chat',n.id),true));}
      b.append(el('p','phone-footnote','进度由实际行动、事件、人物互动或已保存的回复更新。查看任务与刷新都不会直接增加进度。'),modalButton('‹ 返回任务列表',()=>go('tasks'),true));
    }
    function render(){({home,chats,chat,feed,'feed-detail':feedDetail,notices,'notice-detail':noticeDetail,tasks,'task-detail':taskDetail}[current.page]||home)(current.id);}
    function open(){returnTo=null;store.refreshPhone(getState());badge();current={page:'home'};render();}
    function openChat(id,onBack){store.refreshPhone(getState());returnTo=onBack||null;if(!store.data.npcs[id]?.met){toast('先在人物档案中相识，再打开聊天。');return;}go('chat',id);}
    return {open,badge,openChat};
  }
  root.PhoneUI={create};
})(typeof window!=='undefined'?window:globalThis);
