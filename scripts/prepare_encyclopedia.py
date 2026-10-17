"""Reproducible encyclopedia import; no collection or persisted identifiers are changed."""
import csv, json, pathlib, urllib.request, concurrent.futures
ROOT = pathlib.Path(__file__).resolve().parents[1]
SOURCE = '5ee47a9a9c1229632ec4b473a9c1c53026e005dd'
CACHE = ROOT / 'scripts/source'
FILES = 'pokemon pokemon_forms pokemon_stats pokemon_stats_past pokemon_abilities ability_names pokemon_species_names pokemon_species_flavor_text pokemon_evolution evolution_triggers item_names move_names type_names pokemon_types pokemon_types_past version_group_regions regions versions version_groups encounters encounter_slots encounter_method_prose location_areas locations location_names encounter_condition_value_map encounter_condition_value_prose'.split()
def download(name):
    p = CACHE / (name + '.csv')
    if not p.exists():
        p.write_bytes(urllib.request.urlopen(f'https://raw.githubusercontent.com/PokeAPI/pokeapi/{SOURCE}/data/v2/csv/{name}.csv', timeout=60).read())
CACHE.mkdir(exist_ok=True, parents=True)
list(concurrent.futures.ThreadPoolExecutor(10).map(download, FILES))
def rows(name): return list(csv.DictReader((CACHE / (name + '.csv')).open()))
def localized(file, key, field):
    records = rows(file)
    return {r[key]: r[field] for lang in ['9','7'] for r in records if r['local_language_id'] == lang and r[field]}
def dump(name, data):
    (ROOT / 'src/data' / (name + '.json')).write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')))
pokemon = {r['id']: r for r in rows('pokemon')}
formmap = {r['id']: r for r in rows('pokemon_forms')}
abilities = localized('ability_names', 'ability_id', 'name')
genus = localized('pokemon_species_names', 'pokemon_species_id', 'genus')
items = localized('item_names', 'item_id', 'name')
moves = localized('move_names', 'move_id', 'name')
types = localized('type_names', 'type_id', 'name')
locations = localized('location_names', 'location_id', 'name')
methods = localized('encounter_method_prose', 'encounter_method_id', 'name')
conditions = localized('encounter_condition_value_prose', 'encounter_condition_value_id', 'name')
statmap = {}; abilitymap = {}; typemap = {}; history = {}; pasttypes = {}
for r in rows('pokemon_stats'):
    if int(r['stat_id']) <= 6: statmap.setdefault(r['pokemon_id'], [0]*6)[int(r['stat_id'])-1] = int(r['base_stat'])
for r in rows('pokemon_stats_past'):
    if int(r['stat_id']) <= 6: history.setdefault(r['pokemon_id'], []).append([int(r['generation_id']),int(r['stat_id'])-1,int(r['base_stat'])])
for r in rows('pokemon_abilities'): abilitymap.setdefault(r['pokemon_id'], []).append({'name': abilities.get(r['ability_id'], r['ability_id']), 'hidden':r['is_hidden']=='1'})
for r in rows('pokemon_types'): typemap.setdefault(r['pokemon_id'], []).append(types[r['type_id']])
for r in rows('pokemon_types_past'):
    pasttypes.setdefault(r['pokemon_id'], {}).setdefault(r['generation_id'], []).append(types[r['type_id']])
regions = {r['id']:r['identifier'].title() for r in rows('regions')}
groupregions = {}
for r in rows('version_group_regions'): groupregions.setdefault(r['version_group_id'], []).append(regions[r['region_id']])
versions = {r['id']:r for r in rows('versions')}; groups = {r['id']:r for r in rows('version_groups')}
games = json.loads((ROOT/'src/data/games.json').read_text())
meta = {}
for game in games:
    v = next(r for r in versions.values() if r['identifier'] == game['id']); vg = groups[v['version_group_id']]
    meta[game['id']] = {'version':v['id'], 'group':vg['id'], 'generation':int(vg['generation_id']), 'regions':groupregions.get(vg['id'], [])}
flavor = {}
for r in rows('pokemon_species_flavor_text'):
    if r['language_id']=='7': flavor.setdefault(r['species_id'], {})[versions[r['version_id']]['identifier']] = ' '.join(r['flavor_text'].split())
existing = json.loads((ROOT/'src/data/forms.json').read_text())
# Encyclopedia-only forms never change the collection catalogue or its completion denominator.
extra = []
for f in formmap.values():
    if (f['is_mega']=='1' or f['is_battle_only']=='1' or f['form_identifier']=='gigantamax') and 'totem' not in f['form_identifier']:
        p = pokemon[f['pokemon_id']]
        extra.append({'id':'form:'+f['id'],'speciesId':'species:'+p['species_id'],'label':f['form_identifier'].replace('-',' ').title(),'category':'battle','storage':'battle-only','shiny':'unknown','types':typemap.get(p['id'],[]),'order':0,'art':None,'shinyArt':None,'gameRestrictions':[]})
details = {}
for f in existing + extra:
    raw = formmap[f['id'].split(':')[1]]; p = pokemon[raw['pokemon_id']]
    details[f['id']] = {'pokemon':p['id'],'height':int(p['height'])/10,'weight':int(p['weight'])/10,'stats':statmap.get(p['id']), 'pastStats':history.get(p['id'],[]), 'types':typemap.get(p['id'],[]), 'pastTypes':pasttypes.get(p['id'],{}), 'abilities':abilitymap.get(p['id'],[]),'genus':genus.get(p['species_id']), 'introducedGeneration':int(groups[raw['introduced_in_version_group_id']]['generation_id']) if raw['introduced_in_version_group_id'] else None}
evolution = []
for r in rows('pokemon_evolution'):
    conditions_list = []
    trigger = {x['id']:x['identifier'] for x in rows('evolution_triggers')}[r['evolution_trigger_id']]
    conditions_list.append({'level-up':'Subir de nivel','trade':'Intercambio','use-item':'Usar objeto','shed':'Espacio libre y Poké Ball'}.get(trigger, trigger.replace('-',' ')))
    labels = {'minimum_level':'Nivel mínimo','minimum_happiness':'Amistad mínima','minimum_beauty':'Belleza mínima','minimum_affection':'Afecto mínimo','minimum_move_count':'Usos del movimiento','minimum_steps':'Pasos mínimos','minimum_damage_taken':'Daño recibido mínimo','percentage_chance':'Probabilidad (%)'}
    for k,label in labels.items():
        if r.get(k): conditions_list.append(f'{label}: {r[k]}')
    for k,label,lookup in [('trigger_item_id','Objeto',items),('held_item_id','Objeto equipado',items),('known_move_id','Conocer',moves),('used_move_id','Movimiento usado',moves),('known_move_type_id','Movimiento de tipo',types),('party_type_id','Tipo en el equipo',types),('location_id','Lugar',locations)]:
        if r.get(k): conditions_list.append(f'{label}: {lookup.get(r[k],r[k])}')
    if r['time_of_day']: conditions_list.append({'day':'De día','night':'De noche','dusk':'Al anochecer'}.get(r['time_of_day'], r['time_of_day']))
    for k,label in [('needs_overworld_rain','Lluvia en el mapa'),('turn_upside_down','Consola boca abajo'),('needs_multiplayer','Multijugador'),('near_special_rock','Cerca de la roca especial')]:
        if r[k]=='1': conditions_list.append(label)
    if r['gender_id']: conditions_list.append('Hembra' if r['gender_id']=='1' else 'Macho')
    if r['relative_physical_stats']: conditions_list.append({'-1':'Ataque < Defensa','0':'Ataque = Defensa','1':'Ataque > Defensa'}[r['relative_physical_stats']])
    for k,label in [('party_species_id','Especie en el equipo'),('trade_species_id','Intercambiar por especie')]:
        if r[k]: conditions_list.append(f'{label}: #{r[k]}')
    if r.get('condition_expression'): conditions_list.append(r['condition_expression'])
    if r.get('nature_bitmask'): conditions_list.append('Naturaleza específica (consultar requisitos del juego)')
    if r.get('region_id'): conditions_list.append('Región requerida: '+regions.get(r['region_id'],r['region_id']))
    evolution.append({'to':'species:'+r['evolved_species_id'],'group':r['version_group_id'],'fromForm':'form:'+r['required_pokemon_form_id'] if r['required_pokemon_form_id'] else None,'toForm':'form:'+r['evolved_pokemon_form_id'] if r['evolved_pokemon_form_id'] else None,'conditions':conditions_list})
areas = {r['id']:r for r in rows('location_areas')}; slots = {r['id']:r for r in rows('encounter_slots')}
conditionmap = {}
for r in rows('encounter_condition_value_map'): conditionmap.setdefault(r['encounter_id'], []).append(conditions.get(r['encounter_condition_value_id'],r['encounter_condition_value_id']))
encounters = {}
for r in rows('encounters'):
    if r['version_id'] not in versions: continue
    game = versions[r['version_id']]['identifier']
    if game not in meta: continue
    a = areas[r['location_area_id']]; slot = slots[r['encounter_slot_id']]
    condition = ' · '.join(conditionmap.get(r['id'], []))
    area = locations.get(a['location_id'], a['location_id']) + (' · '+a['identifier'].replace('-',' ') if a['identifier'] else '')
    key = (r['pokemon_id'],game,area,methods.get(slot['encounter_method_id'],slot['encounter_method_id']),condition)
    e = encounters.setdefault(key, [int(r['min_level']),int(r['max_level'])]);e[0]=min(e[0],int(r['min_level']));e[1]=max(e[1],int(r['max_level']))
packed = {}
for (pid,game,area,method,condition),levels in encounters.items(): packed.setdefault(pid, {}).setdefault(game, []).append({'area':area,'method':method,'conditions':condition,'min':levels[0],'max':levels[1]})
dump('encyclopedia', {'source':SOURCE,'games':meta,'details':details,'extraForms':extra, 'formGames':{f['id']:list(packed.get(details[f['id']]['pokemon'],{})) for f in existing if f['category']=='regional'}, 'flavor':flavor,'evolutions':evolution})
encdir = ROOT / 'src/data/encounters'
encdir.mkdir(exist_ok=True)
for game in meta:
    payload = {pid: records[game] for pid, records in packed.items() if game in records}
    (encdir / (game+'.json')).write_text(json.dumps(payload,ensure_ascii=False,separators=(',',':')))
old = ROOT/'src/data/encounters.json'
if old.exists(): old.unlink()
print('Imported',len(details),'forms,',len(evolution),'evolution rules,',len(encounters),'encounter groups')
