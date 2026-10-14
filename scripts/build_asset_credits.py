import json,struct,concurrent.futures,pathlib,html,re
root=pathlib.Path(__file__).resolve().parent.parent
paths=sorted(p.relative_to(root).as_posix() for p in root.rglob('*') if p.is_file() and '.git' not in p.parts and p.suffix.lower() in ('.glb','.png','.jpg','.mp3','.wav','.ogg'))
def meta(p):
 try:
  with (root/p).open('rb') as r:
   h=r.read(20);n=struct.unpack_from('<I',h,12)[0];d=json.loads(r.read(n));e=d.get('asset',{}).get('extras',{});return {'file':p,**e}
 except Exception as e:return {'file':p,'metadata_error':str(e)}
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool: models=list(pool.map(meta,[p for p in paths if p.endswith('.glb')]))
for m in models:
 if m['file']=='jet_pack.glb':m['author']='Incredible INC. / '+m.get('author','kumaripanchamarthi')
manifest={'models':models,'uploaded_files':paths,'custom_assets':'Meshy visuals, custom character and chair, dialogue and sound effects supplied by Tim / Flying Vee Studios.','audio_sources':[{'file':'chrysalyn-intense-cinematic-wind-whoosh-transition-543526.mp3','creator':'chrysalyn','source_status':'Original source/license URL not supplied.'},{'file':'freesound_community-jet-engine-6753.mp3','creator':'freesound_community','source_status':'Original source/license URL not supplied.'}],'adaptations':'Game adaptations include resizing, reorientation, extracted/compressed textures, separated motor assemblies, material edits, skeletal posing and procedural movement. Source meshes retain original authorship.'}
manifest['fonts']=[{'name':'Creepster','source':'https://fonts.google.com/specimen/Creepster','license':'SIL Open Font License'},{'name':'Barlow Condensed','source':'https://fonts.google.com/specimen/Barlow+Condensed','license':'SIL Open Font License'}]
(root/'ASSET_CREDITS.json').write_text(json.dumps(manifest,indent=2)+'\n')
rows=[]
for m in models:
 if not m.get('source'):continue
 author=m.get('author','Unknown');match=re.match(r'(.*?) \((https?://[^)]+)\)$',author);authorhtml=html.escape(match[1]) if match else html.escape(author)
 if match:authorhtml='<a href="'+html.escape(match[2],quote=True)+'" target="_blank" rel="noopener">'+authorhtml+'</a>'
 license=m.get('license','License not supplied');matchlic=re.match(r'(.*?) \((https?://[^)]+)\)$',license);lic=('<a href="'+html.escape(matchlic[2],quote=True)+'" target="_blank" rel="noopener">'+html.escape(matchlic[1])+'</a>') if matchlic else html.escape(license)
 rows.append('<li><a href="'+html.escape(m['source'],quote=True)+'" target="_blank" rel="noopener">'+html.escape(m.get('title',m['file']))+'</a> — '+authorhtml+' · '+lic+'</li>')
credits='<details class="assetCredits"><summary>Asset credits &amp; licenses</summary><div class="creditsBody"><p>'+html.escape(manifest['adaptations'])+'</p><ul>'+''.join(rows)+'</ul><p>'+html.escape(manifest['custom_assets'])+'</p><p>Fonts: Creepster and Barlow Condensed — SIL Open Font License (https://openfontlicense.org/).</p><p>Audio and character dialogue supplied by Flying Vee Studios; additional audio credits will be collected separately.</p><details><summary>Complete uploaded asset inventory</summary><ul>'+''.join('<li>'+html.escape(p)+'</li>' for p in paths)+'</ul></details></div></details>'
target=root/'index.html'
page=target.read_text()
start='<!-- ASSET_CREDITS_START -->';end='<!-- ASSET_CREDITS_END -->'
if start not in page or end not in page: raise ValueError('Splash credit markers are missing')
page=page[:page.index(start)+len(start)]+credits+page[page.index(end):]
target.write_text(page)
print('Credits:',len(rows),'licensed models;',len(paths),'uploaded files;',len(models)-len(rows),'custom models without embedded external attribution.')
