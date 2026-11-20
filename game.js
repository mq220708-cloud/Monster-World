(() => {
  'use strict';
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d', { alpha: false });
  const shell = document.getElementById('game-shell');
  const toastEl = document.getElementById('toast');
  const modal = document.getElementById('modal');
  const modalContent = document.getElementById('modal-content');
  const TILE = 24, MAP_W = 48, MAP_H = 48;
  const SAVE_KEY = 'monsterWorld.phase1.save.v1';
  let viewW = 360, viewH = 640, dpr = 1, last = 0, toastTimer = 0;
  let keys = new Set(), joy = {x:0,y:0}, interactCooldown = 0, gameStarted = false;
  const map = Array.from({length:MAP_H}, (_, y) => Array.from({length:MAP_W}, (_, x) => {
    if (x < 2 || y < 2 || x > MAP_W-3 || y > MAP_H-3) return 2;
    if ((x-34)**2+(y-12)**2 < 36) return 3;
    if ((x-33)**2+(y-12)**2 < 55 && Math.random() < .23) return 3;
    return 0;
  }));
  // A readable village clearing, path, ponds, trees and buildings.
  for(let y=18;y<29;y++) for(let x=18;x<31;x++) map[y][x]=0;
  for(let x=0;x<MAP_W;x++) for(let y=30;y<33;y++) if(x>5&&x<43) map[y][x]=1;
  for(let y=0;y<MAP_H;y++) for(let x=25;x<28;x++) if(y>7&&y<43) map[y][x]=1;
  const objects = [
    {type:'house',x:19,y:19,w:4,h:3,name:'Nhà của bạn'},
    {type:'lab',x:28,y:19,w:4,h:3,name:'Phòng nghiên cứu'},
    {type:'sign',x:25,y:34,name:'Bảng chỉ dẫn'},
    {type:'npc',x:31,y:24,name:'Nhà nghiên cứu Mira'},
    {type:'tree',x:14,y:20},{type:'tree',x:15,y:24},{type:'tree',x:35,y:22},{type:'tree',x:37,y:25},
    {type:'tree',x:12,y:32},{type:'tree',x:17,y:35},{type:'tree',x:34,y:34},{type:'tree',x:39,y:30}
  ];
  for(let y=7;y<43;y++) for(let x=6;x<43;x++) if(Math.random()<.065 && map[y][x]===0 && !objects.some(o=>Math.abs(o.x-x)<2&&Math.abs(o.y-y)<2)) objects.push({type:'tree',x,y});
  const player = {x:25.5*TILE,y:27*TILE,speed:118,faceX:0,faceY:1,walk:0};
  const saved = loadSave();
  const hasValidSave = !!(saved && Number.isFinite(saved.x) && Number.isFinite(saved.y));
  const titleScreen = document.getElementById('title-screen');
  const continueButton = document.getElementById('continue-button');
  const continueNote = document.getElementById('continue-note');
  if (!hasValidSave) { continueButton.disabled = true; }
  else { continueButton.disabled = false; continueNote.textContent = 'Dữ liệu đã lưu trên thiết bị này'; }
  function loadSave(){try{return JSON.parse(localStorage.getItem(SAVE_KEY)||'null')}catch{return null}}
  function save(){if(!gameStarted)return;try{localStorage.setItem(SAVE_KEY,JSON.stringify({x:player.x,y:player.y,version:1,updatedAt:Date.now()}));document.getElementById('save-status').textContent='Đã lưu';}catch{document.getElementById('save-status').textContent='Không lưu được';}}
  function resize(){const r=shell.getBoundingClientRect();viewW=r.width;viewH=r.height;dpr=Math.min(window.devicePixelRatio||1,2);canvas.width=Math.round(viewW*dpr);canvas.height=Math.round(viewH*dpr);ctx.imageSmoothingEnabled=false;}
  function toast(msg){toastEl.textContent=msg;toastEl.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>toastEl.classList.remove('show'),1800)}
  function tileAt(px,py){const x=Math.floor(px/TILE),y=Math.floor(py/TILE);if(x<0||y<0||x>=MAP_W||y>=MAP_H)return 2;return map[y][x]}
  function blocked(px,py){const t=tileAt(px,py);if(t===2||t===3)return true;return objects.some(o=>['house','lab','tree'].includes(o.type)&&px/TILE>=o.x-.25&&px/TILE<o.x+(o.w||1)&&py/TILE>=o.y-.25&&py/TILE<o.y+(o.h||1));}
  function drawTile(x,y,t,sx,sy){const colors=['#77a95c','#c7ad70','#355b45','#367e9a'];ctx.fillStyle=colors[t];ctx.fillRect(sx,sy,TILE,TILE);if(t===0){ctx.fillStyle=((x*7+y*13)%5===0)?'#8fbd6a':'#6c9d52';ctx.fillRect(sx+((x*13+y*3)%18),sy+((x*5+y*11)%18),2,2);if((x+y)%7===0){ctx.fillStyle='#d5d17c';ctx.fillRect(sx+8,sy+13,2,2)}}else if(t===1){ctx.fillStyle='#b79a60';ctx.fillRect(sx+4,sy+7,5,2);ctx.fillRect(sx+16,sy+18,3,2)}else if(t===3){ctx.fillStyle='#4d91a4';ctx.fillRect(sx+((x+y)%9),sy+7,7,1)}}
  function drawTree(o,sx,sy){ctx.fillStyle='#64452f';ctx.fillRect(sx+9,sy+13,7,12);ctx.fillStyle='#315c39';ctx.fillRect(sx+2,sy+3,21,15);ctx.fillStyle='#447d45';ctx.fillRect(sx+5,sy,15,16);ctx.fillStyle='#6c9d50';ctx.fillRect(sx+7,sy+3,5,5);ctx.fillRect(sx+16,sy+9,3,3)}
  function drawBuilding(o,sx,sy,color){ctx.fillStyle='#594334';ctx.fillRect(sx,sy+14,TILE*o.w,TILE*o.h);ctx.fillStyle=color;ctx.fillRect(sx-3,sy+3,TILE*o.w+6,17);ctx.fillStyle='#ead39a';for(let i=0;i<o.w;i++)ctx.fillRect(sx+4+i*TILE,sy+8,12,7);ctx.fillStyle='#5b4433';ctx.fillRect(sx+TILE*o.w/2-5,sy+18,10,20);ctx.fillStyle='#b9d7c0';ctx.fillRect(sx+TILE*o.w/2-3,sy+20,6,7)}
  function drawPlayer(sx,sy){const bob=Math.sin(player.walk)*1.5;ctx.fillStyle='#2d4735';ctx.fillRect(sx+5,sy+19+bob,14,5);ctx.fillStyle='#e6bd8d';ctx.fillRect(sx+7,sy+3+bob,10,10);ctx.fillStyle='#493b32';ctx.fillRect(sx+6,sy+1+bob,12,5);ctx.fillStyle='#d7a34f';ctx.fillRect(sx+5,sy+13+bob,14,9);ctx.fillStyle='#385e83';ctx.fillRect(sx+6,sy+21+bob,5,5);ctx.fillRect(sx+14,sy+21+bob,5,5);ctx.fillStyle='#f1e3bd';ctx.fillRect(sx+9,sy+7+bob,2,2);ctx.fillRect(sx+14,sy+7+bob,2,2)}
  function render(){ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle='#315d3d';ctx.fillRect(0,0,viewW,viewH);const worldViewH=viewH-140;const camX=player.x-viewW/2,camY=player.y-worldViewH/2;const startX=Math.max(0,Math.floor(camX/TILE)-1),endX=Math.min(MAP_W,Math.ceil((camX+viewW)/TILE)+1),startY=Math.max(0,Math.floor(camY/TILE)-1),endY=Math.min(MAP_H,Math.ceil((camY+worldViewH)/TILE)+1);
    for(let y=startY;y<endY;y++)for(let x=startX;x<endX;x++)drawTile(x,y,map[y][x],Math.floor(x*TILE-camX),Math.floor(y*TILE-camY));
    const sorted=[...objects].sort((a,b)=>a.y-b.y);for(const o of sorted){const sx=Math.floor(o.x*TILE-camX),sy=Math.floor(o.y*TILE-camY);if(sx<-100||sy<-100||sx>viewW+100||sy>worldViewH+100)continue;if(o.type==='tree')drawTree(o,sx,sy);if(o.type==='house')drawBuilding(o,sx,sy,'#9d6348');if(o.type==='lab')drawBuilding(o,sx,sy,'#6a8292');if(o.type==='sign'){ctx.fillStyle='#75502d';ctx.fillRect(sx+10,sy+8,4,17);ctx.fillStyle='#e7cb83';ctx.fillRect(sx+2,sy+5,20,10)}if(o.type==='npc'){ctx.fillStyle='#263e32';ctx.fillRect(sx+6,sy+20,13,4);ctx.fillStyle='#d5a47b';ctx.fillRect(sx+8,sy+3,10,10);ctx.fillStyle='#b7c5a0';ctx.fillRect(sx+5,sy+13,16,10);ctx.fillStyle='#543c32';ctx.fillRect(sx+7,sy+1,12,4)}}
    const psx=Math.floor(player.x-camX-TILE/2),psy=Math.floor(player.y-camY-TILE/2);drawPlayer(psx,psy);
    // Small center reticle helps orient the player without covering the world.
    ctx.strokeStyle='#fff2c044';ctx.lineWidth=1;ctx.strokeRect(viewW/2-13,worldViewH/2-13,26,26);
  }
  function update(dt){let x=joy.x,y=joy.y;if(keys.has('ArrowLeft')||keys.has('a'))x-=1;if(keys.has('ArrowRight')||keys.has('d'))x+=1;if(keys.has('ArrowUp')||keys.has('w'))y-=1;if(keys.has('ArrowDown')||keys.has('s'))y+=1;const len=Math.hypot(x,y);if(len>1){x/=len;y/=len}if(len>.08){player.faceX=x;player.faceY=y;player.walk+=dt*12;const nx=player.x+x*player.speed*dt,ny=player.y+y*player.speed*dt;if(!blocked(nx,player.y))player.x=nx;if(!blocked(player.x,ny))player.y=ny;}interactCooldown=Math.max(0,interactCooldown-dt);}
  function loop(t){const dt=Math.min((t-last)/1000||0,.04);last=t;if(gameStarted)update(dt);render();requestAnimationFrame(loop)}
  function nearestObject(){return objects.filter(o=>o.name).map(o=>({o,d:Math.hypot((o.x+.5)*TILE-player.x,(o.y+.5)*TILE-player.y)})).sort((a,b)=>a.d-b.d)[0]}
  function interact(){if(interactCooldown>0)return;interactCooldown=.35;const n=nearestObject();if(n&&n.d<62){if(n.o.type==='npc')openPanel('npc');else if(n.o.type==='sign')openPanel('sign');else openPanel('house')}else toast('Chưa có gì để tương tác ở gần đây.');}
  function openPanel(which){const content={npc:['Nhà nghiên cứu Mira','Chào mừng đến Greenfield! Phòng nghiên cứu đang chuẩn bị ba sinh vật đồng hành. Trong giai đoạn tiếp theo, bạn sẽ được chọn một người bạn đầu tiên.'],sign:['Bảng chỉ dẫn','Phía bắc: Đồng cỏ yên bình\nPhía đông: Hồ Azure\nPhía nam: Lối ra Greenfield'],house:['Ngôi nhà nhỏ','Đây sẽ là nơi nghỉ ngơi và lưu tiến trình của bạn. Dữ liệu hiện được lưu tự động trên thiết bị này.'],team:['Đội hình','Bạn chưa nhận sinh vật khởi đầu. Hệ thống chọn sinh vật và quản lý đội hình sẽ được bổ sung ở Phase 2.'],bag:['Túi đồ','Túi đồ hiện đang trống. Hệ thống vật phẩm sẽ được bổ sung sau.'],dex:['Sổ sinh vật','Bạn chưa ghi nhận sinh vật nào. Hãy khám phá để hoàn thành bộ sưu tập!'],map:['Bản đồ Greenfield','Bạn đang ở khu vực làng Greenfield. Hãy khám phá con đường, hồ nước và phòng nghiên cứu.']}[which]||['Monster World',''];modalContent.innerHTML=`<h2>${content[0]}</h2><p>${content[1].replaceAll('\n','<br>')}</p><button class="modal-action" id="modal-ok">Đã hiểu</button>`;modal.classList.remove('hidden');document.getElementById('modal-ok').onclick=()=>modal.classList.add('hidden')}
  function enterWorld(continuePrevious){
    if(continuePrevious && hasValidSave){player.x=saved.x;player.y=saved.y;}
    else {player.x=25.5*TILE;player.y=27*TILE;player.walk=0;try{localStorage.removeItem(SAVE_KEY);}catch{}}
    gameStarted=true;titleScreen.classList.add('hidden');
    toast(continuePrevious?'Đã tiếp tục hành trình của bạn.':'Chào mừng đến Greenfield!');
  }
  document.getElementById('start-button').addEventListener('click',()=>enterWorld(false));
  continueButton.addEventListener('click',()=>enterWorld(true));
  document.getElementById('settings-button').addEventListener('click',()=>{
    modalContent.innerHTML='<h2>Cài đặt</h2><p><b>Lưu tiến trình:</b> Tự động lưu trên thiết bị này.</p><p><b>Điều khiển:</b> Cần ảo trên màn hình hoặc phím WASD / phím mũi tên.</p><p><b>Âm thanh:</b> Sẽ được bổ sung trong bản cập nhật sau.</p><button class="modal-action" id="modal-ok">Đóng</button>';
    modal.classList.remove('hidden');document.getElementById('modal-ok').onclick=()=>modal.classList.add('hidden');
  });
  document.getElementById('close-modal').onclick=()=>modal.classList.add('hidden');document.getElementById('interact').addEventListener('pointerdown',e=>{e.preventDefault();interact()});document.getElementById('team-button').onclick=()=>openPanel('team');document.querySelectorAll('.nav-button').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('.nav-button').forEach(x=>x.classList.remove('active'));b.classList.add('active');openPanel(b.dataset.panel)}));
  window.addEventListener('keydown',e=>{if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key))e.preventDefault();keys.add(e.key.toLowerCase())});window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));window.addEventListener('blur',()=>keys.clear());
  const joystick=document.getElementById('joystick'),stick=document.getElementById('stick');let pointer=null;function setJoy(e){const r=joystick.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;let dx=e.clientX-cx,dy=e.clientY-cy;const max=35,l=Math.hypot(dx,dy);if(l>max){dx=dx/l*max;dy=dy/l*max}joy.x=dx/max;joy.y=dy/max;stick.style.transform=`translate(${dx}px,${dy}px)`}joystick.addEventListener('pointerdown',e=>{pointer=e.pointerId;joystick.setPointerCapture(pointer);setJoy(e)});joystick.addEventListener('pointermove',e=>{if(e.pointerId===pointer)setJoy(e)});function release(e){if(e.pointerId===pointer){pointer=null;joy.x=joy.y=0;stick.style.transform='translate(0,0)'}}joystick.addEventListener('pointerup',release);joystick.addEventListener('pointercancel',release);
  window.addEventListener('resize',resize);document.addEventListener('visibilitychange',()=>{if(document.hidden)save()});setInterval(save,10000);resize();requestAnimationFrame(loop);
})();
