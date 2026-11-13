// Batalha contra o boss (Pokémon). A vida do boss cai quando tarefas são
// concluídas (tarefas.js grava no localStorage e manda um "ping" via painel).
import { iniciarFrame, isCompact } from '../../../shared/frame.js';
import { ensureBoss, avancarProximoBoss, getTrofeus } from './store.js';

const { avisarAltura } = iniciarFrame('frame-rpg');

const TYPE_COLORS = {
  fire:'#ff6b35',water:'#4fc3f7',grass:'#66bb6a',electric:'#ffee58',
  ice:'#80deea',fighting:'#ef5350',poison:'#ab47bc',ground:'#d4a574',
  flying:'#90caf9',psychic:'#f48fb1',bug:'#aed581',rock:'#bcaaa4',
  ghost:'#7e57c2',dragon:'#5c6bc0',dark:'#6a6a7a',steel:'#b0bec5',
  fairy:'#f8bbd9',normal:'#9e9e9e',
};

let state = { vidaAtual:0, vidaMaxima:0, lastVida:null, bossName:'', bossIdAtual:null, isDead:false };

const hpFill      = document.getElementById('hpFill');
const hpPending   = document.getElementById('hpPending');
const hpCurrent   = document.getElementById('hpCurrent');
const hpMax       = document.getElementById('hpMax');
const bossSprite  = document.getElementById('bossSprite');
const bossAura    = document.getElementById('bossAura');
const bossName    = document.getElementById('bossName');
const roomName    = document.getElementById('roomName');
const typeBadges  = document.getElementById('typeBadges');
const infoRow     = document.getElementById('infoRow');
const screenFlash = document.getElementById('screenFlash');
const deadScreen  = document.getElementById('deadScreen');
const deadText    = document.getElementById('deadText');
const loading     = document.getElementById('loading');

function triggerHit(dano, isCrit) {
  screenFlash.classList.remove('active'); void screenFlash.offsetWidth; screenFlash.classList.add('active');
  bossSprite.classList.remove('hit','dead'); void bossSprite.offsetWidth; bossSprite.classList.add('hit');
  setTimeout(()=>bossSprite.classList.remove('hit'),520);
  spawnDmgNumber(dano, isCrit);
  spawnParticles(isCrit?10:6);
  bossAura.style.animationDuration='0.4s';
  setTimeout(()=>bossAura.style.animationDuration='2.2s',600);
}

function triggerDeath() {
  bossSprite.classList.add('dead');
  document.getElementById('bossShadow').style.opacity='0';
  bossAura.style.opacity='0';
  let n=0; const iv=setInterval(()=>{
    screenFlash.classList.remove('active'); void screenFlash.offsetWidth; screenFlash.classList.add('active');
    if(++n>=3) clearInterval(iv);
  },160);
  setTimeout(async () => {
    deadScreen.classList.add('active');
    deadText.innerText = state.bossName + '\nDERROTADO!';

    // Sobe o troféu e sorteia o próximo boss — tudo local.
    await avancarProximoBoss();

    setTimeout(() => {
      state.isDead = false;
      deadScreen.classList.remove('active');
      loading.classList.remove('hidden');
      render(false);
    }, 2200);
  }, 750);
}

function spawnDmgNumber(dano, isCrit) {
  const rect=bossSprite.getBoundingClientRect();
  const cx=rect.left+rect.width/2, cy=rect.top+rect.height/3;
  const el=document.createElement('div');
  el.className='dmg-number'+(isCrit?' crit':'');
  el.innerText=(isCrit?'★ ':'–')+dano+' HP';
  el.style.left=(cx-40+(Math.random()*24-12))+'px';
  el.style.top=(cy+(Math.random()*14-7))+'px';
  document.body.appendChild(el);
  setTimeout(()=>el.remove(),1200);
}

function spawnParticles(qty) {
  const rect=bossSprite.getBoundingClientRect();
  const cx=rect.left+rect.width/2, cy=rect.top+rect.height/2;
  for(let i=0;i<qty;i++){
    const p=document.createElement('div'); p.className='dmg-particle';
    const angle=Math.random()*Math.PI*2, dist=20+Math.random()*55, dur=0.3+Math.random()*0.4;
    p.style.setProperty('--tx',Math.cos(angle)*dist+'px');
    p.style.setProperty('--ty',Math.sin(angle)*dist+'px');
    p.style.setProperty('--dur',dur+'s');
    p.style.background=Math.random()>0.5?'#ff4444':'#ffaa00';
    p.style.left=(cx+Math.random()*14-7)+'px'; p.style.top=(cy+Math.random()*14-7)+'px';
    document.body.appendChild(p); setTimeout(()=>p.remove(),dur*1000+100);
  }
}

function updateHP(vidaAtual, vidaMaxima, animate=false) {
  const pct=Math.max(0,(vidaAtual/vidaMaxima)*100);
  const prev=state.lastVida!==null?Math.max(0,(state.lastVida/vidaMaxima)*100):pct;
  if(animate&&state.lastVida!==null&&state.lastVida>vidaAtual){
    const dano=state.lastVida-vidaAtual;
    hpPending.style.width=(prev-pct)+'%'; hpPending.style.right=pct+'%'; hpFill.style.width=pct+'%';
    setTimeout(()=>{hpPending.style.width='0%';},900);
    triggerHit(dano,dano>=50);
  } else { hpFill.style.width=pct+'%'; hpPending.style.width='0%'; }

  if(pct<=20){ hpFill.style.background='linear-gradient(90deg,#998800,#ffdd00)'; hpFill.style.boxShadow='0 0 7px rgba(255,220,0,0.7)'; bossAura.style.background='radial-gradient(circle,rgba(255,200,0,0.2) 0%,transparent 70%)'; }
  else if(pct<=50){ hpFill.style.background='linear-gradient(90deg,#a85000,#ff8c00)'; hpFill.style.boxShadow='0 0 7px rgba(255,140,0,0.6)'; bossAura.style.background='radial-gradient(circle,rgba(255,100,0,0.18) 0%,transparent 70%)'; }
  else { hpFill.style.background='linear-gradient(90deg,#cc1111,#ff4444)'; hpFill.style.boxShadow='0 0 7px rgba(255,50,50,0.6)'; bossAura.style.background='radial-gradient(circle,rgba(200,0,0,0.18) 0%,transparent 70%)'; }

  hpCurrent.innerText=vidaAtual; hpMax.innerText=`/ ${vidaMaxima} HP`; state.lastVida=vidaAtual;
}

function renderTypes(tipos) {
  typeBadges.innerHTML='';
  tipos.forEach(t=>{
    const b=document.createElement('span'); b.className='type-badge'; b.innerText=t.toUpperCase();
    const cor=TYPE_COLORS[t.toLowerCase()]||'#9e9e9e';
    b.style.background=cor+'22'; b.style.color=cor; b.style.border=`1px solid ${cor}44`;
    typeBadges.appendChild(b);
  });
}

function renderInfo(boss) {
  infoRow.innerHTML=`
    <div class="info-chip">ALT <span>${(boss.altura/10).toFixed(1)}m</span></div>
    <div class="info-chip">· PESO <span>${(boss.peso/10).toFixed(1)}kg</span></div>
    <div class="info-chip">· SALA <span>#${boss.salaId}</span></div>`;
}

function notifyParent() {
  if(window.parent&&window.parent!==window){
    // No compacto a altura é a da arena (card pequeno, altura fixa).
    // No expandido precisa ser a página inteira, senão a sala de troféus
    // fica cortada no modal.
    const h = isCompact
      ? document.querySelector('.arena').getBoundingClientRect().height
      : document.body.scrollHeight;
    avisarAltura(h);
  }
}

function renderTrofeus() {
  const grid = document.getElementById('trophyGrid');
  if (!grid || isCompact) return;
  const trofeus = getTrofeus();
  if (!trofeus.length) {
    grid.innerHTML = '<div class="trophy-vazio">Nenhum boss derrotado ainda. Conclua tarefas pra causar dano!</div>';
    return;
  }
  grid.innerHTML = trofeus.map(t => `
    <div class="trophy-card">
      ${t.sprite ? `<img src="${t.sprite}" alt="${t.nome}">` : ''}
      <div class="trophy-nome">${t.nome}</div>
      <div class="trophy-meta">SALA #${t.salaId}</div>
      <div class="trophy-meta">${(t.derrotadoEm || '').split('-').reverse().join('/')}</div>
    </div>`).join('');
}

async function render(animate) {
  const boss = await ensureBoss();

  if (boss.pokemonId !== state.bossIdAtual) {
    // Boss novo na tela — reseta o visual, sem animação de dano na virada.
    state.bossIdAtual = boss.pokemonId;
    state.bossName = boss.nome;
    bossName.innerText = boss.nome;
    roomName.innerText = `SALA ${boss.salaId} · ${(boss.salaNome||'').toUpperCase()}`;
    bossSprite.classList.remove('dead','hit');
    bossSprite.style.opacity='1'; bossSprite.style.transform=''; bossSprite.style.filter='';
    document.getElementById('bossShadow').style.opacity='1';
    bossAura.style.opacity='1';
    bossSprite.src = boss.sprite;
    renderTypes(boss.tipos||[]);
    renderInfo(boss);
    state.lastVida = null;
    animate = false;
  }

  updateHP(boss.vidaAtual, boss.vidaMaxima, animate);
  if (boss.vidaAtual <= 0 && !state.isDead) { state.isDead = true; triggerDeath(); }
  loading.classList.add('hidden');
  renderTrofeus();
  notifyParent();
}

window.addEventListener('load', notifyParent);
window.addEventListener('resize', notifyParent);

// Ping instantâneo vindo do módulo de tarefas (mesma origem, sem rede).
window.addEventListener('message', e => {
  if (e.data?.action === 'bossStateChanged' && !state.isDead) render(true);
});

// Rede de segurança local (sem chamada externa) — cobre qualquer caso em
// que o ping não chegue (ex: iframe recém-aberto no modal).
setInterval(() => { if (!state.isDead) render(true); }, 4000);

render(false);
