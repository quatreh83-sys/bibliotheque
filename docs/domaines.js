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
 'TR SP':AUTRES}; // TR SP : à confirmer (ne pas le confondre avec TR = théologie des religions)
const K=Object.keys(CODE_DOMAINS).sort((a,b)=>b.length-a.length);
export const prefixOf=c=>(c||'').toUpperCase().replace(/[.\-_]/g,' ').replace(/([A-Z])(\d)/g,'$1 $2').replace(/\s+/g,' ').trim();
export const domainOf=c=>{const n=prefixOf(c)+' ',k=K.find(k=>n.startsWith(k+' '));return k?CODE_DOMAINS[k]:AUTRES};
