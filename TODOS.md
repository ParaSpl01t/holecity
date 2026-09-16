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

## Phase 4 - tests and perf ⬜

- [ ] unit (vitest): clamp at edges and corners, direction vector per input source, patch layout
      identical per seed
- [ ] browser (Playwright, headless): frames drawn and non-blank, FPS counter bottom-left with its
      styles, WASD / mouse / touch each move the view (measured on pixels, not inferred), no
      console errors
- [ ] perf sanity: mobile viewport and DPR, draw calls and frame times logged to catch regressions
      (no pass/fail budget)
- [ ] three.js in its own long-cached chunk: every push deploys, and today each deploy changes the
      one 561 kB bundle (142 kB gzip), so returning players re-download three.js every time.
      Needs a `vite.config.ts`
- [ ] every test seen failing once with its violation injected

## Phase 5 - vercel ⬜

_Requested 2026-09-16: every push to `main` deploys to production, same domain every time._

- [x] push policy decided (2026-09-16): a push to `main` is a production deploy, and a deploy is a
      push to `main`. No separate deploy step (`CLAUDE.md` rule)
- [ ] production deployments public: no Vercel Authentication on the production domain
      (2026-09-16)
- [x] project `holecity` (`tushar10141-1854s-projects`, `prj_kiM68fZAXV92pgBwysZjGnYsUb3o`)
      created by `vercel link --yes`, GitHub repo connected. Vite preset, output `dist`, Node
      24.x, install/build auto-detected (pnpm lockfile)
- [x] Vercel plugin installed, project scope only (`.claude/settings.json`), admin request
- [ ] `holecity.vercel.app` is the project's production domain, auto-assigned to every new
      production deployment. Never a `vercel alias` pinned to one deployment. Check in Vercel
      docs whether an Instant Rollback pauses auto-assign
- [ ] build stamp: commit SHA in a `<meta>` tag (the version follows from the SHA)
- [ ] verify after a push: production body's stamp equals pushed `HEAD`, headless browser renders
      it, reachable without a Vercel login

---

## deferred

- **hole as ground cutout** - v0.1 hole is a disc drawn on the ground. Consumed objects need a real
  cutout (stencil) to fall through. Blocked on objects, which start after v0.1
- **environment definition** - generalize zones, palette and terrain into a per-environment
  definition once a second environment is specced, not before
