# MEMORY

**RESUME:** v0.2.0 live (Phases 6-9: raised tiled path, physics objects, abyss hole with a solid
edge, squeezing leaves, temporary size controls). Verified 2026-09-16: unit 36/36, browser
20/20; production build stamp `a565707` (= tag `v0.2.0`); headless render on production with
physics ready, all `/assets/*` immutable incl. the Rapier chunk. Next: v0.3 planning, only when
the admin asks. `INBOX.md` `## v0.3.0` holds 7 items: idle sea waves; trunk as a lightly bent,
twisting near-square cuboid (refs: `reference/trees/*.png`, 4 images, not yet viewed); objects
that land on the raised path can never be swallowed (admin asks what to do); environment
standardisation (per-environment base terrain per zone, elevations and depths, objects conform
the ground under them; tiles become the debug environment's terrain); powerup drops (magnet in
a glowing halo, pops on contact); objects hiding more than 50% of the hole turn see-through
(admin asks about two objects at 49% each). `NOTES.md` holds 3 admin questions about earlier
chat lines, not yet asked.

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
- **Objects split across the ground** (admin reports, 2026-09-16, three rounds): an object
  partway through when the hole moved on sank through solid ground; trees hung trunk-below,
  leaves-above; later, trees stuck on the rim. Took three designs. (1) per-collider "ignore the
  ground" switch: split trees. (2) per-object switch + a tube carrying falling objects:
  admin rejected the cylinder ("the hole is a small opening to an empty abyss, no hitbox below
  the surface"). (3) Current: no switch at all. Thin solid ground with a real gap; its edge is
  a frictionless collar moving with a velocity, so it pushes whatever crosses the surface along
  with the hole. Guarded by `runWatched` in `src/physics/simulation.test.ts`: every frame,
  anything crossing the ground's mid-plane must cross it inside the opening, and each scenario
  must cross at least once (the check once passed on a box that never tipped).
- **Leaves shrank on their own** (admin reports, 2026-09-16): the whole crown compressed as soon
  as the trunk was over the opening, and always one step more than needed. Then, reworked,
  leaves did not compress enough and trees stuck on the rim. Current: per leaf, only while it
  presses on the rim and the trunk base is below ground; ratchets (no spring-back halfway
  through); the hole draws a pulled tree upright and centered. Tested with the default 4 m hole.
- **Swallowed objects vanished while still visible** (admin report, 2026-09-16): removal fired
  once the top passed ground level. Fix: remove only when the whole object is below the void's
  backdrop (`ABYSS_DEPTH` + extent). Guarded by the "fully below ground but still there" check
  in `src/physics/simulation.test.ts`.
- **Moving ground drags objects** (design trap, 2026-09-16): a kinematic ground moved with
  `setNextKinematicTranslation` gets a velocity, and friction carries everything resting on it.
  The ground is teleported (`setTranslation`) instead; only the collar moves with a velocity,
  and it is frictionless (`CoefficientCombineRule.Min`), so it pushes but never drags. A
  teleported edge would move through objects instead of pushing them.
- **The moving edge struck resting objects** (admin report, 2026-09-16, "like a carrom board
  piece"): the collar's top was flush with the surface and reached 1 m past the opening, so
  objects resting beside the hole met it at full hole speed. Fix: collar top 5 cm below the
  surface (`COLLAR_DROP`), ground opening 5 cm past the collar; resting objects touch only the
  teleported ground. Guarded by "drives past a resting object without striking it". Separately,
  objects that do get shoved (hanging into the opening) rolled 20 s+: damping raised to 0.5 /
  2 per s. Found via a browser test at the edge never going still: a pixel diff between two
  frames boxed one slowly drifting object (`edge-diff` approach: decode both screenshots in
  the page, compare pixels).

## KNOWLEDGE

- **Headless checks** (2026-09-16): Playwright chromium with `--enable-unsafe-swiftshader` renders
  the WebGL canvas. Expected noise in its console: two `[vite] connecting...` on the first load
  after a cold start (Vite pre-bundles three and reloads once), and `GPU stall due to ReadPixels`
  (the screenshot readback, not game code). FPS there is SwiftShader's, not a real measurement.
- **Reading screenshots: tall objects lean outward** (2026-09-16). The camera looks 30 deg off
  straight down, so vertical lines converge on a vanishing point below the screen: upright trees
  and stacks away from the center look tipped over. Misread once as "trees topple" and chased
  with a collider change; the proof they stood was an identical pose in two runs with different
  colliders. Judge "fallen" by comparing frames over time, not by a single frame's angle.
- **Dev server**: `pnpm dev` (`vite --host --strictPort`) on 5173, run in background, log teed
  to the session scratchpad.
- **Headless input checks** (2026-09-16): the game exposes no state, so movement is judged from
  pixels. Screenshots clipped above the FPS readout: bytes differ = moving, identical = stopped.
  Keys via `page.keyboard.down('KeyW')`; mouse via `page.mouse.move`; touch needs a context with
  `hasTouch` and CDP `Input.dispatchTouchEvent` for a real drag. W+A for 14 s reaches the -x -z
  corner. Now in the repo: helpers in `e2e/fixtures.ts`. Tests wait for
  `#game[data-physics="ready"]` (set in `src/main.ts`) before judging motion.
- **Test runtimes** (2026-09-16): `pnpm test` ~2 s (Rapier scenarios included); `pnpm test:e2e`
  ~1.5 min at 2 workers. Production check after a push: poll `<meta name="build">` until it
  equals the pushed SHA, then load the page headless, wait for `#game[data-physics="ready"]`,
  and screenshot. Scratchpad scripts do not survive sessions; the approaches are recorded here.
- **Physics runs in vitest** (2026-09-16): Rapier's compat build (WASM inlined) loads in node, so
  hole mechanics are unit-tested without a browser (`src/physics/simulation.test.ts`, via
  `Simulation.snapshot()`).
- **Hole model** (admin, 2026-09-16): a small opening in thin (1 m) solid ground, endless void
  below, nothing to hit under the surface but other objects. Physics in the header of
  `src/physics/hole-body.ts`; visuals (edge band + black backdrop at `ABYSS_DEPTH`) in
  `src/player/hole.ts`.
- **Visual swallow check**: a scratchpad script found the live tree nearest spawn via
  `import('/src/objects/layout.ts')` inside the page (Vite serves source modules; bare
  specifiers like `three` do not resolve there, so borrow `camera.position.clone()` for a
  `Vector3`) and steered the hole onto it with the mouse.

- **Origin** (2026-09-16): private GitHub repo `ParaSpl01t/holecity`, ssh remote, branch `main`.
  Verify with `gh repo view ParaSpl01t/holecity --json visibility`.
- **Vercel** (2026-09-16): project `tushar10141-1854s-projects/holecity`, Git-connected, push to
  `main` = production deploy. Account `tushar10141-1854`, CLI 59.11.2. Check a deploy with
  `vercel ls holecity`, then read `<meta name="build">` from `https://holecity.vercel.app/` and
  compare with the pushed SHA (don't trust a 200). First build took 8 s.
- **Vercel plugin** (2026-09-16): admin approved `vercel@claude-plugins-official`, scoped to this
  project only (not user-wide).
- **`holecity.vercel.app`**: claimed by the project on its first deploy (v0.1.3, 2026-09-16);
  before that an anonymous `curl` got 404 `DEPLOYMENT_NOT_FOUND`. It follows every production
  deploy (seen by build stamp on v0.1.3, v0.1.4, v0.1.5, v0.1.6, v0.2.0).
- **Versioning**: `package.json` created at `0.0.0` (2026-09-16). First bump `minor` -> `v0.1.0`
  (Phase 1), then `patch` per batch within v0.1.x. Verify tags with
  `git ls-remote --tags origin`.

## DESIGN

- **Flat ground, toon objects** (2026-09-16, v0.2): the ground stays unlit (`MeshBasicMaterial`,
  palette color exactly). 3D objects use 4-band toon shading from one light model
  (`src/world/lighting.ts`: ambient + direct = 1, so a lit face shows its palette color); the
  borderzone walls bake the same bands into vertex colors. No shadows.
- **Overlays appear only while they are in use.** No HUD: the joystick exists only while a finger
  is down (translucent white ring, white knob). Permanent: the FPS readout, and on touch screens
  the temporary - / + hole size buttons bottom-right (dark translucent squares).
- **One draw call per thing where cheap**: merged geometry with vertex colors (hole), data
  textures instead of per-tile meshes (playzone), clear color instead of a mesh (sea).
