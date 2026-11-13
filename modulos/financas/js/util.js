// Formatação de moeda/datas e helpers genéricos (funções puras).

export const MESES_PT = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

// R$ 1.234,56
export const brl = (v) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

// "2026-11" — chave de mês usada nos filtros e nos documentos de orçamento
export function chaveMes(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; }

// "2026-11" → "Novembro 2026"
export function rotuloMes(chave) {
  if (chave === "todos") return "Todos os meses";
  const [y, m] = chave.split("-");
  return `${MESES_PT[Number(m) - 1]} ${y}`;
}

// Date → "Novembro"
export function mesLabel(date) {
  const label = date.toLocaleDateString("pt-BR", { month: "long" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function formatDataHora(timestamp) {
  if (!timestamp || !timestamp.toDate) return "--";
  const d = timestamp.toDate();
  const dia = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  const hora = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return `${dia}<br><span style="font-size:0.7rem">${hora}</span>`;
}

// escapa texto pra usar dentro de HTML/atributos
export const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
