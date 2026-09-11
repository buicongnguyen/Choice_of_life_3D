"""Crafted, game-ready Blender assets. World coordinates are X / Y-up / Z.

Only original geometry and deterministic texture maps are used. Runtime dimensions
and articulation names are kept compatible with the original twenty GLBs.
"""
import bpy
import math
import json
import sys
import numpy as np
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public' / 'models'
OUT.mkdir(parents=True, exist_ok=True)
COL = {
    'cream':'eee1c7', 'wood':'ad774a', 'wood_light':'c79a67', 'edge':'684530',
    'teal':'368c84', 'dark':'244d48', 'coral':'ca7665', 'gold':'dbab49',
    'leaf':'46734c', 'lightleaf':'80a15b', 'blue':'6495ae', 'white':'f7f1e4',
    'ink':'252834', 'skin':'e4ad7d', 'hair':'4c3329', 'hair_glint':'70533d',
    'pants':'3f6571', 'pink':'d98b84', 'stone':'afb3a0', 'soil':'44372e',
    'metal':'818e91', 'brass':'c79a43', 'ceramic':'ce9276', 'water':'548e99',
    'apple_red':'b84635', 'paper':'e8dfc8', 'seam':'c7b79d', 'iris':'795332',
    'roof':'3d625c', 'plaster':'e5d9bf', 'grass':'89a86b', 'rubber':'ded9c8',
}
MATS = {}
MAPS = {}
ACTIVE = None
COLLIDERS = {}
REPORT = {}


def coord(p):
    return p[0], -p[2], p[1]


def solid(x, z, w, d):
    if ACTIVE is not None:
        ACTIVE.append(dict(x=x, z=z, w=w, d=d))


def image_map(kind, normal=False, tint=None):
    key = (kind, normal, tint)
    if key in MAPS:
        return MAPS[key]
    size = 128
    y, x = np.mgrid[0:size, 0:size] / size
    if kind == 'wood':
        h = .5 + .18*np.sin(x*math.tau*9 + .7*np.sin(y*math.tau*2))
        h += .08*np.sin(x*math.tau*29 + 1.3*np.sin(y*math.tau))
        h += .03*np.sin(x*math.tau*61 + y*math.tau*3)
    elif kind == 'cloth':
        h = .5 + .18*np.sin(x*math.tau*32)*np.sin(y*math.tau*32)
    else:
        h = .5 + .12*np.sin(x*math.tau*11+y*math.tau*7)
        h += .09*np.sin(x*math.tau*23-y*math.tau*17)
        h += .07*np.cos(x*math.tau*43+y*math.tau*39)
    rgba = np.ones((size, size, 4), dtype=np.float32)
    if normal:
        dx = (np.roll(h,-1,1)-np.roll(h,1,1))*.75
        dy = (np.roll(h,-1,0)-np.roll(h,1,0))*.75
        norm = np.sqrt(dx*dx+dy*dy+1)
        rgba[:,:,0] = .5-dx/norm*.5
        rgba[:,:,1] = .5-dy/norm*.5
        rgba[:,:,2] = .5+1/norm*.5
    else:
        rgb = np.array([int(COL[tint][i:i+2],16)/255 for i in (0,2,4)])
        variation = .3 if kind=='wood' else .04 if tint=='plaster' else .12
        rgba[:,:,:3] = np.clip(rgb[None,None,:]*(1+(h[:,:,None]-.5)*variation),0,1)
    image = bpy.data.images.new('Craft_'+kind+('_normal' if normal else '_'+tint),width=size,height=size)
    image.colorspace_settings.name = 'Non-Color' if normal else 'sRGB'
    image.pixels.foreach_set(rgba.ravel())
    image.pack()
    MAPS[key] = image
    return image


def mat(name):
    if name in MATS:
        return MATS[name]
    rgb = [int(COL[name][i:i+2],16)/255 for i in (0,2,4)]
    linear = [c/12.92 if c<.04045 else ((c+.055)/1.055)**2.4 for c in rgb]
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*linear,1)
    m.use_nodes = True
    p = m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value = (*linear,1)
    rough = .65
    if name in ['brass','metal']:
        p.inputs['Metallic'].default_value = .82
        rough = .27
    elif name in ['ink','iris','water']:
        rough = .2
    elif name in ['ceramic','apple_red']:
        rough = .31
        p.inputs['Coat Weight'].default_value = .18
        p.inputs['Coat Roughness'].default_value = .24
    elif name == 'skin':
        rough = .48
    elif name in ['teal','coral','pink','pants','cream']:
        rough = .88
    p.inputs['Roughness'].default_value = rough
    kind = 'wood' if name in ['wood','wood_light','edge'] else 'cloth' if name in ['teal','coral','pants','pink'] else 'stone' if name in ['stone','plaster','soil'] else None
    if kind:
        tex = m.node_tree.nodes.new('ShaderNodeTexImage')
        tex.image = image_map(kind,normal=True)
        normal = m.node_tree.nodes.new('ShaderNodeNormalMap')
        normal.inputs['Strength'].default_value = .22 if kind=='cloth' else .12 if name=='plaster' else .5
        m.node_tree.links.new(tex.outputs['Color'],normal.inputs['Color'])
        m.node_tree.links.new(normal.outputs['Normal'],p.inputs['Normal'])
        if kind in ['wood','stone']:
            color = m.node_tree.nodes.new('ShaderNodeTexImage')
            color.image = image_map(kind,tint=name)
            m.node_tree.links.new(color.outputs['Color'],p.inputs['Base Color'])
    MATS[name] = m
    return m


def finish(obj, name, color, smooth=False):
    obj.name = name
    obj.data.materials.append(mat(color))
    if smooth:
        for face in obj.data.polygons:
            face.use_smooth = True
    return obj


def mesh(name, vertices, faces, color, smooth=True):
    data = bpy.data.meshes.new(name)
    data.from_pydata([coord(p) for p in vertices],[],faces)
    data.update()
    obj = bpy.data.objects.new(name,data)
    bpy.context.collection.objects.link(obj)
    # Projected UVs let the same small authored maps serve custom silhouettes.
    uv = data.uv_layers.new(name='UVMap')
    for face in data.polygons:
        for index in face.loop_indices:
            p = data.vertices[data.loops[index].vertex_index].co
            uv.data[index].uv = (p.x, p.z if abs(face.normal.y)>.5 else p.y)
    return finish(obj,name,color,smooth)


def box(name, p, s, color, bevel=.04):
    bpy.ops.mesh.primitive_cube_add(size=1,location=coord(p))
    obj = bpy.context.object
    obj.scale = (s[0],s[2],s[1])
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    if bevel:
        mod = obj.modifiers.new('Soft manufactured edge','BEVEL')
        mod.width = min(bevel,min(s)*.42)
        mod.segments = 3
        bpy.ops.object.modifier_apply(modifier=mod.name)
        obj.modifiers.new('Weighted face normals','WEIGHTED_NORMAL')
    return finish(obj,name,color)


def ball(name,p,s,color):
    micro = max(s)<.04 or name in ['Flower petal','Flower center','Foliage cluster']
    bpy.ops.mesh.primitive_uv_sphere_add(segments=16 if micro else 24,ring_count=10 if micro else 16,radius=1,location=coord(p))
    obj=bpy.context.object
    obj.scale=(s[0],s[2],s[1])
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    return finish(obj,name,color,True)


def lathe(name,profile,p,color,segments=32):
    vertices=[]
    for radius,height in profile:
        for i in range(segments):
            a=i*math.tau/segments
            vertices.append((p[0]+radius*math.cos(a),p[1]+height,p[2]+radius*math.sin(a)))
    faces=[]
    for row in range(len(profile)-1):
        for i in range(segments):
            j=(i+1)%segments
            faces.append((row*segments+i,(row+1)*segments+i,(row+1)*segments+j,row*segments+j))
    return mesh(name,vertices,faces,color)


def cyl(name,p,r,h,color):
    return lathe(name,[(0,-h/2),(r*.93,-h/2),(r,-h/2+.015),(r,h/2-.015),(r*.93,h/2),(0,h/2)],p,color,24)


def tube(name,points,r,color,closed=False,sharp=False):
    data=bpy.data.curves.new(name,'CURVE')
    data.dimensions='3D'
    data.resolution_u=5
    data.bevel_depth=r
    data.bevel_resolution=1
    spline=data.splines.new('BEZIER')
    spline.bezier_points.add(len(points)-1)
    for node,point in zip(spline.bezier_points,points):
        node.co=coord(point)
        node.handle_left_type='VECTOR' if sharp else 'AUTO'
        node.handle_right_type='VECTOR' if sharp else 'AUTO'
    spline.use_cyclic_u=closed
    obj=bpy.data.objects.new(name,data)
    bpy.context.collection.objects.link(obj)
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active=obj
    bpy.ops.object.convert(target='MESH')
    return finish(bpy.context.object,name,color,True)


def ring(name,p,r,thickness,color,plane='xz',stretch=1):
    points=[]
    for i in range(12):
        a=i*math.tau/12
        u,v=r*math.cos(a),r*math.sin(a)
        points.append((p[0]+u,p[1]+(v*stretch if plane=='xy' else 0),p[2]+(v*stretch if plane=='xz' else 0)))
    return tube(name,points,thickness,color,True)


def seam(name,x,y,z,w,d,color='seam',radius=.009):
    return tube(name,[(x-w/2+.04,y,z-d/2),(x+w/2-.04,y,z-d/2),(x+w/2,y,z-d/2+.04),(x+w/2,y,z+d/2-.04),(x+w/2-.04,y,z+d/2),(x-w/2+.04,y,z+d/2),(x-w/2,y,z+d/2-.04),(x-w/2,y,z-d/2+.04)],radius,color,True)


def leaf(name,start,end,width,color='leaf'):
    a,b=Vector(start),Vector(end)
    direction=(b-a).normalized()
    side=direction.cross(Vector((0,1,.1))).normalized()*width
    vertices=[]
    for t in [0,.2,.5,.8,1]:
        center=a.lerp(b,t)+Vector((0,math.sin(t*math.pi)*width*.6,0))
        spread=math.sin(t*math.pi)*side
        vertices.extend([tuple(center-spread),tuple(center+Vector((0,.02,0))),tuple(center+spread)])
    faces=[]
    for row in range(4):
        for col in range(2):faces.append((row*3+col,(row+1)*3+col,(row+1)*3+col+1,row*3+col+1))
    obj=mesh(name,vertices,faces,color)
    thickness=obj.modifiers.new('Leaf thickness','SOLIDIFY');thickness.thickness=.008
    tube(name+' midrib',[tuple(a),tuple(a.lerp(b,.5)+Vector((0,width*.6+.025,0))),tuple(b)],.007,'lightleaf')
    return obj


def plant(x,z,s=1):
    solid(x,z,.58*s,.58*s)
    lathe('Tapered ceramic pot',[(0,.05),(.2,.05),(.28,.4),(.3,.41),(.3,.46),(.25,.46),(.24,.4)],(x,0,z),'ceramic')
    # Build at unit size, then scale all pieces around its floor anchor.
    cyl('Pot soil',(x,.405,z),.247,.025,'soil')
    for i in range(7):
        a=i*2.4
        start=(x,.4,z)
        end=(x+math.sin(a)*(.42 if i<5 else .18),1.0+(i%3)*.18,z+math.cos(a)*.38)
        middle=(x+math.sin(a)*.16,.8,z+math.cos(a)*.16)
        tube('Plant stem',[start,middle,end],.018,'leaf')
        leaf('Pointed foliage',middle,end,.16,'leaf' if i%2 else 'lightleaf')
    # Caller scales via an isolated object capture when a non-unit pot is used.


def scaled_plant(x,z,s=1):
    before=set(bpy.context.scene.objects)
    plant(x,z,s)
    anchor=Vector(coord((x,0,z)))
    for obj in set(bpy.context.scene.objects)-before:
        obj.location=anchor+(obj.location-anchor)*s
        obj.scale*=s


def tree(x,z,s=1):
    solid(x,z,.32*s,.32*s)
    lathe('Tapering tree trunk',[(.17*s,.06),(.14*s,.7*s),(.085*s,1.9*s)],(x,0,z),'edge',16)
    for i in range(5):
        a=i*2.4
        end=(x+math.cos(a)*.62*s,(1.6+i*.12)*s,z+math.sin(a)*.48*s)
        tube('Tree branch',[(x,.8*s,z),(x+math.cos(a)*.2*s,1.35*s,z+math.sin(a)*.15*s),end],.06*s,'wood')
        for j in range(3):
            ball('Foliage cluster',(end[0]+math.sin(j*2.2)*.28*s,end[1]+j*.22*s,end[2]+math.cos(j*2.2)*.23*s),(.43*s,.43*s,.4*s),'leaf' if (i+j)%3 else 'lightleaf')
    for i in range(3):
        tube('Bark ridge',[(x+.13*s,.2*s,z+(i-1)*.04*s),(x+.14*s,.6*s,z+(i-1)*.04*s),(x+.09*s,1.3*s,z+(i-1)*.03*s)],.012*s,'wood')


def bench(x,z,color='wood'):
    for offset in [-.24,-.08,.08,.24]:box('Seat slat',(x,.55,z+offset),(1.6,.1,.135),color,.025)
    for h in [.8,1.02,1.24]:box('Backrest slat',(x,h,z-.29),(1.6,.16,.075),color,.02)
    for dx in [-.58,.58]:
        tube('Bench iron frame',[(x+dx,.1,z+.27),(x+dx,.48,z+.2),(x+dx,.52,z-.27),(x+dx,1.33,z-.32)],.045,'dark')
        for h in [.8,1.24]:ball('Bench bolt',(x+dx,h,z-.241),(.025,.025,.015),'metal')


def book(x,y,z,color='teal'):
    box('Book page block',(x,y,z),(.34,.115,.44),'paper',.016)
    for level in [-.062,.067]:box('Bound cover',(x,y+level,z),(.39,.024,.49),color,.012)
    box('Rounded spine',(x-.183,y,z),(.038,.14,.49),color,.015)
    for level in [-.035,-.011,.012,.037]:
        tube('Individual page edge',[(x-.14,y+level,z+.226),(x+.12,y+level,z+.226),(x+.17,y+level-.008,z+.21)],.003,'seam')
    for zi in [-.15,.15]:box('Spine gilt band',(x-.205,y,z+zi),(.007,.12,.022),'brass',.002)
    box('Cover title inset',(x+.015,y+.082,z-.02),(.22,.006,.21),'brass',.006)
    box('Cover title panel',(x+.015,y+.086,z-.02),(.2,.006,.19),color,.004)
    tube('Bookmark ribbon',[(x+.07,y+.052,z-.18),(x+.07,y+.052,z+.26),(x+.06,y+.01,z+.29)],.012,'coral')


def table(x,z):
    box('Solid timber top',(x,.9,z),(1.5,.15,.9),'wood_light',.035)
    box('Inset desktop',(x,.981,z),(1.36,.016,.77),'wood',.01)
    for dx in [-.55,.55]:
        for dz in [-.3,.3]:
            lathe('Tapered desk leg',[(.045,.08),(.065,.81)],(x+dx,0,z+dz),'wood',12)
            cyl('Brass foot',(x+dx,.115,z+dz),.048,.09,'brass')
        box('Desk side apron',(x+dx,.76,z),(.07,.15,.65),'wood',.01)
    box('Desk drawer',(x,.75,z+.34),(.92,.16,.07),'wood',.02)
    tube('Drawer pull',[(x-.12,.76,z+.39),(x-.12,.76,z+.43),(x+.12,.76,z+.43),(x+.12,.76,z+.39)],.018,'brass')


def sofa():
    for x in [-5.05,-2.95]:
        for z in [-3.65,-2.77]:cyl('Sofa timber foot',(x,.18,z),.075,.25,'edge')
    box('Upholstered sofa base',(-4,.42,-3.3),(2.6,.4,1.14),'coral',.13)
    for x in [-4.59,-3.41]:
        box('Separate seat cushion',(x,.68,-3.13),(1.12,.24,.8),'coral',.11)
        seam('Seat piping',x,.735,-3.13,1.08,.76)
        box('Padded back cushion',(x,1.08,-3.67),(1.1,.72,.24),'coral',.11)
        for dx in [-.24,.24]:ball('Upholstery button',(x+dx,1.11,-3.532),(.023,.023,.015),'seam')
    for x in [-5.24,-2.76]:box('Sofa rolled arm',(x,.79,-3.23),(.22,.65,1.03),'coral',.1)
    pillow=box('Throw pillow',(-4.75,.98,-3.35),(.44,.43,.19),'teal',.075)
    pillow.rotation_euler[1]=-.16
    solid(-4,-3.3,2.8,1.3)


def crib():
    box('Crib frame',(3.9,.42,-3.15),(2.05,.14,1.15),'wood_light',.025)
    box('Quilted mattress',(3.9,.55,-3.15),(1.88,.2,1.01),'white',.07)
    seam('Mattress binding',3.9,.6,-3.15,1.85,.98,'cream')
    for x in [2.95,4.85]:
        for z in [-3.65,-2.65]:
            cyl('Cot turned post',(x,.62,z),.065,1.16,'teal')
            ball('Cot finial',(x,1.23,z),(.085,.085,.085),'wood_light')
        for z in [-3.42,-3.18,-2.94]:cyl('Cot end spindle',(x,.81,z),.029,.71,'white')
        box('Cot end rail',(x,1.13,-3.15),(.11,.1,1.05),'teal',.025)
    for x in [3.15,3.4,3.65,3.9,4.15,4.4,4.65]:cyl('Cot rear spindle',(x,.82,-3.65),.025,.7,'white')
    box('Cot rear rail',(3.9,1.14,-3.65),(2,.1,.1),'teal',.025)
    box('Folded cot quilt',(4.34,.686,-3.15),(.65,.07,.92),'teal',.03)
    seam('Quilt stitch',4.34,.727,-3.15,.58,.84,'cream',.005)
    solid(3.9,-3.15,2.1,1.2)


def base(outdoor):
    box('Diorama edge',(0,-.35,0),(13,.65,9.8),'edge',.18)
    box('Inset base rim',(0,-.085,0),(12.95,.08,9.75),'wood_light',.045)
    box('Ground',(0,-.04,0),(12.9,.2,9.7),'grass' if outdoor else 'wood',.08)
    if not outdoor:
        for i in range(20):
            x=-6.08+i*.64
            cuts=[-4.75,-2.15+(i%3)*.5,.35+(i%3)*.5,2.65+(i%3)*.35,4.75]
            for a,b in zip(cuts,cuts[1:]):box('Individual oak board',(x,.07,(a+b)/2),(.62,.06,b-a-.015),'wood_light' if i%3 else 'wood',.008)
        box('Plaster back wall',(0,1.4,-4.65),(12.9,2.7,.18),'plaster',.035)
        box('Skirting board',(0,.19,-4.49),(12.8,.22,.09),'cream',.015)
        box('Skirting moulding',(0,.31,-4.45),(12.8,.055,.055),'wood_light',.015)
        box('Upper cornice',(0,2.76,-4.6),(12.95,.11,.29),'cream',.025)
        for x in [-4,0,4]:
            box('Window recess',(x,1.8,-4.51),(1.85,1.48,.2),'edge',.015)
            box('Window glazing',(x,1.8,-4.385),(1.64,1.27,.03),'blue',.01)
            for dx in [-.88,.88]:box('Window stile',(x+dx,1.8,-4.36),(.11,1.5,.16),'white',.012)
            for h in [1.09,2.51]:box('Window header',(x,h,-4.35),(1.85,.11,.17),'white',.012)
            box('Deep sill',(x,1.06,-4.27),(2.05,.09,.38),'wood_light',.02)
            box('Window mullion',(x,1.8,-4.33),(.065,1.36,.09),'white',.008)
            box('Window transom',(x,1.8,-4.33),(1.7,.06,.09),'white',.008)
            for dx in [-.65,.35]:
                tube('Glass light reflection',[(x+dx,2.36,-4.358),(x+dx+.28,2.06,-4.357)],.016,'white')
            tube('Curtain rail',[(x-1.06,2.66,-4.18),(x+1.06,2.66,-4.18)],.022,'brass')
            for side in [-1,1]:
                vertices=[]
                for row in range(9):
                    t=row/8
                    for col in range(9):
                        u=col/8
                        width=.36 if t<.55 else .27
                        vertices.append((x+side*(.72+u*width),2.57-t*1.52,-4.12+math.cos(u*math.tau*3)*.055))
                faces=[(r*9+c,(r+1)*9+c,(r+1)*9+c+1,r*9+c+1) for r in range(8) for c in range(8)]
                curtain=mesh('Pleated linen curtain',vertices,faces,'cream')
                mod=curtain.modifiers.new('Hem thickness','SOLIDIFY');mod.thickness=.008
    else:
        box('Garden path',(0,.075,.25),(10.8,.06,1.7),'stone',.06)
        for x in range(-5,6):
            box('Stepping stone',(x,.1,1.65),(.72,.08,.55),'stone',.06)
        for x in [-5.5,5.5]:
            for z in [-3.6,3.6]:tree(x,z,.7 if z>0 else 1)
        for x in range(-5,6):
            box('Fence picket',(x,.65,-4.4),(.12,1.2,.12),'cream',.012)
            ball('Fence post cap',(x,1.28,-4.4),(.085,.05,.085),'wood_light')
        for y in [.4,.9]:box('Fence rail',(0,y,-4.4),(11,.1,.1),'wood_light',.012)


def reset():
    global MATS
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    # Keep only reusable texture images between exports, not all prior geometry.
    for collection in [bpy.data.meshes,bpy.data.curves,bpy.data.materials]:
        for datablock in list(collection):
            if datablock.users==0:collection.remove(datablock)
    MATS={}


def parent_to(objects,root):
    bpy.context.view_layer.update()
    for obj in objects:
        world=obj.matrix_world.copy()
        obj.parent=root
        obj.matrix_world=world


def empty(name,p):
    obj=bpy.data.objects.new(name,None)
    bpy.context.collection.objects.link(obj)
    obj.location=coord(p)
    bpy.context.view_layer.update()
    return obj


def export(name):
    # Evaluate modifiers before batching. Preserve parent/pivot boundaries.
    for obj in list(bpy.context.scene.objects):
        if obj.type!='MESH':continue
        bpy.context.view_layer.objects.active=obj
        for modifier in list(obj.modifiers):
            bpy.ops.object.modifier_apply(modifier=modifier.name)
    groups={}
    for obj in bpy.context.scene.objects:
        if obj.type=='MESH':groups.setdefault((obj.parent,obj.data.materials[0].name),[]).append(obj)
    for (parent,color),objects in groups.items():
        if len(objects)>1:
            bpy.ops.object.select_all(action='DESELECT')
            for obj in objects:obj.select_set(True)
            bpy.context.view_layer.objects.active=objects[0]
            bpy.ops.object.join()
        objects[0].name=(parent.name if parent else 'Crafted')+'_'+color
    bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'art'/f'{name}.blend'),compress=True)
    bpy.ops.export_scene.gltf(filepath=str(OUT/f'{name}.glb'),export_format='GLB',export_yup=True,export_apply=True,export_extras=False)
    triangles=sum(len(poly.vertices)-2 for obj in bpy.context.scene.objects if obj.type=='MESH' for poly in obj.data.polygons)
    REPORT[name]=dict(bytes=(OUT/f'{name}.glb').stat().st_size,triangles=triangles,meshes=sum(o.type=='MESH' for o in bpy.context.scene.objects))
    print('CRAFTED_ASSET',name,REPORT[name],flush=True)


def room(scene):
    global ACTIVE
    reset();COLLIDERS[scene]=[];ACTIVE=COLLIDERS[scene]
    base(scene in ['town','garden'])
    if scene=='home':
        box('Woven rug',(0,.13,0),(5.7,.06,4),'teal',.025)
        for x in [-2.5,2.5]:box('Rug woven border',(x,.164,0),(.09,.006,3.7),'cream',.001)
        sofa();crib();scaled_plant(-5.6,2.8);scaled_plant(5.5,-3.5)
        for x,z,c in [(-4,2.8,'gold'),(-3.4,3,'coral'),(-4.4,3.3,'blue')]:
            box('Wooden alphabet block',(x,.3,z),(.45,.45,.45),c,.035)
            box('Inset block face',(x,.3,z+.229),(.32,.32,.008),'cream',.02)
            ring('Block round motif',(x,.3,z+.239),.095,.018,c,'xy')
            solid(x,z,.45,.45)
    elif scene in ['school','campus']:
        box('Board frame',(0,1.55,-4.35),(3.8,1.6,.15),'wood',.03)
        box('Chalkboard',(0,1.55,-4.25),(3.52,1.32,.035),'dark',.01)
        for i in range(5):
            tube('Handwritten chalk line',[(-1.25,1.95-i*.17,-4.225),(-.5,1.96-i*.17,-4.223),(.1+i*.15,1.95-i*.17,-4.223)],.012,'cream')
        box('Chalk tray',(0,.86,-4.14),(3.55,.05,.24),'wood_light',.01)
        for x in [-4.6,4.6]:
            for z in [-2.9,1.6]:table(x,z);book(x,1.06,z,'teal' if scene=='campus' else 'coral');solid(x,z,1.6,1)
        box('Reading mat',(0,.13,0),(5.5,.04,3.5),'teal' if scene=='campus' else 'blue',.02)
        scaled_plant(-5.7,-3.7);scaled_plant(5.7,3.5)
    elif scene=='office':
        for x in [-4.4,4.4]:
            table(x,-2.8);solid(x,-2.8,1.7,1.2)
            box('Monitor bezel',(x,1.42,-3.06),(1.04,.66,.085),'ink',.025)
            box('Monitor display',(x,1.42,-3.01),(.94,.55,.01),'blue',.005)
            for i in range(4):box('Screen UI line',(x-.16,1.58-i*.085,-2.999),(.42+(i%2)*.18,.025,.006),'cream' if i%2 else 'teal',.003)
            cyl('Monitor neck',(x,1.05,-3.06),.055,.25,'metal')
            box('Monitor foot',(x,.991,-3.02),(.44,.035,.24),'metal',.02)
            box('Keyboard case',(x,1.011,-2.55),(.78,.045,.24),'ink',.015)
            for row in range(3):
                for col in range(10):box('Keyboard key',(x-.33+col*.073,1.038,-2.62+row*.07),(.054,.014,.046),'white',.006)
            ball('Mouse',(x+.58,1.03,-2.55),(.075,.037,.11),'ink')
            lathe('Desk mug',[(.09,0),(.095,.18),(.085,.19),(.075,.17),(.075,.03)],(x-.55,1,-2.66),'ceramic',20)
            ring('Mug handle',(x-.66,1.1,-2.66),.065,.018,'ceramic','xy',1.1)
        bench(-4.7,2.6,'teal');solid(-4.7,2.6,1.8,.9)
        box('Office rug',(0,.13,0),(5.8,.04,4),'cream',.02)
        scaled_plant(5.3,2.8,1.5);scaled_plant(0,-3.8)
    else:
        bench(-4,-2.7);solid(-4,-2.7,1.8,.9);bench(4,2.8,'teal');solid(4,2.8,1.8,.9)
        for x in [-3.5,3.5]:
            for z in [-3.8,3.8]:
                box('Garden planter',(x,.2,z),(1.7,.4,.7),'ceramic',.035)
                box('Planter soil',(x,.41,z),(1.55,.025,.56),'soil',.015)
                seam('Planter rim',x,.425,z,1.7,.7,'cream',.025)
                solid(x,z,1.7,.7)
                for dx in [-.55,0,.55]:
                    tube('Flower stem',[(x+dx,.43,z),(x+dx+.02,.67,z),(x+dx,.88,z)],.014,'leaf')
                    leaf('Flower leaf',(x+dx,.6,z),(x+dx+.17,.75,z+.1),.06)
                    for a in range(6):ball('Flower petal',(x+dx+math.sin(a*math.tau/6)*.1,.9,z+math.cos(a*math.tau/6)*.1),(.085,.035,.08),'gold' if x<0 else 'pink')
                    ball('Flower center',(x+dx,.935,z),(.055,.025,.055),'brass')
        if scene=='town':
            box('Cottage walls',(0,1.25,-3.5),(3.2,2.4,1.5),'plaster',.035)
            for y in [.3,.6,.9,1.2,1.5,1.8,2.1,2.4]:box('Cottage siding',(0,y,-2.732),(3.15,.025,.025),'cream',.003)
            for side in [-1,1]:
                roof=box('Pitched roof',(side*.83,2.75,-3.5),(1.95,.14,1.9),'roof',.025)
                roof.rotation_euler[1]=side*.48
                for row in range(5):
                    for col in range(6):
                        x=side*(.14+row*.36)
                        tile=box('Overlapping roof tile',(x,3.13-abs(x)*.49,-4.25+col*.3),(.37,.055,.32),'roof',.015)
                        tile.rotation_euler[1]=side*.48
            tube('Roof ridge',[(-.02,3.18,-4.46),(-.02,3.18,-2.54)],.065,'wood')
            box('Front door',(0,.92,-2.69),(.78,1.72,.1),'teal',.018)
            for y in [.4,1.1]:box('Door inset',(0,y,-2.628),(.59,.43,.025),'dark',.012)
            ball('Door knob',(.25,.95,-2.59),(.045,.045,.045),'brass')
            for x in [-1.02,1.02]:
                box('Cottage window frame',(x,1.55,-2.69),(.55,.64,.12),'wood_light',.015)
                box('Cottage glass',(x,1.55,-2.62),(.44,.53,.015),'blue',.008)
                box('Cottage window cross',(x,1.55,-2.6),(.035,.53,.025),'white',.003)
            solid(0,-3.5,3.4,1.7)
        else:
            lathe('Carved fountain basin',[(0,.06),(.58,.06),(.79,.16),(.82,.4),(.85,.43),(.85,.51),(.73,.51),(.68,.26),(.2,.26)],(0,0,-3),'stone',40)
            cyl('Fountain water',(0,.38,-3),.69,.025,'water')
            lathe('Fountain pedestal',[(.23,.27),(.23,.36),(.13,.43),(.1,.78),(.3,.83),(.32,.9),(.25,.93)],(0,0,-3),'stone',32)
            for r in [.38,.53,.64]:ring('Water ripple',(0,.397,-3),r,.006,'blue')
            ball('Fountain finial',(0,1.02,-3),(.12,.14,.12),'brass')
            solid(0,-3,1.7,1.7)
    export(scene)
    ACTIVE=None


def garment(name,levels,color):
    vertices=[];segments=24
    for y,rx,rz in levels:
        for i in range(segments):
            a=i*math.tau/segments
            vertices.append((rx*math.cos(a),y,rz*math.sin(a)))
    faces=[]
    for row in range(len(levels)-1):
        for i in range(segments):faces.append((row*segments+i,(row+1)*segments+i,(row+1)*segments+(i+1)%segments,row*segments+(i+1)%segments))
    faces.extend([tuple(range(segments)),tuple((len(levels)-1)*segments+i for i in reversed(range(segments)))])
    return mesh(name,vertices,faces,color)


def hair_cap(head,female):
    vertices=[];segments=40;rows=12
    for row in range(rows):
        t=row/(rows-1)
        for i in range(segments):
            a=i*math.tau/segments
            # Front hairline opens the face; back and sides follow the skull.
            front=max(0,math.sin(a))
            phi=t*(1.84-front*.66 + .045*math.sin(a*5))
            vertices.append((.46*math.sin(phi)*math.cos(a),head+.46*math.cos(phi),-.035+.405*math.sin(phi)*math.sin(a)))
    faces=[]
    for row in range(rows-1):
        for i in range(segments):faces.append((row*segments+i,row*segments+(i+1)%segments,(row+1)*segments+(i+1)%segments,(row+1)*segments+i))
    mesh('Sculpted hair cap',vertices,faces,'hair')
    for lock in range(9):
        center=.57+lock*.25
        vertices=[]
        for row in range(13):
            t=row/12
            a=center+.3*(1-t)
            end=1.84-max(0,math.sin(center))*.66+.025
            phi=.23+t*(end-.23)
            width=.09*math.sin(t*math.pi)**.6+.003
            for column in range(5):
                u=(column-2)/2
                angle=a+u*width
                relief=1.018+.018*(1-u*u)*math.sin(t*math.pi)
                vertices.append((.46*relief*math.sin(phi)*math.cos(angle),head+.46*relief*math.cos(phi),-.035+.405*relief*math.sin(phi)*math.sin(angle)))
        faces=[(r*5+c,r*5+c+1,(r+1)*5+c+1,(r+1)*5+c) for r in range(12) for c in range(4)]
        mesh('Sculpted swept lock',vertices,faces,'hair')
    if female:
        for side in [-1,1]:
            for i in range(3):tube('Side hair lock',[(side*.31,head+.28,-.04),(side*(.39+i*.015),head-.02,-.08),(side*.33,head-.3,-.13)],.06,'hair')
        ball('Coiled bun',(.19,head+.46,-.12),(.19,.17,.18),'hair')
        for i in range(4):ring('Bun braid',(.19,head+.47+(i-2)*.04,-.12),.16-abs(i-2)*.02,.012,'hair_glint')
        tube('Hair ribbon',[(.03,head+.4,.02),(.18,head+.38,.08),(.35,head+.4,.02)],.029,'coral')


def character(gender):
    reset();baby=gender=='baby';female=gender=='female';torso=.6 if baby else 1.05;head=.98 if baby else 1.88
    if baby:ball('Baby romper',(0,torso,0),(.32,.3,.24),'teal')
    else:
        garment('Tailored shirt',[(.66,.28,.21),(.78,.3,.225),(.98,.245 if female else .285,.21),(1.17,.315 if female else .32,.265 if female else .235),(1.32,.34,.215),(1.41,.23,.175)],'teal')
        cyl('Neck',(0,1.48,0),.12,.2,'skin')
        for side in [-1,1]:
            mesh('Folded shirt collar',[(side*.02,1.405,.22),(side*.19,1.37,.22),(side*.12,1.24,.285)],[(0,1,2)],'white',False)
        tube('Shirt placket',[(0,1.31,.246),(0,1.02,.226),(0,.72,.224)],.012,'teal')
        for y in [.79,.99,1.19]:ball('Shirt button',(0,y,.248),(.017,.017,.012),'cream')
        tube('Shirt lower hem',[(-.26,.715,.13),(0,.7,.224),(.26,.715,.13)],.008,'seam')
    before=set(bpy.context.scene.objects)
    ball('Sculpted face',(0,head,.015),(.425,.44,.37),'skin')
    for side in [-1,1]:
        x=side*.165
        ball('Eye sclera',(x,head+.025,.356),(.082,.098,.032),'white')
        ball('Iris',(x,head+.018,.382),(.057,.074,.022),'iris')
        ball('Pupil',(x,head+.018,.4),(.037,.056,.013),'ink')
        ball('Eye catchlight',(x-.019,head+.047,.412),(.017,.021,.008),'white')
        tube('Upper eyelid',[(x-.075,head+.04,.371),(x,head+.115,.364),(x+.075,head+.04,.371)],.012,'hair')
        tube('Expressive eyebrow',[(x-.076,head+.161,.336),(x,head+.181,.343),(x+.07,head+.154,.339)],.018,'hair')
        ball('Cheek warmth',(side*.258,head-.11,.318),(.068,.025,.012),'pink')
        ball('Ear',(side*.417,head-.015,.015),(.072,.112,.075),'skin')
        ball('Inner ear',(side*.454,head-.015,.052),(.027,.062,.025),'pink')
    ball('Nose bridge',(0,head-.015,.361),(.04,.08,.045),'skin')
    ball('Nose tip',(0,head-.064,.397),(.055,.043,.04),'skin')
    tube('Curved smile',[(-.081,head-.163,.344),(0,head-.192,.36),(.081,head-.163,.344)],.011,'ink')
    if baby:
        tube('Baby curl',[(-.04,head+.425,.05),(-.07,head+.49,.025),(.02,head+.51,0),(.07,head+.455,.03)],.027,'hair')
    else:hair_cap(head,female)
    parent_to(set(bpy.context.scene.objects)-before,empty('Head',(0,head,0)))
    for side,tag in [(-1,'L'),(1,'R')]:
        before=set(bpy.context.scene.objects)
        ball('Shirt sleeve',(side*.355,torso+.115,0),(.135,.23,.165),'teal')
        ball('Forearm',(side*.39,torso-.12,.012),(.087,.17,.085),'skin')
        ball('Hand palm',(side*.392,torso-.275,.025),(.079,.093,.055),'skin')
        ball('Thumb',(side*.326,torso-.255,.05),(.042,.06,.04),'skin')
        for i in range(3):tube('Finger crease',[(side*.395+(i-1)*.025,torso-.3,.078),(side*.395+(i-1)*.025,torso-.335,.068)],.003,'pink')
        parent_to(set(bpy.context.scene.objects)-before,empty('Arm'+tag,(side*.34,torso+.19,0)))
        before=set(bpy.context.scene.objects)
        x=side*(.25 if baby else .17);z=.13 if baby else 0
        box('Trouser leg',(x,.22 if baby else .42,z),(.235,.22 if baby else .6,.285),'pants',.06)
        if not baby:
            tube('Trouser pressed seam',[(x,.67,.145),(x,.45,.149),(x,.18,.145)],.006,'pants')
            box('Turned trouser cuff',(x,.19,z),(.242,.055,.294),'pants',.015)
        shoe_x=side*(.29 if baby else .17);shoe_z=.3 if baby else .12
        box('Sneaker rubber sole',(shoe_x,.069,shoe_z),(.285,.078,.44),'rubber',.03)
        ball('Shaped sneaker upper',(shoe_x,.143,shoe_z+.015),(.133,.095,.203),'coral')
        box('Shoe tongue',(shoe_x,.224,shoe_z-.035),(.115,.016,.13),'cream',.015)
        for zi in [-.055,-.015,.025]:tube('Shoe lace',[(shoe_x-.062,.221,shoe_z+zi),(shoe_x,.23,shoe_z+zi+.012),(shoe_x+.062,.221,shoe_z+zi)],.008,'white')
        tube('Toe seam',[(shoe_x-.1,.133,shoe_z+.13),(shoe_x,.15,shoe_z+.197),(shoe_x+.1,.133,shoe_z+.13)],.006,'seam')
        parent_to(set(bpy.context.scene.objects)-before,empty('Leg'+tag,(side*.16,.36 if baby else .73,0)))
    if baby:
        for x in [-.13,.13]:ball('Romper snap',(x,.63,.225),(.026,.026,.013),'cream')
    export(gender)


def cat():
    reset()
    ball('Cat torso',(0,.35,0),(.23,.27,.4),'gold')
    ball('Cat head',(0,.65,.28),(.28,.255,.24),'gold')
    for side in [-1,1]:
        x=side*.18
        mesh('Pointed cat ear',[(x-.09,.8,.23),(x+.09,.8,.23),(x+side*.025,1.03,.2),(x,.8,.34)],[(0,1,2),(1,3,2),(3,0,2),(0,3,1)],'gold')
        mesh('Inner cat ear',[(x-.05,.835,.284),(x+.05,.835,.284),(x+side*.02,.974,.248)],[(0,1,2)],'pink',False)
        ball('Cat eye',(side*.113,.69,.493),(.059,.064,.025),'lightleaf')
        ball('Cat pupil',(side*.113,.69,.516),(.018,.052,.013),'ink')
        ball('Cat muzzle',(side*.055,.58,.502),(.063,.043,.044),'cream')
        for z in [-.23,.23]:ball('Cat paw',(x,.11,z),(.087,.105,.12),'cream')
        for i in range(3):tube('Cat whisker',[(side*.08,.585,.535),(side*.22,.59+i*.026,.56),(side*.36,.58+i*.048,.51)],.003,'cream')
        for z in [-.2,.03]:tube('Tabby marking',[(side*.05,.57,z),(side*.18,.5,z+.03),(side*.226,.4,z+.045)],.023,'wood')
    ball('Cat nose',(0,.606,.548),(.032,.023,.018),'pink')
    tube('Cat tail',[(0,.38,-.32),(.23,.45,-.5),(.3,.76,-.56),(.19,.94,-.5)],.065,'gold')
    export('cat')


def item(name):
    reset()
    if name=='apple':
        vertices=[];segments=40;rows=20
        for row in range(rows+1):
            t=row/rows*math.pi
            for i in range(segments):
                a=i/segments*math.tau
                radius=.24*math.sin(t)*(1+.045*math.cos(5*a)*math.sin(t))
                height=.245+.235*math.cos(t)-.035*math.exp(-(t/.35)**2)
                vertices.append((radius*math.cos(a),height,radius*math.sin(a)))
        faces=[(r*segments+i,r*segments+(i+1)%segments,(r+1)*segments+(i+1)%segments,(r+1)*segments+i) for r in range(rows) for i in range(segments)]
        mesh('Sculpted five-lobed apple',vertices,faces,'apple_red')
        tube('Apple stalk',[(0,.43,0),(.015,.5,0),(.035,.56,-.005)],.018,'wood')
        leaf('Apple leaf',(.015,.505,0),(.21,.555,-.035),.07)
    elif name=='book':book(0,.095,0)
    elif name=='coins':
        for i in range(4):
            x=i*.023;y=.05+i*.066
            cyl('Minted coin',(x,y,0),.23,.052,'brass')
            for h in [-.022,.022]:ring('Raised coin rim',(x,y+h,0),.209,.008,'brass')
            if i==3:
                star=[]
                for j in range(10):
                    a=j*math.pi/5;r=.11 if j%2==0 else .052
                    star.append((x+math.sin(a)*r,y+.029,math.cos(a)*r))
                mesh('Coin embossed star',star,[tuple(range(10))],'gold',False)
                for j in range(12):
                    a=j*math.tau/12;ball('Coin minted bead',(x+math.sin(a)*.176,y+.027,math.cos(a)*.176),(.009,.006,.009),'gold')
    elif name=='boat':
        vertices=[]
        for y,w in [(.03,.035),(.08,.115),(.17,.17),(.2,.172)]:
            for i in range(24):
                a=i*math.tau/24
                vertices.append((.39*math.cos(a),y,w*math.sin(a)*(1-.2*math.cos(a))))
        faces=[(r*24+i,(r+1)*24+i,(r+1)*24+(i+1)%24,r*24+(i+1)%24) for r in range(3) for i in range(24)]
        mesh('Curved wooden boat hull',vertices,faces,'blue')
        box('Boat inset deck',(0,.177,0),(.56,.025,.23),'wood_light',.045)
        ring('Hull gunwale',(0,.2,0),.38,.015,'wood','xz',.45)
        tube('Sailing mast',[(-.05,.19,0),(-.05,.73,0)],.014,'wood')
        mesh('Billowing triangular sail',[(-.03,.68,0),(-.03,.29,0),(.3,.29,0),(.09,.42,.045)],[(0,1,3),(1,2,3),(2,0,3)],'coral')
        tube('Sail stitched edge',[(-.015,.66,.008),(.282,.3,.008),(-.015,.3,.008)],.004,'cream',True,True)
        tube('Rigging',[(-.32,.2,0),(-.05,.72,0),(.31,.2,0)],.004,'cream',sharp=True)
        mesh('Mast pennant',[(-.05,.735,.005),(.11,.7,.005),(-.05,.67,.005)],[(0,1,2)],'gold',False)
    elif name=='tin':
        box('Keepsake tin body',(0,.16,0),(.56,.29,.4),'blue',.045)
        seam('Tin rolled base',0,.04,0,.56,.4,'metal',.009)
        box('Fitted tin lid',(0,.316,0),(.59,.055,.43),'teal',.025)
        seam('Lid rolled lip',0,.315,0,.59,.43,'metal',.009)
        box('Tin clasp',(0,.23,.217),(.085,.12,.025),'brass',.015)
        for x in [-.17,.17]:box('Tin hinge',(x,.28,-.216),(.1,.06,.035),'metal',.01)
        box('Lid name plaque',(0,.351,0),(.23,.009,.13),'brass',.014)
    elif name=='blanket':
        for i in range(3):
            box('Folded textile layer',(0,.047+i*.059,0),(.65,.063,.45),'pink' if i!=1 else 'cream',.029)
            seam('Blanket edge binding',0,.063+i*.059,0,.61,.42,'cream',.008)
        for x in [-.18,0,.18]:box('Woven blanket stripe',(x,.207,0),(.055,.005,.39),'cream',.001)
        for i in range(10):tube('Blanket fringe',[(-.27+i*.06,.05,.21),(-.27+i*.06,.03,.25),(-.26+i*.06,.025,.27)],.006,'pink')
    elif name=='rattle':
        ring('Wooden teething ring',(0,.19,0),.16,.035,'wood_light','xy')
        ball('Rattle shell',(0,.49,0),(.17,.18,.16),'gold')
        ring('Rattle equator',(0,.49,0),.171,.017,'coral')
        for i in range(5):
            a=i*math.tau/5
            ball('Rattle inlay',(math.sin(a)*.153,.54,math.cos(a)*.144),(.027,.029,.013),'cream')
    elif name=='plant':scaled_plant(0,0,.55)
    elif name=='letter':
        box('Envelope paper',(0,.055,0),(.52,.075,.37),'paper',.014)
        mesh('Envelope folded flap',[(-.245,.096,-.17),(.245,.096,-.17),(0,.106,.074)],[(0,1,2)],'cream',False)
        for side in [-1,1]:tube('Envelope fold',[(side*.244,.099,.166),(side*.1,.1,.013)],.003,'seam')
        cyl('Wax seal',(0,.112,.07),.065,.022,'apple_red')
        ring('Wax stamped rim',(0,.125,.07),.046,.004,'coral')
    elif name=='ball':
        ball('Leather play ball',(0,.265,0),(.26,.26,.26),'blue')
        for angle in [0,math.pi/3,2*math.pi/3]:
            pts=[]
            for i in range(24):
                t=i*math.tau/24
                pts.append((.262*math.sin(t)*math.cos(angle),.265+.262*math.cos(t),.262*math.sin(t)*math.sin(angle)))
            tube('Ball stitched panel',pts,.006,'cream',True)
    export(name)


only=set(sys.argv[sys.argv.index('--')+1:]) if '--' in sys.argv else set()
all_models={'home','school','campus','office','town','garden','male','female','baby','cat','apple','book','coins','boat','tin','blanket','rattle','plant','letter','ball'}
if only-all_models:raise ValueError('Unknown model selection: '+str(only-all_models))
if only:
    REPORT=json.loads((OUT/'manifest.json').read_text())['detail']
    COLLIDERS=json.loads((OUT/'colliders.json').read_text())
for scene in ['home','school','campus','office','town','garden']:
    if not only or scene in only:room(scene)
for gender in ['male','female','baby']:
    if not only or gender in only:character(gender)
if not only or 'cat' in only:cat()
for prop in ['apple','book','coins','boat','tin','blanket','rattle','plant','letter','ball']:
    if not only or prop in only:item(prop)
(OUT/'colliders.json').write_text(json.dumps(COLLIDERS,indent=2))
(OUT/'manifest.json').write_text(json.dumps({
    'author':'Choice of Life 3D project',
    'generator':'Blender 4.5 / art/build_crafted_assets.py',
    'revision':'crafted-realism-0.2.0',
    'license':'Original project-generated geometry and procedural textures; no external assets',
    'files':{f'{name}.glb':data['bytes'] for name,data in REPORT.items()},
    'detail':REPORT,
},indent=2))
print('ASSET_BUILD_COMPLETE',sum(data['bytes'] for data in REPORT.values()),flush=True)
