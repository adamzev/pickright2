# Pick Right 2

A humorous AI-assisted game project by my 8-year-old.

Play it in your browser: **https://adamzev.github.io/pickright2/**

## What it is

A choose-wisely adventure where most picks end badly. Find a safe house, an axe that doesn't explode, a pet that doesn't eat you, and then build Sir Rock a home — earning resources, dodging fail boxes in a minigame, and trying to please a picky AI.

## Block Dash

A second game on the site (`docs/blockdash.html`, linked from the title screen):
a blocky-sandbox-flavoured auto-runner in the spirit of rhythm platformers,
**plus a level maker** — you build the levels yourself. It ships with whatever
levels are in `docs/blockdash-levels.js`; everything else you make is saved in
your own browser.

An unofficial fan project with original art. Not affiliated with, endorsed by,
or connected to Mojang, Microsoft, or any other game.

Block rules:

| Block | What it does |
| --- | --- |
| Grass / Stone | Solid ground and walls |
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

**In the browser (anyone).** Build in the level maker, hit Save — it lives in
localStorage. The **Code** button turns a level into a text code that someone
else can paste into Import.

**Shipped with the game (us).** Build the levels you want everyone to get, then
open **Level pack tools** on the Block Dash menu:

- **Download pack (.js)** writes every level in My Levels to
  `blockdash-levels.js`. Drop it into `docs/`, replacing the existing file, and
  commit — those levels now appear at the top of the page for all players.
- **Download all (.json)** / the per-level **File** button save plain JSON, if
  you'd rather keep levels as separate source files.
- **Load file** reads a `.json` level, a `.json` array of levels, or a
  `blockdash-levels.js` pack back into My Levels, so a shipped level can be
  edited again later.

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

- **Download art (.json)** is a backup you can load on another device.
- **Download art pack (.js)** writes `blockdash-artpack.js`. Drop it into
  `docs/`, replacing the existing file, and commit — everyone who plays gets
  that art. Whatever a player has painted in their own browser still wins over
  it, and the Art Studio opens on the shipped art, so a pack can be edited
  further and re-downloaded.
- **Load art file** reads either format back in.

Once a pack ships, it *is* the original: **↺ Original** and **Reset ALL art**
go back to the pack, not to the art the code draws.

### Files

- `blockdash.html` / `blockdash.css`
- `blockdash.js` — game engine, level editor, art studio, storage, pack tools
- `blockdash-art.js` — all the pixel art, isolated so sprites can be swapped for
  PNGs via `BDArt.loadSprites({ g: "art/grass.png", ... })` or repainted via
  `BDArt.getPixels` / `setPixels`
- `blockdash-levels.js` — **generated**; the levels that ship with the game
- `blockdash-artpack.js` — **generated**; the art that ships with the game

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
