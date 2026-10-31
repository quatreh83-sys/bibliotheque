"""Prépare un fichier d'ajouts à appliquer UNE fois au démarrage du serveur (sans toucher aux retraits ni aux sélections).
Usage : python tools/build_ajout.py CATALOGUE.xlsx NOM_DU_LOT   (écrit data/ajouts/NOM_DU_LOT.json.gz)"""
import sys,re,gzip,json,openpyxl
xlsx,name=sys.argv[1],sys.argv[2]
nz=lambda c:re.sub(r'[^A-Z0-9]','',(c or '').upper());nt=lambda t:re.sub(r'\W','',(t or '').lower())
s=lambda v:(re.sub(r'\s+',' ',str(v)).strip() or None) if v is not None else None
base={}
for r in json.load(gzip.open('data/catalogue.json.gz','rt',encoding='utf-8'))['rows']:
    if r[0]=='physique' and r[10]:base.setdefault(nz(r[10]),r[2])
wb=openpyxl.load_workbook(xlsx,read_only=True)
flag={}
for r in wb['À vérifier'].iter_rows(min_row=2,values_only=True):
    if any(r):flag[(nz(r[9]),nt(r[3]))]=(r[0],r[11])
COLS=['kind','numero','title','subtitle','author','publisher','city','collection','volume','year','code','domain','path','filetype','reviewed','note']
rows=[];c={'ok':0,'sans_cote':0,'cote_deja_prise':0,'a_verifier':0}
for r in wb['Import Excel'].iter_rows(min_row=2,values_only=True):
    if not any(r) or not s(r[3]):continue
    code=s(r[10]);k=nz(code);rev=True;note=None
    if not k:rev=False;note='Cote absente dans le registre source.';c['sans_cote']+=1
    elif k in base:rev=False;note=f'Cote déjà utilisée au catalogue par « {base[k]} » : vérifier la cote.';c['cote_deja_prise']+=1
    elif (k,nt(r[3])) in flag:rev=False;note='Titre/auteur déjà repérés avec une autre cote : vérifier un éventuel doublon.';c['a_verifier']+=1
    else:c['ok']+=1
    ym=re.search(r'(1[5-9]\d\d|20\d\d)',str(r[9] or ''))
    rows.append(['physique',None,s(r[3]),s(r[4]),s(r[2]),s(r[5]),s(r[6]),s(r[7]),s(r[8]),int(ym.group(1)) if ym else None,code,None,None,None,rev,note])
json.dump({'cols':COLS,'rows':rows},gzip.open(f'data/ajouts/{name}.json.gz','wt',encoding='utf-8'),ensure_ascii=False,separators=(',',':'))
print(len(rows),'lignes',c)
