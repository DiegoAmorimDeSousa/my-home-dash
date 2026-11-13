// Chaveamento (mata-mata) por torneio + ações administrativas no Apps Script.
import { estado, sendHeight } from "./estado.js";

// URL do Apps Script do futebol — só usada pras ações administrativas
// (gerar chaveamento / encerrar temporada). Os dados vêm do Firestore.
const url_macro_apps_script =
  "https://script.google.com/macros/s/AKfycbyzVZOl7vbrtlVtre_12NFn-UqkT0zAJuEN_u865x6gDMnY6jesiNTZ44thrlOqb6hoTw/exec";

const NOME_TORNEIO = { brasil: "Brasil", mundo: "Mundo", geral: "Geral (todos os times)" };

let torneioAtual = "brasil";
let todosConfrontos = [];

export function setConfrontos(lista) {
  todosConfrontos = lista;
}

// ── AÇÕES ADMINISTRATIVAS (via Apps Script) ─────────────────────────
window.gerarChaveamentoUI = async function () {
  const nome = NOME_TORNEIO[torneioAtual];
  if (!confirm(`Gerar um novo chaveamento "${nome}"? O atual desse torneio será apagado (os outros ficam como estão).`)) return;
  try {
    const resp = await fetch(`${url_macro_apps_script}?action=gerar&torneio=${torneioAtual}`);
    let texto = "Pedido enviado. Pode levar alguns segundos pra aparecer.";
    try { texto = await resp.text(); } catch (_) {}
    alert(texto);
  } catch (e) {
    alert("Erro ao gerar chaveamento: " + e.message);
  }
};

window.encerrarTemporadaUI = async function () {
  if (!confirm("Isso arquiva os campeões/recordes do ano, zera as estatísticas de todos os times e aplica promoção/rebaixamento (6 sobem / 6 descem entre divisões). Não dá pra desfazer. Confirmar?")) return;
  try {
    const resp = await fetch(`${url_macro_apps_script}?action=encerrar`);
    alert(await resp.text());
  } catch (e) {
    alert("Erro ao encerrar temporada: " + e.message);
  }
};

// ── CHAVEAMENTO (mata-mata) — serve pra qualquer tamanho ────────────
window.mudarTorneio = function (t) {
  torneioAtual = t;
  document.querySelectorAll("#bracket-tabs .btn-tab").forEach((b) => b.classList.toggle("active", b.dataset.t === t));
  renderBracket();
};

function tamanhoDaFase(fase) {
  if (fase === "Final") return 2;
  if (fase === "Semifinal") return 4;
  if (fase === "Quartas") return 8;
  if (fase === "Oitavas") return 16;
  return Number((fase.match(/\d+/) || [0])[0]);
}

export function renderBracket() {
  const esq = document.getElementById("bracket-left");
  const dir = document.getElementById("bracket-right");
  const areaFinal = document.getElementById("round-center-final");
  const areaPodio = document.getElementById("podium-area");
  const titulo = document.getElementById("bracket-titulo");
  if (!esq || !dir) return;

  const confs = todosConfrontos.filter((c) => (c.torneio || "brasil") === torneioAtual);
  if (!confs.length) {
    esq.innerHTML = `<div class="bracket-vazio">Nenhum chaveamento "${NOME_TORNEIO[torneioAtual]}" gerado ainda. Clique em "Gerar Novo Chaveamento".</div>`;
    dir.innerHTML = ""; areaFinal.innerHTML = ""; areaPodio.innerHTML = "";
    titulo.innerText = `🏆 Mata-Mata — ${NOME_TORNEIO[torneioAtual]}`;
    return;
  }

  const fases = [...new Set(confs.map((c) => c.fase))].sort((a, b) => tamanhoDaFase(b) - tamanhoDaFase(a));
  const primeira = confs.filter((c) => c.fase === fases[0]);
  const participantes = new Set(primeira.flatMap((c) => [c.time1, c.time2]).filter(Boolean)).size;
  titulo.innerText = `🏆 Mata-Mata — ${NOME_TORNEIO[torneioAtual]} (${participantes} times)`;

  // cada confronto ocupa ~83px (padding + 2 times + espaçamentos): reserva 88px por confronto do lado
  const altura = Math.max(620, Math.ceil(primeira.length / 2) * 88 + 40);
  document.getElementById("bracket-section").style.setProperty("--bracket-h", altura + "px");

  const colunas = (lado) => fases.filter((f) => f !== "Final").map((fase) => {
    const lista = confs.filter((c) => c.fase === fase).sort((a, b) => a.slot - b.slot);
    const metade = Math.ceil(lista.length / 2);
    const parte = lado === "esq" ? lista.slice(0, metade) : lista.slice(metade);
    return `<div class="round-col"><div class="round-title-node">${fase}</div><div class="bracket-round">${parte.map(buildMatchHTML).join("")}</div></div>`;
  }).join("");
  esq.innerHTML = colunas("esq");
  dir.innerHTML = colunas("dir");

  const fin = confs.find((c) => c.fase === "Final");
  if (fin) {
    areaFinal.innerHTML = buildMatchHTML(fin);
    areaPodio.innerHTML = fin.vencedor ? `
        <div style="text-align:center; border:2px dashed #00ff88; padding:15px; border-radius:12px; background:rgba(0,255,136,0.03); margin-top: 15px;">
          <span style="font-size:0.65rem; display:block; color:var(--text-dim); font-weight:700; letter-spacing:1px;">🏆 CAMPEÃO</span>
          <span style="font-family:'Montserrat', sans-serif; font-size:1.1rem; display:block; font-weight:800; color:#00ff88; margin-top:5px;">${fin.vencedor}</span>
        </div>` : "";
  }
  sendHeight();
}

function buildMatchHTML(conf) {
  const ehBye = !!conf.bye;
  const t1 = conf.time1 || "Aguardando...";
  const t2 = ehBye ? "BYE" : (conf.time2 || "Aguardando...");
  const logo1 = estado.logoDatabase[t1] || "";
  const logo2 = estado.logoDatabase[t2] || "";
  const imgTag1 = logo1 ? `<img src="${logo1}" class="bracket-logo">` : `<div style="width:20px"></div>`;
  const imgTag2 = logo2 ? `<img src="${logo2}" class="bracket-logo">` : `<div style="width:20px"></div>`;

  const total1 = (Number(conf.ida1) || 0) + (Number(conf.volta1) || 0);
  const total2 = (Number(conf.ida2) || 0) + (Number(conf.volta2) || 0);
  const ambosCompletos = !ehBye && (conf.pernas1 || 0) === 2 && (conf.pernas2 || 0) === 2;
  const houveEmpateAgregado = ambosCompletos && total1 === total2;

  const renderTimeLinha = (nome, logoTag, ida, volta, souTime1) => {
    const vazio = nome === "Aguardando..." || nome === "BYE";
    const isWinner = conf.vencedor === nome && !vazio;
    const validIda = ida !== undefined && ida !== null && ida !== "" ? ida : "-";
    const validVolta = volta !== undefined && volta !== null && volta !== "" ? volta : "-";
    return `
    <div class="matchup-team ${isWinner ? "winner" : ""}">
      <div class="team-info-block">
        ${logoTag}
        <span style="${vazio ? "opacity:0.3" : ""}">${nome}</span>
      </div>
      ${!vazio ? `
        <div class="scores-display">
          <div class="score-box">${validIda}</div>
          <div class="score-box">${validVolta}</div>
          ${houveEmpateAgregado ? `<div class="score-box penalty-box">${souTime1 ? total1 : total2}</div>` : ""}
        </div>` : ""}
    </div>`;
  };

  return `
  <div class="matchup">
    ${renderTimeLinha(t1, imgTag1, conf.ida1, conf.volta1, true)}
    <div style="height:1px; background:var(--border); margin:1px 0;"></div>
    ${renderTimeLinha(t2, imgTag2, conf.ida2, conf.volta2, false)}
  </div>`;
}
