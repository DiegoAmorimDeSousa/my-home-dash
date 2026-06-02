import { loadTasks } from './task.js';

function parseImportancia(raw) {
    if (!raw) return 'baixa';
    const r = raw.toLowerCase().trim();
    if (r.startsWith('alta'))  return 'alta';
    if (r.startsWith('média') || r.startsWith('media')) return 'media';
    return 'baixa';
}

loadTasks();
setInterval(loadTasks, 30000);