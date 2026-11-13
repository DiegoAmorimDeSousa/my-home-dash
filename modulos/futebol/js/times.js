// Cadastro de times: adicionar, editar (divisão/grupo/país/escudo) e
// importar totais do ano colados de uma planilha.
import { db, doc, setDoc, updateDoc } from "../../../shared/firebase.js";
import { estado } from "./estado.js";
import { slugify, resolvePais, codigoParaEmoji, nomeDoPais, preencherListaPaises } from "./paises.js";
import { LIMITE_DIVISAO, contagem, alocarDivisao, opcoesDivisao } from "./divisoes.js";
import { renderFiltros, renderTabela, selecionarQuandoChegar } from "./tabela.js";

let editandoSlug = null;

// ── ADICIONAR TIME ──────────────────────────────────────────────────
window.toggleAddTimeForm = function (show) {
  const form = document.getElementById("add-time-form");
  const willShow = show !== undefined ? show : form.style.display === "none";
  form.style.display = willShow ? "flex" : "none";
  if (willShow) {
    preencherListaPaises();
    atualizarDivisoesForm();
  }
};

function atualizarDivisoesForm() {
  const grupo = document.getElementById("novo-time-pais").value;
  const sel = document.getElementById("novo-time-divisao");
  const atual = sel.value;
  const { todas } = opcoesDivisao(grupo, sel);
  if (todas.includes(atual)) sel.value = atual;
  const escolhida = sel.value;
  const destino = alocarDivisao(grupo, escolhida);
  document.getElementById("novo-time-nota").innerText =
    destino === escolhida ? "" : `A Divisão ${escolhida} está cheia (${LIMITE_DIVISAO}/${LIMITE_DIVISAO}) — o time vai entrar na Divisão ${destino}.`;
}
window.atualizarDivisoesForm = atualizarDivisoesForm;

window.adicionarTimeUI = async function () {
  const nome = document.getElementById("novo-time-nome").value.trim();
  const logo = document.getElementById("novo-time-logo").value.trim();
  const paisNome = document.getElementById("novo-time-pais-nome").value.trim();
  const pais = document.getElementById("novo-time-pais").value;
  const escolhida = document.getElementById("novo-time-divisao").value;
  if (!nome) { alert("Digita o nome do time."); return; }
  if (estado.todosOsTimes.some((t) => slugify(t.nome) === slugify(nome))) { alert("Já existe um time com esse nome."); return; }

  let paisCodigo = pais === "Brasil" ? "br" : "";
  if (paisNome) {
    paisCodigo = resolvePais(paisNome);
    if (!paisCodigo) { alert("Não reconheci esse país. Usa um da lista ou o código de 2 letras (ex: es, ar, pt)."); return; }
  }
  const divisao = alocarDivisao(pais, escolhida);

  try {
    await setDoc(doc(db, "times", slugify(nome)), {
      nome, logo, pais, divisao,
      paisCodigo, bandeira: paisCodigo ? codigoParaEmoji(paisCodigo) : "",
      pontos: 0, jogos: 0, vitorias: 0, empates: 0, derrotas: 0,
      golsMarcados: 0, golsSofridos: 0, saldoGols: 0, aproveitamento: 0,
      ultimoPlacar: "", posicaoAtual: 0, posicaoAnterior: 0, tendencia: "igual",
    });
    ["novo-time-nome", "novo-time-logo", "novo-time-pais-nome"].forEach((id) => { document.getElementById(id).value = ""; });
    toggleAddTimeForm(false);
    if (divisao !== escolhida) alert(`A Divisão ${escolhida} estava cheia: "${nome}" entrou na Divisão ${divisao}.`);
  } catch (e) {
    console.error("Erro ao adicionar time:", e);
    alert("Não consegui adicionar. Confere as Regras do Firestore pra coleção 'times'.");
  }
};

// ── EDITAR TIME (divisão, grupo, país, escudo) ──────────────────────
// O nome não é editável: ele é a chave do time no banco e o Apps Script
// acha o time pelo nome que vem da notificação.
window.editarTime = function (slug) {
  const t = estado.todosOsTimes.find((x) => slugify(x.nome) === slug);
  if (!t) return;
  editandoSlug = slug;
  preencherListaPaises();
  document.getElementById("edit-time-titulo").innerText = `Editar: ${t.nome}`;
  document.getElementById("edit-time-logo").value = t.logo || "";
  document.getElementById("edit-time-pais-nome").value = nomeDoPais(t.paisCodigo || "");
  document.getElementById("edit-time-pais").value = t.pais;
  atualizarDivisoesEdicao(t.divisao);
  const painel = document.getElementById("edit-time-form");
  painel.style.display = "flex";
  if (painel.scrollIntoView) painel.scrollIntoView({ behavior: "smooth", block: "center" });
};

function atualizarDivisoesEdicao(preferida) {
  const grupo = document.getElementById("edit-time-pais").value;
  const sel = document.getElementById("edit-time-divisao");
  const atual = typeof preferida === "string" ? preferida : sel.value;
  const { letras, todas } = opcoesDivisao(grupo, sel);
  sel.value = todas.includes(atual) ? atual : letras[0];

  const t = estado.todosOsTimes.find((x) => slugify(x.nome) === editandoSlug);
  const mudou = t && (t.pais !== grupo || t.divisao !== sel.value);
  const n = contagem(grupo, sel.value);
  document.getElementById("edit-time-nota").innerText =
    mudou && n >= LIMITE_DIVISAO ? `A Divisão ${sel.value} do ${grupo} já tem ${n}/${LIMITE_DIVISAO} — mover pra lá passa do limite.` : "";
}
window.atualizarDivisoesEdicao = atualizarDivisoesEdicao;

window.fecharEdicaoTime = function () {
  editandoSlug = null;
  document.getElementById("edit-time-form").style.display = "none";
};

window.salvarEdicaoTime = async function () {
  const t = estado.todosOsTimes.find((x) => slugify(x.nome) === editandoSlug);
  if (!t) return;
  const logo = document.getElementById("edit-time-logo").value.trim();
  const paisNome = document.getElementById("edit-time-pais-nome").value.trim();
  const grupo = document.getElementById("edit-time-pais").value;
  const divisao = document.getElementById("edit-time-divisao").value;

  let codigo = t.paisCodigo || "";
  if (paisNome) {
    codigo = resolvePais(paisNome);
    if (!codigo) { alert("Não reconheci esse país. Usa um da lista ou o código de 2 letras (ex: es, ar, pt)."); return; }
  } else if (grupo === "Brasil" && !codigo) {
    codigo = "br";
  }

  const mudouLugar = t.pais !== grupo || t.divisao !== divisao;
  if (mudouLugar && contagem(grupo, divisao) >= LIMITE_DIVISAO &&
      !confirm(`A Divisão ${divisao} do ${grupo} já tem ${contagem(grupo, divisao)}/${LIMITE_DIVISAO}. Mover mesmo assim?`)) return;

  const dados = { logo, pais: grupo, divisao, paisCodigo: codigo, bandeira: codigo ? codigoParaEmoji(codigo) : "" };
  // mudou de divisão: as setinhas de posição antigas não valem mais
  if (mudouLugar) Object.assign(dados, { posicaoAtual: 0, posicaoAnterior: 0, tendencia: "igual" });

  try {
    await updateDoc(doc(db, "times", editandoSlug), dados);
    fecharEdicaoTime();
    if (mudouLugar) { selecionarQuandoChegar(grupo, divisao); renderFiltros(); renderTabela(); }
  } catch (e) {
    console.error(e); alert("Não consegui salvar: " + e.message);
  }
};

// ── IMPORTAR TOTAIS DO ANO ──────────────────────────────────────────
window.toggleImportPanel = function (show) {
  const el = document.getElementById("import-panel");
  el.style.display = (show !== undefined ? show : el.style.display === "none") ? "block" : "none";
};

function parseLinhasImport(texto) {
  return texto.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).map((l) => {
    const sep = l.includes("\t") ? "\t" : l.includes(";") ? ";" : ",";
    return l.split(sep).map((c) => c.trim());
  });
}

window.importarTotaisUI = async function () {
  const texto = document.getElementById("import-texto").value;
  const modo = document.getElementById("import-modo").value;
  const saida = document.getElementById("import-resultado");
  const linhas = parseLinhasImport(texto);
  if (!linhas.length) { saida.innerText = "Cola pelo menos uma linha."; return; }

  const porSlug = {};
  estado.todosOsTimes.forEach((t) => { porSlug[slugify(t.nome)] = t; });

  const atualizados = [], naoAchou = [], invalidas = [], inconsistentes = [];
  for (const cols of linhas) {
    const [nome, ...resto] = cols;
    const nums = resto.slice(0, 6).map((x) => parseInt(String(x).replace(/\./g, ""), 10));
    if (nums.length < 6 || nums.some((n) => Number.isNaN(n))) {
      // cabeçalho ou linha ruim: só reporta se não parecer cabeçalho
      if (resto.length && !/jogos|^j$/i.test(resto[0])) invalidas.push(nome || cols.join(" "));
      continue;
    }
    const t = porSlug[slugify(nome)];
    if (!t) { naoAchou.push(nome); continue; }

    const [j, v, e, d, gm, gs] = nums;
    if (j !== v + e + d) inconsistentes.push(`${nome} (J=${j}, V+E+D=${v + e + d})`);
    const base = modo === "somar"
      ? { jogos: (t.jogos || 0) + j, vitorias: (t.vitorias || 0) + v, empates: (t.empates || 0) + e, derrotas: (t.derrotas || 0) + d,
          golsMarcados: (t.golsMarcados || 0) + gm, golsSofridos: (t.golsSofridos || 0) + gs }
      : { jogos: j, vitorias: v, empates: e, derrotas: d, golsMarcados: gm, golsSofridos: gs };
    const pontos = base.vitorias * 3 + base.empates;
    const novo = {
      ...base, pontos,
      saldoGols: base.golsMarcados - base.golsSofridos,
      aproveitamento: base.jogos > 0 ? Math.round((pontos / (base.jogos * 3)) * 1000) / 10 : 0,
    };
    try {
      await updateDoc(doc(db, "times", slugify(t.nome)), novo);
      atualizados.push(t.nome);
    } catch (err) {
      invalidas.push(`${nome} (erro: ${err.message})`);
    }
  }

  saida.innerText =
    `✅ ${atualizados.length} time(s) atualizado(s)` +
    (naoAchou.length ? `\n⚠️ Não encontrei no banco (confere o nome): ${naoAchou.join(", ")}` : "") +
    (inconsistentes.length ? `\n⚠️ Jogos diferente de V+E+D (importei mesmo assim): ${inconsistentes.join("; ")}` : "") +
    (invalidas.length ? `\n⚠️ Linhas ignoradas: ${invalidas.join("; ")}` : "") +
    (atualizados.length ? "\nA setinha de subiu/desceu só se atualiza no próximo jogo de cada time." : "");
};
