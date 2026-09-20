# GreenRoute G1 drone asset

- Source: `C:\Users\stc_0\Desktop\GreenRoute_Drone\drone.blend`
- Exporter: `scripts/export-greenroute-drone.py`
- Runtime asset: `greenroute-drone.glb`
- Blender source dimensions: approximately 1.30 m x 1.30 m x 0.50 m

The original `.blend` file is not modified. The export excludes the Blender
studio floor, cameras and lights and converts the GREENROUTE label to geometry.
The website replaces the source blades with correctly centred runtime rotors,
so animation never mutates or relies on Blender collection transforms.
