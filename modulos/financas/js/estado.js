// Estado compartilhado do módulo de finanças + envio de altura pro painel.
import { iniciarFrame } from "../../../shared/frame.js";

export const estado = {
  transacoes: [], // cache local pra reabrir edição sem esperar novo snapshot
  semCredito: [], // idem, mas já sem os lançamentos diferidos (crédito/cartão mãe)
};

const { avisarAltura } = iniciarFrame("frame-financas");

export function enviarAltura() {
  setTimeout(() => {
    const el = document.getElementById("content-wrapper");
    if (el) avisarAltura(el.offsetHeight);
  }, 150);
}
