// Comunicação de um módulo com o painel (index.html), que o abre num iframe.
//
// URL do módulo:
//   ?compact=1     → versão resumida (card do painel)
//   ?frameId=xxx   → id do <iframe> no painel; vai junto da altura pra ele
//                    saber qual iframe redimensionar (usado no modal expandido)
//
// A classe "is-compact" no <body> é colocada por shared/compacto.js, que roda
// antes da página desenhar (evita "piscar" o layout completo).
const params = new URLSearchParams(location.search);

export const isCompact = params.get("compact") === "1";

export function iniciarFrame(idPadrao) {
  const frameId = params.get("frameId") || idPadrao;
  return {
    frameId,
    // Manda a altura do conteúdo pro painel ajustar o iframe.
    avisarAltura(altura) {
      window.parent.postMessage({ height: altura, id: frameId }, "*");
    },
  };
}
