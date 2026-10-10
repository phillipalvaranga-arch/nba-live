const API='https://site.web.api.espn.com/apis/site/v2/sports/basketball/nba',API2='https://site.api.espn.com/apis/site/v2/sports/basketball/nba',STD='https://site.web.api.espn.com/apis/v2/sports/basketball/nba/standings';
const TZ='America/Chicago',$=s=>document.querySelector(s),app=$('#app');let timer=null;
const favs=()=>JSON.parse(localStorage.favs||'[]'),isFav=id=>favs().includes(String(id));
function togFav(id){id=String(id);let f=favs();f=f.includes(id)?f.filter(x=>x!==id):[...f,id];localStorage.favs=JSON.stringify(f);route()}
const j=async u=>{try{const r=await fetch(u);if(!r.ok)throw Error(r.status);return await r.json()}catch(e){if(!u.startsWith(API+'/'))throw e;const r=await fetch(u.replace(API,API2));if(!r.ok)throw Error(r.status);return r.json()}};
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const ctDate=(d=new Date())=>new Intl.DateTimeFormat('en-CA',{timeZone:TZ}).format(d);
const ctTime=s=>new Date(s).toLocaleTimeString('en-US',{timeZone:TZ,hour:'numeric',minute:'2-digit'})+' CT';
const star=id=>`<button class="star ${isFav(id)?'on':''}" onclick="event.preventDefault();event.stopPropagation();togFav('${id}')" title="Favorite">★</button>`;
function status(c){const t=c.status.type;if(t.state==='in')return `<span class="live">${esc(t.shortDetail)}</span>`;if(t.state==='pre')return ctTime(c.date);return esc(t.shortDetail)}
function schedule(ms){clearTimeout(timer);timer=setTimeout(()=>{if(!document.hidden)route(true);else schedule(ms)},ms)}
async function games(q){
  const date=q.get('d')||ctDate();app.innerHTML||='';
  const d=await j(`${API}/scoreboard?dates=${date.replace(/-/g,'')}`);
  let ev=d.events||[];const f=favs();
  ev.sort((a,b)=>{const fa=a.competitions[0].competitors.some(x=>f.includes(x.team.id)),fb=b.competitions[0].competitors.some(x=>f.includes(x.team.id));return fb-fa});
  const live=ev.some(e=>e.status.type.state==='in');
  const shift=n=>{const x=new Date(date+'T12:00:00');x.setDate(x.getDate()+n);return x.toISOString().slice(0,10)};
  app.innerHTML=`<div class="bar"><button onclick="location.hash='#/?d=${shift(-1)}'">◀</button>
   <input type="date" value="${date}" onchange="location.hash='#/?d='+this.value"><button onclick="location.hash='#/?d=${shift(1)}'">▶</button>
   <button onclick="location.hash='#/'">Today</button><span class="muted">${live?'<span class="live">LIVE</span> auto-refresh 15s':''} ${ev.length} game(s)</span></div>
   <div class="grid">${ev.map(e=>{const c=e.competitions[0],cs=[...c.competitors].sort(a=>a.homeAway==='away'?-1:1),fin=c.status.type.completed,fav=cs.some(x=>f.includes(x.team.id));
    const ld=(c.leaders||[]).find(l=>l.name==='points');
    return `<a class="card ${fav?'fav':''}" href="#/game/${e.id}"><div class="st"><span>${status(c)}</span><span>${esc(c.broadcasts?.[0]?.names?.join(', ')||'')}</span></div>
    ${cs.map(t=>`<div class="row ${fin&&!t.winner?'lose':''}"><img src="${t.team.logo}" alt="" loading="lazy">${star(t.team.id)}<span class="n">${esc(t.team.shortDisplayName)} <small class="muted">${esc(t.records?.[0]?.summary||'')}</small></span><span class="s">${c.status.type.state==='pre'?'':t.score}</span></div>`).join('')}
    ${c.status.type.state!=='pre'?cs.map(t=>{const l=(t.leaders||[]).find(x=>x.name==='points')?.leaders?.[0];return l?`<div class="leader">${esc(t.team.abbreviation)}: ${esc(l.athlete.shortName)} ${l.displayValue} PTS</div>`:''}).join(''):''}</a>`}).join('')||'<p class="muted">No games on this date.</p>'}</div>`;
  if(live||ev.some(e=>e.status.type.state==='pre'&&new Date(e.date)-Date.now()<9e5))schedule(15000);
}
async function game(id,q){
  const d=await j(`${API}/summary?event=${id}`),h=d.header.competitions[0],cs=[...h.competitors].sort(a=>a.homeAway==='away'?-1:1),tab=q.get('t')||'box';
  const st=h.status.type;
  let html=`<div class="bar"><button onclick="history.back()">← Back</button></div><div class="card"><div class="hero">${cs.map((t,i)=>`<div><img src="${t.team.logos?.[0]?.href||t.team.logo}" alt=""><div>${star(t.team.id)}<b>${esc(t.team.displayName)}</b></div><div class="muted">${esc(t.record?.[0]?.displayValue||'')}</div></div>${i===0?`<div><div class="sc">${cs[0].score??'-'} – ${cs[1].score??'-'}</div><div>${st.state==='in'?`<span class="live">${esc(st.shortDetail)}</span>`:st.state==='pre'?ctTime(h.date):esc(st.detail)}</div></div>`:''}`).join('')}</div></div>`;
  const per=Math.max(4,...cs.map(t=>(t.linescores||[]).length));
  if(cs[0].linescores){html+=`<h2>Score by Quarter</h2><div class="tw"><table><tr><th>Team</th>${[...Array(per)].map((_,i)=>`<th>${i<4?'Q'+(i+1):'OT'+(i>4?i-3:'')}</th>`).join('')}<th>T</th></tr>${cs.map(t=>`<tr><td>${esc(t.team.abbreviation)}</td>${[...Array(per)].map((_,i)=>`<td>${t.linescores?.[i]?.displayValue??''}</td>`).join('')}<td><b>${t.score}</b></td></tr>`).join('')}</table></div>`}
  html+=`<div class="tabs">${[['box','Box Score'],['plays','Play-by-Play'],['team','Team Stats']].map(([k,v])=>`<button class="${tab===k?'on':''}" onclick="location.hash='#/game/${id}?t=${k}'">${v}</button>`).join('')}</div>`;
  if(tab==='box'){for(const p of d.boxscore.players||[]){const s=p.statistics[0];if(!s)continue;const pi=s.labels.indexOf('PTS');
    const pts=s.athletes.filter(a=>a.stats?.length).map(a=>+a.stats[pi]||0),top=[...pts].sort((a,b)=>b-a).slice(0,3).filter(x=>x>0);
    html+=`<h2><img src="${p.team.logo}" style="width:22px;vertical-align:middle"> ${esc(p.team.displayName)}</h2><div class="tw"><table><tr><th>Player</th>${s.labels.map(l=>`<th>${l}</th>`).join('')}</tr>${s.athletes.map(a=>`<tr class="${a.stats?.length&&top.includes(+a.stats[pi])?'top':''}"><td>${esc(a.athlete.shortName||a.athlete.displayName)} <small class="muted">${esc(a.athlete.position?.abbreviation||'')}${a.starter?' ·S':''}</small></td>${a.stats?.length?a.stats.map(x=>`<td>${x}</td>`).join(''):`<td colspan="${s.labels.length}" class="muted" style="text-align:left">${esc(a.reason||'DNP')}</td>`}</tr>`).join('')}${s.totals?`<tr><td><b>TOTAL</b></td>${s.totals.map(x=>`<td><b>${x}</b></td>`).join('')}</tr>`:''}</table></div>`}
    if(!(d.boxscore.players||[]).length)html+='<p class="muted">Box score available once the game starts.</p>'}
  if(tab==='plays'){const pl=(d.plays||[]).slice().reverse();html+=pl.length?`<div class="card plays" style="padding:0">${pl.map(p=>`<div class="${p.scoringPlay?'sp':''}"><b>${esc(p.period?.displayValue?.replace(' Quarter','')||'')} ${esc(p.clock?.displayValue)}</b> · ${p.awayScore}-${p.homeScore} · ${esc(p.text)}</div>`).join('')}</div>`:'<p class="muted">No play-by-play yet.</p>'}
  if(tab==='team'){const T=d.boxscore.teams||[];if(T.length){const names=T[0].statistics.map(s=>s.label);html+=`<div class="tw"><table><tr><th>Stat</th>${T.map(t=>`<th>${esc(t.team.abbreviation)}</th>`).join('')}</tr>${names.map((n,i)=>`<tr><td>${esc(n)}</td>${T.map(t=>`<td>${esc(t.statistics[i]?.displayValue)}</td>`).join('')}</tr>`).join('')}</table></div>`}}
  app.innerHTML=html;if(st.state==='in')schedule(15000);
}
async function standings(){
  const d=await j(STD),f=favs();const g=(e,n)=>e.stats.find(s=>s.name===n||s.type===n)?.displayValue??'';
  app.innerHTML=d.children.map(c=>{const en=[...c.standings.entries].sort((a,b)=>(+g(b,'winPercent')-+g(a,'winPercent'))||(+g(a,'gamesBehind')||0)-(+g(b,'gamesBehind')||0));
   return `<h2>${esc(c.name)}</h2><div class="tw"><table><tr><th>#  Team</th><th>W</th><th>L</th><th>PCT</th><th>GB</th><th>Home</th><th>Road</th><th>L10</th><th>Strk</th><th>Diff</th></tr>${en.map((e,i)=>`<tr ${f.includes(e.team.id)?'class="top"':''}><td>${i+1}. <img src="${e.team.logos?.[0]?.href}" style="width:18px;vertical-align:middle"> <a style="color:inherit" href="#/team/${e.team.id}">${esc(e.team.shortDisplayName)}</a></td><td>${g(e,'wins')}</td><td>${g(e,'losses')}</td><td>${g(e,'winPercent')}</td><td>${g(e,'gamesBehind')}</td><td>${g(e,'Home')}</td><td>${g(e,'Road')}</td><td>${g(e,'Last Ten Games')}</td><td>${g(e,'streak')}</td><td>${g(e,'differential')}</td></tr>`).join('')}</table></div>`}).join('');
}
async function teams(){
  const d=await j(STD),f=favs();let t=d.children.flatMap(c=>c.standings.entries.map(e=>({...e.team,rec:e.stats.find(s=>s.name==='overall')?.displayValue||'',conf:c.abbreviation||c.name})));t.sort((a,b)=>(f.includes(b.id)-f.includes(a.id))||a.displayName.localeCompare(b.displayName));
  app.innerHTML=`<p class="muted">${t.length} teams · tap ★ to pin favorites</p><div class="grid">${t.map(x=>`<a class="card ${f.includes(x.id)?'fav':''}" href="#/team/${x.id}"><div class="row"><img src="${x.logos?.[0]?.href}" alt="">${star(x.id)}<span class="n">${esc(x.displayName)}</span><span class="muted">${esc(x.rec)}</span></div></a>`).join('')}</div>`;
}
async function team(id){
  const [t,r,s]=await Promise.all([j(`${API}/teams/${id}`),j(`${API}/teams/${id}/roster`),j(`${API}/teams/${id}/schedule`).catch(()=>({events:[]}))]);const tm=t.team;
  const nx=tm.nextEvent?.[0];
  app.innerHTML=`<div class="bar"><button onclick="history.back()">← Back</button></div><div class="card"><div class="row"><img src="${tm.logos?.[0]?.href}" style="width:64px;height:64px">${star(id)}<span class="n" style="font-size:22px">${esc(tm.displayName)}</span><span>${esc(tm.record?.items?.[0]?.summary||'')} <span class="muted">${esc(tm.standingSummary||'')}</span></span></div>${nx?`<div class="muted">Next: ${esc(nx.shortName)} · ${new Date(nx.date).toLocaleString('en-US',{timeZone:TZ,weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})} CT</div>`:''}</div>
  <h2>Roster</h2><div class="tw"><table><tr><th>Player</th><th>#</th><th>Pos</th><th>Age</th><th>Ht</th><th>Wt</th><th>College</th></tr>${(r.athletes||[]).map(a=>`<tr><td><img src="${a.headshot?.href||''}" style="width:28px;vertical-align:middle;border-radius:50%" onerror="this.remove()"> ${esc(a.displayName)}${a.injuries?.length?' <span class="live" title="Injury">INJ</span>':''}</td><td>${esc(a.jersey||'')}</td><td>${esc(a.position?.abbreviation)}</td><td>${a.age||''}</td><td>${esc(a.displayHeight||'')}</td><td>${esc(a.displayWeight||'')}</td><td>${esc(a.college?.name||'')}</td></tr>`).join('')}</table></div>
  <h2>Schedule</h2><div class="tw"><table><tr><th>Date</th><th>Matchup</th><th>Result</th></tr>${(s.events||[]).map(e=>{const c=e.competitions[0],me=c.competitors.find(x=>x.id==id),fin=c.status.type.completed;return `<tr><td>${new Date(e.date).toLocaleDateString('en-US',{timeZone:TZ,month:'short',day:'numeric'})}</td><td><a style="color:inherit" href="#/game/${e.id}">${esc(e.shortName)}</a></td><td>${fin?`${me?.winner?'W':'L'} ${c.competitors.map(x=>x.score?.displayValue).join('-')}`:ctTime(e.date)}</td></tr>`}).join('')}</table></div>`;
}
async function route(refresh){
  clearTimeout(timer);const [p,qs]=location.hash.slice(1).split('?'),q=new URLSearchParams(qs||''),seg=(p||'/').split('/').filter(Boolean);
  document.querySelectorAll('nav a').forEach(a=>a.classList.toggle('on',a.dataset.t===(seg[0]==='standings'?'standings':seg[0]?.startsWith('team')?'teams':'games')));
  if(!refresh){app.innerHTML='<p class="muted">Loading…</p>';scrollTo(0,0)}
  try{if(!seg.length)await games(q);else if(seg[0]==='game')await game(seg[1],q);else if(seg[0]==='standings')await standings();else if(seg[0]==='teams')await teams();else if(seg[0]==='team')await team(seg[1])}
  catch(e){if(!refresh)app.innerHTML=`<p class="muted">Couldn't load data (${esc(e.message)}). Check your connection.</p><button onclick="route()">Retry</button>`;schedule(20000)}
}
addEventListener('hashchange',()=>route());document.addEventListener('visibilitychange',()=>{if(!document.hidden)route(true)});route();
if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js');
