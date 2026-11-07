# References: maps and routes

Part of the `motion-graphics-pro` skill. Read when: map scenes, routes, city coordinates.

Moved verbatim from SKILL.md v2.3 (chapter 9 Maps and routes); the old chapter numbers are kept, so cross-references such as "chapter 6.4" or "T9a" can still be found in the reference files (the chapter map is in SKILL.md, References section).

## 9. Maps and routes

1. A map is never drawn by AI. Coastlines come from the bundled Natural Earth data (`MGP.map`, data in `motion-graphics/lib/map-data/`; no npm), projected with a projection fitted to the frame; the aspect ratio is kept and the viewBox is never stretched.
2. City coordinates (lat, lng) come from a verified source and are written in the scene data together with that source. Land = textured kit paper + shadow; sea = flat plane; labels from code.
3. The route grows from its tip: `pathLength="100"`, `stroke-dasharray="100 120"`, dashoffset 110 to 0. The length is computed once at init (`getTotalLength()` can be 0 before layout).
4. The traveller sits at the head of the line and faces the smoothed tangent direction, turning at most 120 degrees per second. The table of positions and angles per frame is computed once at init.
5. At each city the route stops, the label appears on the VO word, then holds. The camera follows the route head within limits, so the map edge is never visible.
6. Default map = `MGP.map` (Natural Earth) + `MGP.routeMap` (growing route, vehicle facing the tangent). Satellite imagery is offered only as an option when the user supplies the source and its licence; this package does not ship a basemap baking script.
