// Block Dash — a blocky platformer with a built-in level editor.
(() => {
  "use strict";

  // ---------- constants ----------

  const H = 12; // the screen's height in blocks, and the shortest a level can be
  const MAX_H = 48; // the tallest a level can be; taller levels scroll up and down
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
    "\u0187": { name: "Glitchy stone", solid: true },
    "\u0188": { name: "Glitchy iron", solid: true },
    "\u0189": { name: "Water" },
    "\u018a": { name: "Iron", solid: true },
    "\u018b": { name: "Fake crash", hidden: true },
    "\u018c": { name: "Auto teleport" },
    "\u018d": { name: "Fall block", solid: true },
    "\u018e": { name: "Push block", solid: true },
    "\u018f": { name: "Shove block", solid: true },
    "\u0190": { name: "Enter" },
    "\u0191": { name: "Enter (done)", solid: true }, // only ever made in play
    "\u0192": { name: "Elevator", solid: true },
    // decorations: you run straight past them (mostly for the background layer)
    "\u0193": { name: "Stone wall" },
    "\u0194": { name: "Wood wall" },
    "\u0195": { name: "Window" },
    "\u0196": { name: "Torch" },
    "\u01a4": { name: "Red flower" },
    "\u01a5": { name: "Yellow flower" },
    "\u01a6": { name: "Blue flower" },
    "\u01a7": { name: "Tulip" },
    "\u01a8": { name: "Slime mob" },
    "\u01a9": { name: "Skeleton" },
    "\u01aa": { name: "TNT Soldier" },
    "\u01ab": { name: "Up elevator", solid: true },
    "\u01ac": { name: "Up elevator (short)", solid: true },
    "\u01ad": { name: "Background change", hidden: true },
    "\u01ae": { name: "Mini game" },
    // Ultra Cat world
    "\u01af": { name: "Cat bed", solid: true },
    "\u01b0": { name: "Scratching post" },
    "\u01b1": { name: "Sleepy cat" },
    "\u01b2": { name: "Cat" },
    "\u01b3": { name: "Wall jump power" },
    "\u01b4": { name: "Nine lives power" },
    "\u01b5": { name: "Fish" },
    "\u01b6": { name: "Yarn ball" },
    "\u01b7": { name: "Cat face block", solid: true },
    "\u01b8": { name: "Carpet", solid: true },
    "\u01b9": { name: "Sofa", solid: true },
    "\u01ba": { name: "Cat tree" },
    "\u01bb": { name: "Cat leaves" },
    "\u01bc": { name: "Box", solid: true },
    "\u01bd": { name: "Cardboard", solid: true },
    "\u01be": { name: "Box (opened)", solid: true }, // only ever made in play
    "\u01bf": { name: "Catnip" },
    "\u01c0": { name: "Giant vacuum cleaner" },
    "\u01c1": { name: "Wallpaper", solid: true },
    "\u01c2": { name: "Diamond block", solid: true },
    "\u01c3": { name: "Gold block", solid: true },
    "\u01c4": { name: "Emerald block", solid: true },
    "\u01c5": { name: "Cat door" },
    // cat tree parts
    "\u01c6": { name: "Cat tree post" },
    "\u01c7": { name: "Cat tree platform", solid: true },
    "\u01c8": { name: "Cat tree cat house", solid: true },
    "\u01c9": { name: "Cat tree base", solid: true },
    "\u01ca": { name: "Cat tree slant /" },
    "\u01cb": { name: "Cat tree slant \\" },
    "\u01cc": { name: "Void block", solid: true },
    "\u01cd": { name: "Harmful void block" },
    "\u01ce": { name: "Fan" }, // where the fan goes, inside the giant vacuum
    // castle (the son's design): concrete in 16 colours, castle blocks, a
    // treasure chest, moving platforms and a grey villager that acts like a zombie
    "\u01d0": { name: "White concrete", solid: true },
    "\u01d1": { name: "Light grey concrete", solid: true },
    "\u01d2": { name: "Grey concrete", solid: true },
    "\u01d3": { name: "Black concrete", solid: true },
    "\u01d4": { name: "Brown concrete", solid: true },
    "\u01d5": { name: "Red concrete", solid: true },
    "\u01d6": { name: "Orange concrete", solid: true },
    "\u01d7": { name: "Yellow concrete", solid: true },
    "\u01d8": { name: "Lime concrete", solid: true },
    "\u01d9": { name: "Green concrete", solid: true },
    "\u01da": { name: "Cyan concrete", solid: true },
    "\u01db": { name: "Light blue concrete", solid: true },
    "\u01dc": { name: "Blue concrete", solid: true },
    "\u01dd": { name: "Purple concrete", solid: true },
    "\u01de": { name: "Magenta concrete", solid: true },
    "\u01df": { name: "Pink concrete", solid: true },
    "\u01e0": { name: "Castle wall", solid: true },
    "\u01e1": { name: "Battlements", solid: true },
    "\u01e2": { name: "Castle window" },
    "\u01e3": { name: "Flag" },
    "\u01e4": { name: "Treasure chest" },
    "\u01e5": { name: "Treasure chest (open)" }, // only ever made in play
    "\u01e6": { name: "Side-to-side platform", solid: true },
    "\u01e7": { name: "Up-and-down platform", solid: true },
    "\u01e8": { name: "Grey villager" },
    "\u01e9": { name: "Flip floor", solid: true },
    "\u01ea": { name: "Flip floor (flipped)" }, // only ever made in play
    "\u01eb": { name: "Tree" },
    "\u01ec": { name: "Vines" },
    "\u01ed": { name: "Tall grass" },
    // wires are solid bars: you can stand on them
    "\u0197": { name: "Red wire", solid: true },
    "\u019d": { name: "Green wire", solid: true },
    "\u019e": { name: "Blue wire", solid: true },
    "\u019f": { name: "Purple wire", solid: true },
    "\u0198": { name: "Button" },
    "\u0199": { name: "Lever" },
    "\u019a": { name: "Lamp", solid: true },
    "\u019b": { name: "Button (pressed)" }, // only ever made in play
    "\u019c": { name: "Lever (on)" }, // only ever made in play
    "\u01a0": { name: "Elevator door", solid: true },
    "\u01a1": { name: "Elevator door (open)" }, // only ever made in play
    "\u01a2": { name: "Zombie trap", solid: true },
    "\u01a3": { name: "Zombie trap (used)", solid: true }, // only ever made in play
  };
  const KEY = "\u0186";
  const DOORS = ["\u0180", "\u0181", "\u0182", "\u0183", "\u0184", "\u0185"];
  const isDoor = (ch) => !!(TILES[ch] && TILES[ch].door);
  // Glitchy stone blinks: there for BLINK_TIME seconds, then gone (you fall
  // through) for the same again. Timed from the (re)start, like the Watchers.
  const GLITCH_STONE = "\u0187";
  const BLINK_TIME = 1;
  const blinkOn = (t) => t % (2 * BLINK_TIME) < BLINK_TIME;
  // Glitchy iron falls once it's on screen and lands as a block again. It
  // doesn't hurt: landing on you pushes you down instead.
  const GLITCH_IRON = "\u0188";
  const FALL_PUSH = 8; // blocks a second, downward
  const FALL_MAX = 2.5; // blocks a second: it floats down gently
  const FALL_ACCEL = 12; // how fast it gets up to that speed
  const ELEVATOR_BOOST = 3.2;
  // Up elevators: when power reaches one, it and every Up elevator block joined
  // to it rise together, once. The plain one rises until it bumps a ceiling;
  // the short one rises the number of blocks set on it in the Level Maker.
  const UP_LIFT = "\u01ab", UP_LIFT_SHORT = "\u01ac";
  const UP_SPEED = 2.5, UP_DEFAULT = 3;
  // Background change block: invisible in play; run through it and the
  // background becomes the one set on it in the Level Maker.
  const BG_CHANGE = "\u01ad";
  // Mini game block: touch it and you're taken to the level's mini game arena
  // against a second player (same keyboard: you W A D, them the arrows) or the
  // computer. Lasers or meteors come down; last one standing wins.
  const MINIGAME = "\u01ae";
  const MINI_GAMES = [["laser", "⚡ Laser dodge"], ["meteor", "☄️ Meteor dodge"], ["pvp", "⚔️ PvP"]];
  const MINI_OPPS = [["cpu", "🤖 Computer"], ["2p", "👥 Player 2 (arrow keys)"]];
  const MINI_DEFAULT = "laser:cpu";
  // A Mini game block is 2x2 squares showing one big picture. Each square works
  // out which quarter it is by counting Mini game squares to its left and above.
  const miniQuarter = (g, x, y) => {
    let l = 0, u = 0;
    while (x - l - 1 >= 0 && baseOf(g[y][x - l - 1]) === MINIGAME) l++;
    while (y - u - 1 >= 0 && baseOf(g[y - u - 1][x]) === MINIGAME) u++;
    return [l % 2, u % 2];
  };
  // the four squares of the Mini game block at (x, y)
  const miniGroup = (g, x, y) => {
    const [qx, qy] = miniQuarter(g, x, y);
    const out = [];
    for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
      const gx = x - qx + dx, gy = y - qy + dy;
      if (g[gy] && baseOf(g[gy][gx]) === MINIGAME) out.push([gx, gy]);
    }
    return out;
  };
  const drawMiniQuarter = (ctx, g, x, y, px, py, ts) => {
    const [qx, qy] = miniQuarter(g, x, y);
    ctx.save();
    ctx.beginPath(); ctx.rect(px, py, ts, ts); ctx.clip();
    Art.drawSprite(ctx, MINIGAME, px - qx * ts, py - qy * ts, ts * 2, ts * 2);
    ctx.restore();
  }; // hold jump while riding an elevator: this many times faster
  // Water: you sink slowly, each jump press is a swim stroke up, and you keep
  // running forward, just slower. Near the surface a press jumps you out.
  const WATER = "\u0189";
  const IRON = "\u018a";
  // The fake crash block: touch it and the game pretends to crash. Reload
  // takes you to the level's crash arena, where the Galactic Monstrosity fires
  // ender bullets until you escape through an End portal, which wins the level.
  const CRASH = "\u018b";
  const GALAXY_SHOOT = 1; // seconds between ender bullets
  const GALAXY_W = 7.5, GALAXY_H = 6; // the Galactic Monstrosity's size, in blocks: half the screen tall
  const ENDER_BULLET_SPEED = 6;
  const GALAXY_LOOK = "playerGalaxy"; // the skin you unlock by escaping
  // Auto teleport: touch one and you zoom to the nearest one further ahead
  // (no jump needed, unlike Blink). Falling blocks riding into one go too.
  const TELEPORT = "\u018c";
  // Fall block: stand on it and it carries you down, then stops.
  const ELEVATOR = "\u018d";
  // Elevator: like the Fall block but always on: it starts down by itself as
  // soon as it's on screen, rider or not, and stops at the bottom (or zooms
  // on through an Auto teleport). You wait on it while it moves.
  const LIFT = "\u0192";
  // Elevator door: falls with the Elevator blocks, shut (solid) the whole
  // way, and slides open once everything near it has landed.
  const ELEV_DOOR = "\u01a0", ELEV_DOOR_OPEN = "\u01a1"; // two squares tall, like the doors
  // Push and Shove blocks: run into one and a Push block slides ahead of you
  // (and you stop, not explode, if it's stuck); a Shove block slides up to
  // SHOVE_DIST blocks by itself. Both fall down holes. Push one into an Enter
  // and the Enter turns green; when every Enter is green, you win.
  const PUSH = "\u018e", SHOVE = "\u018f", ENTER = "\u0190", ENTER_DONE = "\u0191";
  const SHOVE_DIST = 4;
  // Power: Buttons (run over one) and Levers (touch one) switch on for good,
  // and so does a green Enter. Power runs along Wires that touch side by side,
  // and opens any door, or lights any Lamp, touching a powered wire or source.
  const WIRE = "\u0197", BUTTON = "\u0198", LEVER = "\u0199", LAMP = "\u019a";
  // Zombie trap: when power reaches it, the screen flashes red and you're
  // whisked to a plains biome, where a zombie drops out of a portal in the sky.
  // You have ZOMBIE_LIVES hits; stomp it ZOMBIE_HP times to win and go back.
  const ZOMBIE_TRAP = "\u01a2", ZOMBIE_TRAP_USED = "\u01a3";
  const ZOMBIE_LIVES = 4, ZOMBIE_HP = 3, ZOMBIE_SPEED = 2.2;
  // Wires come in four colours, each its own circuit: power only passes
  // between wires of the same colour (any source powers any colour touching it).
  const WIRES = [WIRE, "\u019d", "\u019e", "\u019f"]; // red, green, blue, purple
  const isWire = (ch) => WIRES.includes(baseOf(ch));
  const BUTTON_ON = "\u019b", LEVER_ON = "\u019c";
  // Critters: mobs that come alive once they're on screen. Slimes hop at you
  // and split when stomped (big, medium, tiny); Skeletons walk at you shooting
  // arrows; TNT Soldiers march up quietly, fizz, and blow up. Stomp any of them.
  const SLIME_MOB = "\u01a8", SKELETON = "\u01a9", TNT_SOLDIER = "\u01aa";
  // Ultra Cat world (the son's design): a bouncy cat bed, a scratching post you
  // climb, cats that never hurt you, two cat powers, and fish and yarn to collect.
  const CAT_BED = "\u01af", SCRATCH_POST = "\u01b0", SLEEPY_CAT = "\u01b1", CAT_MOB = "\u01b2";
  const WALL_JUMP = "\u01b3", NINE_LIVES = "\u01b4", FISH = "\u01b5", YARN = "\u01b6";
  const CAT_BLOCKS = ["\u01b7", "\u01b8", "\u01b9"]; // cat face, carpet, sofa: just for building
  const CAT_MOBS = [SLEEPY_CAT, CAT_MOB];
  const CAT_LEAVES = "\u01bb";
  // Cat tree parts: the post and the two slants are climbed; the platform,
  // the cat house and the base are solid
  const TREE_PARTS = ["\u01c6", "\u01c7", "\u01c8", "\u01c9", "\u01ca", "\u01cb"];
  const CLIMBABLE = [SCRATCH_POST, CAT_LEAVES, "\u01c6", "\u01ca", "\u01cb"]; // touch one and you climb straight up
  // Land on a Box and you jump inside it: the level's Box arena, inside a
  // cardboard box. Climb out of the top and you pop back out on the box.
  const BOX = "\u01bc", CARDBOARD = "\u01bd", BOX_OPEN = "\u01be";
  // Catnip: zoomies, mega jumps and a wobbly rainbow screen, all at once
  const CATNIP = "\u01bf", NIP_TIME = 6, NIP_JUMP = 1.3;
  // A giant vacuum cleaner, as tall as the screen, rolls after you (straight
  // through blocks, it's too big to stop), faster and faster, and sucks you in
  const VACUUM = "\u01c0", VAC_SIZE = 9, VAC_PULL = 7, VAC_REACH = 14; // 9 tall: room above it to stomp from
  const WALLPAPER = "\u01c1";
  // Cat door: inside a Box, click it while you're next to it to pop back out
  // on top of the box (a way out besides the top)
  const CAT_DOOR = "\u01c5", DOOR_REACH = 2.5;
  // Void block: solid, looks like empty space. Harmful void: touch it, you're out.
  const VOID = "\u01cc", HARM_VOID = "\u01cd";
  const FAN = "\u01ce"; // Inside the vacuum tab: a big spinning fan here
  // Concrete comes in 16 colours, all under one "Concrete ▾" palette button
  const CONCRETES = Array.from({ length: 16 }, (_, i) => String.fromCharCode(0x1d0 + i));
  const CONCRETE_PICK = "\u01cf"; // the palette button (not a block)
  const CASTLE_WALL = "\u01e0", BATTLEMENTS = "\u01e1", CASTLE_WINDOW = "\u01e2", FLAG = "\u01e3";
  const CHEST = "\u01e4", CHEST_OPEN = "\u01e5";
  // Moving platforms: one square a PLAT_STEP, up to PLAT_RANGE squares, then
  // back; anything standing on one rides along
  const PLAT_SIDE = "\u01e6", PLAT_UPDOWN = "\u01e7", PLAT_STEP = 0.35, PLAT_RANGE = 4;
  // Grey villager: walks after you like the zombie; VILLAGER_HP stomps
  const VILLAGER = "\u01e8", VILLAGER_SPEED = 1.6, VILLAGER_HP = 3;
  // Flip floor (a castle trap, the son's idea): looks like floor; stand on it
  // and it wobbles for FLIP_WOBBLE, flips open for FLIP_OPEN (you fall
  // through), then flips back
  const FLIP = "\u01e9", FLIPPED = "\u01ea", FLIP_WOBBLE = 0.35, FLIP_OPEN = 1.6;
  // Decorations: a big tree drawn TREE_W wide and TREE_H tall from one square,
  // hanging vines and tall grass
  const TREE = "\u01eb", TREE_W = 3, TREE_H = 4, VINES = "\u01ec", TALL_GRASS = "\u01ed";
  // The giant vacuum is a boss (the son's design), fought right in the level.
  // Three stages, round and round: 1, it rolls after you and sucks (catch you
  // and you're INSIDE it: press jump VAC_ESCAPE times to pop out of its
  // nozzle); 2, its battery runs out and platforms appear beside it: stomp
  // its top; 3, it shoots dirt. VAC_HP stomps beat it.
  // Inside it you have VAC_FAN seconds to get out, or the fan gets you.
  const VAC_SUCK = 6, VAC_LOW = 7, VAC_DIRT = 5, VAC_HP = 3, VAC_ESCAPE = 30, VAC_FAN = 8;
  const SHINY_BLOCKS = ["\u01c2", "\u01c3", "\u01c4"]; // diamond, gold and emerald blocks: just for building
  const CAT_BED_BOUNCE = 1.42; // times a jump's speed: twice as high
  const CLIMB_V = 5, CAT_SPEED = 1.2;
  const NINE_SAFE = 1.2; // seconds you can't be hurt again after a life saves you
  const CRITTERS = [SLIME_MOB, SKELETON, TNT_SOLDIER, ...CAT_MOBS, VACUUM, VILLAGER];
  const SLIME_SIZES = [null, [0.55, 0.45], [0.9, 0.75], [1.4, 1.1]]; // tiny, medium, big: [w, h]
  const SKELETON_SPEED = 1.5, SKELETON_SHOOT = 2, ARROW_SPEED = 8;
  const SOLDIER_SPEED = 1.8, SOLDIER_FUSE = 1.2, SOLDIER_BLAST = 2.2;
  const HEALTH_MAX = 4, HURT_SAFE = 1.2; // your health against them, and the safe moment after a hit
  const makeCritter = (ch, x, y) => {
    const kind = baseOf(ch);
    const [w, h] = kind === SLIME_MOB ? SLIME_SIZES[3] : kind === SKELETON ? [0.8, 1.8] : CAT_MOBS.includes(kind) ? [1, 0.75] : kind === VACUUM ? [VAC_SIZE, VAC_SIZE] : kind === VILLAGER ? [0.8, 1.8] : [0.8, 1.6];
    return { kind, ch, x: x + (1 - w) / 2, y: y + 1 - h, w, h, vy: 0, vx: 0, onGround: false, awake: false,
      size: 3, t: 0.6, fuse: 0, shootT: 1, gone: false,
      mood: kind === SLEEPY_CAT ? "sleep" : "walk", face: -1, meowT: 0, step: 0, spd: 1.5, hp: VILLAGER_HP, hurtT: 0 };
  };
  const FLOWERS = ["\u01a4", "\u01a5", "\u01a6", "\u01a7"]; // red, yellow, blue, tulip
  const DECOR = ["\u0193", "\u0194", "\u0195", "\u0196", ...FLOWERS, "\u01ba", "\u01e2", "\u01e3", "\u01eb", "\u01ec", "\u01ed"];
  // The background layer: blocks drawn darker behind the level, just for
  // looks. Nothing in it is solid or does anything. These can't go in it.
  const BACK_HIDE = "PKOMhCGE" + CRASH;
  const BLOCK_STEP = 0.06; // seconds for a pushed, shoved or dropping block to move one square
  const GALAXY_KEY = "blockdash_galaxy"; // "1" once you've escaped: armor and the skin are yours
  const galaxyWon = () => {
    try { return localStorage.getItem(GALAXY_KEY) === "1"; } catch (e) { return false; }
  };
  const WATER_GRAVITY = 15; // blocks a second, every second (out of water it's GRAVITY)
  const SINK_MAX = 3;
  const SWIM_V = 6.5;
  const WATER_SLOW = 0.6; // of your usual speed
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
    "W", "Y", "V", "Q", "N", "I", "C", "d", "+", "$", "@", "r", "9", "o", "H", "R", "b", "%", "w", "f", "K", "O", "M", "E", "G", "J", "B", IRON, GLITCH_STONE, GLITCH_IRON, WATER, CRASH, TELEPORT, ELEVATOR, LIFT, ELEV_DOOR, UP_LIFT, UP_LIFT_SHORT, BG_CHANGE, MINIGAME, CAT_BED, SCRATCH_POST, WALL_JUMP, NINE_LIVES, FISH, YARN, CAT_LEAVES, BOX, CATNIP, WALLPAPER, CARDBOARD, ...CAT_BLOCKS, ...SHINY_BLOCKS, CAT_DOOR, ...TREE_PARTS, VOID, HARM_VOID, FAN, CASTLE_WALL, BATTLEMENTS, CONCRETE_PICK, CHEST, PLAT_SIDE, PLAT_UPDOWN, FLIP, ...CRITTERS, PUSH, SHOVE, ENTER, ...WIRES, BUTTON, LEVER, LAMP, ZOMBIE_TRAP, ...DECOR, ...DOORS, KEY, "P", ERASER];

  // The boss arena is drawn in the same editor as the level, with a slightly
  // different set of blocks: no portals, save points or note-carrying blocks
  // in the arena, and Boss platforms only there.
  const LEVEL_ONLY = "KOMGECHR" + CRASH;
  // the fake crash's arena: like the boss arena, but End portals (the way
  // out) instead of Boss platforms
  const CRASH_HIDE = LEVEL_ONLY.replace("E", "") + "J";
  // the Zombie trap's plains: like an arena, minus Boss platforms
  const PLAINS_HIDE = LEVEL_ONLY + "J";
  const ARENA_ONLY = "J" + "\u01ce"; // the Fan only goes inside the vacuum

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
  // The Glitch (the secret boss): a 2x2 block of broken pixels. Each spot
  // is [left, top], with its top in jumping reach (about 2.4 blocks) of the
  // floor or a platform, so it can always be stomped.
  const GLITCH_SIZE = 2;
  const GLITCH_SPOTS = [[17, 9], [11, 9], [8.5, 4.8], [16.5, 3.5], [4.5, 6.8]];
  const GLITCH_SOLID = 6; // seconds it stays stompable
  const GLITCH_HP = 10; // stomps to beat it; a sword doesn't shorten this one
  const GLITCH_BLOCKS = 5; // squares to fix before it turns solid
  const GLITCH_FIX_TIME = 15; // seconds to fix them all, or they glitch again
  const GLITCH_COLORS = ["#ff2bd6", "#21e6ff", "#111111", "#ffffff", "#7b2bff"];
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
  // Lava touching water (above, below or beside it) turns into stone, like in
  // Minecraft. Returns the squares it changed.
  const NEXT_TO = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const nextToWater = (g, x, y) =>
    NEXT_TO.some(([dx, dy]) => g[y + dy] && baseOf(g[y + dy][x + dx] || AIR) === WATER);
  const quench = (g) => {
    const hit = [];
    for (let y = 0; y < g.length; y++) {
      for (let x = 0; x < g[y].length; x++) {
        const ch = g[y][x];
        const lava = ch === FLOWED || "LUD".includes(baseOf(ch));
        if (lava && nextToWater(g, x, y)) hit.push([x, y]);
      }
    }
    for (const [x, y] of hit) g[y][x] = "s";
    return hit;
  };
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
  const COIN_VALUE = { d: 10, "+": 15, $: 20, [FISH]: 10 };
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
      // songs with their mega upgrade
      songs: Array.isArray(b.songs) ? b.songs.filter((k) => window.BDMusic.SONGS[k] && k !== "off") : [],
      // mega backgrounds bought in the shop
      bgs: Array.isArray(b.bgs) ? b.bgs.filter((k) => window.BDArt.BACKGROUNDS.some((x) => x.mega && x.key === k)) : [],
    };
  };

  const saveBag = (bag) => {
    try { localStorage.setItem(BAG_KEY, JSON.stringify(bag)); } catch (e) { /* ignore */ }
    window.BDBadges.coins(bag.coins);
    window.BDMusic.setUpgrades(bag.songs);
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
    return Array.from({ length: clamp(rows.length, H, MAX_H) }, (_, y) => {
      const row = rows[y] || "";
      return Array.from({ length: width }, (_, x) => {
        const ch = row[x];
        return ch && (TILES[ch] || ch === AIR || isMine(ch)) ? ch : AIR;
      });
    });
  };

  // A layer made the same size as its level: rows are added or cut at the top
  // (the floor stays put), columns at the right.
  const fitLayer = (g, width, height) => {
    const rows = g.length > height ? g.slice(g.length - height)
      : [...Array.from({ length: height - g.length }, () => Array(width).fill(AIR)), ...g];
    return resizeGrid(rows, width);
  };
  const layerRows = (g) => (g.some((r) => r.some((ch) => ch !== AIR)) ? gridToRows(g) : undefined);
  // Draws the background layer's blocks in columns x0..x1 and rows y0..y1,
  // darkened so they sit behind. ox shifts it (the play screen's scroll).
  // a Tree square draws a big tree growing up from it, centred on it
  const drawTree = (ctx, ch, px, py, ts) =>
    Art.drawSprite(ctx, ch, px - ts * (TREE_W - 1) / 2, py - ts * (TREE_H - 1), ts * TREE_W, ts * TREE_H);
  const drawBackLayer = (ctx, g, x0, x1, y0, y1, ts, ox, t) => {
    for (let y = Math.max(0, y0); y <= Math.min(g.length - 1, y1); y++) {
      for (let x = Math.max(0, x0); x <= Math.min(g[0].length - 1, x1); x++) {
        const ch = g[y][x];
        if (ch === AIR) continue;
        const tall = isDoor(ch) || baseOf(ch) === ELEV_DOOR;
        if (baseOf(ch) === TREE) { drawTree(ctx, ch, x * ts + ox, y * ts, ts); continue; }
        if (tall) Art.drawSprite(ctx, ch, x * ts + ox, (y - 1) * ts, ts, ts * 2);
        else drawTile(ctx, overOf(ch) || ch, x * ts + ox, y * ts, ts, t, false);
        ctx.fillStyle = "rgba(0, 0, 0, 0.38)";
        ctx.fillRect(x * ts + ox, (tall ? y - 1 : y) * ts, ts, tall ? ts * 2 : ts);
      }
    }
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

  // The fake crash's arena until someone draws their own: a floor, a start,
  // stone steps and two End portals in front of the Galactic Monstrosity.
  const defaultCrashArena = () => {
    const g = Array.from({ length: H }, (_, y) => Array(ARENA_W).fill(y === H - 1 ? "e" : AIR));
    g[H - 2][2] = "P";
    for (const [x, y] of BOSS_PLATS) g[y][x] = "e";
    g[4][ARENA_W - 10] = "E";
    g[H - 2][ARENA_W - 10] = "E";
    return g;
  };
  // It can be longer than the boss arena (never shorter): the monster waits at the far end.
  const crashArenaGrid = (rows) => {
    if (!Array.isArray(rows) || !rows.length) return defaultCrashArena();
    const g = rowsToGrid(rows.map(String));
    return resizeGrid(g, clamp(g[0].length, ARENA_W, 400));
  };
  // The Zombie trap's plains until someone draws their own: a grassy floor,
  // a start, and a couple of little hills. The zombie's portal opens in the
  // sky at PLAINS_PORTAL. One screen wide, like the boss arena.
  const PLAINS_PORTAL = { x: 15, y: 2 };
  const defaultPlains = () => {
    const g = Array.from({ length: H }, (_, y) => Array(ARENA_W).fill(y === H - 1 ? "g" : AIR));
    for (const [x0, x1, top] of [[6, 8, H - 2], [14, 15, H - 2], [15, 15, H - 3]]) {
      for (let x = x0; x <= x1; x++) for (let y = top; y < H - 1; y++) g[y][x] = "g";
    }
    g[H - 2][2] = "P";
    // flowers grow on the plains
    for (const [x, f] of [[4, 0], [10, 1], [12, 3], [18, 2], [20, 0]]) g[H - 2][x] = FLOWERS[f];
    return g;
  };
  // The Mini game arena until someone draws their own: a floor, two ledges,
  // and the Start (player 2 starts at the mirror spot on the other side).
  const defaultMiniArena = () => {
    const g = Array.from({ length: H }, (_, y) => Array(ARENA_W).fill(y === H - 1 ? "s" : AIR));
    for (const [x0, x1, y] of [[3, 6, H - 5], [ARENA_W - 7, ARENA_W - 4, H - 5], [9, 12, H - 8]]) for (let x = x0; x <= x1; x++) g[y][x] = "s";
    g[H - 2][3] = "P";
    return g;
  };
  // The Box arena until someone builds their own: inside a cardboard box,
  // with steps and a scratching post up to the open top (the way out), and
  // a few fish.
  const defaultBoxArena = () => {
    const g = Array.from({ length: H }, (_, y) => Array(ARENA_W).fill(AIR));
    for (let y = 0; y < H; y++) g[y][0] = g[y][ARENA_W - 1] = CARDBOARD;
    for (let x = 0; x < ARENA_W; x++) g[H - 1][x] = CARDBOARD;
    for (const [x0, y] of [[4, 9], [8, 7], [12, 5], [16, 3]]) {
      for (let x = x0; x < x0 + 3; x++) g[y][x] = CARDBOARD;
      g[y - 1][x0 + 1] = FISH;
    }
    // and an easy way out: a scratching post up the far side, right to the top
    for (let y = 0; y < H - 1; y++) g[y][ARENA_W - 2] = SCRATCH_POST;
    g[H - 2][2] = "P";
    return g;
  };
  const boxArenaGrid = (rows) =>
    (Array.isArray(rows) && rows.length ? resizeGrid(rowsToGrid(rows.map(String)), ARENA_W) : defaultBoxArena());
  // Inside the giant vacuum (what you see while you spam your way out),
  // until someone builds their own: just the fan, in the middle.
  const defaultVacInside = () => {
    const g = Array.from({ length: H }, () => Array(ARENA_W).fill(AIR));
    g[4][Math.floor(ARENA_W / 2)] = FAN;
    return g;
  };
  const vacInsideGrid = (rows) =>
    (Array.isArray(rows) && rows.length ? resizeGrid(rowsToGrid(rows.map(String)), ARENA_W) : defaultVacInside());
  const miniArenaGrid = (rows) =>
    (Array.isArray(rows) && rows.length ? resizeGrid(rowsToGrid(rows.map(String)), ARENA_W) : defaultMiniArena());
  // ----- 🎼 Music Maker -----
  // Songs are built from premade pieces, like a level from blocks: a row of
  // boxes, one bar each, and every box gets a tune piece (moved up or down if
  // you like) and a drum beat. The pieces live in blockdash-music.js (MAKER).
  const SPOOKY_SONGS = ["boss", "nether", "fortress", "spooky", "final", "glitch", "end", "rain"];
  // a song to start from: a tune, the tune again higher, a second tune, a drum
  // roll, and an ending
  const surpriseSong = (mood = "happy", bpm = 128) => {
    const { TUNES } = window.BDMusic.MAKER;
    const lively = ["hop", "rocket", "wave", "fanfare", "shout", "stomp", "jumpy", "twirl", "ding", "parachute"];
    const pick = (list) => list[Math.floor(Math.random() * list.length)];
    const a = pick(lively), b = pick(lively.filter((t) => t !== a)), c = pick(["sparkle", "long", "ding", "twirl"]);
    const beat = mood === "spooky" ? pick(["march", "soft", "rock"]) : pick(["pop", "dance", "rock"]);
    const up = mood === "spooky" ? 3 : 2;
    const slots = [[a, 0], [a, up], [b, 0], [b, -1], [a, 0], [a, up], [c, 0], ["end", 0]]
      .map(([t, p], i) => ({ t, p, b: i === 6 ? "roll" : beat }));
    return { bpm, mood, sound: pick(["beep", "bell", "flute", "buzz"]), slots: slots.filter((x) => TUNES[x.t]) };
  };

  // Its own page. opts.name: show a name box starting with this name.
  // done gets (song, name), or undefined for Cancel; it decides where to go next.
  const openMusicMaker = (start, done, opts = {}) => {
    const Mu = window.BDMusic, { TUNES, BEATS, MOODS, SOUNDS, SLOTS } = Mu.MAKER;
    let song = cleanSong(start) || surpriseSong();
    let sel = 0; // the box new pieces go into
    const history = [];
    const remember = () => { history.push(JSON.stringify(song)); if (history.length > 60) history.shift(); };
    let playing = false;
    Mu.level("off"); // quiet until you press Play
    clear();

    const head = el("div", "row");
    head.appendChild(el("h1", null, "🎼 Music Maker"));
    head.appendChild(el("div", "spacer"));
    const playBtn = el("button", "green", "▶ Play");
    const undoBtn = el("button", "small", "↶ Undo");
    const cancelBtn = el("button", "small", "✖ Cancel");
    const doneBtn = el("button", "green", "✔ Done");
    head.append(playBtn, undoBtn, cancelBtn, doneBtn);
    root.appendChild(head);

    const top = el("div", "panel");
    const nameBox = el("input");
    if (opts.name != null) {
      const nameRow = el("div", "row");
      nameBox.value = opts.name;
      nameBox.maxLength = 30;
      nameRow.append(el("span", "hint", "Song name:"), nameBox);
      top.appendChild(nameRow);
    }
    const choiceRow = (label, table, keyOf, setTo) => {
      const row = el("div", "row tight");
      row.appendChild(el("span", "hint", label));
      for (const [k, v] of Object.entries(table)) {
        const b = el("button", "small" + (keyOf() === k ? " green" : ""), `${v.icon} ${v.name}`);
        b.onclick = () => { remember(); setTo(k); changed(); };
        row.appendChild(b);
      }
      return row;
    };
    const settingsBox = el("div");
    top.appendChild(settingsBox);
    root.appendChild(top);

    const strip = el("div", "panel");
    root.appendChild(strip);
    const palette = el("div", "panel");
    root.appendChild(palette);

    const preview = (slot) => Mu.preview({ bpm: song.bpm, mood: song.mood, sound: song.sound, slots: [slot] });
    const replay = () => { if (playing) Mu.custom(cleanSong(song)); };
    const changed = () => { replay(); draw(); };

    const tuneOf = (k) => (song.tunes && song.tunes[k]) || TUNES[k] || { name: "?", icon: "❓", notes: [] };
    // put one of your piano tunes into the song (it keeps its own copy)
    const useMine = (t) => {
      song.tunes = Object.assign({}, song.tunes, { ["u_" + t.id]: { name: t.name, icon: t.icon, notes: t.notes } });
    };
    const cards = [];
    const drawSettings = () => {
      settingsBox.textContent = "";
      settingsBox.append(
        choiceRow("Mood:", MOODS, () => song.mood, (k) => { song.mood = k; }),
        choiceRow("Sound:", SOUNDS, () => song.sound, (k) => { song.sound = k; }));
      const speedRow = el("div", "row tight");
      const speed = el("input");
      speed.type = "range"; speed.min = "60"; speed.max = "200"; speed.step = "4"; speed.value = String(song.bpm);
      speed.onchange = () => { remember(); song.bpm = +speed.value; replay(); };
      const surprise = el("button", "small", "🎲 Surprise me");
      surprise.onclick = () => { remember(); song = surpriseSong(song.mood, song.bpm); sel = 0; changed(); };
      speedRow.append(el("span", "hint", "Speed: 🐢"), speed, el("span", "hint", "🐇"), el("div", "spacer"), surprise);
      settingsBox.appendChild(speedRow);
    };
    const drawStrip = () => {
      strip.textContent = "";
      strip.appendChild(el("h2", null, "Your song"));
      strip.appendChild(el("p", "hint", "Tap a box, then tap a tune or a beat below to put it in. ⬆ ⬇ move a tune higher or lower."));
      const row = el("div");
      Object.assign(row.style, { display: "flex", flexWrap: "wrap", gap: "8px" });
      cards.length = 0;
      song.slots.forEach((slot, i) => {
        const tune = tuneOf(slot.t), beat = BEATS[slot.b];
        const card = el("div");
        Object.assign(card.style, { position: "relative", width: "112px", padding: "6px 4px", borderRadius: "6px", cursor: "pointer", textAlign: "center",
          background: i === sel ? "#4a3a7a" : "#2c2940", border: i === sel ? "3px solid #ffd54a" : "3px solid #3a3650" });
        const big = el("div", null, tune.icon);
        big.style.fontSize = "30px";
        const nm = el("div", null, tune.name);
        nm.style.fontWeight = "bold";
        const upDown = el("div");
        Object.assign(upDown.style, { display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", margin: "4px 0" });
        const down = el("button", "small", "⬇"), up = el("button", "small", "⬆");
        for (const b of [down, up]) Object.assign(b.style, { padding: "2px 8px", margin: "0", minWidth: "0" });
        const lvl = el("span", "hint", slot.p > 0 ? "+" + slot.p : String(slot.p));
        down.onclick = (e) => { e.stopPropagation(); if (slot.p > -4) { remember(); slot.p--; sel = i; changed(); preview(slot); } };
        up.onclick = (e) => { e.stopPropagation(); if (slot.p < 7) { remember(); slot.p++; sel = i; changed(); preview(slot); } };
        upDown.append(down, lvl, up);
        const bars = Mu.tuneBars(tune);
        if (bars > 1) { card.style.width = `${112 + (bars - 1) * 60}px`; nm.textContent += ` (${bars} bars)`; }
        const bt = el("div", "hint", `${beat.icon} ${beat.name}`);
        const del = el("button", "small", "✖");
        Object.assign(del.style, { position: "absolute", top: "2px", right: "2px", padding: "0 5px", margin: "0", minWidth: "0", fontSize: "11px" });
        del.title = "Take this box out";
        del.onclick = (e) => {
          e.stopPropagation();
          if (song.slots.length <= 1) { toast("A song needs at least one box"); return; }
          remember(); song.slots.splice(i, 1); sel = Math.min(sel, song.slots.length - 1); changed();
        };
        card.append(big, nm, upDown, bt, del);
        card.onclick = () => { sel = i; draw(); preview(slot); };
        cards.push(card);
        row.appendChild(card);
      });
      if (song.slots.length < SLOTS) {
        const add = el("button", "", "➕ Add a box");
        add.style.minHeight = "100px";
        add.onclick = () => {
          remember();
          const copy = Object.assign({}, song.slots[sel] || { t: "hop", p: 0, b: "pop" });
          song.slots.splice(sel + 1, 0, copy);
          sel++;
          changed();
        };
        row.appendChild(add);
      }
      strip.appendChild(row);
    };
    const drawPalette = () => {
      palette.textContent = "";
      const section = (title, table, field) => {
        palette.appendChild(el("h2", null, title));
        const row = el("div", "row tight");
        row.style.flexWrap = "wrap";
        for (const [k, v] of Object.entries(table)) {
          const now = song.slots[sel] && song.slots[sel][field] === k;
          const b = el("button", now ? "green" : "", `${v.icon} ${v.name}`);
          b.onclick = () => {
            const slot = song.slots[sel];
            if (!slot) return;
            remember();
            slot[field] = k;
            changed();
            preview(slot);
          };
          row.appendChild(b);
        }
        palette.appendChild(row);
      };
      section("🎵 Tunes", TUNES, "t");
      // your own tunes from the piano
      palette.appendChild(el("h2", null, "🎹 My tunes"));
      const mine = el("div", "row tight");
      mine.style.flexWrap = "wrap";
      for (const t of loadMyTunes()) {
        const k = "u_" + t.id;
        const now = song.slots[sel] && song.slots[sel].t === k;
        const b = el("button", now ? "green" : "", `${t.icon} ${t.name}`);
        b.onclick = () => {
          const slot = song.slots[sel];
          if (!slot) return;
          remember();
          useMine(t);
          slot.t = k;
          changed();
          preview(slot);
        };
        const edit = el("button", "small", "✏");
        edit.title = "Change this tune on the piano";
        edit.onclick = () => openPiano(t);
        mine.append(b, edit);
      }
      const newTune = el("button", "green", "🎹 New tune");
      newTune.onclick = () => openPiano(null);
      mine.appendChild(newTune);
      palette.appendChild(mine);
      section("🥁 Beats", BEATS, "b");
    };

    // ----- the piano: make a tune one note at a time -----
    // Each key press adds a note of the chosen length to the end of the tune,
    // until it's 4 bars (64 steps) long. The keys are the song's scale, so
    // whatever you play fits.
    const pianoBox = el("div", "panel");
    let onPianoKey = null;
    const openPiano = (editing) => {
      const FULL = 64, COL = 16; // 4 bars; each step's width in the picture
      const KEYS = "asdfghjkl;", COLORS = ["#ff5a5a", "#ff9a3d", "#ffd54a", "#8fe05a", "#3ad0c8", "#4a9fff", "#8a6ae0", "#e06ad0", "#ff5a8a", "#ffffff"];
      const ICONS = ["🎹", "🎵", "🐱", "🐶", "🦄", "🔥", "⚡", "💎", "👾", "🍕", "🌈", "🐉"];
      // the tune as a list of notes and rests: { deg (null for a rest), len }
      const parts = [];
      if (editing) {
        let at = 0;
        for (const [s0, deg, len] of editing.notes.slice().sort((a, b) => a[0] - b[0])) {
          if (s0 > at) parts.push({ deg: null, len: s0 - at });
          if (s0 >= at) { parts.push({ deg, len }); at = s0 + len; }
        }
      }
      let name = editing ? editing.name : "My tune", icon = editing ? editing.icon : "🎹", len = 2;
      const used = () => parts.reduce((a, x) => a + x.len, 0);
      const toNotes = () => {
        const out = [];
        let at = 0;
        for (const x of parts) { if (x.deg != null) out.push([at, x.deg, Math.min(x.len, FULL - at)]); at += x.len; }
        return out.filter((n) => n[0] < FULL);
      };
      const hear = (notes) => Mu.preview({ bpm: song.bpm, mood: song.mood, sound: song.sound,
        tunes: { u_x: { notes } }, slots: [{ t: "u_x", p: 0, b: "none" }] });
      const add = (deg) => {
        const room = FULL - used();
        if (room <= 0) { toast("Your tune is full! Press ⌫ Back to change the end"); return; }
        parts.push({ deg, len: Math.min(len, room) });
        if (deg != null) hear([[0, deg, Math.min(len, 4)]]);
        draw();
      };
      strip.style.display = palette.style.display = top.style.display = head.style.display = "none";
      root.appendChild(pianoBox);
      const draw = () => {
        pianoBox.textContent = "";
        pianoBox.appendChild(el("h2", null, editing ? "🎹 Change your tune" : "🎹 New tune"));
        const nameRow = el("div", "row tight");
        const nameIn = el("input");
        nameIn.value = name; nameIn.maxLength = 16;
        nameIn.oninput = () => { name = nameIn.value; };
        nameRow.append(el("span", "hint", "Name:"), nameIn);
        for (const ic of ICONS) {
          const b = el("button", "small" + (ic === icon ? " green" : ""), ic);
          b.onclick = () => { icon = ic; draw(); };
          nameRow.appendChild(b);
        }
        pianoBox.appendChild(nameRow);
        // the tune so far: one column per step, coloured like the key it came from
        const cv = el("canvas");
        cv.width = FULL * COL; cv.height = 10 * 12 + 4;
        cv.style.maxWidth = "100%";
        const c = cv.getContext("2d");
        c.fillStyle = "#16141f"; c.fillRect(0, 0, cv.width, cv.height);
        for (let s = 0; s < FULL; s++) {
          c.fillStyle = Math.floor(s / 4) % 2 ? "#272436" : "#211e2c";
          c.fillRect(s * COL + 1, 0, COL - 2, cv.height);
          if (s % 16 === 0 && s) { c.fillStyle = "#8a84aa"; c.fillRect(s * COL - 1, 0, 2, cv.height); } // where each box ends
        }
        let at = 0;
        for (const x of parts) {
          if (x.deg != null && x.deg >= 0 && x.deg < 10) {
            c.fillStyle = COLORS[x.deg];
            c.fillRect(at * COL + 2, (9 - x.deg) * 12 + 2, Math.min(x.len, FULL - at) * COL - 4, 10);
          }
          at += x.len;
        }
        pianoBox.appendChild(cv);
        const bars = Math.max(1, Math.ceil(used() / 16));
        pianoBox.appendChild(el("p", "hint", `${Math.min(FULL, used())} of ${FULL} filled (${bars} box${bars > 1 ? "es" : ""} long). ` +
          "Tap the keys (or type A S D F G H J K L ;) to add notes. It can be up to 4 boxes long."));
        const lenRow = el("div", "row tight");
        lenRow.appendChild(el("span", "hint", "Each note is:"));
        for (const [n, label] of [[1, "· Tiny"], [2, "♪ Short"], [4, "♩ Medium"], [8, "𝅗𝅥 Long"]]) {
          const b = el("button", "small" + (n === len ? " green" : ""), label);
          b.onclick = () => { len = n; draw(); };
          lenRow.appendChild(b);
        }
        pianoBox.appendChild(lenRow);
        // the piano
        const keys = el("div");
        Object.assign(keys.style, { display: "flex", gap: "4px", margin: "10px 0" });
        for (let deg = 0; deg < 10; deg++) {
          const k = el("button", "", KEYS[deg].toUpperCase());
          Object.assign(k.style, { flex: "1", height: "150px", background: "#f4f0ff", color: "#1b1b22", borderBottom: `14px solid ${COLORS[deg]}`,
            display: "flex", alignItems: "flex-end", justifyContent: "center", paddingBottom: "8px", margin: "0", minWidth: "0" });
          k.onclick = () => add(deg);
          keys.appendChild(k);
        }
        pianoBox.appendChild(keys);
        const btns = el("div", "row tight");
        const rest = el("button", "", "🤫 Rest");
        rest.onclick = () => add(null);
        const back = el("button", "", "⌫ Back");
        back.onclick = () => { parts.pop(); draw(); };
        const wipe = el("button", "", "🗑 Start over");
        wipe.onclick = () => { parts.length = 0; draw(); };
        const play = el("button", "", "▶ Hear it");
        play.onclick = () => { const n = toNotes(); if (n.length) hear(n); else toast("Tap some keys first"); };
        const cancel = el("button", "", "✖ Cancel");
        cancel.onclick = () => closePiano();
        const save = el("button", "green", "✔ Save tune");
        save.onclick = () => {
          const notes = toNotes();
          if (!notes.length) { toast("Tap some keys first"); return; }
          const list = loadMyTunes();
          const t = { id: editing ? editing.id : Date.now().toString(36), name: name.trim() || "My tune", icon, notes };
          const i = list.findIndex((x) => x.id === t.id);
          if (i >= 0) list[i] = t; else list.push(t);
          saveMyTunes(list);
          remember();
          // a changed tune changes in this song too; a new one goes in the picked box
          if (editing && song.tunes && song.tunes["u_" + t.id]) useMine(t);
          if (!editing && song.slots[sel]) { useMine(t); song.slots[sel].t = "u_" + t.id; }
          closePiano();
          changed();
        };
        btns.append(rest, back, wipe, play, el("div", "spacer"), cancel, save);
        pianoBox.appendChild(btns);
      };
      onPianoKey = (e) => {
        if (e.target && e.target.tagName === "INPUT") return;
        const deg = KEYS.indexOf(e.key.toLowerCase());
        if (deg >= 0 && !e.repeat) { e.preventDefault(); add(deg); }
        else if (e.key === "Backspace") { e.preventDefault(); parts.pop(); draw(); }
      };
      window.addEventListener("keydown", onPianoKey);
      draw();
    };
    const closePiano = () => {
      window.removeEventListener("keydown", onPianoKey);
      onPianoKey = null;
      pianoBox.remove();
      strip.style.display = palette.style.display = top.style.display = head.style.display = "";
    };
    const draw = () => { drawSettings(); drawStrip(); drawPalette(); };
    draw();

    // light up the box you're hearing
    let lit = -1;
    const loop = () => {
      if (!strip.isConnected) { if (playing) Mu.level(null); return; } // left the page some other way
      const at = playing && Mu.stepNow >= 0 ? Mu.slotAt(song, Mu.stepNow) : -1;
      if (at !== lit) {
        if (cards[lit]) cards[lit].style.boxShadow = "";
        if (cards[at]) cards[at].style.boxShadow = "0 0 0 3px #8ff09a";
        lit = at;
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);

    const stop = () => { playing = false; playBtn.textContent = "▶ Play"; Mu.level("off"); lit = -2; };
    playBtn.onclick = () => {
      if (playing) { stop(); return; }
      if (Mu.muted) Mu.setMuted(false);
      Mu.custom(cleanSong(song));
      Mu.level(null); // so it starts from the top
      Mu.level("custom");
      playing = true;
      playBtn.textContent = "⏹ Stop";
    };
    undoBtn.onclick = () => {
      if (!history.length) { toast("Nothing to undo"); return; }
      song = JSON.parse(history.pop());
      sel = Math.min(sel, song.slots.length - 1);
      changed();
    };
    doneBtn.onclick = () => { if (onPianoKey) closePiano(); if (playing) stop(); done(cleanSong(song), nameBox.value.trim() || "My song"); };
    cancelBtn.onclick = () => { if (onPianoKey) closePiano(); if (playing) stop(); done(undefined); };
  };

  const plainsGrid = (rows) =>
    (Array.isArray(rows) && rows.length ? resizeGrid(rowsToGrid(rows.map(String)), ARENA_W) : defaultPlains());
  // its background: The End unless it's been given another
  const crashBgOf = (o) => (window.BDArt.BACKGROUNDS.some((b) => b.key === o.crashBg) ? o.crashBg : "end");

  const findSpawn = (g) => {
    const width = g[0].length;
    for (let y = 0; y < g.length; y++) {
      for (let x = 0; x < width; x++) {
        if (baseOf(g[y][x]) === "P") return { x, y };
      }
    }
    // no start block placed — drop in above the first floor we can find
    for (let x = 0; x < width; x++) {
      for (let y = g.length - 1; y >= 0; y--) {
        if (isSolid(g[y][x])) return { x, y: y - 1 };
      }
    }
    return { x: 1, y: g.length - 2 };
  };

  // ---------- the Watcher's cone of vision ----------
  // The cone points straight down from the eye. Each column of it is cut off at
  // the first solid block, so what you see shaded is exactly where it can see.

  const coneStop = (g, wy, cx) => {
    for (let y = wy + 1; y < g.length; y++) if (isSolid(g[y][cx])) return y;
    return g.length;
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

  // the blocks someone placed in the level: not the Start, and not the grass
  // floor along the bottom that every new level starts with (and Fill floor
  // makes); a bottom square changed to anything else does count
  const countBlocks = (g) => {
    let n = 0;
    g.forEach((row, y) => row.forEach((ch) => {
      if (ch === AIR || ch === "P" || (y === g.length - 1 && ch === "g")) return;
      n++;
    }));
    return n;
  };
  const countDiamonds = (g) => {
    let n = 0;
    for (const row of g) for (const ch of row) if (baseOf(ch) === "d") n++;
    return n;
  };

  // ---------- levels that ship with the game (blockdash-levels.js) ----------

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
      else if (ch === UP_LIFT_SHORT && +v >= 1) out[k] = clamp(Math.round(+v), 1, MAX_H);
      else if (ch === BG_CHANGE && window.BDArt.BACKGROUNDS.some((b) => b.key === v)) out[k] = v;
      else if (ch === MINIGAME && /^(laser|meteor|pvp):(cpu|2p)$/.test(v)) out[k] = v;
      else if (ch === TELEPORT && typeof v === "string" && /^\d+,\d+$/.test(v)) {
        // a linked Auto teleport: its partner's square, kept while the partner is still a teleport
        const [px, py] = v.split(",").map(Number);
        if (baseOf(rows[py] && rows[py][px]) === TELEPORT && v !== k) out[k] = v;
      }
    }
    return out;
  };

  // a level's own song, or null to play whatever the player picked
  // A Music Maker song: { bpm, m: melody rows, b: bass rows, d: drum rows },
  // each row a string with "x" where a note plays. null if it isn't one.
  // A tune made on the piano: { name, icon, notes: [[step, note, length]] }
  // up to 4 bars (64 steps) long. null if it isn't one.
  const cleanTune = (o) => {
    if (!o || typeof o !== "object" || !Array.isArray(o.notes)) return null;
    const notes = o.notes.filter((n) => Array.isArray(n) && n.length === 3 && n.every((v) => Number.isFinite(+v)))
      .map(([at, deg, len]) => [clamp(Math.round(at), 0, 63), clamp(Math.round(deg), -7, 14), clamp(Math.round(len), 1, 16)]);
    return { name: String(o.name || "My tune").slice(0, 16), icon: String(o.icon || "🎹").slice(0, 4), notes };
  };
  const cleanSong = (o) => {
    if (!o || typeof o !== "object" || !Array.isArray(o.slots)) return null;
    const { TUNES, BEATS, MOODS, SOUNDS, SLOTS } = window.BDMusic.MAKER;
    const tunes = {};
    for (const [k, t] of Object.entries(o.tunes && typeof o.tunes === "object" ? o.tunes : {})) {
      if (/^u_\w+$/.test(k) && cleanTune(t)) tunes[k] = cleanTune(t);
    }
    const slots = o.slots.slice(0, SLOTS).filter((x) => x && (TUNES[x.t] || tunes[x.t]))
      .map((x) => ({ t: x.t, p: clamp(Math.round(+x.p) || 0, -4, 7), b: BEATS[x.b] ? x.b : "none" }));
    if (!slots.length) return null;
    // only the piano tunes the song actually uses
    const used = {};
    for (const x of slots) if (tunes[x.t]) used[x.t] = tunes[x.t];
    return { bpm: clamp(Math.round(+o.bpm) || 120, 60, 220), mood: MOODS[o.mood] ? o.mood : "happy",
      sound: SOUNDS[o.sound] ? o.sound : "beep", slots, ...(Object.keys(used).length ? { tunes: used } : {}) };
  };
  // your piano tunes, kept in this browser, to use in any song: [{ id, ...tune }]
  const MYTUNES_KEY = "blockdash_mytunes_v1";
  const loadMyTunes = () => {
    try {
      const a = JSON.parse(localStorage.getItem(MYTUNES_KEY) || "[]");
      return Array.isArray(a) ? a.filter((x) => x && /^\w+$/.test(x.id) && cleanTune(x)).map((x) => ({ id: x.id, ...cleanTune(x) })) : [];
    } catch (e) { return []; }
  };
  const saveMyTunes = (list) => {
    try { localStorage.setItem(MYTUNES_KEY, JSON.stringify(list)); } catch (e) { /* ignore */ }
  };
  // Songs made on the Music page's Music Maker, kept in this browser.
  const MYSONGS_KEY = "blockdash_mysongs_v1";
  const loadMySongs = () => {
    try {
      const a = JSON.parse(localStorage.getItem(MYSONGS_KEY) || "[]");
      return Array.isArray(a) ? a.filter((x) => x && x.id && cleanSong(x.song)).map((x) => ({ id: String(x.id), name: String(x.name || "My song").slice(0, 30), song: cleanSong(x.song) })) : [];
    } catch (e) { return []; }
  };
  const saveMySongs = (list) => {
    try { localStorage.setItem(MYSONGS_KEY, JSON.stringify(list)); } catch (e) { /* ignore */ }
    window.BDMusic.mine(list);
  };
  const musicOf = (o) => (o && window.BDMusic.SONGS[o.music] && (o.music !== "custom" || cleanSong(o.song)) ? o.music : null);

  // the boss arena can have its own background; without one it matches the level
  const arenaBgOf = (o) =>
    (window.BDArt.BACKGROUNDS.some((b) => b.key === o.arenaBg) ? o.arenaBg : bgOf(o));

  const levelData = (l) => {
    const o = bgOf(l) === "overworld" ? { name: l.name, rows: l.rows } : { name: l.name, bg: l.bg, rows: l.rows };
    if (STAT_ID.test(l.statId || "")) o.statId = l.statId;
    const notes = cleanNotes(l.rows, l.notes);
    if (Object.keys(notes).length) o.notes = notes;
    if (Array.isArray(l.arena) && l.arena.length) o.arena = l.arena;
    if (arenaBgOf(l) !== bgOf(l)) o.arenaBg = l.arenaBg;
    if (Array.isArray(l.crashArena) && l.crashArena.length) o.crashArena = l.crashArena;
    if (crashBgOf(l) !== "end") o.crashBg = l.crashBg;
    if (Array.isArray(l.back) && l.back.some((r) => /[^.]/.test(r))) o.back = l.back;
    if (Array.isArray(l.plains) && l.plains.length) o.plains = l.plains;
    if (Array.isArray(l.mini) && l.mini.length) o.mini = l.mini;
    if (Array.isArray(l.box) && l.box.length) o.box = l.box;
    if (Array.isArray(l.vac) && l.vac.length) o.vac = l.vac;
    // kept even when this browser has no art for it; it just plays as the usual player
    if (isMine(l.hero)) o.hero = l.hero;
    if (musicOf(l)) o.music = l.music;
    if (cleanSong(l.song)) o.song = cleanSong(l.song);
    if (cleanEmoji(l.emoji)) o.emoji = cleanEmoji(l.emoji);
    return o;
  };

  // Normalise anything that claims to be a level into { name, rows } with
  // H to MAX_H rows of equal length, or throw.
  const STAT_ID = /^[a-z0-9-]{1,40}$/; // an official level's fixed id for its play counts
  const normalizeLevel = (o, fallbackName) => {
    if (!o || typeof o !== "object" || !Array.isArray(o.rows) || !o.rows.length) {
      throw new Error("not a level");
    }
    const rows = o.rows.map(String);
    if (!rows.some((r) => r.length)) throw new Error("empty level");
    const clean = gridToRows(rowsToGrid(rows));
    return {
      name: String(o.name || fallbackName || "Untitled"),
      ...(STAT_ID.test(o.statId || "") ? { statId: o.statId } : {}),
      rows: clean,
      bg: bgOf(o),
      ...(arenaBgOf(o) !== bgOf(o) ? { arenaBg: o.arenaBg } : {}),
      ...(isMine(o.hero) ? { hero: o.hero } : {}),
      ...(musicOf(o) ? { music: o.music } : {}),
      ...(cleanSong(o.song) ? { song: cleanSong(o.song) } : {}),
      ...(cleanEmoji(o.emoji) ? { emoji: cleanEmoji(o.emoji) } : {}),
      notes: cleanNotes(clean, o.notes),
      // only levels whose arena was drawn by hand carry one
      ...(Array.isArray(o.arena) && o.arena.length ? { arena: gridToRows(arenaGrid(o.arena)) } : {}),
      ...(Array.isArray(o.crashArena) && o.crashArena.length ? { crashArena: gridToRows(crashArenaGrid(o.crashArena)) } : {}),
      ...(crashBgOf(o) !== "end" ? { crashBg: o.crashBg } : {}),
      ...(Array.isArray(o.plains) && o.plains.length ? { plains: gridToRows(plainsGrid(o.plains)) } : {}),
      ...(Array.isArray(o.mini) && o.mini.length ? { mini: gridToRows(miniArenaGrid(o.mini)) } : {}),
      ...(Array.isArray(o.box) && o.box.length ? { box: gridToRows(boxArenaGrid(o.box)) } : {}),
      ...(Array.isArray(o.vac) && o.vac.length ? { vac: gridToRows(vacInsideGrid(o.vac)) } : {}),
      // the background layer, made the level's size
      ...(Array.isArray(o.back) && o.back.length
        ? { back: gridToRows(fitLayer(rowsToGrid(o.back.map(String)), clean[0].length, clean.length)) } : {}),
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
    const json = JSON.stringify({ n: lvl.name, r: lvl.rows, b: bgOf(lvl), x: cleanNotes(lvl.rows, lvl.notes), a: lvl.arena, ab: lvl.arenaBg, c: lvl.crashArena, cb: lvl.crashBg, k: lvl.back, pl: lvl.plains, mg: lvl.mini, bx: lvl.box, vc: lvl.vac, h: lvl.hero, m: musicOf(lvl) || undefined, sg: cleanSong(lvl.song) || undefined, em: cleanEmoji(lvl.emoji) || undefined });
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
    return { name: String(o.n || "Imported level"), rows: o.r.map(String), bg: o.b, notes: o.x, arena: o.a, arenaBg: o.ab, crashArena: o.c, crashBg: o.cb, back: o.k, plains: o.pl, mini: o.mg, box: o.bx, vac: o.vc, hero: o.h, music: o.m, song: o.sg, emoji: o.em };
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

  // A level's optional emoji, shown beside its number (a cat for the cat
  // level). Emoji only, so nothing in it can be read as HTML.
  const cleanEmoji = (v) => {
    // only non-plain-text characters (emoji and their joiners), up to 8 of them
    return [...String(v == null ? "" : v)].filter((c) => c.codePointAt(0) > 0x7f).slice(0, 8).join("");
  };
  const levelCard = (lvl, actions, num) => {
    const g = rowsToGrid(lvl.rows);
    const card = el("div", "level-card");
    const best = getBest(bestKey(lvl));
    // a level's emoji takes the place of its number
    if (cleanEmoji(lvl.emoji)) card.appendChild(el("div", "num emoji", cleanEmoji(lvl.emoji)));
    else if (num) card.appendChild(el("div", "num", num));
    card.appendChild(
      el("div", "name",
        `${lvl.name}<span class="meta">${g[0].length} blocks long · ` +
        `${countBlocks(g)} blocks placed${best ? ` · best ${best}` : ""}</span>`),
    );
    window.BDPlayCounts?.show(card.querySelector(".meta"), lvl);
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
    if (k === GALAXY_LOOK && galaxyWon()) return k;
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
  PET_SOUND.petGlitch = "glitch"; // The Glitch's reward: not in the shop, not needed for Pet Lover
  // Sir Rock, from the original Pick Right adventure: unlocked by picking
  // the pet rock there. Makes no sound (there's no "rock" sound) and never
  // moves from the start.
  PET_SOUND.petRock = "rock";
  PET_SOUND.petKitten = "cat"; // for getting every yarn ball in a level
  PET_SOUND.petHorse = "horse"; // for winning a level with the Castle background
  PET_SOUND.petGalaxy = "galaxy"; // for escaping the Galactic Monstrosity, like the Glitch pet
  const FLYING_PETS = ["petParrot", "petDragon", "petGlitch", "petGalaxy"];
  const STILL_PETS = ["petRock"];
  const CAT_LOOK = "\ue934"; // the shipped black-cat player look
  const petBaseOf = (k) => (PET_SOUND[k] ? k : PET_SOUND[Art.baseOf(k)] ? Art.baseOf(k) : null);
  const allPets = () => PETS.map(([key, label]) => ({ key, label })).concat([{ key: "petGlitch", label: "Glitch" }, { key: "petGalaxy", label: "Galaxy" }, { key: "petRock", label: "Sir Rock" }, { key: "petKitten", label: "Kitten" }, { key: "petHorse", label: "Horse" }])
    .concat(Art.customBlocks().filter((b) => PET_SOUND[b.base]).map((b) => ({ key: b.key, label: b.label })));
  const rockFound = () => {
    try { return localStorage.getItem("pickright_sir_rock") === "1"; } catch (e) { return false; }
  };
  const loadPets = () => {
    let p = {};
    try { p = JSON.parse(localStorage.getItem(PET_KEY) || "{}") || {}; } catch (e) { /* no pets yet */ }
    // a drawn pet whose art isn't in this browser is kept, just not shown
    const owned = Array.isArray(p.owned) ? p.owned.filter((k) => typeof k === "string") : [];
    // Sir Rock is owned only while the adventure says you picked him; a save
    // from when he was briefly free for everyone may list him anyway
    const rockAt = owned.indexOf("petRock");
    if (rockFound() && rockAt < 0) owned.push("petRock");
    if (!rockFound() && rockAt >= 0) owned.splice(rockAt, 1);
    return { owned, pick: owned.includes(p.pick) && petBaseOf(p.pick) ? p.pick : null };
  };
  const savePets = (p) => {
    try { localStorage.setItem(PET_KEY, JSON.stringify(p)); } catch (e) { /* ignore */ }
    if (PETS.every(([k]) => p.owned.includes(k))) window.BDBadges.earn("pets");
  };

  // all the yarn in a level: a kitten pet, the first time. True if it's new.
  const unlockPet = (key) => {
    const pets = loadPets();
    if (pets.owned.includes(key)) return false;
    pets.owned.push(key);
    savePets(pets);
    return true;
  };
  const unlockKitten = () => unlockPet("petKitten");

  const petPanel = () => {
    const pets = loadPets();
    const panel = el("div", "panel");
    panel.appendChild(el("h2", null, "🐾 Pick your pet"));
    const mine = allPets().filter((pt) => pets.owned.includes(pt.key));
    if (!mine.length) panel.appendChild(el("p", "hint", `No pets yet. Buy one in the 🛒 Shop for ${PET_COST} coins!`));
    const row = el("div", "row");
    // a locked card, so there's something to go looking for
    const lockedRock = () => {
      const item = el("div", "pal-item");
      item.style.minWidth = "76px";
      item.style.opacity = "0.45";
      item.title = "Find me in Pick Right";
      item.append(spriteThumb("petRock", 48, 48), el("div", "lbl", "🔒 Sir Rock"), el("div", "lbl", "Find me in Pick Right"));
      return item;
    };
    (mine.length ? [{ key: null, label: "None" }].concat(mine) : []).forEach(({ key, label }) => {
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
    if (!rockFound()) row.appendChild(lockedRock());
    panel.appendChild(row);
    return panel;
  };

  // Badge Master's surprise: a crown, a secret song and a pile of coins
  const MASTER_COINS = 1000;
  window.addEventListener("bd-badge", (e) => {
    if (e.detail !== "master") return;
    const b = loadBag();
    saveBag(Object.assign(b, { coins: b.coins + MASTER_COINS }));
    // a big message that stays until OK, so the surprise can't be missed;
    // shown after the "Badge unlocked!" pop-up has had its moment
    setTimeout(() => rewardBox("🏆 BADGE MASTER!", "You got every badge! Your surprise:", [
      "👑 A golden crown on your player",
      "🎵 A secret song, Champion, in Music",
      `💰 +${MASTER_COINS} coins`,
      "👾 A secret 6th level on the title screen…",
    ]), 3200);
  });

  // ---------- feedback ----------
  // Saved in this browser only, for whoever looks after the game to read.
  const FEEDBACK_KEY = "blockdash_feedback_v1";
  const loadFeedback = () => {
    try {
      const f = JSON.parse(localStorage.getItem(FEEDBACK_KEY) || "[]");
      return Array.isArray(f) ? f.filter((x) => x && typeof x.text === "string") : [];
    } catch (e) { return []; }
  };
  const saveFeedback = (list) => {
    try { localStorage.setItem(FEEDBACK_KEY, JSON.stringify(list)); return true; } catch (e) { return false; }
  };

  const FEEDBACK_KINDS = [["idea", "💡 Idea"], ["broken", "🐛 Something's broken"], ["love", "❤️ I love this"]];
  const kindIcon = (k) => ({ idea: "💡", broken: "🐛", love: "❤️" }[k] || "💬");

  const showFeedback = (justSent) => {
    clear();
    const head = el("div", "row");
    head.appendChild(el("h1", null, "📬 Feedback"));
    head.appendChild(el("div", "spacer"));
    const back = el("button", "small", "← Back");
    back.onclick = () => showMenu();
    head.appendChild(back);
    root.appendChild(head);

    const panel = el("div", "panel");
    panel.appendChild(el("h2", null, "What's your idea or problem?"));
    let kind = "idea";
    const kinds = el("div", "row tight");
    kinds.style.marginBottom = "8px";
    const kindBtns = FEEDBACK_KINDS.map(([k, label]) => {
      const b = el("button", "small" + (k === kind ? " green" : ""), label);
      b.onclick = () => { kind = k; kindBtns.forEach((x, i) => x.classList.toggle("green", FEEDBACK_KINDS[i][0] === k)); };
      kinds.appendChild(b);
      return b;
    });
    panel.appendChild(kinds);
    const ta = el("textarea");
    ta.rows = 4;
    ta.maxLength = 1000;
    ta.placeholder = "Type it here…";
    ta.style.width = "100%";
    panel.appendChild(ta);
    const row = el("div", "row");
    row.style.marginTop = "8px";
    const send = el("button", "green", "📨 Send");
    send.onclick = () => {
      const text = ta.value.trim();
      if (!text) { toast("Type something first!"); return; }
      const list = loadFeedback();
      list.unshift({ kind, text, at: Date.now() });
      if (!saveFeedback(list)) { toast("Could not save (storage full?)"); return; }
      showFeedback(true);
    };
    row.append(send, el("span", "hint", justSent ? "✓ Thanks! All feedback is considered." : "All feedback is considered."));
    panel.appendChild(row);
    root.appendChild(panel);

    const list = loadFeedback();
    if (!list.length) return;
    const sent = el("div", "panel");
    sent.appendChild(el("h2", null, `Feedback so far (${list.length})`));
    list.forEach((f, i) => {
      const item = el("div", "row tight shop-item");
      const words = el("div");
      words.style.flex = "1";
      const when = new Date(f.at).toLocaleDateString(undefined, { month: "short", day: "numeric" });
      words.append(el("div", "hint", `${kindIcon(f.kind)} ${when}`), el("div"));
      words.lastChild.textContent = f.text; // text, never HTML: anyone can type here
      const del = el("button", "small", "🗑");
      del.title = "Delete";
      del.onclick = () => {
        if (!confirm("Delete this feedback?")) return;
        const all = loadFeedback();
        all.splice(i, 1);
        saveFeedback(all);
        showFeedback();
      };
      item.append(words, del);
      sent.appendChild(item);
    });
    root.appendChild(sent);
  };

  // ---------- badges screen ----------
  const showBadges = () => {
    clear();
    const B = window.BDBadges;
    const head = el("div", "row");
    head.appendChild(el("h1", null, `🏅 Badges ${B.count()}/${B.total}${B.has("glitch") ? " + 🌀" : ""}`));
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

  // ---------- made-up levels: Endless and the daily level ----------
  // Built from a seed out of short pieces (flat run, gap, hazard, step,
  // floating platform). Gaps are at most 3 wide and steps at most 2 high:
  // a jump covers about 4 blocks across and 2.4 up.
  const WORLDS = [
    { bg: "overworld", ground: "g", hazard: "t" },
    { bg: "nether", ground: "n", hazard: "L" }, // lava is a pit in the floor
    { bg: "end", ground: "e", hazard: "T" },
    { bg: "deepCave", ground: "p", hazard: "A" },
  ];
  const ZONE = 200; // Endless changes world every this many blocks
  const ENDLESS_W = 4000; // "endless": nobody runs 4000 blocks without dying
  const ENDLESS_HARDEST = 2000; // blocks until the pieces are as hard as they get
  // +5% speed per lap of the four worlds, up to +20%. Even then a jump goes
  // about 5 blocks, so a 3-wide gap and its 3 blocks of landing still work.
  const lapSpeed = (x) => 1 + Math.min(0.2, 0.05 * Math.floor(x / (ZONE * WORLDS.length)));

  const seeded = (seed) => () => { // mulberry32: same seed, same level
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  // hardAt(x): 0 (gentle) to 1 (hardest) at block x
  const buildLevel = (width, worldAt, rand, hardAt = () => 0.3) => {
    const g = Array.from({ length: H }, () => Array(width).fill(AIR));
    const floor = H - 1;
    const put = (x, y, ch) => { if (x >= 0 && x < width && y >= 0 && y < H) g[y][x] = ch; };
    const ground = (x, n = 1) => { for (let i = 0; i < n; i++) put(x + i, floor, worldAt(x + i).ground); };
    const pick = (n) => Math.floor(rand() * n);
    // n squares of the world's hazard starting at x (lava is a pit; the rest sit on the floor)
    const hazard = (x, n) => {
      const w = worldAt(x);
      for (let i = 0; i < n; i++) {
        if (w.hazard === "L") put(x + i, floor, "L");
        else { ground(x + i); put(x + i, floor - 1, w.hazard); }
      }
    };
    ground(0, 10);
    put(2, floor - 1, "P");
    let x = 10;
    while (x < width - 14) {
      const d = hardAt(x), w = worldAt(x);
      // harder: fewer flat breathers, more hazards
      const weights = [0.22 - 0.14 * d, 0.2, 0.2 + 0.05 * d, 0.2, 0.18, 0.2 * d];
      let r = rand() * weights.reduce((a, b) => a + b), kind = 0;
      while (r > weights[kind]) r -= weights[kind++];
      if (kind === 0) { // flat, with diamonds to hop for
        const n = Math.max(3, 4 + pick(4) - Math.round(2 * d));
        ground(x, n);
        for (let i = 1; i < n - 1; i++) if (rand() < 0.35) put(x + i, floor - 2 - pick(2), "d");
        x += n;
      } else if (kind === 1) { // a gap
        const n = 2 + pick(2);
        if (rand() < 0.5) put(x + 1, floor - 3, "d");
        ground(x + n, 3);
        x += n + 3;
      } else if (kind === 2) { // TNT / lava / spikes, wider when it's hard
        ground(x, 2);
        const n = 1 + pick(d > 0.5 ? 3 : 2);
        hazard(x + 2, n);
        if (rand() < 0.5) put(x + 2, floor - 3, "d");
        ground(x + 2 + n, 3);
        x += 2 + n + 3;
      } else if (kind === 3) { // a step up and back down, maybe with a trap on top
        const h = 1 + pick(2), n = 3 + pick(3);
        ground(x, 2);
        for (let i = 0; i < n; i++) for (let y = floor; y >= floor - h; y--) put(x + 2 + i, y, worldAt(x + 2 + i).ground);
        if (d > 0.6 && n >= 4 && rand() < 0.5) {
          put(x + 2 + (n >> 1), floor - h - 1, w.hazard === "L" ? "F" : w.hazard);
        } else if (rand() < 0.6) put(x + 2 + (n >> 1), floor - h - 1, "d");
        ground(x + 2 + n, 3);
        x += 2 + n + 3;
      } else if (kind === 4) { // a wide gap with a low platform in the middle: two jumps
        ground(x, 2);
        for (let i = 4; i < 8; i++) put(x + i, floor - 1, w.ground);
        put(x + 5, floor - 2, "d");
        ground(x + 10, 3);
        x += 13;
      } else { // two hazards close together (only once it's getting hard)
        ground(x, 2);
        const a = 1 + pick(2), b = 1 + pick(2);
        hazard(x + 2, a);
        ground(x + 2 + a, 3);
        hazard(x + 5 + a, b);
        ground(x + 5 + a + b, 3);
        x += 8 + a + b;
      }
    }
    ground(x, width - x);
    return g;
  };

  const makeEndless = () => {
    const rand = seeded(Math.floor(Math.random() * 1e9));
    const worldAt = (x) => WORLDS[Math.floor(x / ZONE) % WORLDS.length];
    const g = buildLevel(ENDLESS_W, worldAt, rand, (x) => Math.min(1, x / ENDLESS_HARDEST));
    return { name: "♾️ Endless", rows: g.map((r) => r.join("")), bg: "overworld",
      zones: WORLDS.map((w) => w.bg), zoneW: ZONE, endless: true };
  };

  // ---------- daily challenge ----------
  const DAILY_KEY = "blockdash_daily_v1";
  const ENDLESS_BEST_KEY = "blockdash_endless_best";
  const TRAIL_KEY = "blockdash_trail";
  const DAILY_COINS = 100;
  const dayKey = (d = new Date()) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const yesterdayKey = () => { const d = new Date(); d.setDate(d.getDate() - 1); return dayKey(d); };
  const daySeed = (k) => Number(k.replace(/-/g, ""));
  const DAILY_TASKS = [
    { text: "Grab 15 diamonds", goal: 15, stat: "diamond" },
    { text: "Finish 2 levels", goal: 2, stat: "win" },
    { text: "Run 300 blocks in one Endless run", goal: 300, stat: "endless", best: true },
    { text: "Finish a level without dying", goal: 1, stat: "perfect" },
    { text: "Beat a boss", goal: 1, stat: "boss" },
  ];
  const todayTask = () => DAILY_TASKS[daySeed(dayKey()) % DAILY_TASKS.length];

  // A new day clears today's progress but keeps the streak and its rewards.
  const loadDaily = () => {
    let d = {};
    try { d = JSON.parse(localStorage.getItem(DAILY_KEY) || "{}") || {}; } catch (e) { /* first day */ }
    if (d.day !== dayKey()) Object.assign(d, { day: dayKey(), levelDone: false, taskDone: false, progress: 0 });
    d.streak = d.streak || 0;
    d.got = d.got || {};
    return d;
  };
  const saveDaily = (d) => {
    try { localStorage.setItem(DAILY_KEY, JSON.stringify(d)); } catch (e) { /* ignore */ }
  };
  // the streak only shows while it's still alive (done today or yesterday)
  const liveStreak = (d) => (d.last === dayKey() || d.last === yesterdayKey() ? d.streak : 0);
  const trailOn = () => {
    try { return loadDaily().got[7] && localStorage.getItem(TRAIL_KEY) !== "0"; } catch (e) { return false; }
  };

  const dailyNote = (stat, n = 1) => {
    const d = loadDaily(), t = todayTask();
    if (d.taskDone || t.stat !== stat) return;
    d.progress = t.best ? Math.max(d.progress, n) : d.progress + n;
    if (d.progress >= t.goal) {
      d.taskDone = true;
      const b = loadBag();
      saveBag(Object.assign(b, { coins: b.coins + DAILY_COINS }));
      toast(`✅ Daily task done! +${DAILY_COINS} coins`);
    }
    saveDaily(d);
  };

  // Finishing today's daily level: coins, the streak, and streak rewards.
  const dailyLevelDone = () => {
    const d = loadDaily();
    if (d.levelDone) return null;
    d.levelDone = true;
    d.streak = d.last === yesterdayKey() ? d.streak + 1 : 1;
    d.last = dayKey();
    const b = loadBag();
    b.coins += DAILY_COINS;
    const lines = [`+${DAILY_COINS} coins`];
    if (d.streak >= 3 && !d.got[3]) { d.got[3] = true; b.mega += 10; lines.push("3-day reward: +10 megacoins"); }
    if (d.streak >= 7 && !d.got[7]) { d.got[7] = true; lines.push("7-day reward: 🌈 rainbow trail!"); }
    if (d.streak >= 30 && !d.got[30]) {
      d.got[30] = true;
      b.mega += 1000;
      lines.push("30-day reward: +1000 megacoins and Daily Legend!");
    }
    saveBag(b);
    saveDaily(d);
    if (d.got[30]) window.BDBadges.earn("legend");
    return { streak: d.streak, lines };
  };

  const makeDaily = () => {
    const k = dayKey(), seed = daySeed(k), rand = seeded(seed);
    const world = WORLDS[seed % WORLDS.length];
    const W = 160;
    const g = buildLevel(W, () => world, rand);
    // two save points, on solid ground near a third and two thirds of the way
    for (const at of [Math.floor(W / 3), Math.floor((2 * W) / 3)]) {
      for (let x = at; x < W - 5; x++) {
        if (isSolid(g[H - 1][x]) && g[H - 2][x] === AIR && g[H - 3][x] === AIR) { g[H - 2][x] = "C"; break; }
      }
    }
    const label = new Date().toLocaleDateString(undefined, { month: "short", day: "numeric" });
    return { name: `📅 Daily ${label}`, rows: g.map((r) => r.join("")), bg: world.bg, daily: k };
  };

  const showEndless = () => showPlay(makeEndless(), () => showMenu());

  const dailyPanel = () => {
    const panel = el("div", "panel");
    panel.appendChild(el("h2", null, "♾️ Endless & 📅 Daily"));
    const list = stack();
    let best = 0;
    try { best = Number(localStorage.getItem(ENDLESS_BEST_KEY)) || 0; } catch (e) { /* none */ }
    const endless = el("div", "level-card");
    endless.append(el("div", "name",
      `♾️ Endless<span class="meta">The world changes every ${ZONE} blocks. No save points! · best ${best} blocks</span>`));
    const goE = el("button", "green small", "▶ Play");
    goE.onclick = () => showEndless();
    endless.appendChild(goE);
    list.appendChild(endless);

    const d = loadDaily(), t = todayTask();
    const daily = el("div", "level-card");
    daily.append(el("div", "name",
      `📅 Daily level<span class="meta">A new level every day · ${d.levelDone ? "done today ✓" : `+${DAILY_COINS} coins`}</span>`));
    const goD = el("button", "green small", "▶ Play");
    goD.onclick = () => showPlay(makeDaily(), () => showMenu());
    daily.appendChild(goD);
    list.appendChild(daily);
    panel.appendChild(list);

    const prog = t.best ? `${Math.min(d.progress, t.goal)}/${t.goal}` : `${Math.min(d.progress, t.goal)}/${t.goal}`;
    panel.appendChild(el("p", null,
      `✅ Daily task: <b>${t.text}</b> · ${d.taskDone ? "done ✓" : `${prog} · +${DAILY_COINS} coins`}`));
    const streak = liveStreak(d);
    const next = [[3, "10 megacoins"], [7, "🌈 rainbow trail"], [30, "Daily Legend + 1000 megacoins"]].find(([n]) => !d.got[n]);
    panel.appendChild(el("p", "hint",
      `🔥 Streak: <b>${streak} day${streak === 1 ? "" : "s"}</b> (finish the daily level each day)` +
      (next ? ` · next reward at ${next[0]} days: ${next[1]}` : " · every streak reward collected!")));
    return panel;
  };

  // ---------- The Glitch: the secret boss ----------
  // A secret 6th level for Badge Masters, ending in The Glitch's arena.
  const GLITCH_LOOK_KEY = "blockdash_glitch_look";
  const glitchLookOn = () => {
    try { return window.BDBadges.has("glitch") && localStorage.getItem(GLITCH_LOOK_KEY) !== "0"; } catch (e) { return false; }
  };
  const GLITCH_LEVEL = (() => {
    const W = 40;
    const rows = Array.from({ length: H }, () => Array(W).fill(AIR));
    for (let x = 0; x < W; x++) if (x !== 14 && x !== 15 && x !== 26 && x !== 27) rows[H - 1][x] = "e";
    rows[H - 2][2] = "P";
    rows[H - 2][9] = "A";
    for (const x of [20, 21, 22]) rows[7][x] = "e";
    rows[6][21] = "d";
    for (const y of [8, 9, 10]) rows[y][36] = "G";
    return { name: "???", rows: rows.map((r) => r.join("")), bg: "megaEnd", arenaBg: "end", glitch: true };
  })();
  const GLITCH_COINS = 5000, GLITCH_MEGA = 500;

  // the reward box that waits for OK (Badge Master's surprise uses it too)
  const rewardBox = (title, intro, lines) => {
    const shade = el("div", "reward-shade");
    const box = el("div", "reward-box");
    box.append(el("div", "reward-big", title), el("p", null, intro));
    const list = el("div", "reward-list");
    for (const line of lines) list.appendChild(el("div", null, line));
    const ok = el("button", "green", "OK");
    ok.onclick = () => shade.remove();
    box.append(list, ok);
    shade.appendChild(box);
    document.body.appendChild(shade);
  };

  // first win against The Glitch: its drops
  window.addEventListener("bd-badge", (e) => {
    if (e.detail !== "glitch") return;
    const b = loadBag();
    saveBag(Object.assign(b, { coins: b.coins + GLITCH_COINS, mega: b.mega + GLITCH_MEGA }));
    const pets = loadPets();
    if (!pets.owned.includes("petGlitch")) pets.owned.push("petGlitch");
    savePets(pets);
    setTimeout(() => rewardBox("🌀 GLITCH DEFEATED!", "You beat the secret boss! It dropped:", [
      "🌀 A glitchy look for your player (switch it on and off on the title screen)",
      "👾 A Glitch pet",
      `💰 +${GLITCH_COINS} coins and +${GLITCH_MEGA} megacoins`,
      "🌀 The Glitch Slayer badge",
    ]), 3200);
  });

  const heroPanel = () => {
    const panel = el("div", "panel");
    panel.appendChild(el("h2", null, "Pick your player"));
    const row = el("div", "row");
    const picked = pickedHero();
    [[null, "Usual"]]
      .concat(galaxyWon() ? [[GALAXY_LOOK, "Galaxy"]] : [])
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
    if (loadDaily().got[7]) {
      const on = trailOn();
      const tb = el("button", "small" + (on ? " green" : ""), on ? "🌈 Rainbow trail: on" : "🌈 Rainbow trail: off");
      tb.style.marginTop = "8px";
      tb.onclick = () => {
        try { localStorage.setItem(TRAIL_KEY, on ? "0" : "1"); } catch (e) { /* ignore */ }
        showMenu();
      };
      panel.appendChild(tb);
    }
    if (window.BDBadges.has("glitch")) {
      const on = glitchLookOn();
      const fx = el("button", "small" + (on ? " green" : ""), on ? "🌀 Glitch effect: on" : "🌀 Glitch effect: off");
      fx.style.marginTop = "8px";
      fx.onclick = () => {
        try { localStorage.setItem(GLITCH_LOOK_KEY, on ? "0" : "1"); } catch (e) { /* ignore */ }
        showMenu();
      };
      panel.appendChild(fx);
    }
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

  // ---------- the tutorial (blockdash-tutorial.js) ----------

  const showTutorial = () => window.BDTutorial.show({
    root, el, clear,
    look: pickedHero(),
    onMenu: () => showMenu(),
    onPlay: () => playSeries(builtinLevels(), 0, 0, () => showMenu()),
  });

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

    // the Music Maker, for your own songs and copies of these ones
    const openMaker = (start, name, id) => openMusicMaker(start, (made, newName) => {
      M.level(null);
      if (made === undefined) { showMusic(); return; } // cancelled
      const list = loadMySongs();
      const at = list.findIndex((x) => x.id === id);
      if (!made) { toast("That song was empty, so it wasn't saved"); showMusic(); return; }
      if (at >= 0) list[at] = { id, name: newName, song: made };
      else list.push({ id: Date.now().toString(36), name: newName, song: made });
      saveMySongs(list);
      showMusic();
    }, { name });
    const makeRow = el("div", "panel");
    makeRow.appendChild(el("h2", null, "🎼 Music Maker"));
    const newBtn = el("button", "green", "🎼 New song");
    newBtn.onclick = () => openMaker(null, "My song", null);
    makeRow.append(newBtn, el("p", "hint", "Build your own song from tune and beat pieces, or press 🎲 Make one like this next to any song below. " +
      "Your songs show up in this list and in the Level Maker's Music choices."));
    root.appendChild(makeRow);

    const songs = el("div", "panel");
    songs.appendChild(el("h2", null, "Pick a song"));
    const list = stack();
    // each song, followed by its mega version once that's unlocked
    const order = Object.keys(M.SONGS).filter((k) => !M.SONGS[k].mega)
      .flatMap((k) => [k, "mega_" + k]).filter((k) => M.available(k));
    for (const k of order) {
      const song = M.SONGS[k];
      const row = el("div", "row tight");
      const pick = el("button", k === M.song ? "green" : "",
        `${song.icon} ${song.name}${k === M.song ? " ✓" : ""}`);
      pick.style.minWidth = "170px";
      pick.onclick = () => { M.setSong(k); showMusic(); };
      row.append(pick);
      if (song.mine) {
        const id = k.slice(3), mine = loadMySongs().find((x) => x.id === id);
        const edit = el("button", "small", "✏ Edit");
        edit.onclick = () => openMaker(mine.song, mine.name, id);
        const del = el("button", "small", "🗑 Delete");
        del.onclick = () => {
          if (del.dataset.sure !== "1") { del.dataset.sure = "1"; del.textContent = "🗑 Sure? Tap again"; return; }
          saveMySongs(loadMySongs().filter((x) => x.id !== id));
          showMusic();
        };
        row.append(edit, del);
      } else if (k !== "off" && !song.mega) {
        const copy = el("button", "small", "🎲 Make one like this");
        copy.title = "Start a new song in the Music Maker with this one's mood and speed";
        copy.onclick = () => openMaker(surpriseSong(SPOOKY_SONGS.includes(song.base || k) ? "spooky" : "happy", Math.min(200, M.bpmOf(k))), `My ${song.name}`, null);
        row.append(copy);
      }
      row.append(el("span", "hint", song.what));
      list.appendChild(row);
    }
    songs.appendChild(list);
    songs.appendChild(el("p", "hint", "Your song keeps playing until you pick another one. " +
      "Unlock ✨ Mega versions in the 🛒 Shop."));
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
    window.BDStats?.screen("shop");
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
      if (key === null) { const c = el("canvas"); c.width = c.height = 1; return c; } // songs: no picture
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
    for (const pt of allPets().filter((p) => !["petGlitch", "petGalaxy", "petRock"].includes(p.key))) {
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

    const songShop = el("div", "panel");
    songShop.appendChild(el("h2", null, "✨ Mega songs"));
    songShop.appendChild(el("p", "hint",
      "Unlock an epic remix of a song: faster, with dance drums, a big synth lead, a breakdown, a build-up " +
      "and a key change. It's a new song in 🎵 Music; the normal one stays too."));
    Object.entries(window.BDMusic.SONGS)
      .filter(([k, sg]) => k !== "off" && !sg.mega && window.BDMusic.available(k))
      .forEach(([k, sg]) => {
        const row = item(null, `✨ Mega ${sg.name}`, `The epic remix of ${sg.icon} ${sg.name}`, MEGA_COST, "megacoins",
          bag.songs.includes(k) ? "Unlocked ✓" : "",
          () => spend({ mega: bag.mega - MEGA_COST, songs: bag.songs.concat(k) }));
        songShop.appendChild(row);
      });
    root.appendChild(songShop);
  };

  const showMenu = () => {
    window.BDStats?.screen("menu");
    window.BDMusic.level(null);
    // pets and coins from before badges existed still count
    window.BDBadges.coins(loadBag().coins);
    if (PETS.every(([k]) => loadPets().owned.includes(k))) window.BDBadges.earn("pets");
    window.BDBadges.checkMaster();
    // Beat The Glitch while an old saved copy of the badge code was loaded?
    // That win never counted, so finishing "???" gives the rewards now.
    if (!window.BDBadges.has("glitch")) {
      let beaten = false;
      try { beaten = bestKey(GLITCH_LEVEL) in (JSON.parse(localStorage.getItem(BEST_KEY) || "{}") || {}); } catch (e) { /* no scores */ }
      if (beaten) window.BDBadges.earn("glitch");
    }
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
    const tutorial = el("button", "small", "📖 Tutorial");
    tutorial.onclick = () => showTutorial();
    head.appendChild(tutorial);
    const music = el("button", "small", "🎵 Music");
    music.onclick = () => showMusic();
    head.appendChild(music);
    const badges = el("button", "small", `🏅 ${window.BDBadges.count()}/${window.BDBadges.total}${window.BDBadges.has("glitch") ? " 🌀" : ""}`);
    badges.title = "Badges";
    badges.onclick = () => showBadges();
    head.appendChild(badges);
    // Hidden until notes actually reach someone (it only saves in this
    // browser for now). Add ?feedback to the address to see it.
    if (new URLSearchParams(location.search).has("feedback")) {
      const fb = el("button", "small", "📬 Feedback");
      fb.onclick = () => showFeedback();
      head.appendChild(fb);
    }
    const home = el("a", "btn small", "← Pick Right");
    home.href = "index.html";
    head.appendChild(home);
    root.appendChild(head);
    root.appendChild(el("p", "sub",
      editMode ? "Build a level. Then survive it." : "Run, jump, grab diamonds. Don't explode."));
    // 🔍 search: type part of a level's name and only matching levels show
    const levelSearch = el("input");
    levelSearch.type = "search";
    levelSearch.placeholder = "🔍 Search levels";
    levelSearch.style.marginBottom = "10px";
    levelSearch.oninput = () => {
      const q = levelSearch.value.trim().toLowerCase();
      for (const card of root.querySelectorAll(".level-card")) {
        const name = card.querySelector(".name");
        const text = name ? name.firstChild.textContent : card.textContent;
        card.classList.toggle("search-hide", !!q && !text.toLowerCase().includes(q));
      }
    };
    root.appendChild(levelSearch);

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
        copy.onclick = () => showEditor({ name: lvl.name + " copy", rows: lvl.rows, bg: lvl.bg, notes: lvl.notes, arena: lvl.arena, arenaBg: lvl.arenaBg, hero: lvl.hero, music: lvl.music, song: lvl.song, emoji: lvl.emoji, plains: lvl.plains, mini: lvl.mini, box: lvl.box, vac: lvl.vac }, -1);
        list.appendChild(levelCard(lvl, editMode ? [play, copy] : [play], i + 1));
      });
      if (window.BDBadges.has("master")) {
        const play = el("button", "green small", "▶ Play");
        play.onclick = () => showPlay(GLITCH_LEVEL, () => showMenu());
        const card = levelCard(GLITCH_LEVEL, [play], "?");
        card.classList.add("glitch-card");
        list.appendChild(card);
      }
      bp.appendChild(list);
      if (builtin.length > 1) {
        bp.appendChild(el("p", "hint",
          "Finish one level and it leads straight into the next. Diamonds add up " +
          "across the whole run."));
      }
      root.appendChild(bp);
      if (!editMode) root.append(dailyPanel(), heroPanel(), petPanel(), bagPanel());
    }
    if (!editMode) return;

    // ---- levels saved in this browser ----
    root.append(dailyPanel(), heroPanel(), petPanel(), bagPanel());
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
      ["E", "End portal — finish the level here. In the 🌌 Crash arena, it's the way out"],
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
      [IRON, "Iron — a solid block to stand on and build with"],
      [GLITCH_STONE, "Glitchy stone — blinks on and off every second. When it's gone, you fall through!"],
      [GLITCH_IRON, "Glitchy iron — floats down slowly as soon as it's on screen. If it lands on you, it pushes you down"],
      [CRASH, "Fake crash — invisible when you play. Touch it and the game pretends to crash! Reload, and you're in the 🌌 Crash arena with the Galactic Monstrosity. Escape through an End portal to win"],
      [TELEPORT, "Auto teleport — touch it and you zoom to the next one ahead. A falling block that drops into one zooms ahead too"],
      [ELEVATOR, "Fall block — stand on it and it carries you down until it lands"],
      [ELEV_DOOR, "Elevator door — two blocks tall, like the doors: put it in the bottom square of a gap in your elevator's wall. It falls with the Elevator blocks, stays shut the whole way down, and opens when the elevator hits the bottom"],
      [CAT_BED, "Cat bed — bouncy! Land on it and you boing up twice as high as a jump"],
      [SCRATCH_POST, "Scratching post — touch it and you climb straight up to the top. Stack them for a tall one"],
      [CAT_MOB, "Cat — walks back and forth and says meow. It never hurts you"],
      [SLEEPY_CAT, "Sleepy cat — fast asleep. Get close and it jumps up scared, then sees you're nice and walks about"],
      [WALL_JUMP, "Wall jump power — grab it and walls don't crash you: slide down them, and jump to spring off the other way. Bounce between two walls to climb up a gap! Lasts the whole level"],
      [NINE_LIVES, "Nine lives power — the next 9 things that would get you don't (even falling)"],
      [FISH, "Fish — worth 10 coins, like a diamond"],
      [YARN, "Yarn ball — rare! Get every yarn ball in the level to unlock a kitten pet"],
      ["\u01b7", "Cat face block — a solid block for building"],
      ["\u01b8", "Carpet — a solid block for building a cat house"],
      ["\u01b9", "Sofa — a solid block for building a cat house"],
      [BOX, "Box — land on top of it and you jump inside: into the 📦 Box arena (build it with its tab above). Climb out of the top to pop back out"],
      ["\u01c6", "Cat tree post — the trunk: touch it and you climb up, like a scratching post"],
      ["\u01c7", "Cat tree platform — a solid carpet perch: put it on top of a post"],
      ["\u01c8", "Cat tree cat house — a solid little cubby with a round door"],
      ["\u01c9", "Cat tree base — the solid carpet bottom of a cat tree"],
      ["\u01ca", "Cat tree slant / — a post leaning right; climb it like a post"],
      ["\u01cb", "Cat tree slant \\ — a post leaning left; climb it like a post"],
      [CONCRETE_PICK, "Concrete — 16 colours to build with: tap to open them all"],
      [CASTLE_WALL, "Castle wall — grey stone castle bricks"],
      [BATTLEMENTS, "Battlements — the bumpy top of a castle wall"],
      [CASTLE_WINDOW, "Castle window — decoration, an arched window"],
      [FLAG, "Flag — decoration, a flag on a pole"],
      [CHEST, "Treasure chest — touch it for a random prize: coins, a power… or a TNT surprise!"],
      [PLAT_SIDE, "Side-to-side platform — moves left and right (up to 4 squares); you ride along"],
      [PLAT_UPDOWN, "Up-and-down platform — moves up and down (up to 4 squares); you ride along"],
      [FLIP, "Flip floor — a castle trap: it looks like floor, but stand on it and it wobbles, flips over and drops you! Then it flips back"],
      ["\u01eb", "Tree — decoration: one square makes a big tree (3 wide, 4 tall) growing up from here"],
      ["\u01ec", "Vines — decoration: hang them under a block; stack them for long vines"],
      ["\u01ed", "Tall grass — decoration: put it on the ground"],
      [VILLAGER, "Grey villager — acts like a zombie: walks after you and hurts you. Stomp it 3 times!"],
      [VOID, "Void block — a solid block that looks like empty space"],
      [FAN, "Fan — only inside the vacuum (🌀 Inside the vacuum tab): a big spinning fan goes here. Use as many as you like"],
      [HARM_VOID, "Harmful void block — touch it and you're out!"],
      [CAT_DOOR, "Cat door — put it inside the 📦 Box arena: stand next to it and press Space (or click it) to pop out on top of the box"],
      [CARDBOARD, "Cardboard — a solid block, for building the inside of the Box arena"],
      [CATNIP, "Catnip — ZOOMIES! Super fast, mega jumps and a wobbly rainbow screen for a few seconds"],
      [VACUUM, "Giant vacuum cleaner — a BOSS! 1: it rolls after you and sucks; if it catches you, you're inside it: spam Space to pop out. 2: its battery runs out and platforms appear: stomp its top! 3: it shoots dirt. 3 stomps beats it"],
      [WALLPAPER, "Wallpaper — a solid paw-print wall"],
      ["\u01c2", "Diamond block — a shiny solid block for building"],
      ["\u01c3", "Gold block — a shiny solid block for building"],
      ["\u01c4", "Emerald block — a shiny solid block for building"],
      [CAT_LEAVES, "Cat leaves — a leafy block you climb like a scratching post: touch it and up you go"],
      ["\u01ba", "Cat tree — decoration: stack them for a taller one"],
      [MINIGAME, "Mini game — a big 2×2 block (tap where its top-left goes). Touch it for a mini game in the 🕹️ Mini game arena: dodge lasers or meteors, or ⚔️ PvP: fight with swords (S / ↓) and shooting (E / Enter), 5 hits and you're out. Against Player 2 (arrow keys; you use W A D) or the computer. Last one standing wins! (Set the game, then tap the grid)"],
      [BG_CHANGE, "Background change — invisible when you play. Run through it and the background switches to the one you set on it (pick it, then tap the grid)"],
      [UP_LIFT, "Up elevator — when power reaches it (a Button, Lever or wire), it rises until it bumps a ceiling, with every Up elevator block joined to it. Ride it up!"],
      [UP_LIFT_SHORT, "Up elevator (short) — like the Up elevator, but rises the number of blocks you set (pick the number, then tap the grid)"],
      [LIFT, "Elevator — goes down by itself as soon as it's on screen, and stops at the bottom. Hop on to ride it down. It zooms through Auto teleports"],
      [PUSH, "Push block — run into it to push it along in front of you. If it's stuck you just stop. It falls down holes"],
      [SHOVE, "Shove block — run into it and it slides 4 blocks by itself. It falls down holes"],
      [ENTER, "Enter — push a Push or Shove block into it and it turns green. When every Enter is green, you win!"],
      [WIRE, "Red wire — a solid bar you can stand on that carries power. Buttons, Levers and green Enters power the wires touching them, and power runs along wires of the SAME colour that touch side by side"],
      ["\u019d", "Green wire — like the red wire, but its own circuit: it only passes power to green wires"],
      ["\u019e", "Blue wire — its own circuit: only passes power to blue wires"],
      ["\u019f", "Purple wire — its own circuit: only passes power to purple wires"],
      [BUTTON, "Button — run over it and it clicks down, powering the wires touching it (it stays on)"],
      [LEVER, "Lever — touch it to flip it on, powering the wires touching it (it stays on)"],
      [ZOMBIE_TRAP, "Zombie trap — when power reaches it, the screen flashes red and you're taken to the plains: a zombie drops out of a portal! You have 4 hits; stomp it 3 times to win and go back to the level"],
      [LAMP, "Lamp — lights up when it touches a powered wire. Doors touching a powered wire open by themselves"],
      ["\u0193", "Stone wall — decoration you run right past. Great on the background layer (🖼 Background)"],
      ["\u0194", "Wood wall — decoration you run right past"],
      ["\u0195", "Window — decoration you run right past"],
      ["\u0196", "Torch — a flickering decoration you run right past"],
      ["\u01a4", "Red flower — a pretty decoration you run right past"],
      ["\u01a5", "Yellow flower — a pretty decoration you run right past"],
      ["\u01a6", "Blue flower — a pretty decoration you run right past"],
      ["\u01a7", "Tulip — a pretty pink decoration you run right past"],
      [SLIME_MOB, "Slime mob — hops at you once it's on screen. Stomp a big one and it splits into 2 medium, which split into tiny ones. Don't touch it from the side!"],
      [SKELETON, "Skeleton — walks at you and shoots arrows. Jump the arrows and stomp it"],
      [TNT_SOLDIER, "TNT Soldier — marches up quietly, fizzes when it's close, then BOOM! Stomp it before it blows"],
      [WATER, "Water — swim! You sink slowly; press jump to swim up, or jump out near the top. Lava touching water turns into stone"],
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
      if (editMode) {
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
    let brush = 1; // how many pixels across Paint and Rub out cover
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
    // 🔍 search: type part of a name and only matching pictures show
    const artSearch = el("input");
    artSearch.type = "search";
    artSearch.placeholder = "🔍 Search pictures";
    artSearch.style.marginBottom = "8px";
    artSearch.oninput = () => {
      const q = artSearch.value.trim().toLowerCase();
      for (const { item, label } of Object.values(pickItems)) {
        item.classList.toggle("search-hide", !!q && !String(label).toLowerCase().includes(q));
      }
    };
    pickPanel.appendChild(artSearch);
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
    // Nor doors, keys or the fake crash block: the rules know those only by
    // their own letters, so a homemade copy wouldn't work.
    Art.SPRITE_INFO.filter((s) => s.key === "player" || s.key === "dirt" || PET_SOUND[s.key] ||
      (TILES[s.key] && !TILES[s.key].over && !MEGA_BASE[s.key] &&
        !isDoor(s.key) && s.key !== KEY && s.key !== CRASH))
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

    // Brush size, for Paint and Rub out: 1, 2 or 4 pixels across.
    const brushBtns = {};
    tools.appendChild(el("span", "hint", "Brush:"));
    for (const [n, label] of [[1, "▪ 1"], [2, "◼ 2"], [4, "⬛ 4"]]) {
      const b = el("button", "small tool-btn" + (n === brush ? " sel" : ""), label);
      b.title = `Brush ${n} pixel${n > 1 ? "s" : ""} wide`;
      b.onclick = () => {
        brush = n;
        Object.entries(brushBtns).forEach(([k, node]) => node.classList.toggle("sel", +k === brush));
      };
      brushBtns[n] = b;
      tools.appendChild(b);
    }

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
    // a blank canvas, to draw something from scratch (Undo brings it back)
    const eraseAllBtn = el("button", "small", "🧽 Erase all");
    eraseAllBtn.onclick = () => {
      pushUndo();
      img.px = img.px.map(() => null);
      commit();
      toast("All erased! ↶ Undo brings it back");
    };
    tools.append(undoBtn, eraseAllBtn, resetBtn, deleteBtn);
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

    const setOne = (x, y) => {
      if (x < 0 || y < 0 || x >= img.w || y >= img.h) return false;
      const i = y * img.w + x;
      const want = tool === "erase" ? null : color;
      if (img.px[i] === want) return false;
      img.px[i] = want;
      return true;
    };
    // paints (or rubs out) a brush-sized square around the pixel
    const setPx = (x, y) => {
      const x0 = x - Math.floor((brush - 1) / 2), y0 = y - Math.floor((brush - 1) / 2);
      let changed = false;
      for (let dy = 0; dy < brush; dy++) for (let dx = 0; dx < brush; dx++) changed = setOne(x0 + dx, y0 + dy) || changed;
      return changed;
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
      // check both: a picture as wide as the last one but shorter left the
      // last one's bottom rows showing
      if (canvas.width !== img.w * z || canvas.height !== img.h * z) {
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
    window.BDStats?.screen("level maker");
    clear();

    let grid = existing ? rowsToGrid(existing.rows) : newGrid(48);
    let name = existing ? existing.name : "My Level " + (loadLevels().length + 1);
    let bg = existing ? bgOf(existing) : "overworld";
    // Never pruned while editing, so Undo brings a block back with its note;
    // cleanNotes drops the leftovers whenever the level is saved or tested.
    const notes = existing ? cleanNotes(existing.rows, existing.notes) : {};
    // `grid` is whichever of the level, its boss arena and its crash arena is on
    // screen; `parked` holds the other two until you switch to them.
    let editing = "level";
    // null = "same as the level", so changing the level's background carries
    // over until the arena is given one of its own
    let arenaBg = existing && arenaBgOf(existing) !== bg ? existing.arenaBg : null;
    let hero = existing && isMine(existing.hero) ? existing.hero : null;
    let music = musicOf(existing);
    let emoji = cleanEmoji(existing && existing.emoji);
    let song = cleanSong(existing && existing.song); // made in the Music Maker
    window.BDMusic.custom(song);
    window.BDMusic.level(music); // so you hear the level's song while building it
    let crashBg = existing ? crashBgOf(existing) : "end";
    const shownBg = () => (editing === "arena" ? arenaBg || bg : editing === "crash" ? crashBg : bg);
    const parked = {
      arena: arenaGrid(existing && existing.arena, arenaBg || bg),
      crash: crashArenaGrid(existing && existing.crashArena),
      plains: plainsGrid(existing && existing.plains),
      mini: miniArenaGrid(existing && existing.mini),
      box: boxArenaGrid(existing && existing.box),
      vac: vacInsideGrid(existing && existing.vac),
      // the level's background layer, always the level's size (see syncLayers)
      back: fitLayer(existing && existing.back ? rowsToGrid(existing.back) : [[AIR]], grid[0].length, grid.length),
    };
    // until it's opened, the level uses the default arena (and crash arena)
    let arenaDrawn = !!(existing && existing.arena);
    let crashDrawn = !!(existing && existing.crashArena);
    let plainsDrawn = !!(existing && existing.plains);
    let miniDrawn = !!(existing && existing.mini);
    let boxDrawn = !!(existing && existing.box);
    let vacDrawn = !!(existing && existing.vac);
    const gridOf = (m) => (editing === m ? grid : parked[m]);
    const levelG = () => gridOf("level");
    const arenaRows = () => (arenaDrawn ? gridToRows(gridOf("arena")) : undefined);
    const crashRows = () => (crashDrawn ? gridToRows(gridOf("crash")) : undefined);
    const plainsRows = () => (plainsDrawn ? gridToRows(gridOf("plains")) : undefined);
    const miniRows = () => (miniDrawn ? gridToRows(gridOf("mini")) : undefined);
    const boxRows = () => (boxDrawn ? gridToRows(gridOf("box")) : undefined);
    const vacRows = () => (vacDrawn ? gridToRows(gridOf("vac")) : undefined);
    const backRows = () => layerRows(gridOf("back"));
    // The level and its background layer stay the same size: whichever one
    // you're editing leads (Higher, Longer and so on), the other follows.
    const syncLayers = () => {
      if (editing !== "level" && editing !== "back") return;
      const other = editing === "level" ? "back" : "level";
      parked[other] = fitLayer(parked[other], grid[0].length, grid.length);
    };
    let stopSecs = STOP_DEFAULT;
    let upBlocks = UP_DEFAULT;
    let changeBg = "night";
    let miniGame = "laser", miniOpp = "cpu";
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
      syncLayers();
      const all = loadLevels();
      const lvl = levelData({ name: (name || "").trim() || "Untitled", rows: gridToRows(levelG()), bg, notes,
        arena: arenaRows(), arenaBg, crashArena: crashRows(), crashBg, back: backRows(), plains: plainsRows(), mini: miniRows(), box: boxRows(), vac: vacRows(), hero, music, song, emoji });
      if (slot >= 0 && slot < all.length) all[slot] = lvl;
      else { all.push(lvl); slot = all.length - 1; }
      savedLabel.textContent = saveLevels(all) ? "✓ Saved" : "⚠ Not saved";
      window.BDBadges.earn("builder");
    };
    nameInput.oninput = () => { name = nameInput.value; autosave(); };
    const testBtn = el("button", "", "▶ Test");
    testBtn.onclick = () => {
      const lvl = { name: (nameInput.value || "Untitled").trim(), rows: gridToRows(levelG()), bg,
        notes: cleanNotes(levelG(), notes), arena: arenaRows(), arenaBg, crashArena: crashRows(), crashBg,
        back: (syncLayers(), backRows()), plains: plainsRows(), mini: miniRows(), box: boxRows(), vac: vacRows(), hero, music, song, emoji };
      showPlay(lvl, () => showEditor(lvl, slot), true);
    };
    nameRow.append(nameInput, testBtn, savedLabel);
    namePanel.appendChild(nameRow);
    // the emoji: one button showing it, which opens a pop-up of choices
    const emojiRow = el("div", "row tight");
    emojiRow.style.marginTop = "8px";
    emojiRow.style.position = "relative";
    const emojiBtns = [];
    const emojiPick = el("button", "small", "");
    const emojiPop = el("div", "panel");
    Object.assign(emojiPop.style, { position: "absolute", top: "100%", left: "0", zIndex: "20", marginTop: "4px",
      display: "none", flexWrap: "wrap", gap: "6px", maxWidth: "min(560px, 90vw)" });
    const popOpen = () => emojiPop.style.display !== "none";
    const setPop = (open) => { emojiPop.style.display = open ? "flex" : "none"; };
    const showEmoji = () => {
      emojiBtns.forEach(([e, b]) => b.classList.toggle("green", e === emoji));
      emojiPick.textContent = (emoji || "None") + " ▾";
    };
    emojiPick.onclick = () => setPop(!popOpen());
    // a click anywhere else closes it
    const closeEmoji = (e) => {
      if (!emojiPop.isConnected) { document.removeEventListener("pointerdown", closeEmoji, true); return; }
      if (popOpen() && !emojiPop.contains(e.target) && e.target !== emojiPick) setPop(false);
    };
    document.addEventListener("pointerdown", closeEmoji, true);
    const emojiIn = el("input");
    emojiIn.type = "text";
    emojiIn.placeholder = "or type one";
    emojiIn.style.width = "7em";
    emojiIn.value = emoji;
    emojiIn.oninput = () => { emoji = cleanEmoji(emojiIn.value); showEmoji(); autosave(); };
    emojiRow.append(el("span", "hint", "Emoji:"), emojiPick, emojiPop);
    for (const e of ["", "🐱", "🐶", "🔥", "❄️", "🌋", "🏰", "🌌", "🚀", "👾", "💀", "👻", "🧟", "🐉", "🌊", "🌳", "💎", "⚡", "⭐", "🎃", "🍕", "🤖", "🏁"]) {
      const b = el("button", "small", e || "None");
      b.onclick = () => { emoji = e; emojiIn.value = e; showEmoji(); autosave(); setPop(false); };
      emojiBtns.push([e, b]);
      emojiPop.appendChild(b);
    }
    emojiPop.appendChild(emojiIn);
    showEmoji();
    namePanel.appendChild(emojiRow);
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
        else if (editing === "crash") crashBg = b.key;
        else if (editing === "plains") { toast("The plains always have the Overworld sky"); return; }
        else if (editing === "mini") { toast("The mini game picks its own sky: night for lasers, space for meteors"); return; }
        else if (editing === "box") { toast("The Box arena is always inside a cardboard box"); return; }
        else if (editing === "vac") { toast("Inside the vacuum always looks like inside the vacuum"); return; }
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
    const musicPick = el("select", "music-pick");
    const fillMusicPick = () => {
      musicPick.textContent = "";
      [[null, "Player's choice"]]
        .concat(song ? [["custom", "🎼 This level's song (Music Maker)"]] : [])
        .concat(loadMySongs().map((m) => ["mine:" + m.id, `🎼 ${m.name} (yours)`]))
        .concat(Object.entries(window.BDMusic.SONGS)
          .filter(([k, sg]) => k !== "custom" && !sg.mine && (window.BDMusic.available(k) || k === music))
          .map(([k, sg]) => [k, `${sg.icon} ${sg.name}`]))
        .forEach(([k, label]) => {
          const opt = el("option", null, label);
          opt.value = k || "";
          opt.selected = k === music;
          musicPick.appendChild(opt);
        });
    };
    fillMusicPick();
    musicPick.onchange = () => {
      music = musicPick.value || null;
      if (music && music.startsWith("mine:")) {
        // one of your saved songs: the level gets its own copy, so it still
        // plays after you change or delete the saved one, and in shared levels
        const m = loadMySongs().find((x) => "mine:" + x.id === music);
        song = m ? m.song : song;
        music = song ? "custom" : null;
        window.BDMusic.custom(song);
        fillMusicPick();
      }
      window.BDMusic.level(music);
      autosave();
    };
    musicRow.appendChild(musicPick);
    const makerBtn = el("button", "small", "🎼 Music Maker");
    makerBtn.onclick = () => {
      autosave(); // so the level is saved and has a slot to come back to
      const s = slot;
      openMusicMaker(song, (made) => {
        const all = loadLevels();
        if (made !== undefined && all[s]) {
          const lvl = Object.assign({}, all[s], { song: made || undefined });
          if (made) lvl.music = "custom";
          else if (lvl.music === "custom") delete lvl.music;
          all[s] = levelData(lvl);
          saveLevels(all);
        }
        showEditor(loadLevels()[s], s);
      });
    };
    musicRow.appendChild(makerBtn);
    namePanel.appendChild(musicRow);

    // level <-> boss arena
    const editRow = el("div", "row");
    editRow.style.marginTop = "8px";
    editRow.appendChild(el("span", "hint", "Editing:"));
    const levelTab = el("button", "small green", "🗺 Level");
    const arenaTab = el("button", "small", "💥 Boss arena");
    const crashTab = el("button", "small", "🌌 Crash arena");
    const plainsTab = el("button", "small", "🌾 Plains arena");
    const miniTab = el("button", "small", "🕹️ Mini game arena");
    const boxTab = el("button", "small", "📦 Box arena");
    const vacTab = el("button", "small", "🌀 Inside the vacuum");
    const editHint = el("span", "hint", "");
    let showArenaInTab = () => {}; // set up with the tabs below
    const setEditing = (m) => {
      if (m === editing) return;
      parked[editing] = grid;
      grid = parked[m];
      delete parked[m];
      editing = m;
      if (m === "arena") arenaDrawn = true;
      if (m === "crash") crashDrawn = true;
      if (m === "plains") plainsDrawn = true;
      if (m === "mini") miniDrawn = true;
      if (m === "box") boxDrawn = true;
      if (m === "vac") vacDrawn = true;
      if (linking) { linking = false; linkSel = null; linkBtn.classList.remove("green"); }
      undoStack.length = 0; // undo steps belong to the grid they were made on
      levelTab.classList.toggle("green", m === "level" || m === "back");
      layerBtn.classList.toggle("green", m === "back");
      layerBtn.textContent = m === "back" ? "🖼 Background: on" : "🖼 Background: off";
      arenaTab.classList.toggle("green", m === "arena");
      crashTab.classList.toggle("green", m === "crash");
      plainsTab.classList.toggle("green", m === "plains");
      miniTab.classList.toggle("green", m === "mini");
      boxTab.classList.toggle("green", m === "box");
      vacTab.classList.toggle("green", m === "vac");
      showArenaInTab();
      showBg();
      refreshPalette();
      autosave();
      wrap.scrollLeft = 0;
      render();
    };
    levelTab.onclick = () => setEditing("level");
    arenaTab.onclick = () => setEditing("arena");
    crashTab.onclick = () => setEditing("crash");
    plainsTab.onclick = () => setEditing("plains");
    miniTab.onclick = () => setEditing("mini");
    boxTab.onclick = () => setEditing("box");
    vacTab.onclick = () => setEditing("vac");
    // the level's background layer: blocks placed while it's on go behind
    const layerBtn = el("button", "small", "🖼 Background: off");
    layerBtn.onclick = () => {
      if (editing !== "level" && editing !== "back") { toast("Background blocks are for the level, not the arenas"); return; }
      syncLayers();
      setEditing(editing === "back" ? "level" : "back");
    };
    editRow.append(levelTab, arenaTab, crashTab, plainsTab, miniTab, boxTab, vacTab, layerBtn, editHint);
    namePanel.appendChild(editRow);

    // Background and Arenas each show just what's picked, on one button that
    // pops up the choices (like the emoji), so the panel stays short
    const popOut = (row, items, pickFrom = items) => {
      row.style.position = "relative";
      const pick = el("button", "small", "");
      const pop = el("div", "panel");
      Object.assign(pop.style, { position: "absolute", top: "100%", left: "0", zIndex: "20", marginTop: "4px",
        display: "none", flexWrap: "wrap", gap: "6px", maxWidth: "min(680px, 92vw)" });
      row.insertBefore(pick, items[0]);
      for (const it of items) pop.appendChild(it);
      row.appendChild(pop);
      const sync = () => {
        const on = pickFrom.find((b) => b.classList.contains("green"));
        pick.textContent = (on ? on.textContent : "Pick one") + " ▾";
      };
      pick.onclick = () => { pop.style.display = pop.style.display === "none" ? "flex" : "none"; };
      pop.addEventListener("click", () => setTimeout(() => { sync(); pop.style.display = "none"; }, 0));
      const close = (e) => {
        if (!pop.isConnected) { document.removeEventListener("pointerdown", close, true); return; }
        if (pop.style.display !== "none" && !pop.contains(e.target) && e.target !== pick) pop.style.display = "none";
      };
      document.addEventListener("pointerdown", close, true);
      sync();
      return sync;
    };
    const syncBgPick = popOut(bgRow, bgBtns);
    // the background layer button shows over Level while it's on
    const editItems = [levelTab, arenaTab, crashTab, plainsTab, miniTab, boxTab, vacTab, layerBtn];
    const syncEditPick = popOut(editRow, editItems, [layerBtn, ...editItems.slice(0, -1)]);
    showArenaInTab = () => setTimeout(() => { syncBgPick(); syncEditPick(); }, 0); // after the buttons update
    root.appendChild(namePanel);

    // palette
    const palPanel = el("div", "panel");
    palPanel.appendChild(el("h2", null, "Blocks"));
    const pal = el("div", "palette");
    const palItems = {};
    // The player's own blocks share one palette button, so the palette stays
    // the same size however many they make; a tray under it picks which one.
    const hiddenNow = () => (editing === "arena" ? LEVEL_ONLY : editing === "crash" ? CRASH_HIDE
      : editing === "plains" || editing === "mini" ? PLAINS_HIDE
      : editing === "box" ? PLAINS_HIDE + BOX
      : editing === "vac" ? PLAINS_HIDE + BOX + VACUUM + "P"
      : editing === "back" ? BACK_HIDE + ARENA_ONLY : ARENA_ONLY);
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
      if (!palItems[MINE]) return; // (the More blocks button is now the 🎨 More tab)
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
      if (trayOpen === CONCRETE_PICK) {
        CONCRETES.forEach((k) => {
          const item = el("div", "pal-item" + (k === sel ? " sel" : ""));
          const c = el("canvas");
          c.width = c.height = 32;
          drawTile(c.getContext("2d"), k, 0, 0, 32, 0, false);
          item.append(c, el("div", "lbl", TILES[k].name.replace(" concrete", "")));
          item.onclick = () => {
            sel = k;
            Object.values(palItems).forEach((n) => n.classList.remove("sel"));
            palItems[CONCRETE_PICK].classList.add("sel");
            showTray();
            showOpts();
          };
          tray.appendChild(item);
        });
        return;
      }
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
      else if (ch === CONCRETE_PICK) CONCRETES.forEach((k, i) => drawTile(cx, k, (i % 4) * 8, Math.floor(i / 4) * 8, 8, 0, false));
      else if (ch !== MINE) drawTile(cx, ch, 0, 0, 32, 0, false);
      item.appendChild(c);
      item.appendChild(el("div", "lbl", ch === ERASER ? "Erase" : ch === MINE ? "More blocks ▾"
        : ch === MEGA_PICK ? "Mega blocks ▾" : ch === CONCRETE_PICK ? "Concrete ▾" : TILES[ch].name));
      item.onclick = () => {
        if (ch === MEGA_PICK || ch === CONCRETE_PICK) {
          // opening a tray keeps the block you had; pick one inside it
          trayOpen = ch;
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
    // Mega blocks and your own blocks sit in the list too (under the ✨ Mega
    // and 🎨 More tabs), instead of behind buttons that open a tray
    const pickItem = (k, item) => {
      sel = k;
      Object.values(palItems).forEach((n) => n.classList.remove("sel"));
      item.classList.add("sel");
      showTray();
      showOpts();
    };
    const megaOwned = loadBag().unlocked;
    for (const k of MEGA_LIST) {
      const locked = !megaOwned.includes(k);
      const item = el("div", "pal-item" + (k === sel ? " sel" : ""));
      const c = el("canvas");
      c.width = c.height = 32;
      drawTile(c.getContext("2d"), k, 0, 0, 32, 0, false);
      if (locked) c.style.opacity = "0.35";
      item.append(c, el("div", "lbl", (locked ? "🔒 " : "") + TILES[k].name));
      item.onclick = () => {
        if (locked) { toast(`Buy ${TILES[k].name} in the Shop: ${MEGA_COST} megacoins`); return; }
        pickItem(k, item);
      };
      palItems[k] = item;
      pal.appendChild(item);
    }
    for (const { key: k, label, base } of myBlocks) {
      const item = el("div", "pal-item" + (k === sel ? " sel" : ""));
      // the small print says what it acts like, so a bouncy block and a solid one can't be mixed up
      const kind = el("div", "lbl", typeName(base));
      kind.style.opacity = "0.6";
      item.append(spriteThumb(k, 32, 32), el("div", "lbl", label), kind);
      item.onclick = () => { myLast = k; pickItem(k, item); };
      palItems[k] = item;
      pal.appendChild(item);
    }
    const NEW_BLOCK = "new-block"; // not a block: the button to make one in the Art Studio
    {
      const add = el("div", "pal-item");
      const plus = el("div", null, "🎨");
      plus.style.cssText = "height:32px;line-height:32px;font-size:22px;margin-bottom:3px";
      add.append(plus, el("div", "lbl", "New / paint"));
      add.title = "Make your own block in the Art Studio, or repaint the one picked here";
      add.onclick = () => toStudio(isMine(sel) ? sel : undefined);
      palItems[NEW_BLOCK] = add;
      pal.appendChild(add);
    }
    drawMine();
    // 🔍 search: type part of a block's name and only matching blocks show
    const search = el("input");
    search.type = "search";
    search.placeholder = "🔍 Search blocks";
    search.style.marginBottom = "8px";
    const doSearch = () => {
      const q = search.value.trim().toLowerCase();
      const hit = (name) => !q || String(name).toLowerCase().includes(q);
      for (const [ch, item] of Object.entries(palItems)) {
        const lbl = item.querySelector(".lbl");
        const name = ch === ERASER ? "erase eraser" : ch === CONCRETE_PICK ? "concrete colours " + CONCRETES.map((k) => TILES[k].name).join(" ")
          : (lbl ? lbl.textContent : "") + " " + ((TILES[ch] || {}).name || "");
        item.classList.toggle("search-hide", !hit(name));
      }
    };
    search.oninput = doSearch;
    palPanel.appendChild(search);
    // Category tabs: All to start with; a category shows only its blocks.
    // They filter together with the search box.
    const DANGER = ["t", "T", "h", "A", "L", "U", "D", "F", "S", "Z", "8", HARM_VOID, FLIP];
    const MOBS = ["W", "Y", "V", "Q", "N", ...CRITTERS];
    const ITEMS = ["d", "b", "w", "f", "r", "o", "9", "$", "+", "@", "%", KEY, FISH, YARN, CATNIP, WALL_JUMP, NINE_LIVES, CHEST];
    const MACHINES = [ELEVATOR, LIFT, ELEV_DOOR, UP_LIFT, UP_LIFT_SHORT, PUSH, SHOVE, ...WIRES, BUTTON, LEVER, LAMP,
      PLAT_SIDE, PLAT_UPDOWN, TELEPORT, ...DOORS, "I", "m", "0", CAT_BED, SCRATCH_POST, CAT_LEAVES, "\u01c6", "\u01ca", "\u01cb"];
    const SPECIAL = ["P", "E", "C", "K", "O", "M", "G", "R", "H", "J", BG_CHANGE, MINIGAME, BOX, CAT_DOOR, ZOMBIE_TRAP, ENTER, FAN, CRASH];
    const CAT_FLAP = "\ue5ca"; // a built-in extra block that acts like a teleport
    const CATS = [CAT_BED, SCRATCH_POST, CAT_LEAVES, SLEEPY_CAT, CAT_MOB, WALL_JUMP, NINE_LIVES, FISH, YARN, CATNIP, BOX,
      CAT_DOOR, VACUUM, WALLPAPER, CARDBOARD, ...CAT_BLOCKS, "\u01ba", ...TREE_PARTS, CAT_FLAP];
    // Extra blocks (built-in ones like Stone bricks, and his own) go in the
    // category of what they act like; his own are also under My blocks.
    const shipped = new Set(Art.customBlocks().filter((b) => b.shipped).map((b) => b.key));
    const kindOf = (ch) => (MEGA_LIST.includes(ch) ? "mega" : ch === NEW_BLOCK ? "mine"
      : ch.length === 1 && isMine(ch) ? kindOf(baseOf(ch))
      : DANGER.includes(ch) ? "danger" : MOBS.includes(ch) ? "mobs" : ITEMS.includes(ch) ? "items"
      : MACHINES.includes(ch) ? "machines" : SPECIAL.includes(ch) ? "special" : DECOR.includes(ch) ? "decor" : "building");
    const inCat = (ch, k) => k === "all" || ch === ERASER || kindOf(ch) === k || (k === "cats" && CATS.includes(ch))
      || (k === "mine" && ch.length === 1 && isMine(ch) && !shipped.has(ch));
    const catTabs = el("div", "cat-tabs");
    const catBtns = {};
    let catNow = "all";
    const showCat = (k) => {
      catNow = k;
      for (const [kk, b] of Object.entries(catBtns)) b.classList.toggle("green", kk === k);
      // the eraser stays in every category
      for (const [ch, item] of Object.entries(palItems)) item.classList.toggle("cat-hide", !inCat(ch, k));
    };
    for (const [k, label] of [["all", "All"], ["building", "🧱 Building"], ["danger", "⚠️ Danger"], ["mobs", "👾 Mobs"],
      ["items", "💎 Items"], ["machines", "⚙️ Moving"], ["special", "🚩 Special"], ["decor", "🌸 Decoration"],
      ["cats", "🐱 Cats"], ["mega", "✨ Mega"], ["mine", "🎨 My blocks"]]) {
      const b = el("button", "small", label);
      b.onclick = () => showCat(k);
      catBtns[k] = b;
      catTabs.appendChild(b);
    }
    showCat("all");
    palPanel.appendChild(catTabs);
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
    const upInput = el("input");
    upInput.type = "number";
    upInput.min = "1";
    upInput.max = String(MAX_H);
    upInput.value = String(upBlocks);
    upInput.style.width = "4em";
    upInput.oninput = () => { upBlocks = clamp(Math.round(+upInput.value) || UP_DEFAULT, 1, MAX_H); };
    const bgPick = el("select", "music-pick");
    const ownedForChange = loadBag().bgs;
    for (const b of Art.BACKGROUNDS) {
      if (b.mega && !ownedForChange.includes(b.key)) continue; // mega ones once bought
      const opt = el("option", null, b.label);
      opt.value = b.key;
      opt.selected = b.key === changeBg;
      bgPick.appendChild(opt);
    }
    bgPick.onchange = () => { changeBg = bgPick.value; };
    const miniGamePick = el("select", "music-pick"), miniOppPick = el("select", "music-pick");
    for (const [k, label] of MINI_GAMES) { const o = el("option", null, label); o.value = k; miniGamePick.appendChild(o); }
    for (const [k, label] of MINI_OPPS) { const o = el("option", null, label); o.value = k; miniOppPick.appendChild(o); }
    miniGamePick.onchange = () => { miniGame = miniGamePick.value; };
    miniOppPick.onchange = () => { miniOpp = miniOppPick.value; };
    const dialogInput = el("input");
    dialogInput.type = "text";
    dialogInput.maxLength = 200;
    dialogInput.placeholder = "What should it say?";
    dialogInput.style.flex = "1";
    dialogInput.oninput = () => { dialogText = dialogInput.value; };
    const showOpts = () => {
      optRow.innerHTML = "";
      const kind = baseOf(sel);
      optRow.style.display = kind === "O" || kind === "K" || kind === UP_LIFT_SHORT || kind === BG_CHANGE ? "" : "none";
      if (kind === MINIGAME) {
        optRow.style.display = "";
        optRow.append(el("span", "hint", "Game:"), miniGamePick, el("span", "hint", "against"), miniOppPick,
          el("span", "hint", "Pick, then tap the grid."));
      }
      if (kind === BG_CHANGE) {
        optRow.append(el("span", "hint", "Changes the background to"), bgPick,
          el("span", "hint", "Pick, then tap the grid. Tap one again to change it."));
      }
      if (kind === UP_LIFT_SHORT) {
        optRow.append(el("span", "hint", "Goes up"), upInput,
          el("span", "hint", "blocks. Set this, then tap the grid. Tap one again to change it."));
      }
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
      for (const [ch, item] of Object.entries(palItems)) item.style.display = hide.includes(ch) || (ch.length === 1 && hide.includes(baseOf(ch))) ? "none" : "";
      if (hide.includes(baseOf(sel))) palItems.g.onclick();
      else showTray();
      editHint.textContent = editing === "arena"
        ? "This is where the boss fight happens (reached through a Boss portal). The faded boss shows where it stands. " +
          "Boss platforms only appear during CLIMB UP; everything else is always there. " +
          "The Background buttons above now change the arena's background, not the level's."
        : editing === "back"
          ? "🖼 Background is on: blocks you place now go BEHIND the level, darker, and you run right past them. " +
            "Your level shows faded on top. Click 🖼 Background again to go back."
        : editing === "vac"
          ? "🌀 Inside the giant vacuum: what you see when it sucks you in and you spam Space to get out. " +
            "Put 🌀 Fan blocks where the fans spin, and any blocks you like as junk in there. Just for looks: you don't walk in here."
        : editing === "box"
          ? "📦 This is inside a Box: where you go when you land on one. Put the Start where you land, and build a way " +
            "up: getting out of the TOP takes you back to the level. One screen wide, and you can move both ways in here."
        : editing === "mini"
          ? "🕹️ This is where a Mini game block sends you. Put the Start where you begin; player 2 (or the computer) " +
            "starts at the faded spot on the other side. One screen wide. (☄️ Meteor dodge doesn't use it: that one's out in empty space, flying.)"
        : editing === "plains"
          ? "🌾 This is where a Zombie trap sends you. The faded portal shows where the zombie drops in; " +
            "put the Start where you want to land. The plains are always one screen, with the Overworld sky."
        : editing === "crash"
          ? "This is where a Fake crash block sends you. The faded Galactic Monstrosity shows where it floats " +
            "(up and down); put End portals in front of it as the way out. " +
            "The Background buttons above now change this arena's background."
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

    // Link tool: tap an Auto teleport (it glows), then another, to link the
    // two: each sends you to the other. Tap a glowing one again to unlink it.
    let linking = false, linkSel = null;
    const linkBtn = el("button", "small", "🔗 Link");
    linkBtn.title = "Link two Auto teleports together";
    linkBtn.onclick = () => {
      if (editing !== "level") { toast("Link teleports on the level itself"); return; }
      linking = !linking;
      linkSel = null;
      linkBtn.classList.toggle("green", linking);
      if (linking) { filling = false; fillBtn.classList.remove("green"); toast("🔗 Tap a teleport, then another to link them"); }
      render();
    };
    const unlink = (k) => {
      const partner = notes[k];
      delete notes[k];
      if (partner && notes[partner] === k) delete notes[partner];
    };
    const linkTap = (cx, cy) => {
      if (baseOf((grid[cy] || [])[cx]) !== TELEPORT) { toast("🔗 Tap an Auto teleport"); return; }
      const k = noteKey(cx, cy);
      if (!linkSel) { linkSel = k; render(); return; }
      if (linkSel === k) {
        const had = notes[k];
        unlink(k);
        linkSel = null;
        if (had) toast("Unlinked");
      } else {
        unlink(linkSel);
        unlink(k);
        notes[linkSel] = k;
        notes[k] = linkSel;
        linkSel = null;
        toast("🔗 Linked!");
      }
      autosave();
      render();
    };

    // Bucket fill: a tap fills every connected square that matches the one tapped.
    let filling = false;
    const fillBtn = el("button", "small", "🪣 Fill");
    fillBtn.title = "Tap the level to fill an area with the selected block";
    fillBtn.onclick = () => {
      filling = !filling;
      fillBtn.classList.toggle("green", filling);
      if (filling && linking) { linking = false; linkSel = null; linkBtn.classList.remove("green"); render(); }
      if (filling) toast("🪣 Fill is on: tap an area to fill it");
    };
    const fillFrom = (cx, cy) => {
      if (cy < 0 || cy >= grid.length || cx < 0 || cx >= grid[0].length) return;
      const want = sel === ERASER ? AIR : sel;
      // blocks with a setting or only one allowed are placed one at a time
      if ("PKO".includes(baseOf(want)) || isDoor(want)) { toast("Fill can't do that block; place it by hand"); return; }
      const target = grid[cy][cx];
      if (target === want) return;
      pushUndo();
      const stack = [[cx, cy]];
      while (stack.length) {
        const [x, y] = stack.pop();
        if (y < 0 || y >= grid.length || x < 0 || x >= grid[0].length || grid[y][x] !== target) continue;
        grid[y][x] = want;
        stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
      }
      autosave();
      render();
    };

    const undoBtn = el("button", "small", "↶ Undo");
    undoBtn.onclick = () => {
      const prev = undoStack.pop();
      if (!prev) { toast("Nothing to undo"); return; }
      if (prev.notes) setNotes(prev.notes);
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
      for (let x = 0; x < grid[0].length; x++) grid[grid.length - 1][x] = "g";
      autosave();
      render();
    };

    const shorterBtn = el("button", "small", "− Shorter");
    shorterBtn.onclick = () => setWidth(grid[0].length - 10);
    const longerBtn = el("button", "small", "+ Longer");
    longerBtn.onclick = () => setWidth(grid[0].length + 10);

    // Taller levels grow (or shrink) at the top, so the floor stays where it is.
    const lowerBtn = el("button", "small", "− Lower");
    lowerBtn.onclick = () => setHeight(grid.length - 4);
    const higherBtn = el("button", "small", "+ Higher");
    higherBtn.onclick = () => setHeight(grid.length + 4);

    const clearBtn = el("button", "danger small", "Clear all");
    clearBtn.onclick = () => {
      if (!confirm("Erase the whole level?")) return;
      pushUndo();
      const w = grid[0].length;
      grid = Array.from({ length: grid.length }, () => Array(w).fill(AIR));
      grid[grid.length - 2][2] = "P";
      autosave();
      render();
    };

    const lenLabel = el("span", "hint");

    tools.append(modeBtn, fillBtn, linkBtn, undoBtn, leftBtn, rightBtn, floorBtn,
      shorterBtn, longerBtn, lowerBtn, higherBtn, clearBtn, lenLabel);
    gridPanel.appendChild(tools);
    gridPanel.appendChild(
      el("p", "hint",
        "Tap or drag on the grid to place the selected block. " +
        "Switch to <b>✋ Scroll</b> if you want to swipe along the level instead of drawing. " +
        "Every level needs a <b>Start</b> block and an <b>End</b> portal.")
    );
    root.appendChild(gridPanel);

    // withNotes: also remember the Dialog and Stop notes, for changes that move them
    const pushUndo = (withNotes) => {
      const snap = grid.map((r) => r.slice());
      if (withNotes) snap.notes = { ...notes };
      undoStack.push(snap);
      if (undoStack.length > 60) undoStack.shift();
    };

    const setWidth = (w) => {
      if (editing === "arena" || editing === "plains" || editing === "mini" || editing === "box" || editing === "vac") { toast("This is always one screen wide"); return; }
      w = clamp(w, editing === "crash" ? ARENA_W : 20, 400);
      if (w === grid[0].length) return;
      pushUndo();
      grid = resizeGrid(grid, w);
      autosave();
      render();
    };

    const setNotes = (n) => {
      for (const k of Object.keys(notes)) delete notes[k];
      Object.assign(notes, n);
    };

    const setHeight = (h) => {
      if (editing !== "level" && editing !== "back") { toast("Arenas are always one screen tall"); return; }
      h = clamp(h, H, MAX_H);
      const add = h - grid.length;
      if (!add) { toast(h === H ? "Levels can't be lower than one screen" : `Levels can be up to ${MAX_H} tall`); return; }
      if (add < 0 && grid.slice(0, -add).some((r) => r.some((ch) => ch !== AIR))) {
        if (!confirm("The top rows have blocks in them. Remove them anyway?")) return;
      }
      pushUndo(true);
      const w = grid[0].length;
      grid = add > 0
        ? [...Array.from({ length: add }, () => Array(w).fill(AIR)), ...grid]
        : grid.slice(-add);
      // notes are keyed by square, and every square just moved down (or up)
      const moved = {};
      for (const [k, v] of Object.entries(notes)) {
        const [x, y] = k.split(",").map(Number);
        if (y + add < 0) continue;
        // a teleport's link points at a square too, which has moved as well
        const link = typeof v === "string" && /^\d+,\d+$/.test(v) && baseOf(levelG()[y + add][x]) === TELEPORT;
        const [lx, ly] = link ? v.split(",").map(Number) : [];
        moved[noteKey(x, y + add)] = link ? noteKey(lx, ly + add) : v;
      }
      setNotes(moved);
      autosave();
      render();
    };

    const setCell = (cx, cy) => {
      const w = grid[0].length;
      if (cx < 0 || cx >= w || cy < 0 || cy >= grid.length) return false;
      let ch = sel === ERASER ? AIR : sel;
      const cur = grid[cy][cx];
      // Hidden TNT and an item stack into one trapped square, in either order.
      if (ch === "h" && overOf(cur)) return false;
      if (ch === "h" && TRAP_OVER[cur]) ch = TRAP_OVER[cur];
      else if (TRAP_OVER[ch] && isHiddenTnt(cur)) ch = TRAP_OVER[ch];
      const kind = baseOf(ch);
      const want = kind === "O" ? stopSecs : kind === "K" ? (dialogText.trim() || "Hello!") : kind === UP_LIFT_SHORT ? upBlocks : kind === BG_CHANGE ? changeBg : kind === MINIGAME ? miniGame + ":" + miniOpp : undefined;
      // re-tapping a Stop or Dialog block with a new setting updates it
      if (cur === ch && (want === undefined || notes[noteKey(cx, cy)] === want)) return false;
      if (want !== undefined) notes[noteKey(cx, cy)] = want;
      if (kind === "P") {
        for (let y = 0; y < grid.length; y++) {
          for (let x = 0; x < w; x++) if (baseOf(grid[y][x]) === "P") grid[y][x] = AIR;
        }
      }
      if (kind === MINIGAME) {
        if (cx + 1 >= w || cy + 1 >= grid.length) { toast("A Mini game block is 2×2: leave room to the right and below"); return false; }
        for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
          grid[cy + dy][cx + dx] = ch;
          notes[noteKey(cx + dx, cy + dy)] = want;
        }
        autosave();
        return true;
      }
      if (baseOf(cur) === MINIGAME && ch !== cur) {
        for (const [gx, gy] of miniGroup(grid, cx, cy)) { grid[gy][gx] = AIR; delete notes[noteKey(gx, gy)]; }
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
      if (filling) { const c = cellFrom(e); fillFrom(c.x, c.y); return; }
      if (linking) { const c = cellFrom(e); linkTap(c.x, c.y); return; }
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
      if (canvas.width !== w * TS || canvas.height !== grid.length * TS) {
        canvas.width = w * TS;
        canvas.height = grid.length * TS;
      }
      lenLabel.textContent = `${w} long · ${grid.length} tall · ${countDiamonds(grid)} 💎`;

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
      syncLayers();
      if (editing === "level") drawBackLayer(ctx, parked.back, 0, w - 1, 0, grid.length - 1, TS, 0, animT);

      for (let y = 0; y < grid.length; y++) {
        for (let x = 0; x < w; x++) {
          const ch = grid[y][x];
          if (ch !== AIR) {
            if (overOf(ch)) {
              drawTile(ctx, overOf(ch), x * TS, y * TS, TS, animT, false);
              drawTile(ctx, "h", x * TS, y * TS, TS, animT, false);
            } else if (baseOf(ch) === VACUUM) {
              Art.drawSprite(ctx, ch, x * TS + TS * 0.5 - TS * VAC_SIZE / 2, (y + 1 - VAC_SIZE) * TS, TS * VAC_SIZE, TS * VAC_SIZE);
            } else if (CAT_MOBS.includes(baseOf(ch))) {
              Art.drawSprite(ctx, ch, x * TS, y * TS + TS * 0.25, TS, TS * 0.75);
            } else if (isMob(ch) || [SKELETON, TNT_SOLDIER, VILLAGER].includes(baseOf(ch))) {
              Art.drawSprite(ctx, ch, x * TS + TS * 0.05, (y - 1) * TS, TS * 0.9, TS * 2);
            } else if (isDoor(ch) || baseOf(ch) === ELEV_DOOR) {
              Art.drawSprite(ctx, ch, x * TS, (y - 1) * TS, TS, TS * 2);
            } else if (baseOf(ch) === TREE) {
              drawTree(ctx, ch, x * TS, y * TS, TS);
            } else if (baseOf(ch) === MINIGAME) {
              drawMiniQuarter(ctx, grid, x, y, x * TS, y * TS, TS);
            } else {
              drawTile(ctx, ch, x * TS, y * TS, TS, animT, y > 0 && isSolid(grid[y - 1][x]));
            }
          }
        }
      }
      for (let y = 0; y < grid.length; y++) {
        for (let x = 0; x < w; x++) if ("WY".includes(baseOf(grid[y][x]))) drawCone(ctx, grid, x, y, TS, 0, true);
      }
      if (editing === "level") {
        ctx.save();
        ctx.strokeStyle = "rgba(244, 240, 255, 0.85)";
        ctx.lineWidth = 3;
        ctx.setLineDash([8, 6]);
        for (const [k, v] of Object.entries(notes)) {
          const [x, y] = k.split(",").map(Number);
          if (baseOf((grid[y] || [])[x]) !== TELEPORT || typeof v !== "string" || k > v) continue; // each pair once
          const [px, py] = v.split(",").map(Number);
          ctx.beginPath();
          ctx.moveTo((x + 0.5) * TS, (y + 0.5) * TS);
          ctx.lineTo((px + 0.5) * TS, (py + 0.5) * TS);
          ctx.stroke();
        }
        ctx.restore();
        if (linking && linkSel) {
          const [sx, sy] = linkSel.split(",").map(Number);
          ctx.save();
          ctx.globalAlpha = 0.5 + 0.4 * Math.sin(animT * 6);
          ctx.strokeStyle = "#ffd54a";
          ctx.lineWidth = 4;
          ctx.strokeRect(sx * TS + 2, sy * TS + 2, TS - 4, TS - 4);
          ctx.fillStyle = "rgba(255, 213, 74, 0.35)";
          ctx.fillRect(sx * TS, sy * TS, TS, TS);
          ctx.restore();
        }
      }
      if (editing === "back") {
        ctx.save();
        ctx.globalAlpha = 0.35;
        const lv = parked.level;
        for (let y = 0; y < lv.length; y++) {
          for (let x = 0; x < w; x++) if (lv[y][x] !== AIR) drawTile(ctx, overOf(lv[y][x]) || lv[y][x], x * TS, y * TS, TS, animT, false);
        }
        ctx.restore();
      }

      if (editing === "arena") {
        ctx.save();
        ctx.globalAlpha = 0.45;
        Art.drawSprite(ctx, "boss", BOSS_X * TS, BOSS_TOP * TS, 24 * BOSS_PX * TS, 32 * BOSS_PX * TS);
        ctx.restore();
      } else if (editing === "vac") {
        ctx.save();
        ctx.globalAlpha = 0.5;
        grid.forEach((row, y) => row.forEach((ch, x) => {
          if (ch === FAN) Art.drawFan(ctx, (x + 0.5) * TS, (y + 0.5) * TS, TS * 2.6, animT);
        }));
        ctx.restore();
      } else if (editing === "mini") {
        // where player 2 starts: the mirror of the Start
        const st = findSpawn(grid);
        ctx.save();
        ctx.globalAlpha = 0.45;
        Art.drawPlayer(ctx, (w - 1 - st.x + 0.15) * TS, (st.y + 0.1) * TS, TS * 0.7, TS * 0.9, 0, "playerGalaxy");
        ctx.restore();
      } else if (editing === "plains") {
        ctx.save();
        ctx.globalAlpha = 0.45;
        drawTile(ctx, TELEPORT, (PLAINS_PORTAL.x - 0.7) * TS, (PLAINS_PORTAL.y - 0.7) * TS, TS * 2.4, 0, false);
        Art.drawSprite(ctx, "zombie", (PLAINS_PORTAL.x + 0.1) * TS, (H - 1 - MOB_H) * TS, MOB_W * TS, MOB_H * TS);
        ctx.restore();
      } else if (editing === "crash") {
        ctx.save();
        ctx.globalAlpha = 0.45;
        Art.drawSprite(ctx, "galaxyMonster", (w - GALAXY_W) * TS, 2.5 * TS, GALAXY_W * TS, GALAXY_H * TS);
        ctx.restore();
      }

      // what each Stop and Dialog block is set to
      ctx.font = `bold ${Math.round(TS * 0.3)}px ui-monospace, monospace`;
      ctx.textBaseline = "bottom";
      ctx.lineWidth = 3;
      ctx.strokeStyle = "rgba(0,0,0,0.75)";
      ctx.fillStyle = "#ffffff";
      for (let y = 0; y < grid.length; y++) {
        for (let x = 0; x < w; x++) {
          const ch = baseOf(grid[y][x]);
          if (ch !== "O" && ch !== "K" && ch !== UP_LIFT_SHORT && ch !== BG_CHANGE && ch !== MINIGAME) continue;
          if (ch === MINIGAME && miniQuarter(grid, x, y).join() !== "0,0") continue;
          const n = notes[noteKey(x, y)];
          let label = ch === "O" ? (n || STOP_DEFAULT) + "s" : ch === UP_LIFT_SHORT ? "↑" + (n || UP_DEFAULT)
            : ch === BG_CHANGE ? ((Art.BACKGROUNDS.find((b) => b.key === n) || {}).label || "?").split(" ")[0]
            : ch === MINIGAME ? ({ meteor: "☄️", pvp: "⚔️" }[String(n || MINI_DEFAULT).split(":")[0]] || "⚡") + (String(n || MINI_DEFAULT).endsWith("2p") ? "👥" : "🤖")
            : String(n || "…");
          if (label.length > 16) label = label.slice(0, 15) + "…";
          const mid = ch === "O" || ch === UP_LIFT_SHORT || ch === BG_CHANGE || ch === MINIGAME;
          ctx.textAlign = mid ? "center" : "left";
          const big = ch === MINIGAME; // centred on the whole 2x2 block
          const lx = big ? (x + 1) * TS : mid ? (x + 0.5) * TS : x * TS + 2;
          const ly = big ? y * TS + TS * 0.15 : mid ? y * TS + TS * 0.36 : y * TS;
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
      for (let y = 0; y <= grid.length; y++) {
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

  // blockdash.js's own names that the play files (blockdash-play-*.js) use
  const BD = {
    AIR, ARENA_W, arenaBgOf, arenaGrid, ARROW_SPEED, Art, baseOf, bestKey, BG_CHANGE, bgOf,
    BLAZE_DRIFT, BLAZE_MAX, BLAZE_REACH, BLAZE_SHOOT, blinkOn, BLOCK_STEP, BOSS_BODY,
    BOSS_HP, BOSS_PX, BOSS_SHOT_SPEED, BOSS_STAGE, BOSS_TOP, BOSS_X, BOUNCE_V, BOX, BOX_OPEN,
    boxArenaGrid, builtinLevels, BULLET_LIFE, BULLET_SPEED, BULLET_TURN, BUTTON, BUTTON_ON,
    CARDBOARD, CASTLE_WALL, CAT_BED, CAT_BED_BOUNCE, CAT_DOOR, CAT_LOOK, CAT_MOB, CAT_MOBS,
    CAT_SPEED, CATNIP, CHASE_SPEED, CHEST, CHEST_OPEN, clamp, CLIMB_V, CLIMBABLE, COIN_VALUE,
    CONCRETES, COYOTE, CRASH, crashArenaGrid, crashBgOf, CRITTERS, CUT_END, dailyLevelDone,
    dailyNote, dayKey, DOOR_REACH, DOOR_SWING, drawBackLayer, drawCone, drawExplosion,
    drawMiniQuarter, drawPlayer, drawTile, drawTree, EFFECT_TIME, el, ELEV_DOOR,
    ELEV_DOOR_OPEN, ELEVATOR, ELEVATOR_BOOST, ENDER_AHEAD, ENDER_BULLET_SPEED, ENDER_NOTICE,
    ENTER, ENTER_DONE, FALL_ACCEL, FALL_MAX, FALL_PUSH, FAN, findSpawn, FIREBALL_SPEED, FLIP,
    FLIP_OPEN, FLIP_WOBBLE, FLIPPED, FLOWED, FLY_THRUST, FLY_UP_V, FLYING_PETS, GALAXY_H,
    GALAXY_KEY, GALAXY_LOOK, GALAXY_SHOOT, GALAXY_W, galaxyWon, getBest, GHOST_BONUS,
    GHOST_EVERY, GLIDE_FALL, GLITCH_BLOCKS, GLITCH_COLORS, GLITCH_EVERY, GLITCH_FIX_TIME,
    GLITCH_HOP, GLITCH_HP, GLITCH_IRON, GLITCH_SIZE, GLITCH_SOLID, GLITCH_SPOTS,
    GLITCH_STONE, glitchLookOn, GRAVITY, H, HARM_VOID, HEALTH_MAX, HURT_SAFE, inCone, isDoor,
    isHidden, isHiddenTnt, isLava, isLogged, isOpenDoor, isSolid, isWire, JUMP_BUFFER,
    JUMP_V, KEY, LAMP, lapSpeed, LAVA_FALL, LAVA_RISE, LEVER, LEVER_ON, LIFT, loadBag,
    loadPets, LOGGABLE, makeCritter, MEGA_BASE, MEGA_BLAST, MEGA_BOUNCE_V, MEGATITE_PAYS,
    MINI_DEFAULT, miniArenaGrid, MINIGAME, miniGroup, MOB_H, MOB_W, musicOf, nextToWater,
    NINE_LIVES, NINE_SAFE, NIP_JUMP, NIP_TIME, noteKey, overOf, PET_SOUND, PLAINS_PORTAL,
    plainsGrid, PLAT_RANGE, PLAT_SIDE, PLAT_STEP, PLAT_UPDOWN, PLAYER_H, PLAYER_W,
    POOF_AFTER, PUSH, RAIN_SPEED, saveBag, savePets, SCRATCH_POST, setBest, SHIELD_TIME,
    SHOOT_EVERY, SHOVE, SHOVE_DIST, SINK_MAX, SKELETON, SKELETON_SHOOT, SKELETON_SPEED,
    SLEEPY_CAT, SLIME_MOB, SLIME_SIZES, SOLDIER_BLAST, SOLDIER_FUSE, SOLDIER_SPEED,
    SPAWN_EVERY, SPEED_BASE, SPEED_FAST, SPEED_SLOW, STILL_PETS, STOP_DEFAULT, SWIM_V,
    SWORDS, TELEPORT, TILES, TNT_SOLDIER, toast, trailOn, TREE, unlockKitten, unlockPet,
    UP_DEFAULT, UP_LIFT, UP_LIFT_SHORT, UP_SPEED, VAC_DIRT, VAC_ESCAPE, VAC_FAN, VAC_HP,
    VAC_LOW, VAC_PULL, VAC_REACH, VAC_SIZE, VAC_SUCK, vacInsideGrid, VACUUM, VILLAGER,
    VILLAGER_HP, VILLAGER_SPEED, VOID, WALL_JUMP, WARP_TIME, WATCH_CYCLE, WATCH_OPEN, WATER,
    WATER_GRAVITY, WATER_SLOW, WIRE, WIRES, YARN, ZOMBIE_HP, ZOMBIE_LIVES, ZOMBIE_SPEED,
    ZOMBIE_TRAP, ZOMBIE_TRAP_USED
  };

  // `chain` links a level to the ones after it: { i, count, carried, playNext }.
  // Absent when a level is played on its own (from the editor's Test button).
  const showPlay = (level, onExit, fromEditor, chain) => {
    // S: this play's changing values, shared with the play files.
    // P: functions and fixed values shared between them.
    const S = {};
    const P = {};
    clear();
    window.BDStats?.started(level, fromEditor);
    if (!fromEditor) window.BDPlayCounts?.record(level, "start");
    window.BDMusic.custom(cleanSong(level.song));
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
    [S.template, S.looks] = strip(rowsToGrid(level.rows));
    // Megas play as their ordinary block (so every rule still applies) and
    // `looks` remembers which squares are mega, for their extra power.
    const megaAt = (x, y) => !!MEGA_BASE[S.looks[noteKey(x, y)]];
    // 2 for a mega square: pays double, counts double, lasts twice as long
    const megaTimes = (x, y) => (megaAt(x, y) ? 2 : 1);
    const hero = Art.baseOf(level.hero) === "player" ? level.hero : pickedHero();
    const pet = loadPets().pick;
    const petBase = pet && petBaseOf(pet);
    window.BDBadges.nightCheck();
    const notes = cleanNotes(level.rows, level.notes);
    S.width = S.template[0].length;
    S.spawn = findSpawn(S.template);
    const home = { template: S.template, width: S.width, spawn: S.spawn, looks: S.looks };
    // the level's background layer (just for looks), the level's size
    P.backGrid = level.back ? fitLayer(rowsToGrid(level.back), S.width, S.template.length) : null;

    const header = el("div", "row");
    header.appendChild(el("h1", null, level.name || "Level"));
    header.appendChild(el("div", "spacer"));
    const quit = el("button", "small", fromEditor ? "← Editor" : "← Levels");
    quit.onclick = () => { stop(); onExit(); };
    S.showGhost = ghostOn();
    const ghostBtn = el("button", "small", "");
    const showGhostBtn = () => { ghostBtn.textContent = S.showGhost ? "👻 Ghost: on" : "👻 Ghost: off"; };
    showGhostBtn();
    // pointerdown + preventDefault so the button never takes focus, or the
    // Space bar (jump) would switch the ghost on and off
    ghostBtn.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      S.showGhost = !S.showGhost;
      try { localStorage.setItem(GHOST_ON_KEY, S.showGhost ? "1" : "0"); } catch (err) { /* ignore */ }
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
    const armorEl = el("span", "score", "");
    const sword = swordAtHome() ? 0 : bag.sword;
    const bossMax = sword ? SWORDS[sword].hits : BOSS_HP;
    hud.append(scoreEl, ...(hasMega ? [megaEl] : []), ...(hasRods ? [rodsEl] : []), ...(hasPearls ? [pearlsEl] : []),
      ...(hasEyes ? [eyesEl] : []), ...(hasKeys ? [keysEl] : []), ...(bag.shields ? [shieldEl] : []),
      ...(galaxyWon() ? [armorEl] : []), pctEl, attEl);
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

    // flipT is The Glitch's control flip: ◀ ▶ are swapped while it runs
    Object.assign(S, {
      grid: undefined, player: undefined, score: undefined, attempts: 0, state: undefined,
      camX: undefined, effect: undefined, effectT: undefined, rot: undefined,
      coyote: undefined, buffer: undefined, particles: undefined, deadT: undefined, time: 0,
      holding: false, keys: 0, doorT: {}, checkpoint: null, flying: false, deathKind: "boom",
      movers: [], shooters: [], bullets: [], spawners: [], blazes: [], fireballs: [],
      rods: 0, pearls: 0, eyes: 0, megas: 0, shieldT: 0, framesLeft: 0, told: {},
      watchers: [], mobs: [], runT: 0, warp: null, free: false, moveL: false, moveR: false,
      stopT: 0, talk: null, talkAt: 0, poofed: false, inBoss: false, boss: null,
      introSeen: false, cutT: 0, downT: 0, knock: 0, plats: [], flipT: 0, fallers: [], camY: 0,
      crash: false, armor: galaxyWon() ? 1 : 0, slides: [], blockT: 0, tpSkip: null, entersLeft: 0, doorsLanded: [], critters: [], arrows: [], hp: 4, hurtT: 0, risers: [], bgNow: null, mini: null, box: null, inside: null, movPlats: [], platT: 0, flipTraps: [], nipT: 0, climb: null, wallT: 0, wallSide: 1, runDir: 1, lastWall: 0, wallJump: false, nineLives: 0, nineT: 0, safe: null, yarnGot: 0, yarnTotal: 0, powered: new Set(),
    });

    const showItems = () => {
      rodsEl.textContent = "🪄 " + S.rods;
      pearlsEl.textContent = "🔮 " + S.pearls;
      eyesEl.textContent = "👁 " + S.eyes;
      keysEl.textContent = "🔑 " + S.keys;
      armorEl.textContent = "🪖 " + S.armor;
    };

    // toasts for things you stand in for many frames: once per attempt
    const tellOnce = (what, msg) => {
      if (S.told[what]) return;
      S.told[what] = true;
      toast(msg);
    };

    const setFree = (on) => {
      S.free = on;
      leftBtn.style.display = rightBtn.style.display = on ? "" : "none";
    };

    // Mega wings come with a Boost: a short burst at Lightning speed, then a
    // wait while it recharges. The button fills up as it charges.
    Object.assign(S, {
      boostOn: false, boostCD: 0, boostShown: "",
    });
    const setBoost = (on) => {
      S.boostOn = on;
      S.boostCD = 0;
      boostBtn.style.display = on ? "" : "none";
    };
    const boost = () => {
      if (!S.boostOn || S.boostCD > 0 || S.state !== "run") return;
      S.effect = "fast";
      S.effectT = BOOST_TIME;
      S.boostCD = BOOST_RECHARGE;
    };
    const showBoost = () => {
      const pct = S.boostCD > 0 ? Math.round((1 - S.boostCD / BOOST_RECHARGE) * 100) : 100;
      const key = S.boostOn + ":" + pct;
      if (key === S.boostShown) return;
      S.boostShown = key;
      boostBtn.disabled = pct < 100;
      boostBtn.style.setProperty("--charge", pct + "%");
    };

    // ----- runs, for the ghost -----
    // A run starts at the level's start and lasts through save-point respawns
    // and the boss fight. It's replayed by game step, so pauses replay too.
    const gKey = ghostKey(level);
    S.best = loadGhosts()[gKey] || null;
    Object.assign(S, {
      run: null, runStep: 0, lifeStep: 0,
    });
    const PET_LAG = 18; // steps the pet trails behind you
    const trail = [];

    const startRun = () => {
      S.run = { path: [], far: 0, boss: false, deaths: 0 };
      S.runStep = 0;
    };
    // True when the run beat the saved ghost. The very first run just
    // becomes the ghost: there's nothing to beat yet.
    const endRun = (finished) => {
      if (!S.run || S.run.ended || level.endless) return false;
      S.run.ended = true;
      const r = { path: S.run.path, far: S.run.far, boss: S.run.boss, done: finished, t: S.runStep, at: Date.now() };
      const old = S.best;
      if (old && !beats(r, old)) return false;
      if (!old && r.path.length < 6) return false;
      S.best = r;
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
    // Endless: one death ends the run. Diamonds turn into coins either way.
    let overShown = false;
    const endlessOver = () => {
      if (overShown) return;
      overShown = true;
      const dist = Math.floor(S.player.x);
      let best = 0;
      try { best = Number(localStorage.getItem(ENDLESS_BEST_KEY)) || 0; } catch (e) { /* none */ }
      const record = dist > best;
      if (record) { try { localStorage.setItem(ENDLESS_BEST_KEY, String(dist)); } catch (e) { /* ignore */ } }
      const b = loadBag();
      saveBag(Object.assign(b, { coins: b.coins + S.score }));
      dailyNote("endless", dist);
      const box = el("div", "overlay-msg");
      box.innerHTML = `<div class="big">${record ? "🏆 NEW RECORD!" : "Game over!"}</div>` +
        `<div>You ran <b>${dist}</b> blocks · best ${Math.max(dist, best)}</div>` +
        `<div>+${S.score} coins from diamonds · you now have ${b.coins} coins</div>`;
      const row = el("div", "row");
      row.style.justifyContent = "center";
      row.style.marginTop = "10px";
      const again = el("button", "green small", "▶ Run again");
      again.onclick = () => { stop(); showEndless(); };
      const out = el("button", "small", "← Levels");
      out.onclick = () => { stop(); onExit(); };
      row.append(again, out);
      box.appendChild(row);
      msgSlot.innerHTML = "";
      msgSlot.appendChild(box);
      jumpBtn.disabled = true;
    };

    const afterStep = () => {
      S.runStep++;
      S.lifeStep++;
      if (S.state === "run" && !S.warp) {
        trail.push(S.player.x, S.player.y);
        if (trail.length > PET_LAG * 2) trail.splice(0, 2);
      }
      if (!S.run || S.run.ended) return;
      if (S.inBoss) { S.run.boss = true; return; } // the arena isn't part of the level's map
      if (S.state === "run") S.run.far = Math.max(S.run.far, S.player.x);
      if (S.runStep % GHOST_EVERY === 0 && S.run.path.length < GHOST_MAX * 3) {
        S.run.path.push(+S.player.x.toFixed(2), +S.player.y.toFixed(2), +S.rot.toFixed(1));
      }
    };

    // fromStart: R / Play again. Otherwise (after dying) respawn at the last
    // checkpoint with the level as it was when you got there, so diamonds
    // grabbed before it stay grabbed.
    const reset = (fromStart) => {
      if (S.state === "crash") return; // pressing R can't get you out of the crash screen
      overShown = false;
      S.flipT = 0;
      canvas.style.transform = ""; // The Glitch's screen shake
      canvas.style.filter = ""; // catnip's rainbow
      S.nipT = 0;
      if (S.box) P.leaveBox(false); // died in the Box arena: the level comes back for the respawn
      S.inside = null; // not inside the giant vacuum any more
      if (fromStart || !S.checkpoint) {
        if (S.run && endRun(false)) ghostBonus();
        startRun();
      }
      S.lifeStep = 0;
      trail.length = 0;
      if (fromStart) {
        S.wallJump = false; // the cat powers last until you start the level again
        S.nineLives = 0;
        S.checkpoint = null;
        S.inBoss = false;
        S.crash = false;
        S.armor = galaxyWon() ? 1 : 0;
        S.introSeen = false;
        ({ template: S.template, width: S.width, spawn: S.spawn, looks: S.looks } = home);
      }
      const at = S.checkpoint || S.spawn;
      S.bgNow = S.checkpoint ? S.checkpoint.bg || null : null; // set by Background change blocks
      S.climb = null;
      S.wallT = 0;
      S.runDir = 1;
      S.lastWall = 0;
      S.yarnGot = S.checkpoint ? S.checkpoint.yarn || 0 : 0;
      S.yarnTotal = S.template.reduce((n, row) => n + row.filter((ch) => ch === YARN).length, 0);
      S.grid = (S.checkpoint ? S.checkpoint.grid : S.template).map((r) => r.slice());
      // Lava sources and shooters always restart, even after a save point:
      // grown lava is cleared and the sources start growing again.
      S.movers = [];
      S.movPlats = [];
      S.platT = 0;
      S.flipTraps = [];
      S.shooters = [];
      S.bullets = [];
      S.spawners = [];
      S.blazes = [];
      S.fireballs = [];
      S.watchers = [];
      S.mobs = [];
      S.critters = [];
      S.risers = [];
      S.hp = HEALTH_MAX;
      S.hurtT = 0;
      S.arrows = [];
      S.plats = [];
      S.fallers = [];
      S.doorsLanded = [];
      S.runT = 0;
      for (let y = 0; y < S.grid.length; y++) {
        for (let x = 0; x < S.width; x++) {
          if (S.grid[y][x] === FLOWED) S.grid[y][x] = AIR;
          else if (isLogged(S.grid[y][x])) S.grid[y][x] = S.grid[y][x][1];
          const ch = S.template[y][x];
          // Boss platforms start out missing; the climb stage puts them in
          if (ch === "J") { S.grid[y][x] = AIR; S.plats.push([x, y]); }
          if (ch === "U" || ch === "D") {
            S.movers.push({ x, tip: y, dir: ch === "U" ? -1 : 1, t: 0, active: false, done: false });
          } else if (ch === "S") {
            S.shooters.push({ x, y, t: 1 });
          } else if (ch === "Z") {
            S.spawners.push({ x, y, t: 0.6, alive: 0 });
          } else if (ch === "W" || ch === "Y") {
            S.watchers.push({ x, y, ph: (x * 0.37) % WATCH_CYCLE, stare: ch === "Y" });
          }
          if (ch === PLAT_SIDE || ch === PLAT_UPDOWN) S.movPlats.push({ x, y, dx: ch === PLAT_SIDE ? 1 : 0, dy: ch === PLAT_UPDOWN ? -1 : 0, went: 0 });
          // creatures live outside the grid while you play; they restart on every respawn
          if (CRITTERS.includes(baseOf(ch))) {
            S.grid[y][x] = AIR;
            S.critters.push(makeCritter(ch, x, y));
          }
          if (isMob(ch)) {
            S.grid[y][x] = AIR;
            S.mobs.push({ kind: ch, look: S.looks[noteKey(x, y)], x: x + (1 - MOB_W) / 2, y: y + 1 - MOB_H, vy: 0,
              awake: false, glitchT: GLITCH_EVERY, onGround: false });
          }
        }
      }
      quench(S.grid);
      S.zombie = null;
      S.zombieQueued = false;
      S.mini = null;
      S.box = null;
      S.powered = new Set();
      S.slides = [];
      S.blockT = 0;
      S.tpSkip = null;
      S.entersLeft = S.grid.reduce((n, row) => n + row.filter((ch) => baseOf(ch) === ENTER).length, 0);
      P.updatePower();
      for (const m of S.movers) if (S.grid[m.tip][m.x] === "s") m.done = true;
      S.player = {
        x: at.x + 0.15,
        y: at.y + (1 - PLAYER_H),
        vy: 0,
        onGround: false,
      };
      S.score = S.checkpoint ? S.checkpoint.score : 0;
      scoreEl.textContent = "💎 " + S.score;
      // Without a save point you start with what's in the bag. What you pick
      // up only goes into the bag for keeps when you finish the level.
      ({ rods: S.rods, pearls: S.pearls, eyes: S.eyes } = S.checkpoint || bag);
      S.megas = S.checkpoint ? S.checkpoint.megas : 0;
      // keys only work in the level you find them in
      S.keys = S.checkpoint ? S.checkpoint.keys || 0 : 0;
      megaEl.textContent = "Ⓜ " + S.megas;
      S.shieldT = 0;
      showItems();
      S.framesLeft = S.grid.reduce((n, row) => n + row.filter((ch) => ch === "R").length, 0);
      S.told = {};
      S.state = "run";
      S.warp = null;
      setFree(false);
      S.stopT = 0;
      S.talk = null;
      S.camX = clamp(S.player.x - VIEW_COLS * 0.32, 0, Math.max(0, S.width - VIEW_COLS));
      S.camY = clamp(S.player.y - H / 2, 0, S.grid.length - H);
      S.effect = null;
      S.effectT = 0;
      S.flying = false;
      setBoost(false);
      S.rot = 0;
      S.coyote = 0;
      S.buffer = 0;
      S.particles = [];
      S.deadT = 0;
      S.attempts++;
      attEl.textContent = "Attempt " + S.attempts;
      msgSlot.innerHTML = "";
      jumpBtn.disabled = false;
      S.knock = 0;
      S.boss = null;
      if (S.inBoss) startBoss();
      if (hero === CAT_LOOK && petBase === "petCat" && window.BDMusic.playing === "meow") window.BDBadges.earn("cat");
    };

    Object.assign(P, {
      bag, bossMax, canvas, chain, ctx, endlessOver, endRun, fill, fromEditor, hasEyes,
      hasPearls, hasRods, hero, jumpBtn, level, megaAt, megaEl, megaTimes, msgSlot, notes,
      onExit, pctEl, pet, petBase, reset, scoreEl, setBoost, setFree, shieldEl, showBoost,
      showItems, strip, sword, tellOnce, trail, TS, VIEW_COLS
    });
    // the boss fights (the TNT Mech and The Glitch) (blockdash-play-bosses.js)
    const bosses = window.BDPlayBosses(S, P, BD);
    Object.assign(P, bosses);
    const { startBoss } = bosses;

    // dying and winning, explosions and sparkles, and Blink teleports (blockdash-play-life.js)
    const life = window.BDPlayLife(S, P, BD);
    Object.assign(P, life);

    // things that move and hurt you (lava, shooters, mobs, blazes, Watchers) (blockdash-play-hazards.js)
    const hazards = window.BDPlayHazards(S, P, BD);
    Object.assign(P, hazards);

    // how the player moves each step (running, jumping, doors and what you touch) (blockdash-play-physics.js)
    const physics = window.BDPlayPhysics(S, P, BD);
    Object.assign(P, physics);
    const { pressJump, update } = physics;

    // drawing each frame (level, player, pet, ghost, mobs, bosses and the HUD) (blockdash-play-draw.js)
    const draw = window.BDPlayDraw(S, P, BD);
    Object.assign(P, draw);
    const { render } = draw;

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
      window.BDMusic.boss(S.inBoss && S.state !== "win" ? (level.glitch ? "glitch" : true) : false);
      raf = requestAnimationFrame(loop);
    };

    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
      if (S.run && endRun(false)) ghostBonus();
      window.BDMusic.boss(false);
      window.BDMusic.level(null);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };

    const onKeyDown = (e) => {
      if (S.mini && P.miniKey(e.key, true)) { e.preventDefault(); return; }
      if (e.key === " " || e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
        e.preventDefault();
        if (e.repeat || S.holding) return;
        if (!pressJump()) S.holding = true;
      } else if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
        S.moveL = true;
      } else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
        S.moveR = true;
      } else if (e.key === "r" || e.key === "R") {
        reset(true);
      } else if (e.key === "Shift") {
        boost();
      }
    };
    const onKeyUp = (e) => {
      if (S.mini && P.miniKey(e.key, false)) return;
      if (e.key === " " || e.key === "ArrowUp" || e.key === "w" || e.key === "W") S.holding = false;
      else if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") S.moveL = false;
      else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") S.moveR = false;
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    // a click on a Cat door next to you (inside a box) uses the door instead of jumping
    const clickedDoor = (e) => {
      if (e.currentTarget !== canvas || S.state !== "run") return false;
      const r = canvas.getBoundingClientRect();
      const gx = Math.floor(S.camX + ((e.clientX - r.left) / r.width) * canvas.width / TS);
      const gy = Math.floor(S.camY + ((e.clientY - r.top) / r.height) * canvas.height / TS);
      if (!S.grid[gy] || S.grid[gy][gx] !== CAT_DOOR) return false;
      const near = Math.hypot(S.player.x + PLAYER_W / 2 - (gx + 0.5), S.player.y + PLAYER_H / 2 - (gy + 0.5)) < DOOR_REACH;
      if (!S.box) toast("🚪 Cat doors take you out of a box");
      else if (!near) toast("🚪 Get next to the cat door, then click it");
      else P.leaveBox(true);
      return true;
    };
    const press = (e) => { e.preventDefault(); if (clickedDoor(e)) return; if (!pressJump()) S.holding = true; };
    const hold = (btn, set) => {
      btn.addEventListener("pointerdown", (e) => { e.preventDefault(); set(true); });
      for (const ev of ["pointerup", "pointercancel", "pointerleave"]) btn.addEventListener(ev, () => set(false));
    };
    hold(leftBtn, (v) => { S.moveL = v; });
    hold(rightBtn, (v) => { S.moveR = v; });
    const release = () => { S.holding = false; };
    canvas.addEventListener("pointerdown", press);
    canvas.addEventListener("pointerup", release);
    canvas.addEventListener("pointercancel", release);
    jumpBtn.addEventListener("pointerdown", press);
    jumpBtn.addEventListener("pointerup", release);
    jumpBtn.addEventListener("pointercancel", release);
    boostBtn.addEventListener("pointerdown", (e) => { e.preventDefault(); boost(); });

    Object.assign(P, {
      STEP, stop
    });

    reset();
    loop(performance.now());
  };

  // ---------- go ----------
  window.BDMusic.setUpgrades(loadBag().songs);
  window.BDMusic.mine(loadMySongs());
  showMenu();
})();
