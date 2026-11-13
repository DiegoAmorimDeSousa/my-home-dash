// Card "Últimos 3 meses" (compacto e expandido).
import { estado } from "./estado.js";
import { mesLabel } from "./util.js";
import { corPara, categoriasConhecidas } from "./categorias.js";

function computeUltimosMeses(transacoes, n = 3) {
  const hoje = new Date();
  const meses = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
    meses.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: mesLabel(d), total: 0, categorias: {} });
  }
  const porChave = Object.fromEntries(meses.map((m) => [m.key, m]));

  transacoes.forEach((t) => {
    if (!t.data || !t.data.toDate) return;
    const d = t.data.toDate();
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const mes = porChave[key];
    if (!mes) return;
    const valor = Number(t.valor) || 0;
    const cat = t.categoria || "Outros";
    mes.total += valor;
    mes.categorias[cat] = (mes.categorias[cat] || 0) + valor;
  });

  meses.forEach((m) => {
    const entries = Object.entries(m.categorias).sort((a, b) => b[1] - a[1]);
    m.topCategoria = entries.length ? entries[0][0] : null;
    m.topValor = entries.length ? entries[0][1] : 0;
  });
  return meses;
}

function atualizarOpcoesFiltroMes() {
  const sel = document.getElementById("mes-cat-filter");
  const atual = sel.value;
  const opcoes = categoriasConhecidas();
  sel.innerHTML =
    `<option value="">Categoria mais alta</option>` +
    opcoes.map((c) => `<option value="${c}" ${c === atual ? "selected" : ""}>${c}</option>`).join("");
}

window.onMesFiltroChange = function () {
  renderMeses(estado.semCredito);
};

export function renderMeses(transacoes) {
  atualizarOpcoesFiltroMes();
  const filtro = document.getElementById("mes-cat-filter").value;
  const meses = computeUltimosMeses(transacoes, 3);

  document.getElementById("lista-meses").innerHTML = meses
    .map((m) => {
      let nomeCat, valorCat;
      if (filtro) {
        nomeCat = filtro;
        valorCat = m.categorias[filtro] || 0;
      } else {
        nomeCat = m.topCategoria;
        valorCat = m.topValor;
      }

      const cor = nomeCat && valorCat > 0 ? corPara(nomeCat) : "#4b5563";
      const subLinha =
        nomeCat && valorCat > 0
          ? `<span class="mes-top-dot" style="background:${cor}"></span>${nomeCat}: R$ ${valorCat.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
          : filtro
          ? `Sem gastos em ${filtro}`
          : "Sem gastos";

      return `
        <div class="mes-row">
          <div class="mes-row-top">
            <span class="mes-nome">${m.label}</span>
            <span class="mes-total">R$ ${m.total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
          </div>
          <div class="mes-top-cat">${subLinha}</div>
        </div>`;
    })
    .join("");
}
