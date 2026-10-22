import {createClient} from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm';
import {SUPABASE_URL,SUPABASE_KEY} from './config.js';
import {showMap} from './map3d.js';
const sb=createClient(SUPABASE_URL,SUPABASE_KEY),$=s=>document.querySelector(s),dlg=$('#dlg');
const norm=s=>(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const col=()=>'#b8892f';
const toast=m=>{const t=$('#toast');t.textContent=m;t.style.display='block';setTimeout(()=>t.style.display='none',3500)};
let books=[],loans={},me=null,admin=false,uname='',dom='';
const sorts={domain:(a,b)=>(a.domain||'').localeCompare(b.domain||'')||a.title.localeCompare(b.title),author:(a,b)=>(a.author||'').localeCompare(b.author||''),title:(a,b)=>a.title.localeCompare(b.title),year:(a,b)=>(b.year||0)-(a.year||0)};
function lev(a,b){const d=Array.from({length:a.length+1},(_,i)=>[i]);for(let j=1;j<=b.length;j++)d[0][j]=j;for(let i=1;i<=a.length;i++)for(let j=1;j<=b.length;j++)d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+(a[i-1]==b[j-1]?0:1));return d[a.length][b.length]}
function search(q){const t=norm(q).split(/\s+/).filter(Boolean);if(!t.length)return{exact:[...books],near:[]};const exact=[],near=[];
 for(const b of books){let cost=0,ok=true;for(const w of t){if(b._t.includes(w))continue;const lim=w.length<4?0:w.length<7?1:2;let best=9;if(lim)for(const x of b._w)best=Math.min(best,lev(w,x),lev(w,x.slice(0,w.length)));if(best<=lim)cost+=best;else{ok=false;break}}
  if(ok)(cost?near:exact).push(Object.assign(b,{_c:cost}))}
 return{exact,near:near.sort((a,b)=>a._c-b._c)}}
function prep(){books.forEach(b=>{b._t=norm([b.title,b.author,b.domain,b.isbn].join(' '));b._w=b._t.split(/\s+/)})}
async function load(){try{let all=[],f=0;for(;;){const{data,error}=await sb.from('books').select('*').order('id').range(f,f+999);if(error)throw error;all.push(...data);if(data.length<1000)break;f+=1000}
  books=all;localStorage.setItem('cat',JSON.stringify(all))}catch(e){books=JSON.parse(localStorage.getItem('cat')||'[]');toast('Mode hors ligne : catalogue en mémoire')}
 prep();loans={};if(me){const{data}=await sb.from('loans').select('book_id,user_id,profiles(full_name)').is('returned_at',null);loans=Object.fromEntries((data||[]).map(l=>[l.book_id,l]))}render()}
const card=b=>{const l=loans[b.id],st=b.lost?'<span class="tag r">Perdu</span>':b.status=='borrowed'?`<span class="tag o">Emprunté${l?.profiles?' par '+esc(l.profiles.full_name):''}</span>`:'<span class="tag g">Disponible</span>',a=(k,t)=>`<button data-a="${k}" data-id="${b.id}">${t}</button>`;
 return`<article class="card" style="--c:${col(b.domain)}"><h3>${esc(b.title)}</h3><p>${esc(b.author)} ${b.year?'('+b.year+')':''}</p><small>${esc(b.domain)}</small><div>${st}</div><div class="act">${a('loc','📍 Localiser')}${me&&b.status=='available'&&!b.lost?a('borrow','Emprunter'):''}${me&&b.status=='borrowed'&&(admin||l?.user_id==me.id)?a('ret','Rendu'):''}${admin?a('lost',b.lost?'Retrouvé':'Perdu')+a('del','🗑'):''}</div></article>`};
function render(){const q=$('#q').value,{exact,near}=search(q),f=x=>dom?x.filter(b=>b.domain==dom):x;
 $('#list').innerHTML=f(exact).sort(sorts[$('#sort').value]).slice(0,200).map(card).join('')||'<p class="mut">Aucun résultat exact.</p>';
 $('#sugg').innerHTML=near.length?'<h3>Vouliez-vous dire…</h3><div class="grid">'+f(near).slice(0,12).map(card).join('')+'</div>':'';
 const ds=[...new Set(books.map(b=>b.domain).filter(Boolean))].sort();
 $('#chips').innerHTML=['',...ds].map(d=>`<button data-a="dom" data-d="${esc(d)}" class="${d==dom?'on':''}">${d?esc(d):'Tous'}</button>`).join('')}
function acct(){$('#acct').innerHTML=me?`${esc(uname)} <button data-a="hist">Historique</button> ${admin?'<button data-a="adm">Administration</button>':''} <button data-a="out">Quitter</button>`:'<button data-a="login">Connexion</button>'}
function open(h){dlg.innerHTML=h+'<p><button data-a="close">Fermer</button></p>';dlg.showModal()}
const F=['title','author','year','domain','isbn','rayon','etagere','bloc'],P=['Titre','Auteur','Année','Domaine','ISBN','Rayon (A-F)','Étagère (1-5)','Bloc (1-6)'];
function csv(t){const sep=t.split('\n')[0].includes(';')?';':',',r=[];let row=[],c='',q=false;for(let i=0;i<t.length;i++){const h=t[i];if(q){if(h=='"'&&t[i+1]=='"'){c+='"';i++}else if(h=='"')q=false;else c+=h}else if(h=='"')q=true;else if(h==sep){row.push(c);c=''}else if(h=='\n'||h=='\r'){if(h=='\r'&&t[i+1]=='\n')i++;row.push(c);r.push(row);row=[];c=''}else c+=h}if(c||row.length){row.push(c);r.push(row)}return r.filter(x=>x.join('').trim())}
const H={titre:'title',title:'title',auteur:'author',author:'author',annee:'year',year:'year',domaine:'domain',domain:'domain',isbn:'isbn',rayon:'rayon',etagere:'etagere',bloc:'bloc'},num=v=>parseInt(v)||null;
document.addEventListener('click',async e=>{const t=e.target.closest('[data-a]');if(!t)return;const a=t.dataset.a,id=+t.dataset.id,b=books.find(x=>x.id==id);let r;
 if(a=='close')return dlg.close();if(a=='dom'){dom=t.dataset.d;return render()}
 if(a=='loc'){if(!b.rayon)return open(`<h2>${esc(b.title)}</h2><p class="mut">Emplacement pas encore renseigné.</p>`);open(`<h2>${esc(b.title)}</h2><p>Rayon <b>${esc(b.rayon)}</b> · étagère <b>${b.etagere}</b> · bloc <b>${b.bloc}</b></p><div id="map"></div><p class="mut">Faites glisser pour tourner, pincez pour zoomer.</p>`);return showMap($('#map'),b)}
 if(a=='login')return open('<h2>Connexion</h2><input id="em" type="email" placeholder="Email"><input id="pw" type="password" placeholder="Mot de passe"><p><button data-a="dologin">Se connecter</button></p>');
 if(a=='dologin'){const{error}=await sb.auth.signInWithPassword({email:$('#em').value,password:$('#pw').value});return error?toast('Email ou mot de passe incorrect'):dlg.close()}
 if(a=='out')return sb.auth.signOut();
 if(a=='hist'){const{data}=await sb.from('loans').select('borrowed_at,returned_at,user_id,books(title),profiles(full_name)').order('borrowed_at',{ascending:false}).limit(300);
  return open('<h2>Historique des retraits</h2>'+((data||[]).filter(l=>admin||l.user_id==me.id).map(l=>`<p>${esc(l.books?.title)} · ${admin?esc(l.profiles?.full_name)+' · ':''}${new Date(l.borrowed_at).toLocaleDateString('fr')} ${l.returned_at?'→ rendu':'(en cours)'}</p>`).join('')||'<p class="mut">Aucun retrait.</p>'))}
 if(a=='adm')return open('<h2>Administration</h2><h3>Ajouter un livre</h3>'+F.map((f,i)=>`<input id="f_${f}" placeholder="${P[i]}">`).join('')+'<p><button data-a="add">Ajouter</button></p><h3>Importer un fichier CSV</h3><input id="csv" type="file" accept=".csv"><p><button data-a="imp">Importer</button></p>');
 if(a=='add'){const o={};F.forEach(f=>o[f]=$('#f_'+f).value.trim()||null);['year','etagere','bloc'].forEach(k=>o[k]=num(o[k]));r=await sb.from('books').insert(o);if(!r.error){toast('Livre ajouté');dlg.close()}}
 if(a=='imp'){const f=$('#csv').files[0];if(!f)return toast('Choisissez un fichier');const buf=await f.arrayBuffer();let tx;try{tx=new TextDecoder('utf-8',{fatal:true}).decode(buf)}catch{tx=new TextDecoder('windows-1252').decode(buf)}
  const rows=csv(tx),hd=rows[0].map(h=>H[norm(h).trim()]),objs=rows.slice(1).map(x=>{const o={};hd.forEach((k,i)=>k&&(o[k]=x[i]?.trim()||null));['year','etagere','bloc'].forEach(k=>o[k]=num(o[k]));return o}).filter(o=>o.title);
  for(let i=0;i<objs.length;i+=500){r=await sb.from('books').insert(objs.slice(i,i+500));if(r.error)break}if(!r.error){toast(objs.length+' livres importés');dlg.close()}}
 if(a=='borrow')r=await sb.rpc('borrow_book',{p_book:id});if(a=='ret')r=await sb.rpc('return_book',{p_book:id});
 if(a=='lost')r=await sb.from('books').update({lost:!b.lost}).eq('id',id);if(a=='del'&&confirm('Supprimer ce livre ?'))r=await sb.from('books').delete().eq('id',id);
 if(r?.error)toast(r.error.message);if(r&&!r.error)load()});
$('#q').oninput=render;$('#sort').onchange=render;
async function init(s){me=s?.user||null;admin=false;uname='';if(me){const{data}=await sb.from('profiles').select('role,full_name').eq('id',me.id).single();admin=data?.role=='admin';uname=data?.full_name||me.email}acct();load()}
sb.auth.onAuthStateChange((_,s)=>setTimeout(()=>init(s),0));
