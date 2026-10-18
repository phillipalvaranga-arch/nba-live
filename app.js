const API='https://site.web.api.espn.com/apis/site/v2/sports/basketball/nba',API2='https://site.api.espn.com/apis/site/v2/sports/basketball/nba',STD='https://site.web.api.espn.com/apis/v2/sports/basketball/nba/standings';
const TZ='America/Chicago',$=s=>document.querySelector(s),app=$('#app');let timer=null,rt=0;
const favs=()=>JSON.parse(localStorage.favs||'[]'),isFav=id=>favs().includes(String(id));
function togFav(id){id=String(id);let f=favs();f=f.includes(id)?f.filter(x=>x!==id):[...f,id];localStorage.favs=JSON.stringify(f);route()}
const j=async u=>{try{const r=await fetch(u);if(!r.ok)throw Error(r.status);return await r.json()}catch(e){if(!u.startsWith(API+'/'))throw e;const r=await fetch(u.replace(API,API2));if(!r.ok)throw Error(r.status);return r.json()}};
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const ctDate=(d=new Date())=>new Intl.DateTimeFormat('en-CA',{timeZone:TZ}).format(d);
const ctTime=s=>new Date(s).toLocaleTimeString('en-US',{timeZone:TZ,hour:'numeric',minute:'2-digit'})+' CT';
const star=id=>`<button class="star ${isFav(id)?'on':''}" onclick="event.preventDefault();event.stopPropagation();togFav('${id}')" title="Favorite">★</button>`;
function status(c){const t=c.status.type;if(t.state==='in')return `<span class="live">${esc(t.shortDetail)}</span>`;if(t.state==='pre')return ctDay(c.date)+' · '+ctTime(c.date);return esc(t.shortDetail)}
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
   <button onclick="location.hash='#/'">Today</button><span class="day">${ymdDay(date)}</span><span class="muted">${live?'<span class="live">LIVE</span> auto-refresh 15s':''} ${ev.length} game(s)</span></div>
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
  let html=`<div class="bar"><button onclick="history.back()">← Back</button></div><div class="card"><div class="hero">${cs.map((t,i)=>`<div><img src="${t.team.logos?.[0]?.href||t.team.logo}" alt=""><div>${star(t.team.id)}<b>${esc(t.team.displayName)}</b></div><div class="muted">${esc(t.record?.[0]?.displayValue||'')}</div></div>${i===0?`<div><div class="sc">${cs[0].score??'-'} – ${cs[1].score??'-'}</div><div>${st.state==='in'?`<span class="live">${esc(st.shortDetail)}</span>`:st.state==='pre'?ctTime(h.date):esc(st.detail)}</div><div class="muted">${ctDay(h.date)}</div></div>`:''}`).join('')}</div></div>`;
  const per=Math.max(4,...cs.map(t=>(t.linescores||[]).length));
  if(cs[0].linescores){html+=`<h2>Score by Quarter</h2><div class="tw"><table><tr><th>Team</th>${[...Array(per)].map((_,i)=>`<th>${i<4?'Q'+(i+1):'OT'+(i>4?i-3:'')}</th>`).join('')}<th>T</th></tr>${cs.map(t=>`<tr><td>${esc(t.team.abbreviation)}</td>${[...Array(per)].map((_,i)=>`<td>${t.linescores?.[i]?.displayValue??''}</td>`).join('')}<td><b>${t.score}</b></td></tr>`).join('')}</table></div>`}
  html+=`<div class="tabs">${[['box','Box Score'],['plays','Play-by-Play'],['team','Team Stats']].map(([k,v])=>`<button class="${tab===k?'on':''}" onclick="location.hash='#/game/${id}?t=${k}'">${v}</button>`).join('')}</div>`;
  if(tab==='box'){for(const p of d.boxscore.players||[]){const s=p.statistics[0];if(!s)continue;const pi=s.labels.indexOf('PTS');
    const pts=s.athletes.filter(a=>a.stats?.length).map(a=>+a.stats[pi]||0),top=[...pts].sort((a,b)=>b-a).slice(0,3).filter(x=>x>0);
    html+=`<h2><img src="${p.team.logo}" style="width:22px;vertical-align:middle"> ${esc(p.team.displayName)}</h2><div class="tw"><table><tr><th>Player</th>${s.labels.map(l=>`<th>${l}</th>`).join('')}</tr>${s.athletes.map(a=>`<tr class="${a.stats?.length&&top.includes(+a.stats[pi])?'top':''}"><td><a style="color:inherit" href="#/player/${a.athlete.id}?team=${p.team.id}">${esc(a.athlete.shortName||a.athlete.displayName)}</a> <small class="muted">${esc(a.athlete.position?.abbreviation||'')}${a.starter?' ·S':''}</small></td>${a.stats?.length?a.stats.map(x=>`<td>${x}</td>`).join(''):`<td colspan="${s.labels.length}" class="muted" style="text-align:left">${esc(a.reason||'DNP')}</td>`}</tr>`).join('')}${s.totals?`<tr><td><b>TOTAL</b></td>${s.totals.map(x=>`<td><b>${x}</b></td>`).join('')}</tr>`:''}</table></div>`}
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
const V3='https://site.web.api.espn.com/apis/common/v3/sports/basketball/nba/athletes',V3B='https://site.api.espn.com/apis/common/v3/sports/basketball/nba/athletes';
const ctDay=s=>new Date(s).toLocaleDateString('en-US',{timeZone:TZ,weekday:'long',month:'short',day:'numeric'});
const ymdDay=d=>ctDay(d+'T17:00:00Z');
const D='—',ord=n=>n+(['th','st','nd','rd'][(n%100-20)%10]||['th','st','nd','rd'][n%100]||'th');
const rosters={},pst={};let navCount=0;
function goBack(fb){if(navCount>0)history.back();else location.hash=fb}
const SCOLS=[['GP','GP'],['MIN','MIN'],['PTS','PTS'],['REB','REB'],['AST','AST'],['STL','STL'],['BLK','BLK'],['FG%','FG%'],['3P%','3P%'],['FT%','FT%'],['TO','TOV']];
// Player season stats (ESPN common v3). 404 = no NBA stats (rookie). Never invent values.
function pstats(id){if(pst[id])return pst[id];
  const go=async b=>{const r=await fetch(`${b}/${id}/stats`);if(r.status===404)return{none:true};if(!r.ok)throw Error(r.status);return r.json()};
  return pst[id]=go(V3).catch(()=>go(V3B)).catch(e=>{delete pst[id];return{err:true}})}
function seasonRows(js){const avg=(js?.categories||[]).find(c=>c.name==='averages');if(!avg)return null;const by={};
  for(const s of avg.statistics||[]){const y=s.season?.year;if(!y)continue;const tot=/total/i.test(s.teamSlug||'')||/total/i.test(s.displayName||'');(by[y]||=[]).push({...s,tot})}
  const rows=Object.keys(by).map(Number).sort((a,b)=>a-b).map(y=>{const g=by[y],t=g.find(x=>x.tot);const pick=t||g[g.length-1];return{year:y,label:pick.season.displayName,teams:g.filter(x=>!x.tot).map(x=>x.teamSlug),v:Object.fromEntries(avg.labels.map((l,i)=>[l,pick.stats[i]]))}});
  return{labels:avg.labels,rows,career:avg.totals?Object.fromEntries(avg.labels.map((l,i)=>[l,avg.totals[i]])):null}}
function pickSeason(js,cur){if(!js||js.err)return{err:true};if(js.none)return{none:true};const sr=seasonRows(js);if(!sr||!sr.rows.length)return{none:true};
  const r=sr.rows.find(x=>x.year===cur)||sr.rows[sr.rows.length-1];return{...r,cur:r.year===cur,last:r.year===cur-1}}
const sv=(p,k)=>{const x=p?.v?.[k];return x==null||x===''?D:esc(x)};
const stag=(p,curLbl)=>p.err?'<span class="tag">stats unavailable</span>':p.none?'<span class="tag">no NBA stats yet</span>':p.cur?`<span class="tag cur">${esc(p.label)}</span>`:`<span class="tag old">${esc(p.label)}${p.last?' (last season)':' (last played)'}</span>`;
const expTxt=a=>a.experience?.years==null?D:a.experience.years===0?'Rookie':ord(a.experience.years)+' season';
const fromTxt=a=>{const c=a.college?.name,n=a.birthPlace?.country;return [c,n&&n!=='USA'?n:''].filter(Boolean).join(' · ')||D};
const HS='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect width="40" height="40" fill="#2a313c"/><circle cx="20" cy="15" r="7" fill="#8b949e"/><path d="M6 38c2-9 8-13 14-13s12 4 14 13z" fill="#8b949e"/></svg>');
async function team(id){
  const tok=rt;const [t,r,s]=await Promise.all([j(`${API}/teams/${id}`),j(`${API}/teams/${id}/roster`),j(`${API}/teams/${id}/schedule`).catch(()=>({events:[]}))]);const tm=t.team;
  rosters[id]=r;const cur=r.season?.year||0,curLbl=r.season?.displayName||'this season';const nx=tm.nextEvent?.[0];
  const view=localStorage.rview||'cards',sort=localStorage.rsort||'jersey';
  app.innerHTML=`<div class="bar"><button onclick="history.back()">← Back</button></div><div class="card"><div class="row"><img src="${tm.logos?.[0]?.href}" style="width:64px;height:64px">${star(id)}<span class="n" style="font-size:22px">${esc(tm.displayName)}</span><span>${esc(tm.record?.items?.[0]?.summary||'')} <span class="muted">${esc(tm.standingSummary||'')}</span></span></div>${nx?`<div class="muted">Next: ${esc(nx.shortName)} · ${ctDay(nx.date)} · ${ctTime(nx.date)}</div>`:''}</div>
  <h2>Roster <small class="muted">${(r.athletes||[]).length} players</small></h2>
  <div class="bar"><div class="seg"><button class="${view==='cards'?'on':''}" onclick="localStorage.rview='cards';route(true)">Cards</button><button class="${view==='table'?'on':''}" onclick="localStorage.rview='table';route(true)">Stats table</button></div>
  <label class="muted">Sort <select onchange="localStorage.rsort=this.value;route(true)">${[['jersey','Jersey #'],['name','Name'],['PTS','Points'],['REB','Rebounds'],['AST','Assists'],['MIN','Minutes']].map(([k,v])=>`<option value="${k}" ${sort===k?'selected':''}>${v}</option>`).join('')}</select></label></div>
  <div id="snote" class="note muted">Loading player stats…</div><div id="roster"></div>
  <h2>Schedule</h2><div class="tw"><table><tr><th>Date (CT)</th><th>Matchup</th><th>Result / Time</th></tr>${(s.events||[]).map(e=>{const c=e.competitions[0],me=c.competitors.find(x=>x.id==id),fin=c.status.type.completed;return `<tr><td>${ctDay(e.date)}</td><td><a style="color:inherit" href="#/game/${e.id}">${esc(e.shortName)}</a></td><td>${fin?`${me?.winner?'W':'L'} ${c.competitors.map(x=>x.score?.displayValue).join('-')}`:ctTime(e.date)}</td></tr>`}).join('')}</table></div>`;
  const ath=r.athletes||[];const draw=st=>{
    const P=a=>st?.[a.id]||{};const num=(a,k)=>{const x=parseFloat(P(a).v?.[k]);return isNaN(x)?-1:x};
    const L=[...ath].sort(sort==='name'?(a,b)=>a.lastName.localeCompare(b.lastName):sort==='jersey'?(a,b)=>(parseInt(a.jersey)||999)-(parseInt(b.jersey)||999):(a,b)=>num(b,sort)-num(a,sort));
    const inj=a=>a.injuries?.length?` <span class="inj" title="Injury status">${esc(a.injuries[0].status||'INJ')}</span>`:'';
    const href=a=>`#/player/${a.id}?team=${id}`,img=a=>`<img class="hs" src="${a.headshot?.href||HS}" alt="" loading="lazy" onerror="this.onerror=null;this.src='${HS}'">`;
    if(view==='table')return `<div class="tw"><table class="rt"><tr><th>Player</th><th>#</th><th>Pos</th><th>Ht</th><th>Wt</th><th>Age</th>${SCOLS.map(c=>`<th>${c[1]}</th>`).join('')}<th>Season</th></tr>${L.map(a=>{const p=P(a);return `<tr onclick="location.hash='${href(a)}'"><td><a href="${href(a)}">${img(a)} ${esc(a.shortName||a.displayName)}</a>${inj(a)}</td><td>${esc(a.jersey||D)}</td><td>${esc(a.position?.abbreviation||D)}</td><td>${esc(a.displayHeight||D)}</td><td>${esc((a.displayWeight||D).replace(' lbs',''))}</td><td>${a.age??D}</td>${SCOLS.map(c=>`<td>${st?sv(p,c[0]):'…'}</td>`).join('')}<td>${st?(p.label?esc(p.label):D):'…'}</td></tr>`}).join('')}</table></div>`;
    return `<div class="pgrid">${L.map(a=>{const p=P(a);return `<a class="pcard" href="${href(a)}">${img(a)}<div class="pi"><div class="pn">${esc(a.displayName)}${inj(a)}</div>
     <div class="pm"><b class="jn">#${esc(a.jersey||D)}</b> · ${esc(a.position?.abbreviation||D)} · ${esc(a.displayHeight||D)} · ${esc(a.displayWeight||D)} · Age ${a.age??D}</div>
     <div class="pm">${esc(fromTxt(a))} · ${expTxt(a)}</div>
     <div class="chips">${[['PTS','PTS'],['REB','REB'],['AST','AST'],['FG%','FG%'],['MIN','MIN']].map(([k,l])=>`<span><b>${st?sv(p,k):'…'}</b><i>${l}</i></span>`).join('')}</div>
     <div class="pm">${st?stag(p,curLbl):''}</div></div></a>`}).join('')}</div>`};
  $('#roster').innerHTML=draw(null);
  const st={};await Promise.all(ath.map(a=>pstats(a.id).then(x=>{st[a.id]=pickSeason(x,cur)})));
  if(tok!==rt)return;$('#roster').innerHTML=draw(st);
  const vals=Object.values(st),nc=vals.filter(p=>p.cur).length,ne=vals.filter(p=>p.err).length;
  $('#snote').innerHTML=nc?`Per-game averages, ${esc(curLbl)} regular season. Players with no ${esc(curLbl)} games yet show their latest season (labeled).`:`The ${esc(curLbl)} regular season has no stats yet, so these are <b>last season's</b> per-game averages (labeled on each player). Tap a player for full details.`+(ne?` <span class="live">${ne} player(s) couldn't load — pull to refresh.</span>`:'');
}
async function player(id,q){
  const tid=q.get('team');const tok=rt;
  const [d,js,ro]=await Promise.all([j(`${V3}/${id}`).catch(()=>j(`${V3B}/${id}`)),pstats(id),tid?(rosters[tid]?Promise.resolve(rosters[tid]):j(`${API}/teams/${tid}/roster`).catch(()=>null)):null]);
  if(tok!==rt)return;const a=d.athlete||{},ra=(ro?.athletes||[]).find(x=>x.id==id)||{};const cur=d.season?.year||ro?.season?.year||0,curLbl=d.season?.displayName||ro?.season?.displayName||'';
  const tm=a.team||{};const fb=`#/team/${tid||tm.id||''}`;const p=pickSeason(js,cur),sr=js&&!js.none&&!js.err?seasonRows(js):null;
  const dob=ra.dateOfBirth?new Date(ra.dateOfBirth).toLocaleDateString('en-US',{timeZone:'UTC',month:'short',day:'numeric',year:'numeric'}):(()=>{const m=(a.displayDOB||'').split('/');return m.length===3?new Date(Date.UTC(+m[2],m[1]-1,+m[0])).toLocaleDateString('en-US',{timeZone:'UTC',month:'short',day:'numeric',year:'numeric'}):D})();
  const bp=ra.birthPlace?[ra.birthPlace.city,ra.birthPlace.state,ra.birthPlace.country].filter(Boolean).join(', '):a.displayBirthPlace;
  const info=[['Jersey',a.displayJersey||(ra.jersey?'#'+ra.jersey:'')],['Position',a.position?.displayName||ra.position?.displayName],['Height',a.displayHeight||ra.displayHeight],['Weight',a.displayWeight||ra.displayWeight],['Age',a.age||ra.age],['Born',dob],['Birthplace',bp],['College',a.college?.name||ra.college?.name],['Country',ra.birthPlace?.country],['Experience',a.displayExperience||(ra.experience?expTxt(ra):'')],['Draft',a.displayDraft],['Status',(ra.injuries?.[0]?.status)||a.status?.name]];
  const tAb=s=>js?.teams?.[s]?.abbreviation||'';
  const ttl=p.err?'Stats unavailable right now':p.none?'No NBA regular-season stats yet':p.cur?`${esc(p.label)} Regular Season (per game)`:`${esc(p.label)} Regular Season (per game) — ${p.last?`last season (no ${esc(curLbl)} stats yet)`:'most recent season played'}`;
  app.innerHTML=`<div class="bar"><button onclick="goBack('${fb}')">← Back</button>${tm.id?`<a class="btn" href="#/team/${tm.id}">${esc(tm.abbreviation||'Team')} roster</a>`:''}</div>
  <div class="card phero"><img class="hsl" src="${a.headshot?.href||ra.headshot?.href||HS}" alt="" onerror="this.onerror=null;this.src='${HS}'"><div><div class="pnl">${esc(a.displayName||ra.displayName)}</div>
   <div class="muted">${esc(a.displayJersey||'')} · ${esc(a.position?.displayName||'')}${tm.displayName?` · <a style="color:inherit" href="#/team/${tm.id}">${esc(tm.displayName)}</a>`:''}</div>${ra.injuries?.length?`<div class="inj" style="display:inline-block;margin-top:6px">${esc(ra.injuries[0].status)}</div>`:''}</div></div>
  <h2>Player Info</h2><div class="info">${info.map(([k,v])=>`<div><i>${k}</i><b>${esc(v||D)}</b></div>`).join('')}</div>
  <h2>${ttl}</h2><div class="tiles">${SCOLS.map(([k,l])=>`<div><b>${p.v?sv(p,k):D}</b><i>${l}</i></div>`).join('')}</div>
  ${sr?`<h2>Career by Season</h2><div class="tw"><table><tr><th>Season</th><th>Team</th>${SCOLS.map(c=>`<th>${c[1]}</th>`).join('')}</tr>${[...sr.rows].reverse().map(r=>`<tr><td>${esc(r.label)}</td><td>${esc(r.teams.map(tAb).filter(Boolean).join('/')||D)}</td>${SCOLS.map(c=>`<td>${sv(r,c[0])}</td>`).join('')}</tr>`).join('')}${sr.career?`<tr class="top"><td>Career</td><td></td>${SCOLS.map(c=>`<td>${sv({v:sr.career},c[0])}</td>`).join('')}</tr>`:''}</table></div>`:''}
  <p class="muted" style="font-size:12px">Regular-season per-game averages from ESPN. “${D}” = not available.</p>`;
}

async function route(refresh){
  clearTimeout(timer);rt++;const [p,qs]=location.hash.slice(1).split('?'),q=new URLSearchParams(qs||''),seg=(p||'/').split('/').filter(Boolean);
  document.querySelectorAll('nav a').forEach(a=>a.classList.toggle('on',a.dataset.t===(seg[0]==='standings'?'standings':seg[0]?.startsWith('team')||seg[0]==='player'?'teams':'games')));
  if(!refresh){app.innerHTML='<p class="muted">Loading…</p>';scrollTo(0,0)}
  try{if(!seg.length)await games(q);else if(seg[0]==='game')await game(seg[1],q);else if(seg[0]==='standings')await standings();else if(seg[0]==='teams')await teams();else if(seg[0]==='team')await team(seg[1]);else if(seg[0]==='player')await player(seg[1],q)}
  catch(e){if(!refresh)app.innerHTML=`<p class="muted">Couldn't load data (${esc(e.message)}). Check your connection.</p><button onclick="route()">Retry</button>`;schedule(20000)}
}
addEventListener('hashchange',()=>{navCount++;route()});document.addEventListener('visibilitychange',()=>{if(!document.hidden)route(true)});route();
if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js');
