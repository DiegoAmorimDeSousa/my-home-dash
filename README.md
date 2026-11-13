# my-home-dash

Painel da casa, hospedado no GitHub Pages. HTML/CSS/JS puro, sem build.

## Estrutura

```
index.html            painel principal (precisa ficar na raiz por causa do GitHub Pages)
painel/               CSS e JS do painel (relógio, modal expandir, liga/desliga com senha)
shared/
  firebase.js         conexão única com o Firebase (config + login anônimo)
  frame.js            comunicação módulo ↔ painel (frameId, altura do iframe)
  compacto.js         marca body.is-compact quando a URL tem ?compact=1
modulos/
  financas/           gestão financeira (Firestore: transacoes, orcamento)
  futebol/            tabela, mata-mata e campeões (Firestore: times, matamata, temporadas)
  tarefas/            checklist diário + boss (localStorage)
  valorant/           tabela VCT (planilha Google) — card desativado no painel
```

Cada módulo é uma página aberta num iframe pelo painel: `?compact=1` mostra o
card resumido; sem o parâmetro, a versão completa (usada no modal "Expandir").
