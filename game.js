// ============================================
// NEON VOID RUNNER - Sci-Fi Side Scroller
// ============================================
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = 960; canvas.height = 640;
const W = canvas.width, H = canvas.height;
const COLORS = {
  cyan:'#00ffff', magenta:'#ff00ff', pink:'#ff1493', blue:'#4169ff',
  green:'#39ff14', yellow:'#ffff00', orange:'#ff6600', red:'#ff0033',
  white:'#ffffff', bg:'#0a0a1a'
};

// STATE
let gameState = 'menu';
let level = 1, score = 0, hiScore = parseInt(localStorage.getItem('nvHi') || '0');
let credits = 0;
let enemiesKilled = 0, enemiesSpawned = 0, enemiesNeeded = 12;
let bossActive = false, boss = null;
let screenShake = 0, transitionTimer = 0, warningTimer = 0, spawnTimer = 0;
let particles = [], pickups = [], enemyBullets = [];
let stars = [], nebulae = [], bullets = [], enemies = [];
let player = null, upgradeOptions = [], selectedUpgrade = -1, shipHoverIdx = -1;
let frameCt = 0;
let creditPopups = [];

// ============================================
// PROCEDURAL AMBIENT SCI-FI BOSSA NOVA MUSIC
// ============================================
let audioCtx = null, musicPlaying = false, musicGain = null, musicMuted = false;

const BOSSA_CHORDS = [
  [62,65,69,72,76],[55,59,62,65,69],[60,64,67,71,74],[57,60,64,67,71],
  [65,68,72,75,79],[58,62,65,68,72],[63,67,70,74,77],[60,63,67,70,74],
  [62,65,69,72,76],[55,58,62,65,69],[60,64,67,71,76],[57,60,64,69,72]
];
const BOSSA_RHYTHM = [1,0,0,1,0,0,1,0,0,1,0,0,1,0,0,0];
const BOSSA_BASS_RHYTHM = [1,0,0,0,0,0,1,0,1,0,0,0,0,0,1,0];

function midiToFreq(m){return 440*Math.pow(2,(m-69)/12);}

function initAudio(){
  if(audioCtx)return;
  try{audioCtx=new(window.AudioContext||window.webkitAudioContext)();musicGain=audioCtx.createGain();musicGain.gain.value=0.35;musicGain.connect(audioCtx.destination);}catch(e){return;}
}
function startMusic(){
  if(!audioCtx||musicPlaying)return;musicPlaying=true;scheduleBossa();
}
function scheduleBossa(){
  if(!audioCtx||!musicPlaying)return;
  const bpm=130,sixD=60/bpm/4,barD=sixD*16,now=audioCtx.currentTime;
  for(let bar=0;bar<4;bar++){
    const ci=(Math.floor(now/barD)+bar)%BOSSA_CHORDS.length,chord=BOSSA_CHORDS[ci],bs=now+bar*barD;
    playPad(chord,bs,barD);
    for(let s=0;s<16;s++){if(BOSSA_RHYTHM[s])playBossaChord(chord,bs+s*sixD,sixD*2.5);}
    for(let s=0;s<16;s++){if(BOSSA_BASS_RHYTHM[s])playBass(chord[0]-12,bs+s*sixD,sixD*3);}
    if(Math.random()<0.6)playMelody(chord,bs+(Math.floor(Math.random()*4))*sixD*4,sixD);
    for(let s=0;s<16;s++){if(s%2===0||Math.random()<0.3)playShaker(bs+s*sixD,sixD*0.5,(s%4===0)?0.08:(s%2===0)?0.04:0.02);}
  }
  setTimeout(()=>scheduleBossa(),(barD*3.5)*1000);
}
function playPad(chord,time,dur){
  if(!audioCtx)return;
  const g=audioCtx.createGain(),f=audioCtx.createBiquadFilter();
  f.type='lowpass';f.frequency.setValueAtTime(800,time);f.frequency.linearRampToValueAtTime(1800,time+dur*0.4);f.frequency.linearRampToValueAtTime(600,time+dur);f.Q.value=2;
  f.connect(g);g.connect(musicGain);g.gain.setValueAtTime(0,time);g.gain.linearRampToValueAtTime(0.06,time+dur*0.3);g.gain.linearRampToValueAtTime(0.04,time+dur*0.8);g.gain.linearRampToValueAtTime(0,time+dur+0.5);
  for(let i=2;i<chord.length;i++){const o1=audioCtx.createOscillator(),o2=audioCtx.createOscillator();o1.type='sine';o2.type='triangle';const fr=midiToFreq(chord[i]+12);o1.frequency.setValueAtTime(fr,time);o2.frequency.setValueAtTime(fr*1.003,time);o1.connect(f);o2.connect(f);o1.start(time);o2.start(time);o1.stop(time+dur+0.6);o2.stop(time+dur+0.6);}
}
function playBossaChord(chord,time,dur){
  if(!audioCtx)return;
  const g=audioCtx.createGain(),f=audioCtx.createBiquadFilter();f.type='bandpass';f.frequency.value=1200;f.Q.value=1.5;f.connect(g);g.connect(musicGain);
  g.gain.setValueAtTime(0,time);g.gain.linearRampToValueAtTime(0.035,time+0.008);g.gain.exponentialRampToValueAtTime(0.008,time+dur);g.gain.linearRampToValueAtTime(0.001,time+dur+0.1);
  for(let i=0;i<Math.min(4,chord.length);i++){const o=audioCtx.createOscillator();o.type='triangle';const sd=i*0.006;o.frequency.setValueAtTime(midiToFreq(chord[i]),time+sd);o.connect(f);o.start(time+sd);o.stop(time+dur+0.15);}
}
function playBass(note,time,dur){
  if(!audioCtx)return;
  const g=audioCtx.createGain(),f=audioCtx.createBiquadFilter();f.type='lowpass';f.frequency.value=400;f.Q.value=1;f.connect(g);g.connect(musicGain);
  g.gain.setValueAtTime(0,time);g.gain.linearRampToValueAtTime(0.12,time+0.02);g.gain.exponentialRampToValueAtTime(0.03,time+dur*0.7);g.gain.linearRampToValueAtTime(0.001,time+dur);
  const o=audioCtx.createOscillator();o.type='triangle';o.frequency.setValueAtTime(midiToFreq(note)*0.98,time);o.frequency.linearRampToValueAtTime(midiToFreq(note),time+0.05);o.connect(f);o.start(time);o.stop(time+dur+0.1);
}
function playMelody(chord,startTime,sixD){
  if(!audioCtx)return;
  const scale=[...chord,chord[0]+12,chord[1]+12,chord[2]-1,chord[3]+2],nc=3+Math.floor(Math.random()*4);
  const g=audioCtx.createGain(),f=audioCtx.createBiquadFilter(),dl=audioCtx.createDelay(0.5),dg=audioCtx.createGain();
  f.type='lowpass';f.frequency.value=3000;f.Q.value=0.5;f.connect(g);f.connect(dl);dl.delayTime.value=sixD*3;dl.connect(dg);dg.gain.value=0.25;dg.connect(g);g.connect(musicGain);g.gain.value=0.04;
  for(let i=0;i<nc;i++){const t=startTime+i*sixD*(1+Math.floor(Math.random()*2)),note=scale[Math.floor(Math.random()*scale.length)]+12,dur=sixD*(1+Math.random()*2);const o=audioCtx.createOscillator();o.type=Math.random()<0.5?'sine':'triangle';o.frequency.setValueAtTime(midiToFreq(note),t);const ng=audioCtx.createGain();ng.gain.setValueAtTime(0,t);ng.gain.linearRampToValueAtTime(0.6,t+0.01);ng.gain.exponentialRampToValueAtTime(0.1,t+dur);ng.gain.linearRampToValueAtTime(0.001,t+dur+0.1);o.connect(ng);ng.connect(f);o.start(t);o.stop(t+dur+0.4);}
}
function playShaker(time,dur,vol){
  if(!audioCtx)return;
  const bs=audioCtx.sampleRate*dur,buf=audioCtx.createBuffer(1,bs,audioCtx.sampleRate),d=buf.getChannelData(0);for(let i=0;i<bs;i++)d[i]=Math.random()*2-1;
  const src=audioCtx.createBufferSource();src.buffer=buf;const g=audioCtx.createGain(),f=audioCtx.createBiquadFilter();f.type='highpass';f.frequency.value=8000;src.connect(f);f.connect(g);g.connect(musicGain);g.gain.setValueAtTime(vol,time);g.gain.exponentialRampToValueAtTime(0.001,time+dur);src.start(time);src.stop(time+dur);
}
function playSFX(freq,type,dur,vol){
  if(!audioCtx)return;const g=audioCtx.createGain();g.connect(audioCtx.destination);g.gain.setValueAtTime(vol||0.1,audioCtx.currentTime);g.gain.exponentialRampToValueAtTime(0.001,audioCtx.currentTime+(dur||0.1));const o=audioCtx.createOscillator();o.type=type||'square';o.frequency.setValueAtTime(freq,audioCtx.currentTime);o.frequency.exponentialRampToValueAtTime(freq*0.5,audioCtx.currentTime+(dur||0.1));o.connect(g);o.start();o.stop(audioCtx.currentTime+(dur||0.1));
}
function toggleMusic(){if(!musicGain)return;musicMuted=!musicMuted;musicGain.gain.linearRampToValueAtTime(musicMuted?0:0.35,audioCtx.currentTime+0.3);}

// INPUT
const keys = {};
window.addEventListener('keydown', e => {
  keys[e.key] = true;
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)) e.preventDefault();
  if (e.key === 'm' || e.key === 'M') toggleMusic();
});
window.addEventListener('keyup', e => { keys[e.key] = false; });
let mouseX = W/2, mouseY = H/2, mouseClicked = false, _pendingClick = false;
canvas.addEventListener('mousemove', e => {
  const r = canvas.getBoundingClientRect();
  mouseX = (e.clientX - r.left) * (W / r.width);
  mouseY = (e.clientY - r.top) * (H / r.height);
});
canvas.addEventListener('mousedown', () => { _pendingClick = true; initAudio(); startMusic(); });
window.addEventListener('keydown', () => { initAudio(); startMusic(); }, { once: true });

// SHIPS
const SHIP_DEFS = [
  { name:'PHANTOM', desc:'High speed, low armor', color:COLORS.cyan, speed:7, armor:3, maxArmor:3, weaponSlots:2, shape:'sleek' },
  { name:'TITAN', desc:'Heavy armor, slow speed', color:COLORS.orange, speed:4, armor:8, maxArmor:8, weaponSlots:2, shape:'heavy' },
  { name:'HYDRA', desc:'Extra weapon slot, balanced', color:COLORS.green, speed:5, armor:5, maxArmor:5, weaponSlots:3, shape:'wide' }
];

// WEAPONS
const WEAPON_DEFS = {
  laser:  { name:'Pulse Laser',  damage:1,   fireRate:8,  speed:12, color:COLORS.cyan,    pattern:'single',  size:3 },
  spread: { name:'Spread Shot',  damage:1,   fireRate:14, speed:10, color:COLORS.yellow,  pattern:'spread3', size:2 },
  missile:{ name:'Micro Missile',damage:3,   fireRate:30, speed:6,  color:COLORS.red,     pattern:'single',  size:4 },
  plasma: { name:'Plasma Bolt',  damage:2,   fireRate:18, speed:8,  color:COLORS.magenta, pattern:'single',  size:5 },
  beam:   { name:'Ion Beam',     damage:0.5, fireRate:2,  speed:20, color:COLORS.blue,    pattern:'single',  size:2 },
  wave:   { name:'Wave Cannon',  damage:2,   fireRate:22, speed:7,  color:COLORS.green,   pattern:'wave',    size:4 }
};

const EVOLUTIONS = {
  'Pulse Laser':    { name:'Twin Laser',      damage:1.5, fireRate:6,  speed:14, color:'#00ffee', pattern:'twin',      size:3 },
  'Spread Shot':    { name:'Spread-5',        damage:1.5, fireRate:12, speed:11, color:'#ffee00', pattern:'spread5',   size:3 },
  'Micro Missile':  { name:'Homing Missile',  damage:4,   fireRate:28, speed:7,  color:'#ff4444', pattern:'homing',    size:5 },
  'Plasma Bolt':    { name:'Plasma Storm',    damage:3,   fireRate:16, speed:9,  color:'#ff44ff', pattern:'twin',      size:6 },
  'Ion Beam':       { name:'Piercing Beam',   damage:1,   fireRate:2,  speed:25, color:'#6699ff', pattern:'pierce',    size:3 },
  'Wave Cannon':    { name:'Tsunami Cannon',  damage:3,   fireRate:20, speed:8,  color:'#44ff44', pattern:'bigwave',   size:6 },
  'Twin Laser':     { name:'Quad Laser',      damage:2,   fireRate:5,  speed:16, color:'#00ffcc', pattern:'quad',      size:3 },
  'Spread-5':       { name:'Nova Burst',      damage:2,   fireRate:10, speed:12, color:'#ffcc00', pattern:'spread7',   size:4 },
  'Homing Missile': { name:'Swarm Rockets',   damage:3,   fireRate:12, speed:8,  color:'#ff2222', pattern:'swarm',     size:4 },
  'Plasma Storm':   { name:'Void Plasma',     damage:5,   fireRate:14, speed:10, color:'#cc00ff', pattern:'voidblast', size:8 },
  'Piercing Beam':  { name:'Death Ray',       damage:2,   fireRate:1,  speed:30, color:'#99bbff', pattern:'deathray',  size:4 },
  'Tsunami Cannon': { name:'Gravity Wave',    damage:5,   fireRate:18, speed:9,  color:'#22ff22', pattern:'gravwave',  size:8 }
};

// UPGRADE COSTS - credits currency system
const UPGRADE_COSTS = { evolve_t1:150, evolve_t2:400, repair:30, maxArmor:200, speed:120, slot:350 };
const TIER1_NAMES = new Set(['Twin Laser','Spread-5','Homing Missile','Plasma Storm','Piercing Beam','Tsunami Cannon']);
function getEvolveCost(wn){ return TIER1_NAMES.has(wn) ? UPGRADE_COSTS.evolve_t2 : UPGRADE_COSTS.evolve_t1; }

// ENEMY TYPES - enemies now drop credits
const ENEMY_TYPES = {
  drone:     { name:'Drone',      w:24, h:20, hp:3,  speed:2,   color:COLORS.red,     move:'straight', shoots:false, score:10, credits:8 },
  sine:      { name:'Wave Rider', w:26, h:18, hp:4,  speed:2.5, color:COLORS.magenta, move:'sine',     shoots:false, score:20, credits:12, amp:60, freq:0.04 },
  strafer:   { name:'Strafer',    w:28, h:22, hp:5,  speed:1.5, color:COLORS.yellow,  move:'strafeV',  shoots:true, fireRate:60, score:30, credits:18 },
  kamikaze:  { name:'Kamikaze',   w:20, h:16, hp:2,  speed:5,   color:COLORS.orange,  move:'chase',    shoots:false, score:15, credits:10 },
  turret:    { name:'Turret',     w:30, h:30, hp:8,  speed:0.5, color:COLORS.pink,    move:'slow',     shoots:true, fireRate:40, score:40, credits:25 },
  zigzag:    { name:'Zig Zagger', w:22, h:18, hp:4,  speed:3,   color:'#ff8800',      move:'zigzag',   shoots:false, score:25, credits:14 },
  sniper:    { name:'Sniper',     w:26, h:20, hp:5,  speed:1,   color:'#8800ff',      move:'slow',     shoots:true, fireRate:80, score:35, credits:20, aimed:true },
  swarmling: { name:'Swarmling',  w:16, h:14, hp:1,  speed:3.5, color:'#00ff88',      move:'chase',    shoots:false, score:8, credits:5 }
};

// HELPERS
function hexAlpha(hex, a) {
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
  return 'rgba('+r+','+g+','+b+','+a+')';
}
function drawGlow(x, y, radius, color, alpha) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
  g.addColorStop(0, hexAlpha(color, alpha)); g.addColorStop(1, 'transparent');
  ctx.fillStyle = g; ctx.fillRect(x-radius, y-radius, radius*2, radius*2);
}
function spawnParticle(x, y, color, count, speed, life) {
  for (let i = 0; i < count; i++) {
    const a = Math.random()*Math.PI*2, s = Math.random()*(speed||3)+1;
    particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:life||(20+Math.random()*20),maxLife:life||30,color,size:1+Math.random()*3});
  }
}
function drawNeonText(text, x, y, size, color, align) {
  ctx.save(); ctx.textAlign = align||'center'; ctx.textBaseline = 'middle';
  ctx.font = 'bold '+size+'px "Courier New",monospace';
  ctx.shadowColor = color; ctx.shadowBlur = 20; ctx.fillStyle = color; ctx.fillText(text, x, y);
  ctx.shadowBlur = 10; ctx.fillText(text, x, y); ctx.shadowBlur = 0;
  ctx.fillStyle = '#fff'; ctx.globalAlpha = 0.5; ctx.fillText(text, x, y); ctx.restore();
}

// Credit popup system
function spawnCreditPopup(x, y, amount) { creditPopups.push({x, y, amount, life:60, maxLife:60}); }
function updateCreditPopups() { for(let i=creditPopups.length-1;i>=0;i--){creditPopups[i].y-=1;creditPopups[i].life--;if(creditPopups[i].life<=0)creditPopups.splice(i,1);} }
function drawCreditPopups() { for(const p of creditPopups){const a=p.life/p.maxLife;ctx.save();ctx.globalAlpha=a;drawNeonText('+'+p.amount+'cr',p.x,p.y,12,COLORS.yellow);ctx.restore();} }

// BACKGROUND
function initStars() {
  stars = []; for (let i=0;i<120;i++) stars.push({x:Math.random()*W,y:Math.random()*H,speed:0.5+Math.random()*3,size:Math.random()*2+0.5,brightness:Math.random()});
  nebulae = []; for (let i=0;i<5;i++) nebulae.push({x:Math.random()*W,y:Math.random()*H,r:60+Math.random()*120,color:[COLORS.cyan,COLORS.magenta,COLORS.blue,COLORS.pink][Math.floor(Math.random()*4)],speed:0.2+Math.random()*0.5,alpha:0.03+Math.random()*0.05});
}
function updateStars() {
  for (const s of stars) { s.x -= s.speed; if (s.x<0){s.x=W;s.y=Math.random()*H;} }
  for (const n of nebulae) { n.x -= n.speed; if (n.x<-n.r*2){n.x=W+n.r;n.y=Math.random()*H;} }
}
function drawBackground() {
  ctx.fillStyle = COLORS.bg; ctx.fillRect(0,0,W,H);
  ctx.strokeStyle = 'rgba(0,255,255,0.04)'; ctx.lineWidth = 1;
  const gridOff = (Date.now()*0.03)%40;
  for (let x=-gridOff;x<W;x+=40){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
  for (let y=0;y<H;y+=40){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
  for (const n of nebulae){const g=ctx.createRadialGradient(n.x,n.y,0,n.x,n.y,n.r);g.addColorStop(0,hexAlpha(n.color,n.alpha));g.addColorStop(1,'transparent');ctx.fillStyle=g;ctx.fillRect(n.x-n.r,n.y-n.r,n.r*2,n.r*2);}
  for (const s of stars){const b=0.4+0.6*(0.5+0.5*Math.sin(Date.now()*0.003+s.brightness*10));ctx.fillStyle='rgba(255,255,255,'+b+')';ctx.fillRect(s.x,s.y,s.size,s.size);}
}

// DRAW SHIP
function drawShip(x, y, def, color, scale) {
  const s = scale||1; ctx.save(); ctx.translate(x,y); ctx.scale(s,s);
  drawGlow(0,0,35,color,0.15);
  const flicker = Math.random()*8;
  ctx.fillStyle = COLORS.orange; ctx.shadowColor = COLORS.orange; ctx.shadowBlur = 10;
  if (def.shape==='sleek') ctx.fillRect(-22-flicker,-3,flicker+8,6);
  else if (def.shape==='heavy') ctx.fillRect(-22-flicker,-6,flicker+6,12);
  else { ctx.fillRect(-20-flicker,-8,flicker+5,5); ctx.fillRect(-20-flicker,3,flicker+5,5); }
  ctx.shadowBlur = 0; ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.fillStyle = hexAlpha(color,0.15);
  ctx.shadowColor = color; ctx.shadowBlur = 8; ctx.beginPath();
  if (def.shape==='sleek'){ctx.moveTo(22,0);ctx.lineTo(-12,-14);ctx.lineTo(-18,-10);ctx.lineTo(-16,0);ctx.lineTo(-18,10);ctx.lineTo(-12,14);}
  else if (def.shape==='heavy'){ctx.moveTo(18,0);ctx.lineTo(8,-16);ctx.lineTo(-14,-18);ctx.lineTo(-18,-12);ctx.lineTo(-18,12);ctx.lineTo(-14,18);ctx.lineTo(8,16);}
  else{ctx.moveTo(20,0);ctx.lineTo(4,-18);ctx.lineTo(-10,-20);ctx.lineTo(-16,-14);ctx.lineTo(-14,0);ctx.lineTo(-16,14);ctx.lineTo(-10,20);ctx.lineTo(4,18);}
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.shadowBlur=0; ctx.fillStyle=color; ctx.beginPath();
  if(def.shape==='sleek'){ctx.arc(5,0,3,0,Math.PI*2);}
  else if(def.shape==='heavy'){ctx.arc(0,0,4,0,Math.PI*2);}
  else{ctx.arc(3,-6,2,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(3,6,2,0,Math.PI*2);}
  ctx.fill(); ctx.restore();
}

// PLAYER
function createPlayer(shipIdx) {
  const def = SHIP_DEFS[shipIdx];
  return {x:120,y:H/2,w:40,h:30,speed:def.speed,armor:def.armor,maxArmor:def.maxArmor,
    weaponSlots:def.weaponSlots,weapons:[{...WEAPON_DEFS.laser,cooldown:0}],
    shipIdx:shipIdx,color:def.color,shape:def.shape,invincible:0,shieldFlash:0};
}
function updatePlayer() {
  if (!player) return;
  const spd = player.speed;
  if (keys['ArrowUp']||keys['w']||keys['W']) player.y -= spd;
  if (keys['ArrowDown']||keys['s']||keys['S']) player.y += spd;
  if (keys['ArrowLeft']||keys['a']||keys['A']) player.x -= spd;
  if (keys['ArrowRight']||keys['d']||keys['D']) player.x += spd;
  player.x = Math.max(20,Math.min(W-20,player.x));
  player.y = Math.max(20,Math.min(H-20,player.y));
  if (player.invincible>0) player.invincible--;
  if (player.shieldFlash>0) player.shieldFlash--;
  fireWeapons();
}

// FIRE WEAPONS
function fireWeapons() {
  if (!player) return;
  for (const w of player.weapons) {
    if (w.cooldown>0){w.cooldown--;continue;}
    w.cooldown = w.fireRate;
    const bx=player.x+22, by=player.y;
    const base = {damage:w.damage,color:w.color,size:w.size,speed:w.speed,pattern:w.pattern,pierce:w.pattern==='pierce'||w.pattern==='deathray'};
    switch (w.pattern) {
      case 'single': bullets.push({x:bx,y:by,vx:w.speed,vy:0,...base}); break;
      case 'twin': bullets.push({x:bx,y:by-6,vx:w.speed,vy:0,...base}); bullets.push({x:bx,y:by+6,vx:w.speed,vy:0,...base}); break;
      case 'quad': for(let i=-1.5;i<=1.5;i++) bullets.push({x:bx,y:by+i*5,vx:w.speed,vy:i*0.3,...base}); break;
      case 'spread3': for(let a=-0.2;a<=0.2;a+=0.2) bullets.push({x:bx,y:by,vx:Math.cos(a)*w.speed,vy:Math.sin(a)*w.speed,...base}); break;
      case 'spread5': for(let a=-0.35;a<=0.36;a+=0.175) bullets.push({x:bx,y:by,vx:Math.cos(a)*w.speed,vy:Math.sin(a)*w.speed,...base}); break;
      case 'spread7': for(let a=-0.45;a<=0.46;a+=0.15) bullets.push({x:bx,y:by,vx:Math.cos(a)*w.speed,vy:Math.sin(a)*w.speed,...base}); break;
      case 'wave': bullets.push({x:bx,y:by,vx:w.speed,vy:0,waveAmp:30,waveFreq:0.1,waveT:0,...base}); break;
      case 'bigwave': bullets.push({x:bx,y:by,vx:w.speed,vy:0,waveAmp:50,waveFreq:0.08,waveT:0,...base}); bullets.push({x:bx,y:by,vx:w.speed,vy:0,waveAmp:50,waveFreq:0.08,waveT:Math.PI,...base}); break;
      case 'homing': bullets.push({x:bx,y:by,vx:w.speed,vy:0,homing:true,...base}); break;
      case 'swarm': for(let i=0;i<3;i++) bullets.push({x:bx,y:by,vx:w.speed,vy:(Math.random()-0.5)*3,homing:true,...base}); break;
      case 'pierce': case 'deathray': bullets.push({x:bx,y:by,vx:w.speed,vy:0,...base}); break;
      case 'voidblast': for(let a=-0.3;a<=0.31;a+=0.15) bullets.push({x:bx,y:by,vx:Math.cos(a)*w.speed,vy:Math.sin(a)*w.speed,...base}); break;
      case 'gravwave': bullets.push({x:bx,y:by,vx:w.speed,vy:0,waveAmp:70,waveFreq:0.06,waveT:0,...base}); bullets.push({x:bx,y:by,vx:w.speed,vy:0,waveAmp:70,waveFreq:0.06,waveT:Math.PI/2,...base}); bullets.push({x:bx,y:by,vx:w.speed,vy:0,waveAmp:70,waveFreq:0.06,waveT:Math.PI,...base}); break;
      default: bullets.push({x:bx,y:by,vx:w.speed,vy:0,...base});
    }
  }
}

// BULLETS
function updateBullets() {
  for (let i=bullets.length-1;i>=0;i--) {
    const b = bullets[i];
    if (b.homing) {
      let tx=b.x+100, ty=b.y, minD=Infinity;
      for (const e of enemies){const d=Math.hypot(e.x-b.x,e.y-b.y);if(d<minD){minD=d;tx=e.x;ty=e.y;}}
      if (boss){const d=Math.hypot(boss.x-b.x,boss.y-b.y);if(d<minD){tx=boss.x;ty=boss.y;}}
      const a=Math.atan2(ty-b.y,tx-b.x); b.vx+=Math.cos(a)*0.5; b.vy+=Math.sin(a)*0.5;
      const spd=Math.hypot(b.vx,b.vy); if(spd>b.speed*1.2){b.vx*=b.speed*1.2/spd;b.vy*=b.speed*1.2/spd;}
    }
    if (b.waveAmp){b.waveT+=b.waveFreq;b.y+=Math.cos(b.waveT)*b.waveAmp*b.waveFreq;}
    b.x += b.vx; b.y += b.vy;
    if (b.x>W+20||b.x<-20||b.y>H+20||b.y<-20) bullets.splice(i,1);
  }
}
function drawBullets() {
  for (const b of bullets) {
    ctx.save(); ctx.shadowColor=b.color; ctx.shadowBlur=8; ctx.fillStyle=b.color;
    ctx.beginPath(); ctx.arc(b.x,b.y,b.size,0,Math.PI*2); ctx.fill();
    ctx.globalAlpha=0.3; ctx.beginPath(); ctx.arc(b.x-b.vx*0.5,b.y-b.vy*0.5,b.size*0.7,0,Math.PI*2); ctx.fill(); ctx.restore();
  }
}

// LEVEL COMPOSITION
function getLevelEnemyPool(lvl) {
  if (lvl<=2) return [{type:'drone',weight:5},{type:'swarmling',weight:3}];
  if (lvl<=4) return [{type:'drone',weight:4},{type:'sine',weight:3},{type:'swarmling',weight:2}];
  if (lvl<=6) return [{type:'drone',weight:2},{type:'sine',weight:3},{type:'strafer',weight:3},{type:'kamikaze',weight:2}];
  if (lvl<=8) return [{type:'sine',weight:2},{type:'strafer',weight:3},{type:'kamikaze',weight:3},{type:'zigzag',weight:3}];
  if (lvl<=12) return [{type:'strafer',weight:2},{type:'kamikaze',weight:2},{type:'turret',weight:3},{type:'zigzag',weight:2},{type:'sniper',weight:2}];
  if (lvl<=16) return [{type:'strafer',weight:2},{type:'kamikaze',weight:3},{type:'turret',weight:2},{type:'zigzag',weight:3},{type:'sniper',weight:3},{type:'swarmling',weight:4}];
  if (lvl<=20) return [{type:'kamikaze',weight:3},{type:'turret',weight:3},{type:'zigzag',weight:2},{type:'sniper',weight:4},{type:'swarmling',weight:5},{type:'sine',weight:2}];
  return [{type:'drone',weight:1},{type:'sine',weight:2},{type:'strafer',weight:3},{type:'kamikaze',weight:4},{type:'turret',weight:3},{type:'zigzag',weight:3},{type:'sniper',weight:4},{type:'swarmling',weight:5}];
}
function pickWeightedEnemy(pool) {
  let total=0; for(const p of pool) total+=p.weight;
  let r=Math.random()*total; for(const p of pool){r-=p.weight;if(r<=0)return p.type;}
  return pool[pool.length-1].type;
}

// ENEMIES - slower scaling, more HP, credits on kill
function spawnEnemy() {
  if (enemiesSpawned >= enemiesNeeded) return;
  const pool=getLevelEnemyPool(level), typeKey=pickWeightedEnemy(pool), def=ENEMY_TYPES[typeKey];
  const hpScale=1+Math.floor((level-1)/3)*0.25, spdScale=1+(level-1)*0.05;
  const originY=40+Math.random()*(H-80);
  const creditValue = Math.ceil(def.credits * (1 + level * 0.08));
  enemies.push({x:W+20,y:originY,w:def.w,h:def.h,hp:Math.ceil(def.hp*hpScale),maxHp:Math.ceil(def.hp*hpScale),
    speed:def.speed*spdScale,color:def.color,move:def.move,shoots:def.shoots,
    fireRate:Math.max(10,Math.floor((def.fireRate||999)*(1-level*0.015))),
    fireCooldown:Math.random()*(def.fireRate||60),aimed:def.aimed||false,
    score:Math.ceil(def.score*(1+level*0.1)),credits:creditValue,
    t:Math.random()*100,originY:originY,
    amp:def.amp||0,freq:def.freq||0,zigDir:1,type:typeKey});
  enemiesSpawned++;
}
function updateEnemies() {
  for (let i=enemies.length-1;i>=0;i--) {
    const e=enemies[i]; e.t++;
    switch(e.move){
      case'straight':e.x-=e.speed;break;
      case'sine':e.x-=e.speed;e.y=e.originY+Math.sin(e.t*e.freq)*e.amp;break;
      case'strafeV':e.x-=e.speed*0.3;e.y+=Math.sin(e.t*0.05)*3;break;
      case'chase':if(player){const a=Math.atan2(player.y-e.y,player.x-e.x);e.x+=Math.cos(a)*e.speed;e.y+=Math.sin(a)*e.speed;}break;
      case'slow':e.x-=e.speed;break;
      case'zigzag':e.x-=e.speed;if(e.t%30===0)e.zigDir*=-1;e.y+=e.zigDir*3;break;
    }
    if (e.shoots){e.fireCooldown--;if(e.fireCooldown<=0){e.fireCooldown=e.fireRate;
      if(e.aimed&&player){const a=Math.atan2(player.y-e.y,player.x-e.x);enemyBullets.push({x:e.x-e.w/2,y:e.y,vx:Math.cos(a)*5,vy:Math.sin(a)*5,size:3,color:e.color,damage:1});}
      else{enemyBullets.push({x:e.x-e.w/2,y:e.y,vx:-5,vy:0,size:3,color:e.color,damage:1});}}}
    e.y=Math.max(10,Math.min(H-10,e.y));
    if(e.x<-50) { enemies.splice(i,1); enemiesKilled++; }
  }
}
function drawEnemy(e) {
  ctx.save(); ctx.translate(e.x,e.y); drawGlow(0,0,e.w,e.color,0.1);
  ctx.strokeStyle=e.color; ctx.lineWidth=2; ctx.fillStyle=hexAlpha(e.color,0.2);
  ctx.shadowColor=e.color; ctx.shadowBlur=6; ctx.beginPath();
  switch(e.type){
    case'drone':ctx.moveTo(-e.w/2,0);ctx.lineTo(0,-e.h/2);ctx.lineTo(e.w/2,0);ctx.lineTo(0,e.h/2);break;
    case'sine':ctx.ellipse(0,0,e.w/2,e.h/2,0,0,Math.PI*2);break;
    case'strafer':ctx.rect(-e.w/2,-e.h/2,e.w,e.h);break;
    case'kamikaze':ctx.moveTo(e.w/2,0);ctx.lineTo(-e.w/2,-e.h/2);ctx.lineTo(-e.w/4,0);ctx.lineTo(-e.w/2,e.h/2);break;
    case'turret':ctx.arc(0,0,e.w/2,0,Math.PI*2);break;
    case'zigzag':for(let p=0;p<6;p++){const a=p*Math.PI/3;ctx.lineTo(Math.cos(a)*e.w/2,Math.sin(a)*e.h/2);}break;
    case'sniper':ctx.moveTo(e.w/2,0);ctx.lineTo(0,-e.h/2);ctx.lineTo(-e.w/2,0);ctx.lineTo(0,e.h/2);ctx.moveTo(e.w/2+8,0);ctx.lineTo(e.w/2,0);break;
    case'swarmling':ctx.arc(0,0,e.w/2,0,Math.PI*2);break;
    default:ctx.rect(-e.w/2,-e.h/2,e.w,e.h);
  }
  ctx.closePath(); ctx.fill(); ctx.stroke();
  if (e.hp<e.maxHp){ctx.shadowBlur=0;const bw=e.w+4;ctx.fillStyle='#333';ctx.fillRect(-bw/2,-e.h/2-6,bw,3);ctx.fillStyle=e.color;ctx.fillRect(-bw/2,-e.h/2-6,bw*(e.hp/e.maxHp),3);}
  ctx.restore();
}

// ENEMY BULLETS
function updateEnemyBullets() {
  for(let i=enemyBullets.length-1;i>=0;i--){const b=enemyBullets[i];b.x+=b.vx;b.y+=b.vy;if(b.x<-20||b.x>W+20||b.y<-20||b.y>H+20)enemyBullets.splice(i,1);}
}
function drawEnemyBullets() {
  for(const b of enemyBullets){ctx.save();ctx.fillStyle=b.color;ctx.shadowColor=b.color;ctx.shadowBlur=6;ctx.beginPath();ctx.arc(b.x,b.y,b.size,0,Math.PI*2);ctx.fill();ctx.restore();}
}

// BOSS
function createBoss() {
  const bossLevel = Math.floor(level/10);
  const colors = [COLORS.red, COLORS.magenta, COLORS.orange, '#ff00aa', '#aa00ff'];
  return {x:W+60,y:H/2,w:70+bossLevel*5,h:60+bossLevel*5,hp:60+bossLevel*30,maxHp:60+bossLevel*30,
    speed:1.5,color:colors[bossLevel%colors.length],phase:0,t:0,fireTimer:0,attackPattern:0,patternTimer:0,
    credits:200+bossLevel*100};
}
function updateBoss() {
  if (!boss) return;
  boss.t++;
  if (boss.x>W-120){boss.x-=2;return;}
  boss.y = H/2+Math.sin(boss.t*0.02)*(H/3);
  boss.x = W-120+Math.sin(boss.t*0.01)*40;
  const hpPct = boss.hp/boss.maxHp;
  boss.phase = hpPct>0.6?0:hpPct>0.3?1:2;
  boss.fireTimer--; boss.patternTimer++;
  if (boss.fireTimer<=0) {
    const pattern = (boss.patternTimer/120|0)%3;
    switch(pattern){
      case 0: for(let a=-0.6;a<=0.61;a+=0.3) enemyBullets.push({x:boss.x-boss.w/2,y:boss.y,vx:Math.cos(Math.PI+a)*5,vy:Math.sin(Math.PI+a)*5,size:4,color:boss.color,damage:1}); boss.fireTimer=Math.max(8,25-boss.phase*6); break;
      case 1: if(player){const a=Math.atan2(player.y-boss.y,player.x-boss.x);for(let i=-1;i<=1;i++) enemyBullets.push({x:boss.x-boss.w/2,y:boss.y,vx:Math.cos(a+i*0.15)*6,vy:Math.sin(a+i*0.15)*6,size:3,color:boss.color,damage:1});} boss.fireTimer=Math.max(6,20-boss.phase*5); break;
      case 2: for(let a=0;a<Math.PI*2;a+=Math.PI/6) enemyBullets.push({x:boss.x,y:boss.y,vx:Math.cos(a)*4,vy:Math.sin(a)*4,size:3,color:boss.color,damage:1}); boss.fireTimer=Math.max(15,40-boss.phase*8); break;
    }
  }
}
function drawBoss() {
  if (!boss) return;
  ctx.save(); ctx.translate(boss.x,boss.y); drawGlow(0,0,boss.w+20,boss.color,0.1+boss.phase*0.05);
  ctx.strokeStyle=boss.color; ctx.lineWidth=3; ctx.fillStyle=hexAlpha(boss.color,0.2);
  ctx.shadowColor=boss.color; ctx.shadowBlur=15; ctx.beginPath();
  ctx.moveTo(boss.w/2,0); ctx.lineTo(boss.w/4,-boss.h/2); ctx.lineTo(-boss.w/4,-boss.h/2-10);
  ctx.lineTo(-boss.w/2,-boss.h/4); ctx.lineTo(-boss.w/2-15,0); ctx.lineTo(-boss.w/2,boss.h/4);
  ctx.lineTo(-boss.w/4,boss.h/2+10); ctx.lineTo(boss.w/4,boss.h/2);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = boss.phase>=2?'#ff0000':boss.phase>=1?'#ffaa00':boss.color;
  ctx.shadowBlur=10; ctx.beginPath(); ctx.arc(10,0,8+boss.phase*2,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#000'; ctx.beginPath(); ctx.arc(10,0,3,0,Math.PI*2); ctx.fill();
  ctx.shadowBlur=0; const bw=boss.w+20;
  ctx.fillStyle='#333'; ctx.fillRect(-bw/2,-boss.h/2-18,bw,5);
  ctx.fillStyle=boss.color; ctx.fillRect(-bw/2,-boss.h/2-18,bw*(boss.hp/boss.maxHp),5);
  ctx.restore();
}

// PICKUPS
function spawnPickup(x, y) {
  if (Math.random()>0.2) return;
  if (Math.random()<0.4) pickups.push({x,y,w:16,h:16,type:'health',t:0,life:480});
  else { const types=Object.keys(WEAPON_DEFS); pickups.push({x,y,w:16,h:16,type:types[Math.floor(Math.random()*types.length)],t:0,life:480}); }
}
function updatePickups() {
  for (let i=pickups.length-1;i>=0;i--) {
    const p=pickups[i]; p.t++; p.life--;
    if (p.life<=0){pickups.splice(i,1);continue;}
    if (!player) continue;
    if (Math.abs(p.x-player.x)<30 && Math.abs(p.y-player.y)<30) {
      if (p.type==='health'){player.armor=Math.min(player.maxArmor,player.armor+1);spawnParticle(p.x,p.y,COLORS.green,10,3,20);}
      else { const wdef=WEAPON_DEFS[p.type]; if(wdef){const existing=player.weapons.find(w=>w.name===wdef.name);
        if(!existing){if(player.weapons.length<player.weaponSlots)player.weapons.push({...wdef,cooldown:0});else player.weapons[player.weapons.length-1]={...wdef,cooldown:0};}
        spawnParticle(p.x,p.y,wdef.color,10,3,20);}}
      pickups.splice(i,1);
      playSFX(880, 'sine', 0.15, 0.08);
    }
  }
}
function drawPickups() {
  for (const p of pickups) {
    const bob=Math.sin(p.t*0.1)*4;
    if (p.life<120 && Math.floor(p.t/6)%2===0) continue;
    ctx.save(); ctx.translate(p.x,p.y+bob);
    if (p.type==='health'){drawGlow(0,0,14,COLORS.green,0.3);ctx.fillStyle=COLORS.green;ctx.shadowColor=COLORS.green;ctx.shadowBlur=8;ctx.fillRect(-2,-6,4,12);ctx.fillRect(-6,-2,12,4);}
    else{const wdef=WEAPON_DEFS[p.type];const col=wdef?wdef.color:COLORS.white;drawGlow(0,0,14,col,0.3);ctx.strokeStyle=col;ctx.lineWidth=2;ctx.shadowColor=col;ctx.shadowBlur=8;ctx.strokeRect(-8,-8,16,16);ctx.fillStyle=col;ctx.font='8px monospace';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(p.type[0].toUpperCase(),0,0);}
    ctx.restore();
  }
}

// PARTICLES
function updateParticles() {
  for (let i=particles.length-1;i>=0;i--){const p=particles[i];p.x+=p.vx;p.y+=p.vy;p.vx*=0.96;p.vy*=0.96;p.life--;if(p.life<=0)particles.splice(i,1);}
}
function drawParticles() {
  for (const p of particles){const a=p.life/p.maxLife;ctx.save();ctx.globalAlpha=a;ctx.fillStyle=p.color;ctx.shadowColor=p.color;ctx.shadowBlur=6;ctx.beginPath();ctx.arc(p.x,p.y,p.size*a,0,Math.PI*2);ctx.fill();ctx.restore();}
}

// COLLISIONS - enemies now award credits
function checkCollisions() {
  if (!player) return;
  for (let bi=bullets.length-1;bi>=0;bi--) {
    const b=bullets[bi]; let hit=false;
    for (let ei=enemies.length-1;ei>=0;ei--) {
      const e=enemies[ei];
      if (Math.abs(b.x-e.x)<e.w/2+b.size && Math.abs(b.y-e.y)<e.h/2+b.size) {
        e.hp-=b.damage; spawnParticle(b.x,b.y,b.color,3,2,10);
        if (!b.pierce){bullets.splice(bi,1);hit=true;}
        if (e.hp<=0){
          score+=e.score; credits+=e.credits; enemiesKilled++;
          spawnParticle(e.x,e.y,e.color,20,5,30); spawnPickup(e.x,e.y);
          spawnCreditPopup(e.x, e.y-15, e.credits);
          enemies.splice(ei,1); screenShake=5;
          playSFX(200,'sawtooth',0.2,0.08);
        }
        break;
      }
    }
    if (!hit && boss && bi<bullets.length) {
      const b2=bullets[bi];
      if (b2 && Math.abs(b2.x-boss.x)<boss.w/2+b2.size && Math.abs(b2.y-boss.y)<boss.h/2+b2.size) {
        boss.hp-=b2.damage; spawnParticle(b2.x,b2.y,b2.color,3,2,8);
        if (!b2.pierce) bullets.splice(bi,1);
        if (boss.hp<=0) {
          score+=500+level*50; credits+=boss.credits;
          spawnParticle(boss.x,boss.y,boss.color,50,8,40); screenShake=20;
          spawnCreditPopup(boss.x, boss.y-30, boss.credits);
          for(let d=0;d<3;d++){const types=Object.keys(WEAPON_DEFS);pickups.push({x:boss.x+(Math.random()-0.5)*100,y:boss.y+(Math.random()-0.5)*100,w:18,h:18,type:types[Math.floor(Math.random()*types.length)],t:0,life:600});}
          boss=null; bossActive=false; enemiesSpawned=0; enemiesKilled=0; transitionTimer=90;
          playSFX(100,'sawtooth',0.5,0.15);
        }
      }
    }
  }
  if (player.invincible<=0) {
    for (let i=enemyBullets.length-1;i>=0;i--) {
      const b=enemyBullets[i];
      if (Math.abs(b.x-player.x)<18 && Math.abs(b.y-player.y)<14) {
        player.armor-=b.damage; player.invincible=30; player.shieldFlash=10;
        spawnParticle(b.x,b.y,COLORS.white,8,3,15); screenShake=4; enemyBullets.splice(i,1);
        playSFX(150,'square',0.15,0.1);
        if (player.armor<=0){doGameOver();return;}
      }
    }
    for (let i=enemies.length-1;i>=0;i--) {
      const e=enemies[i];
      if (Math.abs(e.x-player.x)<(e.w/2+18) && Math.abs(e.y-player.y)<(e.h/2+14)) {
        player.armor-=1; player.invincible=30; player.shieldFlash=10; screenShake=6;
        spawnParticle(e.x,e.y,e.color,15,4,20); enemies.splice(i,1); enemiesKilled++;
        playSFX(150,'square',0.15,0.1);
        if (player.armor<=0){doGameOver();return;}
      }
    }
    if (boss && Math.abs(boss.x-player.x)<(boss.w/2+18) && Math.abs(boss.y-player.y)<(boss.h/2+14)) {
      player.armor-=2; player.invincible=60; player.shieldFlash=15; screenShake=10;
      if (player.armor<=0) doGameOver();
    }
  }
}
function doGameOver() {
  spawnParticle(player.x,player.y,player.color,40,6,40); screenShake=15;
  if (score>hiScore){hiScore=score;localStorage.setItem('nvHi',hiScore.toString());}
  gameState='gameOver';
  playSFX(80,'sawtooth',0.8,0.15);
}

// SPAWNING / LEVEL PROGRESSION - slower progression
function updateSpawning() {
  if (bossActive) return;
  if (transitionTimer>0) {
    transitionTimer--;
    if (transitionTimer===0) { upgradeOptions=generateUpgradeOptions(); gameState='upgradeScreen'; }
    return;
  }
  if (enemiesSpawned < enemiesNeeded) {
    spawnTimer--;
    if (spawnTimer<=0) {
      spawnTimer = Math.max(20, 55-level*2);
      const waveSize = Math.min(4, 1+Math.floor(level/4));
      for (let i=0;i<waveSize;i++) spawnEnemy();
    }
  }
  if (enemiesSpawned>=enemiesNeeded && enemies.length===0 && enemyBullets.length===0) {
    const nextLevel = level+1;
    if (nextLevel%10===0) {
      level=nextLevel; enemiesKilled=0; enemiesSpawned=0; enemiesNeeded=0;
      bossActive=true; boss=createBoss(); warningTimer=120; gameState='bossWarning';
    } else {
      level=nextLevel; enemiesKilled=0; enemiesSpawned=0;
      enemiesNeeded=Math.min(40, 12+level*3);
      transitionTimer=60;
    }
  }
}

// UPGRADE SCREEN - now costs credits!
function generateUpgradeOptions() {
  const opts = [];
  for (const w of player.weapons) {
    if (EVOLUTIONS[w.name]) {
      const cost = getEvolveCost(w.name);
      opts.push({type:'evolve',weapon:w,result:EVOLUTIONS[w.name],cost:cost,
        desc:'Evolve '+w.name+' \u2192 '+EVOLUTIONS[w.name].name});
    }
  }
  if (player.armor<player.maxArmor) {
    const amt = Math.min(3,player.maxArmor-player.armor);
    opts.push({type:'repair',cost:UPGRADE_COSTS.repair,desc:'Repair Armor (+'+amt+' HP)'});
  }
  opts.push({type:'maxArmor',cost:UPGRADE_COSTS.maxArmor,desc:'Reinforce Hull (+1 Max Armor)'});
  if (player.speed<12) opts.push({type:'speed',cost:UPGRADE_COSTS.speed,desc:'Thruster Upgrade (+0.5 Speed)'});
  if (player.weaponSlots<4) opts.push({type:'slot',cost:UPGRADE_COSTS.slot,desc:'Add Weapon Slot (current: '+player.weaponSlots+')'});
  for (let i=opts.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[opts[i],opts[j]]=[opts[j],opts[i]];}
  return opts.slice(0,3);
}
function applyUpgrade(idx) {
  const opt=upgradeOptions[idx]; if(!opt)return;
  if (credits < opt.cost) return; // Can't afford!
  credits -= opt.cost;
  switch(opt.type){
    case'evolve':{const wi=player.weapons.indexOf(opt.weapon);if(wi>=0)player.weapons[wi]={...opt.result,cooldown:0};break;}
    case'repair':player.armor=Math.min(player.maxArmor,player.armor+3);break;
    case'maxArmor':player.maxArmor+=1;player.armor+=1;break;
    case'speed':player.speed=Math.min(12,player.speed+0.5);break;
    case'slot':player.weaponSlots=Math.min(4,player.weaponSlots+1);break;
  }
  playSFX(660,'sine',0.2,0.1);
  gameState='playing';
}
function drawUpgradeScreen() {
  drawBackground();
  ctx.fillStyle='rgba(0,0,0,0.75)'; ctx.fillRect(0,0,W,H);
  drawNeonText('LEVEL '+(level-1)+' COMPLETE!',W/2,50,34,COLORS.cyan);
  drawNeonText('Entering Level '+level,W/2,85,18,COLORS.magenta);
  drawNeonText('CREDITS: '+credits,W/2,120,22,COLORS.yellow);
  drawNeonText('Choose an Upgrade:',W/2,155,18,COLORS.white);
  const boxW=400,boxH=80,startY=180; selectedUpgrade=-1;
  for (let i=0;i<upgradeOptions.length;i++) {
    const opt=upgradeOptions[i], bx=W/2-boxW/2, by=startY+i*(boxH+14);
    const hover=mouseX>=bx&&mouseX<=bx+boxW&&mouseY>=by&&mouseY<=by+boxH;
    if (hover) selectedUpgrade=i;
    const canAfford = credits >= opt.cost;
    const col=opt.type==='evolve'?COLORS.magenta:opt.type==='repair'?COLORS.green:opt.type==='speed'?COLORS.cyan:opt.type==='slot'?COLORS.pink:COLORS.yellow;
    const dispCol = canAfford ? col : '#555555';
    ctx.strokeStyle=hover&&canAfford?'#ffffff':dispCol; ctx.lineWidth=hover&&canAfford?3:1;
    ctx.shadowColor=dispCol; ctx.shadowBlur=hover&&canAfford?15:5;
    ctx.fillStyle=hexAlpha(dispCol,hover&&canAfford?0.2:0.05); ctx.fillRect(bx,by,boxW,boxH); ctx.strokeRect(bx,by,boxW,boxH); ctx.shadowBlur=0;
    const label=opt.type==='evolve'?'EVOLVE':opt.type==='repair'?'REPAIR':opt.type==='speed'?'SPEED':opt.type==='slot'?'SLOT':'ARMOR';
    drawNeonText(label,W/2-80,by+28,16,dispCol);
    drawNeonText(opt.desc,W/2+20,by+28,11,canAfford?COLORS.white:'#666666');
    const costCol = canAfford ? COLORS.yellow : COLORS.red;
    drawNeonText(opt.cost+' cr',W/2+160,by+55,13,costCol);
    if (!canAfford) drawNeonText('INSUFFICIENT',W/2-60,by+55,10,COLORS.red);
    else if (hover) drawNeonText('[ CLICK TO BUY ]',W/2-60,by+55,10,'#ffffff');
  }
  if (mouseClicked && selectedUpgrade>=0 && credits>=upgradeOptions[selectedUpgrade].cost) applyUpgrade(selectedUpgrade);
  // Skip button - always available
  const skipY=startY+upgradeOptions.length*(boxH+14)+10;
  const skipW=160,skipH=36,skipX=W/2-skipW/2;
  const skipHover=mouseX>=skipX&&mouseX<=skipX+skipW&&mouseY>=skipY&&mouseY<=skipY+skipH;
  ctx.strokeStyle=skipHover?'#fff':'#666';ctx.lineWidth=skipHover?2:1;
  ctx.fillStyle=hexAlpha('#666666',skipHover?0.15:0.05);ctx.fillRect(skipX,skipY,skipW,skipH);ctx.strokeRect(skipX,skipY,skipW,skipH);
  drawNeonText('SKIP (save credits)',W/2,skipY+18,11,skipHover?COLORS.white:'#888888');
  if (mouseClicked&&skipHover) gameState='playing';
  drawNeonText('Score: '+score,W/2,H-30,14,COLORS.yellow);
}

// BOSS WARNING
function drawBossWarning() {
  drawBackground(); updateStars();
  ctx.fillStyle='rgba(0,0,0,0.6)'; ctx.fillRect(0,0,W,H);
  const flash=Math.sin(warningTimer*0.15)>0;
  if (flash){drawNeonText('WARNING',W/2,H/2-40,48,COLORS.red);drawNeonText('BOSS APPROACHING',W/2,H/2+20,28,COLORS.orange);}
  drawNeonText('LEVEL '+level,W/2,H/2+70,20,COLORS.yellow);
  warningTimer--; if(warningTimer<=0) gameState='playing';
}

// HUD - now shows credits
function drawHUD() {
  if (!player) return;
  drawNeonText('ARMOR',15,20,12,COLORS.cyan,'left');
  for (let i=0;i<player.maxArmor;i++){ctx.fillStyle=i<player.armor?COLORS.cyan:'#222';ctx.fillRect(15+i*14,28,10,10);ctx.strokeStyle=COLORS.cyan;ctx.lineWidth=1;ctx.strokeRect(15+i*14,28,10,10);}
  drawNeonText('SCORE: '+score,W-15,20,14,COLORS.yellow,'right');
  drawNeonText('HI: '+hiScore,W-15,40,10,COLORS.orange,'right');
  drawNeonText('CREDITS: '+credits,W-15,58,12,COLORS.yellow,'right');
  drawNeonText('LVL '+level,W/2,20,16,COLORS.cyan);
  if (!bossActive){drawNeonText('ENEMIES: '+enemiesKilled+'/'+enemiesNeeded,W/2,H-20,12,COLORS.red);}
  else if (boss) drawNeonText('BOSS',W/2,H-20,12,COLORS.red);
  drawNeonText('WEAPONS',15,H-60,10,COLORS.green,'left');
  for (let i=0;i<player.weapons.length;i++){const w=player.weapons[i];drawNeonText(w.name,15,H-45+i*14,10,w.color,'left');}
  // Music toggle hint
  drawNeonText('[M] Music '+(musicMuted?'OFF':'ON'),W-15,H-15,9,musicMuted?'#555':COLORS.cyan,'right');
}

// MENU
function drawMenu() {
  drawBackground(); updateStars();
  const t=Date.now()*0.001;
  drawNeonText('NEON VOID RUNNER',W/2,140,44,COLORS.cyan);
  drawNeonText('SCI-FI SIDE SCROLLER',W/2,190,16,COLORS.magenta);
  drawNeonText('\u266b ambient scifi bossa nova \u266b',W/2,220,12,'#888888');
  const demoShip=SHIP_DEFS[Math.floor(t)%3];
  drawShip(W/2+Math.sin(t*2)*30,310+Math.sin(t*1.5)*10,demoShip,demoShip.color,1.5);
  const btnW=200,btnH=50,btnX=W/2-btnW/2,btnY=400;
  const hover=mouseX>=btnX&&mouseX<=btnX+btnW&&mouseY>=btnY&&mouseY<=btnY+btnH;
  ctx.strokeStyle=hover?'#fff':COLORS.cyan;ctx.lineWidth=hover?3:2;ctx.shadowColor=COLORS.cyan;ctx.shadowBlur=hover?20:10;
  ctx.fillStyle=hexAlpha(COLORS.cyan,hover?0.2:0.05);ctx.fillRect(btnX,btnY,btnW,btnH);ctx.strokeRect(btnX,btnY,btnW,btnH);ctx.shadowBlur=0;
  drawNeonText('START GAME',W/2,btnY+25,20,COLORS.cyan);
  drawNeonText('High Score: '+hiScore,W/2,500,14,COLORS.orange);
  drawNeonText('Click anywhere to start music',W/2,535,11,'#666666');
  drawNeonText('[M] Toggle Music  |  WASD/Arrows to Move',W/2,560,10,'#555555');
  if (mouseClicked&&hover) gameState='shipSelect';
}

function drawShipSelect() {
  drawBackground(); updateStars();
  drawNeonText('SELECT YOUR SHIP',W/2,50,32,COLORS.cyan);
  const cardW=250,cardH=320,gap=30,startX=W/2-(cardW*1.5+gap);
  shipHoverIdx=-1;
  for (let i=0;i<3;i++) {
    const def=SHIP_DEFS[i], cx=startX+i*(cardW+gap)+cardW/2, cy=H/2+20;
    const bx=cx-cardW/2, by=cy-cardH/2;
    const hover=mouseX>=bx&&mouseX<=bx+cardW&&mouseY>=by&&mouseY<=by+cardH;
    if (hover) shipHoverIdx=i;
    ctx.strokeStyle=hover?'#fff':def.color; ctx.lineWidth=hover?3:1;
    ctx.shadowColor=def.color; ctx.shadowBlur=hover?20:8;
    ctx.fillStyle=hexAlpha(def.color,hover?0.15:0.05);
    ctx.fillRect(bx,by,cardW,cardH); ctx.strokeRect(bx,by,cardW,cardH); ctx.shadowBlur=0;
    drawShip(cx,cy-80,def,def.color,1.8);
    drawNeonText(def.name,cx,cy-10,22,def.color);
    drawNeonText(def.desc,cx,cy+20,11,COLORS.white);
    drawNeonText('Speed: '+def.speed,cx,cy+50,12,COLORS.cyan);
    drawNeonText('Armor: '+def.maxArmor,cx,cy+70,12,COLORS.orange);
    drawNeonText('Slots: '+def.weaponSlots,cx,cy+90,12,COLORS.green);
    if (hover) drawNeonText('[ CLICK TO SELECT ]',cx,cy+120,14,'#ffffff');
  }
  if (mouseClicked && shipHoverIdx>=0) {
    player=createPlayer(shipHoverIdx);
    level=1;score=0;credits=0;enemiesKilled=0;enemiesSpawned=0;enemiesNeeded=12;bossActive=false;boss=null;
    bullets=[];enemies=[];enemyBullets=[];pickups=[];particles=[];creditPopups=[];spawnTimer=0;transitionTimer=0;
    gameState='playing';
  }
}

function drawGameOver() {
  drawBackground(); updateStars();
  ctx.fillStyle='rgba(0,0,0,0.6)'; ctx.fillRect(0,0,W,H);
  drawNeonText('GAME OVER',W/2,H/2-80,48,COLORS.red);
  drawNeonText('Score: '+score,W/2,H/2-20,24,COLORS.yellow);
  drawNeonText('Credits Earned: '+credits,W/2,H/2+15,16,COLORS.yellow);
  drawNeonText('High Score: '+hiScore,W/2,H/2+45,18,COLORS.orange);
  drawNeonText('Level Reached: '+level,W/2,H/2+75,16,COLORS.cyan);
  const btnW=200,btnH=50,btnX=W/2-btnW/2,btnY=H/2+110;
  const hover=mouseX>=btnX&&mouseX<=btnX+btnW&&mouseY>=btnY&&mouseY<=btnY+btnH;
  ctx.strokeStyle=hover?'#fff':COLORS.cyan;ctx.lineWidth=hover?3:2;ctx.shadowColor=COLORS.cyan;ctx.shadowBlur=hover?20:10;
  ctx.fillStyle=hexAlpha(COLORS.cyan,hover?0.2:0.05);ctx.fillRect(btnX,btnY,btnW,btnH);ctx.strokeRect(btnX,btnY,btnW,btnH);ctx.shadowBlur=0;
  drawNeonText('RETRY',W/2,btnY+25,20,COLORS.cyan);
  if (mouseClicked&&hover) gameState='shipSelect';
}

// MAIN LOOP
initStars();
function gameLoop() {
  mouseClicked = _pendingClick;
  _pendingClick = false;
  frameCt++;
  ctx.save();
  if (screenShake>0){ctx.translate((Math.random()-0.5)*screenShake*2,(Math.random()-0.5)*screenShake*2);screenShake-=0.5;}
  switch(gameState) {
    case 'menu': drawMenu(); break;
    case 'shipSelect': drawShipSelect(); break;
    case 'playing':
      updateStars(); updatePlayer(); updateBullets(); updateEnemies(); updateEnemyBullets();
      updateBoss(); updatePickups(); updateParticles(); updateCreditPopups(); checkCollisions(); updateSpawning();
      drawBackground(); drawPickups(); drawBullets(); drawEnemyBullets();
      for (const e of enemies) drawEnemy(e); drawBoss();
      if (player) {
        if (player.invincible>0 && Math.floor(player.invincible/3)%2===0) {}
        else drawShip(player.x,player.y,SHIP_DEFS[player.shipIdx],player.color,1);
        if (player.shieldFlash>0) drawGlow(player.x,player.y,40,COLORS.white,0.3);
      }
      drawParticles(); drawCreditPopups(); drawHUD(); break;
    case 'upgradeScreen': drawUpgradeScreen(); break;
    case 'bossWarning': drawBossWarning(); break;
    case 'gameOver': drawGameOver(); break;
  }
  ctx.restore();
  requestAnimationFrame(gameLoop);
}
requestAnimationFrame(gameLoop);
