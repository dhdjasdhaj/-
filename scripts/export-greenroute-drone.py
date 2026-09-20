"""Export the user-authored GreenRoute drone from Blender as a web-ready GLB.

The source .blend is opened read-only by the command line. All grouping and
conversion below happens in memory before the GLB is written.
"""

import bpy
import os


SOURCE_COLLECTION = "Drone"
OUTPUT = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "public", "drone", "greenroute-drone.glb")
)


drone_collection = bpy.data.collections.get(SOURCE_COLLECTION)
if drone_collection is None:
    raise RuntimeError(f"Missing Blender collection: {SOURCE_COLLECTION}")

drone_objects = list(drone_collection.all_objects)

# glTF has no font primitive. Convert the small GREENROUTE label to a mesh in
# the transient export scene so it remains visible in Babylon.js.
for obj in drone_objects:
    if obj.type == "FONT":
        bpy.context.view_layer.objects.active = obj
        obj.select_set(True)
        bpy.ops.object.convert(target="MESH")
        obj.select_set(False)

drone_objects = list(drone_collection.all_objects)
bpy.ops.object.select_all(action="DESELECT")
for obj in drone_objects:
    obj.select_set(True)

os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)
bpy.ops.export_scene.gltf(
    filepath=OUTPUT,
    export_format="GLB",
    use_selection=True,
    export_apply=True,
    export_yup=True,
    export_cameras=False,
    export_lights=False,
    export_animations=True,
)
print(f"GREENROUTE_EXPORT_OK={OUTPUT}")
