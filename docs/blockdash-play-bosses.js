// Block Dash play screen: the boss fights (the TNT Mech and The Glitch).
//
// Part of showPlay in blockdash.js, which calls this once per level played.
// S holds the play screen's changing values (S.player, S.grid, …), P the
// helpers shared between the play files, BD blockdash.js's own constants.
window.BDPlayBosses = (S, P, BD) => {
  "use strict";
  const {
    AIR, ARENA_W, arenaBgOf, arenaGrid, BOSS_BODY, BOSS_HP, BOSS_PX, BOSS_STAGE, BOSS_TOP,
    BOSS_X, BULLET_LIFE, clamp, crashArenaGrid, CUT_END, ENDER_BULLET_SPEED, findSpawn,
    GALAXY_H, GALAXY_SHOOT, GALAXY_W, GLITCH_BLOCKS, GLITCH_COLORS, GLITCH_FIX_TIME,
    GLITCH_HP, GLITCH_SIZE, GLITCH_SOLID, GLITCH_SPOTS, H, JUMP_V, PLAYER_H, PLAYER_W,
    RAIN_SPEED, toast
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
    dragonAt, endCut, enterBoss, enterCrash, startBoss, updateBoss, updateBossDown,
    updateCut
  };
};
