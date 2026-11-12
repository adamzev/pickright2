// Block Dash pixel art.
//
// Every sprite is baked once into a small offscreen canvas (16x16 for blocks,
// 12x16 for the player) and blitted with smoothing off — flat, blocky,
// blocky-sandbox flavoured. The game never draws art itself; it only calls the
// functions returned at the bottom of this file.
//
// SWAPPING IN REAL IMAGE ASSETS
// ----------------------------
// Every drawable is looked up by key in the SPRITES registry, so any of them can
// be replaced at runtime with a PNG (or any canvas/Image) without touching the
// game code:
//
//   BDArt.loadSprites({ g: "art/grass.png", t: "art/tnt.png" }).then(...)
//   BDArt.registerSprite("player", someCanvasOrImage);
//
// Keys: block letters g s m t h C d b w f n k L U D F S Z r e I W T o V Q N E B P,
// plus "bullet", "blaze", "fireball", "watcherClosed",
// "checkpointOn", "wingsWorn", plus "dirt", "cloud", "player",
// "explosion1", "explosion2". Blocks should be square; the player is drawn at
// roughly 3:4. Anything not replaced keeps the built-in pixel art.
//
// REPAINTING SPRITES (Art Studio)
// -------------------------------
// getPixels/setPixels turn a sprite into an editable { w, h, px } object and
// back again; see the "repainting sprites" section further down.
window.BDArt = (() => {
  "use strict";

  const S = 16;

  // deterministic noise so a block type always has the exact same texture
  const nz = (x, y, seed) => {
    let h = (x * 374761393 + y * 668265263 + seed * 2654435761) | 0;
    h = (h ^ (h >> 13)) * 1274126177;
    return ((h ^ (h >> 16)) >>> 0) / 4294967295;
  };

  const mk = (w, h, paint) => {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d");
    paint(ctx);
    return c;
  };

  const rect = (ctx, x, y, w, h, col) => {
    ctx.fillStyle = col;
    ctx.fillRect(x, y, w, h);
  };

  // Build a sprite from a text map: one character per pixel, looked up in a
  // legend of colours. Any character missing from the legend stays transparent.
  const paintMap = (rows, legend) =>
    mk(rows[0].length, rows.length, (c) => {
      rows.forEach((row, y) => {
        [...row].forEach((ch, x) => {
          const col = legend[ch];
          if (!col) return;
          c.fillStyle = col;
          c.fillRect(x, y, 1, 1);
        });
      });
    });

  // draw a shape described as [row, xStart, xEnd] spans
  const spans = (ctx, list, col) => {
    ctx.fillStyle = col;
    for (const [y, x0, x1] of list) ctx.fillRect(x0, y, x1 - x0 + 1, 1);
  };

  const noiseFill = (ctx, seed, colors, w = S, h = S) => {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const r = nz(x, y, seed);
        ctx.fillStyle = colors[Math.min(colors.length - 1, (r * colors.length) | 0)];
        ctx.fillRect(x, y, 1, 1);
      }
    }
  };

  // ---------- blocks ----------

  const DIRT_COLORS = ["#6b4220", "#7a4d26", "#8b5a2b", "#9c6b43", "#8b5a2b", "#7a4d26"];

  const dirt = mk(S, S, (c) => noiseFill(c, 3, DIRT_COLORS));

  const grass = mk(S, S, (c) => {
    c.drawImage(dirt, 0, 0);
    for (let x = 0; x < S; x++) {
      const depth = 3 + Math.floor(nz(x, 0, 11) * 3); // ragged grass/dirt seam
      for (let y = 0; y < depth; y++) {
        const r = nz(x, y, 17);
        c.fillStyle =
          y === 0
            ? r < 0.5 ? "#7cb342" : "#8bc34a"
            : r < 0.35 ? "#4a7c2a" : r < 0.72 ? "#5f9e3f" : "#6fae4a";
        c.fillRect(x, y, 1, 1);
      }
    }
  });

  const stone = mk(S, S, (c) => {
    noiseFill(c, 7, ["#5c5c5c", "#6e6e6e", "#8a8a8a", "#9d9d9d", "#8a8a8a", "#7b7b7b"]);
  });

  // ---------- nether blocks (from the drawing) ----------

  const netherrack = mk(S, S, (c) => {
    noiseFill(c, 51, ["#5a1d1d", "#6b2323", "#7d2b2b", "#8f3434", "#7d2b2b", "#6b2323"]);
    // a few dark cracks, like the scribbles in the drawing
    [[2, 3], [3, 4], [4, 4], [5, 5], [10, 2], [11, 3], [11, 4], [9, 9], [10, 10],
      [11, 10], [12, 11], [3, 11], [4, 12], [5, 12], [6, 13]].forEach(([x, y]) =>
      rect(c, x, y, 1, 1, "#3e1212"));
  });

  const netherBricks = mk(S, S, (c) => {
    rect(c, 0, 0, S, S, "#1e0d10"); // mortar
    for (let row = 0; row < 4; row++) {
      const off = row % 2 ? 4 : 0;
      for (let bx = -1; bx < 3; bx++) {
        const x = bx * 8 + off;
        const y = row * 4;
        const x0 = Math.max(0, x), x1 = Math.min(S, x + 7);
        if (x1 <= x0) continue;
        rect(c, x0, y, x1 - x0, 3, "#4a1f24");
        rect(c, x0, y, x1 - x0, 1, "#5e2a30");
        rect(c, x0, y + 2, x1 - x0, 1, "#3b181c");
      }
    }
  });

  const lavaBase = (c, seed) => {
    noiseFill(c, seed, ["#d1481a", "#e8661f", "#f08a24", "#e8661f", "#ffb43a"]);
    [[3, 4], [4, 4], [10, 7], [11, 7], [11, 8], [6, 12], [7, 12], [13, 2]].forEach(([x, y]) =>
      rect(c, x, y, 1, 1, "#fff0a0"));
  };
  const lava = mk(S, S, (c) => lavaBase(c, 61));
  // Moving lava keeps the lava look plus arrows, so you can tell which way
  // it'll go before it starts moving.
  const arrow = (c, up) => {
    const rows = up ? [[3, 7, 8], [4, 6, 9], [5, 5, 10]] : [[10, 5, 10], [11, 6, 9], [12, 7, 8]];
    rows.forEach(([y, x0, x1]) => rect(c, x0, y, x1 - x0 + 1, 1, "#7a1a0a"));
    rect(c, 7, up ? 6 : 5, 2, 5, "#7a1a0a");
  };
  const lavaUp = mk(S, S, (c) => { lavaBase(c, 62); arrow(c, true); });
  const lavaDown = mk(S, S, (c) => { lavaBase(c, 63); arrow(c, false); });

  const fire = mk(S, S, (c) => {
    const flame = (cx, h, w) => {
      for (let y = 0; y < h; y++) {
        const half = Math.max(0, Math.round((w / 2) * Math.sin((Math.PI * (y + 1)) / (h + 1))));
        const yy = S - 1 - y;
        rect(c, cx - half, yy, half * 2 + 1, 1, y > h * 0.7 ? "#ffd54a" : "#ff8a3d");
        if (half > 1 && y < h * 0.6) rect(c, cx - half + 1, yy, half * 2 - 1, 1, "#ffd54a");
        if (half > 2 && y < h * 0.35) rect(c, cx - 1, yy, 3, 1, "#fff6c0");
      }
    };
    flame(4, 11, 6);
    flame(11, 13, 7);
    flame(8, 8, 5);
    rect(c, 0, S - 1, S, 1, "#e04a2f");
  });

  // Shooter: a stone box with a glowing eye that fires tracking stars.
  const shooter = mk(S, S, (c) => {
    noiseFill(c, 71, ["#4a4a52", "#5c5c66", "#6e6e78"]);
    rect(c, 0, 0, S, 1, "#2a2a30");
    rect(c, 0, S - 1, S, 1, "#2a2a30");
    rect(c, 0, 0, 1, S, "#2a2a30");
    rect(c, S - 1, 0, 1, S, "#2a2a30");
    rect(c, 4, 4, 8, 8, "#1a1a20");
    rect(c, 5, 5, 6, 6, "#5b1f96");
    rect(c, 6, 6, 4, 4, "#c58bff");
    rect(c, 7, 7, 2, 2, "#ffffff");
  });

  // Spawner: a dark iron cage with a little flame flickering inside.
  const spawner = mk(S, S, (c) => {
    rect(c, 0, 0, S, S, "#14161c");
    rect(c, 5, 6, 6, 7, "#5a1e0a");
    rect(c, 6, 8, 4, 5, "#e5701f");
    rect(c, 7, 9, 2, 3, "#ffd54a");
    for (let i = 0; i < S; i += 5) {
      rect(c, i, 0, 1, S, "#4a5260");
      rect(c, 0, i, S, 1, "#4a5260");
    }
    rect(c, 0, S - 1, S, 1, "#4a5260");
    rect(c, S - 1, 0, 1, S, "#4a5260");
    rect(c, 0, 0, S, 1, "#6e7888");
    rect(c, 0, 0, 1, S, "#6e7888");
  });

  // Blaze: a fiery head. Its spinning rods are drawn by the game around it.
  const blaze = mk(S, S, (c) => {
    rect(c, 3, 2, 10, 10, "#e5a21f");
    rect(c, 4, 3, 8, 8, "#ffc93a");
    rect(c, 4, 3, 8, 2, "#ffe98a");
    rect(c, 5, 6, 2, 2, "#3a1a08");
    rect(c, 9, 6, 2, 2, "#3a1a08");
    rect(c, 6, 9, 4, 1, "#a8501a");
    rect(c, 6, 12, 4, 3, "#ff8a3d");
    rect(c, 7, 13, 2, 3, "#ffd54a");
  });

  // Blaze rod: the thing you collect — a glowing yellow stick on a diagonal.
  const blazeRod = mk(S, S, (c) => {
    for (let i = 0; i < 11; i++) {
      rect(c, 3 + i, 13 - i, 2, 2, i % 3 === 0 ? "#ffe98a" : "#f0a020");
    }
    rect(c, 2, 13, 2, 2, "#c86a10");
    rect(c, 13, 2, 2, 2, "#c86a10");
    rect(c, 12, 1, 1, 1, "#ffffff");
  });

  const fireball = mk(S, S, (c) => {
    rect(c, 4, 4, 8, 8, "#e5401f");
    rect(c, 3, 6, 10, 4, "#e5401f");
    rect(c, 6, 3, 4, 10, "#e5401f");
    rect(c, 5, 5, 6, 6, "#ff8a3d");
    rect(c, 6, 6, 4, 4, "#ffd54a");
    rect(c, 7, 7, 2, 2, "#ffffff");
  });

  // ---- the End ----

  const endStone = mk(S, S, (c) => {
    noiseFill(c, 83, ["#dfe0a4", "#e8e9b5", "#d2d394", "#eef0c2"]);
    [[3, 4], [10, 2], [6, 11], [12, 12], [1, 13]].forEach(([x, y]) =>
      rect(c, x, y, 2, 1, "#c4c585"));
  });

  // the eye used by Blink and End TNT
  const eye = (c, x, y, w, h, open) => {
    if (!open) {
      rect(c, x, y + Math.floor(h / 2), w, 1, "#1a0f24");
      return;
    }
    rect(c, x + 1, y, w - 2, h, "#f4f0ff");
    rect(c, x, y + 1, w, h - 2, "#f4f0ff");
    rect(c, x + Math.floor(w / 2) - 1, y + 1, 2, h - 2, "#7a2fd0");
    rect(c, x + Math.floor(w / 2) - 1, y + 2, 1, h - 4, "#14081f");
  };

  // Blink: touch it and you're teleported to the nearest other Blink.
  const blink = mk(S, S, (c) => {
    rect(c, 2, 2, 12, 12, "#2a1240");
    rect(c, 1, 4, 14, 8, "#2a1240");
    rect(c, 4, 1, 8, 14, "#2a1240");
    rect(c, 3, 3, 10, 10, "#4a1f72");
    eye(c, 4, 5, 8, 6, true);
  });

  // Watcher: a block that's just a big eye. Shut, it shows its eyelid.
  const watcherPx = (open) => mk(S, S, (c) => {
    noiseFill(c, 91, ["#1e1a26", "#262130", "#1a1620"]);
    if (!open) {
      rect(c, 2, 5, 12, 6, "#4a3f5c");
      rect(c, 1, 7, 14, 2, "#4a3f5c");
      rect(c, 2, 9, 12, 1, "#120e18");
      [3, 6, 9, 12].forEach((x) => rect(c, x, 10, 1, 2, "#120e18"));
      return;
    }
    rect(c, 2, 4, 12, 8, "#f4eef2");
    rect(c, 1, 6, 14, 4, "#f4eef2");
    rect(c, 5, 4, 6, 8, "#c4203a");
    rect(c, 4, 5, 8, 6, "#c4203a");
    rect(c, 6, 5, 4, 6, "#ff5a6e");
    rect(c, 7, 5, 2, 6, "#14080c");
    rect(c, 5, 5, 1, 1, "#ffffff");
  });
  const watcher = watcherPx(true);
  const watcherClosed = watcherPx(false);
  // Staring watcher: the same eye with a red rim, because it never shuts.
  const staringWatcher = mk(S, S, (c) => {
    c.drawImage(watcher, 0, 0);
    c.strokeStyle = "#ff3a50";
    c.lineWidth = 1;
    c.strokeRect(0.5, 0.5, S - 1, S - 1);
  });

  // End TNT: TNT retextured in End colours, with an eye where the N goes.
  const endTnt = mk(S, S, (c) => {
    noiseFill(c, 87, ["#2a2238", "#352c47", "#231c30"]);
    for (let y = 2; y < 14; y++) {
      for (let x = 0; x < S; x++) {
        rect(c, x, y, 1, 1, x % 4 === 0 || x % 4 === 3 ? "#4a1f72" : "#6b2fa8");
      }
    }
    rect(c, 0, 6, S, 5, "#efe8ff");
    const T = ["111", "010", "010", "010", "010"];
    [1, 12].forEach((ox) => T.forEach((row, ry) => [...row].forEach((ch, rx) => {
      if (ch === "1") rect(c, ox + rx, 6 + ry, 1, 1, "#1c1c1c");
    })));
    rect(c, 6, 6, 4, 5, "#1c1c1c");
    rect(c, 7, 7, 2, 3, "#b46bff");
  });

  const eyeOfEnder = mk(S, S, (c) => {
    rect(c, 4, 3, 8, 10, "#1f6b5a");
    rect(c, 3, 4, 10, 8, "#1f6b5a");
    rect(c, 4, 4, 8, 8, "#2fa88a");
    rect(c, 5, 5, 6, 6, "#7be0c2");
    rect(c, 7, 5, 2, 6, "#0e2a24");
    rect(c, 5, 4, 2, 1, "#c8fff0");
  });

  // Two blocks tall. Characters: K body, k body shade, P eye, p pupil, R arm.
  const endWatcher = paintMap([
    "....KKKKKKKK....",
    "....KkkkkkkK....",
    "....KPPkkPPK....",
    "....KPpkkpPK....",
    "....KkkkkkkK....",
    "....KKKKKKKK....",
    "......KKKK......",
    "...KKKKKKKKKK...",
    "..RKkkkkkkkkKR..",
    ".RRKkkkkkkkkKRR.",
    ".R.KkkkkkkkkKR..",
    "RR.KkkkkkkkkK.R.",
    "R..KkkkkkkkkK.RR",
    "R..KkkkkkkkkK..R",
    "RR.KkkkkkkkkK..R",
    ".RRKKKKKKKKKK.RR",
    "...KKKKKKKKKK.R.",
    "....KKk..kKK..R.",
    "....KKk..kKK.RR.",
    "....KKk..kKK.R..",
    "....KKk..kKK.R..",
    "....KKk..kKK....",
    "....KKk..kKK....",
    "....KKk..kKK....",
    "....KKk..kKK....",
    "....KKk..kKK....",
    "....KKk..kKK....",
    "....KKk..kKK....",
    "....KKk..kKK....",
    "....KKk..kKK....",
    "...KKKk..kKKK...",
    "...KKKK..KKKK...",
  ], { K: "#1c1426", k: "#2c2140", P: "#d9a8ff", p: "#7a2fd0", R: "#251a33" });

  const corruptedWatcher = paintMap([
    "...KKKKKKKKKK...",
    "...KkkkkkkkkK...",
    "...KPPkGkkkkK...",
    "...KPpkGkkkkKK..",
    "...KkkkkkkPPkK..",
    "...KKKKKKkPpkK..",
    "......KKKKKKKK..",
    "..KKKKKKKKKKK...",
    ".RKkkGkkkkkkKR..",
    "RRKkkGkkkkkkKRR.",
    "R.KkkkkkkGGkK.R.",
    "R.KkkkkkkkkkK.RR",
    "RR.KkkkkkkkkK..R",
    ".R.KkkkkkkkkK..R",
    ".R.KkkGkkkkkK.RR",
    ".RRKKKKKKKKKK.R.",
    "...KKKKKKKKKK...",
    "...KKkk..KkkK...",
    "...KKkk...KkK...",
    "...KKk....KkK...",
    "...KKk....KkK...",
    "...KKk....KkK...",
    "...KKk....KkKK..",
    "...KKk.....KkK..",
    "...KKk.....KkK..",
    "...KKk.....KkK..",
    "...KKk.....KkK..",
    "...KKk.....KkK..",
    "...KKk.....KkK..",
    "...KKk.....KkK..",
    "..KKKk.....KkKK.",
    "..KKKK.....KKKK.",
  ], { K: "#1a0f1f", k: "#3a1a3a", P: "#ff4fd8", p: "#2a0026", R: "#2a1430", G: "#4fffb0" });

  const shortEnderman = paintMap([
    "................",
    "................",
    "....KKKKKKKK....",
    "....KkkkkkkK....",
    "....KkkkkkkK....",
    "....KPPkkPPK....",
    "....KpPkkPpK....",
    "....KkkkkkkK....",
    "....KkkkkkkK....",
    "....KKKKKKKK....",
    "...KKKKKKKKKK...",
    "..KKkkkkkkkkKK..",
    ".KK.KkkkkkkkK.KK",
    ".KK.KkkkkkkkK.KK",
    ".KK.KkkkkkkkK.KK",
    ".KK.KkkkkkkkK.KK",
    ".KK.KkkkkkkkK.KK",
    ".KK.KkkkkkkkK.KK",
    ".KK.KkkkkkkkK.KK",
    ".KK.KkkkkkkkK.KK",
    "..K.KkkkkkkkK.K.",
    "..K.KkkkkkkkK.K.",
    "....KkkkkkkkK...",
    "....KkkkkkkkK...",
    "....KkkkkkkkK...",
    "....KKKKKKKKK...",
    "....KKk..kKK....",
    "....KKk..kKK....",
    "....KKk..kKK....",
    "....KKk..kKK....",
    "...KKKk..kKKK...",
    "...KKKK..KKKK...",
  ], { K: "#0f0f12", k: "#1c1c22", P: "#e08cff", p: "#ffffff" });

  // The tracking bullet: a four-pointed star, like the one in the drawing.
  const bullet = mk(S, S, (c) => {
    const pts = [[7, 0, 2, 16], [0, 7, 16, 2], [5, 4, 6, 8], [4, 5, 8, 6]];
    pts.forEach(([x, y, w, h]) => rect(c, x, y, w, h, "#ffd54a"));
    rect(c, 6, 3, 4, 10, "#ffe98a");
    rect(c, 3, 6, 10, 4, "#ffe98a");
    rect(c, 6, 6, 4, 4, "#ffffff");
  });

  const slime = mk(S, S, (c) => {
    rect(c, 0, 0, S, S, "#5aa03a");
    rect(c, 1, 1, 14, 14, "#7bc95a");
    rect(c, 3, 3, 10, 10, "#96e072");
    rect(c, 4, 4, 8, 8, "#7bc95a");
    // slime cube "eyes"
    rect(c, 5, 6, 2, 2, "#2f5e1c");
    rect(c, 9, 6, 2, 2, "#2f5e1c");
    rect(c, 6, 10, 4, 1, "#2f5e1c");
    // highlight
    rect(c, 2, 2, 3, 1, "#c6f5a8");
    rect(c, 2, 3, 1, 2, "#c6f5a8");
  });

  const tnt = mk(S, S, (c) => {
    // grey top/bottom caps
    noiseFill(c, 21, ["#7d7d7d", "#8c8c8c", "#9a9a9a"]);
    // red body with vertical stripes
    for (let y = 2; y < 14; y++) {
      for (let x = 0; x < S; x++) {
        const stripe = x % 4 === 0 || x % 4 === 3;
        c.fillStyle = stripe ? "#a8291f" : "#d1402f";
        c.fillRect(x, y, 1, 1);
      }
    }
    // white label band
    rect(c, 0, 6, S, 5, "#efefef");
    rect(c, 0, 6, S, 1, "#ffffff");
    rect(c, 0, 10, S, 1, "#c8c8c8");
    // "TNT" in 3x5 pixel letters
    const glyphs = {
      T: ["111", "010", "010", "010", "010"],
      N: ["101", "111", "111", "101", "101"],
    };
    const put = (g, ox) => {
      g.forEach((row, ry) => {
        [...row].forEach((ch, rx) => {
          if (ch === "1") rect(c, ox + rx, 6 + ry, 1, 1, "#1c1c1c");
        });
      });
    };
    put(glyphs.T, 1);
    put(glyphs.N, 6);
    put(glyphs.T, 11);
  });

  // Hidden TNT: the editor-only look. In play it isn't drawn at all, so this
  // just needs to read as "TNT, but sneaky" — a faded TNT in a dashed red box.
  const ghostOf = (tntSprite) => mk(S, S, (c) => {
    c.globalAlpha = 0.35;
    c.drawImage(tntSprite, 0, 0, S, S);
    c.globalAlpha = 1;
    for (let i = 0; i < S; i += 4) {
      rect(c, i, 0, 2, 1, "#ff3b3b");
      rect(c, i + 2, S - 1, 2, 1, "#ff3b3b");
      rect(c, 0, i + 2, 1, 2, "#ff3b3b");
      rect(c, S - 1, i, 1, 2, "#ff3b3b");
    }
  });
  const hiddenTnt = ghostOf(tnt);

  // Saving point, from the drawing: a framed block with tabs on each side and a
  // spiral in the middle. Grey until you reach it, then the spiral lights up.
  const savePoint = (frame, frameDark, core, swirl) => mk(S, S, (c) => {
    rect(c, 2, 1, 12, 14, frameDark);
    rect(c, 3, 2, 10, 12, frame);
    rect(c, 0, 4, 2, 8, frameDark); // side tabs
    rect(c, 14, 4, 2, 8, frameDark);
    rect(c, 0, 5, 1, 6, frame);
    rect(c, 15, 5, 1, 6, frame);
    rect(c, 4, 3, 8, 10, core);
    const spiral = [[7, 7], [8, 7], [8, 8], [7, 8], [6, 8], [6, 7], [6, 6], [7, 6],
      [8, 6], [9, 6], [9, 7], [9, 8], [9, 9], [8, 9], [7, 9], [6, 9], [5, 9],
      [5, 8], [5, 7], [5, 6], [5, 5], [6, 5], [7, 5], [8, 5], [9, 5], [10, 5],
      [10, 6], [10, 7], [10, 8], [10, 9], [10, 10]];
    spiral.forEach(([x, y]) => rect(c, x, y, 1, 1, swirl));
  });
  const checkpoint = savePoint("#9a9a9a", "#5e5e5e", "#3a3a3a", "#8c8c8c");
  const checkpointOn = savePoint("#9a9a9a", "#5e5e5e", "#2a1745", "#c58bff");

  // Wings, from the drawing: two long wing shapes. The pickup adds a firework
  // rocket between them; "wingsWorn" is the bare pair drawn on the player.
  const paintWings = (c) => {
    const left = [[2, 5, 6], [3, 4, 6], [4, 3, 6], [5, 3, 6], [6, 2, 6], [7, 2, 6],
      [8, 2, 5], [9, 1, 5], [10, 1, 4], [11, 1, 4], [12, 1, 3], [13, 2, 3]];
    left.forEach(([y, x0, x1]) => {
      rect(c, x0, y, x1 - x0 + 1, 1, "#9d93c4");
      rect(c, S - 1 - x1, y, x1 - x0 + 1, 1, "#9d93c4");
    });
    [[3, 6], [5, 5], [7, 4], [9, 3], [11, 2]].forEach(([y, x]) => {
      rect(c, x, y, 1, 1, "#6c6394"); // feather lines
      rect(c, S - 1 - x, y, 1, 1, "#6c6394");
    });
    rect(c, 6, 2, 1, 2, "#e2dcf2");
    rect(c, 9, 2, 1, 2, "#e2dcf2");
  };
  const wingsWorn = mk(S, S, paintWings);
  const wings = mk(S, S, (c) => {
    paintWings(c);
    rect(c, 7, 6, 2, 6, "#d1402f"); // firework rocket
    rect(c, 7, 6, 1, 6, "#ef6b5b");
    rect(c, 7, 5, 2, 1, "#efefef");
    rect(c, 7, 12, 2, 1, "#c8c8c8");
    rect(c, 7, 13, 1, 2, "#ffd54a"); // fuse spark
    rect(c, 8, 14, 1, 1, "#ff8a3d");
  });

  const diamond = mk(S, S, (c) => {
    const gem = [];
    for (let y = 2; y <= 13; y++) {
      const dy = Math.abs(y - 7.5);
      const half = Math.round(6 - dy * 0.78);
      if (half > 0) gem.push([y, 8 - half, 7 + half]);
    }
    spans(c, gem, "#3ad0c8");
    // dark outline
    for (const [y, x0, x1] of gem) {
      rect(c, x0, y, 1, 1, "#1a8f8a");
      rect(c, x1, y, 1, 1, "#1a8f8a");
    }
    spans(c, [[3, 6, 9], [4, 5, 8], [5, 5, 7]], "#8ff5ee");
    rect(c, 6, 3, 2, 1, "#ffffff");
    spans(c, [[11, 5, 10], [12, 6, 9]], "#22a8a2");
  });

  const bolt = mk(S, S, (c) => {
    const shape = [
      [1, 9, 13], [2, 8, 12], [3, 7, 11], [4, 6, 10], [5, 5, 9],
      [6, 4, 12], [7, 3, 11],
      [8, 7, 11], [9, 6, 10], [10, 5, 9], [11, 4, 8],
      [12, 3, 7], [13, 3, 6], [14, 2, 5],
    ];
    spans(c, shape, "#ffc107");
    // bright core + shadowed lower edge
    spans(c, [[2, 9, 11], [3, 8, 10], [4, 7, 9], [5, 6, 8], [6, 6, 10]], "#ffe98a");
    spans(c, [[7, 3, 5], [12, 3, 5], [13, 3, 5], [14, 2, 4]], "#e08e0b");
  });

  const rose = mk(S, S, (c) => {
    rect(c, 7, 7, 2, 9, "#2f3a2a");            // stem
    rect(c, 4, 10, 3, 1, "#3d5233");           // leaves
    rect(c, 9, 12, 3, 1, "#3d5233");
    spans(c, [[2, 6, 9], [3, 5, 10], [4, 4, 11], [5, 4, 11], [6, 5, 10], [7, 6, 9]], "#191919");
    spans(c, [[3, 6, 7], [4, 5, 6]], "#333333"); // faint petal shading
    rect(c, 7, 4, 2, 2, "#5b5b5b");              // wilted centre
    rect(c, 6, 8, 1, 1, "#3a3a3a");
  });

  const portal = mk(S, S, (c) => {
    noiseFill(c, 31, ["#3f3a55", "#4a4463", "#332f47", "#565073"]); // obsidian frame
    rect(c, 2, 1, 12, 14, "#5b1f96");
    for (let y = 1; y < 15; y++) {
      for (let x = 2; x < 14; x++) {
        const r = nz(x, y, 41);
        c.fillStyle = r < 0.3 ? "#6d28ad" : r < 0.7 ? "#7b2fbe" : "#8b3ed1";
        c.fillRect(x, y, 1, 1);
      }
    }
    // swirl
    for (let t = 0; t < 30; t++) {
      const a = t * 0.5;
      const r = 0.7 + t * 0.16;
      const sx = Math.round(8 + Math.cos(a) * r);
      const sy = Math.round(8 + Math.sin(a) * r);
      if (sx >= 2 && sx < 14 && sy >= 1 && sy < 15) rect(c, sx, sy, 1, 1, "#c58bff");
    }
  });

  const bush = mk(S, S, (c) => {
    const shape = [
      [4, 6, 9], [5, 4, 11], [6, 3, 12], [7, 2, 13],
      [8, 2, 13], [9, 1, 14], [10, 1, 14], [11, 2, 13],
      [12, 3, 12], [13, 4, 11], [14, 5, 10],
    ];
    spans(c, shape, "#4a8b2c");
    for (const [y, x0, x1] of shape) {
      for (let x = x0; x <= x1; x++) {
        const r = nz(x, y, 53);
        if (r < 0.3) rect(c, x, y, 1, 1, "#3c7023");
        else if (r > 0.78) rect(c, x, y, 1, 1, "#63ab3c");
      }
    }
  });

  const cloud = mk(S, S, (c) => {
    spans(c, [[4, 5, 10], [5, 3, 12], [6, 2, 13], [7, 1, 14], [8, 1, 14], [9, 2, 13]], "#dbe9f7");
    spans(c, [[5, 5, 9], [6, 3, 11], [7, 2, 12]], "#ffffff");
    spans(c, [[9, 3, 12], [8, 10, 14]], "#c3d6ea");
  });

  const explosion1 = mk(S, S, (c) => {
    spans(c, [[5, 6, 9], [6, 5, 10], [7, 4, 11], [8, 4, 11], [9, 5, 10], [10, 6, 9]], "#ffffff");
    for (const [y, x0, x1] of [[3, 6, 9], [4, 4, 11], [5, 3, 12], [6, 2, 13],
      [7, 2, 13], [8, 2, 13], [9, 3, 12], [10, 4, 11], [11, 5, 10], [12, 6, 9]]) {
      for (let x = x0; x <= x1; x++) {
        const d = Math.hypot(x - 7.5, y - 7.5);
        if (d < 2.6) continue;
        c.fillStyle = d < 4 ? "#ff9800" : "#e5401f";
        c.fillRect(x, y, 1, 1);
      }
    }
    for (const [x, y] of [[1, 4], [2, 12], [13, 3], [14, 10], [5, 1], [10, 14], [0, 8], [15, 6]]) {
      rect(c, x, y, 1, 1, nz(x, y, 61) < 0.5 ? "#4a4a4a" : "#8a8a8a");
    }
  });

  const explosion2 = mk(S, S, (c) => {
    for (const [y, x0, x1] of [[4, 5, 10], [5, 3, 12], [6, 2, 13], [7, 2, 13],
      [8, 3, 12], [9, 4, 11], [10, 5, 10]]) {
      for (let x = x0; x <= x1; x++) {
        const r = nz(x, y, 71);
        if (r < 0.28) continue;
        c.fillStyle = r < 0.5 ? "#6f6f6f" : r < 0.8 ? "#9a9a9a" : "#c4c4c4";
        c.fillRect(x, y, 1, 1);
      }
    }
    for (const [x, y] of [[7, 11], [8, 11], [6, 12], [9, 12]]) rect(c, x, y, 1, 1, "#ff9800");
    for (const [x, y] of [[1, 3], [14, 5], [3, 14], [12, 14], [0, 9], [15, 2]]) {
      rect(c, x, y, 1, 1, "#ff9d2e");
    }
  });

  const spawnMark = mk(S, S, (c) => {
    c.fillStyle = "rgba(124, 199, 255, 0.16)";
    c.fillRect(0, 0, S, S);
    spans(c, [[4, 6, 6], [5, 6, 7], [6, 6, 8], [7, 6, 9], [8, 6, 9],
      [9, 6, 8], [10, 6, 7], [11, 6, 6]], "#7cc7ff");
  });

  // ---------- player ----------

  // The armoured knight, from the drawing this game is based on: lavender plate,
  // big blue eyes behind the helmet, orange straps crossed over the chest, gold
  // trim on the gauntlets and greaves. 16 wide x 21 tall, pauldrons out past the
  // shoulders.
  const PLAYER_LEGEND = {
    O: "#453f5a", // dark seam / outline
    A: "#e2dcf2", // plate, lit
    a: "#b9b0d8", // plate
    s: "#7d74a0", // plate, shaded — doubles as the outline against the sky
    E: "#2f9dc0", // eye
    e: "#6fd3ea", // eye glint
    X: "#ef8c3c", // strap
    x: "#c4661f", // strap, shaded
    G: "#ddbe46", // gold trim
    g: "#ab8a20", // gold trim, shaded
    B: "#4a4360", // boot
  };

  const PLAYER_MAP = [
    "...sAAAAAAAAs...",
    "...sAAAAAAAAs...",
    "...saAAAAAAas...",
    "...saEEaaEEas...",
    "...saEeaaeEas...",
    "...saaaaaaaas...",
    "...saasssaaas...",
    "...ssaaaaaass...",
    "...OOsaaaasOO...",
    "sAAsaaGGGGaasAAs",
    "sAAsXXaaaaXXsAAs",
    "sAAsaXXaaXXasAAs",
    "xXXsaaXXXXaasXXx",
    "xXXsaXXaaXXasXXx",
    "gGGsXXaaaaXXsGGg",
    "gGGsXXXXXXXXsGGg",
    "...saaaaaaaas...",
    "...saGaOOaGas...",
    "...saGaOOaGas...",
    "...sXXXOOXXXs...",
    "...sBBBOOBBBs...",
  ];

  const player = paintMap(PLAYER_MAP, PLAYER_LEGEND);

  // ---------- sprite registry ----------
  // Every drawable is looked up here, so any of it can be swapped for a PNG.

  const SPRITES = {
    g: grass,
    dirt: dirt,
    s: stone,
    m: slime,
    t: tnt,
    h: hiddenTnt,
    C: checkpoint,
    checkpointOn: checkpointOn,
    f: wings,
    n: netherrack,
    k: netherBricks,
    L: lava,
    U: lavaUp,
    D: lavaDown,
    F: fire,
    S: shooter,
    bullet: bullet,
    Z: spawner,
    e: endStone,
    I: blink,
    W: watcher,
    Y: staringWatcher,
    watcherClosed: watcherClosed,
    T: endTnt,
    o: eyeOfEnder,
    V: endWatcher,
    Q: corruptedWatcher,
    N: shortEnderman,
    blaze: blaze,
    r: blazeRod,
    fireball: fireball,
    wingsWorn: wingsWorn,
    d: diamond,
    b: bolt,
    w: rose,
    E: portal,
    B: bush,
    P: spawnMark,
    cloud: cloud,
    player: player,
    explosion1: explosion1,
    explosion2: explosion2,
  };

  // Editor-facing list: which sprites can be repainted, and what to call them.
  const SPRITE_INFO = [
    { key: "player", label: "Player" },
    { key: "g", label: "Grass" },
    { key: "dirt", label: "Dirt" },
    { key: "s", label: "Stone" },
    { key: "m", label: "Slime" },
    { key: "t", label: "TNT" },
    { key: "h", label: "Hidden TNT" },
    { key: "C", label: "Checkpoint" },
    { key: "checkpointOn", label: "Checkpoint ✓" },
    { key: "d", label: "Diamond" },
    { key: "b", label: "Lightning" },
    { key: "w", label: "Rose" },
    { key: "f", label: "Wings" },
    { key: "n", label: "Netherrack" },
    { key: "k", label: "Nether bricks" },
    { key: "L", label: "Lava" },
    { key: "U", label: "Rising lava" },
    { key: "D", label: "Falling lava" },
    { key: "F", label: "Fire" },
    { key: "S", label: "Shooter" },
    { key: "bullet", label: "Star bullet" },
    { key: "Z", label: "Spawner" },
    { key: "e", label: "End stone" },
    { key: "I", label: "Blink" },
    { key: "W", label: "Watcher" },
    { key: "watcherClosed", label: "Watcher (eye shut)" },
    { key: "Y", label: "Staring watcher" },
    { key: "T", label: "End TNT" },
    { key: "o", label: "Eye of ender" },
    { key: "V", label: "End watcher" },
    { key: "Q", label: "Corrupted end watcher" },
    { key: "N", label: "Short-legged enderman" },
    { key: "blaze", label: "Blaze" },
    { key: "r", label: "Blaze rod" },
    { key: "fireball", label: "Fireball" },
    { key: "wingsWorn", label: "Wings (worn)" },
    { key: "E", label: "Portal" },
    { key: "B", label: "Bush" },
    { key: "P", label: "Start" },
    { key: "cloud", label: "Cloud" },
    { key: "explosion1", label: "Boom 1" },
    { key: "explosion2", label: "Boom 2" },
  ];

  // The built-in look, kept aside so "reset" can always get back to it.
  const ORIGINALS = Object.assign({}, SPRITES);

  const registerSprite = (key, source) => {
    if (source) SPRITES[key] = source;
  };

  // Load replacement art: BDArt.loadSprites({ g: "art/grass.png", ... })
  // Any image that fails to load simply leaves the built-in sprite in place.
  const loadSprites = (map) =>
    Promise.all(
      Object.entries(map).map(([key, url]) =>
        new Promise((resolve) => {
          const img = new Image();
          img.onload = () => { registerSprite(key, img); resolve(key); };
          img.onerror = () => resolve(null);
          img.src = url;
        }),
      ),
    );

  // ---------- repainting sprites (the Art Studio) ----------
  //
  // A sprite's pixels round-trip through a plain object so they can be edited,
  // saved and shared:  { w, h, px: ["#rrggbb" | null, ...] }  row by row, with
  // null meaning "see-through". Custom art lives in localStorage, so anything
  // painted here shows up everywhere the game draws.

  const ART_KEY = "blockdash_art_v1";
  const HEX = /^#[0-9a-fA-F]{6}$/;

  const sizeOf = (sp) => ({
    w: sp.width || sp.naturalWidth,
    h: sp.height || sp.naturalHeight,
  });

  const asCanvas = (sp) => {
    if (sp instanceof HTMLCanvasElement) return sp;
    const { w, h } = sizeOf(sp);
    return mk(w, h, (c) => {
      c.imageSmoothingEnabled = false;
      c.drawImage(sp, 0, 0);
    });
  };

  // Read a sprite back out as editable pixels. Nearly-transparent pixels come
  // back as null, so faint overlays (the Start marker) read as see-through.
  const getPixels = (key) => {
    const sp = SPRITES[key];
    if (!sp) return null;
    const cv = asCanvas(sp);
    const { w, h } = sizeOf(cv);
    const d = cv.getContext("2d").getImageData(0, 0, w, h).data;
    const px = [];
    for (let i = 0; i < w * h; i++) {
      px.push(d[i * 4 + 3] < 128
        ? null
        : "#" + [0, 1, 2].map((k) => d[i * 4 + k].toString(16).padStart(2, "0")).join(""));
    }
    return { w, h, px };
  };

  const cleanPixels = (o) => {
    if (!o || typeof o !== "object") return null;
    const w = o.w | 0;
    const h = o.h | 0;
    if (w < 1 || h < 1 || w > 64 || h > 64) return null;
    if (!Array.isArray(o.px)) return null;
    // px is flat, but older art files nested it one array per row
    let px = o.px;
    if (px.length === h && Array.isArray(px[0])) px = [].concat.apply([], px);
    if (px.length !== w * h) return null;
    return {
      w,
      h,
      px: px.map((p) => (typeof p === "string" && HEX.test(p) ? p.toLowerCase() : null)),
    };
  };

  const bake = ({ w, h, px }) =>
    mk(w, h, (c) => {
      for (let i = 0; i < px.length; i++) {
        if (!px[i]) continue;
        c.fillStyle = px[i];
        c.fillRect(i % w, (i / w) | 0, 1, 1);
      }
    });

  const readStore = () => {
    try {
      const o = JSON.parse(localStorage.getItem(ART_KEY) || "{}");
      return o && typeof o === "object" ? o : {};
    } catch (e) {
      return {};
    }
  };

  const writeStore = (obj) => {
    try {
      if (Object.keys(obj).length) localStorage.setItem(ART_KEY, JSON.stringify(obj));
      else localStorage.removeItem(ART_KEY);
      return true;
    } catch (e) {
      return false;
    }
  };

  // Apply a whole set of repainted sprites at once. Unknown keys and malformed
  // entries are skipped, so a hand-edited art file can never break the game.
  const applyPack = (pack, persist) => {
    const good = {};
    for (const [key, data] of Object.entries(pack || {})) {
      if (!(key in ORIGINALS)) continue;
      const clean = cleanPixels(data);
      if (!clean) continue;
      SPRITES[key] = bake(clean);
      good[key] = clean;
    }
    const keys = Object.keys(good);
    if (persist && keys.length) writeStore(Object.assign(readStore(), good));
    syncHidden();
    return keys;
  };

  // Hidden TNT is a faded copy of whatever TNT looks like right now, so a
  // repainted TNT carries over — unless Hidden TNT was repainted on its own.
  const syncHidden = () => {
    if ("h" in (window.BDArtPack || {}) || "h" in readStore()) return;
    SPRITES.h = ghostOf(SPRITES.t);
  };

  const setPixels = (key, data) => applyPack({ [key]: data }, true).length > 0;

  const resetSprite = (key) => {
    if (!(key in ORIGINALS)) return;
    SPRITES[key] = ORIGINALS[key];
    const store = readStore();
    delete store[key];
    writeStore(store);
    syncHidden();
  };

  const resetAllSprites = () => {
    Object.assign(SPRITES, ORIGINALS);
    writeStore({});
    syncHidden();
  };

  const customArt = () => readStore();
  const isCustom = (key) => key in readStore();

  // Art shipped with the game (docs/blockdash-artpack.js) loads first; anything
  // painted in this browser wins over it. Once the pack has been applied it
  // becomes the baseline, so "reset" goes back to the art the game ships with
  // rather than to whatever the code drew before the pack existed.
  applyPack(window.BDArtPack || {}, false);
  Object.assign(ORIGINALS, SPRITES);
  applyPack(readStore(), false);

  const blit = (ctx, sprite, x, y, w, h) => {
    if (!sprite) return;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(sprite, Math.round(x), Math.round(y), Math.ceil(w), Math.ceil(h));
  };

  // covered = something solid sits directly above, so grass shows as plain dirt
  const drawTile = (ctx, ch, x, y, size, time, covered) => {
    if (ch === "g" && covered) return blit(ctx, SPRITES.dirt, x, y, size, size);
    const sp = SPRITES[ch];
    if (!sp) return;
    const sw = sp.width || sp.naturalWidth, sh = sp.height || sp.naturalHeight;
    if (sh > sw) {
      const w = size * sw / sh;
      return blit(ctx, sp, x + (size - w) / 2, y, w, size);
    }
    if (ch === "m") {
      // slime squishes gently
      const wob = (Math.sin(time * 4 + x * 0.03) * 0.04 + 0.04) * size;
      return blit(ctx, sp, x, y + wob, size, size - wob);
    }
    if (ch === "d" || ch === "r" || ch === "o") {
      const bob = Math.sin(time * 3 + x * 0.05) * size * 0.08;
      return blit(ctx, sp, x, y + bob, size, size);
    }
    if (ch === "b") {
      const pulse = 0.55 + 0.45 * Math.sin(time * 8);
      ctx.save();
      ctx.globalAlpha = 0.25 * pulse;
      ctx.fillStyle = "#ffe98a";
      ctx.fillRect(x, y, size, size);
      ctx.restore();
      return blit(ctx, sp, x, y, size, size);
    }
    if (ch === "L" || ch === "U" || ch === "D") {
      blit(ctx, sp, x, y, size, size);
      ctx.save();
      ctx.globalAlpha = 0.12 + 0.1 * Math.sin(time * 3 + x * 0.05);
      ctx.fillStyle = "#fff0a0";
      ctx.fillRect(x, y, size, size);
      ctx.restore();
      return;
    }
    if (ch === "F") {
      // flicker: the flames stretch and shrink a little
      const h = size * (0.88 + 0.12 * Math.sin(time * 14 + x * 0.3));
      return blit(ctx, sp, x, y + size - h, size, h);
    }
    if (ch === "E") {
      blit(ctx, sp, x, y, size, size);
      // a few sparkles drifting out of the portal
      ctx.fillStyle = "#dcb6ff";
      for (let i = 0; i < 4; i++) {
        const t = time * 1.2 + i * 1.7;
        const sx = x + size * (0.25 + 0.5 * ((Math.sin(t * 1.3 + i) + 1) / 2));
        const sy = y + size * (1 - ((t * 0.35 + i * 0.25) % 1));
        ctx.fillRect(sx, sy, size * 0.07, size * 0.07);
      }
      return;
    }
    blit(ctx, sp, x, y, size, size);
  };

  const drawPlayer = (ctx, x, y, w, h, rot) => {
    ctx.save();
    ctx.translate(x + w / 2, y + h / 2);
    ctx.rotate(rot);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(SPRITES.player, -w / 2, -h / 2, w, h);
    ctx.restore();
  };

  const drawExplosion = (ctx, cx, cy, size, t) => {
    const frame = t < 0.18 || (t >= 0.36 && t < 0.54)
      ? SPRITES.explosion1
      : SPRITES.explosion2;
    const s = size * (1 + t * 1.2);
    ctx.save();
    ctx.globalAlpha = Math.max(0, 1 - t / 0.85);
    blit(ctx, frame, cx - s / 2, cy - s / 2, s, s);
    ctx.restore();
  };

  // draw any sprite at an exact size (the two-block-tall creatures)
  const drawSprite = (ctx, key, x, y, w, h) => blit(ctx, SPRITES[key], x, y, w, h);

  const drawCloud = (ctx, x, y, size) => blit(ctx, SPRITES.cloud, x, y, size, size);

  // ---- level backgrounds ----
  // Everything is drawn with plain rectangles so it keeps the blocky look.
  // `scroll` is how far the camera has moved in px; far layers move slower.
  const BACKGROUNDS = [
    { key: "overworld", label: "🌳 Overworld" },
    { key: "nether", label: "🔥 Nether" },
    { key: "mooshroom", label: "🍄 Mooshroom realm" },
    { key: "end", label: "🌌 The End" },
    { key: "endStorage", label: "📦 End storage rooms" },
  ];

  const wrapX = (base, scroll, rate, span, pad) =>
    ((base - scroll * rate) % span + span) % span - pad;

  const skyGrad = (ctx, H, top, bottom) => {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, top);
    g.addColorStop(1, bottom);
    return g;
  };

  // a jagged band of blocks hanging from the top (dir 1) or rising from y0 (dir -1)
  const jagged = (ctx, W, y0, dir, scroll, rate, step, minH, varH, seed, color) => {
    ctx.fillStyle = color;
    const off = ((scroll * rate) % step + step) % step;
    const first = Math.floor((scroll * rate) / step);
    for (let i = -1; i * step < W + step; i++) {
      const n = first + i;
      const h = minH + (((n * 7919 + seed) % 97 + 97) % 97) / 97 * varH;
      const x = i * step - off;
      if (dir > 0) ctx.fillRect(x, y0, step + 1, h);
      else ctx.fillRect(x, y0 - h, step + 1, h + 400);
    }
  };

  const drawGhast = (ctx, x, y, s, t) => {
    const p = s / 8;
    ctx.fillStyle = "#f1eeee";
    ctx.fillRect(x, y, s, s);
    ctx.fillStyle = "#d9d4d4";
    ctx.fillRect(x, y + s - p, s, p);
    ctx.fillStyle = "#3a3a3a";
    ctx.fillRect(x + p * 1.5, y + p * 3, p * 1.5, p);
    ctx.fillRect(x + p * 5, y + p * 3, p * 1.5, p);
    ctx.fillRect(x + p * 3, y + p * 5.5, p * 2, p);
    ctx.fillStyle = "#e4dfdf";
    for (let k = 0; k < 4; k++) {
      const len = s * (0.45 + 0.25 * Math.sin(t * 2 + k * 1.7 + x * 0.01));
      ctx.fillRect(x + p * (0.8 + k * 1.9), y + s, p * 0.8, len);
    }
  };

  const drawMushroom = (ctx, x, groundY, h, capW, red) => {
    const stemW = capW * 0.22;
    ctx.fillStyle = red ? "#d9cdb8" : "#c9b89b";
    ctx.fillRect(x + (capW - stemW) / 2, groundY - h, stemW, h);
    const capH = red ? capW * 0.38 : capW * 0.16;
    ctx.fillStyle = red ? "#c22a22" : "#8b6a4a";
    ctx.fillRect(x, groundY - h - capH, capW, capH);
    if (red) {
      ctx.fillRect(x + capW * 0.12, groundY - h - capH * 1.4, capW * 0.76, capH * 0.5);
      ctx.fillStyle = "#f3eadf";
      const d = capW * 0.1;
      ctx.fillRect(x + capW * 0.18, groundY - h - capH * 0.75, d, d);
      ctx.fillRect(x + capW * 0.55, groundY - h - capH * 1.25, d, d);
      ctx.fillRect(x + capW * 0.75, groundY - h - capH * 0.6, d, d);
    }
  };

  // effect: null | "fast" | "slow" (lightning / wither rose tints)
  const drawBackground = (ctx, kind, W, H, scroll, ts, t, effect) => {
    const groundY = H - ts;
    if (kind === "nether") {
      ctx.fillStyle = skyGrad(ctx, H, "#1e0303", "#6a1a0e");
      ctx.fillRect(0, 0, W, H);
      // lava glow far below
      const glow = ctx.createLinearGradient(0, H * 0.45, 0, H);
      glow.addColorStop(0, "rgba(255, 110, 30, 0)");
      glow.addColorStop(1, "rgba(255, 110, 30, 0.3)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, H * 0.45, W, H);
      // distant netherrack ceiling and floor
      jagged(ctx, W, 0, 1, scroll, 0.15, 48, 18, 46, 3, "#3a0c0a");
      jagged(ctx, W, 0, 1, scroll, 0.3, 36, 6, 26, 11, "#561410");
      jagged(ctx, W, groundY + ts * 0.3, -1, scroll, 0.25, 44, 30, 80, 5, "#3e0e0b");
      jagged(ctx, W, groundY + ts * 0.3, -1, scroll, 0.5, 32, 10, 46, 17, "#5c1812");
      // ghasts drifting in the distance
      const span = W + 500;
      for (let i = 0; i < 4; i++) {
        const s = 26 + (i % 3) * 12;
        const x = wrapX(i * 410 + t * 9 * (i % 2 ? 1 : -1), scroll, 0.12, span, 120);
        const y = 70 + ((i * 97) % 120) + Math.sin(t * 0.8 + i) * 10;
        ctx.globalAlpha = 0.55 + (i % 3) * 0.12;
        drawGhast(ctx, x, y, s, t);
        ctx.globalAlpha = 1;
      }
      // floating embers
      ctx.fillStyle = "rgba(255, 170, 60, 0.7)";
      for (let i = 0; i < 18; i++) {
        const x = wrapX(i * 173, scroll, 0.4, W + 40, 20);
        const y = H - (((t * 18 + i * 61) % (H + 20)));
        ctx.fillRect(x, y, 3, 3);
      }
    } else if (kind === "endStorage") {
      // Like the Nether, but walled in by end stone: a smooth dark end-stone
      // backdrop, lighter jagged end stone above and below, no ghasts.
      ctx.fillStyle = skyGrad(ctx, H, "#1f1c17", "#48413a");
      ctx.fillRect(0, 0, W, H);
      jagged(ctx, W, 0, 1, scroll, 0.15, 48, 18, 46, 3, "#6e6c46");
      jagged(ctx, W, 0, 1, scroll, 0.3, 36, 6, 26, 11, "#8f8d5c");
      jagged(ctx, W, groundY + ts * 0.3, -1, scroll, 0.25, 44, 30, 80, 5, "#6a6843");
      jagged(ctx, W, groundY + ts * 0.3, -1, scroll, 0.5, 32, 10, 46, 17, "#949262");
      // faint purple dust drifting up
      ctx.fillStyle = "rgba(200, 140, 255, 0.55)";
      for (let i = 0; i < 14; i++) {
        const x = wrapX(i * 173, scroll, 0.4, W + 40, 20);
        const y = H - (((t * 12 + i * 61) % (H + 20)));
        ctx.fillRect(x, y, 3, 3);
      }
    } else if (kind === "end") {
      ctx.fillStyle = skyGrad(ctx, H, "#07040d", "#2a1640");
      ctx.fillRect(0, 0, W, H);
      // stars that twinkle
      for (let i = 0; i < 40; i++) {
        const x = wrapX(i * 97, scroll, 0.05, W + 20, 10);
        const y = (i * 53) % (H * 0.7);
        ctx.fillStyle = `rgba(230, 210, 255, ${0.3 + 0.3 * Math.sin(t * 2 + i)})`;
        ctx.fillRect(x, y, 2, 2);
      }
      // floating end-stone islands far away, and dark pillars nearer
      const ispan = W + 600;
      for (let i = 0; i < 4; i++) {
        const x = wrapX(i * 330, scroll, 0.15, ispan, 200);
        const y = 90 + ((i * 67) % 140) + Math.sin(t * 0.6 + i) * 5;
        const w = 90 + (i % 3) * 40;
        ctx.fillStyle = "rgba(200, 200, 140, 0.55)";
        ctx.fillRect(x, y, w, 12);
        ctx.fillRect(x + w * 0.15, y + 12, w * 0.7, 10);
        ctx.fillRect(x + w * 0.35, y + 22, w * 0.3, 10);
      }
      const pspan = W + 500;
      for (let i = 0; i < 5; i++) {
        const x = wrapX(i * 290, scroll, 0.4, pspan, 100);
        const h = 120 + ((i * 59) % 120);
        ctx.fillStyle = "rgba(20, 10, 30, 0.85)";
        ctx.fillRect(x, groundY - h, 46, h + ts);
        ctx.fillStyle = "rgba(180, 100, 255, 0.5)";
        ctx.fillRect(x + 17, groundY - h - 10, 12, 10);
      }
    } else if (kind === "mooshroom") {
      ctx.fillStyle = skyGrad(ctx, H, "#8f7bc4", "#f2cfe0");
      ctx.fillRect(0, 0, W, H);
      // a few pink clouds
      const span = W + 400;
      ctx.globalAlpha = 0.6;
      for (let i = 0; i < 5; i++) {
        const size = 100 + (i % 3) * 50;
        drawCloud(ctx, wrapX(i * 377, scroll, 0.2, span, 200), 20 + ((i * 71) % 90), size);
      }
      ctx.globalAlpha = 1;
      // giant mushrooms on far mycelium hills
      const mspan = W + 600;
      for (let i = 0; i < 6; i++) {
        const x = wrapX(i * 230, scroll, 0.35, mspan, 200);
        const h = 70 + ((i * 41) % 60);
        ctx.globalAlpha = 0.75;
        drawMushroom(ctx, x, groundY, h, 70 + (i % 3) * 20, i % 2 === 0);
        ctx.globalAlpha = 1;
      }
      jagged(ctx, W, groundY + ts * 0.3, -1, scroll, 0.5, 60, 14, 36, 9, "#7a6a80");
      // floating spores
      ctx.fillStyle = "rgba(255, 255, 255, 0.55)";
      for (let i = 0; i < 16; i++) {
        const x = wrapX(i * 149 + Math.sin(t + i) * 8, scroll, 0.45, W + 40, 20);
        const y = (((i * 83) - t * 6) % H + H) % H;
        ctx.fillRect(x, y, 2, 2);
      }
    } else {
      let top = "#4c9fe0", bottom = "#bfe7ff";
      if (effect === "fast") { top = "#e8a93a"; bottom = "#ffe6a8"; }
      else if (effect === "slow") { top = "#3a3a4a"; bottom = "#8f8fa5"; }
      ctx.fillStyle = skyGrad(ctx, H, top, bottom);
      ctx.fillRect(0, 0, W, H);
      const span = W + 400;
      for (let i = 0; i < 7; i++) {
        const size = 110 + (i % 3) * 55;
        drawCloud(ctx, wrapX(i * 337, scroll, 0.22, span, 200), 20 + ((i * 71) % 110), size);
      }
      const hspan = W + 520;
      for (let i = 0; i < 10; i++) {
        const x = wrapX(i * 260, scroll, 0.5, hspan, 260);
        const hgt = 40 + ((i * 53) % 70);
        ctx.fillStyle = "rgba(72, 116, 58, 0.45)";
        ctx.fillRect(x, groundY - hgt, 200, hgt + ts);
        ctx.fillStyle = "rgba(110, 170, 80, 0.45)";
        ctx.fillRect(x, groundY - hgt, 200, 10);
      }
      return;
    }
    if (effect) {
      ctx.fillStyle = effect === "fast" ? "rgba(255, 190, 60, 0.25)" : "rgba(40, 40, 60, 0.4)";
      ctx.fillRect(0, 0, W, H);
    }
  };

  const drawEraser = (ctx, x, y, s) => {
    ctx.fillStyle = "#15151c";
    ctx.fillRect(x, y, s, s);
    ctx.strokeStyle = "#ef6b6b";
    ctx.lineWidth = Math.max(2, s * 0.08);
    ctx.beginPath();
    ctx.moveTo(x + s * 0.25, y + s * 0.25);
    ctx.lineTo(x + s * 0.75, y + s * 0.75);
    ctx.moveTo(x + s * 0.75, y + s * 0.25);
    ctx.lineTo(x + s * 0.25, y + s * 0.75);
    ctx.stroke();
  };

  return {
    drawTile,
    drawPlayer,
    drawExplosion,
    drawCloud,
    drawEraser,
    drawBackground,
    BACKGROUNDS,
    drawSprite,
    registerSprite,
    loadSprites,
    SPRITES,
    SPRITE_INFO,
    getPixels,
    setPixels,
    applyPack,
    resetSprite,
    resetAllSprites,
    customArt,
    isCustom,
  };
})();
