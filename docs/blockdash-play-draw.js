// Block Dash play screen: drawing each frame (level, player, pet, ghost, mobs, bosses and the HUD).
//
// Part of showPlay in blockdash.js, which calls this once per level played.
// S holds the play screen's changing values (S.player, S.grid, …), P the
// helpers shared between the play files, BD blockdash.js's own constants.
window.BDPlayDraw = (S, P, BD) => {
  "use strict";
  const {
    AIR, arenaBgOf, Art, baseOf, bgOf, BLINK_TIME, blinkOn, BOSS_PX, BOSS_TOP, CAT_LOOK,
    CAT_MOB, CAT_MOBS, clamp, crashBgOf, DOOR_SWING, drawBackLayer, drawCone, drawExplosion,
    drawMiniQuarter, drawPlayer, drawTile, drawTree, el, ELEV_DOOR, ELEV_DOOR_OPEN, FAN,
    FLIP, FLOWED, FLYING_PETS, GALAXY_H, GALAXY_LOOK, GALAXY_W, GHOST_EVERY, GLITCH_COLORS,
    GLITCH_SIZE, GLITCH_STONE, glitchLookOn, H, HEALTH_MAX, isDoor, isHidden, isLogged,
    isOpenDoor, isSolid, isWire, LAMP, LOGGABLE, MINIGAME, MOB_H, MOB_W, noteKey, overOf,
    PLAINS_PORTAL, PLAYER_H, PLAYER_W, POOF_AFTER, SKELETON, SLEEPY_CAT, SLIME_MOB,
    STILL_PETS, SWORDS, TNT_SOLDIER, trailOn, TREE, VAC_ESCAPE, vacInsideGrid, VACUUM,
    VILLAGER, WARP_TIME, WATCH_CYCLE, WIRE, WIRES, ZOMBIE_HP, ZOMBIE_LIVES
  } = BD;
  const {
    bossMax, canvas, ctx, dragonAt, eyeOpen, hero, level, pet, petBase, showBoost, sword,
    trail, TS, VIEW_COLS
  } = P;

  // A cat: asleep (with Zzz), scared (with !), or walking, facing the way it
  // goes, with hearts once it's made friends and a "meow!" when bumped.
  const drawCat = (c) => {
    const x = (c.x - S.camX) * TS, y = c.y * TS, w = c.w * TS, h = c.h * TS;
    const look = c.mood === "sleep" ? SLEEPY_CAT : c.mood === "scared" ? "catScared" : Math.floor(c.step * 5) % 2 ? "catWalk2" : CAT_MOB;
    ctx.save();
    if (c.face < 0 && c.mood !== "sleep") { ctx.translate(x + w, 0); ctx.scale(-1, 1); ctx.translate(-x, 0); }
    Art.drawSprite(ctx, look, x, y, w, h);
    ctx.restore();
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    const say = (text, color, size, dy = 0) => {
      ctx.font = `bold ${size}px ui-monospace, monospace`;
      ctx.lineWidth = 3; ctx.strokeStyle = "rgba(0, 0, 0, 0.6)";
      ctx.strokeText(text, x + w / 2, y - 2 + dy);
      ctx.fillStyle = color; ctx.fillText(text, x + w / 2, y - 2 + dy);
    };
    if (c.mood === "sleep") say("z".repeat(1 + Math.floor(S.time * 1.5) % 3), "#c8d8ff", 14, -Math.sin(S.time * 2) * 3);
    else if (c.mood === "scared") say("!", "#ff5a5a", 22);
    else if (c.meowT > 0.8) say("meow!", "#ffffff", 13);
    else if (c.t > 0) say("❤", "#ff6a8a", 16, -(2.5 - c.t) * 6);
  };

  // The giant vacuum: facing you, rocking as it rolls, with air rushing into
  // its nozzle when it's sucking.
  const drawVacuum = (c) => {
    const x = (c.x - S.camX) * TS, y = c.y * TS, w = c.w * TS, h = c.h * TS;
    const face = S.player.x + PLAYER_W / 2 < c.x + c.w / 2 ? -1 : 1;
    const b = c.boss;
    if (b) {
      for (const d of b.dirt) {
        ctx.fillStyle = "#6a4a2a";
        ctx.fillRect((d.x - S.camX) * TS - TS * 0.25, d.y * TS - TS * 0.2, TS * 0.5, TS * 0.4);
        ctx.fillStyle = "#8a6a3a";
        ctx.fillRect((d.x - S.camX) * TS - TS * 0.1, d.y * TS - TS * 0.1, TS * 0.2, TS * 0.15);
      }
    }
    if (b && b.hurtT > 0 && Math.floor(b.hurtT * 20) % 2) return; // flashes when stomped
    ctx.save();
    ctx.translate(x + w / 2, y + h);
    ctx.rotate(Math.sin(c.step * 14) * 0.04);
    if (face < 0) ctx.scale(-1, 1); // the art faces right
    if (b && b.stage === 3) ctx.rotate(Math.sin(S.time * 25) * 0.025); // shaking as it spits dirt
    // stage 2: its low battery look (flashing); stage 3: its handle comes down.
    // Both can be repainted in the Art Studio.
    const look = !b ? VACUUM : b.stage === 2 ? (Math.floor(S.time * 3) % 2 ? "vacuumLow" : VACUUM)
      : b.stage === 3 ? "vacuumHandleDown" : VACUUM;
    Art.drawSprite(ctx, look, -w / 2, -h, w, h);
    ctx.restore();
    if (b) {
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.font = "bold 22px ui-monospace, monospace";
      ctx.fillStyle = "#ff4a4a";
      ctx.fillText("❤".repeat(b.hp), x + w / 2, y - 6);
    }
    if (c.sucking) {
      ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
      for (let i = 0; i < 5; i++) {
        const k = (S.time * 3 + i / 5) % 1;
        const sx = x + w / 2 + face * (w * 0.55 + (1 - k) * TS * 2.5), sy = y + h * 0.8 + Math.sin(i * 2.3) * TS * 0.4 * (1 - k);
        ctx.fillRect(sx, sy, 4, 4);
      }
    }
  };

  // --- rendering ---
  const drawBackground = () =>
    Art.drawBackground(ctx, S.box ? "box" : S.mini ? ({ meteor: "space", pvp: "overworld" }[S.mini.game] || "night")
      : S.zombie && S.zombie.phase !== "flash" ? "overworld" // the plains
      : S.inBoss ? (S.crash ? crashBgOf(level) : arenaBgOf(level))
      : S.bgNow ? S.bgNow // a Background change block switched it
      : level.zones ? level.zones[Math.floor((S.camX + VIEW_COLS / 2) / level.zoneW) % level.zones.length]
      : bgOf(level), canvas.width, canvas.height, S.camX * TS, TS, S.time, S.effect);

  // The ghost: you, tinted glowing blue on a scratch canvas, see-through.
  const ghostCv = el("canvas");
  const drawGhost = () => {
    if (!S.showGhost || S.inBoss || !S.best || !S.best.path) return;
    const p = S.best.path, n = p.length / 3;
    const f = S.runStep / GHOST_EVERY - 1;
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
    ctx.translate((gx + PLAYER_W / 2 - S.camX) * TS, (gy + PLAYER_H / 2) * TS);
    ctx.rotate(p[i * 3 + 2]);
    ctx.drawImage(ghostCv, -pw / 2, -ph / 2);
    ctx.restore();
  };

  // The Glitch's drop: the player flickers pink and blue
  const glitchFx = glitchLookOn();
  const fxCv = el("canvas");
  const drawGlitchFx = (angle, pw, ph) => {
    if (Math.random() < 0.5) return;
    fxCv.width = Math.ceil(pw);
    fxCv.height = Math.ceil(ph);
    const f = fxCv.getContext("2d");
    drawPlayer(f, 0, 0, fxCv.width, fxCv.height, 0, hero);
    f.globalCompositeOperation = "source-atop";
    f.fillStyle = Math.random() < 0.5 ? "rgba(255, 43, 214, 0.8)" : "rgba(33, 230, 255, 0.8)";
    f.fillRect(0, 0, fxCv.width, fxCv.height);
    ctx.save();
    ctx.globalAlpha = 0.6;
    ctx.translate((S.player.x + PLAYER_W / 2 - S.camX) * TS + (Math.random() - 0.5) * 8, (S.player.y + PLAYER_H / 2) * TS);
    ctx.rotate(angle);
    ctx.drawImage(fxCv, -pw / 2, -ph / 2);
    ctx.restore();
  };

  // Badge Master's golden crown, turning with the player
  const crownOn = window.BDBadges.has("master");
  const drawCrown = (angle, pw, ph) => {
    if (!crownOn) return;
    const u = pw / 7;
    ctx.save();
    ctx.translate((S.player.x + PLAYER_W / 2 - S.camX) * TS, (S.player.y + PLAYER_H / 2) * TS);
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

  // the 7-day streak reward: a rainbow along where you've just been
  const rainbow = trailOn();
  const drawTrail = () => {
    if (!rainbow || trail.length < 4) return;
    const s = TS * 0.2;
    for (let i = 0; i < trail.length; i += 2) {
      ctx.fillStyle = `hsla(${(i * 12 + S.time * 240) % 360}, 90%, 60%, ${((i / trail.length) * 0.8).toFixed(2)})`;
      ctx.fillRect((trail[i] + PLAYER_W / 2 - S.camX) * TS - s / 2, (trail[i + 1] + PLAYER_H * 0.65) * TS - s / 2, s, s);
    }
  };

  // The pet runs where you were a moment ago, so it jumps when you jump.
  const drawPet = () => {
    const sp = pet && Art.SPRITES[pet];
    if (!sp) return;
    const sw = sp.width || sp.naturalWidth, sh = sp.height || sp.naturalHeight;
    const h = TS * 0.6, w = (h * sw) / sh;
    if (STILL_PETS.includes(petBase)) {
      // sits on the start block of whatever you're playing (the boss arena too)
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(sp, (S.spawn.x + 0.5 - S.camX) * TS - w / 2, (S.spawn.y + 1) * TS - h, w, h);
      ctx.restore();
      return;
    }
    if (trail.length < 2) return;
    const fly = FLYING_PETS.includes(petBase);
    const lift = fly ? TS * (0.55 + 0.08 * Math.sin(S.time * 6)) : 0;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(sp, (trail[0] + PLAYER_W / 2 - S.camX) * TS - w / 2 - TS * 0.3,
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

  const drawGlitch = () => {
    const g = S.boss;
    if (g.gone) return;
    const rnd = () => GLITCH_COLORS[(Math.random() * GLITCH_COLORS.length) | 0];
    // glitched squares: fizzing pixels and a pink outline
    for (const c of g.broken) {
      if (c.fixed) continue;
      for (let i = 0; i < 6; i++) {
        ctx.fillStyle = rnd();
        ctx.fillRect((c.x - S.camX) * TS + Math.random() * TS * 0.75, c.y * TS + Math.random() * TS * 0.8, TS * 0.25, TS * 0.2);
      }
      ctx.strokeStyle = "#ff2bd6";
      ctx.lineWidth = 3;
      ctx.strokeRect((c.x - S.camX) * TS + 2, c.y * TS + 2, TS - 4, TS - 4);
    }
    const solid = g.mode === "solid";
    const body = (x, top, real) => {
      const px = (x - S.camX) * TS, py = top * TS, size = GLITCH_SIZE * TS, n = 8, cell = size / n;
      const seed = Math.floor(S.time * 10);
      ctx.save();
      if (S.state === "bossdown") ctx.globalAlpha = clamp(1.2 - S.downT / 1.8, 0, 1);
      else if (!solid) ctx.globalAlpha = 0.45 + 0.2 * Math.sin(S.time * 13);
      else if (real && g.hurtT > 0 && Math.sin(S.time * 40) > 0) ctx.globalAlpha = 0.35;
      for (let yy = 0; yy < n; yy++) {
        for (let xx = 0; xx < n; xx++) {
          const h = (xx * 73 + yy * 151 + seed * 197 + (real ? 0 : 31)) % 97;
          if (h < 12 && !solid) continue; // holes while it's not solid
          ctx.fillStyle = GLITCH_COLORS[h % GLITCH_COLORS.length];
          const jx = h % 7 === 0 ? (Math.random() - 0.5) * cell : 0;
          ctx.fillRect(px + xx * cell + jx, py + yy * cell, cell + 1, cell + 1);
        }
      }
      const look = clamp(S.player.x - x, -1, 1) * cell * 0.4;
      for (const ex of [1.5, 5]) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(px + ex * cell, py + 2.5 * cell, cell * 1.5, cell * 1.5);
        ctx.fillStyle = "#000000";
        ctx.fillRect(px + ex * cell + cell * 0.45 + look, py + 2.95 * cell, cell * 0.6, cell * 0.6);
      }
      if (solid) {
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 3;
        ctx.strokeRect(px, py, size, size);
      }
      ctx.restore();
    };
    body(g.x, g.top, true);
    for (const c of g.clones) body(c.x, c.top, false);
    for (const r of g.rain) {
      ctx.fillStyle = Math.floor(S.time * 20 + r.x0 * 7) % 2 ? "#ff2bd6" : "#21e6ff";
      ctx.fillRect((r.x - S.camX) * TS + TS * 0.2, r.y * TS + TS * 0.2, TS * 0.6, TS * 0.6);
    }
    if (g.shakeT > 0) {
      // coloured static all over the screen
      ctx.save();
      ctx.globalAlpha = 0.5;
      for (let i = 0; i < 40; i++) {
        ctx.fillStyle = rnd();
        ctx.fillRect(Math.random() * canvas.width, Math.random() * canvas.height, Math.random() * 140, 2 + Math.random() * 8);
      }
      ctx.restore();
    }
    if (g.rewindFx > 0) {
      ctx.fillStyle = `rgba(120, 200, 255, ${Math.min(0.5, g.rewindFx).toFixed(2)})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  };

  // The Galactic Monstrosity, with a purple glow that pulses behind it.
  const drawGalaxy = () => {
    const g = S.boss;
    const w = TS * GALAXY_W, h = TS * GALAXY_H;
    const x0 = (g.x - S.camX) * TS - w / 2, y0 = g.y * TS;
    ctx.save();
    ctx.globalAlpha = 0.22 + 0.12 * Math.sin(S.time * 3);
    ctx.fillStyle = "#b46bff";
    ctx.fillRect(x0 - TS * 0.25, y0 - TS * 0.25, w + TS * 0.5, h + TS * 0.5);
    ctx.restore();
    Art.drawSprite(ctx, "galaxyMonster", x0, y0, w, h);
  };

  const drawGalaxyHud = () => {
    ctx.fillStyle = "#e2dcf2";
    ctx.font = "bold 22px ui-monospace, monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText("🌌 GALACTIC MONSTROSITY · get to a portal!", canvas.width / 2, 12);
  };

  // The Zombie trap: the portal in the sky, the zombie, and your 4 health bars.
  const drawZombie = () => {
    const z = S.zombie;
    if (z.phase === "flash") return;
    // the portal grows open, then shrinks away once the zombie's beaten
    const open = z.phase === "fly" ? 0 : z.phase === "portal" ? Math.min(1, z.t / 0.6) : z.phase === "won" ? Math.max(0, 1 - z.t / 0.8) : 1;
    if (open > 0) {
      const size = TS * 2.4 * open;
      ctx.save();
      ctx.translate((PLAINS_PORTAL.x + 0.5 - S.camX) * TS, (PLAINS_PORTAL.y + 0.5) * TS);
      ctx.rotate(S.time * 2);
      drawTile(ctx, "\u018c", -size / 2, -size / 2, size, S.time, false);
      ctx.restore();
    }
    // the zombie drops out of the portal at the end of the intro
    let zx = z.x, zy = z.y;
    if (z.phase === "portal") {
      const k = Math.max(0, (z.t - 0.6) / 0.5);
      if (k <= 0) return;
      zy = PLAINS_PORTAL.y + k * 0.5;
    }
    if (z.phase === "won") return;
    if (z.hurtT > 0 && Math.floor(z.hurtT * 20) % 2) return; // blinks when stomped
    Art.drawSprite(ctx, "zombie", (zx - S.camX) * TS - TS * 0.1, zy * TS, TS * (MOB_W + 0.2), TS * MOB_H);
    // your health: four bars above your head
    if (z.phase === "fight") {
      const bx = (S.player.x + PLAYER_W / 2 - S.camX) * TS - TS * 0.62, by = (S.player.y - 0.45) * TS;
      for (let i = 0; i < ZOMBIE_LIVES; i++) {
        ctx.fillStyle = "#1b1b22";
        ctx.fillRect(bx + i * TS * 0.32, by, TS * 0.28, TS * 0.22);
        ctx.fillStyle = i < z.lives ? (z.invT > 0 && i === z.lives ? "#ffffff" : "#ff4a4a") : "#4a2a2a";
        ctx.fillRect(bx + i * TS * 0.32 + 2, by + 2, TS * 0.28 - 4, TS * 0.22 - 4);
      }
    }
  };
  // Mini games: player 2 (or the computer), the lasers and meteors, the countdown.
  const PVP_HP_BARS = 5;
  const drawMini = () => {
    const m = S.mini;
    for (const h of m.hazards) {
      const hx = (h.x - S.camX) * TS;
      if (h.kind === "laser") {
        if (h.warn > 0) {
          // a blinking warning stripe, then the beam
          if (Math.floor(h.warn * 10) % 2) continue;
          ctx.fillStyle = "rgba(255, 60, 60, 0.35)";
          ctx.fillRect(hx + TS * 0.3, 0, TS * 0.4, canvas.height);
          ctx.fillStyle = "#ff4a4a";
          ctx.fillRect(hx + TS * 0.2, 0, TS * 0.6, TS * 0.4);
        } else {
          ctx.fillStyle = "#ff2a2a"; ctx.fillRect(hx, 0, TS, canvas.height);
          ctx.fillStyle = "#ffd0d0"; ctx.fillRect(hx + TS * 0.3, 0, TS * 0.4, canvas.height);
        }
      } else {
        // a blocky meteor with a flaming tail
        const my = (h.y - S.camY) * TS, s = TS * 0.9, q = s / 4;
        ctx.fillStyle = "rgba(255, 140, 40, 0.5)"; ctx.fillRect(hx + q, my - s, q * 2, s);
        ctx.fillStyle = "rgba(255, 220, 80, 0.6)"; ctx.fillRect(hx + q * 1.5, my - s * 0.6, q, s * 0.6);
        ctx.fillStyle = "#6a5a50"; ctx.fillRect(hx, my + q, s, q * 2); ctx.fillRect(hx + q, my, q * 2, s);
        ctx.fillStyle = "#8c7a6a"; ctx.fillRect(hx + q, my + q, q * 2, q * 2);
        ctx.fillStyle = "#ff8a3d"; ctx.fillRect(hx + q * 2, my + q, q, q);
      }
    }
    const p2 = m.p2;
    if (m.game === "pvp") {
      for (const s of m.shots) {
        ctx.fillStyle = s.from === m.p1 ? "#ffd54a" : "#b46bff";
        ctx.fillRect((s.x - S.camX) * TS - TS * 0.15, (s.y - S.camY) * TS - TS * 0.08, TS * 0.3, TS * 0.16);
      }
      // swords, health bars over both heads
      const fighters = [[m.p1, S.player.x, S.player.y], ...(p2.alive ? [[p2, p2.x, p2.y]] : [])];
      for (const [who, x, y] of fighters) {
          const cx = (x + PLAYER_W / 2 - S.camX) * TS, cy = (y - S.camY) * TS;
        ctx.save();
        ctx.translate(cx + who.face * PLAYER_W * TS * 0.5, cy + PLAYER_H * TS * 0.5);
        ctx.scale(who.face, 1);
        ctx.rotate(who.swing > 0 ? 0.3 - (1 - who.swing / 0.2) * 1.6 + 1.3 : -0.6);
        Art.drawSprite(ctx, "swordIron", 0, -TS * 0.7, TS * 0.7, TS * 0.7);
        ctx.restore();
        for (let i = 0; i < PVP_HP_BARS; i++) {
          ctx.fillStyle = "#1b1b22";
          ctx.fillRect(cx - TS * 0.8 + i * TS * 0.32, cy - TS * 0.45 - (who === p2 ? 14 : 0), TS * 0.28, TS * 0.2);
          ctx.fillStyle = i < who.hp ? (who === m.p1 ? "#ff4a4a" : "#b46bff") : "#3a2a3a";
          ctx.fillRect(cx - TS * 0.8 + i * TS * 0.32 + 2, cy - TS * 0.45 - (who === p2 ? 14 : 0) + 2, TS * 0.28 - 4, TS * 0.2 - 4);
        }
      }
    }
    if (p2.alive && !(p2.safeT > 0 && Math.floor(p2.safeT * 20) % 2)) {
      Art.drawPlayer(ctx, (p2.x - S.camX) * TS, (p2.y - S.camY) * TS, PLAYER_W * TS, PLAYER_H * TS, 0, "playerGalaxy");
      ctx.fillStyle = "#e2dcf2"; ctx.font = "bold 14px ui-monospace, monospace";
      ctx.textAlign = "center"; ctx.textBaseline = "bottom";
      ctx.fillText(m.opp === "cpu" ? "🤖" : "P2", (p2.x + PLAYER_W / 2 - S.camX) * TS, (p2.y - S.camY) * TS - 4);
    }
  };
  const drawMiniHud = () => {
    const m = S.mini;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const big = (text, color) => {
      ctx.font = "bold 48px ui-monospace, monospace";
      ctx.lineWidth = 6; ctx.strokeStyle = "rgba(0, 0, 0, 0.7)";
      ctx.strokeText(text, canvas.width / 2, canvas.height / 2);
      ctx.fillStyle = color; ctx.fillText(text, canvas.width / 2, canvas.height / 2);
    };
    const title = { meteor: "☄️ METEOR DODGE", pvp: "⚔️ PVP" }[m.game] || "⚡ LASER DODGE";
    ctx.font = "bold 22px ui-monospace, monospace";
    ctx.fillStyle = "#e2dcf2";
    ctx.textBaseline = "top";
    ctx.fillText(m.phase === "play" ? `${title} · ${Math.floor(m.play)}s` : title, canvas.width / 2, 12);
    ctx.textBaseline = "middle";
    if (m.phase === "count") {
      big(m.t < 3 ? String(3 - Math.floor(m.t)) : "GO!", "#ffd54a");
      ctx.font = "bold 18px ui-monospace, monospace"; ctx.fillStyle = "#e2dcf2";
      const keys = m.game === "pvp"
        ? (m.opp === "2p" ? "You: W A D · S sword · E shoot     Player 2: ← ↑ → · ↓ sword · Enter shoot" : "W A D move · S sword · E shoot")
        : m.game === "meteor"
          ? (m.opp === "2p" ? "You: Space/W up · Shift/S down · A D     Player 2: ↑ up · ↓ down · ← →" : "Space or ↑ up · Shift or ↓ down · let go to stay")
        : (m.opp === "2p" ? "You: W A D   ·   Player 2: ← ↑ →" : "Last one standing wins!");
      ctx.fillText(keys, canvas.width / 2, canvas.height / 2 + 50);
    } else if (m.phase === "won") big(m.opp === "2p" ? "PLAYER 1 WINS!" : "YOU WIN!", "#8ff09a");
    else if (m.phase === "lost") big(m.opp === "2p" ? "PLAYER 2 WINS!" : "YOU LOSE!", "#ff8a80");
  };
  const drawZombieHud = () => {
    const z = S.zombie;
    if (z.phase === "flash") {
      ctx.fillStyle = `rgba(255, 30, 30, ${(0.55 * (1 - Math.abs(z.t / 0.3 - 1))).toFixed(3)})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    if (z.phase === "fight") {
      ctx.fillStyle = "#e2dcf2";
      ctx.font = "bold 22px ui-monospace, monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText("🧟 ZOMBIE " + "▮".repeat(z.hp) + "▯".repeat(ZOMBIE_HP - z.hp), canvas.width / 2, 12);
    }
  };

  const drawBoss = () => {
    if (S.boss.galaxy) { drawGalaxy(); return; }
    if (S.boss.glitch) { drawGlitch(); return; }
    const b = S.boss;
    const px = TS * BOSS_PX;
    if (S.state === "cut" && S.cutT < 2.6) {
      const d = dragonAt();
      // once it's been hit it shakes and flickers
      const hit = S.cutT > 1.8;
      ctx.save();
      if (hit && Math.sin(S.time * 50) > 0) ctx.globalAlpha = 0.45;
      const flap = 1 + Math.sin(S.time * 14) * 0.12;
      Art.drawSprite(ctx, "dragon", (d.x - S.camX) * TS + (hit ? Math.sin(S.time * 70) * 5 : 0),
        d.y * TS + (1 - flap) * 9 * px, 32 * px, 18 * px * flap);
      ctx.restore();
    }
    if (b.gone || (S.state === "cut" && S.cutT < 2.8)) return;
    const walking = S.state === "cut" && S.cutT < 4.4;
    const bob = walking ? Math.abs(Math.sin(S.time * 9)) * -5 : Math.sin(S.time * 3) * 2;
    const shake = S.state === "bossdown" ? Math.sin(S.time * 80) * 5 : 0;
    ctx.save();
    if (S.state === "cut") ctx.globalAlpha = clamp((S.cutT - 2.8) / 0.9, 0, 1);
    else if (S.state === "bossdown") ctx.globalAlpha = clamp(1.2 - S.downT / 1.8, 0, 1);
    else if (b.hurtT > 0 && Math.sin(S.time * 40) > 0) ctx.globalAlpha = 0.35;
    Art.drawSprite(ctx, "boss", (b.x - S.camX) * TS + shake, BOSS_TOP * TS + bob, 24 * px, 32 * px);
    ctx.restore();

    for (const r of b.rain) {
      // a red mark on the floor shows where each one will land
      ctx.fillStyle = "rgba(255, 60, 60, 0.55)";
      ctx.fillRect((r.x - S.camX) * TS, (H - 1) * TS - 5, TS, 5);
      drawTile(ctx, "t", (r.x - S.camX) * TS, r.y * TS, TS, S.time, false);
    }
  };

  const drawGlitchHud = () => {
    const g = S.boss;
    if (g.gone) return;
    ctx.textBaseline = "top";
    ctx.font = "bold 18px ui-monospace, monospace";
    ctx.textAlign = "right";
    ctx.fillStyle = "#ffffff";
    // ten chunks, so they're narrower than the TNT Mech's
    const bx = canvas.width / 2 - g.max * 22;
    ctx.fillText("THE GLITCH", bx - 10, 14);
    for (let i = 0; i < g.max; i++) {
      ctx.fillStyle = "#1c1c1c";
      ctx.fillRect(bx + i * 44, 12, 40, 20);
      ctx.fillStyle = i < g.hp ? "#ff2bd6" : "#4a4a4a";
      ctx.fillRect(bx + i * 44 + 3, 15, 34, 14);
    }
    ctx.textAlign = "center";
    ctx.font = "bold 20px ui-monospace, monospace";
    if (g.mode === "solid") {
      ctx.fillStyle = "#ffffff";
      ctx.fillText(`⚡ IT'S SOLID! STOMP IT! ${Math.max(0, g.solidT).toFixed(1)}`, canvas.width / 2, 44);
    } else if (S.state === "run") {
      ctx.fillStyle = "#8ff09a";
      const done = g.broken.filter((c) => c.fixed).length;
      ctx.fillStyle = g.fixT < 5 ? "#ff6b6b" : "#8ff09a";
      ctx.fillText(`🛠 Fix the glitched blocks: ${done}/${g.broken.length} · ⏰ ${Math.max(0, g.fixT).toFixed(0)}`, canvas.width / 2, 44);
    }
    if (S.flipT > 0) {
      ctx.fillStyle = "#ffd54a";
      ctx.fillText("🔀 CONTROLS FLIPPED", canvas.width / 2, 72);
    }
    if (g.introT > 0 || g.bannerT > 0) {
      const intro = g.introT > 0;
      ctx.font = `bold ${intro ? 60 : 40}px ui-monospace, monospace`;
      const text = intro ? "THE GLITCH" : g.banner;
      const y = canvas.height / 2 - 40;
      // drawn three times, a little apart, like a broken screen
      ctx.fillStyle = "#21e6ff";
      ctx.fillText(text, canvas.width / 2 - 3 + (Math.random() - 0.5) * 4, y);
      ctx.fillStyle = "#ff2bd6";
      ctx.fillText(text, canvas.width / 2 + 3 + (Math.random() - 0.5) * 4, y);
      ctx.fillStyle = "#ffffff";
      ctx.fillText(text, canvas.width / 2, y);
    }
  };

  const drawBossHud = () => {
    if (S.boss.galaxy) { drawGalaxyHud(); return; }
    if (S.boss.glitch) { drawGlitchHud(); return; }
    const b = S.boss;
    ctx.textBaseline = "top";
    if (S.state === "cut") {
      if (S.cutT > 4.2) {
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
    if (S.state !== "run") return;
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
    for (const word of String(S.talk).split(/\s+/)) {
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
    if (Math.sin(S.time * 5) > -0.3) {
      ctx.fillStyle = "#ffd54a";
      ctx.font = "bold 16px ui-monospace, monospace";
      ctx.textAlign = "right";
      ctx.fillText("▶ jump to carry on", x0 + bw - pad, y0 + bh - pad - 8);
    }
  };

  // Inside the giant vacuum: its insides fill the screen, you in the middle,
  // and the sign from his drawing with how far out you've got.
  let insideGrid = null;
  const drawInside = () => {
    const ins = S.inside, W = canvas.width, Hh = canvas.height;
    // the level's own inside (Inside the vacuum tab): its blocks as junk,
    // and a big spinning fan at each Fan block
    insideGrid = insideGrid || vacInsideGrid(level.vac);
    Art.drawBackground(ctx, "vacuumBare", W, Hh, 0, TS, S.time, null);
    insideGrid.forEach((row, y) => row.forEach((ch, x) => {
      if (ch === FAN) Art.drawFan(ctx, (x + 0.5) * TS, (y + 0.5) * TS, TS * 2.6, S.time);
      else if (ch !== AIR) drawTile(ctx, ch, x * TS, y * TS, TS, S.time, false);
    }));
    const pw = PLAYER_W * TS * 1.6, ph = PLAYER_H * TS * 1.6;
    const along = ins.got / VAC_ESCAPE;
    drawPlayer(ctx, W * (0.2 + 0.6 * along) - pw / 2 + Math.sin(S.time * 20) * 3, Hh * 0.62 - ph / 2, pw, ph, Math.sin(S.time * 9) * 0.4, hero);
    const bw = 520, bx = W / 2 - bw / 2, by = 24;
    ctx.fillStyle = "rgba(20, 20, 28, 0.9)"; ctx.fillRect(bx, by, bw, 96);
    ctx.strokeStyle = "#ffd54a"; ctx.lineWidth = 4; ctx.strokeRect(bx, by, bw, 96);
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillStyle = "#ffffff"; ctx.font = "bold 24px ui-monospace, monospace";
    ctx.fillText("CONSTANTLY CLICK TO GET OUT!", W / 2, by + 30);
    ctx.font = "bold 16px ui-monospace, monospace";
    ctx.fillStyle = ins.t < 2 ? (Math.floor(S.time * 8) % 2 ? "#ff4a4a" : "#ffffff") : "#ffd54a";
    ctx.fillText(`spam SPACE!   ⏱ ${Math.ceil(Math.max(0, ins.t))} before the fan gets you`, W / 2, by + 56);
    ctx.fillStyle = "#3a3a48"; ctx.fillRect(bx + 20, by + 70, bw - 40, 14);
    ctx.fillStyle = "#8ff09a"; ctx.fillRect(bx + 20, by + 70, (bw - 40) * along, 14);
  };

  const render = () => {
    if (S.inside) { drawInside(); return; }
    drawBackground();
    showBoost();

    // A level taller than the screen slides up and down under it: everything
    // in the level is drawn moved up by camY, the HUD on top isn't.
    const lifted = S.camY !== 0;
    if (lifted) { ctx.save(); ctx.translate(0, -S.camY * TS); }
    const startX = Math.max(0, Math.floor(S.camX) - 1);
    const endX = Math.min(S.width - 1, Math.ceil(S.camX + VIEW_COLS) + 1);
    const startY = Math.max(0, Math.floor(S.camY) - 1);
    const endY = Math.min(S.grid.length - 1, Math.ceil(S.camY + H) + 1);
    if (P.backGrid && !S.inBoss) drawBackLayer(ctx, P.backGrid, startX, endX, startY, endY, TS, -S.camX * TS, S.time);
    for (let x = startX; x <= endX; x++) {
      for (let y = startY; y <= endY; y++) {
        const ch = S.grid[y][x];
        if (baseOf(ch) === MINIGAME) {
          drawMiniQuarter(ctx, S.grid, x, y, (x - S.camX) * TS, y * TS, TS);
        } else if (baseOf(ch) === TREE) {
          drawTree(ctx, ch, (x - S.camX) * TS, y * TS, TS);
        } else if (ch === FLIP && S.flipTraps.some((f) => f.x === x && f.y === y)) {
          // about to flip: it shakes
          drawTile(ctx, ch, (x - S.camX) * TS + Math.sin(S.time * 60) * TS * 0.06, y * TS, TS, S.time, false);
        } else if (isDoor(ch) || baseOf(ch) === ELEV_DOOR || ch === ELEV_DOOR_OPEN) {
          Art.drawSprite(ctx, ch, (x - S.camX) * TS, (y - 1) * TS, TS, TS * 2);
        } else if (isOpenDoor(ch)) {
          const t = clamp((S.time - (S.doorT[noteKey(x, y)] || 0)) / DOOR_SWING, 0, 1);
          const px = (x - S.camX) * TS, top = (y - 1) * TS;
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
          drawTile(ctx, "L", (x - S.camX) * TS, y * TS, TS, S.time, false);
          const own = S.looks[noteKey(x, y)];
          drawTile(ctx, own && baseOf(own) === ch[1] ? own : ch[1], (x - S.camX) * TS, y * TS, TS, S.time, false);
        } else if (ch !== AIR && ch !== "P" && !isHidden(ch)) {
          let key = ch === FLOWED ? "L" : overOf(ch) || ch;
          if (ch === "W" && !eyeOpen({ x, ph: (x * 0.37) % WATCH_CYCLE })) key = "watcherClosed";
          // powered wires glow and powered lamps light up
          if ((isWire(ch) || ch === LAMP) && S.powered.has(noteKey(x, y))) key = ch === LAMP ? "lampOn" : "wireOn" + WIRES.indexOf(baseOf(ch));
          // still the block it started as (not blown up, switched on or grown over)? use its own look
          const own = S.looks[noteKey(x, y)];
          if (own && key === ch && baseOf(own) === ch) key = own;
          let faded = ch === "G" && S.framesLeft > 0;
          if (faded) ctx.globalAlpha = 0.35;
          // glitchy stone: a faint ghost while it's gone, flickering just before it goes
          if (baseOf(ch) === GLITCH_STONE) {
            const left = BLINK_TIME - (S.runT % (2 * BLINK_TIME));
            if (!blinkOn(S.runT)) { ctx.globalAlpha = 0.15; faded = true; }
            else if (left < 0.25 && Math.floor(left * 16) % 2 === 0) { ctx.globalAlpha = 0.5; faded = true; }
          }
          drawTile(ctx, key, (x - S.camX) * TS, y * TS, TS, S.time,
            y > 0 && isSolid(S.grid[y - 1][x]));
          if (faded) ctx.globalAlpha = 1;
        }
      }
    }

    for (const w of S.watchers) {
      if (w.x >= startX - 4 && w.x <= endX + 4) drawCone(ctx, S.grid, w.x, w.y, TS, -S.camX * TS, eyeOpen(w));
    }

    // the next block of lava oozing out of each active source
    for (const m of S.movers) {
      if (!m.active || m.done) continue;
      const next = m.tip + m.dir;
      const there = next >= 0 && next < S.grid.length ? S.grid[next][m.x] : null;
      const plant = there !== null && LOGGABLE.includes(baseOf(there));
      if (there !== AIR && !plant) continue;
      const h = TS * m.t;
      const y = m.dir < 0 ? (next + 1) * TS - h : next * TS;
      ctx.save();
      ctx.beginPath();
      ctx.rect((m.x - S.camX) * TS, y, TS, h);
      ctx.clip();
      drawTile(ctx, "L", (m.x - S.camX) * TS, next * TS, TS, S.time, false);
      ctx.restore();
      // lava oozing into a plant's square goes behind it, so draw the plant again on top
      if (plant) {
        const own = S.looks[noteKey(m.x, next)];
        drawTile(ctx, own && baseOf(own) === there ? own : there, (m.x - S.camX) * TS, next * TS, TS, S.time, false);
      }
    }
    for (const r of S.risers) drawTile(ctx, r.ch, (r.x - S.camX) * TS, r.y * TS, TS, S.time, false);
    for (const f of S.fallers) {
      if (f.tall) Art.drawSprite(ctx, f.ch, (f.x - S.camX) * TS, (f.y - 1) * TS, TS, TS * 2);
      else drawTile(ctx, f.ch, (f.x - S.camX) * TS, f.y * TS, TS, S.time, false);
    }
    for (const b of S.bullets) {
      if (b.ender) {
        drawTile(ctx, "enderBullet", (b.x - S.camX) * TS - TS * 0.4, b.y * TS - TS / 2, TS, S.time, false);
        continue;
      }
      const bs = TS * 0.55;
      ctx.save();
      ctx.translate((b.x - S.camX) * TS, b.y * TS);
      ctx.rotate(S.time * 6);
      drawTile(ctx, "bullet", -bs / 2, -bs / 2, bs, S.time, false);
      ctx.restore();
    }

    for (const c of S.critters) {
      if (CAT_MOBS.includes(c.kind)) { drawCat(c); continue; }
      if (c.kind === VACUUM) { drawVacuum(c); continue; }
      if (c.kind === VILLAGER && c.hurtT > 0 && Math.floor(c.hurtT * 20) % 2) continue; // flashes when stomped
      Art.drawSprite(ctx, c.ch, (c.x - S.camX) * TS, c.y * TS, c.w * TS, c.h * TS);
      if (c.kind === TNT_SOLDIER && c.fuse > 0 && Math.floor(c.fuse * 10) % 2 === 0) {
        // fizzing: it flashes white faster and faster
        ctx.save();
        ctx.globalAlpha = 0.6;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect((c.x - S.camX) * TS, c.y * TS, c.w * TS, c.h * TS);
        ctx.restore();
      }
    }
    for (const a of S.arrows) {
      const ax = (a.x - S.camX) * TS, ay = a.y * TS;
      ctx.fillStyle = "#8a6a3a";
      ctx.fillRect(ax - TS * 0.3, ay - 2, TS * 0.6, 4);
      ctx.fillStyle = "#c9c9d6";
      ctx.fillRect(a.dir > 0 ? ax + TS * 0.3 : ax - TS * 0.4, ay - 4, TS * 0.1, 8);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(a.dir > 0 ? ax - TS * 0.32 : ax + TS * 0.24, ay - 5, TS * 0.08, 10);
    }
    for (const m of S.mobs) {
      // a corrupted watcher flickers sideways now and then
      const jit = m.kind === "Q" && Math.sin(S.time * 37 + m.x) > 0.8 ? TS * 0.12 : 0;
      Art.drawSprite(ctx, m.look || m.kind, (m.x - S.camX) * TS - TS * 0.05 + jit, (m.y + MOB_H - 2) * TS,
        TS * 0.9, TS * 2);
      if (m.awake && m.kind !== "N") {
        ctx.fillStyle = "#ff4f6b";
        ctx.font = "bold 20px ui-monospace, monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        ctx.fillText("!", (m.x + MOB_W / 2 - S.camX) * TS, m.y * TS - 2);
      }
    }

    if (S.boss) drawBoss();
    if (S.zombie) drawZombie();
    if (S.mini) drawMini();

    for (const bz of S.blazes) {
      const bs = TS * 0.8;
      const px = (bz.x - S.camX) * TS, py = bz.y * TS;
      // rods spinning around the head, in two rings like the real thing
      for (let i = 0; i < 6; i++) {
        const a = S.time * (i < 3 ? 2.5 : -2) + (i % 3) * (Math.PI * 2 / 3);
        const rr = TS * (i < 3 ? 0.55 : 0.4);
        ctx.fillStyle = i % 2 ? "#f0a020" : "#ffd54a";
        ctx.fillRect(px + Math.cos(a) * rr - TS * 0.06, py + TS * (i < 3 ? 0.05 : 0.35) +
          Math.sin(a) * rr * 0.3 - TS * 0.14, TS * 0.12, TS * 0.28);
      }
      drawTile(ctx, "blaze", px - bs / 2, py - bs / 2, bs, S.time, false);
    }
    for (const fb of S.fireballs) {
      const fs = TS * 0.5;
      ctx.save();
      ctx.translate((fb.x - S.camX) * TS, fb.y * TS);
      ctx.rotate(S.time * 8);
      drawTile(ctx, "fireball", -fs / 2, -fs / 2, fs, S.time, false);
      ctx.restore();
    }

    if (S.state !== "dead" && S.flying) {
      const ws = TS * 1.5;
      const flap = Math.sin(S.time * (S.holding ? 22 : 8)) * TS * 0.08;
      drawTile(ctx, "wingsWorn",
        (S.player.x + PLAYER_W / 2 - S.camX) * TS - ws / 2,
        (S.player.y + PLAYER_H * 0.45) * TS - ws / 2 + flap, ws, S.time, false);
    }
    if (S.state === "dead") {
      const cx = (S.player.x + PLAYER_W / 2 - S.camX) * TS, cy = (S.player.y + PLAYER_H / 2) * TS;
      const pw = PLAYER_W * TS, ph = PLAYER_H * TS;
      if (S.deathKind === "burn") {
        // the player fades away inside a flame instead of blowing up
        const k = clamp(S.deadT / 0.7, 0, 1);
        ctx.save();
        ctx.globalAlpha = 1 - k;
        drawPlayer(ctx, cx - pw / 2, cy - ph / 2, pw, ph, S.rot, hero);
        ctx.globalAlpha = clamp((0.9 - S.deadT) / 0.2, 0, 1);
        const fs = TS * (1.1 + 0.5 * k);
        drawTile(ctx, "F", cx - fs / 2, (S.player.y + PLAYER_H) * TS - fs, fs, S.time, false);
        ctx.restore();
      } else if (S.deathKind === "poof" && S.deadT < POOF_AFTER) {
        drawHurtPlayer(cx, cy, pw, ph, (S.deadT / POOF_AFTER) * Math.PI / 2);
      }
    }
    drawGhost();
    drawTrail();
    drawPet();
    if (S.state !== "dead") {
      const k = S.warp ? clamp((S.warp.t / WARP_TIME - 0.7) / 0.3, 0, 1) : 1;
      if (k > 0) {
        const pw = PLAYER_W * TS * k, ph = PLAYER_H * TS * k;
        drawPlayer(ctx, (S.player.x + PLAYER_W / 2 - S.camX) * TS - pw / 2,
          (S.player.y + PLAYER_H / 2) * TS - ph / 2, pw, ph, S.rot, hero);
        // the armor, worn over your look until it breaks; cat-shaped on the
        // cat and on the Galaxy skin
        if (S.armor > 0) {
          drawPlayer(ctx, (S.player.x + PLAYER_W / 2 - S.camX) * TS - pw / 2,
            (S.player.y + PLAYER_H / 2) * TS - ph / 2, pw, ph, S.rot,
            hero === CAT_LOOK || hero === GALAXY_LOOK ? "armorCat" : "armorSuit");
        }
        if (window.BDBadges.has("master")) drawCrown(S.rot, pw, ph);
        // your health bars, once a Slime, arrow or TNT Soldier has hurt you
        if (!S.zombie && S.hp < HEALTH_MAX) {
          const bx = (S.player.x + PLAYER_W / 2 - S.camX) * TS - TS * 0.62, by = (S.player.y - 0.45) * TS;
          for (let i = 0; i < HEALTH_MAX; i++) {
            ctx.fillStyle = "#1b1b22";
            ctx.fillRect(bx + i * TS * 0.32, by, TS * 0.28, TS * 0.22);
            ctx.fillStyle = i < S.hp ? "#ff4a4a" : "#4a2a2a";
            ctx.fillRect(bx + i * TS * 0.32 + 2, by + 2, TS * 0.28 - 4, TS * 0.22 - 4);
          }
        }
        if (glitchFx) drawGlitchFx(S.rot, pw, ph);
        // sword in hand for the boss fight
        if (S.inBoss && sword) {
          drawTile(ctx, SWORDS[sword].key, (S.player.x + PLAYER_W * 0.55 - S.camX) * TS,
            (S.player.y - 0.05) * TS, TS * 0.75, 0, false);
        }
        // the shield's bubble, blinking as it runs out
        if (S.shieldT > 0 && (S.shieldT > 0.6 || Math.floor(S.time * 12) % 2)) {
          ctx.strokeStyle = "#9cc4ff";
          ctx.lineWidth = 4;
          ctx.strokeRect((S.player.x - 0.15 - S.camX) * TS, (S.player.y - 0.15) * TS,
            (PLAYER_W + 0.3) * TS, (PLAYER_H + 0.3) * TS);
        }
      }
    }

    for (const p of S.particles) {
      ctx.globalAlpha = clamp(p.life, 0, 1);
      ctx.fillStyle = p.c;
      const ps = TS * (p.s || 0.16);
      ctx.fillRect((p.x - S.camX) * TS, p.y * TS, ps, ps);
    }
    ctx.globalAlpha = 1;
    if (lifted) ctx.restore();

    if (S.warp) {
      ctx.fillStyle = "rgba(150, 80, 230, " + (0.35 * Math.sin(Math.PI * clamp(S.warp.t / WARP_TIME, 0, 1))).toFixed(3) + ")";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    if (S.effect) {
      ctx.fillStyle = S.effect === "fast" ? "#ffd54a" : "#c9c9d6";
      ctx.font = "bold 26px ui-monospace, monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText(S.effect === "fast" ? "⚡ FAST!" : "🥀 SLOW…", canvas.width / 2, 16);
    }
    if (S.flying && S.state === "run") {
      const y = S.effect ? 52 : 16;
      ctx.fillStyle = "#e2dcf2";
      ctx.font = "bold 26px ui-monospace, monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText("🪽 FLY! hold jump", canvas.width / 2, y);
    }

    if (S.nipT > 0) {
      canvas.style.filter = `hue-rotate(${Math.round((S.time * 300) % 360)}deg) saturate(1.8)`;
      canvas.style.transform = `rotate(${(Math.sin(S.time * 7) * 1.5).toFixed(2)}deg) scale(${(1 + Math.sin(S.time * 5) * 0.015).toFixed(3)})`;
      S.nipShown = true;
    } else if (S.nipShown) {
      canvas.style.filter = "";
      canvas.style.transform = "";
      S.nipShown = false;
    }
    if (S.state === "run" && (S.nineLives > 0 || S.wallJump)) {
      ctx.font = "bold 20px ui-monospace, monospace";
      ctx.textAlign = "left";
      ctx.textBaseline = "bottom";
      ctx.fillStyle = "#ffd54a";
      ctx.fillText([S.nineLives > 0 ? `😺 ×${S.nineLives}` : "", S.wallJump ? "🧗" : ""].join(" ").trim(), 12, canvas.height - 10);
    }
    if (S.boss) drawBossHud();
    if (S.zombie) drawZombieHud();
    const vb = S.critters.find((c) => c.boss && !c.gone);
    if (vb && S.state === "run") {
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.font = "bold 22px ui-monospace, monospace";
      ctx.fillStyle = vb.boss.stage === 2 ? "#8ff09a" : "#e2dcf2";
      ctx.fillText(vb.boss.stage === 1 ? "🌀 1: It's sucking! Don't get caught!"
        : vb.boss.stage === 2 ? "🔋 2: LOW BATTERY! Climb up and stomp it!" : "💩 3: Dirt! Jump the low ones!", canvas.width / 2, 12);
    }
    if (S.mini) drawMiniHud();

    if (S.state === "run" && !S.mini && (S.stopT > 0 || (S.free && !S.boss))) {
      const y = 16 + (S.effect ? 36 : 0) + (S.flying ? 36 : 0);
      ctx.fillStyle = S.stopT > 0 ? "#ff8a80" : "#8ff09a";
      ctx.font = "bold 26px ui-monospace, monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText(S.stopT > 0 ? "✋ STOP " + S.stopT.toFixed(1) : "◀ FREE MOVE ▶", canvas.width / 2, y);
    }

    if (S.state === "talk") drawDialog();

    if (S.state === "dead") {
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      if (S.deathKind === "boom" || S.deathKind === "megaboom") {
        drawExplosion(ctx,
          (S.player.x + PLAYER_W / 2 - S.camX) * TS,
          (S.player.y + PLAYER_H / 2) * TS,
          TS * (S.deathKind === "megaboom" ? 6.5 : 3.2), S.deadT);
      }
      ctx.fillStyle = "#ff6b6b";
      ctx.font = "bold 46px ui-monospace, monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText({ burn: "BURNED!", delete: "DELETED!", poof: "POOF!", megaboom: "MEGA BOOM!", fan: "THE FAN GOT YOU!" }[S.deathKind] || "BOOM!",
        canvas.width / 2, canvas.height / 2);
    }
  };

  return {
    render
  };
};
