// Gráficos (Chart.js, carregado via <script> no HTML — globais Chart e
// ChartDataLabels): rosca por categoria, rosca por método, barras por dia/mês.
import { isCompact } from "../../../shared/frame.js";
import { MESES_PT, brl } from "./util.js";
import { corPara, metodoLabel } from "./categorias.js";

// instâncias atuais (destruídas antes de redesenhar)
let chartInst = null;
let chartMetodoInst = null;
const barras = {}; // canvasId → instância

export function renderChart(dataObj, totalGeral) {
  const ctx = document.getElementById("financeChart").getContext("2d");
  if (chartInst) chartInst.destroy();

  const labels = Object.keys(dataObj);
  const colors = labels.map((l) => corPara(l));

  chartInst = new Chart(ctx, {
    type: "doughnut",
    plugins: [ChartDataLabels],
    data: {
      labels: labels,
      datasets: [{ data: Object.values(dataObj), backgroundColor: colors, borderWidth: 2, borderColor: "#161b22", hoverOffset: 15 }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: !isCompact,
          position: "bottom",
          labels: { color: "#8b949e", font: { size: 10 }, usePointStyle: true, padding: 12 },
        },
        datalabels: {
          color: "#fff",
          font: { family: "Montserrat", weight: "bold", size: isCompact ? 8 : 10 },
          formatter: (value) => {
            let p = ((value / totalGeral) * 100).toFixed(0);
            return p > 6 ? p + "%" : "";
          },
        },
        tooltip: { callbacks: { label: (context) => ` ${context.label}: R$ ${context.parsed.toLocaleString("pt-BR")}` } },
      },
    },
  });
}

export function renderMetodoChart(dataObj) {
  const canvas = document.getElementById("metodoChart");
  if (!canvas || isCompact) return; // só existe/renderiza no expandido
  const ctx = canvas.getContext("2d");
  if (chartMetodoInst) chartMetodoInst.destroy();

  const entries = Object.entries(dataObj).filter(([, v]) => v > 0);
  const labels = entries.map(([k]) => metodoLabel(k));
  const colors = entries.map(([k]) => corPara(k));
  const total = entries.reduce((a, [, v]) => a + v, 0);

  chartMetodoInst = new Chart(ctx, {
    type: "doughnut",
    plugins: [ChartDataLabels],
    data: { labels, datasets: [{ data: entries.map(([, v]) => v), backgroundColor: colors, borderWidth: 2, borderColor: "#161b22", hoverOffset: 12 }] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: true, position: "bottom", labels: { color: "#8b949e", font: { size: 10 }, usePointStyle: true, padding: 10 } },
        datalabels: {
          color: "#fff",
          font: { family: "Montserrat", weight: "bold", size: 10 },
          formatter: (value) => (total ? ((value / total) * 100).toFixed(0) + "%" : ""),
        },
        tooltip: { callbacks: { label: (context) => ` ${context.label}: R$ ${context.parsed.toLocaleString("pt-BR")}` } },
      },
    },
  });
}

// ── GRÁFICOS DE BARRA: gasto por dia (mês atual) e por mês (ano atual) ──
export function renderBarCharts(semCredito) {
  if (isCompact || !document.getElementById("diaChart")) return;
  const hoje = new Date();
  const ano = hoje.getFullYear(), mes = hoje.getMonth();
  const diasNoMes = new Date(ano, mes + 1, 0).getDate();
  const porDia = Array(diasNoMes).fill(0);
  const porMes = Array(12).fill(0);

  semCredito.forEach((t) => {
    if (!t.data || !t.data.toDate) return;
    const d = t.data.toDate();
    if (d.getFullYear() !== ano) return;
    const v = Number(t.valor) || 0;
    porMes[d.getMonth()] += v;
    if (d.getMonth() === mes) porDia[d.getDate() - 1] += v;
  });

  document.getElementById("dia-chart-titulo").innerText = `Gasto por dia — ${MESES_PT[mes]}`;
  document.getElementById("mes-chart-titulo").innerText = `Gasto por mês — ${ano}`;

  const maxDia = Math.max(...porDia), maxMes = Math.max(...porMes);
  const idxDia = porDia.indexOf(maxDia), idxMes = porMes.indexOf(maxMes);
  document.getElementById("dia-chart-nota").innerText =
    maxDia > 0 ? `Dia mais caro: ${String(idxDia + 1).padStart(2, "0")}/${String(mes + 1).padStart(2, "0")} — ${brl(maxDia)}` : "Sem gastos neste mês ainda";
  document.getElementById("mes-chart-nota").innerText =
    maxMes > 0 ? `Mês mais caro: ${MESES_PT[idxMes]} — ${brl(maxMes)}` : "Sem gastos neste ano ainda";

  const desenhar = (canvasId, labels, dados, idxMax) => {
    const ctx = document.getElementById(canvasId).getContext("2d");
    if (barras[canvasId]) barras[canvasId].destroy();
    barras[canvasId] = new Chart(ctx, {
      type: "bar",
      data: {
        labels,
        datasets: [{
          data: dados,
          backgroundColor: dados.map((_, i) => (i === idxMax && dados[i] > 0 ? "#f59e0b" : "rgba(168,85,247,0.55)")),
          borderRadius: 3,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          datalabels: { display: false },
          tooltip: { callbacks: { label: (c) => ` ${brl(c.parsed.y)}` } },
        },
        scales: {
          x: { ticks: { color: "#8b949e", font: { size: 9 }, maxRotation: 0, autoSkip: true }, grid: { display: false } },
          y: { ticks: { color: "#8b949e", font: { size: 9 }, callback: (v) => (v >= 1000 ? `${v / 1000}k` : v) }, grid: { color: "rgba(255,255,255,0.05)" } },
        },
      },
    });
  };

  desenhar("diaChart", porDia.map((_, i) => i + 1), porDia, idxDia);
  desenhar("mesChart", MESES_PT.map((m) => m.slice(0, 3)), porMes, idxMes);
}
