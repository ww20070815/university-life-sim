// 可选静态预览，不包含游戏后端。node preview.cjs，Ctrl+C 停止。
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const ROOT = __dirname;
const TYPES = {'.html':'text/html','.css':'text/css','.js':'text/javascript','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.wav':'audio/wav'};
const PAGES = new Set(['index.html','style.css','game.js','visual.js','npc-data.js','phone-data.js','story-data.js','story.js','story-ui.js','campus-data.js','campus.js','campus-art.js','campus-ui.js','phone.js','phone-ui.js','relationships.js','audio.js','companion-ui.js','manifest.webmanifest']);
function createServer() {
  return http.createServer((req,res)=>{
    let relative;
    try {
      const decoded=decodeURIComponent(req.url.split('?')[0]);
      if(decoded.split(/[\\/]/).includes('..'))throw new Error('Invalid path');
      relative=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/university-life-sim(?=\/|$)/,'').replace(/^\//,'') || 'index.html';
    }
    catch { res.writeHead(400); res.end('Bad request'); return; }
    const target=path.resolve(ROOT,relative), extension=path.extname(target);
    const inside=target.startsWith(ROOT+path.sep);
    if(!inside || !(PAGES.has(relative)||(relative.startsWith('assets/')&&TYPES[extension]))) { res.writeHead(404);res.end('Not found');return; }
    fs.readFile(target,(error,data)=>{
      if(error){res.writeHead(404);res.end('Not found');return;}
      const headers={'Content-Type':TYPES[extension]+(extension==='.wav'?'':'; charset=utf-8'),'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff','Accept-Ranges':'bytes'};
      const range=req.headers?.range;
      if(range){const match=/^bytes=(\d*)-(\d*)$/.exec(range);let start=NaN,end=data.length-1;
        if(match&&(match[1]||match[2])){if(match[1]){start=Number(match[1]);if(match[2])end=Math.min(Number(match[2]),end);}else if(Number(match[2])>0)start=Math.max(0,data.length-Number(match[2]));}
        if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start> end||start>=data.length){res.writeHead(416,{'Content-Range':'bytes */'+data.length});res.end();return;}
        res.writeHead(206,{...headers,'Content-Range':`bytes ${start}-${end}/${data.length}`,'Content-Length':end-start+1});res.end(data.subarray(start,end+1));return;
      }
      res.writeHead(200,{...headers,'Content-Length':data.length});res.end(data);
    });
  });
}
module.exports={createServer};
if(require.main===module){
  const server=createServer(),port=Number(process.env.PORT)||8080;
  server.on('error',error=>{console.error('预览启动失败：'+error.message);process.exitCode=1;});
  server.listen(port,'0.0.0.0',()=>{
    console.log(`电脑预览：http://localhost:${port}/university-life-sim/`);
    for(const addresses of Object.values(os.networkInterfaces()))for(const a of addresses||[])if(a.family==='IPv4'&&!a.internal)console.log(`同一 Wi-Fi 手机：http://${a.address}:${port}/university-life-sim/`);
    console.log('按 Ctrl+C 停止预览。');
  });
}
