"""Original Blender dioramas and articulated clay characters. Coordinates: x/y(up)/z."""
import bpy, math, json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'public'/'models';OUT.mkdir(parents=True,exist_ok=True)
COL={'cream':'f6e6c8','wood':'c18b59','edge':'805f43','teal':'4a9990','dark':'214d48','coral':'df8269','gold':'e9b74f','leaf':'68976a','lightleaf':'98bc76','blue':'75a7bd','white':'fff7e6','ink':'302b32','skin':'e4ad7d','hair':'4c3329','pants':'426c74','pink':'ed9e8c','stone':'b8bda1'}
mats={}
active_colliders=None

def solid(x,z,w,d):
    if active_colliders is not None:active_colliders.append({'x':x,'z':z,'w':w,'d':d})
def mat(name):
    if name in mats:return mats[name]
    h=COL[name];rgb=[int(h[i:i+2],16)/255 for i in (0,2,4)];rgb=[c/12.92 if c<.04045 else ((c+.055)/1.055)**2.4 for c in rgb]
    m=bpy.data.materials.new(name);m.diffuse_color=(*rgb,1);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*rgb,1);p.inputs['Roughness'].default_value=.78;mats[name]=m;return m
def coord(p):return (p[0],-p[2],p[1])
def finish(o,n,c):o.name=n;o.data.materials.append(mat(c));return o
def box(n,p,s,c,b=.07):
    bpy.ops.mesh.primitive_cube_add(size=1,location=coord(p));o=bpy.context.object;o.scale=(s[0],s[2],s[1]);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    if b:
        mod=o.modifiers.new('Rounded edges','BEVEL');mod.width=b;mod.segments=2;bpy.ops.object.modifier_apply(modifier=mod.name);o.modifiers.new('Weighted normals','WEIGHTED_NORMAL')
    return finish(o,n,c)
def ball(n,p,s,c):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=16,ring_count=10,radius=1,location=coord(p));o=bpy.context.object;o.scale=(s[0],s[2],s[1]);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    for f in o.data.polygons:f.use_smooth=True
    return finish(o,n,c)
def cyl(n,p,r,h,c):
    bpy.ops.mesh.primitive_cylinder_add(vertices=16,radius=r,depth=h,location=coord(p));return finish(bpy.context.object,n,c)
def reset():bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False);mats.clear()
def export(n,merge=False):
    if merge:
        for m in list(mats.values()):
            obs=[o for o in bpy.context.scene.objects if o.type=='MESH' and len(o.data.materials)==1 and o.data.materials[0]==m]
            if len(obs)>1:
                bpy.ops.object.select_all(action='DESELECT')
                for o in obs:o.select_set(True)
                bpy.context.view_layer.objects.active=obs[0];bpy.ops.object.join();obs[0].name='Scenery_'+m.name
    bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'art'/f'{n}.blend'))
    bpy.ops.export_scene.gltf(filepath=str(OUT/f'{n}.glb'),export_format='GLB',export_yup=True,export_apply=True)
def plant(x,z,s=1):
    solid(x,z,.58*s,.58*s)
    cyl('Pot',(x,.23*s,z),.29*s,.46*s,'coral');cyl('Stem',(x,.85*s,z),.045*s,1*s,'edge')
    for i in range(5):ball('Leaf',(x+math.sin(i*2.4)*.25*s,1*s+i*.06,z+math.cos(i*2.4)*.25*s),(.2*s,.37*s,.17*s),'leaf' if i%2 else 'lightleaf')
def tree(x,z,s=1):
    solid(x,z,.32*s,.32*s)
    cyl('Trunk',(x,.75*s,z),.16*s,1.5*s,'edge')
    for dx,dy,dz in [(-.4,1.9,0),(.4,2,0),(0,2.55,.1),(0,1.95,-.4)]:ball('Canopy',(x+dx*s,dy*s,z+dz*s),(.85*s,.78*s,.78*s),'leaf' if dx<0 else 'lightleaf')
def bench(x,z,c='wood'):
    box('Bench',(x,.55,z),(1.6,.18,.65),c);box('Bench back',(x,.95,z-.27),(1.6,.6,.14),c)
    for dx in [-.58,.58]:box('Bench foot',(x+dx,.25,z),(.14,.5,.45),'dark')
def table(x,z):
    box('Table',(x,.9,z),(1.5,.15,.9),'cream')
    for dx in [-.55,.55]:
        for dz in [-.3,.3]:box('Table leg',(x+dx,.42,z+dz),(.09,.85,.09),'wood',.02)
def book(x,y,z,c='coral'):box('Book pages',(x,y,z),(.35,.09,.46),'cream',.02);box('Book cover',(x,y+.05,z),(.38,.04,.49),c,.01)
def base(outdoor):
    box('Diorama edge',(0,-.35,0),(13,.65,9.8),'edge',.22);box('Ground',(0,-.04,0),(12.9,.2,9.7),'lightleaf' if outdoor else 'wood',.13)
    if not outdoor:
        for i in range(20):box('Floorboard',(-6.08+i*.64,.07,0),(.615,.06,9.5),'cream' if i%5==0 else 'wood',.02)
        box('Back wall',(0,1.4,-4.65),(12.9,2.7,.18),'cream');box('Wall trim',(0,.22,-4.49),(12.8,.3,.09),'teal',.02)
        for x in [-4,0,4]:
            box('Window frame',(x,1.8,-4.48),(1.8,1.45,.1),'white');box('Window sky',(x,1.8,-4.4),(1.55,1.22,.04),'blue',.02)
            box('Window cross',(x,1.8,-4.35),(.08,1.22,.05),'white',.01);box('Window cross',(x,1.8,-4.35),(1.55,.08,.05),'white',.01)
    else:
        box('Garden path',(0,.075,.25),(10.8,.06,1.7),'cream',.2)
        for x in range(-5,6):box('Stone',(x,.1,1.65),(.72,.08,.55),'stone',.14)
        for x in [-5.5,5.5]:
            for z in [-3.6,3.6]:tree(x,z,.7 if z>0 else 1)
        for x in range(-5,6):box('Fence',(x,.65,-4.4),(.12,1.2,.12),'white',.03)
        for y in [.4,.9]:box('Fence rail',(0,y,-4.4),(11,.12,.1),'white',.03)
colliders={}
for scene in ['home','school','campus','office','town','garden']:
    reset();colliders[scene]=[];active_colliders=colliders[scene];base(scene in ['town','garden'])
    if scene=='home':
        box('Rug',(0,.13,0),(5.7,.06,4),'teal',.2)
        for x in [-2.5,2.5]:box('Rug border',(x,.17,0),(.12,.015,3.7),'cream',.01)
        box('Sofa',(-4,.5,-3.2),(2.7,.8,1.1),'coral',.2);box('Sofa back',(-4,1,-3.6),(2.7,.9,.3),'coral',.16)
        for x in [-4.75,-3.3]:box('Cushion',(x,.98,-3.16),(.65,.3,.65),'gold',.15)
        solid(-4,-3.3,2.8,1.3);box('Crib mattress',(3.9,.55,-3.15),(2,.35,1.1),'white',.13)
        for x in [2.95,4.85]:
            for z in [-3.65,-2.65]:box('Crib post',(x,.6,z),(.12,1.2,.12),'teal',.03)
        for x in [3.2,3.6,4,4.4,4.7]:box('Crib rail',(x,.6,-3.65),(.07,1.1,.07),'teal',.01)
        solid(3.9,-3.15,2.1,1.2);plant(-5.6,2.8);plant(5.5,-3.5)
        for x,z,c in [(-4,2.8,'gold'),(-3.4,3,'coral'),(-4.4,3.3,'blue')]:box('Toy block',(x,.3,z),(.45,.45,.45),c,.09);solid(x,z,.45,.45)
    elif scene in ['school','campus']:
        box('Board frame',(0,1.55,-4.38),(3.8,1.6,.12),'edge');box('Chalkboard',(0,1.55,-4.29),(3.5,1.3,.06),'dark')
        for x,w in [(-.8,.8),(.4,1.3),(-.3,1.8)]:box('Chalk marks',(x,1.65+x*.2,-4.23),(w,.05,.015),'cream',.01)
        for x in [-4.6,4.6]:
            for z in [-2.9,1.6]:table(x,z);book(x,.99,z,'coral' if x<0 else 'blue');solid(x,z,1.6,1)
        box('Reading mat',(0,.13,0),(5.5,.04,3.5),'blue' if scene=='school' else 'teal',.3);plant(-5.7,-3.7);plant(5.7,3.5)
    elif scene=='office':
        for x in [-4.4,4.4]:
            table(x,-2.8);solid(x,-2.8,1.7,1.2);box('Monitor',(x,1.35,-3),(1,.65,.1),'dark');box('Screen',(x,1.35,-2.92),(.88,.5,.03),'blue');cyl('Stand',(x,1.02,-3),.1,.2,'dark');box('Keyboard',(x,1,-2.56),(.8,.04,.25),'white')
        bench(-4.7,2.6,'teal');solid(-4.7,2.6,1.8,.9);box('Rug',(0,.13,0),(5.8,.04,4),'cream',.2);plant(5.3,2.8,1.5);plant(0,-3.8)
    else:
        bench(-4,-2.7);solid(-4,-2.7,1.8,.9);bench(4,2.8,'teal');solid(4,2.8,1.8,.9)
        for x in [-3.5,3.5]:
            for z in [-3.8,3.8]:
                box('Planter',(x,.2,z),(1.7,.4,.7),'coral')
                solid(x,z,1.7,.7)
                for dx in [-.55,0,.55]:
                    cyl('Flower stem',(x+dx,.6,z),.025,.5,'leaf')
                    for a in range(5):ball('Petal',(x+dx+math.sin(a*1.256)*.1,.89,z+math.cos(a*1.256)*.1),(.09,.07,.09),'gold' if x<0 else 'pink')
        if scene=='town':
            box('Little house',(0,1.25,-3.5),(3.2,2.4,1.5),'coral',.12)
            for sign in [-1,1]:
                o=box('Roof',(sign*.83,2.75,-3.5),(1.95,.18,1.9),'dark');o.rotation_euler[1]=sign*.48
            box('Door',(0,.9,-2.69),(.8,1.7,.1),'teal');solid(0,-3.5,3.4,1.7)
        else:
            cyl('Fountain',(0,.25,-3),.8,.4,'stone');cyl('Water',(0,.47,-3),.66,.03,'blue');cyl('Fountain stem',(0,.8,-3),.15,.7,'cream');solid(0,-3,1.7,1.7)
    export(scene,True)
active_colliders=None
def parent_to(obs,root):
    for o in obs:
        world=o.matrix_world.copy();o.parent=root;o.matrix_world=world
def empty(n,p):
    o=bpy.data.objects.new(n,None);bpy.context.collection.objects.link(o);o.location=coord(p);bpy.context.view_layer.update();return o
for gender in ['male','female','baby']:
    reset();baby=gender=='baby';torso=.6 if baby else 1.05;head=.98 if baby else 1.88
    ball('Shirt',(0,torso,0),(.32,.3 if baby else .46,.24),'teal');heads=[ball('Face',(0,head,.015),(.44,.44,.39),'skin')]
    for x in [-.18,.18]:
        heads.append(ball('Eye',(x,head+.025,.365),(.072,.095,.043),'ink'));heads.append(ball('Sparkle',(x-.019,head+.06,.401),(.021,.024,.012),'white'));heads.append(ball('Cheek',(x*1.42,head-.1,.338),(.077,.039,.022),'pink'))
    heads.append(ball('Nose',(0,head-.045,.408),(.045,.047,.045),'skin'));heads.append(ball('Smile',(0,head-.18,.36),(.075,.025,.018),'ink'))
    for x in [-.43,.43]:heads.append(ball('Ear',(x,head-.01,.015),(.08,.13,.085),'skin'))
    if not baby:
        heads.append(ball('Hair cap',(0,head+.2,-.055),(.46,.3,.4),'hair'))
        for i in range(5):heads.append(ball('Fringe',(-.29+i*.14,head+.28,.24),(.15,.17,.16),'hair'))
        if gender=='female':
            for x in [-.35,.35]:heads.append(ball('Side hair',(x,head+.02,-.1),(.18,.36,.26),'hair'))
            heads.append(ball('Hair bun',(.26,head+.51,-.12),(.22,.21,.22),'hair'));heads.append(ball('Ribbon',(.27,head+.4,.01),(.16,.07,.09),'coral'))
    else:heads.append(ball('Baby curl',(0,head+.43,0),(.11,.09,.1),'hair'))
    parent_to(heads,empty('Head',(0,head,0)))
    for sign,side in [(-1,'L'),(1,'R')]:
        arm=empty('Arm'+side,(sign*.34,torso+.19,0));parent_to([ball('Sleeve'+side,(sign*.38,torso+.07,0),(.13,.22,.16),'teal'),ball('Hand'+side,(sign*.39,torso-.14,.025),(.12,.12,.12),'skin')],arm)
        leg=empty('Leg'+side,(sign*.16,.36 if baby else .73,0));parent_to([box('Trousers'+side,(sign*(.25 if baby else .17),.22 if baby else .4,.13 if baby else 0),(.24,.22 if baby else .57,.3),'pants',.08),box('Shoe'+side,(sign*(.29 if baby else .17),.12,.3 if baby else .12),(.28,.18,.43),'coral',.08)],leg)
    if gender=='female':box('Sash',(0,.86,.01),(.65,.1,.5),'coral')
    export(gender)
reset();ball('Cat body',(0,.35,0),(.23,.28,.42),'gold');ball('Cat face',(0,.65,.3),(.3,.28,.25),'gold')
for x in [-.19,.19]:
    ball('Cat ear',(x,.91,.28),(.09,.16,.08),'gold');ball('Cat eye',(x*.6,.69,.53),(.04,.06,.025),'ink')
    for z in [-.23,.23]:ball('Cat paw',(x,.1,z),(.09,.13,.12),'cream')
ball('Cat nose',(0,.59,.55),(.04,.03,.02),'pink');ball('Cat tail',(.15,.56,-.43),(.07,.3,.07),'gold');export('cat')
for item in ['apple','book','coins','boat','tin','blanket','rattle','plant','letter','ball']:
    reset()
    if item=='apple':
        ball('Apple',(-.06,.22,0),(.22,.23,.22),'coral');ball('Apple',(.07,.22,0),(.21,.23,.22),'coral');cyl('Stem',(0,.48,0),.025,.15,'edge');ball('Leaf',(.09,.51,0),(.13,.025,.06),'leaf')
    elif item=='book':
        book(0,.08,0,'teal');box('Book spine',(-.17,.08,0),(.05,.15,.5),'gold',.01)
    elif item=='coins':
        for i in range(4):cyl('Coin',(i*.028,.05+i*.08,0),.23,.07,'gold')
        box('Coin mark',(.08,.35,0),(.05,.015,.22),'cream',.01)
    elif item=='boat':
        box('Hull',(0,.1,0),(.7,.16,.28),'blue',.12);cyl('Mast',(0,.42,0),.022,.6,'wood');box('Sail',(.13,.48,0),(.25,.32,.03),'cream',.01)
    elif item=='tin':
        box('Blue tin',(0,.15,0),(.56,.3,.4),'blue',.06);box('Tin lid',(0,.32,0),(.59,.06,.43),'teal',.03);ball('Star seal',(0,.365,0),(.08,.015,.08),'gold')
    elif item=='blanket':
        box('Folded blanket',(0,.1,0),(.65,.2,.45),'pink',.09)
        for x in [-.18,0,.18]:box('Woven stripe',(x,.21,0),(.07,.018,.39),'cream',.01)
    elif item=='rattle':
        cyl('Handle',(0,.15,0),.04,.3,'wood');ball('Rattle',(0,.4,0),(.19,.2,.19),'gold');box('Rattle band',(0,.4,0),(.37,.09,.37),'coral',.04)
    elif item=='plant':plant(0,0,.55)
    elif item=='letter':
        box('Envelope',(0,.07,0),(.52,.1,.37),'cream',.03);ball('Heart seal',(0,.13,0),(.08,.018,.07),'coral')
    elif item=='ball':
        ball('Play ball',(0,.25,0),(.26,.26,.26),'blue')
        for x in [-.15,0,.15]:ball('Ball spot',(x,.4,.13),(.065,.065,.065),'cream')
    export(item,True)
(OUT/'colliders.json').write_text(json.dumps(colliders,indent=2))
report={p.name:p.stat().st_size for p in OUT.glob('*.glb')}
(OUT/'manifest.json').write_text(json.dumps({'author':'Choice of Life 3D project','generator':'Blender 4.5 / art/build_assets.py','license':'Original project-generated geometry; no external meshes or textures','files':report},indent=2))
print('ASSET_BUILD_COMPLETE',sum(report.values()),report)
