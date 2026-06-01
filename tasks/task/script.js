import { loadTasks } from './task.js';

const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbxZDNq7MoIRgeBvzbaslBjpeMfY-Vm4gw5yTr8O1zgENE7zucykP7AFCJlE4Dg3RtVY/exec";

function setLocalDone(owner, task) { const d=getLocalDone(); d[`${owner}::${task}`]=true; localStorage.setItem(getLocalKey(),JSON.stringify(d)); }

// Extrai importância da string da coluna D (ex: "Alta (Saúde/Tratamento dermatológico)")
function parseImportancia(raw) {
    if (!raw) return 'baixa';
    const r = raw.toLowerCase().trim();
    if (r.startsWith('alta'))  return 'alta';
    if (r.startsWith('média') || r.startsWith('media')) return 'media';
    return 'baixa';
}

loadTasks();
setInterval(loadTasks, 30000);