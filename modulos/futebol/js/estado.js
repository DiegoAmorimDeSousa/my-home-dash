// Estado compartilhado entre as partes do módulo de futebol.
import { iniciarFrame } from "../../../shared/frame.js";

export const estado = {
  todosOsTimes: [],   // coleção "times" do Firestore (atualiza em tempo real)
  // nome do time → URL do escudo. É preenchido conforme a tabela desenha os
  // times da divisão selecionada, e usado pelo mata-mata pra mostrar os logos.
  logoDatabase: {},
};

const { avisarAltura } = iniciarFrame("frame-futebol");

export function sendHeight() {
  setTimeout(() => {
    const el = document.getElementById("futebol-content");
    if (!el) return;
    avisarAltura(el.scrollHeight);
  }, 200);
}
