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

- [ ] hole: black disc 4 m wide (2 m radius), 1 m yellow ring outside it, 3 m total radius
      (confirmed 2026-09-16)
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
- [ ] perf sanity: mobile viewport and DPR, draw calls and frame times logged to catch regressions
      (no pass/fail budget)
- [ ] every test seen failing once with its violation injected

## Phase 5 - vercel ⬜

_Starts only on explicit request._

- [ ] push policy decided: once Git integration is on, a push to `main` is a production deploy.
      Open: whether "need public production deployments" (2026-09-16) means pushing `main` needs
      no per-deploy ask
- [ ] production deployments public: no Vercel Authentication on the production domain
      (2026-09-16)
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
