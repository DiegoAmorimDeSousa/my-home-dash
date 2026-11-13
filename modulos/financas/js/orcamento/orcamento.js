// Aba "Contas do mês" (orçamento do casal): salários, contas, divisão e checks.
// O cálculo em si fica em calculo.js; aqui é tela + gravação no Firestore.
import { db, doc, setDoc, updateDoc } from "../../../../shared/firebase.js";
import { isCompact } from "../../../../shared/frame.js";
import { enviarAltura } from "../estado.js";
import { chaveMes, rotuloMes, esc } from "../util.js";
import {
  PESSOAS, r2, idMes, novoId, clonar,
  orcDocVazio, orcDocPlanilha, orcCopiaDe, calcularOrcamento,
} from "./calculo.js";

// exposto pra conferir contas pelo console do navegador
window.calcularOrcamento = calcularOrcamento;

const brlOrc = (v) => `R$ ${(Number(v) || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

let orcMeses = {};                       // id do documento → dados
let orcMesVisto = chaveMes(new Date());  // mês que está na tela
let orcCriando = false;

function orcMesAnterior(chave) {
  return Object.values(orcMeses).filter((m) => m.mes && m.mes < chave).sort((a, b) => b.mes.localeCompare(a.mes))[0] || null;
}

// chamado a cada snapshot da coleção "orcamento"
export function receberOrcamento(docs) {
  orcMeses = {};
  docs.forEach((d) => { orcMeses[d.id] = d.data(); });
  orcAutoCriar();
  renderOrcamento();
}

// ── persistência ──
function orcRef() { return doc(db, "orcamento", idMes(orcMesVisto)); }
function orcDocAtual() { return orcMeses[idMes(orcMesVisto)]; }
async function orcSalvar(campos) {
  try { await updateDoc(orcRef(), campos); }
  catch (e) { console.error(e); alert("Não consegui salvar. Confere as Regras do Firestore pra coleção 'orcamento'."); }
}

window.orcCriarMes = async function (modo) {
  const chave = orcMesVisto;
  const origem = orcMesAnterior(chave);
  const dados = modo === "planilha" ? orcDocPlanilha(chave)
    : modo === "copiar" && origem ? orcCopiaDe(origem, chave)
    : orcDocVazio(chave);
  try { await setDoc(doc(db, "orcamento", idMes(chave)), dados); }
  catch (e) { console.error(e); alert("Não consegui criar o mês. Confere as Regras do Firestore pra coleção 'orcamento'."); }
};

// mês atual sem registro: nasce sozinho como cópia do mais recente
function orcAutoCriar() {
  const atual = chaveMes(new Date());
  if (orcMeses[idMes(atual)] || orcCriando) return;
  const origem = orcMesAnterior(atual);
  if (!origem) return; // primeiro uso: a tela inicial oferece as opções
  orcCriando = true;
  setDoc(doc(db, "orcamento", idMes(atual)), orcCopiaDe(origem, atual))
    .catch((e) => console.error(e)).finally(() => { orcCriando = false; });
}

// ── edição ──
window.orcMudarMes = function (delta) {
  const [y, m] = orcMesVisto.split("-").map(Number);
  const nova = chaveMes(new Date(y, m - 1 + delta, 1));
  if (nova > chaveMes(new Date())) return;
  orcMesVisto = nova;
  renderOrcamento();
};
window.orcEditSalario = (p, v) => {
  const s = clonar(orcDocAtual().salarios); s[p].salario = parseFloat(v) || 0; orcSalvar({ salarios: s });
};
window.orcAddExtra = (p) => {
  const s = clonar(orcDocAtual().salarios); (s[p].extras = s[p].extras || []).push({ nome: "Benefício", valor: 0 }); orcSalvar({ salarios: s });
};
window.orcEditExtra = (p, i, campo, v) => {
  const s = clonar(orcDocAtual().salarios); s[p].extras[i][campo] = campo === "valor" ? parseFloat(v) || 0 : v; orcSalvar({ salarios: s });
};
window.orcDelExtra = (p, i) => {
  const s = clonar(orcDocAtual().salarios); s[p].extras.splice(i, 1); orcSalvar({ salarios: s });
};
window.orcEditPct = (v) => { const n = parseFloat(v); orcSalvar({ pct: Math.min(100, Math.max(0, Number.isNaN(n) ? 70 : n)) }); };
window.orcEditBase = (v) => orcSalvar({ baseReserva: v });

window.orcEditConta = (id, campo, v) => {
  const contas = clonar(orcDocAtual().contas);
  const c = contas.find((x) => x.id === id); if (!c) return;
  c[campo] = campo === "valor" ? parseFloat(v) || 0 : v;
  orcSalvar({ contas });
};
window.orcAddConta = () => {
  const nome = document.getElementById("orc-novo-nome").value.trim();
  if (!nome) { document.getElementById("orc-novo-nome").focus(); return; }
  const contas = clonar(orcDocAtual().contas || []);
  contas.push({
    id: novoId(), nome,
    grupo: document.getElementById("orc-novo-grupo").value,
    responsavel: document.getElementById("orc-novo-resp").value,
    valor: parseFloat(document.getElementById("orc-novo-valor").value) || 0,
  });
  document.getElementById("orc-novo-nome").value = "";
  document.getElementById("orc-novo-valor").value = "";
  orcSalvar({ contas });
};
window.orcDelConta = (id) => {
  if (!confirm("Excluir essa conta deste mês? (os próximos meses copiam o mês anterior)")) return;
  orcSalvar({ contas: clonar(orcDocAtual().contas).filter((x) => x.id !== id) });
};
window.orcTogglePago = (id, pessoa, marcado) => orcSalvar({ [`pagos.${id}__${pessoa}`]: !!marcado });

// ── render ──
const opt = (v, l, atual) => `<option value="${esc(v)}" ${v === atual ? "selected" : ""}>${l}</option>`;

export function renderOrcamento() {
  // resumo enxuto (aparece também no card compacto)
  const resumoEl = document.getElementById("contas-resumo");
  const atual = orcMeses[idMes(chaveMes(new Date()))];
  if (resumoEl) {
    if (!atual) {
      resumoEl.innerHTML = `<span class="mae-sub">Abra "Expandir" → Contas do mês pra configurar</span>`;
    } else {
      const c = calcularOrcamento(atual);
      resumoEl.innerHTML = c.totalLinhas
        ? `<b>${c.pagas}/${c.totalLinhas}</b> pagas · falta <b>${brlOrc(c.faltaGeral)}</b>`
        : `<span class="mae-sub">Nenhuma conta cadastrada</span>`;
    }
  }

  const view = document.getElementById("view-contas");
  if (!view || isCompact) return;

  document.getElementById("orc-mes-label").innerText = rotuloMes(orcMesVisto);
  document.getElementById("orc-next").disabled = orcMesVisto >= chaveMes(new Date());

  const d = orcDocAtual();
  const vazio = document.getElementById("orc-vazio");
  const corpo = document.getElementById("orc-corpo");
  if (!d) {
    const origem = orcMesAnterior(orcMesVisto);
    vazio.style.display = "block"; corpo.style.display = "none";
    vazio.innerHTML = `
      <div class="orc-vazio-txt">Sem registro de ${rotuloMes(orcMesVisto)}.</div>
      <div class="orc-vazio-acoes">
        ${origem ? `<button class="btn-roxo" onclick="orcCriarMes('copiar')">Criar a partir de ${rotuloMes(origem.mes)}</button>` : ""}
        <button class="btn-roxo" onclick="orcCriarMes('planilha')">Preencher com os dados da minha planilha</button>
        <button class="btn-link" onclick="orcCriarMes('vazio')">Começar vazio</button>
      </div>`;
    enviarAltura();
    return;
  }
  vazio.style.display = "none"; corpo.style.display = "block";
  const c = calcularOrcamento(d);
  const semDados = !(d.contas || []).length && PESSOAS.every((p) => !((d.salarios || {})[p] || {}).salario);

  // salários
  document.getElementById("orc-salarios").innerHTML = PESSOAS.map((p) => {
    const s = d.salarios[p] || { salario: 0, extras: [] };
    const extras = (s.extras || []).map((e, i) => `
      <div class="orc-extra">
        <input class="edit-input" value="${esc(e.nome)}" onchange="orcEditExtra('${p}',${i},'nome',this.value)">
        <input class="edit-input orc-num" type="number" step="0.01" value="${e.valor}" onchange="orcEditExtra('${p}',${i},'valor',this.value)">
        <button class="btn-x" title="Remover" onclick="orcDelExtra('${p}',${i})">🗑️</button>
      </div>`).join("");
    return `
      <div class="orc-pessoa">
        <div class="orc-pessoa-nome" style="color:${p === "Diego" ? "#00ff88" : "var(--purple)"}">${p}</div>
        <label class="orc-linha"><span>Salário</span>
          <input class="edit-input orc-num" type="number" step="0.01" value="${s.salario}" onchange="orcEditSalario('${p}',this.value)"></label>
        ${extras}
        <button class="btn-link" onclick="orcAddExtra('${p}')">+ benefício (VA, Swile…)</button>
        <div class="orc-calc"><span>${c.pct}% pras contas</span><b>${brlOrc(c.orc[p])}</b></div>
        <div class="orc-calc"><span>${r2(100 - c.pct)}% livre</span><b>${brlOrc(c.livre[p])}</b></div>
        ${c.extras[p] ? `<div class="orc-calc"><span>Benefícios (fora do cálculo)</span><b>${brlOrc(c.extras[p])}</b></div>` : ""}
      </div>`;
  }).join("");

  // resumo + reserva
  document.getElementById("orc-resumo").innerHTML = `
    <label class="orc-linha"><span>% do salário reservado pras contas</span>
      <input class="edit-input orc-num" type="number" min="0" max="100" value="${c.pct}" onchange="orcEditPct(this.value)"></label>
    <div class="orc-calc"><span>Contas essenciais</span><b>${brlOrc(c.essenciais)}</b></div>
    <div class="orc-calc"><span>Contas diversas</span><b>${brlOrc(c.diversos)}</b></div>
    <div class="orc-calc orc-total"><span>Total do mês</span><b>${brlOrc(c.total)}</b></div>
    <div class="orc-sep"></div>
    <label class="orc-linha"><span>Reserva de emergência (6 meses de)</span>
      <select class="edit-select" style="max-width:170px" onchange="orcEditBase(this.value)">
        ${opt("essenciais", "só essenciais", d.baseReserva || "essenciais")}${opt("todas", "todas as contas", d.baseReserva)}
      </select></label>
    <div class="orc-reserva">${brlOrc(c.reserva)}</div>
    ${semDados ? `<button class="btn-link" onclick="orcCriarMes('planilha')">Preencher com os dados da minha planilha</button>` : ""}`;

  // tabela de contas
  const grupoOpts = (v) => opt("essencial", "Essencial", v) + opt("diverso", "Diversos", v);
  const respOpts = (v) => opt("proporcional", "Dividir (proporcional)", v) + opt("Diego", "Diego", v) + opt("Beatriz", "Beatriz", v);
  document.getElementById("orc-contas-corpo").innerHTML = (d.contas || []).map((ct) => `
    <tr>
      <td><input class="edit-input" value="${esc(ct.nome)}" onchange="orcEditConta('${ct.id}','nome',this.value)"></td>
      <td><select class="edit-select" onchange="orcEditConta('${ct.id}','grupo',this.value)">${grupoOpts(ct.grupo)}</select></td>
      <td><select class="edit-select" onchange="orcEditConta('${ct.id}','responsavel',this.value)">${respOpts(ct.responsavel)}</select></td>
      <td><input class="edit-input orc-num" type="number" step="0.01" value="${ct.valor}" onchange="orcEditConta('${ct.id}','valor',this.value)"></td>
      <td><button class="btn-x" title="Excluir" onclick="orcDelConta('${ct.id}')">🗑️</button></td>
    </tr>`).join("") || `<tr><td colspan="5" class="top3-vazio" style="padding:14px">Nenhuma conta cadastrada ainda.</td></tr>`;

  // quem paga o quê
  document.getElementById("orc-pagam").innerHTML = PESSOAS.map((p) => {
    const rows = c.linhas[p].map((l) => {
      const pago = !!(d.pagos || {})[`${l.contaId}__${p}`];
      return `<label class="pg-linha ${pago ? "pago" : ""}">
        <input type="checkbox" ${pago ? "checked" : ""} onchange="orcTogglePago('${l.contaId}','${p}',this.checked)">
        <span class="pg-nome">${esc(l.nome)}${l.fixa ? "" : ` <small>(parte de ${brlOrc(l.total)})</small>`}</span>
        <span class="pg-valor">${brlOrc(l.valor)}</span>
      </label>`;
    }).join("") || `<div class="top3-vazio" style="padding:10px">Nada pra pagar</div>`;
    const usado = c.orc[p] > 0 ? Math.round((c.totais[p] / c.orc[p]) * 100) : 0;
    return `
      <div class="fin-card">
        <div class="orc-pessoa-nome" style="color:${p === "Diego" ? "#00ff88" : "var(--purple)"}">${p} — contas a pagar</div>
        ${rows}
        <div class="pg-rodape"><span>TOTAL</span><b>${brlOrc(c.totais[p])}</b></div>
        <div class="pg-rodape"><span>JÁ PAGO / FALTA</span><span>${brlOrc(c.pago[p])} / <b>${brlOrc(c.falta[p])}</b></span></div>
        <div class="pg-rodape"><span>SOBRA DOS ${c.pct}% <small>(usou ${usado}%)</small></span><b class="pg-sobra ${c.sobra[p] < 0 ? "neg" : ""}">${brlOrc(c.sobra[p])}</b></div>
      </div>`;
  }).join("");

  enviarAltura();
}
