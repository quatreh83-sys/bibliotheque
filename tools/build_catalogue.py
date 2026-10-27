"""Construit data/catalogue.json.gz depuis l'Excel (livres physiques) et l'arborescence (documents numériques).
Usage : python tools/build_catalogue.py LIVRES.xlsx ARBORESCENCE.txt"""
import sys,re,gzip,json,datetime,collections,openpyxl
xlsx,txt=sys.argv[1],sys.argv[2]
COLS=['kind','numero','title','subtitle','author','publisher','city','collection','volume','year','code','domain','path','filetype']
s=lambda v:(re.sub(r'\s+',' ',str(v)).strip() or None) if v is not None else None
rows=[]
ws=openpyxl.load_workbook(xlsx,read_only=True).worksheets[0]
for r in ws.iter_rows(min_row=2,values_only=True):
    r=list(r)+[None]*13
    if not s(r[3]) and not s(r[2]): continue
    ym=re.search(r'(1[5-9]\d\d|20\d\d)',str(r[9] or ''))
    author=s(' '.join(x for x in [s(r[1]),s(r[2])] if x))
    rows.append(['physique',r[0] if isinstance(r[0],int) else None,s(r[3]) or '(sans titre)',s(r[4]),author,s(r[5]),s(r[6]),s(r[7]),s(r[8]),int(ym.group(1)) if ym else None,s(r[10]),None,None,None])
nphys=len(rows)
DOC={'pdf','doc','docx','rtf','epub','mobi','azw3','djvu','txt','odt','ppt','pptx','xls','xlsx','dot','zip'}
fold=re.compile(r'^((?:│   |    )*)[├└]───(.*)$');pref=re.compile(r'^((?:│   |    )*)(.*)$')
stack=[];skipped=collections.Counter();dig=[]
for line in open(txt,encoding='utf-8').read().split('\n'):
    line=line.rstrip('\r')
    m=fold.match(line)
    if m:
        d=len(m.group(1))//4;stack=stack[:d]+[None]*max(0,d-len(stack[:d]));stack.append(m.group(2).strip());continue
    m=pref.match(line);units=len(m.group(1))//4;name=m.group(2).strip()
    if not name: continue
    folders=[f for f in stack[:max(units-1,0)] if f]
    ext=name.rsplit('.',1)[1].lower() if '.' in name else ''
    if ext not in DOC: skipped[ext or '(sans extension)']+=1;continue
    dig.append(['numerique',None,name.rsplit('.',1)[0].strip(),None,None,None,None,None,None,None,None,folders[0] if folders else 'Racine',' / '.join(folders) or 'Racine',ext.upper()])
dig.sort(key=lambda r:(r[12],r[2].lower()))
rows+=dig
out={'version':datetime.date.today().isoformat(),'cols':COLS,'rows':rows}
with gzip.open('data/catalogue.json.gz','wt',encoding='utf-8',compresslevel=9) as f: json.dump(out,f,ensure_ascii=False,separators=(',',':'))
print('physiques',nphys,'numeriques',len(dig));print('ignorés',skipped.most_common(12))
tops=collections.Counter(r[11] for r in dig);print('dossiers racine',len(tops),tops.most_common(8))
import os;print('taille',os.path.getsize('data/catalogue.json.gz')//1024,'Ko')
