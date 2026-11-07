# References: tracing from references and rigging from artwork

Part of the `vector-character` skill. Read when: there is a reference image (turnaround, character sheet) to follow.

Moved verbatim from SKILL.md v2.3 (12. Tracing from a reference image (turnaround / character sheet), 13. Rig from traced artwork (DeformSpace)); the old chapter numbers are kept, so cross-references such as "chapter 6.4" or "T9a" can still be found in the reference files (the chapter map is in SKILL.md, References section).

## 12. Tracing from a reference image (turnaround / character sheet)

Review Results: when the user provides a reference image, the 3/4, side and back views are TRACED from the reference (direction agreed), not redrawn by hand or warped. The front view is also traced so all views share one style.

- Tools: numpy + `image_ops` (HSV `cvt_color`, cubic `resize`, `gaussian_blur`, `connected_components`, `outer_contours`), then `brush.Path`. Steps that use OpenCV functions outside `image_ops` (distanceTransformWithLabels, RETR_CCOMP, approxPolyDP) are written with numpy (line pixels to the nearest part via repeated dilation per label, holes from the outer contours of enclosed background components, Douglas-Peucker), or use OpenCV when it happens to be installed (optional).
- Steps:
  1. Cut the reference per view (columns x0-x1), one head-top line and the same sole line for all views, same H scale.
  2. HSV segmentation per part (hair, skin, shirt, accessories, trousers, shoes) + dark line pixels. Line pixels are assigned to the nearest part (`distanceTransformWithLabels`).
  3. Masks upsampled 4x (cubic + Gaussian), then thresholded; contours (RETR_CCOMP, even-odd fill) smoothed with a Gaussian on the points, approxPolyDP, then Catmull-Rom -> smooth vector paths.
  4. Colours, gradients, shadows, uniform outline from the paint system (chapter 4); reference lines are not used raw except for thin elongated strokes (hair strands, folds).
  5. Face = a new vector face placed at the eye/mouth positions found by detecting dark blobs inside the face; 3/4 eye perspective (far eye narrower), small profile eye at the front. Back view without a face.
- Traps already found (automatic checks):
  - The reference's floor shadow is read as body -> drop low-saturation pixels near the sole.
  - Lighter hair strands read as trousers (similar colour) -> similar colour above the shirt hem = hair; components touching the hair mass = hair.
  - Cheek shading read as hair -> face = the largest head skin, closed, then holes filled (hole fill).
  - Nose/mouth lines make dents on the face profile edge -> large closing limited to the non-hair foreground; if the dent remains (3/4), replace the face profile edge with the vector face curve (forehead, nose, lips, chin) over the trace mask.
  - Specks/small holes -> fill holes < 60 px, drop components < 40 px (reference scale) for clothing and shoes.
  - White shoes become blobs -> redraw the sole, toe, laces detail inside the traced shoe region.
  - Rough traced hands -> replace with Shape Builder hands (chapter 3) at the traced position and size.
  - The hue of the dark part of one garment reads as another garment -> hue ranges per body height.
  - Shirt details (hem band, cuff rib, seams, folds, accessory lines) = a measured spec on the H grid; automatic line detection (black-hat) proved to catch outline edges, not folds.
  - Traced face too rough -> measured vector face (chapter 0).
  - Hair: strands = isolines parallel to the hair edge (several depths, dashed, dark + light); drop small loose hair pieces.
  - Flat style: traced contours look jagged without an outline -> smooth the contour points more strongly (hair about 2x the body).
- Poses that are not in the reference (e.g. outstretched arms): build from the traced front view + arm tubes, same style.

## 13. Rig from traced artwork (DeformSpace)

- All paths are built through `Space`; `DeformSpace` skins EVERY point (LBS) to the posed bones, weights by part (layer hint) + rest position. Traced contours are cached in H, so posing only moves anchors. The rest pose must be identical to the sheet.
- Garments split for the rig: body + sleeves (measured seams, 2 px overlap) + hidden parts (chapter 0). When the arm goes up/bends: tube, rigid pieces, joint circle, pose-space shoulder.
- Details and textures are drawn per part with that part's weights.
- Change style (e.g. outline -> flat) through a separate paint module; rig and geometry untouched, all motion clips take on the new style.
