// Ponto de entrada do módulo de finanças: login, escuta do Firestore e abas.
//
//   estado.js          transações em memória + envio de altura pro painel
//   util.js            moeda, datas, meses (funções puras)
//   categorias.js      categorias, métodos de pagamento, cores
//   visao-geral.js     aba "Visão geral" (renderTudo junta tudo)
//   graficos.js        gráficos Chart.js
//   movimentacoes.js   lista de transações: filtros, edição, exclusão
//   ultimos-meses.js   card "Últimos 3 meses"
//   orcamento/         aba "Contas do mês" (calculo.js puro + orcamento.js tela)
import { db, entrar, collection, query, orderBy, onSnapshot } from "../../../shared/firebase.js";
import { enviarAltura } from "./estado.js";
import { renderTudo } from "./visao-geral.js";
import { receberOrcamento, renderOrcamento } from "./orcamento/orcamento.js";

// ── abas ──
window.mudarAba = function (aba) {
  document.getElementById("view-geral").classList.toggle("aba-oculta", aba !== "geral");
  document.getElementById("view-contas").classList.toggle("aba-oculta", aba !== "contas");
  document.querySelectorAll(".tab-btn").forEach((b) => b.classList.toggle("active", b.dataset.v === aba));
  if (aba === "contas") renderOrcamento();
  enviarAltura();
};

async function iniciar() {
  try {
    await entrar();
  } catch (e) {
    console.error("Erro no login anônimo:", e);
    document.getElementById("top3-list").innerHTML = '<div class="top3-vazio">Erro de login</div>';
    return;
  }

  const q = query(collection(db, "transacoes"), orderBy("data", "desc"));
  onSnapshot(
    q,
    (snapshot) => {
      const transacoes = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      renderTudo(transacoes);
    },
    (err) => {
      console.error("Erro lendo Firestore:", err);
      document.getElementById("top3-list").innerHTML = '<div class="top3-vazio">Erro ao ler o banco</div>';
    }
  );

  onSnapshot(
    collection(db, "orcamento"),
    (snapshot) => receberOrcamento(snapshot.docs),
    (err) => { console.error("Erro lendo orçamento:", err); }
  );
}

iniciar();
