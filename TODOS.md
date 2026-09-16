# TODOS

_v0.1.x = phases 1-5, planned from `INBOX.md` `## v0.1.x` (2026-09-16)._

## Phase 1 - foundation ⬜

- [ ] stack approved. Proposed: Vite + TypeScript + three.js, no UI framework (no HUD or lobby
      yet). Dev: vitest, @playwright/test, prettier
- [ ] scaffold: `package.json` created at `0.0.0` (first bump `minor` -> `v0.1.0`, then `patch`),
      scripts `dev` / `build` / `check` / `test`, `.gitignore`
- [ ] perf budget recorded in `MEMORY.md` before any rendering: target device class, fps floor,
      draw calls, gzipped bundle size
- [ ] world units: 1 unit = 1 m, y up, playzone centered on the origin
- [ ] renderer: DPR capped, no shadow maps, no post-processing, antialias kept only if measured
      affordable, resize and WebGL context loss handled
- [ ] frame loop: single `requestAnimationFrame`, dt-based updates, dt clamped so a tab switch
      cannot teleport the hole
- [ ] FPS counter: bottom-left, dark opaque bg, white text. DOM text written ~2x/s, not per frame

## Phase 2 - terrain ⬜

- [ ] palette: main green, accent green (slightly darker), a tint of each for the tile look,
      concrete, sea. Pastel and cartoonish (Voodoo, Brawl Stars)
- [ ] playzone `200*200` m: one mesh, one draw call. Tile colors from a data texture, 1 texel per
      tile, nearest filtering, base and tint alternating per tile. Tile size assumed 2 m, tuned
      visually
- [ ] accent patches: small, occasional, in place of main green. Seeded, so every load matches
- [ ] borderzone: 10 m concrete path around the playzone
- [ ] outzone: sea beyond the path, filling the rest of the view

## Phase 3 - player and camera ⬜

- [ ] hole: black disc, 2 m radius, 1 m yellow ring (assumed outside the disc, 3 m total)
- [ ] camera: perspective, looking down with a slight tilt, hard-locked on the hole (no easing).
      Visible ground width held steady between portrait and landscape
- [ ] movement: dt-based, capped speed. Hole center clamped to playzone bounds, so every corner is
      reachable and the hole overhangs into the borderzone there
- [ ] input WASD, diagonals normalized
- [ ] input mouse: hole steers toward the cursor's ground point, dead zone under the hole
- [ ] input touch: floating virtual joystick under the thumb, offset sets direction and speed
- [ ] input arbitration: last-used source wins. Window blur and pointer leave stop movement

## Phase 4 - tests and perf ⬜

- [ ] unit (vitest): clamp at edges and corners, direction vector per input source, patch layout
      identical per seed
- [ ] browser (Playwright, headless): frames drawn and non-blank, FPS counter bottom-left with its
      styles, WASD / mouse / touch each move the view (measured on pixels, not inferred), no
      console errors
- [ ] low-end run: CPU throttling, mobile viewport and DPR, frame times checked against the budget
- [ ] every test seen failing once with its violation injected

## Phase 5 - vercel ⬜

_Starts only on explicit request._

- [ ] push policy decided: once Git integration is on, a push to `main` is a production deploy
- [ ] project `holecity` linked to `ParaSpl01t/holecity`: production branch `main`, Vite preset,
      `pnpm build`
- [ ] `holecity.vercel.app` is the project's production domain, auto-assigned to every new
      production deployment. Never a `vercel alias` pinned to one deployment. Check in Vercel
      docs whether an Instant Rollback pauses auto-assign
- [ ] build stamp: commit SHA and version in a `<meta>` tag
- [ ] verify after a push: production body's stamp equals pushed `HEAD`, headless browser renders
      it, reachable without a Vercel login

---

## deferred

- **hole as ground cutout** - v0.1 hole is a disc drawn on the ground. Consumed objects need a real
  cutout (stencil) to fall through. Blocked on objects, which start after v0.1
- **environment definition** - generalize zones, palette and terrain into a per-environment
  definition once a second environment is specced, not before
