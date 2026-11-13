// Lista de movimentações (só no expandido): filtros, linhas, edição e exclusão.
import { db, doc, updateDoc, deleteDoc } from "../../../shared/firebase.js";
import { isCompact } from "../../../shared/frame.js";
import { estado } from "./estado.js";
import { chaveMes, rotuloMes, formatDataHora } from "./util.js";
import { chaveMetodo, metodoLabel, corPara, categoriasConhecidas, metodosConhecidos } from "./categorias.js";
import { renderTudo } from "./visao-geral.js";

let editingId = null;

const filtrosPadrao = () => ({ mes: chaveMes(new Date()), cat: "", metodo: "", dono: "", busca: "" });
let filtros = filtrosPadrao();

const LIMITE_LINHAS = 400;

// ── TAGS ──
function metodoTagHtml(metodo) {
  if (!metodo || metodo === "indefinido") return "";
  const cor = corPara(chaveMetodo(metodo));
  return `<span class="tag" style="color:${cor};background:${cor}22;">${metodoLabel(metodo)}</span>`;
}

function parcelaTagHtml(parcela) {
  if (!parcela || !parcela.total) return "";
  return `<span class="tag" style="color:#ec4899;background:#ec489922;">${parcela.atual}/${parcela.total}</span>`;
}

// ── LINHA NORMAL ──
function rowHtml(t) {
  const valorNum = Number(t.valor) || 0;
  const cat = t.categoria || "Outros";
  const color = corPara(cat);
  return `
    <tr>
      <td style="color: #8b949e; width: 62px; font-size:0.78rem;">${formatDataHora(t.data)}</td>
      <td style="font-weight: 600;">
        ${t.dono ? `<span style="color:#8b949e;font-size:0.68rem;">${t.dono}</span><br>` : ""}${t.descricao || ""}
      </td>
      <td>
        <span class="tag" style="color: ${color}; background: ${color}22;">${cat}</span>
        ${metodoTagHtml(t.metodo)}${parcelaTagHtml(t.parcela)}
      </td>
      <td class="val-cell">
        R$ ${valorNum.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
        <div class="row-actions full-only">
          <button title="Editar" onclick="iniciarEdicao('${t.id}')">✏️</button>
          <button class="btn-del" title="Excluir" onclick="excluirTransacao('${t.id}')">🗑️</button>
        </div>
      </td>
    </tr>`;
}

// ── LINHA EM MODO EDIÇÃO ──
function editRowHtml(t) {
  const opcoes = categoriasConhecidas();
  const catAtualConhecida = opcoes.includes(t.categoria);
  const catOptions =
    opcoes.map(c => `<option value="${c}" ${c === t.categoria ? "selected" : ""}>${c}</option>`).join("") +
    `<option value="__custom__" ${!catAtualConhecida ? "selected" : ""}>+ Nova categoria…</option>`;

  const metodoAtual = chaveMetodo(t.metodo);
  const metodoOpcoes = metodosConhecidos();
  const metodoAtualConhecido = metodoAtual === "indefinido" || metodoOpcoes.includes(metodoAtual);
  const metodoOptions =
    `<option value="indefinido" ${metodoAtual === "indefinido" ? "selected" : ""}>Indefinido</option>` +
    metodoOpcoes.map(m => `<option value="${m}" ${m === metodoAtual ? "selected" : ""}>${metodoLabel(m)}</option>`).join("") +
    `<option value="__custom__" ${!metodoAtualConhecido ? "selected" : ""}>+ Novo método…</option>`;

  return `
    <tr>
      <td colspan="4" style="background:rgba(168,85,247,0.05);">
        <input class="edit-input" id="edit-desc-${t.id}" type="text" value="${(t.descricao || "").replace(/"/g, "&quot;")}" placeholder="Descrição">
        <div style="display:flex; gap:6px;">
          <select class="edit-select" id="edit-cat-${t.id}" onchange="onCategoriaSelectChange('${t.id}')">${catOptions}</select>
          <select class="edit-select" id="edit-metodo-${t.id}" onchange="onMetodoSelectChange('${t.id}')">${metodoOptions}</select>
          <input class="edit-input" id="edit-valor-${t.id}" type="number" step="0.01" value="${Number(t.valor) || 0}" style="max-width:100px;">
        </div>
        <input class="edit-input" id="edit-cat-custom-${t.id}" type="text"
          placeholder="Nome da nova categoria"
          value="${!catAtualConhecida ? (t.categoria || "").replace(/"/g, "&quot;") : ""}"
          style="display:${!catAtualConhecida ? "block" : "none"};">
        <input class="edit-input" id="edit-metodo-custom-${t.id}" type="text"
          placeholder="Nome do novo método (ex: Cartão Mãe, V.A)"
          value="${!metodoAtualConhecido ? metodoAtual.replace(/"/g, "&quot;") : ""}"
          style="display:${!metodoAtualConhecido ? "block" : "none"};">
        <div class="edit-actions">
          <button class="btn-cancelar" onclick="cancelarEdicao()">Cancelar</button>
          <button class="btn-salvar" onclick="salvarEdicao('${t.id}')">Salvar</button>
        </div>
      </td>
    </tr>`;
}

window.onCategoriaSelectChange = function (id) {
  const sel = document.getElementById(`edit-cat-${id}`);
  const customEl = document.getElementById(`edit-cat-custom-${id}`);
  const isCustom = sel.value === "__custom__";
  customEl.style.display = isCustom ? "block" : "none";
  if (isCustom) customEl.focus();
};

window.onMetodoSelectChange = function (id) {
  const sel = document.getElementById(`edit-metodo-${id}`);
  const customEl = document.getElementById(`edit-metodo-custom-${id}`);
  const isCustom = sel.value === "__custom__";
  customEl.style.display = isCustom ? "block" : "none";
  if (isCustom) customEl.focus();
};

window.iniciarEdicao = function (id) {
  editingId = id;
  renderTudo(estado.transacoes);
};

window.cancelarEdicao = function () {
  editingId = null;
  renderTudo(estado.transacoes);
};

window.salvarEdicao = async function (id) {
  const descricao = document.getElementById(`edit-desc-${id}`).value.trim();
  const catSelecionada = document.getElementById(`edit-cat-${id}`).value;
  const categoria = catSelecionada === "__custom__"
    ? (document.getElementById(`edit-cat-custom-${id}`).value.trim() || "Outros")
    : catSelecionada;
  const metodoSelecionado = document.getElementById(`edit-metodo-${id}`).value;
  const metodo = metodoSelecionado === "__custom__"
    ? (document.getElementById(`edit-metodo-custom-${id}`).value.trim() || "indefinido")
    : metodoSelecionado;
  const valor = parseFloat(document.getElementById(`edit-valor-${id}`).value) || 0;
  try {
    await updateDoc(doc(db, "transacoes", id), { descricao, categoria, metodo, valor });
    editingId = null; // o onSnapshot já vai re-renderizar sozinho com o dado novo
  } catch (e) {
    console.error("Erro ao salvar:", e);
    alert("Não consegui salvar. Confere se as Regras do Firestore liberam update.");
  }
};

window.excluirTransacao = async function (id) {
  if (!confirm("Excluir essa transação?")) return;
  try {
    await deleteDoc(doc(db, "transacoes", id));
  } catch (e) {
    console.error("Erro ao excluir:", e);
    alert("Não consegui excluir. Confere se as Regras do Firestore liberam delete.");
  }
};

// ── FILTROS DA LISTA ──
function opcoesSelect(id, placeholder, pares, atual) {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = (placeholder !== null ? `<option value="">${placeholder}</option>` : "") +
    pares.map(([v, l]) => `<option value="${String(v).replace(/"/g, "&quot;")}" ${v === atual ? "selected" : ""}>${l}</option>`).join("");
}

export function atualizarOpcoesFiltros() {
  const transacoes = estado.transacoes;
  // meses presentes nos dados (mais recente primeiro) + mês atual sempre
  const meses = new Set([chaveMes(new Date())]);
  transacoes.forEach((t) => { if (t.data && t.data.toDate) meses.add(chaveMes(t.data.toDate())); });
  const listaMeses = [...meses].sort().reverse().map((m) => [m, rotuloMes(m)]);
  listaMeses.push(["todos", "Todos os meses"]);
  opcoesSelect("f-mes", null, listaMeses, filtros.mes);

  opcoesSelect("f-cat", "Todas as categorias", categoriasConhecidas().map((c) => [c, c]), filtros.cat);

  const metodos = new Map();
  transacoes.forEach((t) => {
    const k = chaveMetodo(t.metodo);
    if (!metodos.has(k)) metodos.set(k, k === "indefinido" ? "Indefinido" : metodoLabel(k));
  });
  opcoesSelect("f-metodo", "Todos os métodos", [...metodos.entries()], filtros.metodo);

  const donos = [...new Set(transacoes.map((t) => t.dono).filter(Boolean))];
  opcoesSelect("f-dono", "Todos", donos.map((d) => [d, d]), filtros.dono);

  const busca = document.getElementById("f-busca");
  if (busca && busca !== document.activeElement) busca.value = filtros.busca;
}

window.onFiltroChange = function () {
  filtros = {
    mes: document.getElementById("f-mes").value,
    cat: document.getElementById("f-cat").value,
    metodo: document.getElementById("f-metodo").value,
    dono: document.getElementById("f-dono").value,
    busca: document.getElementById("f-busca").value.trim().toLowerCase(),
  };
  renderLista();
};

window.limparFiltros = function () {
  filtros = filtrosPadrao();
  document.getElementById("f-busca").value = "";
  atualizarOpcoesFiltros();
  renderLista();
};

function passaFiltros(t) {
  if (filtros.mes !== "todos") {
    if (!t.data || !t.data.toDate || chaveMes(t.data.toDate()) !== filtros.mes) return false;
  }
  if (filtros.cat && (t.categoria || "Outros") !== filtros.cat) return false;
  if (filtros.metodo && chaveMetodo(t.metodo) !== filtros.metodo) return false;
  if (filtros.dono && t.dono !== filtros.dono) return false;
  if (filtros.busca && !(t.descricao || "").toLowerCase().includes(filtros.busca)) return false;
  return true;
}

export function renderLista() {
  const corpo = document.getElementById("lista-transacoes");
  if (!corpo || isCompact) return;
  const lista = estado.transacoes.filter(passaFiltros);
  const soma = lista.reduce((a, t) => a + (Number(t.valor) || 0), 0);
  const mostradas = lista.slice(0, LIMITE_LINHAS);

  corpo.innerHTML = mostradas.map((t) => (editingId === t.id ? editRowHtml(t) : rowHtml(t))).join("") ||
    `<tr><td colspan="4" style="text-align:center;color:#8b949e;padding:20px;">Nenhuma transação com esses filtros</td></tr>`;

  document.getElementById("lista-resumo").innerText =
    `${lista.length} transaç${lista.length === 1 ? "ão" : "ões"} · soma do filtro: R$ ${soma.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` +
    (lista.length > LIMITE_LINHAS ? ` · mostrando as ${LIMITE_LINHAS} mais recentes (refine os filtros)` : "");
}
