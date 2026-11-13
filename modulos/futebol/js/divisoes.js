// Divisões dinâmicas (A, B, C...) por grupo (Brasil / Mundo), com limite de
// times por divisão.
import { estado } from "./estado.js";

export const LIMITE_DIVISAO = 30; // mesmo número do Apps Script

export function divisoesDe(pais) {
  const letras = [...new Set(estado.todosOsTimes.filter((t) => t.pais === pais).map((t) => t.divisao))].sort();
  return letras.length ? letras : ["A"];
}
export function contagem(pais, divisao) {
  return estado.todosOsTimes.filter((t) => t.pais === pais && t.divisao === divisao).length;
}
export function proximaLetra(l) {
  return String.fromCharCode(Math.min(l.charCodeAt(0) + 1, 90));
}
// Se a divisão escolhida está cheia, o time desce pra próxima com vaga
// (criando a divisão nova se preciso).
export function alocarDivisao(pais, escolhida) {
  let letra = escolhida;
  while (contagem(pais, letra) >= LIMITE_DIVISAO && letra !== "Z") letra = proximaLetra(letra);
  return letra;
}

// <option>s de divisão pros formulários: as que existem + "Nova divisão X".
// Devolve as letras existentes e a lista completa (existentes + nova).
export function opcoesDivisao(grupo, sel) {
  const letras = divisoesDe(grupo);
  const nova = proximaLetra(letras[letras.length - 1]);
  const todas = letras.includes(nova) ? letras : [...letras, nova];
  sel.innerHTML = todas.map((l) => letras.includes(l)
    ? `<option value="${l}">Divisão ${l} (${contagem(grupo, l)}/${LIMITE_DIVISAO})</option>`
    : `<option value="${l}">+ Nova divisão ${l} (0/${LIMITE_DIVISAO})</option>`).join("");
  return { letras, todas };
}
