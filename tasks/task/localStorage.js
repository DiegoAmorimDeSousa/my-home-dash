// ─── localStorage ─────────────────────────────────────────────────────────
export function getLocalKey() { return `tasks_done_${new Date().toLocaleDateString('pt-BR')}`; }
export function getLocalDone() { try { return JSON.parse(localStorage.getItem(getLocalKey())||'{}'); } catch{ return {}; } }
export function removeLocalDone(owner, task) { const d=getLocalDone(); delete d[`${owner}::${task}`]; localStorage.setItem(getLocalKey(),JSON.stringify(d)); }
export function isDoneForDisplay(owner, task, sheetStatus) { return sheetStatus==='OK'||isLocalDone(owner,task); }
export function isLocalDone(owner, task) { return !!getLocalDone()[`${owner}::${task}`]; }
export function cleanOldLocalKeys() {
    const k=getLocalKey();
        Object.keys(localStorage).forEach(kk=>{ if(kk.startsWith('tasks_done_')&&kk!==k) localStorage.removeItem(kk); });
}