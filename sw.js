const C='bib-v2',S=['./','index.html','styles.css','app.js','map3d.js','config.js','icon.svg'];
self.addEventListener('install',e=>e.waitUntil(caches.open(C).then(c=>c.addAll(S))));
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!='GET'||r.url.includes('supabase.co'))return;
 e.respondWith(fetch(r).then(x=>{const y=x.clone();caches.open(C).then(c=>c.put(r,y));return x}).catch(()=>caches.match(r)))});
