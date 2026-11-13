// Avisa o pai que o estado do boss (no store local) mudou, pra ele
// re-renderizar. Nenhum valor de dano trafega mais entre iframes — cada um
// lê o mesmo localStorage (mesma origem) e decide sozinho como animar.
export function notifyBossChanged() {
    window.parent.postMessage({ action: 'bossStateChanged' }, '*');
}

// Avisa o pai que a lista de tarefas mudou (criada/excluída), pra ele
// propagar pra qualquer OUTRA instância de tarefas.html aberta ao mesmo
// tempo (ex: card compacto + modal expandido) redesenhar a lista.
export function notifyTasksChanged() {
    window.parent.postMessage({ action: 'tasksChanged' }, '*');
}
