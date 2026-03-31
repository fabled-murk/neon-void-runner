// ============================================
// NEON VOID RUNNER - Sci-Fi Side Scroller
// ============================================
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = 960; canvas.height = 640;
const W = canvas.width, H = canvas.height;
const COLORS = {cyan:'#00ffff',magenta:'#ff00ff',pink:'#ff1493',blue:'#4169ff',green:'#39ff14',yellow:'#ffff00',orange:'#ff6600',red:'#ff0033',white:'#ffffff',bg:'#0a0a1a'};

// === STATE ===
let gameState='menu',level=1,score=0,hiScore=parseInt(localStorage.getItem('nvHi')||'0');
let enemiesKilled=0,enemiesNeeded=8,bossActive=false,boss=null;
let screenShake=0,transitionTimer=0,warningTimer=0,spawnTimer=0;
let particles=[],pickups=[],enemyBullets=[],stars=[],nebulae=[],bullets=[],enemies=[];
let player=null,upgradeOptions=[],selectedUpgrade=-1,shipHoverIdx=-1;
let frameCt=0;

// === INPUT ===
const keys={};
window.addEventListener('keydown',e=>{keys[e.key]=true;if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key))e.preventDefault();});
window.addEventListener('keyup',e=>{keys[e.key]=false;});
let mouseX=W/2,mouseY=H/2,mouseClicked=false;
canvas.addEventListener('mousemove',e=>{const r=canvas.getBoundingClientRect();mouseX=(e.clientX-r.left)*(W/r.width);mouseY=(e.clientY-r.top)*(H/r.height);});
canvas.addEventListener('mousedown',()=>{mouseClicked=true;});
canvas.addEventListener('mouseup',()=>{});

// === SHIPS ===
const SHIP_DEFS=[
  {name:'PHANTOM',desc:'High speed, low armor',color:COLORS.cyan,speed:7,armor:3,maxArmor:3,weaponSlots:2,shape:'sleek'},
  {name:'TITAN',desc:'Heavy armor, slow speed',color:COLORS.orange,speed:4,armor:8,maxArmor:8,weaponSlots:2,shape:'heavy'},
  {name:'HYDRA',desc:'Extra weapon slot, balanced',color:COLORS.green,speed:5,armor:5,maxArmor:5,weaponSlots:3,shape:'wide'}
];

// === WEAPONS ===
const WEAPON_DEFS={
  laser:{name:'Pulse Laser',damage:1,fireRate:8,speed:12,color:COLORS.cyan,pattern:'single',size:3},
  spread:{name:'Spread Shot',damage:1,fireRate:14,speed:10,color:COLORS.yellow,pattern:'spread3',size:2},
  missile:{name:'Micro Missile',damage:3,fireRate:30,speed:6,color:COLORS.red,pattern:'single',size:4},
  plasma:{name:'Plasma Bolt',damage:2,fireRate:18,speed:8,color:COLORS.magenta,pattern:'single',size:5},
  beam:{name:'Ion Beam',damage:0.5,fireRate:2,speed:20,color:COLORS.blue,pattern:'single',size:2},
  wave:{name:'Wave Cannon',damage:2,fireRate:22,speed:7,color:COLORS.green,pattern:'wave',size:4}
};

const EVOLUTIONS={
  'Pulse Laser':{name:'Twin Laser',damage:1.5,fireRate:6,speed:14,color:'#00ffee',pattern:'twin',size:3},
  'Spread Shot':{name:'Spread-5',damage:1.5,fireRate:12,speed:11,color:'#ffee00',pattern:'spread5',size:3},
  'Micro Missile':{name:'Homing Missile',damage:4,fireRate:28,speed:7,color:'#ff4444',pattern:'homing',size:5},
  'Plasma Bolt':{name:'Plasma Storm',damage:3,fireRate:16,speed:9,color:'#ff44ff',pattern:'twin',size:6},
  'Ion Beam':{name:'Piercing Beam',damage:1,fireRate:2,speed:25,color:'#6699ff',pattern:'pierce',size:3},
  'Wave Cannon':{name:'Tsunami Cannon',damage:3,fireRate:20,speed:8,color:'#44ff44',pattern:'bigwave',size:6},
  'Twin Laser':{name:'Quad Laser',damage:2,fireRate:5,speed:16,color:'#00ffcc',pattern:'quad',size:3},
  'Spread-5':{name:'Nova Burst',damage:2,fireRate:10,speed:12,color:'#ffcc00',pattern:'spread7',size:4},
  'Homing Missile':{name:'Swarm Rockets',damage:3,fireRate:12,speed:8,color:'#ff2222',pattern:'swarm',size:4},
  'Plasma Storm':{name:'Void Plasma',damage:5,fireRate:14,speed:10,color:'#cc00ff',pattern:'voidblast',size:8},
  'Piercing Beam':{name:'Death Ray',damage:2,fireRate:1,speed:30,color:'#99bbff',pattern:'deathray',size:4},
  'Tsunami Cannon':{name:'Gravity Wave',damage:5,fireRate:18,speed:9,color:'#22ff22',pattern:'gravwave',size:8}
};

// === ENEMY TYPES ===
const ENEMY_TYPES={
  drone:{name:'Drone',w:24,h:20,hp:2,speed:2,color:COLORS.red,move:'straight',shoots:false,score:10},
  sine:{name:'Wave Rider',w:26,h:18,hp:3,speed:2.5,color:COLORS.magenta,move:'sine',shoots:false,score:20,amp:60,freq:0.04},
  strafer:{name:'Strafer',w:28,h:22,hp:4,speed:1.5,color:COLORS.yellow,move:'strafeV',shoots:true,fireRate:60,score:30},
  kamikaze:{name:'Kamikaze',w:20,h:16,hp:1,speed:5,color:COLORS.orange,move:'chase',shoots:false,score:15},
  turret:{name:'Turret',w:30,h:30,hp:6,speed:0.5,color:COLORS.pink,move:'slow',shoots:true,fireRate:40,score:40},
  zigzag:{name:'Zig Zagger',w:22,h:18,hp:3,speed:3,color:'#ff8800',move:'zigzag',shoots:false,score:25},
  sniper:{name:'Sniper',w:26,h:20,hp:4,speed:1,color:'#8800ff',move:'slow',shoots:true,fireRate:80,score:35,aimed:true},
  swarmling:{name:'Swarmling',w:16,h:14,hp:1,speed:3.5,color:'#00ff88',move:'chase',shoots:false,score:8}
};

// === HELPERS ===
function hexAlpha(hex,a){const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);return 'rgba('+r+','+g+','+b+','+a+')';}
function dist(a,b){return Math.hypot(a.x-b.x,a.y-b.y);}
function drawGlow(x,y,r,color,alpha){
  const g=ctx.createRadialGradient(x,y,0,x,y,r);
  g.addColorStop(0,hexAlpha(color,alpha||0.5));g.addColorStop(1,'transparent');
  ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
}
function spawnParticle(x,y,color,count,speed,life){
  for(let i=0;i<count;i++){const a=Math.random()*Math.PI*2,s=Math.random()*(speed||3)+1;
    particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:life||(20+Math.random()*20),maxLife:life||30,color,size:1+Math.random()*3});}
}
function drawNeonText(text,x,y,size,color,align){
  ctx.save();ctx.textAlign=align||'center';ctx.textBaseline='middle';
  ctx.font='bold '+size+'px "Courier New",monospace';
  ctx.shadowColor=color;ctx.shadowBlur=20;ctx.fillStyle=color;ctx.fillText(text,x,y);
  ctx.shadowBlur=10;ctx.fillText(text,x,y);ctx.shadowBlur=0;
  ctx.fillStyle='#fff';ctx.globalAlpha=0.5;ctx.fillText(text,x,y);ctx.restore();
}

// === BACKGROUND ===
function initStars(){
  stars=[];for(let i=0;i<120;i++)stars.push({x:Math.random()*W,y:Math.random()*H,speed:0.5+Math.random()*3,size:Math.random()*2+0.5,brightness:Math.random()});
  nebulae=[];for(let i=0;i<5;i++)nebulae.push({x:Math.random()*W,y:Math.random()*H,r:60+Math.random()*120,color:[COLORS.cyan,COLORS.magenta,COLORS.blue,COLORS.pink][Math.floor(Math.random()*4)],speed:0.2+Math.random()*0.5,alpha:0.03+Math.random()*0.05});
}
function updateStars(){
  for(const s of stars){s.x-=s.speed;if(s.x<0){s.x=W;s.y=Math.random()*H;}}
  for(const n of nebulae){n.x-=n.speed;if(n.x<-n.r*2){n.x=W+n.r;n.y=Math.random()*H;}}
}
function drawBackground(){
  ctx.fillStyle=COLORS.bg;ctx.fillRect(0,0,W,H);
  ctx.strokeStyle='rgba(0,255,255,0.04)';ctx.lineWidth=1;
  const gridOff=(Date.now()*0.03)%40;
  for(let x=-gridOff;x<W;x+=40){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
  for(let y=0;y<H;y+=40){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
  for(const n of nebulae){const g=ctx.createRadialGradient(n.x,n.y,0,n.x,n.y,n.r);g.addColorStop(0,hexAlpha(n.color,n.alpha));g.addColorStop(1,'transparent');ctx.fillStyle=g;ctx.fillRect(n.x-n.r,n.y-n.r,n.r*2,n.r*2);}
  for(const s of stars){const b=0.4+0.6*(0.5+0.5*Math.sin(Date.now()*0.003+s.brightness*10));ctx.fillStyle='rgba(255,255,255,'+b+')';ctx.fillRect(s.x,s.y,s.size,s.size);}
}

// === DRAW SHIP ===
function drawShip(x,y,def,color,scale){
  const s=scale||1;ctx.save();ctx.translate(x,y);ctx.scale(s,s);
  drawGlow(0,0,35,color,0.15);
  const flicker=Math.random()*8;
  ctx.fillStyle=COLORS.orange;ctx.shadowColor=COLORS.orange;ctx.shadowBlur=10;
  if(def.shape==='sleek'){ctx.fillRect(-22-flicker,-3,flicker+8,6);}
  else if(def.shape==='heavy'){ctx.fillRect(-22-flicker,-6,flicker+6,12);}
  else{ctx.fillRect(-20-flicker,-8,flicker+5,5);ctx.fillRect(-20-flicker,3,flicker+5,5);}
  ctx.shadowBlur=0;ctx.strokeStyle=color;ctx.lineWidth=2;ctx.fillStyle=hexAlpha(color,0.15);
  ctx.shadowColor=color;ctx.shadowBlur=8;ctx.beginPath();
  if(def.shape==='sleek'){ctx.moveTo(22,0);ctx.lineTo(-12,-14);ctx.lineTo(-18,-10);ctx.lineTo(-16,0);ctx.lineTo(-18,10);ctx.lineTo(-12,14);}
  else if(def.shape==='heavy'){ctx.moveTo(18,0);ctx.lineTo(8,-16);ctx.lineTo(-14,-18);ctx.lineTo(-18,-12);ctx.lineTo(-18,12);ctx.lineTo(-14,18);ctx.lineTo(8,16);}
  else{ctx.moveTo(20,0);ctx.lineTo(4,-12);ctx.lineTo(-6,-20);ctx.lineTo(-16,-16);ctx.lineTo(-14,0);ctx.lineTo(-16,16);ctx.lineTo(-6,20);ctx.lineTo(4,12);}
  ctx.closePath();ctx.fill();ctx.stroke();
  ctx.fillStyle=hexAlpha('#ffffff',0.6);ctx.fillRect(6,-3,6,6);ctx.shadowBlur=0;ctx.restore();
}

// === PLAYER ===
function createPlayer(shipIdx){
  const def=SHIP_DEFS[shipIdx];
  return{x:120,y:H/2,w:40,h:30,speed:def.speed,armor:def.armor,maxArmor:def.maxArmor,
    weaponSlots:def.weaponSlots,weapons:[{...WEAPON_DEFS.laser,cooldown:0}],
    shipIdx:shipIdx,color:def.color,shape:def.shape,invincible:0,shieldFlash:0};
}

// === FIRE WEAPONS ===
function fireWeapons(){
  if(!player)return;
  for(const w of player.weapons){
    if(w.cooldown>0){w.cooldown--;continue;}
    w.cooldown=w.fireRate;
    const bx=player.x+22,by=player.y;
    const base={damage:w.damage,color:w.color,size:w.size,speed:w.speed,pattern:w.pattern,
      pierce:w.pattern==='pierce'||w.pattern==='deathray'};
    switch(w.pattern){
      case'single':bullets.push({x:bx,y:by,vx:w.speed,vy:0,...base});break;
      case'twin':bullets.push({x:bx,y:by-6,vx:w.speed,vy:0,...base});bullets.push({x:bx,y:by+6,vx:w.speed,vy:0,...base});break;
      case'quad':for(let i=-1.5;i<=1.5;i++)bullets.push({x:bx,y:by+i*5,vx:w.speed,vy:i*0.3,...base});break;
      case'spread3':for(let a=-0.2;a<=0.2;a+=0.2)bullets.push({x:bx,y:by,vx:Math.cos(a)*w.speed,vy:Math.sin(a)*w.speed,...base});break;
      case'spread5':for(let a=-0.35;a<=0.36;a+=0.175)bullets.push({x:bx,y:by,vx:Math.cos(a)*w.speed,vy:Math.sin(a)*w.speed,...base});break;
      case'spread7':for(let a=-0.45;a<=0.46;a+=0.15)bullets.push({x:bx,y:by,vx:Math.cos(a)*w.speed,vy:Math.sin(a)*w.speed,...base});break;
      case'wave':bullets.push({x:bx,y:by,vx:w.speed,vy:0,waveAmp:30,waveFreq:0.1,waveT:0,...base});break;
      case'bigwave':bullets.push({x:bx,y:by-10,vx:w.speed,vy:0,waveAmp:40,waveFreq:0.12,waveT:0,...base});bullets.push({x:bx,y:by+10,vx:w.speed,vy:0,waveAmp:40,waveFreq:0.12,waveT:Math.PI,...base});break;
      case'gravwave':for(let i=0;i<3;i++)bullets.push({x:bx,y:by,vx:w.speed,vy:0,waveAmp:50,waveFreq:0.1,waveT:i*Math.PI*2/3,...base});break;
      case'homing':bullets.push({x:bx,y:by,vx:w.speed,vy:0,homing:true,...base});break;
      case'swarm':for(let i=0;i<3;i++){const a2=(Math.random()-0.5)*0.6;bullets.push({x:bx,y:by,vx:Math.cos(a2)*w.speed,vy:Math.sin(a2)*w.speed,homing:true,...base,damage:w.damage*0.6});}break;
      case'voidblast':bullets.push({x:bx,y:by,vx:w.speed*0.8,vy:0,...base,explode:true});break;
      default:bullets.push({x:bx,y:by,vx:w.speed,vy:0,...base});
    }
  }
}

// === UPDATE BULLETS ===
function updateBullets(){
  for(let i=bullets.length-1;i>=0;i--){
    const b=bullets[i];b.x+=b.vx;b.y+=b.vy;
    if(b.waveAmp){b.waveT+=b.waveFreq;b.y+=Math.cos(b.waveT)*b.waveAmp*b.waveFreq;}
    if(b.homing&&enemies.length>0){
      let closest=null,closestD=Infinity;
      for(const e of enemies){const d=dist(b,e);if(d<closestD){closestD=d;closest=e;}}
      if(boss&&dist(b,boss)<closestD){closest=boss;}
      if(closest){const angle=Math.atan2(closest.y-b.y,closest.x-b.x);b.vx+=Math.cos(angle)*0.5;b.vy+=Math.sin(angle)*0.5;const spd=Math.hypot(b.vx,b.vy);b.vx=(b.vx/spd)*b.speed;b.vy=(b.vy/spd)*b.speed;}
    }
    if(b.x>W+20||b.x<-20||b.y>H+20||b.y<-20)bullets.splice(i,1);
  }
}
function drawBullets(){
  for(const b of bullets){ctx.save();ctx.shadowColor=b.color;ctx.shadowBlur=8;ctx.fillStyle=b.color;
    ctx.beginPath();ctx.arc(b.x,b.y,b.size,0,Math.PI*2);ctx.fill();
    ctx.globalAlpha=0.3;ctx.beginPath();ctx.arc(b.x-b.vx*0.5,b.y-b.vy*0.5,b.size*0.7,0,Math.PI*2);ctx.fill();ctx.restore();}
}

// === ENEMIES ===
function spawnEnemy(){
  const types=Object.keys(ENEMY_TYPES);
  const maxIdx=Math.min(types.length,2+Math.floor(level/2));
  const typeKey=types[Math.floor(Math.random()*maxIdx)];
  const def=ENEMY_TYPES[typeKey];
  const lvS=1+(level-1)*0.1;
  enemies.push({x:W+20,y:40+Math.random()*(H-80),w:def.w,h:def.h,
    hp:Math.ceil(def.hp*lvS),maxHp:Math.ceil(def.hp*lvS),speed:def.speed+(level-1)*0.05,
    color:def.color,move:def.move,shoots:def.shoots,fireRate:def.fireRate||999,
    fireCooldown:Math.random()*(def.fireRate||60),aimed:def.aimed||false,score:def.score,
    t:Math.random()*100,originY:40+Math.random()*(H-80),amp:def.amp||0,freq:def.freq||0,zigDir:1,type:typeKey});
}
function updateEnemies(){
  for(let i=enemies.length-1;i>=0;i--){
    const e=enemies[i];e.t++;
    switch(e.move){
      case'straight':e.x-=e.speed;break;
      case'sine':e.x-=e.speed;e.y=e.originY+Math.sin(e.t*e.freq)*e.amp;break;
      case'strafeV':e.x-=e.speed*0.3;e.y+=Math.sin(e.t*0.05)*2;break;
      case'chase':if(player){const ang=Math.atan2(player.y-e.y,player.x-e.x);e.x+=Math.cos(ang)*e.speed;e.y+=Math.sin(ang)*e.speed;}break;
      case'slow':e.x-=e.speed;break;
      case'zigzag':e.x-=e.speed;e.y+=e.zigDir*3;if(e.t%30===0)e.zigDir*=-1;break;
    }
    if(e.shoots&&player){e.fireCooldown--;if(e.fireCooldown<=0){e.fireCooldown=e.fireRate;
      let vx=-5,vy=0;if(e.aimed&&player){const ang=Math.atan2(player.y-e.y,player.x-e.x);vx=Math.cos(ang)*5;vy=Math.sin(ang)*5;}
      enemyBullets.push({x:e.x-e.w/2,y:e.y,vx,vy,size:3,color:e.color,damage:1});}}
    if(e.x<-60||e.y<-60||e.y>H+60)enemies.splice(i,1);
  }
}
function drawEnemy(e){
  ctx.save();ctx.translate(e.x,e.y);drawGlow(0,0,20,e.color,0.12);
  ctx.strokeStyle=e.color;ctx.fillStyle=hexAlpha(e.color,0.1);ctx.lineWidth=2;ctx.shadowColor=e.color;ctx.shadowBlur=6;
  ctx.beginPath();
  switch(e.type){
    case'drone':ctx.moveTo(-e.w/2,0);ctx.lineTo(0,-e.h/2);ctx.lineTo(e.w/2,0);ctx.lineTo(0,e.h/2);break;
    case'sine':ctx.ellipse(0,0,e.w/2,e.h/2,0,0,Math.PI*2);break;
    case'strafer':ctx.rect(-e.w/2,-e.h/2,e.w,e.h);break;
    case'kamikaze':ctx.moveTo(e.w/2,0);ctx.lineTo(-e.w/2,-e.h/2);ctx.lineTo(-e.w/3,0);ctx.lineTo(-e.w/2,e.h/2);break;
    case'turret':ctx.arc(0,0,e.w/2,0,Math.PI*2);break;
    case'sniper':ctx.moveTo(-e.w/2,-e.h/2);ctx.lineTo(e.w/2,0);ctx.lineTo(-e.w/2,e.h/2);break;
    default:ctx.rect(-e.w/2,-e.h/2,e.w,e.h);
  }
  ctx.closePath();ctx.fill();ctx.stroke();
  if(e.hp<e.maxHp){const bw=e.w;ctx.fillStyle='#333';ctx.fillRect(-bw/2,-e.h/2-8,bw,3);ctx.fillStyle=e.color;ctx.fillRect(-bw/2,-e.h/2-8,bw*(e.hp/e.maxHp),3);}
  ctx.restore();
}

// === ENEMY BULLETS ===
function updateEnemyBullets(){
  for(let i=enemyBullets.length-1;i>=0;i--){const b=enemyBullets[i];b.x+=b.vx;b.y+=b.vy;if(b.x<-20||b.x>W+20||b.y<-20||b.y>H+20)enemyBullets.splice(i,1);}
}
function drawEnemyBullets(){
  for(const b of enemyBullets){ctx.save();ctx.fillStyle=b.color;ctx.shadowColor=b.color;ctx.shadowBlur=6;ctx.beginPath();ctx.arc(b.x,b.y,b.size,0,Math.PI*2);ctx.fill();ctx.restore();}
}

// === BOSS ===
function createBoss(){
  const bL=Math.floor(level/10);
  const hp=50+bL*30;
  const cols=[COLORS.red,COLORS.magenta,COLORS.orange,'#ff00aa','#aa00ff'];
  return{x:W-80,y:H/2,w:80,h:70,hp,maxHp:hp,color:cols[bL%cols.length],phase:0,t:0,attackTimer:0,movePattern:0,
    name:['VOID SENTINEL','NEON REAPER','PLASMA TITAN','QUANTUM DREAD','OMEGA CORE'][bL%5]};
}
function updateBoss(){
  if(!boss)return;boss.t++;
  const patterns=[
    ()=>{boss.y=H/2+Math.sin(boss.t*0.02)*200;},
    ()=>{boss.y=H/2+Math.sin(boss.t*0.03)*150;boss.x=W-80+Math.sin(boss.t*0.015)*40;},
    ()=>{if(player)boss.y+=(player.y-boss.y)*0.02;}
  ];
  boss.movePattern=Math.floor(boss.t/300)%patterns.length;
  patterns[boss.movePattern]();
  boss.y=Math.max(50,Math.min(H-50,boss.y));boss.x=Math.max(W-200,Math.min(W-40,boss.x));
  boss.phase=boss.hp<boss.maxHp*0.3?2:boss.hp<boss.maxHp*0.6?1:0;
  boss.attackTimer--;
  const interval=[50,35,20][boss.phase];
  if(boss.attackTimer<=0){boss.attackTimer=interval;
    const at=Math.floor(Math.random()*(boss.phase+2));
    switch(at){
      case 0:for(let i=-2;i<=2;i++)enemyBullets.push({x:boss.x-40,y:boss.y+i*15,vx:-6,vy:i*0.5,size:4,color:boss.color,damage:1});break;
      case 1:for(let a=-0.5;a<=0.5;a+=0.125)enemyBullets.push({x:boss.x-40,y:boss.y,vx:Math.cos(Math.PI+a)*5,vy:Math.sin(a)*5,size:3,color:boss.color,damage:1});break;
      case 2:if(player){const ang=Math.atan2(player.y-boss.y,player.x-boss.x);for(let i=0;i<5;i++){const a2=ang+(Math.random()-0.5)*0.3;enemyBullets.push({x:boss.x-40,y:boss.y,vx:Math.cos(a2)*7,vy:Math.sin(a2)*7,size:5,color:'#ff00ff',damage:2});}}break;
      case 3:for(let a=0;a<Math.PI*2;a+=Math.PI/8)enemyBullets.push({x:boss.x,y:boss.y,vx:Math.cos(a)*4,vy:Math.sin(a)*4,size:4,color:'#ffff00',damage:1});break;
    }
  }
}
function drawBoss(){
  if(!boss)return;ctx.save();ctx.translate(boss.x,boss.y);
  drawGlow(0,0,80,boss.color,0.15+boss.phase*0.05);
  ctx.strokeStyle=boss.color;ctx.fillStyle=hexAlpha(boss.color,0.15);ctx.lineWidth=3;ctx.shadowColor=boss.color;ctx.shadowBlur=15;
  ctx.beginPath();ctx.moveTo(-40,0);ctx.lineTo(-20,-35);ctx.lineTo(20,-30);ctx.lineTo(35,-15);ctx.lineTo(40,0);ctx.lineTo(35,15);ctx.lineTo(20,30);ctx.lineTo(-20,35);ctx.closePath();ctx.fill();ctx.stroke();
  const pulse=0.5+0.5*Math.sin(boss.t*0.1);drawGlow(0,0,15+pulse*5,'#ffffff',0.4);
  ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(0,0,6,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle=boss.color;ctx.lineWidth=2;ctx.beginPath();
  ctx.moveTo(-20,-35);ctx.lineTo(-30,-50);ctx.lineTo(-5,-40);
  ctx.moveTo(-20,35);ctx.lineTo(-30,50);ctx.lineTo(-5,40);ctx.stroke();
  ctx.restore();
  // HP bar
  const barW=300,barH=12,barX=(W-barW)/2;
  ctx.fillStyle='#222';ctx.fillRect(barX,20,barW,barH);
  const hpR=boss.hp/boss.maxHp,hpC=hpR>0.6?boss.color:hpR>0.3?COLORS.yellow:COLORS.red;
  ctx.fillStyle=hpC;ctx.fillRect(barX,20,barW*hpR,barH);
  ctx.strokeStyle=boss.color;ctx.lineWidth=1;ctx.strokeRect(barX,20,barW,barH);
  drawNeonText(boss.name,W/2,10,14,boss.color);
}

// === PICKUPS ===
function spawnPickup(x,y){
  if(Math.random()>0.18)return;
  const types=Object.keys(WEAPON_DEFS);
  const isHP=Math.random()<0.3;
  pickups.push({x,y,w:18,h:18,type:isHP?'health':types[Math.floor(Math.random()*types.length)],t:0,life:300});
}
function updatePickups(){
  for(let i=pickups.length-1;i>=0;i--){
    const p=pickups[i];p.x-=1;p.t++;p.life--;
    if(p.life<=0||p.x<-20){pickups.splice(i,1);continue;}
    if(player&&Math.abs(player.x-p.x)<30&&Math.abs(player.y-p.y)<30){
      if(p.type==='health'){player.armor=Math.min(player.maxArmor,player.armor+1);spawnParticle(p.x,p.y,COLORS.green,10,3,20);}
      else{const wdef=WEAPON_DEFS[p.type];
        if(player.weapons.length<player.weaponSlots){player.weapons.push({...wdef,cooldown:0});}
        else{player.weapons[0]={...wdef,cooldown:0};}
        spawnParticle(p.x,p.y,wdef.color,15,4,25);}
      pickups.splice(i,1);
    }
  }
}
function drawPickups(){
  for(const p of pickups){ctx.save();ctx.translate(p.x,p.y);
    const bob=Math.sin(p.t*0.08)*4;ctx.translate(0,bob);
    const color=p.type==='health'?COLORS.green:(WEAPON_DEFS[p.type]?WEAPON_DEFS[p.type].color:COLORS.white);
    drawGlow(0,0,18,color,0.25);ctx.strokeStyle=color;ctx.lineWidth=2;ctx.shadowColor=color;ctx.shadowBlur=8;
    if(p.type==='health'){ctx.beginPath();ctx.moveTo(-6,-2);ctx.lineTo(-2,-2);ctx.lineTo(-2,-6);ctx.lineTo(2,-6);ctx.lineTo(2,-2);ctx.lineTo(6,-2);ctx.lineTo(6,2);ctx.lineTo(2,2);ctx.lineTo(2,6);ctx.lineTo(-2,6);ctx.lineTo(-2,2);ctx.lineTo(-6,2);ctx.closePath();ctx.stroke();}
    else{ctx.strokeRect(-7,-7,14,14);ctx.fillStyle=hexAlpha(color,0.3);ctx.fillRect(-7,-7,14,14);ctx.fillStyle=color;ctx.font='bold 10px monospace';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(p.type[0].toUpperCase(),0,0);}
    if(p.life<60&&Math.floor(p.t/4)%2===0)ctx.globalAlpha=0.3;
    ctx.restore();}
}

// === PARTICLES ===
function updateParticles(){
  for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.x+=p.vx;p.y+=p.vy;p.vx*=0.97;p.vy*=0.97;p.life--;if(p.life<=0)particles.splice(i,1);}
}
function drawParticles(){
  for(const p of particles){const alpha=p.life/p.maxLife;ctx.fillStyle=hexAlpha(p.color,alpha);ctx.fillRect(p.x-p.size/2,p.y-p.size/2,p.size*alpha,p.size*alpha);}
}

// === COLLISIONS ===
function checkCollisions(){
  if(!player)return;
  for(let bi=bullets.length-1;bi>=0;bi--){
    const b=bullets[bi];let hit=false;
    for(let ei=enemies.length-1;ei>=0;ei--){
      const e=enemies[ei];
      if(Math.abs(b.x-e.x)<e.w/2+b.size&&Math.abs(b.y-e.y)<e.h/2+b.size){
        e.hp-=b.damage;spawnParticle(b.x,b.y,b.color,3,2,10);
        if(!b.pierce){bullets.splice(bi,1);hit=true;}
        if(e.hp<=0){score+=e.score;enemiesKilled++;spawnParticle(e.x,e.y,e.color,20,5,30);spawnPickup(e.x,e.y);enemies.splice(ei,1);screenShake=5;}
        break;
      }
    }
    if(!hit&&boss&&bi<bullets.length){
      const b2=bullets[bi];
      if(b2&&Math.abs(b2.x-boss.x)<boss.w/2+b2.size&&Math.abs(b2.y-boss.y)<boss.h/2+b2.size){
        boss.hp-=b2.damage;spawnParticle(b2.x,b2.y,b2.color,3,2,8);
        if(!b2.pierce)bullets.splice(bi,1);
        if(boss.hp<=0){score+=500+level*50;spawnParticle(boss.x,boss.y,boss.color,50,8,40);screenShake=20;
          for(let d=0;d<3;d++){const types=Object.keys(WEAPON_DEFS);pickups.push({x:boss.x+(Math.random()-0.5)*100,y:boss.y+(Math.random()-0.5)*100,w:18,h:18,type:types[Math.floor(Math.random()*types.length)],t:0,life:600});}
          boss=null;bossActive=false;transitionTimer=120;}
      }
    }
  }
  if(player.invincible<=0){
    for(let i=enemyBullets.length-1;i>=0;i--){
      const b=enemyBullets[i];
      if(Math.abs(b.x-player.x)<18&&Math.abs(b.y-player.y)<14){
        player.armor-=b.damage;player.invincible=30;player.shieldFlash=10;spawnParticle(b.x,b.y,COLORS.white,8,3,15);screenShake=4;enemyBullets.splice(i,1);
        if(player.armor<=0){doGameOver();return;}
      }
    }
    for(let i=enemies.length-1;i>=0;i--){
      const e=enemies[i];
      if(Math.abs(e.x-player.x)<(e.w/2+18)&&Math.abs(e.y-player.y)<(e.h/2+14)){
        player.armor-=1;player.invincible=30;player.shieldFlash=10;screenShake=6;spawnParticle(e.x,e.y,e.color,15,4,20);enemies.splice(i,1);enemiesKilled++;
        if(player.armor<=0){doGameOver();return;}
      }
    }
    if(boss&&Math.abs(boss.x-player.x)<(boss.w/2+18)&&Math.abs(boss.y-player.y)<(boss.h/2+14)){
      player.armor-=2;player.invincible=60;player.shieldFlash=15;screenShake=10;
      if(player.armor<=0)doGameOver();
    }
  }
}
function doGameOver(){
  spawnParticle(player.x,player.y,player.color,40,6,40);screenShake=15;
  if(score>hiScore){hiScore=score;localStorage.setItem('nvHi',hiScore.toString());}
  gameState='gameOver';
}

// === SPAWNING / LEVELS ===
function updateSpawning(){
  if(bossActive)return;
  if(transitionTimer>0){transitionTimer--;if(transitionTimer===0){gameState='upgradeScreen';upgradeOptions=generateUpgradeOptions();}return;}
  spawnTimer--;
  if(spawnTimer<=0){
    spawnTimer=Math.max(15,50-level*2);
    const ws=Math.min(5,1+Math.floor(level/3));
    for(let i=0;i<ws;i++)spawnEnemy();
  }
  if(enemiesKilled>=enemiesNeeded&&enemies.length===0){
    if((level+1)%10===0&&!bossActive){
      level++;enemiesKilled=0;enemiesNeeded=0;bossActive=true;boss=createBoss();warningTimer=120;gameState='bossWarning';
    }else if(!bossActive){
      transitionTimer=60;level++;enemiesKilled=0;enemiesNeeded=Math.min(30,8+level*2);
    }
  }
}

// === UPGRADE SCREEN ===
function generateUpgradeOptions(){
  const opts=[];
  for(const w of player.weapons){
    if(EVOLUTIONS[w.name])opts.push({type:'evolve',weapon:w,result:EVOLUTIONS[w.name],desc:'Evolve '+w.name+' -> '+EVOLUTIONS[w.name].name});
  }
  if(player.armor<player.maxArmor)opts.push({type:'repair',desc:'Repair Armor (+'+Math.min(3,player.maxArmor-player.armor)+' HP)'});
  opts.push({type:'maxArmor',desc:'Reinforce Hull (+1 Max Armor)'});
  opts.push({type:'speed',desc:'Thruster Upgrade (+0.5 Speed)'});
  while(opts.length>3)opts.splice(Math.floor(Math.random()*opts.length),1);
  return opts;
}
function applyUpgrade(idx){
  const opt=upgradeOptions[idx];if(!opt)return;
  switch(opt.type){
    case'evolve':{const wi=player.weapons.indexOf(opt.weapon);if(wi>=0)player.weapons[wi]={...opt.result,cooldown:0};break;}
    case'repair':player.armor=Math.min(player.maxArmor,player.armor+3);break;
    case'maxArmor':player.maxArmor+=1;player.armor+=1;break;
    case'speed':player.speed=Math.min(12,player.speed+0.5);break;
  }
  gameState='playing';
}
function drawUpgradeScreen(){
  drawBackground();
  ctx.fillStyle='rgba(0,0,0,0.7)';ctx.fillRect(0,0,W,H);
  drawNeonText('LEVEL '+level+' COMPLETE',W/2,80,32,COLORS.cyan);
  drawNeonText('Choose an Upgrade:',W/2,130,20,COLORS.white);
  const boxW=320,boxH=70,startY=180;selectedUpgrade=-1;
  for(let i=0;i<upgradeOptions.length;i++){
    const opt=upgradeOptions[i];
    const bx=W/2-boxW/2,by=startY+i*(boxH+20);
    const hover=mouseX>=bx&&mouseX<=bx+boxW&&mouseY>=by&&mouseY<=by+boxH;
    if(hover)selectedUpgrade=i;
    const col=opt.type==='evolve'?COLORS.magenta:opt.type==='repair'?COLORS.green:opt.type==='speed'?COLORS.cyan:COLORS.yellow;
    ctx.strokeStyle=hover?'#ffffff':col;ctx.lineWidth=hover?3:1;ctx.shadowColor=col;ctx.shadowBlur=hover?15:5;
    ctx.fillStyle=hexAlpha(col,hover?0.15:0.05);ctx.fillRect(bx,by,boxW,boxH);ctx.strokeRect(bx,by,boxW,boxH);ctx.shadowBlur=0;
    const label=opt.type==='evolve'?'EVOLVE':opt.type==='repair'?'REPAIR':opt.type==='speed'?'SPEED':'ARMOR';
    drawNeonText(label,W/2,by+22,16,col);
    drawNeonText(opt.desc,W/2,by+48,11,COLORS.white);
  }
  if(mouseClicked&&selectedUpgrade>=0)applyUpgrade(selectedUpgrade);
}

// === BOSS WARNING ===
function drawBossWarning(){
  drawBackground();updateStars();
  ctx.fillStyle='rgba(0,0,0,0.6)';ctx.fillRect(0,0,W,H);
  const flash=Math.sin(warningTimer*0.15)>0;
  if(flash){drawNeonText('WARNING',W/2,H/2-40,48,COLORS.red);drawNeonText('BOSS APPROACHING',W/2,H/2+20,28,COLORS.orange);}
  drawNeonText('LEVEL '+level,W/2,H/2+70,20,COLORS.yellow);
  warningTimer--;if(warningTimer<=0)gameState='playing';
}

// === HUD ===
function drawHUD(){
  // Armor
  drawNeonText('ARMOR',15,20,12,COLORS.cyan,'left');
  for(let i=0;i<player.maxArmor;i++){
    const filled=i<player.armor;
    ctx.fillStyle=filled?COLORS.cyan:'#222';ctx.fillRect(15+i*14,28,10,10);
    ctx.strokeStyle=COLORS.cyan;ctx.lineWidth=1;ctx.strokeRect(15+i*14,28,10,10);
  }
  // Score
  drawNeonText('SCORE: '+score,W-15,20,14,COLORS.yellow,'right');
  drawNeonText('HI: '+hiScore,W-15,40,10,COLORS.orange,'right');
  // Level
  drawNeonText('LVL '+level,W/2,H-20,14,COLORS.cyan);
  // Weapons
  drawNeonText('WEAPONS',15,H-50,10,COLORS.green,'left');
  for(let i=0;i<player.weapons.length;i++){
    const w=player.weapons[i];
    drawNeonText(w.name,15,H-35+i*14,10,w.color,'left');
  }
  // Enemies remaining
  if(!bossActive){
    const rem=Math.max(0,enemiesNeeded-enemiesKilled);
    drawNeonText('ENEMIES: '+rem,W/2,H-40,10,COLORS.red);
  }
}

// === PLAYER UPDATE ===
function updatePlayer(){
  if(!player)return;
  const spd=player.speed;
  if(keys['ArrowUp']||keys['w']||keys['W'])player.y-=spd;
  if(keys['ArrowDown']||keys['s']||keys['S'])player.y+=spd;
  if(keys['ArrowLeft']||keys['a']||keys['A'])player.x-=spd;
  if(keys['ArrowRight']||keys['d']||keys['D'])player.x+=spd;
  player.x=Math.max(20,Math.min(W-20,player.x));
  player.y=Math.max(20,Math.min(H-20,player.y));
  if(player.invincible>0)player.invincible--;
  if(player.shieldFlash>0)player.shieldFlash--;
  fireWeapons();
}

// === MENUS ===
function drawMenu(){
  drawBackground();updateStars();
  const t=Date.now()*0.001;
  drawNeonText('NEON VOID RUNNER',W/2,160,44,COLORS.cyan);
  drawNeonText('SCI-FI SIDE SCROLLER',W/2,210,16,COLORS.magenta);
  // Animated ship
  const demoShip=SHIP_DEFS[Math.floor(t)%3];
  drawShip(W/2+Math.sin(t*2)*30,320+Math.sin(t*1.5)*10,demoShip,demoShip.color,1.5);
  const btnW=200,btnH=50,btnX=W/2-btnW/2,btnY=420;
  const hover=mouseX>=btnX&&mouseX<=btnX+btnW&&mouseY>=btnY&&mouseY<=btnY+btnH;
  ctx.strokeStyle=hover?'#fff':COLORS.cyan;ctx.lineWidth=hover?3:2;ctx.shadowColor=COLORS.cyan;ctx.shadowBlur=hover?20:10;
  ctx.fillStyle=hexAlpha(COLORS.cyan,hover?0.2:0.05);ctx.fillRect(btnX,btnY,btnW,btnH);ctx.strokeRect(btnX,btnY,btnW,btnH);
  ctx.shadowBlur=0;
  drawNeonText('START GAME',W/2,btnY+25,20,COLORS.cyan);
  drawNeonText('WASD/Arrows to move | Auto-fire',W/2,520,12,COLORS.white);
  drawNeonText('Pick up weapons | Evolve between levels',W/2,545,12,COLORS.white);
  drawNeonText('Boss every 10 levels!',W/2,570,12,COLORS.yellow);
  if(mouseClicked&&hover)gameState='shipSelect';
}

function drawShipSelect(){
  drawBackground();updateStars();
  drawNeonText('CHOOSE YOUR SHIP',W/2,60,32,COLORS.cyan);
  const cardW=240,cardH=340,gap=30;
  const totalW=cardW*3+gap*2;
  const startX=(W-totalW)/2;
  shipHoverIdx=-1;
  for(let i=0;i<3;i++){
    const def=SHIP_DEFS[i];
    const cx=startX+i*(cardW+gap),cy=100;
    const hover=mouseX>=cx&&mouseX<=cx+cardW&&mouseY>=cy&&mouseY<=cy+cardH;
    if(hover)shipHoverIdx=i;
    ctx.strokeStyle=hover?'#fff':def.color;ctx.lineWidth=hover?3:1;ctx.shadowColor=def.color;ctx.shadowBlur=hover?20:5;
    ctx.fillStyle=hexAlpha(def.color,hover?0.12:0.04);ctx.fillRect(cx,cy,cardW,cardH);ctx.strokeRect(cx,cy,cardW,cardH);
    ctx.shadowBlur=0;
    drawNeonText(def.name,cx+cardW/2,cy+30,22,def.color);
    drawShip(cx+cardW/2,cy+110,def,def.color,2);
    drawNeonText(def.desc,cx+cardW/2,cy+180,12,COLORS.white);
    // Stats bars
    const stats=[['SPEED',def.speed,10],['ARMOR',def.armor,10],['SLOTS',def.weaponSlots,4]];
    for(let si=0;si<stats.length;si++){
      const[label,val,max]=stats[si];
      const sy=cy+210+si*40;
      drawNeonText(label,cx+cardW/2,sy,11,def.color);
      const barW2=160,barH2=8,barX2=cx+(cardW-barW2)/2;
      ctx.fillStyle='#222';ctx.fillRect(barX2,sy+10,barW2,barH2);
      ctx.fillStyle=def.color;ctx.fillRect(barX2,sy+10,barW2*(val/max),barH2);
      ctx.strokeStyle=def.color;ctx.lineWidth=1;ctx.strokeRect(barX2,sy+10,barW2,barH2);
    }
  }
  if(mouseClicked&&shipHoverIdx>=0){
    player=createPlayer(shipHoverIdx);
    level=1;score=0;enemiesKilled=0;enemiesNeeded=8;bossActive=false;boss=null;
    bullets=[];enemies=[];enemyBullets=[];pickups=[];particles=[];spawnTimer=0;transitionTimer=0;
    gameState='playing';
  }
}

function drawGameOver(){
  drawBackground();updateStars();updateParticles();drawParticles();
  ctx.fillStyle='rgba(0,0,0,0.6)';ctx.fillRect(0,0,W,H);
  drawNeonText('GAME OVER',W/2,H/2-60,48,COLORS.red);
  drawNeonText('Score: '+score,W/2,H/2,24,COLORS.yellow);
  drawNeonText('High Score: '+hiScore,W/2,H/2+40,18,COLORS.orange);
  drawNeonText('Level Reached: '+level,W/2,H/2+75,16,COLORS.cyan);
  const btnW=200,btnH=50,btnX=W/2-btnW/2,btnY=H/2+110;
  const hover=mouseX>=btnX&&mouseX<=btnX+btnW&&mouseY>=btnY&&mouseY<=btnY+btnH;
  ctx.strokeStyle=hover?'#fff':COLORS.cyan;ctx.lineWidth=hover?3:2;ctx.shadowColor=COLORS.cyan;ctx.shadowBlur=hover?20:10;
  ctx.fillStyle=hexAlpha(COLORS.cyan,hover?0.2:0.05);ctx.fillRect(btnX,btnY,btnW,btnH);ctx.strokeRect(btnX,btnY,btnW,btnH);
  ctx.shadowBlur=0;
  drawNeonText('RETRY',W/2,btnY+25,20,COLORS.cyan);
  if(mouseClicked&&hover)gameState='shipSelect';
}

// === MAIN LOOP ===
initStars();
function gameLoop(){
  frameCt++;mouseClicked=false;
  // Re-check mouseClicked
  const mc=mouseClicked;
  requestAnimationFrame(gameLoop);
  ctx.save();
  if(screenShake>0){ctx.translate((Math.random()-0.5)*screenShake*2,(Math.random()-0.5)*screenShake*2);screenShake-=0.5;}
  switch(gameState){
    case'menu':drawMenu();break;
    case'shipSelect':drawShipSelect();break;
    case'playing':
      updateStars();updatePlayer();updateBullets();updateEnemies();updateEnemyBullets();
      updateBoss();updatePickups();updateParticles();checkCollisions();updateSpawning();
      drawBackground();drawPickups();drawBullets();drawEnemyBullets();
      for(const e of enemies)drawEnemy(e);drawBoss();
      if(player){
        if(player.invincible>0&&Math.floor(player.invincible/3)%2===0){}
        else drawShip(player.x,player.y,SHIP_DEFS[player.shipIdx],player.color,1);
        if(player.shieldFlash>0){drawGlow(player.x,player.y,40,COLORS.white,0.3);}
      }
      drawParticles();drawHUD();break;
    case'upgradeScreen':drawUpgradeScreen();break;
    case'bossWarning':drawBossWarning();break;
    case'gameOver':drawGameOver();break;
  }
  ctx.restore();
}
// Fix mouseClicked to work frame-by-frame
let _realClicked=false;
canvas.removeEventListener('mousedown',()=>{});
canvas.addEventListener('mousedown',()=>{_realClicked=true;});
const _origLoop=gameLoop;
function wrappedLoop(){
  mouseClicked=_realClicked;_realClicked=false;
  frameCt++;
  requestAnimationFrame(wrappedLoop);
  ctx.save();
  if(screenShake>0){ctx.translate((Math.random()-0.5)*screenShake*2,(Math.random()-0.5)*screenShake*2);screenShake-=0.5;}
  switch(gameState){
    case'menu':drawMenu();break;
    case'shipSelect':drawShipSelect();break;
    case'playing':
      updateStars();updatePlayer();updateBullets();updateEnemies();updateEnemyBullets();
      updateBoss();updatePickups();updateParticles();checkCollisions();updateSpawning();
      drawBackground();drawPickups();drawBullets();drawEnemyBullets();
      for(const e of enemies)drawEnemy(e);drawBoss();
      if(player){
        if(player.invincible>0&&Math.floor(player.invincible/3)%2===0){}
        else drawShip(player.x,player.y,SHIP_DEFS[player.shipIdx],player.color,1);
        if(player.shieldFlash>0)drawGlow(player.x,player.y,40,COLORS.white,0.3);
      }
      drawParticles();drawHUD();break;
    case'upgradeScreen':drawUpgradeScreen();break;
    case'bossWarning':drawBossWarning();break;
    case'gameOver':drawGameOver();break;
  }
  ctx.restore();
}
requestAnimationFrame(wrappedLoop);
