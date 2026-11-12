// 只读布局检查。浏览器测试将此函数交给页面执行，不改变属性、存档或 DOM。
() => {
  const visible = node => node && node.getClientRects().length > 0;
  const bounds = node => { const r=node.getBoundingClientRect(); return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height}; };
  const inside = (a,b) => a.left>=b.left-2 && a.right<=b.right+2 && a.top>=b.top-2 && a.bottom<=b.bottom+2;
  const clipped = node => node.scrollWidth>node.clientWidth+1 || node.scrollHeight>node.clientHeight+1;
  const actors=[];
  for(const selector of ['.poster-portrait-slot .actor','.main-actor','.character-card .actor','.story-art .actor']) {
    for(const node of document.querySelectorAll(selector)) {
      if(!visible(node))continue;
      const container=node.closest('.poster-portrait-slot,.campus-stage,.character-card,.story-art');
      const a=bounds(node),b=bounds(container);
      actors.push({selector,character:node.dataset.character,ratio:a.width/a.height,inside:inside(a,b)});
    }
  }
  const mod=document.querySelector('.modal');
  const buttons=[...document.querySelectorAll('button')].filter(visible).map(node=>({label:node.textContent.trim().slice(0,32),height:bounds(node).height,font:getComputedStyle(node).fontSize,clipped:clipped(node)}));
  const story=document.querySelector('.story-art');
  const stage=document.querySelector('.campus-stage');
  const actor=document.querySelector('.main-actor'),dialogue=document.querySelector('.stage-dialogue');
  const people=document.querySelector('.poster-portrait-slot'),homeButtons=document.querySelector('.home-buttons');
  return {
    width:innerWidth,client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth,
    home:visible(document.querySelector('#home-view')),game:visible(document.querySelector('#game-view')),
    actors,buttons,
    mainActorDialogueOverlap:visible(stage)?Math.max(0,bounds(actor).bottom-bounds(dialogue).top):null,
    homePeopleButtonsOverlap:visible(people)?Math.max(0,bounds(people).bottom-bounds(homeButtons).top):null,
    modal:visible(mod)?{client:mod.clientWidth,scroll:mod.scrollWidth,scrollable:mod.scrollHeight>mod.clientHeight,top:bounds(mod).top,bottom:bounds(mod).bottom,height:bounds(mod).height}:null,
    sceneBackground:visible(stage)?getComputedStyle(stage.querySelector('.scene-base')).backgroundSize:null,
    storyBackground:visible(story)?getComputedStyle(story).backgroundSize:null,
    fonts:visible(stage)?Object.fromEntries(['.stat-line','.action strong','.effect-preview','.stage-dialogue p'].map(s=>[s,getComputedStyle(document.querySelector(s)).fontSize])):null
  };
}
