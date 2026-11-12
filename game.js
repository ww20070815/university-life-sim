/* 大学四年：先定义数据与规则，再由界面调用。无需框架、服务器或外部资源。 */
(function () {
  'use strict';
  const VERSION = 1;
  const SAVE_KEY = 'university-four-years-v1';
  const STAT_INFO = {
    study: ['学业', '▤', '#91b6ce'], skill: ['专业技能', '⌘', '#9cadd0'],
    social: ['社交', '♧', '#d5ae88'], health: ['健康', '♡', '#8cb9a2'], mood: ['心情', '☀', '#ddc078']
  };
  const INITIAL = { study:45, skill:20, social:40, health:75, mood:70, money:1000 };
  const ACTIONS = [
    {id:'study',name:'认真学习',icon:'▤',desc:'图书馆的灯，为你亮着',color:'#7e9fb7',bg:'#eef4f8',effects:{study:9,skill:1,health:-3,mood:-4}},
    {id:'skill',name:'技能训练',icon:'⌘',desc:'把想法变成真正的作品',color:'#9a96b5',bg:'#f1eff7',effects:{skill:10,study:1,health:-4,mood:-3}},
    {id:'social',name:'社交活动',icon:'♧',desc:'和有趣的人，交换日常',color:'#c4a176',bg:'#fbf3e7',effects:{social:10,mood:5,money:-120,health:-2}},
    {id:'work',name:'校园兼职',icon:'¥',desc:'用自己的努力，赚一点底气',color:'#85a38c',bg:'#eff5ec',effects:{money:360,social:2,health:-7,mood:-6}},
    {id:'exercise',name:'健身运动',icon:'↗',desc:'去操场，和晚风跑个满怀',color:'#7aa5a1',bg:'#edf6f2',effects:{health:13,mood:6}},
    {id:'relax',name:'娱乐放松',icon:'♫',desc:'今天也要给快乐留点位置',color:'#c59e8d',bg:'#faf0ec',effects:{mood:15,study:-3,money:-60}},
    {id:'rest',name:'好好休息',icon:'☾',desc:'充满电，明天再出发',color:'#91a2bb',bg:'#f0f3f8',effects:{health:11,mood:9}}
  ];
  const YEARS = ['大一','大二','大三','大四'];
  function freshState() {
    return {version:VERSION,turn:0,phase:'action',stats:{...INITIAL},counts:Object.fromEntries(ACTIONS.map(a=>[a.id,0])),pendingEvent:null,lastEvent:null,lastAction:null,logs:[{turn:0,title:'你好，大学！',text:'拖着行李走进校门。未来的四年，现在开始。'}],summaries:[],termStart:{...INITIAL}};
  }
  function yearOf(s) { return Math.floor(Math.min(s.turn,31)/8)+1; }
  // 统一修改属性，五项能力限制在 0～100，余额限制在 0～999999。
  function applyEffects(s, effects) {
    const actual = {};
    for (const [key,value] of Object.entries(effects)) {
      const old = s.stats[key];
      s.stats[key] = Math.min(key==='money'?999999:100,Math.max(0,old+value));
      if (s.stats[key]!==old) actual[key]=s.stats[key]-old;
    }
    return actual;
  }
  function affordable(s,effects) {return !effects.money || effects.money>=0 || s.stats.money>=-effects.money;}
  function effectsText(effects) {return Object.entries(effects).map(([k,v])=>`${k==='money'?'金钱':STAT_INFO[k][0]} ${v>0?'+':''}${v}${k==='money'?' 元':''}`).join(' · ') || '状态保持不变';}
  function addLog(s,title,text) {s.logs.unshift({turn:Math.min(s.turn+1,32),title,text});s.logs=s.logs.slice(0,160);}
  function takeAction(s,id,random=Math.random) {
    const action=ACTIONS.find(a=>a.id===id);
    if(s.phase!=='action'||s.turn>=32||!action||!affordable(s,action.effects)) return false;
    s.phase='event'; // 在修改属性之前锁定，重复提交会被拒绝。
    s.counts[id]++; s.lastAction=id;
    const actual=applyEffects(s,action.effects);
    addLog(s,action.name,effectsText(actual));
    s.pendingEvent=chooseEvent(s,random).id;
    return true;
  }

  // 第四步：事件内容与资格条件。每个事件至少有一个不花钱的选项。
  const option=(label,story,effects)=>({label,story,effects});
  const EVENTS = [
    {id:'gaming',title:'室友邀请通宵打游戏',tag:'宿舍夜话',desc:'熄灯后，对面床铺探出一个脑袋：“四缺一，就等你了！”明早还有课，你看了看时间。',options:[option('加入一局，说好就一局','笑声很轻，夜却很长。',{social:5,mood:8,health:-8,study:-3}),option('婉拒邀请，早点睡','给自己留下一整个清醒的早晨。',{health:5,study:2})]},
    {id:'math',title:'高数考试临时复习',tag:'课堂日常',maxYear:2,desc:'距离小测只剩两天，复习群里突然安静了。你翻开笔记，看见几处还没弄懂的公式。',options:[option('和同学一起梳理','讨论让难题有了新的解法。',{study:7,social:2,mood:-3}),option('先掌握基础题','稳稳拿下会做的，也是一种进步。',{study:4,mood:2})]},
    {id:'meet',title:'偶遇同学',tag:'校园转角',desc:'梧桐树下，许久没见的同学向你挥手。食堂还没关门，晚霞也刚刚好。',options:[option('一起走走，聊聊近况','原来大家都在摸索着长大。',{social:5,mood:5}),option('约好下次见，先忙手头的事','把今天的计划好好完成。',{skill:3,study:2})]},
    {id:'job',title:'校园兼职机会',tag:'勤工助学',desc:'图书馆正在招临时助理，需要整理一批旧书。工作不难，只是要占用一点休息时间。',options:[option('接下这份工作','指尖沾了些书灰，也赚到了生活费。',{money:180,health:-4,mood:-2}),option('把机会分享给同学','帮别人搭一座桥，也收获了善意。',{social:4,mood:3})]},
    {id:'club',title:'社团招新',tag:'百团大战',maxYear:2,desc:'操场上挤满了招新摊位。技术社的作品很酷，志愿者协会的学长学姐也很热情。',options:[option('加入技术社','第一次和伙伴一起做东西，很有成就感。',{skill:6,social:3,mood:-2}),option('加入志愿者协会','在帮助他人的日子里认识新朋友。',{social:7,mood:3,health:-2}),option('先去体验开放活动','不急着决定，也可以遇见惊喜。',{mood:5,social:2})]},
    {id:'canteen',title:'食堂意外',tag:'人间烟火',desc:'打饭时一不小心，汤洒在了衣袖上。阿姨递来纸巾，旁边的同学也帮你端起餐盘。',options:[option('道谢后整理好自己','小插曲过去，热饭仍然很香。',{mood:3,social:2}),option('买一份喜欢的甜点安慰自己','甜味让今天重新亮了起来。',{money:-25,mood:8})]},
    {id:'conflict',title:'宿舍矛盾',tag:'相处练习',desc:'有人早睡，有人晚归。最近寝室里的气氛有点紧张，你想做些什么。',options:[option('坐下来商量作息','把话说开，比各自猜测好一点。',{social:6,mood:2}),option('先散散步，平复心情','带着平和回来，事情也容易一些。',{health:3,mood:4})]},
    {id:'sports',title:'运动会报名',tag:'操场来信',desc:'班长发来消息：“接力赛还差一位，要试试吗？”跑道上的风似乎已经吹过来了。',options:[option('报名参赛','你听见同学在终点喊自己的名字。',{health:5,social:5,mood:4}),option('加入后勤小队','递出一瓶水，也是团队的一部分。',{social:4,mood:4})]},
    {id:'contest',title:'参加编程比赛',tag:'挑战时刻',minYear:2,condition:s=>s.stats.skill>=30,desc:'技术社推荐你参加编程比赛。名次并没有把握，但和队友一起解决问题的机会很难得。',options:[option('组队挑战','调试到很晚，最终作品顺利运行。',{skill:9,study:3,health:-5,mood:-2}),option('先观摩，记录思路','你在别人的解法里看到了新的可能。',{skill:5,mood:2})]},
    {id:'project',title:'老师推荐参加项目',tag:'新的起点',minYear:2,condition:s=>s.stats.study>=55,desc:'老师在课后叫住你：“有个小项目，我觉得你可以试试。”这意味着责任，也意味着成长。',options:[option('认真参与，承担任务','你开始把课堂知识用在真实问题里。',{study:5,skill:8,health:-4,mood:-3}),option('从旁听和辅助工作开始','小步前进，也能慢慢接近目标。',{study:3,skill:4,mood:1})]},
    {id:'scholarship',title:'奖学金机会',tag:'努力回响',minYear:2,condition:s=>s.stats.study>=65,desc:'奖学金申请通知发布了。你整理过往的成绩、作品和活动证明，原来自己已经走了这么远。',options:[option('认真准备并提交','材料通过了评选，努力得到一份回应。',{money:600,study:3,mood:6}),option('帮助同学整理申请材料','分享经验，也让你重新看见自己的成长。',{social:6,mood:5})]},
    {id:'finals',title:'期末考试',tag:'学期必修',special:true,desc:'教学楼里的灯又亮了几夜。一个学期的积累，即将写进答卷。你准备怎样走进考场？',options:[option('集中复习，查漏补缺','认真对待的每一页，都不会白费。',{study:6,health:-4,mood:-3}),option('按计划复习，保证睡眠','带着清醒的头脑，为学期画上句点。',{study:3,health:3,mood:2})]},
    {id:'internship',title:'实习申请',tag:'走向社会',minYear:3,desc:'招聘网站上的岗位有些陌生，但你已有了自己的作品与经历。现在可以试着迈出第一步。',options:[option('修改作品，投递申请','第一封申请发出，你也更清楚要补足什么。',{skill:7,social:3,mood:-3}),option('先找学长学姐聊聊','具体的建议，让未来少了一点模糊。',{social:6,skill:3,mood:2})]},
    {id:'recruit',title:'秋季招聘',tag:'毕业季前奏',minYear:4,desc:'校园招聘会的展板排满了道路。人群里有焦虑，也有期待。你捏着简历，决定……',options:[option('尝试技术岗位面试','问题有难有易，走出面试室时又成长了一点。',{skill:6,social:4,mood:-4}),option('了解不同职业和行业','职业没有唯一答案，你的视野又开阔了一些。',{social:7,mood:3})]},
    {id:'farewell',title:'毕业前的选择',tag:'青春终章',special:true,minYear:4,desc:'最后一张校园日历快要翻完。宿舍的墙面留着合照，电脑里还存着没完成的计划。最后这段时光，你想留给什么？',options:[option('完善毕业作品，认真告别课堂','你为四年的学习留下了一份踏实的答卷。',{study:5,skill:5,mood:2}),option('和朋友再走一遍校园','路灯下的影子很长，愿我们前程都有光。',{social:7,mood:8}),option('写封信给未来的自己','接纳所有走过的路，也期待新的开始。',{health:5,mood:10})]},
    {id:'rain',title:'突如其来的雨',tag:'天气小事',desc:'下课时忽然下起雨，教学楼门口站满了人。你在包里翻出一把伞。',options:[option('和没带伞的同学一起走','小小一把伞，装下了一段新的友谊。',{social:4,mood:4}),option('坐在走廊，读一会儿书','听雨的时间，连文字也温柔起来。',{study:3,mood:3})]},
    {id:'market',title:'校园创意集市',tag:'灵感发芽',minYear:2,desc:'有人卖手作，有人展示自己的小程序。朋友邀请你把一个点子带到集市，试试真实的反馈。',options:[option('花 100 元准备一个小摊','第一次为自己的想法找到用户。',{money:-100,skill:5,social:5}),option('帮朋友布置和介绍','你学会了如何把一个故事讲给别人听。',{social:5,skill:2})]},
    {id:'walk',title:'晚风里的校园',tag:'平凡的一天',desc:'傍晚的天空是浅浅的橘色，操场传来吉他的声音。今天没有大事发生，也值得记住。',options:[option('去操场慢慢走一圈','晚风吹散了一些疲惫。',{health:4,mood:5}),option('回图书馆完成小目标','一个小小的勾，也是今天的收获。',{study:3,skill:2})]}
  ];
  function eligible(s,event) {const year=yearOf(s);return (!event.minYear||year>=event.minYear)&&(!event.maxYear||year<=event.maxYear)&&(!event.condition||event.condition(s));}
  function chooseEvent(s,random) {
    if(s.turn===31) return EVENTS.find(e=>e.id==='farewell');
    if((s.turn+1)%4===0) return EVENTS.find(e=>e.id==='finals');
    // 大三第一次实习、大四秋招保底出现，其余回合随机抽取，避免连续同一事件。
    if(s.turn===16) return EVENTS.find(e=>e.id==='internship');
    if(s.turn===24) return EVENTS.find(e=>e.id==='recruit');
    const pool=EVENTS.filter(e=>!e.special&&eligible(s,e)&&e.id!==s.lastEvent);
    return pool[Math.min(pool.length-1,Math.max(0,Math.floor(random()*pool.length)))];
  }
  function chooseOption(s,index) {
    if(s.phase!=='event')return false;
    const event=EVENTS.find(e=>e.id===s.pendingEvent),choice=event?.options[index];
    if(!choice||!affordable(s,choice.effects))return false;
    s.phase='settling'; // 单次提交锁；此过渡状态不会写入存档。
    const actual=applyEffects(s,choice.effects);
    addLog(s,event.title+' · '+choice.label,choice.story+' '+effectsText(actual));
    s.lastEvent=event.id;s.pendingEvent=null;s.turn++;
    if(s.turn%4===0){
      const delta=Object.fromEntries(Object.keys(INITIAL).map(k=>[k,s.stats[k]-s.termStart[k]]));
      s.summaries.push({term:s.turn/4,stats:{...s.stats},delta});
      s.phase='summary';
    }else s.phase='action';
    return true;
  }
  // 第五步：按数组顺序判断。越靠前优先级越高，最后一项是保底结局。
  const ENDINGS=[
    {id:'delay',name:'延毕危机',icon:'☁',rule:'学业 < 40，或健康 < 20',check:s=>s.stats.study<40||s.stats.health<20,story:'毕业要求暂时还没有达成，或身体需要你停下来。人生的进度条不必和别人一致。好好休整、补上学分，下一个出发的日子依然属于你。'},
    {id:'allround',name:'六边形战士',icon:'✦',rule:'五项属性全部 ≥ 75',check:s=>Object.keys(STAT_INFO).every(k=>s.stats[k]>=75),story:'课堂、作品、朋友和生活，你都认真经营过。你没有把自己困在一张成绩单上，而是让热爱在不同的方向开花。'},
    {id:'research',name:'保研成功',icon:'▤',rule:'学业 ≥ 90、技能 ≥ 60、健康 ≥ 40',check:s=>s.stats.study>=90&&s.stats.skill>=60&&s.stats.health>=40,story:'那些在图书馆里安静积累的日子，变成了通向新阶段的门票。你带着好奇心继续求学，前面还有更多值得探索的问题。'},
    {id:'engineer',name:'大厂工程师',icon:'⌘',rule:'技能 ≥ 90、学业 ≥ 65、健康 ≥ 40',check:s=>s.stats.skill>=90&&s.stats.study>=65&&s.stats.health>=40,story:'从第一个小程序到独立完成项目，你用作品叩开了理想公司的门。毕业是新版本的发布，而你的故事刚刚开始。'},
    {id:'founder',name:'创业青年',icon:'↗',rule:'技能 ≥ 70、社交 ≥ 75、金钱 ≥ 2000',check:s=>s.stats.skill>=70&&s.stats.social>=75&&s.stats.money>=2000,story:'你找到了愿意同行的伙伴，也攒下了启动想法的底气。未来充满不确定，但你决定亲手试着把一个小小的点子变成现实。'},
    {id:'popular',name:'校园人气王',icon:'♧',rule:'社交 ≥ 90、心情 ≥ 60',check:s=>s.stats.social>=90&&s.stats.mood>=60,story:'走在校园里，总有人喊出你的名字。你记得朋友的烦恼，也带给很多人快乐。毕业照之外，那些真诚的连接会陪你走得更远。'},
    {id:'worker',name:'兼职达人',icon:'¥',rule:'兼职 ≥ 8 次、金钱 ≥ 3000、健康 ≥ 30',check:s=>s.counts.work>=8&&s.stats.money>=3000&&s.stats.health>=30,story:'你在忙碌里学会独立，在一份份工作中认识世界。账户里是辛苦攒下的积蓄，心里是为自己生活负责的勇气。'},
    {id:'happy',name:'快乐毕业生',icon:'☀',rule:'未触发以上结局，且学业 ≥ 40、健康 ≥ 20',check:()=>true,story:'你顺利走到了毕业这一天。也许没有耀眼的标签，但你拥有真实的日常、自己的节奏和继续生活的勇气。平凡的青春，同样值得珍藏。'}
  ];
  function judgeEnding(s){return ENDINGS.find(e=>e.check(s));}
  function continueTerm(s){if(s.phase!=='summary')return false;s.termStart={...s.stats};s.phase=s.turn===32?'ending':'action';return true;}

  // 第六步：所有外部存档都先验证，再交给游戏使用，避免旧数据破坏流程。
  function validateSave(raw){
    try {
      if(!raw||raw.version!==VERSION||!Number.isInteger(raw.turn)||raw.turn<0||raw.turn>32)return null;
      if(!['action','event','summary','ending'].includes(raw.phase))return null;
      const validStats=o=>o&&Object.keys(o).length===6&&Object.keys(INITIAL).every(k=>Number.isInteger(o[k])&&o[k]>=0&&o[k]<=(k==='money'?999999:100));
      if(!validStats(raw.stats)||!validStats(raw.termStart))return null;
      if(!raw.counts||!ACTIONS.every(a=>Number.isInteger(raw.counts[a.id])&&raw.counts[a.id]>=0&&raw.counts[a.id]<=32))return null;
      if(Object.values(raw.counts).reduce((a,b)=>a+b,0)!==raw.turn+(raw.phase==='event'?1:0))return null;
      if(raw.phase==='event'&&!EVENTS.some(e=>e.id===raw.pendingEvent&&eligible(raw,e)))return null;
      if(raw.phase!=='event'&&raw.pendingEvent!==null)return null;
      if(['action','event'].includes(raw.phase)&&raw.turn>=32)return null;
      if(raw.phase==='summary'&&(raw.turn===0||raw.turn%4!==0))return null;
      if(raw.phase==='ending'&&raw.turn!==32)return null;
      if(!Array.isArray(raw.logs)||raw.logs.length>160||!raw.logs.every(l=>l&&Number.isInteger(l.turn)&&l.turn>=0&&l.turn<=32&&typeof l.title==='string'&&l.title.length<300&&typeof l.text==='string'&&l.text.length<1000))return null;
      if(!Array.isArray(raw.summaries)||raw.summaries.length!==Math.floor(raw.turn/4)||!raw.summaries.every((t,i)=>t.term===i+1&&validStats(t.stats)&&t.delta&&Object.keys(INITIAL).every(k=>Number.isInteger(t.delta[k])&&Math.abs(t.delta[k])<1000000)))return null;
      if(raw.lastEvent!==null&&!EVENTS.some(e=>e.id===raw.lastEvent))return null;
      if(raw.lastAction!==null&&!ACTIONS.some(a=>a.id===raw.lastAction))return null;
      return JSON.parse(JSON.stringify(raw));
    }catch{return null;}
  }
  // 测试可以直接 require 此文件；浏览器则继续初始化界面。
  const core={freshState,applyEffects,takeAction,chooseOption,continueTerm,chooseEvent,eligible,judgeEnding,validateSave,ACTIONS,EVENTS,ENDINGS,INITIAL};
  if(typeof module!=='undefined'&&module.exports)module.exports=core;
  if(typeof document==='undefined')return;

  const $=id=>document.getElementById(id);
  const visual=window.CampusVisual;
  let state=freshState(),notice='',lastFocus=null,toastTimer,hasSave=false,inGame=false,previousStats=null;
  // 首次进入只读旧档。即使外部数据无法读取，也不静默覆盖原始内容。
  try{const saved=localStorage.getItem(SAVE_KEY);if(saved){const valid=validateSave(JSON.parse(saved));if(valid){state=valid;hasSave=true;}else notice='原存档暂时无法读取，已保留原始数据。开始新游戏前请确认是否需要备份。';}}catch{notice='无法读取本地存档；浏览器可能禁止存储。本次游玩可继续，但进度可能无法保存。';}
  let extensionStorage;try{extensionStorage=window.localStorage;}catch{}
  const friends=window.Relationships?.createStore(extensionStorage||{getItem(){throw new Error('storage disabled');},setItem(){throw new Error('storage disabled');},removeItem(){throw new Error('storage disabled');}},state);
  const sound=window.CampusAudio;
  let audioTransaction=0;
  const companions=window.CompanionUI&&friends?window.CompanionUI.create({el,openModal,modalButton,closeModal,renderPhase,getState:()=>state,getScene:()=>inGame?visual.sceneFor(state):'campus',store:friends,toast,visual,sound,showStories}):null;
  const stories=window.StoryUI&&window.CampusStory&&window.StoryData&&friends?window.StoryUI.create({el,openModal,modalButton,closeModal,renderPhase,getState:()=>state,getScene:()=>inGame?visual.sceneFor(state):'campus',store:friends,toast,sound,layer:$('modal-layer')}):null;
  const campusPhone=window.PhoneUI&&window.CampusPhone&&window.PhoneData&&friends?window.PhoneUI.create({el,openModal,modalButton,closeModal,renderPhase,getState:()=>state,store:friends,toast,sound,showPeople:()=>companions?.people(),showStories,showCampus,button:$('open-phone')}):null;
  const campusMap=window.CampusUI&&window.CampusWorld&&window.CampusData&&friends?window.CampusUI.create({el,openModal,modalButton,closeModal,renderPhase,getState:()=>state,getScene:()=>inGame?visual.sceneFor(state):'campus',store:friends,toast,sound,document,visual,showProfile:(id,back)=>companions?.profile(id,back),showChat:(id,back)=>campusPhone?.openChat(id,back),showStories,actions:ACTIONS,effectsText,affordable:effects=>affordable(state,effects),performAction:(location,id)=>{const check=window.CampusWorld.canAct(friends.data,state,location,id);if(!check.ok){toast(check.reason);return false;}return performMainAction(id);}}):null;
  function showCampus(...args){if(campusMap)campusMap.open(...args);else toast('校园地图模块未载入，请刷新或检查预览版本。原有游戏可继续。');}
  function showStories(...args){if(stories)stories.open(...args);else toast('人物故事模块未载入，请刷新或检查预览版本。原游戏可继续。');}
  friends?.onChange(change=>{campusPhone?.badge();if(change.kind==='core'&&change.newMessages>0)sound?.effect('message',change.token);});
  function save(){try{const write=()=>localStorage.setItem(SAVE_KEY,JSON.stringify(state));if(friends)friends.commitCore(state,write);else write();hasSave=true;$('save-status').textContent=friends&&!friends.persistent?'✓ 游戏已保存 · 人物与手机记录仅保留在本页':'✓ 进度已自动保存';}catch(error){$('save-status').textContent=error.code==='SAVE_CONFLICT'?'存档已在其他页面变化 · 本页未覆盖，请刷新后继续':'存储不可用 · 本次进度仅保留在当前页面';}}
  function toast(text){clearTimeout(toastTimer);$('toast').textContent=text;$('toast').hidden=false;toastTimer=setTimeout(()=>$('toast').hidden=true,3600);}
  function el(tag,className,text){const node=document.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=text;return node;}
  // 地图与原行动区共用这一个入口，数值、余额、事件与防重全部仍由原规则处理。
  function performMainAction(id){const before={...state.stats};if(!takeAction(state,id))return false;save();sound?.settlement(Object.fromEntries(Object.keys(INITIAL).map(k=>[k,state.stats[k]-before[k]])),'action:'+ ++audioTransaction);render();return true;}
  function render(reveal=true){
    const t=Math.min(state.turn,31),year=Math.floor(t/8),semester=Math.floor(t/4)%2;
    $('term-label').textContent=state.turn===32?'四年旅程 · 已完成':`${YEARS[year]} · 第${semester?'二':'一'}学期`;
    $('round-label').textContent=state.turn===32?'32 / 32 回合完成':`第 ${state.turn+1} / 32 回合`;
    $('term-round').textContent=state.turn===32?'愿你奔赴自己的山海':`本学期第 ${t%4+1} / 4 次行动`;
    $('year-stops').replaceChildren(...YEARS.map((name,i)=>el('span',i<=year?'current':'',`${i<year||state.turn===32?'✓ ':''}${name}`)));
    $('journey-fill').style.width=`${state.turn/32*100}%`;
    $('identity-sub').textContent=['初来乍到，未来可期','慢慢探索，渐渐成长','向外尝试，向内扎根','带着热爱，奔赴远方'][year];
    document.querySelector('.student-badge').textContent=state.turn===32?'已毕业':'在校生';
    $('stats').replaceChildren(...Object.entries(STAT_INFO).map(([key,[name,icon,color]])=>{
      const row=el('div','stat'),line=el('div','stat-line');line.append(el('span','',`${icon}  ${name}`));
      const value=el('span','stat-value',`${state.stats[key]} `);value.append(el('small','','/ 100'));line.append(value);
      const track=el('div','stat-track');track.setAttribute('role','progressbar');track.setAttribute('aria-label',name);track.setAttribute('aria-valuenow',state.stats[key]);track.setAttribute('aria-valuemin',0);track.setAttribute('aria-valuemax',100);
      const fill=el('div','stat-fill');fill.style.setProperty('--stat-color',color);fill.style.width=`${previousStats?previousStats[key]:state.stats[key]}%`;requestAnimationFrame(()=>{fill.style.width=`${state.stats[key]}%`;});track.append(fill);row.append(line,track);
      const delta=previousStats?state.stats[key]-previousStats[key]:0;
      if(delta){row.append(el('span',`stat-delta ${delta<0?'negative':''}`,`${delta>0?'+':''}${delta}`));value.classList.add('number-flash');}
      return row;
    }));
    $('money').textContent=`¥ ${state.stats.money.toLocaleString('zh-CN')}`;
    document.querySelectorAll('.wallet .stat-delta').forEach(n=>n.remove());
    const moneyDelta=previousStats?state.stats.money-previousStats.money:0;
    if(moneyDelta)document.querySelector('.wallet').append(el('span',`stat-delta ${moneyDelta<0?'negative':''}`,`${moneyDelta>0?'+':''}${moneyDelta}元`));
    previousStats={...state.stats};visual.paint(state);
    $('tip').textContent=state.stats.health<30?'身体在提醒你：安排运动或休息，给自己充充电。':state.stats.study<40?'学业有些落后了，去图书馆找回自己的节奏吧。':'不必每一步都完美，每一次选择都算数。';
    $('action-status').textContent=state.phase==='action'?'选择 1 项行动':state.phase==='event'?'等待事件选择':state.phase==='summary'?'学期已结束':'四年圆满收官';
    $('actions').replaceChildren(...ACTIONS.map(action=>{
      const button=el('button','action');button.type='button';button.disabled=state.phase!=='action'||!affordable(state,action.effects);
      const icon=el('span','action-icon',action.icon);icon.style.setProperty('--icon-bg',action.bg);icon.style.setProperty('--icon-color',action.color);
      const text=el('div','action-text');text.append(el('strong','',action.name),el('small','',action.desc));
      const effects=el('div','effect-preview');for(const [key,value] of Object.entries(action.effects))effects.append(el('span',value<0?'cost':'',`${key==='money'?'金钱':STAT_INFO[key][0]} ${value>0?'+':''}${value}${key==='money'?'元':''}  `));
      text.append(effects);if(!affordable(state,action.effects))text.append(el('small','cost','余额不足'));button.append(icon,text);button.addEventListener('click',()=>performMainAction(action.id));return button;
    }));
    $('log-count').textContent=`${state.logs.length} 段经历`;
    campusPhone?.badge();
    $('logs').replaceChildren(...state.logs.map(log=>{const li=el('li');li.append(el('time','',log.turn===0?'入学第一天':`第 ${log.turn} 回合`));const text=el('div');text.append(el('strong','',log.title),el('p','',log.text));li.append(text);return li;}));
    if(reveal&&inGame)renderPhase();
  }
  function openModal(tag,title,desc){
    if($('modal-layer').hidden)lastFocus=document.activeElement;
    $('modal-layer').hidden=false;delete $('modal-layer').dataset.storyReader;document.querySelector('main').inert=true;document.querySelector('header').inert=true;
    const modal=document.querySelector('.modal');modal.dataset.kind='plain';delete modal.dataset.ending;modal.scrollTop=0;
    const content=$('modal-content');content.replaceChildren(el('span','eyebrow',tag));const heading=el('h2','',title);heading.id='modal-title';content.append(heading);if(desc)content.append(el('p','modal-desc',desc));
    document.querySelector('.modal').focus();return content;
  }
  function closeModal(){$('modal-layer').hidden=true;document.querySelector('main').inert=false;document.querySelector('header').inert=false;if(lastFocus?.isConnected&&!lastFocus.disabled)lastFocus.focus();}
  function modalButton(label,callback,secondary=false){const button=el('button',secondary?'modal-button secondary':'modal-button',label);button.addEventListener('click',callback);return button;}
  function renderPhase(){
    if(!inGame){closeModal();return;}
    if(state.phase==='event'){
      const event=EVENTS.find(e=>e.id===state.pendingEvent),content=openModal(`校园来信 / ${event.tag}`,event.title,event.desc);
      content.append(el('p','modal-hint','你的主要行动已经完成。接下来，做一个小小的选择。'));
      visual.decorateModal(content,state,'event');
      event.options.forEach((choice,index)=>{const button=modalButton('',()=>{const before={...state.stats};if(chooseOption(state,index)){save();render(false);const actual=Object.fromEntries(Object.keys(INITIAL).map(k=>[k,state.stats[k]-before[k]]).filter(([,v])=>v!==0));const token='choice:'+ ++audioTransaction;sound?.effect('confirm',token);sound?.settlement(actual,token);if(state.phase==='summary')sound?.effect('term','term:'+state.turn);showOutcome(event,choice,actual);}});button.classList.add('choice');button.append(el('strong','',choice.label),el('span','',effectsText(choice.effects)));button.disabled=!affordable(state,choice.effects);if(button.disabled)button.append(el('small','','余额不足'));content.append(button);});
    }else if(state.phase==='summary'){
      const summary=state.summaries.at(-1),label=`${YEARS[Math.floor((summary.term-1)/2)]} · 第${summary.term%2?'一':'二'}学期`;
      const content=openModal('一段旅程，值得记录',`${label}结束了`,state.turn===32?'最后一个学期也走到了终点。看看这段日子的成长，再拆开属于你的毕业信。':'四次选择，汇成了这个学期。歇一口气，下一段校园生活正等着你。');
      visual.decorateModal(content,state,'summary');content.append(statSummary(summary.stats,summary.delta));
      const memories=state.logs.filter(l=>l.turn>state.turn-4&&l.turn<=state.turn&&l.title.includes(' · ')).map(l=>l.title.split(' · ')[0]);
      content.append(el('p','term-memory',`这个学期，你经历了${memories.reverse().join('、')}。这些平凡的片段，也在慢慢塑造你。`));
      content.append(modalButton(state.turn===32?'拆开我的毕业信 →':'开启下一学期 →',()=>{if(continueTerm(state)){save();if(state.phase==='ending')sound?.effect('graduation','graduation');render();}}));
    }else if(state.phase==='ending'){
      const ending=judgeEnding(state),content=openModal('毕业快乐 / 青春没有标准答案',`${ending.icon} ${ending.name}`,ending.story);
      visual.decorateModal(content,state,'ending');content.parentElement.dataset.ending=ending.id;
      content.append(statSummary(state.stats));const most=ACTIONS.reduce((a,b)=>state.counts[a.id]>=state.counts[b.id]?a:b);
      content.append(el('p','graduation-summary',`32 次行动，8 个学期，4 年青春。你最常选择「${most.name}」，共 ${state.counts[most.id]} 次；四年里学习了 ${state.counts.study} 次，训练了 ${state.counts.skill} 次，兼职了 ${state.counts.work} 次。每一段经历，都是你来过的证明。`));
      stories?.appendGraduation(content);
      content.append(modalButton('重新开始，书写另一种青春',()=>confirmReset(false)),modalButton('查看四年手记',closeModal,true));
      $('action-status').textContent='点击查看毕业结局';$('action-status').onclick=renderPhase;$('action-status').setAttribute('role','button');$('action-status').tabIndex=0;
    }else{closeModal();$('action-status').onclick=null;$('action-status').removeAttribute('role');$('action-status').removeAttribute('tabindex');}
    if(campusPhone&&state.phase!=='action')$('modal-content').append(modalButton('查看校园手机 · 不推进回合',()=>campusPhone.open(),true));
    if(stories&&state.phase!=='action')$('modal-content').append(modalButton('查看人物故事记录',()=>stories.open(),true));
    if(campusMap&&state.phase!=='action')$('modal-content').append(modalButton('查看校园地图 · 自由浏览',()=>showCampus(),true));
  }
  function statSummary(stats,delta){const box=el('div','summary-grid');Object.entries(stats).forEach(([key,value])=>{const item=el('div','summary-stat');item.append(el('span','',key==='money'?'金钱':STAT_INFO[key][0]),el('strong','',key==='money'?`¥ ${value}`:String(value)));if(delta)item.append(el('small',delta[key]<0?'cost':'',`${delta[key]>0?'+':''}${delta[key]}`));box.append(item);});return box;}
  function confirmReset(clear){
    const content=openModal('旅程管理',clear?'清除这份存档？':'开启另一段青春？',clear?'当前进度与本局结局将被删除，并回到入学第一天。此操作无法撤销。':'当前进度与本局结局会被新的一局替换。每一次重新出发，都有不同的可能。');
    content.append(modalButton(clear?'确认清除存档':'确认开始新游戏',()=>{
      if(clear){try{localStorage.removeItem(SAVE_KEY);hasSave=false;state=freshState();friends?.clear(state);previousStats=null;closeModal();showHome();$('save-status').textContent='存档已清除';toast('本局进度、关系和手机记录已清除，人物外观与声音设置仍保留。');}catch{toast('浏览器禁止访问存储，未能清除存档。');closeModal();renderPhase();}}
      else chooseCharacter('new');
    }),modalButton('保留当前旅程',()=>{closeModal();renderPhase();},true));
  }
  $('new-game').addEventListener('click',()=>confirmReset(false));
  $('clear-save').addEventListener('click',()=>confirmReset(true));
  $('show-rules').addEventListener('click',()=>{const content=openModal('入学指南','青春，由你来定义','每学期 4 次行动，共 8 个学期、32 回合。每回合先行动，再处理事件；每 4 回合查看一次总结。没有固定生活费支出，兼职和奖学金可补充余额。付费行动余额不足时不可选。');content.append(el('p','modal-hint','结局按以下顺序匹配，靠前者优先。休息与运动可以维持健康，行动效果达到属性上限后不再增长。'));const list=el('ol','ending-rules');ENDINGS.forEach(e=>{const item=el('li');item.append(el('strong','',e.name),el('span','',e.rule));list.append(item);});content.append(list,modalButton('了解了，回到校园',()=>{closeModal();renderPhase();}));});
  $('action-status').addEventListener('keydown',event=>{if(state.phase==='ending'&&['Enter',' '].includes(event.key)){event.preventDefault();renderPhase();}});
  // 键盘焦点留在弹窗内，避免通过 Tab 操作弹窗后面的行动按钮。
  document.addEventListener('keydown',event=>{if($('modal-layer').hidden)return;if(event.key==='Tab'){const nodes=[...$('modal-content').querySelectorAll('button:not(:disabled)')];if(!nodes.length)return;const first=nodes[0],last=nodes.at(-1);if(event.shiftKey&&(document.activeElement===first||document.activeElement===document.querySelector('.modal'))){event.preventDefault();last.focus();}else if(!event.shiftKey&&(document.activeElement===last||document.activeElement===document.querySelector('.modal'))){event.preventDefault();first.focus();}}});
  // V2：人物选择和页面切换不调用任何数值计算。
  function showHome(){inGame=false;sound?.setScene('campus');closeModal();$('home-view').hidden=false;$('game-view').hidden=true;$('home-continue').disabled=!hasSave;$('home-continue').textContent=hasSave?(state.phase==='ending'?'重温我的毕业结局 →':`继续我的旅程 · 第 ${Math.min(state.turn+1,32)} 回合 →`):'还没有存档，开启新旅程吧';}
  function enterGame(){inGame=true;closeModal();$('home-view').hidden=true;$('game-view').hidden=false;render();window.scrollTo({top:0,behavior:'auto'});}
  function chooseCharacter(mode){
    let draft=visual.getSettings().character||'male';
    const content=openModal('在这个故事里，成为自己',mode==='continue'?'给原来的旅程，一个新形象':'选择你的青春主角','人物只改变外观，不改变任何初始属性、行动数值或毕业规则。可以随时在成长档案中更换。');
    const grid=el('div','character-grid');
    function updateCards(){grid.replaceChildren(...Object.entries(visual.CHARACTERS).map(([id,info])=>{const card=el('button','character-card');card.setAttribute('aria-pressed',String(draft===id));card.append(visual.actor(id),el('strong','',info.name),el('p','',info.intro),el('span','selected-mark',draft===id?'✓ 已选择':'选择这位主角'));card.addEventListener('click',()=>{draft=id;updateCards();grid.querySelector(`[data-choice="${id}"]`).focus();});card.dataset.choice=id;return card;}));}
    updateCards();content.append(grid,modalButton(mode==='new'?'以这个身份，开启四年 →':'确认形象，继续旅程 →',()=>{
      visual.setCharacter(draft);
      if(mode==='new'){state=freshState();friends?.reset(state);sound?.newRun();previousStats=null;save();}
      enterGame();
    }),modalButton(mode==='change'?'保留原来的形象':'暂时返回',()=>{closeModal();if(inGame)renderPhase();},true));
  }
  function showOutcome(event,choice,actual){
    const reaction=(actual.mood||0)+(actual.health||0);visual.paint(state,reaction);
    const content=openModal('这一刻，成为成长的一部分',choice.label,choice.story);
    content.classList.add('choice-confirmed');
    // 结果页展示刚才事件所在的场景；游戏已经保存，可随时刷新继续。
    visual.decorateModal(content,{...state,pendingEvent:event.id,phase:'event'},'event',reaction);
    content.append(el('p','term-memory',effectsText(actual)),modalButton(state.phase==='summary'?'收好这一页，查看学期总结 →':'收好这一页，继续校园生活 →',()=>{closeModal();renderPhase();}));
  }
  $('home-new').addEventListener('click',()=>hasSave?confirmReset(false):chooseCharacter('new'));
  $('home-continue').addEventListener('click',()=>{if(hasSave){if(visual.getSettings().character)enterGame();else chooseCharacter('continue');}});
  $('go-home').addEventListener('click',showHome);
  $('home-rules').addEventListener('click',()=>$('show-rules').click());
  $('change-character').addEventListener('click',()=>chooseCharacter('change'));
  $('motion-toggle').addEventListener('click',()=>visual.toggleMotion());
  $('sound-settings').addEventListener('click',()=>companions?.audioSettings());
  $('open-friends').addEventListener('click',()=>companions?.people());
  $('open-phone').addEventListener('click',()=>{if(campusPhone)campusPhone.open();else toast('校园手机模块未载入，请刷新页面或检查本地预览版本。原有游戏可继续。');});
  $('open-stories').addEventListener('click',()=>showStories());
  $('open-map').addEventListener('click',()=>showCampus());
  $('actor-reaction').addEventListener('click',()=>{visual.paint(state,1);toast('愿你保持热爱，也好好照顾自己。');});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)document.querySelectorAll('.actor').forEach(a=>a.style.animationPlayState='paused');else{document.querySelectorAll('.actor').forEach(a=>a.style.animationPlayState='');if(inGame)visual.paint(state);}});
  render(false);showHome();if(notice)toast(notice);
})();
