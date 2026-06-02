export function updateProgressBars(c) {
    const pD = c.dT ? Math.round((c.dH/c.dT)*100) : 0;
    const pB = c.bT ? Math.round((c.bH/c.bT)*100) : 0;
    document.getElementById('pct-diego').innerText = pD+'%';
    document.getElementById('bar-diego').style.width = pD+'%';
    document.getElementById('sub-diego').innerText   = `${c.dH} de ${c.dT} tarefas concluídas hoje`;
    document.getElementById('pct-bia').innerText     = pB+'%';
    document.getElementById('bar-bia').style.width   = pB+'%';
    document.getElementById('sub-bia').innerText     = `${c.bH} de ${c.bT} tarefas concluídas hoje`;
}

export function updateStats(c) {
    document.getElementById('d-hoje').innerText = `${c.dH}/${c.dT}`;
    document.getElementById('d-sem').innerText  = c.ds;
    document.getElementById('d-mes').innerText  = c.dm;
    document.getElementById('d-top').innerText  = Object.entries(c.df).sort((a,b)=>b[1]-a[1])[0]?.[0]||'-';
    document.getElementById('b-hoje').innerText = `${c.bH}/${c.bT}`;
    document.getElementById('b-sem').innerText  = c.bs;
    document.getElementById('b-mes').innerText  = c.bm;
    document.getElementById('b-top').innerText  = Object.entries(c.bf).sort((a,b)=>b[1]-a[1])[0]?.[0]||'-';
}

export function renderGraph(id, data) {
    const el = document.getElementById(id);
    el.innerHTML = '';
    const hoje = new Date();
    for(let i=29; i>=0; i--){
        const d = new Date(hoje - i*24*60*60*1000);
        const dia = String(d.getDate()).padStart(2,'0');
        const mes = String(d.getMonth()+1).padStart(2,'0');
        const ano = d.getFullYear();
        const chave = `${dia}/${mes}/${ano}`;
        const n = data[chave]||0;
        const c = document.createElement('div');
        c.className='graph-cube';
        c.setAttribute('data-info',`${chave}: ${n} concluída(s)`);
        if(n>0&&n<=2)      c.classList.add('level-1');
        else if(n>2&&n<=4) c.classList.add('level-2');
        else if(n>4&&n<=6) c.classList.add('level-3');
        else if(n>6)       c.classList.add('level-4');
        el.appendChild(c);
    }
}

export function calcInsights(tasksMap, todayList, prefix) {
    console.log('tasksMap', tasksMap)
    console.log('todayList', todayList)
    console.log('prefix', prefix)
    let maxStreak=0, streakTasks=[];
    let maxProc=0, procTasks=[];
    let nuncaFeitas=[];
    const hoje = new Date();

    todayList.forEach(t=>{
        const temOk = tasksMap[t] && Object.values(tasksMap[t]).some(v=>v===true);
        if(!temOk) nuncaFeitas.push(t);
    });

    Object.entries(tasksMap).forEach(([nome,log])=>{
        let primeira=null, ultima=null;
        for(let i=60;i>=0;i--){
            const d=new Date(hoje-i*24*60*60*1000);
            const k=`${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
            if(log[k]===true){ if(!primeira)primeira=new Date(d); ultima=new Date(d); }
        }
        if(primeira){
        let cur=0,high=0,di=new Date(primeira);
        while(di<=hoje){
            const k=`${String(di.getDate()).padStart(2,'0')}/${String(di.getMonth()+1).padStart(2,'0')}/${di.getFullYear()}`;
            if(log[k]===true){cur++;if(cur>high)high=cur;}else cur=0;
            di.setTime(di.getTime()+86400000);
        }
        if(high>0){ if(high>maxStreak){maxStreak=high;streakTasks=[nome];}else if(high===maxStreak)streakTasks.push(nome); }
        if(ultima){
            const diff=Math.floor((new Date(hoje.toDateString())-new Date(ultima.toDateString()))/86400000);
            if(diff>0){ if(diff>maxProc){maxProc=diff;procTasks=[nome];}else if(diff===maxProc)procTasks.push(nome); }
        }
        }
    });

    document.getElementById(`${prefix}-streak-name`).innerText = streakTasks.join(', ')||'—';
    document.getElementById(`${prefix}-streak-val`).innerText  = maxStreak+'d';
    document.getElementById(`${prefix}-proc-name`).innerText   = procTasks.join(', ')||'—';
    document.getElementById(`${prefix}-proc-val`).innerText    = maxProc+'d';
    if(nuncaFeitas.length){
        document.getElementById(`${prefix}-never-name`).innerText = nuncaFeitas.join(', ');
        document.getElementById(`${prefix}-never-val`).innerText  = 'Pendente';
    } else {
        document.getElementById(`${prefix}-never-name`).innerText = 'Nenhuma';
        document.getElementById(`${prefix}-never-val`).innerText  = '-';
    }
}