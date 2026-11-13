// Orçamento do casal — modelo de dados e cálculo (sem DOM, sem banco).
// Cada mês é um documento em "orcamento/m-AAAA-MM".

export const PESSOAS = ["Diego", "Beatriz"];
export const r2 = (x) => Math.round(x * 100) / 100;
export const idMes = (chave) => `m-${chave}`;
export const novoId = () => "c" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
export const clonar = (o) => JSON.parse(JSON.stringify(o));

export function orcDocVazio(chave) {
  return {
    mes: chave, pct: 70, baseReserva: "essenciais",
    salarios: { Diego: { salario: 0, extras: [] }, Beatriz: { salario: 0, extras: [] } },
    contas: [], pagos: {}, criadoEm: new Date(),
  };
}

// Ponto de partida com os números da planilha do casal (botão opcional).
export function orcDocPlanilha(chave) {
  const d = orcDocVazio(chave);
  d.salarios = {
    Diego: { salario: 6442.51, extras: [{ nome: "VA", valor: 720.25 }, { nome: "Benefício - Swile", valor: 119.14 }] },
    Beatriz: { salario: 2262, extras: [{ nome: "VA", valor: 373.32 }] },
  };
  d.contas = [
    ["Internet", "essencial", 115, "proporcional"],
    ["Parcela da casa", "essencial", 1585.85, "Diego"],
    ["Luz", "essencial", 282.54, "proporcional"],
    ["Água", "essencial", 123.48, "proporcional"],
    ["Seguro carro", "essencial", 165.5, "proporcional"],
    ["Vôlei", "diverso", 80, "Beatriz"],
    ["Fatura Diego", "diverso", 952.89, "Diego"],
    ["Fatura Beatriz", "diverso", 598.01, "Beatriz"],
    ["Futebol", "diverso", 55, "Diego"],
  ].map(([nome, grupo, valor, responsavel]) => ({ id: novoId(), nome, grupo, valor, responsavel }));
  return d;
}

// Mês novo nasce como cópia do mês anterior (contas e salários), com os
// checks zerados — assim o que você mudar num mês não reescreve o histórico.
export function orcCopiaDe(origem, chave) {
  return {
    mes: chave, pct: origem.pct ?? 70, baseReserva: origem.baseReserva || "essenciais",
    salarios: clonar(origem.salarios || orcDocVazio(chave).salarios),
    contas: clonar(origem.contas || []), pagos: {}, criadoEm: new Date(),
  };
}

// Núcleo do cálculo. A divisão funciona assim:
//  • orçamento da pessoa = salário × % (70%); o resto é "livre" (só informativo);
//  • conta com responsável fixo (Diego/Beatriz) é 100% daquela pessoa;
//  • conta "proporcional" é dividida na proporção dos orçamentos das duas pessoas;
//  • sobra = orçamento − o que a pessoa tem que pagar.
export function calcularOrcamento(d) {
  const pct = Number(d.pct ?? 70);
  const orc = {}, livre = {}, extras = {};
  PESSOAS.forEach((p) => {
    const s = (d.salarios && d.salarios[p]) || { salario: 0, extras: [] };
    const sal = Number(s.salario) || 0;
    orc[p] = r2((sal * pct) / 100);
    livre[p] = r2(sal - orc[p]);
    extras[p] = r2((s.extras || []).reduce((a, e) => a + (Number(e.valor) || 0), 0));
  });
  const somaOrc = orc.Diego + orc.Beatriz;
  const share = somaOrc > 0 ? { Diego: orc.Diego / somaOrc, Beatriz: orc.Beatriz / somaOrc } : { Diego: 0.5, Beatriz: 0.5 };

  const linhas = { Diego: [], Beatriz: [] };
  let essenciais = 0, diversos = 0;
  (d.contas || []).forEach((c) => {
    const valor = Number(c.valor) || 0;
    if (c.grupo === "essencial") essenciais += valor; else diversos += valor;
    const base = { contaId: c.id, nome: c.nome, grupo: c.grupo, total: valor };
    if (PESSOAS.includes(c.responsavel)) {
      linhas[c.responsavel].push({ ...base, valor, fixa: true });
    } else {
      const vD = r2(valor * share.Diego);
      linhas.Diego.push({ ...base, valor: vD, fixa: false });
      linhas.Beatriz.push({ ...base, valor: r2(valor - vD), fixa: false });
    }
  });

  const pagos = d.pagos || {};
  const totais = {}, sobra = {}, pago = {}, falta = {};
  let pagas = 0, totalLinhas = 0, faltaGeral = 0;
  PESSOAS.forEach((p) => {
    totais[p] = r2(linhas[p].reduce((a, l) => a + l.valor, 0));
    sobra[p] = r2(orc[p] - totais[p]);
    pago[p] = 0; falta[p] = 0;
    linhas[p].forEach((l) => {
      totalLinhas++;
      if (pagos[`${l.contaId}__${p}`]) { pagas++; pago[p] += l.valor; } else { falta[p] += l.valor; faltaGeral += l.valor; }
    });
    pago[p] = r2(pago[p]); falta[p] = r2(falta[p]);
  });

  essenciais = r2(essenciais); diversos = r2(diversos);
  const total = r2(essenciais + diversos);
  const reserva = r2((d.baseReserva === "todas" ? total : essenciais) * 6);
  return { pct, orc, livre, extras, share, linhas, totais, sobra, pago, falta, essenciais, diversos, total, reserva, pagas, totalLinhas, faltaGeral: r2(faltaGeral) };
}
