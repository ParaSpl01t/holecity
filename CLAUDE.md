# holecity

## About

Browser game. The player spawns as a black hole on flat terrain and swallows the objects it moves
under. The game will have multiple environments, each with its own terrain, features and objects.
The camera looks down at a slight tilt, always locked on the player.

## Terms

_AI-updatable: add each new term._

- **hole** - the player, a black hole.
- **environment** - a themed map with its own terrain, features and objects.
- **playzone** - the square the hole moves in.
- **borderzone** - the concrete path around the playzone.
- **outzone** - the sea beyond the borderzone.
- **main / accent green** - playzone base color, and the slightly darker color of its occasional
  patches. Each has a **tint** variant, alternated with it per tile.

## Technologies used

_AI-updatable: add each library/tech as it is chosen. An entry here means we committed to it.
Absence means undecided, not implied._

- **Vite** - dev server with HMR, production build.
- **TypeScript** - strict.
- **three.js** - WebGL rendering. No UI framework.
- **Rapier** (`@dimforge/rapier3d-compat`) - physics, approved 2026-09-16. Loaded as its own lazy
  chunk.
- **vitest** - unit tests.
- **Playwright** - headless browser tests and visual checks.
- **prettier** - formatting.

---

# AI Rules

_AI-updatable: refine whenever a new rule is agreed in chat._

Only project-specific rules belong here. Everything general lives in `~/.claude/CLAUDE.md` and is
not restated in this file.

- **Performance by best practice and common sense** (2026-09-16). No low-end device target and no
  numeric budget. Every addition is weighed for its per-frame cost: work that can happen once never
  happens per frame, the DOM is not written per frame, draw calls stay minimal.
- **World units.** 1 unit = 1 m, y up, playzone centered on the origin. The camera sits on the +z
  side, so screen-up is world -z.
- **Push is deploy** (2026-09-16, admin). Vercel deploys every push to `main` to production on
  `holecity.vercel.app`. Push and deploy are one action in this repo: a push deploys, a deploy is
  a push. This replaces the global push/deploy split here; pushing stays at own judgement and
  follows the global Git and Versioning rules (commit, bump, one push).
- **Roll back with `git revert` + push, never Vercel Instant Rollback.** Per Vercel docs
  (`/docs/instant-rollback`, read 2026-09-16), a rollback turns off auto-assignment of production
  domains: later pushes build but never go live until `vercel promote` or Undo Rollback.
- **Dev server always binds to the network** (2026-09-16, admin): `--host` is part of the `dev`
  script, so phones on the LAN can open it.
- **Test scope while the game is a draft** (2026-09-16, admin). `pnpm test` (unit, under a second)
  runs before every push. `pnpm test:e2e` (browser, ~1 min) runs at milestones only; a browser
  test broken by a deliberate visual change is rewritten or deleted then. Failure injection (the
  global "prove a test can fail" rule) is paused in this repo until the game settles. Heavy
  testing must not slow getting to a playable draft.
