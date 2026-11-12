/* V2 表现层只读取游戏状态。外观设置与 V1 存档隔离。 */
(function (root) {
  'use strict';
  const SETTINGS_KEY = 'university-four-years-visual-v2';
  const CHARACTERS = {
    male: {name:'男主角 · 向光而行',short:'追光的同学',intro:'清爽，坚定，沉稳。把热爱藏进日常，用自己的节奏走向更大的世界。'},
    female: {name:'女主角 · 自有锋芒',short:'逐梦的同学',intro:'明亮，独立，自信。温柔也有力量，始终掌握自己人生的方向。'}
  };
  const SCENES = {campus:'校园主广场',library:'图书馆',dorm:'学生宿舍',track:'校园操场',canteen:'校园食堂',graduation:'毕业礼堂'};
  const ACTION_SCENES = {study:'library',skill:'library',social:'campus',work:'library',exercise:'track',relax:'dorm',rest:'dorm'};
  const EVENT_SCENES = {gaming:'dorm',conflict:'dorm',math:'library',job:'library',contest:'library',project:'library',scholarship:'library',finals:'library',sports:'track',canteen:'canteen',farewell:'graduation'};
  const EXPRESSIONS = {calm:'平静 · 来日方长',happy:'开心 · 好事正在发生',tired:'疲惫 · 记得照顾自己',sad:'沮丧 · 慢慢来也没关系',graduate:'毕业 · 山海皆可赴'};
  function moodFor(stats,reaction=0) {
    if(stats.health<35)return 'tired';
    if(stats.mood<35||reaction<0)return 'sad';
    if(stats.mood>=80||reaction>0)return 'happy';
    return 'calm';
  }
  function sceneFor(state,event=false) {
    if(state.phase==='ending')return 'graduation';
    if(event)return EVENT_SCENES[state.pendingEvent]||'campus';
    return ACTION_SCENES[state.lastAction]||'campus';
  }
  function validateSettings(raw){return {character:Object.prototype.hasOwnProperty.call(CHARACTERS,raw?.character)?raw.character:null,motion:raw?.motion!==false};}
  const api={SETTINGS_KEY,CHARACTERS,SCENES,ACTION_SCENES,EVENT_SCENES,EXPRESSIONS,moodFor,sceneFor,validateSettings};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(typeof document==='undefined')return;
  let settings=validateSettings(null),scene='',sceneTimer=0;
  try{settings=validateSettings(JSON.parse(localStorage.getItem(SETTINGS_KEY)));}catch{/* 禁止存储时使用内存设置。 */}
  function saveSettings(){try{localStorage.setItem(SETTINGS_KEY,JSON.stringify(settings));return true;}catch{return false;}}
  function setCharacter(character){if(!Object.prototype.hasOwnProperty.call(CHARACTERS,character))return false;settings.character=character;saveSettings();return true;}
  function applyMotion(){document.documentElement.dataset.motion=settings.motion?'on':'off';const b=document.getElementById('motion-toggle');b.textContent=`动画：${settings.motion?'开启':'关闭'}`;b.setAttribute('aria-pressed',String(!settings.motion));}
  function toggleMotion(){settings.motion=!settings.motion;saveSettings();applyMotion();}
  function actor(character=settings.character||'male',expression='calm') {
    const node=document.createElement('div');node.className='actor';node.dataset.character=character;node.dataset.expression=expression;node.setAttribute('role','img');node.setAttribute('aria-label',`${CHARACTERS[character].name}，${EXPRESSIONS[expression]}`);
    for(const c of ['actor-frame','actor-blink']){const part=document.createElement('span');part.className=c;node.append(part);}return node;
  }
  function changeScene(next) {
    if(scene===next)return;clearTimeout(sceneTimer);scene=next;
    const stage=document.getElementById('campus-stage'),base=stage.querySelector('.scene-base'),layer=stage.querySelector('.scene-next');
    const url=`url("./assets/backgrounds/${next}.webp"),url("./assets/backgrounds/fallback.svg")`;layer.style.backgroundImage=url;layer.classList.remove('is-visible');void layer.offsetWidth;layer.classList.add('is-visible');
    document.getElementById('scene-name').textContent=SCENES[next];stage.dataset.scene=next;
    // 计时器只交接背景图片，不参与结算。
    sceneTimer=setTimeout(()=>{base.style.backgroundImage=url;layer.classList.remove('is-visible');},650);
  }
  function paint(state,reaction=0) {
    root.CampusAudio?.setScene(sceneFor(state));
    const character=settings.character||'male',expression=state.phase==='ending'?'graduate':moodFor(state.stats,reaction);
    const node=document.querySelector('.main-actor');node.dataset.character=character;node.dataset.expression=expression;
    document.getElementById('player-name').textContent=CHARACTERS[character].short;
    document.getElementById('expression-label').textContent=EXPRESSIONS[expression];
    document.getElementById('stage-line').textContent=state.phase==='ending'?'这一次，我们把青春写成了自己的答案。':state.stats.health<35?'今天慢一点，也是一种认真生活。':state.turn===0&&state.phase==='action'?'风从校园吹过，故事从这里开始。':state.logs[0]?.title;
    document.getElementById('scene-day').textContent=String(Math.min(state.turn+1,32)).padStart(2,'0');changeScene(sceneFor(state));
  }
  function decorateModal(content,state,kind='event',reaction=0) {
    const stage=document.createElement('div');stage.className=`story-art ${kind}`;
    const next=kind==='ending'?'graduation':sceneFor(state,kind==='event');stage.style.backgroundImage=`url("./assets/backgrounds/${next}.webp"),url("./assets/backgrounds/fallback.svg")`;
    stage.append(actor(settings.character||'male',kind==='ending'?'graduate':moodFor(state.stats,reaction)));
    const caption=document.createElement('span');caption.textContent=SCENES[next];stage.append(caption);content.prepend(stage);content.parentElement.dataset.kind=kind;
  }
  Object.assign(api,{setCharacter,actor,paint,decorateModal,applyMotion,toggleMotion,getSettings:()=>({...settings})});
  root.CampusVisual=api;applyMotion();
  // 隐藏页面时连闭眼帧一起暂停；不涉及游戏回合和存档。
  function syncVisibility(){document.documentElement.dataset.pageHidden=document.hidden?'true':'false';}
  document.addEventListener('visibilitychange',syncVisibility);syncVisibility();
  // 资源失败时提供诚实的文字提示，游戏规则仍可正常运行。
  for(const character of Object.keys(CHARACTERS)){
    const image=new Image();image.onerror=()=>{document.documentElement.dataset[character+'Missing']='true';};
    image.src=`./assets/characters/${character}.webp`;
  }
})(typeof window!=='undefined'?window:globalThis);
