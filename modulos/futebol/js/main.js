// Ponto de entrada do módulo de futebol: login + escuta do Firestore.
//
//   estado.js    estado compartilhado + envio de altura pro painel
//   paises.js    países, bandeiras, slug (funções puras)
//   divisoes.js  divisões A/B/C... e limite por divisão
//   tabela.js    tabela de classificação, filtros de divisão, cards de destaque
//   times.js     adicionar / editar time, importar totais
//   mata-mata.js chaveamento + ações no Apps Script
//   campeoes.js  salão dos campeões
import { db, entrar, collection, onSnapshot, query, orderBy } from "../../../shared/firebase.js";
import { estado } from "./estado.js";
import { renderFiltros, renderTabela } from "./tabela.js";
import { renderBracket, setConfrontos } from "./mata-mata.js";
import { renderHallOfFame } from "./campeoes.js";
import "./times.js"; // registra os handlers dos formulários (onclick no HTML)

async function iniciar() {
  try {
    await entrar();
  } catch (e) {
    console.error("Erro no login anônimo:", e);
    return;
  }

  onSnapshot(collection(db, "times"), (snapshot) => {
    estado.todosOsTimes = snapshot.docs.map((d) => d.data());
    renderFiltros();
    renderTabela();
    renderBracket(); // logos podem ter mudado
  });

  onSnapshot(collection(db, "matamata"), (snapshot) => {
    setConfrontos(snapshot.docs.map((d) => d.data()));
    renderBracket();
  });

  onSnapshot(query(collection(db, "temporadas"), orderBy("ano", "desc")), (snapshot) => {
    renderHallOfFame(snapshot.docs.map((d) => d.data()));
  });
}

iniciar();
