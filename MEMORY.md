# MEMORY

**RESUME:** Phases 1-3 done (v0.1.2), playable and verified headless. Phase 5 (Vercel) in
progress: push policy decided (push = deploy), dev server moving to `--host`. Next: link Vercel
project with Git integration, build stamp, push, verify production. Phase 4 tests after.

## GOTCHAS

- **`vercel link` rewrites `.gitignore`** (2026-09-16): it wrote `VERCEL_OIDC_TOKEN` to
  `.env.local` and appended a blanket `.env*`, which would have ignored the committed `.env`
  (build stamp default). Removed the blanket line; `.env*.local` keeps the token out of git.
  Re-check `.gitignore` after any `vercel link` / `vercel env pull`.
- **Vite HTML `%VITE_*%` replacement** (2026-09-16): an undefined prefixed variable is left as
  literal text and logs a warning, so `.env` commits a default. Real env vars beat `.env`, so a
  Vercel build takes the real SHA.

- **TS narrowing vs hoisted functions** (2026-09-16): `if (!canvas) throw` does not narrow
  `canvas` inside a later `function resize()` declaration (hoisted, could run before the check).
  `pnpm check` failed with TS2339. Fix: `const resize = () => {}`, which is not hoisted.

## KNOWLEDGE

- **Headless checks** (2026-09-16): Playwright chromium with `--enable-unsafe-swiftshader` renders
  the WebGL canvas. Expected noise in its console: two `[vite] connecting...` on the first load
  after a cold start (Vite pre-bundles three and reloads once), and `GPU stall due to ReadPixels`
  (the screenshot readback, not game code). FPS there is SwiftShader's, not a real measurement.
- **Dev server**: `pnpm dev` (`vite --host --strictPort`) on 5173, run in background, log teed
  to the session scratchpad.
- **Headless input checks** (2026-09-16): the game exposes no state, so movement is judged from
  pixels. Screenshots clipped above the FPS readout: bytes differ = moving, identical = stopped.
  Keys via `page.keyboard.down('KeyW')`; mouse via `page.mouse.move`; touch needs a context with
  `hasTouch` and CDP `Input.dispatchTouchEvent` for a real drag. W+A for 14 s reaches the -x -z
  corner. The scripts lived in the session scratchpad; Phase 4 moves this approach into the repo.

- **Origin** (2026-09-16): private GitHub repo `ParaSpl01t/holecity`, ssh remote, branch `main`.
  Verify with `gh repo view ParaSpl01t/holecity --json visibility`.
- **Vercel** (2026-09-16): wiring requested (push = deploy), Phase 5 in progress. Account
  `tushar10141-1854`, CLI 59.11.2. No `holecity` project existed before this phase.
- **Vercel plugin** (2026-09-16): admin approved `vercel@claude-plugins-official`, scoped to this
  project only (not user-wide).
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
