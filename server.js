import express from 'express';import compression from 'compression';import pg from 'pg';import bcrypt from 'bcryptjs';import jwt from 'jsonwebtoken';
import fs from 'fs';import zlib from 'zlib';import path from 'path';import {fileURLToPath} from 'url';
const E=process.env,SECRET=E.JWT_SECRET||'changez-moi',DIR=path.dirname(fileURLToPath(import.meta.url));
const db=new pg.Pool({connectionString:E.DATABASE_URL,ssl:{rejectUnauthorized:false}});
const q=(s,p)=>db.query(s,p).then(r=>r.rows),qa=(s,p)=>db.query({text:s,values:p,rowMode:'array'}).then(r=>r.rows);
const fail=(http,error)=>Object.assign(new Error(error),{http});
const tx=async f=>{const c=await db.connect();try{await c.query('begin');const r=await f((s,p)=>c.query(s,p).then(x=>x.rows));await c.query('commit');return r}catch(e){await c.query('rollback');throw e}finally{c.release()}};
import {domainOf} from './docs/domaines.js';
const app=express();app.set('trust proxy',1);app.use(compression());app.use(express.json({limit:'10mb'}));
const wrap=f=>(req,res)=>f(req,res).catch(e=>{if(!e.http)console.error(e);const dup=e.code=='23505';res.status(e.http||(dup?409:500)).json({error:e.http?e.message:dup?'Cet identifiant ou cet email est déjà utilisé':'Erreur serveur'})});
const auth=async(req,res,next)=>{try{const t=jwt.verify((req.headers.authorization||'').slice(7),SECRET),[u]=await q('select id,full_name,email,username,role,active from users where id=$1',[t.id]);if(!u||!u.active)throw 0;req.u=u;next()}catch{res.status(401).json({error:'Connexion requise'})}};
const need=(...r)=>(req,res,next)=>r.includes(req.u.role)?next():res.status(403).json({error:'Accès refusé'});
const adm=need('admin'),staff=need('admin','librarian','trainer'),ROLES=['student','librarian','trainer','admin'];

/* ---------- Schéma (créé / mis à jour automatiquement) ---------- */
await q(`create table if not exists users(id serial primary key,email text unique not null,full_name text,role text not null default 'student',password_hash text not null,active boolean not null default true,created_at timestamptz default now());
create table if not exists books(id serial primary key,kind text not null default 'physique',numero int,title text not null,subtitle text,author text,publisher text,city text,collection text,volume text,year int,code text,domain text,path text,filetype text,isbn text,rayon text,etagere int,bloc int,status text not null default 'available',lost boolean not null default false,reviewed boolean not null default true,added_by int);
create table if not exists loans(id serial primary key,book_id int references books on delete cascade,user_id int references users,borrower_name text,lent_by int references users,borrowed_at timestamptz default now(),return_requested_at timestamptz,returned_at timestamptz);
create table if not exists meta(k text primary key,v text);
alter table users add column if not exists active boolean not null default true;alter table users add column if not exists created_at timestamptz default now();
alter table books add column if not exists kind text not null default 'physique';alter table books add column if not exists numero int;alter table books add column if not exists path text;alter table books add column if not exists filetype text;
alter table books add column if not exists reviewed boolean not null default true;alter table books add column if not exists added_by int;
alter table loans add column if not exists return_requested_at timestamptz;alter table loans add column if not exists borrower_name text;alter table loans add column if not exists lent_by int;
alter table loans alter column user_id drop not null;alter table users alter column email drop not null;alter table users add column if not exists username text;create unique index if not exists users_username on users(lower(username));
create table if not exists wishlist(user_id int references users on delete cascade,book_id int references books on delete cascade,added_at timestamptz default now(),primary key(user_id,book_id));
create index if not exists books_kind on books(kind);create index if not exists loans_open on loans(book_id) where returned_at is null`);
if(E.ADMIN_EMAIL&&E.ADMIN_PASSWORD)await q(`insert into users(email,full_name,role,password_hash) values($1,$2,'admin',$3) on conflict(email) do update set role='admin',password_hash=$3,active=true`,[E.ADMIN_EMAIL.toLowerCase(),E.ADMIN_NAME||'Administrateur',await bcrypt.hash(E.ADMIN_PASSWORD,10)]);

/* ---------- Chargement initial du catalogue (une seule fois) ---------- */
const SC=['kind','numero','title','subtitle','author','publisher','city','collection','volume','year','code','domain','path','filetype'],seedFile=path.join(DIR,'data','catalogue.json.gz');
if(fs.existsSync(seedFile)&&!(await q("select 1 from meta where k='seed'")).length&&!(await q('select 1 from loans limit 1')).length){
  const d=JSON.parse(zlib.gunzipSync(fs.readFileSync(seedFile)));await q('delete from books');
  for(let i=0;i<d.rows.length;i+=1000){const objs=d.rows.slice(i,i+1000).map(r=>Object.fromEntries(d.cols.map((c,j)=>[c,r[j]])));
    await q(`insert into books(${SC}) select ${SC.map(c=>c=='kind'?"coalesce(kind,'physique')":c)} from json_populate_recordset(null::books,$1)`,[JSON.stringify(objs)])}
  await q("insert into meta values('seed',$1)",[d.version]);console.log('Catalogue chargé :',d.rows.length,'notices')}

/* ---------- Public ---------- */
app.get('/api/version',(_,r)=>r.json({version:'2.1'}));
const BC='id,kind,numero,title,subtitle,author,publisher,city,collection,volume,year,code,domain,path,filetype,isbn,rayon,etagere,bloc,status,lost,reviewed';
app.get('/api/stats',wrap(async(_,r)=>{const[s]=await q("select count(*) filter(where kind='physique')::int physique,count(*) filter(where kind='numerique')::int numerique,count(*) filter(where kind='physique' and status='available' and not lost)::int available,count(*) filter(where kind='physique' and status='borrowed')::int borrowed from books");r.json(s)}));
app.get('/api/books',wrap(async(req,res)=>res.json({cols:BC.split(','),rows:await qa(`select ${BC} from books where kind=$1 order by id`,[req.query.kind=='numerique'?'numerique':'physique'])})));
app.get('/api/books/:id',wrap(async(req,res)=>{const[b]=await q(`select ${BC} from books where id=$1`,[+req.params.id]);b?res.json(b):res.status(404).json({error:'Introuvable'})}));
app.post('/api/login',wrap(async(req,res)=>{const L=String(req.body.login||req.body.email||'').toLowerCase().trim(),[u]=await q('select * from users where lower(email)=$1 or lower(username)=$1 limit 1',[L]);
  if(!u||!u.active||!await bcrypt.compare(req.body.password||'',u.password_hash))throw fail(401,'Identifiant ou mot de passe incorrect');
  const user={id:u.id,name:u.full_name||u.username||u.email,email:u.email,username:u.username,role:u.role};res.json({token:jwt.sign({id:u.id},SECRET,{expiresIn:'30d'}),user})}));

/* ---------- Compte ---------- */
app.get('/api/me',auth,(req,res)=>res.json({id:req.u.id,name:req.u.full_name||req.u.username||req.u.email,email:req.u.email,username:req.u.username,role:req.u.role}));
app.patch('/api/me/password',auth,wrap(async(req,res)=>{const[u]=await q('select password_hash from users where id=$1',[req.u.id]);
  if(!await bcrypt.compare(req.body.old||'',u.password_hash))throw fail(400,'Ancien mot de passe incorrect');if((req.body.new||'').length<6)throw fail(400,'6 caractères minimum');
  await q('update users set password_hash=$1 where id=$2',[await bcrypt.hash(req.body.new,10),req.u.id]);res.json({ok:1})}));

/* ---------- Retraits ---------- */
app.get('/api/loans/active',auth,wrap(async(_,r)=>r.json(await q("select l.book_id,l.user_id,l.return_requested_at,coalesce(l.borrower_name,u.full_name) borrower from loans l left join users u on u.id=l.user_id where l.returned_at is null"))));
app.get('/api/loans',auth,wrap(async(req,res)=>{const{scope,status,cat,q:s}=req.query,P=[],w=[];
  if(scope!='all'||req.u.role=='student'){P.push(req.u.id);w.push(`l.user_id=$${P.length}`)}
  if(status=='active')w.push('l.returned_at is null');if(status=='pending')w.push('l.returned_at is null and l.return_requested_at is not null');if(status=='returned')w.push('l.returned_at is not null');
  if(cat=='visitor')w.push('l.user_id is null');else if(ROLES.includes(cat)){P.push(cat);w.push(`u.role=$${P.length}`)}
  if(s){P.push('%'+s+'%');w.push(`(coalesce(l.borrower_name,u.full_name) ilike $${P.length} or b.title ilike $${P.length} or b.code ilike $${P.length})`)}
  res.json(await q(`select l.id,l.book_id,b.title,b.code,b.author,l.borrowed_at,l.return_requested_at,l.returned_at,coalesce(l.borrower_name,u.full_name) borrower,coalesce(u.role,'visitor') cat,lb.full_name lent_by from loans l join books b on b.id=l.book_id left join users u on u.id=l.user_id left join users lb on lb.id=l.lent_by ${w.length?'where '+w.join(' and '):''} order by l.borrowed_at desc limit 600`,P))}));
app.get('/api/people',auth,staff,wrap(async(_,r)=>r.json(await q('select id,full_name,role from users where active order by full_name'))));
app.post('/api/books/:id/borrow',auth,wrap(async(req,res)=>{const id=+req.params.id,{visitor,user_id}=req.body||{},isStaff=req.u.role!='student';
  await tx(async t=>{const[b]=await t('select status,lost,kind from books where id=$1 for update',[id]);
    if(!b)throw fail(404,'Introuvable');if(b.kind!='physique')throw fail(400,'Document numérique : pas de retrait');if(b.lost)throw fail(409,'Livre signalé perdu');
    if(b.status=='borrowed'){const v=await t('update loans set returned_at=now() where book_id=$1 and returned_at is null and return_requested_at is not null returning id',[id]);if(!v.length)throw fail(409,'Livre déjà retiré')}
    let uid=req.u.id,name=null,lent=null;if(isStaff&&(visitor||user_id)){lent=req.u.id;if(visitor){uid=null;name=String(visitor).trim().slice(0,120);if(!name)throw fail(400,'Nom du visiteur requis')}else uid=+user_id}
    await t("update books set status='borrowed' where id=$1",[id]);await t('insert into loans(book_id,user_id,borrower_name,lent_by) values($1,$2,$3,$4)',[id,uid,name,lent])});
  res.json({ok:1})}));
const fin=async(t,id)=>{await t('update loans set returned_at=now() where book_id=$1 and returned_at is null',[id]);await t("update books set status='available' where id=$1",[id])};
app.post('/api/books/:id/return',auth,wrap(async(req,res)=>{const id=+req.params.id;await tx(async t=>{const[l]=await t('select user_id from loans where book_id=$1 and returned_at is null',[id]);
  if(!l)throw fail(409,'Aucun retrait en cours');if(req.u.role!='student')return fin(t,id);if(l.user_id!=req.u.id)throw fail(403,'Non autorisé');
  await t('update loans set return_requested_at=coalesce(return_requested_at,now()) where book_id=$1 and returned_at is null',[id])});res.json({ok:1})}));
app.post('/api/books/:id/validate',auth,staff,wrap(async(req,res)=>{await tx(t=>fin(t,+req.params.id));res.json({ok:1})}));

/* ---------- Gestion du catalogue ---------- */
const EF=['title','subtitle','author','publisher','city','collection','volume','year','code','domain','isbn','rayon','etagere','bloc'];
app.post('/api/books',auth,staff,wrap(async(req,res)=>{
  if(Array.isArray(req.body)){if(req.u.role!='admin')throw fail(403,'Import réservé à l’administrateur');
    await q(`insert into books(${SC}) select ${SC.map(c=>c=='kind'?"coalesce(kind,'physique')":c)} from json_populate_recordset(null::books,$1)`,[JSON.stringify(req.body)]);return res.json({n:req.body.length})}
  if(!String(req.body.title||'').trim())throw fail(400,'Titre requis');
  await q(`insert into books(${EF},reviewed,added_by) values(${EF.map((_,i)=>'$'+(i+1))},$${EF.length+1},$${EF.length+2})`,[...EF.map(k=>req.body[k]??null),req.u.role=='admin',req.u.id]);res.json({n:1})}));
app.patch('/api/books/:id',auth,adm,wrap(async(req,res)=>{const k=EF.filter(x=>x in req.body);if(!k.length)return res.json({ok:1});
  await q(`update books set ${k.map((x,i)=>x+'=$'+(i+1))},reviewed=true where id=$${k.length+1}`,[...k.map(x=>req.body[x]),+req.params.id]);res.json({ok:1})}));
app.patch('/api/books/:id/lost',auth,staff,wrap(async(req,res)=>{await q('update books set lost=not lost where id=$1',[+req.params.id]);res.json({ok:1})}));
app.delete('/api/books/:id',auth,adm,wrap(async(req,res)=>{await q('delete from books where id=$1',[+req.params.id]);res.json({ok:1})}));
app.get('/api/reports',auth,adm,wrap(async(_,r)=>r.json(await q('select b.id,b.title,b.code,u.full_name added_by_name from books b left join users u on u.id=b.added_by where not b.reviewed order by b.id desc'))));

/* ---------- Utilisateurs (administrateur) ---------- */
app.get('/api/users',auth,adm,wrap(async(_,r)=>r.json((await q('select * from users')).map(u=>({id:u.id,email:u.email,username:u.username,full_name:u.full_name||u.username||u.email,role:u.role,active:u.active!==false})).sort((a,b)=>a.role.localeCompare(b.role)||a.full_name.localeCompare(b.full_name,'fr')))));
const UN=/^[a-z0-9._-]{3,30}$/;
app.post('/api/users',auth,adm,wrap(async(req,res)=>{const{name,password,role}=req.body,email=String(req.body.email||'').trim().toLowerCase()||null,un=String(req.body.username||'').trim().toLowerCase()||null;
  if(!email&&!un)throw fail(400,'Indiquez au moins un identifiant ou un email');if(un&&!UN.test(un))throw fail(400,'Identifiant : 3 à 30 caractères (lettres, chiffres, . _ -)');if((password||'').length<6)throw fail(400,'Mot de passe : 6 caractères minimum');
  await q('insert into users(email,username,full_name,role,password_hash) values($1,$2,$3,$4,$5)',[email,un,name||un||email,ROLES.includes(role)?role:'student',await bcrypt.hash(password,10)]);res.json({ok:1})}));
app.patch('/api/users/:id',auth,adm,wrap(async(req,res)=>{const id=+req.params.id,b=req.body;
  if(id==req.u.id&&('role'in b||'active'in b))throw fail(400,'Vous ne pouvez pas modifier votre propre rôle ou statut');
  if('username'in b||'email'in b){const[u]=await q('select email,username from users where id=$1',[id]),em='email'in b?(String(b.email||'').trim().toLowerCase()||null):u.email,un='username'in b?(String(b.username||'').trim().toLowerCase()||null):u.username;
    if(!em&&!un)throw fail(400,'Il faut au moins un email ou un identifiant');if(un&&!UN.test(un))throw fail(400,'Identifiant : 3 à 30 caractères (lettres, chiffres, . _ -)');await q('update users set email=$1,username=$2 where id=$3',[em,un,id])}
  if('role'in b){if(!ROLES.includes(b.role))throw fail(400,'Rôle invalide');await q('update users set role=$1 where id=$2',[b.role,id])}
  if('active'in b)await q('update users set active=$1 where id=$2',[!!b.active,id]);
  if('full_name'in b)await q('update users set full_name=$1 where id=$2',[b.full_name,id]);
  if(b.password){if(b.password.length<6)throw fail(400,'6 caractères minimum');await q('update users set password_hash=$1 where id=$2',[await bcrypt.hash(b.password,10),id])}
  res.json({ok:1})}));


/* ---------- Recherche avancée (Gemini, clé sur le serveur) ---------- */
const nrm=s=>(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
let BI=null;const buildIdx=async()=>{const m=new Map();
  for(const b of await q("select id,title,subtitle,author,collection,code,domain,status,lost from books where kind='physique'")){const k=nrm(b.title)+'|'+nrm(b.author),ok=b.status=='available'&&!b.lost,o=m.get(k);
    if(!o){const dom=b.domain||domainOf(b.code);m.set(k,{...b,dom,ok,copies:1,ti:nrm(b.title),su:nrm(b.subtitle),au:nrm(b.author),co:nrm(b.collection),dm:nrm(dom)})}else{o.copies++;if(ok&&!o.ok)Object.assign(o,{id:b.id,code:b.code,ok:true})}}
  BI=[...m.values()]};
app.use('/api/books',(req,res,next)=>{if(req.method!='GET')BI=null;next()});
const has=(f,w,l)=>f&&(l?f.includes(w):(' '+f+' ').includes(' '+w+' '));
const retrieve=words=>{const T=[...new Set(words.map(w=>nrm(String(w)).trim()).filter(w=>w.length>=3))].slice(0,60),sc=[];
  for(const b of BI){let s=0;for(const w of T){const l=w.length>=4;if(has(b.ti,w,l))s+=3;if(has(b.su,w,l))s+=2;if(has(b.co,w,l))s+=1;if(has(b.au,w,l))s+=.5;if(s&&has(b.dm,w,l))s+=.3}if(s>0)sc.push([s,b])}
  return sc.sort((a,b)=>b[0]-a[0]).slice(0,50).map(x=>x[1])};
const gem=async prompt=>{const key=E.GEMINI_API_KEY;if(!key)throw fail(503,'La recherche avancée n’est pas encore configurée (clé Gemini manquante).');
  const r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(E.GEMINI_MODEL||'gemini-2.5-flash-lite')}:generateContent`,{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},
    body:JSON.stringify({contents:[{parts:[{text:prompt}]}],generationConfig:{temperature:0.2,responseMimeType:'application/json'}}),signal:AbortSignal.timeout(25000)}).catch(()=>{throw fail(504,'Le service d’IA ne répond pas. Réessayez dans un instant.')});
  if(!r.ok){console.error('Gemini',r.status,(await r.text()).slice(0,300));throw fail(r.status==429?429:502,r.status==429?'Le service gratuit est saturé pour le moment. Réessayez dans une minute.':r.status==404?'Modèle IA introuvable : vérifiez le réglage GEMINI_MODEL sur Render.':'Clé ou réglage Gemini invalide : vérifiez GEMINI_API_KEY et GEMINI_MODEL sur Render.')}
  const j=await r.json(),t=(j.candidates?.[0]?.content?.parts||[]).map(p=>p.text||'').join('').replace(/^\s*```(?:json)?|```\s*$/g,'').trim();try{return JSON.parse(t)}catch{throw fail(502,'Réponse de l’IA illisible. Réessayez.')}};
const rate=new Map(),memo=new Map();let day='',used=0;
app.post('/api/ai/search',wrap(async(req,res)=>{const s=String(req.body?.q||'').trim().slice(0,200);if(s.length<3)throw fail(400,'Écrivez au moins quelques mots.');
  const ck=nrm(s);if(memo.has(ck))return res.json(memo.get(ck));
  const now=Date.now(),h=(rate.get(req.ip)||[]).filter(t=>now-t<6e5);if(h.length>=12)throw fail(429,'Trop de questions : patientez quelques minutes.');
  const d=new Date().toISOString().slice(0,10);if(day!=d){day=d;used=0}if(used>=(+E.AI_DAILY_LIMIT||250))throw fail(429,'Limite quotidienne atteinte. Revenez demain.');
  h.push(now);rate.set(req.ip,h);used++;if(!BI)await buildIdx();
  const a=await gem(`Tu aides les lecteurs d'une bibliothèque catholique de théologie (livres surtout en français).\nDemande du lecteur : « ${s} »\nRéponds uniquement en JSON : {"comprehension":"une phrase courte qui reformule ce que cherche le lecteur","mots":["..."]}\n"mots" : 25 à 40 mots-clés ou racines utiles pour retrouver des livres dans un catalogue de titres (synonymes, termes théologiques proches, formes courtes comme "amour", "charit", "eglise"), en minuscules et sans accents.`).catch(e=>{if(e.http==429||e.http==503)throw e;return null});
  const cand=retrieve([...(a?.mots||[]),...s.split(/\s+/)]),byId=new Map(cand.map(b=>[b.id,b]));let out=[],mode='mots';
  if(cand.length){try{const g=await gem(`Demande du lecteur : « ${s} »\nLivres du catalogue (id | titre | auteur | domaine) :\n${cand.map(b=>`${b.id} | ${b.title} | ${b.author||'—'} | ${b.dom}`).join('\n')}\nChoisis jusqu'à 12 livres qui répondent vraiment à la demande, du plus au moins pertinent. N'utilise que les id fournis. Base-toi uniquement sur le titre, l'auteur et le domaine : n'invente aucun contenu.\nRéponds uniquement en JSON : {"resultats":[{"id":123,"raison":"une phrase courte"}]}`);
      const seen=new Set();out=(g.resultats||[]).filter(x=>byId.has(+x.id)&&!seen.has(+x.id)&&seen.add(+x.id)).slice(0,12).map(x=>({id:+x.id,reason:String(x.raison||'').slice(0,160)}));mode='ia'}catch(e){console.error('classement IA indisponible :',e.message)}
    if(!out.length)out=cand.slice(0,12).map(b=>({id:b.id,reason:''}))}
  const r={comprehension:a?.comprehension||'',mode,results:out.map(x=>{const b=byId.get(x.id);return{id:b.id,title:b.title,author:b.author,code:b.code,copies:b.copies,reason:x.reason}})};
  if(memo.size>300)memo.delete(memo.keys().next().value);memo.set(ck,r);res.json(r)}));

/* ---------- Ma sélection (livres qui m'intéressent) ---------- */
app.get('/api/wishlist',auth,wrap(async(req,r)=>r.json(await q('select b.id,b.kind,b.title,b.author,b.code,w.added_at from wishlist w join books b on b.id=w.book_id where w.user_id=$1 order by w.added_at desc',[req.u.id]))));
app.post('/api/wishlist/:id',auth,wrap(async(req,res)=>{await q('insert into wishlist(user_id,book_id) values($1,$2) on conflict do nothing',[req.u.id,+req.params.id]);res.json({ok:1})}));
app.delete('/api/wishlist/:id',auth,wrap(async(req,res)=>{await q('delete from wishlist where user_id=$1 and book_id=$2',[req.u.id,+req.params.id]);res.json({ok:1})}));
app.use(express.static(path.join(DIR,'docs')));
app.listen(E.PORT||3000,()=>console.log('Serveur prêt'));
