// Règle : le début de la cote (code) détermine le domaine. Clés en MAJUSCULES, mots séparés par une espace, sans points.
// ⚠️ Classement proposé d'après les titres des livres : à valider / corriger, puis envoyer sur GitHub (aucun réimport nécessaire).
export const CODE_DOMAINS={
 'TRI':'Trinité','D GE':'Dogmatique générale','CHR':'Christologie','MAR':'Mariologie','DM':'Mariologie',
 'B':'Bibles et généralités bibliques','B GEN':'Bibles et généralités bibliques','BIB':'Bibles et généralités bibliques','SYN':'Bibles et généralités bibliques',
 'NT':'Nouveau Testament','N T':'Nouveau Testament','AT':'Ancien Testament','A T':'Ancien Testament','COL':'Collections bibliques',
 'TH M':'Théologie morale','THM':'Théologie morale','TH AFR':'Théologie africaine','TH AF':'Théologie africaine','TH R':'Théologie des religions',
 'ECC':'Ecclésiologie','SAC':'Sacrements','LIT':'Liturgie','PR':'Prière','TR SP':'Théologie spirituelle','TR':'Théologie spirituelle','SVO':'Saints et vies spirituelles','MB':'Méditations bibliques','MEDIV':'Méditations et divers',
 'H E':'Histoire de l’Église','HE':'Histoire de l’Église','H':'Histoire de l’Église','PHILO':'Philosophie','T AQ':'Thomas d’Aquin','PAT':'Patristique',
 'PAS':'Pastorale','PAST':'Pastorale','PNE':'Pastorale','CAT':'Catéchèse','A BIO':'Biographies','BIO':'Biographies','MIS':'Missiologie','CIC':'Droit canonique',
 'V R':'Vie religieuse','OEC':'Œcuménisme','MIN':'Ministères','VOC':'Vocations','MAG':'Magistère et documents ecclésiaux',
 'JPII':'Jean-Paul II','JP':'Jean-Paul II','J P':'Jean-Paul II','JP II':'Jean-Paul II',
 'PAUL VI':'Documents pontificaux','PIE IX':'Documents pontificaux','PIE X':'Documents pontificaux','PIE XI':'Documents pontificaux','PIE XII':'Documents pontificaux','LEON XIII':'Documents pontificaux','BENOIT XV':'Documents pontificaux','JXXIII':'Documents pontificaux','JXXXIII':'Documents pontificaux','BEN':'Documents pontificaux','BEN XVI':'Documents pontificaux','FR':'Documents pontificaux',
 'D':'Dictionnaires','D BIB':'Dictionnaires','DE':'Encyclopédies','EU':'Encyclopédies','D S':'Société et développement','DS':'Société et développement','THESE':'Thèses et mémoires'};
const K=Object.keys(CODE_DOMAINS).sort((a,b)=>b.length-a.length);
export const domainOf=c=>{const n=(c||'').toUpperCase().replace(/[.\-_]/g,' ').replace(/([A-Z])(\d)/g,'$1 $2').replace(/\s+/g,' ').trim()+' ',k=K.find(k=>n.startsWith(k+' '));return k?CODE_DOMAINS[k]:'Autres (à classer)'};
