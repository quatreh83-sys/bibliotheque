/* Bulle « Recherche avancée » : déplaçable, mémorise sa position. */
export function initAssistant({api,loadBooks,open,nice,ico,esc,S}){
  const K='bib-bot',st=(()=>{try{return JSON.parse(localStorage.getItem(K))||{}}catch{return{}}})(),root=document.createElement('div');root.id='bot';
  root.innerHTML=`<button class="botb" type="button" aria-label="Ouvrir la recherche avancée" title="Recherche avancée — glissez pour déplacer">${ico('spark')}</button>
  <section class="botp" role="dialog" aria-label="Recherche avancée" hidden><header><b>${ico('spark')}Recherche avancée</b><span><button type="button" data-b="side" title="Passer de l’autre côté" aria-label="Changer de côté">${ico('swap')}</button><button type="button" data-b="close" aria-label="Fermer">${ico('x')}</button></span></header>
  <div class="bmsg" aria-live="polite"></div><form class="bform"><input class="inp" name="q" placeholder="Un thème, un sujet…" autocomplete="off" maxlength="200" aria-label="Votre question"><button class="btn pri" aria-label="Envoyer">${ico('send')}</button></form></section>`;
  document.body.append(root);
  const $=s=>root.querySelector(s),btn=$('.botb'),panel=$('.botp'),msgs=$('.bmsg');let drag=null,greeted=false;
  const save=()=>localStorage.setItem(K,JSON.stringify(st));
  const place=()=>{const side=st.side=='left'?'left':'right',b=Math.max(12,Math.min(st.bottom??(innerWidth<=900?88:24),innerHeight-80));root.dataset.side=side;root.classList.toggle('flip',b>innerHeight*.5);
    Object.assign(root.style,{left:side=='left'?'14px':'auto',right:side=='right'?'14px':'auto',top:'auto',bottom:b+'px'})};
  const toggle=on=>{const o=on??panel.hidden;panel.hidden=!o;root.classList.toggle('open',o);if(o){if(!greeted)greet();setTimeout(()=>$('input').focus(),50)}};
  const add=(cls,html)=>{const d=document.createElement('div');d.className='bm '+cls;d.innerHTML=html;msgs.append(d);msgs.scrollTop=msgs.scrollHeight;return d};
  const ask=q=>{add('u',esc(q));send(q)};
  function greet(){greeted=true;add('a',`Bonjour ! Décrivez un thème ou un sujet et je cherche dans les livres de la bibliothèque. Je me base sur les titres, les auteurs et les domaines.<div class="bchips">${['L’amour de Dieu','La vie en communauté','La prière','Aimer l’Église'].map(t=>`<button type="button" data-q="${esc(t)}">${esc(t)}</button>`).join('')}</div>`)}
  async function send(q){const w=add('a','<span class="muted">Je cherche dans la bibliothèque…</span>');
    try{const r=await api('ai/search','POST',{q});await loadBooks('physique').catch(()=>{});
      w.innerHTML=(r.comprehension?`<p>${esc(r.comprehension)}</p>`:'')+(r.results.length?r.results.map(b=>`<button type="button" class="bk" data-id="${b.id}"><b>${esc(nice(b.title))}</b><small>${esc([nice(b.author),b.code].filter(Boolean).join(' · '))}</small>${b.reason?`<small>${esc(b.reason)}</small>`:''}</button>`).join('')+`<p class="muted sm" style="margin-top:.5rem">${r.mode=='ia'?'Sélection faite d’après les titres, auteurs et domaines.':'Classement simplifié (par mots-clés).'} Ouvrez une fiche pour vérifier.</p>`:'<p>Je n’ai trouvé aucun livre correspondant. Essayez d’autres mots.</p>')}
    catch(e){w.innerHTML=`<span style="color:var(--bad)">${esc(e.message)}</span>`}msgs.scrollTop=msgs.scrollHeight}
  btn.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY,moved:false,r:root.getBoundingClientRect()};btn.setPointerCapture(e.pointerId)});
  btn.addEventListener('pointermove',e=>{if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(!drag.moved&&Math.hypot(dx,dy)<6)return;drag.moved=true;root.classList.add('drag');
    drag.cx=Math.max(4,Math.min(innerWidth-60,drag.r.left+dx));drag.cy=Math.max(4,Math.min(innerHeight-60,drag.r.top+dy));Object.assign(root.style,{left:drag.cx+'px',right:'auto',top:drag.cy+'px',bottom:'auto'})});
  btn.addEventListener('pointerup',()=>{if(!drag)return;const d=drag;drag=null;root.classList.remove('drag');if(d.moved){st.side=d.cx+28<innerWidth/2?'left':'right';st.bottom=Math.round(innerHeight-d.cy-56);save();place()}else toggle()});
  btn.addEventListener('pointercancel',()=>{drag=null;root.classList.remove('drag');place()});
  btn.addEventListener('keydown',e=>{if(e.key=='Enter'||e.key==' '){e.preventDefault();toggle()}});
  root.addEventListener('click',async e=>{const t=e.target.closest('button');if(!t)return;
    if(t.dataset.b=='close')toggle(false);if(t.dataset.b=='side'){st.side=st.side=='left'?'right':'left';save();place()}
    if(t.dataset.q)ask(t.dataset.q);if(t.dataset.id){await loadBooks('physique').catch(()=>{});if(innerWidth<=900)toggle(false);open(+t.dataset.id)}});
  $('.bform').addEventListener('submit',e=>{e.preventDefault();const i=e.target.q,q=i.value.trim();if(q.length<3)return;i.value='';ask(q)});
  document.addEventListener('keydown',e=>{if(e.key=='Escape'&&!panel.hidden)toggle(false)});addEventListener('resize',place);place();
}
