# INBOX - Holecity

_Requests land here, formatted. Read into TODOS.md when prompted. Only modified when told._

Holecity is a browser based game where a player spawns as a black hole on a flat terrain, consuming the objects it goes under.
This game will have multiple environments, each environment with it's own terrains, features and objects.

It'll have a down facing camera always locked on the player. slightly tilted so we can actually see 3d environment.

There should be no comprimising with the performance. It should be optimized to run even on a low end device.

## v0.1.x

- no HUD or lobby, directly spawn in a game.
- a flat green square terrain (playzone), let's say `200*200` meters. surrounded by a 10 meters wide concrete path (borderzone), surrounded by sea (outzone).
- the playzone is made up of 2 shades of green. a main green and an accent green (slightly darker) the main green covers entire playzone while the accent green comes in small patches occassionaly in place of the main green. in either case, both the colors should have a tinted variant so a tile look can be created. use fun, pastely and cartoonish colors like voodoo games or brawl stars.
- a keyboard WASD / mouse cursor follow / virtual joystick controlled black hole player. a simple circular black hole with 2 meter radius, 1 meter yellow border.
- the black hole should only reach everything inside the playzone including the corners, accessing the corners means the blackhole may be partially outside the playzone but that's not an issue.
- a simple dark opaque bg with white text FPS count in the bottom left corner.
- the vercel deploy should be automatic on git push. for vercel the domain holecity.vercel.app should be used and it must always server latest deployment and should not be "only associated with a particular versioned deployment".
