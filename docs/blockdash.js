// Block Dash — a blocky platformer with a built-in level editor.
(() => {
  "use strict";

  // ---------- constants ----------

  const H = 12; // level height in blocks (fixed — one screen tall)
  const AIR = ".";
  const ERASER = "X";

  const TILES = {
    g: { name: "Grass", solid: true },
    s: { name: "Stone", solid: true },
    p: { name: "Deepslate", solid: true },
    A: { name: "Spike" },
    // hidden: shown in the editor, invisible (but still working) in play
    K: { name: "Dialog", hidden: true },
    O: { name: "Stop", hidden: true },
    M: { name: "Free move", hidden: true },
    m: { name: "Slime", solid: true },
    t: { name: "TNT" },
    h: { name: "Hidden TNT" },
    C: { name: "Save point" },
    // Hidden TNT sharing a square with an item. A square holds one letter, so
    // each combo gets its own: in play it looks like the item but explodes.
    1: { name: "Hidden TNT", over: "d" },
    2: { name: "Hidden TNT", over: "b" },
    3: { name: "Hidden TNT", over: "w" },
    4: { name: "Hidden TNT", over: "B" },
    5: { name: "Hidden TNT", over: "f" },
    6: { name: "Hidden TNT", over: "r" },
    7: { name: "Hidden TNT", over: "o" },
    d: { name: "Diamond" },
    b: { name: "Bolt" },
    w: { name: "Rose" },
    f: { name: "Wings" },
    n: { name: "Netherrack", solid: true },
    k: { name: "Nether bricks", solid: true },
    L: { name: "Lava" },
    U: { name: "Rising lava" },
    D: { name: "Falling lava" },
    F: { name: "Fire" },
    S: { name: "Shooter", solid: true },
    Z: { name: "Spawner", solid: true },
    r: { name: "Blaze rod" },
    e: { name: "End stone", solid: true },
    I: { name: "Blink" },
    W: { name: "Watcher", solid: true },
    Y: { name: "Staring watcher", solid: true },
    T: { name: "End TNT" },
    o: { name: "Eye of ender" },
    9: { name: "Ender pearl" },
    H: { name: "Crafting table" },
    R: { name: "Portal frame" },
    V: { name: "End watcher", mob: true },
    Q: { name: "Corrupted end watcher", mob: true },
    N: { name: "Short-legged enderman", mob: true },
    E: { name: "End" },
    G: { name: "Boss portal" },
    J: { name: "Boss platform", solid: true },
    B: { name: "Bush" },
    $: { name: "Emerald" },
    "+": { name: "Gold" },
    "@": { name: "Megatite" },
    "%": { name: "Fake lightning" },
    // mega blocks: placing one in the Level Maker means buying it in the shop first
    8: { name: "Mega TNT", mega: true },
    0: { name: "Mega slime", solid: true, mega: true },
    "&": { name: "Mega bush", mega: true },
    P: { name: "Start" },
    // Doors are two blocks tall: the letter sits in the bottom square and the
    // square above it counts as door too. Shut, they're solid; they open as
    // you reach them. `reach` is how close (in blocks) that is.
    "\u0180": { name: "Normal door", solid: true, door: true, reach: 0.4 },
    "\u0181": { name: "Nether door", solid: true, door: true, reach: 0.4 },
    "\u0182": { name: "End door", solid: true, door: true, reach: 0.4 },
    "\u0183": { name: "Mushroom door", solid: true, door: true, reach: 0.4 },
    "\u0184": { name: "Mechanical door", solid: true, door: true, reach: 2.5 },
    "\u0185": { name: "Upgraded door", solid: true, door: true, reach: 0.4, locked: true },
    "\u0186": { name: "Key" },
  };
  const KEY = "\u0186";
  const DOORS = ["\u0180", "\u0181", "\u0182", "\u0183", "\u0184", "\u0185"];
  const isDoor = (ch) => !!(TILES[ch] && TILES[ch].door);
  // an opened door stays in its square as "/" + the door, so it can still be drawn
  const isOpenDoor = (ch) => ch.length === 2 && ch[0] === "/";
  // the rest of the mega blocks: one per ordinary block (see BDArt.MEGA)
  const MEGA = window.BDArt.MEGA;
  const MEGA_BASE = window.BDArt.MEGA_BASE;
  for (const [b, m] of Object.entries(MEGA)) {
    const nm = { b: "Lightning", w: "Wither rose", "%": "Fake lightning" }[b] || TILES[b].name;
    TILES[m] = { name: "Mega " + nm[0].toLowerCase() + nm.slice(1), mega: true, solid: TILES[b].solid };
  }
  const megaOf = (base) => MEGA[base];

  // The player's own blocks (made in the Art Studio) are extra looks for the
  // blocks above. Everywhere the rules care what a square is, they ask baseOf.
  // One this browser has no art for, or made from something that can't be
  // placed, acts as stone.
  const isMine = window.BDArt.isMine;
  const baseOf = (ch) => {
    if (MEGA_BASE[ch]) return MEGA_BASE[ch];
    if (!isMine(ch)) return ch;
    const b = window.BDArt.baseOf(ch);
    return b && TILES[b] && !TILES[b].over ? b : "s";
  };
  const tileOf = (ch) => TILES[baseOf(ch)];
  const typeName = (base) => (base === "player" ? "Player" : /^pet[A-Z]/.test(base) ? "Pet" : TILES[base] && !isMine(base) ? TILES[base].name : "Stone");
  const MINE = "*"; // the one palette button that stands for all of them
  const MEGA_PICK = "~"; // likewise, the palette button that opens the mega blocks

  const PALETTE = ["g", "s", "p", "n", "k", "e", "m", "t", "T", "h", "A", "L", "U", "D", "F", "S", "Z",
    "W", "Y", "V", "Q", "N", "I", "C", "d", "+", "$", "@", "r", "9", "o", "H", "R", "b", "%", "w", "f", "K", "O", "M", "E", "G", "J", "B", ...DOORS, KEY, MEGA_PICK, MINE, "P", ERASER];

  // The boss arena is drawn in the same editor as the level, with a slightly
  // different set of blocks: no portals, save points or note-carrying blocks
  // in the arena, and Boss platforms only there.
  const LEVEL_ONLY = "KOMGECHR";
  const ARENA_ONLY = "J";

  const isSolid = (ch) => !!(tileOf(ch) && tileOf(ch).solid);
  const overOf = (ch) => TILES[ch] && TILES[ch].over;
  const isHiddenTnt = (ch) => ch === "h" || !!overOf(ch);
  const TRAP_OVER = { d: "1", b: "2", w: "3", B: "4", f: "5", r: "6", o: "7" };
  const isMob = (ch) => !!(tileOf(ch) && tileOf(ch).mob);
  const isHidden = (ch) => baseOf(ch) === "h" || !!(tileOf(ch) && tileOf(ch).hidden);

  // physics, in blocks and seconds
  const GRAVITY = 62;
  const JUMP_V = 17.5;
  const BOUNCE_V = 25;
  const MEGA_BOUNCE_V = 33; // a mega slime throws you about 1.7 times as high
  const MEGA_BLAST = 1; // a mega TNT goes off when you come within this many blocks of it
  const SPEED_BASE = 7.5;
  const SPEED_FAST = 12;
  const SPEED_SLOW = 4.2;
  const EFFECT_TIME = 3;
  const DOOR_SWING = 0.25; // seconds for a door to swing open
  const BOOST_TIME = 1.5; // a mega wings boost
  const BOOST_RECHARGE = 3;
  const FLY_THRUST = 110; // upward push while jump is held (beats GRAVITY)
  const FLY_UP_V = 10; // fastest climb
  const GLIDE_FALL = 3; // fastest fall with wings on and jump let go
  const PLAYER_W = 0.7;
  const PLAYER_H = 0.9;
  const COYOTE = 0.1;
  const STOP_DEFAULT = 2; // seconds a Stop block holds you, unless the editor says otherwise
  // The TNT Mech boss fight (starts at a Boss portal)
  const ARENA_W = 22; // just wider than one screen
  const BOSS_HP = 5; // stomps on its head to win, bare-handed
  const BOSS_STAGE = 9; // seconds each of its three attacks lasts
  const BOSS_PX = 0.2; // blocks per pixel of the 24x32 boss sprite
  const BOSS_X = 15.2; // where its left (spike) arm starts
  const BOSS_TOP = H - 1 - 32 * BOSS_PX; // top of its head
  const BOSS_BODY = BOSS_X + 5 * BOSS_PX; // left edge of the head-and-torso column
  const BOSS_PLATS = [[4, 9], [5, 9], [6, 9], [8, 7], [9, 7], [10, 7], [12, 5], [13, 5], [14, 5]];
  const RAIN_SPEED = 10; // blocks per second for falling TNT
  const BOSS_SHOT_SPEED = 7; // its stars fly straight, so this can beat the Shooter's 5.5
  const CUT_END = 5; // seconds the intro runs for
  const POOF_AFTER = 0.25; // a spiked player tips over this long, then puffs away
  const JUMP_BUFFER = 0.14;
  const LAVA_RISE = 1.2; // new blocks per second from a rising-lava source
  const LAVA_FALL = 0.7; // falling lava "slowly falls"
  const FLOWED = "l"; // lava grown from a source during play; never in saved levels
  // Lava logging: flowing lava soaks through a plant instead of stopping at
  // it. The square becomes "l" + the plant, so it still shows the plant (lava
  // behind it) and burns like lava. Play-only, like FLOWED.
  const LOGGABLE = "wB";
  const isLogged = (ch) => ch.length === 2 && ch[0] === FLOWED;
  const isLava = (ch) => ch === "L" || ch === "U" || ch === "D" || ch === FLOWED || isLogged(ch);
  const SHOOT_EVERY = 2; // seconds between stars
  const BULLET_SPEED = 5.5; // slower than you run, so they hit from ahead
  const BULLET_TURN = 2.2; // how hard a star can steer toward you, per second
  const BULLET_LIFE = 4;
  const SPAWN_EVERY = 3.5; // seconds between blazes from one spawner
  const BLAZE_MAX = 2; // blazes alive at once per spawner
  const BLAZE_REACH = 3; // how far (blocks) a blaze drifts from its spawner
  const BLAZE_DRIFT = 1.6; // blocks per second
  const BLAZE_SHOOT = 2.6; // seconds between fireballs
  const FIREBALL_SPEED = 6.5; // flies straight, unlike the stars
  const WATCH_DEPTH = 6; // how far down a Watcher's cone of vision reaches
  const WATCH_SPREAD = 0.5; // the cone widens this much each side per block down
  const WATCH_CYCLE = 3; // seconds for its eye to open and shut once…
  const WATCH_OPEN = 1.2; // …of which it's open this long
  const WARP_TIME = 0.45; // seconds the camera takes to glide to the next Blink
  const CHASE_SPEED = 6.6; // a woken end watcher; a bit slower than you run
  const GLITCH_EVERY = 2.2; // a corrupted one also jumps ahead this often…
  const GLITCH_HOP = 2; // …by this many blocks, so it keeps up with you
  const ENDER_NOTICE = 7; // enderman teleports when you get this close…
  const ENDER_AHEAD = 3.5; // …to this far in front of you
  const MOB_W = 0.8;
  const MOB_H = 1.8;

  const STORE_KEY = "blockdash_levels_v1";
  const BEST_KEY = "blockdash_best_v1";
  const BAG_KEY = "blockdash_bag_v1";
  const HERO_KEY = "blockdash_hero_v1";

  // Money. Picking these up pays coins (which is also the level's score);
  // megatite pays megacoins instead.
  const COIN_VALUE = { d: 10, "+": 15, $: 20 };
  const MEGATITE_PAYS = 30;
  const COINS_PER_MEGACOIN = 2;
  // The coin shop. A better sword means fewer stomps to beat the boss; you
  // always fight with the best one you own.
  const SWORDS = [
    null,
    { key: "swordStone", name: "Stone sword", cost: 10, hits: 4 },
    { key: "swordIron", name: "Iron sword", cost: 20, hits: 3 },
    { key: "swordDiamond", name: "Diamond sword", cost: 40, hits: 2 },
  ];
  const SHIELD_COST = 50;
  const SHIELD_TIME = 2; // seconds nothing can hurt you after a shield saves you
  const MEGA_COST = 30; // megacoins to unlock one mega block
  // What each mega does. Blocks not listed with a power just glow: they
  // act exactly like the ordinary block.
  const MEGA_POWER = {
    8: "Explodes when you come within a block of it, not just on touch",
    0: "Bounces you much higher than a normal slime",
    "&": "A bush in bloom. Just decoration",
    d: "Pays double: 20 coins", "+": "Pays double: 30 coins", $: "Pays double: 40 coins",
    "@": "Pays double: 60 megacoins",
    r: "Counts as 2 blaze rods", 9: "Counts as 2 ender pearls", o: "Counts as 2 eyes of ender",
    T: "Explodes when you come within a block of it, not just on touch",
    b: "Super fast for twice as long: 6 seconds",
    w: "Slows you for twice as long: 6 seconds",
    L: "Burns you from a block away, not just on touch",
    U: "Burns you from a block away, not just on touch",
    D: "Burns you from a block away, not just on touch",
    F: "Burns you from a block away, not just on touch",
    f: "Wings with a ⚡ Boost button (or Shift): a burst of speed whenever it's charged",
  };
  const MEGA_GLOW = "Glows. Otherwise just like the normal block";
  const MEGA_BLOCKS = [
    ["8", MEGA_POWER[8]], ["0", MEGA_POWER[0]], ["&", MEGA_POWER["&"]],
    ...Object.entries(MEGA).map(([b, m]) => [m, MEGA_POWER[b] || MEGA_GLOW]),
  ];
  // the ones with a power come first in the shop and the Level Maker
  MEGA_BLOCKS.sort((a, b) => (a[1] === MEGA_GLOW) - (b[1] === MEGA_GLOW));
  const MEGA_LIST = MEGA_BLOCKS.map(([ch]) => ch);

  const root = document.getElementById("bd-root");

  // ---------- tiny helpers ----------

  const el = (tag, cls, html) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  };

  const clear = () => { root.innerHTML = ""; };

  const toast = (msg) => {
    const t = el("div", "toast", msg);
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 1800);
  };

  const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

  // ---------- storage ----------

  const loadLevels = () => {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      return [];
    }
  };

  const saveLevels = (levels) => {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(levels));
      return true;
    } catch (e) {
      toast("Could not save (storage full?)");
      return false;
    }
  };

  const getBest = (name) => {
    try {
      return (JSON.parse(localStorage.getItem(BEST_KEY) || "{}")[name]) || 0;
    } catch (e) {
      return 0;
    }
  };

  const setBest = (name, score) => {
    try {
      const all = JSON.parse(localStorage.getItem(BEST_KEY) || "{}");
      if (!(all[name] > score)) {
        all[name] = score;
        localStorage.setItem(BEST_KEY, JSON.stringify(all));
      }
    } catch (e) { /* ignore */ }
  };

  // ---------- ghosts ----------
  // Your best run on each level, replayed as a see-through blue copy of you.
  // Kept apart from the levels, and only the newest few, so ghosts never
  // crowd out level saves in the browser's storage.
  const GHOST_KEY = "blockdash_ghosts_v1";
  const GHOST_ON_KEY = "blockdash_ghost_on";
  const GHOST_EVERY = 6; // record a spot every 6 game steps (20 a second)
  const GHOST_MAX = 4000; // spots: about 3 minutes
  const GHOST_KEEP = 30; // levels
  const GHOST_BONUS = 10; // coins for beating it

  // keyed by the level's blocks too, so an edited level starts a fresh ghost
  const ghostKey = (lvl) => {
    const str = lvl.name + "|" + lvl.rows.join("/");
    let h = 0;
    for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
    return (h >>> 0).toString(36);
  };
  const loadGhosts = () => {
    try { return JSON.parse(localStorage.getItem(GHOST_KEY) || "{}") || {}; } catch (e) { return {}; }
  };
  const saveGhost = (key, g) => {
    const all = loadGhosts();
    all[key] = g;
    Object.keys(all).sort((a, b) => (all[b].at || 0) - (all[a].at || 0))
      .slice(GHOST_KEEP).forEach((k) => delete all[k]);
    try { localStorage.setItem(GHOST_KEY, JSON.stringify(all)); } catch (e) { /* no room: keep the old one */ }
  };
  const ghostOn = () => {
    try { return localStorage.getItem(GHOST_ON_KEY) !== "0"; } catch (e) { return true; }
  };
  // Does run a beat the saved best b? Finishing beats not finishing, then
  // faster wins; otherwise reaching the boss, then getting further.
  const beats = (a, b) => {
    if (a.done !== b.done) return a.done;
    if (a.done) return a.t < b.t;
    if (a.boss !== b.boss) return a.boss;
    return a.far > b.far + 1;
  };

  // "Leave my sword at home": fight the boss bare-handed even though you own
  // a sword. Kept outside the bag, because loadBag only keeps the bag's own fields.
  const SWORD_HOME_KEY = "blockdash_sword_home";
  const swordAtHome = () => {
    try { return localStorage.getItem(SWORD_HOME_KEY) === "1"; } catch (e) { return false; }
  };
  const setSwordAtHome = (on) => {
    try { localStorage.setItem(SWORD_HOME_KEY, on ? "1" : "0"); } catch (e) { /* ignore */ }
  };

  // The bag: blaze rods, ender pearls and eyes of ender you're carrying.
  // Unlike diamonds it is kept from level to level and between visits.
  const loadBag = () => {
    let b = {};
    try { b = JSON.parse(localStorage.getItem(BAG_KEY) || "{}") || {}; } catch (e) { /* empty bag */ }
    const n = (v) => (Number.isFinite(v) && v > 0 ? Math.floor(v) : 0);
    return {
      rods: n(b.rods), pearls: n(b.pearls), eyes: n(b.eyes),
      coins: n(b.coins), mega: n(b.mega), shields: n(b.shields),
      sword: Math.min(n(b.sword), SWORDS.length - 1),
      unlocked: Array.isArray(b.unlocked) ? b.unlocked.filter((k) => TILES[k] && TILES[k].mega) : [],
      // mega backgrounds bought in the shop
      bgs: Array.isArray(b.bgs) ? b.bgs.filter((k) => window.BDArt.BACKGROUNDS.some((x) => x.mega && x.key === k)) : [],
    };
  };

  const saveBag = (bag) => {
    try { localStorage.setItem(BAG_KEY, JSON.stringify(bag)); } catch (e) { /* ignore */ }
    window.BDBadges.coins(bag.coins);
  };

  // ---------- grid helpers ----------

  const newGrid = (width) => {
    const g = Array.from({ length: H }, () => Array(width).fill(AIR));
    for (let x = 0; x < width; x++) g[H - 1][x] = "g"; // start with a floor
    g[H - 2][2] = "P";
    return g;
  };

  const gridToRows = (g) => g.map((r) => r.join(""));

  const rowsToGrid = (rows) => {
    const width = Math.max(...rows.map((r) => r.length));
    return Array.from({ length: H }, (_, y) => {
      const row = rows[y] || "";
      return Array.from({ length: width }, (_, x) => {
        const ch = row[x];
        return ch && (TILES[ch] || ch === AIR || isMine(ch)) ? ch : AIR;
      });
    });
  };

  const resizeGrid = (g, width) =>
    g.map((row) =>
      Array.from({ length: width }, (_, x) => (x < row.length ? row[x] : AIR)),
    );

  // The arena a level gets until someone draws their own: a floor, a start
  // and three Boss platforms stepping up toward the boss's head.
  const defaultArena = (bg) => {
    const floor = { nether: "n", end: "e", endStorage: "e", deepCave: "p" }[window.BDArt.bgBase(bg)] || "g";
    const g = Array.from({ length: H }, (_, y) => Array(ARENA_W).fill(y === H - 1 ? floor : AIR));
    g[H - 2][2] = "P";
    for (const [x, y] of BOSS_PLATS) g[y][x] = "J";
    return g;
  };
  const arenaGrid = (rows, bg) =>
    (Array.isArray(rows) && rows.length ? resizeGrid(rowsToGrid(rows.map(String)), ARENA_W) : defaultArena(bg));

  const findSpawn = (g) => {
    const width = g[0].length;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < width; x++) {
        if (baseOf(g[y][x]) === "P") return { x, y };
      }
    }
    // no start block placed — drop in above the first floor we can find
    for (let x = 0; x < width; x++) {
      for (let y = H - 1; y >= 0; y--) {
        if (isSolid(g[y][x])) return { x, y: y - 1 };
      }
    }
    return { x: 1, y: H - 2 };
  };

  // ---------- the Watcher's cone of vision ----------
  // The cone points straight down from the eye. Each column of it is cut off at
  // the first solid block, so what you see shaded is exactly where it can see.

  const coneStop = (g, wy, cx) => {
    for (let y = wy + 1; y < H; y++) if (isSolid(g[y][cx])) return y;
    return H;
  };

  const inCone = (g, wx, wy, px, py) => {
    const dy = py - (wy + 0.5);
    if (dy <= 0.5 || dy > WATCH_DEPTH) return false;
    if (Math.abs(px - (wx + 0.5)) > dy * WATCH_SPREAD) return false;
    const cx = Math.floor(px);
    return cx >= 0 && cx < g[0].length && py < coneStop(g, wy, cx);
  };

  // ox shifts the drawing sideways (the play screen scrolls; the editor doesn't)
  const drawCone = (ctx, g, wx, wy, ts, ox, open) => {
    const ax = wx + 0.5, ay = wy + 0.5, half = WATCH_DEPTH * WATCH_SPREAD;
    ctx.save();
    ctx.beginPath();
    for (let cx = Math.floor(ax - half); cx <= Math.floor(ax + half); cx++) {
      if (cx < 0 || cx >= g[0].length) continue;
      ctx.rect(cx * ts + ox, (wy + 1) * ts, ts, (coneStop(g, wy, cx) - wy - 1) * ts);
    }
    ctx.clip();
    ctx.beginPath();
    ctx.moveTo(ax * ts + ox, ay * ts);
    ctx.lineTo((ax - half) * ts + ox, (ay + WATCH_DEPTH) * ts);
    ctx.lineTo((ax + half) * ts + ox, (ay + WATCH_DEPTH) * ts);
    ctx.closePath();
    ctx.fillStyle = open ? "rgba(255, 50, 80, 0.32)" : "rgba(255, 255, 255, 0.1)";
    ctx.fill();
    ctx.restore();
  };

  const countDiamonds = (g) => {
    let n = 0;
    for (const row of g) for (const ch of row) if (baseOf(ch) === "d") n++;
    return n;
  };

  // ---------- levels that ship with the game (blockdash-levels.js) ----------

  // Normalise anything that claims to be a level into { name, rows } with
  // exactly H rows of equal length, or throw.
  const bgOf = (o) =>
    (window.BDArt.BACKGROUNDS.some((b) => b.key === o.bg) ? o.bg : "overworld");
  // what goes in a saved or downloaded level; overworld levels stay { name, rows }
  // A square holds one letter, which has no room for a Dialog block's words or
  // a Stop block's seconds. Those ride alongside the rows as notes, keyed by
  // square: { "x,y": "text" | seconds }. Notes whose block is gone are dropped.
  const noteKey = (x, y) => x + "," + y;
  const cleanNotes = (rows, notes) => {
    const out = {};
    if (!notes || typeof notes !== "object") return out;
    for (const [k, v] of Object.entries(notes)) {
      const [x, y] = k.split(",").map(Number);
      const ch = baseOf(rows[y] && rows[y][x]);
      if (ch === "K" && typeof v === "string" && v.trim()) out[k] = v.slice(0, 200);
      else if (ch === "O" && +v > 0) out[k] = clamp(+v, 0.5, 30);
    }
    return out;
  };

  // a level's own song, or null to play whatever the player picked
  const musicOf = (o) => (o && window.BDMusic.SONGS[o.music] ? o.music : null);

  // the boss arena can have its own background; without one it matches the level
  const arenaBgOf = (o) =>
    (window.BDArt.BACKGROUNDS.some((b) => b.key === o.arenaBg) ? o.arenaBg : bgOf(o));

  const levelData = (l) => {
    const o = bgOf(l) === "overworld" ? { name: l.name, rows: l.rows } : { name: l.name, bg: l.bg, rows: l.rows };
    const notes = cleanNotes(l.rows, l.notes);
    if (Object.keys(notes).length) o.notes = notes;
    if (Array.isArray(l.arena) && l.arena.length) o.arena = l.arena;
    if (arenaBgOf(l) !== bgOf(l)) o.arenaBg = l.arenaBg;
    // kept even when this browser has no art for it; it just plays as the usual player
    if (isMine(l.hero)) o.hero = l.hero;
    if (musicOf(l)) o.music = l.music;
    return o;
  };

  const normalizeLevel = (o, fallbackName) => {
    if (!o || typeof o !== "object" || !Array.isArray(o.rows) || !o.rows.length) {
      throw new Error("not a level");
    }
    const rows = o.rows.map(String);
    if (!rows.some((r) => r.length)) throw new Error("empty level");
    const clean = gridToRows(rowsToGrid(rows));
    return {
      name: String(o.name || fallbackName || "Untitled"),
      rows: clean,
      bg: bgOf(o),
      ...(arenaBgOf(o) !== bgOf(o) ? { arenaBg: o.arenaBg } : {}),
      ...(isMine(o.hero) ? { hero: o.hero } : {}),
      ...(musicOf(o) ? { music: o.music } : {}),
      notes: cleanNotes(clean, o.notes),
      // only levels whose arena was drawn by hand carry one
      ...(Array.isArray(o.arena) && o.arena.length ? { arena: gridToRows(arenaGrid(o.arena)) } : {}),
    };
  };

  const builtinLevels = () =>
    (window.BLOCKDASH_LEVELS || []).flatMap((l, i) => {
      try {
        return [{ ...normalizeLevel(l, `Level ${i + 1}`), builtin: true }];
      } catch (e) {
        return [];
      }
    });

  // best scores are namespaced so a built-in and a custom level can share a name
  const bestKey = (lvl) => (lvl.builtin ? "b:" : "m:") + lvl.name;

  // ---------- files ----------

  const download = (filename, text, mime) => {
    const blob = new Blob([text], { type: mime || "application/json" });
    const url = URL.createObjectURL(blob);
    const a = el("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const slug = (s) =>
    s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "level";

  const levelJson = (lvl) =>
    JSON.stringify(levelData(lvl), null, 2) + "\n";

  // Accepts a .json level, a .json array of levels, or a blockdash-levels.js file
  const parseLevelFile = (text, filename) => {
    const trimmed = text.trim();
    let data;
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      data = JSON.parse(trimmed);
    } else {
      const start = trimmed.indexOf("[");
      const end = trimmed.lastIndexOf("]");
      if (start < 0 || end < start) throw new Error("no level data found");
      data = JSON.parse(trimmed.slice(start, end + 1));
    }
    const list = Array.isArray(data) ? data : [data];
    const base = (filename || "").replace(/\.[^.]*$/, "");
    return list.map((o, i) => normalizeLevel(o, list.length > 1 ? `${base} ${i + 1}` : base));
  };

  // ---------- share codes ----------

  const encodeLevel = (lvl) => {
    const json = JSON.stringify({ n: lvl.name, r: lvl.rows, b: bgOf(lvl), x: cleanNotes(lvl.rows, lvl.notes), a: lvl.arena, ab: lvl.arenaBg, h: lvl.hero, m: musicOf(lvl) || undefined });
    const bytes = new TextEncoder().encode(json);
    let s = "";
    for (const b of bytes) s += String.fromCharCode(b);
    return btoa(s);
  };

  const decodeLevel = (code) => {
    const bin = atob(code.trim());
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    const o = JSON.parse(new TextDecoder().decode(bytes));
    if (!o || !Array.isArray(o.r) || !o.r.length) throw new Error("bad code");
    return { name: String(o.n || "Imported level"), rows: o.r.map(String), bg: o.b, notes: o.x, arena: o.a, arenaBg: o.ab, hero: o.h, music: o.m };
  };

  // Art codes are much bigger than level codes, so each drawing is stored as
  // a small colour list plus one letter per pixel, then gzipped where the
  // browser can. "A1:" = gzipped, "A0:" = plain.
  const PIX = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+/";
  const toB64 = (bytes) => {
    let s = "";
    for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(s);
  };
  const fromB64 = (b64) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const pipe = async (bytes, stream) =>
    new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer());

  const encodeArt = async (art) => {
    const o = {};
    for (const [key, { w, h, px, name, base }] of Object.entries(art)) {
      const pal = [...new Set(px.filter(Boolean))];
      if (pal.length >= PIX.length) continue; // more colours than letters; skip rather than break
      o[key] = [w, h, pal.map((c) => c.slice(1)).join(","), px.map((c) => (c ? PIX[pal.indexOf(c)] : ".")).join("")];
      if (name) o[key].push(name, base); // the player's own blocks carry their name and what they act like
    }
    const bytes = new TextEncoder().encode(JSON.stringify(o));
    if (typeof CompressionStream === "undefined") return "A0:" + toB64(bytes);
    return "A1:" + toB64(await pipe(bytes, new CompressionStream("gzip")));
  };

  const decodeArt = async (code) => {
    const m = /^A([01]):(.*)$/s.exec(code.replace(/\s+/g, ""));
    if (!m) throw new Error("bad code");
    let bytes = fromB64(m[2]);
    if (m[1] === "1") bytes = await pipe(bytes, new DecompressionStream("gzip"));
    const o = JSON.parse(new TextDecoder().decode(bytes));
    const art = {};
    for (const [key, [w, h, pal, idx, name, base]] of Object.entries(o)) {
      const colors = String(pal).split(",").map((c) => "#" + c);
      art[key] = { w, h, name, base, px: [...String(idx)].map((ch) => (ch === "." ? null : colors[PIX.indexOf(ch)] || null)) };
    }
    return art;
  };

  // ---------- block art (see blockdash-art.js) ----------

  const { drawTile, drawPlayer, drawExplosion, drawEraser } = window.BDArt;
  const Art = window.BDArt;

  // ---------- screen: main menu ----------

  // blockdash.html plays the official levels; blockdash.html?edit is the level maker.
  const editMode = new URLSearchParams(location.search).has("edit");

  const levelCard = (lvl, actions, num) => {
    const g = rowsToGrid(lvl.rows);
    const card = el("div", "level-card");
    const best = getBest(bestKey(lvl));
    if (num) card.appendChild(el("div", "num", num));
    card.appendChild(
      el("div", "name",
        `${lvl.name}<span class="meta">${g[0].length} blocks long · ` +
        `${countDiamonds(g)} diamonds${best ? ` · best ${best}` : ""}</span>`),
    );
    actions.forEach((b) => card.appendChild(b));
    return card;
  };

  // Play a list of levels back to back — finishing one offers up the next, and
  // diamonds carry over so a whole run has a single total.
  const playSeries = (levels, i, carried, onExit) =>
    showPlay(levels[i], onExit, false, {
      i,
      count: levels.length,
      carried,
      playNext: (total) => playSeries(levels, i + 1, total, onExit),
    });

  const stack = () => {
    const list = el("div", "row");
    list.style.flexDirection = "column";
    list.style.alignItems = "stretch";
    return list;
  };

  // The look the player picked on the menu. A level that sets its own
  // Player look in the Level Maker still wins over this.
  const pickedHero = () => {
    let k = null;
    try { k = localStorage.getItem(HERO_KEY); } catch (e) { /* the usual player */ }
    return window.BDArt.baseOf(k) === "player" ? k : null;
  };

  // ---------- pets ----------
  // A pet just follows you around for fun. Bought in the shop; one at a time.
  // Pets drawn in the Art Studio start from one of these and sound like it.
  const PET_KEY = "blockdash_pets_v1";
  const PET_COST = 50;
  const PETS = [
    ["petCat", "Cat", "cat"], ["petDog", "Dog", "dog"], ["petFrog", "Frog", "frog"],
    ["petParrot", "Parrot", "parrot"], ["petDragon", "Baby dragon", "dragon"],
  ];
  const PET_SOUND = Object.fromEntries(PETS.map(([k, , snd]) => [k, snd]));
  const FLYING_PETS = ["petParrot", "petDragon"];
  const CAT_LOOK = "\ue934"; // the shipped black-cat player look
  const petBaseOf = (k) => (PET_SOUND[k] ? k : PET_SOUND[Art.baseOf(k)] ? Art.baseOf(k) : null);
  const allPets = () => PETS.map(([key, label]) => ({ key, label }))
    .concat(Art.customBlocks().filter((b) => PET_SOUND[b.base]).map((b) => ({ key: b.key, label: b.label })));
  const loadPets = () => {
    let p = {};
    try { p = JSON.parse(localStorage.getItem(PET_KEY) || "{}") || {}; } catch (e) { /* no pets yet */ }
    // a drawn pet whose art isn't in this browser is kept, just not shown
    const owned = Array.isArray(p.owned) ? p.owned.filter((k) => typeof k === "string") : [];
    return { owned, pick: owned.includes(p.pick) && petBaseOf(p.pick) ? p.pick : null };
  };
  const savePets = (p) => {
    try { localStorage.setItem(PET_KEY, JSON.stringify(p)); } catch (e) { /* ignore */ }
    if (PETS.every(([k]) => p.owned.includes(k))) window.BDBadges.earn("pets");
  };

  const petPanel = () => {
    const pets = loadPets();
    const panel = el("div", "panel");
    panel.appendChild(el("h2", null, "🐾 Pick your pet"));
    const mine = allPets().filter((pt) => pets.owned.includes(pt.key));
    if (!mine.length) {
      panel.appendChild(el("p", "hint", `No pets yet. Buy one in the 🛒 Shop for ${PET_COST} coins!`));
      return panel;
    }
    const row = el("div", "row");
    [{ key: null, label: "None" }].concat(mine).forEach(({ key, label }) => {
      const item = el("div", "pal-item" + (key === pets.pick ? " sel" : ""));
      item.style.minWidth = "76px";
      const thumb = key ? spriteThumb(key, 48, 48) : el("canvas");
      if (!key) { thumb.width = thumb.height = 48; }
      item.append(thumb, el("div", "lbl", label));
      item.onclick = () => {
        savePets(Object.assign(pets, { pick: key }));
        if (key) window.BDMusic.sfx(PET_SOUND[petBaseOf(key)]);
        showMenu();
      };
      row.appendChild(item);
    });
    panel.appendChild(row);
    return panel;
  };

  // Badge Master's surprise: a crown, a secret song and a pile of coins
  const MASTER_COINS = 1000;
  window.addEventListener("bd-badge", (e) => {
    if (e.detail !== "master") return;
    const b = loadBag();
    saveBag(Object.assign(b, { coins: b.coins + MASTER_COINS }));
    setTimeout(() => toast(`🏆 SURPRISE! A golden crown 👑, a secret song in 🎵 Music, and +${MASTER_COINS} coins!`), 3200);
  });

  // ---------- badges screen ----------
  const showBadges = () => {
    clear();
    const B = window.BDBadges;
    const head = el("div", "row");
    head.appendChild(el("h1", null, `🏅 Badges ${B.count()}/${B.LIST.length}`));
    head.appendChild(el("div", "spacer"));
    const back = el("button", "small", "← Back");
    back.onclick = () => showMenu();
    head.appendChild(back);
    root.appendChild(head);
    const panel = el("div", "panel");
    const grid = el("div", "badge-grid");
    for (const b of B.LIST) {
      const got = B.has(b.id);
      const hide = b.secret && !got;
      const card = el("div", "badge-card " + (got ? "got" : "locked"));
      card.append(el("div", "icon", hide ? "❓" : b.icon), el("div", "name", hide ? "Secret" : b.name),
        el("div", "how", hide ? "Keep playing to find it!" : b.how));
      grid.appendChild(card);
    }
    panel.appendChild(grid);
    root.appendChild(panel);
  };

  const heroPanel = () => {
    const panel = el("div", "panel");
    panel.appendChild(el("h2", null, "Pick your player"));
    const row = el("div", "row");
    const picked = pickedHero();
    [[null, "Usual"]]
      .concat(window.BDArt.customBlocks().filter((b) => b.base === "player").map((b) => [b.key, b.label]))
      .forEach(([k, label]) => {
        const item = el("div", "pal-item" + (k === picked ? " sel" : ""));
        item.style.minWidth = "76px";
        item.append(spriteThumb(k || "player", 48, 48), el("div", "lbl", label));
        item.onclick = () => {
          try {
            if (k) localStorage.setItem(HERO_KEY, k);
            else localStorage.removeItem(HERO_KEY);
          } catch (e) { /* ignore */ }
          showMenu();
        };
        row.appendChild(item);
      });
    panel.appendChild(row);
    return panel;
  };

  // What you're carrying, and the recipe, laid out like inventory slots.
  const bagPanel = () => {
    const bag = loadBag();
    const panel = el("div", "panel");
    panel.appendChild(el("h2", null, "🎒 Inventory"));
    const slot = (ch, count) => {
      const d = el("div", "bag-slot");
      const c = el("canvas");
      c.width = c.height = 40;
      drawTile(c.getContext("2d"), ch, 0, 0, 40, 0, false);
      d.appendChild(c);
      if (count !== undefined) d.appendChild(el("span", "bag-count", String(count)));
      d.title = TILES[ch] ? TILES[ch].name : { coin: "Coins", megacoin: "Megacoins", shield: "Shields" }[ch] || "Sword";
      return d;
    };
    const have = el("div", "row tight");
    have.append(slot("r", bag.rods), slot("9", bag.pearls), slot("o", bag.eyes));
    panel.appendChild(have);
    const recipe = el("div", "row tight bag-recipe");
    recipe.append(slot("r"), el("span", null, "+"), slot("9"), el("span", null, "+"),
      slot("H"), el("span", null, "="), slot("o"));
    panel.appendChild(recipe);
    panel.appendChild(el("p", "hint",
      "Blaze rods, ender pearls and eyes of ender stay with you from level to level. " +
      "Put eyes in portal frames to open the boss portal."));
    const money = el("div", "row tight bag-recipe");
    money.append(slot("coin", bag.coins), slot("megacoin", bag.mega));
    if (bag.sword) money.append(slot(SWORDS[bag.sword].key));
    if (bag.shields) money.append(slot("shield", bag.shields));
    if (bag.sword) {
      const home = swordAtHome();
      const swordBtn = el("button", "small" + (home ? "" : " green"), home ? "⚔️ Sword: left at home" : "⚔️ Sword: taking it");
      swordBtn.title = "Leave your sword at home to fight the boss with bare hands";
      swordBtn.onclick = () => { setSwordAtHome(!home); showMenu(); };
      money.append(swordBtn);
    }
    const shop = el("button", "green small", "🛒 Shop");
    shop.onclick = () => showShop();
    money.append(el("div", "spacer"), shop);
    panel.appendChild(money);
    if (editMode && (bag.rods || bag.pearls || bag.eyes)) {
      const empty = el("button", "small", "Empty the inventory");
      empty.onclick = () => {
        if (!confirm("Throw away every rod, pearl and eye you're carrying?")) return;
        saveBag(Object.assign(loadBag(), { rods: 0, pearls: 0, eyes: 0 }));
        showMenu();
      };
      panel.appendChild(empty);
    }
    return panel;
  };

  // ---------- the music screen ----------

  const showMusic = () => {
    clear();
    const M = window.BDMusic;
    const head = el("div", "row");
    head.appendChild(el("h1", null, "🎵 Music"));
    head.appendChild(el("div", "spacer"));
    const back = el("button", "small", "← Back");
    back.onclick = () => showMenu();
    head.appendChild(back);
    root.appendChild(head);

    const songs = el("div", "panel");
    songs.appendChild(el("h2", null, "Pick a song"));
    const list = stack();
    for (const [k, song] of Object.entries(M.SONGS)) {
      if (song.secret && !window.BDBadges.has("master")) continue;
      const row = el("div", "row tight");
      const pick = el("button", k === M.song ? "green" : "", `${song.icon} ${song.name}${k === M.song ? " ✓" : ""}`);
      pick.style.minWidth = "170px";
      pick.onclick = () => { M.setSong(k); showMusic(); };
      row.append(pick, el("span", "hint", song.what));
      list.appendChild(row);
    }
    songs.appendChild(list);
    songs.appendChild(el("p", "hint", "Your song keeps playing until you pick another one."));
    root.appendChild(songs);

    const vol = el("div", "panel");
    vol.appendChild(el("h2", null, "Volume"));
    const row = el("div", "row tight");
    for (const [k, label] of [["quiet", "🔈 Quiet"], ["mid", "🔉 Medium"], ["loud", "🔊 Loud"]]) {
      const b = el("button", k === M.vol ? "green" : "", label);
      b.onclick = () => { M.setVolume(k); showMusic(); };
      row.appendChild(b);
    }
    vol.appendChild(row);
    root.appendChild(vol);
  };

  // ---------- the shop ----------

  const MEGA_BG_WHAT = {
    megaOverworld: "A sunset, a rainbow, birds and mountains",
    megaNether: "Lava waterfalls, embers and crimson trees",
    megaMooshroom: "Giant glowing mushrooms and floating spores",
    megaEnd: "A galaxy swirl, shooting stars and floating islands",
    megaEndStorage: "Glowing crystals, pulsing lights and floating crates",
    megaDeepCave: "A waterfall, glowing crystals and sparkly dripstone",
  };

  const showShop = () => {
    clear();
    const bag = loadBag();
    const head = el("div", "row");
    head.appendChild(el("h1", null, "Shop"));
    head.appendChild(el("div", "spacer"));
    const back = el("button", "small", "← Back");
    back.onclick = () => showMenu();
    head.appendChild(back);
    root.appendChild(head);

    const thumb = (key) => {
      if (petBaseOf(key)) return spriteThumb(key, 48, 48); // pets aren't square
      if (Art.BACKGROUNDS.some((b) => b.key === key)) {
        const c = el("canvas");
        c.width = 86;
        c.height = 48;
        Art.drawBackground(c.getContext("2d"), key, 86, 48, 0, 8, 3, null);
        return c;
      }
      const c = el("canvas");
      c.width = c.height = 48;
      drawTile(c.getContext("2d"), key, 0, 0, 48, 0, false);
      return c;
    };
    const spend = (change) => { saveBag(Object.assign(bag, change)); showShop(); };

    const wallet = el("div", "panel");
    wallet.appendChild(el("h2", null, "Your money"));
    const have = el("div", "row tight");
    have.append(thumb("coin"), el("b", null, `${bag.coins} coins`), el("div", "spacer"),
      thumb("megacoin"), el("b", null, `${bag.mega} megacoins`));
    wallet.appendChild(have);
    wallet.appendChild(el("p", "hint",
      `Diamonds pay 10 coins, gold 15, emeralds 20. Megatite pays ${MEGATITE_PAYS} megacoins. ` +
      "You keep what you picked up when you finish the level."));
    const conv = el("div", "row tight");
    const toCoins = el("button", "small", `1 megacoin → ${COINS_PER_MEGACOIN} coins`);
    toCoins.disabled = bag.mega < 1;
    toCoins.onclick = () => spend({ mega: bag.mega - 1, coins: bag.coins + COINS_PER_MEGACOIN });
    const toMega = el("button", "small", `${COINS_PER_MEGACOIN} coins → 1 megacoin`);
    toMega.disabled = bag.coins < COINS_PER_MEGACOIN;
    toMega.onclick = () => spend({ coins: bag.coins - COINS_PER_MEGACOIN, mega: bag.mega + 1 });
    const allMega = el("button", "small", "All coins → megacoins");
    allMega.disabled = bag.coins < COINS_PER_MEGACOIN;
    allMega.onclick = () => {
      const n = Math.floor(bag.coins / COINS_PER_MEGACOIN);
      spend({ coins: bag.coins - n * COINS_PER_MEGACOIN, mega: bag.mega + n });
    };
    const allCoins = el("button", "small", "All megacoins → coins");
    allCoins.disabled = bag.mega < 1;
    allCoins.onclick = () => spend({ mega: 0, coins: bag.coins + bag.mega * COINS_PER_MEGACOIN });
    conv.append(el("span", "hint", "Convert:"), toCoins, toMega, allCoins, allMega);
    wallet.appendChild(conv);
    root.appendChild(wallet);

    // one row of a shop: picture, what it is, and a Buy button (or why not)
    const item = (key, name, what, price, unit, state, onBuy) => {
      const row = el("div", "row tight shop-item");
      const words = el("div");
      words.style.flex = "1";
      words.append(el("b", null, name), el("div", "hint", what));
      const have = unit === "coins" ? bag.coins : bag.mega;
      const buy = el("button", "green small", state || `Buy · ${price} ${unit}`);
      buy.disabled = !!state || have < price;
      if (!state && have < price) buy.title = `You need ${price - have} more ${unit}`;
      buy.onclick = onBuy;
      row.append(thumb(key), words, buy);
      return row;
    };

    const coinShop = el("div", "panel");
    coinShop.appendChild(el("h2", null, "Coin shop"));
    coinShop.appendChild(el("p", "hint",
      `With no sword the boss takes ${BOSS_HP} stomps. You always use the best sword you own.`));
    SWORDS.forEach((sw, i) => {
      if (!sw) return;
      const state = bag.sword === i ? "Yours ✓" : bag.sword > i ? "You have better" : "";
      coinShop.appendChild(item(sw.key, sw.name, `Beat the boss in ${sw.hits} stomps`, sw.cost, "coins", state,
        () => spend({ coins: bag.coins - sw.cost, sword: i })));
    });
    coinShop.appendChild(item("shield", `Shield${bag.shields ? ` (you have ${bag.shields})` : ""}`,
      "Saves you once from a mob hit (blazes, fireballs, end mobs, the boss). Then it's used up",
      SHIELD_COST, "coins", "", () => spend({ coins: bag.coins - SHIELD_COST, shields: bag.shields + 1 })));
    root.appendChild(coinShop);

    const pets = loadPets();
    const petShop = el("div", "panel");
    petShop.appendChild(el("h2", null, "🐾 Pet shop"));
    petShop.appendChild(el("p", "hint",
      "A pet follows you through every level and makes its sound when you grab a diamond. Pick it on the title screen."));
    for (const pt of allPets()) {
      const owned = pets.owned.includes(pt.key);
      const row = item(pt.key, pt.label, owned ? "Yours!" : "Follows you around", PET_COST, "coins",
        owned ? "Owned ✓" : "", () => {
          saveBag(Object.assign(bag, { coins: bag.coins - PET_COST }));
          pets.owned.push(pt.key);
          if (!pets.pick) pets.pick = pt.key;
          savePets(pets);
          window.BDMusic.sfx(PET_SOUND[petBaseOf(pt.key)]);
          showShop();
        });
      petShop.appendChild(row);
    }
    const draw = el("button", "small", "🎨 Draw your own pet");
    draw.onclick = () => showArtStudio(null, () => showShop());
    petShop.append(draw, el("p", "hint",
      "In the Art Studio, make a New block and start it from one of the pets. Then buy it here."));
    root.appendChild(petShop);

    const megaShop = el("div", "panel");
    megaShop.appendChild(el("h2", null, "Megacoin shop"));
    megaShop.appendChild(el("p", "hint",
      "Mega blocks are stronger or fancier versions of normal blocks. Buy one and you can place it in the Level Maker."));
    MEGA_BLOCKS.forEach(([ch, what]) => {
      megaShop.appendChild(item(ch, TILES[ch].name, what, MEGA_COST, "megacoins",
        bag.unlocked.includes(ch) ? "Yours ✓" : "",
        () => spend({ mega: bag.mega - MEGA_COST, unlocked: bag.unlocked.concat(ch) })));
    });
    root.appendChild(megaShop);

    const bgShop = el("div", "panel");
    bgShop.appendChild(el("h2", null, "✨ Mega backgrounds"));
    bgShop.appendChild(el("p", "hint",
      "Fancier versions of the backgrounds. Buy one and you can pick it for your levels in the Level Maker."));
    Art.BACKGROUNDS.filter((b) => b.mega).forEach((b) => {
      bgShop.appendChild(item(b.key, b.label.replace("✨ ", ""), MEGA_BG_WHAT[b.key], MEGA_COST, "megacoins",
        bag.bgs.includes(b.key) ? "Yours ✓" : "",
        () => spend({ mega: bag.mega - MEGA_COST, bgs: bag.bgs.concat(b.key) })));
    });
    root.appendChild(bgShop);
  };

  const showMenu = () => {
    window.BDMusic.level(null);
    // pets and coins from before badges existed still count
    window.BDBadges.coins(loadBag().coins);
    if (PETS.every(([k]) => loadPets().owned.includes(k))) window.BDBadges.earn("pets");
    clear();
    const levels = loadLevels();
    const builtin = builtinLevels();

    const head = el("div", "row");
    const title = el("h1", null, editMode ? "Block Dash Level Maker" : "Block Dash");
    title.onclick = () => window.BDBadges.titleClick();
    head.appendChild(title);
    head.appendChild(el("div", "spacer"));
    const other = el("a", "btn small", editMode ? "▶ Play the game" : "✏ Level Maker");
    other.href = editMode ? "blockdash.html" : "blockdash.html?edit";
    head.appendChild(other);
    if (editMode) {
      const artBtn = el("button", "small", "🎨 Art");
      artBtn.onclick = () => showArtStudio();
      head.appendChild(artBtn);
    }
    const music = el("button", "small", "🎵 Music");
    music.onclick = () => showMusic();
    head.appendChild(music);
    const badges = el("button", "small", `🏅 ${window.BDBadges.count()}/${window.BDBadges.LIST.length}`);
    badges.title = "Badges";
    badges.onclick = () => showBadges();
    head.appendChild(badges);
    const home = el("a", "btn small", "← Pick Right");
    home.href = "index.html";
    head.appendChild(home);
    root.appendChild(head);
    root.appendChild(el("p", "sub",
      editMode ? "Build a level. Then survive it." : "Run, jump, grab diamonds. Don't explode."));

    if (!editMode && !builtin.length) {
      root.appendChild(el("div", "panel empty-note", "No levels yet — check back soon!"));
      return;
    }

    // ---- levels that ship with the game ----
    if (builtin.length) {
      const bp = el("div", "panel");
      bp.appendChild(el("h2", null, "Levels"));
      const list = stack();
      builtin.forEach((lvl, i) => {
        const play = el("button", "green small", i ? "▶ Play" : "▶ Start");
        play.onclick = () => playSeries(builtin, i, 0, () => showMenu());
        const copy = el("button", "small", "✏ Copy & edit");
        copy.onclick = () => showEditor({ name: lvl.name + " copy", rows: lvl.rows, bg: lvl.bg, notes: lvl.notes, arena: lvl.arena, arenaBg: lvl.arenaBg, hero: lvl.hero, music: lvl.music }, -1);
        list.appendChild(levelCard(lvl, editMode ? [play, copy] : [play], i + 1));
      });
      bp.appendChild(list);
      if (builtin.length > 1) {
        bp.appendChild(el("p", "hint",
          "Finish one level and it leads straight into the next. Diamonds add up " +
          "across the whole run."));
      }
      root.appendChild(bp);
      if (!editMode) root.append(heroPanel(), petPanel(), bagPanel());
    }
    if (!editMode) return;

    // ---- levels saved in this browser ----
    root.append(heroPanel(), petPanel(), bagPanel());
    const panel = el("div", "panel");
    panel.appendChild(el("h2", null, "My levels"));

    if (!levels.length) {
      panel.appendChild(
        el("div", "empty-note",
          "No levels yet!<br>Hit <b>+ New Level</b> to open the level maker<br>and build your first one."),
      );
    } else {
      const list = stack();
      // swapping two neighbours is how the play order (and the pack order) is set
      const move = (i, dir) => {
        const all = loadLevels();
        const j = i + dir;
        if (j < 0 || j >= all.length) return;
        [all[i], all[j]] = [all[j], all[i]];
        saveLevels(all);
        showMenu();
      };
      levels.forEach((lvl, i) => {
        const up = el("button", "small", "▲");
        up.title = "Play this one earlier";
        up.disabled = i === 0;
        up.onclick = () => move(i, -1);
        const down = el("button", "small", "▼");
        down.title = "Play this one later";
        down.disabled = i === levels.length - 1;
        down.onclick = () => move(i, 1);
        const play = el("button", "green small", i ? "▶ Play" : "▶ Start");
        play.onclick = () => playSeries(levels, i, 0, () => showMenu());
        const edit = el("button", "small", "✏ Edit");
        edit.onclick = () => showEditor(lvl, i);
        const share = el("button", "small", "⧉ Code");
        share.onclick = () => showShare(lvl);
        const file = el("button", "small", "⬇ File");
        file.onclick = () => {
          download(slug(lvl.name) + ".json", levelJson(lvl));
          toast("Saved " + slug(lvl.name) + ".json");
        };
        const del = el("button", "danger small", "🗑");
        del.onclick = () => {
          if (!confirm(`Delete "${lvl.name}"?`)) return;
          const all = loadLevels();
          all.splice(i, 1);
          saveLevels(all);
          showMenu();
        };
        const order = levels.length > 1 ? [up, down] : [];
        list.appendChild(levelCard(lvl, [...order, play, edit, share, file, del], i + 1));
      });
      panel.appendChild(list);
      if (levels.length > 1) {
        panel.appendChild(el("p", "hint",
          "The number is where a level comes in the run — use <b>▲ ▼</b> to move it. " +
          "<b>▶ Start</b> on level 1 plays straight through all of them."));
      }
    }

    const newBtn = el("button", "green wide", "+ New Level");
    newBtn.style.marginTop = "10px";
    newBtn.onclick = () => showEditor(null, -1);
    panel.appendChild(newBtn);
    root.appendChild(panel);

    // ---- share codes ----
    const imp = el("div", "panel");
    imp.appendChild(el("h2", null, "Level code"));
    imp.appendChild(el("p", "hint",
      "Paste a level code someone shared with you, then press Import."));
    const ta = el("textarea");
    ta.placeholder = "paste code here…";
    imp.appendChild(ta);
    const impBtn = el("button", "small", "Import");
    impBtn.style.marginTop = "8px";
    impBtn.onclick = () => {
      try {
        const lvl = normalizeLevel(decodeLevel(ta.value));
        const all = loadLevels();
        all.push(lvl);
        saveLevels(all);
        toast("Level imported!");
        showMenu();
      } catch (e) {
        toast("That code didn't work");
      }
    };
    imp.appendChild(impBtn);
    root.appendChild(imp);

    // ---- dev tools: turn saved levels into the game's built-in pack ----
    const pack = el("details", "panel");
    const sum = el("summary", null, "Level pack tools");
    sum.style.cursor = "pointer";
    sum.style.letterSpacing = "1px";
    sum.style.textTransform = "uppercase";
    pack.appendChild(sum);
    pack.appendChild(el("p", "hint",
      "<b>Download all</b> saves every level in My levels as one " +
      "<code>blockdash-levels.json</code> file, in the order listed above. Use it " +
      "as a backup, or to pick which levels become the game's official ones. " +
      "<b>Load file</b> reads a <code>.json</code> file back into My levels."));

    const packRow = el("div", "row");
    packRow.style.marginTop = "8px";

    const dlJson = el("button", "small", "⬇ Download all (.json)");
    dlJson.disabled = !levels.length;
    dlJson.onclick = () => {
      const data = levels.map(levelData);
      download("blockdash-levels.json", JSON.stringify(data, null, 2) + "\n");
      toast("Saved blockdash-levels.json");
    };

    const fileInput = el("input");
    fileInput.type = "file";
    fileInput.accept = ".json,.js,application/json,text/javascript";
    fileInput.multiple = true;
    fileInput.style.display = "none";
    fileInput.onchange = async () => {
      const files = [...fileInput.files];
      fileInput.value = "";
      if (!files.length) return;
      const all = loadLevels();
      let added = 0;
      for (const f of files) {
        try {
          const parsed = parseLevelFile(await f.text(), f.name);
          parsed.forEach((lvl) => { all.push(lvl); added++; });
        } catch (e) {
          toast(`Couldn't read ${f.name}`);
        }
      }
      if (added) {
        saveLevels(all);
        toast(`Loaded ${added} level${added === 1 ? "" : "s"}`);
        showMenu();
      }
    };
    const loadBtn = el("button", "small", "⬆ Load file");
    loadBtn.onclick = () => fileInput.click();

    packRow.append(dlJson, loadBtn, fileInput);
    pack.appendChild(packRow);
    if (builtin.length) {
      pack.appendChild(el("p", "hint",
        `Currently shipping ${builtin.length} built-in ` +
        `level${builtin.length === 1 ? "" : "s"}.`));
    }
    root.appendChild(pack);

    // ---- block reference ----
    const rules = el("div", "panel");
    rules.appendChild(el("h2", null, "Block rules"));
    const tbl = stack();
    tbl.style.gap = "6px";
    [
      ["g", "Grass — solid ground to run on"],
      ["s", "Stone — solid block, build walls and towers"],
      ["p", "Deepslate — tougher stone. Solid and dark"],
      ["A", "Spike — sharp to touch. You vanish in a puff of smoke"],
      ["m", "Slime — land on it and you bounce way up"],
      ["t", "TNT — touch it and you explode. Game over!"],
      ["h", "Hidden TNT — invisible when you play. Hide it somewhere tempting!"],
      ["C", "Saving point — die after passing it and you come back here"],
      ["d", "Diamond — worth 10 coins"],
      ["+", "Gold — worth 15 coins"],
      ["$", "Emerald — worth 20 coins"],
      ["@", "Megatite — worth 30 megacoins. Spend coins and megacoins in the Shop"],
      ["b", "Lightning — go super fast for 3 seconds"],
      ["%", "Fake lightning — looks just like Lightning, but does nothing at all"],
      ["w", "Wither rose — slows you down for 3 seconds"],
      ["n", "Netherrack — solid, like stone but for the Nether"],
      ["k", "Nether bricks — solid bricks for Nether builds"],
      ["L", "Lava — burns you if you touch it"],
      ["U", "Rising lava — stays put and grows new lava upward once it's on screen"],
      ["D", "Falling lava — stays put and slowly grows new lava downward"],
      ["F", "Fire — burns you if you touch it"],
      ["S", "Shooter — solid block that fires stars that chase you"],
      ["Z", "Spawner — solid cage that lets out blazes. Blazes shoot fireballs; jump on one to get its blaze rod"],
      ["r", "Blaze rod — collect them! Blazes drop one when you jump on them. Rods, pearls and eyes stay in your inventory from level to level"],
      ["e", "End stone — solid block for End levels"],
      ["T", "End TNT — TNT in End colours. Touch it and you explode"],
      ["I", "Blink — press jump while touching it to teleport to the next Blink ahead"],
      ["Y", "Staring watcher — like the Watcher, but its eye never shuts"],
      ["W", "Watcher — an eye block that looks down. If you're in its shaded cone while the eye is open, you get DELETED"],
      ["V", "End watcher — ignores you until you jump on it. Then it chases you!"],
      ["Q", "Corrupted end watcher — touching it deletes you, even asleep. Jump on it and it chases you, glitching forward to keep up"],
      ["N", "Short-legged enderman — teleports in front of you when you get close. Jump on it to beat it"],
      ["9", "Ender pearl — collect them! One pearl and one blaze rod make an eye of ender"],
      ["H", "Crafting table — run past it and every blaze rod + ender pearl pair you carry turns into an eye of ender"],
      ["o", "Eye of ender — collect them, or craft them. They go in portal frames"],
      ["R", "Portal frame — run past it and one of your eyes of ender pops in. If a level has frames, its Boss portal stays shut until every frame has an eye"],
      ["f", "Wings + firework — hold jump to fly up, let go to glide. They come off at the next save point"],
      ["K", "Dialog block — invisible when you play. Stops the player and shows the words you typed, until they press jump"],
      ["O", "Stop block — invisible when you play. Holds the player still for the number of seconds you set"],
      ["M", "Free move block — invisible when you play. The player stops auto-running and moves with ◀ ▶ until the next save point"],
      ["s", "More blocks — blocks you name and paint yourself. In the Art Studio press ＋ New block and pick something to start from: your block acts just like it (a blue slime still bounces). Find them under More blocks in the Level Maker"],
      ["J", "Boss platform — for the boss arena. Only appears while the boss says CLIMB UP, so build the way to its head out of these"],
      ["E", "End portal — finish the level here"],
      ["G", "Boss portal — use it instead of the End portal. Add Portal frames to keep it shut until they're filled. The TNT Mech boss is waiting: dodge its TNT rain, climb up and stomp its head, dodge its shooter arm. Five stomps wins, or fewer with a sword from the Shop"],
      ["B", "Bush — just decoration, safe to touch"],
      ["8", "Mega TNT — goes off when you come within a block of it, with a much bigger bang. Buy it in the Shop to place it"],
      ["0", "Mega slime — bounces you much higher than Slime. Buy it in the Shop to place it"],
      ["&", "Mega bush — a bush in bloom. Buy it in the Shop to place it"],
      ...MEGA_BLOCKS.filter(([ch, what]) => MEGA_BASE[ch] && what !== MEGA_GLOW)
        .map(([ch, what]) => [ch, `${TILES[ch].name} — ${what[0].toLowerCase()}${what.slice(1)}. Buy it in the Shop to place it`]),
      [megaOf("s"), "Every other block has a mega version too (Mega stone, Mega netherrack…). They glow but act just like the normal block. Find them all under Mega blocks"],
      ["\u0180", "Normal door — two blocks tall. Shut, it's a wall; it swings open as you reach it"],
      ["\u0181", "Nether door — like the Normal door, in Nether crimson"],
      ["\u0182", "End door — like the Normal door, in End stone"],
      ["\u0183", "Mushroom door — like the Normal door, with a mushroom on top"],
      ["\u0184", "Mechanical door — opens by itself when you get within a couple of blocks"],
      ["\u0185", "Upgraded door — locked! It only opens if you're carrying a key, and uses the key up. Without one it's a wall"],
      ["\u0186", "Key — opens one Upgraded door. Keys only work in the level you find them in"],
      ["P", "Start — where you spawn"],
    ].forEach(([ch, text]) => {
      const r = el("div", "row tight");
      const c = el("canvas");
      c.width = c.height = 30;
      drawTile(c.getContext("2d"), ch, 0, 0, 30, 0, false);
      r.appendChild(c);
      const label = el("span", "hint", text);
      label.style.flex = "1";
      r.appendChild(label);
      // the Art Studio paints square blocks; doors are two tall
      if (editMode && !isDoor(ch) && ch !== KEY) {
        const paint = el("button", "small", "🎨");
        paint.title = "Repaint this block";
        paint.onclick = () => showArtStudio(ch);
        r.appendChild(paint);
      }
      tbl.appendChild(r);
    });
    rules.appendChild(tbl);
    if (editMode) {
      rules.appendChild(el("p", "hint",
        "Hit 🎨 to repaint any block in the Art Studio."));
    }
    root.appendChild(rules);

    const legal = el("p", "hint",
      "An unofficial fan-made game with original art. Not affiliated with, " +
      "endorsed by, or connected to Mojang, Microsoft, or any other game.");
    legal.style.textAlign = "center";
    root.appendChild(legal);
  };

  const showShare = (lvl) => {
    clear();
    root.appendChild(el("h1", null, "Level code"));
    const p = el("div", "panel");
    p.appendChild(el("p", "hint",
      `Copy this code to share <b>${lvl.name}</b> with someone else.`));
    const ta = el("textarea");
    ta.value = encodeLevel(lvl);
    ta.readOnly = true;
    p.appendChild(ta);
    const row = el("div", "row");
    row.style.marginTop = "8px";
    const copy = el("button", "green small", "Copy");
    copy.onclick = () => {
      ta.select();
      try {
        navigator.clipboard ? navigator.clipboard.writeText(ta.value) : document.execCommand("copy");
        toast("Copied!");
      } catch (e) {
        toast("Select the text and copy it");
      }
    };
    const back = el("button", "small", "← Back");
    back.onclick = showMenu;
    row.append(copy, back);
    p.appendChild(row);
    root.appendChild(p);
  };

  // ---------- screen: art studio ----------

  // Paint box: greys, browns/skins, greens, teals/blues, purples, hots, pinks.
  const ART_COLORS = [
    "#000000", "#1c1c1a", "#3a3a48", "#5c5c5c", "#8a8a8a", "#b8b8b8", "#e6e6e6", "#ffffff",
    "#42230f", "#633718", "#8b5a2b", "#b8813f", "#d29a58", "#eab06a", "#f6d6a8", "#ffe9c9",
    "#1d3a12", "#3c7023", "#4a8b2c", "#5fa83c", "#7cb342", "#8bc34a", "#b6e06a", "#dff5a8",
    "#04565d", "#05777f", "#07aeb4", "#3ad0c8", "#8ff5ee", "#152438", "#093a80", "#0c4699",
    "#1f56a8", "#2f65b8", "#5aa9e6", "#6ec0ff", "#5b1f96", "#7b2fbe", "#a855e8", "#dcb6ff",
    "#7a1410", "#a8291f", "#d1402f", "#e5401f", "#ff6b3d", "#ff9800", "#ffc107", "#ffe98a",
    "#7a1a4a", "#c2185b", "#e91e63", "#ff8fb1", "#4a3520", "#9c6b43", "#23232c", "#6b4220",
  ];

  // px stays one flat array — but broken one image row per line, so a saved art
  // file is still readable and diffs a pixel change to a single line.
  const artJson = (art) => {
    const parts = Object.entries(art).map(([key, s]) => {
      const rows = [];
      for (let y = 0; y < s.h; y++) {
        rows.push("      " + s.px.slice(y * s.w, (y + 1) * s.w)
          .map((p) => JSON.stringify(p === undefined ? null : p)).join(","));
      }
      const nm = s.name ? `    "name": ${JSON.stringify(s.name)},\n    "base": ${JSON.stringify(s.base)},\n` : "";
      return `  ${JSON.stringify(key)}: {\n${nm}    "w": ${s.w},\n    "h": ${s.h},\n` +
        `    "px": [\n${rows.join(",\n")}\n    ]\n  }`;
    });
    return `{\n${parts.join(",\n")}\n}`;
  };

  // Accepts a .json art file or a blockdash-artpack.js pack
  const parseArtFile = (text) => {
    const trimmed = text.trim();
    if (trimmed.startsWith("{")) return JSON.parse(trimmed);
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start < 0 || end < start) throw new Error("no art data found");
    return JSON.parse(trimmed.slice(start, end + 1));
  };

  // Draw a sprite into a canvas at its own aspect ratio, bottom-aligned.
  const spriteThumb = (key, boxW, boxH) => {
    const c = el("canvas");
    c.width = boxW;
    c.height = boxH;
    const sp = Art.SPRITES[key];
    const cx = c.getContext("2d");
    cx.imageSmoothingEnabled = false;
    if (!sp) return c;
    const sw = sp.width || sp.naturalWidth;
    const sh = sp.height || sp.naturalHeight;
    const scale = Math.min(boxW / sw, boxH / sh);
    const w = Math.round(sw * scale);
    const h = Math.round(sh * scale);
    cx.drawImage(sp, Math.round((boxW - w) / 2), boxH - h, w, h);
    return c;
  };

  // onBack: where "back" goes, when the studio was opened from the Level Maker
  const showArtStudio = (startKey, onBack) => {
    clear();

    const mine = Art.customBlocks();
    const mineBy = Object.fromEntries(mine.map((b) => [b.key, b]));
    const madeHere = mine.filter((b) => !b.shipped).length;
    const info = Art.SPRITE_INFO.concat(mine);
    const reopen = (k) => showArtStudio(k, onBack);
    let key = info.some((s) => s.key === startKey) ? startKey : info[0].key;
    let img = Art.getPixels(key);
    let color = "#e5401f";
    let tool = "pen"; // pen | fill | erase | pick
    let undoStack = [];

    const header = el("div", "row");
    header.appendChild(el("h1", null, "Art Studio"));
    header.appendChild(el("div", "spacer"));
    const backBtn = el("button", "small", onBack ? "← Back to my level" : "← Levels");
    backBtn.onclick = onBack || showMenu;
    header.appendChild(backBtn);
    root.appendChild(header);
    root.appendChild(el("p", "sub",
      "Repaint the blocks and the player. It saves itself in this browser — " +
      "use Art pack tools at the bottom to make it stick for everyone."));

    // ---- which sprite are we painting? ----
    const pickPanel = el("div", "panel");
    pickPanel.appendChild(el("h2", null, "Pick something to paint"));
    const pickGrid = el("div", "palette");
    const pickItems = {};
    info.forEach(({ key: k, label }) => {
      const item = el("div", "pal-item");
      const holder = el("div");
      item.appendChild(holder);
      const lbl = el("div", "lbl");
      item.appendChild(lbl);
      item.onclick = () => selectSprite(k);
      pickItems[k] = { item, holder, lbl, label };
      pickGrid.appendChild(item);
    });
    pickPanel.appendChild(pickGrid);

    // ---- inventing a new block ----
    const newRow = el("div", "row");
    newRow.style.marginTop = "8px";
    const newBtn = el("button", "green small", "＋ New block");
    newRow.append(newBtn, el("span", "hint",
      madeHere >= Art.MAX_CUSTOM
        ? `You've made ${Art.MAX_CUSTOM} blocks of your own, which is the most there's room for. Delete one to make another.`
        : "Make your own block: name it, pick something to start from, then paint it. It acts just like " +
          "the thing you started from. Find it under <b>More blocks</b> in the Level Maker."));
    pickPanel.appendChild(newRow);

    const newForm = el("div");
    newForm.style.display = "none";
    newForm.style.marginTop = "8px";
    const newName = el("input");
    newName.type = "text";
    newName.maxLength = 20;
    newName.placeholder = "Name your block";
    const nameRow2 = el("div", "row");
    nameRow2.append(el("span", "hint", "1. Name:"), newName);
    newForm.appendChild(nameRow2);
    const lookHint = el("p", "hint", "2. Pick what to start from. Your block will look like it to begin with, and act like it for good:");
    lookHint.style.margin = "8px 0 4px";
    newForm.appendChild(lookHint);
    const lookGrid = el("div", "palette");
    let from = "s";
    const lookItems = {};
    const actsLike = el("p", "hint", "");
    actsLike.style.margin = "8px 0 0";
    const showActs = () => {
      const base = from === "blank" ? "s" : mineBy[from] ? mineBy[from].base : from;
      actsLike.innerHTML = base === "player"
        ? "It will be a new <b>player look</b>. Pick it with Player look in the Level Maker."
        : PET_SOUND[base] ? "It will be a new <b>pet</b>. Buy it in the 🐾 Pet shop."
        : `It will act like <b>${typeName(base)}</b>.`;
    };
    // not megas: a homemade block acts like its starting block, and the
    // rules only know megas by their own letters
    Art.SPRITE_INFO.filter((s) => s.key === "player" || s.key === "dirt" || PET_SOUND[s.key] ||
      (TILES[s.key] && !TILES[s.key].over && !MEGA_BASE[s.key]))
      .map((s) => [s.key, s.label])
      .concat(mine.map((b) => [b.key, b.label]), [["blank", "Blank"]])
      .forEach(([k, label]) => {
        const item = el("div", "pal-item" + (k === from ? " sel" : ""));
        let thumb = spriteThumb(k, 32, 32);
        if (k === "blank") {
          thumb.getContext("2d").fillStyle = "#8a8a8a";
          thumb.getContext("2d").fillRect(0, 0, 32, 32);
        }
        item.append(thumb, el("div", "lbl", label));
        item.onclick = () => {
          from = k;
          Object.entries(lookItems).forEach(([lk, n]) => n.classList.toggle("sel", lk === k));
          showActs();
        };
        lookItems[k] = item;
        lookGrid.appendChild(item);
      });
    newForm.appendChild(lookGrid);
    newForm.appendChild(actsLike);
    showActs();
    const makeRow = el("div", "row");
    makeRow.style.marginTop = "8px";
    const makeBlockBtn = el("button", "green small", "3. Make it!");
    makeBlockBtn.onclick = () => {
      if (!newName.value.trim()) { toast("Give it a name first"); newName.focus(); return; }
      const made = Art.addBlock(newName.value, from);
      if (!made) { toast("Couldn't make the block"); return; }
      reopen(made);
      toast("Made! Now paint it");
    };
    const cancelBtn = el("button", "small", "Cancel");
    cancelBtn.onclick = () => { newForm.style.display = "none"; };
    makeRow.append(makeBlockBtn, cancelBtn);
    newForm.appendChild(makeRow);
    pickPanel.appendChild(newForm);
    newBtn.disabled = madeHere >= Art.MAX_CUSTOM;
    newBtn.onclick = () => { newForm.style.display = ""; newName.focus(); };
    root.appendChild(pickPanel);

    const refreshThumbs = () => {
      info.forEach(({ key: k }) => {
        const { item, holder, lbl, label } = pickItems[k];
        holder.innerHTML = "";
        holder.appendChild(spriteThumb(k, 32, 32));
        lbl.textContent = Art.isCustom(k) && !isMine(k) ? label + " ✎" : label;
        item.classList.toggle("sel", k === key);
      });
    };

    // ---- the paint grid ----
    const gridPanel = el("div", "panel");
    const title = el("h2", null, "");
    gridPanel.appendChild(title);
    const wrap = el("div", "art-wrap");
    const canvas = el("canvas");
    canvas.id = "art-canvas";
    const ctx = canvas.getContext("2d");
    wrap.appendChild(canvas);
    gridPanel.appendChild(wrap);

    const tools = el("div", "row tight");
    tools.style.marginTop = "8px";

    const toolBtns = {};
    const addTool = (id, label) => {
      const b = el("button", "small tool-btn", label);
      b.onclick = () => {
        tool = id;
        Object.entries(toolBtns).forEach(([t, n]) => n.classList.toggle("sel", t === tool));
      };
      toolBtns[id] = b;
      tools.appendChild(b);
    };
    addTool("pen", "✏ Paint");
    addTool("fill", "🪣 Fill");
    addTool("erase", "🧽 Rub out");
    addTool("pick", "💧 Grab colour");
    toolBtns.pen.classList.add("sel");

    const undoBtn = el("button", "small", "↶ Undo");
    undoBtn.onclick = () => {
      const prev = undoStack.pop();
      if (!prev) { toast("Nothing to undo"); return; }
      img.px = prev;
      commit();
    };
    const resetBtn = el("button", "small", "↺ Original");
    // A block made in this browser has no original to go back to; it can be deleted instead.
    // One that ships with the game works like any built-in block: repaint or reset, never delete.
    const deleteBtn = el("button", "danger small", "🗑 Delete this block");
    deleteBtn.onclick = () => {
      if (!confirm(`Delete your block "${pickItems[key].label}"? ` +
        "Levels that use it will show plain stone there instead.")) return;
      Art.removeBlock(key);
      reopen();
      toast("Block deleted");
    };
    resetBtn.onclick = () => {
      if (!confirm(`Put ${pickItems[key].label} back the way it was?`)) return;
      Art.resetSprite(key);
      undoStack = [];
      img = Art.getPixels(key);
      render();
      refreshThumbs();
      renderPreview();
      toast("Back to the original");
    };
    tools.append(undoBtn, resetBtn, deleteBtn);
    gridPanel.appendChild(tools);
    gridPanel.appendChild(el("p", "hint",
      "Tap or drag on the big grid to paint. <b>🪣 Fill</b> floods everything the " +
      "same colour that's touching, <b>🧽 Rub out</b> makes pixels see-through, and " +
      "<b>💧 Grab colour</b> picks a colour up off the picture."));
    root.appendChild(gridPanel);

    // ---- colours ----
    const colPanel = el("div", "panel");
    colPanel.appendChild(el("h2", null, "Colours"));
    const colRow = el("div", "row");
    const chip = el("input");
    chip.type = "color";
    chip.className = "color-chip";
    chip.value = color;
    chip.oninput = () => { setColor(chip.value, true); };
    colRow.appendChild(chip);
    const colLabel = el("span", "hint");
    colRow.appendChild(colLabel);
    colPanel.appendChild(colRow);

    const swatchWrap = el("div", "swatches");
    swatchWrap.style.marginTop = "8px";
    const swatches = [];
    ART_COLORS.forEach((hex) => {
      const sw = el("div", "swatch");
      sw.style.background = hex;
      sw.title = hex;
      sw.onclick = () => setColor(hex, false);
      swatches.push({ hex, node: sw });
      swatchWrap.appendChild(sw);
    });
    colPanel.appendChild(swatchWrap);
    colPanel.appendChild(el("p", "hint",
      "Tap a colour, or use the box on the left to mix your own."));
    root.appendChild(colPanel);

    const setColor = (hex, fromChip) => {
      color = hex.toLowerCase();
      if (!fromChip) chip.value = color;
      colLabel.textContent = color;
      swatches.forEach(({ hex: h, node }) => node.classList.toggle("sel", h === color));
      if (tool === "erase" || tool === "pick") toolBtns.pen.onclick();
    };

    // ---- preview at game size ----
    const prevPanel = el("div", "panel");
    prevPanel.appendChild(el("h2", null, "In the game"));
    const preview = el("div", "art-preview");
    prevPanel.appendChild(preview);
    root.appendChild(prevPanel);

    const renderPreview = () => {
      preview.innerHTML = "";
      [24, 40, 72].forEach((size) => {
        const sp = Art.SPRITES[key];
        const sw = sp.width || sp.naturalWidth;
        const sh = sp.height || sp.naturalHeight;
        const c = el("canvas");
        c.width = size;
        c.height = Math.round((size * sh) / sw);
        const cx = c.getContext("2d");
        cx.imageSmoothingEnabled = false;
        cx.drawImage(sp, 0, 0, c.width, c.height);
        preview.appendChild(c);
      });
    };

    // ---- saving, sharing, starting over ----
    const filePanel = el("details", "panel");
    const sum = el("summary", null, "Art pack tools");
    sum.style.cursor = "pointer";
    sum.style.letterSpacing = "1px";
    sum.style.textTransform = "uppercase";
    filePanel.appendChild(sum);
    filePanel.appendChild(el("p", "hint",
      "Your art is already saved in this browser. <b>Download art</b> saves it " +
      "as <code>blockdash-art.json</code>: a backup you can load on another " +
      "device, or the file to send in to make your art the game's official art."));

    const fileRow = el("div", "row");
    fileRow.style.marginTop = "8px";

    const dlJson = el("button", "small", "⬇ Download art (.json)");
    dlJson.onclick = () => {
      const art = Art.customArt();
      if (!Object.keys(art).length) { toast("Nothing painted yet"); return; }
      download("blockdash-art.json", artJson(art) + "\n");
      toast("Saved blockdash-art.json");
    };

    const fileInput = el("input");
    fileInput.type = "file";
    fileInput.accept = ".json,.js,application/json,text/javascript";
    fileInput.style.display = "none";
    fileInput.onchange = async () => {
      const f = fileInput.files[0];
      fileInput.value = "";
      if (!f) return;
      try {
        const loaded = Art.applyPack(parseArtFile(await f.text()), true);
        if (!loaded.length) { toast("No art in that file"); return; }
        reopen(key);
        toast(`Loaded ${loaded.length} sprite${loaded.length === 1 ? "" : "s"}`);
      } catch (e) {
        toast("Couldn't read that file");
      }
    };
    const loadBtn = el("button", "small", "⬆ Load art file");
    loadBtn.onclick = () => fileInput.click();

    const resetAllBtn = el("button", "danger small", "Reset ALL art");
    resetAllBtn.onclick = () => {
      if (!confirm("Throw away every painting and go back to the original art? (Blocks you made yourself stay.)")) return;
      Art.resetAllSprites();
      undoStack = [];
      img = Art.getPixels(key);
      render();
      refreshThumbs();
      renderPreview();
      toast("All art reset");
    };

    fileRow.append(dlJson, loadBtn, resetAllBtn, fileInput);
    filePanel.appendChild(fileRow);
    root.appendChild(filePanel);

    // ---- art codes: share a texture pack as text ----
    const codePanel = el("div", "panel");
    codePanel.appendChild(el("h2", null, "Art code"));
    codePanel.appendChild(el("p", "hint",
      "<b>Make code</b> turns everything you've painted into a code someone else " +
      "can paste here and press <b>Use code</b>."));
    const codeTa = el("textarea");
    codeTa.placeholder = "paste an art code here…";
    codePanel.appendChild(codeTa);
    const codeRow = el("div", "row");
    codeRow.style.marginTop = "8px";
    const makeBtn = el("button", "green small", "⧉ Make code");
    makeBtn.onclick = async () => {
      const art = Art.customArt();
      if (!Object.keys(art).length) { toast("Nothing painted yet"); return; }
      codeTa.value = await encodeArt(art);
      codeTa.select();
      try {
        await navigator.clipboard.writeText(codeTa.value);
        toast("Code copied!");
      } catch (e) {
        toast("Select the code and copy it");
      }
    };
    const useBtn = el("button", "small", "Use code");
    useBtn.onclick = async () => {
      try {
        const loaded = Art.applyPack(await decodeArt(codeTa.value), true);
        if (!loaded.length) { toast("No art in that code"); return; }
        reopen(key);
        toast(`Loaded ${loaded.length} drawing${loaded.length === 1 ? "" : "s"}`);
      } catch (e) {
        toast("That code didn't work");
      }
    };
    codeRow.append(makeBtn, useBtn);
    codePanel.appendChild(codeRow);
    root.appendChild(codePanel);

    // ---- painting ----

    const pushUndo = () => {
      undoStack.push(img.px.slice());
      if (undoStack.length > 80) undoStack.shift();
    };

    // Save straight away — a kid shouldn't have to remember a save button.
    const commit = () => {
      if (!Art.setPixels(key, img)) toast("Could not save (storage full?)");
      render();
      refreshThumbs();
      renderPreview();
    };

    const setPx = (x, y) => {
      if (x < 0 || y < 0 || x >= img.w || y >= img.h) return false;
      const i = y * img.w + x;
      const want = tool === "erase" ? null : color;
      if (img.px[i] === want) return false;
      img.px[i] = want;
      return true;
    };

    const floodFill = (x, y) => {
      if (x < 0 || y < 0 || x >= img.w || y >= img.h) return;
      const target = img.px[y * img.w + x];
      const want = tool === "erase" ? null : color;
      if (target === want) return;
      pushUndo();
      const stack = [[x, y]];
      while (stack.length) {
        const [cx, cy] = stack.pop();
        if (cx < 0 || cy < 0 || cx >= img.w || cy >= img.h) continue;
        const i = cy * img.w + cx;
        if (img.px[i] !== target) continue;
        img.px[i] = want;
        stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
      }
      commit();
    };

    let painting = false;
    let lastCell = null;

    // The canvas is sized to whatever space it has, so work the cell out from
    // the rendered box rather than a fixed pixel size.
    const cellFrom = (e) => {
      const r = canvas.getBoundingClientRect();
      return {
        x: Math.floor(((e.clientX - r.left) / r.width) * img.w),
        y: Math.floor(((e.clientY - r.top) / r.height) * img.h),
      };
    };

    canvas.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      const c = cellFrom(e);
      if (tool === "pick") {
        if (c.x < 0 || c.y < 0 || c.x >= img.w || c.y >= img.h) return;
        const hex = img.px[c.y * img.w + c.x];
        if (!hex) { toast("That bit is see-through"); return; }
        setColor(hex, false);
        return;
      }
      if (tool === "fill") { floodFill(c.x, c.y); return; }
      painting = true;
      pushUndo();
      lastCell = c;
      if (setPx(c.x, c.y)) render();
      if (canvas.setPointerCapture) canvas.setPointerCapture(e.pointerId);
    });

    canvas.addEventListener("pointermove", (e) => {
      if (!painting) return;
      const c = cellFrom(e);
      if (lastCell && c.x === lastCell.x && c.y === lastCell.y) return;
      // Fill in the cells a fast drag skipped over, or strokes come out dotty.
      let changed = false;
      if (lastCell) {
        const steps = Math.max(Math.abs(c.x - lastCell.x), Math.abs(c.y - lastCell.y));
        for (let i = 1; i < steps; i++) {
          changed = setPx(
            Math.round(lastCell.x + ((c.x - lastCell.x) * i) / steps),
            Math.round(lastCell.y + ((c.y - lastCell.y) * i) / steps),
          ) || changed;
        }
      }
      lastCell = c;
      if (setPx(c.x, c.y) || changed) render();
    });

    const endPaint = () => {
      if (!painting) return;
      painting = false;
      lastCell = null;
      commit();
    };
    canvas.addEventListener("pointerup", endPaint);
    canvas.addEventListener("pointercancel", endPaint);
    canvas.addEventListener("contextmenu", (e) => e.preventDefault());

    // ---- drawing the paint grid ----

    const render = () => {
      // one canvas pixel per screen pixel, as big as fits without scrolling
      const availW = Math.max(120, wrap.clientWidth - 12);
      const availH = clamp(window.innerHeight * 0.62, 200, 520);
      const z = clamp(Math.min(Math.floor(availW / img.w), Math.floor(availH / img.h)), 6, 30);
      if (canvas.width !== img.w * z) {
        canvas.width = img.w * z;
        canvas.height = img.h * z;
      }

      // checkerboard behind see-through pixels
      for (let y = 0; y < img.h; y++) {
        for (let x = 0; x < img.w; x++) {
          ctx.fillStyle = (x + y) % 2 ? "#23232c" : "#2e2e3a";
          ctx.fillRect(x * z, y * z, z, z);
        }
      }

      for (let y = 0; y < img.h; y++) {
        for (let x = 0; x < img.w; x++) {
          const hex = img.px[y * img.w + x];
          if (!hex) continue;
          ctx.fillStyle = hex;
          ctx.fillRect(x * z, y * z, z, z);
        }
      }

      ctx.lineWidth = 1;
      for (let x = 0; x <= img.w; x++) {
        ctx.strokeStyle = x % 4 ? "rgba(0,0,0,0.25)" : "rgba(255,255,255,0.22)";
        ctx.beginPath();
        ctx.moveTo(x * z + 0.5, 0);
        ctx.lineTo(x * z + 0.5, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y <= img.h; y++) {
        ctx.strokeStyle = y % 4 ? "rgba(0,0,0,0.25)" : "rgba(255,255,255,0.22)";
        ctx.beginPath();
        ctx.moveTo(0, y * z + 0.5);
        ctx.lineTo(canvas.width, y * z + 0.5);
        ctx.stroke();
      }
    };

    const selectSprite = (k) => {
      key = k;
      img = Art.getPixels(key);
      undoStack = [];
      const own = mineBy[k];
      title.textContent = `${pickItems[k].label} — ${img.w} × ${img.h}` +
        (own ? (own.base === "player" ? " — a player look" : PET_SOUND[own.base] ? " — a pet" : ` — acts like ${typeName(own.base)}`) : "");
      resetBtn.style.display = own && !own.shipped ? "none" : "";
      deleteBtn.style.display = own && !own.shipped ? "" : "none";
      render();
      refreshThumbs();
      renderPreview();
    };

    const onResize = () => render();
    window.addEventListener("resize", onResize);
    // drop the listener once this screen is replaced
    const observer = new MutationObserver(() => {
      if (!document.body.contains(canvas)) {
        window.removeEventListener("resize", onResize);
        observer.disconnect();
      }
    });
    observer.observe(root, { childList: true });

    setColor(color, false);
    selectSprite(key);
  };

  // ---------- screen: editor ----------

  const showEditor = (existing, index) => {
    clear();

    let grid = existing ? rowsToGrid(existing.rows) : newGrid(48);
    let name = existing ? existing.name : "My Level " + (loadLevels().length + 1);
    let bg = existing ? bgOf(existing) : "overworld";
    // Never pruned while editing, so Undo brings a block back with its note;
    // cleanNotes drops the leftovers whenever the level is saved or tested.
    const notes = existing ? cleanNotes(existing.rows, existing.notes) : {};
    // `grid` is whichever of the level and its boss arena is on screen, and
    // `other` is the one that isn't; switching just swaps them over.
    let editing = "level";
    // null = "same as the level", so changing the level's background carries
    // over until the arena is given one of its own
    let arenaBg = existing && arenaBgOf(existing) !== bg ? existing.arenaBg : null;
    let hero = existing && isMine(existing.hero) ? existing.hero : null;
    let music = musicOf(existing);
    window.BDMusic.level(music); // so you hear the level's song while building it
    const shownBg = () => (editing === "arena" ? arenaBg || bg : bg);
    let other = arenaGrid(existing && existing.arena, arenaBg || bg);
    let arenaDrawn = !!(existing && existing.arena); // until it's opened, the level uses the default arena
    const levelG = () => (editing === "level" ? grid : other);
    const arenaG = () => (editing === "arena" ? grid : other);
    const arenaRows = () => (arenaDrawn ? gridToRows(arenaG()) : undefined);
    let stopSecs = STOP_DEFAULT;
    let dialogText = "";
    let slot = index;
    let sel = "g";
    let mode = "draw"; // draw | pan
    const undoStack = [];

    const TS = 36; // editor block size in px

    const header = el("div", "row");
    header.appendChild(el("h1", null, "Level Maker"));
    header.appendChild(el("div", "spacer"));
    const backBtn = el("button", "small", "← Levels");
    backBtn.onclick = () => showMenu();
    header.appendChild(backBtn);
    root.appendChild(header);

    // name + save row
    const namePanel = el("div", "panel");
    const nameRow = el("div", "row");
    const nameInput = el("input");
    nameInput.type = "text";
    nameInput.value = name;
    nameInput.placeholder = "Level name";
    // Saves on every change, so a kid never loses work to a forgotten button.
    // A new level (or a copy) only gets a slot in My levels once it's changed.
    const savedLabel = el("span", "hint", slot >= 0 ? "✓ Saved" : "");
    const autosave = () => {
      const all = loadLevels();
      const lvl = levelData({ name: (name || "").trim() || "Untitled", rows: gridToRows(levelG()), bg, notes,
        arena: arenaRows(), arenaBg, hero, music });
      if (slot >= 0 && slot < all.length) all[slot] = lvl;
      else { all.push(lvl); slot = all.length - 1; }
      savedLabel.textContent = saveLevels(all) ? "✓ Saved" : "⚠ Not saved";
      window.BDBadges.earn("builder");
    };
    nameInput.oninput = () => { name = nameInput.value; autosave(); };
    const testBtn = el("button", "", "▶ Test");
    testBtn.onclick = () => {
      const lvl = { name: (nameInput.value || "Untitled").trim(), rows: gridToRows(levelG()), bg,
        notes: cleanNotes(levelG(), notes), arena: arenaRows(), arenaBg, hero, music };
      showPlay(lvl, () => showEditor(lvl, slot), true);
    };
    nameRow.append(nameInput, testBtn, savedLabel);
    namePanel.appendChild(nameRow);
    const bgRow = el("div", "row");
    bgRow.style.marginTop = "8px";
    bgRow.appendChild(el("span", "hint", "Background:"));
    const bgBtns = Art.BACKGROUNDS.map((b) => {
      const btn = el("button", "small", b.label);
      btn.onclick = () => {
        // a mega background has to be bought in the shop before it can be picked
        if (b.mega && !loadBag().bgs.includes(b.key) && b.key !== shownBg()) {
          toast(`Buy ${b.label.replace("✨ ", "")} in the Shop: ${MEGA_COST} megacoins`);
          return;
        }
        // the buttons set the background of whichever one is being edited
        if (editing === "arena") arenaBg = b.key;
        else bg = b.key;
        showBg();
        autosave();
        render();
      };
      btn.classList.toggle("green", b.key === bg);
      return btn;
    });
    const showBg = () =>
      bgBtns.forEach((x, i) => x.classList.toggle("green", Art.BACKGROUNDS[i].key === shownBg()));
    // locked mega backgrounds look locked
    const ownedBgs = loadBag().bgs;
    Art.BACKGROUNDS.forEach((b, i) => {
      if (b.mega && !ownedBgs.includes(b.key)) bgBtns[i].textContent = "🔒 " + b.label.replace("✨ ", "");
    });
    bgRow.append(...bgBtns);
    namePanel.appendChild(bgRow);

    // which player this level uses: the usual one, or a look made in the Art Studio
    const heroRow = el("div", "row");
    heroRow.style.marginTop = "8px";
    heroRow.appendChild(el("span", "hint", "Player look:"));
    const heroItems = [[null, "Usual"]]
      .concat(Art.customBlocks().filter((b) => b.base === "player").map((b) => [b.key, b.label]))
      .map(([k, label]) => {
        const item = el("div", "pal-item");
        item.style.minWidth = "62px";
        item.append(spriteThumb(k || "player", 32, 32), el("div", "lbl", label));
        item.onclick = () => { hero = k; showHero(); autosave(); };
        heroRow.appendChild(item);
        return [k, item];
      });
    const showHero = () => heroItems.forEach(([k, item]) => item.classList.toggle("sel", k === hero));
    // a look this browser has no art for stays saved on the level, but shows as the usual player
    if (!heroItems.some(([k]) => k === hero)) heroItems[0][1].classList.add("sel");
    else showHero();
    const heroNew = el("button", "small", "🎨 New look");
    heroNew.onclick = () => toStudio(hero || "player");
    heroRow.appendChild(heroNew);
    namePanel.appendChild(heroRow);

    // the level's own song; "Player's choice" plays whatever the player picked
    const musicRow = el("div", "row");
    musicRow.style.marginTop = "8px";
    musicRow.appendChild(el("span", "hint", "Music:"));
    const musicBtns = [[null, "Player's choice"]]
      .concat(Object.entries(window.BDMusic.SONGS)
        .filter(([k, sg]) => !sg.secret || window.BDBadges.has("master") || k === music)
        .map(([k, sg]) => [k, `${sg.icon} ${sg.name}`]))
      .map(([k, label]) => {
        const btn = el("button", "small" + (k === music ? " green" : ""), label);
        btn.onclick = () => {
          music = k;
          musicBtns.forEach(([mk, b]) => b.classList.toggle("green", mk === music));
          window.BDMusic.level(music);
          autosave();
        };
        musicRow.appendChild(btn);
        return [k, btn];
      });
    namePanel.appendChild(musicRow);

    // level <-> boss arena
    const editRow = el("div", "row");
    editRow.style.marginTop = "8px";
    editRow.appendChild(el("span", "hint", "Editing:"));
    const levelTab = el("button", "small green", "🗺 Level");
    const arenaTab = el("button", "small", "💥 Boss arena");
    const editHint = el("span", "hint", "");
    const setEditing = (m) => {
      if (m === editing) return;
      [grid, other] = [other, grid];
      editing = m;
      if (m === "arena") arenaDrawn = true;
      undoStack.length = 0; // undo steps belong to the grid they were made on
      levelTab.classList.toggle("green", m === "level");
      arenaTab.classList.toggle("green", m === "arena");
      showBg();
      refreshPalette();
      autosave();
      wrap.scrollLeft = 0;
      render();
    };
    levelTab.onclick = () => setEditing("level");
    arenaTab.onclick = () => setEditing("arena");
    editRow.append(levelTab, arenaTab, editHint);
    namePanel.appendChild(editRow);
    root.appendChild(namePanel);

    // palette
    const palPanel = el("div", "panel");
    palPanel.appendChild(el("h2", null, "Blocks"));
    const pal = el("div", "palette");
    const palItems = {};
    // The player's own blocks share one palette button, so the palette stays
    // the same size however many they make; a tray under it picks which one.
    const hiddenNow = () => (editing === "arena" ? LEVEL_ONLY : ARENA_ONLY);
    // player looks aren't blocks; they're picked with Player look above
    const myBlocks = Art.customBlocks().filter((b) => b.base !== "player" && !PET_SOUND[b.base])
      .map((b) => ({ key: b.key, label: b.label, base: baseOf(b.key) }));
    let myLast = myBlocks.length ? myBlocks[0].key : null;
    let trayOpen = false;
    const tray = el("div", "palette");
    tray.style.marginTop = "8px";
    tray.style.paddingTop = "8px";
    tray.style.borderTop = "3px solid #2a2a35";
    const toStudio = (k) => {
      // every change is already saved, so it's safe to leave and come back
      const s = slot;
      showArtStudio(k, () => (s >= 0 ? showEditor(loadLevels()[s], s) : showEditor(null, -1)));
    };
    const drawMine = () => {
      const cx = palItems[MINE].firstChild.getContext("2d");
      cx.clearRect(0, 0, 32, 32);
      if (myLast) drawTile(cx, myLast, 0, 0, 32, 0, false);
      else {
        cx.fillStyle = "#8a8a8a";
        cx.font = "bold 26px sans-serif";
        cx.textAlign = "center";
        cx.fillText("+", 16, 25);
      }
    };
    const showTray = () => {
      tray.innerHTML = "";
      tray.style.display = trayOpen ? "" : "none";
      if (!trayOpen) return;
      if (trayOpen === MEGA_PICK) {
        // a mega block has to be bought in the shop before it can be placed
        const owned = loadBag().unlocked;
        MEGA_LIST.forEach((k) => {
          if (hiddenNow().includes(baseOf(k))) return;
          const locked = !owned.includes(k);
          const item = el("div", "pal-item" + (k === sel ? " sel" : ""));
          const c = el("canvas");
          c.width = c.height = 32;
          drawTile(c.getContext("2d"), k, 0, 0, 32, 0, false);
          if (locked) c.style.opacity = "0.35";
          item.append(c, el("div", "lbl", (locked ? "🔒 " : "") + TILES[k].name));
          item.onclick = () => {
            if (locked) { toast(`Buy ${TILES[k].name} in the Shop: ${MEGA_COST} megacoins`); return; }
            sel = k;
            Object.values(palItems).forEach((n) => n.classList.remove("sel"));
            palItems[MEGA_PICK].classList.add("sel");
            showTray();
            showOpts();
          };
          tray.appendChild(item);
        });
        return;
      }
      myBlocks.forEach(({ key: k, label, base }) => {
        if (hiddenNow().includes(base)) return;
        const item = el("div", "pal-item" + (k === sel ? " sel" : ""));
        // the small print says what it acts like, so a bouncy block and a solid one can't be mixed up
        const kind = el("div", "lbl", typeName(base));
        kind.style.opacity = "0.6";
        item.append(spriteThumb(k, 32, 32), el("div", "lbl", label), kind);
        item.onclick = () => { sel = k; myLast = k; drawMine(); showTray(); showOpts(); };
        tray.appendChild(item);
      });
      const add = el("div", "pal-item");
      const plus = el("div", null, myBlocks.length ? "🎨" : "＋");
      plus.style.cssText = "height:32px;line-height:32px;font-size:22px;margin-bottom:3px";
      add.append(plus, el("div", "lbl", myBlocks.length ? "New / paint" : "Make a block"));
      add.title = "Make your own block in the Art Studio, or repaint the one picked here";
      add.onclick = () => toStudio(isMine(sel) ? sel : undefined);
      tray.appendChild(add);
    };
    PALETTE.forEach((ch) => {
      const item = el("div", "pal-item" + (ch === sel ? " sel" : ""));
      const c = el("canvas");
      c.width = c.height = 32;
      const cx = c.getContext("2d");
      if (ch === ERASER) drawEraser(cx, 0, 0, 32);
      else if (ch === MEGA_PICK) drawTile(cx, megaOf("s"), 0, 0, 32, 0, false);
      else if (ch !== MINE) drawTile(cx, ch, 0, 0, 32, 0, false);
      item.appendChild(c);
      item.appendChild(el("div", "lbl", ch === ERASER ? "Erase" : ch === MINE ? "More blocks ▾"
        : ch === MEGA_PICK ? "Mega blocks ▾" : TILES[ch].name));
      item.onclick = () => {
        if (ch === MEGA_PICK) {
          // opening the mega tray keeps the block you had; pick one inside it
          trayOpen = MEGA_PICK;
          showTray();
          return;
        }
        // with no blocks made yet there is nothing to draw with: keep the old block picked
        if (ch !== MINE) sel = ch;
        else if (myLast) sel = myLast;
        trayOpen = ch === MINE ? MINE : false;
        if (ch !== MINE || myLast) {
          Object.values(palItems).forEach((n) => n.classList.remove("sel"));
          item.classList.add("sel");
        }
        showTray();
        showOpts();
      };
      palItems[ch] = item;
      pal.appendChild(item);
    });
    drawMine();
    palPanel.appendChild(pal);
    palPanel.appendChild(tray);
    showTray();

    // settings for the blocks that carry one: Stop (seconds) and Dialog (words)
    const optRow = el("div", "row");
    optRow.style.marginTop = "8px";
    const stopInput = el("input");
    stopInput.type = "number";
    stopInput.min = "0.5";
    stopInput.max = "30";
    stopInput.step = "0.5";
    stopInput.value = String(stopSecs);
    stopInput.style.width = "5em";
    stopInput.oninput = () => { stopSecs = clamp(parseFloat(stopInput.value) || STOP_DEFAULT, 0.5, 30); };
    const dialogInput = el("input");
    dialogInput.type = "text";
    dialogInput.maxLength = 200;
    dialogInput.placeholder = "What should it say?";
    dialogInput.style.flex = "1";
    dialogInput.oninput = () => { dialogText = dialogInput.value; };
    const showOpts = () => {
      optRow.innerHTML = "";
      const kind = baseOf(sel);
      optRow.style.display = kind === "O" || kind === "K" ? "" : "none";
      if (kind === "O") {
        optRow.append(el("span", "hint", "Stop for"), stopInput,
          el("span", "hint", "seconds. Set this, then tap the grid. Tap a Stop block again to change it."));
      } else if (kind === "K") {
        optRow.append(el("span", "hint", "Says:"), dialogInput,
          el("span", "hint", "Type, then tap the grid."));
      }
    };
    showOpts();
    palPanel.appendChild(optRow);

    // show only the blocks that make sense for what's being edited
    const refreshPalette = () => {
      const hide = hiddenNow();
      for (const [ch, item] of Object.entries(palItems)) item.style.display = hide.includes(ch) ? "none" : "";
      if (hide.includes(baseOf(sel))) palItems.g.onclick();
      else showTray();
      editHint.textContent = editing === "arena"
        ? "This is where the boss fight happens (reached through a Boss portal). The faded boss shows where it stands. " +
          "Boss platforms only appear during CLIMB UP; everything else is always there. " +
          "The Background buttons above now change the arena's background, not the level's."
        : "";
    };
    refreshPalette();
    root.appendChild(palPanel);

    // canvas
    const gridPanel = el("div", "panel");
    const wrap = el("div", "grid-wrap");
    const canvas = el("canvas");
    canvas.id = "editor-canvas";
    canvas.className = "draw-mode";
    const ctx = canvas.getContext("2d");
    wrap.appendChild(canvas);
    gridPanel.appendChild(wrap);

    // tools under the canvas
    const tools = el("div", "row tight");
    tools.style.marginTop = "8px";

    const modeBtn = el("button", "small", "✏ Draw");
    modeBtn.onclick = () => {
      mode = mode === "draw" ? "pan" : "draw";
      modeBtn.textContent = mode === "draw" ? "✏ Draw" : "✋ Scroll";
      canvas.classList.toggle("draw-mode", mode === "draw");
    };

    const undoBtn = el("button", "small", "↶ Undo");
    undoBtn.onclick = () => {
      const prev = undoStack.pop();
      if (!prev) { toast("Nothing to undo"); return; }
      grid = prev;
      autosave();
      render();
    };

    const leftBtn = el("button", "small", "◀");
    leftBtn.onclick = () => { wrap.scrollLeft -= TS * 8; };
    const rightBtn = el("button", "small", "▶");
    rightBtn.onclick = () => { wrap.scrollLeft += TS * 8; };

    const floorBtn = el("button", "small", "Fill floor");
    floorBtn.onclick = () => {
      pushUndo();
      for (let x = 0; x < grid[0].length; x++) grid[H - 1][x] = "g";
      autosave();
      render();
    };

    const shorterBtn = el("button", "small", "− Shorter");
    shorterBtn.onclick = () => setWidth(grid[0].length - 10);
    const longerBtn = el("button", "small", "+ Longer");
    longerBtn.onclick = () => setWidth(grid[0].length + 10);

    const clearBtn = el("button", "danger small", "Clear all");
    clearBtn.onclick = () => {
      if (!confirm("Erase the whole level?")) return;
      pushUndo();
      const w = grid[0].length;
      grid = Array.from({ length: H }, () => Array(w).fill(AIR));
      grid[H - 2][2] = "P";
      autosave();
      render();
    };

    const lenLabel = el("span", "hint");

    tools.append(modeBtn, undoBtn, leftBtn, rightBtn, floorBtn,
      shorterBtn, longerBtn, clearBtn, lenLabel);
    gridPanel.appendChild(tools);
    gridPanel.appendChild(
      el("p", "hint",
        "Tap or drag on the grid to place the selected block. " +
        "Switch to <b>✋ Scroll</b> if you want to swipe along the level instead of drawing. " +
        "Every level needs a <b>Start</b> block and an <b>End</b> portal.")
    );
    root.appendChild(gridPanel);

    const pushUndo = () => {
      undoStack.push(grid.map((r) => r.slice()));
      if (undoStack.length > 60) undoStack.shift();
    };

    const setWidth = (w) => {
      if (editing === "arena") { toast("The boss arena is always one screen wide"); return; }
      w = clamp(w, 20, 400);
      if (w === grid[0].length) return;
      pushUndo();
      grid = resizeGrid(grid, w);
      autosave();
      render();
    };

    const setCell = (cx, cy) => {
      const w = grid[0].length;
      if (cx < 0 || cx >= w || cy < 0 || cy >= H) return false;
      let ch = sel === ERASER ? AIR : sel;
      const cur = grid[cy][cx];
      // Hidden TNT and an item stack into one trapped square, in either order.
      if (ch === "h" && overOf(cur)) return false;
      if (ch === "h" && TRAP_OVER[cur]) ch = TRAP_OVER[cur];
      else if (TRAP_OVER[ch] && isHiddenTnt(cur)) ch = TRAP_OVER[ch];
      const kind = baseOf(ch);
      const want = kind === "O" ? stopSecs : kind === "K" ? (dialogText.trim() || "Hello!") : undefined;
      // re-tapping a Stop or Dialog block with a new setting updates it
      if (cur === ch && (want === undefined || notes[noteKey(cx, cy)] === want)) return false;
      if (want !== undefined) notes[noteKey(cx, cy)] = want;
      if (kind === "P") {
        for (let y = 0; y < H; y++) {
          for (let x = 0; x < w; x++) if (baseOf(grid[y][x]) === "P") grid[y][x] = AIR;
        }
      }
      grid[cy][cx] = ch;
      autosave();
      return true;
    };

    const paint = (cx, cy) => {
      if (setCell(cx, cy)) render();
    };

    // pointer painting
    let painting = false;
    let lastCell = null;

    const cellFrom = (e) => {
      const rect = canvas.getBoundingClientRect();
      // Measure against the drawn size, not TS: the page may be scaled up on
      // big screens, so one block can cover more than TS screen pixels.
      return {
        x: Math.floor(((e.clientX - rect.left) / rect.width) * canvas.width / TS),
        y: Math.floor(((e.clientY - rect.top) / rect.height) * canvas.height / TS),
      };
    };

    canvas.addEventListener("pointerdown", (e) => {
      if (mode !== "draw") return;
      e.preventDefault();
      painting = true;
      pushUndo();
      const c = cellFrom(e);
      lastCell = c;
      paint(c.x, c.y);
      if (canvas.setPointerCapture) canvas.setPointerCapture(e.pointerId);
    });

    canvas.addEventListener("pointermove", (e) => {
      if (!painting || mode !== "draw") return;
      const c = cellFrom(e);
      if (lastCell && c.x === lastCell.x && c.y === lastCell.y) return;
      // Pointer events are sampled coarsely — fill in the cells the drag
      // skipped over, or fast swipes leave gaps.
      if (lastCell) {
        const steps = Math.max(Math.abs(c.x - lastCell.x), Math.abs(c.y - lastCell.y));
        for (let i = 1; i < steps; i++) {
          setCell(
            Math.round(lastCell.x + ((c.x - lastCell.x) * i) / steps),
            Math.round(lastCell.y + ((c.y - lastCell.y) * i) / steps),
          );
        }
      }
      lastCell = c;
      paint(c.x, c.y);
    });

    const endPaint = () => { painting = false; lastCell = null; };
    canvas.addEventListener("pointerup", endPaint);
    canvas.addEventListener("pointercancel", endPaint);
    canvas.addEventListener("contextmenu", (e) => e.preventDefault());

    let animT = 0;
    let raf = null;

    const render = () => {
      const w = grid[0].length;
      if (canvas.width !== w * TS) {
        canvas.width = w * TS;
        canvas.height = H * TS;
      }
      lenLabel.textContent = `${w} blocks · ${countDiamonds(grid)} 💎`;

      // the editor canvas is the whole level, so draw the backdrop once per screen-width
      const view = Math.min(canvas.width, 24 * TS);
      for (let x0 = 0; x0 < canvas.width; x0 += view) {
        ctx.save();
        ctx.translate(x0, 0);
        ctx.beginPath();
        ctx.rect(0, 0, view, canvas.height);
        ctx.clip();
        Art.drawBackground(ctx, shownBg(), view, canvas.height, 0, TS, 0, null);
        ctx.restore();
      }

      for (let y = 0; y < H; y++) {
        for (let x = 0; x < w; x++) {
          const ch = grid[y][x];
          if (ch !== AIR) {
            if (overOf(ch)) {
              drawTile(ctx, overOf(ch), x * TS, y * TS, TS, animT, false);
              drawTile(ctx, "h", x * TS, y * TS, TS, animT, false);
            } else if (isMob(ch)) {
              Art.drawSprite(ctx, ch, x * TS + TS * 0.05, (y - 1) * TS, TS * 0.9, TS * 2);
            } else if (isDoor(ch)) {
              Art.drawSprite(ctx, ch, x * TS, (y - 1) * TS, TS, TS * 2);
            } else {
              drawTile(ctx, ch, x * TS, y * TS, TS, animT, y > 0 && isSolid(grid[y - 1][x]));
            }
          }
        }
      }
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < w; x++) if ("WY".includes(baseOf(grid[y][x]))) drawCone(ctx, grid, x, y, TS, 0, true);
      }

      if (editing === "arena") {
        ctx.save();
        ctx.globalAlpha = 0.45;
        Art.drawSprite(ctx, "boss", BOSS_X * TS, BOSS_TOP * TS, 24 * BOSS_PX * TS, 32 * BOSS_PX * TS);
        ctx.restore();
      }

      // what each Stop and Dialog block is set to
      ctx.font = `bold ${Math.round(TS * 0.3)}px ui-monospace, monospace`;
      ctx.textBaseline = "bottom";
      ctx.lineWidth = 3;
      ctx.strokeStyle = "rgba(0,0,0,0.75)";
      ctx.fillStyle = "#ffffff";
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < w; x++) {
          const ch = baseOf(grid[y][x]);
          if (ch !== "O" && ch !== "K") continue;
          const n = notes[noteKey(x, y)];
          let label = ch === "O" ? (n || STOP_DEFAULT) + "s" : String(n || "…");
          if (label.length > 16) label = label.slice(0, 15) + "…";
          ctx.textAlign = ch === "O" ? "center" : "left";
          const lx = ch === "O" ? (x + 0.5) * TS : x * TS + 2;
          const ly = ch === "O" ? y * TS + TS * 0.36 : y * TS;
          ctx.strokeText(label, lx, ly);
          ctx.fillText(label, lx, ly);
        }
      }

      // grid lines + a marker every 5 columns
      ctx.strokeStyle = "rgba(0,0,0,0.12)";
      ctx.lineWidth = 1;
      for (let x = 0; x <= w; x++) {
        ctx.beginPath();
        ctx.moveTo(x * TS + 0.5, 0);
        ctx.lineTo(x * TS + 0.5, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y <= H; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * TS + 0.5);
        ctx.lineTo(canvas.width, y * TS + 0.5);
        ctx.stroke();
      }
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      ctx.font = `${Math.round(TS * 0.3)}px ui-monospace, monospace`;
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      for (let x = 0; x < w; x += 5) ctx.fillText(String(x), x * TS + 3, 3);
    };

    const tick = () => {
      animT += 1 / 60;
      render();
      raf = requestAnimationFrame(tick);
    };
    tick();

    // stop animating when we leave this screen
    const observer = new MutationObserver(() => {
      if (!document.body.contains(canvas)) {
        cancelAnimationFrame(raf);
        observer.disconnect();
      }
    });
    observer.observe(root, { childList: true });

  };

  // ---------- screen: play ----------

  // `chain` links a level to the ones after it: { i, count, carried, playNext }.
  // Absent when a level is played on its own (from the editor's Test button).
  const showPlay = (level, onExit, fromEditor, chain) => {
    clear();
    window.BDMusic.level(musicOf(level));

    // These three describe the level being played. A Boss portal swaps them
    // for the boss arena; `home` is how a full restart gets the level back.
    // The rules only ever see built-in blocks: each of the player's own blocks
    // is swapped for the block it acts like, and `looks` remembers which
    // squares should be drawn with the player's picture instead.
    const strip = (g) => {
      const lk = {};
      const out = g.map((row, y) => row.map((ch, x) => {
        if (!isMine(ch) && !MEGA_BASE[ch]) return ch;
        lk[noteKey(x, y)] = ch;
        return baseOf(ch);
      }));
      return [out, lk];
    };
    let [template, looks] = strip(rowsToGrid(level.rows));
    // Megas play as their ordinary block (so every rule still applies) and
    // `looks` remembers which squares are mega, for their extra power.
    const megaAt = (x, y) => !!MEGA_BASE[looks[noteKey(x, y)]];
    // 2 for a mega square: pays double, counts double, lasts twice as long
    const megaTimes = (x, y) => (megaAt(x, y) ? 2 : 1);
    const hero = Art.baseOf(level.hero) === "player" ? level.hero : pickedHero();
    const pet = loadPets().pick;
    const petBase = pet && petBaseOf(pet);
    window.BDBadges.nightCheck();
    const notes = cleanNotes(level.rows, level.notes);
    let width = template[0].length;
    let spawn = findSpawn(template);
    const home = { template, width, spawn, looks };

    const header = el("div", "row");
    header.appendChild(el("h1", null, level.name || "Level"));
    header.appendChild(el("div", "spacer"));
    const quit = el("button", "small", fromEditor ? "← Editor" : "← Levels");
    quit.onclick = () => { stop(); onExit(); };
    let showGhost = ghostOn();
    const ghostBtn = el("button", "small", "");
    const showGhostBtn = () => { ghostBtn.textContent = showGhost ? "👻 Ghost: on" : "👻 Ghost: off"; };
    showGhostBtn();
    // pointerdown + preventDefault so the button never takes focus, or the
    // Space bar (jump) would switch the ghost on and off
    ghostBtn.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      showGhost = !showGhost;
      try { localStorage.setItem(GHOST_ON_KEY, showGhost ? "1" : "0"); } catch (err) { /* ignore */ }
      showGhostBtn();
    });
    header.append(ghostBtn, quit);
    root.appendChild(header);

    const panel = el("div", "panel");
    const hud = el("div", "play-hud");
    const scoreEl = el("span", "score", "💎 0");
    const rodsEl = el("span", "score", "🪄 0");
    const attEl = el("span", "att", "Attempt 1");
    const pctEl = el("span", "att", "0%");
    // only levels that have rods or spawners show a rod counter
    const allRows = level.rows.concat(level.arena || []);
    // …or ones you walk in already carrying some. Same for pearls and eyes.
    const bag = loadBag();
    const crafts = allRows.some((r) => r.includes("H"));
    const has = (...chs) => allRows.some((r) => chs.some((c) => r.includes(c)));
    const hasRods = crafts || bag.rods > 0 || has("Z", "r", "6", megaOf("Z"), megaOf("r"));
    const pearlsEl = el("span", "score", "🔮 0");
    const hasPearls = crafts || bag.pearls > 0 || has("9", megaOf("9"));
    const eyesEl = el("span", "score", "👁 0");
    const hasEyes = crafts || bag.eyes > 0 || has("o", "7", "R", megaOf("o"));
    // megacoins earned in this level; they join the wallet when you finish
    const megaEl = el("span", "score", "Ⓜ 0");
    const hasMega = has("@", megaOf("@"));
    const keysEl = el("span", "score", "🔑 0");
    const hasKeys = has(KEY, "\u0185");
    const shieldEl = el("span", "score", "🛡 " + bag.shields);
    const sword = swordAtHome() ? 0 : bag.sword;
    const bossMax = sword ? SWORDS[sword].hits : BOSS_HP;
    hud.append(scoreEl, ...(hasMega ? [megaEl] : []), ...(hasRods ? [rodsEl] : []), ...(hasPearls ? [pearlsEl] : []),
      ...(hasEyes ? [eyesEl] : []), ...(hasKeys ? [keysEl] : []), ...(bag.shields ? [shieldEl] : []), pctEl, attEl);
    panel.appendChild(hud);

    if (chain && chain.count > 1) {
      const step = el("div", "play-step");
      step.innerHTML = `Level ${chain.i + 1} of ${chain.count}` +
        (chain.carried ? ` · ${chain.carried} carried over` : "");
      panel.appendChild(step);
    }

    const prog = el("div", "progress");
    const fill = el("div", "fill");
    prog.appendChild(fill);
    panel.appendChild(prog);
    prog.style.margin = "8px 0";

    const canvas = el("canvas");
    canvas.id = "play-canvas";
    canvas.width = 960;
    canvas.height = 540;
    panel.appendChild(canvas);
    const ctx = canvas.getContext("2d");

    const msgSlot = el("div");
    panel.appendChild(msgSlot);

    // ◀ ▶ only appear inside a Free move zone
    const padRow = el("div", "row");
    padRow.style.marginTop = "8px";
    padRow.style.flexWrap = "nowrap";
    const leftBtn = el("button", "move-btn", "◀");
    const rightBtn = el("button", "move-btn", "▶");
    const jumpBtn = el("button", "green", "JUMP");
    jumpBtn.id = "jump-btn";
    const boostBtn = el("button", "boost-btn", "⚡ Boost");
    padRow.append(leftBtn, jumpBtn, boostBtn, rightBtn);
    panel.appendChild(padRow);
    panel.appendChild(el("p", "hint",
      "Tap the screen, press SPACE or ▲ to jump. Hold to keep jumping. " +
      "In a free-move zone, steer with ◀ ▶ or the arrow keys."));
    root.appendChild(panel);

    const TS = canvas.height / H; // 45px per block
    const VIEW_COLS = canvas.width / TS;

    let grid, player, score, attempts = 0, state, camX, effect, effectT,
      rot, coyote, buffer, particles, deadT, time = 0, holding = false, keys = 0, doorT = {},
      checkpoint = null, flying = false, deathKind = "boom",
      movers = [], shooters = [], bullets = [], spawners = [], blazes = [], fireballs = [],
      rods = 0, pearls = 0, eyes = 0, megas = 0, shieldT = 0, framesLeft = 0, told = {}, watchers = [], mobs = [], runT = 0, warp = null,
      free = false, moveL = false, moveR = false, stopT = 0, talk = null, talkAt = 0, poofed = false,
      inBoss = false, boss = null, introSeen = false, cutT = 0, downT = 0, knock = 0, plats = [];

    const showItems = () => {
      rodsEl.textContent = "🪄 " + rods;
      pearlsEl.textContent = "🔮 " + pearls;
      eyesEl.textContent = "👁 " + eyes;
      keysEl.textContent = "🔑 " + keys;
    };

    // toasts for things you stand in for many frames: once per attempt
    const tellOnce = (what, msg) => {
      if (told[what]) return;
      told[what] = true;
      toast(msg);
    };

    const setFree = (on) => {
      free = on;
      leftBtn.style.display = rightBtn.style.display = on ? "" : "none";
    };

    // Mega wings come with a Boost: a short burst at Lightning speed, then a
    // wait while it recharges. The button fills up as it charges.
    let boostOn = false, boostCD = 0, boostShown = "";
    const setBoost = (on) => {
      boostOn = on;
      boostCD = 0;
      boostBtn.style.display = on ? "" : "none";
    };
    const boost = () => {
      if (!boostOn || boostCD > 0 || state !== "run") return;
      effect = "fast";
      effectT = BOOST_TIME;
      boostCD = BOOST_RECHARGE;
    };
    const showBoost = () => {
      const pct = boostCD > 0 ? Math.round((1 - boostCD / BOOST_RECHARGE) * 100) : 100;
      const key = boostOn + ":" + pct;
      if (key === boostShown) return;
      boostShown = key;
      boostBtn.disabled = pct < 100;
      boostBtn.style.setProperty("--charge", pct + "%");
    };

    // ----- runs, for the ghost -----
    // A run starts at the level's start and lasts through save-point respawns
    // and the boss fight. It's replayed by game step, so pauses replay too.
    const gKey = ghostKey(level);
    let best = loadGhosts()[gKey] || null;
    let run = null, runStep = 0, lifeStep = 0;
    const PET_LAG = 18; // steps the pet trails behind you
    const trail = [];

    const startRun = () => {
      run = { path: [], far: 0, boss: false, deaths: 0 };
      runStep = 0;
    };
    // True when the run beat the saved ghost. The very first run just
    // becomes the ghost: there's nothing to beat yet.
    const endRun = (finished) => {
      if (!run || run.ended) return false;
      run.ended = true;
      const r = { path: run.path, far: run.far, boss: run.boss, done: finished, t: runStep, at: Date.now() };
      const old = best;
      if (old && !beats(r, old)) return false;
      if (!old && r.path.length < 6) return false;
      best = r;
      saveGhost(gKey, r);
      if (!old) return false;
      window.BDBadges.add("ghostWins");
      if (r.done && old.done && old.t - r.t < 0.5 / STEP) window.BDBadges.earn("photo");
      return true;
    };
    const ghostBonus = () => {
      const b = loadBag();
      saveBag(Object.assign(b, { coins: b.coins + GHOST_BONUS }));
      toast(`👻 NEW BEST! You beat your ghost! +${GHOST_BONUS} coins`);
    };
    const afterStep = () => {
      runStep++;
      lifeStep++;
      if (state === "run" && !warp) {
        trail.push(player.x, player.y);
        if (trail.length > PET_LAG * 2) trail.splice(0, 2);
      }
      if (!run || run.ended) return;
      if (inBoss) { run.boss = true; return; } // the arena isn't part of the level's map
      if (state === "run") run.far = Math.max(run.far, player.x);
      if (runStep % GHOST_EVERY === 0 && run.path.length < GHOST_MAX * 3) {
        run.path.push(+player.x.toFixed(2), +player.y.toFixed(2), +rot.toFixed(1));
      }
    };

    // fromStart: R / Play again. Otherwise (after dying) respawn at the last
    // checkpoint with the level as it was when you got there, so diamonds
    // grabbed before it stay grabbed.
    const reset = (fromStart) => {
      if (fromStart || !checkpoint) {
        if (run && endRun(false)) ghostBonus();
        startRun();
      }
      lifeStep = 0;
      trail.length = 0;
      if (fromStart) {
        checkpoint = null;
        inBoss = false;
        introSeen = false;
        ({ template, width, spawn, looks } = home);
      }
      const at = checkpoint || spawn;
      grid = (checkpoint ? checkpoint.grid : template).map((r) => r.slice());
      // Lava sources and shooters always restart, even after a save point:
      // grown lava is cleared and the sources start growing again.
      movers = [];
      shooters = [];
      bullets = [];
      spawners = [];
      blazes = [];
      fireballs = [];
      watchers = [];
      mobs = [];
      plats = [];
      runT = 0;
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < width; x++) {
          if (grid[y][x] === FLOWED) grid[y][x] = AIR;
          else if (isLogged(grid[y][x])) grid[y][x] = grid[y][x][1];
          const ch = template[y][x];
          // Boss platforms start out missing; the climb stage puts them in
          if (ch === "J") { grid[y][x] = AIR; plats.push([x, y]); }
          if (ch === "U" || ch === "D") {
            movers.push({ x, tip: y, dir: ch === "U" ? -1 : 1, t: 0, active: false, done: false });
          } else if (ch === "S") {
            shooters.push({ x, y, t: 1 });
          } else if (ch === "Z") {
            spawners.push({ x, y, t: 0.6, alive: 0 });
          } else if (ch === "W" || ch === "Y") {
            watchers.push({ x, y, ph: (x * 0.37) % WATCH_CYCLE, stare: ch === "Y" });
          }
          // creatures live outside the grid while you play; they restart on every respawn
          if (isMob(ch)) {
            grid[y][x] = AIR;
            mobs.push({ kind: ch, look: looks[noteKey(x, y)], x: x + (1 - MOB_W) / 2, y: y + 1 - MOB_H, vy: 0,
              awake: false, glitchT: GLITCH_EVERY, onGround: false });
          }
        }
      }
      player = {
        x: at.x + 0.15,
        y: at.y + (1 - PLAYER_H),
        vy: 0,
        onGround: false,
      };
      score = checkpoint ? checkpoint.score : 0;
      scoreEl.textContent = "💎 " + score;
      // Without a save point you start with what's in the bag. What you pick
      // up only goes into the bag for keeps when you finish the level.
      ({ rods, pearls, eyes } = checkpoint || bag);
      megas = checkpoint ? checkpoint.megas : 0;
      // keys only work in the level you find them in
      keys = checkpoint ? checkpoint.keys || 0 : 0;
      megaEl.textContent = "Ⓜ " + megas;
      shieldT = 0;
      showItems();
      framesLeft = grid.reduce((n, row) => n + row.filter((ch) => ch === "R").length, 0);
      told = {};
      state = "run";
      warp = null;
      setFree(false);
      stopT = 0;
      talk = null;
      camX = clamp(player.x - VIEW_COLS * 0.32, 0, Math.max(0, width - VIEW_COLS));
      effect = null;
      effectT = 0;
      flying = false;
      setBoost(false);
      rot = 0;
      coyote = 0;
      buffer = 0;
      particles = [];
      deadT = 0;
      attempts++;
      attEl.textContent = "Attempt " + attempts;
      msgSlot.innerHTML = "";
      jumpBtn.disabled = false;
      knock = 0;
      boss = null;
      if (inBoss) startBoss();
      if (hero === CAT_LOOK && petBase === "petCat" && window.BDMusic.playing === "meow") window.BDBadges.earn("cat");
    };

    // ----- the TNT Mech boss fight -----

    // Walking into a Boss portal swaps the level for a one-screen arena. The
    // arena is set up as a save point, so dying restarts the fight, not the level.
    const enterBoss = () => {
      [template, looks] = strip(arenaGrid(level.arena, arenaBgOf(level)));
      width = ARENA_W;
      spawn = findSpawn(template);
      checkpoint = { x: spawn.x, y: spawn.y, score, megas, rods, pearls, eyes, keys, grid: template.map((r) => r.slice()) };
      inBoss = true;
      attempts--; // stepping through the portal isn't a new attempt
      reset();
    };

    const startBoss = () => {
      setFree(true);
      boss = { hp: bossMax, stage: -1, t: 0, spawnT: 0, hurtT: 0, x: BOSS_X, rain: [], gone: false };
      if (introSeen) nextStage();
      else { state = "cut"; cutT = 0; }
    };

    const endCut = () => {
      introSeen = true;
      state = "run";
      particles = [];
      nextStage();
    };

    // The climb stage's platforms only exist while that stage is on.
    const setPlats = (on) => {
      for (const [x, y] of plats) {
        grid[y][x] = on ? "J" : AIR;
        // one appearing on top of you lifts you onto it rather than trapping you
        if (on && touches(x, y, x + 1, y + 1)) { player.y = y - PLAYER_H; player.vy = 0; }
      }
    };

    // rain TNT -> climb up and stomp -> shooter arm -> repeat
    const nextStage = () => {
      boss.stage = (boss.stage + 1) % 3;
      boss.t = BOSS_STAGE;
      boss.spawnT = 0.9;
      setPlats(boss.stage === 1);
      bullets = bullets.filter((b) => !b.straight); // its stars don't outlive the shooter stage
    };

    const smoke = (cx, cy, n, spread) => {
      for (let i = 0; i < n; i++) {
        const sz = 0.5 + Math.random() * 0.9;
        particles.push({
          x: cx + (Math.random() - 0.5) * spread - sz / 2, y: cy + (Math.random() - 0.5) * spread - sz / 2,
          vx: (Math.random() - 0.5) * 1.2, vy: -Math.random() * 0.8, g: -0.4, s: sz,
          life: 1 + Math.random() * 1.4,
          c: ["#8a8a8a", "#a8a8a8", "#6f6f6f", "#c4c4c4"][(Math.random() * 4) | 0],
        });
      }
    };

    // where the dragon is during the intro: swoops in, then hangs there shaking
    const dragonAt = () => {
      const k = clamp(cutT / 1.8, 0, 1);
      const ease = 1 - (1 - k) * (1 - k);
      return { x: ARENA_W + 2 + (11 - ARENA_W - 2) * ease, y: 3 + Math.sin(cutT * 4) * 0.5 };
    };

    // Intro: the dragon flies in, is blown up, and the boss walks out of the smoke.
    const updateCut = (dt) => {
      const before = cutT;
      cutT += dt;
      const at = (t) => before < t && cutT >= t;
      const d = dragonAt();
      for (const t of [1.8, 2.05, 2.3, 2.55]) {
        if (at(t)) explode(d.x + 1 + Math.random() * 4.4, d.y + 0.5 + Math.random() * 2.6,
          ["#d05bff", "#f4f0ff", "#ffd54a", "#ff8a3d"]);
      }
      if (at(2.6)) smoke(16, 6.5, 70, 7);
      if (at(3.2)) smoke(17, 7.5, 30, 5);
      // the boss strides out from deep in the smoke to its spot
      boss.x = BOSS_X + 3 * (1 - clamp((cutT - 2.8) / 1.6, 0, 1));
      if (cutT >= CUT_END) endCut();
    };

    // Returns true if the player died or the fight ended this step.
    const updateBoss = (dt) => {
      const b = boss;
      if (b.hurtT > 0) b.hurtT -= dt;

      for (const r of b.rain) {
        r.y += RAIN_SPEED * dt;
        if (touches(r.x, r.y, r.x + 1, r.y + 1)) { die("boom", true); return true; }
        if (r.y >= H - 2) {
          r.dead = true;
          sparkle(r.x + 0.5, H - 1.2, ["#ffd54a", "#ff8a3d", "#e04a2f", "#8c8c8c"]);
        }
      }
      b.rain = b.rain.filter((r) => !r.dead);

      // Its head and torso are one tall column: land on top to stomp it, and
      // anywhere else it's simply a wall.
      const feet = player.y + PLAYER_H;
      if (player.x + PLAYER_W > BOSS_BODY && feet > BOSS_TOP) {
        if (player.vy > 0 && feet < BOSS_TOP + 0.5) {
          player.y = BOSS_TOP - PLAYER_H;
          player.vy = -JUMP_V;
          knock = -18; // thrown clear, so you don't drop onto its spike arm
          if (b.hurtT <= 0) {
            b.hp--;
            b.hurtT = 1.5;
            explode(player.x + PLAYER_W / 2, BOSS_TOP + 0.5, ["#ffd54a", "#ff8a3d", "#e04a2f", "#ffffff"]);
            if (b.hp <= 0) {
              state = "bossdown";
              downT = 0;
              setPlats(false);
              bullets = [];
              b.rain = [];
              return true;
            }
            // a stomp ends the climb early and moves it on to its next attack
            b.stage = 1;
            nextStage();
          }
        } else {
          player.x = BOSS_BODY - PLAYER_W;
        }
      }
      // the spike arm hanging at its side
      if (touches(b.x + 0.1, BOSS_TOP + 12 * BOSS_PX, b.x + 0.9, BOSS_TOP + 28 * BOSS_PX)) {
        die("poof", true);
        return true;
      }

      b.t -= dt;
      if (b.t <= 0) nextStage();
      b.spawnT -= dt;
      if (b.spawnT <= 0) {
        // It speeds up each time it's hit. Measured from the bare-handed
        // five, so a sword's shorter fight still reaches its fastest.
        const anger = Math.round((1 - b.hp / bossMax) * (BOSS_HP - 1));
        if (b.stage === 0) {
          b.spawnT = [0.3, 0.25, 0.2][anger] || 0.2;
          // nearly half are aimed right at you, so you have to keep moving
          const x = Math.random() < 0.45 ? player.x - 0.15 : Math.random() * (BOSS_X - 1);
          b.rain.push({ x: clamp(x, 0, BOSS_X - 1), y: -1 });
        } else if (b.stage === 2) {
          b.spawnT = [1.2, 1, 0.8][anger] || 0.8;
          const mx = b.x + 21.5 * BOSS_PX, my = BOSS_TOP + 21 * BOSS_PX;
          const a = Math.atan2(player.y + PLAYER_H / 2 - my, player.x + PLAYER_W / 2 - mx);
          // Unlike a Shooter block's stars these fly straight at where you were:
          // in a small arena there's no outrunning ones that steer.
          bullets.push({ x: mx, y: my, a, life: BULLET_LIFE, fromX: -9, fromY: -9, straight: true });
        }
      }
      return false;
    };

    // Beaten: it shakes apart in a string of explosions, then the level is won.
    const updateBossDown = (dt) => {
      const before = downT;
      downT += dt;
      if (Math.floor(before / 0.15) !== Math.floor(downT / 0.15)) {
        explode(boss.x + Math.random() * 4.8, BOSS_TOP + Math.random() * 6.4,
          ["#ffd54a", "#ff8a3d", "#e04a2f", "#8c8c8c"]);
      }
      if (downT >= 1.8) {
        boss.gone = true;
        smoke(boss.x + 2.4, BOSS_TOP + 3.5, 40, 5);
        state = "run";
        win();
      }
    };

    // Open any shut door you've reached (from either side). A door's letter
    // is in its bottom square; the square above is door too.
    const openDoors = () => {
      const y0 = Math.floor(player.y), y1 = Math.floor(player.y + PLAYER_H - 0.01);
      for (let x = Math.floor(player.x - 3); x <= Math.floor(player.x + PLAYER_W + 3); x++) {
        if (x < 0 || x >= width) continue;
        for (let y = y0; y <= Math.min(H - 1, y1 + 1); y++) {
          const ch = grid[y][x];
          if (!isDoor(ch) || y - 1 > y1 || y < y0) continue;
          const gap = x >= player.x + PLAYER_W ? x - (player.x + PLAYER_W) : player.x - (x + 1);
          if (gap > TILES[ch].reach) continue;
          if (TILES[ch].locked) {
            if (keys < 1) { tellOnce("lock", "This door is locked. Find a 🔑 key!"); continue; }
            keys--;
            showItems();
          }
          grid[y][x] = "/" + ch;
          doorT[noteKey(x, y)] = time;
        }
      }
    };

    const solidAt = (x, y) =>
      x >= 0 && x < width && y >= 0 && y < H &&
      (isSolid(grid[y][x]) || (y + 1 < H && isDoor(grid[y + 1][x])));

    // A fresh press while touching a Blink teleports instead of jumping.
    // Holding jump doesn't count, so you don't chain through every Blink.
    // Returns true when the press was used up closing a dialog, so the caller
    // doesn't also treat it as "holding jump".
    const pressJump = () => {
      if (state === "cut") { boss.x = BOSS_X; endCut(); return true; } // skip the intro
      if (state === "talk") {
        // a short grace so a jump you were already mashing doesn't skip the words
        if (time - talkAt > 0.35) { state = "run"; talk = null; }
        return true;
      }
      if (state === "run") {
        for (let y = Math.floor(player.y); y <= Math.floor(player.y + PLAYER_H - 0.01); y++) {
          for (let x = Math.floor(player.x); x <= Math.floor(player.x + PLAYER_W - 0.01); x++) {
            if (grid[y] && grid[y][x] === "I" && blink(x, y)) return;
          }
        }
      }
      doJump();
    };

    const doJump = () => {
      if (state !== "run" || stopT > 0) return;
      if (player.onGround || coyote > 0) {
        player.vy = -JUMP_V;
        player.onGround = false;
        coyote = 0;
        buffer = 0;
      } else {
        buffer = JUMP_BUFFER;
      }
    };

    const explode = (cx, cy, colors) => {
      for (let i = 0; i < 34; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = 3 + Math.random() * 11;
        particles.push({
          x: cx, y: cy,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp - 4,
          life: 0.5 + Math.random() * 0.6,
          c: colors[(Math.random() * colors.length) | 0],
        });
      }
    };

    // g = this particle's own gravity (negative floats up), s = its size in blocks
    const ember = () => {
      particles.push({
        x: player.x + Math.random() * PLAYER_W, y: player.y + Math.random() * PLAYER_H,
        vx: (Math.random() - 0.5) * 2, vy: -1 - Math.random() * 3, g: -5,
        life: 0.4 + Math.random() * 0.5,
        c: ["#ffd54a", "#ff8a3d", "#e04a2f", "#ff5a1f"][(Math.random() * 4) | 0],
      });
    };

    const puff = () => {
      for (let i = 0; i < 16; i++) {
        const s = 0.22 + Math.random() * 0.26;
        particles.push({
          x: player.x + PLAYER_W / 2 + (Math.random() - 0.5) * 0.9 - s / 2,
          y: player.y + PLAYER_H / 2 + (Math.random() - 0.5) * 0.9 - s / 2,
          vx: (Math.random() - 0.5) * 1.6, vy: -0.3 - Math.random() * 1.2, g: -1.5, s,
          life: 0.35 + Math.random() * 0.3,
          c: ["#ffffff", "#e6e6e6", "#cfcfcf"][(Math.random() * 3) | 0],
        });
      }
    };

    // Each kind of death looks different: TNT and walls go boom, lava and fire
    // set you alight, a spike makes you tip over and puff away, a watcher deletes.
    // A shield from the shop turns one mob hit (blaze, fireball, end mob, the boss) into
    // a couple of seconds where mobs can't hurt you. Only mobs: saving you
    // from lava or a pit would need somewhere safe to put you, and not every
    // safe-looking square is one you can still beat the level from. It is
    // used up for good straight away, even if you then quit the level.
    const shielded = () => {
      if (shieldT > 0) return true;
      if (bag.shields < 1) return false;
      bag.shields--;
      saveBag(Object.assign(loadBag(), { shields: bag.shields }));
      shieldEl.textContent = "🛡 " + bag.shields;
      shieldT = SHIELD_TIME;
      toast("🛡 Your shield saved you!");
      sparkle(player.x + PLAYER_W / 2, player.y + PLAYER_H / 2, ["#3f7fd6", "#9cc4ff", "#ffffff"]);
      return true;
    };

    const die = (kind = "boom", byMob = false) => {
      if (state !== "run") return;
      if (byMob && shielded()) return;
      state = "dead";
      deathKind = kind;
      deadT = 0;
      window.BDBadges.add("deaths");
      if (run) run.deaths++;
      if (lifeStep < 1 / STEP && !checkpoint) window.BDBadges.earn("oops");
      poofed = false;
      if (kind === "burn") {
        for (let i = 0; i < 14; i++) ember();
      } else if (kind !== "poof") {
        if (kind === "megaboom") {
          explode(player.x + PLAYER_W / 2, player.y + PLAYER_H / 2, ["#f08bff", "#c22fd0", "#ffd54a", "#ffffff"]);
        }
        explode(player.x + PLAYER_W / 2, player.y + PLAYER_H / 2,
          kind === "delete" ? ["#b46bff", "#2a1240", "#f4f0ff", "#7a2fd0"]
            : ["#ffd54a", "#ff8a3d", "#e04a2f", "#8c8c8c"]);
      }
      jumpBtn.disabled = true;
    };

    const boom = (kind) => {
      if (state === "run") window.BDBadges.add("tnt");
      die(kind);
    };

    const win = () => {
      if (state !== "run") return;
      const beatGhost = endRun(true);
      const M = window.BDMusic, B = window.BDBadges;
      B.cleared(bestKey(level), builtinLevels().map(bestKey));
      if (inBoss) { B.earn("boss"); if (!sword) B.earn("bare"); }
      if (run && !run.deaths) B.earn("perfect");
      if (!M.playing) B.earn("silent");
      if (petBase === "petDog" && M.playing === "woof") B.earn("goodboy");
      state = "win";
      setBest(bestKey(level), score);
      // re-read first: a shield used on the way has already been saved
      Object.assign(bag, loadBag(), { rods, pearls, eyes });
      bag.coins += score + (beatGhost ? GHOST_BONUS : 0);
      bag.mega += megas;
      saveBag(bag);
      jumpBtn.disabled = true;
      explode(player.x + PLAYER_W / 2, player.y + PLAYER_H / 2,
        ["#4fe0d8", "#b6fffa", "#ffd54a", "#c58bff"]);
      const carried = chain ? chain.carried : 0;
      const runTotal = carried + score;
      const more = chain && chain.i + 1 < chain.count;

      const box = el("div", "overlay-msg");
      box.innerHTML =
        `<div class="big">${more || !chain ? "Level Complete!" : "You Finished!"}</div>` +
        (beatGhost ? `<div class="big" style="font-size:1.1rem">👻 NEW BEST! You beat your ghost! +${GHOST_BONUS} coins</div>` : "") +
        `<div>Score: ${score} · Best: ${getBest(bestKey(level))}</div>` +
        `<div>+${score} coins${megas ? ` · +${megas} megacoins` : ""} · ` +
        `you now have ${bag.coins} coins${bag.mega ? ` and ${bag.mega} megacoins` : ""}</div>` +
        (hasRods || hasPearls || hasEyes
          ? `<div>In your inventory: ${rods} 🪄 · ${pearls} 🔮 · ${eyes} 👁</div>` : "") +
        (chain && chain.count > 1
          ? `<div class="run-total">Run total: ${runTotal} 💎` +
            (more ? ` · ${chain.count - chain.i - 1} to go` : ` · all ${chain.count} levels!`) +
            `</div>`
          : "");
      const row = el("div", "row");
      row.style.justifyContent = "center";
      row.style.marginTop = "10px";
      if (more) {
        const next = el("button", "green small", "▶ Next level");
        next.onclick = () => { stop(); chain.playNext(runTotal); };
        row.appendChild(next);
      }
      const again = el("button", more ? "small" : "green small", "▶ Play again");
      again.onclick = () => reset(true);
      const out = el("button", "small", fromEditor ? "← Editor" : "← Levels");
      out.onclick = () => { stop(); onExit(); };
      row.append(again, out);
      box.appendChild(row);
      msgSlot.innerHTML = "";
      msgSlot.appendChild(box);
      msgSlot.style.marginTop = "8px";
    };

    const sparkle = (x, y, colors) => {
      for (let i = 0; i < 10; i++) {
        particles.push({ x, y, vx: (Math.random() - 0.5) * 6, vy: -2 - Math.random() * 4,
          life: 0.4 + Math.random() * 0.3, c: colors[(Math.random() * colors.length) | 0] });
      }
    };

    const gotRod = (x, y) => {
      rods++;
      showItems();
      sparkle(x, y, ["#ffe98a", "#f0a020"]);
    };

    // Jump to the nearest Blink further right. Only forward, so Blinks
    // can't be used to loop back and farm gems.
    const blink = (fromX, fromY) => {
      let best = null, bestD = Infinity;
      for (let y = 0; y < H; y++) {
        for (let x = fromX + 1; x < width; x++) {
          if (grid[y][x] !== "I") continue;
          const d = (x - fromX) ** 2 + (y - fromY) ** 2;
          if (d < bestD) { bestD = d; best = { x, y }; }
        }
      }
      if (!best) return false;
      sparkle(player.x + PLAYER_W / 2, player.y + PLAYER_H / 2, ["#b46bff", "#f4f0ff"]);
      player.x = best.x + (1 - PLAYER_W) / 2;
      player.y = best.y + (1 - PLAYER_H);
      player.vy = 0;
      // The game holds still while the camera glides over, so the jump is
      // easy on the eyes and you're never dropped straight into danger.
      warp = { t: 0, from: camX };
      return true;
    };

    const mobSolid = (x0, y0, x1, y1) => {
      for (let y = Math.floor(y0); y <= Math.floor(y1 - 0.001); y++) {
        for (let x = Math.floor(x0); x <= Math.floor(x1 - 0.001); x++) {
          if (solidAt(x, y)) return true;
        }
      }
      return false;
    };

    // Is any part of you inside this Watcher's cone?
    const canSee = (w) => {
      const i = 0.14;
      const xs = [player.x + i, player.x + PLAYER_W / 2, player.x + PLAYER_W - i];
      const ys = [player.y + i, player.y + PLAYER_H / 2, player.y + PLAYER_H - i];
      return xs.some((px) => ys.some((py) => inCone(grid, w.x, w.y, px, py)));
    };
    // timed from the (re)start, so each attempt sees the same rhythm, like a rhythm game
    const eyeOpen = (w) => w.stare || (runT + w.ph) % WATCH_CYCLE < WATCH_OPEN;

    // Player's hit box for things that move, a little forgiving like items.
    const touches = (x0, y0, x1, y1) => {
      const inset = 0.14;
      return x1 > player.x + inset && x0 < player.x + PLAYER_W - inset &&
        y1 > player.y + inset && y0 < player.y + PLAYER_H - inset;
    };
    const onScreen = (x) => x >= camX - 1 && x < camX + VIEW_COLS + 0.5;

    // Moving lava, shooters and their stars. Returns true if you died.
    const updateHazards = (dt) => {
      for (const m of movers) {
        if (!m.active && onScreen(m.x)) m.active = true;
        if (!m.active || m.done) continue;
        m.t += dt * (m.dir < 0 ? LAVA_RISE : LAVA_FALL);
        if (m.t < 1) continue;
        m.t = 0;
        // Grow one block into empty air; anything else (ground, an item,
        // the edge of the level) stops the flow for good.
        const next = m.tip + m.dir;
        const there = next >= 0 && next < H ? grid[next][m.x] : null;
        const soak = there !== null && LOGGABLE.includes(baseOf(there));
        if (there !== AIR && !soak) { m.done = true; continue; }
        grid[next][m.x] = soak ? FLOWED + there : FLOWED;
        m.tip = next;
      }

      for (const sh of shooters) {
        if (!onScreen(sh.x)) continue;
        sh.t -= dt;
        if (sh.t > 0) continue;
        sh.t = SHOOT_EVERY;
        const bx = sh.x + 0.5, by = sh.y + 0.5;
        const a = Math.atan2(player.y + PLAYER_H / 2 - by, player.x + PLAYER_W / 2 - bx);
        bullets.push({ x: bx, y: by, a, life: BULLET_LIFE, fromX: sh.x, fromY: sh.y });
      }

      for (const b of bullets) {
        // steer toward the player, but only so fast — you can outrun a turn
        const want = Math.atan2(player.y + PLAYER_H / 2 - b.y, player.x + PLAYER_W / 2 - b.x);
        let diff = want - b.a;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        if (!b.straight) b.a += clamp(diff, -BULLET_TURN * dt, BULLET_TURN * dt);
        const sp = b.straight ? BOSS_SHOT_SPEED : BULLET_SPEED;
        b.x += Math.cos(b.a) * sp * dt;
        b.y += Math.sin(b.a) * sp * dt;
        b.life -= dt;
        const cx = Math.floor(b.x), cy = Math.floor(b.y);
        if ((cx !== b.fromX || cy !== b.fromY) && solidAt(cx, cy)) b.life = 0;
        if (b.life > 0 && touches(b.x - 0.2, b.y - 0.2, b.x + 0.2, b.y + 0.2)) {
          die("boom", !!b.straight); // the boss's stars count as a mob hit, a Shooter block's don't
          return true;
        }
      }
      bullets = bullets.filter((b) => b.life > 0);

      for (const sp of spawners) {
        if (!onScreen(sp.x) || sp.alive >= BLAZE_MAX) continue;
        sp.t -= dt;
        if (sp.t > 0) continue;
        sp.t = SPAWN_EVERY;
        // come out of whichever side of the cage is open, top first
        const exits = [[0, -1], [-1, 0], [1, 0], [0, 1]];
        const ex = exits.find(([dx, dy]) => {
          const cx = sp.x + dx, cy = sp.y + dy;
          return cx >= 0 && cx < width && cy >= 0 && cy < H && !isSolid(grid[cy][cx]);
        });
        if (!ex) continue;
        const bx = sp.x + ex[0] + 0.5, by = sp.y + ex[1] + 0.5;
        sp.alive++;
        blazes.push({ x: bx, y: by, homeX: bx, homeY: by, t: BLAZE_SHOOT * 0.6, sp, ph: Math.random() * 6 });
      }

      for (const bz of blazes) {
        // drift toward you, but stay near the spawner, bobbing up and down
        const want = clamp(player.x + PLAYER_W / 2, bz.homeX - BLAZE_REACH, bz.homeX + BLAZE_REACH);
        bz.x += clamp(want - bz.x, -BLAZE_DRIFT * dt, BLAZE_DRIFT * dt);
        bz.y = bz.homeY + Math.sin(time * 2 + bz.ph) * 0.35;
        const r = 0.4;
        if (touches(bz.x - r, bz.y - r, bz.x + r, bz.y + r)) {
          // landing on top pops it and bounces you; any other touch burns
          if (player.vy > 0 && player.y + PLAYER_H < bz.y + 0.1) {
            bz.dead = true;
            bz.sp.alive--;
            player.vy = -JUMP_V * 0.85;
            explode(bz.x, bz.y, ["#ffd54a", "#ff8a3d", "#ffe98a"]);
            gotRod(bz.x, bz.y);
            continue;
          }
          die("burn", true);
          return true;
        }
        if (!onScreen(bz.x)) continue;
        bz.t -= dt;
        if (bz.t > 0) continue;
        bz.t = BLAZE_SHOOT;
        const a = Math.atan2(player.y + PLAYER_H / 2 - bz.y, player.x + PLAYER_W / 2 - bz.x);
        fireballs.push({ x: bz.x, y: bz.y, vx: Math.cos(a) * FIREBALL_SPEED,
          vy: Math.sin(a) * FIREBALL_SPEED, life: BULLET_LIFE });
      }
      blazes = blazes.filter((bz) => !bz.dead);

      for (const fb of fireballs) {
        fb.x += fb.vx * dt;
        fb.y += fb.vy * dt;
        fb.life -= dt;
        if (solidAt(Math.floor(fb.x), Math.floor(fb.y))) fb.life = 0;
        if (fb.life > 0 && touches(fb.x - 0.2, fb.y - 0.2, fb.x + 0.2, fb.y + 0.2)) {
          die("burn", true);
          return true;
        }
      }
      fireballs = fireballs.filter((fb) => fb.life > 0);

      for (const w of watchers) {
        if (onScreen(w.x) && eyeOpen(w) && canSee(w)) {
          die("delete");
          return true;
        }
      }

      for (const m of mobs) {
        if (m.gone) continue;
        if (m.kind === "N" && !m.awake &&
            m.x - player.x < ENDER_NOTICE && m.x > player.x + PLAYER_W) {
          // teleport to stand on the ground a few blocks in front of you
          m.awake = true;
          const cx = Math.floor(player.x + ENDER_AHEAD);
          for (let y = Math.max(1, Math.floor(player.y)); y < H - 1; y++) {
            if (!solidAt(cx, y) && !solidAt(cx, y - 1) && solidAt(cx, y + 1)) {
              sparkle(m.x + MOB_W / 2, m.y + MOB_H / 2, ["#e08cff", "#1c1c22"]);
              m.x = cx + (1 - MOB_W) / 2;
              m.y = y + 1 - MOB_H;
              m.vy = 0;
              sparkle(m.x + MOB_W / 2, m.y + MOB_H / 2, ["#e08cff", "#1c1c22"]);
              break;
            }
          }
        }
        // woken watchers run after you, hopping up steps in the way
        if ((m.kind === "V" || m.kind === "Q") && m.awake) {
          const dir = Math.sign(player.x - m.x) || 1;
          const nx = m.x + dir * CHASE_SPEED * dt;
          if (!mobSolid(nx, m.y, nx + MOB_W, m.y + MOB_H)) m.x = nx;
          else if (m.onGround) m.vy = -JUMP_V;
          if (m.kind === "Q") {
            m.glitchT -= dt;
            if (m.glitchT <= 0) {
              m.glitchT = GLITCH_EVERY;
              const gx = m.x + dir * GLITCH_HOP;
              if (!mobSolid(gx, m.y, gx + MOB_W, m.y + MOB_H)) {
                sparkle(m.x + MOB_W / 2, m.y + MOB_H / 2, ["#ff4fd8", "#4fffb0"]);
                m.x = gx;
              }
            }
          }
        }
        m.vy += GRAVITY * dt;
        const ny = m.y + m.vy * dt;
        m.onGround = false;
        if (m.vy > 0 && mobSolid(m.x, ny, m.x + MOB_W, ny + MOB_H)) {
          m.y = Math.floor(ny + MOB_H) - MOB_H;
          m.vy = 0;
          m.onGround = true;
        } else if (m.vy < 0 && mobSolid(m.x, ny, m.x + MOB_W, ny + MOB_H)) {
          m.vy = 0;
        } else {
          m.y = ny;
        }
        if (m.y > H + 2) { m.gone = true; continue; }

        if (!touches(m.x, m.y, m.x + MOB_W, m.y + MOB_H)) continue;
        const stomp = player.vy > 0 && player.y + PLAYER_H < m.y + 0.45;
        if (stomp) {
          player.vy = -JUMP_V * 0.85;
          if (m.kind === "N") {
            m.gone = true;
            sparkle(m.x + MOB_W / 2, m.y + MOB_H / 2, ["#e08cff", "#1c1c22", "#ffffff"]);
          } else if (!m.awake) {
            m.awake = true; // now it's noticed you
          }
          continue;
        }
        // a sleeping end watcher doesn't notice you brushing past; a corrupted one does
        if (m.kind === "V" && !m.awake) continue;
        die("delete", true);
        return true;
      }
      mobs = mobs.filter((m) => !m.gone);
      return false;
    };

    // --- physics ---
    const update = (dt) => {
      time += dt;
      runT += dt;

      for (const p of particles) {
        p.vy += (p.g === undefined ? 26 : p.g) * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt;
      }
      particles = particles.filter((p) => p.life > 0);

      if (warp) {
        warp.t += dt;
        const k = clamp(warp.t / WARP_TIME, 0, 1);
        const ease = k * k * (3 - 2 * k);
        const to = clamp(player.x - VIEW_COLS * 0.32, 0, Math.max(0, width - VIEW_COLS));
        camX = warp.from + (to - warp.from) * ease;
        if (k >= 1) {
          warp = null;
          sparkle(player.x + PLAYER_W / 2, player.y + PLAYER_H / 2, ["#b46bff", "#f4f0ff"]);
        }
        return;
      }

      if (state === "dead") {
        deadT += dt;
        if (deathKind === "burn" && deadT < 0.7 && Math.random() < 0.5) ember();
        if (deathKind === "poof" && !poofed && deadT >= POOF_AFTER) { poofed = true; puff(); }
        if (deadT > 0.9) reset();
        return;
      }
      if (state === "cut") { updateCut(dt); return; }
      if (state === "bossdown") { updateBossDown(dt); return; }
      if (state !== "run") return;

      if (boostCD > 0) boostCD -= dt;
      openDoors();
      if (effect) {
        effectT -= dt;
        if (effectT <= 0) effect = null;
      }
      if (shieldT > 0) shieldT -= dt;

      const speed = effect === "fast" ? SPEED_FAST : effect === "slow" ? SPEED_SLOW : SPEED_BASE;

      // horizontal — always forward, unless a Free move block handed you the controls
      const oldX = player.x;
      const dir = free ? (moveR ? 1 : 0) - (moveL ? 1 : 0) : 1;
      if (stopT > 0) stopT -= dt;
      else player.x += dir * speed * dt;
      if (knock) {
        // the shove from stomping the boss, fading out over about half a second
        player.x += knock * dt;
        knock *= Math.max(0, 1 - 4 * dt);
        if (Math.abs(knock) < 0.5) knock = 0;
      }
      if (player.x < 0) player.x = 0;
      if (inBoss) player.x = Math.min(player.x, width - PLAYER_W);
      const y0 = Math.floor(player.y + 0.02);
      const y1 = Math.floor(player.y + PLAYER_H - 0.02);
      const rightCol = Math.floor(player.x + PLAYER_W);
      let hitRow = -1;
      for (let y = y0; y <= y1; y++) {
        if (solidAt(rightCol, y)) { hitRow = y; break; }
      }
      if (hitRow >= 0) {
        const overlap = player.y + PLAYER_H - hitRow;
        if (grid[hitRow][rightCol] === "m" || grid[hitRow][rightCol] === "0") {
          // Slime launches you off any side, not just the top.
          player.x = oldX;
          player.vy = grid[hitRow][rightCol] === "0" ? -MEGA_BOUNCE_V : -BOUNCE_V;
          player.onGround = false;
          rot = 0;
        } else if (player.vy >= 0 && overlap < 0.35) {
          // Clipped the very top of the block on the way down? Slide up onto
          // the ledge instead of exploding — much kinder than pure GD rules.
          player.y = hitRow - PLAYER_H;
          player.vy = 0;
          player.onGround = true;
          rot = 0;
        } else {
          player.x = oldX;
          // ran straight into a wall — only deadly when you can't stop yourself
          if (!free) { die(); return; }
        }
      }
      if (player.x < oldX) {
        const leftCol = Math.floor(player.x);
        for (let y = y0; y <= y1; y++) {
          if (solidAt(leftCol, y)) { player.x = oldX; break; }
        }
      }

      // vertical
      player.vy += GRAVITY * dt;
      if (flying) {
        if (holding) {
          player.vy = Math.max(player.vy - FLY_THRUST * dt, -FLY_UP_V);
          if (Math.random() < 0.35) {
            particles.push({
              x: player.x + PLAYER_W * 0.3, y: player.y + PLAYER_H,
              vx: -2 - Math.random() * 3, vy: 2 + Math.random() * 3,
              life: 0.3 + Math.random() * 0.3,
              c: ["#ffd54a", "#ff8a3d", "#e04a2f", "#c58bff"][(Math.random() * 4) | 0],
            });
          }
        } else {
          player.vy = Math.min(player.vy, GLIDE_FALL);
        }
      }
      player.y += player.vy * dt;
      if (flying && player.y < 0) { player.y = 0; player.vy = Math.max(0, player.vy); }
      player.onGround = false;
      const cx0 = Math.floor(player.x + 0.02);
      const cx1 = Math.floor(player.x + PLAYER_W - 0.02);

      if (player.vy > 0) {
        const footRow = Math.floor(player.y + PLAYER_H);
        for (let x = cx0; x <= cx1; x++) {
          if (solidAt(x, footRow)) {
            player.y = footRow - PLAYER_H;
            if (grid[footRow][x] === "m" || grid[footRow][x] === "0") {
              player.vy = grid[footRow][x] === "0" ? -MEGA_BOUNCE_V : -BOUNCE_V;
              rot = 0;
            } else {
              player.vy = 0;
              player.onGround = true;
              rot = 0;
            }
            break;
          }
        }
      } else if (player.vy < 0) {
        const headRow = Math.floor(player.y);
        for (let x = cx0; x <= cx1; x++) {
          if (solidAt(x, headRow)) {
            player.y = headRow + 1;
            player.vy = 0;
            break;
          }
        }
      }

      coyote = player.onGround ? COYOTE : Math.max(0, coyote - dt);
      if (buffer > 0) {
        buffer -= dt;
        if (player.onGround) doJump();
      }
      if (holding && player.onGround) doJump();
      if (flying) rot = holding ? -0.25 : 0.1; // nose up when climbing
      else if (!player.onGround) rot += dt * 7;

      // items — a slightly smaller box, so near-misses are forgiving
      const inset = 0.14;
      const ix0 = Math.floor(player.x + inset);
      const ix1 = Math.floor(player.x + PLAYER_W - inset);
      const iy0 = Math.floor(player.y + inset);
      const iy1 = Math.floor(player.y + PLAYER_H - inset);
      // mega TNT doesn't wait to be touched: getting near is enough
      for (let y = Math.floor(player.y - MEGA_BLAST); y <= Math.floor(player.y + PLAYER_H + MEGA_BLAST); y++) {
        for (let x = Math.floor(player.x - MEGA_BLAST); x <= Math.floor(player.x + PLAYER_W + MEGA_BLAST); x++) {
          if (x < 0 || x >= width || y < 0 || y >= H || state !== "run") continue;
          const near = grid[y][x];
          // and the same for mega End TNT, mega lava and mega fire. Ask what the
          // mega square started as: lava that later flowed into a square where
          // a mega item was picked up is ordinary lava.
          const was = MEGA_BASE[looks[noteKey(x, y)]];
          if (near === "8" || (near === "T" && was === "T")) {
            boom("megaboom");
            return;
          }
          if (near === was && "LUDF".includes(near)) {
            die("burn");
            return;
          }
        }
      }
      for (let y = iy0; y <= iy1; y++) {
        for (let x = ix0; x <= ix1; x++) {
          if (x < 0 || x >= width || y < 0 || y >= H) continue;
          const ch = grid[y][x];
          if (ch === "t" || ch === "T") { boom(); return; }
          if (ch === "8") { boom("megaboom"); return; }
          if (isHiddenTnt(ch)) { boom(); return; }
          if (ch === "A") { die("poof"); return; }
          // The three invisible blocks work once each, then clear themselves
          // (they come back when the level resets).
          if (ch === "K") {
            grid[y][x] = AIR;
            talk = notes[noteKey(x, y)] || "…";
            talkAt = time;
            state = "talk";
            holding = false;
            continue;
          }
          if (ch === "O") {
            grid[y][x] = AIR;
            stopT = notes[noteKey(x, y)] || STOP_DEFAULT;
          } else if (ch === "M") {
            grid[y][x] = AIR;
            setFree(true);
          }
          if (ch === "F" || isLava(ch)) {
            die("burn");
            return;
          }
          if (ch === "C") {
            // Wings come off here, so each stretch between save points
            // has to earn its own pair.
            flying = false;
            setBoost(false);
            setFree(false); // like wings, free moving ends at a save point
            grid[y][x] = "checkpointOn";
            checkpoint = { x, y, score, megas, rods, pearls, eyes, keys, grid: grid.map((r) => r.slice()) };
            toast("Checkpoint!");
          }
          if (COIN_VALUE[ch]) {
            grid[y][x] = AIR;
            score += COIN_VALUE[ch] * megaTimes(x, y);
            scoreEl.textContent = "💎 " + score;
            if (ch === "d") window.BDBadges.add("diamonds", megaTimes(x, y));
            if (petBase) window.BDMusic.sfx(PET_SOUND[petBase]);
          } else if (ch === "@") {
            grid[y][x] = AIR;
            megas += MEGATITE_PAYS * megaTimes(x, y);
            megaEl.textContent = "Ⓜ " + megas;
            sparkle(x + 0.5, y + 0.5, ["#f08bff", "#c22fd0", "#ffd54a"]);
          } else if (ch === "b") {
            effect = "fast";
            effectT = EFFECT_TIME * megaTimes(x, y);
          } else if (ch === "w") {
            effect = "slow";
            effectT = EFFECT_TIME * megaTimes(x, y);
          } else if (ch === "r") {
            grid[y][x] = AIR;
            rods += megaTimes(x, y) - 1;
            gotRod(x + 0.5, y + 0.5);
          } else if (ch === "o") {
            grid[y][x] = AIR;
            eyes += megaTimes(x, y);
            showItems();
            sparkle(x + 0.5, y + 0.5, ["#7be0c2", "#c8fff0"]);
          } else if (ch === "9") {
            grid[y][x] = AIR;
            pearls += megaTimes(x, y);
            showItems();
            sparkle(x + 0.5, y + 0.5, ["#1c6b60", "#8ff0dc"]);
          } else if (ch === KEY) {
            grid[y][x] = AIR;
            keys++;
            showItems();
            sparkle(x + 0.5, y + 0.5, ["#ffd54a", "#a87a12", "#ffffff"]);
          } else if (ch === "H") {
            const made = Math.min(rods, pearls);
            if (made) {
              rods -= made;
              pearls -= made;
              eyes += made;
              showItems();
              sparkle(x + 0.5, y + 0.2, ["#7be0c2", "#c8fff0", "#ffe98a"]);
              toast(made === 1 ? "Crafted an eye of ender!" : `Crafted ${made} eyes of ender!`);
            } else if (!eyes) {
              tellOnce("craft", "Crafting needs a blaze rod and an ender pearl");
            }
          } else if (ch === "R") {
            if (eyes) {
              eyes--;
              framesLeft--;
              grid[y][x] = "frameOn";
              showItems();
              sparkle(x + 0.5, y + 0.2, ["#7be0c2", "#c8fff0"]);
              if (!framesLeft) toast("The boss portal is open!");
            } else {
              tellOnce("frame", "This frame needs an eye of ender");
            }
          } else if (ch === "f") {
            grid[y][x] = AIR;
            flying = true;
            if (megaAt(x, y)) setBoost(true);
          } else if (ch === "E") {
            win();
            return;
          } else if (ch === "G") {
            // Shut until every portal frame in the level has its eye. You run
            // straight through a shut one and the level carries on.
            if (framesLeft) {
              tellOnce("portal", framesLeft === 1 ? "The boss portal needs 1 more eye"
                : `The boss portal needs ${framesLeft} more eyes`);
              continue;
            }
            enterBoss();
            return;
          }
        }
      }

      if (updateHazards(dt)) return;
      if (boss && updateBoss(dt)) return;

      if (player.y > H + 1) {
        die();
        return;
      }
      if (player.x > width) { win(); return; }

      camX = clamp(player.x - VIEW_COLS * 0.32, 0, Math.max(0, width - VIEW_COLS));

      const pct = clamp(Math.round((player.x / width) * 100), 0, 100);
      fill.style.width = pct + "%";
      pctEl.textContent = pct + "%";
    };

    // --- rendering ---
    const drawBackground = () =>
      Art.drawBackground(ctx, inBoss ? arenaBgOf(level) : bgOf(level), canvas.width, canvas.height, camX * TS, TS, time, effect);

    // The ghost: you, tinted glowing blue on a scratch canvas, see-through.
    const ghostCv = el("canvas");
    const drawGhost = () => {
      if (!showGhost || inBoss || !best || !best.path) return;
      const p = best.path, n = p.length / 3;
      const f = runStep / GHOST_EVERY - 1;
      if (n < 2 || f >= n - 1) return; // the ghost's run is over
      const i = Math.max(0, Math.floor(f)), k = clamp(f - i, 0, 1);
      const gx = p[i * 3] + (p[i * 3 + 3] - p[i * 3]) * k;
      const gy = p[i * 3 + 1] + (p[i * 3 + 4] - p[i * 3 + 1]) * k;
      const pw = PLAYER_W * TS, ph = PLAYER_H * TS;
      ghostCv.width = Math.ceil(pw);
      ghostCv.height = Math.ceil(ph);
      const g = ghostCv.getContext("2d");
      drawPlayer(g, 0, 0, ghostCv.width, ghostCv.height, 0, hero);
      g.globalCompositeOperation = "source-atop";
      g.fillStyle = "rgba(90, 180, 255, 0.75)";
      g.fillRect(0, 0, ghostCv.width, ghostCv.height);
      ctx.save();
      ctx.globalAlpha = 0.55;
      ctx.shadowColor = "#7fd0ff";
      ctx.shadowBlur = 16;
      ctx.translate((gx + PLAYER_W / 2 - camX) * TS, (gy + PLAYER_H / 2) * TS);
      ctx.rotate(p[i * 3 + 2]);
      ctx.drawImage(ghostCv, -pw / 2, -ph / 2);
      ctx.restore();
    };

    // Badge Master's golden crown, turning with the player
    const crownOn = window.BDBadges.has("master");
    const drawCrown = (angle, pw, ph) => {
      if (!crownOn) return;
      const u = pw / 7;
      ctx.save();
      ctx.translate((player.x + PLAYER_W / 2 - camX) * TS, (player.y + PLAYER_H / 2) * TS);
      ctx.rotate(angle);
      const top = -ph / 2 - u * 3;
      ctx.fillStyle = "#ffd54a";
      ctx.fillRect(-u * 2.5, top + u * 1.5, u * 5, u * 1.5);
      for (const x of [-2.5, -0.5, 1.5]) ctx.fillRect(x * u, top, u, u * 1.5);
      ctx.fillStyle = "#e53935";
      ctx.fillRect(-u * 0.5, top + u * 1.8, u, u * 0.9);
      ctx.fillStyle = "#fff6c2";
      ctx.fillRect(-u * 2.5, top + u * 1.5, u * 5, u * 0.35);
      ctx.restore();
    };

    // The pet runs where you were a moment ago, so it jumps when you jump.
    const drawPet = () => {
      const sp = pet && Art.SPRITES[pet];
      if (!sp || trail.length < 2) return;
      const sw = sp.width || sp.naturalWidth, sh = sp.height || sp.naturalHeight;
      const h = TS * 0.6, w = (h * sw) / sh;
      const fly = FLYING_PETS.includes(petBase);
      const lift = fly ? TS * (0.55 + 0.08 * Math.sin(time * 6)) : 0;
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(sp, (trail[0] + PLAYER_W / 2 - camX) * TS - w / 2 - TS * 0.3,
        (trail[1] + PLAYER_H) * TS - h - lift, w, h);
      ctx.restore();
    };

    // The player flashing red as they tip over, the way a beaten mob does.
    // Tinted on a scratch canvas so only the player's own pixels turn red.
    const hurtCv = el("canvas");
    const drawHurtPlayer = (cx, cy, pw, ph, angle) => {
      hurtCv.width = Math.ceil(pw);
      hurtCv.height = Math.ceil(ph);
      const h = hurtCv.getContext("2d");
      drawPlayer(h, 0, 0, hurtCv.width, hurtCv.height, 0, hero);
      h.globalCompositeOperation = "source-atop";
      h.fillStyle = "rgba(255, 40, 40, 0.55)";
      h.fillRect(0, 0, hurtCv.width, hurtCv.height);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle);
      ctx.drawImage(hurtCv, -pw / 2, -ph / 2);
      ctx.restore();
    };

    const drawBoss = () => {
      const b = boss;
      const px = TS * BOSS_PX;
      if (state === "cut" && cutT < 2.6) {
        const d = dragonAt();
        // once it's been hit it shakes and flickers
        const hit = cutT > 1.8;
        ctx.save();
        if (hit && Math.sin(time * 50) > 0) ctx.globalAlpha = 0.45;
        const flap = 1 + Math.sin(time * 14) * 0.12;
        Art.drawSprite(ctx, "dragon", (d.x - camX) * TS + (hit ? Math.sin(time * 70) * 5 : 0),
          d.y * TS + (1 - flap) * 9 * px, 32 * px, 18 * px * flap);
        ctx.restore();
      }
      if (b.gone || (state === "cut" && cutT < 2.8)) return;
      const walking = state === "cut" && cutT < 4.4;
      const bob = walking ? Math.abs(Math.sin(time * 9)) * -5 : Math.sin(time * 3) * 2;
      const shake = state === "bossdown" ? Math.sin(time * 80) * 5 : 0;
      ctx.save();
      if (state === "cut") ctx.globalAlpha = clamp((cutT - 2.8) / 0.9, 0, 1);
      else if (state === "bossdown") ctx.globalAlpha = clamp(1.2 - downT / 1.8, 0, 1);
      else if (b.hurtT > 0 && Math.sin(time * 40) > 0) ctx.globalAlpha = 0.35;
      Art.drawSprite(ctx, "boss", (b.x - camX) * TS + shake, BOSS_TOP * TS + bob, 24 * px, 32 * px);
      ctx.restore();

      for (const r of b.rain) {
        // a red mark on the floor shows where each one will land
        ctx.fillStyle = "rgba(255, 60, 60, 0.55)";
        ctx.fillRect((r.x - camX) * TS, (H - 1) * TS - 5, TS, 5);
        drawTile(ctx, "t", (r.x - camX) * TS, r.y * TS, TS, time, false);
      }
    };

    const drawBossHud = () => {
      const b = boss;
      ctx.textBaseline = "top";
      if (state === "cut") {
        if (cutT > 4.2) {
          ctx.fillStyle = "#ff6b6b";
          ctx.font = "bold 54px ui-monospace, monospace";
          ctx.textAlign = "center";
          ctx.fillText("TNT MECH", canvas.width / 2, 150);
        }
        ctx.fillStyle = "rgba(255,255,255,0.7)";
        ctx.font = "bold 16px ui-monospace, monospace";
        ctx.textAlign = "right";
        ctx.fillText("jump to skip ▶", canvas.width - 16, canvas.height - 28);
        return;
      }
      if (b.gone) return;
      // health: one chunk per stomp it can still take
      ctx.font = "bold 18px ui-monospace, monospace";
      ctx.textAlign = "right";
      ctx.fillStyle = "#ffffff";
      const bx = canvas.width / 2 - bossMax * 32;
      ctx.fillText("TNT MECH", bx - 10, 14);
      for (let i = 0; i < bossMax; i++) {
        ctx.fillStyle = "#1c1c1c";
        ctx.fillRect(bx + i * 64, 12, 60, 20);
        ctx.fillStyle = i < b.hp ? "#e04a2f" : "#4a4a4a";
        ctx.fillRect(bx + i * 64 + 3, 15, 54, 14);
      }
      if (state !== "run") return;
      ctx.textAlign = "center";
      ctx.font = "bold 22px ui-monospace, monospace";
      ctx.fillStyle = ["#ff8a80", "#8ff09a", "#ffd54a"][b.stage];
      ctx.fillText(["TNT RAIN! Dodge!", "CLIMB UP! Stomp its head!", "SHOOTER ARM! Dodge!"][b.stage] +
        "  " + Math.ceil(b.t), canvas.width / 2, 42);
    };

    const drawDialog = () => {
      const pad = 22, bw = canvas.width - 120, x0 = 60;
      ctx.font = "bold 24px ui-monospace, monospace";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      const lines = [];
      let line = "";
      for (const word of String(talk).split(/\s+/)) {
        const tryLine = line ? line + " " + word : word;
        if (line && ctx.measureText(tryLine).width > bw - pad * 2) { lines.push(line); line = word; }
        else line = tryLine;
      }
      if (line) lines.push(line);
      const bh = pad * 2 + lines.length * 32 + 26;
      const y0 = 24; // up top, so it never covers the player standing on the ground
      ctx.fillStyle = "rgba(20, 20, 28, 0.92)";
      ctx.fillRect(x0, y0, bw, bh);
      ctx.strokeStyle = "#ffd54a";
      ctx.lineWidth = 4;
      ctx.strokeRect(x0, y0, bw, bh);
      ctx.fillStyle = "#ffffff";
      lines.forEach((l, i) => ctx.fillText(l, x0 + pad, y0 + pad + i * 32));
      if (Math.sin(time * 5) > -0.3) {
        ctx.fillStyle = "#ffd54a";
        ctx.font = "bold 16px ui-monospace, monospace";
        ctx.textAlign = "right";
        ctx.fillText("▶ jump to carry on", x0 + bw - pad, y0 + bh - pad - 8);
      }
    };

    const render = () => {
      drawBackground();
      showBoost();

      const startX = Math.max(0, Math.floor(camX) - 1);
      const endX = Math.min(width - 1, Math.ceil(camX + VIEW_COLS) + 1);
      for (let x = startX; x <= endX; x++) {
        for (let y = 0; y < H; y++) {
          const ch = grid[y][x];
          if (isDoor(ch)) {
            Art.drawSprite(ctx, ch, (x - camX) * TS, (y - 1) * TS, TS, TS * 2);
          } else if (isOpenDoor(ch)) {
            const t = clamp((time - (doorT[noteKey(x, y)] || 0)) / DOOR_SWING, 0, 1);
            const px = (x - camX) * TS, top = (y - 1) * TS;
            ctx.save();
            if (ch[1] === "\u0184") {
              // the Mechanical door splits in half: the top slides up and the
              // bottom slides down, each into its own square, leaving a sliver
              const shift = TS * 0.85 * t;
              const sp = Art.SPRITES[ch[1]];
              const half = (sp.height || sp.naturalHeight) / 2, sw = sp.width || sp.naturalWidth;
              ctx.imageSmoothingEnabled = false;
              for (const [cy, src, dy] of [[top, 0, -shift], [top + TS, half, shift]]) {
                ctx.save();
                ctx.beginPath();
                ctx.rect(px, cy, TS, TS);
                ctx.clip();
                ctx.drawImage(sp, 0, src, sw, half, px, cy + dy, TS, TS);
                ctx.restore();
              }
            } else {
              // the others swing open on their left hinge: squeeze to a thin edge
              ctx.globalAlpha = 1 - 0.25 * t;
              Art.drawSprite(ctx, ch[1], px, top, TS * (1 - 0.82 * t), TS * 2);
            }
            ctx.restore();
          } else if (isLogged(ch)) {
            drawTile(ctx, "L", (x - camX) * TS, y * TS, TS, time, false);
            const own = looks[noteKey(x, y)];
            drawTile(ctx, own && baseOf(own) === ch[1] ? own : ch[1], (x - camX) * TS, y * TS, TS, time, false);
          } else if (ch !== AIR && ch !== "P" && !isHidden(ch)) {
            let key = ch === FLOWED ? "L" : overOf(ch) || ch;
            if (ch === "W" && !eyeOpen({ x, ph: (x * 0.37) % WATCH_CYCLE })) key = "watcherClosed";
            // still the block it started as (not blown up, switched on or grown over)? use its own look
            const own = looks[noteKey(x, y)];
            if (own && key === ch && baseOf(own) === ch) key = own;
            const shut = ch === "G" && framesLeft > 0;
            if (shut) ctx.globalAlpha = 0.35;
            drawTile(ctx, key, (x - camX) * TS, y * TS, TS, time,
              y > 0 && isSolid(grid[y - 1][x]));
            if (shut) ctx.globalAlpha = 1;
          }
        }
      }

      for (const w of watchers) {
        if (w.x >= startX - 4 && w.x <= endX + 4) drawCone(ctx, grid, w.x, w.y, TS, -camX * TS, eyeOpen(w));
      }

      // the next block of lava oozing out of each active source
      for (const m of movers) {
        if (!m.active || m.done) continue;
        const next = m.tip + m.dir;
        const there = next >= 0 && next < H ? grid[next][m.x] : null;
        const plant = there !== null && LOGGABLE.includes(baseOf(there));
        if (there !== AIR && !plant) continue;
        const h = TS * m.t;
        const y = m.dir < 0 ? (next + 1) * TS - h : next * TS;
        ctx.save();
        ctx.beginPath();
        ctx.rect((m.x - camX) * TS, y, TS, h);
        ctx.clip();
        drawTile(ctx, "L", (m.x - camX) * TS, next * TS, TS, time, false);
        ctx.restore();
        // lava oozing into a plant's square goes behind it, so draw the plant again on top
        if (plant) {
          const own = looks[noteKey(m.x, next)];
          drawTile(ctx, own && baseOf(own) === there ? own : there, (m.x - camX) * TS, next * TS, TS, time, false);
        }
      }
      for (const b of bullets) {
        const bs = TS * 0.55;
        ctx.save();
        ctx.translate((b.x - camX) * TS, b.y * TS);
        ctx.rotate(time * 6);
        drawTile(ctx, "bullet", -bs / 2, -bs / 2, bs, time, false);
        ctx.restore();
      }

      for (const m of mobs) {
        // a corrupted watcher flickers sideways now and then
        const jit = m.kind === "Q" && Math.sin(time * 37 + m.x) > 0.8 ? TS * 0.12 : 0;
        Art.drawSprite(ctx, m.look || m.kind, (m.x - camX) * TS - TS * 0.05 + jit, (m.y + MOB_H - 2) * TS,
          TS * 0.9, TS * 2);
        if (m.awake && m.kind !== "N") {
          ctx.fillStyle = "#ff4f6b";
          ctx.font = "bold 20px ui-monospace, monospace";
          ctx.textAlign = "center";
          ctx.textBaseline = "bottom";
          ctx.fillText("!", (m.x + MOB_W / 2 - camX) * TS, m.y * TS - 2);
        }
      }

      if (boss) drawBoss();

      for (const bz of blazes) {
        const bs = TS * 0.8;
        const px = (bz.x - camX) * TS, py = bz.y * TS;
        // rods spinning around the head, in two rings like the real thing
        for (let i = 0; i < 6; i++) {
          const a = time * (i < 3 ? 2.5 : -2) + (i % 3) * (Math.PI * 2 / 3);
          const rr = TS * (i < 3 ? 0.55 : 0.4);
          ctx.fillStyle = i % 2 ? "#f0a020" : "#ffd54a";
          ctx.fillRect(px + Math.cos(a) * rr - TS * 0.06, py + TS * (i < 3 ? 0.05 : 0.35) +
            Math.sin(a) * rr * 0.3 - TS * 0.14, TS * 0.12, TS * 0.28);
        }
        drawTile(ctx, "blaze", px - bs / 2, py - bs / 2, bs, time, false);
      }
      for (const fb of fireballs) {
        const fs = TS * 0.5;
        ctx.save();
        ctx.translate((fb.x - camX) * TS, fb.y * TS);
        ctx.rotate(time * 8);
        drawTile(ctx, "fireball", -fs / 2, -fs / 2, fs, time, false);
        ctx.restore();
      }

      if (state !== "dead" && flying) {
        const ws = TS * 1.5;
        const flap = Math.sin(time * (holding ? 22 : 8)) * TS * 0.08;
        drawTile(ctx, "wingsWorn",
          (player.x + PLAYER_W / 2 - camX) * TS - ws / 2,
          (player.y + PLAYER_H * 0.45) * TS - ws / 2 + flap, ws, time, false);
      }
      if (state === "dead") {
        const cx = (player.x + PLAYER_W / 2 - camX) * TS, cy = (player.y + PLAYER_H / 2) * TS;
        const pw = PLAYER_W * TS, ph = PLAYER_H * TS;
        if (deathKind === "burn") {
          // the player fades away inside a flame instead of blowing up
          const k = clamp(deadT / 0.7, 0, 1);
          ctx.save();
          ctx.globalAlpha = 1 - k;
          drawPlayer(ctx, cx - pw / 2, cy - ph / 2, pw, ph, rot, hero);
          ctx.globalAlpha = clamp((0.9 - deadT) / 0.2, 0, 1);
          const fs = TS * (1.1 + 0.5 * k);
          drawTile(ctx, "F", cx - fs / 2, (player.y + PLAYER_H) * TS - fs, fs, time, false);
          ctx.restore();
        } else if (deathKind === "poof" && deadT < POOF_AFTER) {
          drawHurtPlayer(cx, cy, pw, ph, (deadT / POOF_AFTER) * Math.PI / 2);
        }
      }
      drawGhost();
      drawPet();
      if (state !== "dead") {
        const k = warp ? clamp((warp.t / WARP_TIME - 0.7) / 0.3, 0, 1) : 1;
        if (k > 0) {
          const pw = PLAYER_W * TS * k, ph = PLAYER_H * TS * k;
          drawPlayer(ctx, (player.x + PLAYER_W / 2 - camX) * TS - pw / 2,
            (player.y + PLAYER_H / 2) * TS - ph / 2, pw, ph, rot, hero);
          if (window.BDBadges.has("master")) drawCrown(rot, pw, ph);
          // sword in hand for the boss fight
          if (inBoss && sword) {
            drawTile(ctx, SWORDS[sword].key, (player.x + PLAYER_W * 0.55 - camX) * TS,
              (player.y - 0.05) * TS, TS * 0.75, 0, false);
          }
          // the shield's bubble, blinking as it runs out
          if (shieldT > 0 && (shieldT > 0.6 || Math.floor(time * 12) % 2)) {
            ctx.strokeStyle = "#9cc4ff";
            ctx.lineWidth = 4;
            ctx.strokeRect((player.x - 0.15 - camX) * TS, (player.y - 0.15) * TS,
              (PLAYER_W + 0.3) * TS, (PLAYER_H + 0.3) * TS);
          }
        }
      }

      for (const p of particles) {
        ctx.globalAlpha = clamp(p.life, 0, 1);
        ctx.fillStyle = p.c;
        const ps = TS * (p.s || 0.16);
        ctx.fillRect((p.x - camX) * TS, p.y * TS, ps, ps);
      }
      ctx.globalAlpha = 1;

      if (warp) {
        ctx.fillStyle = "rgba(150, 80, 230, " + (0.35 * Math.sin(Math.PI * clamp(warp.t / WARP_TIME, 0, 1))).toFixed(3) + ")";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      if (effect) {
        ctx.fillStyle = effect === "fast" ? "#ffd54a" : "#c9c9d6";
        ctx.font = "bold 26px ui-monospace, monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillText(effect === "fast" ? "⚡ FAST!" : "🥀 SLOW…", canvas.width / 2, 16);
      }
      if (flying && state === "run") {
        const y = effect ? 52 : 16;
        ctx.fillStyle = "#e2dcf2";
        ctx.font = "bold 26px ui-monospace, monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillText("🪽 FLY! hold jump", canvas.width / 2, y);
      }

      if (boss) drawBossHud();

      if (state === "run" && (stopT > 0 || (free && !boss))) {
        const y = 16 + (effect ? 36 : 0) + (flying ? 36 : 0);
        ctx.fillStyle = stopT > 0 ? "#ff8a80" : "#8ff09a";
        ctx.font = "bold 26px ui-monospace, monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillText(stopT > 0 ? "✋ STOP " + stopT.toFixed(1) : "◀ FREE MOVE ▶", canvas.width / 2, y);
      }

      if (state === "talk") drawDialog();

      if (state === "dead") {
        ctx.fillStyle = "rgba(0,0,0,0.35)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        if (deathKind === "boom" || deathKind === "megaboom") {
          drawExplosion(ctx,
            (player.x + PLAYER_W / 2 - camX) * TS,
            (player.y + PLAYER_H / 2) * TS,
            TS * (deathKind === "megaboom" ? 6.5 : 3.2), deadT);
        }
        ctx.fillStyle = "#ff6b6b";
        ctx.font = "bold 46px ui-monospace, monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText({ burn: "BURNED!", delete: "DELETED!", poof: "POOF!", megaboom: "MEGA BOOM!" }[deathKind] || "BOOM!",
          canvas.width / 2, canvas.height / 2);
      }
    };

    // --- loop ---
    const STEP = 1 / 120;
    let acc = 0;
    let last = performance.now();
    let raf = null;
    let running = true;

    const loop = (now) => {
      if (!running) return;
      let dt = (now - last) / 1000;
      last = now;
      if (dt > 0.1) dt = 0.1;
      acc += dt;
      let guard = 0;
      while (acc >= STEP && guard++ < 30) { update(STEP); afterStep(); acc -= STEP; }
      render();
      window.BDMusic.boss(inBoss && state !== "win");
      raf = requestAnimationFrame(loop);
    };

    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
      if (run && endRun(false)) ghostBonus();
      window.BDMusic.boss(false);
      window.BDMusic.level(null);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };

    const onKeyDown = (e) => {
      if (e.key === " " || e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
        e.preventDefault();
        if (e.repeat || holding) return;
        if (!pressJump()) holding = true;
      } else if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
        moveL = true;
      } else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
        moveR = true;
      } else if (e.key === "r" || e.key === "R") {
        reset(true);
      } else if (e.key === "Shift") {
        boost();
      }
    };
    const onKeyUp = (e) => {
      if (e.key === " " || e.key === "ArrowUp" || e.key === "w" || e.key === "W") holding = false;
      else if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") moveL = false;
      else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") moveR = false;
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    const press = (e) => { e.preventDefault(); if (!pressJump()) holding = true; };
    const hold = (btn, set) => {
      btn.addEventListener("pointerdown", (e) => { e.preventDefault(); set(true); });
      for (const ev of ["pointerup", "pointercancel", "pointerleave"]) btn.addEventListener(ev, () => set(false));
    };
    hold(leftBtn, (v) => { moveL = v; });
    hold(rightBtn, (v) => { moveR = v; });
    const release = () => { holding = false; };
    canvas.addEventListener("pointerdown", press);
    canvas.addEventListener("pointerup", release);
    canvas.addEventListener("pointercancel", release);
    jumpBtn.addEventListener("pointerdown", press);
    jumpBtn.addEventListener("pointerup", release);
    jumpBtn.addEventListener("pointercancel", release);
    boostBtn.addEventListener("pointerdown", (e) => { e.preventDefault(); boost(); });

    reset();
    loop(performance.now());
  };

  // ---------- go ----------
  showMenu();
})();
