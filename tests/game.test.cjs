// 无需安装测试库。运行：node --test tests/game.test.cjs
const {test}=require('node:test');
const assert=require('node:assert/strict');
const g=require('../game.js');
function rng(seed){return ()=>{seed=(Math.imul(1664525,seed)+1013904223)>>>0;return seed/4294967296;};}
function restored(s){const result=g.validateSave(JSON.parse(JSON.stringify(s)));assert.ok(result,'每个稳定阶段的存档都能恢复');return result;}
function play(seed,selector,eventSelector){let s=g.freshState();const random=rng(seed);let actions=0;
  while(s.phase!=='ending'){
    s=restored(s);
    if(s.phase==='action'){
      const options=g.ACTIONS.filter(a=>s.stats.money>=-(a.effects.money||0));
      const a=selector?selector(s,options,random):options[Math.floor(random()*options.length)];
      assert.ok(g.takeAction(s,a.id,random));actions++;
      const snapshot=JSON.stringify(s);assert.equal(g.takeAction(s,a.id),false);assert.equal(JSON.stringify(s),snapshot);
    }else if(s.phase==='event'){
      const event=g.EVENTS.find(e=>e.id===s.pendingEvent);assert.ok(g.eligible(s,event));
      const choices=event.options.map((o,i)=>({o,i})).filter(({o})=>s.stats.money>=-(o.effects.money||0));assert.ok(choices.length);
      assert.ok(g.chooseOption(s,eventSelector?eventSelector(choices):choices[Math.floor(random()*choices.length)].i));
      const snapshot=JSON.stringify(s);assert.equal(g.chooseOption(s,0),false);assert.equal(JSON.stringify(s),snapshot);
    }else{assert.equal(s.phase,'summary');assert.equal(s.turn%4,0);assert.ok(g.continueTerm(s));}
    for(const [key,value] of Object.entries(s.stats))assert.ok(value>=0&&value<=(key==='money'?999999:100));
    assert.ok(actions<=32);
  }
  assert.equal(actions,32);assert.equal(s.turn,32);assert.equal(s.summaries.length,8);assert.equal(g.takeAction(s,'rest'),false);return restored(s);
}
test('初始数值与属性边界',()=>{const s=g.freshState();assert.deepEqual(s.stats,g.INITIAL);g.applyEffects(s,{study:200,money:-99999,health:-1000,mood:300});assert.equal(s.stats.study,100);assert.equal(s.stats.money,0);assert.equal(s.stats.health,0);assert.equal(s.stats.mood,100);});
test('余额不足无法行动或购买事件选项，零余额仍可推进',()=>{const s=g.freshState();s.stats.money=0;assert.equal(g.takeAction(s,'social'),false);assert.equal(g.takeAction(s,'relax'),false);assert.ok(g.takeAction(s,'rest'));s.pendingEvent='canteen';const before=JSON.stringify(s);assert.equal(g.chooseOption(s,1),false);assert.equal(JSON.stringify(s),before);assert.ok(g.chooseOption(s,0));});
test('18 个事件均有 2～3 个选项和免费出口，年级事件隔离',()=>{assert.ok(g.EVENTS.length>=15);for(const e of g.EVENTS){assert.ok(e.options.length>=2&&e.options.length<=3);assert.ok(e.options.some(o=>!o.effects.money||o.effects.money>=0));}const s=g.freshState();for(const id of ['internship','recruit','farewell'])assert.equal(g.eligible(s,g.EVENTS.find(e=>e.id===id)),false);for(let i=0;i<100;i++)assert.ok(!['internship','recruit','farewell'].includes(g.chooseEvent(s,rng(i)).id));});
test('期末与毕业事件按回合出现',()=>{const s=g.freshState();for(let turn=3;turn<31;turn+=4){s.turn=turn;assert.equal(g.chooseEvent(s,Math.random).id,'finals');}s.turn=31;assert.equal(g.chooseEvent(s,Math.random).id,'farewell');s.turn=16;assert.equal(g.chooseEvent(s,Math.random).id,'internship');s.turn=24;assert.equal(g.chooseEvent(s,Math.random).id,'recruit');});
test('1000 局完整随机流程：32 次行动、8 次总结、防重入、存档往返、属性边界',()=>{for(let seed=1;seed<=1000;seed++)play(seed);});
test('结局阈值与判定优先级',()=>{
 const cases=[['delay',{study:39}],['research',{study:90,skill:60,health:40}],['engineer',{study:65,skill:90,health:40}],['allround',{study:75,skill:75,social:75,health:75,mood:75}],['popular',{social:90,mood:60}],['founder',{skill:70,social:75,money:2000}],['worker',{money:3000,health:30}],['happy',{}]];
 for(const [id,stats] of cases){const s=g.freshState();Object.assign(s.stats,stats);if(id==='worker')s.counts.work=8;assert.equal(g.judgeEnding(s).id,id);}
 const s=g.freshState();Object.assign(s.stats,{study:100,skill:100,social:100,health:100,mood:100,money:9000});assert.equal(g.judgeEnding(s).id,'allround');s.stats.health=10;assert.equal(g.judgeEnding(s).id,'delay');
});
test('损坏、旧版本、非法阶段和恶意文本存档安全处理',()=>{assert.equal(g.validateSave(null),null);for(const mutate of [s=>s.version=0,s=>s.turn=33,s=>s.stats.study=101,s=>s.stats.money=-1,s=>s.phase='ending',s=>s.phase='event',s=>s.counts.rest=100,s=>s.logs=null,s=>s.summaries=[null],s=>s.termStart=null,s=>s.stats.health='75']){const s=g.freshState();mutate(s);assert.equal(g.validateSave(s),null);}const s=g.freshState();s.logs[0].title='<img src=x onerror=alert(1)>';assert.ok(g.validateSave(s)); /* 渲染使用 textContent，不解释存档中的 HTML */});
test('八种结局均能由完整 32 回合达成',()=>{
 const reached=new Set();const examples={};
 for(let seed=1;seed<=20;seed++){
   const s=play(seed,(state,options)=>options.find(a=>a.id===['work','rest','exercise','rest'][state.turn%4]),choices=>choices.sort((a,b)=>(a.o.effects.social||0)-(b.o.effects.social||0))[0].i);
   const id=g.judgeEnding(s).id;reached.add(id);examples[id]={seed,counts:s.counts,stats:s.stats};
 }
 // 多种发展倾向轮流试验：实际行动与事件，不直接改毕业属性。
 const weights=[{study:6,skill:3,social:1,health:2,mood:1,money:.001},{study:2,skill:7,social:1,health:2,mood:1,money:.001},{study:3,skill:3,social:3,health:3,mood:3,money:.001},{study:1,skill:1,social:7,health:2,mood:3,money:.002},{study:1,skill:4,social:4,health:2,mood:1,money:.018},{study:1,skill:1,social:1,health:3,mood:2,money:.04}];
 const plans=[Array(32).fill('relax'),Array(32).fill('rest'),Array.from({length:32},(_,i)=>['work','rest','exercise','rest'][i%4]),[...Array(8).fill('work'),...Array(6).fill('skill'),...Array(6).fill('social'),...Array(8).fill('rest'),...Array(4).fill('exercise')]];
 for(let seed=1;seed<=200&&reached.size<8;seed++)for(const plan of plans){
   const s=play(seed,(state,options)=>options.find(a=>a.id===plan[state.turn])||options.find(a=>a.id==='rest'));
   const id=g.judgeEnding(s).id;reached.add(id);examples[id]={seed,counts:s.counts,stats:s.stats};
 }
 for(let seed=1;seed<=1500&&reached.size<8;seed++){
   const w=weights[seed%weights.length];
   const s=play(seed,(state,options,random)=>{
     const score=a=>Object.entries(a.effects).reduce((sum,[k,v])=>{const current=state.stats[k],max=k==='money'?999999:100;const actual=Math.min(max,Math.max(0,current+v))-current;const urgency=k==='health'&&current<40?8:k==='study'&&current<45?4:k==='mood'&&current<25?3:1;return sum+actual*(w[k]||0)*urgency;},0)+(random()*35);
     return options.map(a=>({a,score:score(a)})).sort((a,b)=>b.score-a.score)[0].a;
   });const id=g.judgeEnding(s).id;reached.add(id);examples[id]={seed,counts:s.counts,stats:s.stats};
 }
 console.log('实际完整路线达成：'+[...reached].join('、'));
 assert.equal(reached.size,8,'八种结局应当都有可达路线');
});
