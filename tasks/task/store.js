// ─────────────────────────────────────────────────────────────────────────
// STORE — fonte única de verdade, 100% local (localStorage).
// Nenhuma tarefa, log de conclusão, boss ou troféu depende de rede.
// A única chamada externa que resta é a PokeAPI, e só acontece quando um
// boss NOVO nasce (não a cada dano/re-render).
//
// IMPORTANTE: este módulo é carregado de forma independente em cada iframe
// (Tarefas e Boss são páginas separadas). Por isso NENHUMA função guarda o
// estado em memória entre chamadas — toda função lê o localStorage fresco
// na hora e grava de volta na hora. Isso garante que o que um iframe salva
// o outro enxerga imediatamente na próxima leitura, sem precisar de F5.
// ─────────────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'myhomedash_tarefas_v1';

// ─── NÍVEIS DE DANO (pré-definidos, mas dá pra usar qualquer número) ───────
export const DANO_PRESETS = [
    { dano: 15,  nome: 'Trivial',   cls: 'trivial' },
    { dano: 30,  nome: 'Baixa',     cls: 'baixa'   },
    { dano: 55,  nome: 'Média',     cls: 'media'   },
    { dano: 80,  nome: 'Alta',      cls: 'alta'    },
    { dano: 120, nome: 'Muito Alta',cls: 'muitoalta' },
    { dano: 180, nome: 'Épica',     cls: 'epica'   },
];

const ICON_POR_TIER = { trivial:'·', baixa:'✦', media:'🗡', alta:'⚔', muitoalta:'☠', epica:'💀' };

export function tierFor(dano) {
    if (dano >= 160) return 'epica';
    if (dano >= 100) return 'muitoalta';
    if (dano >= 70)  return 'alta';
    if (dano >= 42)  return 'media';
    if (dano >= 20)  return 'baixa';
    return 'trivial';
}

export function dmgInfoFor(dano) {
    const d = Number(dano) || 30;
    const cls = tierFor(d);
    return { dano: d, cls, label: `${ICON_POR_TIER[cls]} ${d} DMG` };
}

// ─── HELPERS DE DATA (yyyy-mm-dd local, sem fuso) ─────────────────────────
export function todayStr() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function dateStrOffset(baseStr, days) {
    const [y, m, d] = baseStr.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    dt.setDate(dt.getDate() + days);
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}
function diasEntre(a, b) {
    const da = new Date(a + 'T00:00:00');
    const db = new Date(b + 'T00:00:00');
    return Math.round((db - da) / 86400000);
}

// ─── ESTADO / PERSISTÊNCIA (sempre lê/grava na hora, nunca cacheia) ────────
function defaultState() {
    return {
        version: 2,
        owners: ['Diego', 'Beatriz'],
        tasks: { Diego: [], Beatriz: [] },
        log: {},                                    // log[data][dono] = { [taskId]: true }
        boss: { current: null, trofeus: [], spawning: 0 },
        lastRolloverDate: todayStr(),
    };
}

function load() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return defaultState();
        const parsed = JSON.parse(raw);
        const base = defaultState();
        return {
            ...base,
            ...parsed,
            tasks: { ...base.tasks, ...(parsed.tasks || {}) },
            boss:  { ...base.boss,  ...(parsed.boss  || {}) },
        };
    } catch (e) {
        console.error('Dados locais corrompidos, reiniciando storage.', e);
        return defaultState();
    }
}

function save(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return state;
}

function uid() {
    return 't_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// ─── TAREFAS (CRUD) ─────────────────────────────────────────────────────────
export function getOwners() {
    return [...load().owners];
}

export function getTasks(owner) {
    const state = load();
    return [...(state.tasks[owner] || [])];
}

// owners: array com 1 ou 2 nomes — cria a MESMA tarefa (mesmo id) em cada
// lista escolhida, marcada como "compartilhada" se for mais de uma pessoa.
// Cada pessoa continua concluindo (e batendo no boss) de forma independente.
export function addTask(owners, { nome, hora, dano }) {
    const state = load();
    const alvos = (owners || []).filter(o => state.tasks[o]);
    if (!alvos.length) return null;

    const id = uid();
    const task = {
        id,
        nome: (nome || '').trim(),
        hora: (hora || '').trim(),
        dano: Number(dano) || 30,
        donos: alvos,
    };
    alvos.forEach(o => { state.tasks[o].push({ ...task }); });
    save(state);
    return task;
}

// Remove a tarefa pelo id em TODAS as listas onde ela aparece (se for
// compartilhada, sai dos dois de uma vez — é a mesma tarefa).
export function removeTask(taskId) {
    const state = load();
    state.owners.forEach(o => {
        state.tasks[o] = (state.tasks[o] || []).filter(t => t.id !== taskId);
    });
    save(state);
}

// ─── LOG DE CONCLUSÃO (por dia, por pessoa) ─────────────────────────────────
export function isTaskDoneToday(owner, taskId) {
    const state = load();
    const dia = state.log[todayStr()];
    return !!(dia && dia[owner] && dia[owner][taskId]);
}

export function setTaskDone(owner, taskId, done) {
    const state = load();
    const dia = todayStr();
    if (!state.log[dia]) state.log[dia] = {};
    if (!state.log[dia][owner]) state.log[dia][owner] = {};
    if (done) state.log[dia][owner][taskId] = true;
    else delete state.log[dia][owner][taskId];
    save(state);
}

// ─── BOSS ───────────────────────────────────────────────────────────────────
function totalDanoPossivelDoDia(state) {
    let total = 0;
    state.owners.forEach(o => {
        (state.tasks[o] || []).forEach(t => { total += Number(t.dano) || 30; });
    });
    return total || 100;
}

function randomBossHp(totalDano) {
    const piso = 800 + Math.random() * 400;     // 800–1200 de base, sempre
    const escalaComTarefas = totalDano * (0.8 + Math.random() * 0.6); // cresce mais se vocês cadastrarem mais tarefas
    return Math.round(piso + escalaComTarefas);
}

function randomPokemonId() {
    // Gerações 1–8 (id 1–898): faixa com sprite garantido na PokeAPI
    return 1 + Math.floor(Math.random() * 898);
}

async function fetchPokemonFlavor(id) {
    const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
    if (!res.ok) throw new Error('pokeapi falhou');
    const poke = await res.json();
    const sprite =
        poke.sprites?.versions?.['generation-v']?.['black-white']?.animated?.front_default ||
        poke.sprites?.front_default || '';
    return {
        nome: poke.name.toUpperCase(),
        sprite,
        tipos: poke.types.map(t => t.type.name),
        altura: poke.height,
        peso: poke.weight,
    };
}

const NOMES_SALA = [
    'Torre da Procrastinação', 'Câmara das Tarefas Infinitas', 'Covil do Adiamento Eterno',
    'Salão dos Compromissos Esquecidos', 'Labirinto da Rotina', 'Fortaleza da Disciplina',
    'Abismo do "Depois Eu Faço"', 'Arena da Consistência', 'Cripta do Último Minuto', 'Bastião do Foco',
];

// Garante que existe um boss. Usa uma trava simples em localStorage pra
// reduzir o risco de dois iframes (Tarefas e Boss) tentarem criar um boss
// ao mesmo tempo no primeiro carregamento (quando ainda não existe nenhum).
export async function ensureBoss() {
    let state = load();
    if (state.boss.current) return state.boss.current;

    const agora = Date.now();
    if (state.boss.spawning && (agora - state.boss.spawning) < 8000) {
        // outro iframe já está gerando um boss — espera aparecer em vez de duplicar
        for (let i = 0; i < 20; i++) {
            await new Promise(r => setTimeout(r, 150));
            state = load();
            if (state.boss.current) return state.boss.current;
        }
        // timeout de segurança: segue e gera mesmo assim
    }
    state.boss.spawning = agora;
    save(state);

    const salaAnterior = state.boss.trofeus.length;
    const vidaMaxima = randomBossHp(totalDanoPossivelDoDia(state));
    let pokemonId = randomPokemonId();
    let flavor;
    try {
        flavor = await fetchPokemonFlavor(pokemonId);
    } catch (e) {
        pokemonId = 25; // fallback: Pikachu, sempre disponível
        try { flavor = await fetchPokemonFlavor(pokemonId); }
        catch (e2) { flavor = { nome: 'DESCONHECIDO', sprite: '', tipos: [], altura: 0, peso: 0 }; }
    }

    state = load(); // relê — pode ter mudado durante o fetch
    if (state.boss.current) return state.boss.current; // alguém já resolveu antes da gente

    state.boss.current = {
        pokemonId, salaId: salaAnterior + 1, salaNome: NOMES_SALA[Math.floor(Math.random() * NOMES_SALA.length)],
        vidaMaxima, vidaAtual: vidaMaxima, criadoEm: todayStr(),
        ...flavor,
    };
    state.boss.spawning = 0;
    save(state);
    return state.boss.current;
}

export function getBossState() {
    return load().boss.current;
}

export function getTrofeus() {
    return [...load().boss.trofeus];
}

// Aplica dano; NÃO troca de boss automaticamente — quem decide o momento de
// avançar de sala é a UI (depois de tocar a animação de derrota).
export async function applyDamageToBoss(dano) {
    await ensureBoss();
    const state = load();
    const boss = state.boss.current;
    boss.vidaAtual = Math.max(0, boss.vidaAtual - dano);
    save(state);
    return { derrotado: boss.vidaAtual <= 0, boss };
}

// Chamado pela UI depois da animação de derrota.
export async function avancarProximoBoss() {
    const state = load();
    if (state.boss.current) {
        state.boss.trofeus.unshift({ ...state.boss.current, derrotadoEm: todayStr() });
    }
    state.boss.current = null;
    state.boss.spawning = 0;
    save(state);
    return ensureBoss();
}

function recarregarBossPorFalhas(state, danoFalhado) {
    if (danoFalhado <= 0 || !state.boss.current) return;
    const boss = state.boss.current;
    boss.vidaAtual = Math.min(boss.vidaMaxima, boss.vidaAtual + danoFalhado);
}

// ─── ROLLOVER DIÁRIO ────────────────────────────────────────────────────────
// Tarefas não concluídas em um dia que se encerrou recarregam o boss no
// valor do dano que dariam. Processa em loop caso o painel fique dias sem
// ser aberto (ex: viagem de fim de semana).
export async function processRollover() {
    await ensureBoss();
    const hoje = todayStr();
    let state = load();
    let cursor = state.lastRolloverDate;
    let mudou = false;
    let seguranca = 0;
    while (cursor < hoje && seguranca < 60) {
        let danoFalhado = 0;
        state.owners.forEach(o => {
            const doneMap = (state.log[cursor] && state.log[cursor][o]) || {};
            (state.tasks[o] || []).forEach(t => {
                if (!doneMap[t.id]) danoFalhado += Number(t.dano) || 30;
            });
        });
        recarregarBossPorFalhas(state, danoFalhado);
        cursor = dateStrOffset(cursor, 1);
        mudou = true;
        seguranca++;
    }
    if (mudou) {
        state.lastRolloverDate = hoje;
        save(state);
    }
    return mudou;
}

// ─── ANALYTICS / DASHBOARD ──────────────────────────────────────────────────
export function computeStats(owner) {
    const state = load();
    const tasks = state.tasks[owner] || [];
    const hoje = todayStr();
    const hojeDone = (state.log[hoje] && state.log[hoje][owner]) || {};
    const dT = tasks.length;
    const dH = tasks.filter(t => hojeDone[t.id]).length;

    const freq = {};
    const ultimaData = {};
    const diasOrdenados = Object.keys(state.log).sort();
    const diasComContagem = [];

    diasOrdenados.forEach(date => {
        const doneMap = (state.log[date] && state.log[date][owner]) || {};
        const doneIds = Object.keys(doneMap).filter(id => doneMap[id]);
        doneIds.forEach(id => {
            freq[id] = (freq[id] || 0) + 1;
            if (!ultimaData[id] || date > ultimaData[id]) ultimaData[id] = date;
        });
        diasComContagem.push({ date, count: doneIds.length });
    });
    if (!diasComContagem.length || diasComContagem[diasComContagem.length - 1].date !== hoje) {
        diasComContagem.push({ date: hoje, count: dH });
    }

    let topTask = null, topCount = 0;
    tasks.forEach(t => { if ((freq[t.id] || 0) > topCount) { topCount = freq[t.id]; topTask = t; } });

    let negligTask = null, negligDias = -1;
    tasks.forEach(t => {
        const ultima = ultimaData[t.id];
        const dias = ultima ? diasEntre(ultima, hoje) : 9999;
        if (dias > negligDias) { negligDias = dias; negligTask = t; }
    });

    const seteDiasAtras = dateStrOffset(hoje, -6);
    const mesAtual = hoje.slice(0, 7);
    let semana = 0, mes = 0;
    diasComContagem.forEach(({ date, count }) => {
        if (date >= seteDiasAtras && date <= hoje) semana += count;
        if (date.slice(0, 7) === mesAtual) mes += count;
    });

    const mapaPorData = {};
    diasComContagem.forEach(d => { mapaPorData[d.date] = d.count; });
    const maisRecente = diasComContagem[diasComContagem.length - 1];
    const tipoAtual = maisRecente.count > 0 ? 'ativo' : 'zerado';
    let streakAtivo = 0, streakZerado = 0, cursor = maisRecente.date;
    for (let i = 0; i < 90; i++) {
        const count = mapaPorData[cursor];
        if (count === undefined) break;
        if (tipoAtual === 'ativo') { if (count > 0) streakAtivo++; else break; }
        else { if (count === 0) streakZerado++; else break; }
        cursor = dateStrOffset(cursor, -1);
    }

    let recorde = 0, atual = 0;
    diasComContagem.forEach(({ count }) => {
        if (count > 0) { atual++; if (atual > recorde) recorde = atual; } else atual = 0;
    });

    return {
        hoje: { feitas: dH, total: dT },
        semana, mes,
        topTask: topTask ? { nome: topTask.nome, count: topCount } : null,
        negligenciada: (negligTask && negligDias > 0 && negligDias < 9999)
            ? { nome: negligTask.nome, dias: negligDias } : null,
        streakAtivo, streakZerado, recorde,
        historicoMapa: mapaPorData,
    };
}

export function exportState() {
    return load();
}
