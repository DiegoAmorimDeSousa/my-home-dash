// Notifica o boss com o dano da tarefa concluída
export function notifyBossDmg(dano) {
    window.parent.postMessage({ action: 'tarefaConcluida', dano }, '*');
}