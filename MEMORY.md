# MEMORY

**RESUME:** Phases 1-3 done (v0.1.2): playable route, hole steers by WASD / mouse / touch
joystick across the tiled playzone, verified headless. Open: Phase 5 push policy. Next: admin
looks at the dev server; once the route settles, Phase 4 tests.

## GOTCHAS

- **TS narrowing vs hoisted functions** (2026-09-16): `if (!canvas) throw` does not narrow
  `canvas` inside a later `function resize()` declaration (hoisted, could run before the check).
  `pnpm check` failed with TS2339. Fix: `const resize = () => {}`, which is not hoisted.

## KNOWLEDGE

- **Headless checks** (2026-09-16): Playwright chromium with `--enable-unsafe-swiftshader` renders
  the WebGL canvas. Expected noise in its console: two `[vite] connecting...` on the first load
  after a cold start (Vite pre-bundles three and reloads once), and `GPU stall due to ReadPixels`
  (the screenshot readback, not game code). FPS there is SwiftShader's, not a real measurement.
- **Dev server**: `pnpm dev --strictPort` on 5173, run in background, log teed to the session
  scratchpad.
- **Headless input checks** (2026-09-16): the game exposes no state, so movement is judged from
  pixels. Screenshots clipped above the FPS readout: bytes differ = moving, identical = stopped.
  Keys via `page.keyboard.down('KeyW')`; mouse via `page.mouse.move`; touch needs a context with
  `hasTouch` and CDP `Input.dispatchTouchEvent` for a real drag. W+A for 14 s reaches the -x -z
  corner. The scripts lived in the session scratchpad; Phase 4 moves this approach into the repo.

- **Origin** (2026-09-16): private GitHub repo `ParaSpl01t/holecity`, ssh remote, branch `main`.
  Verify with `gh repo view ParaSpl01t/holecity --json visibility`.
- **Vercel** (2026-09-16): not linked. Untouched until explicitly requested.
- **`holecity.vercel.app`** (2026-09-16): anonymous `curl` got 404 `DEPLOYMENT_NOT_FOUND`, so
  nothing serves it. Not proof the name is claimable: confirmed only when the project gets it.
- **Versioning**: `package.json` created at `0.0.0` (2026-09-16). First bump `minor` -> `v0.1.0`
  (Phase 1), then `patch` per batch within v0.1.x. Verify tags with
  `git ls-remote --tags origin`.

## DESIGN

- **Flat unlit color** (2026-09-16): `MeshBasicMaterial` only, no lights, no shadows. The cartoon
  look comes from the palette (`src/world/palette.ts`), and it costs no lighting math.
- **Overlays appear only while they are in use.** No HUD: the joystick exists only while a finger
  is down (translucent white ring, white knob). The FPS readout is the one permanent element.
- **One draw call per thing where cheap**: merged geometry with vertex colors (hole), data
  textures instead of per-tile meshes (playzone), clear color instead of a mesh (sea).
