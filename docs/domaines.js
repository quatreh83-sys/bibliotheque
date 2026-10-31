// Règle : le début de la cote (code) détermine le domaine. Clés en MAJUSCULES, mots séparés par une espace, sans points.
// Seuls les domaines définis par la bibliothèque sont utilisés. Tout le reste va dans « Autres (à classer) ».
export const AUTRES='Autres (à classer)',PAPES='Encycliques et documents des papes';
export const CODE_DOMAINS={
 'NT':'Nouveau Testament','N T':'Nouveau Testament','AT':'Ancien Testament','A T':'Ancien Testament','B':'Bible','SYN':'Synopse','COL':'Collections',
 'TH':'Théologie diverse','THM':'Théologie morale','TH M':'Théologie morale','TR':'Théologie des religions','MIN':'Théologie des ministères',
 'PNE':'Pneumatologie','TRI':'Trinité','CHR':'Christologie','MAR':'Mariologie','ECC':'Ecclésiologie','EU':'Eucharistie','SAC':'Sacrements','D GE':'Dogmatique générale',
 'MEDIV':'Méditations diverses','PR':'Prière','LIT':'Liturgie','CAT':'Catéchèse','PAS':'Pastorale','PAST':'Pastorale','MIS':'Missiologie','MISS':'Missiologie','VOC':'Vocations',
 'H':'Histoire','HE':'Histoire de l’Église','H E':'Histoire de l’Église','PAT':'Patristique','OEC':'Œcuménisme','PHILO':'Philosophie','T AQ':'Thomas d’Aquin','CIC':'Droit canonique',
 'MAG':'Magistère','BIO':'Biographies','SVO':'Saints : vie et œuvre','DE':'Dictionnaires et encyclopédies','THESE':'Thèses',
 'JPII':PAPES,'JPD':PAPES,'JP':PAPES,'J P':PAPES,'JP II':PAPES,'PAUL VI':PAPES,'PIE IX':PAPES,'PIE X':PAPES,'P10':PAPES,'PIE XI':PAPES,'PIE XII':PAPES,'JXXIII':PAPES,'JXXXIII':PAPES,'JEAN XXIII':PAPES,'BEN':PAPES,'BEN XVI':PAPES,'BENOIT XV':PAPES,'BENOIT XVI':PAPES,'LEON XIII':PAPES,
 'FR':PAPES,'DM':'Dévotion mariale','TR SP':'Traité de spiritualité','TRSP':'Traité de spiritualité','A BIO':'Autres biographies','ABIO':'Autres biographies',
 'D':'Dictionnaires et encyclopédies','DIC':'Dictionnaires et encyclopédies',
 /* formes écrites en toutes lettres des codes définis */
 'AUTR BIOGR':'Autres biographies','BIBLE':'Bible','DOG GEN':'Dogmatique générale','HIST EGLISE':'Histoire de l’Église','MARIOLOGIE':'Mariologie','MÉDIV':'Méditations diverses','MÉ DIV':'Méditations diverses','MDIV':'Méditations diverses','M DIV':'Méditations diverses',
 'ST VIE ET ŒUVRE':'Saints : vie et œuvre','ST VIE ET ŒUVRES':'Saints : vie et œuvre','THÈSE':'Thèses','TRAITÉ':'Traité de spiritualité','TRAITE':'Traité de spiritualité',
 'THÉO':'Théologie diverse','THEO':'Théologie diverse','THÉO MOR':'Théologie morale','THEO MOR':'Théologie morale','THEO REL':'Théologie des religions','THÉO REL':'Théologie des religions','B XVI':PAPES,'D S':'Collections','DS':'Collections','V R':'Collections','VR':'Collections','MB':'Collections'};
const K=Object.keys(CODE_DOMAINS).sort((a,b)=>b.length-a.length);
export const prefixOf=c=>(c||'').toUpperCase().replace(/[.\-_]/g,' ').replace(/([A-Z])(\d)/g,'$1 $2').replace(/\s+/g,' ').trim();
export const domainOf=c=>{const n=prefixOf(c)+' ',k=K.find(k=>n.startsWith(k+' '));return k?CODE_DOMAINS[k]:AUTRES};
