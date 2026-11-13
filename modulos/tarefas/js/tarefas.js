// Checklist diário de tarefas (Diego / Beatriz). Concluir tarefa causa dano no
// boss (ver boss.js). Tudo fica no localStorage — ver store.js.
import { iniciarFrame, isCompact } from '../../../shared/frame.js';
import { notifyBossChanged, notifyTasksChanged } from './avisos.js';
import {
    getOwners, getTasks, addTask, removeTask,
    isTaskDone, setTaskDone, dmgInfoFor, DANO_PRESETS,
    applyDamageToBoss, healBoss, processRollover, computeStats, computeTaskStats,
    countDay, shiftDay, todayStr,
} from './store.js';
import { updateProgressBars, updateStats, renderInsights, renderTaskMetrics } from './ui.js';

const { avisarAltura } = iniciarFrame('frame-tarefas');
function sendHeight() {
    avisarAltura(document.body.scrollHeight);
}

const OWNER_META = {
    Diego:    { listId: 'list-diego' },
    Beatriz:  { listId: 'list-bia'   },
};

// ─── DIA SELECIONADO (navegação pra marcar/desmarcar dias anteriores) ───────
// null = "seguir o dia de hoje" (assim, se o painel ficar aberto na virada da
// meia-noite, ele passa pro dia novo sozinho).
let diaEscolhido = null;
function diaAtual() { return isCompact ? todayStr() : (diaEscolhido || todayStr()); }
function fmtDia(d) { const [y, m, dd] = d.split('-'); return `${dd}/${m}`; }

window.mudarDia = function (delta) {
    const novo = shiftDay(diaAtual(), delta);
    if (novo > todayStr()) return; // não existe "amanhã"
    diaEscolhido = novo === todayStr() ? null : novo;
    renderAll();
};
window.irParaHoje = function () { diaEscolhido = null; renderAll(); };
window.irParaDia = function (valor) {
    if (!valor) return;
    if (valor > todayStr()) valor = todayStr();
    diaEscolhido = valor === todayStr() ? null : valor;
    renderAll();
};

// ─── RENDER DE UMA TAREFA ───────────────────────────────────────────────────
function taskItemHtml(owner, task) {
    const isDone   = isTaskDone(owner, task.id, diaAtual());
    const dmgInfo  = dmgInfoFor(task.dano);
    const horaHtml = task.hora ? `<span class="task-time">${task.hora}</span>` : '';
    const sharedHtml = (task.donos && task.donos.length > 1)
        ? `<span class="task-shared" title="Tarefa compartilhada">👥</span>` : '';

    return `
    <div class="task-item ${isDone ? 'done' : ''} dmg-${dmgInfo.cls}" data-task-id="${task.id}" data-owner="${owner}">
        <div class="task-info">
        <span class="task-name">${sharedHtml}${task.nome}</span>
        <div class="task-meta">
            ${horaHtml}
            <span class="task-dmg ${dmgInfo.cls}">${dmgInfo.label}</span>
        </div>
        </div>
        <div class="task-actions">
            <input type="checkbox" class="checkbox"
                ${isDone ? 'checked' : ''}
                onclick="toggleDone(this,'${owner}','${task.id}')">
            <button class="task-del-btn" title="Excluir tarefa" onclick="deleteTask('${task.id}')">🗑</button>
        </div>
    </div>`;
}

// ─── MARCAR / DESMARCAR (100% local, instantâneo) ───────────────────────────
// Marcar causa dano no boss; desmarcar devolve esse dano (sempre o valor da
// tarefa, em qualquer dia). Em dia passado isso NÃO desfaz a recarga que o boss
// já teve quando aquele dia virou em branco — esquecer de marcar continua
// custando essa recarga, mas o registro (sequências, métricas) fica correto.
async function toggleDone(el, owner, taskId) {
    const task = getTasks(owner).find(t => t.id === taskId);
    if (!task) return;
    const dmgInfo = dmgInfoFor(task.dano);
    const marcando = el.checked;

    setTaskDone(owner, taskId, marcando, diaAtual());

    const item = el.closest('.task-item');
    item.classList.toggle('done', marcando);

    const dmgEl = document.createElement('span');
    dmgEl.className = 'sync-label';
    dmgEl.innerText = marcando ? `⚔ -${dmgInfo.dano} HP no boss` : `♥ +${dmgInfo.dano} HP no boss`;
    item.querySelector('.task-info').appendChild(dmgEl);
    setTimeout(() => dmgEl.remove(), 2500);

    if (marcando) await applyDamageToBoss(dmgInfo.dano);
    else await healBoss(dmgInfo.dano);
    notifyBossChanged(); // ping instantâneo pro card/modal do boss redesenhar

    renderAll();
}
window.toggleDone = toggleDone;

// ─── CRIAR / EXCLUIR TAREFA (formulário único, dono(s) selecionável) ────────
function populateDanoSelect() {
    const sel = document.getElementById('novo-dano');
    if (!sel || sel.dataset.filled) return;
    sel.innerHTML = DANO_PRESETS.map(p => `<option value="${p.dano}">${p.nome} · ${p.dano} DMG</option>`).join('')
        + `<option value="custom">Personalizado…</option>`;
    sel.value = '55';
    sel.dataset.filled = '1';
}

function onDanoSelectChange() {
    const sel = document.getElementById('novo-dano');
    const customEl = document.getElementById('novo-dano-custom');
    const isCustom = sel.value === 'custom';
    customEl.style.display = isCustom ? 'block' : 'none';
    if (isCustom) customEl.focus();
}
window.onDanoSelectChange = onDanoSelectChange;

function addTaskUI() {
    const nomeEl   = document.getElementById('novo-nome');
    const horaEl   = document.getElementById('novo-hora');
    const danoSel  = document.getElementById('novo-dano');
    const danoCustomEl = document.getElementById('novo-dano-custom');
    const chkDiego = document.getElementById('novo-dono-diego');
    const chkBia   = document.getElementById('novo-dono-bia');

    const nome = (nomeEl.value || '').trim();
    if (!nome) { nomeEl.focus(); return; }

    const owners = [];
    if (chkDiego.checked) owners.push('Diego');
    if (chkBia.checked)   owners.push('Beatriz');
    if (!owners.length) { alert('Escolha pelo menos uma pessoa pra essa tarefa.'); return; }

    let dano = danoSel.value === 'custom' ? parseInt(danoCustomEl.value, 10) : parseInt(danoSel.value, 10);
    if (!dano || dano < 1) dano = 30;
    dano = Math.min(dano, 999);

    addTask(owners, { nome, hora: horaEl.value, dano });
    notifyTasksChanged(); // avisa outras instâncias abertas (ex: card compacto, se isso rodou no modal)

    nomeEl.value = ''; horaEl.value = ''; danoCustomEl.value = '';
    toggleAddForm(false);
    renderAll();
}
window.addTaskUI = addTaskUI;

function deleteTask(taskId) {
    const todas = [...getTasks('Diego'), ...getTasks('Beatriz')];
    const task = todas.find(t => t.id === taskId);
    const msg = (task && task.donos && task.donos.length > 1)
        ? 'Essa tarefa é compartilhada entre Diego e Beatriz — excluir vai remover dos dois. Confirmar?'
        : 'Excluir essa tarefa? Isso não apaga o histórico já registrado.';
    if (!confirm(msg)) return;
    removeTask(taskId);
    notifyTasksChanged();
    renderAll();
}
window.deleteTask = deleteTask;

function toggleAddForm(show) {
    const form = document.getElementById('add-form');
    if (!form) return;
    const willShow = show !== undefined ? show : form.style.display === 'none';
    populateDanoSelect();
    form.style.display = willShow ? 'flex' : 'none';
    if (willShow) document.getElementById('novo-nome').focus();
}
window.toggleAddForm = toggleAddForm;

// ─── RENDER GERAL ────────────────────────────────────────────────────────────
export function renderAll() {
    const owners = getOwners();
    const dia = diaAtual();
    const ehHoje = dia === todayStr();
    const counts = { dH: 0, dT: 0, bH: 0, bT: 0,
        rotulo: ehHoje ? 'hoje' : `em ${fmtDia(dia)}`, rotuloCurto: ehHoje ? 'Hoje' : fmtDia(dia) };

    owners.forEach(owner => {
        const meta = OWNER_META[owner];
        if (!meta) return;
        const tasks = getTasks(owner);
        const html = tasks.map(t => taskItemHtml(owner, t)).join('') ||
            '<span style="font-size:0.75rem;color:var(--dim)">Sem tarefas cadastradas</span>';
        document.getElementById(meta.listId).innerHTML = html;

        const stats = computeStats(owner);
        const diaCount = countDay(owner, dia);
        if (owner === 'Diego') { counts.dH = diaCount.feitas; counts.dT = diaCount.total; }
        if (owner === 'Beatriz') { counts.bH = diaCount.feitas; counts.bT = diaCount.total; }

        renderInsights(owner, stats);
        renderTaskMetrics(owner, computeTaskStats(owner, 30));
    });

    updateProgressBars(counts);
    updateStats(counts);

    const dInput = document.getElementById('dia-input');
    if (dInput) { dInput.value = dia; dInput.max = todayStr(); }
    const next = document.getElementById('day-next');
    if (next) next.disabled = ehHoje;
    const info = document.getElementById('day-info');
    if (info) info.innerText = ehHoje ? '' :
        `Editando ${fmtDia(dia)} — marcar/desmarcar ajusta a vida do boss como se fosse no dia.`;

    setTimeout(sendHeight, 60);
}
window.loadTasks = renderAll;

// Outra instância de tarefas.html (card compacto ou modal) criou/excluiu
// uma tarefa → redesenha aqui também, sem precisar de F5.
window.addEventListener('message', (e) => {
    if (e.data?.action === 'tasksChanged') renderAll();
});

// ─── INIT ────────────────────────────────────────────────────────────────────
async function init() {
    await processRollover();
    renderAll();
}

init();

// Re-checa periodicamente a virada de dia — útil se o painel ficar aberto
// passando da meia-noite (ex: tablet fixo em casa).
setInterval(init, 60000);
