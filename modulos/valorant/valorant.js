// Tabela de classificação do VCT, lida de uma planilha pública do Google.
import { iniciarFrame } from "../../shared/frame.js";

const { avisarAltura } = iniciarFrame("frame-valorant");

const SPREADSHEET_ID = "1X0JK-WAZtRtRq8N_XQ_sTF82IA0aCuxmnJ60OgKlpGw";
const SHEET_NAME = "Classificacao";
const url_api = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?sheet=${SHEET_NAME}&tqx=out:json`;

let todosOsTimes = []; // Cache global dos dados da planilha
let regiaoAtiva = "todos";

function atualizarAlturaPai() {
  const wrapper = document.getElementById("valorant-wrapper");
  if (wrapper) avisarAltura(wrapper.offsetHeight);
}

async function carregarDashboard() {
  try {
    const resposta = await fetch(url_api);
    const texto = await resposta.text();
    const jsonPuro = JSON.parse(texto.substring(47, texto.length - 2));
    const linhas = jsonPuro.table.rows;

    todosOsTimes = [];

    linhas.forEach((linha) => {
      const celulas = AppPegaCelulas(linha.c);
      if (!celulas || !celulas.nomeTime || celulas.nomeTime.toLowerCase() === "time") return;
      todosOsTimes.push(celulas);
    });

    // Ordenação padrão por Pontuação e Saldo
    todosOsTimes.sort((a, b) => {
      if (b.pontos !== a.pontos) return b.pontos - a.pontos;
      return b.saldoMapasNumero - a.saldoMapasNumero;
    });

    // Renderiza a tabela com base na região ativa no momento
    renderizarTabelaPorRegiao(regiaoAtiva);

    document.getElementById("loading").style.display = "none";
    document.getElementById("tabela-container-div").style.display = "block";

    atualizarAlturaPai();
  } catch (erro) {
    console.error("Erro ao carregar dados:", erro);
    document.getElementById("loading").innerHTML = `<span>Erro ao sincronizar dados.</span>`;
    atualizarAlturaPai();
  }
}

function renderizarTabelaPorRegiao(regiao) {
  const corpoTabela = document.getElementById("tabela-corpo");
  corpoTabela.innerHTML = "";

  let contadorPosicao = 1;

  todosOsTimes.forEach((time) => {
    const regiaoLinha = dynamicFixRegiao(time.regiao);
    const regiaoAlvo = dynamicFixRegiao(regiao);

    // Critério de filtragem: ignora se não pertencer à região escolhida
    if (regiao !== "todos" && regiaoLinha !== regiaoAlvo) return;

    let classeSaldo = "";
    if (time.saldoMapasNumero > 0) classeSaldo = "positive-sm";
    if (time.saldoMapasNumero < 0) classeSaldo = "negative-sm";

    const tagLogo =
      time.logoUrl && time.logoUrl.startsWith("http")
        ? `<img src="${time.logoUrl}" class="team-logo" alt="logo">`
        : ``;

    const tagRegiaoLogo =
      time.regiaoLogoUrl && time.regiaoLogoUrl.startsWith("http")
        ? `<img src="${time.regiaoLogoUrl}" class="region-logo" title="${time.regiao}" alt="${time.regiao}">`
        : "";

    const tr = document.createElement("tr");

    tr.innerHTML = `
              <td>${contadorPosicao}º</td>
              <td>
                  <div class="col-time">
                      ${tagLogo}
                      <span>${time.nomeTime}</span>
                  </div>
              </td>
              <td class="points-cell">${time.pontos}</td>
              <td>${time.vitorias}</td>
              <td>${time.derrotas}</td>
              <td>${time.jogos}</td>
              <td>${time.mapasG}</td>
              <td>${time.mapasP}</td>
              <td class="${classeSaldo}">${time.saldoMapasTexto}</td>
              <td>${time.totalMapas}</td>
              <td>${time.aproveitamento}</td>
              <td class="ultimo-jogo-cell">${time.ultimoJogo}</td>
              <td>${tagRegiaoLogo}</td>
          `;
    corpoTabela.appendChild(tr);

    contadorPosicao++; // Incrementa dinamicamente a posição apenas para os exibidos
  });
}

// chamado pelos botões de região (onclick no HTML)
window.alterarFiltro = function (novaRegiao) {
  regiaoAtiva = novaRegiao;

  // Atualiza estados visuais dos botões
  document.querySelectorAll(".filter-btn").forEach((btn) => btn.classList.remove("active"));
  const btnAtivo = document.getElementById(`btn-${novaRegiao}`);
  if (btnAtivo) btnAtivo.classList.add("active");

  // Renderiza novamente recalculando as posições (1º, 2º, 3º...)
  renderizarTabelaPorRegiao(regiaoAtiva);
  atualizarAlturaPai();
};

function AppPegaCelulas(c) {
  if (!c || !c[1]) return null;

  let rawSaldo = c[8] ? String(c[8].v || c[8].f || "0") : "0";
  let numeroSaldo = parseInt(rawSaldo.replace("+", ""), 10) || 0;
  let textoSaldo = numeroSaldo > 0 ? "+" + numeroSaldo : String(numeroSaldo);

  return {
    logoUrl: c[0] ? c[0].v : "",
    nomeTime: c[1] ? String(c[1].v).trim() : "",
    pontos: c[2] ? Number(c[2].v) || 0 : 0,
    vitorias: c[3] ? c[3].v : 0,
    derrotas: c[4] ? c[4].v : 0,
    jogos: c[5] ? c[5].v : 0,
    mapasG: c[6] ? c[6].v : 0,
    mapasP: c[7] ? c[7].v : 0,
    saldoMapasNumero: numeroSaldo,
    saldoMapasTexto: textoSaldo,
    totalMapas: c[9] ? c[9].v || "-" : "-",
    aproveitamento: c[10] ? c[10].f || String(c[10].v) : "0%",
    ultimoJogo: c[11] ? c[11].v : "-",
    regiao: c[12] ? String(c[12].v).toUpperCase().trim() : "DESCONHECIDO",
    regiaoLogoUrl: c[13] ? c[13].v : "",
  };
}

function dynamicFixRegiao(val) {
  if (!val) return "";
  let normalized = val.toUpperCase().trim();
  if (normalized === "EME") return "EMEA";
  return normalized;
}

carregarDashboard();
window.addEventListener("resize", atualizarAlturaPai);
setInterval(carregarDashboard, 30000);
