// Painel principal (index.html): relógio, modal de expandir módulo,
// liga/desliga de painéis com senha e repasse de mensagens entre iframes.
const SENHA_CORRETA = "08052021";
let painelPendenteAtivacao = null;

// Relógio
function atualizarRelogio() {
  const agora = new Date();
  document.getElementById('clock').innerText =
    agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
setInterval(atualizarRelogio, 1000);
atualizarRelogio();

// Mensagens dos iframes (resize do modal + estado do boss)
window.addEventListener('message', function(e) {
  // Resize dinâmico SÓ para os iframes do modal expandido — os cards
  // compactos ficam com altura fixa via CSS pra manter as 4 colunas uniformes.
  if (e.data.height && (e.data.id === 'modal-frame' || e.data.id === 'modal-frame-2')) {
    const frame = document.getElementById(e.data.id);
    if (frame && frame.style.display !== 'none') {
      frame.style.height = (e.data.height + 20) + 'px';
    }
  }

  // Tarefas gravou algo novo no localStorage local → avisa QUALQUER iframe
  // que esteja mostrando o boss pra ele reler o estado e se re-renderizar
  // (o card compacto "frame-rpg" e, se estiver aberto, o modal expandido).
  // Nenhum valor de dano trafega mais entre iframes — todos leem o mesmo
  // localStorage (mesma origem), a mensagem é só um "ping" pra atualizar na hora.
  if (e.data.action === 'bossStateChanged') {
    document.querySelectorAll('iframe').forEach(f => {
      if (f.src && f.src.includes('/tarefas/boss.html') && f.style.display !== 'none') {
        f.contentWindow.postMessage({ action: 'bossStateChanged' }, '*');
      }
    });
  }

  // Mesma lógica pra tarefas: se o modal expandido criar/excluir uma
  // tarefa, o card compacto (e vice-versa) precisa saber pra redesenhar.
  if (e.data.action === 'tasksChanged') {
    document.querySelectorAll('iframe').forEach(f => {
      if (f.src && f.src.includes('/tarefas/tarefas.html') && f.style.display !== 'none') {
        f.contentWindow.postMessage({ action: 'tasksChanged' }, '*');
      }
    });
  }
});

// ── EXPANDIR / FECHAR MODAL ──
function expandModule(id, url, titulo) {
  document.getElementById('expand-title').innerText = titulo;
  const f2 = document.getElementById('modal-frame-2');
  f2.style.display = 'none';
  f2.src = 'about:blank';

  const iframe = document.getElementById('modal-frame');
  iframe.style.height = '400px';
  const sep = url.includes('?') ? '&' : '?';
  iframe.src = url + sep + 'frameId=modal-frame';
  document.getElementById('modal-expand').classList.add('active');
}

// Caso especial: Tarefas mostra Boss + Checklist completos empilhados no modal
function expandTarefas() {
  document.getElementById('expand-title').innerText = '📋 Tarefas & Boss';

  const f1 = document.getElementById('modal-frame');
  f1.style.height = '420px';
  f1.src = 'modulos/tarefas/boss.html?frameId=modal-frame';

  const f2 = document.getElementById('modal-frame-2');
  f2.style.display = 'block';
  f2.style.height = '400px';
  f2.src = 'modulos/tarefas/tarefas.html?frameId=modal-frame-2';

  document.getElementById('modal-expand').classList.add('active');
}

function fecharExpandido() {
  document.getElementById('modal-expand').classList.remove('active');
  document.getElementById('modal-frame').src = 'about:blank';
  const f2 = document.getElementById('modal-frame-2');
  f2.src = 'about:blank';
  f2.style.display = 'none';
}

// ── LIGAR / DESLIGAR PAINÉIS (suporta grupos com mais de 1 iframe) ──
const PAINEIS = {
  tarefasgroup: { container: 'container-tarefasgroup', frames: ['frame-rpg', 'frame-tarefas'] },
  financas:     { container: 'container-financas',     frames: ['frame-financas'] },
  // valorant: desativado junto com o HTML do card — reativa os dois juntos
  futebol:      { container: 'container-futebol',      frames: ['frame-futebol'] },
};

function aplicarEstadoInicial() {
  Object.keys(PAINEIS).forEach(id => {
    if (localStorage.getItem(`painel-${id}`) === 'off') {
      const cfg = PAINEIS[id];
      const container = document.getElementById(cfg.container);
      const botao = container.querySelector('.toggle-btn');
      cfg.frames.forEach(fid => { document.getElementById(fid).style.display = 'none'; });
      botao.textContent = 'Ligar';
      botao.classList.add('off');
    }
  });
}

function controlePainel(id) {
  const cfg = PAINEIS[id];
  const container = document.getElementById(cfg.container);
  const botao = container.querySelector('.toggle-btn');
  const primeiraFrame = document.getElementById(cfg.frames[0]);

  if (primeiraFrame.style.display !== 'none') {
    cfg.frames.forEach(fid => { document.getElementById(fid).style.display = 'none'; });
    botao.textContent = 'Ligar';
    botao.classList.add('off');
    localStorage.setItem(`painel-${id}`, 'off');
  } else {
    painelPendenteAtivacao = id;
    abrirModal();
  }
}

function abrirModal() {
  const input = document.getElementById('input-senha');
  input.value = '';
  document.getElementById('modal-senha').classList.add('active');
  input.focus();
}

function fecharModal() {
  document.getElementById('modal-senha').classList.remove('active');
  painelPendenteAtivacao = null;
}

function validarSenha() {
  const input = document.getElementById('input-senha');
  if (input.value === SENHA_CORRETA) {
    const id  = painelPendenteAtivacao;
    const cfg = PAINEIS[id];
    const container = document.getElementById(cfg.container);
    const botao = container.querySelector('.toggle-btn');
    cfg.frames.forEach(fid => { document.getElementById(fid).style.display = 'block'; });
    botao.textContent = 'Desligar';
    botao.classList.remove('off');
    localStorage.removeItem(`painel-${id}`);
    fecharModal();
  } else {
    alert('Senha incorreta!');
    input.value = '';
    input.focus();
  }
}

document.getElementById('input-senha').addEventListener('keyup', e => {
  if (e.key === 'Enter') validarSenha();
});

aplicarEstadoInicial();
