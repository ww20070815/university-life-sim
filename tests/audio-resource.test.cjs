const {test}=require('node:test'),a=require('node:assert/strict');
test('V3 脚本、WAV MIME 与手机媒体字节范围预览均可用',async()=>{
 const server=require('../preview.cjs').createServer();
 const request=(url,range)=>new Promise(resolve=>{let status,headers;server.emit('request',{url,headers:range?{range}:{}},{writeHead:(s,h)=>{status=s;headers=h;},end:data=>resolve({status,headers,data})});});
 for(const file of ['npc-data.js','phone-data.js','story-data.js','story.js','story-ui.js','campus-data.js','campus.js','campus-art.js','campus-ui.js','phone.js','phone-ui.js','relationships.js','audio.js','companion-ui.js'])a.equal((await request('/university-life-sim/'+file)).status,200);
 const wav='/university-life-sim/assets/audio/bgm/campus.wav',full=await request(wav);a.equal(full.status,200);a.equal(full.headers['Content-Type'],'audio/wav');
 for(const range of ['bytes=0-1','bytes=100-','bytes=-32','bytes=0-9999999']){const r=await request(wav,range);a.equal(r.status,206);a.match(r.headers['Content-Range'],/^bytes /);a.ok(r.data.length>0);}
 a.equal((await request(wav,'bytes=99999999-')).status,416);a.equal((await request(wav,'bytes=-0')).status,416);server.close();
});
