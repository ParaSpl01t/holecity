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

## v0.2.x

- the borderzone should be elevated 1m giving it a 3d look as well.
- same tiling as playzone needed on borderzone
- the outzone should not render the hole or the border even if it comes out of the borderzone.
- tree object
  - dead tree: a 2 meter wide and 8 meter high trunk.
  - live tree: same truck as dead tree, for leaves use 3-4 green sphears 2-4 meter wide. the leaves should be able to compress like a stress ball when colliding with something, or at the time of being pulled in a small hole.
- cube object:
  - random height, width and length ranging from 2-8 meters.
  - random stack of 1-3 cubes layered on top of each other same size and placement for stack.
- sphere object:
  - random 2-6 meter wide sphere.
- the hole gains real cutout and object gains real gravity and physics.

## v0.3.0

- the sea should gain idle "bubbled white water" waves animation.
- the tree trunk should not be a plain cylinder. it should be like slight twisting and bending and should have an almost square base shape instead of a circular. should be like a "lightly bended in few place long cuboid" see `reference/trees`
- the objects that somehow reach on top of borderzone are permanently unconsumable. what can be done about it?
- environment standardisation:
  - the outzone, borderzone, and playzone are the standard in every environment but they will have elevation and design variations.
  - playzone stays at elevation 0. borderzone will be few meters up compared to playzone. outzone will be few meters down compared to the borderzone.
  - the tiles are no longer a global environment feature it. it is now a specific terrain feature for the debug environment (the current built environment).
  - every environment will have a base terrain. like the green grid with dark green patched grid is a base terrain look for the debug environment's playzone the elevated concrete grid is for debug environment's borderzone and idle waves sea for the outzone.
  - the environment zones can have vertical depth and elevations in the base terrain of any zone, the objects must be built to support that elevation for example. 1m deep craters in moon with a .5m roughed pointy elevated border. should a building is to be placed on the border itself, the elevated portion get's flattened as well as the depth portion of the crater under that building with slight smoothness. the same moon environment might also have a variable height borderzone starting from roughed pointy inner border topping 2m elevation smoothing down 10 meters out to 1 level elevation as if the playzone is taking place inside a big moon crater. the outzone will be similar as playzone. similarly a ruined city might feature cracks in the ground which has lava in the bottom. should a building has to be placed on top of it, the ground there becomes correctly filled and raised.
- implement "powerup drops", like a 3d model of a magnet rotating and wobbling up and down inside a spherical glowing halo. as soon as they touch the player's colored border, the halo pops and the 3d model starts to expand, increase it's rotation exponentially and eventually "pops?" indicating it's been consumed.
- if the halo get's obstructed more than 50% by an object, that object should become kinda see through. this might have some unintentional side effects. if the hole is obstructed with two object 49% 49% what should the outcome be?
- a simple lobby tith two bottons. launch debug environment, launch moon environment
