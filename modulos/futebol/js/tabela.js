// Tabela de classificação + botões de divisão + cards de destaques.
import { db, doc, updateDoc } from "../../../shared/firebase.js";
import { isCompact } from "../../../shared/frame.js";
import { estado, sendHeight } from "./estado.js";
import { slugify, resolvePais, codigoParaEmoji, codigoDoTime } from "./paises.js";
import { LIMITE_DIVISAO, divisoesDe, contagem } from "./divisoes.js";

let typePAIS = "Brasil";
let season = "A";
let selecaoPendente = null; // divisão recém-criada, esperando chegar do banco

// Depois de mover um time de divisão, a tabela pula pra divisão nova assim
// que o dado chegar do banco.
export function selecionarQuandoChegar(pais, divisao) {
  selecaoPendente = { pais, divisao };
}

function flagHtml(t) {
  const cod = codigoDoTime(t);
  const slug = slugify(t.nome);
  const clicavel = !isCompact;
  const conteudo = cod
    ? `<img class="flag-img" src="https://flagcdn.com/w40/${cod}.png" alt="${cod}" onerror="this.replaceWith(document.createTextNode('${codigoParaEmoji(cod)}'))">`
    : `<span class="flag-fallback" title="País não definido">🌍</span>`;
  return clicavel
    ? `<button class="flag-btn" title="Definir o país deste time" onclick="editarBandeira('${slug}')">${conteudo}</button>`
    : `<span class="flag-btn">${conteudo}</span>`;
}

window.editarBandeira = async function (slug) {
  const entrada = prompt("País do time (nome em português ou código de 2 letras. Ex: Espanha, es, gb-eng):");
  if (entrada === null) return;
  const cod = resolvePais(entrada);
  if (!cod) { alert("Não reconheci esse país. Tenta o código de 2 letras (ex: es, ar, pt)."); return; }
  try {
    await updateDoc(doc(db, "times", slug), { paisCodigo: cod, bandeira: codigoParaEmoji(cod) });
  } catch (e) {
    console.error(e); alert("Não consegui salvar o país: " + e.message);
  }
};

const metrics = [
  { id: "v_max", label: "Mais Vitórias", campo: "vitorias", type: "max" },
  { id: "v_min", label: "Menos Vitórias", campo: "vitorias", type: "min" },
  { id: "e_max", label: "Mais Empates", campo: "empates", type: "max" },
  { id: "e_min", label: "Menos Empates", campo: "empates", type: "min" },
  { id: "d_max", label: "Mais Derrotas", campo: "derrotas", type: "max" },
  { id: "d_min", label: "Menos Derrotas", campo: "derrotas", type: "min" },
  { id: "gm_max", label: "Melhor Ataque", campo: "golsMarcados", type: "max" },
  { id: "gm_min", label: "Pior Ataque", campo: "golsMarcados", type: "min" },
  { id: "gs_min", label: "Melhor Defesa", campo: "golsSofridos", type: "min" },
  { id: "gs_max", label: "Pior Defesa", campo: "golsSofridos", type: "max" },
  { id: "sg_max", label: "Maior Saldo", campo: "saldoGols", type: "max" },
  { id: "sg_min", label: "Pior Saldo", campo: "saldoGols", type: "min" },
  { id: "ap_max", label: "Aproveitamento", campo: "aproveitamento", type: "max" },
  { id: "ap_min", label: "Pior Aproveitamento", campo: "aproveitamento", type: "min" },
  { id: "j_max", label: "Mais Jogos", campo: "jogos", type: "max" },
  { id: "j_min", label: "Menos Jogos", campo: "jogos", type: "min" },
];

export function renderFiltros() {
  const el = document.getElementById("filtros-divisoes");
  if (!el) return;
  if (selecaoPendente && divisoesDe(selecaoPendente.pais).includes(selecaoPendente.divisao) &&
      contagem(selecaoPendente.pais, selecaoPendente.divisao) > 0) {
    typePAIS = selecaoPendente.pais; season = selecaoPendente.divisao; selecaoPendente = null;
  }
  // se a divisão selecionada deixou de existir, volta pra "Todos"
  if (!selecaoPendente && season !== "Todos" && !divisoesDe(typePAIS).includes(season)) { season = "Todos"; typePAIS = "Todos"; }

  let html = "";
  ["Brasil", "Mundo"].forEach((pais) => {
    divisoesDe(pais).forEach((div) => {
      const n = contagem(pais, div);
      const ativo = typePAIS === pais && season === div;
      html += `<button class="btn-filter ${ativo ? "active" : ""} ${n > LIMITE_DIVISAO ? "acima" : ""}" onclick="mudarDivisao('${pais}','${div}')">${pais} - ${div} <span class="cnt">${n}/${LIMITE_DIVISAO}</span></button>`;
    });
  });
  html += `<button class="btn-filter ${season === "Todos" ? "active" : ""}" onclick="mudarDivisao('Todos','Todos')">Todos <span class="cnt">${estado.todosOsTimes.length}</span></button>`;
  el.innerHTML = html;
}

window.mudarDivisao = function (pais, divisao) {
  typePAIS = pais;
  season = divisao;
  renderFiltros();
  renderTabela();
};

export function renderTabela() {
  const tbody = document.getElementById("futebol-body");
  if (!tbody) return;

  let results = {};
  metrics.forEach((m) => { results[m.id] = { val: m.type === "max" ? -Infinity : Infinity }; });

  let filtrados = estado.todosOsTimes.filter((t) => {
    if (season === "Todos") return true;
    return t.pais === typePAIS && t.divisao === season;
  });
  filtrados.sort((a, b) => {
    if ((b.pontos || 0) !== (a.pontos || 0)) return (b.pontos || 0) - (a.pontos || 0);
    if ((b.saldoGols || 0) !== (a.saldoGols || 0)) return (b.saldoGols || 0) - (a.saldoGols || 0);
    return (b.golsMarcados || 0) - (a.golsMarcados || 0);
  });

  let html = "";
  filtrados.forEach((t, i) => {
    estado.logoDatabase[t.nome] = t.logo || "";
    const pos = i + 1;

    let trendIcon = "";
    if (t.tendencia === "sobe") {
      const dif = (t.posicaoAnterior || pos) - pos;
      trendIcon = `<span style="color:#00ff88;font-size:0.75rem;font-weight:bold;">▲${dif > 0 ? dif : ""}</span>`;
    } else if (t.tendencia === "desce") {
      const dif = pos - (t.posicaoAnterior || pos);
      trendIcon = `<span style="color:var(--red);font-size:0.75rem;font-weight:bold;">▼${dif > 0 ? dif : ""}</span>`;
    } else if (t.tendencia === "igual" && (t.jogos || 0) > 0) {
      trendIcon = `<span style="color:var(--text-dim);font-size:0.75rem;">●</span>`;
    }

    const cl = pos === 1 ? "pos-1" : pos <= 6 ? "pos-g6" : pos > filtrados.length - 6 ? "pos-z6" : "";
    const pct = (t.aproveitamento || 0).toString().replace(".", ",");

    html += `
      <tr>
        <td class="${cl}">${pos}</td>
        <td style="width:25px;text-align:center;">${trendIcon}</td>
        <td><div class="team-cell">${flagHtml(t)}<img src="${t.logo || ""}" class="team-logo"><span>${t.nome}</span></div></td>
        <td class="bold">${t.pontos || 0}</td>
        <td>${t.jogos || 0}</td><td>${t.vitorias || 0}</td><td>${t.empates || 0}</td><td>${t.derrotas || 0}</td>
        <td>${t.golsMarcados || 0}</td><td>${t.golsSofridos || 0}</td><td>${t.saldoGols || 0}</td>
        <td style="color:var(--purple);font-weight:700">${pct}%</td>
        <td style="font-size:0.75rem;color:var(--text-dim);font-weight:500;">${t.ultimoPlacar || ""}</td>
        ${isCompact ? "" : `<td><button class="btn-edit" title="Editar time" onclick="editarTime('${slugify(t.nome)}')">✏️</button></td>`}
      </tr>`;

    metrics.forEach((m) => {
      const v = Number(t[m.campo]) || 0;
      if ((m.type === "max" && v > results[m.id].val) || (m.type === "min" && v < results[m.id].val)) {
        results[m.id] = { val: v, time: t.nome, logo: t.logo || "", isPct: m.campo === "aproveitamento" };
      }
    });
  });

  tbody.innerHTML = html || `<tr><td colspan="14" style="text-align:center;color:var(--text-dim);padding:20px;">Nenhum time cadastrado nessa divisão ainda.</td></tr>`;
  renderDashboard(results);
  sendHeight();
}

// Cards de destaques (mais vitórias, melhor ataque...) + checkboxes pra esconder.
function renderDashboard(results) {
  const fArea = document.getElementById("filter-area");
  const cArea = document.getElementById("cards-area");
  if (!fArea || !cArea) return;
  fArea.innerHTML = "";
  cArea.innerHTML = "";

  metrics.forEach((m) => {
    const d = results[m.id];
    if (!d || !d.time) return;
    fArea.innerHTML += `<label><input type="checkbox" checked onchange="toggleCard('${m.id}')"> ${m.label}</label>`;
    cArea.innerHTML += `
    <div class="stat-card" id="card-${m.id}">
        <span class="stat-label">${m.label}</span>
        <img src="${d.logo}" class="stat-img">
        <span class="stat-val">${d.val}${d.isPct ? "%" : ""}</span>
        <span class="stat-time">${d.time}</span>
    </div>`;
  });
}

window.toggleCard = function (id) {
  const card = document.getElementById(`card-${id}`);
  if (card) card.classList.toggle("hidden");
  sendHeight();
};
