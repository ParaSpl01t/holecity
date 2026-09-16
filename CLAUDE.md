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
