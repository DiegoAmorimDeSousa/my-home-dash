// Aba "Visão geral": junta tudo — top 3, cartão mãe, total, gráficos,
// últimos 3 meses e a lista de movimentações. renderTudo() é chamado a cada
// snapshot de "transacoes" e sempre que um filtro/edição muda.
import { estado, enviarAltura } from "./estado.js";
import { brl } from "./util.js";
import { chaveMetodo, normMetodo, ehDiferido, corPara } from "./categorias.js";
import { renderChart, renderMetodoChart, renderBarCharts } from "./graficos.js";
import { atualizarOpcoesFiltros, renderLista } from "./movimentacoes.js";
import { renderMeses } from "./ultimos-meses.js";

let periodoFiltro = "mes"; // 'mes' | 'ano' | 'tudo' — controla Maior Gasto / Gastos Totais / gráfico de categoria

const PERIODO_LABEL = { mes: "(este mês)", ano: "(este ano)", tudo: "(tudo)" };

function filtrarPorPeriodo(transacoes, periodo) {
  if (periodo === "tudo") return transacoes;
  const hoje = new Date();
  return transacoes.filter((t) => {
    if (!t.data || !t.data.toDate) return false;
    const d = t.data.toDate();
    if (periodo === "ano") return d.getFullYear() === hoje.getFullYear();
    return d.getFullYear() === hoje.getFullYear() && d.getMonth() === hoje.getMonth();
  });
}

window.onPeriodoChange = function () {
  periodoFiltro = document.getElementById("periodo-filter").value;
  renderTudo(estado.transacoes);
};

export function renderTudo(transacoes) {
  estado.transacoes = transacoes;
  // Métodos "diferidos" (crédito, cartão mãe) não contam nas somas/top 3/
  // gráficos/últimos 3 meses — só "saem" de fato quando a fatura é paga.
  // Mas continuam aparecendo normalmente na lista de movimentações.
  const semCredito = transacoes.filter((t) => !ehDiferido(t));
  estado.semCredito = semCredito;
  const semCreditoPeriodo = filtrarPorPeriodo(semCredito, periodoFiltro);

  let totalGeral = 0;
  const catTotals = {};
  const metodoTotals = {};

  transacoes.forEach((t) => {
    const k = chaveMetodo(t.metodo);
    metodoTotals[k] = (metodoTotals[k] || 0) + (Number(t.valor) || 0);
  });
  semCreditoPeriodo.forEach((t) => {
    const valorNum = Number(t.valor) || 0;
    const cat = t.categoria || "Outros";
    totalGeral += valorNum;
    catTotals[cat] = (catTotals[cat] || 0) + valorNum;
  });

  const rotuloPeriodo = PERIODO_LABEL[periodoFiltro] || "";
  ["periodo-label-1", "periodo-label-2", "periodo-label-3"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.innerText = rotuloPeriodo;
  });
  const seletor = document.getElementById("periodo-filter");
  if (seletor && seletor.value !== periodoFiltro) seletor.value = periodoFiltro;

  // Top 3 categorias do período
  const top = Object.entries(catTotals).sort((a, b) => b[1] - a[1]).slice(0, 3);
  document.getElementById("top3-list").innerHTML = top.length
    ? top.map(([cat, val], i) => `
        <div class="top3-row ${i === 0 ? "top3-first" : ""}">
          <span class="top3-name"><span class="top3-rank">${i + 1}º</span><span class="top3-dot" style="background:${corPara(cat)}"></span>${cat}</span>
          <span class="top3-val">${brl(val)}</span>
        </div>`).join("")
    : `<div class="top3-vazio">Sem dados</div>`;

  // Cartão Mãe (fora das somas, mas com card próprio)
  const mae = filtrarPorPeriodo(transacoes.filter((t) => normMetodo(t.metodo) === "cartao_mae"), periodoFiltro);
  const maeTotal = mae.reduce((a, t) => a + (Number(t.valor) || 0), 0);
  document.getElementById("mae-valor").innerText = brl(maeTotal);
  document.getElementById("mae-sub").innerText = `${mae.length} compra${mae.length === 1 ? "" : "s"}`;

  document.getElementById("gasto-total").innerText = brl(totalGeral);

  atualizarOpcoesFiltros();
  renderLista();
  renderMeses(semCredito);
  renderChart(catTotals, totalGeral);
  renderMetodoChart(metodoTotals);
  renderBarCharts(semCredito);

  enviarAltura();
}
