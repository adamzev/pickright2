// Block Dash play screen: things that move and hurt you (lava, shooters, mobs, blazes, Watchers).
//
// Part of showPlay in blockdash.js, which calls this once per level played.
// S holds the play screen's changing values (S.player, S.grid, …), P the
// helpers shared between the play files, BD blockdash.js's own constants.
window.BDPlayHazards = (S, P, BD) => {
  "use strict";
  const {
    AIR, baseOf, BLAZE_DRIFT, BLAZE_MAX, BLAZE_REACH, BLAZE_SHOOT, BLOCK_STEP,
    BOSS_SHOT_SPEED, BULLET_LIFE, BULLET_SPEED, BULLET_TURN, CHASE_SPEED, clamp, ENDER_AHEAD,
    ENDER_BULLET_SPEED, ENDER_NOTICE, ENTER, ENTER_DONE, FALL_ACCEL, FALL_MAX, FALL_PUSH,
    FIREBALL_SPEED, FLOWED, GLITCH_EVERY, GLITCH_HOP, GLITCH_IRON, GRAVITY, H, inCone,
    isSolid, JUMP_V, LAVA_FALL, LAVA_RISE, LIFT, LOGGABLE, MOB_H, MOB_W, nextToWater,
    noteKey, PLAYER_H, PLAYER_W, PUSH, SHOOT_EVERY, SHOVE, SPAWN_EVERY, TELEPORT,
    WATCH_CYCLE, WATCH_OPEN
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
    updateFallers(dt);
    updateBlocks(dt);
    return false;
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
        if ((kind !== GLITCH_IRON && kind !== LIFT) || P.solidAt(x, y + 1)) continue;
        S.grid[y][x] = AIR;
        S.fallers.push({ x, y, vy: 0, ch, elevator: kind === LIFT });
      }
    }
    const p = S.player;
    for (const f of S.fallers) {
      f.vy = Math.min(f.vy + FALL_ACCEL * dt, FALL_MAX);
      let ny = f.y + f.vy * dt;
      // never into another falling block below it in the same column
      for (const g of S.fallers) {
        if (g !== f && g.x === f.x && g.y > f.y && ny > g.y - 1) { ny = g.y - 1; f.vy = Math.min(f.vy, g.vy); }
      }
      // Landing on you pushes you down. It rests on your head until you run out from under it.
      const overX = f.x < p.x + PLAYER_W && f.x + 1 > p.x;
      if (overX && ny + 1 > p.y && f.y + 1 <= p.y + 0.3) {
        ny = p.y - 1;
        f.vy = 0;
        p.vy = Math.max(p.vy, FALL_PUSH);
      }
      // standing on it? you ride it down
      const riding = overX && Math.abs(p.y + PLAYER_H - f.y) < 0.05 && p.vy >= 0;
      if (riding) p.y += ny - f.y;
      // into an Auto teleport: it (and you, if you're riding it) zooms to the next one ahead
      const ty = Math.floor(ny + 0.5);
      const tKey = noteKey(f.x, ty);
      if (S.grid[ty] && S.grid[ty][f.x] === TELEPORT && f.tpSkip !== tKey) {
        const to = P.nextAhead(TELEPORT, f.x, ty);
        if (to) {
          if (riding) {
            p.x += to.x - f.x;
            p.y = to.y - PLAYER_H;
            S.warp = { t: 0, from: S.camX };
          }
          f.x = to.x;
          f.y = to.y;
          f.tpSkip = noteKey(to.x, to.y);
          continue;
        }
      }
      const row = Math.floor(ny) + 1;
      if (ny > Math.floor(ny) && P.solidAt(f.x, row)) {
        const at = Math.floor(ny);
        if (at >= 0 && (S.grid[at][f.x] === AIR || S.grid[at][f.x] === "P")) S.grid[at][f.x] = f.ch;
        f.done = true;
        continue;
      }
      f.y = ny;
      if (f.y >= S.grid.length) f.done = true;
    }
    S.fallers = S.fallers.filter((f) => !f.done);
  };

  return {
    moveBlock,
    eyeOpen, touches, updateHazards
  };
};
