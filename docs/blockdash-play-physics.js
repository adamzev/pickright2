// Block Dash play screen: how the player moves each step (running, jumping, doors and what you touch).
//
// Part of showPlay in blockdash.js, which calls this once per level played.
// S holds the play screen's changing values (S.player, S.grid, …), P the
// helpers shared between the play files, BD blockdash.js's own constants.
window.BDPlayPhysics = (S, P, BD) => {
  "use strict";
  const {
    AIR, BOSS_X, BOUNCE_V, clamp, COIN_VALUE, COYOTE, dailyNote, EFFECT_TIME, FLY_THRUST,
    FLY_UP_V, GLIDE_FALL, GRAVITY, H, isDoor, isHiddenTnt, isLava, isSolid, JUMP_BUFFER,
    JUMP_V, KEY, lapSpeed, MEGA_BASE, MEGA_BLAST, MEGA_BOUNCE_V, MEGATITE_PAYS, noteKey,
    PET_SOUND, PLAYER_H, PLAYER_W, POOF_AFTER, SPEED_BASE, SPEED_FAST, SPEED_SLOW,
    STOP_DEFAULT, TILES, toast, WARP_TIME
  } = BD;
  const {
    blink, boom, die, ember, endCut, endlessOver, enterBoss, fill, gotRod, level, megaAt,
    megaEl, megaTimes, notes, pctEl, petBase, puff, reset, scoreEl, setBoost, setFree,
    showItems, sparkle, tellOnce, updateBoss, updateBossDown, updateCut, updateHazards,
    VIEW_COLS, win
  } = P;

  // Open any shut door you've reached (from either side). A door's letter
  // is in its bottom square; the square above is door too.
  const openDoors = () => {
    const y0 = Math.floor(S.player.y), y1 = Math.floor(S.player.y + PLAYER_H - 0.01);
    for (let x = Math.floor(S.player.x - 3); x <= Math.floor(S.player.x + PLAYER_W + 3); x++) {
      if (x < 0 || x >= S.width) continue;
      for (let y = y0; y <= Math.min(H - 1, y1 + 1); y++) {
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

  const solidAt = (x, y) =>
    x >= 0 && x < S.width && y >= 0 && y < H &&
    (isSolid(S.grid[y][x]) || (y + 1 < H && isDoor(S.grid[y + 1][x])));

  // A fresh press while touching a Blink teleports instead of jumping.
  // Holding jump doesn't count, so you don't chain through every Blink.
  // Returns true when the press was used up closing a dialog, so the caller
  // doesn't also treat it as "holding jump".
  const pressJump = () => {
    if (S.state === "cut") { S.boss.x = BOSS_X; endCut(); return true; } // skip the intro
    if (S.state === "talk") {
      // a short grace so a jump you were already mashing doesn't skip the words
      if (S.time - S.talkAt > 0.35) { S.state = "run"; S.talk = null; }
      return true;
    }
    if (S.state === "run") {
      for (let y = Math.floor(S.player.y); y <= Math.floor(S.player.y + PLAYER_H - 0.01); y++) {
        for (let x = Math.floor(S.player.x); x <= Math.floor(S.player.x + PLAYER_W - 0.01); x++) {
          if (S.grid[y] && S.grid[y][x] === "I" && blink(x, y)) return;
        }
      }
    }
    doJump();
  };

  const doJump = () => {
    if (S.state !== "run" || S.stopT > 0) return;
    if (S.player.onGround || S.coyote > 0) {
      S.player.vy = -JUMP_V;
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
    if (level.endless) {
      const lap = lapSpeed(S.player.x);
      speed *= lap;
      if (lap > 1) tellOnce("lap" + lap, `⚡ FASTER! Speed +${Math.round((lap - 1) * 100)}%`);
    }

    // horizontal — always forward, unless a Free move block handed you the controls
    const oldX = S.player.x;
    const dir = S.free ? ((S.moveR ? 1 : 0) - (S.moveL ? 1 : 0)) * (S.flipT > 0 ? -1 : 1) : 1;
    if (S.stopT > 0) S.stopT -= dt;
    else S.player.x += dir * speed * dt;
    if (S.knock) {
      // the shove from stomping the boss, fading out over about half a second
      S.player.x += S.knock * dt;
      S.knock *= Math.max(0, 1 - 4 * dt);
      if (Math.abs(S.knock) < 0.5) S.knock = 0;
    }
    if (S.player.x < 0) S.player.x = 0;
    if (S.inBoss) S.player.x = Math.min(S.player.x, S.width - PLAYER_W);
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
      } else {
        S.player.x = oldX;
        // ran straight into a wall — only deadly when you can't stop yourself
        if (!S.free) { die(); return; }
      }
    }
    if (S.player.x < oldX) {
      const leftCol = Math.floor(S.player.x);
      for (let y = y0; y <= y1; y++) {
        if (solidAt(leftCol, y)) { S.player.x = oldX; break; }
      }
    }

    // vertical
    S.player.vy += GRAVITY * dt;
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
          } else {
            S.player.vy = 0;
            S.player.onGround = true;
            S.rot = 0;
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
          break;
        }
      }
    }

    S.coyote = S.player.onGround ? COYOTE : Math.max(0, S.coyote - dt);
    if (S.buffer > 0) {
      S.buffer -= dt;
      if (S.player.onGround) doJump();
    }
    if (S.holding && S.player.onGround) doJump();
    if (S.flying) S.rot = S.holding ? -0.25 : 0.1; // nose up when climbing
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
        if (x < 0 || x >= S.width || y < 0 || y >= H || S.state !== "run") continue;
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
    for (let y = iy0; y <= iy1; y++) {
      for (let x = ix0; x <= ix1; x++) {
        if (x < 0 || x >= S.width || y < 0 || y >= H) continue;
        const ch = S.grid[y][x];
        if (ch === "t" || ch === "T") { boom(); return; }
        if (ch === "8") { boom("megaboom"); return; }
        if (isHiddenTnt(ch)) { boom(); return; }
        if (ch === "A") { die("poof"); return; }
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
          S.checkpoint = { x, y, score: S.score, megas: S.megas, rods: S.rods, pearls: S.pearls, eyes: S.eyes, keys: S.keys, grid: S.grid.map((r) => r.slice()) };
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

    if (S.player.y > H + 1) {
      die();
      return;
    }
    if (S.player.x > S.width) { win(); return; }

    S.camX = clamp(S.player.x - VIEW_COLS * 0.32, 0, Math.max(0, S.width - VIEW_COLS));

    const pct = clamp(Math.round((S.player.x / S.width) * 100), 0, 100);
    fill.style.width = level.endless ? "0%" : pct + "%";
    pctEl.textContent = level.endless ? "🏃 " + Math.floor(S.player.x) : pct + "%";
  };

  return {
    pressJump, solidAt, update
  };
};
