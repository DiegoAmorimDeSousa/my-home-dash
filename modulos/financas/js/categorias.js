// Categorias, métodos de pagamento e suas cores.
import { estado } from "./estado.js";

export const CATEGORIAS = ["Contas", "Lanche", "Lazer", "Almoço", "Café", "Mercado", "Saúde", "Vestuária", "Casinha", "Outros"];
const colorMap = {
  Mercado: "#3b82f6", Lanche: "#f59e0b", Saúde: "#ef4444", Almoço: "#22c55e",
  Contas: "#a855f7", Lazer: "#ec4899", Casinha: "#00d4ff",
  Vestuária: "#eab308", Café: "#a16207", Outros: "#8b949e",
};
const METODO_LABEL_FIXO = { debito: "Débito", credito: "Crédito", cartao_mae: "Cartão Mãe" };

// Métodos que representam pagamento "diferido" (só saem de verdade
// quando a fatura é paga) — não entram nas somas/maior gasto/3 meses.
const METODOS_DIFERIDOS = ["credito", "cartao_mae"];

// "Cartão Mãe", "cartao mae" e "cartao_mae" são o mesmo método.
export function normMetodo(m) {
  return (m || "").toString().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}
export function chaveMetodo(m) {
  const n = normMetodo(m);
  if (!n || n === "indefinido") return "indefinido";
  return METODO_LABEL_FIXO[n] ? n : m;
}
export function ehDiferido(t) { return METODOS_DIFERIDOS.includes(normMetodo(t.metodo)); }
export function metodoLabel(metodo) {
  return METODO_LABEL_FIXO[normMetodo(metodo)] || metodo;
}

// Gera uma cor estável (sempre a mesma pra mesma string) pra categorias
// que não estão no colorMap fixo — assim categorias novas/personalizadas
// não ficam todas cinza "Outros", cada uma pega uma cor própria.
export function corPara(categoria) {
  if (colorMap[categoria]) return colorMap[categoria];
  let hash = 0;
  for (let i = 0; i < categoria.length; i++) hash = categoria.charCodeAt(i) + ((hash << 5) - hash);
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 65%, 58%)`;
}

// Categorias conhecidas = as fixas + qualquer categoria que já apareceu
// nos dados (inclusive as personalizadas que você já cadastrou antes).
export function categoriasConhecidas() {
  const vistas = new Set(CATEGORIAS);
  estado.transacoes.forEach((t) => { if (t.categoria) vistas.add(t.categoria); });
  return [...vistas];
}

// Mesma ideia pra método: 3 opções rápidas + qualquer valor que já
// apareceu nos dados (ex: "V.A" cadastrado direto no banco).
export function metodosConhecidos() {
  const vistos = new Set(["debito", "credito", "cartao_mae"]);
  estado.transacoes.forEach((t) => { if (t.metodo && t.metodo !== "indefinido") vistos.add(chaveMetodo(t.metodo)); });
  return [...vistos];
}
