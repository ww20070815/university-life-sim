/* 原创代码原生校园插画。两套构图共用建筑语言，CSS变量决定四季色彩。无外部地图服务。 */
(function(root){
  'use strict';
  const D=typeof module!=='undefined'&&module.exports?require('./campus-data.js'):root.CampusData;
  function render(doc,portrait=false,onLocation=null){
    const width=portrait?480:1200,height=portrait?1000:800;
    const make=(tag,attrs={},parent)=>{const el=doc.createElementNS('http://www.w3.org/2000/svg',tag);for(const [k,v] of Object.entries(attrs))el.setAttribute(k,String(v));if(parent)parent.append(el);return el;};
    const svg=make('svg',{viewBox:`0 0 ${width} ${height}`,'aria-hidden':'true',class:portrait?'campus-art portrait':'campus-art wide'});
    make('rect',{width,height,rx:28,fill:'var(--campus-ground,#e9efdc)'},svg);
    for(const p of (portrait?[[10,70,80,160],[390,600,80,150]]:[[100,390,260,100],[480,360,210,100],[810,575,90,135]]))make('rect',{x:p[0],y:p[1],width:p[2],height:p[3],rx:30,fill:'var(--campus-lawn,#c4d1a0)',opacity:.65},svg);
    make('path',{d:portrait?'M240 35V950 M40 240H440 M40 420H440 M40 600H440 M40 780H440':'M85 290H1120 M100 560H1080 M370 60V720 M675 80V730 M970 80V700',fill:'none',stroke:'#d4d5bd','stroke-width':32,'stroke-linecap':'round'},svg);
    make('path',{d:portrait?'M240 40V940 M50 240H430 M50 420H430 M50 600H430 M50 780H430':'M85 290H1120 M100 560H1080 M370 60V720 M675 80V730 M970 80V700',fill:'none',stroke:'#fbf5e7','stroke-width':23,'stroke-linecap':'round'},svg);
    const tree=(x,y,r=16)=>{make('path',{d:`M${x} ${y}v${r+9}`,stroke:'#a99c7d','stroke-width':4},svg);make('ellipse',{cx:x+4,cy:y+9,rx:r+4,ry:r*.6,fill:'#728c6920'},svg);make('circle',{class:'campus-canopy',cx:x,cy:y,r,fill:'var(--campus-leaf,#a5bd82)',stroke:'#879e702e','stroke-width':2},svg);make('circle',{class:'campus-canopy',cx:x-4,cy:y-5,r:r*.55,fill:'var(--campus-leaf-light,#c7d69f)'},svg);};
    for(const [x,y] of (portrait?[[211,238],[260,599],[211,779]]:[[355,350],[680,555],[952,350]])){make('path',{d:`M${x} ${y}h26m-23 0v8m20 -8v8`,stroke:'#a59c7d','stroke-width':4,fill:'none'},svg);make('path',{d:`M${x} ${y-5}h26`,stroke:'#c9b78a','stroke-width':5},svg);}
    if(portrait){for(let row=0;row<6;row++)for(const x of [26,454])tree(x,75+row*155,17);for(let row=0;row<5;row++)tree(240,125+row*180,13);}
    else{for(let x=70;x<1150;x+=86){tree(x,65,18);tree(x,340,15);}for(let y=115;y<740;y+=95)tree(60,y,19);for(let x=470;x<930;x+=85)tree(x,725,16);}
    for(const loc of D.locations){
      const p=portrait?loc.portrait:loc.wide,cx=p[0]/100*width,cy=p[1]/100*height-38,scale=portrait?.76:1;
      const g=make('g',{transform:`translate(${cx},${cy}) scale(${scale})`,'data-building':loc.id},svg);
      // SVG建筑本身也可点；同地点的HTML按钮提供键盘、读屏和大触控目标。
      if(onLocation){g.setAttribute('style','pointer-events:auto;cursor:pointer');g.addEventListener('click',()=>onLocation(loc.id));}
      make('ellipse',{cx:7,cy:45,rx:81,ry:19,fill:'#64765b18'},g);
      if(loc.id==='lake'){
        make('ellipse',{cx:0,cy:7,rx:92,ry:51,fill:'#c9d4ad'},g);make('ellipse',{cx:0,cy:5,rx:82,ry:43,fill:'var(--campus-water,#9cc9c8)',stroke:'#8ab3ae','stroke-width':2},g);
        for(let i=0;i<4;i++)make('path',{d:`M${-53+i*9} ${-10+i*10}q20 6 44 0`,fill:'none',stroke:'#fffce8aa','stroke-width':2},g);
        make('path',{d:'M-70 28Q0 4 72 28',fill:'none',stroke:'#f9edcf','stroke-width':10},g);tree(cx-76*scale,cy-42*scale,15);tree(cx+65*scale,cy-38*scale,16);
      }else if(loc.id==='track'){
        make('rect',{x:-91,y:-45,width:182,height:108,rx:52,fill:'#c58f73'},g);make('rect',{x:-69,y:-24,width:138,height:66,rx:32,fill:'var(--campus-lawn,#acc18b)'},g);
        for(const inset of [7,14])make('rect',{x:-91+inset,y:-45+inset,width:182-inset*2,height:108-inset*2,rx:52-inset,fill:'none',stroke:'#fff7de','stroke-width':1.2},g);
        make('path',{d:'M0 -23V42 M-68 9H68',stroke:'#f6f4d8',fill:'none','stroke-width':1.5},g);make('circle',{cx:0,cy:9,r:16,stroke:'#f6f4d8',fill:'none'},g);
      }else if(loc.id==='plaza'){
        make('ellipse',{cx:0,cy:10,rx:85,ry:50,fill:'#ded7bd'},g);make('ellipse',{cx:0,cy:10,rx:64,ry:36,fill:'none',stroke:'#f8f3e0','stroke-width':3},g);make('ellipse',{cx:0,cy:9,rx:28,ry:17,fill:'#94bcbc',stroke:'#fff4d6','stroke-width':6},g);make('path',{d:'M0 7V-29 M-9 -16Q0 -39 9 -16',fill:'none',stroke:'#f7f2d8','stroke-width':5},g);
      }else if(loc.id==='avenue'){
        make('path',{d:'M-70 42Q-20 -35 66 -42',fill:'none',stroke:'#e6dbc0','stroke-width':27},g);make('path',{d:'M-70 42Q-20 -35 66 -42',fill:'none',stroke:'#fff9e9','stroke-width':17},g);
        for(let i=0;i<4;i++){tree(cx+(-58+i*33)*scale,cy+(-42+i*-6)*scale,16);tree(cx+(-26+i*31)*scale,cy+(45-i*13)*scale,14);}
      }else{
        const floors=loc.id==='dorm'?4:loc.id==='classroom'||loc.id==='lab'?3:2,h=floors*20+18;
        make('rect',{x:-72,y:-h+30,width:144,height:h,rx:3,fill:loc.id==='club'?'#e5d9c3':'#f4efde',stroke:'#a3afa0','stroke-width':2},g);
        make('path',{d:`M-72 ${-h+30}l17 -12H88L72 ${-h+30}Z`,fill:'#bac6bb',stroke:'#a0aea1','stroke-width':1},g);
        make('path',{d:`M72 ${-h+30}l16 -12V18L72 30Z`,fill:'#d5dccc',stroke:'#a3afa0','stroke-width':1},g);
        for(let row=0;row<floors;row++)for(let col=0;col<6;col++)make('rect',{x:-60+col*21,y:-h+40+row*20,width:13,height:12,rx:1,fill:row%2?'#a7c4c4':'#bed5cf',stroke:'#fdf9eb','stroke-width':2},g);
        make('rect',{x:-13,y:8,width:26,height:23,rx:2,fill:'#8baaaa'},g);make('path',{d:'M-28 34H28 M-34 39H34',stroke:'#bdc6b3','stroke-width':4},g);
        if(loc.id==='library')make('rect',{x:-30,y:-h+16,width:60,height:h-4,fill:'#b1ceca88',stroke:'#f9f4df','stroke-width':3},g);
        if(loc.id==='lab')make('path',{d:`M-38 ${-h+18}v-18m0 4h24`,stroke:'#8fa5a0','stroke-width':3,fill:'none'},g);
        if(loc.id==='canteen')make('path',{d:'M-78 -2H78L68 9H-68Z',fill:'#d2a78a'},g);
        tree(cx-91*scale,cy+10*scale,16);tree(cx+99*scale,cy+8*scale,14);
      }
    }
    for(let i=0;i<(portrait?12:24);i++)make('circle',{cx:portrait?45+(i%3)*174:90+(i%8)*140,cy:portrait?185+Math.floor(i/3)*182:110+Math.floor(i/8)*225,r:3,fill:'var(--campus-flower,#dcc0b0)'},svg);
    return svg;
  }
  const api={render};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.CampusArt=api;
})(typeof window!=='undefined'?window:globalThis);
