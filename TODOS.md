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

## Phase 6 - raised borderzone ⬜

- [ ] borderzone raised 1 m: top at y = 1, inner wall facing the playzone, outer wall facing the
      sea. Walls in a darker concrete shade, since unlit flat color needs shade to read as 3D
- [ ] borderzone tiled like the playzone: 2 m tiles, concrete and concrete tint checker
- [ ] hole overlapping the raised path: PENDING admin decision. Either the path covers the hole
      (it slides under the curb), or the hole cuts through the path too

## Phase 7 - physics and objects ⬜

- [ ] physics library: PENDING admin approval (new dependency). Proposed Rapier
      (`@dimforge/rapier3d-compat` 0.20.0, maintained, stable stacking, kinematic bodies, contact
      events). Measured 2026-09-16: 2.86 MB raw, 1.08 MB gzip, loaded as its own lazy chunk and
      cached as immutable. Rejected: cannon-es (774 kB unpacked across all builds, far
      smaller, but unmaintained since 2022 and weaker at stable stacks); separate-file Rapier `.wasm` (760 kB gzip, but needs two Vite plugins)
- [ ] physics world: fixed 60 Hz step with accumulator, render interpolation, sleeping bodies.
      Static colliders for the playzone ground and the raised borderzone
- [ ] placement: seeded scatter over the playzone, no overlaps, clear area around the spawn.
      Counts per type are tunable constants (assumed, not specified)
- [ ] cube stacks: 1-3 cubes, each dimension random 2-8 m. Cubes in a stack share size and
      placement, stacked exactly on top. Each cube is its own body, so stacks can topple (assumed)
- [ ] spheres: random 2-6 m wide
- [ ] dead tree: trunk 2 m wide, 8 m high
- [ ] live tree: the same trunk plus 3-4 green leaf spheres, 2-4 m wide
- [ ] rendering: one instanced mesh per shape (cube, sphere, trunk, leaves), per-instance pastel
      colors (trunk brown, leaves a green distinct from the grass, cubes and spheres from a pastel
      set: assumed), matrices synced from physics each frame
- [ ] unit tests: placement determinism, size ranges, no overlaps

## Phase 8 - real hole ⬜

- [ ] visual cutout: stencil mask so no ground is drawn inside the hole, a dark shaft below, the
      yellow ring as its rim
- [ ] physics cutout: ground collider with a circular hole that follows the hole, shaft walls
      below. Objects that fit fall in; bigger ones rest and tip on the rim
- [ ] swallowed objects are removed once they drop below the shaft (assumed: no score yet)
- [ ] the hole and its ring are never drawn over the outzone, whatever the hole size
- [ ] hole size vs objects: PENDING admin decision. A fixed 4 m hole never swallows spheres over
      4 m wide or most cubes. Growth now, or later

## Phase 9 - squashy leaves ⬜

- [ ] live tree leaves squash like a stress ball on collision and when pulled into a hole smaller
      than them, then spring back
- [ ] v0.2 milestone: browser tests updated to the new visuals, `pnpm test:e2e` green

---

## deferred

- **hole as ground cutout** - moved into Phase 8 (2026-09-16), now that v0.2 brings objects
- **environment definition** - generalize zones, palette and terrain into a per-environment
  definition once a second environment is specced, not before
