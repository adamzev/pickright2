// Block Dash play screen: things that move and hurt you (lava, shooters, mobs, blazes, Watchers).
//
// Part of showPlay in blockdash.js, which calls this once per level played.
// S holds the play screen's changing values (S.player, S.grid, …), P the
// helpers shared between the play files, BD blockdash.js's own constants.
window.BDPlayHazards = (S, P, BD) => {
  "use strict";
  const {
    AIR, ARROW_SPEED, baseOf, BLAZE_DRIFT, BLAZE_MAX, BLAZE_REACH, BLAZE_SHOOT, BLOCK_STEP,
    BOSS_SHOT_SPEED, BULLET_LIFE, BULLET_SPEED, BULLET_TURN, BUTTON_ON, CHASE_SPEED, clamp,
    ELEV_DOOR, ELEV_DOOR_OPEN, ELEVATOR_BOOST, ENDER_AHEAD, ENDER_BULLET_SPEED, ENDER_NOTICE,
    ENTER, ENTER_DONE, FALL_ACCEL, FALL_MAX, FALL_PUSH, FIREBALL_SPEED, FLOWED, GLITCH_EVERY,
    GLITCH_HOP, GLITCH_IRON, GRAVITY, H, HURT_SAFE, inCone, isDoor, isSolid, isWire, JUMP_V,
    LAMP, LAVA_FALL, LAVA_RISE, LEVER_ON, LIFT, LOGGABLE, MOB_H, MOB_W, nextToWater, noteKey,
    PLAYER_H, PLAYER_W, PUSH, SHOOT_EVERY, SHOVE, SKELETON, SKELETON_SHOOT, SKELETON_SPEED,
    SLIME_MOB, SLIME_SIZES, SOLDIER_BLAST, SOLDIER_FUSE, SOLDIER_SPEED, SPAWN_EVERY,
    TELEPORT, TNT_SOLDIER, UP_DEFAULT, UP_LIFT, UP_LIFT_SHORT, UP_SPEED, WATCH_CYCLE,
    WATCH_OPEN, WIRE, ZOMBIE_TRAP, ZOMBIE_TRAP_USED
  } = BD;
  const {
    die, explode, gotRod, sparkle, VIEW_COLS
  } = P;

  const mobSolid = (x0, y0, x1, y1) => {
    for (let y = Math.floor(y0); y <= Math.floor(y1 - 0.001); y++) {
      for (let x = Math.floor(x0); x <= Math.floor(x1 - 0.001); x++) {
        if (P.solidAt(x, y)) return true;
      }
    }
    return false;
  };

  // Is any part of you inside this Watcher's cone?
  const canSee = (w) => {
    const i = 0.14;
    const xs = [S.player.x + i, S.player.x + PLAYER_W / 2, S.player.x + PLAYER_W - i];
    const ys = [S.player.y + i, S.player.y + PLAYER_H / 2, S.player.y + PLAYER_H - i];
    return xs.some((px) => ys.some((py) => inCone(S.grid, w.x, w.y, px, py)));
  };
  // timed from the (re)start, so each attempt sees the same rhythm, like a rhythm game
  const eyeOpen = (w) => w.stare || (S.runT + w.ph) % WATCH_CYCLE < WATCH_OPEN;

  // Player's hit box for things that move, a little forgiving like items.
  const touches = (x0, y0, x1, y1) => {
    const inset = 0.14;
    return x1 > S.player.x + inset && x0 < S.player.x + PLAYER_W - inset &&
      y1 > S.player.y + inset && y0 < S.player.y + PLAYER_H - inset;
  };
  const onScreen = (x) => x >= S.camX - 1 && x < S.camX + VIEW_COLS + 0.5;

  // Moving lava, shooters and their stars. Returns true if you died.
  const updateHazards = (dt) => {
    for (const m of S.movers) {
      if (!m.active && onScreen(m.x)) m.active = true;
      if (!m.active || m.done) continue;
      m.t += dt * (m.dir < 0 ? LAVA_RISE : LAVA_FALL);
      if (m.t < 1) continue;
      m.t = 0;
      // Grow one block into empty air; anything else (ground, an item,
      // the edge of the level) stops the flow for good.
      const next = m.tip + m.dir;
      const there = next >= 0 && next < S.grid.length ? S.grid[next][m.x] : null;
      const soak = there !== null && LOGGABLE.includes(baseOf(there));
      if (there !== AIR && !soak) { m.done = true; continue; }
      if (nextToWater(S.grid, m.x, next)) {
        // lava meeting water hardens into stone, with a hiss of steam
        S.grid[next][m.x] = "s";
        m.done = true;
        sparkle(m.x + 0.5, next + 0.5, ["#e8e8f0", "#c9c9d6", "#ffffff"]);
        continue;
      }
      S.grid[next][m.x] = soak ? FLOWED + there : FLOWED;
      m.tip = next;
    }

    for (const sh of S.shooters) {
      if (!onScreen(sh.x)) continue;
      sh.t -= dt;
      if (sh.t > 0) continue;
      sh.t = SHOOT_EVERY;
      const bx = sh.x + 0.5, by = sh.y + 0.5;
      const a = Math.atan2(S.player.y + PLAYER_H / 2 - by, S.player.x + PLAYER_W / 2 - bx);
      S.bullets.push({ x: bx, y: by, a, life: BULLET_LIFE, fromX: sh.x, fromY: sh.y });
    }

    for (const b of S.bullets) {
      // steer toward the player, but only so fast — you can outrun a turn
      const want = Math.atan2(S.player.y + PLAYER_H / 2 - b.y, S.player.x + PLAYER_W / 2 - b.x);
      let diff = want - b.a;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      if (!b.straight) b.a += clamp(diff, -BULLET_TURN * dt, BULLET_TURN * dt);
      const sp = b.ender ? ENDER_BULLET_SPEED : b.straight ? BOSS_SHOT_SPEED : BULLET_SPEED;
      b.x += Math.cos(b.a) * sp * dt;
      b.y += Math.sin(b.a) * sp * dt;
      b.life -= dt;
      const cx = Math.floor(b.x), cy = Math.floor(b.y);
      if ((cx !== b.fromX || cy !== b.fromY) && P.solidAt(cx, cy)) b.life = 0;
      if (b.life > 0 && touches(b.x - 0.2, b.y - 0.2, b.x + 0.2, b.y + 0.2)) {
        die(b.ender ? "delete" : "boom", !!b.straight); // the bosses' shots count as a mob hit, a Shooter block's don't
        return true;
      }
    }
    S.bullets = S.bullets.filter((b) => b.life > 0);

    for (const sp of S.spawners) {
      if (!onScreen(sp.x) || sp.alive >= BLAZE_MAX) continue;
      sp.t -= dt;
      if (sp.t > 0) continue;
      sp.t = SPAWN_EVERY;
      // come out of whichever side of the cage is open, top first
      const exits = [[0, -1], [-1, 0], [1, 0], [0, 1]];
      const ex = exits.find(([dx, dy]) => {
        const cx = sp.x + dx, cy = sp.y + dy;
        return cx >= 0 && cx < S.width && cy >= 0 && cy < S.grid.length && !isSolid(S.grid[cy][cx]);
      });
      if (!ex) continue;
      const bx = sp.x + ex[0] + 0.5, by = sp.y + ex[1] + 0.5;
      sp.alive++;
      S.blazes.push({ x: bx, y: by, homeX: bx, homeY: by, t: BLAZE_SHOOT * 0.6, sp, ph: Math.random() * 6 });
    }

    for (const bz of S.blazes) {
      // drift toward you, but stay near the spawner, bobbing up and down
      const want = clamp(S.player.x + PLAYER_W / 2, bz.homeX - BLAZE_REACH, bz.homeX + BLAZE_REACH);
      bz.x += clamp(want - bz.x, -BLAZE_DRIFT * dt, BLAZE_DRIFT * dt);
      bz.y = bz.homeY + Math.sin(S.time * 2 + bz.ph) * 0.35;
      const r = 0.4;
      if (touches(bz.x - r, bz.y - r, bz.x + r, bz.y + r)) {
        // landing on top pops it and bounces you; any other touch burns
        if (S.player.vy > 0 && S.player.y + PLAYER_H < bz.y + 0.1) {
          bz.dead = true;
          bz.sp.alive--;
          S.player.vy = -JUMP_V * 0.85;
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
      const a = Math.atan2(S.player.y + PLAYER_H / 2 - bz.y, S.player.x + PLAYER_W / 2 - bz.x);
      S.fireballs.push({ x: bz.x, y: bz.y, vx: Math.cos(a) * FIREBALL_SPEED,
        vy: Math.sin(a) * FIREBALL_SPEED, life: BULLET_LIFE });
    }
    S.blazes = S.blazes.filter((bz) => !bz.dead);

    for (const fb of S.fireballs) {
      fb.x += fb.vx * dt;
      fb.y += fb.vy * dt;
      fb.life -= dt;
      if (P.solidAt(Math.floor(fb.x), Math.floor(fb.y))) fb.life = 0;
      if (fb.life > 0 && touches(fb.x - 0.2, fb.y - 0.2, fb.x + 0.2, fb.y + 0.2)) {
        die("burn", true);
        return true;
      }
    }
    S.fireballs = S.fireballs.filter((fb) => fb.life > 0);

    for (const w of S.watchers) {
      if (onScreen(w.x) && eyeOpen(w) && canSee(w)) {
        die("delete");
        return true;
      }
    }

    for (const m of S.mobs) {
      if (m.gone) continue;
      if (m.kind === "N" && !m.awake &&
          m.x - S.player.x < ENDER_NOTICE && m.x > S.player.x + PLAYER_W) {
        // teleport to stand on the ground a few blocks in front of you
        m.awake = true;
        const cx = Math.floor(S.player.x + ENDER_AHEAD);
        for (let y = Math.max(1, Math.floor(S.player.y)); y < S.grid.length - 1; y++) {
          if (!P.solidAt(cx, y) && !P.solidAt(cx, y - 1) && P.solidAt(cx, y + 1)) {
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
        const dir = Math.sign(S.player.x - m.x) || 1;
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
      if (m.y > S.grid.length + 2) { m.gone = true; continue; }

      if (!touches(m.x, m.y, m.x + MOB_W, m.y + MOB_H)) continue;
      const stomp = S.player.vy > 0 && S.player.y + PLAYER_H < m.y + 0.45;
      if (stomp) {
        S.player.vy = -JUMP_V * 0.85;
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
    S.mobs = S.mobs.filter((m) => !m.gone);
    if (updateCritters(dt)) return true;
    updateFallers(dt);
    updateRisers(dt);
    updateBlocks(dt);
    return false;
  };

  // ----- Critters: Slimes, Skeletons and TNT Soldiers -----
  // They don't get you in one go: you have HEALTH_MAX bars. A hit takes some,
  // knocks you away from where it came from (fromX), and you're safe for a
  // moment. At none left you die (a shield or armor can still save you).
  // Returns true if you died.
  const hurt = (bars, fromX) => {
    if (S.hurtT > 0) return false;
    S.hp -= bars;
    S.hurtT = HURT_SAFE;
    const p = S.player;
    S.knock = (p.x + PLAYER_W / 2 < fromX ? -1 : 1) * 12;
    p.vy = Math.min(p.vy, -7);
    sparkle(p.x + PLAYER_W / 2, p.y + PLAYER_H / 2, ["#ff4a4a", "#ffffff"]);
    if (S.hp > 0) return false;
    die("boom", true);
    if (S.state !== "dead") { S.hp = 1; return false; } // saved by a shield or armor
    return true;
  };

  // Returns true if you died this step.
  const updateCritters = (dt) => {
    const p = S.player;
    if (S.hurtT > 0) S.hurtT -= dt;
    const born = [];
    for (const c of S.critters) {
      if (c.gone) continue;
      if (!c.awake && onScreen(c.x)) c.awake = true;
      if (!c.awake) continue;
      const dir = p.x + PLAYER_W / 2 < c.x + c.w / 2 ? -1 : 1;
      const near = Math.abs(p.x + PLAYER_W / 2 - (c.x + c.w / 2));
      let vx = 0;
      if (c.kind === SLIME_MOB) {
        // a pause on the ground, then a hop your way
        if (c.onGround) {
          c.t -= dt;
          if (c.t <= 0) { c.vy = -(6 + c.size * 1.5); c.vx = dir * (2 + c.size * 0.4); c.t = 0.5 + c.size * 0.15; }
          else c.vx = 0;
        }
        vx = c.vx;
      } else if (c.kind === SKELETON) {
        if (near > 3) vx = dir * SKELETON_SPEED; // keeps a little distance to shoot from
        c.shootT -= dt;
        if (c.shootT <= 0 && near < 14) {
          c.shootT = SKELETON_SHOOT;
          S.arrows.push({ x: c.x + c.w / 2, y: c.y + c.h - 0.45, dir, life: 3 }); // low: you are shorter than a skeleton
        }
      } else if (c.kind === TNT_SOLDIER) {
        if (c.fuse > 0) {
          c.fuse += dt;
          if (c.fuse >= SOLDIER_FUSE) {
            c.gone = true;
            const cx = c.x + c.w / 2, cy = c.y + c.h / 2;
            explode(cx, cy, ["#ffd54a", "#ff8a3d", "#e04a2f", "#8c8c8c"]);
            explode(cx, cy, ["#ffffff", "#ffd54a", "#e04a2f"]);
            if (Math.hypot(p.x + PLAYER_W / 2 - cx, p.y + PLAYER_H / 2 - cy) < SOLDIER_BLAST && hurt(2, cx)) return true;
            continue;
          }
        } else {
          vx = dir * SOLDIER_SPEED;
          if (near < 1.6 && Math.abs(p.y - c.y) < 2) c.fuse = 0.001; // close: it lights its fuse
        }
      }
      // walk or hop, falling onto the ground; a step up gets a little hop
      if (vx) {
        const nx = c.x + vx * dt;
        if (!mobSolid(nx, c.y, nx + c.w, c.y + c.h)) c.x = nx;
        else if (c.onGround && c.kind !== SLIME_MOB) c.vy = -JUMP_V * 0.7;
      }
      c.vy = Math.min(c.vy + GRAVITY * dt, 20);
      const ny = c.y + c.vy * dt;
      c.onGround = false;
      if (c.vy > 0 && mobSolid(c.x, ny, c.x + c.w, ny + c.h)) {
        c.y = Math.floor(ny + c.h) - c.h;
        c.vy = 0;
        c.onGround = true;
      } else if (c.vy < 0 && mobSolid(c.x, ny, c.x + c.w, ny + c.h)) {
        c.vy = 0;
      } else c.y = ny;
      if (c.y > S.grid.length + 2) { c.gone = true; continue; }

      if (!touches(c.x, c.y, c.x + c.w, c.y + c.h)) continue;
      if (p.vy > 0 && p.y + PLAYER_H < c.y + Math.min(0.45, c.h * 0.5)) {
        // stomped!
        p.vy = -JUMP_V * 0.85;
        c.gone = true;
        const colors = c.kind === SLIME_MOB ? ["#6bdc5a", "#b6ffb0", "#3d8a2a"] : c.kind === SKELETON ? ["#e6e6e6", "#b9b9b9", "#ffffff"] : ["#e04a2f", "#ffffff", "#ffd54a"];
        sparkle(c.x + c.w / 2, c.y + c.h / 2, colors);
        if (c.kind === SLIME_MOB && c.size > 1) {
          // a slime splits into two smaller ones, hopping apart
          for (const side of [-1, 1]) {
            const [w, h] = SLIME_SIZES[c.size - 1];
            born.push({ ...c, size: c.size - 1, w, h, x: c.x + c.w / 2 - w / 2 + side * 0.4, y: c.y + c.h - h, vy: -7, vx: side * 2.5, t: 0.8, gone: false, onGround: false });
          }
        }
        continue;
      }
      if (hurt(1, c.x + c.w / 2)) return true;
    }
    S.critters = S.critters.filter((c) => !c.gone).concat(born);
    // Skeleton arrows fly straight until they hit something
    for (const a of S.arrows) {
      a.x += a.dir * ARROW_SPEED * dt;
      a.life -= dt;
      if (P.solidAt(Math.floor(a.x), Math.floor(a.y))) a.life = 0;
      if (a.life > 0 && touches(a.x - 0.3, a.y - 0.08, a.x + 0.3, a.y + 0.08)) {
        a.life = 0;
        if (hurt(1, a.x - a.dir)) return true;
      }
    }
    S.arrows = S.arrows.filter((a) => a.life > 0);
    return false;
  };

  // ----- Power -----
  // Works out which wires and lamps are powered, starting from every pressed
  // Button, flipped Lever and green Enter, and opens doors that touch power.
  // Run whenever one of those switches on.
  const SIDES = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const updatePower = () => {
    const g = S.grid, rows = g.length;
    const at = (x, y) => (y >= 0 && y < rows && x >= 0 && x < S.width ? g[y][x] : null);
    const lit = new Set(); // powered squares: sources and wires
    const queue = [];
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < S.width; x++) {
        const ch = g[y][x];
        if (ch === BUTTON_ON || ch === LEVER_ON || ch === ENTER_DONE) { lit.add(noteKey(x, y)); queue.push([x, y]); }
      }
    }
    while (queue.length) {
      const [x, y] = queue.pop();
      // from a source, power goes into any wire; from a wire, only into the same colour
      const from = isWire(g[y][x]) ? baseOf(g[y][x]) : null;
      for (const [dx, dy] of SIDES) {
        const nx = x + dx, ny = y + dy, k = noteKey(nx, ny);
        const there = at(nx, ny) || AIR;
        if (lit.has(k) || !isWire(there) || (from && baseOf(there) !== from)) continue;
        lit.add(k);
        queue.push([nx, ny]);
      }
    }
    S.powered = new Set(lit);
    // what's touching power: lamps light, doors open
    for (const k of lit) {
      const [x, y] = k.split(",").map(Number);
      for (const [dx, dy] of SIDES) {
        const nx = x + dx, ny = y + dy, ch = at(nx, ny);
        if (!ch) continue;
        if (baseOf(ch) === LAMP) S.powered.add(noteKey(nx, ny));
        if (isUpLift(ch)) startRise(nx, ny);
        // a Zombie trap goes off once
        if (baseOf(ch) === ZOMBIE_TRAP) { g[ny][nx] = ZOMBIE_TRAP_USED; S.zombieQueued = true; }
        // a door's letter is in its bottom square; the square above it is door too
        const dy2 = isDoor(ch) ? ny : at(nx, ny + 1) && isDoor(at(nx, ny + 1)) ? ny + 1 : null;
        if (dy2 !== null) {
          g[dy2][nx] = "/" + g[dy2][nx];
          S.doorT[noteKey(nx, dy2)] = S.time;
        }
      }
    }
  };

  // ----- Up elevators -----
  const isUpLift = (ch) => baseOf(ch || AIR) === UP_LIFT || baseOf(ch || AIR) === UP_LIFT_SHORT;
  // Lifts out every Up elevator block joined to (x, y) as one rising elevator.
  const startRise = (x, y) => {
    const blocks = [], seen = new Set([noteKey(x, y)]), todo = [[x, y]];
    while (todo.length) {
      const [cx, cy] = todo.pop();
      const ch = S.grid[cy][cx];
      blocks.push({ x: cx, y: cy, ch });
      // a short one goes as far as its number says (the shortest one in the group wins)
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = cx + dx, ny = cy + dy, k = noteKey(nx, ny);
        if (seen.has(k) || !S.grid[ny] || !isUpLift(S.grid[ny][nx])) continue;
        seen.add(k);
        todo.push([nx, ny]);
      }
    }
    let far = Infinity;
    for (const b of blocks) {
      S.grid[b.y][b.x] = AIR;
      if (baseOf(b.ch) === UP_LIFT_SHORT) far = Math.min(far, +P.notes[noteKey(b.x, b.y)] || UP_DEFAULT);
    }
    const ys = blocks.map((b) => b.y);
    S.risers.push(...blocks.map((b) => ({ x: b.x, y: b.y, ch: b.ch, elevator: true, up: true, group: blocks, top: Math.min(...ys), from: b.y })));
    blocks.far = far;
    blocks.moved = 0;
  };
  // Every rising elevator moves up together; it stops at a ceiling (or the top
  // of the level), or when a short one has gone its distance. Whoever's
  // standing on it goes up with it.
  const updateRisers = (dt) => {
    if (!S.risers.length) return;
    const p = S.player;
    const groups = [...new Set(S.risers.map((r) => r.group))];
    for (const g of groups) {
      const mine = S.risers.filter((r) => r.group === g);
      const ridingNow = mine.some((r) => r.x < p.x + PLAYER_W && r.x + 1 > p.x && Math.abs(p.y + PLAYER_H - r.y) < 0.1);
      // holding jump while riding speeds it up, like the falling elevators
      const speed = UP_SPEED * (ridingNow && S.holding ? ELEVATOR_BOOST : 1);
      let step = Math.min(speed * dt, g.far - g.moved);
      // a ceiling: the square its top would move into is solid (and isn't
      // part of itself), or it's the top of the level: go only up to it
      for (const r of mine) {
        const row = Math.floor(r.y - step);
        const blocked = row < 0 || (P.solidAt(r.x, row) && !mine.some((m) => m.x === r.x && Math.round(m.y) === row));
        if (blocked && row < r.y) step = Math.min(step, Math.max(0, r.y - (row + 1)));
      }
      const riding = mine.some((r) => r.x < p.x + PLAYER_W && r.x + 1 > p.x && Math.abs(p.y + PLAYER_H - r.y) < 0.1);
      if (riding) {
        // and your head mustn't go into the ceiling either
        const row = Math.floor(p.y - step);
        const cols = [Math.floor(p.x + 0.02), Math.floor(p.x + PLAYER_W - 0.02)];
        if (row < 0 || cols.some((x) => P.solidAt(x, row))) step = Math.min(step, Math.max(0, p.y - (row + 1)));
      }
      for (const r of mine) r.y -= step;
      g.moved += step;
      if (riding) { p.y -= step; p.vy = Math.min(p.vy, 0); }
      // Into an Auto teleport: the whole elevator (and you on it) zooms to the
      // linked one or the next one ahead, and keeps going up from there.
      for (const r of mine) {
        const ty = Math.floor(r.y + 0.5), k = noteKey(r.x, ty);
        if (!S.grid[ty] || S.grid[ty][r.x] !== TELEPORT || (g.tpSkip && g.tpSkip.has(k))) continue;
        const to = P.linkOf(r.x, ty) || P.nextAhead(TELEPORT, r.x, ty);
        if (!to) continue;
        const dx = to.x - r.x, dy = to.y - r.y;
        // only if the whole elevator fits there: not off the level, not into blocks
        const fits = mine.every((m) => m.x + dx >= 0 && m.x + dx < S.width && !P.solidAt(m.x + dx, Math.round(m.y + dy)));
        if (!fits) continue;
        for (const m of mine) { m.x += dx; m.y += dy; }
        if (riding) { p.x += dx; p.y += dy; S.warp = { t: 0, from: S.camX }; }
        // the teleports it comes out on (a whole row, maybe) don't send it on again
        g.tpSkip = new Set(mine.map((m) => noteKey(m.x, Math.floor(m.y + 0.5))));
        break;
      }
      if (step < 1e-6 || g.moved >= g.far - 1e-6) {
        // stopped: blocks again, where they ended up
        for (const r of mine) {
          const at = Math.round(r.y);
          if (at >= 0 && S.grid[at] && S.grid[at][r.x] === AIR) S.grid[at][r.x] = r.ch;
          r.done = true;
        }
      }
    }
    S.risers = S.risers.filter((r) => !r.done);
  };

  // ----- Push and Shove blocks, and Enters -----

  const isPushy = (ch) => baseOf(ch) === PUSH || baseOf(ch) === SHOVE;
  // Can a pushed or falling block go into this square?
  const roomAt = (x, y) => {
    if (x < 0 || x >= S.width || y < 0 || y >= S.grid.length) return false;
    const ch = S.grid[y][x];
    if (ch !== AIR && baseOf(ch) !== ENTER) return false;
    // not into you
    const p = S.player;
    return !(x < p.x + PLAYER_W && x + 1 > p.x && y < p.y + PLAYER_H && y + 1 > p.y);
  };
  // Moves a block one square. Into an Enter, it fills it: the Enter turns
  // green, and when the last one does, you win.
  const moveBlock = (x, y, nx, ny) => {
    if (!roomAt(nx, ny)) return false;
    const ch = S.grid[y][x];
    S.grid[y][x] = AIR;
    if (baseOf(S.grid[ny][nx]) === ENTER) {
      S.grid[ny][nx] = ENTER_DONE;
      updatePower(); // a green Enter powers the wires touching it
      sparkle(nx + 0.5, ny + 0.5, ["#4fbf5a", "#b6ffb0", "#ffffff"]);
      S.entersLeft--;
      if (S.entersLeft <= 0) { P.tellOnce("enters", "✅ Every Enter is green!"); P.win(); }
      return true;
    }
    S.grid[ny][nx] = ch;
    return true;
  };

  // Every BLOCK_STEP: sliding Shove blocks move on, and Push and Shove blocks
  // on screen with nothing under them drop a square.
  const updateBlocks = (dt) => {
    S.blockT += dt;
    if (S.blockT < BLOCK_STEP) return;
    S.blockT -= BLOCK_STEP;
    for (const s of S.slides) {
      if (s.left > 0 && isPushy(S.grid[s.y][s.x]) && moveBlock(s.x, s.y, s.x + s.dir, s.y)) {
        s.x += s.dir;
        s.left--;
      } else s.left = 0;
    }
    S.slides = S.slides.filter((s) => s.left > 0);
    const x0 = Math.max(0, Math.floor(S.camX) - 2);
    const x1 = Math.min(S.width - 1, Math.ceil(S.camX + VIEW_COLS) + 2);
    for (let x = x0; x <= x1; x++) {
      for (let y = S.grid.length - 2; y >= 0; y--) {
        if (!isPushy(S.grid[y][x]) || !roomAt(x, y + 1)) continue;
        const slide = S.slides.find((s) => s.x === x && s.y === y);
        if (moveBlock(x, y, x, y + 1) && slide) slide.y++; // a sliding block keeps sliding after a drop
      }
    }
  };

  const isLiftish = (ch) => baseOf(ch) === LIFT || baseOf(ch) === ELEV_DOOR;
  // a falling block stops in row `at` and is a block again
  const landAt = (f, at) => {
    if (at >= 0 && at < S.grid.length && (S.grid[at][f.x] === AIR || S.grid[at][f.x] === "P")) {
      S.grid[at][f.x] = f.ch;
      if (baseOf(f.ch) === ELEV_DOOR) S.doorsLanded.push({ x: f.x, y: at });
    }
    f.done = true;
  };

  // An elevator lands all at once: when one of its blocks lands, every moving
  // Elevator block (or door) joined to it, side by side or stacked, lands too,
  // shifted by the same amount, so a cage never comes apart.
  const landGroup = (f, at) => {
    const shift = at - f.y;
    const squares = (g) => (g.tall ? [[g.x, Math.round(g.y) - 1], [g.x, Math.round(g.y)]] : [[g.x, Math.round(g.y)]]);
    const joined = (a, b) => squares(a).some(([ax, ay]) => squares(b).some(([bx, by]) => Math.abs(ax - bx) + Math.abs(ay - by) === 1));
    const group = [f];
    for (let i = 0; i < group.length; i++) {
      for (const g of S.fallers) {
        if (!g.done && isLiftish(g.ch) && !group.includes(g) && joined(group[i], g)) group.push(g);
      }
    }
    // lowest first, so each lands on the one below it
    group.sort((a, b) => b.y - a.y);
    for (const g of group) landAt(g, g === f ? at : Math.round(g.y + shift));
  };

  // Glitchy iron and Elevators: once the column is on screen and there's
  // nothing under it, it lifts out of the grid and falls. It lands as a block again on the
  // first solid square below, or drops out of the level.
  const updateFallers = (dt) => {
    const x0 = Math.max(0, Math.floor(S.camX) - 1);
    const x1 = Math.min(S.width - 1, Math.ceil(S.camX + VIEW_COLS));
    for (let x = x0; x <= x1; x++) {
      if (!onScreen(x)) continue;
      for (let y = S.grid.length - 1; y >= 0; y--) {
        const ch = S.grid[y][x];
        const kind = baseOf(ch);
        if (kind !== GLITCH_IRON && kind !== LIFT && kind !== ELEV_DOOR) continue;
        // resting on something, or on an opened Elevator door (that counts as the floor it landed on)
        if (P.solidAt(x, y + 1) || (S.grid[y + 1] && S.grid[y + 1][x] === ELEV_DOOR_OPEN)) continue;
        S.grid[y][x] = AIR;
        S.fallers.push({ x, y, vy: 0, ch, elevator: kind !== GLITCH_IRON, tall: kind === ELEV_DOOR });
      }
    }
    const p = S.player;
    // Holding jump while riding an elevator speeds it up, and every moving
    // elevator block with it, so a cage's walls and roof keep up with its floor.
    const fastNow = S.holding && S.fallers.some((f) => f.elevator && f.x < p.x + PLAYER_W && f.x + 1 > p.x &&
      Math.abs(p.y + PLAYER_H - (f.tall ? f.y - 1 : f.y)) < 0.1);
    for (const f of S.fallers) {
      const fast = fastNow && f.elevator;
      f.vy = fast ? Math.min(f.vy + FALL_ACCEL * 4 * dt, FALL_MAX * ELEVATOR_BOOST)
        : f.vy > FALL_MAX ? Math.max(FALL_MAX, f.vy - FALL_ACCEL * 4 * dt) : Math.min(f.vy + FALL_ACCEL * dt, FALL_MAX);
      let ny = f.y + f.vy * dt;
      // never into another falling block below it in the same column
      for (const g of S.fallers) {
        const gTop = g.tall ? g.y - 1 : g.y; // an Elevator door is two squares tall
        if (g !== f && g.x === f.x && g.y > f.y && ny > gTop - 1) { ny = gTop - 1; f.vy = Math.min(f.vy, g.vy); }
      }
      // Landing on you pushes you down. It rests on your head until you run out from under it.
      const overX = f.x < p.x + PLAYER_W && f.x + 1 > p.x;
      // (not when you're jumping up into it: then you just bonk your head on it)
      if (overX && p.vy >= 0 && ny + 1 > p.y && f.y + 1 <= p.y + 0.3) {
        ny = p.y - 1;
        f.vy = 0;
        p.vy = Math.max(p.vy, FALL_PUSH);
      }
      // standing on it? you ride it down
      const riding = overX && Math.abs(p.y + PLAYER_H - (f.tall ? f.y - 1 : f.y)) < 0.05 && p.vy >= 0;
      if (riding) p.y += ny - f.y;
      // into an Auto teleport: it (and you, if you're riding it) zooms to the next one ahead
      const ty = Math.floor(ny + 0.5);
      const tKey = noteKey(f.x, ty);
      if (S.grid[ty] && S.grid[ty][f.x] === TELEPORT && f.tpSkip !== tKey) {
        const to = P.linkOf(f.x, ty) || P.nextAhead(TELEPORT, f.x, ty);
        if (to) {
          // out of a teleport in the top row, it comes out just below it, so
          // whoever's riding it still fits inside the level, on top
          const outY = Math.max(to.y, 1);
          if (riding) {
            p.x += to.x - f.x;
            p.y = outY - PLAYER_H;
            p.vy = 0;
            S.warp = { t: 0, from: S.camX };
          }
          f.x = to.x;
          f.y = outY;
          f.tpSkip = noteKey(to.x, to.y);
          continue;
        }
      }
      const row = Math.floor(ny) + 1;
      if (ny > Math.floor(ny) && P.solidAt(f.x, row)) {
        if (isLiftish(f.ch)) landGroup(f, Math.floor(ny));
        else landAt(f, Math.floor(ny));
        continue;
      }
      // Elevator blocks side by side stop together, like one elevator: one
      // with a landed Elevator block (or door) right beside it stops there too,
      // so a cage's roof doesn't keep falling once its walls have landed.
      if (isLiftish(f.ch)) {
        const ry = Math.round(ny);
        const beside = [f.x - 1, f.x + 1].some((x) => S.grid[ry] && isLiftish(S.grid[ry][x] || AIR));
        if (beside && Math.abs(ny - ry) < 0.25) {
          landAt(f, ry);
          continue;
        }
      }
      f.y = ny;
      if (f.y >= S.grid.length) f.done = true;
    }
    S.fallers = S.fallers.filter((f) => !f.done);
    // a landed Elevator door opens once nothing near it is still falling
    S.doorsLanded = S.doorsLanded.filter((d) => {
      if (S.fallers.some((f) => Math.abs(f.x - d.x) <= 2)) return true;
      if (baseOf(S.grid[d.y][d.x]) === ELEV_DOOR) {
        S.grid[d.y][d.x] = ELEV_DOOR_OPEN;
        sparkle(d.x + 0.5, d.y + 0.5, ["#c9c9d6", "#ffffff", "#ffd54a"]);
      }
      return false;
    });
  };

  return {
    moveBlock, updatePower,
    eyeOpen, touches, updateHazards
  };
};
