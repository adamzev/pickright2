# Pick Right 2

A humorous AI-assisted game project by my 8-year-old.

Play it in your browser: **https://adamzev.github.io/pickright2/**

## What it is

A choose-wisely adventure where most picks end badly. Find a safe house, an axe that doesn't explode, a pet that doesn't eat you, and then build Sir Rock a home — earning resources, dodging fail boxes in a minigame, and trying to please a picky AI.

## Block Dash

A second game on the site, a blocky-sandbox-flavoured auto-runner in the spirit
of rhythm platformers, **plus a level maker**. The title screen links to two
modes:

| Link | Opens |
|---|---|
| `blockdash.html` | Play mode: just the official levels (in `docs/blockdash-levels.js`), back to back |
| `blockdash.html?edit` | Level Maker: your own levels, saved in your browser, plus "Copy & edit" on the official ones |

An unofficial fan project with original art. Not affiliated with, endorsed by,
or connected to Mojang, Microsoft, or any other game.

Block rules:

| Block | What it does |
| --- | --- |
| Grass / Stone | Solid ground and walls |
| Netherrack / Nether bricks | Solid, like Stone, for Nether-themed levels |
| Lava / Fire | Burns you on touch |
| Rising / Falling lava | A lava source that stays put and grows new lava upward (or slowly downward) once it's on screen, until it reaches something |
| Shooter | Solid block that fires a star every 2 seconds; stars steer toward you and explode on touch |
| Spawner | Solid cage that lets out a blaze every few seconds (up to 2 at a time). Blazes float near it, drift toward you and shoot straight fireballs. Jump on one to pop it and get its blaze rod; touching it any other way burns |
| Blaze rod | Collectible, counted separately from diamonds (🪄 in the score bar) |
| End stone | Solid, for End levels |
| End TNT | TNT in End colours; same explosion |
| Blink | Touch it and you teleport to the nearest other Blink |
| Watcher | An eye block that looks straight down. Its cone of vision shows as a see-through triangle (red while the eye is open), cut off by solid blocks. The eye opens for 1.2 of every 3 seconds, restarting each attempt; be in the cone while it's open and you're DELETED |
| End watcher | Ignores you, even if you run through it, until you jump on it. Then it chases you, a little slower than you run; touching it deletes you |
| Corrupted end watcher | Touching it deletes you even while it's asleep, so you have to jump over or onto it. Jump on it and it chases you, glitching 2 blocks forward every couple of seconds to keep pace |
| Short-legged enderman | When you get within 7 blocks, it teleports to stand 3½ blocks in front of you. Jump on it to beat it; touching it deletes you |
| Eye of ender | Collectible with its own 👁 counter |
| Slime | Bounces you high — from the top or the side |
| TNT | Instant game over |
| Diamond | +10 points |
| Lightning bolt | Super speed for 3 seconds |
| Wither rose | Slows you down for 3 seconds |
| Hidden TNT | Invisible in play (faded in the editor) and explodes on touch. Paint it onto a diamond, bolt, rose, bush or wings to trap that item. |
| Save point | Reach it and later deaths restart you here, with the diamonds you had. Takes your wings off. |
| Wings + firework | Picked up once: hold jump to fly up, let go to glide, until the next save point |
| End portal | Finishes the level |
| Bush | Decoration only |
| Start | Where you spawn |

### Two ways levels get made

**In the browser (anyone).** Build in the level maker. Every change saves
itself to localStorage as you go; there's no Save button. Each level also has a
background, picked under its name: Overworld (sky and hills), Nether (netherrack
above and below, ghasts drifting in the distance), Mooshroom realm (giant
mushrooms on a purple-pink sky) or The End (stars, floating islands, dark
pillars). It's saved as `"bg"` in the level; levels without it use Overworld. The **Code** button turns a level into a text code that someone
else can paste into Import.

**Shipped with the game (us).** Build the levels you want everyone to get, then
open **Level pack tools** on the Block Dash menu:

- **Download all (.json)** saves every level in My Levels to
  `blockdash-levels.json`; the per-level **File** button saves one. Downloads
  are JSON only, because browsers warn about downloaded `.js` files.
- To ship levels, convert the ones you want from that JSON into
  `docs/blockdash-levels.js` (the same objects inside
  `window.BLOCKDASH_LEVELS = [...]`) and commit. It stays a `.js` file so the
  page can load it without a fetch.
- **Load file** reads a `.json` level, a `.json` array of levels, or an old
  `blockdash-levels.js` pack back into My Levels.

Built-in levels are read-only in the UI; **Copy & edit** drops a copy into My
Levels.

### Art Studio (dev only)

The **🎨 Art** button on the Block Dash menu opens a pixel art editor. It's a
dev tool, so it's hidden by default: it shows up automatically when you serve
the site locally, and anywhere else you turn it on once with
`blockdash.html?dev=1` (that sticks in the browser; `?dev=0` turns it back off).
Regular players never see it — they just get whatever art ships in
`blockdash-artpack.js`.

Every
sprite in the game — the player, all ten blocks, the clouds, both explosion
frames — can be repainted pixel by pixel with a paint / fill / rub-out /
grab-colour toolset. Changes save themselves to localStorage as you draw and
show up everywhere the game draws: the level maker palette, the block reference,
and the game itself. **↺ Original** puts one sprite back; **Reset ALL art**
puts everything back.

Sharing art works like sharing levels, under **Art pack tools**:

- **Download art (.json)** saves the painted sprites as `blockdash-art.json`:
  a backup for another device, and the file to ship. To ship it, convert it to
  `docs/blockdash-artpack.js` (`window.BDArtPack = {...};`) and commit;
  everyone who plays gets that art. Whatever a player has painted in their own
  browser still wins over it, and the Art Studio opens on the shipped art.
- **Load art file** reads either format back in.

Once a pack ships, it *is* the original: **↺ Original** and **Reset ALL art**
go back to the pack, not to the art the code draws.

### Files

- `blockdash.html` / `blockdash.css`
- `blockdash.js` — game engine, level editor, art studio, storage, pack tools
- `blockdash-art.js` — all the pixel art, isolated so sprites can be swapped for
  PNGs via `BDArt.loadSprites({ g: "art/grass.png", ... })` or repainted via
  `BDArt.getPixels` / `setPixels`
- `blockdash-levels.js` — the official levels, converted from a levels `.json` download
- `blockdash-artpack.js` — the official art, converted from an art `.json` download

## Versions

- **Web** (`docs/`) — mobile-friendly static site, deployed to GitHub Pages
- **Terminal** (`main.py`) — original Python/curses version

## Running the terminal version

```
python3 main.py
```

## Running the web version locally

```
cd docs && python3 -m http.server 8000
```

Then open http://localhost:8000.
