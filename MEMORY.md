# MEMORY

**RESUME:** Phase 1 done (v0.1.0): renderer, loop, camera rig, FPS counter. Empty scene renders
black. Open: Phase 5 push policy. Next: Phase 2 terrain.

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

- **Origin** (2026-09-16): private GitHub repo `ParaSpl01t/holecity`, ssh remote, branch `main`.
  Verify with `gh repo view ParaSpl01t/holecity --json visibility`.
- **Vercel** (2026-09-16): not linked. Untouched until explicitly requested.
- **`holecity.vercel.app`** (2026-09-16): anonymous `curl` got 404 `DEPLOYMENT_NOT_FOUND`, so
  nothing serves it. Not proof the name is claimable: confirmed only when the project gets it.
- **Versioning**: `package.json` created at `0.0.0` (2026-09-16). First bump `minor` -> `v0.1.0`
  (Phase 1), then `patch` per batch within v0.1.x. Verify tags with
  `git ls-remote --tags origin`.

## DESIGN
