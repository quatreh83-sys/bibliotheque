import {showMap} from './map3d.js';
import {domainOf} from './domaines.js';
import {initAssistant} from './assistant.js';
/* ---------- Utilitaires ---------- */
const $=(s,r=document)=>r.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=s=>(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const fmt=n=>(n??0).toLocaleString('fr-FR'),fd=d=>d?new Date(d).toLocaleDateString('fr-FR',{day:'2-digit',month:'short',year:'numeric'}):'—';
const col=new Intl.Collator('fr',{sensitivity:'base',numeric:true});
const SMALL=new Set('de du des la le les et en au aux à l d un une sur sous par pour dans ou a'.split(' ')),ROMAN=/^(I{1,3}|IV|VI{0,3}|IX|XI{0,3}|XIV|XV|XVI{0,3}|XIX|XX|XXI{0,3})$/;
const cap=s=>s.replace(/^([^a-zà-ÿ]*)([a-zà-ÿ])/,(m,a,b)=>a+b.toUpperCase());
/* Affichage seulement : les titres ENTIÈREMENT en majuscules sont mis en forme lisible. Les données ne sont jamais modifiées. */
const nice=s=>{if(!s||/[a-zà-ÿ]/.test(s))return s||'';return s.split(' ').map((w,i)=>{if(ROMAN.test(w.replace(/[.,;:)]/g,'')))return w;const l=w.toLowerCase();if(i&&SMALL.has(l))return l;
  return l.split('-').map(p=>p.split("'").map((x,j)=>j==0&&p.includes("'")&&i?x:cap(x)).join("'")).join('-')}).join(' ')};
const ROLE={admin:'Administrateur',librarian:'Bibliothécaire',trainer:'Formateur',student:'Étudiant',visitor:'Visiteur'};
const P={home:'M3 11l9-8 9 8M5 9.5V20h5v-6h4v6h5V9.5',book:'M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20',search:'M21 21l-4.3-4.3M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z',user:'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c0-4 3.6-7 8-7s8 3 8 7',loans:'M7 7h13l-4-4M17 17H4l4 4',manage:'M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6',plus:'M12 5v14M5 12h14',upload:'M12 16V4M7 9l5-5 5 5M4 17v3h16v-3',check:'M5 12.5l4.5 4.5L19 7',clock:'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',pin:'M12 21s7-6 7-11a7 7 0 1 0-14 0c0 5 7 11 7 11zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',file:'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5zM14 3v5h5',folder:'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z',out:'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',users:'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21c0-3.5 3-6 7-6s7 2.5 7 6M17 3.2a4 4 0 0 1 0 7.6M22 21c0-2.5-1.5-4.5-4-5.4',shield:'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z',cloud:'M7 18a4 4 0 0 1-.6-7.96A6 6 0 0 1 18 9.5 4.3 4.3 0 0 1 17.5 18H7z',review:'M4 13l2-8h12l2 8M4 13v6h16v-6M4 13h5l1 2h4l1-2h5',arrow:'M5 12h14M13 6l6 6-6 6',spark:'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3zM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15z',send:'M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z',x:'M6 6l12 12M18 6L6 18',swap:'M7 7h13l-4-4M17 17H4l4 4',bookmark:'M6 3h12v18l-6-4-6 4V3z'};
const ico=(n,c='')=>`<svg class="ic ${c}" viewBox="0 0 24 24" aria-hidden="true"><path d="${P[n]}"/></svg>`;
const S={me:JSON.parse(localStorage.getItem('usr')||'null'),books:{},idx:{},loans:{},wish:new Set(),people:null,
  cat:{kind:'physique',q:'',dom:'',sort:'domain',lim:60},g:{status:'',cat:'',q:'',group:false}};
const isStaff=()=>!!S.me&&S.me.role!='student',isAdmin=()=>S.me?.role=='admin';
const api=async(p,m='GET',b)=>{const t=localStorage.getItem('tok'),r=await fetch('/api/'+p,{method:m,headers:{'Content-Type':'application/json',...(t?{Authorization:'Bearer '+t}:{})},body:b?JSON.stringify(b):undefined}),j=await r.json().catch(()=>({}));
  if(r.status==401&&t&&p!='login'){localStorage.removeItem('tok');localStorage.removeItem('usr');S.me=null;renderNav()}if(!r.ok)throw new Error(j.error||'Erreur');return j};
const ok=p=>p.then(()=>({}),error=>({error}));
const toast=m=>{const t=$('#toast');t.textContent=m;t.style.display='block';clearTimeout(toast.t);toast.t=setTimeout(()=>t.style.display='none',3800)};
const dlg=h=>{const d=$('#dlg');d.innerHTML=h;if(!d.open)d.showModal()},closeDlg=()=>{const d=$('#dlg');if(d.open)d.close()};
$('#dlg').addEventListener('click',e=>{if(e.target.id=='dlg')closeDlg()});
/* ---------- Données ---------- */
const prep=b=>{b.domain=b.domain||domainOf(b.code);b._t=norm([b.title,b.subtitle,b.author,b.code].join(' '));b._w=[...new Set(b._t.split(/[^a-z0-9]+/).filter(w=>w.length>2))];return b};
async function loadBooks(kind){if(S.books[kind])return S.books[kind];const d=await api('books?kind='+kind);
  return S.books[kind]=d.rows.map(r=>{const b={};d.cols.forEach((c,i)=>b[c]=r[i]);S.idx[b.id]=prep(b);return b})}
async function loadLoans(){S.loans={};if(S.me)try{S.loans=Object.fromEntries((await api('loans/active')).map(l=>[l.book_id,l]))}catch{}}
async function loadWish(){S.wish=new Set();if(S.me)try{S.wish=new Set((await api('wishlist')).map(x=>x.id))}catch{}}
function lev(a,b){const d=Array.from({length:a.length+1},(_,i)=>[i]);for(let j=1;j<=b.length;j++)d[0][j]=j;for(let i=1;i<=a.length;i++)for(let j=1;j<=b.length;j++)d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+(a[i-1]==b[j-1]?0:1));return d[a.length][b.length]}
function search(list,q){const t=norm(q).split(/[^a-z0-9]+/).filter(Boolean);if(!t.length)return{exact:list,near:[]};
  const exact=list.filter(b=>t.every(w=>b._t.includes(w)));if(exact.length>=40||!t.some(w=>w.length>=4))return{exact,near:[]};const near=[];
  for(const b of list){let cost=0,okk=true;for(const w of t){if(b._t.includes(w))continue;const lim=w.length<4?0:w.length<7?1:2;let best=9;
    if(lim)for(const x of b._w)if(Math.abs(x.length-w.length)<=lim)best=Math.min(best,lev(w,x),lev(w,x.slice(0,w.length)));if(best<=lim)cost+=best;else{okk=false;break}}
    if(okk&&cost)near.push([cost,b])}
  return{exact,near:near.sort((a,b)=>a[0]-b[0]).map(x=>x[1])}}
const SORTS={domain:(a,b)=>col.compare(a.domain||'',b.domain||'')||col.compare(a.title,b.title),author:(a,b)=>col.compare(a.author||'~',b.author||'~'),title:(a,b)=>col.compare(a.title,b.title),
  year:(a,b)=>(b.year||0)-(a.year||0),code:(a,b)=>col.compare(a.code||'~',b.code||'~'),path:(a,b)=>col.compare(a.path||'',b.path||'')||col.compare(a.title,b.title),type:(a,b)=>col.compare(a.filetype||'',b.filetype||'')||col.compare(a.title,b.title)};
/* ---------- Navigation ---------- */
const NAV=[['','home','Accueil'],['catalogue','book','Catalogue'],['retraits','loans','Mes retraits',1],['selection','bookmark','Ma sélection',1],['gestion','manage','Gestion',2]];
function renderNav(cur=location.hash.replace(/^#\/?/,'').split(/[?/]/)[0]){if(cur=='connexion')cur='compte';
  const it=NAV.filter(n=>!n[3]||(n[3]==1&&S.me)||(n[3]==2&&isStaff())),link=(n,c)=>`<a href="#/${n[0]}" class="${n[0]==cur?'on':''}">${ico(n[1])}${c||n[2]}</a>`;
  $('#links').innerHTML=it.map(n=>link(n)).join('');$('#tabs').innerHTML=it.map(n=>link(n,n[2].replace('Mes retraits','Retraits').replace('Ma sélection','Sélection'))).join('')+link(['compte','user'],S.me?'Compte':'Connexion');
  $('#who').innerHTML=S.me?`<a class="chip-user" href="#/compte">${ico('user')}<span>${esc(S.me.name)}</span></a>`:`<a class="btn pri sm" href="#/connexion">Connexion</a>`}
async function route(keep){const y=scrollY,seg=location.hash.replace(/^#\/?/,'').split('?')[0].split('/'),p=seg[0]||'';renderNav();
  const f={'':pHome,catalogue:pCat,retraits:pMine,selection:pSel,gestion:pGest,compte:pAccount,connexion:pAccount}[p]||pHome;
  if(!keep)$('#app').innerHTML='<div class="loading">Chargement…</div>';
  try{await f(seg)}catch(e){$('#app').innerHTML=`<div class="empty">${esc(e.message)}</div>`}scrollTo(0,keep?y:0)}
addEventListener('hashchange',()=>route());
/* ---------- Cartes & statuts ---------- */
const stTag=b=>{if(b.kind=='numerique')return`<span class="tag acc">${ico('cloud')}${esc(b.filetype||'Fichier')}</span>`;if(b.lost)return'<span class="tag bad">Perdu</span>';
  const l=S.loans[b.id],who=l?.borrower?` · ${esc(l.borrower)}`:'';if(b.status!='borrowed')return'<span class="tag ok">Disponible</span>';
  return l?.return_requested_at?`<span class="tag warn">${ico('clock')}Retour à valider${who}</span>`:`<span class="tag warn">Retiré${who}</span>`};
const card=b=>`<article class="card" data-a="open" data-id="${b.id}"><button class="wbtn ${S.wish.has(b.id)?'on':''}" data-a="wish" data-id="${b.id}" aria-label="${S.wish.has(b.id)?'Retirer de ma sélection':'Ajouter à ma sélection'}" title="${S.wish.has(b.id)?'Retirer de ma sélection':'Ajouter à ma sélection'}">${ico('bookmark')}</button><div class="cic">${ico(b.kind=='numerique'?'file':'book')}</div><div class="grow"><h3>${esc(nice(b.title))}</h3>${b.subtitle?`<p class="sub">${esc(nice(b.subtitle))}</p>`:''}
 <p class="meta">${esc(b.kind=='numerique'?b.path:[nice(b.author),b.publisher&&nice(b.publisher),b.year].filter(Boolean).join(' · '))}</p><div class="tags">${b.code?`<span class="tag">${esc(b.code)}</span>`:''}${stTag(b)}</div></div></article>`;
/* ---------- Accueil ---------- */
async function pHome(){$('#app').innerHTML=`<section class="hero"><h1>Trouvez le livre qu’il vous faut</h1><p>Le catalogue de la bibliothèque du Théologat Saint Jean-Paul II : livres, cotes, disponibilité et bibliothèque virtuelle.</p>
 <form class="searchbox" data-form="homesearch"><input class="inp" name="q" type="search" placeholder="Titre, auteur ou cote…" autocomplete="off" aria-label="Rechercher"><button class="btn pri">${ico('search')}<span>Rechercher</span></button></form></section>
 <section class="stats" id="stats"></section><h2 class="h2">Parcourir par domaine</h2><div class="tiles" id="tiles"><div class="loading">Chargement des domaines…</div></div>
 <section class="duo"><div class="panel"><h3>${ico('cloud')}Bibliothèque virtuelle</h3><p>Documents, cours, PDF et livres numériques classés par dossiers.</p><a class="btn" href="#/catalogue" data-a="gokind" data-k="numerique">Explorer ${ico('arrow')}</a></div>
 <div class="panel">${S.me?`<h3>${ico('loans')}Mes retraits</h3><p>Consultez vos livres en cours et signalez un retour.</p><a class="btn" href="#/retraits">Voir ma fiche ${ico('arrow')}</a>`:`<h3>${ico('user')}Compte étudiant</h3><p>Connectez-vous pour retirer un livre et suivre votre fiche de retrait. La consultation reste libre.</p><a class="btn pri" href="#/connexion">Se connecter</a>`}</div></section>`;
  api('stats').then(s=>{$('#stats').innerHTML=[['book',s.physique,'livres au catalogue'],['check',s.available,'disponibles'],['loans',s.borrowed,'actuellement retirés'],['cloud',s.numerique,'documents numériques']].map(([i,n,l])=>`<div class="stat"><div class="bub">${ico(i)}</div><div><b>${fmt(n)}</b><span>${l}</span></div></div>`).join('')}).catch(()=>{});
  const list=await loadBooks('physique'),c={};list.forEach(b=>c[b.domain]=(c[b.domain]||0)+1);
  $('#tiles').innerHTML=Object.entries(c).sort((a,b)=>b[1]-a[1]).slice(0,16).map(([d,n])=>`<button class="tile" data-a="godom" data-d="${esc(d)}"><b>${esc(d)}</b><span>${fmt(n)}</span></button>`).join('')+`<button class="tile" data-a="gokind" data-k="physique"><b>Tous les domaines</b>${ico('arrow')}</button>`}
/* ---------- Catalogue ---------- */
async function pCat(){const C=S.cat,ph=C.kind=='physique';
  $('#app').innerHTML=`<div class="ph"><div><h1>Catalogue</h1><p class="muted">${ph?'Livres physiques de la bibliothèque':'Documents de la bibliothèque virtuelle'}</p></div><div class="seg">${[['physique','book','Livres'],['numerique','cloud','Bibliothèque virtuelle']].map(([k,i,t])=>`<button data-a="kind" data-k="${k}" class="${C.kind==k?'on':''}">${ico(i)}${t}</button>`).join('')}</div></div>
  <div class="toolbar"><div class="sbox">${ico('search')}<input id="q" class="inp" type="search" placeholder="${ph?'Titre, auteur ou cote…':'Titre du document…'}" value="${esc(C.q)}" autocomplete="off" aria-label="Rechercher"></div>
  <select id="dom" class="inp" aria-label="Domaine"><option value="">Tous les domaines</option></select>
  <select id="sort" class="inp" aria-label="Trier">${(ph?[['domain','Par domaine'],['author','Auteur A→Z'],['title','Titre A→Z'],['year','Plus récents'],['code','Par cote']]:[['path','Par dossier'],['title','Titre A→Z'],['type','Par type']]).map(([v,t])=>`<option value="${v}" ${C.sort==v?'selected':''}>${t}</option>`).join('')}</select></div>
  <p class="muted sm">Recherche par titre, auteur ou cote. Pour un sujet (l’amour, la prière…), essayez la <button class="btn sm" data-a="askbot">${ico('spark')}Recherche avancée</button></p><p id="count" class="muted sm"></p><div id="results" class="cards"><div class="loading">Chargement…</div></div><div id="sugg"></div><div id="more" class="center" style="margin-top:1rem"></div>`;
  if(!SORTS[C.sort]||!$('#sort').value){C.sort=ph?'domain':'path';$('#sort').value=C.sort}
  const list=await loadBooks(C.kind),c={};list.forEach(b=>c[b.domain]=(c[b.domain]||0)+1);
  $('#dom').innerHTML='<option value="">Tous les domaines</option>'+Object.keys(c).sort(col.compare).map(d=>`<option value="${esc(d)}" ${C.dom==d?'selected':''}>${esc(d)} (${fmt(c[d])})</option>`).join('');renderResults()}
function renderResults(){const C=S.cat,list=S.books[C.kind];if(!list||!$('#results'))return;const{exact,near}=search(list,C.q),f=x=>C.dom?x.filter(b=>b.domain==C.dom):x,r=[...f(exact)].sort(SORTS[C.sort]||SORTS.title);
  $('#count').textContent=`${fmt(r.length)} résultat${r.length>1?'s':''}`;$('#results').innerHTML=r.slice(0,C.lim).map(card).join('')||'<div class="empty" style="grid-column:1/-1">Aucun résultat exact.</div>';
  $('#more').innerHTML=r.length>C.lim?`<button class="btn" data-a="more">Afficher plus (${fmt(r.length-C.lim)})</button>`:'';
  const n=f(near).slice(0,12);$('#sugg').innerHTML=n.length?`<h2 class="h2">Vouliez-vous dire…</h2><div class="cards">${n.map(card).join('')}</div>`:''}
let deb;document.addEventListener('input',e=>{const t=e.target;if(t.id=='q'){clearTimeout(deb);deb=setTimeout(()=>{S.cat.q=t.value;S.cat.lim=60;renderResults()},140)}
  if(t.dataset.g!==undefined){clearTimeout(deb);deb=setTimeout(async()=>{S.g[t.dataset.g]=t.value;await pGest(['gestion','retraits'],1);const n=$('[data-g=q]');n?.focus();n?.setSelectionRange(n.value.length,n.value.length)},300)}});
document.addEventListener('change',async e=>{const t=e.target;if(t.id=='dom'){S.cat.dom=t.value;S.cat.lim=60;renderResults()}if(t.id=='sort'){S.cat.sort=t.value;renderResults()}
  if(t.dataset.gs!==undefined){S.g[t.dataset.gs]=t.value;pGest(['gestion','retraits'],1)}
  if(t.name=='lw'){$('#lname').classList.toggle('hide',t.value!='visitor');$('#luser').classList.toggle('hide',t.value!='user')}
  if(t.dataset.a=='role'){const r=await ok(api('users/'+t.dataset.id,'PATCH',{role:t.value}));r.error&&toast(r.error.message);gUsers()}});
/* ---------- Fiche d'un livre ---------- */
function openBook(id,withMap){const b=S.idx[id];if(!b)return;const l=S.loans[id],dig=b.kind=='numerique',me=S.me,mine=l&&me&&l.user_id==me.id,pend=b.status=='borrowed'&&l?.return_requested_at;
  const rows=dig?[['Dossier',b.path],['Type',b.filetype]]:[['Auteur(s)',nice(b.author)],['Éditeur',b.publisher&&nice(b.publisher)],['Ville',b.city&&nice(b.city)],['Collection',b.collection&&nice(b.collection)],['Tome / volume',b.volume],['Année',b.year],['Cote',b.code],['Domaine',b.domain],['N° d’inventaire',b.numero],
    ['Emplacement',b.rayon?`Rayon ${b.rayon} · étagère ${b.etagere??'?'} · bloc ${b.bloc??'?'}`:'À renseigner (cote : '+(b.code||'—')+')']];
  const a=(k,t,c='')=>`<button class="btn ${c}" data-a="${k}" data-id="${id}">${t}</button>`;
  dlg(`<h2>${esc(nice(b.title))}</h2>${b.subtitle?`<p class="muted"><i>${esc(nice(b.subtitle))}</i></p>`:''}<div class="tags">${stTag(b)}${b.code?`<span class="tag">${esc(b.code)}</span>`:''}${b.domain?`<span class="tag acc">${esc(b.domain)}</span>`:''}${isAdmin()&&!b.reviewed?'<span class="tag warn">À vérifier</span>':''}</div>
  <dl class="dl">${rows.filter(r=>r[1]).map(r=>`<dt>${r[0]}</dt><dd>${esc(r[1])}</dd>`).join('')}</dl>${b.status=='borrowed'&&l?`<p class="muted sm">Retiré par <b>${esc(l.borrower)}</b>${l.return_requested_at?' — retour signalé, en attente de validation':''}. Adressez-vous à cette personne pour récupérer le livre.</p>`:''}
  ${withMap&&b.rayon?'<div id="map"></div>':''}<div class="acts">${a('wish',ico('bookmark')+(S.wish.has(id)?'Retirer de ma sélection':'Ajouter à ma sélection'))}${dig?'':[b.rayon&&!withMap?a('map',ico('pin')+'Localiser'):'',me&&!b.lost&&!mine&&(b.status=='available'||pend)?(isStaff()?a('lend','Retirer…','pri'):a('borrow','Retirer ce livre','pri')):'',
   mine&&!pend&&b.status=='borrowed'?a('ret','Signaler le retour','pri'):'',isStaff()&&b.status=='borrowed'?a('val',ico('check')+(pend?'Valider le retour':'Marquer rendu'),pend?'pri':''):'',isStaff()?a('lost',b.lost?'Retrouvé':'Signaler perdu'):''].join('')}
  ${isAdmin()?a('edit','Modifier')+a('del','Supprimer','danger'):''}<button class="btn" data-a="close">Fermer</button></div>`);
  if(withMap&&b.rayon)showMap($('#map'),b)}
async function after(id){const b=await api('books/'+id);Object.assign(S.idx[id],prep(b));await loadLoans();renderResults();return b}
async function lendDlg(id){const b=S.idx[id];if(!S.people)S.people=await api('people');
  dlg(`<h2>Retirer un livre</h2><p class="muted">${esc(nice(b.title))}</p><div class="opts"><label><input type="radio" name="lw" value="me" checked> Pour moi-même</label><label><input type="radio" name="lw" value="visitor"> Pour un visiteur (sans compte)</label><label><input type="radio" name="lw" value="user"> Pour une personne inscrite</label></div>
  <input id="lname" class="inp hide" placeholder="Nom complet du visiteur" autocomplete="off"><select id="luser" class="inp hide">${S.people.map(p=>`<option value="${p.id}">${esc(p.full_name)} — ${ROLE[p.role]}</option>`).join('')}</select>
  <div class="acts"><button class="btn" data-a="open" data-id="${id}">Retour</button><button class="btn pri" data-a="lendgo" data-id="${id}">Confirmer le retrait</button></div>`)}
/* ---------- Formulaires ---------- */
const BF=[['title','Titre *'],['subtitle','Sous-titre'],['author','Auteur(s)'],['publisher','Éditeur'],['city','Ville'],['collection','Collection'],['volume','Tome / volume'],['year','Année','number'],['code','Cote (code)'],['isbn','ISBN'],['rayon','Rayon'],['etagere','Étagère','number'],['bloc','Bloc','number']];
const bookForm=(v={})=>`<div class="fgrid">${BF.map(([k,t,ty])=>`<label class="f ${k=='title'?'full':''}">${t}<input class="inp" name="${k}" type="${ty||'text'}" value="${esc(v[k])}" ${k=='title'?'required':''}></label>`).join('')}</div>`;
const vals=f=>{const o={};BF.forEach(([k,,ty])=>{const v=f.elements[k].value.trim();o[k]=v===''?null:ty=='number'?(parseInt(v)||null):v});return o};
function csv(t){const sep=t.split('\n')[0].includes(';')?';':',',r=[];let row=[],c='',q=false;for(let i=0;i<t.length;i++){const h=t[i];if(q){if(h=='"'&&t[i+1]=='"'){c+='"';i++}else if(h=='"')q=false;else c+=h}else if(h=='"')q=true;else if(h==sep){row.push(c);c=''}else if(h=='\n'||h=='\r'){if(h=='\r'&&t[i+1]=='\n')i++;row.push(c);r.push(row);row=[];c=''}else c+=h}if(c||row.length){row.push(c);r.push(row)}return r.filter(x=>x.join('').trim())}
const H={n:'numero',numero:'numero',titre:'title',title:'title',soustitre:'subtitle',auteur:'author',auteurs:'author',author:'author',prenom:'prenom',editeur:'publisher',publisher:'publisher',ville:'city',villeadresse:'city',collection:'collection',colletion:'collection',tome:'volume',tomevolumecorpus:'volume',volume:'volume',annee:'year',year:'year',code:'code',cote:'code',domaine:'domain',isbn:'isbn',rayon:'rayon',etagere:'etagere',bloc:'bloc'},hk=h=>H[norm(h).replace(/[^a-z]/g,'')];
async function importCsv(){const f=$('#csv').files[0];if(!f)return toast('Choisissez un fichier CSV');const buf=await f.arrayBuffer();let tx;try{tx=new TextDecoder('utf-8',{fatal:true}).decode(buf)}catch{tx=new TextDecoder('windows-1252').decode(buf)}
  const rows=csv(tx),hd=rows[0].map(hk);if(!hd.includes('title'))return toast('Colonne « Titre » introuvable');
  const objs=rows.slice(1).map(x=>{const o={};hd.forEach((k,i)=>k&&(o[k]=x[i]?.trim()||null));if(o.prenom)o.author=(o.prenom+' '+(o.author||'')).trim();delete o.prenom;['year','etagere','bloc','numero'].forEach(k=>o[k]=parseInt(o[k])||null);o.kind='physique';return o}).filter(o=>o.title);
  for(let i=0;i<objs.length;i+=500){$('#imp').textContent=`Import… ${Math.min(i+500,objs.length)} / ${objs.length}`;const r=await ok(api('books','POST',objs.slice(i,i+500)));if(r.error)return toast(r.error.message)}
  S.books={};toast(objs.length+' livres importés');$('#imp').textContent='Terminé : '+objs.length+' livres importés.'}
/* ---------- Mes retraits ---------- */
const lTag=l=>l.returned_at?`<span class="tag ok">Rendu le ${fd(l.returned_at)}</span>`:l.return_requested_at?`<span class="tag warn">${ico('clock')}Retour à valider</span>`:'<span class="tag warn">En cours</span>';
const lRow=(l,mgr)=>{const act=!l.returned_at&&(mgr?`<button class="btn sm pri" data-a="val" data-id="${l.book_id}">${ico('check')}${l.return_requested_at?'Valider le retour':'Marquer rendu'}</button>`:!l.return_requested_at?`<button class="btn sm" data-a="ret" data-id="${l.book_id}">Signaler le retour</button>`:'');
  return`<div class="row"><div class="grow"><a href="#" class="lt" data-a="open" data-id="${l.book_id}">${esc(nice(l.title))}</a><div class="muted sm">${l.code?esc(l.code)+' · ':''}${mgr?`${esc(l.borrower)} (${ROLE[l.cat]})${l.lent_by?' · remis par '+esc(l.lent_by):''} · `:''}retiré le ${fd(l.borrowed_at)}</div></div>${lTag(l)}${act}</div>`};
async function pMine(){if(!S.me){location.hash='#/connexion';return}const data=await api('loans');await loadBooks('physique');const open=data.filter(l=>!l.returned_at);
  $('#app').innerHTML=`<div class="ph"><div><h1>Mes retraits</h1><p class="muted">Votre fiche de retrait personnelle</p></div><span class="tag warn">${open.length} en cours</span></div><div class="list">${data.map(l=>lRow(l,false)).join('')||'<div class="empty">Vous n’avez encore retiré aucun livre.</div>'}</div>`}
/* ---------- Ma sélection ---------- */
async function pSel(){if(!S.me){location.hash='#/connexion';return}const l=await api('wishlist');S.wish=new Set(l.map(x=>x.id));await Promise.all([...new Set(l.map(x=>x.kind))].map(loadBooks));await loadLoans();
  $('#app').innerHTML=`<div class="ph"><div><h1>Ma sélection</h1><p class="muted">Les livres qui vous intéressent, mis de côté pour plus tard</p></div><span class="tag acc">${l.length} livre${l.length>1?'s':''}</span></div><div class="cards">${l.map(x=>S.idx[x.id]).filter(Boolean).map(card).join('')||`<div class="empty" style="grid-column:1/-1">Votre sélection est vide. Parcourez le catalogue et touchez ${ico('bookmark')} sur les livres qui vous intéressent.</div>`}</div>`}
async function wishToggle(id){if(!S.me){toast('Connectez-vous pour utiliser Ma sélection');closeDlg();location.hash='#/connexion';return}
  const has=S.wish.has(id),r=await ok(api('wishlist/'+id,has?'DELETE':'POST'));if(r.error)return toast(r.error.message);has?S.wish.delete(id):S.wish.add(id);toast(has?'Retiré de votre sélection':'Ajouté à votre sélection');
  renderResults();if($('#dlg').open&&S.idx[id])openBook(id);if(location.hash.startsWith('#/selection'))route(true)}
/* ---------- Gestion ---------- */
const GM=[['retraits','loans','Retraits',0],['verifier','review','Ajouts à vérifier',1],['ajouter','plus','Ajouter un livre',0],['utilisateurs','users','Utilisateurs',1],['import','upload','Importer',1]];
async function pGest(seg,soft){if(!isStaff()){location.hash='#/';return}const sub=seg[1]||'retraits',items=GM.filter(g=>!g[3]||isAdmin());
  if(!soft){$('#app').innerHTML=`<div class="ph"><div><h1>Gestion</h1><p class="muted">${ROLE[S.me.role]}</p></div></div><div class="gest"><nav class="subnav">${items.map(g=>`<a href="#/gestion/${g[0]}" class="${g[0]==sub?'on':''}">${ico(g[1])}${g[2]}</a>`).join('')}</nav><section id="gb"></section></div>`;
    await loadBooks('physique');await loadLoans()}
  try{await ({retraits:gLoans,verifier:gReview,ajouter:gAdd,utilisateurs:gUsers,import:gImport}[sub]||gLoans)()}catch(e){$('#gb').innerHTML=`<div class="empty">${esc(e.message)}</div>`}}
async function gLoans(){const G=S.g,qs=new URLSearchParams({scope:'all',status:G.status,cat:G.cat,q:G.q}),data=await api('loans?'+qs);
  const sel=(k,o)=>`<select class="inp" data-gs="${k}">${o.map(([v,t])=>`<option value="${v}" ${G[k]==v?'selected':''}>${t}</option>`).join('')}</select>`;
  let body;if(G.group){const m={};data.forEach(l=>(m[l.borrower||'—']??=[]).push(l));body=Object.entries(m).sort((a,b)=>col.compare(a[0],b[0])).map(([n,ls])=>`<div class="gh"><span>${esc(n)}</span><span class="muted">${ls.length} retrait${ls.length>1?'s':''}</span></div>`+ls.map(l=>lRow(l,true)).join('')).join('')}else body=data.map(l=>lRow(l,true)).join('');
  $('#gb').innerHTML=`<div class="filters">${sel('status',[['','Tous les statuts'],['active','En cours'],['pending','Retour à valider'],['returned','Rendus']])}${sel('cat',[['','Toutes catégories'],['student','Étudiants'],['librarian','Bibliothécaires'],['trainer','Formateurs'],['admin','Administrateurs'],['visitor','Visiteurs']])}
  <input class="inp" data-g="q" type="search" placeholder="Personne, titre, cote…" value="${esc(G.q)}">${sel('group',[['','Liste unique'],['1','Par personne']].map(([v,t])=>[v,t])).replace('data-gs="group"','data-gs="group"')}</div>
  <p class="muted sm" style="margin-bottom:.5rem">${data.length} retrait${data.length>1?'s':''}${data.length==600?' (600 derniers)':''}</p><div class="list">${body||'<div class="empty">Aucun retrait pour ces critères.</div>'}</div>`}
async function gReview(){const r=await api('reports');$('#gb').innerHTML=`<h2 style="margin-bottom:.7rem">Livres ajoutés par les bibliothécaires</h2><div class="list">${r.map(x=>`<div class="row"><div class="grow"><b>${esc(nice(x.title))}</b><div class="muted sm">${x.code?esc(x.code)+' · ':''}ajouté par ${esc(x.added_by_name||'—')}</div></div><button class="btn sm pri" data-a="edit" data-id="${x.id}">Vérifier et compléter</button></div>`).join('')||'<div class="empty">Rien à vérifier.</div>'}</div>`;await loadBooks('physique')}
function gAdd(){$('#gb').innerHTML=`<h2 style="margin-bottom:.4rem">Ajouter un livre</h2><p class="muted" style="margin-bottom:.9rem">${isAdmin()?'Le livre est publié immédiatement.':'Le livre est publié et signalé à l’administrateur pour vérification.'}</p><form class="panel" data-form="add">${bookForm()}<div class="acts"><button class="btn pri">${ico('plus')}Ajouter au catalogue</button></div></form>`}
async function gUsers(){const u=await api('users');$('#gb').innerHTML=`<h2 style="margin-bottom:.7rem">Créer un compte</h2><form class="panel" data-form="newuser"><div class="fgrid"><label class="f">Nom complet<input class="inp" name="name" autocomplete="off" required></label><label class="f">Identifiant (facultatif)<input class="inp" name="username" autocomplete="off" autocapitalize="none" pattern="[A-Za-z0-9._\-]{3,30}" title="3 à 30 caractères : lettres, chiffres, . _ -"></label><label class="f">Email (facultatif)<input class="inp" name="email" type="email" autocomplete="off"></label>
  <label class="f">Mot de passe provisoire<input class="inp" name="password" minlength="6" autocomplete="new-password" required></label><label class="f">Rôle<select class="inp" name="role"><option value="student">Étudiant</option><option value="librarian">Bibliothécaire</option><option value="trainer">Formateur</option><option value="admin">Administrateur</option></select></label></div><div class="acts"><button class="btn pri">${ico('plus')}Créer le compte</button></div></form>
  <h2 class="h2">Comptes (${u.length})</h2><div class="list">${u.map(x=>`<div class="row"><div class="grow"><b>${esc(x.full_name)}</b> ${x.active?'':'<span class="tag bad">Désactivé</span>'}<div class="muted sm">${esc([x.username&&'Identifiant : '+x.username,x.email].filter(Boolean).join(' · ')||'—')}</div></div>
  <select class="inp" style="width:auto" data-a="role" data-id="${x.id}" ${x.id==S.me.id?'disabled':''}>${Object.entries(ROLE).filter(r=>r[0]!='visitor').map(([v,t])=>`<option value="${v}" ${x.role==v?'selected':''}>${t}</option>`).join('')}</select>
  <button class="btn sm" data-a="idn" data-id="${x.id}" data-n="${esc(x.full_name)}" data-u="${esc(x.username||'')}" data-e="${esc(x.email||'')}">Identifiants</button><button class="btn sm" data-a="pw" data-id="${x.id}" data-n="${esc(x.full_name)}">Mot de passe</button>${x.id==S.me.id?'':`<button class="btn sm ${x.active?'danger':''}" data-a="act" data-id="${x.id}" data-v="${x.active?0:1}">${x.active?'Désactiver':'Réactiver'}</button>`}</div>`).join('')}</div>`}
function gImport(){$('#gb').innerHTML=`<h2 style="margin-bottom:.4rem">Importer des livres</h2><div class="panel"><p>Fichier CSV exporté depuis Access ou Excel (séparateur « ; » ou « , », première ligne = noms des colonnes : N°, Prénom, Auteur, Titre, Sous-titre, Éditeur, Ville, Collection, Tome, Année, Code…).</p>
  <input id="csv" class="inp" type="file" accept=".csv,.txt"><div class="acts" style="justify-content:flex-start"><button class="btn pri" data-a="imp">${ico('upload')}Importer</button></div><p id="imp" class="muted sm" style="margin:.6rem 0 0"></p></div>`}
/* ---------- Compte ---------- */
async function pAccount(){if(!S.me){$('#app').innerHTML=`<div class="login"><div class="panel"><h2>Connexion</h2><p class="muted">Réservé aux étudiants, bibliothécaires et administrateurs. La consultation du catalogue reste libre.</p><form data-form="login"><label class="f">Email ou identifiant<input class="inp" name="login" autocomplete="username" autocapitalize="none" required></label><label class="f">Mot de passe<input class="inp" name="password" type="password" autocomplete="current-password" required></label><button class="btn pri">Se connecter</button></form></div></div>`;return}
  $('#app').innerHTML=`<div class="ph"><h1>Mon compte</h1></div><div class="panel"><h3>${esc(S.me.name)} <span class="tag acc">${ROLE[S.me.role]}</span></h3><p>${esc([S.me.username&&'Identifiant : '+S.me.username,S.me.email].filter(Boolean).join(' · '))}</p><button class="btn" data-a="out">${ico('out')}Se déconnecter</button></div>
  <h2 class="h2">Changer mon mot de passe</h2><form class="panel" data-form="pw"><div class="fgrid"><label class="f">Ancien mot de passe<input class="inp" name="old" type="password" required></label><label class="f">Nouveau mot de passe<input class="inp" name="new" type="password" minlength="6" required></label></div><div class="acts"><button class="btn pri">Enregistrer</button></div></form>`}
/* ---------- Actions ---------- */
const FORMS={async login(f){try{const j=await api('login','POST',{login:f.login.value,password:f.password.value});localStorage.setItem('tok',j.token);localStorage.setItem('usr',JSON.stringify(j.user));S.me=j.user;S.people=null;await loadLoans();await loadWish();location.hash='#/'}catch(e){toast(e.message)}},
  homesearch(f){S.cat.q=f.q.value;S.cat.kind='physique';S.cat.dom='';location.hash='#/catalogue'},
  async add(f){const r=await ok(api('books','POST',vals(f)));if(r.error)return toast(r.error.message);S.books={};await loadBooks('physique');toast('Livre ajouté');f.reset()},
  async newuser(f){if(!f.elements.username.value.trim()&&!f.email.value.trim())return toast('Indiquez au moins un identifiant ou un email');const r=await ok(api('users','POST',{name:f.elements.name.value,username:f.elements.username.value,email:f.email.value,password:f.password.value,role:f.role.value}));r.error?toast(r.error.message):(toast('Compte créé'),gUsers())},
  async idn(f){const r=await ok(api('users/'+f.dataset.id,'PATCH',{username:f.elements.username.value,email:f.elements.email.value}));r.error?toast(r.error.message):(toast('Identifiants enregistrés'),closeDlg(),gUsers())},
  async resetpw(f){const r=await ok(api('users/'+f.dataset.id,'PATCH',{password:f.elements.p.value}));r.error?toast(r.error.message):(toast('Mot de passe modifié'),closeDlg())},
  async pw(f){const r=await ok(api('me/password','PATCH',{old:f.old.value,new:f.new.value}));r.error?toast(r.error.message):(toast('Mot de passe modifié'),f.reset())},
  async edit(f){const id=+f.dataset.id,r=await ok(api('books/'+id,'PATCH',vals(f)));if(r.error)return toast(r.error.message);await after(id);toast('Enregistré');closeDlg();route(true)}};
document.addEventListener('submit',e=>{e.preventDefault();const f=e.target;FORMS[f.dataset.form]?.(f)});
document.addEventListener('click',async e=>{const t=e.target.closest('[data-a]');if(!t)return;const a=t.dataset.a,id=+t.dataset.id;if(t.tagName=='A'&&a=='open')e.preventDefault();let r;
  const go=async(p,m='POST',b)=>{r=await ok(api(p,m,b));if(r.error){toast(r.error.message);return false}try{await after(id)}catch{}S.idx[id]&&$('#dlg').open&&a!='del'&&openBook(id);if(location.hash.match(/retraits|gestion/))route(true);return true};
  switch(a){case'close':return closeDlg();case'wish':return wishToggle(id);case'open':return openBook(id);case'map':return openBook(id,true);case'more':S.cat.lim+=60;return renderResults();case'askbot':return void dispatchEvent(new CustomEvent('bot:ask',{detail:S.cat.q}));
   case'kind':S.cat.kind=t.dataset.k;S.cat.dom='';S.cat.sort=t.dataset.k=='physique'?'domain':'path';return pCat();
   case'gokind':S.cat.kind=t.dataset.k;S.cat.dom='';S.cat.q='';S.cat.sort=t.dataset.k=='physique'?'domain':'path';location.hash='#/catalogue';return pCat();
   case'godom':S.cat={kind:'physique',q:'',dom:t.dataset.d,sort:'title',lim:60};location.hash='#/catalogue';return;
   case'out':localStorage.removeItem('tok');localStorage.removeItem('usr');S.me=null;S.people=null;S.loans={};S.wish=new Set();location.hash='#/';return route();
   case'borrow':if(await go(`books/${id}/borrow`,'POST',{}))toast('Livre retiré : il figure dans vos retraits');return;
   case'lend':return lendDlg(id);
   case'lendgo':{const w=document.querySelector('input[name=lw]:checked').value,body=w=='visitor'?{visitor:$('#lname').value}:w=='user'?{user_id:+$('#luser').value}:{};if(w=='visitor'&&!$('#lname').value.trim())return toast('Indiquez le nom du visiteur');
    if(await go(`books/${id}/borrow`,'POST',body))toast('Retrait enregistré');return}
   case'ret':if(await go(`books/${id}/return`))toast(isStaff()?'Retour enregistré':'Retour signalé : en attente de validation par un bibliothécaire');return;
   case'val':if(await go(`books/${id}/validate`))toast('Retour validé');return;
   case'lost':return void await go(`books/${id}/lost`,'PATCH');
   case'del':if(confirm('Supprimer définitivement ce livre ?')&&await go('books/'+id,'DELETE')){delete S.idx[id];S.books={};closeDlg();route(true)}return;
   case'edit':return dlg(`<h2>Modifier / vérifier</h2><form data-form="edit" data-id="${id}">${bookForm(S.idx[id])}<div class="acts"><button type="button" class="btn" data-a="close">Annuler</button><button class="btn pri">Enregistrer et valider</button></div></form>`);
   case'imp':return importCsv();
   case'idn':return dlg(`<h2>Identifiants</h2><p class="muted">${esc(t.dataset.n)}</p><form data-form="idn" data-id="${id}"><div class="fgrid"><label class="f">Identifiant<input class="inp" name="username" value="${esc(t.dataset.u)}" autocomplete="off" autocapitalize="none"></label><label class="f">Email<input class="inp" name="email" type="email" value="${esc(t.dataset.e)}" autocomplete="off"></label></div><div class="acts"><button type="button" class="btn" data-a="close">Annuler</button><button class="btn pri">Enregistrer</button></div></form>`);
   case'pw':return dlg(`<h2>Nouveau mot de passe</h2><p class="muted">${esc(t.dataset.n)}</p><form data-form="resetpw" data-id="${id}"><label class="f">Mot de passe provisoire (6 caractères min.)<input class="inp" name="p" minlength="6" autocomplete="new-password" required></label><div class="acts"><button type="button" class="btn" data-a="close">Annuler</button><button class="btn pri">Enregistrer</button></div></form>`);
   case'act':{const x=await ok(api('users/'+id,'PATCH',{active:t.dataset.v=='1'}));x.error&&toast(x.error.message);return gUsers()}}});
/* ---------- Démarrage ---------- */
(async()=>{renderNav();initAssistant({api,loadBooks,open:openBook,nice,ico,esc,S});if(localStorage.getItem('tok'))try{S.me=await api('me');localStorage.setItem('usr',JSON.stringify(S.me));await loadLoans();await loadWish()}catch{}route()})();
