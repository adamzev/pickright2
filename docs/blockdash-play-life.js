// Block Dash play screen: dying and winning, explosions and sparkles, and Blink teleports.
//
// Part of showPlay in blockdash.js, which calls this once per level played.
// S holds the play screen's changing values (S.player, S.grid, …), P the
// helpers shared between the play files, BD blockdash.js's own constants.
window.BDPlayLife = (S, P, BD) => {
  "use strict";
  const {
    bestKey, builtinLevels, dailyLevelDone, dailyNote, dayKey, el, GALAXY_KEY, galaxyWon,
    getBest, GHOST_BONUS, H, loadBag, musicOf, PLAYER_H, PLAYER_W, saveBag, setBest,
    SHIELD_TIME, toast
  } = BD;
  const {
    bag, chain, endRun, fromEditor, hasEyes, hasPearls, hasRods, jumpBtn, level, msgSlot,
    onExit, petBase, reset, shieldEl, showItems, sword
  } = P;

  const explode = (cx, cy, colors) => {
    for (let i = 0; i < 34; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 3 + Math.random() * 11;
      S.particles.push({
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
    S.particles.push({
      x: S.player.x + Math.random() * PLAYER_W, y: S.player.y + Math.random() * PLAYER_H,
      vx: (Math.random() - 0.5) * 2, vy: -1 - Math.random() * 3, g: -5,
      life: 0.4 + Math.random() * 0.5,
      c: ["#ffd54a", "#ff8a3d", "#e04a2f", "#ff5a1f"][(Math.random() * 4) | 0],
    });
  };

  const puff = () => {
    for (let i = 0; i < 16; i++) {
      const s = 0.22 + Math.random() * 0.26;
      S.particles.push({
        x: S.player.x + PLAYER_W / 2 + (Math.random() - 0.5) * 0.9 - s / 2,
        y: S.player.y + PLAYER_H / 2 + (Math.random() - 0.5) * 0.9 - s / 2,
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
    if (S.shieldT > 0) return true;
    if (S.armor > 0) {
      S.armor--;
      showItems();
      S.shieldT = SHIELD_TIME;
      toast("🪖 Your armor saved you!");
      sparkle(S.player.x + PLAYER_W / 2, S.player.y + PLAYER_H / 2, ["#2b2a7a", "#7ee8ff", "#ffffff"]);
      return true;
    }
    if (bag.shields < 1) return false;
    bag.shields--;
    saveBag(Object.assign(loadBag(), { shields: bag.shields }));
    shieldEl.textContent = "🛡 " + bag.shields;
    S.shieldT = SHIELD_TIME;
    toast("🛡 Your shield saved you!");
    sparkle(S.player.x + PLAYER_W / 2, S.player.y + PLAYER_H / 2, ["#3f7fd6", "#9cc4ff", "#ffffff"]);
    return true;
  };

  // A grey, ordinary-looking error page over the whole screen, with the music
  // off. Reload takes you to the arena and the Galactic Monstrosity.
  const fakeCrash = () => {
    S.state = "crash";
    S.holding = false;
    window.BDMusic.level(null);
    const page = el("div", "fake-crash");
    page.innerHTML = "<h1>Game crashed :(</h1><p>Sorry, looks like we had a problem.</p>";
    const reload = el("button", null, "Reload");
    reload.onclick = () => {
      page.remove();
      window.BDMusic.level(musicOf(level));
      S.state = "run";
      P.enterCrash();
    };
    page.appendChild(reload);
    document.body.appendChild(page);
  };

  const die = (kind = "boom", byMob = false) => {
    if (S.state !== "run") return;
    if (byMob && shielded()) return;
    S.state = "dead";
    S.deathKind = kind;
    S.deadT = 0;
    window.BDBadges.add("deaths");
    if (S.run) S.run.deaths++;
    if (S.lifeStep < 1 / P.STEP && !S.checkpoint) window.BDBadges.earn("oops");
    S.poofed = false;
    if (kind === "burn") {
      for (let i = 0; i < 14; i++) ember();
    } else if (kind !== "poof") {
      if (kind === "megaboom") {
        explode(S.player.x + PLAYER_W / 2, S.player.y + PLAYER_H / 2, ["#f08bff", "#c22fd0", "#ffd54a", "#ffffff"]);
      }
      explode(S.player.x + PLAYER_W / 2, S.player.y + PLAYER_H / 2,
        kind === "delete" ? ["#b46bff", "#2a1240", "#f4f0ff", "#7a2fd0"]
          : ["#ffd54a", "#ff8a3d", "#e04a2f", "#8c8c8c"]);
    }
    jumpBtn.disabled = true;
  };

  const boom = (kind) => {
    if (S.state === "run") window.BDBadges.add("tnt");
    die(kind);
  };

  const win = () => {
    if (S.state !== "run") return;
    const beatGhost = endRun(true);
    const M = window.BDMusic, B = window.BDBadges;
    B.cleared(bestKey(level), builtinLevels().map(bestKey));
    // first, so their coins are in the bag before the bag is re-read below
    if (S.inBoss && level.glitch) B.earn("glitch");
    const daily = level.daily && level.daily === dayKey() ? dailyLevelDone() : null;
    dailyNote("win");
    if (S.run && !S.run.deaths) dailyNote("perfect");
    if (S.inBoss && !S.crash) dailyNote("boss");
    if (S.inBoss && !level.glitch && !S.crash) { B.earn("boss"); if (!sword) B.earn("bare"); }
    // escaping the Galactic Monstrosity: armor and the Galaxy skin, the first time
    const galaxyFirst = S.crash && !galaxyWon();
    if (galaxyFirst) { try { localStorage.setItem(GALAXY_KEY, "1"); } catch (e) { /* ignore */ } }
    if (S.run && !S.run.deaths) B.earn("perfect");
    if (!M.playing) B.earn("silent");
    if (petBase === "petDog" && M.playing === "woof") B.earn("goodboy");
    S.state = "win";
    setBest(bestKey(level), S.score);
    // re-read first: a shield used on the way has already been saved
    Object.assign(bag, loadBag(), { rods: S.rods, pearls: S.pearls, eyes: S.eyes });
    bag.coins += S.score + (beatGhost ? GHOST_BONUS : 0);
    bag.mega += S.megas;
    saveBag(bag);
    jumpBtn.disabled = true;
    explode(S.player.x + PLAYER_W / 2, S.player.y + PLAYER_H / 2,
      ["#4fe0d8", "#b6fffa", "#ffd54a", "#c58bff"]);
    const carried = chain ? chain.carried : 0;
    const runTotal = carried + S.score;
    const more = chain && chain.i + 1 < chain.count;

    const box = el("div", "overlay-msg");
    box.innerHTML =
      `<div class="big">${more || !chain ? "Level Complete!" : "You Finished!"}</div>` +
      (galaxyFirst ? `<div class="big" style="font-size:1.1rem">🌌 You escaped! Unlocked: 🪖 Armor (survive 1 hit every level) and the Galaxy skin (pick it on the menu)</div>` : "") +
      (beatGhost ? `<div class="big" style="font-size:1.1rem">👻 NEW BEST! You beat your ghost! +${GHOST_BONUS} coins</div>` : "") +
      (daily ? `<div class="big" style="font-size:1.1rem">📅 Daily level done! 🔥 ${daily.streak}-day streak · ${daily.lines.join(" · ")}</div>` : "") +
      `<div>Score: ${S.score} · Best: ${getBest(bestKey(level))}</div>` +
      `<div>+${S.score} coins${S.megas ? ` · +${S.megas} megacoins` : ""} · ` +
      `you now have ${bag.coins} coins${bag.mega ? ` and ${bag.mega} megacoins` : ""}</div>` +
      (hasRods || hasPearls || hasEyes
        ? `<div>In your inventory: ${S.rods} 🪄 · ${S.pearls} 🔮 · ${S.eyes} 👁</div>` : "") +
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
      next.onclick = () => { P.stop(); chain.playNext(runTotal); };
      row.appendChild(next);
    }
    const again = el("button", more ? "small" : "green small", "▶ Play again");
    again.onclick = () => reset(true);
    const out = el("button", "small", fromEditor ? "← Editor" : "← Levels");
    out.onclick = () => { P.stop(); onExit(); };
    row.append(again, out);
    box.appendChild(row);
    msgSlot.innerHTML = "";
    msgSlot.appendChild(box);
    msgSlot.style.marginTop = "8px";
  };

  const sparkle = (x, y, colors) => {
    for (let i = 0; i < 10; i++) {
      S.particles.push({ x, y, vx: (Math.random() - 0.5) * 6, vy: -2 - Math.random() * 4,
        life: 0.4 + Math.random() * 0.3, c: colors[(Math.random() * colors.length) | 0] });
    }
  };

  const gotRod = (x, y) => {
    S.rods++;
    showItems();
    sparkle(x, y, ["#ffe98a", "#f0a020"]);
  };

  // Jump to the nearest Blink further right. Only forward, so Blinks
  // can't be used to loop back and farm gems.
  const blink = (fromX, fromY) => {
    let best = null, bestD = Infinity;
    for (let y = 0; y < S.grid.length; y++) {
      for (let x = fromX + 1; x < S.width; x++) {
        if (S.grid[y][x] !== "I") continue;
        const d = (x - fromX) ** 2 + (y - fromY) ** 2;
        if (d < bestD) { bestD = d; best = { x, y }; }
      }
    }
    if (!best) return false;
    sparkle(S.player.x + PLAYER_W / 2, S.player.y + PLAYER_H / 2, ["#b46bff", "#f4f0ff"]);
    S.player.x = best.x + (1 - PLAYER_W) / 2;
    S.player.y = best.y + (1 - PLAYER_H);
    S.player.vy = 0;
    // The game holds still while the camera glides over, so the jump is
    // easy on the eyes and you're never dropped straight into danger.
    S.warp = { t: 0, from: S.camX };
    return true;
  };

  return {
    blink, boom, die, ember, explode, fakeCrash, gotRod, puff, sparkle, win
  };
};
