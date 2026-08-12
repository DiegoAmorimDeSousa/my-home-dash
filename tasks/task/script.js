import { init } from './task.js';

// task.js já roda o init() (rollover + primeira renderização) ao ser
// importado. Aqui só re-checamos periodicamente a virada de dia — útil se
// o painel ficar aberto passando da meia-noite (ex: tablet fixo em casa).
setInterval(init, 60000);
