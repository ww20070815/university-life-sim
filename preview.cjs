// 可选开发工具：仅分发静态文件，游戏本身不需要 Node.js 或后端。
// 在项目目录运行 node preview.cjs，然后用同一 Wi-Fi 下的手机访问输出的地址。
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const files = {'/':'index.html','/index.html':'index.html','/style.css':'style.css','/game.js':'game.js'};
const types = {'.html':'text/html','.css':'text/css','.js':'text/javascript'};
const server = http.createServer((req,res)=>{
  const filename=files[req.url.split('?')[0]];
  if(!filename){res.writeHead(404);res.end('Not found');return;}
  fs.readFile(path.join(__dirname,filename),(error,data)=>{
    if(error){res.writeHead(500);res.end('Unable to read file');return;}
    res.writeHead(200,{'Content-Type':types[path.extname(filename)]+'; charset=utf-8','Cache-Control':'no-store'});res.end(data);
  });
});
server.on('error',error=>{console.error('预览启动失败：'+error.message);process.exitCode=1;});
server.listen(8080,'0.0.0.0',()=>{
  console.log('电脑预览：http://localhost:8080');
  for(const addresses of Object.values(os.networkInterfaces()))for(const a of addresses||[])if(a.family==='IPv4'&&!a.internal)console.log('同一 Wi-Fi 的手机可尝试：http://'+a.address+':8080');
  console.log('按 Ctrl+C 停止预览。');
});
