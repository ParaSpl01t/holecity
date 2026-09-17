# TODOS

_v0.1.x = phases 1-5, planned from `INBOX.md` `## v0.1.x` (2026-09-16)._

## Phase 1 - foundation ✅ (2026-09-16, v0.1.0)

- [x] stack approved (2026-09-16): Vite + TypeScript + three.js, no UI framework (no HUD or lobby
      yet). Dev: vitest, @playwright/test, prettier
- [x] scaffold: `package.json` created at `0.0.0` (first bump `minor` -> `v0.1.0`, then `patch`),
      scripts `dev` / `build` / `preview` / `check` / `format` (`test` lands with vitest in
      Phase 4), `.gitignore`, `.prettierrc` matching dmrabbit
- [x] perf approach decided (2026-09-16): best practices and common sense. No low-end device
      target, no numeric budget
- [x] world units: 1 unit = 1 m, y up, playzone centered on the origin (`CLAUDE.md` rule)
- [x] renderer: DPR capped at 2, no shadow maps, no post-processing, MSAA only below 2x DPR,
      resize handled, context loss left to three.js (verified in its source)
- [x] frame loop: single `requestAnimationFrame`, dt-based updates, dt clamped so a tab switch
      cannot teleport the hole
- [x] FPS counter: bottom-left, dark opaque bg, white text. DOM text written ~2x/s, not per frame

## Phase 2 - terrain ✅ (2026-09-16, v0.1.2)

- [x] palette: main green, accent green (slightly darker), a lighter tint of each for the tile
      look, concrete, sea. Pastel and cartoonish (Voodoo, Brawl Stars). `src/world/palette.ts`
- [x] playzone `200*200` m: one mesh, one draw call. Tile colors from a data texture, 1 texel per
      tile, nearest filtering, base and tint alternating per tile. Tile size 2 m
- [x] accent patches: small, occasional (1 per 400 tiles, radius 1.2-2.8 tiles, wobbled edge),
      in place of main green. Seeded (mulberry32), so every load matches
- [x] borderzone: 10 m concrete path around the playzone, one ring shape (no overdraw). Seen
      headless with the hole driven into the -x -z corner
- [x] outzone: sea as the scene background color (zero draw cost). Seen in the same corner shot

## Phase 3 - player and camera ✅ (2026-09-16, v0.1.2)

- [x] hole: black disc 4 m wide (2 m radius), 1 m yellow ring outside it, 3 m total radius
      (confirmed 2026-09-16). One merged mesh with vertex colors, one draw call
- [x] camera: perspective, 30 deg tilt, 60 m away, hard-locked on the hole (no easing). 40 m
      span across the shorter screen side in portrait and landscape
- [x] movement: dt-based, 12 m/s top speed. Hole center clamped per axis to playzone bounds, so
      every corner is reachable, the hole overhangs into the borderzone there and slides along
      edges
- [x] input WASD by `event.code` (layout-independent), diagonals normalized, modifier combos
      ignored
- [x] input mouse: steers toward the cursor's ground point, no button. 1 m dead zone, speed ramps
      to full over the next 4 m
- [x] input touch: floating joystick for touch and pen, 56 px travel, 12% dead zone, first
      finger only
- [x] input arbitration: last-used source wins. Window blur, hidden tab and cursor leaving the
      window stop movement
- [x] verified headless: WASD reaches and pins at a corner, mouse steers and stops on the hole,
      touch drag steers right and stops on release (moving/stopped by screenshot byte compare)

## Phase 4 - tests and perf ✅ (2026-09-16, v0.1.6)

_2026-09-16, admin: this much testing is too heavy for the draft stage and slows getting to a
real playable draft. Scope set in `CLAUDE.md` ("Test scope while the game is a draft")._

- [x] unit (vitest, `pnpm test`, 23 tests, 0.4 s): clamp at edges and corners, direction per input
      source, patch layout per seed + fingerprint, camera span and center lock
- [x] browser (Playwright, `pnpm test:e2e`, 18 tests, ~1 min, production build): spawn colors, FPS
      readout, DPR cap, no scroll, context restore, WASD / mouse / touch to edges, cursor rest,
      cursor leave, blur, last-input arbitration, finger release. No console errors
- [x] perf sanity: frame times and draw calls per frame logged on desktop and phone (3 draws)
- [x] three.js in its own chunk (554 kB; game code 6.5 kB) + `/assets/*` immutable in
      `vercel.json`. Verified on production v0.1.6: `three-*.js` sends
      `public, max-age=31536000, immutable`, the page stays `max-age=0, must-revalidate`
- [x] every test seen failing once: descoped by admin (2026-09-16). Done for all 23 unit tests
      and browser round A (15 of 18 red at the intended assertion). Rounds B (context restore,
      arbitration) and C (perf) not run

## Phase 5 - vercel ✅ (2026-09-16, v0.1.5)

_Requested 2026-09-16: every push to `main` deploys to production, same domain every time._

- [x] push policy decided (2026-09-16): a push to `main` is a production deploy, and a deploy is a
      push to `main`. No separate deploy step (`CLAUDE.md` rule)
- [x] production deployments public: `holecity.vercel.app` returns the game with no login
      (curl body + headless render, 2026-09-16). Per-deployment URLs
      (`holecity-<hash>-...vercel.app`) redirect to Vercel SSO: default Standard Protection, kept
      as is by admin decision (2026-09-16: only the production domain is public)
- [x] project `holecity` (`tushar10141-1854s-projects`, `prj_kiM68fZAXV92pgBwysZjGnYsUb3o`)
      created by `vercel link --yes`, GitHub repo connected. Vite preset, output `dist`, Node
      24.x, install/build auto-detected (pnpm lockfile)
- [x] Vercel plugin installed, project scope only (`.claude/settings.json`), admin request
- [x] `holecity.vercel.app` is the project's production domain, auto-assigned to every new
      production deployment. Never a `vercel alias` pinned to one deployment. Verified: stamp
      moved from `200d47b` (v0.1.3) to `9516d86` (v0.1.4) on the same domain with no manual
      step. Instant Rollback does pause auto-assign (confirmed in docs, `CLAUDE.md` rule)
- [x] build stamp: `<meta name="build">` from `VITE_VERCEL_GIT_COMMIT_SHA` (Vercel sets it; `.env`
      default `dev` locally). Version follows from the SHA
- [x] verify after a push: v0.1.3 production stamp equals pushed `HEAD` (polled, first try 8 s
      build), headless Chromium renders the game on production, no console errors

---

_v0.2.x = phases 6-9, planned from `INBOX.md` `## v0.2.x` (2026-09-16). First bump `minor` ->
`v0.2.0`. Tests follow the `CLAUDE.md` draft-stage scope._

_2026-09-16, admin: build phases 6-9 in one go with light testing on the way (typecheck, a
visual check), then one complete test run (unit + browser, updated to the new visuals) and one
push._

## Phase 6 - raised borderzone ✅ (2026-09-16, v0.2.0)

- [x] borderzone raised 1 m: top at y = 1, inner wall facing the playzone, outer wall facing the
      sea. Walls shaded per facing with the objects' toon light, baked into vertex colors. Seen
      in headless screenshots at the playzone edge
- [x] borderzone tiled like the playzone: 2 m tiles, concrete and concrete tint checker, one
      110x110 texture shared with the playzone
- [x] hole overlapping the raised path: decided (2026-09-16, admin): the path covers the hole.
      Depth does it, since the path top sits 1 m above the hole

## Phase 7 - physics and objects ✅ (2026-09-16, v0.2.0)

- [x] physics library: Rapier approved (2026-09-16, admin). Proposed as Rapier
      (`@dimforge/rapier3d-compat` 0.20.0, maintained, stable stacking, kinematic bodies, contact
      events). Measured 2026-09-16: 2.86 MB raw, 1.08 MB gzip, loaded as its own lazy chunk and
      cached as immutable. Rejected: cannon-es (774 kB unpacked across all builds, far
      smaller, but unmaintained since 2022 and weaker at stable stacks); separate-file Rapier
      `.wasm` (760 kB gzip, but needs two Vite plugins)
- [x] physics world: fixed 60 Hz step with accumulator (max 4 steps per frame), render
      interpolation, sleeping bodies, gravity 19.6 m/s² (twice Earth's: Earth's reads as slow
      motion at these sizes). Static slabs for the raised borderzone. Rapier loads lazily; the
      ground and hole work before it arrives
- [x] placement: seeded scatter, no overlaps, 14 m clear around the spawn, 2 m off the edges.
      Counts: 28 stacks, 22 live trees, 26 spheres, 14 dead trees (tunable, not specified)
- [x] cube stacks: 1-3 cubes, each dimension random 2-8 m, same size and placement, one body
      per cube so stacks topple
- [x] spheres: random 2-6 m wide
- [x] dead tree: trunk 2 m wide, 8 m high
- [x] live tree: the same trunk plus 3-4 green leaf spheres, 2-4 m wide, one compound body
- [x] rendering: one instanced mesh per shape (cube, sphere, trunk, leaves), per-instance pastel
      colors, matrices from interpolated physics each frame. 9 draw calls per frame in total
      (perf test)
- [x] lighting for 3D objects: 4-band toon shading, one ambient + one directional light
      (`src/world/lighting.ts`); borderzone walls bake the same bands
- [x] unit tests: placement determinism, spec size and count ranges, no overlaps, spawn and
      edge clearance (`src/objects/layout.test.ts`)

## Phase 8 - real hole ✅ (2026-09-16, v0.2.0)

- [x] visual cutout: stencil mask so no ground is drawn inside the hole, a dark shaft below
      (fading `holeWall` to black), the yellow ring as its rim. Seen in headless screenshots
- [x] physics cutout: solid ground with a round opening that follows the hole. Objects that fit
      fall in; bigger ones rest and tip on the rim (unit tests: sphere swallowed, oversized
      sphere held)
- [x] BUG (admin report 2026-09-16): an object partway through when the hole moves on is left
      half above, half below, sinking through solid ground. Trees split: the trunk dangles below
      ground while the leaves stay up. Cause: "falling" (ignoring the ground) was decided per
      collider, and nothing held a falling object once the hole moved. Fix: fall per object, only
      once its whole footprint fits the opening; falling objects are held inside an invisible
      tube that moves with the hole (above and below ground) and carries them; tree crowns
      compress toward the trunk to fit; the ground is solid (thick), so an object dipped into
      the opening when the rim moves back over it is pushed up, not down. Fixed as described;
      unit tests watch every frame that nothing sits below ground outside the opening (a
      sphere the hole drives through, a tree the hole pauses under and leaves)
- [x] swallowed objects are removed once they drop below the shaft (assumed: no score yet).
      Admin report 2026-09-16: they vanished the instant their top passed ground level, while
      still visible through the opening. Fixed: removal waits until the whole object is below
      the shaft floor (unit test: still present when fully below ground, gone later)
- [x] the hole and its ring are never drawn over the outzone: clipping planes at the land edge.
      Not observable today: the biggest hole (8 m + 1 m ring) reaches 9 m under a 10 m path
- [x] temporary hole size controls (2026-09-16, admin): `[` shrinks, `]` grows (direction
      assumed from the - / + order); on touch, small - and + buttons bottom-right. 0.5 m per
      press, radius 1-8 m. Browser tests for both. Real growth comes later

## Phase 9 - squashy leaves, abyss hole ✅ (2026-09-16, v0.2.0)

- [x] live tree leaves squash like a stress ball on collision (contact force events flatten a
      leaf along the push, then it springs back) and when pulled into a hole smaller than them
      (the whole crown compresses toward the trunk until it fits; unit test: a crown wider than
      the opening goes through)
- [x] BUG (admin report 2026-09-16, "idiotic tree behaviour"): leaves shrink on their own while
      the tree falls. They must compress only while actively squeezing through a narrow opening.
      Cause: the whole crown was compressed as soon as the trunk was over the opening, before
      any leaf touched the rim, and always one step smaller than needed, even when the crown
      already fit. Fix: squeeze per leaf, only while that leaf presses on the rim (a contact
      with the hole's ground) with the trunk being pulled in; squeezed leaves flatten sideways
      and stretch downward, and move toward the trunk; a crown that fits never squeezes.
      Follow-up report (same day): leaves did not compress enough; the tree stuck on the rim
      with the trunk hanging in the pit. Causes: a trunk resting off-center against the rim
      never counted as "pulled", and the drop test demanded a perfect fit, which a leaning
      trunk never gives. Fix: "pulled" = trunk base below ground; the hole draws a pulled tree
      toward its center (upright, centered); a pressed leaf's squeeze only grows while the tree
      is pulled through (no spring-back halfway); the drop test itself went away with the
      redesign below. Verified: unit tests (4 m hole: first squeeze only after 0.5 s, when the
      crown reaches the rim, tree swallowed; a crown that fits never squeezes) and headless
      screenshots (full-size crown on arrival, narrow stretched leaves going through, then gone)
- [x] BUG (admin report 2026-09-16): objects, trees with leaves most of all, can still end up
      half above, half below ground. The hole's border must be a colliding boundary: nothing
      passes through it, horizontally or vertically. Cause: the ground around the opening is
      teleported with the hole (so it cannot drag resting objects), which means its rim moves
      through anything hanging into the opening instead of pushing it. Fix: the opening's edge
      is a thin collar moving with a real velocity (frictionless, so it pushes but never drags);
      the teleported ground's opening sits past the collar. Guard: unit tests check every frame
      that anything crossing the surface crosses it inside the opening (a sphere driven through,
      a tree left early, a tree swallowed after a pause, a bar the hole sweeps back across)
- [x] REDESIGN (admin, 2026-09-16): "the hole should be a small opening to an empty abyss,
      endless in every direction, small from the top, no hitbox below the surface". It was a
      cylinder: shaft walls below, a tube above, a drawn shaft with a floor. Now: thin solid
      ground (1 m) with the collar as its edge; nothing below the surface but void; objects
      that pass through fall freely and are removed once out of sight. No "falling" state and
      no tube: objects always collide with the ground, and the opening itself is what lets
      them through. Visual: a short dark band (the edge's thickness), then black void.
      Supersedes the tube part of the first split-object fix above. Done: `hole-body.ts`
      (ground + collar only), `hole.ts` (edge band + black backdrop), falling state and
      collision groups removed
- [x] BUG (admin report 2026-09-16): "the outside part of the hole border hits the objects like a
      carrom board piece". Cause: the collar (moving with velocity) had its top flush with the
      ground surface and reached 1 m past the opening, so objects merely resting next to the
      hole met its top and outer corner at full hole speed. Fix: the collar sits just below the
      surface and only its inner face (the opening's side) matters; resting objects only ever
      touch the teleported ground, so only parts actually hanging into the opening get pushed.
      Unit test: a sphere resting 2.5 m off the hole's path moves under 0.1 m as the hole
      drives past (not seen failing first: failure injection is paused in this repo)
- [x] rolling objects settle: with the solid edge, a too-big object the hole drives under gets
      shoved at hole speed and rolled on for 20 s+ (found by the browser test at the +x edge
      never going still; pixel diff showed one slowly drifting object). Damping raised from
      0.2 / 0.5 to 0.5 / 2 per s (linear / angular)
- [x] BUG (found by the browser suite, 2026-09-16): below 2 fps the FPS readout never appears.
      It treated any frame gap over its 500 ms window as a hidden tab and restarted. Fix: only
      gaps over 2 s count as a hidden tab
- [x] browser suite runs 2 workers, not 4: four software-rendered browsers on one CPU dropped
      to ~3 fps, where the game (time step capped at 0.1 s) moves too slowly for the 40 s waits
- [x] browser tests judge hole motion by the hole's position, not by whole-screen pixels: with
      physics, objects move on their own, so a still hole can still change the picture ("the
      cursor overrides a held key" failed that way). The page exposes the hole position when
      opened with `?e2e` (a reference, no per-frame cost). Color checks stay pixel-based.
      "Still" means under 1 mm in 400 ms: a cursor exactly on the hole's row steers by float
      rounding (~1e-15 m per frame), which failed an exact-equality check
- [x] v0.2 milestone: browser tests updated to the new visuals, `pnpm test:e2e` green. Was 20 of
      20 before the redesign; after it, 19 of 20 (the rolling object above), then 16 of 20 (the
      FPS and worker items above), then 19 of 20 (the item above, twice). Green: 20 of 20, unit
      36 of 36 (2026-09-16)

---

_v0.3.x = phases 10-17, planned from `INBOX.md` `## v0.3.0` (2026-09-17). First bump `minor` ->
`v0.3.0`. Tests follow the `CLAUDE.md` draft-stage scope. Order: the environment standard first
(the sea becomes a real surface: the waves draw on it, stranded objects can land on it), then the
independent items, see-through after powerups (its targets include halos), the moon, and the
lobby last (both its buttons need a real environment). Phases marked "needs admin decision" wait
on the questions asked in chat 2026-09-17._

_2026-09-17, admin: "start", with the chat questions unanswered. Phase 10 goes ahead on its
assumed debug elevations (path 1 m, sea surface 2 m below the path top)._

## Phase 10 - environment standard ✅ (2026-09-17, v0.3.0)

_Inbox: outzone, borderzone and playzone are the standard in every environment, with elevation
and design variations. Each zone has a base terrain per environment. Tiles stop being global:
they are the debug environment's (today's) terrain._

- [x] environment definition (`src/environments/environment.ts`): seed, borderzone height,
      outzone level, clear color, base terrain builder. Zone sizes stay shared in
      `src/world/zones.ts` (plus `LAND_HALF`, which `terrain.ts` and `hole.ts` each defined).
      Resolves the deferred "environment definition" item
- [x] elevations: playzone at 0, borderzone top above it, outzone surface below the borderzone
      top. Debug environment (assumed, to confirm): borderzone stays 1 m (admin, v0.2), sea
      surface at -1 m (2 m below the path top), outer wall runs down to the sea. Seen headless at
      the +x +z corner: the outer wall strip doubled, no console errors
- [x] debug environment (`src/environments/debug/`): today's look through the definition. Tile
      size, patch generator, land texture and ground colors (`debugPalette`) moved there;
      `src/world/palette.ts` keeps the hole and object colors, shared by every environment
- [x] outzone is a real surface: a flat square ring from the land edge out 200 m
      (`OUTZONE_REACH`: fills every view down to a 1:3 portrait window), clear color beyond.
      Draw calls per frame 9 -> 10 (perf browser test, desktop), which proves it is drawn: it is
      the clear color's exact color until Phase 11
- [x] physics takes the borderzone height from the definition (`createSimulation` takes the
      environment)
- [x] unit tests: borderzone above the playzone, outzone below the borderzone top, per
      environment; tile tests moved with the generator. 38 of 38

## Phase 11 - sea waves ✅ (2026-09-17, v0.3.1)

- [x] idle "bubbled white water" (no reference given, assumed): a white foam band hugging the
      path's outer wall, breathing in and out; round pulsing bubbles along its outer edge;
      broken foam lines rolling in toward the shore and merging into the band; sparse foam
      clusters drifting on open water from 12 m out (`CALM_REACH`). Flat, pastel, cartoon
      (`src/environments/debug/sea.ts`)
- [x] one draw call: a shader on the sea mesh; its one time uniform is set in the material's
      `onBeforeRender`, so only when the sea is drawn. Foam from the analytic distance to the
      land square (rounded at corners) and cell hashes; no textures
- [x] seen in headless screenshots at the +x +z corner, two frames 1.5 s apart: foam moves, no
      console errors. First pass left 1 px specks all over the water: shapes shrunk to zero
      size still drew a half-covered anti-aliased pixel at their center. Fix: every shape's
      coverage also fades with its size below a pixel. Motion to be judged by the admin on the
      dev server
- [x] browser tests sample the sea where it is always plain: `PLAIN_WATER` (`e2e/fixtures.ts`),
      halfway between the wave lines' reach and the drifting foam, derived from the shader's
      constants. The touch test now projects that point through the game's camera rig
      (`worldToScreen`) and lifts the finger first (the joystick covered the new point: first
      run failed with rgb(97,182,216)). Desktop 7 of 7, touch 3 of 3

## Phase 12 - stranded objects ⬜ (needs admin decision)

_Inbox: objects that end up on top of the borderzone can never be swallowed; admin asks what can
be done. Cause: the hole's physics opening is in the ground at y = 0, under the path's slabs, and
the path covers the hole (admin, v0.2)._

- [ ] find how they get there before fixing: a headless run driving the hole along the edges,
      logging each object that comes to rest on the path and what put it there (toppled stack,
      shoved sphere climbing the 1 m step, falling tree). Recorded in `MEMORY.md`
- [ ] decision, proposed: an object resting outside the playzone (path, or a solid outzone like
      the moon's) pops after a short delay and is gone, with the pop from Phase 14. Alternative:
      the path nudges resting objects back over its ledge into the playzone (keeps every object,
      but objects visibly slide on their own, and a borderzone sloping outward fights the nudge)
- [ ] objects pushed off the outer edge sink through the sea surface (no sea collider), out of
      sight, and are removed. Correction (2026-09-17): this line first said "as today". Read in
      `src/physics/hole-body.ts`, not yet run: the hole's ground reaches 300 m around the hole,
      past the land edge, so such an object likely rests on invisible ground at y = 0, now 1 m
      above the sea surface. Prove with a unit test, then fix (e.g. objects past the land edge
      stop colliding with the hole's ground)
- [ ] only if toppling from near the edge is the main cause: objects spawn farther from the edge
      (margin grows with the object's height; `EDGE_MARGIN` is 2 m, stacks stand up to 24 m)

## Phase 13 - tree trunks ✅ (2026-09-17, v0.3.2)

_Inbox: not a plain cylinder; slight twist and bends, an almost square base, "a lightly bent in
a few places long cuboid". References `reference/trees/` (viewed 2026-09-17): `image.png`,
`image copy.png`, `image copy 2.png` are low-poly stumps: an 8-sided faceted trunk, flat-shaded,
flaring into pointed root spurs at the base, a cut top with a lighter wood face and a jagged bark
rim (one with a spiral growth ring, one with a side branch stub). `image copy 3.png` is a lineup
of low-poly trees: faceted trunks twisted and bent, root flares, some forking into branches,
faceted green crowns._

- [x] cross-section: a square with 0.3 m chamfered corners (4 broad faces, 4 narrow bevels),
      "almost square" and 8-sided like the references. 2 m across, 8 m tall, as before
- [x] shape per tree, seeded (`src/objects/trunk.ts`): root flare over the lowest 0.8 m (each
      corner spread 1.2-1.5x, so the base looks rooted), then bends at ~3 m, ~5.5 m and the top,
      each stepping the axis 0.2-0.4 m (never over 0.6 m from the base), a 15-35 deg twist and
      a taper to 0.85 at the top. Flat-shaded facets under the existing toon light; the cut
      face on top is lighter wood (vertex color, references). Live and dead trees share it.
      Trunks draw from their own random sequence, so the layout's sequence is untouched (object
      positions still moved: footprints now come from the real shapes)
- [x] every trunk unique, still one draw call: `createBatch` (`src/objects/instances.ts`, three's
      `BatchedMesh`, multi-draw) replaces the trunk `InstancedMesh`. Draw calls per frame stay
      10; the perf test now counts multi-draws (it wraps the extension object from
      `getExtension`: `WEBGL_multi_draw` is not a global, a first attempt counted nothing)
- [x] collider from the same generator: the convex hull of each straight segment (more exact
      than the planned cuboids, same cost). The crown sits on the bent top, and the tree's own
      top replaced the fixed `TRUNK_TOP` for the pull and "pulled" checks; squeezed leaves move
      toward the crown's axis, not the base's
- [x] unit tests: generator (same seed same trunk, full height, lean bound, fits the 4 m opening
      over 300 seeds, one piece per segment, every face outward); the physics tests' tree now has
      a generated trunk; new: a dead tree is swallowed through the 4 m hole. 45 of 45. Seen in
      a headless screenshot beside the nearest live tree: faceted, flared, bent, cut face on a
      dead tree, no console errors

## Phase 14 - powerup drops ⬜ (needs admin decision)

_Inbox: a 3D magnet rotating and bobbing inside a glowing spherical halo. When it touches the
hole's colored ring, the halo pops, the magnet expands, spins exponentially faster, then pops:
consumed._

- [ ] decision, what the magnet does. Proposed: for 10 s, objects that fit the hole and lie
      within 3 hole radii are pulled toward it
- [ ] decision, when and where drops appear. Proposed: one on the map at a time, at a random
      clear playzone spot outside the spawn clearing, the next ~20 s after the last is taken
- [ ] magnet: red horseshoe with silver tips, primitives merged into one geometry, toon-lit;
      spins about y and bobs
- [ ] halo: sphere with a glowing edge (fresnel shader), additive, pastel
- [ ] pickup: the hole's ring (radius + 1 m) reaches the halo, judged on the ground plane. Drops
      float with no physics body; objects pass through them
- [ ] consume: halo pops (scales up and fades, ~0.15 s); magnet grows while its spin speed
      rises exponentially; then pops (a quick expanding flash) and is gone. Timings tuned on the
      dev server
- [ ] unit tests: pickup distance per hole size, drop placement clear of objects and spawn

## Phase 15 - see-through objects ⬜ (needs admin decision)

_Inbox: an object hiding more than 50% of the halo turns see-through, with side effects to
expect; admin asks the outcome for two objects hiding 49% each. The item names the halo, its
question names the hole._

- [ ] decision, targets. Proposed: both the hole (opening plus ring) and every powerup halo
- [ ] rule, answering 49% + 49%: judge how much of the target is hidden in total, not per object.
      Over 50% hidden: every object hiding any part of it fades. 49% + 49% = 98% hidden, so both
      fade; two slivers adding up to 20% fade nothing
- [ ] measure without GPU readback: ~30 points spread evenly over the target's area, a ray from
      the camera to each through the physics world, all hits (an object behind another still
      counts). Hidden share = blocked rays / rays
- [ ] side effects: hysteresis (fade over 50%, solid again under ~35%) so an object at the line
      never flickers; fades take ~0.2 s; objects falling into the hole never count (being
      swallowed, not hiding it); a tree fades whole, trunk and leaves together
- [ ] rendering: a faded object's instances move to a transparent twin per shape (swap-remove,
      O(1)) with per-instance opacity; an empty twin draws nothing, so no extra draw calls unless
      something is faded
- [ ] unit tests: hidden share for set layouts (one object at 60%: fades; two at 49%: both fade;
      one at 30%: none), hysteresis

## Phase 16 - moon environment, terrain relief ⬜ (needs admin decision)

_Inbox: any zone's base terrain can have depths and elevations. Moon: 1 m deep craters with a
0.5 m rough, pointy raised rim; a borderzone rising from a pointy inner edge to 2 m, easing down
over 10 m to 1 m, so the playzone reads as inside a big crater; outzone like the playzone. Ruined
city: ground cracks with lava at the bottom. Objects conform the ground under them: a building on
a crater rim flattens the rim and fills the crater beneath, with slight smoothing; a building
over a lava crack fills and raises the ground there. Inbox lobby item (added 2026-09-17): the
moon is launchable, so it is the first environment with relief. The ruined city is an example
only, not planned._

- [ ] decision, moon objects: the inbox names buildings only as an example. Debug objects
      (stacks, spheres, trees) on the moon would be a placeholder
- [ ] decision, moon look: colors of ground, crater floors, rims, borderzone, outzone and sky;
      crater count and sizes (only the 1 m depth and 0.5 m rim are given)
- [ ] design first, the hard part: the hole on uneven ground. Today the hole's ground is one flat
      collider moving with the hole (`src/physics/hole-body.ts`) and the opening a flat stencil
      disc at y = 0 (`src/player/hole.ts`). Relief has to stay put while the opening moves:
      Rapier heightfields have no holes, and its JS hooks only filter whole collider pairs, not
      single contacts (0.20.0 typings, checked 2026-09-17). The mask and ring have to drape
      over the ground heights. Design recorded in `MEMORY.md` before building
- [ ] moon playzone: seeded craters, 1 m deep, rough pointy 0.5 m rims. Borderzone: pointy inner
      edge at 2 m easing down over 10 m to 1 m. Outzone: like the playzone, solid (Phase 12's
      stranded rule covers it)
- [ ] ground conforming: heights under each object's footprint flattened or filled with a smooth
      falloff, once at load, never per frame
- [ ] unit tests: height profile (crater depth, rim height, borderzone slope), ground flat under
      a footprint, below-ground watch tests on relief

## Phase 17 - lobby ⬜

_Inbox (added 2026-09-17): a simple lobby with two buttons, launch debug environment and launch
moon environment. Supersedes v0.1.x "no HUD or lobby, directly spawn in a game"._

- [ ] lobby on load: two buttons, "Launch debug environment" and "Launch moon environment"
      (admin's wording), in the existing overlay style
- [ ] launch builds the chosen environment from its definition (Phase 10). three.js and Rapier
      load while the lobby shows, so a launch starts at once
- [ ] back to the lobby: none for now (assumed); a reload shows the lobby again
- [ ] browser tests enter through the lobby (fixture presses the debug button); `?e2e` stays

---

## deferred

- **hole as ground cutout** - moved into Phase 8 (2026-09-16), now that v0.2 brings objects
- **environment definition** - moved into Phase 10 (2026-09-17): the admin specced the standard
  in `INBOX.md` `## v0.3.0`
