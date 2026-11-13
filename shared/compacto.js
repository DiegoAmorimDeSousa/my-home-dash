// Script comum (não-module) carregado no começo do <body> de cada módulo:
// marca a página como compacta ANTES de desenhar, pro CSS do modo resumido
// valer desde o primeiro frame.
if (new URLSearchParams(location.search).get("compact") === "1") {
  document.body.classList.add("is-compact");
}
