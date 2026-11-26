// Block Dash play screen: how the player moves each step (running, jumping, doors and what you touch).
//
// Part of showPlay in blockdash.js, which calls this once per level played.
// S holds the play screen's changing values (S.player, S.grid, …), P the
// helpers shared between the play files, BD blockdash.js's own constants.
window.BDPlayPhysics = (S, P, BD) => {
  "use strict";
  const SPACE_FLY_V = 6; // how fast you float up or down in Meteor dodge
  const {
    AIR, baseOf, BG_CHANGE, blinkOn, BOSS_X, BOUNCE_V, BOX, BUTTON, BUTTON_ON, CAT_BED,
    CAT_BED_BOUNCE, CAT_DOOR, CATNIP, CHEST, CHEST_OPEN, clamp, CLIMB_V, CLIMBABLE,
    COIN_VALUE, COYOTE, CRASH, dailyNote, DOOR_REACH, EFFECT_TIME, ELEV_DOOR, ELEVATOR, FLIP,
    FLY_THRUST, FLY_UP_V, GLIDE_FALL, GLITCH_STONE, GRAVITY, H, HARM_VOID, isDoor,
    isHiddenTnt, isLava, isSolid, JUMP_BUFFER, JUMP_V, KEY, lapSpeed, LEVER, LEVER_ON,
    MEGA_BASE, MEGA_BLAST, MEGA_BOUNCE_V, MEGATITE_PAYS, MINIGAME, miniGroup, NINE_LIVES,
    NIP_JUMP, NIP_TIME, noteKey, PET_SOUND, PLAYER_H, PLAYER_W, POOF_AFTER, PUSH,
    SCRATCH_POST, SHOVE, SHOVE_DIST, SINK_MAX, SPEED_BASE, SPEED_FAST, SPEED_SLOW,
    STOP_DEFAULT, SWIM_V, TELEPORT, TILES, toast, unlockKitten, WALL_JUMP, WARP_TIME, WATER,
    WATER_GRAVITY, WATER_SLOW, YARN
  } = BD;
  const {
    blink, boom, die, ember, endCut, endlessOver, enterBoss, fill, gotRod, level, megaAt,
    megaEl, megaTimes, moveBlock, notes, pctEl, petBase, puff, reset, scoreEl, setBoost,
    setFree, showItems, sparkle, tellOnce, updateBoss, updateBossDown, updateCut,
    updateHazards, updatePower, VIEW_COLS, win
  } = P;

  // Open any shut door you've reached (from either side). A door's letter
  // is in its bottom square; the square above is door too.
  const openDoors = () => {
    const y0 = Math.floor(S.player.y), y1 = Math.floor(S.player.y + PLAYER_H - 0.01);
    for (let x = Math.floor(S.player.x - 3); x <= Math.floor(S.player.x + PLAYER_W + 3); x++) {
      if (x < 0 || x >= S.width) continue;
      // above the top of the level there's nothing to open (and no row to look in)
      for (let y = Math.max(0, y0); y <= Math.min(S.grid.length - 1, y1 + 1); y++) {
        const ch = S.grid[y][x];
        if (!isDoor(ch) || y - 1 > y1 || y < y0) continue;
        const gap = x >= S.player.x + PLAYER_W ? x - (S.player.x + PLAYER_W) : S.player.x - (x + 1);
        if (gap > TILES[ch].reach) continue;
        if (TILES[ch].locked) {
          if (S.keys < 1) { tellOnce("lock", "This door is locked. Find a 🔑 key!"); continue; }
          S.keys--;
          showItems();
        }
        S.grid[y][x] = "/" + ch;
        S.doorT[noteKey(x, y)] = S.time;
      }
    }
  };

  const solidAt = (x, y) => {
    if (x < 0 || x >= S.width || y < 0 || y >= S.grid.length) return false;
    const ch = S.grid[y][x];
    if (baseOf(ch) === GLITCH_STONE) {
      // One that blinks back on around you lets you out instead of trapping you:
      // squares you were already in at the start of this step don't count.
      const b = S.stepBox;
      const inside = b && x < b.x1 && x + 1 > b.x0 && y < b.y1 && y + 1 > b.y0;
      return blinkOn(S.runT) && !inside;
    }
    return isSolid(ch) || (y + 1 < S.grid.length && (isDoor(S.grid[y + 1][x]) || baseOf(S.grid[y + 1][x]) === ELEV_DOOR));
  };

  // A fresh press while touching a Blink teleports instead of jumping.
  // Holding jump doesn't count, so you don't chain through every Blink.
  // Returns true when the press was used up closing a dialog, so the caller
  // doesn't also treat it as "holding jump".
  // Inside a box, next to a Cat door: jump (Space) goes out through it instead
  const catDoorNear = () => {
    if (!S.box) return false;
    const cx = S.player.x + PLAYER_W / 2, cy = S.player.y + PLAYER_H / 2;
    for (let y = Math.floor(cy - DOOR_REACH); y <= Math.floor(cy + DOOR_REACH); y++) {
      for (let x = Math.floor(cx - DOOR_REACH); x <= Math.floor(cx + DOOR_REACH); x++) {
        if (S.grid[y] && S.grid[y][x] === CAT_DOOR && Math.hypot(cx - (x + 0.5), cy - (y + 0.5)) < DOOR_REACH) return true;
      }
    }
    return false;
  };
  const pressJump = () => {
    if (S.state === "cut") { S.boss.x = BOSS_X; endCut(); return true; } // skip the intro
    if (S.state === "talk") {
      // a short grace so a jump you were already mashing doesn't skip the words
      if (S.time - S.talkAt > 0.35) { S.state = "run"; S.talk = null; }
      return true;
    }
    if (S.state === "run" && catDoorNear()) { P.leaveBox(true); return true; }
    if (S.inside) { P.mashOut(); return true; } // inside the giant vacuum: each press moves you forward
    if (S.state === "run") {
      for (let y = Math.floor(S.player.y); y <= Math.floor(S.player.y + PLAYER_H - 0.01); y++) {
        for (let x = Math.floor(S.player.x); x <= Math.floor(S.player.x + PLAYER_W - 0.01); x++) {
          if (S.grid[y] && S.grid[y][x] === "I" && blink(x, y)) return;
        }
      }
    }
    doJump();
  };

  const isPushy = (ch) => baseOf(ch) === PUSH || baseOf(ch) === SHOVE;
  // Run into a Push block and it moves one square ahead of you (if there's
  // room); a Shove block starts sliding. Returns whether it moved.
  const pushBlock = (x, y, dir) => {
    if (baseOf(S.grid[y][x]) === SHOVE) {
      if (!S.slides.some((s) => s.x === x && s.y === y)) S.slides.push({ x, y, dir, left: SHOVE_DIST });
      return false; // it slides off on its own; you bump it and stop this step
    }
    return moveBlock(x, y, x + dir, y);
  };

  // Does the player, at (px, py), overlap this falling glitchy iron?
  // (a falling Elevator door is two squares tall: its top is a square above f.y)
  const topOf = (f) => (f.tall ? f.y - 1 : f.y);
  const overlapsFaller = (f, px, py) =>
    px < f.x + 1 && px + PLAYER_W > f.x && py < f.y + 1 && py + PLAYER_H > topOf(f);

  // Is this square water? Whether you're swimming goes by the middle of you;
  // whether you're at the surface, by the square at the top of you.
  const waterAt = (x, y) => {
    const row = S.grid[Math.floor(y)];
    return !!row && baseOf(row[Math.floor(x)] || AIR) === WATER;
  };
  const swimming = () => waterAt(S.player.x + PLAYER_W / 2, S.player.y + PLAYER_H / 2);

  // standing on a moving elevator (Elevator, Fall block or Elevator door)?
  const onMovingElevator = () => S.fallers.concat(S.risers).some((f) => f.elevator &&
    S.player.x < f.x + 1 && S.player.x + PLAYER_W > f.x && Math.abs(S.player.y + PLAYER_H - topOf(f)) < 0.1);

  // Wall jumping, made easy to do: a slow slide, a moment after leaving the
  // wall when jump still works, and a little extra spring.
  const WALL_GRACE = 0.35, WALL_SLIDE = 1.2, WALL_SPRING = 1.1;
  // Off a wall, but never the same side twice in a row before you land: you
  // bounce between walls, you can't climb up just one.
  const canWallJump = () => S.wallJump && S.wallT > 0 && !S.player.onGround && (S.wallSide || 1) !== S.lastWall;
  const doJump = () => {
    if (S.state !== "run" || S.stopT > 0) return;
    if (onMovingElevator()) return; // holding jump speeds the elevator up instead (see the falling blocks)
    if (swimming() && !S.flying) {
      // a stroke up, or a full jump out when your head's already out of the water
      const surface = !waterAt(S.player.x + PLAYER_W / 2, S.player.y);
      S.player.vy = surface ? -JUMP_V : -SWIM_V;
      S.player.onGround = false;
      S.buffer = 0;
      return;
    }
    if (canWallJump()) {
      // a wall jump: up and away from the wall, running the other way until
      // you hit the next wall (and jump off that) or land
      S.player.vy = -JUMP_V * WALL_SPRING;
      S.lastWall = S.wallSide || 1;
      const away = -(S.wallSide || 1);
      if (S.free) S.knock = away * 6;
      else S.runDir = away;
      S.wallT = 0;
      S.buffer = 0;
    } else if (S.player.onGround || S.coyote > 0) {
      S.player.vy = -JUMP_V * (S.nipT > 0 ? NIP_JUMP : 1); // catnip: mega jumps
      S.player.onGround = false;
      S.coyote = 0;
      S.buffer = 0;
    } else {
      S.buffer = JUMP_BUFFER;
    }
  };

  // --- physics ---
  const update = (dt) => {
    S.time += dt;
    if (S.inside) {
      // inside the giant vacuum: everything waits while you mash your way
      // out; too slow and the fan gets you
      S.inside.t -= dt;
      if (S.inside.t <= 0) { S.inside = null; S.nineT = 0; die("fan"); }
      return;
    }
    S.runT += dt;

    for (const p of S.particles) {
      p.vy += (p.g === undefined ? 26 : p.g) * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
    }
    S.particles = S.particles.filter((p) => p.life > 0);

    if (S.warp) {
      S.warp.t += dt;
      const k = clamp(S.warp.t / WARP_TIME, 0, 1);
      const ease = k * k * (3 - 2 * k);
      const to = clamp(S.player.x - VIEW_COLS * 0.32, 0, Math.max(0, S.width - VIEW_COLS));
      S.camX = S.warp.from + (to - S.warp.from) * ease;
      if (k >= 1) {
        S.warp = null;
        sparkle(S.player.x + PLAYER_W / 2, S.player.y + PLAYER_H / 2, ["#b46bff", "#f4f0ff"]);
      }
      return;
    }

    if (S.state === "dead") {
      S.deadT += dt;
      if (S.deathKind === "burn" && S.deadT < 0.7 && Math.random() < 0.5) ember();
      if (S.deathKind === "poof" && !S.poofed && S.deadT >= POOF_AFTER) { S.poofed = true; puff(); }
      if (S.deadT > 0.9) { if (level.endless) endlessOver(); else reset(); }
      return;
    }
    if (S.state === "cut") { updateCut(dt); return; }
    if (S.state === "zombie") { P.updateZombieIntro(dt); return; }
    if (S.state === "mini") { P.updateMiniIntro(dt); return; }
    if (S.state === "bossdown") { updateBossDown(dt); return; }
    if (S.state !== "run") return;

    if (S.boostCD > 0) S.boostCD -= dt;
    openDoors();
    if (S.effect) {
      S.effectT -= dt;
      if (S.effectT <= 0) S.effect = null;
    }
    if (S.shieldT > 0) S.shieldT -= dt;

    let speed = S.effect === "fast" ? SPEED_FAST : S.effect === "slow" ? SPEED_SLOW : SPEED_BASE;
    const wet = swimming();
    if (wet) speed *= WATER_SLOW;
    if (level.endless) {
      const lap = lapSpeed(S.player.x);
      speed *= lap;
      if (lap > 1) tellOnce("lap" + lap, `⚡ FASTER! Speed +${Math.round((lap - 1) * 100)}%`);
    }

    S.stepBox = { x0: S.player.x, y0: S.player.y, x1: S.player.x + PLAYER_W, y1: S.player.y + PLAYER_H };
    if (S.wallT > 0) S.wallT -= dt;
    if (S.nineT > 0) S.nineT -= dt;
    if (S.nipT > 0) S.nipT -= dt;
    // catnip's silly (flipped) controls wear off too; in a boss fight The
    // Glitch's flip counts itself down (blockdash-play-bosses.js)
    if (S.flipT > 0 && !S.inBoss) S.flipT -= dt;

    // horizontal — always forward, unless a Free move block handed you the controls
    const oldX = S.player.x;
    // climbing a scratching post, you go straight up, not along
    // after a wall jump you run back the other way (runDir) until you land
    const dir = S.climb != null ? 0 : S.free ? ((S.moveR ? 1 : 0) - (S.moveL ? 1 : 0)) * (S.flipT > 0 ? -1 : 1) : S.runDir || 1;
    // Holding jump on an elevator speeds it up; once it lands, that held jump
    // stops counting (press again to jump), so you don't leap into the doorway.
    const riding = onMovingElevator();
    if (S.wasRiding && !riding) S.holding = false;
    S.wasRiding = riding;
    // riding a Fall elevator down, you wait on it (unless you're in Free move)
    const onElevator = !S.free && (S.fallers.concat(S.risers).some((f) => f.elevator &&
      S.player.x < f.x + 1 && S.player.x + PLAYER_W > f.x && Math.abs(S.player.y + PLAYER_H - topOf(f)) < 0.1) ||
      // landed, but its Elevator door hasn't opened yet: wait for it
      S.doorsLanded.some((d) => Math.abs(d.x + 0.5 - (S.player.x + PLAYER_W / 2)) < 3 && Math.abs(d.y - S.player.y) < 3));
    if (S.stopT > 0) S.stopT -= dt;
    else if (!onElevator) S.player.x += dir * speed * dt;
    if (S.knock) {
      // the shove from stomping the boss, fading out over about half a second
      S.player.x += S.knock * dt;
      S.knock *= Math.max(0, 1 - 4 * dt);
      if (Math.abs(S.knock) < 0.5) S.knock = 0;
    }
    if (S.player.x < 0) S.player.x = 0;
    if (S.inBoss || S.zombie || S.mini || S.box) S.player.x = Math.min(S.player.x, S.width - PLAYER_W);
    const y0 = Math.floor(S.player.y + 0.02);
    const y1 = Math.floor(S.player.y + PLAYER_H - 0.02);
    const rightCol = Math.floor(S.player.x + PLAYER_W);
    let hitRow = -1;
    for (let y = y0; y <= y1; y++) {
      if (solidAt(rightCol, y)) { hitRow = y; break; }
    }
    if (hitRow >= 0) {
      const overlap = S.player.y + PLAYER_H - hitRow;
      if (S.grid[hitRow][rightCol] === "m" || S.grid[hitRow][rightCol] === "0") {
        // Slime launches you off any side, not just the top.
        S.player.x = oldX;
        S.player.vy = S.grid[hitRow][rightCol] === "0" ? -MEGA_BOUNCE_V : -BOUNCE_V;
        S.player.onGround = false;
        S.rot = 0;
      } else if (S.player.vy >= 0 && overlap < 0.35) {
        // Clipped the very top of the block on the way down? Slide up onto
        // the ledge instead of exploding — much kinder than pure GD rules.
        S.player.y = hitRow - PLAYER_H;
        S.player.vy = 0;
        S.player.onGround = true;
        S.rot = 0;
      } else if (isPushy(S.grid[hitRow][rightCol])) {
        // a Push or Shove block: it moves (or you just stop), never a crash
        if (!pushBlock(rightCol, hitRow, 1)) S.player.x = oldX;
      } else {
        S.player.x = oldX;
        if (S.wallJump) {
          // the Wall jump power: slide slowly down the wall; jump to spring off it
          S.wallT = WALL_GRACE;
          S.wallSide = 1;
          if (S.player.vy > WALL_SLIDE) S.player.vy = WALL_SLIDE;
        } else if (!S.free) { die(); return; } // ran straight into a wall — only deadly when you can't stop yourself
      }
    }
    if (S.player.x < oldX) {
      const leftCol = Math.floor(S.player.x);
      for (let y = y0; y <= y1; y++) {
        if (solidAt(leftCol, y)) {
          if (!(isPushy(S.grid[y][leftCol]) && pushBlock(leftCol, y, -1))) {
            S.player.x = oldX;
            if (S.wallJump && !S.player.onGround) {
              // a wall on your left, after springing off the one on your right
              S.wallT = WALL_GRACE;
              S.wallSide = -1;
              if (S.player.vy > WALL_SLIDE) S.player.vy = WALL_SLIDE;
            }
          }
          break;
        }
      }
    }
    // Falling glitchy iron is solid too: run into its side and it's a wall.
    // Only just clipping its top steps you up onto it, as with any block.
    for (const f of S.fallers.concat(S.risers)) {
      if (!overlapsFaller(f, S.player.x, S.player.y)) continue;
      if (S.player.vy >= 0 && S.player.y + PLAYER_H - topOf(f) < 0.35) {
        S.player.y = topOf(f) - PLAYER_H;
        S.player.vy = 0;
        S.player.onGround = true;
        S.rot = 0;
      } else {
        S.player.x = oldX;
        if (!S.free) { die(); return; }
      }
    }

    // vertical
    const floating = S.mini && S.mini.game === "meteor"; // floating in space: up, down, or stay
    if (floating) S.player.vy = S.holding ? -SPACE_FLY_V : S.mini.p1.down ? SPACE_FLY_V : 0;
    else if (wet && !S.flying) S.player.vy = Math.min(S.player.vy + WATER_GRAVITY * dt, SINK_MAX);
    else if (S.climb != null) {
      // up the scratching post until your feet are past its top, then a little
      // hop, so you step off onto whatever's beside the top
      const row = Math.floor(S.player.y + PLAYER_H - 0.05);
      if (S.grid[row] && CLIMBABLE.includes(S.grid[row][S.climb])) S.player.vy = -CLIMB_V;
      else { S.climb = null; S.player.vy = -JUMP_V * 0.45; }
    } else S.player.vy += GRAVITY * dt;
    if (S.flying) {
      if (S.holding) {
        S.player.vy = Math.max(S.player.vy - FLY_THRUST * dt, -FLY_UP_V);
        if (Math.random() < 0.35) {
          S.particles.push({
            x: S.player.x + PLAYER_W * 0.3, y: S.player.y + PLAYER_H,
            vx: -2 - Math.random() * 3, vy: 2 + Math.random() * 3,
            life: 0.3 + Math.random() * 0.3,
            c: ["#ffd54a", "#ff8a3d", "#e04a2f", "#c58bff"][(Math.random() * 4) | 0],
          });
        }
      } else {
        S.player.vy = Math.min(S.player.vy, GLIDE_FALL);
      }
    }
    S.player.y += S.player.vy * dt;
    if (floating) S.player.y = Math.max(0, Math.min(S.player.y, S.grid.length - PLAYER_H));
    if (S.flying && S.player.y < 0) { S.player.y = 0; S.player.vy = Math.max(0, S.player.vy); }
    S.player.onGround = false;
    const cx0 = Math.floor(S.player.x + 0.02);
    const cx1 = Math.floor(S.player.x + PLAYER_W - 0.02);

    if (S.player.vy > 0) {
      const footRow = Math.floor(S.player.y + PLAYER_H);
      for (let x = cx0; x <= cx1; x++) {
        if (solidAt(x, footRow)) {
          S.player.y = footRow - PLAYER_H;
          if (S.grid[footRow][x] === "m" || S.grid[footRow][x] === "0") {
            S.player.vy = S.grid[footRow][x] === "0" ? -MEGA_BOUNCE_V : -BOUNCE_V;
            S.rot = 0;
          } else if (S.grid[footRow][x] === BOX && !S.box) {
            P.startBox(x, footRow);
            return;
          } else if (S.grid[footRow][x] === CAT_BED) {
            S.player.vy = -JUMP_V * CAT_BED_BOUNCE; // boing!
            S.rot = 0;
            sparkle(x + 0.5, footRow, ["#ffd0e8", "#c86ad8", "#ffffff"]);
          } else {
            S.runDir = 1; // landed: running forwards again after any wall jumps
            if (S.grid[footRow][x] === FLIP && !S.flipTraps.some((f) => f.x === x && f.y === footRow)) {
              // the trap floor starts to go, and every flip floor joined to it in the row goes too
              let x0 = x, x1 = x;
              while (S.grid[footRow][x0 - 1] === FLIP) x0--;
              while (S.grid[footRow][x1 + 1] === FLIP) x1++;
              for (let fx = x0; fx <= x1; fx++) {
                if (!S.flipTraps.some((f) => f.x === fx && f.y === footRow)) S.flipTraps.push({ x: fx, y: footRow, t: 0, open: false });
              }
            }
            S.lastWall = 0;
            // somewhere to come back to (Nine lives): real ground, not the bottom of a pit
            if (footRow < S.grid.length && !isLava(S.grid[footRow - 1] ? S.grid[footRow - 1][x] : AIR)) S.safe = { x: S.player.x, y: S.player.y };
            S.player.vy = 0;
            S.player.onGround = true;
            S.rot = 0;
            if (baseOf(S.grid[footRow][x]) === ELEVATOR && !solidAt(x, footRow + 1)) {
              S.fallers.push({ x, y: footRow, vy: 0, ch: S.grid[footRow][x], elevator: true });
              S.grid[footRow][x] = AIR;
            }
          }
          break;
        }
      }
    } else if (S.player.vy < 0) {
      const headRow = Math.floor(S.player.y);
      for (let x = cx0; x <= cx1; x++) {
        if (solidAt(x, headRow)) {
          S.player.y = headRow + 1;
          S.player.vy = 0;
          S.climb = null;
          break;
        }
      }
    }

    for (const f of S.fallers.concat(S.risers)) {
      if (!overlapsFaller(f, S.player.x, S.player.y)) continue;
      if (S.player.vy >= 0 && S.player.y + PLAYER_H - topOf(f) < 0.5) {
        S.player.y = topOf(f) - PLAYER_H;
        S.player.vy = 0;
        S.player.onGround = true;
        S.rot = 0;
      } else if (S.player.vy < 0 && f.y + 1 - S.player.y < 0.5) {
        S.player.y = f.y + 1;
        S.player.vy = 0;
      }
    }

    S.coyote = S.player.onGround ? COYOTE : Math.max(0, S.coyote - dt);
    if (S.buffer > 0) {
      S.buffer -= dt;
      if (S.player.onGround || canWallJump()) doJump(); // a jump pressed just before you reached the wall counts too
    }
    if (S.holding && (S.player.onGround || canWallJump()) && !(S.mini && S.mini.game === "meteor")) doJump();
    if (S.flying) S.rot = S.holding ? -0.25 : 0.1; // nose up when climbing
    else if (wet) S.rot = 0; // no spinning while you swim
    else if (!S.player.onGround) S.rot += dt * 7;

    // items — a slightly smaller box, so near-misses are forgiving
    const inset = 0.14;
    const ix0 = Math.floor(S.player.x + inset);
    const ix1 = Math.floor(S.player.x + PLAYER_W - inset);
    const iy0 = Math.floor(S.player.y + inset);
    const iy1 = Math.floor(S.player.y + PLAYER_H - inset);
    // mega TNT doesn't wait to be touched: getting near is enough
    for (let y = Math.floor(S.player.y - MEGA_BLAST); y <= Math.floor(S.player.y + PLAYER_H + MEGA_BLAST); y++) {
      for (let x = Math.floor(S.player.x - MEGA_BLAST); x <= Math.floor(S.player.x + PLAYER_W + MEGA_BLAST); x++) {
        if (x < 0 || x >= S.width || y < 0 || y >= S.grid.length || S.state !== "run") continue;
        const near = S.grid[y][x];
        // and the same for mega End TNT, mega lava and mega fire. Ask what the
        // mega square started as: lava that later flowed into a square where
        // a mega item was picked up is ordinary lava.
        const was = MEGA_BASE[S.looks[noteKey(x, y)]];
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
    // the teleport you just arrived on works again once you've stepped off it
    if (S.tpSkip) {
      const [tx, ty] = S.tpSkip.split(",").map(Number);
      if (!(tx >= ix0 && tx <= ix1 && ty >= iy0 && ty <= iy1)) S.tpSkip = null;
    }
    for (let y = iy0; y <= iy1; y++) {
      for (let x = ix0; x <= ix1; x++) {
        if (x < 0 || x >= S.width || y < 0 || y >= S.grid.length) continue;
        const ch = S.grid[y][x];
        if (ch === "t" || ch === "T") { boom(); return; }
        if (ch === "8") { boom("megaboom"); return; }
        if (isHiddenTnt(ch)) { boom(); return; }
        if (ch === "A") { die("poof"); return; }
        if (ch === HARM_VOID) { die("delete"); return; }
        if (CLIMBABLE.includes(ch) && S.climb == null) { S.climb = x; S.rot = 0; }
        if (ch === WALL_JUMP) {
          S.grid[y][x] = AIR;
          if (!S.wallJump) toast("🧗 Wall jump! Jump off a wall to spring the other way: bounce between walls to climb. Yours for the whole level");
          S.wallJump = true;
          sparkle(x + 0.5, y + 0.5, ["#5fd35f", "#ffffff", "#ff9800"]);
        }
        if (ch === CHEST) {
          // a random prize: coins, a power, or a TNT surprise
          S.grid[y][x] = CHEST_OPEN;
          const r = Math.random();
          sparkle(x + 0.5, y + 0.3, ["#ffd54a", "#ffffff", "#c8955a"]);
          if (r < 0.15) { toast("🎁 It was… a TNT SURPRISE!"); boom(); return; }
          if (r < 0.6) {
            S.score += 30;
            scoreEl.textContent = "💎 " + S.score;
            toast("🎁 Treasure! +30 💎");
          } else {
            const power = ["wings", "nine", "wall", "nip"][Math.floor(Math.random() * 4)];
            if (power === "wings") { S.flying = true; toast("🎁 Wings! Hold jump to fly"); }
            if (power === "nine") { S.nineLives = 9; toast("🎁 Nine lives!"); }
            if (power === "wall") { S.wallJump = true; toast("🎁 Wall jump power!"); }
            if (power === "nip") { S.nipT = NIP_TIME; S.effect = "fast"; S.effectT = NIP_TIME; S.flipT = NIP_TIME; toast("🎁 Catnip! ZOOMIES!"); }
          }
        }
        if (ch === CATNIP) {
          S.grid[y][x] = AIR;
          S.nipT = NIP_TIME;
          S.effect = "fast"; // zoomies
          S.effectT = NIP_TIME;
          S.flipT = NIP_TIME; // and silly controls (in Free move)
          toast("🌿 CATNIP! ZOOMIES!");
          sparkle(x + 0.5, y + 0.5, ["#7ad86a", "#ff6aa8", "#ffd54a", "#7ee8ff"]);
        }
        if (ch === NINE_LIVES) {
          S.grid[y][x] = AIR;
          S.nineLives = 9;
          toast("😺 Nine lives! The next 9 things that would get you won't");
          sparkle(x + 0.5, y + 0.5, ["#ff9800", "#ffd54a", "#ffffff"]);
        }
        if (ch === YARN) {
          S.grid[y][x] = AIR;
          S.yarnGot++;
          sparkle(x + 0.5, y + 0.5, ["#ff6aa8", "#c2185b", "#ffffff"]);
          if (S.yarnGot >= S.yarnTotal) {
            toast(unlockKitten() ? "🧶 You got ALL the yarn! A kitten pet is yours: pick it on the title screen 🐱"
              : "🧶 You got all the yarn!");
          } else toast(`🧶 Yarn ${S.yarnGot} of ${S.yarnTotal}`);
        }
        // The three invisible blocks work once each, then clear themselves
        // (they come back when the level resets).
        if (ch === "K") {
          S.grid[y][x] = AIR;
          S.talk = notes[noteKey(x, y)] || "…";
          S.talkAt = S.time;
          S.state = "talk";
          S.holding = false;
          continue;
        }
        if (ch === BUTTON || ch === LEVER) {
          S.grid[y][x] = ch === BUTTON ? BUTTON_ON : LEVER_ON;
          sparkle(x + 0.5, y + 0.5, ["#ff5a4a", "#ffd54a", "#ffffff"]);
          updatePower();
        }
        // (riding an elevator, you don't use teleports yourself: it takes you through)
        if (ch === TELEPORT && S.tpSkip !== noteKey(x, y) && !onMovingElevator()) {
          if (blink(x, y, TELEPORT)) return;
        }
        if (ch === MINIGAME) {
          const setting = notes[noteKey(x, y)];
          for (const [gx, gy] of miniGroup(S.grid, x, y)) S.grid[gy][gx] = AIR;
          P.startMini(setting);
          return;
        }
        if (ch === BG_CHANGE) {
          const want = notes[noteKey(x, y)];
          if (want && want !== S.bgNow) S.bgNow = want;
        }
        if (ch === CRASH) {
          S.grid[y][x] = AIR;
          P.fakeCrash();
          return;
        }
        if (ch === "O") {
          S.grid[y][x] = AIR;
          S.stopT = notes[noteKey(x, y)] || STOP_DEFAULT;
        } else if (ch === "M") {
          S.grid[y][x] = AIR;
          setFree(true);
        }
        if (ch === "F" || isLava(ch)) {
          die("burn");
          return;
        }
        if (ch === "C") {
          // Wings come off here, so each stretch between save points
          // has to earn its own pair.
          S.flying = false;
          setBoost(false);
          setFree(false); // like wings, free moving ends at a save point
          S.grid[y][x] = "checkpointOn";
          S.checkpoint = { x, y, score: S.score, megas: S.megas, rods: S.rods, pearls: S.pearls, eyes: S.eyes, keys: S.keys, grid: S.grid.map((r) => r.slice()), bg: S.bgNow, yarn: S.yarnGot };
          // glitchy iron still falling goes back where it is, to fall again after a respawn
          for (const f of S.fallers) {
            const fy = Math.floor(f.y);
            if (fy >= 0 && fy < S.grid.length && S.checkpoint.grid[fy][f.x] === AIR) S.checkpoint.grid[fy][f.x] = f.ch;
          }
          toast("Checkpoint!");
        }
        if (COIN_VALUE[ch]) {
          S.grid[y][x] = AIR;
          S.score += COIN_VALUE[ch] * megaTimes(x, y);
          scoreEl.textContent = "💎 " + S.score;
          if (ch === "d") { window.BDBadges.add("diamonds", megaTimes(x, y)); dailyNote("diamond", megaTimes(x, y)); }
          if (petBase) window.BDMusic.sfx(PET_SOUND[petBase]);
        } else if (ch === "@") {
          S.grid[y][x] = AIR;
          S.megas += MEGATITE_PAYS * megaTimes(x, y);
          megaEl.textContent = "Ⓜ " + S.megas;
          sparkle(x + 0.5, y + 0.5, ["#f08bff", "#c22fd0", "#ffd54a"]);
        } else if (ch === "b") {
          S.effect = "fast";
          S.effectT = EFFECT_TIME * megaTimes(x, y);
        } else if (ch === "w") {
          S.effect = "slow";
          S.effectT = EFFECT_TIME * megaTimes(x, y);
        } else if (ch === "r") {
          S.grid[y][x] = AIR;
          S.rods += megaTimes(x, y) - 1;
          gotRod(x + 0.5, y + 0.5);
        } else if (ch === "o") {
          S.grid[y][x] = AIR;
          S.eyes += megaTimes(x, y);
          showItems();
          sparkle(x + 0.5, y + 0.5, ["#7be0c2", "#c8fff0"]);
        } else if (ch === "9") {
          S.grid[y][x] = AIR;
          S.pearls += megaTimes(x, y);
          showItems();
          sparkle(x + 0.5, y + 0.5, ["#1c6b60", "#8ff0dc"]);
        } else if (ch === KEY) {
          S.grid[y][x] = AIR;
          S.keys++;
          showItems();
          sparkle(x + 0.5, y + 0.5, ["#ffd54a", "#a87a12", "#ffffff"]);
        } else if (ch === "H") {
          const made = Math.min(S.rods, S.pearls);
          if (made) {
            S.rods -= made;
            S.pearls -= made;
            S.eyes += made;
            showItems();
            sparkle(x + 0.5, y + 0.2, ["#7be0c2", "#c8fff0", "#ffe98a"]);
            toast(made === 1 ? "Crafted an eye of ender!" : `Crafted ${made} eyes of ender!`);
          } else if (!S.eyes) {
            tellOnce("craft", "Crafting needs a blaze rod and an ender pearl");
          }
        } else if (ch === "R") {
          if (S.eyes) {
            S.eyes--;
            S.framesLeft--;
            S.grid[y][x] = "frameOn";
            showItems();
            sparkle(x + 0.5, y + 0.2, ["#7be0c2", "#c8fff0"]);
            if (!S.framesLeft) toast("The boss portal is open!");
          } else {
            tellOnce("frame", "This frame needs an eye of ender");
          }
        } else if (ch === "f") {
          S.grid[y][x] = AIR;
          S.flying = true;
          if (megaAt(x, y)) setBoost(true);
        } else if (ch === "E") {
          win();
          return;
        } else if (ch === "G") {
          // Shut until every portal frame in the level has its eye. You run
          // straight through a shut one and the level carries on.
          if (S.framesLeft) {
            tellOnce("portal", S.framesLeft === 1 ? "The boss portal needs 1 more eye"
              : `The boss portal needs ${S.framesLeft} more eyes`);
            continue;
          }
          enterBoss();
          return;
        }
      }
    }

    if (updateHazards(dt)) return;
    if (S.boss && updateBoss(dt)) return;
    if (S.zombie && S.zombie.phase !== "flash" && P.updateZombie(dt)) return;
    if (S.mini && S.mini.phase !== "count" && P.updateMini(dt)) return;
    if (S.zombieQueued && !S.zombie) { P.startZombie(); return; }

    if (S.box && S.player.y < 0.15) { P.leaveBox(true); return; } // climbed out of the box
    if (S.player.y > S.grid.length + 1) {
      die();
      return;
    }
    if (S.player.x > S.width) { win(); return; }

    S.camX = clamp(S.player.x - VIEW_COLS * 0.32, 0, Math.max(0, S.width - VIEW_COLS));
    // In a level taller than the screen, the screen follows you up and down,
    // keeping you at least 3 blocks from its top and 4 from its bottom.
    if (S.grid.length > H) {
      if (S.player.y < S.camY + 3) S.camY = S.player.y - 3;
      else if (S.player.y + PLAYER_H > S.camY + H - 4) S.camY = S.player.y + PLAYER_H - (H - 4);
      S.camY = clamp(S.camY, 0, S.grid.length - H);
    } else S.camY = 0;

    const pct = clamp(Math.round((S.player.x / S.width) * 100), 0, 100);
    fill.style.width = level.endless ? "0%" : pct + "%";
    pctEl.textContent = level.endless ? "🏃 " + Math.floor(S.player.x) : pct + "%";
  };

  return {
    pressJump, solidAt, update
  };
};
