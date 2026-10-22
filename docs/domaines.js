// Règle : si le code (cote) commence par la clé, le livre appartient au domaine.
// ⚠️ EXEMPLE À REMPLACER par vos vraies règles. Le changement s'applique sans réimporter.
export const CODE_DOMAINS={'A':'Bibles','B':'Dogmatique générale','C':'Christologie','D':'Mariologie','E':'Théologie morale'};
export const domainOf=c=>{c=(c||'').trim().toUpperCase();const k=Object.keys(CODE_DOMAINS).sort((a,b)=>b.length-a.length).find(k=>c.startsWith(k.toUpperCase()));return k?CODE_DOMAINS[k]:'Autres'};
