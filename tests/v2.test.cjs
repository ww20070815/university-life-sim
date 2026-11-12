const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const old=require('./fixtures/v1-game.cjs');
const game=require('../game.js');
const visual=require('../visual.js');
const ROOT=path.resolve(__dirname,'..');

test('V1 核心源码逐字保留，存档键与版本不变',()=>{
  const prefix=file=>fs.readFileSync(file,'utf8').split('  const $=id=>')[0];
  assert.equal(prefix(path.join(ROOT,'game.js')),prefix(path.join(__dirname,'fixtures/v1-game.cjs')));
});
test('128 条 V1 完整路线逐步读入 V2：属性、次数、事件、学期、毕业逐项相同',()=>{
  for(let seed=0;seed<128;seed++){
    const a=old.freshState(),b=game.freshState();
    let step=0;
    while(a.phase!=='ending'){
      assert.deepEqual(game.validateSave(JSON.parse(JSON.stringify(a))),a);
      assert.deepEqual(a,b);
      if(a.phase==='action'){
        const options=old.ACTIONS.filter(x=>a.stats.money>=-(x.effects.money||0));
        const action=options[(seed+step)%options.length].id;
        const random=()=>((seed*31+step*17)%100)/100;
        old.takeAction(a,action,random);game.takeAction(b,action,random);
      }else if(a.phase==='event'){
        const choices=old.EVENTS.find(e=>e.id===a.pendingEvent).options.map((o,i)=>({o,i})).filter(x=>a.stats.money>=-(x.o.effects.money||0));
        const choice=choices[(seed+step)%choices.length].i;
        old.chooseOption(a,choice);game.chooseOption(b,choice);
      }else{old.continueTerm(a);game.continueTerm(b);}
      step++;
    }
    assert.deepEqual(a,b);assert.equal(old.judgeEnding(a).id,game.judgeEnding(b).id);
    assert.deepEqual(game.validateSave(a),a);
  }
});
test('四种表情、毕业表情、六场景和七行动映射',()=>{
  assert.equal(visual.moodFor({health:70,mood:65}),'calm');
  assert.equal(visual.moodFor({health:70,mood:90}),'happy');
  assert.equal(visual.moodFor({health:20,mood:90}),'tired');
  assert.equal(visual.moodFor({health:70,mood:20}),'sad');
  assert.equal(visual.moodFor({health:70,mood:65},-5),'sad');
  for(const action of game.ACTIONS)assert.ok(visual.SCENES[visual.sceneFor({...game.freshState(),lastAction:action.id})]);
  assert.equal(visual.sceneFor({...game.freshState(),pendingEvent:'canteen'},true),'canteen');
  assert.equal(visual.sceneFor({phase:'ending'}),'graduation');
  assert.equal(Object.keys(visual.SCENES).length,6);
});
test('外观设置键隔离、坏设置安全回退、角色不能影响规则',()=>{
  assert.notEqual(visual.SETTINGS_KEY,'university-four-years-v1');
  const s=game.freshState(),before=JSON.stringify(s);
  for(const character of ['male','female',null,'bad','__proto__','constructor']){
    assert.ok(visual.validateSettings({character,motion:false}));visual.sceneFor(s);visual.moodFor(s.stats);
    assert.equal(JSON.stringify(s),before);
  }
  assert.deepEqual(visual.validateSettings(null),{character:null,motion:true});
  assert.equal(visual.validateSettings({character:'__proto__'}).character,null);
});
test('Manifest 和所有静态引用均为存在的相对路径，适配 Pages 子目录',()=>{
  const manifest=JSON.parse(fs.readFileSync(path.join(ROOT,'manifest.webmanifest')));
  assert.equal(manifest.start_url,'./');assert.equal(manifest.scope,'./');
  for(const icon of manifest.icons){assert.ok(icon.src.startsWith('./'));assert.ok(fs.existsSync(path.join(ROOT,icon.src)));}
  const html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
  for(const match of html.matchAll(/(?:href|src)="([^"]+)"/g)){
    assert.ok(match[1].startsWith('./'));assert.ok(fs.existsSync(path.join(ROOT,match[1])));
  }
  const css=fs.readFileSync(path.join(ROOT,'style.css'),'utf8');
  for(const match of css.matchAll(/url\(['"]?([^)'"\s]+)['"]?\)/g))assert.ok(fs.existsSync(path.join(ROOT,match[1])),match[1]);
  for(const name of Object.keys(visual.SCENES))assert.ok(fs.existsSync(path.join(ROOT,'assets/backgrounds',name+'.webp')));
  for(const name of Object.keys(visual.CHARACTERS))assert.ok(fs.existsSync(path.join(ROOT,'assets/characters',name+'.webp')));
  assert.ok(!fs.readFileSync(path.join(ROOT,'game.js'),'utf8').includes('serviceWorker.register'));
});
test('资源预算：人物每张 < 350KB、六场景每张 < 400KB、全部主素材 < 3MB',()=>{
  let total=0;
  for(const [folder,limit] of [['characters',350000],['backgrounds',400000]])for(const name of fs.readdirSync(path.join(ROOT,'assets',folder)).filter(n=>n.endsWith('.webp'))){const size=fs.statSync(path.join(ROOT,'assets',folder,name)).size;assert.ok(size<limit,name);total+=size;}
  assert.ok(total<3000000);
});
test('静态预览子目录：网页、Manifest、人物背景响应正确且不暴露源码备份',async()=>{
  const server=require('../preview.cjs').createServer();
  function request(url){return new Promise(resolve=>{let status,headers;server.emit('request',{url},{writeHead:(s,h)=>{status=s;headers=h;},end:data=>resolve({status,headers,data})});});}
  for(const file of ['','index.html','style.css','game.js','visual.js','manifest.webmanifest','assets/characters/male.webp','assets/characters/female.webp','assets/backgrounds/graduation.webp']){
    const response=await request('/university-life-sim/'+file);assert.equal(response.status,200,file);assert.ok(response.data.length>0);
    if(file.endsWith('webmanifest'))assert.match(response.headers['Content-Type'],/application\/manifest/);
  }
  for(const file of ['.git/config','backups/v1-before-v2-2026-11-11.zip','tests/art-input.json','assets/../../game.js','%ZZ'])assert.ok((await request('/'+file)).status>=400,file);
  server.close();
});
