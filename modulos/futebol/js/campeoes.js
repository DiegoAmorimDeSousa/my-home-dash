// Salão dos campeões — temporadas encerradas (coleção "temporadas").
import { sendHeight } from "./estado.js";

export function renderHallOfFame(temporadas) {
  const el = document.getElementById("hall-of-fame");
  if (!el) return;
  if (!temporadas.length) {
    el.innerHTML = `<div style="color:var(--text-dim);font-size:0.85rem;">Nenhuma temporada encerrada ainda.</div>`;
    return;
  }
  el.innerHTML = temporadas.map((s) => {
    const divisoes = Object.entries(s.campeoesPorDivisao || {})
      .map(([chave, time]) => `${chave}: <b style="color:#fff">${time}</b>`)
      .join("<br>");
    const recordesTop = Object.values(s.recordes || {}).slice(0, 3)
      .map((r) => `${r.label}: ${r.time} (${r.valor})`)
      .join(" · ");
    return `
      <div class="season-card">
        <div class="season-year">${s.ano}</div>
        <div class="season-champion">🏆 Campeão Geral: <b>${s.campeaoGeral}</b></div>
        <div class="season-divisoes">${divisoes}</div>
        <div class="season-recorde">${recordesTop}</div>
      </div>`;
  }).join("");
  sendHeight();
}
