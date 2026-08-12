export function updateProgressBars(c) {
    const pD = c.dT ? Math.round((c.dH / c.dT) * 100) : 0;
    const pB = c.bT ? Math.round((c.bH / c.bT) * 100) : 0;
    document.getElementById('pct-diego').innerText = pD + '%';
    document.getElementById('bar-diego').style.width = pD + '%';
    document.getElementById('sub-diego').innerText = `${c.dH} de ${c.dT} tarefas concluídas hoje`;
    document.getElementById('pct-bia').innerText = pB + '%';
    document.getElementById('bar-bia').style.width = pB + '%';
    document.getElementById('sub-bia').innerText = `${c.bH} de ${c.bT} tarefas concluídas hoje`;
}

// c aqui é só o resumo do dia (dH/dT/bH/bT) — semana/mês/top vêm de renderInsights
export function updateStats(c) {
    document.getElementById('d-hoje').innerText = `${c.dH}/${c.dT}`;
    document.getElementById('b-hoje').innerText = `${c.bH}/${c.bT}`;
}

const OWNER_PREFIX = { Diego: 'd', Beatriz: 'b' };

export function renderInsights(owner, stats) {
    const p = OWNER_PREFIX[owner];
    if (!p) return;

    const semanaEl = document.getElementById(`${p}-sem`);
    const mesEl    = document.getElementById(`${p}-mes`);
    const topEl    = document.getElementById(`${p}-top`);
    if (semanaEl) semanaEl.innerText = stats.semana;
    if (mesEl)    mesEl.innerText    = stats.mes;
    if (topEl)    topEl.innerText    = stats.topTask ? stats.topTask.nome : '-';

    const setRow = (suffix, nome, val) => {
        const nameEl = document.getElementById(`${p}-${suffix}-name`);
        const valEl  = document.getElementById(`${p}-${suffix}-val`);
        if (nameEl) nameEl.innerText = nome;
        if (valEl)  valEl.innerText  = val;
    };

    setRow('streak', stats.streakAtivo > 0 ? 'Dias seguidos completando tarefas' : 'Sem sequência ativa', stats.streakAtivo > 0 ? `${stats.streakAtivo}d` : '-');
    setRow('proc', stats.streakZerado > 0 ? 'Dias seguidos sem completar nada' : 'Nenhum dia zerado', stats.streakZerado > 0 ? `${stats.streakZerado}d` : '-');
    setRow('never', stats.negligenciada ? stats.negligenciada.nome : 'Nenhuma', stats.negligenciada ? `${stats.negligenciada.dias}d parada` : '-');
    setRow('record', stats.topTask ? stats.topTask.nome : '—', stats.topTask ? `${stats.topTask.count}x` : '0x');

    renderGraph(`graph-${owner === 'Diego' ? 'diego' : 'bia'}`, stats.historicoMapa);
}

export function renderGraph(id, dataMapa) {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = '';
    const hoje = new Date();
    for (let i = 29; i >= 0; i--) {
        const d = new Date(hoje);
        d.setDate(d.getDate() - i);
        const chave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const n = dataMapa[chave] || 0;
        const c = document.createElement('div');
        c.className = 'graph-cube';
        c.setAttribute('data-info', `${chave.split('-').reverse().join('/')}: ${n} concluída(s)`);
        if (n > 0 && n <= 2) c.classList.add('level-1');
        else if (n > 2 && n <= 4) c.classList.add('level-2');
        else if (n > 4 && n <= 6) c.classList.add('level-3');
        else if (n > 6) c.classList.add('level-4');
        el.appendChild(c);
    }
}
