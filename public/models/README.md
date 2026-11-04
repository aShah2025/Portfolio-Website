# Cessna 172 model

Converted from the user-supplied `cessna+172.rar` SolidWorks assembly: `Assem1.SLDASM`, `cessna 172.SLDPRT`, `Propeller.SLDPRT`, `wheel 1.SLDPRT`, and `wheel 2.SLDPRT`.

The GLB retains the saved display-mesh geometry, normals, face appearances, and assembly placements, including both instances of the main wheels. The assembly is oriented with the nose toward −Z and Y up, and scaled uniformly to an 11 m wingspan for the website's scene. The propeller is a separate node with its pivot on the shaft.

68,118 triangles; four reusable meshes and five placed component nodes. The archive's external teak/walnut bitmaps were not included, so the propeller uses matching wood colours with subtle vertex-colour grain. Other materials follow the saved paint, glazing, metal, and rubber appearances, with the candy-apple paint finish calibrated to the supplied rendered reference.

Local conversion used the display-cache reader from https://github.com/XRTC5/sldprt-export and Three.js GLTFExporter. The resulting GLB is self-contained and makes no external texture requests.
