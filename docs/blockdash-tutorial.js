// Block Dash tutorial: five picture pages with a little moving scene on each,
// opened with the 📖 Tutorial button on the main menu.
window.BDTutorial = (() => {
  "use strict";

  // The words for each page. Change them here.
  const PAGES = [
    { title: "Moving and jumping", scene: "jump",
      words: "Press Space to jump over holes!" },
    { title: "Stuff to grab", scene: "diamonds",
      words: "Grab diamonds 💎 as you go. Each one turns into 10 coins when you finish. " +
        "Look out for rods 🪄, pearls 🔮, eyes 👁 and keys 🔑 too!" },
    { title: "Dangers", scene: "spike",
      words: "Try not to get hit by spikes, lava, mobs and TNT!" },
    { title: "Shop and Level Maker", scene: "buildBuy",
      words: "Spend your coins in the Shop on swords, shields, pets and more. " +
        "Then build your own levels in the Level Maker!" },
    { title: "Upgrading gear", scene: "sword",
      words: "Better swords beat bosses faster: Stone ➜ Iron ➜ Diamond. " +
        "A shield saves you from one mob hit." },
  ];

  const W = 480, H = 180, TS = 40; // 12 blocks wide, 4.5 tall
  const GROUND = 3; // the row the ground starts on
  const PW = 0.7, PH = 0.9; // the player's size in blocks, as in the game
  const RUN = 4; // blocks a second

  const Art = () => window.BDArt;
  const tile = (ctx, ch, x, y, t) => Art().drawTile(ctx, ch, x * TS, y * TS, TS, t, false);
  const ground = (ctx, t, gaps = []) => {
    for (let x = 0; x < W / TS; x++) {
      if (gaps.includes(x)) continue;
      tile(ctx, "g", x, GROUND, t);
      tile(ctx, "s", x, GROUND + 1, t);
    }
  };
  const player = (ctx, x, y, rot, look) =>
    Art().drawPlayer(ctx, x * TS, y * TS, PW * TS, PH * TS, rot, look);
  const label = (ctx, text, x, y, size = 22, color = "#fff") => {
    ctx.font = `bold ${size}px sans-serif`;
    ctx.textAlign = "center";
    ctx.lineWidth = 4;
    ctx.strokeStyle = "rgba(0,0,0,0.7)";
    ctx.strokeText(text, x, y);
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
  };
  const standY = GROUND - PH;

  // Each scene draws one moment; t is seconds since the page opened.
  const SCENES = {
    // run along and hop over a two-block hole, again and again
    jump(ctx, t, look) {
      const loop = 13 / RUN;
      const x = ((t % loop) * RUN) - 1;
      ground(ctx, t, [5, 6]);
      const from = 3.9, to = 7.3; // where the jump starts and lands
      let y = standY, rot = 0;
      if (x > from && x < to) {
        const p = (x - from) / (to - from);
        y -= 1.6 * 4 * p * (1 - p);
        rot = p * Math.PI;
      }
      player(ctx, x, y, rot, look);
    },

    // run through a row of diamonds; each one sparkles away
    diamonds(ctx, t, look) {
      const loop = 14 / RUN;
      const x = ((t % loop) * RUN) - 1;
      ground(ctx, t);
      let got = 0;
      for (let d = 3; d <= 9; d++) {
        const reached = x + PW > d + 0.3;
        if (!reached) { tile(ctx, "d", d, GROUND - 1, t); continue; }
        got++;
        const age = (x + PW - (d + 0.3)) / RUN; // seconds since grabbed
        if (age < 0.4) {
          ctx.fillStyle = `rgba(255,255,160,${1 - age / 0.4})`;
          for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2, r = age * 60;
            ctx.fillRect((d + 0.5) * TS + Math.cos(a) * r - 3, (GROUND - 0.5) * TS + Math.sin(a) * r - 3, 6, 6);
          }
        }
      }
      player(ctx, x, standY, 0, look);
      label(ctx, "💎 " + got, W - 50, 30);
    },

    // run into a spike, go POOF, start again
    spike(ctx, t, look) {
      const hitAt = 6.35; // where the player meets the spike
      const runTime = (hitAt + 1) / RUN;
      const loop = runTime + 1.2;
      const s = t % loop;
      ground(ctx, t);
      tile(ctx, "A", 7, GROUND - 1, t);
      if (s < runTime) { player(ctx, s * RUN - 1, standY, 0, look); return; }
      const age = s - runTime;
      if (age < 0.15) player(ctx, hitAt, standY, age * 4, look);
      const cx = (hitAt + PW / 2) * TS, cy = (standY + PH / 2) * TS;
      ctx.fillStyle = `rgba(220,220,220,${Math.max(0, 1 - age / 0.9)})`;
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2, r = 8 + age * 50;
        ctx.beginPath();
        ctx.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r - age * 20, 7 - age * 4, 0, Math.PI * 2);
        ctx.fill();
      }
      label(ctx, "POOF!", cx, cy - 40 - age * 10, 28);
    },

    // first a level builds itself block by block, then coins buy a sword
    buildBuy(ctx, t, look) {
      const s = t % 8;
      if (s < 4) {
        ground(ctx, t);
        const blocks = [["s", 4, GROUND - 1], ["s", 5, GROUND - 1], ["s", 5, GROUND - 2],
          ["d", 7, GROUND - 2], ["A", 8, GROUND - 1], ["d", 10, GROUND - 1]];
        const shown = Math.min(blocks.length, Math.floor(s * 2));
        for (let i = 0; i < shown; i++) tile(ctx, blocks[i][0], blocks[i][1], blocks[i][2], t);
        player(ctx, 1, standY, 0, look);
        label(ctx, "✏ Level Maker", W / 2, 30);
        return;
      }
      const b = s - 4;
      label(ctx, "🛒 Shop", W / 2, 30);
      const sx = W / 2 - 30, sy = 60;
      for (let i = 0; i < 4; i++) {
        const p = Math.min(1, Math.max(0, (b - i * 0.3) / 0.8));
        if (p <= 0 || p >= 1) continue;
        Art().drawSprite(ctx, "coin", 30 + (sx - 30) * p, 120 - Math.sin(p * Math.PI) * 60, 30, 30);
      }
      if (b > 2) {
        const pop = Math.min(1, (b - 2) / 0.25);
        const size = 60 * (0.5 + pop * 0.5);
        Art().drawSprite(ctx, "swordStone", W / 2 - size / 2, sy + 30 - size / 2, size, size);
        label(ctx, "Bought!", W / 2, 160, 22, "#ffd54a");
      }
    },

    // a sword that keeps getting better, with a shine each time
    sword(ctx, t) {
      const SWORDS = [["swordStone", "Stone sword"], ["swordIron", "Iron sword"], ["swordDiamond", "Diamond sword"]];
      const step = 1.6;
      const i = Math.floor(t / step) % SWORDS.length;
      const s = t % step;
      const size = 90;
      Art().drawSprite(ctx, SWORDS[i][0], W / 2 - size / 2, 30, size, size);
      if (s < 0.35) { // the shine
        ctx.fillStyle = `rgba(255,255,255,${0.8 * (1 - s / 0.35)})`;
        ctx.beginPath();
        ctx.arc(W / 2, 75, 30 + s * 120, 0, Math.PI * 2);
        ctx.fill();
      }
      label(ctx, SWORDS[i][1], W / 2, 160);
    },
  };

  // opts: { root, el, clear, look, onMenu, onPlay }
  const show = (opts) => {
    const { root, el, clear, look, onMenu, onPlay } = opts;
    let page = 0, raf = null, start = 0;
    const stop = () => { if (raf) cancelAnimationFrame(raf); raf = null; };

    const draw = () => {
      clear();
      const p = PAGES[page];
      const head = el("div", "row");
      head.appendChild(el("h1", null, `📖 ${p.title}`));
      head.appendChild(el("div", "spacer"));
      const back = el("button", "small", "← Back");
      back.onclick = () => { stop(); onMenu(); };
      head.appendChild(back);
      root.appendChild(head);

      const panel = el("div", "panel tutorial");
      const canvas = el("canvas");
      canvas.width = W;
      canvas.height = H;
      canvas.className = "tutorial-scene";
      panel.appendChild(canvas);
      panel.appendChild(el("p", "tutorial-words", p.words));

      const nav = el("div", "row tutorial-nav");
      const prev = el("button", "small", "◀ Back");
      prev.disabled = page === 0;
      prev.onclick = () => { page--; draw(); };
      nav.appendChild(prev);
      nav.appendChild(el("div", "spacer"));
      nav.appendChild(el("span", "hint", `Page ${page + 1} of ${PAGES.length}`));
      nav.appendChild(el("div", "spacer"));
      if (page < PAGES.length - 1) {
        const next = el("button", "green small", "Next ▶");
        next.onclick = () => { page++; draw(); };
        nav.appendChild(next);
      } else {
        const menu = el("button", "small", "Back to menu");
        menu.onclick = () => { stop(); onMenu(); };
        const go = el("button", "green", "▶ Play now!");
        go.onclick = () => { stop(); onPlay(); };
        nav.append(menu, go);
      }
      panel.appendChild(nav);
      root.appendChild(panel);

      const ctx = canvas.getContext("2d");
      ctx.imageSmoothingEnabled = false;
      stop();
      start = performance.now();
      const frame = (now) => {
        if (!canvas.isConnected) { raf = null; return; } // the page was left some other way
        const t = (now - start) / 1000;
        Art().drawBackground(ctx, "overworld", W, H, t * 20, TS, t, null);
        SCENES[p.scene](ctx, t, look);
        raf = requestAnimationFrame(frame);
      };
      raf = requestAnimationFrame(frame);
    };
    draw();
  };

  return { show, PAGES };
})();
