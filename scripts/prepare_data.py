"""Build-time only. Pinned PokéAPI CSVs; downloaded assets never fetched by the app."""
import csv,json,pathlib,urllib.request,concurrent.futures,io,time
from PIL import Image
ROOT=pathlib.Path(__file__).resolve().parents[1]
SPRITE_SOURCE='289e842364648ec0495ae4ba12f48d5cbfbf670b'
SOURCE='5ee47a9a9c1229632ec4b473a9c1c53026e005dd'
cache=ROOT/'scripts/source';cache.mkdir(exist_ok=True)
def rows(name):
 p=cache/(name+'.csv')
 if not p.exists():p.write_bytes(urllib.request.urlopen(f'https://raw.githubusercontent.com/PokeAPI/pokeapi/{SOURCE}/data/v2/csv/{name}.csv').read())
 return list(csv.DictReader(p.open()))
species=rows('pokemon_species'); names={(r['pokemon_species_id'],r['local_language_id']):r['name'] for r in rows('pokemon_species_names')}
pokemon={r['id']:r for r in rows('pokemon')};types={r['id']:r['identifier'] for r in rows('types')};pt={}
for r in rows('pokemon_types'):pt.setdefault(r['pokemon_id'],[]).append(types[r['type_id']])
forms=rows('pokemon_forms');entries=[];sp=[]
for s in species:
 sid=s['id']; default=next(p for p in pokemon.values() if p['species_id']==sid and p['is_default']=='1')
 sp.append(dict(id='species:'+sid,number=int(sid),name=names.get((sid,'9'),s['identifier']),es=names.get((sid,'7'),names.get((sid,'9'),s['identifier'])),generation=int(s['generation_id']),genderRate=int(s['gender_rate']),genderDifference=s['has_gender_differences']=='1',evolvesFrom='species:'+s['evolves_from_species_id'] if s['evolves_from_species_id'] else None))
 for f in forms:
  p=pokemon[f['pokemon_id']]
  if p['species_id']!=sid:continue
  label=f['form_identifier'];regional=label in ['alola','galar','galar-standard','hisui','paldea','paldea-combat-breed','paldea-blaze-breed','paldea-aqua-breed'];base=p['id']==default['id'] and f['is_default']=='1'
  # Explicit first-release scope: base and regional forms, appliance Rotom,
  # Deoxys, Unown, seasons, cloaks, and the historical spiky-eared event.
  included=base or regional or int(sid) in [201,386,412,413,479,585,586] or label=='spiky-eared'
  if not included or f['is_battle_only']=='1' or f['is_mega']=='1' or 'totem' in label:continue
  category='base' if base else 'regional' if regional else 'event' if label=='spiky-eared' else 'cosmetic'
  # Sprite identities follow the upstream form API convention.
  sprite=p['id'] if f['is_default']=='1' else p['id']+'-'+label
  shiny='locked' if label=='spiky-eared' else 'available' if int(sid)<=493 and category not in ['regional'] else 'unknown'
  entries.append(dict(id='form:'+f['id'],speciesId='species:'+sid,label=label.replace('-',' ').title() if not base else '',category=category,storage='historical' if label=='spiky-eared' else 'storable',shiny=shiny,types=pt.get(p['id'],[]),spriteKey=sprite,order=len(entries)+1,gameRestrictions=['heartgold','soulsilver'] if label=='spiky-eared' else []))
# Dex numbers are copied from the source, never inferred from National numbers.
dexes={r['id']:dict(id=r['id'],name=r['identifier'].replace('-',' ').title(),entries=[]) for r in rows('pokedexes') if r['is_main_series']=='1'}
for r in rows('pokemon_dex_numbers'):
 if r['pokedex_id'] in dexes:dexes[r['pokedex_id']]['entries'].append(dict(speciesId='species:'+r['species_id'],number=int(r['pokedex_number'])))
for d in dexes.values():d['entries'].sort(key=lambda x:x['number'])
links=rows('pokedex_version_groups');games=[]
# Main releases only; DLCs become scopes on their parent release.
excluded={19,20,35,36,42,43,48,49,50,51,52,53}
for v in rows('versions'):
 if int(v['id']) in excluded:continue
 scopes=[r['pokedex_id'] for r in links if r['version_group_id']==v['version_group_id'] and r['pokedex_id'] in dexes]
 # National Dex exists in generations III-VI and BDSP. Exact historical cutoffs.
 caps={'5':386,'6':386,'7':386,'8':493,'9':493,'10':493,'11':649,'14':649,'15':721,'16':721,'23':493}
 if v['version_group_id'] in caps:
  did='national-'+v['version_group_id'];dexes[did]=dict(id=did,name='National',entries=[e for e in dexes['1']['entries'] if e['number']<=caps[v['version_group_id']]])
  scopes.append(did)
 if scopes:games.append(dict(id=v['identifier'],name=v['identifier'].replace('-',' ').title(),scopes=scopes))
# One-time local sprite install. Missing form art is explicit, not a substituted form.
assetcache=cache/'sprites';assetcache.mkdir(exist_ok=True)
def fetch(job):
 key,shiny=job;fn=key+('-shiny' if shiny else '')+'.png';p=assetcache/fn
 if not p.exists():
  for attempt in range(3):
   try:p.write_bytes(urllib.request.urlopen(f'https://raw.githubusercontent.com/PokeAPI/sprites/{SPRITE_SOURCE}/sprites/pokemon/'+('shiny/' if shiny else '')+key+'.png',timeout=25).read());break
   except Exception:
    if attempt==2:return fn,None
 return fn,p.read_bytes()
jobs=[(e['spriteKey'],b) for e in entries for b in [False,True]]
print('Downloading',len(jobs),'sprites',flush=True)
results=dict(concurrent.futures.ThreadPoolExecutor(32).map(fetch,jobs))
assets=ROOT/'public/art';assets.mkdir(exist_ok=True,parents=True)
for start in range(0,len(entries),60):
 batch=entries[start:start+60];atlas=Image.new('RGBA',(960,96*12))
 for i,e in enumerate(batch):
  for shiny in [False,True]:
   fn=e['spriteKey']+('-shiny' if shiny else '')+'.png';b=results[fn];idx=i+(60 if shiny else 0)
   if b:
    im=Image.open(io.BytesIO(b)).convert('RGBA');im.thumbnail((96,96));atlas.paste(im,((idx%10)*96+(96-im.width)//2,(idx//10)*96+(96-im.height)//2))
   e['shinyArt' if shiny else 'art']=dict(sheet=start//60,index=idx) if b else None
  del e['spriteKey']
 buffer=io.BytesIO();atlas.save(buffer,format='WEBP',lossless=True);payload=buffer.getvalue();assert len(payload)>100
 (assets/f'{start//60}.webp').write_bytes(payload)
 Image.open(io.BytesIO(payload)).load()
out=ROOT/'src/data';out.mkdir(exist_ok=True)
for name,data in [('species',sp),('forms',entries),('dexes',list(dexes.values())),('games',games)]:
 (out/(name+'.json')).write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')))
(ROOT/'docs/data-manifest.json').write_text(json.dumps(dict(sourceCommit=SOURCE,species=len(sp),forms=len(entries),games=len(games),missingNormalArt=sum(e['art'] is None for e in entries),missingShinyArt=sum(e['shinyArt'] is None for e in entries),coverage='Base species plus selected form families; not a complete Master Dex',generated='2026-10-17'),indent=2))
print('Complete:',len(sp),len(entries),len(games),flush=True)
