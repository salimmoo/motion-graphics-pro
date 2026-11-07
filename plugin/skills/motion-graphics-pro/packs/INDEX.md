# Motion pack library (104 packs, 11 categories)

Data v2.1 (05-11-2026), blocks from our own block registry (`blocks/`, Motion Graphics Pro 1.0 blocks). Used by the motion-graphics-pro skill, chapter 17.2. Browser with previews: open `motion-packs.html` in a browser. Raw data: `packs.json`. ★ = featured pick of the category. Since v2.2 every pack can also be drawn straight from its id with `MGP.packs.create(target, id, options)` / `MGP.packs.render(id, ctx, t, options)` (motion-graphics skill, `lib/pack-scenes/`) and then rendered with `mgp` (`render/`). The **Add** line adds that pack's blocks to the composition with `mgp add <id ...> --into index.html` (folder `blocks/`, catalog: `mgp catalog --search <word>`).

## Categories

| No | Id | Category | Definition | Featured |
|---|---|---|---|---|
| 1 | EXP | Explainer | A concept/product/service explained in 30 s-2 min with icons, diagrams, kinetic text. | EXP-02: The most versatile: the system flow looks 3D without 3D cost and reads instantly for B2B clients. |
| 2 | DOK | Documentary / video essay | Long research narration: archives, photos, maps, clippings, Ken Burns camera. | DOK-03: The most sought-after video-essay style: maps, routes and callouts make research feel like an investigation. |
| 3 | NAR | Narrative / storytelling | A story with a plot (beginning-conflict-end) in illustrative animation. | NAR-02: Layer depth gives a film feel with simple 2D assets; fits almost any story. |
| 4 | ADS | Ads / brand promo | Product/event/brand promo of 6-60 s, logo reveal, CTA. | ADS-03: Looks expensive in the first 3 seconds; liquid-glass shine is on the rise in tech ads. |
| 5 | TLK | Talking head + overlay | Footage of a person talking (creator, testimonial, podcast, interview) + captions, lower third, zoom, B-roll. | TLK-02: Glowing per-word captions raise retention in talking shorts and stay clear without sound. |
| 6 | SHO | Vertical social short | 9:16 for TikTok/Reels/Shorts: 1-3 s hook, bold captions, watchable without sound. | SHO-01: The hook in the first 3 seconds decides whether people stop scrolling; used in every niche. |
| 7 | KIN | Kinetic typography / lyrics | Text as the main animation: quotes, lyrics, manifestos. | KIN-01: Lyrics that land exactly on the beat are the most-watched moving-text format. |
| 8 | DAT | Data / infographic / maps | Moving numbers, charts, maps, timelines. | DAT-01: Bars overtaking each other keep viewers curious until the last second. |
| 9 | DEM | Product demo / UI | Demonstration of an app/digital product: mock UI, cursor, screen, features. | DEM-02: A tilted floating screen instantly feels like a world-class product launch. |
| 10 | EDU | Education / tutorial | Step-by-step lessons, courses, how-tos, microlearning. | EDU-02: Visual notes make viewers summarize along with the video; the material sticks better. |
| 11 | TRN | New trends: pixel & origami | Two digital-craft styles on the rise: retro pixel art and folded paper origami. Stands out in the feed right away. | TRN-03: Origami crane: real paper folds that captivate and are rarely used, so it is easy to remember. |

## All packs

| Id | Name | Category | Aspect | Duration | Palette | Font |
|---|---|---|---|---|---|---|
| [EXP-01](#exp-01) | Corporate Flat Vector | Explainer | 16:9 | 60–90 s | #EAF2FB #10233F #2D6CDF #22B8A6 #FFFFFF | Poppins + Inter |
| [EXP-02](#exp-02) ★ | System Isometric | Explainer | 16:9 | 60–90 s | #F4F1FA #1E1B3A #6C5CE7 #00B894 #FFFFFF | Space Grotesk + Inter |
| [EXP-03](#exp-03) | Whiteboard | Explainer | 16:9 | 60–90 s | #FBFBF8 #1A1A1A #E63946 #1D6FD8 #FFFFFF | Kalam + Patrick Hand |
| [EXP-04](#exp-04) | Colour Marker Doodle | Explainer | 16:9 | 60–90 s | #FFF8EC #222222 #FF6B35 #2EC4B6 #FFFFFF | Permanent Marker + Nunito |
| [EXP-05](#exp-05) | 2.5D Parallax Layers | Explainer | 16:9 | 60–90 s | #0F2A47 #FFFFFF #FFB703 #8ECAE6 #13355A | Montserrat + Inter |
| [EXP-06](#exp-06) | Minimal Icon Infographic | Explainer | 16:9 | 60–90 s | #FFFFFF #111827 #F59E0B #10B981 #F3F4F6 | Inter + Inter |
| [EXP-07](#exp-07) | Sound-off Explainer | Explainer | 16:9 | 30–60 s | #111111 #FFFFFF #FFD60A #FF4D6D #1C1C1C | Archivo Black + Inter |
| [EXP-08](#exp-08) | Flat Paper Cutout | Explainer | 16:9 | 60–90 s | #E9D9BF #2B2118 #C8553D #2A7F62 #FFF8EC | Bebas Neue + Lora |
| [EXP-09](#exp-09) | Glass Concept (Glassmorphism) | Explainer | 16:9 | 60–90 s | #1B1F3B #FFFFFF #7AD7F0 #B388FF #2A2F55 | Syne + Inter |
| [EXP-10](#exp-10) | Loud Minimal | Explainer | 16:9 | 15–30 s | #FF5A1F #111111 #FFFFFF #1E3A8A #FFE8DC | Anton + Inter |
| [DOK-01](#dok-01) | Living Clippings (Paper Archive Collage) | Documentary / video essay | 9:16 | 8–15 min (chapters 1–2 min) | #F3ECDF #1B1915 #8B2E29 #1F3157 #FFFCF5 | Poppins + Lora |
| [DOK-02](#dok-02) | Ken Burns Archive | Documentary / video essay | 16:9 | 8–15 min (chapters 1–2 min) | #14110E #F2E8D5 #C9A227 #7A6A53 #2A241D | Playfair Display + Lora |
| [DOK-03](#dok-03) ★ | Journalistic Map | Documentary / video essay | 16:9 | 8–15 min (chapters 1–2 min) | #0E1A2B #F5F1E8 #FF5A4E #5BC0EB #1A2B42 | Oswald + Inter |
| [DOK-04](#dok-04) | Investigation Board | Documentary / video essay | 16:9 | 8–15 min (chapters 1–2 min) | #B08158 #1E1A16 #C1121F #F4E9D8 #FFF9EE | Special Elite + IBM Plex Mono |
| [DOK-05](#dok-05) | Old Newspaper Editorial | Documentary / video essay | 16:9 | 8–15 min (chapters 1–2 min) | #EFE8DA #1A1A1A #9E2A2B #5F5A50 #F8F4EA | DM Serif Display + Libre Baskerville |
| [DOK-06](#dok-06) | History Timeline | Documentary / video essay | 16:9 | 8–15 min (chapters 1–2 min) | #F6F0E4 #202020 #B5651D #2F5D62 #FFFFFF | Cinzel + Lora |
| [DOK-07](#dok-07) | Cinematic Noir | Documentary / video essay | 16:9 | 8–15 min (chapters 1–2 min) | #0B0B0D #EDE6D6 #E0A458 #8C1C13 #1A1A1D | Bodoni Moda + Inter |
| [DOK-08](#dok-08) | Document & Evidence Annotation | Documentary / video essay | 16:9 | 8–15 min (chapters 1–2 min) | #F7F5F0 #161616 #FFD23F #E4572E #FFFFFF | Source Serif 4 + Inter |
| [DOK-09](#dok-09) | Faceless Business Documentary | Documentary / video essay | 16:9 | 9–12 min | #0D1B2A #FFFFFF #00C2A8 #FFB000 #1B263B | Montserrat + Inter |
| [DOK-10](#dok-10) | Monochrome Archive, Red Accent | Documentary / video essay | 16:9 | 8–15 min (chapters 1–2 min) | #F2F2F2 #0A0A0A #D62828 #6B6B6B #FFFFFF | Bebas Neue + Inter |
| [NAR-01](#nar-01) | Picture Storybook | Narrative / storytelling | 16:9 | 1–3 min | #FBF3E4 #3B2A1A #E07A5F #81B29A #F2CC8F | Fraunces + Lora |
| [NAR-02](#nar-02) ★ | Cinematic Parallax | Narrative / storytelling | 16:9 | 1–3 min | #1D1A3A #FFF4E0 #FF8C42 #6A4C93 #2E2A5A | Marcellus + Inter |
| [NAR-03](#nar-03) | Comedy Cutout | Narrative / storytelling | 16:9 | 1–3 min | #FFE66D #1A1A1A #FF6B6B #4ECDC4 #FFFFFF | Fredoka + Nunito |
| [NAR-04](#nar-04) | Paper Stop Motion | Narrative / storytelling | 16:9 | 1–3 min | #D9C3A0 #2A1E14 #B23A48 #3C6E71 #F4EBDD | Caveat Brush + Lora |
| [NAR-05](#nar-05) | Spotlight Drama | Narrative / storytelling | 16:9 | 1–3 min | #070707 #F7F1E3 #F2C14E #5C2A9D #141414 | Abril Fatface + Inter |
| [NAR-06](#nar-06) | Shadow-Puppet Silhouette | Narrative / storytelling | 16:9 | 1–3 min | #F6A64B #120B05 #C8402D #FCE3B0 #3A1F0F | Cinzel + Lora |
| [NAR-07](#nar-07) | Comic Panels | Narrative / storytelling | 16:9 | 1–3 min | #FFFDF5 #111111 #FFD23F #EE4266 #3BCEAC | Bangers + Comic Neue |
| [NAR-08](#nar-08) | Line Rotoscope | Narrative / storytelling | 16:9 | 1–3 min | #F5F5F0 #151515 #3A86FF #FF006E #FFFFFF | Space Grotesk + Inter |
| [NAR-09](#nar-09) | Honest Journal | Narrative / storytelling | 9:16 | 1–3 min | #F4EFE6 #1F1F1F #E76F51 #2A9D8F #FFFFFF | Caveat + Inter |
| [NAR-10](#nar-10) | Surreal Cosmic | Narrative / storytelling | 16:9 | 1–3 min | #05010F #EAE6FF #9D4EDD #00F5D4 #14092E | Syne + Inter |
| [ADS-01](#ads-01) | Kinetic Logo Sting | Ads / brand promo | 16:9 | 3–6 s | #0A0A0A #FFFFFF #00E0A4 #FF3D7F #161616 | Montserrat + Inter |
| [ADS-02](#ads-02) | 3D Product Spin | Ads / brand promo | 16:9 | 15–30 s (+ 6 s version) | #E9ECEF #0B0B0B #3A0CA3 #F72585 #FFFFFF | Sora + Inter |
| [ADS-03](#ads-03) ★ | Premium Liquid Glass | Ads / brand promo | 16:9 | 15–30 s (+ 6 s version) | #0E0F1A #FFFFFF #9AD0EC #F0A6CA #1C1E30 | Outfit + Inter |
| [ADS-04](#ads-04) | Loud Poster | Ads / brand promo | 16:9 | 15–30 s (+ 6 s version) | #E63946 #FFFFFF #111111 #F1FAEE #B71C2C | Bebas Neue + Inter |
| [ADS-05](#ads-05) | Event Countdown Promo | Ads / brand promo | 16:9 | 15–30 s (+ 6 s version) | #240046 #FFFFFF #FF9E00 #7B2CBF #3C096C | Bebas Neue + Montserrat |
| [ADS-06](#ads-06) | Beat-Sync Flash Sale | Ads / brand promo | 9:16 | 15–30 s (+ 6 s version) | #FFD60A #000000 #FF006E #FFFFFF #FFC300 | Anton + Inter |
| [ADS-07](#ads-07) | Testimonials & Social Proof | Ads / brand promo | 16:9 | 15–30 s (+ 6 s version) | #F7F3EE #1F2933 #2A9D8F #E9C46A #FFFFFF | Poppins + Inter |
| [ADS-08](#ads-08) | Tactile Gummy | Ads / brand promo | 9:16 | 15–30 s (+ 6 s version) | #FFE5EC #3A0CA3 #FF70A6 #70D6FF #FFD670 | Fredoka + Nunito |
| [ADS-09](#ads-09) | Emotional Brand Film | Ads / brand promo | 16:9 | 60–90 s | #1A1410 #F5EBDD #D4A373 #6B705C #2B211A | Cormorant Garamond + Inter |
| [ADS-10](#ads-10) | Creator-Native Ad (UGC) | Ads / brand promo | 9:16 | 15–30 s | #101010 #FFFFFF #FE2C55 #25F4EE #1E1E1E | Montserrat + Inter |
| [TLK-01](#tlk-01) | Clean YouTube Creator | Talking head + overlay | 16:9 | clip 30–60 s · full 5–10 min | #0F0F0F #FFFFFF #FF0033 #3EA6FF #272727 | Inter + Inter |
| [TLK-02](#tlk-02) ★ | Glowing Karaoke Captions | Talking head + overlay | 9:16 | clip 30–60 s · full 5–10 min | #0B0B0B #FFFFFF #7CFF4F #FFE600 #1A1A1A | Montserrat + Montserrat |
| [TLK-03](#tlk-03) | Split Podcast Clip | Talking head + overlay | 16:9 | clip 30–60 s · full 5–10 min | #121212 #FFFFFF #FF7A00 #8A5CF6 #1E1E1E | Space Grotesk + Inter |
| [TLK-04](#tlk-04) | Documentary Interview | Talking head + overlay | 16:9 | clip 30–60 s · full 5–10 min | #1C1A17 #F4EFE6 #B08D57 #5E6472 #2A2723 | Playfair Display + Inter |
| [TLK-05](#tlk-05) | Customer Testimonial | Talking head + overlay | 16:9 | clip 30–60 s · full 5–10 min | #F2F7F5 #14213D #2EC4B6 #FCA311 #FFFFFF | Poppins + Inter |
| [TLK-06](#tlk-06) | Newsroom | Talking head + overlay | 16:9 | clip 30–60 s · full 5–10 min | #0A1F44 #FFFFFF #E10600 #F5C400 #12305E | Oswald + Inter |
| [TLK-07](#tlk-07) | Presenter + Content Panel | Talking head + overlay | 16:9 | clip 30–60 s · full 5–10 min | #F5F7FA #1B2430 #3B82F6 #F97316 #FFFFFF | Poppins + Inter |
| [TLK-08](#tlk-08) | Reaction & Commentary | Talking head + overlay | 9:16 | clip 30–60 s · full 5–10 min | #000000 #FFFFFF #FFDD00 #FF2E63 #151515 | Anton + Inter |
| [TLK-09](#tlk-09) | Thought-Leadership Webinar | Talking head + overlay | 16:9 | 60–90 s cut from a 30–60 min session | #0B2545 #FFFFFF #13C4A3 #EEF4ED #134074 | Montserrat + Inter |
| [TLK-10](#tlk-10) | Daily Vlog | Talking head + overlay | 9:16 | clip 30–60 s · full 5–10 min | #FFFFFF #1A1A1A #FF8FAB #FFD166 #F7F7F7 | Caveat + Inter |
| [SHO-01](#sho-01) ★ | 3-Second Text Hook | Vertical social short | 9:16 | 15–30 s | #0D0D0D #FFFFFF #FFE600 #FF3B30 #1A1A1A | Anton + Inter |
| [SHO-02](#sho-02) | Faceless Quick Facts | Vertical social short | 9:16 | 15–45 s | #111827 #FFFFFF #22D3EE #F472B6 #1F2937 | Montserrat + Inter |
| [SHO-03](#sho-03) | Beat Photo Dump | Vertical social short | 9:16 | 15–45 s | #FAFAFA #111111 #FF6F59 #43AA8B #FFFFFF | DM Serif Display + Inter |
| [SHO-04](#sho-04) | Moving Carousel | Vertical social short | 4:5 | 8–12 slides | #FDF6EC #1E1E24 #FB8B24 #5F0F40 #FFFFFF | Poppins + Inter |
| [SHO-05](#sho-05) | Top-Bottom Stitch | Vertical social short | 9:16 | 15–45 s | #0F0F14 #FFFFFF #00F2EA #FF0050 #1C1C24 | Inter + Inter |
| [SHO-06](#sho-06) | Top 5 Listicle | Vertical social short | 9:16 | 15–45 s | #1A1A2E #FFFFFF #E94560 #F5B700 #16213E | Bebas Neue + Inter |
| [SHO-07](#sho-07) | Text Story Time | Vertical social short | 9:16 | 15–45 s | #2B2D42 #FFFFFF #EF233C #8D99AE #EDF2F4 | Inter + Inter |
| [SHO-08](#sho-08) | Aesthetic Color Walk | Vertical social short | 9:16 | 15–45 s | #FFF1E6 #3D2C2E #F08080 #F4978E #FBC4AB | Fraunces + Inter |
| [SHO-09](#sho-09) | Episodic Series | Vertical social short | 9:16 | 15–45 s | #0B090A #F5F3F4 #E5383B #B1A7A6 #161A1D | Oswald + Inter |
| [SHO-10](#sho-10) | Before-After Transformation | Vertical social short | 9:16 | 15–45 s | #FFFFFF #111111 #8338EC #FFBE0B #F5F5F5 | Archivo Black + Inter |
| [KIN-01](#kin-01) ★ | Word-by-Word Lyrics | Kinetic typography / lyrics | 16:9 | full song (3–4 min) | #0F0E17 #FFFFFE #FF8906 #F25F4C #1F1D2B | Montserrat + Montserrat |
| [KIN-02](#kin-02) | Cursive Handwriting | Kinetic typography / lyrics | 16:9 | 30 s – 3 min | #FFF9F2 #2D2A32 #C94277 #5E548E #FFFFFF | Caveat + Lora |
| [KIN-03](#kin-03) | Swiss Grid | Kinetic typography / lyrics | 16:9 | 30 s – 3 min | #F4F4F0 #111111 #E30613 #1F4E99 #FFFFFF | Inter + Inter |
| [KIN-04](#kin-04) | Retro Cutout | Kinetic typography / lyrics | 16:9 | 30 s – 3 min | #F2A541 #141414 #C1292E #F1E3C8 #235789 | Oswald + Lora |
| [KIN-05](#kin-05) | Night Neon | Kinetic typography / lyrics | 9:16 | 30 s – 3 min | #0A0118 #F8F7FF #FF2BD6 #00F0FF #1A0B33 | Righteous + Inter |
| [KIN-06](#kin-06) | 3D Extruded Type | Kinetic typography / lyrics | 16:9 | 30 s – 3 min | #FFB4A2 #2B2D42 #6D597A #E56B6F #FFCDB2 | Archivo Black + Inter |
| [KIN-07](#kin-07) | Digital Glitch | Kinetic typography / lyrics | 16:9 | 30 s – 3 min | #050505 #E6E6E6 #00FF9C #FF0055 #121212 | Space Mono + Space Mono |
| [KIN-08](#kin-08) | Manifesto Quote | Kinetic typography / lyrics | 16:9 | 20–45 s | #F5F0E6 #1C1C1C #B5402A #4A4E69 #FFFFFF | DM Serif Display + Inter |
| [KIN-09](#kin-09) | Breathing Variable Font | Kinetic typography / lyrics | 16:9 | 30 s – 3 min | #E9F5DB #132A13 #4F772D #90A955 #FFFFFF | Roboto Flex + Inter |
| [KIN-10](#kin-10) | Retro Halftone Poster | Kinetic typography / lyrics | 16:9 | 30 s – 3 min | #F4E1C1 #2E1F27 #E4572E #29335C #F3A712 | Alfa Slab One + Lora |
| [DAT-01](#dat-01) ★ | Bar Chart Race | Data / infographic / maps | 16:9 | 45–90 s | #101820 #F2F2F2 #FEE715 #00A6ED #1C2833 | Inter + Inter |
| [DAT-02](#dat-02) | Route & Flow Map | Data / infographic / maps | 16:9 | 45–90 s | #E8EEF2 #1B2A41 #D7263D #1B998B #FFFFFF | Space Grotesk + Inter |
| [DAT-03](#dat-03) | Chart Scrollytelling | Data / infographic / maps | 16:9 | 45–90 s | #FFFFFF #222222 #3D5A80 #EE6C4D #E0FBFC | Source Serif 4 + Inter |
| [DAT-04](#dat-04) | Big Rising Number | Data / infographic / maps | 16:9 | 10–20 s | #03045E #FFFFFF #00B4D8 #FFD60A #023E8A | Bebas Neue + Inter |
| [DAT-05](#dat-05) | Icon Pictograph | Data / infographic / maps | 16:9 | 45–90 s | #F7F3E9 #1E1E1E #C44536 #197278 #FFFFFF | Josefin Sans + Inter |
| [DAT-06](#dat-06) | Annotated Trend Line | Data / infographic / maps | 16:9 | 45–90 s | #FAFAFA #1A1A1A #E63946 #457B9D #FFFFFF | IBM Plex Sans + IBM Plex Sans |
| [DAT-07](#dat-07) | Data Q&A | Data / infographic / maps | 16:9 | 45–90 s | #14213D #FFFFFF #FCA311 #E5E5E5 #1F2E4F | Lora + Inter |
| [DAT-08](#dat-08) | Regional Heat Map | Data / infographic / maps | 16:9 | 45–90 s | #0B132B #F0F3F5 #FF6B35 #F7C59F #1C2541 | Barlow + Inter |
| [DAT-09](#dat-09) | Data Timeline | Data / infographic / maps | 16:9 | 45–90 s | #F1FAEE #1D3557 #E63946 #457B9D #FFFFFF | Poppins + Inter |
| [DAT-10](#dat-10) | Hand-drawn Infographic | Data / infographic / maps | 16:9 | 45–90 s | #FFFBF2 #2B2B2B #F25C54 #2EC4B6 #FFFFFF | Gochi Hand + Patrick Hand |
| [DEM-01](#dem-01) | Screen + Cursor Walkthrough | Product demo / UI | 16:9 | 60–120 s | #F4F6FA #0F172A #4F46E5 #22C55E #FFFFFF | Inter + Inter |
| [DEM-02](#dem-02) ★ | 3D Floating UI | Product demo / UI | 16:9 | 60–120 s | #0B1020 #FFFFFF #7C3AED #06B6D4 #151B33 | Sora + Inter |
| [DEM-03](#dem-03) | Device Mockup | Product demo / UI | 16:9 | 60–120 s | #EEF2FF #111827 #6366F1 #F59E0B #FFFFFF | Plus Jakarta Sans + Inter |
| [DEM-04](#dem-04) | One-by-One Feature Spotlight | Product demo / UI | 16:9 | 60–120 s | #FFFFFF #111111 #FF5C35 #0EA5E9 #F3F4F6 | Manrope + Inter |
| [DEM-05](#dem-05) | Developer Tool Launch | Product demo / UI | 16:9 | 60–120 s | #0D1117 #E6EDF3 #3FB950 #58A6FF #161B22 | JetBrains Mono + Inter |
| [DEM-06](#dem-06) | Vertical App Promo | Product demo / UI | 9:16 | 60–120 s | #FF7A59 #FFFFFF #2D3142 #FFD166 #FF9F80 | Poppins + Inter |
| [DEM-07](#dem-07) | AI Assistant Demo (Chat) | Product demo / UI | 16:9 | 60–120 s | #F5F7FB #1E293B #8B5CF6 #14B8A6 #FFFFFF | Inter + Inter |
| [DEM-08](#dem-08) | Minimal Launch Film | Product demo / UI | 16:9 | 60–90 s | #000000 #F5F5F7 #5B8CFF #A1A1A6 #1D1D1F | Inter + Inter |
| [DEM-09](#dem-09) | Step-by-Step Onboarding Flow | Product demo / UI | 16:9 | 60–120 s | #F0FDF4 #14532D #22C55E #FACC15 #FFFFFF | Nunito + Inter |
| [DEM-10](#dem-10) | Notifications & User Proof | Product demo / UI | 16:9 | 60–120 s | #EEF6FF #0F172A #2563EB #F43F5E #FFFFFF | Plus Jakarta Sans + Inter |
| [EDU-01](#edu-01) | Chalkboard | Education / tutorial | 16:9 | 2–6 min per lesson | #1F3A2E #F2F2E9 #F6E27F #F4A6A6 #2B4A3B | Kalam + Patrick Hand |
| [EDU-02](#edu-02) ★ | Sketchnote | Education / tutorial | 16:9 | 2–6 min per lesson | #FFFEF9 #222222 #F4A261 #2A9D8F #FFFFFF | Gochi Hand + Nunito |
| [EDU-03](#edu-03) | Step-by-Step Slides | Education / tutorial | 16:9 | 2–6 min per lesson | #FFFFFF #1F2937 #2563EB #F59E0B #F3F4F6 | Poppins + Inter |
| [EDU-04](#edu-04) | Numbered-Step Tutorial | Education / tutorial | 16:9 | 2–6 min per lesson | #F8FAFC #0F172A #0EA5E9 #F97316 #FFFFFF | Manrope + Inter |
| [EDU-05](#edu-05) | 60-90 Second Microlearning | Education / tutorial | 9:16 | 60–90 s | #FFF3B0 #1B1B1B #E09F3E #335C67 #FFFFFF | Poppins + Inter |
| [EDU-06](#edu-06) | Recap & Quiz | Education / tutorial | 16:9 | 60–120 s | #EDE7F6 #2E1A47 #7E57C2 #26A69A #FFFFFF | Nunito + Inter |
| [EDU-07](#edu-07) | Flat Science Diagram | Education / tutorial | 16:9 | 2–6 min per lesson | #1B1F3B #FFFFFF #FF9F1C #2EC4B6 #2B2F5B | Poppins + Inter |
| [EDU-08](#edu-08) | Technical Blueprint | Education / tutorial | 16:9 | 2–6 min per lesson | #0B3D91 #EAF2FF #FFD166 #9AD1FF #0A3278 | IBM Plex Mono + IBM Plex Sans |
| [EDU-09](#edu-09) | Narration + Graphics | Education / tutorial | 16:9 | 2–6 min per lesson | #FCFCFC #212529 #FF6B6B #4D96FF #F1F3F5 | Poppins + Inter |
| [EDU-10](#edu-10) | Cheerful Kids | Education / tutorial | 16:9 | 2–6 min per lesson | #FFF4D6 #2D2A32 #FF595E #1982C4 #8AC926 | Baloo 2 + Nunito |
| [TRN-01](#trn-01) | 8-bit Arcade Pixel Art | New trends: pixel & origami | 16:9 | 15–30 s | #0B0A1F #FFFFFF #FF3864 #2DE2E6 #F9C80E | Press Start 2P + Pixelify Sans |
| [TRN-02](#trn-02) | 16-bit Cozy Pixel Art | New trends: pixel & origami | 9:16 | 20–45 s | #2B2140 #FFF4E0 #F4A259 #8CB369 #F7D08A | Pixelify Sans + Inter |
| [TRN-03](#trn-03) ★ | Folding Origami Crane | New trends: pixel & origami | 16:9 | 15–60 s | #F3EDE2 #2A2622 #D1495B #EDAE49 #00798C | Shippori Mincho + Zen Maru Gothic |
| [TRN-04](#trn-04) | Fold-Unfold Origami | New trends: pixel & origami | 16:9 | 15–60 s | #1F2A44 #FFF8EE #F25F5C #FFE066 #70C1B3 | Fraunces + Inter |

## 1. Explainer (EXP)

A concept/product/service explained in 30 s-2 min with icons, diagrams, kinetic text.

### EXP-01

**Corporate Flat Vector** (Flat Vektor Korporat). Flat icons + simple diagrams, tidy and neutral for business.

- **Use:** Use for B2B product/service explainers, company onboarding. Avoid for emotional, character-driven stories.
- **Duration:** 60–90 s · **Aspect:** 16:9
- **Key motion:** icons pop with a spring bounce; sideways push transitions between points; slow camera push
- **Palette:** `#EAF2FB` `#10233F` `#2D6CDF` `#22B8A6` `#FFFFFF`
- **Font:** Poppins (titles) + Inter (body)
- **Slots:** Style / background: Flat vector: solid colors + geometric shapes; Composition: Row of icons + labels; Lettering: Poppins (titles) + Inter (body); motion: soft rise (fade-up); Subtitles: Clean at the bottom; Accent: Icon pop; Pacing: Medium: 3 shots per 10 s (±3.3 s/shot); Transition: Sideways push; Camera: Slow push-in; Audio: Light corporate music 100-110 BPM, soft pop SFX; Aspect: 16:9
- **Blocks:** `text/rising-words` (lettering), `labels/clean` (card), `subtitles/highlight` (subtitles), `accents/icon-morph` (accent), `accents/spring-pop` (accent), `transitions/slide` (transition), `camera/push` (camera)
- **Add:** `mgp add text/rising-words labels/clean subtitles/highlight accents/icon-morph accents/spring-pop transitions/slide camera/push --into index.html`
- **Why:** Flat 2D is the most common explainer style for business and among the cheapest; 68% of video marketers make explainers.

Ready-to-copy brief:

```text
Make a 60–90 second 16:9 explainer video in the "Corporate Flat Vector" style: flat icons + simple diagrams, tidy and neutral for business. Palette #EAF2FB, #10233F, #2D6CDF, #22B8A6, #FFFFFF; Poppins for titles and Inter for body text. Key motion: icons pop with a spring bounce; sideways push transitions between points; slow camera push. Medium pacing: 3 shots per 10 s (±3.3 s/shot); audio: light corporate music 100-110 BPM, soft pop SFX.
```

### EXP-02

**System Isometric** (Isometrik Sistem) ★ featured pick. 30° isometric grid: system/process flows look 3D at 2D cost.

- **Use:** Use for process flows, logistics, system architecture, supply chains. Avoid for personal/confessional content.
- **Duration:** 60–90 s · **Aspect:** 16:9
- **Key motion:** isometric blocks grow with a bounce; data packets travel along the connecting paths; labels light up in turn
- **Palette:** `#F4F1FA` `#1E1B3A` `#6C5CE7` `#00B894` `#FFFFFF`
- **Font:** Space Grotesk (titles) + Inter (body)
- **Slots:** Style / background: 30° isometric grid + cube objects; Composition: Isometric diagram; Lettering: Space Grotesk (titles) + Inter (body); motion: letter spacing tightens (tracking-in); Subtitles: Clean at the bottom; Accent: Arrows; Pacing: Medium: 3 shots per 10 s (±3.3 s/shot); Transition: Slide up; Camera: Pan between points; Audio: Clean electronic 105 BPM, mechanical click SFX; Aspect: 16:9
- **Blocks:** `text/tight-tracking` (lettering), `hands/flowchart` (card), `accents/path-arc` (accent), `accents/path-arc` (accent), `transitions/slide` (transition), `camera/station` (camera)
- **Add:** `mgp add text/tight-tracking hands/flowchart accents/path-arc transitions/slide camera/station --into index.html`
- **Why:** Isometric looks 3D but stays 2D, so it is relatively easy to make and revise.

Ready-to-copy brief:

```text
Make a 60–90 second 16:9 explainer video in the "System Isometric" style: 30° isometric grid: system/process flows look 3D at 2D cost. Palette #F4F1FA, #1E1B3A, #6C5CE7, #00B894, #FFFFFF; Space Grotesk for titles and Inter for body text. Key motion: isometric blocks grow with a bounce; data packets travel along the connecting paths; labels light up in turn. Medium pacing: 3 shots per 10 s (±3.3 s/shot); audio: clean electronic 105 BPM, mechanical click SFX.
```

### EXP-03

**Whiteboard** (Papan Tulis). Marker on a whiteboard: concepts are drawn while they are explained.

- **Use:** Use for education, training, step-by-step process explanations. Avoid for brands that need a strong color identity.
- **Duration:** 60–90 s · **Aspect:** 16:9
- **Key motion:** a marker draws the diagram line by line; arrows connect the boxes; a red circle marks the core point
- **Palette:** `#FBFBF8` `#1A1A1A` `#E63946` `#1D6FD8` `#FFFFFF`
- **Font:** Kalam (titles) + Patrick Hand (body)
- **Slots:** Style / background: Clean whiteboard + marker scribbles; Composition: Numbered step list; Lettering: Kalam (titles) + Patrick Hand (body); motion: handwritten stroke-on; Subtitles: No subtitles; Accent: Hand-drawn circle; Pacing: Medium: 3 shots per 10 s (±3.3 s/shot); Transition: One-way wipe; Camera: Static; Audio: Calm acoustic, marker scratch SFX; Aspect: 16:9
- **Blocks:** `hands/whiteboard` (style), `hands/handwritten-title` (lettering), `hands/label-box` (card), `hands/arrow` (card), `hands/circle` (accent), `hands/mark` (accent), `transitions/scribble` (transition), `camera/float` (camera)
- **Add:** `mgp add hands/whiteboard hands/handwritten-title hands/label-box hands/arrow hands/circle hands/mark transitions/scribble camera/float --into index.html`
- **Why:** Whiteboard suits educational content and complex processes (some sources find it hard to adapt to a brand); signaling guides attention.

Ready-to-copy brief:

```text
Make a 60–90 second 16:9 explainer video in the "Whiteboard" style: marker on a whiteboard: concepts are drawn while they are explained. Palette #FBFBF8, #1A1A1A, #E63946, #1D6FD8, #FFFFFF; Kalam for titles and Patrick Hand for body text. Key motion: a marker draws the diagram line by line; arrows connect the boxes; a red circle marks the core point. Medium pacing: 3 shots per 10 s (±3.3 s/shot); audio: calm acoustic, marker scratch SFX.
```

### EXP-04

**Colour Marker Doodle** (Doodle Spidol Warna). Colorful marker doodles on paper, deliberately imperfect.

- **Use:** Use for creators, small businesses, casual explainers. Avoid for formal/corporate reports.
- **Duration:** 60–90 s · **Aspect:** 16:9
- **Key motion:** color doodles boil "on twos"; an idea light bulb is hatched in, then glows; a wavy highlighter stroke under the title
- **Palette:** `#FFF8EC` `#222222` `#FF6B35` `#2EC4B6` `#FFFFFF`
- **Font:** Permanent Marker (titles) + Nunito (body)
- **Slots:** Style / background: Textured cream paper + torn cutouts; Composition: Row of icons + labels; Lettering: Permanent Marker (titles) + Nunito (body); motion: highlighter sweep; Subtitles: Solid color box; Accent: Marker underline; Pacing: Medium: 3 shots per 10 s (±3.3 s/shot); Transition: Ink bleed; Camera: Floating parallax; Audio: Cheerful ukulele/indie 110 BPM, marker SFX; Aspect: 16:9
- **Blocks:** `textures/stop-motion` (style), `textures/grain` (style), `text/highlighter` (lettering), `hands/handwritten-title` (lettering), `hands/bubble` (card), `subtitles/texture` (subtitles), `hands/mark` (accent), `accents/line-stroke` (accent), `transitions/ink` (transition), `camera/float` (camera)
- **Add:** `mgp add textures/stop-motion textures/grain text/highlighter hands/handwritten-title hands/bubble subtitles/texture hands/mark accents/line-stroke transitions/ink camera/float --into index.html`
- **Why:** Canva 2026 'Imperfect by Design' and Pinterest 2026 put handmade elements in the spotlight.

Ready-to-copy brief:

```text
Make a 60–90 second 16:9 explainer video in the "Colour Marker Doodle" style: colorful marker doodles on paper, deliberately imperfect. Palette #FFF8EC, #222222, #FF6B35, #2EC4B6, #FFFFFF; Permanent Marker for titles and Nunito for body text. Key motion: color doodles boil "on twos"; an idea light bulb is hatched in, then glows; a wavy highlighter stroke under the title. Medium pacing: 3 shots per 10 s (±3.3 s/shot); audio: cheerful ukulele/indie 110 BPM, marker SFX.
```

### EXP-05

**2.5D Parallax Layers** (Lapisan Parallax 2.5D). Layered flat illustrations moving at different speeds: depth without 3D.

- **Use:** Use for premium explainers, product stories, channel openers. Avoid for very small budgets/1-day deadlines.
- **Duration:** 60–90 s · **Aspect:** 16:9
- **Key motion:** hill layers shift at different speeds; the sun rises with rotating rays; clouds and birds pass by
- **Palette:** `#0F2A47` `#FFFFFF` `#FFB703` `#8ECAE6` `#13355A`
- **Font:** Montserrat (titles) + Inter (body)
- **Slots:** Style / background: Soft studio gradient; Composition: Layered illustrated scene; Lettering: Montserrat (titles) + Inter (body); motion: word-by-word rise; Subtitles: Clean at the bottom; Accent: Light sweep; Pacing: Medium: 3 shots per 10 s (±3.3 s/shot); Transition: Zoom-through; Camera: Floating parallax; Audio: Light cinematic 90 BPM, soft whoosh; Aspect: 16:9
- **Blocks:** `text/rising-words` (lettering), `camera/depth-stack` (camera), `transitions/parallax-zoom` (camera), `transitions/parallax-zoom` (transition), `accents/light-sweep` (accent)
- **Add:** `mgp add text/rising-words camera/depth-stack transitions/parallax-zoom accents/light-sweep --into index.html`
- **Why:** 2.5D gives an illusion of depth without the complexity and cost of full 3D.

Ready-to-copy brief:

```text
Make a 60–90 second 16:9 explainer video in the "2.5D Parallax Layers" style: layered flat illustrations moving at different speeds: depth without 3D. Palette #0F2A47, #FFFFFF, #FFB703, #8ECAE6, #13355A; Montserrat for titles and Inter for body text. Key motion: hill layers shift at different speeds; the sun rises with rotating rays; clouds and birds pass by. Medium pacing: 3 shots per 10 s (±3.3 s/shot); audio: light cinematic 90 BPM, soft whoosh.
```

### EXP-06

**Minimal Icon Infographic** (Infografik Ikon Minimal). An icon + a big number per point, lots of white space.

- **Use:** Use for feature summaries, benefit points, short reports. Avoid for character-driven stories.
- **Duration:** 60–90 s · **Aspect:** 16:9
- **Key motion:** line icons draw on slowly; big numbers count up; an accent line grows under the number
- **Palette:** `#FFFFFF` `#111827` `#F59E0B` `#10B981` `#F3F4F6`
- **Font:** Inter (titles) + Inter (body)
- **Slots:** Style / background: Flat vector: solid colors + geometric shapes; Composition: Row of icons + labels; Lettering: Inter (titles) + Inter (body); motion: word-by-word appear; Subtitles: Clean at the bottom; Accent: Counting number; Pacing: Fast-medium: 4 shots per 10 s (±2.5 s/shot, about the average shot length of a modern film [CUT]); Transition: Grid; Camera: Static; Audio: Minimal tech 110 BPM, tick SFX; Aspect: 16:9
- **Blocks:** `text/rising-words` (lettering), `data/spec-list` (card), `data/counter` (accent), `data/counter` (accent), `data/ring` (accent), `transitions/grid` (transition), `camera/float` (camera)
- **Add:** `mgp add text/rising-words data/spec-list data/counter data/ring transitions/grid camera/float --into index.html`
- **Why:** 71% of marketers rate 30 s-2 min as the most effective length; signaling: the key points are highlighted.

Ready-to-copy brief:

```text
Make a 60–90 second 16:9 explainer video in the "Minimal Icon Infographic" style: an icon + a big number per point, lots of white space. Palette #FFFFFF, #111827, #F59E0B, #10B981, #F3F4F6; Inter for titles and Inter for body text. Key motion: line icons draw on slowly; big numbers count up; an accent line grows under the number. Fast-medium pacing: 4 shots per 10 s (±2.5 s/shot, about the average shot length of a modern film [CUT]); audio: minimal tech 110 BPM, tick SFX.
```

### EXP-07

**Sound-off Explainer** (Explainer Tanpa Suara). Big kinetic text carries the message; it is still understood when muted.

- **Use:** Use for social ads, in-feed explainers, public-screen presentations. Avoid for long material > 2 min.
- **Duration:** 30–60 s · **Aspect:** 16:9
- **Key motion:** giant words slam in one by one; a yellow highlight box sweeps over the keywords; subtitles type out in the bottom bar
- **Palette:** `#111111` `#FFFFFF` `#FFD60A` `#FF4D6D` `#1C1C1C`
- **Font:** Archivo Black (titles) + Inter (body)
- **Slots:** Style / background: One loud full-screen color; Composition: Big centered title; Lettering: Archivo Black (titles) + Inter (body); motion: big slam; Subtitles: Bold, centered, word by word; Accent: Marker underline; Pacing: Fast-medium: 4 shots per 10 s (±2.5 s/shot, about the average shot length of a modern film [CUT]); Transition: Match scale; Camera: Slow push-in; Audio: Firm beat 120 BPM, a hit on each keyword; Aspect: 16:9
- **Blocks:** `text/stomp` (lettering), `text/center-build` (lettering), `subtitles/stomp` (subtitles), `transitions/scale` (transition), `accents/beat-burst` (accent)
- **Add:** `mgp add text/stomp text/center-build subtitles/stomp transitions/scale accents/beat-burst --into index.html`
- **Why:** Kinetic typography is the most-cited trend of 2026 because short-form video is often watched without sound; Meta advises that the message be understood without audio.

Ready-to-copy brief:

```text
Make a 30–60 second 16:9 explainer video in the "Sound-off Explainer" style: big kinetic text carries the message; it is still understood when muted. Palette #111111, #FFFFFF, #FFD60A, #FF4D6D, #1C1C1C; Archivo Black for titles and Inter for body text. Key motion: giant words slam in one by one; a yellow highlight box sweeps over the keywords; subtitles type out in the bottom bar. Fast-medium pacing: 4 shots per 10 s (±2.5 s/shot, about the average shot length of a modern film [CUT]); audio: firm beat 120 BPM, a hit on each keyword.
```

### EXP-08

**Flat Paper Cutout** (Guntingan Kertas Datar). Flat paper cutouts + pasted-on pieces; it feels handmade.

- **Use:** Use for community explainers, public education, small businesses. Avoid for futuristic tech products.
- **Duration:** 60–90 s · **Aspect:** 16:9
- **Key motion:** paper cutouts slide in with shadows; paper mountains rise in layers; labels and tape stick on
- **Palette:** `#E9D9BF` `#2B2118` `#C8553D` `#2A7F62` `#FFF8EC`
- **Font:** Bebas Neue (titles) + Lora (body)
- **Slots:** Style / background: Brown kraft paper + paper cutouts; Composition: Cutout collage; Lettering: Bebas Neue (titles) + Lora (body); motion: rubber stamp; Subtitles: Solid color box; Accent: Tape; Pacing: Medium: 3 shots per 10 s (±3.3 s/shot); Transition: Paper tear; Camera: Static; Audio: Folk with wooden percussion 100 BPM, paper SFX; Aspect: 16:9
- **Blocks:** `textures/grain` (style), `text/texture-mask` (lettering), `textures/stop-motion` (accent), `transitions/tear` (transition), `transitions/paper-collage` (transition), `camera/float` (camera)
- **Add:** `mgp add textures/grain text/texture-mask textures/stop-motion transitions/tear transitions/paper-collage camera/float --into index.html`
- **Why:** Cutout is among the cheapest styles; Canva 2026 handmade trend.

Ready-to-copy brief:

```text
Make a 60–90 second 16:9 explainer video in the "Flat Paper Cutout" style: flat paper cutouts + pasted-on pieces; it feels handmade. Palette #E9D9BF, #2B2118, #C8553D, #2A7F62, #FFF8EC; Bebas Neue for titles and Lora for body text. Key motion: paper cutouts slide in with shadows; paper mountains rise in layers; labels and tape stick on. Medium pacing: 3 shots per 10 s (±3.3 s/shot); audio: folk with wooden percussion 100 BPM, paper SFX.
```

### EXP-09

**Glass Concept (Glassmorphism)** (Konsep Kaca (Glassmorphism)). Frosted glass panels floating on a dark gradient.

- **Use:** Use for digital products, fintech, AI, technology. Avoid for traditional/historical content.
- **Duration:** 60–90 s · **Aspect:** 16:9
- **Key motion:** frosted glass cards float above a gradient; color blobs move behind the glass; toggles and mini charts switch on
- **Palette:** `#1B1F3B` `#FFFFFF` `#7AD7F0` `#B388FF` `#2A2F55`
- **Font:** Syne (titles) + Inter (body)
- **Slots:** Style / background: Dark gradient + frosted glass panels; Composition: Card stack; Lettering: Syne (titles) + Inter (body); motion: focus from blur; Subtitles: Clean at the bottom; Accent: Light sweep; Pacing: Medium: 3 shots per 10 s (±3.3 s/shot); Transition: Crossfade; Camera: 3D tilt; Audio: Ambient synth 95 BPM, shimmer; Aspect: 16:9
- **Blocks:** `ui/device-3d` (style), `backgrounds/gradient-mesh` (style), `3d/glass-hero` (card), `ui/liquid-glass` (card), `text/blur-focus` (lettering), `transitions/blur` (transition), `camera/rack-focus` (camera)
- **Add:** `mgp add ui/device-3d backgrounds/gradient-mesh 3d/glass-hero ui/liquid-glass text/blur-focus transitions/blur camera/rack-focus --into index.html`
- **Why:** Liquid glass (transparency and refraction) is named as a 2026 trend; glassmorphism is used for social ads.

Ready-to-copy brief:

```text
Make a 60–90 second 16:9 explainer video in the "Glass Concept (Glassmorphism)" style: frosted glass panels floating on a dark gradient. Palette #1B1F3B, #FFFFFF, #7AD7F0, #B388FF, #2A2F55; Syne for titles and Inter for body text. Key motion: frosted glass cards float above a gradient; color blobs move behind the glass; toggles and mini charts switch on. Medium pacing: 3 shots per 10 s (±3.3 s/shot); audio: ambient synth 95 BPM, shimmer.
```

### EXP-10

**Loud Minimal** (Minimal Lantang). Loud full-screen color, giant typography, few elements.

- **Use:** Use for launches, single points, campaigns. Avoid for detailed technical explanations.
- **Duration:** 15–30 s · **Aspect:** 16:9
- **Key motion:** color blocks wipe across the full screen; giant words rise from behind a mask; the background color changes at every point
- **Palette:** `#FF5A1F` `#111111` `#FFFFFF` `#1E3A8A` `#FFE8DC`
- **Font:** Anton (titles) + Inter (body)
- **Slots:** Style / background: One loud full-screen color; Composition: Text left, visual right; Lettering: Anton (titles) + Inter (body); motion: masked reveal per line; Subtitles: Lower-third bar; Accent: Badge pop; Pacing: Fast-medium: 4 shots per 10 s (±2.5 s/shot, about the average shot length of a modern film [CUT]); Transition: One-way wipe; Camera: Static; Audio: Electronic pop 118 BPM; Aspect: 16:9
- **Blocks:** `text/line-slide` (lettering), `text/svg-mask` (lettering), `labels/bold` (card), `accents/spring-pop` (accent), `transitions/slide` (transition)
- **Add:** `mgp add text/line-slide text/svg-mask labels/bold accents/spring-pop transitions/slide --into index.html`
- **Why:** Bold minimalism: minimalism shifts from calm colors to a clean but loud look.

Ready-to-copy brief:

```text
Make a 15–30 second 16:9 explainer video in the "Loud Minimal" style: loud full-screen color, giant typography, few elements. Palette #FF5A1F, #111111, #FFFFFF, #1E3A8A, #FFE8DC; Anton for titles and Inter for body text. Key motion: color blocks wipe across the full screen; giant words rise from behind a mask; the background color changes at every point. Fast-medium pacing: 4 shots per 10 s (±2.5 s/shot, about the average shot length of a modern film [CUT]); audio: electronic pop 118 BPM.
```

## 2. Documentary / video essay (DOK)

Long research narration: archives, photos, maps, clippings, Ken Burns camera.

### DOK-01

**Living Clippings (Paper Archive Collage)** (Kliping Hidup (Kolase Arsip Kertas)). Cream paper, torn cutouts, calligraphy/light medallions; a warm archive-collage style that tells a story.

- **Use:** Use for history, stories of figures who are not drawn, religious documentaries. Avoid for tech products, fast ads.
- **Duration:** 8–15 min (chapters 1–2 min) · **Aspect:** 9:16
- **Key motion:** archive cutouts drop and stick; a gold medallion glows with a calligraphy stroke; a title ribbon unrolls with a stop-motion jitter
- **Palette:** `#F3ECDF` `#1B1915` `#8B2E29` `#1F3157` `#FFFCF5`
- **Font:** Poppins (titles) + Lora (body)
- **Slots:** Style / background: Textured cream paper + torn cutouts; Composition: Cutout collage; Lettering: Poppins (titles) + Lora (body); motion: word-by-word appear; Subtitles: Per-word color highlight; Accent: Light medallion; Pacing: Fast-medium: 4 shots per 10 s (±2.5 s/shot, about the average shot length of a modern film [CUT]); Transition: Paper tear; Camera: Ken Burns (photo zoom + pan); Audio: Calm nasheed/ambient 80-90 BPM, paper SFX + soft chime; Aspect: 9:16
- **Blocks:** `textures/grain` (style), `text/rising-words` (lettering), `hands/frame` (card), `accents/light-sweep` (accent), `textures/rays` (accent), `transitions/paper-collage` (transition), `transitions/tear` (transition), `camera/push` (camera)
- **Add:** `mgp add textures/grain text/rising-words hands/frame accents/light-sweep textures/rays transitions/paper-collage transitions/tear camera/push --into index.html`
- **Why:** Mixed media/collage is a 2026 trend; Pinterest motion collage boards; Canva 'Imperfect by Design'; a video essay is a collage of archive fragments (archiveology).

Ready-to-copy brief:

```text
Make an 8–15 minute (1–2 minute chapters) 9:16 documentary video in the "Living Clippings (Paper Archive Collage)" style: cream paper, torn cutouts, calligraphy/light medallions; a warm archive-collage style that tells a story. Palette #F3ECDF, #1B1915, #8B2E29, #1F3157, #FFFCF5; Poppins for titles and Lora for body text. Key motion: archive cutouts drop and stick; a gold medallion glows with a calligraphy stroke; a title ribbon unrolls with a stop-motion jitter. Fast-medium pacing: 4 shots per 10 s (±2.5 s/shot, about the average shot length of a modern film [CUT]); audio: calm nasheed/ambient 80-90 BPM, paper SFX + soft chime.
```

### DOK-02

**Ken Burns Archive** (Arsip Ken Burns). Archive photos moving slowly (zoom + pan), serif text.

- **Use:** Use for history, biographies, family/company stories. Avoid for fast content/shorts.
- **Duration:** 8–15 min (chapters 1–2 min) · **Aspect:** 16:9
- **Key motion:** archive photos zoom and pan slowly; photos dissolve into one another; serif titles and running year numbers
- **Palette:** `#14110E` `#F2E8D5` `#C9A227` `#7A6A53` `#2A241D`
- **Font:** Playfair Display (titles) + Lora (body)
- **Slots:** Style / background: Cinematic dark + grain + vignette; Composition: Archive photos; Lettering: Playfair Display (titles) + Lora (body); motion: soft rise (fade-up); Subtitles: Italic editorial serif; Accent: No accent; Pacing: Medium: 3 shots per 10 s (±3.3 s/shot); Transition: Crossfade; Camera: Ken Burns (photo zoom + pan); Audio: Slow piano/strings 70 BPM; Aspect: 16:9
- **Blocks:** `textures/grain` (style), `textures/vignette` (style), `text/blur-focus` (lettering), `labels/cardless` (card), `transitions/fade` (transition), `camera/push` (camera), `camera/push` (camera)
- **Add:** `mgp add textures/grain textures/vignette text/blur-focus labels/cardless transitions/fade camera/push --into index.html`
- **Why:** Archive photos are the core material of a video essay; long video essays keep growing in popularity.

Ready-to-copy brief:

```text
Make an 8–15 minute (1–2 minute chapters) 16:9 documentary video in the "Ken Burns Archive" style: archive photos moving slowly (zoom + pan), serif text. Palette #14110E, #F2E8D5, #C9A227, #7A6A53, #2A241D; Playfair Display for titles and Lora for body text. Key motion: archive photos zoom and pan slowly; photos dissolve into one another; serif titles and running year numbers. Medium pacing: 3 shots per 10 s (±3.3 s/shot); audio: slow piano/strings 70 BPM.
```

### DOK-03

**Journalistic Map** (Peta Jurnalistik) ★ featured pick. A dark map, routes drawing on, the camera flying to locations, callouts.

- **Use:** Use for geopolitics, trade history, logistics routes. Avoid for topics without a sense of place.
- **Duration:** 8–15 min (chapters 1–2 min) · **Aspect:** 16:9
- **Key motion:** the camera flies between locations; route lines draw on with glowing dots; pins pulse with callout labels
- **Palette:** `#0E1A2B` `#F5F1E8` `#FF5A4E` `#5BC0EB` `#1A2B42`
- **Font:** Oswald (titles) + Inter (body)
- **Slots:** Style / background: Map: coastlines + coordinate grid; Composition: Routes/points on a map; Lettering: Oswald (titles) + Inter (body); motion: letter spacing tightens (tracking-in); Subtitles: Lower-third bar; Accent: Location pin; Pacing: Medium: 3 shots per 10 s (±3.3 s/shot); Transition: Zoom-through; Camera: Slow push-in; Audio: Tension pulse 90 BPM, flight whoosh; Aspect: 16:9
- **Blocks:** `maps/globe` (data), `maps/route` (data), `accents/vox-annotation` (card), `accents/path-arc` (accent), `transitions/scale` (transition), `camera/push` (camera), `camera/push` (camera)
- **Add:** `mgp add maps/globe maps/route accents/vox-annotation accents/path-arc transitions/scale camera/push --into index.html`
- **Why:** 3D maps + routes are in high demand for visual-journalism documentaries; a route on a map must not suggest more certainty than the source gives.

Ready-to-copy brief:

```text
Make an 8–15 minute (1–2 minute chapters) 16:9 documentary video in the "Journalistic Map" style: a dark map, routes drawing on, the camera flying to locations, callouts. Palette #0E1A2B, #F5F1E8, #FF5A4E, #5BC0EB, #1A2B42; Oswald for titles and Inter for body text. Key motion: the camera flies between locations; route lines draw on with glowing dots; pins pulse with callout labels. Medium pacing: 3 shots per 10 s (±3.3 s/shot); audio: tension pulse 90 BPM, flight whoosh.
```

### DOK-04

**Investigation Board** (Papan Investigasi). A corkboard, pinned photos, red string connecting the evidence.

- **Use:** Use for mysteries, cases, investigations. Avoid for cheerful/children's content.
- **Duration:** 8–15 min (chapters 1–2 min) · **Aspect:** 16:9
- **Key motion:** the camera flies from clue to clue, then pulls back to show the whole board; photos and notes drop with a spring and get pinned; red string pulls taut between the pins while labels type out
- **Palette:** `#B08158` `#1E1A16` `#C1121F` `#F4E9D8` `#FFF9EE`
- **Font:** Special Elite (titles) + IBM Plex Mono (body)
- **Slots:** Style / background: Corkboard + pinned cards; Composition: Investigation board + string; Lettering: Special Elite (titles) + IBM Plex Mono (body); motion: typewriter; Subtitles: Typewriter mono; Accent: Location pin; Pacing: Fast-medium: 4 shots per 10 s (±2.5 s/shot, about the average shot length of a modern film [CUT]); Transition: Whip pan blur; Camera: Pan between points; Audio: Dark ambient 85 BPM, typewriter + pin SFX; Aspect: 16:9
- **Blocks:** `text/typewriter` (lettering), `hands/frame` (card), `paper/freeze-dress` (card), `accents/line-stroke` (accent), `transitions/whip-pan` (transition), `camera/station` (camera), `camera/shake` (camera)
- **Add:** `mgp add text/typewriter hands/frame paper/freeze-dress accents/line-stroke transitions/whip-pan camera/station camera/shake --into index.html`
- **Why:** Mystery/case content is said to have strong watch time because viewers want to know the ending.

Ready-to-copy brief:

```text
Make an 8–15 minute (1–2 minute chapters) 16:9 documentary video in the "Investigation Board" style: a corkboard, pinned photos, red string connecting the evidence. Palette #B08158, #1E1A16, #C1121F, #F4E9D8, #FFF9EE; Special Elite for titles and IBM Plex Mono for body text. Key motion: the camera flies from clue to clue, then pulls back to show the whole board; photos and notes drop with a spring and get pinned; red string pulls taut between the pins while labels type out. Fast-medium pacing: 4 shots per 10 s (±2.5 s/shot, about the average shot length of a modern film [CUT]); audio: dark ambient 85 BPM, typewriter + pin SFX.
```

### DOK-05

**Old Newspaper Editorial** (Koran Lama Editorial). Newsprint, columns, halftone, big serif headlines.

- **Use:** Use for modern history, news recaps, analysis. Avoid for fast-paced youth content.
- **Duration:** 8–15 min (chapters 1–2 min) · **Aspect:** 16:9
- **Key motion:** a slow zoom into the main serif headline; a new newspaper page spins in from the center; an ARSIP (archive) ink stamp slams onto the story
- **Palette:** `#EFE8DA` `#1A1A1A` `#9E2A2B` `#5F5A50` `#F8F4EA`
- **Font:** DM Serif Display (titles) + Libre Baskerville (body)
- **Slots:** Style / background: Newsprint: columns, halftone, serif; Composition: Large quote/document; Lettering: DM Serif Display (titles) + Libre Baskerville (body); motion: masked reveal per line; Subtitles: Italic editorial serif; Accent: Marker underline; Pacing: Medium: 3 shots per 10 s (±3.3 s/shot); Transition: Page turn; Camera: Ken Burns (photo zoom + pan); Audio: Vintage jazz 90 BPM, printing press SFX; Aspect: 16:9
- **Blocks:** `textures/halftone` (style), `textures/grain` (style), `text/line-slide` (lettering), `text/highlighter` (lettering), `accents/vox-annotation` (card), `transitions/halftone` (transition), `camera/float` (camera)
- **Add:** `mgp add textures/halftone textures/grain text/line-slide text/highlighter accents/vox-annotation transitions/halftone camera/float --into index.html`
- **Why:** Document callouts and retro paper textures are common in visual documentaries.

Ready-to-copy brief:

```text
Make an 8–15 minute (1–2 minute chapters) 16:9 documentary video in the "Old Newspaper Editorial" style: newsprint, columns, halftone, big serif headlines. Palette #EFE8DA, #1A1A1A, #9E2A2B, #5F5A50, #F8F4EA; DM Serif Display for titles and Libre Baskerville for body text. Key motion: a slow zoom into the main serif headline; a new newspaper page spins in from the center; an ARSIP (archive) ink stamp slams onto the story. Medium pacing: 3 shots per 10 s (±3.3 s/shot); audio: vintage jazz 90 BPM, printing press SFX.
```

### DOK-06

**History Timeline** (Garis Waktu Sejarah). The camera travels along a timeline; each point opens an event.

- **Use:** Use for chronologies, organization histories, biographies. Avoid for topics without a time order.
- **Duration:** 8–15 min (chapters 1–2 min) · **Aspect:** 16:9
- **Key motion:** the camera travels along the timeline from year to year; event dots appear with a pulse ring; event cards bounce open with a title and a caption
- **Palette:** `#F6F0E4` `#202020` `#B5651D` `#2F5D62` `#FFFFFF`
- **Font:** Cinzel (titles) + Lora (body)
- **Slots:** Style / background: Textured cream paper + torn cutouts; Composition: Timeline; Lettering: Cinzel (titles) + Lora (body); motion: word-by-word rise; Subtitles: Clean at the bottom; Accent: Progress ring; Pacing: Fast-medium: 4 shots per 10 s (±2.5 s/shot, about the average shot length of a modern film [CUT]); Transition: Slide up; Camera: Pan between points; Audio: Light orchestra 85 BPM, clock tick SFX; Aspect: 16:9
- **Blocks:** `data/beat-timeline` (data), `text/rising-words` (lettering), `accents/spring-pop` (accent), `transitions/slide` (transition), `camera/story-scroll` (camera), `camera/station` (camera)
- **Add:** `mgp add data/beat-timeline text/rising-words accents/spring-pop transitions/slide camera/story-scroll camera/station --into index.html`
- **Why:** History video essays use a sequence of archive fragments as their method.

Ready-to-copy brief:

```text
Make an 8–15 minute (1–2 minute chapters) 16:9 documentary video in the "History Timeline" style: the camera travels along a timeline; each point opens an event. Palette #F6F0E4, #202020, #B5651D, #2F5D62, #FFFFFF; Cinzel for titles and Lora for body text. Key motion: the camera travels along the timeline from year to year; event dots appear with a pulse ring; event cards bounce open with a title and a caption. Fast-medium pacing: 4 shots per 10 s (±2.5 s/shot, about the average shot length of a modern film [CUT]); audio: light orchestra 85 BPM, clock tick SFX.
```

### DOK-07

**Cinematic Noir** (Noir Sinematik). Dark, heavy grain, light leaks, a slow camera push.

- **Use:** Use for dramatic stories, tragic biographies, true stories. Avoid for light informative content.
- **Duration:** 8–15 min (chapters 1–2 min) · **Aspect:** 16:9
- **Key motion:** window-blind shadows sweep slowly over a silhouette in a hat; cigarette smoke curls through heavy grain and light leaks; an italic serif title tightens from wide letter spacing
- **Palette:** `#0B0B0D` `#EDE6D6` `#E0A458` `#8C1C13` `#1A1A1D`
- **Font:** Bodoni Moda (titles) + Inter (body)
- **Slots:** Style / background: Cinematic dark + grain + vignette; Composition: Archive photos; Lettering: Bodoni Moda (titles) + Inter (body); motion: focus from blur; Subtitles: Italic editorial serif; Accent: Light sweep; Pacing: Medium: 3 shots per 10 s (±3.3 s/shot); Transition: Flash / light leak; Camera: Slow push-in; Audio: Dark drone + cello 60-70 BPM; Aspect: 16:9
- **Blocks:** `textures/grain` (style), `textures/vignette` (style), `text/blur-focus` (lettering), `transitions/light-leak` (transition), `transitions/light-leak` (transition), `camera/rack-focus` (camera), `camera/push` (camera)
- **Add:** `mgp add textures/grain textures/vignette text/blur-focus transitions/light-leak camera/rack-focus camera/push --into index.html`
- **Why:** Canva 2026 'Drama Club': dramatic light and film-scene composition.

Ready-to-copy brief:

```text
Make an 8–15 minute (1–2 minute chapters) 16:9 documentary video in the "Cinematic Noir" style: dark, heavy grain, light leaks, a slow camera push. Palette #0B0B0D, #EDE6D6, #E0A458, #8C1C13, #1A1A1D; Bodoni Moda for titles and Inter for body text. Key motion: window-blind shadows sweep slowly over a silhouette in a hat; cigarette smoke curls through heavy grain and light leaks; an italic serif title tightens from wide letter spacing. Medium pacing: 3 shots per 10 s (±3.3 s/shot); audio: dark drone + cello 60-70 BPM.
```

### DOK-08

**Document & Evidence Annotation** (Anotasi Dokumen & Bukti). Original documents/quotes/posts are highlighted, circled, crossed out.

- **Use:** Use for fact-checks, policy analysis, source-based history. Avoid for fiction.
- **Duration:** 8–15 min (chapters 1–2 min) · **Aspect:** 16:9
- **Key motion:** a yellow highlighter sweeps over a quote; a red circle and a "cek ini!" (check this!) arrow are drawn by hand; a black redaction bar slides in, then a magnifying glass enlarges the quote
- **Palette:** `#F7F5F0` `#161616` `#FFD23F` `#E4572E` `#FFFFFF`
- **Font:** Source Serif 4 (titles) + Inter (body)
- **Slots:** Style / background: Clean whiteboard + marker scribbles; Composition: Large quote/document; Lettering: Source Serif 4 (titles) + Inter (body); motion: highlighter sweep; Subtitles: Clean at the bottom; Accent: Hand-drawn circle; Pacing: Medium: 3 shots per 10 s (±3.3 s/shot); Transition: Match scale; Camera: Slow push-in; Audio: Minimal pulse 95 BPM, highlighter SFX; Aspect: 16:9
- **Blocks:** `accents/vox-annotation` (card), `text/highlighter` (card), `social/post-card` (card), `text/highlighter` (lettering), `text/highlighter` (lettering), `text/strike-replace` (lettering), `hands/circle` (accent), `camera/zoom-ui` (camera)
- **Add:** `mgp add accents/vox-annotation text/highlighter social/post-card text/strike-replace hands/circle camera/zoom-ui --into index.html`
- **Why:** Faceless documentaries put quote and evidence overlays over the narration.

Ready-to-copy brief:

```text
Make an 8–15 minute (1–2 minute chapters) 16:9 documentary video in the "Document & Evidence Annotation" style: original documents/quotes/posts are highlighted, circled, crossed out. Palette #F7F5F0, #161616, #FFD23F, #E4572E, #FFFFFF; Source Serif 4 for titles and Inter for body text. Key motion: a yellow highlighter sweeps over a quote; a red circle and a "cek ini!" (check this!) arrow are drawn by hand; a black redaction bar slides in, then a magnifying glass enlarges the quote. Medium pacing: 3 shots per 10 s (±3.3 s/shot); audio: minimal pulse 95 BPM, highlighter SFX.
```

### DOK-09

**Faceless Business Documentary** (Dokumenter Bisnis Faceless). B-roll + numbers + charts + lower thirds, 9-12 min.

- **Use:** Use for business, economics, company profiles. Avoid for light entertainment content.
- **Duration:** 9–12 min · **Aspect:** 16:9
- **Key motion:** glowing charts grow with a slow zoom; a market ticker runs across the top with rising values; lower thirds slide in and out
- **Palette:** `#0D1B2A` `#FFFFFF` `#00C2A8` `#FFB000` `#1B263B`
- **Font:** Montserrat (titles) + Inter (body)
- **Slots:** Style / background: Cinematic dark + grain + vignette; Composition: Growing chart; Lettering: Montserrat (titles) + Inter (body); motion: word-by-word appear; Subtitles: Lower-third bar; Accent: Counting number; Pacing: Fast-medium: 4 shots per 10 s (±2.5 s/shot, about the average shot length of a modern film [CUT]); Transition: Sideways push; Camera: Slow push-in; Audio: Corporate tension 100 BPM; Aspect: 16:9
- **Blocks:** `data/bar-chart` (data), `data/line-chart` (data), `labels/clean` (card), `labels/bold` (card), `data/counter` (accent), `data/counter` (accent), `transitions/slide` (transition), `camera/push` (camera)
- **Add:** `mgp add data/bar-chart data/line-chart labels/clean labels/bold data/counter transitions/slide camera/push --into index.html`
- **Why:** The business documentary format: 9-12 min of narration built from archives, stock B-roll and motion graphics.

Ready-to-copy brief:

```text
Make a 9–12 minute 16:9 documentary video in the "Faceless Business Documentary" style: B-roll + numbers + charts + lower thirds, 9-12 min. Palette #0D1B2A, #FFFFFF, #00C2A8, #FFB000, #1B263B; Montserrat for titles and Inter for body text. Key motion: glowing charts grow with a slow zoom; a market ticker runs across the top with rising values; lower thirds slide in and out. Fast-medium pacing: 4 shots per 10 s (±2.5 s/shot, about the average shot length of a modern film [CUT]); audio: corporate tension 100 BPM.
```

### DOK-10

**Monochrome Archive, Red Accent** (Arsip Monokrom Aksen Merah). Black-and-white photos + a single red for emphasis.

- **Use:** Use for social issues, history, awareness campaigns. Avoid for cheerful content.
- **Duration:** 8–15 min (chapters 1–2 min) · **Aspect:** 16:9
- **Key motion:** black-and-white photos move slowly; a red circle draws on to mark a detail; a red underline under the title
- **Palette:** `#F2F2F2` `#0A0A0A` `#D62828` `#6B6B6B` `#FFFFFF`
- **Font:** Bebas Neue (titles) + Inter (body)
- **Slots:** Style / background: Monochrome + one accent color; Composition: Archive photos; Lettering: Bebas Neue (titles) + Inter (body); motion: big slam; Subtitles: Solid color box; Accent: Stamp; Pacing: Fast-medium: 4 shots per 10 s (±2.5 s/shot, about the average shot length of a modern film [CUT]); Transition: Hard cut; Camera: Ken Burns (photo zoom + pan); Audio: Tense percussion 100 BPM, hits; Aspect: 16:9
- **Blocks:** `transitions/before-after` (style), `text/stomp` (lettering), `accents/spring-pop` (accent), `transitions/beat-freeze` (transition), `transitions/match-cut` (transition), `camera/push` (camera)
- **Add:** `mgp add transitions/before-after text/stomp accents/spring-pop transitions/beat-freeze transitions/match-cut camera/push --into index.html`
- **Why:** Bold minimalism + dramatic light: one accent color holds the focus.

Ready-to-copy brief:

```text
Make an 8–15 minute (1–2 minute chapters) 16:9 documentary video in the "Monochrome Archive, Red Accent" style: black-and-white photos + a single red for emphasis. Palette #F2F2F2, #0A0A0A, #D62828, #6B6B6B, #FFFFFF; Bebas Neue for titles and Inter for body text. Key motion: black-and-white photos move slowly; a red circle draws on to mark a detail; a red underline under the title. Fast-medium pacing: 4 shots per 10 s (±2.5 s/shot, about the average shot length of a modern film [CUT]); audio: tense percussion 100 BPM, hits.
```

## 3. Narrative / storytelling (NAR)

Stories with a plot (beginning-conflict-ending) told with illustrative animation.

### NAR-01

**Picture Storybook** (Buku Cerita Bergambar). Illustrated book pages, turned one by one.

- **Use:** Use for fairy tales, exemplary stories, children's stories. Avoid for data/numbers.
- **Duration:** 1–3 min · **Aspect:** 16:9
- **Key motion:** living page illustrations (turning sun, clouds, chimney smoke, birds); pages turn from day to night; a large drop cap and the story text appear step by step
- **Palette:** `#FBF3E4` `#3B2A1A` `#E07A5F` `#81B29A` `#F2CC8F`
- **Font:** Fraunces (titles) + Lora (body)
- **Slots:** Style / background: Textured cream paper + torn cutouts; Composition: Layered illustrated scene; Lettering: Fraunces (titles) + Lora (body); motion: soft rise (fade-up); Subtitles: Italic editorial serif; Accent: No accent; Pacing: Medium-fast: 4 shots per 10 s (±2.5 s/shot, about the average shot length of modern film [CUT]); Transition: Page turn; Camera: Move between stations; Audio: Music box/harp 80 BPM, page SFX; Aspect: 16:9
- **Blocks:** `textures/grain` (style), `text/blur-focus` (lettering), `transitions/slide` (transition), `transitions/flip-3d` (transition), `camera/station` (camera)
- **Add:** `mgp add textures/grain text/blur-focus transitions/slide transitions/flip-3d camera/station --into index.html`
- **Why:** Storytelling = the most common popular format on TikTok; handcrafted aesthetic of Pinterest 2026.

Ready-to-copy brief:

```text
Make a 1–3 minute 16:9 animated story video in the "Picture Storybook" style: illustrated book pages, turned one by one. Palette #FBF3E4, #3B2A1A, #E07A5F, #81B29A, #F2CC8F; Fraunces for titles and Lora for body text. Key motion: living page illustrations (turning sun, clouds, chimney smoke, birds); pages turn from day to night; a large drop cap and the story text appear step by step. Medium-fast pacing: 4 shots per 10 s (±2.5 s/shot, about the average shot length of modern film [CUT]); audio: music box/harp 80 BPM, page SFX.
```

### NAR-02

**Cinematic Parallax** (Parallax Sinematik) ★ featured pick. A scene of 3+ layers, a slow camera push, real depth.

- **Use:** Use for story openings, trailers, epic tales. Avoid for technical tutorials.
- **Duration:** 1–3 min · **Aspect:** 16:9
- **Key motion:** slow dolly through layers of mountains; twinkling stars and drifting mist; the title opens with widening letter spacing
- **Palette:** `#1D1A3A` `#FFF4E0` `#FF8C42` `#6A4C93` `#2E2A5A`
- **Font:** Marcellus (titles) + Inter (body)
- **Slots:** Style / background: Layered dusk sky + silhouettes; Composition: Layered illustrated scene; Lettering: Marcellus (titles) + Inter (body); motion: word-by-word rise; Subtitles: Clean at the bottom; Accent: Light beam; Pacing: Medium: 3 shots per 10 s (±3.3 s/shot); Transition: Zoom-through; Camera: Floating parallax; Audio: Epic cinematic 75 BPM; Aspect: 16:9
- **Blocks:** `camera/depth-stack` (camera), `transitions/parallax-zoom` (camera), `camera/dolly-zoom` (camera), `transitions/parallax-zoom` (transition), `textures/rays` (style), `text/rising-words` (lettering)
- **Add:** `mgp add camera/depth-stack transitions/parallax-zoom camera/dolly-zoom textures/rays text/rising-words --into index.html`
- **Why:** 2.5D parallax = shifting depth layers; vertical creator briefs ask for 3+ layers with a slow push-in.

Ready-to-copy brief:

```text
Make a 1–3 minute 16:9 animated story video in the "Cinematic Parallax" style: a scene of 3+ layers, a slow camera push, real depth. Palette #1D1A3A, #FFF4E0, #FF8C42, #6A4C93, #2E2A5A; Marcellus for titles and Inter for body text. Key motion: slow dolly through layers of mountains; twinkling stars and drifting mist; the title opens with widening letter spacing. Medium pacing: 3 shots per 10 s (±3.3 s/shot); audio: epic cinematic 75 BPM.
```

### NAR-03

**Comedy Cutout** (Cutout Komedi). Flat cut-out shapes, bouncy motion, comic timing.

- **Use:** Use for comedy sketches, light stories, mascots. Avoid for grief/serious topics.
- **Duration:** 1–3 min · **Aspect:** 16:9
- **Key motion:** a cutout character walks in, then jumps in surprise with squash and stretch; a gift box pops and stars burst out; the title letters drop and bounce one by one (motion on twos)
- **Palette:** `#FFE66D` `#1A1A1A` `#FF6B6B` `#4ECDC4` `#FFFFFF`
- **Font:** Fredoka (titles) + Nunito (body)
- **Slots:** Style / background: Flat vector: solid colors + geometric shapes; Composition: Layered illustrated scene; Lettering: Fredoka (titles) + Nunito (body); motion: rubber stamp; Subtitles: White with black outline; Accent: Rating stars; Pacing: Medium-fast: 4 shots per 10 s (±2.5 s/shot, about the average shot length of modern film [CUT]); Transition: Whip pan blur; Camera: Handheld (light shake); Audio: Comedy ukulele 125 BPM, boing; Aspect: 16:9
- **Blocks:** `transitions/rubber` (transition), `transitions/whip-pan` (transition), `accents/spring-pop` (accent), `accents/echo` (accent), `camera/shake` (camera), `text/letter-shatter` (lettering)
- **Add:** `mgp add transitions/rubber transitions/whip-pan accents/spring-pop accents/echo camera/shake text/letter-shatter --into index.html`
- **Why:** Cutout: flat, bold, funny, limited motion, common in fast TV production.

Ready-to-copy brief:

```text
Make a 1–3 minute 16:9 animated story video in the "Comedy Cutout" style: flat cut-out shapes, bouncy motion, comic timing. Palette #FFE66D, #1A1A1A, #FF6B6B, #4ECDC4, #FFFFFF; Fredoka for titles and Nunito for body text. Key motion: a cutout character walks in, then jumps in surprise with squash and stretch; a gift box pops and stars burst out; the title letters drop and bounce one by one (motion on twos). Medium-fast pacing: 4 shots per 10 s (±2.5 s/shot, about the average shot length of modern film [CUT]); audio: comedy ukulele 125 BPM, boing.
```

### NAR-04

**Paper Stop Motion** (Stop Motion Kertas). Motion on twos, paper with a slight jitter.

- **Use:** Use for craft stories, personal stories, nostalgia. Avoid for glossy premium products.
- **Duration:** 1–3 min · **Aspect:** 16:9
- **Key motion:** choppy 8 fps motion with paper jitter; a paper character walks across; clouds shift step by step
- **Palette:** `#D9C3A0` `#2A1E14` `#B23A48` `#3C6E71` `#F4EBDD`
- **Font:** Caveat Brush (titles) + Lora (body)
- **Slots:** Style / background: Brown kraft paper + paper cutouts; Composition: Layered illustrated scene; Lettering: Caveat Brush (titles) + Lora (body); motion: letter-by-letter bounce; Subtitles: Color block box; Accent: Tape; Pacing: Medium-fast: 4 shots per 10 s (±2.5 s/shot, about the average shot length of modern film [CUT]); Transition: Straight cut; Camera: Static; Audio: Warm acoustic 95 BPM, paper SFX; Aspect: 16:9
- **Blocks:** `textures/stop-motion` (style), `textures/grain` (style), `text/rising-words` (lettering), `transitions/tear` (transition), `camera/float` (camera)
- **Add:** `mgp add textures/stop-motion textures/grain text/rising-words transitions/tear camera/float --into index.html`
- **Why:** Stop motion: tactile texture, feels handmade, slightly jittery; in line with Canva 2026.

Ready-to-copy brief:

```text
Make a 1–3 minute 16:9 animated story video in the "Paper Stop Motion" style: motion on twos, paper with a slight jitter. Palette #D9C3A0, #2A1E14, #B23A48, #3C6E71, #F4EBDD; Caveat Brush for titles and Lora for body text. Key motion: choppy 8 fps motion with paper jitter; a paper character walks across; clouds shift step by step. Medium-fast pacing: 4 shots per 10 s (±2.5 s/shot, about the average shot length of modern film [CUT]); audio: warm acoustic 95 BPM, paper SFX.
```

### NAR-05

**Spotlight Drama** (Drama Spotlight). A dark stage, a single spotlight, theatrical text.

- **Use:** Use for monologues, inspiring stories, climactic moments. Avoid for dense informational content.
- **Duration:** 1–3 min · **Aspect:** 16:9
- **Key motion:** the spotlight searches left and right, then locks onto a silhouette; glittering dust floats inside the beam; a theatrical title appears below a velvet curtain
- **Palette:** `#070707` `#F7F1E3` `#F2C14E` `#5C2A9D` `#141414`
- **Font:** Abril Fatface (titles) + Inter (body)
- **Slots:** Style / background: Cinematic dark + grain + vignette; Composition: Big centered title; Lettering: Abril Fatface (titles) + Inter (body); motion: tightening letter spacing (tracking-in); Subtitles: Italic editorial serif; Accent: Light beam; Pacing: Medium: 3 shots per 10 s (±3.3 s/shot); Transition: Circle iris; Camera: Slow push-in; Audio: Dramatic strings 70 BPM; Aspect: 16:9
- **Blocks:** `transitions/iris` (transition), `transitions/iris` (transition), `textures/rays` (accent), `accents/light-sweep` (accent), `text/tight-tracking` (lettering), `camera/push` (camera)
- **Add:** `mgp add transitions/iris textures/rays accents/light-sweep text/tight-tracking camera/push --into index.html`
- **Why:** Canva 2026: interest in 'dramatic spotlight' and 'mockumentary' up 27%.

Ready-to-copy brief:

```text
Make a 1–3 minute 16:9 animated story video in the "Spotlight Drama" style: a dark stage, a single spotlight, theatrical text. Palette #070707, #F7F1E3, #F2C14E, #5C2A9D, #141414; Abril Fatface for titles and Inter for body text. Key motion: the spotlight searches left and right, then locks onto a silhouette; glittering dust floats inside the beam; a theatrical title appears below a velvet curtain. Medium pacing: 3 shots per 10 s (±3.3 s/shot); audio: dramatic strings 70 BPM.
```

### NAR-06

**Shadow-Puppet Silhouette** (Siluet Wayang). Black silhouettes against a dusk sky; faceless characters.

- **Use:** Use for historical/religious stories without drawing the characters' faces, legends. Avoid for product demos.
- **Duration:** 1–3 min · **Aspect:** 16:9
- **Key motion:** a lacy gunungan (tree-of-life puppet) spins in the middle of the kelir (screen), then moves aside; two wayang silhouettes enter and move their pointing arms; the blencong (oil lamp) light flickers and casts a soft double shadow
- **Palette:** `#F6A64B` `#120B05` `#C8402D` `#FCE3B0` `#3A1F0F`
- **Font:** Cinzel (titles) + Lora (body)
- **Slots:** Style / background: Layered dusk sky + silhouettes; Composition: Layered illustrated scene; Lettering: Cinzel (titles) + Lora (body); motion: soft rise (fade-up); Subtitles: Italic editorial serif; Accent: Light beam; Pacing: Medium: 3 shots per 10 s (±3.3 s/shot); Transition: Dissolve (crossfade); Camera: Move between stations; Audio: Gamelan/ambient 70 BPM; Aspect: 16:9
- **Blocks:** `textures/rays` (style), `textures/vignette` (style), `transitions/fade` (transition), `transitions/curtain` (transition), `camera/station` (camera), `camera/float` (camera)
- **Add:** `mgp add textures/rays textures/vignette transitions/fade transitions/curtain camera/station camera/float --into index.html`
- **Why:** Pinterest 2026: theatrical expression and local cultural identity.

Ready-to-copy brief:

```text
Make a 1–3 minute 16:9 animated story video in the "Shadow-Puppet Silhouette" style: black silhouettes against a dusk sky; faceless characters. Palette #F6A64B, #120B05, #C8402D, #FCE3B0, #3A1F0F; Cinzel for titles and Lora for body text. Key motion: a lacy gunungan (tree-of-life puppet) spins in the middle of the kelir (screen), then moves aside; two wayang silhouettes enter and move their pointing arms; the blencong (oil lamp) light flickers and casts a soft double shadow. Medium pacing: 3 shots per 10 s (±3.3 s/shot); audio: gamelan/ambient 70 BPM.
```

### NAR-07

**Comic Panels** (Panel Komik). The story flows from panel to panel, speech balloons, halftone.

- **Use:** Use for serialized stories, casual education, series. Avoid for formal documents.
- **Duration:** 1–3 min · **Aspect:** 16:9
- **Key motion:** comic panels slide in one by one; a speech balloon pops elastically, then a BRAK! (BAM!) burst shakes the screen; the page moves to a splash panel with spinning rays
- **Palette:** `#FFFDF5` `#111111` `#FFD23F` `#EE4266` `#3BCEAC`
- **Font:** Bangers (titles) + Comic Neue (body)
- **Slots:** Style / background: Comic halftone + bold lines; Composition: Comic panels; Lettering: Bangers (titles) + Comic Neue (body); motion: big slam; Subtitles: Color block box; Accent: Rating stars; Pacing: Medium-fast: 4 shots per 10 s (±2.5 s/shot, about the average shot length of modern film [CUT]); Transition: Slide up; Camera: Move between stations; Audio: Light pop-punk 130 BPM, 'pow' SFX; Aspect: 16:9
- **Blocks:** `transitions/grid` (transition), `ui/panel-open` (transition), `textures/halftone` (style), `text/stomp` (lettering), `camera/station` (camera)
- **Add:** `mgp add transitions/grid ui/panel-open textures/halftone text/stomp camera/station --into index.html`
- **Why:** Serialized/multi-part series are recommended for deeper narratives in 2026.

Ready-to-copy brief:

```text
Make a 1–3 minute 16:9 animated story video in the "Comic Panels" style: the story flows from panel to panel, speech balloons, halftone. Palette #FFFDF5, #111111, #FFD23F, #EE4266, #3BCEAC; Bangers for titles and Comic Neue for body text. Key motion: comic panels slide in one by one; a speech balloon pops elastically, then a BRAK! (BAM!) burst shakes the screen; the page moves to a splash panel with spinning rays. Medium-fast pacing: 4 shots per 10 s (±2.5 s/shot, about the average shot length of modern film [CUT]); audio: light pop-punk 130 BPM, 'pow' SFX.
```

### NAR-08

**Line Rotoscope** (Rotoscope Garis). Thin lines trace the motion; minimal and elegant.

- **Use:** Use for travel stories, music, personal stories. Avoid for dense infographics.
- **Duration:** 1–3 min · **Aspect:** 16:9
- **Key motion:** a thin-line figure runs with jittering lines (line boil); a colored motion trail follows behind it; a wide leap, then a landing while an accent circle draws itself
- **Palette:** `#F5F5F0` `#151515` `#3A86FF` `#FF006E` `#FFFFFF`
- **Font:** Space Grotesk (titles) + Inter (body)
- **Slots:** Style / background: Clean whiteboard + marker scribbles; Composition: Layered illustrated scene; Lettering: Space Grotesk (titles) + Inter (body); motion: handwritten stroke; Subtitles: Clean at the bottom; Accent: No accent; Pacing: Medium: 3 shots per 10 s (±3.3 s/shot); Transition: Ink bleed; Camera: Static; Audio: Lo-fi 80 BPM; Aspect: 16:9
- **Blocks:** `text/stitch` (lettering), `accents/line-stroke` (lettering), `transitions/ink` (transition), `textures/dither` (style), `camera/float` (camera)
- **Add:** `mgp add text/stitch accents/line-stroke transitions/ink textures/dither camera/float --into index.html`
- **Why:** Rotoscope: animation traced from real footage (since Fleischer 1918-1927).

Ready-to-copy brief:

```text
Make a 1–3 minute 16:9 animated story video in the "Line Rotoscope" style: thin lines trace the motion; minimal and elegant. Palette #F5F5F0, #151515, #3A86FF, #FF006E, #FFFFFF; Space Grotesk for titles and Inter for body text. Key motion: a thin-line figure runs with jittering lines (line boil); a colored motion trail follows behind it; a wide leap, then a landing while an accent circle draws itself. Medium pacing: 3 shots per 10 s (±3.3 s/shot); audio: lo-fi 80 BPM.
```

### NAR-09

**Honest Journal** (Jurnal Jujur). Handheld footage + handwritten notes; the story as it is.

- **Use:** Use for personal stories, behind the scenes, travel. Avoid for highly polished ads.
- **Duration:** 1–3 min · **Aspect:** 9:16
- **Key motion:** handwriting strokes onto lined paper with the pen following; a polaroid drops and gets taped down; star, arrow and heart doodles draw themselves while the page sways handheld
- **Palette:** `#F4EFE6` `#1F1F1F` `#E76F51` `#2A9D8F` `#FFFFFF`
- **Font:** Caveat (titles) + Inter (body)
- **Slots:** Style / background: Full-screen camera footage (placeholder); Composition: Footage + lower third; Lettering: Caveat (titles) + Inter (body); motion: handwritten stroke; Subtitles: Clean at the bottom; Accent: Marker underline; Pacing: Medium-fast: 4 shots per 10 s (±2.5 s/shot, about the average shot length of modern film [CUT]); Transition: Straight cut; Camera: Handheld (light shake); Audio: Acoustic guitar 90 BPM; Aspect: 9:16
- **Blocks:** `camera/shake` (camera), `camera/filmed-screen` (camera), `hands/checklist-card` (card), `ui/note` (card), `hands/text-path` (lettering), `transitions/match-cut` (transition)
- **Add:** `mgp add camera/shake camera/filmed-screen hands/checklist-card ui/note hands/text-path transitions/match-cut --into index.html`
- **Why:** TikTok Next 2026 'Reali-TEA': viewers respond better to honest stories than to polished posts.

Ready-to-copy brief:

```text
Make a 1–3 minute 9:16 animated story video in the "Honest Journal" style: handheld footage + handwritten notes; the story as it is. Palette #F4EFE6, #1F1F1F, #E76F51, #2A9D8F, #FFFFFF; Caveat for titles and Inter for body text. Key motion: handwriting strokes onto lined paper with the pen following; a polaroid drops and gets taped down; star, arrow and heart doodles draw themselves while the page sways handheld. Medium-fast pacing: 4 shots per 10 s (±2.5 s/shot, about the average shot length of modern film [CUT]); audio: acoustic guitar 90 BPM.
```

### NAR-10

**Surreal Cosmic** (Kosmik Surealis). Stars, nebulae, planets; orbiting and dolly camera.

- **Use:** Use for popular science, reflections, fiction. Avoid for formal business content.
- **Duration:** 1–3 min · **Aspect:** 16:9
- **Key motion:** the camera orbits slowly and dollies in through three layers of stars; a ringed planet and a floating island with a glowing door and stairs that rise and fall; a shooting star passes, the spaced-out title tightens
- **Palette:** `#05010F` `#EAE6FF` `#9D4EDD` `#00F5D4` `#14092E`
- **Font:** Syne (titles) + Inter (body)
- **Slots:** Style / background: Stars + nebula; Composition: Layered illustrated scene; Lettering: Syne (titles) + Inter (body); motion: focus from blur; Subtitles: Neon; Accent: Light beam; Pacing: Medium: 3 shots per 10 s (±3.3 s/shot); Transition: Zoom-through; Camera: 3D orbit; Audio: Cosmic ambient 60 BPM; Aspect: 16:9
- **Blocks:** `backgrounds/stars` (style), `backgrounds/orb` (style), `backgrounds/galaxy` (style), `transitions/distortion` (transition), `transitions/distortion` (transition), `camera/dolly-zoom` (camera), `text/particles` (lettering)
- **Add:** `mgp add backgrounds/stars backgrounds/orb backgrounds/galaxy transitions/distortion camera/dolly-zoom text/particles --into index.html`
- **Why:** Pinterest 2026 'Extra Celestial': the cosmic/alien-core aesthetic goes mainstream.

Ready-to-copy brief:

```text
Make a 1–3 minute 16:9 animated story video in the "Surreal Cosmic" style: stars, nebulae, planets; orbiting and dolly camera. Palette #05010F, #EAE6FF, #9D4EDD, #00F5D4, #14092E; Syne for titles and Inter for body text. Key motion: the camera orbits slowly and dollies in through three layers of stars; a ringed planet and a floating island with a glowing door and stairs that rise and fall; a shooting star passes, the spaced-out title tightens. Medium pacing: 3 shots per 10 s (±3.3 s/shot); audio: cosmic ambient 60 BPM.
```

## 4. Ads / brand promo (ADS)

Product/event/brand promos of 6-60 s, logo reveals, CTA.

### ADS-01

**Kinetic Logo Sting** (Logo Sting Kinetik). A logo that forms in 3-6 s, a flash, a wordmark.

- **Use:** Use for channel intros/outros, ad endings, brand identity. Avoid for the opening of social ads (open with the product).
- **Duration:** 3–6 s · **Aspect:** 16:9
- **Key motion:** shape pieces fly in and merge into the logo; a white flash and a particle burst; the wordmark tightens, then a light glint sweeps across it
- **Palette:** `#0A0A0A` `#FFFFFF` `#00E0A4` `#FF3D7F` `#161616`
- **Font:** Montserrat (titles) + Inter (body)
- **Slots:** Style / background: One loud full-screen color; Composition: Logo + wordmark; Lettering: Montserrat (titles) + Inter (body); motion: letter-by-letter bounce; Subtitles: No subtitles; Accent: Progress ring; Pacing: Slow: 2 shots per 10 s (±5 s/shot); Transition: Flash / light leak; Camera: Slow push-in; Audio: 2-4 s sting + riser; Aspect: 16:9
- **Blocks:** `logos/sting` (logo), `logos/outro` (logo), `logos/board-intro` (logo), `logos/wordmark-tiles` (logo), `transitions/flash` (transition), `accents/light-sweep` (accent)
- **Add:** `mgp add logos/sting logos/outro logos/board-intro logos/wordmark-tiles transitions/flash accents/light-sweep --into index.html`
- **Why:** Logo animation for intros/outros and brand recall; Canva has a permanent Intro/Outro category.

Ready-to-copy brief:

```text
Make a 3–6 second 16:9 ad video in the "Kinetic Logo Sting" style: a logo that forms in 3-6 s, a flash, a wordmark. Palette #0A0A0A, #FFFFFF, #00E0A4, #FF3D7F, #161616; Montserrat for titles and Inter for body text. Key motion: shape pieces fly in and merge into the logo; a white flash and a particle burst; the wordmark tightens, then a light glint sweeps across it. Slow pacing: 2 shots per 10 s (±5 s/shot); audio: 2-4 s sting + riser.
```

### ADS-02

**3D Product Spin** (Produk Putar 3D). The product spins in a studio, details highlighted.

- **Use:** Use for e-commerce, gadgets, packaging. Avoid for services without a physical product.
- **Duration:** 15–30 s (+ 6 s version) · **Aspect:** 16:9
- **Key motion:** a can spins 360° with a wrapping label and moving sheen; reflections and shadow on the studio floor; feature callout lines extend one by one
- **Palette:** `#E9ECEF` `#0B0B0B` `#3A0CA3` `#F72585` `#FFFFFF`
- **Font:** Sora (titles) + Inter (body)
- **Slots:** Style / background: Soft studio gradient; Composition: Centered product; Lettering: Sora (titles) + Inter (body); motion: tightening letter spacing (tracking-in); Subtitles: No subtitles; Accent: Light beam; Pacing: Medium: 3 shots per 10 s (±3.3 s/shot); Transition: Match scale; Camera: 3D orbit; Audio: Premium electronic 110 BPM; Aspect: 16:9
- **Blocks:** `3d/product-spin` (product), `3d/exploded-stack` (product), `titles/cta` (card), `accents/light-sweep` (accent), `transitions/scale` (transition), `camera/push` (camera)
- **Add:** `mgp add 3d/product-spin 3d/exploded-stack titles/cta accents/light-sweep transitions/scale camera/push --into index.html`
- **Why:** 48% of video marketers make video ads; product demos raise purchase likelihood 1.81x.

Ready-to-copy brief:

```text
Make a 15–30 second (+ 6 second version) 16:9 ad video in the "3D Product Spin" style: the product spins in a studio, details highlighted. Palette #E9ECEF, #0B0B0B, #3A0CA3, #F72585, #FFFFFF; Sora for titles and Inter for body text. Key motion: a can spins 360° with a wrapping label and moving sheen; reflections and shadow on the studio floor; feature callout lines extend one by one. Medium pacing: 3 shots per 10 s (±3.3 s/shot); audio: premium electronic 110 BPM.
```

### ADS-03

**Premium Liquid Glass** (Liquid Glass Premium) ★ featured pick. Liquid glass, refraction, soft sheen.

- **Use:** Use for tech, cosmetics, premium fintech. Avoid for down-to-earth/traditional brands.
- **Duration:** 15–30 s (+ 6 s version) · **Aspect:** 16:9
- **Key motion:** liquid glass blobs morph; the brand lettering refracts inside the glass; glints and sparks of light
- **Palette:** `#0E0F1A` `#FFFFFF` `#9AD0EC` `#F0A6CA` `#1C1E30`
- **Font:** Outfit (titles) + Inter (body)
- **Slots:** Style / background: Dark gradient + frosted glass panels; Composition: Centered product; Lettering: Outfit (titles) + Inter (body); motion: focus from blur; Subtitles: No subtitles; Accent: Light beam; Pacing: Medium: 3 shots per 10 s (±3.3 s/shot); Transition: Dissolve (crossfade); Camera: 3D tilt; Audio: Future garage 100 BPM; Aspect: 16:9
- **Blocks:** `ui/device-3d` (style), `ui/liquid-glass` (style), `ui/liquid-glass` (style), `titles/glass-shards` (lettering), `transitions/blur` (transition), `accents/light-sweep` (accent)
- **Add:** `mgp add ui/device-3d ui/liquid-glass titles/glass-shards transitions/blur accents/light-sweep --into index.html`
- **Why:** Liquid glass is a 2026 trend; glassmorphism is used for branding and social ads.

Ready-to-copy brief:

```text
Make a 15–30 second (+ 6 second version) 16:9 ad video in the "Premium Liquid Glass" style: liquid glass, refraction, soft sheen. Palette #0E0F1A, #FFFFFF, #9AD0EC, #F0A6CA, #1C1E30; Outfit for titles and Inter for body text. Key motion: liquid glass blobs morph; the brand lettering refracts inside the glass; glints and sparks of light. Medium pacing: 3 shots per 10 s (±3.3 s/shot); audio: future garage 100 BPM.
```

### ADS-04

**Loud Poster** (Poster Lantang). One color, giant text, hard cuts.

- **Use:** Use for campaigns, announcements, flash promos. Avoid for long explanations.
- **Duration:** 15–30 s (+ 6 s version) · **Aspect:** 16:9
- **Key motion:** hard cuts on the beat; giant letters cropped by the screen edge; the layout changes on every beat
- **Palette:** `#E63946` `#FFFFFF` `#111111` `#F1FAEE` `#B71C2C`
- **Font:** Bebas Neue (titles) + Inter (body)
- **Slots:** Style / background: One loud full-screen color; Composition: Big centered title; Lettering: Bebas Neue (titles) + Inter (body); motion: masked reveal per line; Subtitles: No subtitles; Accent: Pop badge; Pacing: Medium-fast: 4 shots per 10 s (±2.5 s/shot, about the average shot length of modern film [CUT]); Transition: Straight cut; Camera: Static; Audio: Punchy drums 120 BPM; Aspect: 16:9
- **Blocks:** `text/stomp` (lettering), `text/rising-words` (lettering), `titles/cta` (card), `accents/spring-pop` (accent), `transitions/beat-freeze` (transition)
- **Add:** `mgp add text/stomp text/rising-words titles/cta accents/spring-pop transitions/beat-freeze --into index.html`
- **Why:** Bold minimalism: clean but loud.

Ready-to-copy brief:

```text
Make a 15–30 second (+ 6 second version) 16:9 ad video in the "Loud Poster" style: one color, giant text, hard cuts. Palette #E63946, #FFFFFF, #111111, #F1FAEE, #B71C2C; Bebas Neue for titles and Inter for body text. Key motion: hard cuts on the beat; giant letters cropped by the screen edge; the layout changes on every beat. Medium-fast pacing: 4 shots per 10 s (±2.5 s/shot, about the average shot length of modern film [CUT]); audio: punchy drums 120 BPM.
```

### ADS-05

**Event Countdown Promo** (Promo Acara Hitung Mundur). A big countdown, date, location, CTA.

- **Use:** Use for webinars, launches, events, seasonal promos. Avoid for evergreen content.
- **Duration:** 15–30 s (+ 6 s version) · **Aspect:** 16:9
- **Key motion:** number cards flip second by second; date and location chips slide in; a flash at zero, then the call-to-action button bounces and confetti falls
- **Palette:** `#240046` `#FFFFFF` `#FF9E00` `#7B2CBF` `#3C096C`
- **Font:** Bebas Neue (titles) + Montserrat (body)
- **Slots:** Style / background: Soft studio gradient; Composition: Ranking / countdown; Lettering: Bebas Neue (titles) + Montserrat (body); motion: big slam; Subtitles: Lower-third bar; Accent: Counting number; Pacing: Medium-fast: 4 shots per 10 s (±2.5 s/shot, about the average shot length of modern film [CUT]); Transition: Zoom-through; Camera: Slow push-in; Audio: EDM build-up 128 BPM, clock ticks; Aspect: 16:9
- **Blocks:** `data/number-wheel` (accent), `data/counter` (accent), `data/ring` (accent), `text/slot-roll` (lettering), `labels/bold` (card), `backgrounds/beat-pulse` (style), `transitions/zoom-through` (transition)
- **Add:** `mgp add data/number-wheel data/counter data/ring text/slot-roll labels/bold backgrounds/beat-pulse transitions/zoom-through --into index.html`
- **Why:** Canva offers promo templates for apps, products and events.

Ready-to-copy brief:

```text
Make a 15–30 second (+ 6 second version) 16:9 ad video in the "Event Countdown Promo" style: a big countdown, date, location, CTA. Palette #240046, #FFFFFF, #FF9E00, #7B2CBF, #3C096C; Bebas Neue for titles and Montserrat for body text. Key motion: number cards flip second by second; date and location chips slide in; a flash at zero, then the call-to-action button bounces and confetti falls. Medium-fast pacing: 4 shots per 10 s (±2.5 s/shot, about the average shot length of modern film [CUT]); audio: EDM build-up 128 BPM, clock ticks.
```

### ADS-06

**Beat-Sync Flash Sale** (Diskon Kilat Beat-Sync). Fast cuts on the beat, prices that slam in.

- **Use:** Use for retail, flash sales, TikTok Shop. Avoid for calm luxury brands.
- **Duration:** 15–30 s (+ 6 s version) · **Aspect:** 9:16
- **Key motion:** hard cuts and flashes on every beat; the discount percentage slams up; the old price is struck through, then the new price is slammed in and stickers shake
- **Palette:** `#FFD60A` `#000000` `#FF006E` `#FFFFFF` `#FFC300`
- **Font:** Anton (titles) + Inter (body)
- **Slots:** Style / background: One loud full-screen color; Composition: Centered product; Lettering: Anton (titles) + Inter (body); motion: big slam; Subtitles: Bold centered, word by word; Accent: Stamp; Pacing: Fast: 5 shots per 10 s (±2 s/shot); Transition: Fast cut on the beat; Camera: Handheld (light shake); Audio: Phonk/EDM 130-140 BPM; Aspect: 9:16
- **Blocks:** `transitions/beat-freeze` (transition), `transitions/whip-pan` (transition), `accents/beat-burst` (accent), `accents/spring-pop` (accent), `accents/confetti` (accent), `text/letter-shatter` (lettering), `backgrounds/beat-pulse` (style)
- **Add:** `mgp add transitions/beat-freeze transitions/whip-pan accents/beat-burst accents/spring-pop accents/confetti text/letter-shatter backgrounds/beat-pulse --into index.html`
- **Why:** Beat-sync templates are among the most popular on CapCut in 2026; TikTok: the proposition in the first 3 s.

Ready-to-copy brief:

```text
Make a 15–30 second (+ 6 second version) 9:16 ad video in the "Beat-Sync Flash Sale" style: fast cuts on the beat, prices that slam in. Palette #FFD60A, #000000, #FF006E, #FFFFFF, #FFC300; Anton for titles and Inter for body text. Key motion: hard cuts and flashes on every beat; the discount percentage slams up; the old price is struck through, then the new price is slammed in and stickers shake. Fast pacing: 5 shots per 10 s (±2 s/shot); audio: phonk/EDM 130-140 BPM.
```

### ADS-07

**Testimonials & Social Proof** (Testimoni & Bukti Sosial). Review cards, stars, client logos in turn.

- **Use:** Use for services, SaaS, courses, small businesses. Avoid for new product launches without users.
- **Duration:** 15–30 s (+ 6 s version) · **Aspect:** 16:9
- **Key motion:** review cards bounce in and stack up; stars fill one by one and the customer count ticks up; a row of client logos scrolls
- **Palette:** `#F7F3EE` `#1F2933` `#2A9D8F` `#E9C46A` `#FFFFFF`
- **Font:** Poppins (titles) + Inter (body)
- **Slots:** Style / background: Soft pastel + white cards; Composition: Card stack; Lettering: Poppins (titles) + Inter (body); motion: soft rise (fade-up); Subtitles: Clean at the bottom; Accent: Rating stars; Pacing: Medium: 3 shots per 10 s (±3.3 s/shot); Transition: Slide up; Camera: Floating parallax; Audio: Upbeat acoustic 105 BPM; Aspect: 16:9
- **Blocks:** `social/testimonial` (card), `social/testimonial` (card), `social/testimonial` (card), `logos/wall` (card), `data/star-rating` (accent), `transitions/slide` (transition), `camera/float` (camera)
- **Add:** `mgp add social/testimonial logos/wall data/star-rating transitions/slide camera/float --into index.html`
- **Why:** 57% of video marketers make testimonial videos.

Ready-to-copy brief:

```text
Make a 15–30 second (+ 6 second version) 16:9 ad video in the "Testimonials & Social Proof" style: review cards, stars, client logos in turn. Palette #F7F3EE, #1F2933, #2A9D8F, #E9C46A, #FFFFFF; Poppins for titles and Inter for body text. Key motion: review cards bounce in and stack up; stars fill one by one and the customer count ticks up; a row of client logos scrolls. Medium pacing: 3 shots per 10 s (±3.3 s/shot); audio: upbeat acoustic 105 BPM.
```

### ADS-08

**Tactile Gummy** (Gummy Taktil). Glossy jelly shapes, bouncy, sweet pastels.

- **Use:** Use for food/drinks, youth products, cosmetics. Avoid for serious topics.
- **Duration:** 15–30 s (+ 6 s version) · **Aspect:** 9:16
- **Key motion:** glossy jellies bounce with squash and stretch; soft letters pop in, bounce and wobble; the shadow shrinks as the jelly jumps
- **Palette:** `#FFE5EC` `#3A0CA3` `#FF70A6` `#70D6FF` `#FFD670`
- **Font:** Fredoka (titles) + Nunito (body)
- **Slots:** Style / background: Pastel + glossy jelly shapes; Composition: Centered product; Lettering: Fredoka (titles) + Nunito (body); motion: letter-by-letter bounce; Subtitles: Word-by-word karaoke pill; Accent: Pop badge; Pacing: Medium: 3 shots per 10 s (±3.3 s/shot); Transition: Match scale; Camera: Static; Audio: Bubblegum pop 120 BPM, squish SFX; Aspect: 9:16
- **Blocks:** `backgrounds/orb` (style), `backgrounds/orb` (style), `backgrounds/orb` (style), `transitions/rubber` (transition), `accents/spring-pop` (accent), `text/rising-words` (lettering)
- **Add:** `mgp add backgrounds/orb transitions/rubber accents/spring-pop text/rising-words --into index.html`
- **Why:** Pinterest 2026 'Gimme Gummy': textures you can almost feel through the screen, an ASMR-friendly jelly aesthetic.

Ready-to-copy brief:

```text
Make a 15–30 second (+ 6 second version) 9:16 ad video in the "Tactile Gummy" style: glossy jelly shapes, bouncy, sweet pastels. Palette #FFE5EC, #3A0CA3, #FF70A6, #70D6FF, #FFD670; Fredoka for titles and Nunito for body text. Key motion: glossy jellies bounce with squash and stretch; soft letters pop in, bounce and wobble; the shadow shrinks as the jelly jumps. Medium pacing: 3 shots per 10 s (±3.3 s/shot); audio: bubblegum pop 120 BPM, squish SFX.
```

### ADS-09

**Emotional Brand Film** (Brand Film Emosional). Slow, warm, natural light, the brand's values as the message.

- **Use:** Use for CSR campaigns, brand anniversaries, recruitment. Avoid for price promos.
- **Duration:** 60–90 s · **Aspect:** 16:9
- **Key motion:** dusk light and warm light leaks; bokeh drifting slowly; serif lines appear and fade softly
- **Palette:** `#1A1410` `#F5EBDD` `#D4A373` `#6B705C` `#2B211A`
- **Font:** Cormorant Garamond (titles) + Inter (body)
- **Slots:** Style / background: Full-screen camera footage (placeholder); Composition: Archive photos; Lettering: Cormorant Garamond (titles) + Inter (body); motion: soft rise (fade-up); Subtitles: Italic editorial serif; Accent: No accent; Pacing: Medium: 3 shots per 10 s (±3.3 s/shot); Transition: Flash / light leak; Camera: Slow push-in; Audio: Piano + strings 70 BPM; Aspect: 16:9
- **Blocks:** `transitions/light-leak` (transition), `transitions/fade` (transition), `textures/grain` (style), `textures/vignette` (style), `camera/rack-focus` (camera), `text/blur-focus` (lettering), `logos/outro` (logo)
- **Add:** `mgp add transitions/light-leak transitions/fade textures/grain textures/vignette camera/rack-focus text/blur-focus logos/outro --into index.html`
- **Why:** TikTok Next 2026 'Emotional ROI'; Canva 'Drama Club' cinematic storytelling.

Ready-to-copy brief:

```text
Make a 60–90 second 16:9 ad video in the "Emotional Brand Film" style: slow, warm, natural light, the brand's values as the message. Palette #1A1410, #F5EBDD, #D4A373, #6B705C, #2B211A; Cormorant Garamond for titles and Inter for body text. Key motion: dusk light and warm light leaks; bokeh drifting slowly; serif lines appear and fade softly. Medium pacing: 3 shots per 10 s (±3.3 s/shot); audio: piano + strings 70 BPM.
```

### ADS-10

**Creator-Native Ad (UGC)** (Iklan Native Kreator (UGC)). Looks like a creator's post: handheld, bold captions.

- **Use:** Use for TikTok/Reels ads, affiliate, consumer products. Avoid for brands that must stay formal.
- **Duration:** 15–30 s · **Aspect:** 9:16
- **Key motion:** a naturally swaying handheld camera; bold captions appear word by word with the active word lit; stickers pop in, the like button is tapped and hearts float up
- **Palette:** `#101010` `#FFFFFF` `#FE2C55` `#25F4EE` `#1E1E1E`
- **Font:** Montserrat (titles) + Inter (body)
- **Slots:** Style / background: Full-screen camera footage (placeholder); Composition: Footage + lower third; Lettering: Montserrat (titles) + Inter (body); motion: word-by-word appear; Subtitles: White with black outline; Accent: Arrow; Pacing: Medium-fast: 4 shots per 10 s (±2.5 s/shot, about the average shot length of modern film [CUT]); Transition: Straight cut; Camera: Handheld (light shake); Audio: Original audio + quiet trending music; Aspect: 9:16
- **Blocks:** `subtitles/highlight` (subtitles), `social/follow` (card), `social/follow` (card), `camera/shake` (camera), `camera/filmed-screen` (camera), `accents/circle-pointer` (accent)
- **Add:** `mgp add subtitles/highlight social/follow camera/shake camera/filmed-screen accents/circle-pointer --into index.html`
- **Why:** TikTok: look native, sound-on, 9:16; creator-led storytelling performs well; Meta: native Reels with a fast hook.

Ready-to-copy brief:

```text
Make a 15–30 second 9:16 ad video in the "Creator-Native Ad (UGC)" style: looks like a creator's post: handheld, bold captions. Palette #101010, #FFFFFF, #FE2C55, #25F4EE, #1E1E1E; Montserrat for titles and Inter for body text. Key motion: a naturally swaying handheld camera; bold captions appear word by word with the active word lit; stickers pop in, the like button is tapped and hearts float up. Medium-fast pacing: 4 shots per 10 s (±2.5 s/shot, about the average shot length of modern film [CUT]); audio: original audio + quiet trending music.
```

## 5. Talking head + overlay (TLK)

Footage of a person talking (creator, testimonial, podcast, interview) + captions, lower third, zoom, B-roll.

### TLK-01

**Clean YouTube Creator** (Kreator YouTube Bersih). Punch-in zooms, B-roll, clean captions, lower third.

- **Use:** Use for education/opinion channels, informative vlogs. Avoid for videos without face footage.
- **Duration:** clip 30–60 s · full 5–10 min · **Aspect:** 16:9
- **Key motion:** a punch-in zoom cut on every point; the lower third slides in and graphic B-roll appears; a cursor clicks the subscribe button
- **Palette:** `#0F0F0F` `#FFFFFF` `#FF0033` `#3EA6FF` `#272727`
- **Font:** Inter (titles) + Inter (body)
- **Slots:** Style / background: Full-screen camera footage (placeholder); Composition: Footage + lower third; Lettering: Inter (titles) + Inter (body); motion: soft rise (fade-up); Subtitles: Clean at the bottom; Accent: Marker underline; Pacing: Medium-fast: 4 shots per 10 s (±2.5 s/shot, about the average shot length of modern film [CUT]); Transition: Straight cut; Camera: Slow push-in; Audio: Light lo-fi/beat 90 BPM under the voice; Aspect: 16:9
- **Blocks:** `camera/push` (camera), `camera/push` (camera), `social/follow` (card), `social/comment` (card), `subtitles/highlight` (subtitles), `transitions/match-cut` (transition)
- **Add:** `mgp add camera/push social/follow social/comment subtitles/highlight transitions/match-cut --into index.html`
- **Why:** The standard edit package: captions, removed pauses, zooms, B-roll; a clean style suits a broad YouTube audience.

Ready-to-copy brief:

```text
Make a 16:9 talking-head video (30–60 second clip · 5–10 minute full version) in the "Clean YouTube Creator" style: punch-in zooms, B-roll, clean captions, lower third. Palette #0F0F0F, #FFFFFF, #FF0033, #3EA6FF, #272727; Inter for titles and Inter for body text. Key motion: a punch-in zoom cut on every point; the lower third slides in and graphic B-roll appears; a cursor clicks the subscribe button. Medium-fast pacing: 4 shots per 10 s (±2.5 s/shot, about the average shot length of modern film [CUT]); audio: light lo-fi/beat 90 BPM under the voice.
```

### TLK-02

**Glowing Karaoke Captions** (Caption Karaoke Menyala) ★ featured pick. Word-by-word captions that light up like karaoke.

- **Use:** Use for talking Shorts/Reels, motivational clips. Avoid for calm long-form videos.
- **Duration:** clip 30–60 s · full 5–10 min · **Aspect:** 9:16
- **Key motion:** captions light up word by word like karaoke; the active word grows with a glow; keyword emojis pop in with a bounce
- **Palette:** `#0B0B0B` `#FFFFFF` `#7CFF4F` `#FFE600` `#1A1A1A`
- **Font:** Montserrat (titles) + Montserrat (body)
- **Slots:** Style / background: Full-screen camera footage (placeholder); Composition: Footage + lower third; Lettering: Montserrat (titles) + Montserrat (body); motion: word-by-word appear; Subtitles: Word-by-word karaoke pill; Accent: No accent; Pacing: Medium-fast: 4 shots per 10 s (±2.5 s/shot, about the average shot length of modern film [CUT]); Transition: Straight cut; Camera: Slow push-in; Audio: Soft beat under the voice; Aspect: 9:16
- **Blocks:** `subtitles/karaoke-pill` (subtitles), `subtitles/heavy` (subtitles), `subtitles/emoji` (subtitles), `camera/push` (camera), `ui/micro` (transition)
- **Add:** `mgp add subtitles/karaoke-pill subtitles/heavy subtitles/emoji camera/push ui/micro --into index.html`
- **Why:** Word-synced captions are a dominant theme of 2026 creator tools.

Ready-to-copy brief:

```text
Make a 9:16 talking-head video (30–60 second clip · 5–10 minute full version) in the "Glowing Karaoke Captions" style: word-by-word captions that light up like karaoke. Palette #0B0B0B, #FFFFFF, #7CFF4F, #FFE600, #1A1A1A; Montserrat for titles and Montserrat for body text. Key motion: captions light up word by word like karaoke; the active word grows with a glow; keyword emojis pop in with a bounce. Medium-fast pacing: 4 shots per 10 s (±2.5 s/shot, about the average shot length of modern film [CUT]); audio: soft beat under the voice.
```

### TLK-03

**Split Podcast Clip** (Klip Podcast Split). Two speakers side by side + an audio waveform.

- **Use:** Use for podcasts, discussions, two-person interviews. Avoid for solo monologues.
- **Duration:** clip 30–60 s · full 5–10 min · **Aspect:** 16:9
- **Key motion:** two speaker panels take turns being active with a glowing frame; the audio waveform moves with the speaker; a REC badge blinks
- **Palette:** `#121212` `#FFFFFF` `#FF7A00` `#8A5CF6` `#1E1E1E`
- **Font:** Space Grotesk (titles) + Inter (body)
- **Slots:** Style / background: Cinematic dark + grain + vignette; Composition: Side-by-side split screen; Lettering: Space Grotesk (titles) + Inter (body); motion: soft rise (fade-up); Subtitles: Word-by-word color highlight; Accent: Audio waveform; Pacing: Medium-fast: 4 shots per 10 s (±2.5 s/shot, about the average shot length of modern film [CUT]); Transition: Straight cut; Camera: Static; Audio: Original audio, 3 s opening jingle; Aspect: 16:9
- **Blocks:** `labels/cardless` (card), `labels/clean` (card), `backgrounds/equalizer` (style), `transitions/before-after` (transition), `subtitles/highlight` (subtitles)
- **Add:** `mgp add labels/cardless labels/clean backgrounds/equalizer transitions/before-after subtitles/highlight --into index.html`
- **Why:** Split screen is among the formats named as standing out in 2026.

Ready-to-copy brief:

```text
Make a 16:9 talking-head video (30–60 second clip · 5–10 minute full version) in the "Split Podcast Clip" style: two speakers side by side + an audio waveform. Palette #121212, #FFFFFF, #FF7A00, #8A5CF6, #1E1E1E; Space Grotesk for titles and Inter for body text. Key motion: two speaker panels take turns being active with a glowing frame; the audio waveform moves with the speaker; a REC badge blinks. Medium-fast pacing: 4 shots per 10 s (±2.5 s/shot, about the average shot length of modern film [CUT]); audio: original audio, 3 s opening jingle.
```

### TLK-04

**Documentary Interview** (Wawancara Dokumenter). Elegant lower third, warm colors, calm cuts.

- **Use:** Use for profiles, expert testimonials, documentaries. Avoid for fast/hype content.
- **Duration:** clip 30–60 s · full 5–10 min · **Aspect:** 16:9
- **Key motion:** a slow camera push with warm bokeh; a gold line draws itself, then a serif name rises in; a quote fades in slowly in the letterbox
- **Palette:** `#1C1A17` `#F4EFE6` `#B08D57` `#5E6472` `#2A2723`
- **Font:** Playfair Display (titles) + Inter (body)
- **Slots:** Style / background: Full-screen camera footage (placeholder); Composition: Footage + lower third; Lettering: Playfair Display (titles) + Inter (body); motion: masked reveal per line; Subtitles: Italic editorial serif; Accent: No accent; Pacing: Medium: 3 shots per 10 s (±3.3 s/shot); Transition: Dissolve (crossfade); Camera: Floating parallax; Audio: Soft piano 70 BPM; Aspect: 16:9
- **Blocks:** `labels/cardless` (card), `labels/cardless` (card), `labels/cardless` (card), `camera/rack-focus` (camera), `camera/float` (camera), `textures/grain` (style), `transitions/fade` (transition)
- **Add:** `mgp add labels/cardless camera/rack-focus camera/float textures/grain transitions/fade --into index.html`
- **Why:** Documentaries cut interview clips under the narration.

Ready-to-copy brief:

```text
Make a 16:9 talking-head video (30–60 second clip · 5–10 minute full version) in the "Documentary Interview" style: elegant lower third, warm colors, calm cuts. Palette #1C1A17, #F4EFE6, #B08D57, #5E6472, #2A2723; Playfair Display for titles and Inter for body text. Key motion: a slow camera push with warm bokeh; a gold line draws itself, then a serif name rises in; a quote fades in slowly in the letterbox. Medium pacing: 3 shots per 10 s (±3.3 s/shot); audio: soft piano 70 BPM.
```

### TLK-05

**Customer Testimonial** (Testimoni Pelanggan). Customer footage + quote card + rating.

- **Use:** Use for services, courses, B2B. Avoid for entertainment content.
- **Duration:** clip 30–60 s · full 5–10 min · **Aspect:** 16:9
- **Key motion:** the customer photo bounces in; the quote types out letter by letter; stars fill, then the rating and lower third appear
- **Palette:** `#F2F7F5` `#14213D` `#2EC4B6` `#FCA311` `#FFFFFF`
- **Font:** Poppins (titles) + Inter (body)
- **Slots:** Style / background: Full-screen camera footage (placeholder); Composition: Footage + lower third; Lettering: Poppins (titles) + Inter (body); motion: soft rise (fade-up); Subtitles: Clean at the bottom; Accent: Rating stars; Pacing: Medium: 3 shots per 10 s (±3.3 s/shot); Transition: Slide up; Camera: Slow push-in; Audio: Warm acoustic 100 BPM; Aspect: 16:9
- **Blocks:** `social/testimonial` (card), `labels/clean` (card), `data/star-rating` (accent), `text/rising-words` (lettering), `transitions/slide` (transition)
- **Add:** `mgp add social/testimonial labels/clean data/star-rating text/rising-words transitions/slide --into index.html`
- **Why:** 57% of video marketers make testimonials; 51% of marketers make live action the most.

Ready-to-copy brief:

```text
Make a 16:9 talking-head video (30–60 second clip · 5–10 minute full version) in the "Customer Testimonial" style: customer footage + quote card + rating. Palette #F2F7F5, #14213D, #2EC4B6, #FCA311, #FFFFFF; Poppins for titles and Inter for body text. Key motion: the customer photo bounces in; the quote types out letter by letter; stars fill, then the rating and lower third appear. Medium pacing: 3 shots per 10 s (±3.3 s/shot); audio: warm acoustic 100 BPM.
```

### TLK-06

**Newsroom** (Ruang Berita). Lower-third bar, scrolling ticker, LIVE badge.

- **Use:** Use for internal news updates, announcements, weekly recaps. Avoid for casual personal stories.
- **Duration:** clip 30–60 s · full 5–10 min · **Aspect:** 16:9
- **Key motion:** the LIVE badge pulses and the clock runs; the title bar sweeps in and swaps the headline; the news ticker scrolls continuously
- **Palette:** `#0A1F44` `#FFFFFF` `#E10600` `#F5C400` `#12305E`
- **Font:** Oswald (titles) + Inter (body)
- **Slots:** Style / background: Full-screen camera footage (placeholder); Composition: Footage + lower third; Lettering: Oswald (titles) + Inter (body); motion: tightening letter spacing (tracking-in); Subtitles: Lower-third bar; Accent: Pop badge; Pacing: Medium: 3 shots per 10 s (±3.3 s/shot); Transition: Side push; Camera: Static; Audio: News bed 120 BPM; Aspect: 16:9
- **Blocks:** `labels/news-ticker` (card), `labels/bold` (card), `labels/bold` (card), `transitions/slide` (transition), `accents/spring-pop` (accent)
- **Add:** `mgp add labels/news-ticker labels/bold transitions/slide accents/spring-pop --into index.html`
- **Why:** Broadcast (news/TV) is one of the classic domains of motion graphics.

Ready-to-copy brief:

```text
Make a 16:9 talking-head video (30–60 second clip · 5–10 minute full version) in the "Newsroom" style: lower-third bar, scrolling ticker, LIVE badge. Palette #0A1F44, #FFFFFF, #E10600, #F5C400, #12305E; Oswald for titles and Inter for body text. Key motion: the LIVE badge pulses and the clock runs; the title bar sweeps in and swaps the headline; the news ticker scrolls continuously. Medium pacing: 3 shots per 10 s (±3.3 s/shot); audio: news bed 120 BPM.
```

### TLK-07

**Presenter + Content Panel** (Presenter + Panel Materi). The presenter in a corner, the material/slides in the main panel.

- **Use:** Use for courses, short webinars, internal training. Avoid for emotional content.
- **Duration:** clip 30–60 s · full 5–10 min · **Aspect:** 16:9
- **Key motion:** the content slide rises in; points appear one by one with a check mark and a highlight; the presenter sits in a corner bubble with a progress ring
- **Palette:** `#F5F7FA` `#1B2430` `#3B82F6` `#F97316` `#FFFFFF`
- **Font:** Poppins (titles) + Inter (body)
- **Slots:** Style / background: Light UI background + app windows; Composition: Text left, visual right; Lettering: Poppins (titles) + Inter (body); motion: soft rise (fade-up); Subtitles: Clean at the bottom; Accent: Arrow; Pacing: Medium-fast: 4 shots per 10 s (±2.5 s/shot, about the average shot length of modern film [CUT]); Transition: Slide up; Camera: Static; Audio: No music / faint ambient; Aspect: 16:9
- **Blocks:** `ui/spring-sheet` (card), `data/spec-list` (card), `camera/zoom-ui` (camera), `ui/panel-open` (transition), `accents/circle-pointer` (accent)
- **Add:** `mgp add ui/spring-sheet data/spec-list camera/zoom-ui ui/panel-open accents/circle-pointer --into index.html`
- **Why:** Educational video is among what businesses make most regularly; signaling + spatial contiguity.

Ready-to-copy brief:

```text
Make a 16:9 talking-head video (30–60 second clip · 5–10 minute full version) in the "Presenter + Content Panel" style: the presenter in a corner, the material/slides in the main panel. Palette #F5F7FA, #1B2430, #3B82F6, #F97316, #FFFFFF; Poppins for titles and Inter for body text. Key motion: the content slide rises in; points appear one by one with a check mark and a highlight; the presenter sits in a corner bubble with a progress ring. Medium-fast pacing: 4 shots per 10 s (±2.5 s/shot, about the average shot length of modern film [CUT]); audio: no music / faint ambient.
```

### TLK-08

**Reaction & Commentary** (Reaksi & Komentar). The source (post/clip) next to the commentator's face.

- **Use:** Use for trend commentary, news reactions, reviews. Avoid for confidential/copyrighted material without permission.
- **Duration:** clip 30–60 s · full 5–10 min · **Aspect:** 9:16
- **Key motion:** the source post slowly zooms in; the commentator's face reacts in surprise with raised eyebrows; emojis bounce in and the text "SERIUS?!" (SERIOUSLY?!) pulses
- **Palette:** `#000000` `#FFFFFF` `#FFDD00` `#FF2E63` `#151515`
- **Font:** Anton (titles) + Inter (body)
- **Slots:** Style / background: Cinematic dark + grain + vignette; Composition: Side-by-side split screen; Lettering: Anton (titles) + Inter (body); motion: word-by-word appear; Subtitles: White with black outline; Accent: Drawn circle; Pacing: Medium-fast: 4 shots per 10 s (±2.5 s/shot, about the average shot length of modern film [CUT]); Transition: Straight cut; Camera: Slow push-in; Audio: Original audio + stinger; Aspect: 9:16
- **Blocks:** `transitions/before-after` (transition), `social/post-card` (card), `social/post-card` (card), `social/comment` (card), `accents/circle-pointer` (accent), `accents/feather-highlight` (accent)
- **Add:** `mgp add transitions/before-after social/post-card social/comment accents/circle-pointer accents/feather-highlight --into index.html`
- **Why:** Split-screen commentary is named as a standout format of 2026.

Ready-to-copy brief:

```text
Make a 9:16 talking-head video (30–60 second clip · 5–10 minute full version) in the "Reaction & Commentary" style: the source (post/clip) next to the commentator's face. Palette #000000, #FFFFFF, #FFDD00, #FF2E63, #151515; Anton for titles and Inter for body text. Key motion: the source post slowly zooms in; the commentator's face reacts in surprise with raised eyebrows; emojis bounce in and the text "SERIUS?!" (SERIOUSLY?!) pulses. Medium-fast pacing: 4 shots per 10 s (±2.5 s/shot, about the average shot length of modern film [CUT]); audio: original audio + stinger.
```

### TLK-09

**Thought-Leadership Webinar** (Webinar Thought Leadership). Title card, clean lower third, concise slides.

- **Use:** Use for B2B webinars, keynotes, conference cuts. Avoid for fast-paced youth content.
- **Duration:** 60–90 s cut from a 30–60 min session · **Aspect:** 16:9
- **Key motion:** the title card opens with a line sweep; a bar chart grows on the slide with a small camera view beside it; the lower third and a Q&A chip appear
- **Palette:** `#0B2545` `#FFFFFF` `#13C4A3` `#EEF4ED` `#134074`
- **Font:** Montserrat (titles) + Inter (body)
- **Slots:** Style / background: Full-screen camera footage (placeholder); Composition: Footage + lower third; Lettering: Montserrat (titles) + Inter (body); motion: tightening letter spacing (tracking-in); Subtitles: Lower-third bar; Accent: No accent; Pacing: Medium: 3 shots per 10 s (±3.3 s/shot); Transition: Dissolve (crossfade); Camera: Floating parallax; Audio: Corporate ambient 90 BPM; Aspect: 16:9
- **Blocks:** `labels/clean` (card), `titles/calm` (card), `text/tight-tracking` (lettering), `transitions/fade` (transition), `camera/float` (camera)
- **Add:** `mgp add labels/clean titles/calm text/tight-tracking transitions/fade camera/float --into index.html`
- **Why:** Wistia 2026: thought leadership and product demos lead the webinar formats.

Ready-to-copy brief:

```text
Make a 16:9 talking-head video (a 60–90 second cut from a 30–60 minute session) in the "Thought-Leadership Webinar" style: title card, clean lower third, concise slides. Palette #0B2545, #FFFFFF, #13C4A3, #EEF4ED, #134074; Montserrat for titles and Inter for body text. Key motion: the title card opens with a line sweep; a bar chart grows on the slide with a small camera view beside it; the lower third and a Q&A chip appear. Medium pacing: 3 shots per 10 s (±3.3 s/shot); audio: corporate ambient 90 BPM.
```

### TLK-10

**Daily Vlog** (Vlog Harian). Handheld, timestamps, stickers, quick whips.

- **Use:** Use for day-in-the-life, business trips, behind the scenes. Avoid for formal reports.
- **Duration:** clip 30–60 s · full 5–10 min · **Aspect:** 9:16
- **Key motion:** a swaying handheld selfie camera; whip pans between locations (morning, cafe, office); timestamps and stickers bounce in
- **Palette:** `#FFFFFF` `#1A1A1A` `#FF8FAB` `#FFD166` `#F7F7F7`
- **Font:** Caveat (titles) + Inter (body)
- **Slots:** Style / background: Full-screen camera footage (placeholder); Composition: Footage + lower third; Lettering: Caveat (titles) + Inter (body); motion: handwritten stroke; Subtitles: Color block box; Accent: Tape; Pacing: Fast: 5 shots per 10 s (±2 s/shot); Transition: Whip pan blur; Camera: Handheld (light shake); Audio: Indie pop 115 BPM; Aspect: 9:16
- **Blocks:** `camera/shake` (camera), `transitions/whip-pan` (camera), `transitions/whip-pan` (transition), `labels/hud-camera` (card), `subtitles/emoji` (subtitles)
- **Add:** `mgp add camera/shake transitions/whip-pan labels/hud-camera subtitles/emoji --into index.html`
- **Why:** Serialized 'day-in-the-life' formats are recommended for 2026; mini-vlog templates are popular on CapCut.

Ready-to-copy brief:

```text
Make a 9:16 talking-head video (30–60 second clip · 5–10 minute full version) in the "Daily Vlog" style: handheld, timestamps, stickers, quick whips. Palette #FFFFFF, #1A1A1A, #FF8FAB, #FFD166, #F7F7F7; Caveat for titles and Inter for body text. Key motion: a swaying handheld selfie camera; whip pans between locations (morning, cafe, office); timestamps and stickers bounce in. Fast pacing: 5 shots per 10 s (±2 s/shot); audio: indie pop 115 BPM.
```

## 6. Vertical social short (SHO)

9:16 for TikTok/Reels/Shorts: hook in 1-3 s, bold captions, works with the sound off.

### SHO-01

**3-Second Text Hook** (Hook Teks 3 Detik) ★ featured pick. A giant hook line in the first 3 s, then fast content.

- **Use:** Use for any informative short. Avoid for videos without a clear core message.
- **Duration:** 15–30 s · **Aspect:** 9:16
- **Key motion:** hook words slam in one by one with zoom and screen shake; point cards 1 and 2 spring in; a save icon bounces, then a "Part 2 tomorrow" call to action appears
- **Palette:** `#0D0D0D` `#FFFFFF` `#FFE600` `#FF3B30` `#1A1A1A`
- **Font:** Anton (titles) + Inter (body)
- **Slots:** Style / background: One bold full-screen color; Composition: Big centered title; Lettering: Anton (titles) + Inter (body); motion: big slam; Subtitles: Bold centered, word by word; Accent: Arrow; Pacing: Fast-medium: 4 shots per 10 s (±2.5 s/shot, about the average shot length of modern films [CUT]); Transition: Hard cut; Camera: Slow push-in; Audio: Trending beat 120 BPM, hit on the hook; Aspect: 9:16
- **Blocks:** `text/stomp` (lettering), `text/letter-shatter` (lettering), `subtitles/stomp` (subtitles), `camera/push` (camera), `transitions/beat-freeze` (transition)
- **Add:** `mgp add text/stomp text/letter-shatter subtitles/stomp camera/push transitions/beat-freeze --into index.html`
- **Why:** TikTok: state the proposition in the first 3 s, hook within 6 s; Meta: the message must land without sound.

Ready-to-copy brief:

```text
Make a 15–30 second 9:16 vertical short in the "3-Second Text Hook" style: a giant hook line in the first 3 s, then fast content. Palette #0D0D0D, #FFFFFF, #FFE600, #FF3B30, #1A1A1A; Anton for titles and Inter for body text. Key motion: hook words slam in one by one with zoom and screen shake; point cards 1 and 2 spring in; a save icon bounces, then a "Part 2 tomorrow" call to action appears. Fast-medium pacing: 4 shots per 10 s (±2.5 s/shot, about the average shot length of modern films [CUT]); audio: trending beat 120 BPM, hit on the hook.
```

### SHO-02

**Faceless Quick Facts** (Fakta Cepat Faceless). Images/photos + AI or recorded narration + outlined captions.

- **Use:** Use for fun facts, what-ifs, quick science. Avoid for personal content.
- **Duration:** 15–45 s · **Aspect:** 9:16
- **Key motion:** illustration panels slowly zoom and pan like Ken Burns; a big number counts up, then text gets a scribbled underline; fact cards slide left with word-by-word glowing subtitles
- **Palette:** `#111827` `#FFFFFF` `#22D3EE` `#F472B6` `#1F2937`
- **Font:** Montserrat (titles) + Inter (body)
- **Slots:** Style / background: Cinematic dark + grain + vignette; Composition: Archive photo; Lettering: Montserrat (titles) + Inter (body); motion: word-by-word reveal; Subtitles: White with black outline; Accent: Counting number; Pacing: Fast: 5 shots per 10 s (±2 s/shot); Transition: Zoom-through; Camera: Ken Burns (zoom + photo pan); Audio: Mystery beat 110 BPM; Aspect: 9:16
- **Blocks:** `subtitles/highlight` (subtitles), `subtitles/camera-follow` (subtitles), `camera/push` (camera), `transitions/zoom-through` (transition), `transitions/whip-pan` (transition), `data/counter` (accent)
- **Add:** `mgp add subtitles/highlight subtitles/camera-follow camera/push transitions/zoom-through transitions/whip-pan data/counter --into index.html`
- **Why:** The fun-fact/what-if format is the most searched faceless entry point; animation is what sets it apart.

Ready-to-copy brief:

```text
Make a 15–45 second 9:16 vertical short in the "Faceless Quick Facts" style: images/photos + AI or recorded narration + outlined captions. Palette #111827, #FFFFFF, #22D3EE, #F472B6, #1F2937; Montserrat for titles and Inter for body text. Key motion: illustration panels slowly zoom and pan like Ken Burns; a big number counts up, then text gets a scribbled underline; fact cards slide left with word-by-word glowing subtitles. Fast pacing: 5 shots per 10 s (±2 s/shot); audio: mystery beat 110 BPM.
```

### SHO-03

**Beat Photo Dump** (Photo Dump Beat). Photos switch fast on the beat.

- **Use:** Use for event recaps, travel, catalogs. Avoid for detailed explanations.
- **Duration:** 15–45 s · **Aspect:** 9:16
- **Key motion:** polaroid photos drop and pile up right on the beat; each photo rotates randomly with a shadow and a date stamp; the screen flashes on every beat, with a beat meter
- **Palette:** `#FAFAFA` `#111111` `#FF6F59` `#43AA8B` `#FFFFFF`
- **Font:** DM Serif Display (titles) + Inter (body)
- **Slots:** Style / background: Soft pastel + white cards; Composition: Cutout collage; Lettering: DM Serif Display (titles) + Inter (body); motion: soft fade-up; Subtitles: No subtitles; Accent: Tape; Pacing: Fast: 5 shots per 10 s (±2 s/shot); Transition: Fast cuts on the beat; Camera: Handheld (light shake); Audio: Trending song 120-130 BPM; Aspect: 9:16
- **Blocks:** `gallery/path-carousel` (gallery), `gallery/shuffle-stack` (gallery), `transitions/beat-freeze` (transition), `transitions/flash` (transition), `accents/beat-burst` (accent)
- **Add:** `mgp add gallery/path-carousel gallery/shuffle-stack transitions/beat-freeze transitions/flash accents/beat-burst --into index.html`
- **Why:** Photo dumps are among the most popular CapCut templates in 2026.

Ready-to-copy brief:

```text
Make a 15–45 second 9:16 vertical short in the "Beat Photo Dump" style: photos switch fast on the beat. Palette #FAFAFA, #111111, #FF6F59, #43AA8B, #FFFFFF; DM Serif Display for titles and Inter for body text. Key motion: polaroid photos drop and pile up right on the beat; each photo rotates randomly with a shadow and a date stamp; the screen flashes on every beat, with a beat meter. Fast pacing: 5 shots per 10 s (±2 s/shot); audio: trending song 120-130 BPM.
```

### SHO-04

**Moving Carousel** (Carousel Bergerak). 4:5 slides swiped one by one, one point per slide.

- **Use:** Use for Instagram carousels, step-by-step tips, save-worthy material. Avoid for cinematic stories.
- **Duration:** 8–12 slides · **Aspect:** 4:5
- **Key motion:** a finger swipes and slides change with smooth easing; the slide number and a big title appear per point; indicator dots and icons light up on each slide
- **Palette:** `#FDF6EC` `#1E1E24` `#FB8B24` `#5F0F40` `#FFFFFF`
- **Font:** Poppins (titles) + Inter (body)
- **Slots:** Style / background: Soft pastel + white cards; Composition: Card stack; Lettering: Poppins (titles) + Inter (body); motion: soft fade-up; Subtitles: No subtitles; Accent: Pop badge; Pacing: Fast: 5 shots per 10 s (±2 s/shot); Transition: Side push; Camera: Static; Audio: No music / soft music; Aspect: 4:5
- **Blocks:** `ui/slider-rail` (gallery), `ui/tilted-card` (gallery), `ui/spring-sheet` (gallery), `transitions/slide` (transition)
- **Add:** `mgp add ui/slider-rail ui/tilted-card ui/spring-sheet transitions/slide --into index.html`
- **Why:** Metricool 2026: carousels are saved 9x more than single images; carousels +24%.

Ready-to-copy brief:

```text
Make an 8–12 slide 4:5 vertical short in the "Moving Carousel" style: 4:5 slides swiped one by one, one point per slide. Palette #FDF6EC, #1E1E24, #FB8B24, #5F0F40, #FFFFFF; Poppins for titles and Inter for body text. Key motion: a finger swipes and slides change with smooth easing; the slide number and a big title appear per point; indicator dots and icons light up on each slide. Fast pacing: 5 shots per 10 s (±2 s/shot); audio: no music / soft music.
```

### SHO-05

**Top-Bottom Stitch** (Stitch Atas-Bawah). Source clip on top, response below.

- **Use:** Use for duets, stitches, answers to questions. Avoid for videos without a source to compare against.
- **Duration:** 15–45 s · **Aspect:** 9:16
- **Key motion:** the source clip on top plays, then pauses and dims; the dividing line shakes when the turn switches; the response below speaks with boxed word-by-word captions
- **Palette:** `#0F0F14` `#FFFFFF` `#00F2EA` `#FF0050` `#1C1C24`
- **Font:** Inter (titles) + Inter (body)
- **Slots:** Style / background: Cinematic dark + grain + vignette; Composition: Two screens side by side; Lettering: Inter (titles) + Inter (body); motion: word-by-word reveal; Subtitles: Karaoke pill per word; Accent: Hand-drawn circle; Pacing: Fast-medium: 4 shots per 10 s (±2.5 s/shot, about the average shot length of modern films [CUT]); Transition: Hard cut; Camera: Static; Audio: Original sound; Aspect: 9:16
- **Blocks:** `transitions/before-after` (transition), `transitions/before-after` (transition), `subtitles/karaoke-pill` (subtitles), `social/follow` (card)
- **Add:** `mgp add transitions/before-after subtitles/karaoke-pill social/follow --into index.html`
- **Why:** Participatory (co-creation) and split-screen formats stand out on TikTok in 2026.

Ready-to-copy brief:

```text
Make a 15–45 second 9:16 vertical short in the "Top-Bottom Stitch" style: source clip on top, response below. Palette #0F0F14, #FFFFFF, #00F2EA, #FF0050, #1C1C24; Inter for titles and Inter for body text. Key motion: the source clip on top plays, then pauses and dims; the dividing line shakes when the turn switches; the response below speaks with boxed word-by-word captions. Fast-medium pacing: 4 shots per 10 s (±2.5 s/shot, about the average shot length of modern films [CUT]); audio: original sound.
```

### SHO-06

**Top 5 Listicle** (Listicle Top 5). Ranking countdown from 5 to 1.

- **Use:** Use for recommendations, rankings, tips. Avoid for a single message.
- **Duration:** 15–45 s · **Aspect:** 9:16
- **Key motion:** rank numbers 5 to 1 flip like a display board; item cards bounce in and earlier ranks stack into a list; number 1 glows gold with a crown and sparkles
- **Palette:** `#1A1A2E` `#FFFFFF` `#E94560` `#F5B700` `#16213E`
- **Font:** Bebas Neue (titles) + Inter (body)
- **Slots:** Style / background: Smooth studio gradient; Composition: Ranking / countdown; Lettering: Bebas Neue (titles) + Inter (body); motion: big slam; Subtitles: White with black outline; Accent: Counting number; Pacing: Fast: 5 shots per 10 s (±2 s/shot); Transition: Slide up; Camera: Slow push-in; Audio: Rising beat 125 BPM, whoosh on each rank; Aspect: 9:16
- **Blocks:** `text/slot-roll` (lettering), `text/slot-roll` (lettering), `data/number-wheel` (accent), `transitions/scale` (transition)
- **Add:** `mgp add text/slot-roll data/number-wheel transitions/scale --into index.html`
- **Why:** Listicles/countdowns stay popular in faceless content.

Ready-to-copy brief:

```text
Make a 15–45 second 9:16 vertical short in the "Top 5 Listicle" style: ranking countdown from 5 to 1. Palette #1A1A2E, #FFFFFF, #E94560, #F5B700, #16213E; Bebas Neue for titles and Inter for body text. Key motion: rank numbers 5 to 1 flip like a display board; item cards bounce in and earlier ranks stack into a list; number 1 glows gold with a crown and sparkles. Fast pacing: 5 shots per 10 s (±2 s/shot); audio: rising beat 125 BPM, whoosh on each rank.
```

### SHO-07

**Text Story Time** (Story Time Teks). Background footage + story text in white boxes.

- **Use:** Use for personal experiences, short stories. Avoid for dense data.
- **Duration:** 15–45 s · **Aspect:** 9:16
- **Key motion:** a blurred background sways gently like handheld footage; white text boxes grow line by line as if typed; reaction stickers pop in
- **Palette:** `#2B2D42` `#FFFFFF` `#EF233C` `#8D99AE` `#EDF2F4`
- **Font:** Inter (titles) + Inter (body)
- **Slots:** Style / background: Full-screen camera footage (placeholder); Composition: Footage + lower third; Lettering: Inter (titles) + Inter (body); motion: typewriter; Subtitles: Color block box; Accent: No accent; Pacing: Fast-medium: 4 shots per 10 s (±2.5 s/shot, about the average shot length of modern films [CUT]); Transition: Crossfade; Camera: Floating parallax; Audio: Slow trending music; Aspect: 9:16
- **Blocks:** `text/typewriter` (lettering), `text/line-swap` (lettering), `subtitles/editorial` (subtitles), `camera/float` (camera), `transitions/fade` (transition)
- **Add:** `mgp add text/typewriter text/line-swap subtitles/editorial camera/float transitions/fade --into index.html`
- **Why:** Storytelling is the most common popular format on TikTok; honest stories (Reali-TEA).

Ready-to-copy brief:

```text
Make a 15–45 second 9:16 vertical short in the "Text Story Time" style: background footage + story text in white boxes. Palette #2B2D42, #FFFFFF, #EF233C, #8D99AE, #EDF2F4; Inter for titles and Inter for body text. Key motion: a blurred background sways gently like handheld footage; white text boxes grow line by line as if typed; reaction stickers pop in. Fast-medium pacing: 4 shots per 10 s (±2.5 s/shot, about the average shot length of modern films [CUT]); audio: slow trending music.
```

### SHO-08

**Aesthetic Color Walk** (Color Walk Estetik). A set of single-color clips, cut by color.

- **Use:** Use for lifestyle brands, cities, colorful products. Avoid for informative content.
- **Duration:** 15–45 s · **Aspect:** 9:16
- **Key motion:** clips from one color family change with shape-matching cuts; the camera sways like someone walking; color swatches with hex codes pile up at each cut
- **Palette:** `#FFF1E6` `#3D2C2E` `#F08080` `#F4978E` `#FBC4AB`
- **Font:** Fraunces (titles) + Inter (body)
- **Slots:** Style / background: Soft pastel + white cards; Composition: Cutout collage; Lettering: Fraunces (titles) + Inter (body); motion: tracking-in; Subtitles: No subtitles; Accent: Progress ring; Pacing: Fast: 5 shots per 10 s (±2 s/shot); Transition: Flash / light leak; Camera: Pan between points; Audio: Chill pop 100 BPM; Aspect: 9:16
- **Blocks:** `transitions/match-cut` (transition), `text/colorama` (transition), `gallery/circle-carousel` (gallery), `gallery/cinemagraph` (gallery), `text/tight-tracking` (lettering)
- **Add:** `mgp add transitions/match-cut text/colorama gallery/circle-carousel gallery/cinemagraph text/tight-tracking --into index.html`
- **Why:** The 'Color Walk' format is named as an Instagram creator trend for 2026.

Ready-to-copy brief:

```text
Make a 15–45 second 9:16 vertical short in the "Aesthetic Color Walk" style: a set of single-color clips, cut by color. Palette #FFF1E6, #3D2C2E, #F08080, #F4978E, #FBC4AB; Fraunces for titles and Inter for body text. Key motion: clips from one color family change with shape-matching cuts; the camera sways like someone walking; color swatches with hex codes pile up at each cut. Fast pacing: 5 shots per 10 s (±2 s/shot); audio: chill pop 100 BPM.
```

### SHO-09

**Episodic Series** (Seri Bersambung). PART 1 badge, cliffhanger, glitch ending.

- **Use:** Use for long stories split into parts, serialized education. Avoid for one-off content.
- **Duration:** 15–45 s · **Aspect:** 9:16
- **Key motion:** a PART 1 badge slams onto the screen with a shake; the cliffhanger line is typed in a dark corridor with flickering lights; the text glitches apart into TO BE CONTINUED, then a Part 1/3 bar and a Follow button pulse
- **Palette:** `#0B090A` `#F5F3F4` `#E5383B` `#B1A7A6` `#161A1D`
- **Font:** Oswald (titles) + Inter (body)
- **Slots:** Style / background: Cinematic dark + grain + vignette; Composition: Big centered title; Lettering: Oswald (titles) + Inter (body); motion: masked reveal per line; Subtitles: White with black outline; Accent: Pop badge; Pacing: Fast-medium: 4 shots per 10 s (±2.5 s/shot, about the average shot length of modern films [CUT]); Transition: Glitch; Camera: Slow push-in; Audio: Tension 110 BPM, cliffhanger stinger; Aspect: 9:16
- **Blocks:** `text/line-slide` (lettering), `transitions/glitch` (transition), `transitions/aberration` (transition), `labels/bold` (card), `accents/spring-pop` (accent)
- **Add:** `mgp add text/line-slide transitions/glitch transitions/aberration labels/bold accents/spring-pop --into index.html`
- **Why:** Series/multi-part formats are recommended for deeper narratives, with short clips as teasers.

Ready-to-copy brief:

```text
Make a 15–45 second 9:16 vertical short in the "Episodic Series" style: PART 1 badge, cliffhanger, glitch ending. Palette #0B090A, #F5F3F4, #E5383B, #B1A7A6, #161A1D; Oswald for titles and Inter for body text. Key motion: a PART 1 badge slams onto the screen with a shake; the cliffhanger line is typed in a dark corridor with flickering lights; the text glitches apart into TO BE CONTINUED, then a Part 1/3 bar and a Follow button pulse. Fast-medium pacing: 4 shots per 10 s (±2.5 s/shot, about the average shot length of modern films [CUT]); audio: tension 110 BPM, cliffhanger stinger.
```

### SHO-10

**Before-After Transformation** (Before-After Transformasi). A wipe splits before/after.

- **Use:** Use for renovations, photo edits, work results, repairs. Avoid for content without a visible change.
- **Duration:** 15–45 s · **Aspect:** 9:16
- **Key motion:** a slider wipes from the before state to the after state, then bounces back; a dull room turns bright as lamps switch on and plants sway; Day 1, 4, 7 labels light up following the slider position
- **Palette:** `#FFFFFF` `#111111` `#8338EC` `#FFBE0B` `#F5F5F5`
- **Font:** Archivo Black (titles) + Inter (body)
- **Slots:** Style / background: Full-screen camera footage (placeholder); Composition: Two screens side by side; Lettering: Archivo Black (titles) + Inter (body); motion: big slam; Subtitles: Bold centered, word by word; Accent: Arrow; Pacing: Medium: 3 shots per 10 s (±3.3 s/shot); Transition: Directional wipe; Camera: Static; Audio: Riser + drop 128 BPM; Aspect: 9:16
- **Blocks:** `transitions/before-after` (transition), `transitions/slit-scan` (transition), `transitions/before-after` (style), `text/colorama` (style), `accents/checkmark` (accent)
- **Add:** `mgp add transitions/before-after transitions/slit-scan text/colorama accents/checkmark --into index.html`
- **Why:** AI transformation templates are popular on CapCut in 2026.

Ready-to-copy brief:

```text
Make a 15–45 second 9:16 vertical short in the "Before-After Transformation" style: a wipe splits before/after. Palette #FFFFFF, #111111, #8338EC, #FFBE0B, #F5F5F5; Archivo Black for titles and Inter for body text. Key motion: a slider wipes from the before state to the after state, then bounces back; a dull room turns bright as lamps switch on and plants sway; Day 1, 4, 7 labels light up following the slider position. Medium pacing: 3 shots per 10 s (±3.3 s/shot); audio: riser + drop 128 BPM.
```

## 7. Kinetic typography / lyrics (KIN)

Text as the main animation: quotes, lyrics, manifestos.

### KIN-01

**Word-by-Word Lyrics** (Lirik Kata per Kata) ★ featured pick. Words appear right on the beat, lines alternate.

- **Use:** Use for lyric videos, nasyid, musical poetry. Avoid for long text without music.
- **Duration:** song length (3–4 min) · **Aspect:** 16:9
- **Key motion:** words light up one by one right on the beat; the active word bounces with an underline; old lines rise and shrink, while the background and an equalizer pulse with the beat
- **Palette:** `#0F0E17` `#FFFFFE` `#FF8906` `#F25F4C` `#1F1D2B`
- **Font:** Montserrat (titles) + Montserrat (body)
- **Slots:** Style / background: Cinematic dark + grain + vignette; Composition: Stacked lyric lines; Lettering: Montserrat (titles) + Montserrat (body); motion: word-by-word reveal; Subtitles: No subtitles; Accent: No accent; Pacing: Fast-medium: 4 shots per 10 s (±2.5 s/shot, about the average shot length of modern films [CUT]); Transition: Hard cut; Camera: Slow push-in; Audio: Follows the song; Aspect: 16:9
- **Blocks:** `text/rising-words` (lettering), `text/word-swap` (lettering), `text/line-swap` (lettering), `backgrounds/beat-pulse` (style), `accents/beat-burst` (accent)
- **Add:** `mgp add text/rising-words text/word-swap text/line-swap backgrounds/beat-pulse accents/beat-burst --into index.html`
- **Why:** A lyric video is text synced to music; music videos have the highest weekly reach.

Ready-to-copy brief:

```text
Make a song-length (3–4 min) 16:9 kinetic typography video in the "Word-by-Word Lyrics" style: words appear right on the beat, lines alternate. Palette #0F0E17, #FFFFFE, #FF8906, #F25F4C, #1F1D2B; Montserrat for titles and Montserrat for body text. Key motion: words light up one by one right on the beat; the active word bounces with an underline; old lines rise and shrink, while the background and an equalizer pulse with the beat. Fast-medium pacing: 4 shots per 10 s (±2.5 s/shot, about the average shot length of modern films [CUT]); audio: follows the song.
```

### KIN-02

**Cursive Handwriting** (Tulisan Tangan Kursif). Cursive letters stroke in as if being written.

- **Use:** Use for romantic songs, poetry, personal quotes. Avoid for technical text.
- **Duration:** 30 s – 3 min · **Aspect:** 16:9
- **Key motion:** cursive letters stroke in from the left as if being written; an ink pen follows the tip of the writing; a curling flourish closes the second line
- **Palette:** `#FFF9F2` `#2D2A32` `#C94277` `#5E548E` `#FFFFFF`
- **Font:** Caveat (titles) + Lora (body)
- **Slots:** Style / background: Textured cream paper + torn cutouts; Composition: Stacked lyric lines; Lettering: Caveat (titles) + Lora (body); motion: handwritten stroke; Subtitles: No subtitles; Accent: Marker underline; Pacing: Medium: 3 shots per 10 s (±3.3 s/shot); Transition: Ink bleed; Camera: Floating parallax; Audio: Acoustic 80 BPM; Aspect: 16:9
- **Blocks:** `hands/handwritten-title` (lettering), `hands/text-path` (lettering), `text/stitch` (lettering), `transitions/ink` (transition)
- **Add:** `mgp add hands/handwritten-title hands/text-path text/stitch transitions/ink --into index.html`
- **Why:** Cursive/scribble typography stands out in many lyric videos.

Ready-to-copy brief:

```text
Make a 30 second – 3 minute 16:9 kinetic typography video in the "Cursive Handwriting" style: cursive letters stroke in as if being written. Palette #FFF9F2, #2D2A32, #C94277, #5E548E, #FFFFFF; Caveat for titles and Lora for body text. Key motion: cursive letters stroke in from the left as if being written; an ink pen follows the tip of the writing; a curling flourish closes the second line. Medium pacing: 3 shots per 10 s (±3.3 s/shot); audio: acoustic 80 BPM.
```

### KIN-03

**Swiss Grid** (Swiss Grid). Strict grid, sans-serif, red blocks, precise motion.

- **Use:** Use for brand manifestos, design conferences, moving posters. Avoid for religious or warm content.
- **Duration:** 30 s – 3 min · **Aspect:** 16:9
- **Key motion:** a red block jumps precisely between grid cells; words rise from behind a mask line by line; a blue dot and rule lines snap to the grid
- **Palette:** `#F4F4F0` `#111111` `#E30613` `#1F4E99` `#FFFFFF`
- **Font:** Inter (titles) + Inter (body)
- **Slots:** Style / background: White Swiss grid + red blocks; Composition: Big centered title; Lettering: Inter (titles) + Inter (body); motion: tracking-in; Subtitles: No subtitles; Accent: No accent; Pacing: Fast-medium: 4 shots per 10 s (±2.5 s/shot, about the average shot length of modern films [CUT]); Transition: Grid; Camera: Static; Audio: Minimal techno 122 BPM; Aspect: 16:9
- **Blocks:** `backgrounds/dynamic-grid` (style), `logos/wordmark-tiles` (lettering), `text/line-swap` (lettering), `accents/staggered-grid` (accent), `transitions/grid` (transition)
- **Add:** `mgp add backgrounds/dynamic-grid logos/wordmark-tiles text/line-swap accents/staggered-grid transitions/grid --into index.html`
- **Why:** Minimalist kinetic typography is among the most saved ideas on Pinterest.

Ready-to-copy brief:

```text
Make a 30 second – 3 minute 16:9 kinetic typography video in the "Swiss Grid" style: strict grid, sans-serif, red blocks, precise motion. Palette #F4F4F0, #111111, #E30613, #1F4E99, #FFFFFF; Inter for titles and Inter for body text. Key motion: a red block jumps precisely between grid cells; words rise from behind a mask line by line; a blue dot and rule lines snap to the grid. Fast-medium pacing: 4 shots per 10 s (±2.5 s/shot, about the average shot length of modern films [CUT]); audio: minimal techno 122 BPM.
```

### KIN-04

**Retro Cutout** (Potongan Retro). Cut-paper shapes + bold type, warm 60s palette.

- **Use:** Use for title sequences, festivals, cultural events. Avoid for new tech products.
- **Duration:** 30 s – 3 min · **Aspect:** 16:9
- **Key motion:** sun rays rotate in the back; bold words slide in with a bounce and a paper drop shadow; wavy paper hills move in choppy steps (on twos)
- **Palette:** `#F2A541` `#141414` `#C1292E` `#F1E3C8` `#235789`
- **Font:** Oswald (titles) + Lora (body)
- **Slots:** Style / background: Warm retro poster + halftone; Composition: Big centered title; Lettering: Oswald (titles) + Lora (body); motion: masked reveal per line; Subtitles: No subtitles; Accent: No accent; Pacing: Fast-medium: 4 shots per 10 s (±2.5 s/shot, about the average shot length of modern films [CUT]); Transition: Directional wipe; Camera: Static; Audio: Big band jazz 130 BPM; Aspect: 16:9
- **Blocks:** `text/svg-mask` (lettering), `text/texture-mask` (lettering), `transitions/slide` (transition), `textures/grain` (style)
- **Add:** `mgp add text/svg-mask text/texture-mask transitions/slide textures/grain --into index.html`
- **Why:** Pinterest kinetic typography boards include retro title-sequence style references (Saul Bass-style); used as a style, not to copy a work.

Ready-to-copy brief:

```text
Make a 30 second – 3 minute 16:9 kinetic typography video in the "Retro Cutout" style: cut-paper shapes + bold type, warm 60s palette. Palette #F2A541, #141414, #C1292E, #F1E3C8, #235789; Oswald for titles and Lora for body text. Key motion: sun rays rotate in the back; bold words slide in with a bounce and a paper drop shadow; wavy paper hills move in choppy steps (on twos). Fast-medium pacing: 4 shots per 10 s (±2.5 s/shot, about the average shot length of modern films [CUT]); audio: big band jazz 130 BPM.
```

### KIN-05

**Night Neon** (Neon Malam). Flickering neon text on a purple night.

- **Use:** Use for pop/electronic songs, night events. Avoid for formal content.
- **Duration:** 30 s – 3 min · **Aspect:** 9:16
- **Key motion:** neon tubes flicker, then light up; the glow spreads across a brick wall; wet reflections on the floor and an occasional electric buzz
- **Palette:** `#0A0118` `#F8F7FF` `#FF2BD6` `#00F0FF` `#1A0B33`
- **Font:** Righteous (titles) + Inter (body)
- **Slots:** Style / background: Dark purple night + neon light; Composition: Stacked lyric lines; Lettering: Righteous (titles) + Inter (body); motion: neon flicker; Subtitles: Neon; Accent: Light spotlight; Pacing: Fast-medium: 4 shots per 10 s (±2.5 s/shot, about the average shot length of modern films [CUT]); Transition: Glitch; Camera: Slow push-in; Audio: Synthwave 110 BPM; Aspect: 9:16
- **Blocks:** `subtitles/neon` (subtitles), `subtitles/neon` (subtitles), `labels/neon` (card), `text/shine` (lettering), `textures/flare` (style)
- **Add:** `mgp add subtitles/neon labels/neon text/shine textures/flare --into index.html`
- **Why:** Neon is a common lyric video look; see the neon lyric templates on Canva.

Ready-to-copy brief:

```text
Make a 30 second – 3 minute 9:16 kinetic typography video in the "Night Neon" style: flickering neon text on a purple night. Palette #0A0118, #F8F7FF, #FF2BD6, #00F0FF, #1A0B33; Righteous for titles and Inter for body text. Key motion: neon tubes flicker, then light up; the glow spreads across a brick wall; wet reflections on the floor and an occasional electric buzz. Fast-medium pacing: 4 shots per 10 s (±2.5 s/shot, about the average shot length of modern films [CUT]); audio: synthwave 110 BPM.
```

### KIN-06

**3D Extruded Type** (Tipe Ekstrusi 3D). Thick letters with depth, slowly rotating.

- **Use:** Use for event titles, channel openers, music promos. Avoid for long text.
- **Duration:** 30 s – 3 min · **Aspect:** 16:9
- **Key motion:** thick letters with depth spring in with a bounce; the letters slowly rotate left and right, showing their 3D sides; background spheres float with floor shadows
- **Palette:** `#FFB4A2` `#2B2D42` `#6D597A` `#E56B6F` `#FFCDB2`
- **Font:** Archivo Black (titles) + Inter (body)
- **Slots:** Style / background: Pastel + glossy jelly shapes; Composition: Big centered title; Lettering: Archivo Black (titles) + Inter (body); motion: rotating 3D extrusion; Subtitles: No subtitles; Accent: No accent; Pacing: Medium: 3 shots per 10 s (±3.3 s/shot); Transition: Match scale; Camera: 3D orbit; Audio: Electronic pop 115 BPM; Aspect: 16:9
- **Blocks:** `logos/extrusion` (logo), `text/marquee-3d` (lettering), `titles/wire-portal` (lettering)
- **Add:** `mgp add logos/extrusion text/marquee-3d titles/wire-portal --into index.html`
- **Why:** 3D extruded kinetic typography is one of the looks offered by 2026 lyric tools.

Ready-to-copy brief:

```text
Make a 30 second – 3 minute 16:9 kinetic typography video in the "3D Extruded Type" style: thick letters with depth, slowly rotating. Palette #FFB4A2, #2B2D42, #6D597A, #E56B6F, #FFCDB2; Archivo Black for titles and Inter for body text. Key motion: thick letters with depth spring in with a bounce; the letters slowly rotate left and right, showing their 3D sides; background spheres float with floor shadows. Medium pacing: 3 shots per 10 s (±3.3 s/shot); audio: electronic pop 115 BPM.
```

### KIN-07

**Digital Glitch** (Glitch Digital). RGB-split, scrambled, decoding text.

- **Use:** Use for tech, cyber, electronic music. Avoid for calm or religious content.
- **Duration:** 30 s – 3 min · **Aspect:** 16:9
- **Key motion:** scrambled text resolves into words; RGB channels split and screen slices shift; terminal lines, decode progress and scanlines
- **Palette:** `#050505` `#E6E6E6` `#00FF9C` `#FF0055` `#121212`
- **Font:** Space Mono (titles) + Space Mono (body)
- **Slots:** Style / background: Cinematic dark + grain + vignette; Composition: Big centered title; Lettering: Space Mono (titles) + Space Mono (body); motion: RGB glitch; Subtitles: Typewriter mono; Accent: No accent; Pacing: Fast-medium: 4 shots per 10 s (±2.5 s/shot, about the average shot length of modern films [CUT]); Transition: Glitch; Camera: Handheld (light shake); Audio: Glitch hop 110 BPM; Aspect: 16:9
- **Blocks:** `text/glitch-rgb` (lettering), `text/letter-scramble` (lettering), `text/letter-scramble` (lettering), `transitions/glitch` (transition), `subtitles/glitch` (subtitles), `textures/ascii` (style)
- **Add:** `mgp add text/glitch-rgb text/letter-scramble transitions/glitch subtitles/glitch textures/ascii --into index.html`
- **Why:** Glitch is a common lyric video look.

Ready-to-copy brief:

```text
Make a 30 second – 3 minute 16:9 kinetic typography video in the "Digital Glitch" style: RGB-split, scrambled, decoding text. Palette #050505, #E6E6E6, #00FF9C, #FF0055, #121212; Space Mono for titles and Space Mono for body text. Key motion: scrambled text resolves into words; RGB channels split and screen slices shift; terminal lines, decode progress and scanlines. Fast-medium pacing: 4 shots per 10 s (±2.5 s/shot, about the average shot length of modern films [CUT]); audio: glitch hop 110 BPM.
```

### KIN-08

**Manifesto Quote** (Kutipan Manifesto). Large serif, lines revealed one by one, one word highlighted.

- **Use:** Use for quotes from notable people, company values, reflections. Avoid for fast promos.
- **Duration:** 20–45 s · **Aspect:** 16:9
- **Key motion:** serif lines open one by one from behind a mask; a highlighter sweeps over one word, which then turns white; the camera pushes in slowly and the attribution appears
- **Palette:** `#F5F0E6` `#1C1C1C` `#B5402A` `#4A4E69` `#FFFFFF`
- **Font:** DM Serif Display (titles) + Inter (body)
- **Slots:** Style / background: Textured cream paper + torn cutouts; Composition: Large quote/document; Lettering: DM Serif Display (titles) + Inter (body); motion: masked reveal per line; Subtitles: No subtitles; Accent: Marker underline; Pacing: Medium: 3 shots per 10 s (±3.3 s/shot); Transition: Crossfade; Camera: Slow push-in; Audio: Piano 70 BPM; Aspect: 16:9
- **Blocks:** `text/line-slide` (lettering), `text/highlighter` (lettering), `text/background-words` (lettering), `titles/calm` (card)
- **Add:** `mgp add text/line-slide text/highlighter text/background-words titles/calm --into index.html`
- **Why:** Typography templates for quotes and promos are widely used in social reels.

Ready-to-copy brief:

```text
Make a 20–45 second 16:9 kinetic typography video in the "Manifesto Quote" style: large serif, lines revealed one by one, one word highlighted. Palette #F5F0E6, #1C1C1C, #B5402A, #4A4E69, #FFFFFF; DM Serif Display for titles and Inter for body text. Key motion: serif lines open one by one from behind a mask; a highlighter sweeps over one word, which then turns white; the camera pushes in slowly and the attribution appears. Medium pacing: 3 shots per 10 s (±3.3 s/shot); audio: piano 70 BPM.
```

### KIN-09

**Breathing Variable Font** (Variable Font Bernapas). Letter weight grows and shrinks like breathing.

- **Use:** Use for modern brands, meditation, title transitions. Avoid for news videos.
- **Duration:** 30 s – 3 min · **Aspect:** 16:9
- **Key motion:** letter weight grows and shrinks like a breathing wave; a breath ring expands and contracts; the letter spacing of the second line breathes along, with inhale/exhale labels
- **Palette:** `#E9F5DB` `#132A13` `#4F772D` `#90A955` `#FFFFFF`
- **Font:** Roboto Flex (titles) + Inter (body)
- **Slots:** Style / background: Soft pastel + white cards; Composition: Big centered title; Lettering: Roboto Flex (titles) + Inter (body); motion: breathing font weight (variable font); Subtitles: No subtitles; Accent: No accent; Pacing: Medium: 3 shots per 10 s (±3.3 s/shot); Transition: Crossfade; Camera: Static; Audio: Ambient 70 BPM; Aspect: 16:9
- **Blocks:** `text/variable` (lettering), `text/variable` (lettering), `text/variable` (lettering), `subtitles/heavy` (subtitles)
- **Add:** `mgp add text/variable subtitles/heavy --into index.html`
- **Why:** Kinetic type in 2026 is shifting from busy effects to purposeful motion.

Ready-to-copy brief:

```text
Make a 30 second – 3 minute 16:9 kinetic typography video in the "Breathing Variable Font" style: letter weight grows and shrinks like breathing. Palette #E9F5DB, #132A13, #4F772D, #90A955, #FFFFFF; Roboto Flex for titles and Inter for body text. Key motion: letter weight grows and shrinks like a breathing wave; a breath ring expands and contracts; the letter spacing of the second line breathes along, with inhale/exhale labels. Medium pacing: 3 shots per 10 s (±3.3 s/shot); audio: ambient 70 BPM.
```

### KIN-10

**Retro Halftone Poster** (Poster Retro Halftone). Vintage print poster, halftone dots, stamps.

- **Use:** Use for community events, indie music, history. Avoid for premium products.
- **Duration:** 30 s – 3 min · **Aspect:** 16:9
- **Key motion:** a halftone-dot sun pulses with rotating rays; the title drops and bounces with two-color misregistered ink; an EDITION 2026 stamp slams down
- **Palette:** `#F4E1C1` `#2E1F27` `#E4572E` `#29335C` `#F3A712`
- **Font:** Alfa Slab One (titles) + Lora (body)
- **Slots:** Style / background: Warm retro poster + halftone; Composition: Big centered title; Lettering: Alfa Slab One (titles) + Lora (body); motion: rubber stamp; Subtitles: No subtitles; Accent: Stamp; Pacing: Medium: 3 shots per 10 s (±3.3 s/shot); Transition: Grid; Camera: Ken Burns (zoom + photo pan); Audio: Surf rock 140 BPM; Aspect: 16:9
- **Blocks:** `textures/halftone` (style), `textures/dither` (style), `transitions/halftone` (transition), `text/split-flap` (lettering)
- **Add:** `mgp add textures/halftone textures/dither transitions/halftone text/split-flap --into index.html`
- **Why:** The retro poster is a common lyric video look.

Ready-to-copy brief:

```text
Make a 30 second – 3 minute 16:9 kinetic typography video in the "Retro Halftone Poster" style: vintage print poster, halftone dots, stamps. Palette #F4E1C1, #2E1F27, #E4572E, #29335C, #F3A712; Alfa Slab One for titles and Lora for body text. Key motion: a halftone-dot sun pulses with rotating rays; the title drops and bounces with two-color misregistered ink; an EDITION 2026 stamp slams down. Medium pacing: 3 shots per 10 s (±3.3 s/shot); audio: surf rock 140 BPM.
```

## 8. Data / infographic / maps (DAT)

Numbers, charts, maps and timelines in motion.

### DAT-01

**Bar Chart Race** (Bar Chart Race) ★ featured pick. Bars race over time, numbers roll.

- **Use:** Use for comparing rankings over time. Avoid for data without a time dimension; overused.
- **Duration:** 45–90 s · **Aspect:** 16:9
- **Key motion:** bars race and swap ranks smoothly; value numbers roll upward along with them; a big year changes in the corner
- **Palette:** `#101820` `#F2F2F2` `#FEE715` `#00A6ED` `#1C2833`
- **Font:** Inter (titles) + Inter (body)
- **Slots:** Style / background: Cinematic dark + grain + vignette; Composition: Growing chart; Lettering: Inter (titles) + Inter (body); motion: tracking-in; Subtitles: Lower-third bar; Accent: Counting number; Pacing: Slow: 2 shots per 10 s (±5 s/shot); Transition: Crossfade; Camera: Static; Audio: Tense electro 115 BPM; Aspect: 16:9
- **Blocks:** `data/race` (data), `data/counter` (accent), `data/number-wheel` (accent)
- **Add:** `mgp add data/race data/counter data/number-wheel --into index.html`
- **Why:** A built-in Flourish template; note: Cotgreave calls it the 'fidget spinner of data viz' (audiences are tiring of it).

Ready-to-copy brief:

```text
Make a 45–90 second 16:9 data/infographic video in the "Bar Chart Race" style: bars race over time, numbers roll. Palette #101820, #F2F2F2, #FEE715, #00A6ED, #1C2833; Inter for titles and Inter for body text. Key motion: bars race and swap ranks smoothly; value numbers roll upward along with them; a big year changes in the corner. Slow pacing: 2 shots per 10 s (±5 s/shot); audio: tense electro 115 BPM.
```

### DAT-02

**Route & Flow Map** (Peta Rute & Alur). Route lines fly between points, flow arrows.

- **Use:** Use for logistics, travel, distribution, migration. Avoid for non-geographic data.
- **Duration:** 45–90 s · **Aspect:** 16:9
- **Key motion:** flow arcs draw out from a central point; small arrows stream along the arcs; value labels pop at the destinations
- **Palette:** `#E8EEF2` `#1B2A41` `#D7263D` `#1B998B` `#FFFFFF`
- **Font:** Space Grotesk (titles) + Inter (body)
- **Slots:** Style / background: Map: coastlines + coordinate grid; Composition: Routes/points on a map; Lettering: Space Grotesk (titles) + Inter (body); motion: soft fade-up; Subtitles: Clean at the bottom; Accent: Location pin; Pacing: Medium: 3 shots per 10 s (±3.3 s/shot); Transition: Zoom-through; Camera: Slow push-in; Audio: Pulsing ambient 95 BPM; Aspect: 16:9
- **Blocks:** `maps/flow-arcs` (data), `maps/globe` (data), `maps/route` (data), `accents/path-arc` (accent), `accents/passing-rays` (accent)
- **Add:** `mgp add maps/flow-arcs maps/globe maps/route accents/path-arc accents/passing-rays --into index.html`
- **Why:** Route/fly-to stories are the standard animated map pattern; a route must not look more certain than its source.

Ready-to-copy brief:

```text
Make a 45–90 second 16:9 data/infographic video in the "Route & Flow Map" style: route lines fly between points, flow arrows. Palette #E8EEF2, #1B2A41, #D7263D, #1B998B, #FFFFFF; Space Grotesk for titles and Inter for body text. Key motion: flow arcs draw out from a central point; small arrows stream along the arcs; value labels pop at the destinations. Medium pacing: 3 shots per 10 s (±3.3 s/shot); audio: pulsing ambient 95 BPM.
```

### DAT-03

**Chart Scrollytelling** (Scrollytelling Grafik). One fixed chart that changes state at each narrative point.

- **Use:** Use for data journalism, research reports. Avoid for fast 9:16 shorts.
- **Duration:** 45–90 s · **Aspect:** 16:9
- **Key motion:** text panels scroll per narrative step; one bar chart changes state (highlight, trend line); a big 3× label bounces at the end
- **Palette:** `#FFFFFF` `#222222` `#3D5A80` `#EE6C4D` `#E0FBFC`
- **Font:** Source Serif 4 (titles) + Inter (body)
- **Slots:** Style / background: Clean whiteboard + marker scribbles; Composition: Growing chart; Lettering: Source Serif 4 (titles) + Inter (body); motion: soft fade-up; Subtitles: Clean at the bottom; Accent: Hand-drawn circle; Pacing: Fast-medium: 4 shots per 10 s (±2.5 s/shot, about the average shot length of modern films [CUT]); Transition: Match scale; Camera: Static; Audio: Minimal piano 90 BPM; Aspect: 16:9
- **Blocks:** `data/bar-chart` (data), `data/bar-chart` (data), `transitions/morph-swap` (transition), `camera/story-scroll` (camera)
- **Add:** `mgp add data/bar-chart transitions/morph-swap camera/story-scroll --into index.html`
- **Why:** Scrollytelling: a fixed chart animates to a new state when the narrative moves on.

Ready-to-copy brief:

```text
Make a 45–90 second 16:9 data/infographic video in the "Chart Scrollytelling" style: one fixed chart that changes state at each narrative point. Palette #FFFFFF, #222222, #3D5A80, #EE6C4D, #E0FBFC; Source Serif 4 for titles and Inter for body text. Key motion: text panels scroll per narrative step; one bar chart changes state (highlight, trend line); a big 3× label bounces at the end. Fast-medium pacing: 4 shots per 10 s (±2.5 s/shot, about the average shot length of modern films [CUT]); audio: minimal piano 90 BPM.
```

### DAT-04

**Big Rising Number** (Angka Besar Naik). One giant number counts up, small context below.

- **Use:** Use for KPIs, milestones, annual reports. Avoid for many numbers at once.
- **Duration:** 10–20 s · **Aspect:** 16:9
- **Key motion:** a giant number rolls up like an odometer; a progress ring and seconds fill in step with the number; a +38% badge pops with sparkles
- **Palette:** `#03045E` `#FFFFFF` `#00B4D8` `#FFD60A` `#023E8A`
- **Font:** Bebas Neue (titles) + Inter (body)
- **Slots:** Style / background: One bold full-screen color; Composition: Big centered title; Lettering: Bebas Neue (titles) + Inter (body); motion: big slam; Subtitles: No subtitles; Accent: Counting number; Pacing: Medium: 3 shots per 10 s (±3.3 s/shot); Transition: Match scale; Camera: Slow push-in; Audio: Riser + hit 120 BPM; Aspect: 16:9
- **Blocks:** `data/counter` (accent), `data/counter` (accent), `data/counter` (accent), `data/progress-stat` (card)
- **Add:** `mgp add data/counter data/progress-stat --into index.html`
- **Why:** Signaling: one main point is highlighted so it gets noticed.

Ready-to-copy brief:

```text
Make a 10–20 second 16:9 data/infographic video in the "Big Rising Number" style: one giant number counts up, small context below. Palette #03045E, #FFFFFF, #00B4D8, #FFD60A, #023E8A; Bebas Neue for titles and Inter for body text. Key motion: a giant number rolls up like an odometer; a progress ring and seconds fill in step with the number; a +38% badge pops with sparkles. Medium pacing: 3 shots per 10 s (±3.3 s/shot); audio: riser + hit 120 BPM.
```

### DAT-05

**Icon Pictograph** (Piktograf Ikon). Rows of small icons represent quantities (isotype style).

- **Use:** Use for population statistics, proportions, surveys. Avoid for highly precise data.
- **Duration:** 45–90 s · **Aspect:** 16:9
- **Key motion:** person icons fill with color in sequence with small pops; a percentage counts in step with the icons; some icons change color for a second proportion
- **Palette:** `#F7F3E9` `#1E1E1E` `#C44536` `#197278` `#FFFFFF`
- **Font:** Josefin Sans (titles) + Inter (body)
- **Slots:** Style / background: Textured cream paper + torn cutouts; Composition: Icon rows + labels; Lettering: Josefin Sans (titles) + Inter (body); motion: soft fade-up; Subtitles: Clean at the bottom; Accent: No accent; Pacing: Medium: 3 shots per 10 s (±3.3 s/shot); Transition: Grid; Camera: Static; Audio: Light marimba 100 BPM; Aspect: 16:9
- **Blocks:** `accents/staggered-grid` (accent), `accents/staggered-grid` (accent), `accents/staggered-grid` (accent), `accents/hub` (card)
- **Add:** `mgp add accents/staggered-grid accents/hub --into index.html`
- **Why:** Animation and pictographs have been shown to affect viewer engagement with data videos.

Ready-to-copy brief:

```text
Make a 45–90 second 16:9 data/infographic video in the "Icon Pictograph" style: rows of small icons represent quantities (isotype style). Palette #F7F3E9, #1E1E1E, #C44536, #197278, #FFFFFF; Josefin Sans for titles and Inter for body text. Key motion: person icons fill with color in sequence with small pops; a percentage counts in step with the icons; some icons change color for a second proportion. Medium pacing: 3 shots per 10 s (±3.3 s/shot); audio: light marimba 100 BPM.
```

### DAT-06

**Annotated Trend Line** (Garis Tren Beranotasi). The line grows, key points are circled and annotated.

- **Use:** Use for price trends, performance, time curves. Avoid for category comparisons.
- **Duration:** 45–90 s · **Aspect:** 16:9
- **Key motion:** the trend line grows with a gradient area; key points get a scribbled circle; arrowed notes appear at the dip and the record
- **Palette:** `#FAFAFA` `#1A1A1A` `#E63946` `#457B9D` `#FFFFFF`
- **Font:** IBM Plex Sans (titles) + IBM Plex Sans (body)
- **Slots:** Style / background: Clean whiteboard + marker scribbles; Composition: Growing chart; Lettering: IBM Plex Sans (titles) + IBM Plex Sans (body); motion: highlighter sweep; Subtitles: Clean at the bottom; Accent: Hand-drawn circle; Pacing: Medium: 3 shots per 10 s (±3.3 s/shot); Transition: Crossfade; Camera: Slow push-in; Audio: Analytical ambient 95 BPM; Aspect: 16:9
- **Blocks:** `data/line-chart` (data), `data/line-chart` (data), `accents/vox-annotation` (card), `hands/circle` (accent), `camera/zoom-ui` (camera)
- **Add:** `mgp add data/line-chart accents/vox-annotation hands/circle camera/zoom-ui --into index.html`
- **Why:** Animation + annotation guide attention (signaling) in data videos.

Ready-to-copy brief:

```text
Make a 45–90 second 16:9 data/infographic video in the "Annotated Trend Line" style: the line grows, key points are circled and annotated. Palette #FAFAFA, #1A1A1A, #E63946, #457B9D, #FFFFFF; IBM Plex Sans for titles and IBM Plex Sans for body text. Key motion: the trend line grows with a gradient area; key points get a scribbled circle; arrowed notes appear at the dip and the record. Medium pacing: 3 shots per 10 s (±3.3 s/shot); audio: analytical ambient 95 BPM.
```

### DAT-07

**Data Q&A** (Tanya-Jawab Data). A question is typed, a chart answers.

- **Use:** Use for data education, FAQs, research explainers. Avoid for ads.
- **Duration:** 45–90 s · **Aspect:** 16:9
- **Key motion:** the question is typed with a blinking cursor; a donut draws itself while the center number rises to 64%; the largest slice pops out and the answer is underlined
- **Palette:** `#14213D` `#FFFFFF` `#FCA311` `#E5E5E5` `#1F2E4F`
- **Font:** Lora (titles) + Inter (body)
- **Slots:** Style / background: Cinematic dark + grain + vignette; Composition: Text left, visual right; Lettering: Lora (titles) + Inter (body); motion: typewriter; Subtitles: Lower-third bar; Accent: Pop badge; Pacing: Fast-medium: 4 shots per 10 s (±2.5 s/shot, about the average shot length of modern films [CUT]); Transition: Slide up; Camera: Static; Audio: Lo-fi 85 BPM; Aspect: 16:9
- **Blocks:** `data/bar-chart` (data), `text/typewriter` (lettering), `titles/calm` (card), `ui/panel-open` (transition)
- **Add:** `mgp add data/bar-chart text/typewriter titles/calm ui/panel-open --into index.html`
- **Why:** The question-and-answer story pattern is used in data journalism (example: Bloomberg 2015).

Ready-to-copy brief:

```text
Make a 45–90 second 16:9 data/infographic video in the "Data Q&A" style: a question is typed, a chart answers. Palette #14213D, #FFFFFF, #FCA311, #E5E5E5, #1F2E4F; Lora for titles and Inter for body text. Key motion: the question is typed with a blinking cursor; a donut draws itself while the center number rises to 64%; the largest slice pops out and the answer is underlined. Fast-medium pacing: 4 shots per 10 s (±2.5 s/shot, about the average shot length of modern films [CUT]); audio: lo-fi 85 BPM.
```

### DAT-08

**Regional Heat Map** (Peta Panas Wilayah). Regions colored by value, moving legend.

- **Use:** Use for regional distribution, sales per area, risk. Avoid for data without locations.
- **Duration:** 45–90 s · **Aspect:** 16:9
- **Key motion:** hexagon region cells fill with color in a sweep from the left; a legend slider filters out low-value regions; the top region pulses with a callout card
- **Palette:** `#0B132B` `#F0F3F5` `#FF6B35` `#F7C59F` `#1C2541`
- **Font:** Barlow (titles) + Inter (body)
- **Slots:** Style / background: Map: coastlines + coordinate grid; Composition: Routes/points on a map; Lettering: Barlow (titles) + Inter (body); motion: soft fade-up; Subtitles: Clean at the bottom; Accent: Progress ring; Pacing: Medium: 3 shots per 10 s (±3.3 s/shot); Transition: Crossfade; Camera: Pan between points; Audio: Ambient 90 BPM; Aspect: 16:9
- **Blocks:** `maps/region-grid` (data), `maps/bubbles` (data), `maps/region-grid` (data), `backgrounds/orb` (style)
- **Add:** `mgp add maps/region-grid maps/bubbles backgrounds/orb --into index.html`
- **Why:** Maps show where values are, bars show how much (vendor); pictographs/animation raise engagement.

Ready-to-copy brief:

```text
Make a 45–90 second 16:9 data/infographic video in the "Regional Heat Map" style: regions colored by value, moving legend. Palette #0B132B, #F0F3F5, #FF6B35, #F7C59F, #1C2541; Barlow for titles and Inter for body text. Key motion: hexagon region cells fill with color in a sweep from the left; a legend slider filters out low-value regions; the top region pulses with a callout card. Medium pacing: 3 shots per 10 s (±3.3 s/shot); audio: ambient 90 BPM.
```

### DAT-09

**Data Timeline** (Garis Waktu Data). Values appear along a timeline.

- **Use:** Use for a company's history in numbers, milestones. Avoid for data without an order.
- **Duration:** 45–90 s · **Aspect:** 16:9
- **Key motion:** a rising trend line draws itself as the camera follows; the number at each point counts up; waving year milestone flags rise from below
- **Palette:** `#F1FAEE` `#1D3557` `#E63946` `#457B9D` `#FFFFFF`
- **Font:** Poppins (titles) + Inter (body)
- **Slots:** Style / background: Flat vector: solid colors + geometric shapes; Composition: Timeline; Lettering: Poppins (titles) + Inter (body); motion: word-by-word rise; Subtitles: Clean at the bottom; Accent: Counting number; Pacing: Fast-medium: 4 shots per 10 s (±2.5 s/shot, about the average shot length of modern films [CUT]); Transition: Slide up; Camera: Pan between points; Audio: Upbeat 105 BPM; Aspect: 16:9
- **Blocks:** `data/beat-timeline` (data), `camera/station` (camera), `accents/path-arc` (accent), `data/counter` (accent)
- **Add:** `mgp add data/beat-timeline camera/station accents/path-arc data/counter --into index.html`
- **Why:** The chronological narrative is one of the data story patterns (EU Data Visualisation Guide).

Ready-to-copy brief:

```text
Make a 45–90 second 16:9 data/infographic video in the "Data Timeline" style: values appear along a timeline. Palette #F1FAEE, #1D3557, #E63946, #457B9D, #FFFFFF; Poppins for titles and Inter for body text. Key motion: a rising trend line draws itself as the camera follows; the number at each point counts up; waving year milestone flags rise from below. Fast-medium pacing: 4 shots per 10 s (±2.5 s/shot, about the average shot length of modern films [CUT]); audio: upbeat 105 BPM.
```

### DAT-10

**Hand-drawn Infographic** (Infografik Gambar Tangan). Charts drawn in marker on paper, with a gentle jitter.

- **Use:** Use for casual education, creators, community reports. Avoid for official financial reports.
- **Duration:** 45–90 s · **Aspect:** 16:9
- **Key motion:** axes and bars are drawn by hand; the bar hatching jitters gently; a trend line and a "+42%" circle
- **Palette:** `#FFFBF2` `#2B2B2B` `#F25C54` `#2EC4B6` `#FFFFFF`
- **Font:** Gochi Hand (titles) + Patrick Hand (body)
- **Slots:** Style / background: Textured cream paper + torn cutouts; Composition: Growing chart; Lettering: Gochi Hand (titles) + Patrick Hand (body); motion: handwritten stroke; Subtitles: Color block box; Accent: Hand-drawn circle; Pacing: Medium: 3 shots per 10 s (±3.3 s/shot); Transition: Ink bleed; Camera: Floating parallax; Audio: Ukulele 105 BPM; Aspect: 16:9
- **Blocks:** `textures/stop-motion` (style), `accents/line-stroke` (accent), `accents/line-stroke` (accent), `hands/label-box` (card), `data/bar-chart` (data)
- **Add:** `mgp add textures/stop-motion accents/line-stroke hands/label-box data/bar-chart --into index.html`
- **Why:** Canva 2026 'Imperfect by Design' + pictographs/animation raise engagement.

Ready-to-copy brief:

```text
Make a 45–90 second 16:9 data/infographic video in the "Hand-drawn Infographic" style: charts drawn in marker on paper, with a gentle jitter. Palette #FFFBF2, #2B2B2B, #F25C54, #2EC4B6, #FFFFFF; Gochi Hand for titles and Patrick Hand for body text. Key motion: axes and bars are drawn by hand; the bar hatching jitters gently; a trend line and a "+42%" circle. Medium pacing: 3 shots per 10 s (±3.3 s/shot); audio: ukulele 105 BPM.
```

## 9. Product demo / UI (DEM)

Demos of apps and digital products: UI mocks, cursor, screens, features.

### DEM-01

**Screen + Cursor Walkthrough** (Walkthrough Layar + Kursor). Screen recording, a moving cursor, zoom on each click.

- **Use:** Use for SaaS, internal apps, product tutorials. Avoid for emotional launches.
- **Duration:** 60–120 s · **Aspect:** 16:9
- **Key motion:** the cursor glides, then clicks with a ripple; the camera zooms into the board while a card is dragged and dropped; the Share button is pressed and a notification bounces in
- **Palette:** `#F4F6FA` `#0F172A` `#4F46E5` `#22C55E` `#FFFFFF`
- **Font:** Inter (titles) + Inter (body)
- **Slots:** Style / background: Light UI background + app window; Composition: App window + cursor; Lettering: Inter (titles) + Inter (body); motion: soft rise (fade-up); Subtitles: Lower-third bar; Accent: Hand-drawn circle; Pacing: Medium: 3 shots per 10 s (±3.3 s/shot); Transition: Dissolve (crossfade); Camera: Slow push-in; Audio: Lo-fi tech 95 BPM, click SFX; Aspect: 16:9
- **Blocks:** `ui/device-stage` (demo), `ui/cursor` (demo), `ui/cursor` (demo), `camera/zoom-ui` (camera), `hands/annotation-pen` (card)
- **Add:** `mgp add ui/device-stage ui/cursor camera/zoom-ui hands/annotation-pen --into index.html`
- **Why:** A screen walkthrough has the fastest effect on trial/demo conversion.

Ready-to-copy brief:

```text
Make a 60–120 second 16:9 product demo video in the "Screen + Cursor Walkthrough" style: screen recording, a moving cursor, zoom on each click. Palette #F4F6FA, #0F172A, #4F46E5, #22C55E, #FFFFFF; Inter for titles and Inter for body text. Key motion: the cursor glides, then clicks with a ripple; the camera zooms into the board while a card is dragged and dropped; the Share button is pressed and a notification bounces in. Medium pacing: 3 shots per 10 s (±3.3 s/shot); audio: lo-fi tech 95 BPM, click SFX.
```

### DEM-02

**3D Floating UI** (UI Melayang 3D) ★ featured pick. Screens float at an angle in a dark space.

- **Use:** Use for SaaS launches, landing page heroes. Avoid for detailed step-by-step tutorials.
- **Duration:** 60–120 s · **Aspect:** 16:9
- **Key motion:** tilted UI panels float in 3D space; charts and donuts fill while a sheen sweeps across; the grid floor moves and the title changes
- **Palette:** `#0B1020` `#FFFFFF` `#7C3AED` `#06B6D4` `#151B33`
- **Font:** Sora (titles) + Inter (body)
- **Slots:** Style / background: Soft studio gradient; Composition: App window + cursor; Lettering: Sora (titles) + Inter (body); motion: focus from blur; Subtitles: No subtitles; Accent: Light spotlight; Pacing: Medium: 3 shots per 10 s (±3.3 s/shot); Transition: Zoom-through; Camera: 3D tilt; Audio: Future bass 120 BPM; Aspect: 16:9
- **Blocks:** `ui/ui-3d` (demo), `3d/orbit-cards` (demo), `ui/device-fan` (demo), `ui/tilted-card` (demo), `ui/device-dive` (transition)
- **Add:** `mgp add ui/ui-3d 3d/orbit-cards ui/device-fan ui/tilted-card ui/device-dive --into index.html`
- **Why:** SaaS brands use animation to sell the big picture, not click by click.

Ready-to-copy brief:

```text
Make a 60–120 second 16:9 product demo video in the "3D Floating UI" style: screens float at an angle in a dark space. Palette #0B1020, #FFFFFF, #7C3AED, #06B6D4, #151B33; Sora for titles and Inter for body text. Key motion: tilted UI panels float in 3D space; charts and donuts fill while a sheen sweeps across; the grid floor moves and the title changes. Medium pacing: 3 shots per 10 s (±3.3 s/shot); audio: future bass 120 BPM.
```

### DEM-03

**Device Mockup** (Mockup Perangkat). Laptop + phone showing the app, download badges.

- **Use:** Use for mobile/web apps, version releases. Avoid for physical products.
- **Duration:** 60–120 s · **Aspect:** 16:9
- **Key motion:** the laptop rises and the phone bounces in from the right; screen content scrolls on both devices; download badges pop in with a bounce
- **Palette:** `#EEF2FF` `#111827` `#6366F1` `#F59E0B` `#FFFFFF`
- **Font:** Plus Jakarta Sans (titles) + Inter (body)
- **Slots:** Style / background: Soft pastel + white cards; Composition: App window + cursor; Lettering: Plus Jakarta Sans (titles) + Inter (body); motion: letter spacing tightens (tracking-in); Subtitles: Clean at the bottom; Accent: Pop badge; Pacing: Medium: 3 shots per 10 s (±3.3 s/shot); Transition: Slide up; Camera: Slow push-in; Audio: Bright pop 112 BPM; Aspect: 16:9
- **Blocks:** `ui/device-stage` (demo), `ui/device-3d` (demo), `ui/device-3d` (demo), `titles/cta` (card)
- **Add:** `mgp add ui/device-stage ui/device-3d titles/cta --into index.html`
- **Why:** Viewers of a product demo are 1.81x more likely to buy; 71% of demo users name the demo as the most influential factor.

Ready-to-copy brief:

```text
Make a 60–120 second 16:9 product demo video in the "Device Mockup" style: laptop + phone showing the app, download badges. Palette #EEF2FF, #111827, #6366F1, #F59E0B, #FFFFFF; Plus Jakarta Sans for titles and Inter for body text. Key motion: the laptop rises and the phone bounces in from the right; screen content scrolls on both devices; download badges pop in with a bounce. Medium pacing: 3 shots per 10 s (±3.3 s/shot); audio: bright pop 112 BPM.
```

### DEM-04

**One-by-One Feature Spotlight** (Sorot Fitur Satu-satu). UI areas are enlarged in turn, each with a feature label.

- **Use:** Use for feature releases, changelogs, sales enablement. Avoid for a general brand overview.
- **Duration:** 60–120 s · **Aspect:** 16:9
- **Key motion:** the screen dims while a spotlight moves from feature to feature; the spotlight ring pulses; numbered labels bounce in next to each feature
- **Palette:** `#FFFFFF` `#111111` `#FF5C35` `#0EA5E9` `#F3F4F6`
- **Font:** Manrope (titles) + Inter (body)
- **Slots:** Style / background: Light UI background + app window; Composition: App window + cursor; Lettering: Manrope (titles) + Inter (body); motion: highlighter sweep; Subtitles: Clean at the bottom; Accent: Hand-drawn circle; Pacing: Medium-fast: 4 shots per 10 s (±2.5 s/shot, about the average shot length of modern films [CUT]); Transition: Match scale; Camera: Slow push-in; Audio: Minimal tech 105 BPM; Aspect: 16:9
- **Blocks:** `camera/zoom-ui` (camera), `camera/rack-focus` (demo), `ui/tab` (demo), `text/highlighter` (card), `ui/tilted-card` (card)
- **Add:** `mgp add camera/zoom-ui camera/rack-focus ui/tab text/highlighter ui/tilted-card --into index.html`
- **Why:** An animated feature demo gives a high-level view of the UI, feature by feature.

Ready-to-copy brief:

```text
Make a 60–120 second 16:9 product demo video in the "One-by-One Feature Spotlight" style: UI areas are enlarged in turn, each with a feature label. Palette #FFFFFF, #111111, #FF5C35, #0EA5E9, #F3F4F6; Manrope for titles and Inter for body text. Key motion: the screen dims while a spotlight moves from feature to feature; the spotlight ring pulses; numbered labels bounce in next to each feature. Medium-fast pacing: 4 shots per 10 s (±2.5 s/shot, about the average shot length of modern films [CUT]); audio: minimal tech 105 BPM.
```

### DEM-05

**Developer Tool Launch** (Peluncuran Alat Developer). Terminal, code being typed, a diff, the result running.

- **Use:** Use for developer tools, APIs, open source. Avoid for a general audience.
- **Duration:** 60–120 s · **Aspect:** 16:9
- **Key motion:** code is typed with syntax colors and a blinking cursor; red/green diff lines light up; tests run, then a passing checkmark and a release badge appear
- **Palette:** `#0D1117` `#E6EDF3` `#3FB950` `#58A6FF` `#161B22`
- **Font:** JetBrains Mono (titles) + Inter (body)
- **Slots:** Style / background: Cinematic dark + grain + vignette; Composition: Code terminal; Lettering: JetBrains Mono (titles) + Inter (body); motion: typed (typewriter); Subtitles: Typewriter mono; Accent: Pop badge; Pacing: Medium: 3 shots per 10 s (±3.3 s/shot); Transition: Slide up; Camera: Static; Audio: Dark synth 100 BPM, typing SFX; Aspect: 16:9
- **Blocks:** `code/code-typing` (demo), `code/terminal` (demo), `code/terminal` (demo), `code/diff` (demo), `code/code-typing` (demo)
- **Add:** `mgp add code/code-typing code/terminal code/diff --into index.html`
- **Why:** The demo shows the real workflow the user will click through or run.

Ready-to-copy brief:

```text
Make a 60–120 second 16:9 product demo video in the "Developer Tool Launch" style: terminal, code being typed, a diff, the result running. Palette #0D1117, #E6EDF3, #3FB950, #58A6FF, #161B22; JetBrains Mono for titles and Inter for body text. Key motion: code is typed with syntax colors and a blinking cursor; red/green diff lines light up; tests run, then a passing checkmark and a release badge appear. Medium pacing: 3 shots per 10 s (±3.3 s/shot); audio: dark synth 100 BPM, typing SFX.
```

### DEM-06

**Vertical App Promo** (Promo Aplikasi Vertikal). Full-screen phone, finger taps, changing screens.

- **Use:** Use for app ads on TikTok/Reels. Avoid for desktop software.
- **Duration:** 60–120 s · **Aspect:** 9:16
- **Key motion:** the phone bounces in and sways gently; finger taps with a ripple switch screens; a success checkmark with confetti
- **Palette:** `#FF7A59` `#FFFFFF` `#2D3142` `#FFD166` `#FF9F80`
- **Font:** Poppins (titles) + Inter (body)
- **Slots:** Style / background: Soft studio gradient; Composition: Phone frame; Lettering: Poppins (titles) + Inter (body); motion: big slam (slam); Subtitles: Bold, centered, word by word; Accent: Icon pop; Pacing: Medium-fast: 4 shots per 10 s (±2.5 s/shot, about the average shot length of modern films [CUT]); Transition: Side push; Camera: Floating parallax; Audio: Pop 120 BPM, tap SFX; Aspect: 9:16
- **Blocks:** `ui/touch` (demo), `ui/touch` (demo), `ui/screen-carousel` (demo), `ui/feed-scroll` (demo)
- **Add:** `mgp add ui/touch ui/screen-carousel ui/feed-scroll --into index.html`
- **Why:** Vertical-first design is the default in 2026; Reels ads: native 9:16, a fast hook.

Ready-to-copy brief:

```text
Make a 60–120 second 9:16 product demo video in the "Vertical App Promo" style: full-screen phone, finger taps, changing screens. Palette #FF7A59, #FFFFFF, #2D3142, #FFD166, #FF9F80; Poppins for titles and Inter for body text. Key motion: the phone bounces in and sways gently; finger taps with a ripple switch screens; a success checkmark with confetti. Medium-fast pacing: 4 shots per 10 s (±2.5 s/shot, about the average shot length of modern films [CUT]); audio: pop 120 BPM, tap SFX.
```

### DEM-07

**AI Assistant Demo (Chat)** (Demo Asisten AI (Chat)). A prompt is typed, the answer streams in, a result card.

- **Use:** Use for AI products, chatbots, automation. Avoid for non-digital products.
- **Duration:** 60–120 s · **Aspect:** 16:9
- **Key motion:** a prompt is typed into the input box and sent; typing dots, then the answer streams in word by word; a result card appears with a progress bar
- **Palette:** `#F5F7FB` `#1E293B` `#8B5CF6` `#14B8A6` `#FFFFFF`
- **Font:** Inter (titles) + Inter (body)
- **Slots:** Style / background: Light UI background + app window; Composition: Chat bubbles; Lettering: Inter (titles) + Inter (body); motion: typed (typewriter); Subtitles: No subtitles; Accent: Light spotlight; Pacing: Medium: 3 shots per 10 s (±3.3 s/shot); Transition: Dissolve (crossfade); Camera: Static; Audio: Ambient tech 95 BPM; Aspect: 16:9
- **Blocks:** `ui/ai-chat` (demo), `ui/chat` (demo), `text/typewriter` (demo), `text/typewriter` (demo), `ui/ai-chat` (demo)
- **Add:** `mgp add ui/ai-chat ui/chat text/typewriter --into index.html`
- **Why:** The 2026 AI demo category is split: AI video generators vs interactive tours.

Ready-to-copy brief:

```text
Make a 60–120 second 16:9 product demo video in the "AI Assistant Demo (Chat)" style: a prompt is typed, the answer streams in, a result card. Palette #F5F7FB, #1E293B, #8B5CF6, #14B8A6, #FFFFFF; Inter for titles and Inter for body text. Key motion: a prompt is typed into the input box and sent; typing dots, then the answer streams in word by word; a result card appears with a progress bar. Medium pacing: 3 shots per 10 s (±3.3 s/shot); audio: ambient tech 95 BPM.
```

### DEM-08

**Minimal Launch Film** (Film Peluncuran Minimal). Dark, a single object, a light sweep, thin typography.

- **Use:** Use for keynotes, major product releases. Avoid for tutorials.
- **Duration:** 60–90 s · **Aspect:** 16:9
- **Key motion:** the product emerges from the dark with rim light; a light sweep crosses its surface; thin letters slowly tighten as a sheen passes
- **Palette:** `#000000` `#F5F5F7` `#5B8CFF` `#A1A1A6` `#1D1D1F`
- **Font:** Inter (titles) + Inter (body)
- **Slots:** Style / background: Cinematic dark + grain + vignette; Composition: Product in the center; Lettering: Inter (titles) + Inter (body); motion: letter spacing tightens (tracking-in); Subtitles: No subtitles; Accent: Light spotlight; Pacing: Medium: 3 shots per 10 s (±3.3 s/shot); Transition: Dissolve (crossfade); Camera: Pull-back reveal; Audio: Electronic orchestral 90 BPM; Aspect: 16:9
- **Blocks:** `camera/push` (camera), `accents/light-sweep` (accent), `accents/light-sweep` (accent), `logos/outro` (logo), `titles/calm` (card)
- **Add:** `mgp add camera/push accents/light-sweep logos/outro titles/calm --into index.html`
- **Why:** Animation that sells the big picture of the product.

Ready-to-copy brief:

```text
Make a 60–90 second 16:9 product demo video in the "Minimal Launch Film" style: dark, a single object, a light sweep, thin typography. Palette #000000, #F5F5F7, #5B8CFF, #A1A1A6, #1D1D1F; Inter for titles and Inter for body text. Key motion: the product emerges from the dark with rim light; a light sweep crosses its surface; thin letters slowly tighten as a sheen passes. Medium pacing: 3 shots per 10 s (±3.3 s/shot); audio: electronic orchestral 90 BPM.
```

### DEM-09

**Step-by-Step Onboarding Flow** (Alur Onboarding Bertahap). Steps 1-2-3 in the UI, a success checkmark at each stage.

- **Use:** Use for user onboarding, setup guides. Avoid for emotional promos.
- **Duration:** 60–120 s · **Aspect:** 16:9
- **Key motion:** a form fills itself in; the step 1-2-3 progress line fills and checkmarks bounce; the panel slides to "All set!" with confetti
- **Palette:** `#F0FDF4` `#14532D` `#22C55E` `#FACC15` `#FFFFFF`
- **Font:** Nunito (titles) + Inter (body)
- **Slots:** Style / background: Soft pastel + white cards; Composition: Numbered step list; Lettering: Nunito (titles) + Inter (body); motion: soft rise (fade-up); Subtitles: Clean at the bottom; Accent: Success checkmark; Pacing: Medium-fast: 4 shots per 10 s (±2.5 s/shot, about the average shot length of modern films [CUT]); Transition: Slide up; Camera: Static; Audio: Light cheerful 110 BPM, check SFX; Aspect: 16:9
- **Blocks:** `ui/form` (demo), `ui/form` (demo), `ui/toggle` (demo), `ui/toggle` (demo), `accents/checkmark` (accent)
- **Add:** `mgp add ui/form ui/toggle accents/checkmark --into index.html`
- **Why:** A tidy demo is said to reduce support questions (secondary, not verified).

Ready-to-copy brief:

```text
Make a 60–120 second 16:9 product demo video in the "Step-by-Step Onboarding Flow" style: steps 1-2-3 in the UI, a success checkmark at each stage. Palette #F0FDF4, #14532D, #22C55E, #FACC15, #FFFFFF; Nunito for titles and Inter for body text. Key motion: a form fills itself in; the step 1-2-3 progress line fills and checkmarks bounce; the panel slides to "All set!" with confetti. Medium-fast pacing: 4 shots per 10 s (±2.5 s/shot, about the average shot length of modern films [CUT]); audio: light cheerful 110 BPM, check SFX.
```

### DEM-10

**Notifications & User Proof** (Notifikasi & Bukti Pengguna). Stacking notifications, client logos, user numbers.

- **Use:** Use for SaaS growth, marketplaces, communities. Avoid for new products without users.
- **Duration:** 60–120 s · **Aspect:** 16:9
- **Key motion:** notifications bounce in and stack downward; the user count ticks up along with a trend line; client logos appear one after another
- **Palette:** `#EEF6FF` `#0F172A` `#2563EB` `#F43F5E` `#FFFFFF`
- **Font:** Plus Jakarta Sans (titles) + Inter (body)
- **Slots:** Style / background: Soft studio gradient; Composition: Card stack; Lettering: Plus Jakarta Sans (titles) + Inter (body); motion: soft rise (fade-up); Subtitles: No subtitles; Accent: Pop badge; Pacing: Medium: 3 shots per 10 s (±3.3 s/shot); Transition: Slide up; Camera: Floating parallax; Audio: Upbeat 115 BPM, notification SFX; Aspect: 16:9
- **Blocks:** `ui/notification` (demo), `ui/notification-stack` (demo), `ui/notification` (demo), `logos/wall` (card), `logos/wall` (card)
- **Add:** `mgp add ui/notification ui/notification-stack logos/wall --into index.html`
- **Why:** Demos and user proof influence the purchase decision.

Ready-to-copy brief:

```text
Make a 60–120 second 16:9 product demo video in the "Notifications & User Proof" style: stacking notifications, client logos, user numbers. Palette #EEF6FF, #0F172A, #2563EB, #F43F5E, #FFFFFF; Plus Jakarta Sans for titles and Inter for body text. Key motion: notifications bounce in and stack downward; the user count ticks up along with a trend line; client logos appear one after another. Medium pacing: 3 shots per 10 s (±3.3 s/shot); audio: upbeat 115 BPM, notification SFX.
```

## 10. Education / tutorial (EDU)

Step-by-step lessons, courses, how-tos, microlearning.

### EDU-01

**Chalkboard** (Papan Kapur). Chalk on a green board, scribbles and erasing.

- **Use:** Use for math, science, short lectures. Avoid for brand promos.
- **Duration:** 2–6 min per lesson · **Aspect:** 16:9
- **Key motion:** chalk writes a formula and a triangle; a circle marks the answer; an eraser sweeps the board
- **Palette:** `#1F3A2E` `#F2F2E9` `#F6E27F` `#F4A6A6` `#2B4A3B`
- **Font:** Kalam (titles) + Patrick Hand (body)
- **Slots:** Style / background: Green chalkboard + chalk dust; Composition: Numbered step list; Lettering: Kalam (titles) + Patrick Hand (body); motion: handwritten stroke; Subtitles: Clean at the bottom; Accent: Hand-drawn circle; Pacing: Medium: 3 shots per 10 s (±3.3 s/shot); Transition: Directional wipe; Camera: Static; Audio: No music / classroom ambience; Aspect: 16:9
- **Blocks:** `hands/whiteboard` (style), `hands/handwritten-title` (lettering), `hands/mark` (accent), `transitions/scribble` (transition)
- **Add:** `mgp add hands/whiteboard hands/handwritten-title hands/mark transitions/scribble --into index.html`
- **Why:** Segmenting and signaling: the material is broken up and the key points are marked.

Ready-to-copy brief:

```text
Make a 16:9 education video of 2–6 minutes per lesson in the "Chalkboard" style: chalk on a green board, scribbles and erasing. Palette #1F3A2E, #F2F2E9, #F6E27F, #F4A6A6, #2B4A3B; Kalam for titles and Patrick Hand for body text. Key motion: chalk writes a formula and a triangle; a circle marks the answer; an eraser sweeps the board. Medium pacing: 3 shots per 10 s (±3.3 s/shot); audio: no music / classroom ambience.
```

### EDU-02

**Sketchnote** (Sketchnote) ★ featured pick. Visual notes: icons, arrows, boxes, highlighter.

- **Use:** Use for book summaries, meeting material, concepts. Avoid for cinematic content.
- **Duration:** 2–6 min per lesson · **Aspect:** 16:9
- **Key motion:** a highlighter sweeps behind the title; icons in circles are drawn one by one; curved arrows connect the ideas
- **Palette:** `#FFFEF9` `#222222` `#F4A261` `#2A9D8F` `#FFFFFF`
- **Font:** Gochi Hand (titles) + Nunito (body)
- **Slots:** Style / background: Clean whiteboard + marker doodles; Composition: Icon row + labels; Lettering: Gochi Hand (titles) + Nunito (body); motion: highlighter sweep; Subtitles: Color-block box; Accent: Arrow; Pacing: Medium-fast: 4 shots per 10 s (±2.5 s/shot, about the average shot length of modern films [CUT]); Transition: Ink bleed; Camera: Pan between points; Audio: Study lo-fi 80 BPM; Aspect: 16:9
- **Blocks:** `hands/flowchart` (card), `hands/label-box` (card), `hands/bubble` (card), `hands/arrow` (accent), `text/highlighter` (lettering)
- **Add:** `mgp add hands/flowchart hands/label-box hands/bubble hands/arrow text/highlighter --into index.html`
- **Why:** Signaling + an invitation to take short notes while watching.

Ready-to-copy brief:

```text
Make a 16:9 education video of 2–6 minutes per lesson in the "Sketchnote" style: visual notes: icons, arrows, boxes, highlighter. Palette #FFFEF9, #222222, #F4A261, #2A9D8F, #FFFFFF; Gochi Hand for titles and Nunito for body text. Key motion: a highlighter sweeps behind the title; icons in circles are drawn one by one; curved arrows connect the ideas. Medium-fast pacing: 4 shots per 10 s (±2.5 s/shot, about the average shot length of modern films [CUT]); audio: study lo-fi 80 BPM.
```

### EDU-03

**Step-by-Step Slides** (Slide Bertahap). Points appear one at a time, one idea per screen.

- **Use:** Use for presentations, course material, briefings. Avoid for entertainment.
- **Duration:** 2–6 min per lesson · **Aspect:** 16:9
- **Key motion:** a color block sweeps in and the title rises from behind a mask; points appear one at a time; slides change with a side push and a progress bar
- **Palette:** `#FFFFFF` `#1F2937` `#2563EB` `#F59E0B` `#F3F4F6`
- **Font:** Poppins (titles) + Inter (body)
- **Slots:** Style / background: Flat vector: solid colors + geometric shapes; Composition: Numbered step list; Lettering: Poppins (titles) + Inter (body); motion: soft rise (fade-up); Subtitles: Clean at the bottom; Accent: Marker underline; Pacing: Medium-fast: 4 shots per 10 s (±2.5 s/shot, about the average shot length of modern films [CUT]); Transition: Side push; Camera: Static; Audio: Ambient 90 BPM; Aspect: 16:9
- **Blocks:** `text/rising-words` (lettering), `text/line-slide` (lettering), `ui/panel-open` (transition), `transitions/slide` (transition)
- **Add:** `mgp add text/rising-words text/line-slide ui/panel-open transitions/slide --into index.html`
- **Why:** 48% of video marketers make presentation videos; segmenting.

Ready-to-copy brief:

```text
Make a 16:9 education video of 2–6 minutes per lesson in the "Step-by-Step Slides" style: points appear one at a time, one idea per screen. Palette #FFFFFF, #1F2937, #2563EB, #F59E0B, #F3F4F6; Poppins for titles and Inter for body text. Key motion: a color block sweeps in and the title rises from behind a mask; points appear one at a time; slides change with a side push and a progress bar. Medium-fast pacing: 4 shots per 10 s (±2.5 s/shot, about the average shot length of modern films [CUT]); audio: ambient 90 BPM.
```

### EDU-04

**Numbered-Step Tutorial** (Tutorial Langkah Bernomor). Numbered steps, an enlarged screen/object, checkmarks.

- **Use:** Use for how-tos, SOPs, work instructions. Avoid for stories.
- **Duration:** 2–6 min per lesson · **Aspect:** 16:9
- **Key motion:** numbered steps come in one by one and the active one is highlighted; a magnifying glass slides over and enlarges part of the object; a checkmark appears as each step is done
- **Palette:** `#F8FAFC` `#0F172A` `#0EA5E9` `#F97316` `#FFFFFF`
- **Font:** Manrope (titles) + Inter (body)
- **Slots:** Style / background: Light UI background + app window; Composition: Numbered step list; Lettering: Manrope (titles) + Inter (body); motion: letter spacing tightens (tracking-in); Subtitles: Lower-third bar; Accent: Success checkmark; Pacing: Medium-fast: 4 shots per 10 s (±2.5 s/shot, about the average shot length of modern films [CUT]); Transition: Slide up; Camera: Slow push-in; Audio: No music / soft ticks; Aspect: 16:9
- **Blocks:** `hands/checklist-card` (card), `ui/form` (demo), `accents/checkmark` (accent), `camera/zoom-ui` (camera)
- **Add:** `mgp add hands/checklist-card ui/form accents/checkmark camera/zoom-ui --into index.html`
- **Why:** Tutorials/how-tos reach ~25-26% of internet users per week (secondary).

Ready-to-copy brief:

```text
Make a 16:9 education video of 2–6 minutes per lesson in the "Numbered-Step Tutorial" style: numbered steps, an enlarged screen/object, checkmarks. Palette #F8FAFC, #0F172A, #0EA5E9, #F97316, #FFFFFF; Manrope for titles and Inter for body text. Key motion: numbered steps come in one by one and the active one is highlighted; a magnifying glass slides over and enlarges part of the object; a checkmark appears as each step is done. Medium-fast pacing: 4 shots per 10 s (±2.5 s/shot, about the average shot length of modern films [CUT]); audio: no music / soft ticks.
```

### EDU-05

**60-90 Second Microlearning** (Microlearning 60-90 Detik). One concept, a progress bar, big keywords.

- **Use:** Use for employee training, safety (K3) tips, daily quizzes. Avoid for complex, layered material.
- **Duration:** 60–90 s · **Aspect:** 9:16
- **Key motion:** keyword cards bounce and pulse on the beat; a countdown ring shrinks; three tips glide in one after another
- **Palette:** `#FFF3B0` `#1B1B1B` `#E09F3E` `#335C67` `#FFFFFF`
- **Font:** Poppins (titles) + Inter (body)
- **Slots:** Style / background: One bold full-screen color; Composition: Big centered title; Lettering: Poppins (titles) + Inter (body); motion: big slam (slam); Subtitles: Word-by-word karaoke pill; Accent: Progress ring; Pacing: Medium-fast: 4 shots per 10 s (±2.5 s/shot, about the average shot length of modern films [CUT]); Transition: Match scale; Camera: Slow push-in; Audio: Light beat 110 BPM; Aspect: 9:16
- **Blocks:** `data/ring` (accent), `data/progress-stat` (card), `text/center-build` (lettering), `subtitles/karaoke-pill` (subtitles)
- **Add:** `mgp add data/ring data/progress-stat text/center-build subtitles/karaoke-pill --into index.html`
- **Why:** For videos under 6 min, median engagement is close to 100% (Guo 2014); segment an 11 min video into a series of 1-2 min.

Ready-to-copy brief:

```text
Make a 60–90 second 9:16 education video in the "60-90 Second Microlearning" style: one concept, a progress bar, big keywords. Palette #FFF3B0, #1B1B1B, #E09F3E, #335C67, #FFFFFF; Poppins for titles and Inter for body text. Key motion: keyword cards bounce and pulse on the beat; a countdown ring shrinks; three tips glide in one after another. Medium-fast pacing: 4 shots per 10 s (±2.5 s/shot, about the average shot length of modern films [CUT]); audio: light beat 110 BPM.
```

### EDU-06

**Recap & Quiz** (Rangkuman & Kuis). A question, choices, the answer revealed, a checkmark.

- **Use:** Use for module endings, comprehension checks, online classes. Avoid for promos.
- **Duration:** 60–120 s · **Aspect:** 16:9
- **Key motion:** the question card drops in and a timer bar shrinks; the cursor picks an answer; the correct answer lights up green with a checkmark and confetti, the others dim
- **Palette:** `#EDE7F6` `#2E1A47` `#7E57C2` `#26A69A` `#FFFFFF`
- **Font:** Nunito (titles) + Inter (body)
- **Slots:** Style / background: Soft pastel + white cards; Composition: Card stack; Lettering: Nunito (titles) + Inter (body); motion: soft rise (fade-up); Subtitles: Clean at the bottom; Accent: Success checkmark; Pacing: Medium-fast: 4 shots per 10 s (±2.5 s/shot, about the average shot length of modern films [CUT]); Transition: Match scale; Camera: Static; Audio: Cheerful quiz 115 BPM, correct-answer SFX; Aspect: 16:9
- **Blocks:** `ui/panel-open` (demo), `ui/tab` (demo), `accents/checkmark` (accent), `hands/checklist-card` (card)
- **Add:** `mgp add ui/panel-open ui/tab accents/checkmark hands/checklist-card --into index.html`
- **Why:** Viewers are prompted to summarize/answer while watching.

Ready-to-copy brief:

```text
Make a 60–120 second 16:9 education video in the "Recap & Quiz" style: a question, choices, the answer revealed, a checkmark. Palette #EDE7F6, #2E1A47, #7E57C2, #26A69A, #FFFFFF; Nunito for titles and Inter for body text. Key motion: the question card drops in and a timer bar shrinks; the cursor picks an answer; the correct answer lights up green with a checkmark and confetti, the others dim. Medium-fast pacing: 4 shots per 10 s (±2.5 s/shot, about the average shot length of modern films [CUT]); audio: cheerful quiz 115 BPM, correct-answer SFX.
```

### EDU-07

**Flat Science Diagram** (Diagram Sains Flat). Flat planets/cells/objects on a dark background, zooming between scales.

- **Use:** Use for popular science, fun facts, what-ifs. Avoid for personal content.
- **Duration:** 2–6 min per lesson · **Aspect:** 16:9
- **Key motion:** a zoom across scales from planet to cell to atom; moons and electrons orbit and the cell undulates; scale labels and leader lines slide in
- **Palette:** `#1B1F3B` `#FFFFFF` `#FF9F1C` `#2EC4B6` `#2B2F5B`
- **Font:** Poppins (titles) + Inter (body)
- **Slots:** Style / background: Stars + nebula; Composition: Icon row + labels; Lettering: Poppins (titles) + Inter (body); motion: soft rise (fade-up); Subtitles: Clean at the bottom; Accent: Light spotlight; Pacing: Medium: 3 shots per 10 s (±3.3 s/shot); Transition: Zoom-through; Camera: Pull-back reveal; Audio: Science ambient 90 BPM; Aspect: 16:9
- **Blocks:** `accents/hub` (accent), `accents/chip-ring` (accent), `transitions/zoom-through` (transition), `backgrounds/galaxy` (style)
- **Add:** `mgp add accents/hub accents/chip-ring transitions/zoom-through backgrounds/galaxy --into index.html`
- **Why:** Fact/what-if formats are in demand; animation sets them apart; flat 2D is efficient.

Ready-to-copy brief:

```text
Make a 16:9 education video of 2–6 minutes per lesson in the "Flat Science Diagram" style: flat planets/cells/objects on a dark background, zooming between scales. Palette #1B1F3B, #FFFFFF, #FF9F1C, #2EC4B6, #2B2F5B; Poppins for titles and Inter for body text. Key motion: a zoom across scales from planet to cell to atom; moons and electrons orbit and the cell undulates; scale labels and leader lines slide in. Medium pacing: 3 shots per 10 s (±3.3 s/shot); audio: science ambient 90 BPM.
```

### EDU-08

**Technical Blueprint** (Blueprint Teknis). Blue technical drawing, dimension lines, labels next to each part.

- **Use:** Use for engineering, safety (K3), equipment instructions, technical logistics. Avoid for lifestyle content.
- **Duration:** 2–6 min per lesson · **Aspect:** 16:9
- **Key motion:** technical lines are drawn step by step over a grid; dimension lines extend with arrows and mono numbers; notes appear with a pulsing ring
- **Palette:** `#0B3D91` `#EAF2FF` `#FFD166` `#9AD1FF` `#0A3278`
- **Font:** IBM Plex Mono (titles) + IBM Plex Sans (body)
- **Slots:** Style / background: Blueprint blue + technical grid; Composition: Isometric diagram; Lettering: IBM Plex Mono (titles) + IBM Plex Sans (body); motion: typed (typewriter); Subtitles: Typewriter mono; Accent: Arrow; Pacing: Medium: 3 shots per 10 s (±3.3 s/shot); Transition: Directional wipe; Camera: Pan between points; Audio: Industrial ambient 90 BPM; Aspect: 16:9
- **Blocks:** `accents/line-stroke` (accent), `accents/line-stroke` (accent), `hands/arrow` (accent), `hands/flowchart` (card), `camera/station` (camera)
- **Add:** `mgp add accents/line-stroke hands/arrow hands/flowchart camera/station --into index.html`
- **Why:** Spatial contiguity: labels are placed close to the part they explain.

Ready-to-copy brief:

```text
Make a 16:9 education video of 2–6 minutes per lesson in the "Technical Blueprint" style: blue technical drawing, dimension lines, labels next to each part. Palette #0B3D91, #EAF2FF, #FFD166, #9AD1FF, #0A3278; IBM Plex Mono for titles and IBM Plex Sans for body text. Key motion: technical lines are drawn step by step over a grid; dimension lines extend with arrows and mono numbers; notes appear with a pulsing ring. Medium pacing: 3 shots per 10 s (±3.3 s/shot); audio: industrial ambient 90 BPM.
```

### EDU-09

**Narration + Graphics** (Narasi + Grafis). Clean graphics, minimal on-screen text; the narration carries the content.

- **Use:** Use for voice-based courses, concept explanations. Avoid for videos watched with the sound off.
- **Duration:** 2–6 min per lesson · **Aspect:** 16:9
- **Key motion:** the central icon changes with a spin and a spring; dots orbit a circle; a narration sound wave and a short title for each step
- **Palette:** `#FCFCFC` `#212529` `#FF6B6B` `#4D96FF` `#F1F3F5`
- **Font:** Poppins (titles) + Inter (body)
- **Slots:** Style / background: Flat vector: solid colors + geometric shapes; Composition: Text left, visual right; Lettering: Poppins (titles) + Inter (body); motion: soft rise (fade-up); Subtitles: No subtitles; Accent: Sound wave; Pacing: Medium: 3 shots per 10 s (±3.3 s/shot); Transition: Dissolve (crossfade); Camera: Floating parallax; Audio: Narration first, very faint music; Aspect: 16:9
- **Blocks:** `accents/icon-morph` (accent), `text/svg-mask` (lettering), `transitions/fade` (transition), `camera/float` (camera)
- **Add:** `mgp add accents/icon-morph text/svg-mask transitions/fade camera/float --into index.html`
- **Why:** Modality principle: graphics + narration work better than graphics + on-screen text.

Ready-to-copy brief:

```text
Make a 16:9 education video of 2–6 minutes per lesson in the "Narration + Graphics" style: clean graphics, minimal on-screen text; the narration carries the content. Palette #FCFCFC, #212529, #FF6B6B, #4D96FF, #F1F3F5; Poppins for titles and Inter for body text. Key motion: the central icon changes with a spin and a spring; dots orbit a circle; a narration sound wave and a short title for each step. Medium pacing: 3 shots per 10 s (±3.3 s/shot); audio: narration first, very faint music.
```

### EDU-10

**Cheerful Kids** (Anak Ceria). Bright colors, bouncing letters, confetti.

- **Use:** Use for children's content, early childhood (PAUD), family education. Avoid for formal adult content.
- **Duration:** 2–6 min per lesson · **Aspect:** 16:9
- **Key motion:** colorful letters drop and bounce; a sun with a face spins and balloons float; shapes with faces pop in with a bounce, confetti falls
- **Palette:** `#FFF4D6` `#2D2A32` `#FF595E` `#1982C4` `#8AC926`
- **Font:** Baloo 2 (titles) + Nunito (body)
- **Slots:** Style / background: Pastel + glossy jelly shapes; Composition: Layered illustrated scene; Lettering: Baloo 2 (titles) + Nunito (body); motion: bouncing per letter; Subtitles: Word-by-word karaoke pill; Accent: Rating stars; Pacing: Medium-fast: 4 shots per 10 s (±2.5 s/shot, about the average shot length of modern films [CUT]); Transition: Circle iris; Camera: Handheld (light shake); Audio: Cheerful kids' song 120 BPM; Aspect: 16:9
- **Blocks:** `accents/spring-pop` (accent), `accents/confetti` (accent), `text/rising-words` (lettering), `transitions/iris` (transition), `transitions/rubber` (transition)
- **Add:** `mgp add accents/spring-pop accents/confetti text/rising-words transitions/iris transitions/rubber --into index.html`
- **Why:** Statista 2026 maps the YouTube content watched by children (Gen Alpha) by age.

Ready-to-copy brief:

```text
Make a 16:9 education video of 2–6 minutes per lesson in the "Cheerful Kids" style: bright colors, bouncing letters, confetti. Palette #FFF4D6, #2D2A32, #FF595E, #1982C4, #8AC926; Baloo 2 for titles and Nunito for body text. Key motion: colorful letters drop and bounce; a sun with a face spins and balloons float; shapes with faces pop in with a bounce, confetti falls. Medium-fast pacing: 4 shots per 10 s (±2.5 s/shot, about the average shot length of modern films [CUT]); audio: cheerful kids' song 120 BPM.
```

## 11. New trends: pixel & origami (TRN)

Two digital craft styles on the rise: retro pixel art and folded paper origami. They stand out in the feed right away.

### TRN-01

**8-bit Arcade Pixel Art** (Pixel Art Arcade 8-bit). A retro game world: a sharp pixel grid, a limited palette, choppy 10 fps motion, a score HUD and dialog boxes.

- **Use:** Use for gaming content, gamified education, youth campaigns, level/achievement announcements. Avoid for calm luxury brands, topics of grief.
- **Duration:** 15–30 s · **Aspect:** 16:9
- **Key motion:** a pixel character runs and jumps on every beat to collect coins (+100); the city and hills scroll in layers with choppy 10 fps motion; the score counts up and the dialog box types letter by letter
- **Palette:** `#0B0A1F` `#FFFFFF` `#FF3864` `#2DE2E6` `#F9C80E`
- **Font:** Press Start 2P (titles) + Pixelify Sans (body)
- **Slots:** Style / background: 8-bit pixel art: 1 art pixel = 4 screen pixels, 5-color palette, starry sky; Composition: Character running in the center, parallax city behind, HUD on top; Lettering: Press Start 2P (HUD) + Pixelify Sans (dialog); motion: typed letter by letter; Subtitles: RPG dialog box at the bottom; Accent: +1 coin, score counting up, life hearts; Pacing: Fast: 4 beats per 8 s, a jump on every beat; Transition: Hard cut + LEVEL screen; Camera: Layered side-scroll; Audio: Chiptune 140-150 BPM, coin & jump SFX; Aspect: 16:9
- **Blocks:** `text/typewriter` (lettering), `labels/bold` (card), `subtitles/highlight` (subtitles), `data/counter` (accent), `textures/stop-motion` (accent), `transitions/grid` (transition), `textures/dither` (style)
- **Add:** `mgp add text/typewriter labels/bold subtitles/highlight data/counter textures/stop-motion transitions/grid textures/dither --into index.html`
- **Why:** The retro and 'imperfect by design' aesthetic is rising; pixel art is recognized across generations and is cheap to produce because the assets are small.

Ready-to-copy brief:

```text
Make a 15–30 second 16:9 motion video in the "8-bit Arcade Pixel Art" style: a retro game world: a sharp pixel grid, a limited palette, choppy 10 fps motion, a score HUD and dialog boxes. Palette #0B0A1F, #FFFFFF, #FF3864, #2DE2E6, #F9C80E; Press Start 2P for titles and Pixelify Sans for body text. Key motion: a pixel character runs and jumps on every beat to collect coins (+100); the city and hills scroll in layers with choppy 10 fps motion; the score counts up and the dialog box types letter by letter. Fast pacing: 4 beats per 8 s, a jump on every beat; audio: chiptune 140-150 BPM, coin & jump SFX.
```

### TRN-02

**16-bit Cozy Pixel Art** (Pixel Art Cozy 16-bit). A warm pixel room: a morning-dusk-night cycle, rain on the window, a cat, a dithered desk lamp, soft dialog text.

- **Use:** Use for lo-fi/study with me, reflections, vertical personal stories, cafe/book promos. Avoid for aggressive price promos, dense data.
- **Duration:** 20–45 s · **Aspect:** 9:16
- **Key motion:** the window changes from morning to dusk to night through a palette swap; pixel rain, coffee steam and the cat's tail move in steps; the dithered desk lamp glow grows warmer and the dialog is typed slowly
- **Palette:** `#2B2140` `#FFF4E0` `#F4A259` `#8CB369` `#F7D08A`
- **Font:** Pixelify Sans (titles) + Inter (body)
- **Slots:** Style / background: 16-bit pixel art: room interior, limited warm palette, dithered light; Composition: Big window on top, desk + cat in the middle, dialog box at the bottom; Lettering: Pixelify Sans; motion: typed slowly; Subtitles: Framed dialog box; Accent: Coffee steam, cat tail, stepped rain; Pacing: Slow: 3 scenes per 8 s (morning, dusk, night); Transition: Time-of-day palette swap; Camera: Static, small details move; Audio: Lo-fi 70-85 BPM, rain & typing; Aspect: 9:16
- **Blocks:** `text/typewriter` (lettering), `subtitles/highlight` (subtitles), `textures/stop-motion` (accent), `transitions/fade` (transition), `textures/dither` (style), `textures/grain` (style)
- **Add:** `mgp add text/typewriter subtitles/highlight textures/stop-motion transitions/fade textures/dither textures/grain --into index.html`
- **Why:** The cozy/lo-fi format lasts on video platforms; the pixel version gives a strong identity and feels handmade.

Ready-to-copy brief:

```text
Make a 20–45 second 9:16 motion video in the "16-bit Cozy Pixel Art" style: a warm pixel room: a morning-dusk-night cycle, rain on the window, a cat, a dithered desk lamp, soft dialog text. Palette #2B2140, #FFF4E0, #F4A259, #8CB369, #F7D08A; Pixelify Sans for titles and Inter for body text. Key motion: the window changes from morning to dusk to night through a palette swap; pixel rain, coffee steam and the cat's tail move in steps; the dithered desk lamp glow grows warmer and the dialog is typed slowly. Slow pacing: 3 scenes per 8 s (morning, dusk, night); audio: lo-fi 70-85 BPM, rain & typing.
```

### TRN-03

**Folding Origami Crane** (Origami Bangau Lipat) ★ featured pick. A sheet of paper is truly folded step by step into a crane that flaps and flies away; the shadows and the paper sides change with it.

- **Use:** Use for hope/brand-value campaigns, event openers, process education, greetings & special moments. Avoid for fast content full of numbers.
- **Duration:** 15–60 s · **Aspect:** 16:9
- **Key motion:** a sheet of paper is truly folded twice, with the front and back sides showing different colors; the crane forms with a bounce, then flaps its wings; the crane flies out while a paper plane crosses the background
- **Palette:** `#F3EDE2` `#2A2622` `#D1495B` `#EDAE49` `#00798C`
- **Font:** Shippori Mincho (titles) + Zen Maru Gothic (body)
- **Slots:** Style / background: Origami: textured washi paper, 3D folds with different colors on the front and back; Composition: One paper object in the center, a paper plane crossing the background; Lettering: Shippori Mincho (titles) + Zen Maru Gothic (body); motion: soft rise; Subtitles: Calm serif at the bottom; Accent: Fold step label 1/4; Pacing: Calm: 4 fold steps per 8 s; Transition: The fold itself as the transition; Camera: Slow float following the paper; Audio: Soft piano/koto 70-90 BPM, paper rustle SFX; Aspect: 16:9
- **Blocks:** `text/rising-words` (lettering), `transitions/flip-3d` (transition), `transitions/paper-collage` (transition), `accents/path-arc` (accent), `camera/float` (camera), `textures/grain` (style)
- **Add:** `mgp add text/rising-words transitions/flip-3d transitions/paper-collage accents/path-arc camera/float textures/grain --into index.html`
- **Why:** The handcrafted, tactile aesthetic is rising in 2026; paper folds give a patient, meaningful feel that ordinary templates find hard to copy.

Ready-to-copy brief:

```text
Make a 15–60 second 16:9 motion video in the "Folding Origami Crane" style: a sheet of paper is truly folded step by step into a crane that flaps and flies away; the shadows and the paper sides change with it. Palette #F3EDE2, #2A2622, #D1495B, #EDAE49, #00798C; Shippori Mincho for titles and Zen Maru Gothic for body text. Key motion: a sheet of paper is truly folded twice, with the front and back sides showing different colors; the crane forms with a bounce, then flaps its wings; the crane flies out while a paper plane crosses the background. Calm pacing: 4 fold steps per 8 s; audio: soft piano/koto 70-90 BPM, paper rustle SFX.
```

### TRN-04

**Fold-Unfold Origami** (Origami Lipat Buka). Accordion-folded paper opens to reveal a message, a folded corner becomes the accent, then a paper plane carries the call to action.

- **Use:** Use for announcements, digital invitations, eco-friendly product launches, 3-point recaps. Avoid for long documentaries, futuristic technology topics.
- **Duration:** 15–60 s · **Aspect:** 16:9
- **Key motion:** the accordion paper opens fold by fold, carrying its message; the card corner folds down with a shadow and a fold sheen sweeps across; a paper plane glides in with the call to action at the end
- **Palette:** `#1F2A44` `#FFF8EE` `#F25F5C` `#FFE066` `#70C1B3`
- **Font:** Fraunces (titles) + Inter (body)
- **Slots:** Style / background: Accordion-folded paper on a textured dark blue background; Composition: One paper card in the center, a paper boat icon below the title; Lettering: Fraunces (titles) + Inter (body); motion: opens together with the folds; Subtitles: Clean, inside the card; Accent: Folded paper corner (dog-ear) + fold sheen; Pacing: Medium: 3 messages per 8 s; Transition: Accordion unfold, fold closed at the end; Camera: Static; Audio: Light acoustic 90-100 BPM, paper fold SFX; Aspect: 16:9
- **Blocks:** `text/svg-mask` (lettering), `titles/calm` (card), `accents/spring-pop` (accent), `accents/light-sweep` (accent), `ui/panel-open` (transition), `transitions/slide` (transition)
- **Add:** `mgp add text/svg-mask titles/calm accents/spring-pop accents/light-sweep ui/panel-open transitions/slide --into index.html`
- **Why:** Fold-unfold gives an 'opening a gift' moment that sparks curiosity, a good fit for announcements and invitations.

Ready-to-copy brief:

```text
Make a 15–60 second 16:9 motion video in the "Fold-Unfold Origami" style: accordion-folded paper opens to reveal a message, a folded corner becomes the accent, then a paper plane carries the call to action. Palette #1F2A44, #FFF8EE, #F25F5C, #FFE066, #70C1B3; Fraunces for titles and Inter for body text. Key motion: the accordion paper opens fold by fold, carrying its message; the card corner folds down with a shadow and a fold sheen sweeps across; a paper plane glides in with the call to action at the end. Medium pacing: 3 messages per 8 s; audio: light acoustic 90-100 BPM, paper fold SFX.
```

## Research sources

| Key | Title | URL |
|---|---|---|
| W26 | Wyzowl, Video Marketing Statistics 2026 (secondary) | https://wyzowl.com/sovm-results-2025/ |
| HS26 | HubSpot State of Marketing 2026 (secondary) | https://www.clickminded.com/video-marketing-statistics/ |
| WI26 | Wistia State of Video 2026 | https://wistia.com/state-of-video |
| ST25 | Statista, video content type by weekly reach Q2 2025 | https://www.statista.com/statistics/1254810/top-video-content-type-by-global-reach/ |
| GT | Think with Google, Gen Z & long-form | https://business.google.com/us/think/consumer-insights/gen-z-long-form-videos/ |
| YTC | YouTube Culture & Trends | https://blog.youtube/culture-and-trends/culture-trends-report-gen-z-multiformat-shorts-creator-pop-culture/ |
| SUB | Subscribr, YouTube content trends | https://subscribr.ai/p/youtube-content-strategy-trends |
| OUT | Outlierkit, faceless business documentaries | https://outlierkit.com/resources/faceless-business-documentary-channels/ |
| FCL | Summary of faceless YouTube formats 2026 (vendor) | https://stackinfluence.com/blog/faceless-youtube-channel-ideas |
| DOC | Map & archive documentary styles (Vox/Johnny Harris listing; AHA 2025 archiveology; Macalester) | https://aha.confex.com/aha/2025/webprogram/Session26085.html |
| TTS | Short-form statistics 2026 (revid, secondary) | https://www.revid.ai/short-form-video-statistics |
| CUT | Cutting et al., Perception 2011 (i-Perception) - film shot length 1935-2010 | https://journals.sagepub.com/doi/10.1068/i0441aap |
| GUO | Guo, Kim & Rubin 2014, L@S (DOI 10.1145/2556325.2566239) | https://oscqr.suny.edu/?p=3213 |
| MAY | Mayer, Multimedia Learning principles | https://u.osu.edu/multimedialearning/?p=11 |
| LSC | The Learning Scientists, Designing Effective Instructional Videos | https://www.learningscientists.org/blog/2021/7/1-1 |
| AMI | Amini et al., Hooked on Data Videos (Microsoft Research / Univ. Manitoba) | https://hci.cs.umanitoba.ca/publications/details/hooked-on-data-videos-assessing-the-effect-of-animation-and-pictographs-on |
| FL | Flourish & EU Data Visualisation Guide | https://data.europa.eu/apps/data-visualisation-guide/scrollytelling-animated-transition |
| EXS | Explainer style guides (yansmedia, breadnbeyond, motiongility) | https://www.yansmedia.com/blog/how-to-choose-explainer-video-style |
| ANI | Animation style guides (pixune, vidico) + PortalInk UIST 2024 | https://jeffhuang.com/papers/PortalInk_UIST24.pdf |
| CV26 | Canva Design Trends 2026 'Imperfect by Design' | https://www.businesswire.com/news/home/20251210696597/en |
| CVT | Canva video templates | https://www.canva.com/video-editor/templates/ |
| PP26 | Pinterest Predicts 2026 | https://www.contentgrip.com/pinterest-predicts-2026-trends/ |
| PIN | Pinterest boards on kinetic typography & motion collage | https://pl.pinterest.com/macieju/motion-collage/ |
| TTN | TikTok Next 2026 'Irreplaceable Instinct' | https://newsroom.tiktok.com/introducing-tiktok-next-2026-our-trend-forecast-for-marketers-for-the-year-ahead?lang=en |
| TTB | TikTok Ads, Creative best practices | https://ads.tiktok.com/help/article/creative-best-practices |
| META | Meta Reels ads guidance (vendor + Marketing API) | https://developers.facebook.com/documentation/ads-commerce/marketing-api/creative/reels-ads |
| MC26 | Metricool 2026 Instagram Study | https://metricool.com/press-release-instagram-study-2026/ |
| IGT | Summary of Instagram trends 2026 (vendor) | https://posteverywhere.ai/blog/instagram-trends-2026 |
| CC | CapCut, Latest editing trends 2026 | https://www.capcut.com/help/latest-capcut-editing-trends |
| SPR | Sprout Social 2026 via EICTA IIT Kanpur (secondary) | https://www.eicta.iitk.ac.in/knowledge-hub/digital-marketing/short-video-marketing-strategy-2026 |
| VB26 | Videobolt, Top Motion Graphics Trends 2026 (+ similar roundups) | https://blog.videobolt.net/post/top-motion-graphics-trends-2026 |
| LYR | Lyric video research (IEEE Access 2022; MediaCommons; PremiumBeat; Morphic) | https://doaj.org/article/f9aca1391cec4c9fb298cc98fcc2ec0c |
| CAP | Creator caption guides 2026 (blitzcut, subclip, subscribr) | https://subscribr.ai/youtube-strategy/editing-talking-head-videos-engaging |
| JUP | Jupitrr, Edit talking head videos (2026) | https://jupitrr.com/how-to/edit-talking-head-videos |
| SAAS | SaaS demo video guides (rswebsols, vidico, contentbeta) | https://www.rswebsols.com/saas-demo-video-style/ |
| TRR | TrustRadius 2024 via blog (secondary) | https://blog.mean.ceo/?p=11584 |
| AID | AI SaaS demo guide 2026 (arcade) | https://www.arcade.software/post/saas-product-demos-guide |
| BR | Brand motion trend roundup 2026 (graphicdesignjunction, tangence) | https://graphicdesignjunction.com/2026/01/video-and-motion-creative-trends-2026/ |
| TYP | Types of motion graphics (vidico, webdew, b2w) | https://vidico.com/news/types-of-motion-graphics/ |
| STA | Statista, Gen Alpha YouTube content 2026 | https://www.statista.com/statistics/1659855/us-youtube-content-watched-by-gen-alpha-by-age/ |
