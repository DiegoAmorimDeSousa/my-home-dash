import { notifyBossDmg } from './boss.js';
import { getLocalKey, getLocalDone, removeLocalDone, isDoneForDisplay, isLocalDone, cleanOldLocalKeys, setLocalDone } from './localStorage.js';
import { renderGraph, updateProgressBars, updateStats, calcInsights } from './ui.js';

let isUpdating = false;
const URL_LOGS    = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSK1XbGFpL5g5BUK6Dz2S7nZVRzgs-6iaPKHq7hQ0M0i_59Z2ur3-GP95xxSJLomymamLHyLYomc_7m/pub?gid=495982494&single=true&output=csv";
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbxZDNq7MoIRgeBvzbaslBjpeMfY-Vm4gw5yTr8O1zgENE7zucykP7AFCJlE4Dg3RtVY/exec";

// Mapa de importância → dano e label
const IMPORTANCIA_MAP = {
    'alta':  { dano: 50, label: '⚔ 50 DMG', cls: 'alta' },
    'média': { dano: 25, label: '🗡 25 DMG', cls: 'media' },
    'media': { dano: 25, label: '🗡 25 DMG', cls: 'media' },
    'baixa': { dano: 10, label: '✦ 10 DMG', cls: 'baixa' },
};

function sendHeight() {
    const h = document.body.scrollHeight;
    window.parent.postMessage({height:h, id:'frame-tarefas'},'*');
}

// ─── MARK DONE ───────────────────────────────────────────────────────────
async function markDone(el, task, owner, dano) {
    setLocalDone(owner, task);
    isUpdating = true;

    const item = el.closest('.task-item');
    el.checked = true; el.disabled = true;
    item.classList.add('done','pending-sync');

    // Mostra dano causado ao boss
    const dmgEl = document.createElement('span');
    dmgEl.className = 'sync-label';
    dmgEl.innerText = `⚔ -${dano} HP no boss · sincronizando...`;
    item.querySelector('.task-info').appendChild(dmgEl);

    notifyBossDmg(dano);

    // Envia para a planilha
    try {
        await fetch(`${WEB_APP_URL}?task=${encodeURIComponent(task)}&owner=${owner}&bossName=SCIZOR&damage=${dano}`, { mode:'no-cors' });
    } catch(e) { 
        console.error(e); 
    }

    setTimeout(()=>{ isUpdating=false; loadTasks(); }, 8000);
}

window.markDone = markDone;

export async function loadTasks() {
    if (isUpdating) return;
    cleanOldLocalKeys();
    try {
        const resp = await fetch(`${URL_LOGS}&t=${Date.now()}`);
        const text = await resp.text();
        // CSV pode ter mais colunas; split por vírgula simples pode quebrar em valores com vírgula
        // Usamos lógica mais robusta
        const lines = text.split('\n').slice(1);
        const rows = lines.map(l => {
        const parts = l.split(',');
            return parts; // Data, Dono, Tarefa, Horário, Status
        });

        const now      = new Date();
        const todayStr = now.toLocaleDateString('pt-BR');
        const umDia    = 24*60*60*1000;
        const seteDias = new Date(now - 7*umDia);

        let hD='', hB='';
        let counts = {
            dH:0,dT:0,bH:0,bT:0,ds:0,dm:0,bs:0,bm:0,
            df:{},bf:{},
            historyDiego:{},historyBia:{},
            allTasksDiego:{},allTasksBia:{},
            todayTasksDiego:[],todayTasksBia:[],
        };

        // Mapa de importância das tarefas (vem do CSV na coluna D se existir)
        const importanciaCache = {};

        rows.forEach(cols => {
        if (cols.length < 4) return;
        const dataRaw  = (cols[0]||'').trim();
        const dono     = (cols[1]||'').trim();
        const nome     = (cols[2]||'').trim();
        const hora     = (cols[3]||'').trim();
        const status   = (cols[4]||'').trim().toUpperCase();
        const impRaw   = (cols[5]||'').trim(); // Coluna F pode ter importância no log

        if (!nome || !dono) return;

        if (status==='OK') removeLocalDone(dono, nome);

        const isDone      = isDoneForDisplay(dono, nome, status);
        const isPending   = isLocalDone(dono, nome) && status!=='OK';
        const apenasData  = dataRaw.split(' ')[0];
        const parts       = apenasData.split('/');
        if (parts.length<3) return;

        const taskDate = new Date(parseInt(parts[2]), parseInt(parts[1])-1, parseInt(parts[0]));
        if (isNaN(taskDate.getTime())) return;

        const chave = apenasData;

        if (dono==='Diego') {
            if (!counts.allTasksDiego[nome]) counts.allTasksDiego[nome]={};
            counts.allTasksDiego[nome][chave]=isDone;
        } else if (dono==='Beatriz') {
            if (!counts.allTasksBia[nome]) counts.allTasksBia[nome]={};
            counts.allTasksBia[nome][chave]=isDone;
        }

        if (isDone) {
            if (taskDate.getMonth()===now.getMonth()&&taskDate.getFullYear()===now.getFullYear()){
                if(dono==='Diego') counts.dm++; else if(dono==='Beatriz') counts.bm++;
            }
            if (taskDate>=seteDias&&taskDate<=now){
                if(dono==='Diego') counts.ds++; else if(dono==='Beatriz') counts.bs++;
            }
            if(dono==='Diego'){ counts.historyDiego[chave]=(counts.historyDiego[chave]||0)+1; counts.df[nome]=(counts.df[nome]||0)+1; }
            else if(dono==='Beatriz'){ counts.historyBia[chave]=(counts.historyBia[chave]||0)+1; counts.bf[nome]=(counts.bf[nome]||0)+1; }
        }

        if (apenasData===todayStr) {
            // Determina importância
            let imp = 'baixa';
            if (impRaw) imp = parseImportancia(impRaw);
            else if (importanciaCache[`${dono}::${nome}`]) imp = importanciaCache[`${dono}::${nome}`];

            const dmgInfo = IMPORTANCIA_MAP[imp] || IMPORTANCIA_MAP['baixa'];
            const isBia   = dono === 'Beatriz';

            const syncHtml = isPending
            ? `<span class="sync-label">⏳ Sincronizando...</span>`
            : '';

            const html = `
            <div class="task-item ${isDone?'done':''} ${isBia?'bia-task':''} ${isPending?'pending-sync':''}" data-task="${nome}" data-owner="${dono}" data-dano="${dmgInfo.dano}">
                <div class="task-info">
                <span class="task-name">${nome}</span>
                <div class="task-meta">
                    <span class="task-time">${hora}</span>
                    <span class="task-dmg ${dmgInfo.cls}">${dmgInfo.label}</span>
                </div>
                ${syncHtml}
                </div>
                <input type="checkbox" class="checkbox"
                ${isDone?'checked':''}
                ${isDone&&!isPending?'disabled':''}
                onclick="markDone(this,'${nome}','${dono}',${dmgInfo.dano})">
            </div>`;

            if(dono==='Diego'){
            hD+=html; counts.dT++;
            if(isDone) counts.dH++;
            if(!counts.todayTasksDiego.includes(nome)) counts.todayTasksDiego.push(nome);
            } else if(dono==='Beatriz'){
            hB+=html; counts.bT++;
            if(isDone) counts.bH++;
            if(!counts.todayTasksBia.includes(nome)) counts.todayTasksBia.push(nome);
            }
        }
        });

        document.getElementById('list-diego').innerHTML = hD||'<span style="font-size:0.75rem;color:var(--dim)">Sem tarefas</span>';
        document.getElementById('list-bia').innerHTML   = hB||'<span style="font-size:0.75rem;color:var(--dim)">Sem tarefas</span>';

        updateProgressBars(counts);
        updateStats(counts);
        renderGraph('graph-diego', counts.historyDiego);
        renderGraph('graph-bia',   counts.historyBia);
        calcInsights(counts.allTasksDiego, counts.todayTasksDiego, 'd');
        calcInsights(counts.allTasksBia,   counts.todayTasksBia,   'b');

        setTimeout(sendHeight, 300);
    } catch(e) { 
        console.error(e); 
    }
}
