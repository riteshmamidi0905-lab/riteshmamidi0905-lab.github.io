"""Original review-only architecture and articulated VECTRA work study. Blender 4.3.
Run: blender -b -t 4 --python scripts/cinematic-proof/build_scene.py -- OUTPUT.glb
No downloaded models, image textures, personal likeness or paid service.
"""
import bpy, math, sys
from pathlib import Path
from mathutils import Vector
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)

def material(name,color,metal=0,rough=.5,alpha=1):
    m=bpy.data.materials.new(name);m.diffuse_color=(*color,alpha);m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,alpha);p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough;p.inputs['Alpha'].default_value=alpha
    if alpha<1:m.surface_render_method='DITHERED'
    return m
stone=material('Warm limestone',(.36,.32,.25),0,.7)
floor=material('Honed charcoal terrazzo',(.17,.20,.20),.16,.29)
plaster=material('Ivory mineral plaster',(.5,.48,.42),0,.8)
steel=material('Brushed dark steel',(.16,.19,.20),.8,.32)
silver=material('VECTRA silver alloy',(.48,.53,.53),.82,.26)
brass=material('Aged champagne brass',(.48,.34,.16),.75,.3)
wood=material('Smoked walnut',(.07,.032,.014),0,.45)
dark=material('Rubber and black ceramic',(.018,.027,.03),.1,.55)
copper=material('Brewhouse copper',(.54,.24,.10),.75,.28)
leaf=material('Courtyard foliage',(.12,.23,.15),0,.8)
glass=material('Architectural glazing',(.37,.58,.57),.25,.14,.2)
cyan=material('Instrument cyan',(.10,.7,.7),.25,.24)
warm=material('Warm architectural diffuser',(1,.66,.28),0,.4)
for m,power in [(cyan,2),(warm,2.2)]:
    p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Emission Color'].default_value=m.diffuse_color;p.inputs['Emission Strength'].default_value=power
architecture=[]
def finish(obj,name,mat,parent=None,merge=True):
    obj.name=name;obj.data.materials.append(mat)
    if parent:obj.parent=parent
    if merge and not parent:architecture.append(obj)
    return obj
def box(name,p,s,mat,parent=None,bevel=0,merge=True):
    bpy.ops.mesh.primitive_cube_add(size=1,location=p);o=bpy.context.object;o.dimensions=s
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    if bevel:
        mod=o.modifiers.new('Manufactured edge','BEVEL');mod.width=bevel;mod.segments=2
        bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name)
        o.modifiers.new('Weighted corner normals','WEIGHTED_NORMAL')
    return finish(o,name,mat,parent,merge)
def cyl(name,p,r,depth,mat,parent=None,vertices=24,merge=True):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=r,depth=depth,location=p);o=bpy.context.object
    for f in o.data.polygons:f.use_smooth=True
    return finish(o,name,mat,parent,merge)
def sphere(name,p,scale,mat,parent=None,merge=True):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=20,ring_count=12,location=p);o=bpy.context.object;o.scale=scale
    for f in o.data.polygons:f.use_smooth=True
    return finish(o,name,mat,parent,merge)
def empty(name,p,parent=None):
    o=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(o);o.location=p;o.parent=parent;return o
def text(name,words,p,size,mat,rot=(math.pi/2,0,0),parent=None):
    bpy.ops.object.text_add(location=p,rotation=rot);o=bpy.context.object;o.data.body=words;o.data.size=size;o.data.extrude=.001;o.data.align_x='CENTER'
    bpy.ops.object.convert(target='MESH');return finish(o,name,mat,parent)

# One designed building: a reception/engineering spine beside a brewery and courtyard.
box('Continuous floor',(0,2,-.12),(25,23,.24),floor)
box('Courtyard stone',(0,-13,-.13),(29,9,.22),stone)
box('Rear plaster wall',(0,13,3.3),(25,.35,6.6),plaster)
box('West plaster wall',(-12.4,2,3.3),(.35,22,6.6),plaster)
box('East brick enclosure',(12.4,2,2.9),(.35,22,5.8),stone)
# Ceiling coffer bays and skylights, rather than floating platforms.
for x in [-11.8,-6,0,6,11.8]:
    box('Structural ceiling beam',(x,2,6.7),(.22,22,.34),steel)
    for y in [-7,3,12.5]:
        box('Limestone column',(x,y,3.3),(.38,.38,6.6),stone,bevel=.045)
for y in [-8,-3,2,7,12.5]:
    box('Ceiling cross bay',(0,y,6.7),(24,.22,.34),steel)
    box('Recessed linear light',(0,y+.18,6.52),(22,.055,.055),warm)
for x in [-9,-3,3,9]:
    box('Skylight glazing',(x,2,6.86),(5.5,20,.045),glass)
for x in [-9,-3,3,9]:
    box('Front glazing',(x,-8.1,3.15),(5.4,.04,5.9),glass)
    box('Front bronze mullion',(x-2.8,-8.12,3.2),(.08,.13,6.4),brass)
box('Arrival canopy',(0,-9.8,4.5),(10,4.2,.25),steel)
box('Canopy soffit',(0,-9.8,4.32),(9.6,4,.08),wood)
for x in [-4.4,4.4]:box('Entrance blade',(x,-11.7,2.2),(.2,.4,4.4),brass)
text('Entrance NASHA','NASHA',(0,-11.92,3.28),.8,warm)
text('Entrance subtitle','BUSINESS VISION / ENGINEERING RESPONSE',(0,-11.93,2.94),.15,plaster)
for x in [-9,9]:
    box('Raised landscape bed',(x,-13,.3),(4,3,.6),stone,bevel=.1)
    for dx in [-1,0,1]:
        cyl('Tree trunk',(x+dx*.8,-13,1.35),.055,1.8,wood)
        sphere('Sculpted canopy',(x+dx*.8,-13,2.4),(.65,.6,.8),leaf)
for x in [-5,5]:
    cyl('Courtyard table',(x,-13,.85),.7,.08,wood)
    cyl('Table base',(x,-13,.4),.09,.8,steel)
    for dx in [-1,1]:
        box('Outdoor seat',(x+dx,-13,.45),(.6,.65,.08),wood,bevel=.06)
        box('Outdoor chair back',(x+dx,-12.72,.85),(.6,.06,.7),wood,bevel=.04)

# Grand arrival desk and material rhythm.
box('Reception limestone block',(-5,-5,.65),(5,1.2,1.3),stone,bevel=.08)
box('Reception walnut top',(-5,-5,1.35),(5.1,1.3,.12),wood,bevel=.04)
text('Atrium title','NASHA / INTELLIGENCE',(-5,-4.95,3.9),.43,brass)
text('Atrium identity','FOUNDER VISION  /  APPLIED AI  /  INDEPENDENT ENGINEERING',(-5,-4.95,3.4),.11,steel)
for y in [-3,1,5,9]:
    box('West acoustic panel',(-12.15,y,3),(.12,2.8,4.1),wood)
    for dy in [-1,-.5,0,.5,1]:box('Wall brass rhythm',(-12.06,y+dy,3),(.03,.025,4.1),brass)

# Inventory workroom and shared receiving edge.
box('Engineering divider',(1.6,5,2.7),(.08,15,5.4),glass)
for y in [-2,3,8,12]:box('Divider frame',(1.6,y,2.7),(.12,.08,5.4),steel)
box('Integrated workbench',(-5,2,1.02),(5,1.2,.14),wood,bevel=.04)
for x in [-7,-3]:box('Desk pedestal',(x,2,.5),(.2,.8,1),steel)
for x in [-6.2,-4.4]:
    o=box('Workstation display surround',(x,2.58,1.73),(1.55,.12,.95),steel,bevel=.05);o.rotation_euler[0]=-.1
    box('Live screen surface',(x,2.49,1.73),(1.4,.015,.8),dark)
box('Touch console',(-3.05,1.7,1.13),(1,.7,.06),dark,bevel=.03)
text('Inventory wall label','VECTRA / INVENTORY INTELLIGENCE',(-6,9.7,4.4),.31,steel)
text('Inventory subtitle','DETECT  /  INVESTIGATE  /  RECONCILE',(-6,9.7,3.98),.15,brass)
for x in [-9,-6,-3]:
    for z in [.35,1.7,3.05]:box('Warehouse shelf',(x,9.5,z),(2.7,1.25,.08),steel)
    for sx in [-1.35,1.35]:box('Racking post',(x+sx,9.5,1.8),(.08,1.25,3.6),steel)
    for z in [.75,2.1]:
        for dx in [-.7,0,.7]:box('Authored storage carton',(x+dx,9.5,z),(.55,.75,.65),wood,bevel=.025)
box('Measured stock column',(-9.5,5,.6),(1.2,1.1,1.2),cyan,merge=False).name='StockLevel'
box('Receiving crate',(-.1,8,.4),(.85,.8,.8),wood,bevel=.04,merge=False).name='ReceiptCrate'
box('Receiving floor line',(.1,5,.012),(.06,11,.02),brass)

# The brewery shares the same building, receiving boundary and material palette.
box('Bar stone plinth',(7,2,.55),(6,1.1,1.1),stone,bevel=.08)
box('Continuous walnut bar',(7,2,1.15),(6.3,1.35,.15),wood,bevel=.06)
for x in [4.7,6.2,7.7,9.2]:
    cyl('Bar stool',(x,.6,.75),.27,.1,wood);cyl('Stool stem',(x,.6,.36),.045,.7,steel)
for x in [4,6.7,9.4]:
    cyl('Fermentation vessel',(x,9,2),.8,2.6,silver)
    sphere('Fermentation dome',(x,9,3.3),(.8,.8,.36),silver)
    bpy.ops.mesh.primitive_cone_add(vertices=28,radius1=.23,radius2=.8,depth=.8,location=(x,9,.3));finish(bpy.context.object,'Conical fermentation base',silver)
    for dx in [-.55,.55]:box('Vessel support',(x+dx,9,.38),(.08,.08,.7),steel)
    cyl('Tank collar',(x,9,2.9),.82,.08,brass)
    box('Tank status instrument',(x,8.18,2.2),(.24,.05,.35),cyan)
box('Kitchen wall',(9,12.5,2),(6,.12,4),plaster)
box('Open kitchen hood',(8.8,11,3.7),(5,1.5,.7),steel,bevel=.06)
box('Kitchen pass',(8.8,10.7,1.0),(5,1.1,.14),silver)
for x in [4.5,7.5,10.5]:
    cyl('Pendant shade',(x,2,4.65),.4,.2,copper)
    cyl('Pendant diffuser',(x,2,4.53),.32,.03,warm)
    cyl('Pendant cable',(x,2,5.6),.012,1.8,steel)
for x,y in [(4,-3),(8,-3),(10,5)]:
    cyl('Dining tabletop',(x,y,.82),.8,.09,wood);cyl('Dining pedestal',(x,y,.38),.1,.76,steel)
    for dx in [-1,1]:
        box('Dining chair seat',(x+dx,y,.44),(.55,.6,.08),wood,bevel=.05)
        box('Dining chair back',(x+dx,y+.26,.8),(.55,.06,.65),wood,bevel=.04)
text('Founder title','NASHA / INDO-MEX',(7,7,4.8),.49,brass)
text('Founder concept subtitle','PROPOSED HOSPITALITY CONCEPT',(7,7,4.32),.16,steel)

# Original VECTRA translation: named transform hierarchy, not a portrait texture.
robot=empty('VectraRig',(-3.55,.9,0));robot.rotation_euler[2]=math.pi
for x in [-.25,.25]:
    box('Tracked foot',(x,0,.13),(.39,.72,.23),dark,robot,bevel=.08)
    for y in [-.24,0,.24]:
        o=cyl('Track wheel',(x,y,.14),.11,.4,brass,robot);o.rotation_euler[1]=math.pi/2
    box('Foot alloy cap',(x,-.1,.28),(.34,.55,.11),silver,robot,bevel=.04)
    cyl('Lower leg',(x,.05,.57),.105,.55,silver,robot)
    sphere('Knee joint',(x,.05,.87),(.13,.13,.13),brass,robot)
    box('Thigh casing',(x,.05,1.08),(.24,.26,.37),silver,robot,bevel=.07)
    box('Leg identity strip',(x,-.087,1.08),(.025,.025,.26),cyan,robot)
box('Hip assembly',(0,.04,1.34),(.65,.35,.25),steel,robot,bevel=.07)
for z in [1.5,1.56,1.62]:cyl('Waist mechanics',(0,.04,z),.16,.04,brass,robot)
box('Chest alloy',(0,.04,1.96),(.88,.44,.64),silver,robot,bevel=.09)
box('Chest bronze gasket',(0,-.193,2.02),(.76,.025,.45),brass,robot,bevel=.045)
box('Chest instrument',(0,-.214,2.02),(.68,.025,.35),dark,robot,bevel=.035)
box('Chest cyan signature',(0,-.235,1.94),(.52,.02,.035),cyan,robot,bevel=.01)
text('VECTRA identity','VECTRA',(0,-.237,2.04),.115,plaster,parent=robot)
cyl('Neck actuator',(0,.04,2.39),.11,.2,steel,robot)
head=empty('VectraHead',(0,.04,2.61),robot)
box('Camera head brass shell',(0,0,0),(.68,.42,.4),brass,head,bevel=.07)
box('Camera head alloy',(0,-.015,.02),(.61,.45,.33),silver,head,bevel=.045)
box('Optical black face',(0,-.25,.025),(.54,.035,.25),dark,head,bevel=.04)
for x in [-.17,.17]:
    o=cyl('Camera lens ring',(x,-.28,.03),.088,.045,steel,head);o.rotation_euler[0]=math.pi/2
    o=cyl('Camera optic',(x,-.307,.03),.057,.015,cyan,head);o.rotation_euler[0]=math.pi/2
box('Head lower grille',(0,-.25,-.13),(.39,.035,.07),steel,head)
for sign,name in [(-1,'Left'),(1,'Right')]:
    arm=empty('Vectra'+name+'Shoulder',(sign*.53,.04,2.14),robot)
    sphere('Shoulder joint',(0,0,0),(.17,.17,.17),brass,arm)
    box('Upper arm housing',(0,0,-.26),(.24,.27,.42),silver,arm,bevel=.05)
    fore=empty('Vectra'+name+'Elbow',(0,0,-.53),arm)
    sphere('Elbow joint',(0,0,0),(.13,.13,.13),brass,fore)
    box('Forearm housing',(0,0,-.23),(.26,.28,.38),steel,fore,bevel=.05)
    box('Forearm cyan strip',(0,-.15,-.23),(.15,.02,.12),cyan,fore)
    hand=empty('Vectra'+name+'Wrist',(0,0,-.47),fore)
    box('Articulated palm',(0,0,-.09),(.19,.12,.18),silver,hand,bevel=.03)
    for dx in [-.065,0,.065]:
        box('Mechanical finger',(dx,-.02,-.24),(.035,.06,.13),brass,hand,bevel=.008)
    box('Mechanical thumb',(sign*.12,-.02,-.12),(.04,.07,.12),brass,hand,bevel=.01)

# Batch static architectural meshes by material. The rig and two event objects remain independent.
groups={}
for obj in architecture:
    if obj.type=='MESH' and len(obj.data.materials):groups.setdefault(obj.data.materials[0].name,[]).append(obj)
for mat_name,group in groups.items():
    if not group:continue
    bpy.ops.object.select_all(action='DESELECT')
    for o in group:o.select_set(True)
    bpy.context.view_layer.objects.active=group[0];bpy.ops.object.join();group[0].name='Architecture_'+mat_name
out=Path(sys.argv[sys.argv.index('--')+1]);out.parent.mkdir(parents=True,exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(out),export_format='GLB',export_apply=True,export_cameras=False,export_lights=False,export_yup=True)
print('ORIGINAL_PROOF_EXPORTED',out,out.stat().st_size)
