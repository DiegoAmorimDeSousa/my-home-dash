// Países, bandeiras e nomes → slug. Funções puras (sem DOM, sem banco).

export function semAcento(s) {
  return s.toString().normalize("NFD").replace(/[̀-ͯ]/g, "");
}
export function slugify(nome) {
  return semAcento(nome).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

// Windows não desenha emoji de bandeira (aparecem só as letras "BR"), então
// a bandeira é uma imagem pequena a partir do código do país (flagcdn.com).
// Se a imagem falhar, cai pro emoji. O código fica salvo em "paisCodigo" e o
// emoji em "bandeira".
export const PAISES = {
  "Brasil": "br", "Argentina": "ar", "Uruguai": "uy", "Chile": "cl", "Colômbia": "co", "Paraguai": "py",
  "Equador": "ec", "Peru": "pe", "Venezuela": "ve", "Bolívia": "bo", "México": "mx", "Estados Unidos": "us",
  "Canadá": "ca", "Costa Rica": "cr", "Espanha": "es", "Portugal": "pt", "Inglaterra": "gb-eng",
  "Escócia": "gb-sct", "País de Gales": "gb-wls", "Irlanda": "ie", "França": "fr", "Alemanha": "de",
  "Itália": "it", "Holanda": "nl", "Bélgica": "be", "Suíça": "ch", "Áustria": "at", "Turquia": "tr",
  "Grécia": "gr", "Rússia": "ru", "Ucrânia": "ua", "Polônia": "pl", "República Tcheca": "cz",
  "Eslováquia": "sk", "Hungria": "hu", "Romênia": "ro", "Bulgária": "bg", "Sérvia": "rs", "Croácia": "hr",
  "Eslovênia": "si", "Dinamarca": "dk", "Suécia": "se", "Noruega": "no", "Finlândia": "fi", "Islândia": "is",
  "Chipre": "cy", "Israel": "il", "Egito": "eg", "Marrocos": "ma", "Argélia": "dz", "Tunísia": "tn",
  "Nigéria": "ng", "Gana": "gh", "Senegal": "sn", "Camarões": "cm", "Costa do Marfim": "ci",
  "África do Sul": "za", "Japão": "jp", "Coreia do Sul": "kr", "China": "cn", "Arábia Saudita": "sa",
  "Catar": "qa", "Emirados Árabes": "ae", "Irã": "ir", "Austrália": "au", "Nova Zelândia": "nz",
  "Índia": "in", "Tailândia": "th",
};
const PAISES_NORM = {};
Object.entries(PAISES).forEach(([nome, cod]) => { PAISES_NORM[semAcento(nome).toLowerCase()] = cod; });

// aceita nome em português ("Espanha") ou o código direto ("es", "gb-eng")
export function resolvePais(entrada) {
  const s = (entrada || "").trim();
  if (!s) return null;
  if (/^[a-z]{2}(-[a-z]{3})?$/i.test(s)) return s.toLowerCase();
  return PAISES_NORM[semAcento(s).toLowerCase()] || null;
}
export function codigoParaEmoji(cod) {
  if (/^[a-z]{2}$/.test(cod || "")) {
    return String.fromCodePoint(...[...cod.toUpperCase()].map((ch) => 0x1f1e6 + ch.charCodeAt(0) - 65));
  }
  return "🏳️";
}
export function codigoDoTime(t) {
  return t.paisCodigo || (t.pais === "Brasil" ? "br" : "");
}
export function nomeDoPais(codigo) {
  const e = Object.entries(PAISES).find(([, c]) => c === codigo);
  return e ? e[0] : (codigo || "");
}

// Preenche o <datalist> de países (usado nos formulários de adicionar/editar).
export function preencherListaPaises() {
  const dl = document.getElementById("lista-paises");
  if (!dl.children.length) dl.innerHTML = Object.keys(PAISES).map((n) => `<option value="${n}">`).join("");
}
