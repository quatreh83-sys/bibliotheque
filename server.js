import express from 'express';import compression from 'compression';import pg from 'pg';import bcrypt from 'bcryptjs';import jwt from 'jsonwebtoken';
import fs from 'fs';import zlib from 'zlib';import path from 'path';import {fileURLToPath} from 'url';
const E=process.env,SECRET=E.JWT_SECRET||'changez-moi',DIR=path.dirname(fileURLToPath(import.meta.url));
const db=new pg.Pool({connectionString:E.DATABASE_URL,ssl:{rejectUnauthorized:false}});
const q=(s,p)=>db.query(s,p).then(r=>r.rows),qa=(s,p)=>db.query({text:s,values:p,rowMode:'array'}).then(r=>r.rows);
const fail=(http,error)=>Object.assign(new Error(error),{http});
const tx=async f=>{const c=await db.connect();try{await c.query('begin');const r=await f((s,p)=>c.query(s,p).then(x=>x.rows));await c.query('commit');return r}catch(e){await c.query('rollback');throw e}finally{c.release()}};
const app=express();app.use(compression());app.use(express.json({limit:'10mb'}));
const wrap=f=>(req,res)=>f(req,res).catch(e=>{if(!e.http)console.error(e);const dup=e.code=='23505';res.status(e.http||(dup?409:500)).json({error:e.http?e.message:dup?'Existe déjà':'Erreur serveur'})});
const auth=async(req,res,next)=>{try{const t=jwt.verify((req.headers.authorization||'').slice(7),SECRET),[u]=await q('select id,full_name,email,role,active from users where id=$1',[t.id]);if(!u||!u.active)throw 0;req.u=u;next()}catch{res.status(401).json({error:'Connexion requise'})}};
const need=(...r)=>(req,res,next)=>r.includes(req.u.role)?next():res.status(403).json({error:'Accès refusé'});
const adm=need('admin'),staff=need('admin','librarian'),ROLES=['student','librarian','admin'];

/* ---------- Schéma (créé / mis à jour automatiquement) ---------- */
await q(`create table if not exists users(id serial primary key,email text unique not null,full_name text,role text not null default 'student',password_hash text not null,active boolean not null default true,created_at timestamptz default now());
create table if not exists books(id serial primary key,kind text not null default 'physique',numero int,title text not null,subtitle text,author text,publisher text,city text,collection text,volume text,year int,code text,domain text,path text,filetype text,isbn text,rayon text,etagere int,bloc int,status text not null default 'available',lost boolean not null default false,reviewed boolean not null default true,added_by int);
create table if not exists loans(id serial primary key,book_id int references books on delete cascade,user_id int references users,borrower_name text,lent_by int references users,borrowed_at timestamptz default now(),return_requested_at timestamptz,returned_at timestamptz);
create table if not exists meta(k text primary key,v text);
alter table users add column if not exists active boolean not null default true;
alter table books add column if not exists kind text not null default 'physique';alter table books add column if not exists numero int;alter table books add column if not exists path text;alter table books add column if not exists filetype text;
alter table books add column if not exists reviewed boolean not null default true;alter table books add column if not exists added_by int;
alter table loans add column if not exists return_requested_at timestamptz;alter table loans add column if not exists borrower_name text;alter table loans add column if not exists lent_by int;
alter table loans alter column user_id drop not null;
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
const BC='id,kind,numero,title,subtitle,author,publisher,city,collection,volume,year,code,domain,path,filetype,isbn,rayon,etagere,bloc,status,lost,reviewed';
app.get('/api/stats',wrap(async(_,r)=>{const[s]=await q("select count(*) filter(where kind='physique')::int physique,count(*) filter(where kind='numerique')::int numerique,count(*) filter(where kind='physique' and status='available' and not lost)::int available,count(*) filter(where kind='physique' and status='borrowed')::int borrowed from books");r.json(s)}));
app.get('/api/books',wrap(async(req,res)=>res.json({cols:BC.split(','),rows:await qa(`select ${BC} from books where kind=$1 order by id`,[req.query.kind=='numerique'?'numerique':'physique'])})));
app.get('/api/books/:id',wrap(async(req,res)=>{const[b]=await q(`select ${BC} from books where id=$1`,[+req.params.id]);b?res.json(b):res.status(404).json({error:'Introuvable'})}));
app.post('/api/login',wrap(async(req,res)=>{const[u]=await q('select * from users where email=$1',[(req.body.email||'').toLowerCase().trim()]);
  if(!u||!u.active||!await bcrypt.compare(req.body.password||'',u.password_hash))throw fail(401,'Email ou mot de passe incorrect');
  const user={id:u.id,name:u.full_name||u.email,email:u.email,role:u.role};res.json({token:jwt.sign({id:u.id},SECRET,{expiresIn:'30d'}),user})}));

/* ---------- Compte ---------- */
app.get('/api/me',auth,(req,res)=>res.json({id:req.u.id,name:req.u.full_name||req.u.email,email:req.u.email,role:req.u.role}));
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
app.get('/api/users',auth,adm,wrap(async(_,r)=>r.json(await q('select id,email,full_name,role,active,created_at from users order by role,full_name'))));
app.post('/api/users',auth,adm,wrap(async(req,res)=>{const{email,name,password,role}=req.body;if(!email||(password||'').length<6)throw fail(400,'Email et mot de passe (6 caractères min.) requis');
  await q('insert into users(email,full_name,role,password_hash) values($1,$2,$3,$4)',[email.toLowerCase().trim(),name||email,ROLES.includes(role)?role:'student',await bcrypt.hash(password,10)]);res.json({ok:1})}));
app.patch('/api/users/:id',auth,adm,wrap(async(req,res)=>{const id=+req.params.id,b=req.body;
  if(id==req.u.id&&('role'in b||'active'in b))throw fail(400,'Vous ne pouvez pas modifier votre propre rôle ou statut');
  if('role'in b){if(!ROLES.includes(b.role))throw fail(400,'Rôle invalide');await q('update users set role=$1 where id=$2',[b.role,id])}
  if('active'in b)await q('update users set active=$1 where id=$2',[!!b.active,id]);
  if('full_name'in b)await q('update users set full_name=$1 where id=$2',[b.full_name,id]);
  if(b.password){if(b.password.length<6)throw fail(400,'6 caractères minimum');await q('update users set password_hash=$1 where id=$2',[await bcrypt.hash(b.password,10),id])}
  res.json({ok:1})}));

app.use(express.static(path.join(DIR,'docs')));
app.listen(E.PORT||3000,()=>console.log('Serveur prêt'));
