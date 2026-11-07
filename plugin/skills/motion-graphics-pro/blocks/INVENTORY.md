# Inventory: HyperFrames registry -> Motion Graphics Pro blocks

Built by `blocks/tools/inventory.py`. Every HyperFrames 0.9.5 registry item (block, component, example) maps to one of our blocks. The blocks are written from scratch; only the effect idea and the item name come from HyperFrames (see NOTICE). One block often covers several items through props (`mode`, `style`, `direction`, `shape`, variants).

## Summary

- Blocks: **260** in 21 categories (3d 5, accents 22, backgrounds 21, camera 10, characters 3, code 7, data 12, gallery 9, hands 12, labels 6, logos 6, maps 6, packs 1, paper 5, social 6, subtitles 16, text 26, textures 9, titles 8, transitions 36, ui 34)
- HyperFrames items covered: **456/456** (100.0%)
- Items used by the 104 motion packs: **273/273** covered (100.0%)
- Extra blocks without a HyperFrames counterpart: 11

Add: `mgp add <block> --into index.html`. HyperFrames item names and old Indonesian ids are accepted too (`mgp add push-in`, `mgp add transisi/robek`).

## Per HyperFrames item

| HyperFrames item | Kind | Used by packs | Our block | Notes |
|---|---|---:|---|---|
| `agent-cursor` | component | 1 | `ui/cursor` |  |
| `ai-answer-rank` | block | 1 | `ui/ai-chat` |  |
| `ai-chat-reveal` | block | 1 | `ui/ai-chat` |  |
| `animated-bar-chart` | component | 3 | `data/bar-chart` |  |
| `app-showcase` | block | 1 | `ui/device-3d` |  |
| `apple-money-count` | block | 1 | `data/counter` |  |
| `arc-motion-path` | component | 4 | `accents/path-arc` |  |
| `ascii-render-pass` | component | 1 | `textures/ascii` |  |
| `ascii-trail-reveal` | component |  | `transitions/ascii-trail` |  |
| `aurora` | block |  | `backgrounds/aurora` |  |
| `aurora-drift` | component |  | `backgrounds/aurora` |  |
| `avatar-cloud` | component | 1 | `accents/hub` |  |
| `avatar-group-hover` | component |  | `ui/micro` |  |
| `badge-pop` | component | 7 | `accents/spring-pop` |  |
| `bar-chart-race` | block | 1 | `data/race` |  |
| `beat-accent` | component | 4 | `accents/beat-burst` |  |
| `beat-freeze-cut` | block | 5 | `transitions/beat-freeze` |  |
| `beat-pulse-background` | component | 3 | `backgrounds/beat-pulse` |  |
| `beat-timeline` | component | 2 | `data/beat-timeline` |  |
| `before-after-wipe` | component | 2 | `transitions/before-after` |  |
| `blob` | block | 1 | `backgrounds/orb` |  |
| `blue-sweater-intro-video` | block |  | `social/promo-card` |  |
| `blur-in` | component |  | `text/blur-focus` |  |
| `blur-out-up` | component |  | `text/blur-focus` |  |
| `bottom-up-letters` | component | 3 | `text/rising-words` |  |
| `browser-device-stage` | component | 1 | `ui/device-stage` |  |
| `camcorder-hud` | block | 1 | `labels/hud-camera` |  |
| `camera-dolly-zoom` | block | 2 | `camera/dolly-zoom` |  |
| `camera-rig-depth-stack` | component | 2 | `camera/depth-stack` |  |
| `camera-scan-gate` | component |  | `ui/qr-scan` |  |
| `camera-shake` | component | 5 | `camera/shake` |  |
| `canopy-part-title` | block |  | `titles/leaf-curtain` |  |
| `caption-blend-difference` | component |  | `subtitles/difference` |  |
| `caption-camera-follow` | component | 1 | `subtitles/camera-follow` |  |
| `caption-clip-wipe` | component |  | `subtitles/wipe` |  |
| `caption-editorial-emphasis` | component | 1 | `subtitles/editorial` |  |
| `caption-emoji-pop` | component | 2 | `subtitles/emoji` |  |
| `caption-glitch-rgb` | component | 1 | `subtitles/glitch` |  |
| `caption-gradient-fill` | component |  | `subtitles/gradient` |  |
| `caption-highlight` | component | 7 | `subtitles/highlight` |  |
| `caption-kinetic-slam` | component | 2 | `subtitles/stomp` |  |
| `caption-matrix-decode` | component |  | `subtitles/decode` |  |
| `caption-neon-accent` | component | 1 | `subtitles/neon` |  |
| `caption-neon-glow` | component | 1 | `subtitles/neon` |  |
| `caption-parallax-layers` | component |  | `subtitles/parallax` |  |
| `caption-particle-burst` | component |  | `subtitles/particles` |  |
| `caption-pill-karaoke` | component | 3 | `subtitles/karaoke-pill` |  |
| `caption-texture` | component | 1 | `subtitles/texture` |  |
| `caption-weight-shift` | component | 2 | `subtitles/heavy` |  |
| `card-resize` | component | 1 | `ui/panel-open` |  |
| `caret-swap` | component |  | `text/typewriter` |  |
| `carousel-circle-1` | block | 1 | `gallery/circle-carousel` |  |
| `carousel-circle-2` | block |  | `gallery/circle-carousel` |  |
| `carousel-circle-3` | block |  | `gallery/circle-carousel` |  |
| `carousel-circle-4` | block |  | `gallery/circle-carousel` |  |
| `carousel-circle-5` | block |  | `gallery/circle-carousel` |  |
| `carousel-orbit-1` | block |  | `gallery/orbit-carousel` |  |
| `carousel-orbit-2` | block |  | `gallery/orbit-carousel` |  |
| `carousel-orbit-3` | block |  | `gallery/orbit-carousel` |  |
| `carousel-orbit-4` | block |  | `gallery/orbit-carousel` |  |
| `carousel-orbit-5` | block |  | `gallery/orbit-carousel` |  |
| `carousel-path-1` | block | 1 | `gallery/path-carousel` |  |
| `carousel-path-2` | block |  | `gallery/path-carousel` |  |
| `carousel-path-3` | block |  | `gallery/path-carousel` |  |
| `carousel-path-4` | block |  | `gallery/path-carousel` |  |
| `carousel-path-5` | block |  | `gallery/path-carousel` |  |
| `carousel-text-circle-1` | block |  | `gallery/circle-text-carousel` |  |
| `carousel-text-circle-2` | block |  | `gallery/circle-text-carousel` |  |
| `carousel-text-circle-3` | block |  | `gallery/circle-text-carousel` |  |
| `carousel-text-circle-4` | block |  | `gallery/circle-text-carousel` |  |
| `carousel-text-circle-5` | block |  | `gallery/circle-text-carousel` |  |
| `carousel-vision-1` | block |  | `gallery/vision-carousel` |  |
| `carousel-vision-2` | block |  | `gallery/vision-carousel` |  |
| `carousel-vision-3` | block |  | `gallery/vision-carousel` |  |
| `carousel-vision-4` | block |  | `gallery/vision-carousel` |  |
| `carousel-vision-5` | block |  | `gallery/vision-carousel` |  |
| `char-slam-explode` | component | 3 | `text/letter-shatter` |  |
| `chart-story` | component | 1 | `data/bar-chart` |  |
| `chat-message` | component |  | `ui/chat` |  |
| `chat-thread` | component | 1 | `ui/chat` |  |
| `chatgpt-exchange` | block |  | `ui/ai-chat` |  |
| `chromatic-aberration-wipe` | component | 1 | `transitions/aberration` |  |
| `chromatic-radial-split` | block |  | `transitions/aberration` |  |
| `chrome-orb` | block |  | `backgrounds/orb` |  |
| `cinemagraph` | block | 1 | `gallery/cinemagraph` |  |
| `cinematic-zoom` | block | 1 | `transitions/scale` |  |
| `claude-exchange` | block |  | `ui/ai-chat` |  |
| `code-3d-extrude` | block |  | `code/code-3d` |  |
| `code-diff` | block | 1 | `code/diff` |  |
| `code-highlight` | block |  | `code/line-highlight` |  |
| `code-morph` | block |  | `code/code-morph` |  |
| `code-particle-assemble` | block |  | `code/code-dissolve` |  |
| `code-scroll` | block |  | `code/line-highlight` |  |
| `code-shader-dissolve` | block |  | `code/code-dissolve` |  |
| `code-slice-hero` | block |  | `titles/flip-tiles` |  |
| `code-snippet-apple-terminal-pro` | block |  | `code/terminal` |  |
| `code-snippet-dark-2026` | block | 1 | `code/code-typing` |  |
| `code-snippet-dark-modern` | block |  | `code/code-typing` |  |
| `code-terminal-run` | component | 1 | `code/terminal` |  |
| `code-typing` | block | 1 | `code/code-typing` |  |
| `color-wheel` | block |  | `backgrounds/gradient-mesh` |  |
| `colorama-wipe` | component | 2 | `text/colorama` |  |
| `comparison-split` | component | 3 | `transitions/before-after` |  |
| `confetti` | component | 2 | `accents/confetti` |  |
| `conic-progress-ring` | component | 3 | `data/ring` |  |
| `constellation-hub` | component | 1 | `accents/hub` |  |
| `cosmic-orb` | block | 2 | `backgrounds/galaxy` |  |
| `count-up` | component | 7 | `data/counter` |  |
| `cross-warp-morph` | block |  | `transitions/distortion` |  |
| `cta-close` | component | 1 | `titles/cta` |  |
| `cta-lockup` | component | 1 | `titles/cta` |  |
| `cuboid-carousel` | block |  | `gallery/cuboid-carousel` |  |
| `cursor-annotate` | component | 1 | `hands/annotation-pen` |  |
| `cursor-context-menu` | component |  | `ui/cursor-text` |  |
| `cursor-drag-drop` | component |  | `ui/cursor-drag` |  |
| `cursor-glyph-trail` | component |  | `ui/cursor-trail` |  |
| `cursor-marquee-select` | component |  | `ui/cursor-drag` |  |
| `cursor-text-select` | component |  | `ui/cursor-text` |  |
| `cursor-zoom-follow` | component | 2 | `camera/zoom-ui` |  |
| `curtain-reveal` | component | 1 | `transitions/curtain` |  |
| `cut-the-curve` | component |  | `transitions/whip-pan` |  |
| `dart-cursor` | component |  | `ui/cursor` |  |
| `data-chart` | block | 1 | `data/bar-chart` |  |
| `decision-tree` | example |  | `hands/flowchart` |  |
| `decline-chart` | component | 2 | `data/line-chart` |  |
| `device-frame-stage` | component | 1 | `ui/device-stage` |  |
| `directional-wipe` | component | 2 | `transitions/slide` |  |
| `domain-warp-dissolve` | block |  | `transitions/distortion` |  |
| `drift-hold` | component | 14 | `camera/float` |  |
| `dynamic-grid` | component | 1 | `backgrounds/dynamic-grid` |  |
| `echo-smear` | component |  | `accents/echo` |  |
| `echo-trail` | component | 1 | `accents/echo` |  |
| `editorial-flash-overlay` | block |  | `transitions/flash` |  |
| `exploded-stack` | block | 1 | `3d/exploded-stack` |  |
| `extended-keyframe` | component |  | `accents/long-arrival` |  |
| `extruded-logo` | block | 1 | `logos/extrusion` |  |
| `facet-morph` | component |  | `accents/facet-morph` |  |
| `fade-through` | component | 8 | `transitions/fade` |  |
| `falling-lines` | block |  | `backgrounds/falling-lines` |  |
| `filmed-screen` | component | 2 | `camera/filmed-screen` |  |
| `flash-through-white` | block | 2 | `transitions/flash` |  |
| `flowchart` | block | 2 | `hands/flowchart` |  |
| `flowchart-vertical` | block |  | `hands/flowchart` |  |
| `flowing-gradient` | block |  | `backgrounds/gradient-mesh` |  |
| `focus-blur-resolve` | component | 2 | `text/blur-focus` |  |
| `focus-rack` | component | 2 | `camera/rack-focus` |  |
| `focus-swap` | component | 1 | `camera/rack-focus` |  |
| `fractal-noise` | block |  | `backgrounds/noise` |  |
| `freeze-frame-dressing` | block | 1 | `paper/freeze-dress` |  |
| `frost` | block |  | `backgrounds/orb` |  |
| `frost-sequence-camera-orbit` | block |  | `titles/glass-shards` |  |
| `gabor-noise` | block |  | `backgrounds/noise` |  |
| `gallery-tunnel` | block |  | `backgrounds/tunnel` |  |
| `gesture-tap` | component | 1 | `ui/touch` |  |
| `glass-hero` | block | 1 | `3d/glass-hero` |  |
| `glass-shard-title` | block | 1 | `titles/glass-shards` |  |
| `glitch` | block | 2 | `transitions/glitch` |  |
| `gloss-sweep` | component | 3 | `accents/light-sweep` |  |
| `godrays` | block | 4 | `textures/rays` |  |
| `goo` | block | 1 | `backgrounds/orb` |  |
| `gooey-split` | block |  | `3d/gooey` |  |
| `grade-split-reveal` | component | 2 | `transitions/before-after` |  |
| `grain-field` | component |  | `textures/grain` |  |
| `grain-overlay` | component | 13 | `textures/grain` |  |
| `gravitational-lens` | block | 1 | `transitions/distortion` |  |
| `grid-card-assemble` | component | 1 | `accents/staggered-grid` |  |
| `grid-pixelate-wipe` | component |  | `transitions/grid` |  |
| `halftone-dissolve` | component | 2 | `transitions/halftone` |  |
| `halftone-field` | block | 3 | `textures/halftone` |  |
| `headline-slam` | component | 5 | `text/stomp` |  |
| `heatmap` | block | 1 | `backgrounds/orb` |  |
| `heygen-avatar-promo-card` | block |  | `social/promo-card` |  |
| `hologram` | block |  | `backgrounds/orb` |  |
| `holographic` | block |  | `backgrounds/orb` |  |
| `hw-arrow` | component | 3 | `hands/arrow` |  |
| `hw-boil` | component | 2 | `textures/stop-motion` |  |
| `hw-box-label` | component | 3 | `hands/label-box` |  |
| `hw-callout-circle` | component | 3 | `hands/circle` |  |
| `hw-frame` | block | 2 | `hands/frame` |  |
| `hw-path-text` | block | 2 | `hands/text-path` |  |
| `hw-pipeline` | block | 1 | `hands/flowchart` |  |
| `hw-scribble-transition` | block | 2 | `transitions/scribble` |  |
| `hw-text-cloud` | block | 2 | `hands/bubble` |  |
| `hw-title` | block | 1 | `hands/handwritten-title` |  |
| `hw-underline` | component | 3 | `hands/mark` |  |
| `hw-write-title` | block | 3 | `hands/handwritten-title` |  |
| `icon-morph-beat` | component | 2 | `accents/icon-morph` |  |
| `icon-swap` | component |  | `accents/icon-morph` |  |
| `ink-bleed-reveal` | component | 3 | `transitions/ink` |  |
| `inline-highlight` | component | 1 | `text/highlighter` |  |
| `input-feedback` | component |  | `ui/form` |  |
| `instagram-follow` | block | 1 | `social/follow` |  |
| `ios26-liquid-glass` | block | 2 | `ui/device-3d` |  |
| `iris-reveal` | component | 2 | `transitions/iris` |  |
| `keyframe-scrub-stack` | component |  | `accents/staggered-grid` |  |
| `kinetic-center-build` | component | 2 | `text/center-build` |  |
| `kinetic-type` | example |  | `text/kinetic` | wraps lib module `MGP.kineticType` |
| `kinetic-type-swap` | component | 1 | `text/word-swap` |  |
| `lens-flare` | block |  | `textures/flare` |  |
| `light-edge` | block |  | `backgrounds/orb` |  |
| `light-leak` | block | 2 | `transitions/light-leak` |  |
| `light-sweep-pass` | component | 6 | `accents/light-sweep` |  |
| `line-by-line-slide` | component | 5 | `text/line-slide` |  |
| `line-swap` | component | 2 | `text/line-swap` |  |
| `liquid-glass-notification` | block | 1 | `ui/liquid-glass` |  |
| `liquid-glass-widgets` | block | 1 | `ui/liquid-glass` |  |
| `liquid-metal` | block |  | `backgrounds/orb` |  |
| `locked-nucleus-orbit` | component |  | `accents/core-orbit` |  |
| `logo-brand-close` | component | 2 | `logos/outro` |  |
| `logo-outro` | block | 1 | `logos/outro` |  |
| `logo-sting` | component | 1 | `logos/sting` |  |
| `logo-wall` | component | 1 | `logos/wall` |  |
| `lottie-character-walk` | block |  | `characters/walk` | wraps lib module `MGP.characterStyles`, `MGP.figure3d` |
| `lower-third-bild` | block | 1 | `labels/bold` |  |
| `lt-accent-underline` | block | 1 | `labels/cardless` |  |
| `lt-bold-block` | block | 3 | `labels/bold` |  |
| `lt-clean-bar` | block | 2 | `labels/clean` |  |
| `lt-color-block` | block | 2 | `labels/bold` |  |
| `lt-dark-card` | block | 2 | `labels/clean` |  |
| `lt-kicker-name` | block | 1 | `labels/cardless` |  |
| `lt-mask-reveal` | block | 1 | `labels/cardless` |  |
| `lt-neon-border` | block | 1 | `labels/neon` |  |
| `lt-side-rule` | block | 2 | `labels/cardless` |  |
| `lt-soft-pill` | block | 1 | `labels/clean` |  |
| `lt-stack-bars` | block | 1 | `labels/bold` |  |
| `macos-notification` | block |  | `ui/notification` |  |
| `macos-tahoe-liquid-glass` | block |  | `ui/device-3d` |  |
| `magnetic-cursor` | component |  | `ui/cursor` |  |
| `marble` | block |  | `backgrounds/marble` |  |
| `marker-checklist-card` | component | 3 | `hands/checklist-card` |  |
| `marker-highlight` | component | 5 | `text/highlighter` |  |
| `match-cut` | component | 4 | `transitions/match-cut` |  |
| `matrix-decode` | component | 1 | `text/letter-scramble` |  |
| `menu-morph` | component |  | `ui/micro` |  |
| `mesh-gradient` | block | 1 | `backgrounds/gradient-mesh` |  |
| `mesh-gradient-bg` | component |  | `backgrounds/gradient-mesh` |  |
| `message-thread-reveal` | block |  | `ui/chat` |  |
| `micro-transitions` | component | 1 | `ui/micro` |  |
| `mk-background` | block |  | `backgrounds/gradient-mesh` |  |
| `mk-callout-highlight` | block | 2 | `text/highlighter` |  |
| `mk-clone-wall-transition` | block |  | `transitions/word-wall` |  |
| `mk-emphasis-type` | component | 1 | `text/background-words` |  |
| `mk-line-graph` | block | 1 | `data/line-chart` |  |
| `mk-placeholder-grid` | block |  | `gallery/media-grid` |  |
| `mk-progress-stat` | block | 2 | `data/progress-stat` |  |
| `mk-specs-list` | block | 2 | `data/spec-list` |  |
| `mk-usage-arc` | component |  | `data/ring` |  |
| `modal-morph` | component |  | `ui/panel-open` |  |
| `morph-swap` | component | 1 | `transitions/morph-swap` |  |
| `morph-text` | component |  | `text/word-swap` |  |
| `motion-blur` | component |  | `accents/echo` |  |
| `multi-device-splay` | component | 1 | `ui/device-fan` |  |
| `multiplayer-cursors` | component |  | `ui/multi-cursor` |  |
| `native-notification-pop` | component | 1 | `ui/notification` |  |
| `nebula` | block | 1 | `backgrounds/orb` |  |
| `news-ticker` | block | 1 | `labels/news-ticker` |  |
| `north-korea-locked-down` | block |  | `maps/zoom-marker` |  |
| `notes-reveal` | block | 1 | `ui/note` |  |
| `notes-typing` | component |  | `ui/note` |  |
| `notification-cascade` | block |  | `ui/notification-stack` |  |
| `notification-pileup` | component | 1 | `ui/notification-stack` |  |
| `notification-stack` | component | 1 | `ui/notification` |  |
| `number-pop-in` | component | 4 | `data/counter` |  |
| `number-wheel` | component | 3 | `data/number-wheel` |  |
| `nyc-paris-flight` | block | 2 | `maps/route` | wraps lib module `MGP.routeMap` |
| `nyt-graph` | example |  | `data/bar-chart` |  |
| `obsidian` | block |  | `backgrounds/orb` |  |
| `offset-path-traveler` | component | 2 | `accents/path-arc` |  |
| `onboarding-stepper-flow` | component | 2 | `ui/form` |  |
| `orbit-card` | block |  | `gallery/orbit-carousel` |  |
| `ordered-dither-pass` | component | 4 | `textures/dither` |  |
| `organic-light-leak-overlay` | block | 1 | `transitions/light-leak` |  |
| `oscilloscope-trace` | block |  | `data/oscilloscope` |  |
| `outline-draw` | component | 4 | `accents/line-stroke` |  |
| `oversized-cursor` | component |  | `ui/cursor` |  |
| `overwhelm-surround` | component |  | `accents/chip-ring` |  |
| `page-slide` | component | 5 | `transitions/slide` |  |
| `pan-stations` | component | 8 | `camera/station` |  |
| `panel-reveal` | component | 5 | `ui/panel-open` |  |
| `paper-collage-reveal` | component | 3 | `transitions/paper-collage` |  |
| `parallax-device-dive` | component | 1 | `ui/device-dive` |  |
| `parallax-unzoom` | component | 2 | `transitions/parallax-zoom` |  |
| `parallax-zoom` | component | 2 | `transitions/parallax-zoom` |  |
| `particle-image-reveal` | component |  | `accents/light-particles` | wraps lib module `MGP.particlesFlight` |
| `particle-text-dissolve` | component | 1 | `text/particles` |  |
| `pendulum-swing` | component |  | `accents/swing` |  |
| `per-word-crossfade` | component | 2 | `text/rising-words` |  |
| `per-word-rise` | component | 5 | `text/rising-words` |  |
| `perspective-marquee` | component | 1 | `text/marquee-3d` |  |
| `physical-exit` | component |  | `accents/physics-exit` |  |
| `plasma` | block |  | `backgrounds/plasma` |  |
| `plastic` | block | 1 | `backgrounds/orb` |  |
| `play-mode` | example |  | `textures/stop-motion` |  |
| `press-ripple` | component | 1 | `ui/cursor` |  |
| `prism` | block |  | `backgrounds/pattern` |  |
| `product-promo` | example |  | `social/promo-card` |  |
| `product-turntable` | block | 1 | `3d/product-spin` |  |
| `pull-back-reveal` | component | 3 | `camera/push` |  |
| `pull-to-refresh` | component |  | `ui/pull-refresh` |  |
| `push-in` | component | 12 | `camera/push` |  |
| `rack-focus` | block | 2 | `camera/rack-focus` |  |
| `radial-surround` | component | 1 | `accents/chip-ring` |  |
| `reddit-post` | block | 1 | `social/post-card` |  |
| `rgb-glitch-text` | component | 1 | `text/glitch-rgb` |  |
| `ridged-burn` | block |  | `transitions/burn` |  |
| `ripple-waves` | block |  | `transitions/distortion` |  |
| `ripples` | block |  | `backgrounds/ripple` |  |
| `rubber-band-bumper` | component | 3 | `transitions/rubber` |  |
| `scan-band` | component |  | `text/glitch-rgb` |  |
| `scramble-reveal` | component | 1 | `text/letter-scramble` |  |
| `screen-flow-carousel` | component | 1 | `ui/screen-carousel` |  |
| `scroll-camera-story` | component | 2 | `camera/story-scroll` |  |
| `scroll-feed` | component | 1 | `ui/feed-scroll` |  |
| `sdf-iris` | block | 1 | `transitions/iris` |  |
| `segmentation-flood` | component |  | `ui/segmentation` |  |
| `separator` | component |  | `data/separator` |  |
| `settings-toggle-flow` | component | 1 | `ui/toggle` |  |
| `share-sheet-carousel` | block | 1 | `ui/spring-sheet` |  |
| `shared-axis-y` | component | 1 | `text/line-swap` |  |
| `shared-axis-z` | component |  | `text/line-swap` |  |
| `sheet-spring-up` | component | 1 | `ui/spring-sheet` |  |
| `shimmer-sweep` | component |  | `text/shine` |  |
| `shutter-slam` | component |  | `text/stomp` |  |
| `signup-flow` | component | 1 | `ui/form` |  |
| `sine-wave` | block |  | `backgrounds/strands` |  |
| `skeleton-reveal` | component |  | `ui/micro` |  |
| `slack-notification-ad` | block |  | `ui/notification-stack` |  |
| `slit-scan-reveal` | component | 1 | `transitions/slit-scan` |  |
| `slot-machine-roll` | component | 2 | `text/slot-roll` |  |
| `snow` | block |  | `backgrounds/snow` |  |
| `social-proof-card` | component | 1 | `social/testimonial` |  |
| `soft-blob-touch` | component |  | `ui/touch-blob` |  |
| `soft-blur-in` | component | 3 | `text/blur-focus` |  |
| `spain-map` | block | 1 | `maps/region-grid` |  |
| `spiral` | block |  | `backgrounds/pattern` |  |
| `spiral-galaxy` | block |  | `backgrounds/galaxy` |  |
| `split-flap-board` | block | 1 | `text/split-flap` |  |
| `split-tilt-cards` | component | 1 | `ui/tilted-card` |  |
| `spotify-card` | block |  | `social/now-playing` |  |
| `spotlight-card` | component | 1 | `ui/tilted-card` |  |
| `spring-pop` | component | 5 | `accents/spring-pop` |  |
| `spring-stack-shuffle` | component | 1 | `gallery/shuffle-stack` |  |
| `stagger-cascade` | component | 1 | `accents/staggered-grid` |  |
| `stagger-lattice` | component | 2 | `accents/staggered-grid` |  |
| `staggered-fade-up` | component | 3 | `text/rising-words` |  |
| `star-rating-fill` | component | 2 | `data/star-rating` |  |
| `starfield` | block | 1 | `backgrounds/stars` |  |
| `state-chip-rail` | component | 1 | `ui/tab` |  |
| `sticky-mock-swap` | component |  | `ui/screen-carousel` |  |
| `stitched-text-draw` | component | 2 | `text/stitch` |  |
| `stop-motion-cadence` | component | 4 | `textures/stop-motion` |  |
| `store-badge-lockup` | component | 1 | `titles/cta` |  |
| `strands` | block |  | `backgrounds/strands` |  |
| `streaming-text` | component | 2 | `text/typewriter` |  |
| `strikethrough-replace` | component | 1 | `text/strike-replace` |  |
| `stripes` | block |  | `backgrounds/pattern` |  |
| `success-check` | component | 4 | `accents/checkmark` |  |
| `sun-burst` | block |  | `textures/rays` |  |
| `svg-line-draw-loader` | component | 1 | `accents/line-stroke` |  |
| `svg-mask-reveal` | component | 4 | `text/svg-mask` |  |
| `svg-stroke-trace` | component | 2 | `accents/line-stroke` |  |
| `swipe-rail` | component | 1 | `ui/slider-rail` |  |
| `swirl` | block |  | `backgrounds/gradient-mesh` |  |
| `swirl-vortex` | block | 1 | `transitions/distortion` |  |
| `swiss-grid` | example |  | `titles/calm` |  |
| `tabs-slide-indicator` | component | 1 | `ui/tab` |  |
| `telemetry-hud` | component |  | `ui/hud-telemetry` |  |
| `terminal-simulator` | component | 1 | `code/terminal` |  |
| `testimonial-card` | component | 2 | `social/testimonial` |  |
| `testimonial-proof-card` | component | 1 | `social/testimonial` |  |
| `text-match-cut` | component |  | `transitions/match-cut` |  |
| `text-shimmer` | component | 1 | `text/shine` |  |
| `text-stagger` | component |  | `text/rising-words` |  |
| `text-state-swap` | component |  | `text/line-swap` |  |
| `texture-mask-text` | component | 2 | `text/texture-mask` |  |
| `thermal-distortion` | block |  | `transitions/distortion` |  |
| `thin-film` | block |  | `backgrounds/orb` |  |
| `thread-message-stack` | block |  | `ui/chat` |  |
| `three-orbiting-cards` | component | 1 | `3d/orbit-cards` |  |
| `ticker-takeover` | component | 1 | `text/slot-roll` |  |
| `tiktok-follow` | block | 2 | `social/follow` |  |
| `tilt-card` | component | 1 | `ui/tilted-card` |  |
| `titlecard-calm` | component | 1 | `titles/calm` |  |
| `titlecard-lockup` | component | 4 | `titles/calm` |  |
| `toggle-flip` | component | 1 | `ui/toggle` |  |
| `top-down-letters` | component | 1 | `text/rising-words` |  |
| `torn-paper-rip` | component | 3 | `transitions/tear` |  |
| `touch-indicator` | component | 1 | `ui/touch` |  |
| `tracing-beam` | component | 1 | `accents/passing-rays` |  |
| `tracking-in` | component | 4 | `text/tight-tracking` |  |
| `transitions-3d` | block | 2 | `transitions/flip-3d` |  |
| `transitions-blur` | block | 2 | `transitions/blur` |  |
| `transitions-cover` | block | 1 | `transitions/slide` |  |
| `transitions-destruction` | block |  | `transitions/shatter` |  |
| `transitions-dissolve` | block |  | `transitions/fade` |  |
| `transitions-distortion` | block |  | `transitions/distortion` |  |
| `transitions-grid` | block | 4 | `transitions/grid` |  |
| `transitions-light` | block |  | `transitions/flash` |  |
| `transitions-mechanical` | block |  | `transitions/shutter` |  |
| `transitions-other` | block |  | `transitions/glitch` |  |
| `transitions-push` | block | 5 | `transitions/slide` |  |
| `transitions-radial` | block |  | `transitions/radial` |  |
| `transitions-scale` | block | 3 | `transitions/scale` |  |
| `trust-strip` | component | 2 | `logos/wall` |  |
| `type-match-cut` | component |  | `transitions/match-cut` |  |
| `typed-prompt` | component | 1 | `text/typewriter` |  |
| `typewriter` | component | 4 | `text/typewriter` |  |
| `typing-indicator` | component |  | `ui/chat` |  |
| `ui-3d-reveal` | block | 1 | `ui/ui-3d` |  |
| `ui-focus-zoom` | component | 4 | `camera/zoom-ui` |  |
| `us-map` | block |  | `maps/region-grid` |  |
| `us-map-bubble` | block | 1 | `maps/bubbles` |  |
| `us-map-flow` | block | 1 | `maps/flow-arcs` |  |
| `us-map-hex` | block | 1 | `maps/region-grid` |  |
| `variable-axis-type` | component | 1 | `text/variable` |  |
| `variable-font-flex` | component | 1 | `text/variable` |  |
| `vector-editor-rig` | component |  | `ui/vector-editor` |  |
| `velocity-throw-snap` | component |  | `ui/slider-rail` |  |
| `vfx-anamorphic-flare` | block | 1 | `textures/flare` |  |
| `vfx-iphone-device` | block | 1 | `ui/device-3d` |  |
| `vfx-liquid-background` | block |  | `backgrounds/liquid` |  |
| `vfx-liquid-glass` | block | 1 | `ui/liquid-glass` |  |
| `vfx-magnetic` | block |  | `transitions/distortion` |  |
| `vfx-portal` | block |  | `transitions/portal` |  |
| `vfx-shatter` | block |  | `transitions/shatter` |  |
| `vfx-text-cursor` | block |  | `titles/light-cursor` |  |
| `vignelli` | example |  | `titles/calm` |  |
| `vignette` | component | 4 | `textures/vignette` |  |
| `voronoi` | block |  | `backgrounds/cells` |  |
| `vox-annotate` | component | 4 | `accents/vox-annotation` |  |
| `vpn-youtube-spot` | block |  | `ui/app-install` |  |
| `warm-grain` | example |  | `textures/grain` |  |
| `water` | block |  | `backgrounds/orb` |  |
| `waveform` | block | 1 | `backgrounds/equalizer` |  |
| `week-in-merges` | block |  | `data/race` |  |
| `weight-wave` | block | 1 | `text/variable` |  |
| `whip-pan` | block | 2 | `transitions/whip-pan` |  |
| `whip-pan-cut` | component | 4 | `transitions/whip-pan` |  |
| `whiteboard-ink` | component | 2 | `hands/whiteboard` |  |
| `wireframe-portal-title` | block | 1 | `titles/wire-portal` |  |
| `wordmark-tiles` | component | 2 | `logos/wordmark-tiles` |  |
| `world-map` | block | 2 | `maps/globe` |  |
| `worley-noise` | block |  | `backgrounds/cells` |  |
| `x-follow-card` | component |  | `social/follow` |  |
| `x-post` | block | 2 | `social/post-card` |  |
| `yt-camera-move` | component | 2 | `camera/push` |  |
| `yt-circle-pointer` | component | 3 | `accents/circle-pointer` |  |
| `yt-comment-card` | block | 2 | `social/comment` |  |
| `yt-feather-highlight` | component | 1 | `accents/feather-highlight` |  |
| `yt-lcd-background` | block |  | `backgrounds/lcd-board` |  |
| `yt-logo-intro` | block | 1 | `logos/board-intro` |  |
| `yt-lower-third` | block | 1 | `social/follow` |  |
| `yt-prism-title` | block |  | `titles/prism` |  |
| `yt-screen-warp` | component |  | `camera/filmed-screen` |  |
| `yt-vertical-fill` | block |  | `gallery/media-grid` |  |
| `zoom-through-transition` | component | 3 | `transitions/zoom-through` |  |

## Per block

| Block | Name | Old id | HyperFrames items covered |
|---|---|---|---|
| `3d/exploded-stack` | Exploded Stack | `3d/tumpukan-meledak` | `exploded-stack` |
| `3d/glass-hero` | Glass Hero | `3d/kaca-hero` | `glass-hero` |
| `3d/gooey` | Gooey | `3d/gooey` | `gooey-split` |
| `3d/orbit-cards` | Orbit Cards | `3d/kartu-orbit` | `three-orbiting-cards` |
| `3d/product-spin` | Product Spin | `3d/putar-produk` | `product-turntable` |
| `accents/beat-burst` | Beat Burst | `aksen/ledak-ketukan` | `beat-accent` |
| `accents/checkmark` | Checkmark | `aksen/centang` | `success-check` |
| `accents/chip-ring` | Chip Ring | `aksen/lingkar-chip` | `radial-surround`, `overwhelm-surround` |
| `accents/circle-pointer` | Circle Pointer | `aksen/penunjuk-lingkar` | `yt-circle-pointer` |
| `accents/confetti` | Confetti | `aksen/konfeti` | `confetti` |
| `accents/core-orbit` | Core Orbit | `aksen/orbit-inti` | `locked-nucleus-orbit` |
| `accents/echo` | Echo | `aksen/gema` | `echo-trail`, `echo-smear`, `motion-blur` |
| `accents/facet-morph` | Facet Morph | `aksen/facet-morph` | `facet-morph` |
| `accents/feather-highlight` | Feather Highlight | `aksen/sorotan-bulu` | `yt-feather-highlight` |
| `accents/hub` | Hub | `aksen/hub` | `constellation-hub`, `avatar-cloud` |
| `accents/icon-morph` | Icon Morph | `aksen/morph-ikon` | `icon-morph-beat`, `icon-swap` |
| `accents/light-particles` | Light Particles | `aksen/partikel-cahaya` | `particle-image-reveal` · wraps lib module `MGP.particlesFlight` |
| `accents/light-sweep` | Light Sweep | `aksen/sapuan-cahaya` | `light-sweep-pass`, `gloss-sweep` |
| `accents/line-stroke` | Line Stroke | `aksen/gores-garis` | `outline-draw`, `svg-stroke-trace`, `svg-line-draw-loader` |
| `accents/long-arrival` | Long Arrival | `aksen/tiba-panjang` | `extended-keyframe` |
| `accents/passing-rays` | Passing Rays | `aksen/sinar-lintas` | `tracing-beam` |
| `accents/path-arc` | Path Arc | `aksen/busur-jalur` | `arc-motion-path`, `offset-path-traveler` |
| `accents/physics-exit` | Physics Exit | `aksen/keluar-fisik` | `physical-exit` |
| `accents/spring-pop` | Spring Pop | `aksen/pegas-pop` | `spring-pop`, `badge-pop` |
| `accents/staggered-grid` | Staggered Grid | `aksen/kisi-bertahap` | `stagger-cascade`, `stagger-lattice`, `grid-card-assemble`, `keyframe-scrub-stack` |
| `accents/swing` | Swing | `aksen/ayun` | `pendulum-swing` |
| `accents/vox-annotation` | Vox Annotation | `aksen/anotasi-vox` | `vox-annotate` |
| `backgrounds/aurora` | Aurora | `latar/aurora` | `aurora`, `aurora-drift` |
| `backgrounds/beat-pulse` | Beat Pulse | `latar/detak-ketukan` | `beat-pulse-background` |
| `backgrounds/cells` | Cells | `latar/sel` | `voronoi`, `worley-noise` |
| `backgrounds/constellation` | Constellation | `latar/rasi` | (extra) · wraps lib module `MGP.constellationLines` |
| `backgrounds/dynamic-grid` | Dynamic Grid | `latar/kisi-dinamis` | `dynamic-grid` |
| `backgrounds/equalizer` | Equalizer | `latar/equalizer` | `waveform` |
| `backgrounds/falling-lines` | Falling Lines | `latar/garis-jatuh` | `falling-lines` |
| `backgrounds/galaxy` | Galaxy | `latar/galaksi` | `spiral-galaxy`, `cosmic-orb` |
| `backgrounds/gradient-mesh` | Gradient Mesh | `latar/gradien-mesh` | `mesh-gradient`, `mesh-gradient-bg`, `mk-background`, `flowing-gradient`, `color-wheel`, `swirl` |
| `backgrounds/lcd-board` | LCD Board | `latar/papan-lcd` | `yt-lcd-background` |
| `backgrounds/liquid` | Liquid | `latar/cairan` | `vfx-liquid-background` |
| `backgrounds/marble` | Marble | `latar/marmer` | `marble` |
| `backgrounds/noise` | Noise | `latar/noise` | `fractal-noise`, `gabor-noise` |
| `backgrounds/orb` | Orb | `latar/orb` | `chrome-orb`, `plastic`, `obsidian`, `holographic`, `thin-film`, `frost`, `heatmap`, `hologram`, `nebula`, `goo`, `liquid-metal`, `water`, `light-edge`, `blob` |
| `backgrounds/pattern` | Pattern | `latar/pola` | `stripes`, `spiral`, `prism` |
| `backgrounds/plasma` | Plasma | `latar/plasma` | `plasma` |
| `backgrounds/ripple` | Ripple | `latar/riak` | `ripples` |
| `backgrounds/snow` | Snow | `latar/salju` | `snow` |
| `backgrounds/stars` | Stars | `latar/bintang` | `starfield` |
| `backgrounds/strands` | Strands | `latar/untai` | `strands`, `sine-wave` |
| `backgrounds/tunnel` | Tunnel | `latar/terowongan` | `gallery-tunnel` |
| `camera/depth-stack` | Depth Stack | `kamera/tumpuk-kedalaman` | `camera-rig-depth-stack` |
| `camera/dolly-zoom` | Dolly Zoom | `kamera/dolly-zoom` | `camera-dolly-zoom` |
| `camera/filmed-screen` | Filmed Screen | `kamera/layar-terfilmkan` | `filmed-screen`, `yt-screen-warp` |
| `camera/float` | Float | `kamera/melayang` | `drift-hold` |
| `camera/push` | Push | `kamera/dorong` | `push-in`, `yt-camera-move`, `pull-back-reveal` |
| `camera/rack-focus` | Rack Focus | `kamera/fokus-rak` | `focus-rack`, `rack-focus`, `focus-swap` |
| `camera/shake` | Shake | `kamera/goyang` | `camera-shake` |
| `camera/station` | Station | `kamera/stasiun` | `pan-stations` |
| `camera/story-scroll` | Story Scroll | `kamera/gulir-cerita` | `scroll-camera-story` |
| `camera/zoom-ui` | Zoom UI | `kamera/zoom-ui` | `ui-focus-zoom`, `cursor-zoom-follow` |
| `characters/object-face` | Object Face | `tokoh/benda-berwajah` | (extra) · wraps lib module `MGP.chibiObject` |
| `characters/presenter` | Presenter | `tokoh/presenter` | (extra) · wraps lib module `MGP.lipsync` |
| `characters/walk` | Walk | `tokoh/jalan` | `lottie-character-walk` · wraps lib module `MGP.characterStyles`, `MGP.figure3d` |
| `code/code-3d` | Code 3D | `kode/kode-3d` | `code-3d-extrude` |
| `code/code-dissolve` | Code Dissolve | `kode/kode-larut` | `code-shader-dissolve`, `code-particle-assemble` |
| `code/code-morph` | Code Morph | `kode/morph-kode` | `code-morph` |
| `code/code-typing` | Code Typing | `kode/ketik-kode` | `code-typing`, `code-snippet-dark-2026`, `code-snippet-dark-modern` |
| `code/diff` | Diff | `kode/diff` | `code-diff` |
| `code/line-highlight` | Line Highlight | `kode/sorot-baris` | `code-highlight`, `code-scroll` |
| `code/terminal` | Terminal | `kode/terminal` | `terminal-simulator`, `code-terminal-run`, `code-snippet-apple-terminal-pro` |
| `data/bar-chart` | Bar Chart | `data/batang` | `animated-bar-chart`, `chart-story`, `data-chart`, `nyt-graph` |
| `data/beat-timeline` | Beat Timeline | `data/timeline-ketukan` | `beat-timeline` |
| `data/counter` | Counter | `data/hitung` | `count-up`, `apple-money-count`, `number-pop-in` |
| `data/line-chart` | Line Chart | `data/garis` | `mk-line-graph`, `decline-chart` |
| `data/number-wheel` | Number Wheel | `data/roda-angka` | `number-wheel` |
| `data/oscilloscope` | Oscilloscope | `data/osiloskop` | `oscilloscope-trace` |
| `data/progress-stat` | Progress Stat | `data/stat-progres` | `mk-progress-stat` |
| `data/race` | Race | `data/balapan` | `bar-chart-race`, `week-in-merges` |
| `data/ring` | Ring | `data/cincin` | `conic-progress-ring`, `mk-usage-arc` |
| `data/separator` | Separator | `data/pemisah` | `separator` |
| `data/spec-list` | Spec List | `data/daftar-spek` | `mk-specs-list` |
| `data/star-rating` | Star Rating | `data/bintang` | `star-rating-fill` |
| `gallery/cinemagraph` | Cinemagraph | `galeri/sinemagraf` | `cinemagraph` |
| `gallery/circle-carousel` | Circle Carousel | `galeri/korsel-lingkar` | `carousel-circle-1`, `carousel-circle-2`, `carousel-circle-3`, `carousel-circle-4`, `carousel-circle-5` |
| `gallery/circle-text-carousel` | Circle Text Carousel | `galeri/korsel-teks-lingkar` | `carousel-text-circle-1`, `carousel-text-circle-2`, `carousel-text-circle-3`, `carousel-text-circle-4`, `carousel-text-circle-5` |
| `gallery/cuboid-carousel` | Cuboid Carousel | `galeri/korsel-kuboid` | `cuboid-carousel` |
| `gallery/media-grid` | Media Grid | `galeri/kisi-media` | `mk-placeholder-grid`, `yt-vertical-fill` |
| `gallery/orbit-carousel` | Orbit Carousel | `galeri/korsel-orbit` | `carousel-orbit-1`, `carousel-orbit-2`, `carousel-orbit-3`, `carousel-orbit-4`, `carousel-orbit-5`, `orbit-card` |
| `gallery/path-carousel` | Path Carousel | `galeri/korsel-jalur` | `carousel-path-1`, `carousel-path-2`, `carousel-path-3`, `carousel-path-4`, `carousel-path-5` |
| `gallery/shuffle-stack` | Shuffle Stack | `galeri/tumpuk-kocok` | `spring-stack-shuffle` |
| `gallery/vision-carousel` | Vision Carousel | `galeri/korsel-visi` | `carousel-vision-1`, `carousel-vision-2`, `carousel-vision-3`, `carousel-vision-4`, `carousel-vision-5` |
| `hands/annotation-pen` | Annotation Pen | `tangan/pena-anotasi` | `cursor-annotate` |
| `hands/arrow` | Arrow | `tangan/panah` | `hw-arrow` |
| `hands/bubble` | Bubble | `tangan/gelembung` | `hw-text-cloud` |
| `hands/checklist-card` | Checklist Card | `tangan/kartu-checklist` | `marker-checklist-card` |
| `hands/circle` | Circle | `tangan/lingkar` | `hw-callout-circle` |
| `hands/flowchart` | Flowchart | `tangan/alur` | `hw-pipeline`, `flowchart`, `flowchart-vertical`, `decision-tree` |
| `hands/frame` | Frame | `tangan/bingkai` | `hw-frame` |
| `hands/handwritten-title` | Handwritten Title | `tangan/tulis-judul` | `hw-write-title`, `hw-title` |
| `hands/label-box` | Label Box | `tangan/kotak-label` | `hw-box-label` |
| `hands/mark` | Mark | `tangan/tanda` | `hw-underline` |
| `hands/text-path` | Text Path | `tangan/jalur-teks` | `hw-path-text` |
| `hands/whiteboard` | Whiteboard | `tangan/papan-tulis` | `whiteboard-ink` |
| `labels/bold` | Bold | `label/tebal` | `lt-bold-block`, `lt-color-block`, `lt-stack-bars`, `lower-third-bild` |
| `labels/cardless` | Cardless | `label/tanpa-kartu` | `lt-accent-underline`, `lt-kicker-name`, `lt-side-rule`, `lt-mask-reveal` |
| `labels/clean` | Clean | `label/bersih` | `lt-clean-bar`, `lt-soft-pill`, `lt-dark-card` |
| `labels/hud-camera` | HUD Camera | `label/hud-kamera` | `camcorder-hud` |
| `labels/neon` | Neon | `label/neon` | `lt-neon-border` |
| `labels/news-ticker` | News Ticker | `label/ticker-berita` | `news-ticker` |
| `logos/board-intro` | Board Intro | `logo/intro-papan` | `yt-logo-intro` |
| `logos/extrusion` | Extrusion | `logo/ekstrusi` | `extruded-logo` |
| `logos/outro` | Outro | `logo/penutup` | `logo-brand-close`, `logo-outro` |
| `logos/sting` | Sting | `logo/sting` | `logo-sting` |
| `logos/wall` | Wall | `logo/dinding` | `logo-wall`, `trust-strip` |
| `logos/wordmark-tiles` | Wordmark Tiles | `logo/ubin-wordmark` | `wordmark-tiles` |
| `maps/bubbles` | Bubbles | `peta/gelembung` | `us-map-bubble` |
| `maps/flow-arcs` | Flow Arcs | `peta/busur-alir` | `us-map-flow` |
| `maps/globe` | Globe | `peta/globe` | `world-map` |
| `maps/region-grid` | Region Grid | `peta/kisi-wilayah` | `us-map-hex`, `us-map`, `spain-map` |
| `maps/route` | Route | `peta/rute` | `nyc-paris-flight` · wraps lib module `MGP.routeMap` |
| `maps/zoom-marker` | Zoom Marker | `peta/zoom-tandai` | `north-korea-locked-down` |
| `packs/scene` | Scene | `paket/adegan` | (extra) · wraps lib module `MGP.paket` |
| `paper/freeze-dress` | Freeze Dress | `kertas/dandan-beku` | `freeze-frame-dressing` |
| `paper/kresling` | Kresling | `kertas/kresling` | (extra) · wraps lib module `MGP.lipatPola` |
| `paper/miura` | Miura | `kertas/miura` | (extra) · wraps lib module `MGP.lipatPola` |
| `paper/origami` | Origami | `kertas/origami` | (extra) · wraps lib module `MGP.origamiFold` |
| `paper/yoshimura` | Yoshimura | `kertas/yoshimura` | (extra) · wraps lib module `MGP.lipatPola` |
| `social/comment` | Comment | `sosial/komentar` | `yt-comment-card` |
| `social/follow` | Follow | `sosial/ikuti` | `instagram-follow`, `tiktok-follow`, `x-follow-card`, `yt-lower-third` |
| `social/now-playing` | Now Playing | `sosial/sedang-diputar` | `spotify-card` |
| `social/post-card` | Post Card | `sosial/kartu-post` | `x-post`, `reddit-post` |
| `social/promo-card` | Promo Card | `sosial/kartu-promo` | `heygen-avatar-promo-card`, `blue-sweater-intro-video`, `product-promo` |
| `social/testimonial` | Testimonial | `sosial/testimoni` | `testimonial-card`, `testimonial-proof-card`, `social-proof-card` |
| `subtitles/camera-follow` | Camera Follow | `subtitle/kamera-ikut` | `caption-camera-follow` |
| `subtitles/decode` | Decode | `subtitle/dekode` | `caption-matrix-decode` |
| `subtitles/difference` | Difference | `subtitle/beda` | `caption-blend-difference` |
| `subtitles/editorial` | Editorial | `subtitle/editorial` | `caption-editorial-emphasis` |
| `subtitles/emoji` | Emoji | `subtitle/emoji` | `caption-emoji-pop` |
| `subtitles/glitch` | Glitch | `subtitle/glitch` | `caption-glitch-rgb` |
| `subtitles/gradient` | Gradient | `subtitle/gradien` | `caption-gradient-fill` |
| `subtitles/heavy` | Heavy | `subtitle/berat` | `caption-weight-shift` |
| `subtitles/highlight` | Highlight | `subtitle/sorot` | `caption-highlight` |
| `subtitles/karaoke-pill` | Karaoke Pill | `subtitle/pil-karaoke` | `caption-pill-karaoke` |
| `subtitles/neon` | Neon | `subtitle/neon` | `caption-neon-glow`, `caption-neon-accent` |
| `subtitles/parallax` | Parallax | `subtitle/paralaks` | `caption-parallax-layers` |
| `subtitles/particles` | Particles | `subtitle/partikel` | `caption-particle-burst` |
| `subtitles/stomp` | Stomp | `subtitle/hentak` | `caption-kinetic-slam` |
| `subtitles/texture` | Texture | `subtitle/tekstur` | `caption-texture` |
| `subtitles/wipe` | Wipe | `subtitle/usap` | `caption-clip-wipe` |
| `text/background-words` | Background Words | `teks/kata-latar` | `mk-emphasis-type` |
| `text/blur-focus` | Blur Focus | `teks/blur-fokus` | `blur-in`, `soft-blur-in`, `focus-blur-resolve`, `blur-out-up` |
| `text/center-build` | Center Build | `teks/bangun-tengah` | `kinetic-center-build` |
| `text/colorama` | Colorama | `teks/colorama` | `colorama-wipe` |
| `text/glitch-rgb` | Glitch RGB | `teks/glitch-rgb` | `rgb-glitch-text`, `scan-band` |
| `text/highlighter` | Highlighter | `teks/stabilo` | `marker-highlight`, `inline-highlight`, `mk-callout-highlight` |
| `text/kinetic` | Kinetic | `teks/kinetik` | `kinetic-type` · wraps lib module `MGP.kineticType` |
| `text/letter-scramble` | Letter Scramble | `teks/acak-huruf` | `scramble-reveal`, `matrix-decode` |
| `text/letter-shatter` | Letter Shatter | `teks/huruf-pecah` | `char-slam-explode` |
| `text/line-slide` | Line Slide | `teks/baris-geser` | `line-by-line-slide` |
| `text/line-swap` | Line Swap | `teks/tukar-baris` | `line-swap`, `shared-axis-y`, `shared-axis-z`, `text-state-swap` |
| `text/marquee-3d` | Marquee 3D | `teks/marquee-3d` | `perspective-marquee` |
| `text/particles` | Particles | `teks/partikel` | `particle-text-dissolve` |
| `text/rising-words` | Rising Words | `teks/kata-naik` | `staggered-fade-up`, `per-word-rise`, `per-word-crossfade`, `bottom-up-letters`, `top-down-letters`, `text-stagger` |
| `text/shine` | Shine | `teks/kilau` | `text-shimmer`, `shimmer-sweep` |
| `text/slot-roll` | Slot Roll | `teks/gulung-slot` | `slot-machine-roll`, `ticker-takeover` |
| `text/split-flap` | Split Flap | `teks/split-flap` | `split-flap-board` |
| `text/stitch` | Stitch | `teks/jahit` | `stitched-text-draw` |
| `text/stomp` | Stomp | `teks/hentak` | `headline-slam`, `shutter-slam` |
| `text/strike-replace` | Strike Replace | `teks/coret-ganti` | `strikethrough-replace` |
| `text/svg-mask` | SVG Mask | `teks/topeng-svg` | `svg-mask-reveal` |
| `text/texture-mask` | Texture Mask | `teks/topeng-tekstur` | `texture-mask-text` |
| `text/tight-tracking` | Tight Tracking | `teks/spasi-rapat` | `tracking-in` |
| `text/typewriter` | Typewriter | `teks/mesin-ketik` | `typewriter`, `typed-prompt`, `streaming-text`, `caret-swap` |
| `text/variable` | Variable | `teks/variabel` | `variable-axis-type`, `variable-font-flex`, `weight-wave` |
| `text/word-swap` | Word Swap | `teks/tukar-kata` | `kinetic-type-swap`, `morph-text` |
| `textures/ascii` | Ascii | `tekstur/ascii` | `ascii-render-pass` |
| `textures/crt` | CRT | `tekstur/crt` | (extra) |
| `textures/dither` | Dither | `tekstur/dither` | `ordered-dither-pass` |
| `textures/flare` | Flare | `tekstur/flare` | `vfx-anamorphic-flare`, `lens-flare` |
| `textures/grain` | Grain | `tekstur/grain` | `grain-overlay`, `grain-field`, `warm-grain` |
| `textures/halftone` | Halftone | `tekstur/halftone` | `halftone-field` |
| `textures/rays` | Rays | `tekstur/sinar` | `godrays`, `sun-burst` |
| `textures/stop-motion` | Stop Motion | `tekstur/stop-motion` | `stop-motion-cadence`, `hw-boil`, `play-mode` |
| `textures/vignette` | Vignette | `tekstur/vignette` | `vignette` |
| `titles/calm` | Calm | `judul/tenang` | `titlecard-calm`, `titlecard-lockup`, `swiss-grid`, `vignelli` |
| `titles/cta` | CTA | `judul/cta` | `cta-close`, `cta-lockup`, `store-badge-lockup` |
| `titles/flip-tiles` | Flip Tiles | `judul/ubin-balik` | `code-slice-hero` |
| `titles/glass-shards` | Glass Shards | `judul/pecahan-kaca` | `glass-shard-title`, `frost-sequence-camera-orbit` |
| `titles/leaf-curtain` | Leaf Curtain | `judul/tirai-daun` | `canopy-part-title` |
| `titles/light-cursor` | Light Cursor | `judul/kursor-cahaya` | `vfx-text-cursor` |
| `titles/prism` | Prism | `judul/prisma` | `yt-prism-title` |
| `titles/wire-portal` | Wire Portal | `judul/portal-kawat` | `wireframe-portal-title` |
| `transitions/aberration` | Aberration | `transisi/aberasi` | `chromatic-aberration-wipe`, `chromatic-radial-split` |
| `transitions/ascii-trail` | Ascii Trail | `transisi/ascii-jejak` | `ascii-trail-reveal` |
| `transitions/beat-freeze` | Beat Freeze | `transisi/beku-ketukan` | `beat-freeze-cut` |
| `transitions/before-after` | Before After | `transisi/sebelum-sesudah` | `before-after-wipe`, `comparison-split`, `grade-split-reveal` |
| `transitions/blur` | Blur | `transisi/blur` | `transitions-blur` |
| `transitions/burn` | Burn | `transisi/bakar` | `ridged-burn` |
| `transitions/causal` | Causal | `transisi/bersebab` | (extra) |
| `transitions/curtain` | Curtain | `transisi/tirai` | `curtain-reveal` |
| `transitions/distortion` | Distortion | `transisi/distorsi` | `transitions-distortion`, `ripple-waves`, `swirl-vortex`, `gravitational-lens`, `thermal-distortion`, `domain-warp-dissolve`, `cross-warp-morph`, `vfx-magnetic` |
| `transitions/fade` | Fade | `transisi/pudar` | `fade-through`, `transitions-dissolve` |
| `transitions/flash` | Flash | `transisi/kilat` | `flash-through-white`, `editorial-flash-overlay`, `transitions-light` |
| `transitions/flip-3d` | Flip 3D | `transisi/balik-3d` | `transitions-3d` |
| `transitions/glitch` | Glitch | `transisi/glitch` | `glitch`, `transitions-other` |
| `transitions/grid` | Grid | `transisi/grid` | `grid-pixelate-wipe`, `transitions-grid` |
| `transitions/halftone` | Halftone | `transisi/halftone` | `halftone-dissolve` |
| `transitions/ink` | Ink | `transisi/tinta` | `ink-bleed-reveal` |
| `transitions/iris` | Iris | `transisi/iris` | `iris-reveal`, `sdf-iris` |
| `transitions/light-leak` | Light Leak | `transisi/kebocoran-cahaya` | `light-leak`, `organic-light-leak-overlay` |
| `transitions/match-cut` | Match Cut | `transisi/match-cut` | `match-cut`, `text-match-cut`, `type-match-cut` |
| `transitions/morph-swap` | Morph Swap | `transisi/morph-tukar` | `morph-swap` |
| `transitions/paper-collage` | Paper Collage | `transisi/kolase-kertas` | `paper-collage-reveal` |
| `transitions/paper-fold` | Paper Fold | `transisi/lipat-kertas` | (extra) · wraps lib module `MGP.paperFoldTransition` |
| `transitions/parallax-zoom` | Parallax Zoom | `transisi/paralaks-zoom` | `parallax-zoom`, `parallax-unzoom` |
| `transitions/portal` | Portal | `transisi/portal` | `vfx-portal` |
| `transitions/radial` | Radial | `transisi/radial` | `transitions-radial` |
| `transitions/rubber` | Rubber | `transisi/karet` | `rubber-band-bumper` |
| `transitions/scale` | Scale | `transisi/skala` | `transitions-scale`, `cinematic-zoom` |
| `transitions/scribble` | Scribble | `transisi/coretan` | `hw-scribble-transition` |
| `transitions/shatter` | Shatter | `transisi/hancur` | `transitions-destruction`, `vfx-shatter` |
| `transitions/shutter` | Shutter | `transisi/rana` | `transitions-mechanical` |
| `transitions/slide` | Slide | `transisi/geser` | `transitions-push`, `transitions-cover`, `directional-wipe`, `page-slide` |
| `transitions/slit-scan` | Slit Scan | `transisi/slit-scan` | `slit-scan-reveal` |
| `transitions/tear` | Tear | `transisi/robek` | `torn-paper-rip` |
| `transitions/whip-pan` | Whip Pan | `transisi/whip-pan` | `whip-pan`, `whip-pan-cut`, `cut-the-curve` |
| `transitions/word-wall` | Word Wall | `transisi/dinding-kata` | `mk-clone-wall-transition` |
| `transitions/zoom-through` | Zoom Through | `transisi/zoom-tembus` | `zoom-through-transition` |
| `ui/ai-chat` | AI Chat | `ui/obrolan-ai` | `ai-chat-reveal`, `chatgpt-exchange`, `claude-exchange`, `ai-answer-rank` |
| `ui/app-install` | App Install | `ui/pasang-aplikasi` | `vpn-youtube-spot` |
| `ui/chat` | Chat | `ui/obrolan` | `chat-thread`, `chat-message`, `typing-indicator`, `message-thread-reveal`, `thread-message-stack` |
| `ui/cursor` | Cursor | `ui/kursor` | `agent-cursor`, `oversized-cursor`, `dart-cursor`, `magnetic-cursor`, `press-ripple` |
| `ui/cursor-drag` | Cursor Drag | `ui/kursor-seret` | `cursor-drag-drop`, `cursor-marquee-select` |
| `ui/cursor-text` | Cursor Text | `ui/kursor-teks` | `cursor-text-select`, `cursor-context-menu` |
| `ui/cursor-trail` | Cursor Trail | `ui/jejak-kursor` | `cursor-glyph-trail` |
| `ui/device-3d` | Device 3D | `ui/perangkat-3d` | `vfx-iphone-device`, `app-showcase`, `ios26-liquid-glass`, `macos-tahoe-liquid-glass` |
| `ui/device-dive` | Device Dive | `ui/selam-perangkat` | `parallax-device-dive` |
| `ui/device-fan` | Device Fan | `ui/perangkat-kipas` | `multi-device-splay` |
| `ui/device-stage` | Device Stage | `ui/panggung-perangkat` | `browser-device-stage`, `device-frame-stage` |
| `ui/feed-scroll` | Feed Scroll | `ui/feed-gulir` | `scroll-feed` |
| `ui/form` | Form | `ui/formulir` | `signup-flow`, `onboarding-stepper-flow`, `input-feedback` |
| `ui/hud-telemetry` | HUD Telemetry | `ui/hud-telemetri` | `telemetry-hud` |
| `ui/liquid-glass` | Liquid Glass | `ui/kaca-cair` | `liquid-glass-widgets`, `liquid-glass-notification`, `vfx-liquid-glass` |
| `ui/micro` | Micro | `ui/mikro` | `micro-transitions`, `menu-morph`, `avatar-group-hover`, `skeleton-reveal` |
| `ui/multi-cursor` | Multi Cursor | `ui/kursor-banyak` | `multiplayer-cursors` |
| `ui/note` | Note | `ui/catatan` | `notes-reveal`, `notes-typing` |
| `ui/notification` | Notification | `ui/notifikasi` | `native-notification-pop`, `macos-notification`, `notification-stack` |
| `ui/notification-stack` | Notification Stack | `ui/tumpukan-notif` | `notification-pileup`, `notification-cascade`, `slack-notification-ad` |
| `ui/panel-open` | Panel Open | `ui/panel-buka` | `panel-reveal`, `card-resize`, `modal-morph` |
| `ui/pull-refresh` | Pull Refresh | `ui/tarik-segar` | `pull-to-refresh` |
| `ui/qr-scan` | QR Scan | `ui/pindai-qr` | `camera-scan-gate` |
| `ui/screen-carousel` | Screen Carousel | `ui/korsel-layar` | `screen-flow-carousel`, `sticky-mock-swap` |
| `ui/segmentation` | Segmentation | `ui/segmentasi` | `segmentation-flood` |
| `ui/slider-rail` | Slider Rail | `ui/geser-rel` | `swipe-rail`, `velocity-throw-snap` |
| `ui/spring-sheet` | Spring Sheet | `ui/lembar-pegas` | `sheet-spring-up`, `share-sheet-carousel` |
| `ui/tab` | Tab | `ui/tab` | `tabs-slide-indicator`, `state-chip-rail` |
| `ui/tilted-card` | Tilted Card | `ui/kartu-miring` | `tilt-card`, `split-tilt-cards`, `spotlight-card` |
| `ui/toggle` | Toggle | `ui/toggle` | `toggle-flip`, `settings-toggle-flow` |
| `ui/touch` | Touch | `ui/sentuh` | `touch-indicator`, `gesture-tap` |
| `ui/touch-blob` | Touch Blob | `ui/blob-sentuh` | `soft-blob-touch` |
| `ui/ui-3d` | UI 3D | `ui/ui-3d` | `ui-3d-reveal` |
| `ui/vector-editor` | Vector Editor | `ui/editor-vektor` | `vector-editor-rig` |
