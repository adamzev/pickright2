// Block Dash play screen: the boss fights (the TNT Mech and The Glitch).
//
// Part of showPlay in blockdash.js, which calls this once per level played.
// S holds the play screen's changing values (S.player, S.grid, …), P the
// helpers shared between the play files, BD blockdash.js's own constants.
window.BDPlayBosses = (S, P, BD) => {
  "use strict";
  const {
    AIR, ARENA_W, arenaBgOf, arenaGrid, BOSS_BODY, BOSS_HP, BOSS_PX, BOSS_STAGE, BOSS_TOP,
    BOSS_X, BOX_OPEN, boxArenaGrid, BULLET_LIFE, clamp, crashArenaGrid, CRITTERS, CUT_END,
    ENDER_BULLET_SPEED, findSpawn, GALAXY_H, GALAXY_SHOOT, GALAXY_W, GLITCH_BLOCKS,
    GLITCH_COLORS, GLITCH_FIX_TIME, GLITCH_HP, GLITCH_SIZE, GLITCH_SOLID, GLITCH_SPOTS,
    GRAVITY, H, JUMP_V, makeCritter, MINI_DEFAULT, miniArenaGrid, MOB_H, MOB_W,
    PLAINS_PORTAL, plainsGrid, PLAYER_H, PLAYER_W, RAIN_SPEED, toast, ZOMBIE_HP,
    ZOMBIE_LIVES, ZOMBIE_SPEED
  } = BD;
  const {
    bossMax, canvas, level, reset, setFree, strip
  } = P;

  // ----- the TNT Mech boss fight -----

  // Walking into a Boss portal swaps the level for a one-screen arena. The
  // arena is set up as a save point, so dying restarts the fight, not the level.
  const enterBoss = () => enterArena(arenaGrid(level.arena, arenaBgOf(level)));
  const enterArena = (g) => {
    [S.template, S.looks] = strip(g);
    S.width = g[0].length; // the crash arena can be longer than one screen
    S.spawn = findSpawn(S.template);
    S.checkpoint = { x: S.spawn.x, y: S.spawn.y, score: S.score, megas: S.megas, rods: S.rods, pearls: S.pearls, eyes: S.eyes, keys: S.keys, grid: S.template.map((r) => r.slice()) };
    S.inBoss = true;
    S.attempts--; // stepping through the portal isn't a new attempt
    reset();
  };

  // After the fake crash: the level's crash arena, with the Galactic
  // Monstrosity in it instead of the TNT Mech.
  const enterCrash = () => {
    S.crash = true;
    S.flying = false;
    enterArena(crashArenaGrid(level.crashArena));
    S.attempts++; // the crash took you here, not a portal, so it is the same attempt either way
  };

  const startBoss = () => {
    if (S.crash) { startGalaxy(); return; }
    if (level.glitch) { startGlitch(); return; }
    setFree(true);
    S.boss = { hp: bossMax, stage: -1, t: 0, spawnT: 0, hurtT: 0, x: BOSS_X, rain: [], gone: false };
    if (S.introSeen) nextStage();
    else { S.state = "cut"; S.cutT = 0; }
  };

  const endCut = () => {
    S.introSeen = true;
    S.state = "run";
    S.particles = [];
    nextStage();
  };

  // The climb stage's platforms only exist while that stage is on.
  const setPlats = (on) => {
    for (const [x, y] of S.plats) {
      S.grid[y][x] = on ? "J" : AIR;
      // one appearing on top of you lifts you onto it rather than trapping you
      if (on && P.touches(x, y, x + 1, y + 1)) { S.player.y = y - PLAYER_H; S.player.vy = 0; }
    }
  };

  // rain TNT -> climb up and stomp -> shooter arm -> repeat
  const nextStage = () => {
    S.boss.stage = (S.boss.stage + 1) % 3;
    S.boss.t = BOSS_STAGE;
    S.boss.spawnT = 0.9;
    setPlats(S.boss.stage === 1);
    S.bullets = S.bullets.filter((b) => !b.straight); // its stars don't outlive the shooter stage
  };

  const smoke = (cx, cy, n, spread) => {
    for (let i = 0; i < n; i++) {
      const sz = 0.5 + Math.random() * 0.9;
      S.particles.push({
        x: cx + (Math.random() - 0.5) * spread - sz / 2, y: cy + (Math.random() - 0.5) * spread - sz / 2,
        vx: (Math.random() - 0.5) * 1.2, vy: -Math.random() * 0.8, g: -0.4, s: sz,
        life: 1 + Math.random() * 1.4,
        c: ["#8a8a8a", "#a8a8a8", "#6f6f6f", "#c4c4c4"][(Math.random() * 4) | 0],
      });
    }
  };

  // where the dragon is during the intro: swoops in, then hangs there shaking
  const dragonAt = () => {
    const k = clamp(S.cutT / 1.8, 0, 1);
    const ease = 1 - (1 - k) * (1 - k);
    return { x: ARENA_W + 2 + (11 - ARENA_W - 2) * ease, y: 3 + Math.sin(S.cutT * 4) * 0.5 };
  };

  // Intro: the dragon flies in, is blown up, and the boss walks out of the smoke.
  const updateCut = (dt) => {
    const before = S.cutT;
    S.cutT += dt;
    const at = (t) => before < t && S.cutT >= t;
    const d = dragonAt();
    for (const t of [1.8, 2.05, 2.3, 2.55]) {
      if (at(t)) P.explode(d.x + 1 + Math.random() * 4.4, d.y + 0.5 + Math.random() * 2.6,
        ["#d05bff", "#f4f0ff", "#ffd54a", "#ff8a3d"]);
    }
    if (at(2.6)) smoke(16, 6.5, 70, 7);
    if (at(3.2)) smoke(17, 7.5, 30, 5);
    // the boss strides out from deep in the smoke to its spot
    S.boss.x = BOSS_X + 3 * (1 - clamp((S.cutT - 2.8) / 1.6, 0, 1));
    if (S.cutT >= CUT_END) endCut();
  };

  // ----- the Galactic Monstrosity -----
  // It floats up and down at the far end of the arena, firing ender bullets
  // straight across at your height. You can't beat it: get to an End portal.

  const startGalaxy = () => {
    setFree(true);
    // an arena with no End portal gets two beside the monster, one high, one low
    if (!S.grid.some((r) => r.includes("E"))) {
      for (const [x, y] of [[S.width - 10, 4], [S.width - 10, H - 2]]) S.grid[y][x] = "E";
    }
    // x is its middle; it's GALAXY_W wide and GALAXY_H tall, its top at y
    S.boss = { galaxy: true, x: S.width - GALAXY_W / 2, y: 1, t: 0, shootT: GALAXY_SHOOT };
    P.tellOnce("galaxy", "🌌 The GALACTIC MONSTROSITY! Reach an End portal to escape!");
  };

  // Returns true if you died this step.
  const updateGalaxy = (dt) => {
    const g = S.boss;
    g.t += dt;
    // floats from near the top down to the floor and back
    g.y = 0.3 + (H - 1 - GALAXY_H - 0.3) * (0.5 + 0.5 * Math.sin(g.t * 0.8));
    g.shootT -= dt;
    if (g.shootT <= 0) {
      g.shootT = GALAXY_SHOOT;
      const y = clamp(S.player.y + PLAYER_H / 2, 0.5, H - 1.5);
      // they last long enough to cross the whole arena, however long it is
      const life = (S.width + 2) / ENDER_BULLET_SPEED;
      S.bullets.push({ x: g.x - GALAXY_W / 2, y, a: Math.PI, life, straight: true, ender: true, fromX: -1, fromY: -1 });
    }
    // a little forgiving at the edges, like the other mobs
    if (P.touches(g.x - GALAXY_W / 2 + 0.3, g.y + 0.5, g.x + GALAXY_W / 2, g.y + GALAXY_H)) { P.die("delete", true); return true; }
    return false;
  };

  // ----- The Glitch -----
  // Fix the glitched blocks (stand on them) to make it solid, then stomp it.
  // Meanwhile it throws one glitchy attack after another.

  const startGlitch = () => {
    setFree(true);
    setPlats(true); // its platforms are always there (except when they flicker)
    const [x, top] = GLITCH_SPOTS[0];
    S.boss = {
      glitch: true, hp: GLITCH_HP, max: GLITCH_HP, fixT: 0, x, top, mode: "phase", solidT: 0, broken: [], rain: [], clones: [], hist: [],
      atkT: 3, hurtT: 0, introT: 2.5, fakeT: 0, shakeT: 0, cloneT: 0, rainT: 0, dropT: 0, rewindFx: 0,
      banner: "", bannerT: 0, last: "", gone: false,
    };
    breakBlocks();
  };

  // glitch three squares of floor or platform for the player to fix
  const breakBlocks = () => {
    const g = S.boss, cells = [];
    for (let x = 1; x < ARENA_W - 1; x++) if (P.solidAt(x, H - 1)) cells.push([x, H - 1]);
    if (g.fakeT <= 0) for (const [x, y] of S.plats) cells.push([x, y]);
    const under = Math.floor(S.player.x + PLAYER_W / 2);
    const pick = cells.filter(([x]) => Math.abs(x - under) > 1).sort(() => Math.random() - 0.5).slice(0, GLITCH_BLOCKS);
    g.broken = pick.map(([x, y]) => ({ x, y, fixed: false }));
    g.fixT = GLITCH_FIX_TIME;
  };

  const glitchMove = () => {
    const g = S.boss;
    const spots = GLITCH_SPOTS.filter(([x, top]) => x !== g.x || top !== g.top);
    [g.x, g.top] = spots[Math.floor(Math.random() * spots.length)];
    P.sparkle(g.x + 1, g.top + 1, GLITCH_COLORS);
  };

  const glitchAttack = () => {
    const g = S.boss;
    const anger = Math.round((1 - g.hp / g.max) * 4);
    g.atkT = [5, 4.5, 4, 3.5, 3][anger] || 3;
    const pool = ["rain", "fake", "screen", "clone", "rewind", "flip"].filter((a) => a !== g.last);
    const a = pool[Math.floor(Math.random() * pool.length)];
    g.last = a;
    g.banner = { rain: "🔴 PIXEL RAIN", fake: "👻 FAKE BLOCKS", screen: "📺 SCREEN GLITCH",
      clone: "🪞 CLONES", rewind: "⏪ REWIND", flip: "🔀 CONTROLS FLIPPED" }[a];
    g.bannerT = 1.4;
    if (a === "rain") { g.rainT = 3; g.dropT = 0; }
    else if (a === "fake") g.fakeT = 3.5;
    else if (a === "screen") g.shakeT = 1.6;
    else if (a === "flip") S.flipT = 3;
    else if (a === "clone") {
      g.cloneT = 5;
      g.clones = GLITCH_SPOTS.filter(([x, top]) => x !== g.x || top !== g.top)
        .sort(() => Math.random() - 0.5).slice(0, 2).map(([x, top]) => ({ x, top }));
    } else if (a === "rewind" && g.hist.length >= 2) {
      // back to where you were about two seconds ago
      S.player.x = g.hist[0];
      S.player.y = g.hist[1];
      S.player.vy = 0;
      g.hist = [];
      g.rewindFx = 0.6;
    }
  };

  const glitchStomp = (top) => {
    S.player.y = top - PLAYER_H;
    S.player.vy = -JUMP_V;
  };

  // Returns true if the player died or the fight ended this step.
  const updateGlitch = (dt) => {
    const g = S.boss;
    for (const k of ["introT", "hurtT", "bannerT", "rewindFx"]) if (g[k] > 0) g[k] -= dt;
    if (S.flipT > 0) S.flipT -= dt;
    g.hist.push(S.player.x, S.player.y);
    if (g.hist.length > 2 / P.STEP * 2) g.hist.splice(0, 2);

    if (g.shakeT > 0) {
      g.shakeT -= dt;
      canvas.style.transform = g.shakeT > 0
        ? `translate(${(Math.random() - 0.5) * 12}px, ${(Math.random() - 0.5) * 8}px)` : "";
    }
    if (g.fakeT > 0) {
      g.fakeT -= dt;
      setPlats(g.fakeT <= 0 || Math.floor(g.fakeT * 2.5) % 2 === 0); // always ends with them back
    }
    if (g.cloneT > 0) { g.cloneT -= dt; if (g.cloneT <= 0) g.clones = []; }

    // pixel rain zigzags down
    for (const r of g.rain) {
      r.y += RAIN_SPEED * 0.75 * dt;
      r.x = r.x0 + Math.sin(r.y * 2.2) * 1.1;
      if (P.touches(r.x + 0.2, r.y + 0.2, r.x + 0.8, r.y + 0.8)) { P.die("boom", true); return true; }
      if (r.y >= H - 1.6) r.dead = true;
    }
    g.rain = g.rain.filter((r) => !r.dead);
    if (g.rainT > 0) {
      g.rainT -= dt;
      g.dropT -= dt;
      if (g.dropT <= 0) {
        g.dropT = 0.22;
        const x = Math.random() < 0.4 ? S.player.x : Math.random() * (ARENA_W - 2);
        g.rain.push({ x0: clamp(x, 1.2, ARENA_W - 2.2), x: 0, y: -1 });
      }
    }

    const feet = S.player.y + PLAYER_H;
    const onTop = (x, top) => S.player.vy > 0 && S.player.x + PLAYER_W > x && S.player.x < x + GLITCH_SIZE &&
      feet > top - 0.05 && feet < top + 0.6;
    if (g.mode === "phase") {
      if (S.player.onGround) {
        const fy = Math.floor(feet + 0.05);
        for (const c of g.broken) {
          if (!c.fixed && c.y === fy && S.player.x + PLAYER_W > c.x && S.player.x < c.x + 1) {
            c.fixed = true;
            P.sparkle(c.x + 0.5, c.y, ["#8ff09a", "#ffffff", "#21e6ff"]);
          }
        }
      }
      if (g.broken.every((c) => c.fixed)) {
        g.mode = "solid";
        g.solidT = GLITCH_SOLID;
      } else if (g.introT <= 0) {
        g.fixT -= dt;
        if (g.fixT <= 0) {
          toast("⏰ Too slow! The blocks glitched again");
          breakBlocks();
        }
      }
    } else {
      g.solidT -= dt;
      for (const c of g.clones) {
        if (onTop(c.x, c.top)) { glitchStomp(c.top); c.gone = true; toast("FAKE! That was a clone 🪞"); }
      }
      g.clones = g.clones.filter((c) => !c.gone);
      if (g.hurtT <= 0 && onTop(g.x, g.top)) {
        glitchStomp(g.top);
        g.hp--;
        g.hurtT = 1;
        P.explode(g.x + 1, g.top + 0.5, GLITCH_COLORS);
        if (g.hp <= 0) {
          S.state = "bossdown";
          S.downT = 0;
          g.rain = [];
          g.clones = [];
          g.broken = [];
          g.fakeT = 0;
          setPlats(true);
          S.flipT = 0;
          canvas.style.transform = "";
          return true;
        }
        g.mode = "phase";
        glitchMove();
        breakBlocks();
      } else if (g.solidT <= 0) {
        g.mode = "phase";
        glitchMove();
        breakBlocks();
      }
    }

    if (g.introT <= 0) {
      g.atkT -= dt;
      if (g.atkT <= 0) glitchAttack();
    }
    return false;
  };

  // Returns true if the player died or the fight ended this step.
  // ----- the Zombie trap -----
  // The level is put aside (exactly as it is) while you're in the plains,
  // and brought back afterwards.
  const WORLD = ["grid", "template", "looks", "width", "movers", "shooters", "bullets", "spawners", "blazes", "critters", "arrows",
    "fireballs", "watchers", "mobs", "plats", "fallers", "slides", "doorsLanded", "powered", "camX", "camY", "free"];
  const startZombie = () => {
    S.zombieQueued = false;
    const back = {};
    for (const k of WORLD) back[k] = S[k];
    back.player = { ...S.player };
    S.zombie = { phase: "flash", t: 0, back, lives: ZOMBIE_LIVES, hp: ZOMBIE_HP, x: PLAINS_PORTAL.x, y: PLAINS_PORTAL.y, vy: 0,
      hurtT: 0, invT: 0, out: false };
    S.state = "zombie";
    S.holding = false;
  };
  const toPlains = () => {
    // the level's own plains (drawn in the Level Maker's 🌾 Plains arena tab), or the ready-made one
    [S.template, S.looks] = strip(plainsGrid(level.plains));
    S.grid = S.template.map((r) => r.slice());
    S.width = ARENA_W;
    const at = findSpawn(S.grid);
    for (const k of ["movers", "shooters", "bullets", "spawners", "blazes", "fireballs", "watchers", "mobs", "plats", "fallers", "slides", "doorsLanded", "critters", "arrows"]) S[k] = [];
    S.powered = new Set();
    S.player.x = at.x + (1 - PLAYER_W) / 2;
    S.player.y = at.y + (1 - PLAYER_H);
    S.player.vy = 0;
    S.camY = 0;
    setFree(true);
  };
  const backToLevel = () => {
    const z = S.zombie;
    for (const k of WORLD) S[k] = z.back[k];
    S.player = z.back.player;
    S.player.vy = 0;
    setFree(z.back.free);
    S.zombie = null;
    S.state = "run";
  };

  // The intro, step by step: red flash, a swoop over to the plains, the
  // portal opening, the zombie dropping out. Then the fight is on.
  const updateZombieIntro = (dt) => {
    const z = S.zombie;
    z.t += dt;
    if (z.phase === "flash" && z.t >= 0.6) { toPlains(); z.phase = "fly"; z.t = 0; S.camX = -P.VIEW_COLS; }
    else if (z.phase === "fly") {
      const k = Math.min(1, z.t / 0.9);
      S.camX = -P.VIEW_COLS * (1 - k) * (1 - k);
      if (k >= 1) { S.camX = 0; z.phase = "portal"; z.t = 0; }
    } else if (z.phase === "portal" && z.t >= 1.1) {
      z.phase = "fight";
      z.out = true;
      S.state = "run";
      P.tellOnce("zombie", "🧟 A ZOMBIE! Stomp it 3 times!");
    }
  };

  // Returns true if the fight ended this step (won, or you ran out of hits).
  const updateZombie = (dt) => {
    const z = S.zombie, p = S.player;
    if (z.hurtT > 0) z.hurtT -= dt;
    if (z.invT > 0) z.invT -= dt;
    if (z.phase === "won") {
      z.t += dt;
      if (z.t > 1.4) { backToLevel(); P.tellOnce("zombieWon", "🧟 Zombie beaten! Back to the level"); }
      return true;
    }
    // walk at you, falling onto the ground
    const dir = p.x + PLAYER_W / 2 < z.x + MOB_W / 2 ? -1 : 1;
    const nx = z.x + dir * ZOMBIE_SPEED * dt;
    const col = Math.floor(dir > 0 ? nx + MOB_W : nx);
    let blocked = false;
    for (let y = Math.floor(z.y + 0.05); y <= Math.floor(z.y + MOB_H - 0.05); y++) if (P.solidAt(col, y)) blocked = true;
    if (!blocked) z.x = clamp(nx, 0, S.width - MOB_W);
    else if (z.vy === 0) z.vy = -14; // hop up a hill (high enough for one block)
    z.vy = Math.min(z.vy + GRAVITY * dt, 20);
    let ny = z.y + z.vy * dt;
    const feet = Math.floor(ny + MOB_H);
    if (z.vy > 0 && [Math.floor(z.x + 0.05), Math.floor(z.x + MOB_W - 0.05)].some((x) => P.solidAt(x, feet))) {
      ny = feet - MOB_H;
      z.vy = 0;
    }
    z.y = ny;
    // you and the zombie
    if (P.touches(z.x, z.y, z.x + MOB_W, z.y + MOB_H)) {
      if (p.vy > 0 && p.y + PLAYER_H < z.y + 0.6) {
        // stomped!
        p.vy = -JUMP_V * 0.8;
        if (z.hurtT <= 0) {
          z.hp--;
          z.hurtT = 0.5;
          P.explode(z.x + MOB_W / 2, z.y + 0.3, ["#6bbf4a", "#3d7a2a", "#c9c9d6"]);
          if (z.hp <= 0) { z.phase = "won"; z.t = 0; z.out = false; return true; }
        }
      } else if (z.invT <= 0) {
        // it got you: one bar gone, a shove away, and a moment to recover
        z.lives--;
        z.invT = 1.2;
        S.knock = dir * 14;
        p.vy = -8;
        P.sparkle(p.x + PLAYER_W / 2, p.y + PLAYER_H / 2, ["#ff5a4a", "#ffffff"]);
        if (z.lives <= 0) { backToLevel(); P.die("boom", false); return true; }
      }
    }
    return false;
  };

  // ----- The Box arena -----
  // Land on a Box and you're inside it: the level is put aside (like for a
  // mini game) for the level's Box arena. Out of the top, you're back on the
  // box, which is open now so you don't fall straight back in.
  const BOX_KEEP = ["movers", "shooters", "bullets", "spawners", "blazes", "fireballs", "watchers", "mobs", "plats", "fallers", "slides", "doorsLanded", "critters", "arrows", "risers"];
  const startBox = (bx, by) => {
    const back = { player: { ...S.player }, free: S.free, flying: S.flying };
    for (const k of WORLD.concat(["risers"])) back[k] = S[k];
    [S.template, S.looks] = strip(boxArenaGrid(level.box));
    S.grid = S.template.map((r) => r.slice());
    S.width = ARENA_W;
    for (const k of BOX_KEEP) S[k] = [];
    S.powered = new Set();
    // creatures someone put in the box come alive in there
    S.grid.forEach((row, y) => row.forEach((ch, x) => {
      if (CRITTERS.includes(ch)) { row[x] = AIR; S.critters.push(makeCritter(ch, x, y)); }
    }));
    const at = findSpawn(S.grid);
    S.player.x = at.x + (1 - PLAYER_W) / 2;
    S.player.y = at.y + (1 - PLAYER_H);
    S.player.vy = 0;
    S.camX = 0;
    S.camY = 0;
    S.flying = false;
    S.climb = null;
    S.runDir = 1;
    setFree(true);
    S.box = { x: bx, y: by, back };
    S.warp = null;
    P.sparkle(at.x + 0.5, at.y + 0.5, ["#c8955a", "#ffd9a0", "#ffffff"]);
  };
  // onTop: you climbed out, so you land on the (now open) box. Without it
  // (you got out by dying), the level is just put back for the respawn.
  const leaveBox = (onTop) => {
    const b = S.box;
    if (!b) return;
    for (const k of WORLD.concat(["risers"])) S[k] = b.back[k];
    setFree(b.back.free);
    S.flying = b.back.flying;
    S.box = null;
    S.climb = null;
    if (!onTop) return;
    S.grid[b.y][b.x] = BOX_OPEN;
    S.player = { ...b.back.player, x: b.x + (1 - PLAYER_W) / 2, y: b.y - PLAYER_H, vy: -JUMP_V * 0.6, onGround: false };
    P.sparkle(b.x + 0.5, b.y, ["#c8955a", "#ffd9a0", "#ffffff"]);
  };

  // ----- Mini games: Laser dodge and Meteor dodge -----
  // The level is put aside (like for the Zombie trap) while you're in the
  // level's mini game arena with player 2 (arrow keys) or the computer.
  const MINI_COUNT = 3, P2_SPEED = 6.5;
  // Meteor dodge is in space: no platforms, and you float (up, down, or stay put)
  const SPACE_FLY = 6;
  // PvP: 5 hits each; a sword swing reaches just over a block, shots fly straight
  const PVP_HP = 5, SWORD_REACH = 1.4, SWORD_WAIT = 0.45, SHOT_WAIT = 0.7, SHOT_SPEED = 13, PVP_SAFE = 0.6;
  const startMini = (setting) => {
    const [game, opp] = String(setting || MINI_DEFAULT).split(":");
    const back = {};
    for (const k of WORLD) back[k] = S[k];
    back.player = { ...S.player };
    back.risers = S.risers;
    back.free = S.free;
    [S.template, S.looks] = game === "meteor"
      ? strip(Array.from({ length: H }, () => Array(ARENA_W).fill(AIR)))
      : strip(miniArenaGrid(level.mini));
    S.grid = S.template.map((r) => r.slice());
    S.width = ARENA_W;
    for (const k of ["movers", "shooters", "bullets", "spawners", "blazes", "fireballs", "watchers", "mobs", "plats", "fallers", "slides", "doorsLanded", "critters", "arrows", "risers"]) S[k] = [];
    S.powered = new Set();
    const at = game === "meteor" ? { x: 3, y: Math.floor(H / 2) } : findSpawn(S.grid);
    S.player.x = at.x + (1 - PLAYER_W) / 2;
    S.player.y = at.y + (1 - PLAYER_H);
    S.player.vy = 0;
    S.camX = 0;
    S.camY = 0;
    setFree(true);
    S.moveL = S.moveR = S.holding = false;
    const x2 = S.width - 1 - at.x;
    S.mini = { game, opp, back, phase: "count", t: 0, play: 0, spawnT: 0.8, hazards: [], cpuT: 0,
      p2: { x: x2 + (1 - PLAYER_W) / 2, y: at.y + (1 - PLAYER_H), vy: 0, onGround: false, left: false, right: false, hold: false, alive: true,
        face: -1, hp: PVP_HP, swordT: 0, shotT: 0, swing: 0, safeT: 0, wantSword: false, wantShot: false },
      p1: { down: false, face: 1, hp: PVP_HP, swordT: 0, shotT: 0, swing: 0, safeT: 0, wantSword: false, wantShot: false },
      shots: [] };
    S.state = "mini";
  };
  // the arrow keys belong to player 2 in a two-player game
  const miniKey = (key, down) => {
    const m = S.mini;
    if (!m) return false;
    if (m.game === "meteor") {
      // going down: Shift or S (or ↓ when there's no player 2)
      if (key === "Shift" || key === "s" || key === "S" || (key === "ArrowDown" && m.opp !== "2p")) { m.p1.down = down; return true; }
      if (key === "ArrowDown" || key === "ArrowUp") {
        if (m.opp !== "2p") return false; // ↑ is your jump key then
        if (key === "ArrowDown") m.p2.down = down; else m.p2.hold = down;
        return true;
      }
    }
    if (m.game === "pvp" && (key === "s" || key === "S" || key === "e" || key === "E")) {
      if (down) { if (key === "s" || key === "S") m.p1.wantSword = true; else m.p1.wantShot = true; }
      return true;
    }
    if (m.opp !== "2p") return false;
    const p2 = m.p2;
    if (key === "ArrowLeft") p2.left = down;
    else if (key === "ArrowRight") p2.right = down;
    else if (key === "ArrowUp") p2.hold = down;
    else if (key === "ArrowDown" && m.game === "pvp") { if (down) p2.wantSword = true; }
    else if ((key === "Enter" || key === "/") && m.game === "pvp") { if (down) p2.wantShot = true; }
    else return false;
    return true;
  };
  const updateMiniIntro = (dt) => {
    const m = S.mini;
    m.t += dt;
    if (m.t >= MINI_COUNT) { m.phase = "play"; m.t = 0; S.state = "run"; }
  };
  const boxHit = (x, y, w, h, bx, by, bw, bh) => x < bx + bw && x + w > bx && y < by + bh && y + h > by;
  const hazardHits = (h, x, y) => (h.kind === "laser" ? h.warn <= 0 && h.beam > 0 && x < h.x + 1 && x + PLAYER_W > h.x
    : boxHit(x, y, PLAYER_W, PLAYER_H, h.x, h.y, 0.9, 0.9));
  // the computer: when something's coming down on it, it moves out of the way
  // (a moment late, so it can be beaten); otherwise it ambles about
  // in PvP the computer walks up and swings, or shoots when you're level with it
  const cpuFight = (m, p2) => {
    const p = S.player, dx = p.x - p2.x, dy = p.y - p2.y;
    p2.left = p2.right = false;
    const close = Math.abs(dx) < SWORD_REACH && Math.abs(dy) < 0.9;
    if (close) { if (Math.random() < 0.3) p2.wantSword = true; }
    else if (Math.abs(dy) < 0.6 && Math.random() < 0.12) p2.wantShot = true;
    if (!close && Math.random() < 0.6) { if (dx > 0) p2.right = true; else p2.left = true; }
    else if (close && Math.random() < 0.3) { if (dx > 0) p2.left = true; else p2.right = true; } // back off a bit
    p2.hold = dy < -1 ? Math.random() < 0.6 : Math.random() < 0.1;
    if (dx) p2.face = dx > 0 ? 1 : -1;
  };
  const cpuThink = (m, p2, dt) => {
    m.cpuT -= dt;
    if (m.cpuT > 0) return;
    m.cpuT = 0.18 + Math.random() * 0.12;
    // in PvP it thinks slower, so you get time to hit back
    if (m.game === "pvp") { m.cpuT += 0.2; cpuFight(m, p2); return; }
    const mid = p2.x + PLAYER_W / 2;
    const threat = m.hazards.find((h) => (h.kind === "laser" ? h.warn > 0 && Math.abs(h.x + 0.5 - mid) < 1.3
      : h.y < p2.y && Math.abs(h.x + 0.45 - mid) < 1.4));
    p2.left = p2.right = false;
    if (threat && Math.random() > 0.12) {
      const away = (threat.kind === "laser" ? threat.x + 0.5 : threat.x + 0.45) < mid ? 1 : -1;
      const dir = (away > 0 && p2.x > S.width - 2) || (away < 0 && p2.x < 1) ? -away : away;
      if (dir > 0) p2.right = true; else p2.left = true;
    } else if (Math.random() < 0.3) {
      if (Math.random() < 0.5) p2.left = true; else p2.right = true;
    }
    p2.hold = Math.random() < 0.08;
    if (m.game === "meteor") { const r = Math.random(); p2.hold = r < 0.25; p2.down = r > 0.75; }
  };
  const moveP2 = (m, dt) => {
    const p2 = m.p2;
    if (!p2.alive) return;
    if (m.opp === "cpu") cpuThink(m, p2, dt);
    const dir = (p2.right ? 1 : 0) - (p2.left ? 1 : 0);
    if (dir && !(m.opp === "cpu" && m.game === "pvp")) p2.face = dir;
    if (dir) {
      const nx = clamp(p2.x + dir * P2_SPEED * dt, 0, S.width - PLAYER_W);
      const col = Math.floor(dir > 0 ? nx + PLAYER_W : nx);
      if (![Math.floor(p2.y + 0.02), Math.floor(p2.y + PLAYER_H - 0.02)].some((r) => P.solidAt(col, r))) p2.x = nx;
    }
    if (m.game === "meteor") {
      p2.y = clamp(p2.y + (p2.hold ? -SPACE_FLY : p2.down ? SPACE_FLY : 0) * dt, 0, H - PLAYER_H);
      return;
    }
    if (p2.hold && p2.onGround) p2.vy = -JUMP_V;
    p2.vy = Math.min(p2.vy + GRAVITY * dt, 20);
    let ny = p2.y + p2.vy * dt;
    const cols = [Math.floor(p2.x + 0.02), Math.floor(p2.x + PLAYER_W - 0.02)];
    p2.onGround = false;
    if (p2.vy > 0) {
      const feet = Math.floor(ny + PLAYER_H);
      if (cols.some((x) => P.solidAt(x, feet))) { ny = feet - PLAYER_H; p2.vy = 0; p2.onGround = true; }
    } else if (p2.vy < 0) {
      const head = Math.floor(ny);
      if (cols.some((x) => P.solidAt(x, head))) { ny = head + 1; p2.vy = 0; }
    }
    p2.y = ny;
  };
  const spawnHazard = (m) => {
    // most aim at someone; some land anywhere
    const p = S.player, p2 = m.p2;
    const aim = Math.random() < 0.65 ? (Math.random() < 0.5 || !p2.alive ? p.x : p2.x) + (Math.random() - 0.5) * 3
      : Math.random() * S.width;
    if (m.game === "laser") {
      m.hazards.push({ kind: "laser", x: clamp(Math.floor(aim), 0, S.width - 1), warn: 0.9, beam: 0.35 });
    } else {
      m.hazards.push({ kind: "meteor", x: clamp(aim - 0.45, 0, S.width - 0.9), y: -1.5, vy: 6 + Math.random() * 3 + m.play * 0.06 });
    }
  };
  // One PvP step: sword swings, shots, and hits. Returns who got knocked out.
  const pvpStep = (m, dt) => {
    const p = S.player, a = m.p1, b = m.p2;
    if (S.moveR && !S.moveL) a.face = 1; else if (S.moveL && !S.moveR) a.face = -1;
    const bodies = [[a, p.x, p.y], [b, b.x, b.y]];
    for (const [who, x, y] of bodies) {
      who.swordT -= dt; who.shotT -= dt; who.swing = Math.max(0, who.swing - dt); who.safeT -= dt;
      const [, ox, oy] = bodies.find((o) => o[0] !== who);
      const foe = who === a ? b : a;
      const slow = who === b && m.opp === "cpu" ? 1.8 : 1; // the computer swings and shoots less often
      if (who.wantSword && who.swordT <= 0) {
        who.swordT = SWORD_WAIT * slow; who.swing = 0.2;
        const ahead = (ox - x) * who.face;
        if (ahead > -0.3 && ahead < SWORD_REACH && Math.abs(oy - y) < 0.9) hitFoe(foe, who.face);
      }
      if (who.wantShot && who.shotT <= 0) {
        who.shotT = SHOT_WAIT * slow;
        m.shots.push({ x: x + PLAYER_W / 2 + who.face * 0.5, y: y + PLAYER_H * 0.45, vx: who.face * SHOT_SPEED, from: who });
      }
      who.wantSword = who.wantShot = false;
    }
    for (const s of m.shots) {
      s.x += s.vx * dt;
      if (s.x < 0 || s.x > S.width || P.solidAt(Math.floor(s.x), Math.floor(s.y))) { s.gone = true; continue; }
      const foe = s.from === a ? b : a;
      const [fx, fy] = foe === a ? [p.x, p.y] : [b.x, b.y];
      if (s.x > fx && s.x < fx + PLAYER_W && s.y > fy && s.y < fy + PLAYER_H) { s.gone = true; hitFoe(foe, Math.sign(s.vx)); }
    }
    m.shots = m.shots.filter((s) => !s.gone);
    return [a.hp <= 0, b.hp <= 0];
  };
  const hitFoe = (foe, dir) => {
    if (foe.safeT > 0 || foe.hp <= 0) return;
    foe.hp--;
    foe.safeT = PVP_SAFE;
    // a little knock back
    const m = S.mini;
    if (foe === m.p2) { m.p2.x = clamp(m.p2.x + dir * 0.6, 0, S.width - PLAYER_W); m.p2.vy = -5; }
    else { S.player.x = clamp(S.player.x + dir * 0.6, 0, S.width - PLAYER_W); S.player.vy = -5; }
    const [x, y] = foe === m.p2 ? [m.p2.x, m.p2.y] : [S.player.x, S.player.y];
    P.sparkle(x + PLAYER_W / 2, y + PLAYER_H / 2, ["#ff4a4a", "#ffffff"]);
  };
  // Returns true when the step should stop here (the game's over or ending).
  const updateMini = (dt) => {
    const m = S.mini, p = S.player;
    if (m.phase === "won" || m.phase === "lost") {
      m.t += dt;
      if (m.t > 1.8) {
        const lost = m.phase === "lost";
        for (const k of WORLD) S[k] = m.back[k];
        S.player = m.back.player;
        S.risers = m.back.risers;
        S.player.vy = 0;
        setFree(m.back.free);
        S.mini = null;
        S.state = "run";
        if (lost) P.die("boom", false);
      }
      return true;
    }
    m.play += dt;
    moveP2(m, dt);
    if (m.game === "pvp") {
      const [out1, out2] = pvpStep(m, dt);
      if (out2) {
        m.p2.alive = false;
        P.explode(m.p2.x + PLAYER_W / 2, m.p2.y + PLAYER_H / 2, ["#b46bff", "#7ee8ff", "#ffffff"]);
        m.phase = "won"; m.t = 0; m.shots = []; S.moveL = S.moveR = false;
        return true;
      }
      if (out1) {
        P.explode(p.x + PLAYER_W / 2, p.y + PLAYER_H / 2, ["#ffd54a", "#ff8a3d", "#e04a2f"]);
        m.phase = "lost"; m.t = 0; m.shots = []; S.moveL = S.moveR = false;
        return true;
      }
      return false;
    }
    m.spawnT -= dt;
    if (m.spawnT <= 0) { m.spawnT = Math.max(0.3, 1.1 - m.play * 0.025); spawnHazard(m); }
    for (const h of m.hazards) {
      if (h.kind === "laser") {
        if (h.warn > 0) h.warn -= dt;
        else h.beam -= dt;
        if (h.beam <= 0) h.gone = true;
      } else {
        h.y += h.vy * dt;
        if (h.y > H || P.solidAt(Math.floor(h.x + 0.45), Math.floor(h.y + 0.9))) {
          h.gone = true;
          P.sparkle(h.x + 0.45, h.y + 0.6, ["#ff8a3d", "#ffd54a", "#8c8c8c"]);
        }
      }
    }
    const hit1 = m.hazards.some((h) => !h.gone && hazardHits(h, p.x, p.y));
    const hit2 = m.p2.alive && m.hazards.some((h) => !h.gone && hazardHits(h, m.p2.x, m.p2.y));
    m.hazards = m.hazards.filter((h) => !h.gone);
    if (hit2) {
      m.p2.alive = false;
      P.explode(m.p2.x + PLAYER_W / 2, m.p2.y + PLAYER_H / 2, ["#b46bff", "#7ee8ff", "#ffffff"]);
    }
    if (hit1 && !hit2) {
      P.explode(p.x + PLAYER_W / 2, p.y + PLAYER_H / 2, ["#ffd54a", "#ff8a3d", "#e04a2f"]);
      m.phase = "lost"; m.t = 0; S.moveL = S.moveR = false;
      return true;
    }
    if (hit2) { m.phase = "won"; m.t = 0; m.hazards = []; S.moveL = S.moveR = false; return true; }
    return false;
  };

  const updateBoss = (dt) => {
    if (S.boss.galaxy) return updateGalaxy(dt);
    if (S.boss.glitch) return updateGlitch(dt);
    const b = S.boss;
    if (b.hurtT > 0) b.hurtT -= dt;

    for (const r of b.rain) {
      r.y += RAIN_SPEED * dt;
      if (P.touches(r.x, r.y, r.x + 1, r.y + 1)) { P.die("boom", true); return true; }
      if (r.y >= H - 2) {
        r.dead = true;
        P.sparkle(r.x + 0.5, H - 1.2, ["#ffd54a", "#ff8a3d", "#e04a2f", "#8c8c8c"]);
      }
    }
    b.rain = b.rain.filter((r) => !r.dead);

    // Its head and torso are one tall column: land on top to stomp it, and
    // anywhere else it's simply a wall.
    const feet = S.player.y + PLAYER_H;
    if (S.player.x + PLAYER_W > BOSS_BODY && feet > BOSS_TOP) {
      if (S.player.vy > 0 && feet < BOSS_TOP + 0.5) {
        S.player.y = BOSS_TOP - PLAYER_H;
        S.player.vy = -JUMP_V;
        S.knock = -18; // thrown clear, so you don't drop onto its spike arm
        if (b.hurtT <= 0) {
          b.hp--;
          b.hurtT = 1.5;
          P.explode(S.player.x + PLAYER_W / 2, BOSS_TOP + 0.5, ["#ffd54a", "#ff8a3d", "#e04a2f", "#ffffff"]);
          if (b.hp <= 0) {
            S.state = "bossdown";
            S.downT = 0;
            setPlats(false);
            S.bullets = [];
            b.rain = [];
            return true;
          }
          // a stomp ends the climb early and moves it on to its next attack
          b.stage = 1;
          nextStage();
        }
      } else {
        S.player.x = BOSS_BODY - PLAYER_W;
      }
    }
    // the spike arm hanging at its side
    if (P.touches(b.x + 0.1, BOSS_TOP + 12 * BOSS_PX, b.x + 0.9, BOSS_TOP + 28 * BOSS_PX)) {
      P.die("poof", true);
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
        const x = Math.random() < 0.45 ? S.player.x - 0.15 : Math.random() * (BOSS_X - 1);
        b.rain.push({ x: clamp(x, 0, BOSS_X - 1), y: -1 });
      } else if (b.stage === 2) {
        b.spawnT = [1.2, 1, 0.8][anger] || 0.8;
        const mx = b.x + 21.5 * BOSS_PX, my = BOSS_TOP + 21 * BOSS_PX;
        const a = Math.atan2(S.player.y + PLAYER_H / 2 - my, S.player.x + PLAYER_W / 2 - mx);
        // Unlike a Shooter block's stars these fly straight at where you were:
        // in a small arena there's no outrunning ones that steer.
        S.bullets.push({ x: mx, y: my, a, life: BULLET_LIFE, fromX: -9, fromY: -9, straight: true });
      }
    }
    return false;
  };

  // Beaten: it shakes apart in a string of explosions, then the level is won.
  const updateBossDown = (dt) => {
    const before = S.downT;
    S.downT += dt;
    if (S.boss.glitch) {
      // it breaks up into loose pixels
      if (Math.floor(before / 0.1) !== Math.floor(S.downT / 0.1)) {
        P.sparkle(S.boss.x + Math.random() * GLITCH_SIZE, S.boss.top + Math.random() * GLITCH_SIZE, GLITCH_COLORS);
      }
      if (S.downT >= 1.8) {
        S.boss.gone = true;
        S.state = "run";
        P.win();
      }
      return;
    }
    if (Math.floor(before / 0.15) !== Math.floor(S.downT / 0.15)) {
      P.explode(S.boss.x + Math.random() * 4.8, BOSS_TOP + Math.random() * 6.4,
        ["#ffd54a", "#ff8a3d", "#e04a2f", "#8c8c8c"]);
    }
    if (S.downT >= 1.8) {
      S.boss.gone = true;
      smoke(S.boss.x + 2.4, BOSS_TOP + 3.5, 40, 5);
      S.state = "run";
      P.win();
    }
  };

  return {
    dragonAt, endCut, enterBoss, enterCrash, leaveBox, miniKey, startBoss,
    startBox, startMini, startZombie, updateBoss, updateBossDown, updateCut,
    updateMini, updateMiniIntro, updateZombie, updateZombieIntro
  };
};
