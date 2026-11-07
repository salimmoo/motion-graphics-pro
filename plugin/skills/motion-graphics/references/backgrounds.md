# Reference: living backgrounds, detailed backgrounds, 3D space, character shadows

Part of the `motion-graphics` skill. Read when: building a background, a one-take orbit scene, shadows from a 3D pose.

Moved verbatim from SKILL.md v2.3 (5. Living backgrounds); the old chapter numbers are kept, so cross-references such as "chapter 6.4" or "T9a" can still be found in the reference files (the chapter map is in SKILL.md, References section).

## 5. Living backgrounds
- Parallax: sky 0, clouds 0.04x + drift, far mountains 0.08x (blur 2.2), near mountains 0.14x, hills 0.32x, trees 0.55x, footing 1.0x, road 1.15x, foreground grass 1.5x (blur 4.5).
- Atmospheric perspective: the further away, the closer to the sky colour; the palette stays in one colour family. 2D layers get light in 3D space for cinematic depth.
- Bend (CC Bend It): dx = sway x H x (h/H)^2, a different phase per object. Wave Warp only on free parts (skirt, hair, robe, fire): a mask with a straight edge at the root, the wave pinned at that edge, a small shift before the wave to close the seam; fire waves upwards.
- Leaf particles float up (slightly negative gravity) and sideways. Birds = a trail of dots. A tree crown breaks into spreading dots.
- Wiggle = 2-octave value noise, not a pure sine. Loop = a whole number of cycles, first frame = last frame.
- Twinkling stars: scale up and down; random twinkle = fractal noise as a luma matte.

### 5.1 Detailed backgrounds (Review Results, test project)
- A plain/simple background (flat layers, blob trees, no cast shadows) was REJECTED: "make it cool and detailed, shadows, etc.".
- Before designing a background: research vector background references (principles, not copies), then make 2-3 style frames to choose from + an orbit sheet at several angles + a short clip per style.
- Principles from the research:
  - flat-style layer order: flat shape -> shadow per shape (clipped) -> multiply gradient per shape -> limited texture;
  - depth: linear perspective, parallax, less detail and contrast in the distance, the distance much paler and cooler;
  - trees = clumps, the light-dark border not round, sky holes + branches visible in the holes, crown shadow on the trunk;
  - dappled light: leaves = gobo, shadows with holes, shadows never black;
  - saturation in the shadows never higher than in the light;
  - large dark shapes first, small light details last; the background serves the story (take the essence).
- A natural background palette (for example green mountains), matched to the character palette so it blends in instead of looking pasted on. Write a hex table + its link to the character colours, and show swatches on the comparison sheet.
- Avoid background colours equal to the clothing where they overlap. Example: sage trousers in front of a hill, so the hill was shifted to olive green; a cream road under white shoes + sage trousers.
- 9:16 composition: character sole at about 80% of the frame height, character about 50-60% of the frame height (or as the chosen camera distance requires), road under the feet.
- The mountain view must be visible: clear tall trees from the view wedge of the main shot (open meadow up to the distant tree line); framing trees only in the top corners.
- Three style directions compared in the test project: A flat cel, 3 tones, high sun (chosen: safest for the orbit and blends best with the flat character), B gradient + grain + glow + warm grade, low sun (needs relighting of the character per angle), C brush edges + leaf strokes + paper texture.
- Background mistakes found so far:
  - straight triangular mountains = geometric; use periodic fBm + key peaks with rounded tops (soft-abs) and uneven shoulders; volcanoes with concave slopes k^1.75 + a shallow crater; S-curved radial gullies with random length and width;
  - the shadow side of a mountain is found on a smoothed ridge (large peaks only);
  - chevron leaf marks read as birds; use small jagged leaf clumps;
  - a dark band on the trunk under the crown reads as a hard band; use a gradient;
  - sky holes in distant trees read as white specks; only for crowns > 150 px;
  - trees at mid distance cover the mountains (a 10 m tree at 60 m is taller than a 1 km mountain at 10 km);
  - a sun that makes large crown shadows cover the road in front of the character; pick an azimuth so the shadows fall behind the objects, or put the sun behind the scene for long shadows towards the camera;
  - a soft-light texture with a mean other than 0.5 makes the frame grey; paper texture must be neutral (mean 0.5).
- Grain/texture only on the background behind the character; a flat character stays clean.
- Principles from two stock vector backgrounds (village + winter forest, measured from the SVG: 0 strokes, 0 opacity/blend, no grain; test project 05_Riset):
  - a gradient per shape, almost always vertical, length = shape height, dL* end to end 8-14; smoothness comes from gradients, not texture (fits the flat cel style when dL* <= 14);
  - the foot of each layer fades into the haze colour (blue-teal valley) as a layer separator without lines; snow: a light lip on the top edge of each mound;
  - hue shifts in vegetation gradients (green at the ends to maroon/purple in the middle) and warm light / cool shade on mountains (for example h105 vs h321) give depth without darkening;
  - mountain = a shaded base mass + angular light flakes on the sun side + thin blue flakes on the edge facing the sky;
  - value range per distance: far L* 72-96 C* 5-14 (almost sky colour), middle 60-87, near 22-64, framing trees darkest at about L* 22;
  - tree trunks in 2 tones + a warm rim band 20-30% of the width on the light side (about +26 L*); pines = tiers of drooping branches, distant rows = small triangles on a gradient band;
  - water = a gradient (sand to blue) + white glint ellipses in horizontal rows that shrink into the distance, the shore with a dark lip; ice = a gradient + thin light crack lines.

### 5.2 3D space background for a one-take orbit (Review Results, test project, approved)
- Pinhole camera: f about 1500 px for 1080 x 1920, yaw from north clockwise, pitch down +; near plane 1.0 H with polygon clipping (Sutherland-Hodgman) before projection.
- Camera height so the character's sole sits at y_s (for example 80% of the frame) at horizontal distance d: h = d (sin t + k cos t) / (cos t - k sin t), k = (y_s - cy) / f, t = pitch. Test character example: d 14 H, pitch 4 degrees, h 6.53 H.
- Ground, road (with staggered brick joints and slab tone variation), pond, grass patches, fallen petals = polygons on the ground plane, projected per point. Straight 3D lines stay straight; circles are sampled at 48-96 points.
- Mountains, hills, distant hedges = cylinder rings around the park centre (radius 300-2600 H), a height profile per azimuth, only the run of visible points (z > 0.35 R) made into one polygon. Parallax is automatically correct.
- Trees, lamps, shrubs, flowers, grass, rocks = billboard sprites facing the camera, base at the world position, scale f/depth, sorted far to near together with the character. Distant trees grouped on rings with gaps. LOD: small sprites use fewer clumps without detail.
- The sun is fixed in the world; the sprite light direction on screen = (sun . right, sun . up) of the camera, so the lit side of a tree moves correctly during the orbit.
- Haze per distance through colour mixing (not a layer): t = haze_max (1 - exp(-(d - 15) / D)).
- Cast shadows are computed in the world: crown = an ellipse along the sun (axis r / sin e), trunk = a quad, dappled light holes = small erased ellipses. All shadows are drawn OPAQUE on one layer, then composited once (multiply + alpha; `brush`: `cv.save_layer(brush.Paint(alpha=a, blend="multiply"))` ... `cv.restore()`, `shadow3d.shadow_layer`): overlaps do not darken twice. DO NOT union hundreds of polygons with PathOps (23 s per frame); a layer = 2 s per frame.
- Camera path vs objects: check the distance from the camera to tree trunks/lamps/shrubs in every frame of the take (`clearance`). Objects the camera passes through are removed after the layout is made (keepout), with the random draws still consumed so the rest of the layout does not change and old style frames can still be regression-tested.
- Test the 3D space before the rig: an orbit sheet at 4 angles (90R, 180, 90L, 0) with the existing character drawings.

### 5.3 Character shadows in a 3D scene (Review Results, test project)
- A character shadow must NOT be a fixed capsule shape ("the shadow doesn't change based on the motion"). Compute it from the 3D pose: body = capsules/spheres (legs, torso, neck, head, arms, bag, shoes) from the gait engine, each point P projected as G = P - sun x (P_y / sun_y), a sphere becomes an ellipse with axis r / sin e along the sun. The shadow steps along and is correct from every camera angle.
- Draw the shadow in ground coordinates through a ground -> screen homography: for camera axes a (right, up, fwd), the camera coordinates of a ground point (x, 0, z) = a_x x + a_z z - C . a; homography rows = (f a0 + cx a2), (cy a2 - f a1), (a2) against (x, z, 1). Round-cap strokes in ground space give the correct width.
- Contact occlusion (AO) under a planted shoe.
- The character darkens too in the shade of trees/lamps: map the character billboard pixels to the ground along the sun (screen -> sprite local -> ground -> screen, one 3x3 matrix), sample the shadow mask (white = lit, shadow = 1 - a + a x colour), then blend with `modulate` on the character layer (`brush.Paint(blend="modulate")`, `shadow3d.draw_shaded`). Shadows of low objects (shrubs, flowers) are not used.
- Actions not rigged yet use the standing pose for the shadow; write this down as a weakness.
