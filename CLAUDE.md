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

---

# AI Rules

_AI-updatable: refine whenever a new rule is agreed in chat._

Only project-specific rules belong here. Everything general lives in `~/.claude/CLAUDE.md` and is
not restated in this file.

- **Performance is never traded away.** The game must run well on low-end devices. Every addition
  is measured against the perf budget in `MEMORY.md`, and one that breaks it does not land.
