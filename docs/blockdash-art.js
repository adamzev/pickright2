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
// Keys: block letters g s p A K O M m t h C d b w f n k L U D F S Z r e I W T o 9 H R V Q N E B P,
// G J, plus "boss", "dragon", "bullet", "blaze", "fireball", "watcherClosed",
// "checkpointOn", "frameOn", "wingsWorn", plus "dirt", "cloud", "player",
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

  // Ender pearl: a dark teal ball. One of these plus a blaze rod makes an eye.
  const enderPearl = mk(S, S, (c) => {
    spans(c, [[3, 6, 9], [4, 4, 11], [5, 3, 12], [6, 3, 12], [7, 3, 12], [8, 3, 12],
      [9, 3, 12], [10, 4, 11], [11, 4, 11], [12, 6, 9]], "#0f3d38");
    spans(c, [[4, 6, 9], [5, 4, 11], [6, 4, 11], [7, 4, 11], [8, 4, 11], [9, 4, 11],
      [10, 5, 10], [11, 6, 9]], "#1c6b60");
    spans(c, [[6, 6, 9], [7, 5, 10], [8, 5, 10], [9, 6, 9]], "#12514a");
    rect(c, 5, 5, 2, 2, "#8ff0dc");
    rect(c, 7, 5, 1, 1, "#4fc4ae");
  });

  const craftingTable = mk(S, S, (c) => {
    noiseFill(c, 51, ["#8a5a2b", "#7a4e24", "#95632f"]);
    rect(c, 0, 0, 16, 4, "#b9813f"); // the worktop
    rect(c, 0, 4, 16, 1, "#4a2f14");
    for (let i = 0; i < 16; i += 5) rect(c, i, 0, 1, 4, "#4a2f14"); // its 3x3 grid, seen edge-on
    rect(c, 0, 0, 16, 1, "#d9a55c");
    // tools hanging on the side: a saw and a hammer
    rect(c, 2, 7, 5, 2, "#c9c9c9");
    rect(c, 2, 9, 1, 4, "#5a3a1a");
    rect(c, 10, 7, 4, 2, "#8c8c8c");
    rect(c, 11, 9, 2, 5, "#5a3a1a");
  });

  // Portal frame: end stone with a green rim and an empty socket on top.
  // The filled one has an eye of ender sitting in the socket.
  const frameWith = (filled) => mk(S, S, (c) => {
    rect(c, 0, 5, 16, 11, "#dcd9a0");
    for (let y = 5; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const r = nz(x, y, 57);
        if (r < 0.25) rect(c, x, y, 1, 1, "#c9c58a");
        else if (r > 0.85) rect(c, x, y, 1, 1, "#ebe8b8");
      }
    }
    rect(c, 0, 4, 16, 3, "#2f7d63");
    rect(c, 0, 4, 16, 1, "#4fb08e");
    rect(c, 4, 4, 8, 3, "#123d31"); // the socket
    if (filled) {
      rect(c, 5, 1, 6, 5, "#1f6b5a");
      rect(c, 6, 0, 4, 7, "#1f6b5a");
      rect(c, 6, 1, 4, 5, "#7be0c2");
      rect(c, 7, 1, 2, 5, "#0e2a24");
      rect(c, 6, 1, 1, 1, "#c8fff0");
    }
  });
  const portalFrame = frameWith(false);
  const frameOn = frameWith(true);

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

  // ---- doors: two blocks tall, drawn from the kids' door sheets ----
  const DW = S, DH = S * 2;
  const doorFrame = (c, edge) => {
    rect(c, 0, 0, DW, 1, edge);
    rect(c, 0, DH - 1, DW, 1, edge);
    rect(c, 0, 0, 1, DH, edge);
    rect(c, DW - 1, 0, 1, DH, edge);
  };
  const windows4 = (c, glass, rim, top) => {
    for (const [x, y] of [[3, top], [9, top], [3, top + 6], [9, top + 6]]) {
      rect(c, x - 1, y - 1, 6, 6, rim);
      rect(c, x, y, 4, 4, glass);
      rect(c, x, y, 1, 1, "#ffffff");
    }
  };
  // plain wooden door with four windows
  const doorNormal = mk(DW, DH, (c) => {
    noiseFill(c, 71, ["#8f6034", "#9c6b3a", "#a87543"], DW, DH);
    for (let x = 4; x < DW; x += 4) rect(c, x, 0, 1, DH, "#7a5029");
    windows4(c, "#a8d8f0", "#6b4423", 4);
    rect(c, 12, 19, 2, 2, "#e8c34a");
    doorFrame(c, "#5a3a1c");
  });
  // crimson door with cracks running across it
  const doorNether = mk(DW, DH, (c) => {
    noiseFill(c, 72, ["#5e1a28", "#6b1f2e", "#7a2636"], DW, DH);
    for (let i = 0; i < 4; i++) {
      for (let y = 0; y < DH; y++) {
        const x = Math.round(i * 5 - 4 + y * 0.45 + Math.sin(y * 0.9 + i) * 0.8);
        if (x >= 0 && x < DW) rect(c, x, y, 1, 1, "#2e0a12");
      }
    }
    windows4(c, "#e8742a", "#3a0d16", 5);
    doorFrame(c, "#2e0a12");
  });
  // end-stone door: a purple gem in the middle with lines running out of it
  const doorEnd = mk(DW, DH, (c) => {
    noiseFill(c, 73, ["#dcd79a", "#e8e4a8", "#f0edc0"], DW, DH);
    const cx = 8, cy = 13;
    for (const [dx, dy] of [[-8, -13], [8, -13], [-8, 4], [8, 18], [-3, 18], [3, 18]]) {
      for (let t = 0; t <= 1; t += 0.04) rect(c, Math.round(cx + dx * t), Math.round(cy + dy * t), 1, 1, "#a8a070");
    }
    spans(c, [[9, 7, 8], [10, 6, 9], [11, 5, 10], [12, 4, 11], [13, 4, 11], [14, 5, 10], [15, 6, 9], [16, 7, 8]], "#8a4fbf");
    spans(c, [[11, 6, 7], [12, 5, 6]], "#c79bf0");
    doorFrame(c, "#a8a070");
  });
  // mushroom door: a big window, with a little mushroom growing off the top
  const doorMushroom = mk(DW, DH, (c) => {
    noiseFill(c, 74, ["#b8a888", "#c8b89a", "#d4c6aa"], DW, DH);
    rect(c, 2, 6, 12, 10, "#7a6a50");
    rect(c, 3, 7, 10, 8, "#a8d8f0");
    for (let i = 0; i < 4; i++) rect(c, 9 + i - 2, 8 + i, 1, 1, "#ffffff");
    rect(c, 12, 18, 2, 2, "#5a4a30");
    doorFrame(c, "#7a6a50");
    // the mushroom sits on the top edge
    rect(c, 12, 2, 1, 2, "#efe6d0");
    spans(c, [[0, 11, 13], [1, 10, 14]], "#c8352a");
    rect(c, 11, 0, 1, 1, "#ffffff");
    rect(c, 13, 1, 1, 1, "#ffffff");
  });
  // metal door made of plates that slide away when it opens
  const doorMech = mk(DW, DH, (c) => {
    rect(c, 0, 0, DW, DH, "#5c6068");
    const plates = [[1, 1, 6, 30], [8, 1, 7, 6], [8, 8, 7, 6], [8, 16, 7, 6], [8, 24, 7, 7]];
    for (const [x, y, w, h] of plates) {
      rect(c, x, y, w, h, "#9aa0a8");
      rect(c, x, y, w, 1, "#c4c9d0");
      rect(c, x, y + h - 1, w, 1, "#6c7078");
      rect(c, x + 1, y + 1, 1, 1, "#4a4e56");
      rect(c, x + w - 2, y + h - 2, 1, 1, "#4a4e56");
    }
    doorFrame(c, "#3a3d44");
  });
  // the upgraded door: striped iron with a lock in the middle. Needs a key.
  const doorLocked = mk(DW, DH, (c) => {
    noiseFill(c, 75, ["#a8aeb8", "#b8bec8", "#c4cad4"], DW, DH);
    for (let i = -4; i < 10; i++) {
      for (let y = 0; y < DH; y++) {
        const x = Math.round(i * 4 + y * 0.6);
        if (x >= 0 && x < DW) rect(c, x, y, 2, 1, "#2a2c32");
      }
    }
    rect(c, 0, 12, DW, 1, "#2a2c32");
    rect(c, 0, 16, DW, 1, "#2a2c32");
    rect(c, 4, 10, 8, 9, "#2a2c32");
    rect(c, 5, 11, 6, 7, "#e8c34a");
    rect(c, 7, 13, 2, 2, "#2a2c32");
    rect(c, 7, 15, 2, 2, "#2a2c32");
    doorFrame(c, "#2a2c32");
  });
  const keyItem = paintMap([
    "................",
    "................",
    "....yyyy........",
    "...yYYYYy.......",
    "..yY....Yy......",
    "..yY....Yy......",
    "..yY....Yy......",
    "...yYYYYyyyyyyy.",
    "....yyyyYYYYYYy.",
    "..........yYy.y.",
    "..........yYy.y.",
    "...........y....",
    "................",
    "................",
    "................",
    "................",
  ], { y: "#a87a12", Y: "#ffd54a" });

  // ---- glitchy blocks: The Glitch got into the stone and the iron ----
  const GLITCH_PAINT = { m: "#ff2bd6", c: "#21e6ff", k: "#111111" };
  const glitchStone = paintMap([
    "ssssssdssssslsss",
    "slssssssdssssssd",
    "sssdsslsssssdsss",
    "ssssssssssslssss",
    "mmmmssssdssssccc",
    "sssmmmmsssssccss",
    "dssssssslssssssl",
    "sssslsssssdsssss",
    "ssdssssssssssdss",
    "kkkkkkssssssssss",
    "sssssscccccsssss",
    "slssssssssssmmls",
    "sssdssslssssssss",
    "ssssssssssdsssss",
    "sdsssslssssssssd",
    "ssssssssssslssss",
  ], { s: "#8c8c8c", d: "#6b6b6b", l: "#a8a8a8", ...GLITCH_PAINT });
  const glitchIron = paintMap([
    "dddddddddddddddd",
    "dIIIIIIIIIIIIIId",
    "dIoIIIIIIIIIIoId",
    "dIIIIIIIIIIIIIId",
    "dIIiiiiiiiiiiIId",
    "dIIiIIIIIIIIiIId",
    "mmmmmmIIIIIIiIId",
    "dIIiIIIIccccccId",
    "dIIiIIIIIIIIiIId",
    "dIIiIIIIIIIIiIId",
    "dIIiiiiiiiiiiIId",
    "dIIIIIIIIIIImmmd",
    "dIIIIIIIIIIIIIId",
    "dIoIIIIIIIIIIoId",
    "dIIIIIIIIIIIIIId",
    "dddddddddddddddd",
  ], { d: "#6f7078", I: "#d6d8de", i: "#a9acb5", o: "#4a4c55", ...GLITCH_PAINT });

  const iron = paintMap([
    "dddddddddddddddd",
    "dIIIIIIIIIIIIIId",
    "dIoIIIIIIIIIIoId",
    "dIIIIIIIIIIIIIId",
    "dIIiiiiiiiiiiIId",
    "dIIiIIIIIIIIiIId",
    "dIIiIIIIIIIIiIId",
    "dIIiIIIIIIIIiIId",
    "dIIiIIIIIIIIiIId",
    "dIIiIIIIIIIIiIId",
    "dIIiiiiiiiiiiIId",
    "dIIIIIIIIIIIIIId",
    "dIIIIIIIIIIIIIId",
    "dIoIIIIIIIIIIoId",
    "dIIIIIIIIIIIIIId",
    "dddddddddddddddd",
  ], { d: "#6f7078", I: "#d6d8de", i: "#a9acb5", o: "#4a4c55" });

  // the fake crash block's look in the Level Maker (it's invisible in play)
  const fakeCrash = paintMap([
    "kkkkkkkkkkkkkkkk",
    "kggggggggggggggk",
    "kggggggggggggggk",
    "kgggkggggggkgggk",
    "kgggkggggggkgggk",
    "kgggkggggggkgggk",
    "kggggggggggggggk",
    "kggggggggggggggk",
    "kggggggggggggggk",
    "kgggggkkkkgggggk",
    "kggggkggggkggggk",
    "kgggkggggggkgggk",
    "kggggggggggggggk",
    "kggggggggggggggk",
    "kggggggggggggggk",
    "kkkkkkkkkkkkkkkk",
  ], { k: "#3a3a44", g: "#d9d9de" });

  // the Galactic Monstrosity's ender bullet: a purple block with a tail
  const enderBullet = paintMap([
    "................",
    "................",
    "................",
    "................",
    "....PPPP........",
    "...PppppP.......",
    "...PpwppPttttt..",
    "...PppppPttttttt",
    "...PppppPttttt..",
    "...PppppP.......",
    "....PPPP........",
    "................",
    "................",
    "................",
    "................",
    "................",
  ], { P: "#2a1240", p: "#7a2fd0", w: "#f4f0ff", t: "#b46bff" });

  const water = paintMap([
    "bbbbbbbbbbbbbbbb",
    "bbbbbbbbbbbbbbbb",
    "bbwwwbbbbbbbbbbb",
    "bbbbbwwbbbbbbbbb",
    "bbbbbbbbbbbwwwbb",
    "bbbbbbbbbbbbbbww",
    "bbbbbbbbbbbbbbbb",
    "bBBbbbbbbbbbbbbb",
    "bbbBBbbbbbwwwbbb",
    "bbbbbbbbbbbbbwwb",
    "bbbbbbbbbbbbbbbb",
    "bbbbbbwwwbbbbbbb",
    "bbbbbbbbbwwbbbbb",
    "bbbbbbbbbbbbbbBB",
    "bBBbbbbbbbbbbbbb",
    "bbbBBbbbbbbbbbbb",
  ], { b: "#2f6fd6", B: "#2559b4", w: "#8cc4ff" });

  // ---- money: emerald, gold and megatite pickups, and the shop's goods ----

  const emerald = mk(S, S, (c) => {
    const gem = [[2, 6, 9], [3, 5, 10], [4, 4, 11], [5, 4, 11], [6, 4, 11], [7, 4, 11], [8, 4, 11],
      [9, 4, 11], [10, 4, 11], [11, 4, 11], [12, 5, 10], [13, 6, 9]];
    spans(c, gem, "#1fae4b");
    for (const [y, x0, x1] of gem) {
      rect(c, x0, y, 1, 1, "#0f6e2c");
      rect(c, x1, y, 1, 1, "#0f6e2c");
    }
    rect(c, 6, 2, 4, 1, "#0f6e2c");
    rect(c, 6, 13, 4, 1, "#0f6e2c");
    rect(c, 6, 4, 4, 8, "#3fd66e");
    rect(c, 6, 4, 2, 3, "#b4ffc9");
    rect(c, 9, 10, 1, 2, "#168a3a");
  });

  const goldBar = mk(S, S, (c) => {
    spans(c, [[5, 4, 13], [6, 3, 13], [7, 2, 13], [8, 2, 13], [9, 2, 12], [10, 2, 11]], "#f0b61f");
    spans(c, [[5, 4, 13], [6, 3, 4]], "#ffe98a");
    spans(c, [[10, 2, 11], [9, 12, 12], [8, 13, 13]], "#b8780f");
    rect(c, 5, 7, 5, 1, "#ffd54a");
    rect(c, 12, 4, 1, 1, "#ffffff");
  });

  // Megatite: a made-up ore. A chunky magenta-and-gold crystal with a star in it.
  const megatite = mk(S, S, (c) => {
    const gem = [[1, 7, 8], [2, 6, 9], [3, 5, 10], [4, 3, 12], [5, 2, 13], [6, 2, 13], [7, 3, 12],
      [8, 3, 12], [9, 4, 11], [10, 4, 11], [11, 5, 10], [12, 6, 9], [13, 7, 8]];
    spans(c, gem, "#c22fd0");
    for (const [y, x0, x1] of gem) {
      rect(c, x0, y, 1, 1, "#6b1478");
      rect(c, x1, y, 1, 1, "#6b1478");
    }
    spans(c, [[3, 6, 8], [4, 5, 8], [5, 4, 7], [6, 4, 6]], "#f08bff");
    rect(c, 7, 6, 2, 4, "#ffd54a");
    rect(c, 6, 7, 4, 2, "#ffd54a");
    rect(c, 7, 7, 2, 2, "#ffffff");
    spans(c, [[10, 6, 10], [11, 6, 9]], "#8f1f9c");
  });

  // Mega blocks: bought in the megacoin shop. Same idea as the normal block,
  // dressed up in megatite purple and gold.
  const megaTnt = mk(S, S, (c) => {
    noiseFill(c, 23, ["#b8860f", "#d9a520", "#f0c040"]);
    for (let y = 2; y < 14; y++) {
      for (let x = 0; x < S; x++) {
        const stripe = x % 4 === 0 || x % 4 === 3;
        c.fillStyle = stripe ? "#6b1478" : "#a021b0";
        c.fillRect(x, y, 1, 1);
      }
    }
    rect(c, 0, 5, S, 6, "#1c1c1c");
    // a skull on the label, so nobody mistakes it for the small kind
    rect(c, 5, 5, 6, 4, "#ffffff");
    rect(c, 6, 9, 4, 2, "#ffffff");
    rect(c, 6, 6, 1, 2, "#1c1c1c");
    rect(c, 9, 6, 1, 2, "#1c1c1c");
    rect(c, 7, 10, 1, 1, "#1c1c1c");
    rect(c, 9, 10, 1, 1, "#1c1c1c");
    rect(c, 1, 7, 2, 2, "#ffd54a");
    rect(c, 13, 7, 2, 2, "#ffd54a");
  });

  const megaSlime = mk(S, S, (c) => {
    rect(c, 0, 0, S, S, "#7a1f8a");
    rect(c, 1, 1, 14, 14, "#c44fd6");
    rect(c, 3, 3, 10, 10, "#e58bf2");
    rect(c, 4, 4, 8, 8, "#c44fd6");
    rect(c, 5, 6, 2, 2, "#3d0c47");
    rect(c, 9, 6, 2, 2, "#3d0c47");
    rect(c, 6, 10, 4, 1, "#3d0c47");
    rect(c, 5, 11, 1, 1, "#3d0c47");
    rect(c, 10, 11, 1, 1, "#3d0c47");
    rect(c, 2, 2, 3, 1, "#ffe98a");
    rect(c, 2, 3, 1, 2, "#ffe98a");
    rect(c, 12, 12, 2, 2, "#ffd54a");
  });

  const megaBush = mk(S, S, (c) => {
    c.drawImage(bush, 0, 0);
    // in bloom: pink and gold flowers with white hearts
    [[4, 7, "#ff7ad1"], [9, 5, "#ffd54a"], [11, 10, "#ff7ad1"], [5, 11, "#ffd54a"], [8, 9, "#c58bff"]]
      .forEach(([x, y, col]) => {
        rect(c, x - 1, y, 3, 1, col);
        rect(c, x, y - 1, 1, 3, col);
        rect(c, x, y, 1, 1, "#ffffff");
      });
  });

  // Swords point up and to the right; only the blade colour changes.
  const swordOf = (blade, edge) => mk(S, S, (c) => {
    for (let i = 0; i < 9; i++) {
      rect(c, 5 + i, 9 - i, 2, 2, blade);
      rect(c, 6 + i, 9 - i, 1, 1, edge);
    }
    rect(c, 13, 1, 2, 2, edge);
    rect(c, 3, 8, 2, 2, "#5a3a1a"); // guard
    rect(c, 5, 10, 2, 2, "#5a3a1a");
    rect(c, 4, 9, 2, 2, "#8a5a2b");
    rect(c, 2, 12, 2, 2, "#5a3a1a"); // grip
    rect(c, 3, 11, 1, 1, "#5a3a1a");
    rect(c, 1, 13, 2, 2, "#ffd54a");
  });
  const swordStone = swordOf("#8c8c8c", "#c9c9c9");
  const swordIron = swordOf("#d9dde3", "#ffffff");
  const swordDiamond = swordOf("#3ad0c8", "#b6fffa");

  const shield = mk(S, S, (c) => {
    spans(c, [[2, 3, 12], [3, 2, 13], [4, 2, 13], [5, 2, 13], [6, 2, 13], [7, 2, 13], [8, 3, 12],
      [9, 3, 12], [10, 4, 11], [11, 5, 10], [12, 6, 9], [13, 7, 8]], "#5a3a1a");
    spans(c, [[3, 3, 12], [4, 3, 12], [5, 3, 12], [6, 3, 12], [7, 3, 12], [8, 4, 11],
      [9, 4, 11], [10, 5, 10], [11, 6, 9], [12, 7, 8]], "#3f7fd6");
    rect(c, 7, 3, 2, 10, "#d9dde3");
    rect(c, 3, 6, 10, 2, "#d9dde3");
    rect(c, 4, 4, 2, 1, "#9cc4ff");
  });

  const coinOf = (rim, face, shine, mark) => mk(S, S, (c) => {
    spans(c, [[2, 5, 10], [3, 4, 11], [4, 3, 12], [5, 2, 13], [6, 2, 13], [7, 2, 13], [8, 2, 13],
      [9, 2, 13], [10, 2, 13], [11, 3, 12], [12, 4, 11], [13, 5, 10]], rim);
    spans(c, [[3, 5, 10], [4, 4, 11], [5, 3, 12], [6, 3, 12], [7, 3, 12], [8, 3, 12],
      [9, 3, 12], [10, 3, 12], [11, 4, 11], [12, 5, 10]], face);
    rect(c, 5, 4, 3, 1, shine);
    rect(c, 4, 5, 1, 2, shine);
    mark(c);
  });
  const coin = coinOf("#b8780f", "#f0b61f", "#ffe98a", (c) => rect(c, 7, 5, 2, 6, "#b8780f"));
  const megacoin = coinOf("#6b1478", "#c22fd0", "#f08bff", (c) => {
    // an M
    rect(c, 5, 5, 1, 6, "#ffd54a");
    rect(c, 10, 5, 1, 6, "#ffd54a");
    rect(c, 6, 6, 1, 1, "#ffd54a");
    rect(c, 9, 6, 1, 1, "#ffd54a");
    rect(c, 7, 7, 2, 1, "#ffd54a");
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

  // Deepslate: "tougher stone" — darker, with flat streaks instead of speckle.
  const deepslate = mk(S, S, (c) => {
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        const r = nz(x >> 2, y, 83) * 0.7 + nz(x, y, 84) * 0.3;
        c.fillStyle = r < 0.3 ? "#2b2b30" : r < 0.6 ? "#3a3a41" : r < 0.85 ? "#4a4a52" : "#5a5a63";
        c.fillRect(x, y, 1, 1);
      }
    }
  });

  // Spike: a pale iron triangle, darker on its shaded side.
  const spike = mk(S, S, (c) => {
    for (let y = 1; y < S; y++) {
      const half = Math.ceil(y / 2);
      rect(c, 8 - half, y, half, 1, "#d8dde6");
      rect(c, 8, y, half, 1, "#8e96a6");
    }
    rect(c, 7, 0, 2, 1, "#ffffff");
    rect(c, 0, S - 1, S, 1, "#5d6472");
  });

  // Editor-only markers (Dialog, Stop, Free move). Like Hidden TNT they aren't
  // drawn in play, so each is a symbol inside a dashed frame of its own colour.
  const marker = (col, paint) => mk(S, S, (c) => {
    c.fillStyle = "rgba(0, 0, 0, 0.28)";
    c.fillRect(0, 0, S, S);
    for (let i = 0; i < S; i += 4) {
      rect(c, i, 0, 2, 1, col);
      rect(c, i + 2, S - 1, 2, 1, col);
      rect(c, 0, i + 2, 1, 2, col);
      rect(c, S - 1, i, 1, 2, col);
    }
    paint(c);
  });

  const dialogMark = marker("#7cc7ff", (c) => {
    // speech bubble with three lines of "writing"
    rect(c, 3, 3, 10, 7, "#ffffff");
    rect(c, 2, 4, 12, 5, "#ffffff");
    spans(c, [[10, 5, 7], [11, 5, 6], [12, 5, 5]], "#ffffff");
    rect(c, 4, 5, 8, 1, "#3a6ea5");
    rect(c, 4, 7, 6, 1, "#3a6ea5");
  });

  const stopMark = marker("#ff5a4f", (c) => {
    rect(c, 0, 4, 15, 9, "#d1402f");
    const glyphs = {
      S: ["111", "100", "111", "001", "111"],
      T: ["111", "010", "010", "010", "010"],
      O: ["111", "101", "101", "101", "111"],
      P: ["111", "101", "111", "100", "100"],
    };
    [..."STOP"].forEach((ch, i) => {
      glyphs[ch].forEach((row, ry) => {
        [...row].forEach((bit, rx) => {
          if (bit === "1") rect(c, i * 4 + rx, 6 + ry, 1, 1, "#ffffff");
        });
      });
    });
  });

  const freeMark = marker("#6fe07a", (c) => {
    // arrows pointing both ways
    spans(c, [[5, 4, 4], [6, 3, 4], [7, 2, 13], [8, 2, 13], [9, 3, 4], [10, 4, 4]], "#6fe07a");
    spans(c, [[5, 11, 11], [6, 11, 12], [9, 11, 12], [10, 11, 11]], "#6fe07a");
  });

  // Boss portal: the End portal's angry red cousin. Walking in starts the boss fight.
  const bossPortal = mk(S, S, (c) => {
    noiseFill(c, 33, ["#3f3a55", "#4a4463", "#332f47", "#565073"]);
    for (let y = 1; y < 15; y++) {
      for (let x = 2; x < 14; x++) {
        const r = nz(x, y, 43);
        c.fillStyle = r < 0.3 ? "#8f1d1d" : r < 0.7 ? "#b32a22" : "#d1402f";
        c.fillRect(x, y, 1, 1);
      }
    }
    // angry eyes and a white "TNT label" band, like the boss's head
    spans(c, [[4, 4, 4], [5, 5, 5], [6, 6, 6], [4, 11, 11], [5, 10, 10], [6, 9, 9]], "#1c1c1c");
    rect(c, 4, 6, 2, 2, "#ffe14a");
    rect(c, 10, 6, 2, 2, "#ffe14a");
    rect(c, 2, 10, 12, 3, "#efefef");
    rect(c, 4, 11, 8, 1, "#1c1c1c");
  });

  // The TNT Mech boss, from the drawing: a big angry TNT block for a head, a
  // long arm ending in a spike on the left, a shorter shooter arm on the right,
  // one solid leg and one jagged stiff one. 24 x 32, drawn at 0.2 blocks a pixel.
  const boss = mk(24, 32, (c) => {
    // torso
    rect(c, 5, 11, 14, 13, "#4a4d57");
    rect(c, 6, 12, 12, 11, "#5d616d");
    rect(c, 6, 12, 12, 1, "#767b89");
    rect(c, 10, 15, 4, 4, "#2a2c33");
    rect(c, 11, 16, 2, 2, "#ff5a1f"); // glowing core
    for (const [x, y] of [[7, 13], [16, 13], [7, 21], [16, 21]]) rect(c, x, y, 1, 1, "#2a2c33");
    // head: a TNT block
    rect(c, 5, 0, 14, 11, "#8c8c8c");
    for (let y = 1; y < 10; y++) {
      for (let x = 5; x < 19; x++) rect(c, x, y, 1, 1, x % 4 === 1 || x % 4 === 0 ? "#a8291f" : "#d1402f");
    }
    spans(c, [[1, 7, 7], [2, 8, 8], [3, 9, 9], [1, 16, 16], [2, 15, 15], [3, 14, 14]], "#1c1c1c"); // angry brows
    rect(c, 7, 3, 2, 2, "#ffe14a");
    rect(c, 15, 3, 2, 2, "#ffe14a");
    rect(c, 5, 5, 14, 5, "#efefef");
    const glyphs = { T: ["111", "010", "010", "010", "010"], N: ["101", "111", "111", "101", "101"] };
    [["T", 6], ["N", 10], ["T", 14]].forEach(([g, ox]) => {
      glyphs[g].forEach((row, ry) => {
        [...row].forEach((bit, rx) => { if (bit === "1") rect(c, ox + rx, 5 + ry, 1, 1, "#1c1c1c"); });
      });
    });
    // left arm, ending in a spike
    rect(c, 0, 12, 5, 11, "#5d616d");
    rect(c, 0, 12, 1, 11, "#4a4d57");
    spans(c, [[23, 0, 4], [24, 0, 3], [25, 1, 3], [26, 1, 2], [27, 1, 2], [28, 1, 1]], "#d8dde6");
    spans(c, [[23, 3, 4], [24, 3, 3], [25, 3, 3]], "#8e96a6");
    // right arm: shorter, with the shooter's muzzle at the end
    rect(c, 19, 12, 5, 8, "#5d616d");
    rect(c, 23, 12, 1, 8, "#4a4d57");
    rect(c, 20, 20, 3, 1, "#1c1c1c");
    // legs: one solid, one jagged
    rect(c, 7, 24, 4, 8, "#3b3d45");
    rect(c, 6, 30, 6, 2, "#2a2c33");
    spans(c, [[24, 14, 16], [25, 15, 17], [26, 14, 16], [27, 13, 15], [28, 14, 16],
      [29, 15, 17], [30, 14, 16], [31, 13, 17]], "#7a5a48");
  });

  // The dragon that gets beaten in the boss intro. 32 x 18, facing left.
  const dragon = mk(32, 18, (c) => {
    // wings, swept back
    for (let i = 0; i < 8; i++) {
      rect(c, 12 + i, 7 - i, 12 - i, 1, i % 3 === 0 ? "#3d3d4d" : "#2b2b38");
    }
    rect(c, 12, 0, 1, 8, "#55556a");
    // body, neck, head, tail
    rect(c, 10, 8, 14, 4, "#16161d");
    rect(c, 5, 7, 6, 3, "#16161d");
    rect(c, 0, 5, 6, 4, "#1f1f29");
    rect(c, 0, 8, 4, 1, "#0e0e13");
    rect(c, 2, 6, 1, 1, "#d05bff");
    rect(c, 24, 9, 5, 2, "#16161d");
    rect(c, 28, 8, 4, 1, "#16161d");
    for (const x of [7, 11, 15, 19, 23, 27]) rect(c, x, x < 10 ? 6 : 7, 1, 1, "#8a8a9a"); // back spikes
    rect(c, 12, 12, 2, 3, "#1f1f29");
    rect(c, 20, 12, 2, 3, "#1f1f29");
    rect(c, 11, 15, 3, 1, "#8a8a9a");
    rect(c, 19, 15, 3, 1, "#8a8a9a");
  });

  // Boss platform: only solid while the boss's "climb" stage is on, so it gets
  // deepslate with a red warning stripe to tell it apart from ordinary blocks.
  const bossPlat = mk(S, S, (c) => {
    c.drawImage(deepslate, 0, 0);
    rect(c, 0, 0, S, 2, "#d1402f");
    for (let x = 0; x < S; x += 4) rect(c, x, 0, 2, 2, "#ffd54a");
    rect(c, 0, S - 1, S, 1, "#1c1c1c");
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
  // the Galaxy skin, for escaping the Galactic Monstrosity: deep space with stars
  const STARS = [[1, 6], [3, 9], [6, 5], [10, 7], [13, 9], [17, 6]];
  const playerGalaxy = paintMap(PLAYER_MAP.map((row, y) =>
    [...row].map((ch, x) => (STARS.some(([sy, sx]) => sy === y && sx === x) && "Aa".includes(ch) ? "*" : ch)).join("")), {
    ...PLAYER_LEGEND,
    O: "#05031a", A: "#2b2a7a", a: "#1a1850", s: "#0d0b33",
    E: "#ff5cf0", e: "#ffffff", X: "#8a3dff", x: "#5a1fb8", G: "#7ee8ff", g: "#3fa9c9", B: "#0a0820",
    "*": "#ffffff",
  });

  // ---------- sprite registry ----------
  // Every drawable is looked up here, so any of it can be swapped for a PNG.

  // ---- pets: they follow the player around. All face right. ----
  const petCat = paintMap([
    "...........o...o",
    "...........ooooo",
    "...........oeoeo",
    "...........ooooo",
    "o.........oowpwo",
    "o..ooooooooooww.",
    ".oooddoodooooo..",
    "..oooooooooooo..",
    "...oooooooooo...",
    "...o.o....o.o...",
    "...o.o....o.o...",
    "...w.w....w.w...",
  ], { o: "#e8913a", d: "#b8621e", w: "#fff3e0", e: "#2a2a2a", p: "#ff9fb0" });
  const petDog = paintMap([
    "..........bbbb..",
    ".........bbbbbb.",
    ".........dbbebbb",
    ".........dbbbbbn",
    "b........dbbbwww",
    ".b.......bbbbt..",
    "..bbbbbbbbbbb...",
    "..bbbwbbbbbbb...",
    "..bbbbbbbbbbb...",
    "..bb.bb..bb.bb..",
    "..bb.bb..bb.bb..",
    "..dd.dd..dd.dd..",
  ], { b: "#9a6a3a", d: "#6b4423", w: "#f2e6d0", e: "#1a1a1a", n: "#111111", t: "#d04050" });
  const petFrog = paintMap([
    "..www....www..",
    "..wew....wew..",
    ".gggggggggggg.",
    "gggggggggggggg",
    "ggdggggggggdgg",
    "gg.dddddddd.gg",
    "gggyyyyyyyyggg",
    ".ggyyyyyyyygg.",
    "gg.gg....gg.gg",
    "dd.dd....dd.dd",
  ], { g: "#4caf50", d: "#2e7d32", y: "#c5e1a5", e: "#111111", w: "#ffffff" });
  const petParrot = paintMap([
    "......rrr...",
    ".....rrrrr..",
    ".....rrwkr..",
    ".....rrrrkk.",
    ".....rrrrk..",
    "....rrrrr...",
    "...yyrrrr...",
    "..bbyyrrr...",
    ".bbbyyrrr...",
    ".bbbbyrr....",
    "..bbb.rr....",
    "......o.o...",
    ".....bb.....",
    "....bb......",
  ], { r: "#e53935", y: "#fdd835", b: "#1e88e5", k: "#333333", w: "#ffffff", o: "#ff9800" });
  const petDragon = paintMap([
    "...........d.d..",
    "..ff.......pppp.",
    ".fff.......ppepp",
    ".ffff.....pppppp",
    "..fff.....ppyy..",
    "...ffpppppppy...",
    "....pppppppyy...",
    "p..ppppppppy....",
    ".pppppyyyyyy....",
    "..pppppppppp....",
    "....pp....pp....",
    "....dd....dd....",
  ], { p: "#8e44ad", d: "#5b2c6f", y: "#f4d03f", e: "#111111", f: "#c39bd3" });

  // the reward for beating The Glitch: a tiny broken-pixel buddy
  const petGlitch = paintMap([
    "..m.cc..k.",
    ".mmkcccw..",
    "kmwwmckwwc",
    "mmwkmckwkc",
    "cmmmkcccmk",
    ".kmmcmmck.",
    "cm.kmcmm.c",
    ".c..m..k..",
  ], { m: "#ff2bd6", c: "#21e6ff", k: "#111111", w: "#ffffff" });

  // The armor you get for escaping the Galactic Monstrosity, drawn over the
  // player (same size): a starry helmet, chestplate and boots.
  const armorSuit = paintMap([
    "...NN*NNNNNNN...",
    "...NNNNNNN*NN...",
    "...cccccccccc...",
    "...nn......nn...",
    "...nn......nn...",
    "...n*......nn...",
    "...nn......nn...",
    "...nn......nn...",
    "....cccccccc....",
    "NNNNnnnnnnnnNNNN",
    "N*NNnnppppnnNN*N",
    "NNNNnnppppnnNNNN",
    "....nnppppnn....",
    "....n*nnnnnn....",
    "....nnnnnn*n....",
    "....nnnnnnnn....",
    "................",
    "................",
    "...cccccccccc...",
    "...nnnn*nnnnn...",
    "...nnnnnnnnnn..."
,
  ], { n: "#1a1850", N: "#2b2a7a", c: "#7ee8ff", p: "#8a3dff", "*": "#ffffff" });

  // The Galactic Monstrosity, facing left: a hulking brute made of deep space,
  // leaning on two pillar arms, shoulders high and head sunk low, cracked
  // all over with glowing galaxy light.
  const galaxyMonster = paintMap([
    "................kkkkk...................................",
    "................kpppk.kkkkk.............................",
    "................kpppk.kpppk.............................",
    "................kpppk.kpppk.kkkkk.......................",
    "................kpppk.kpppk.kpppk.......................",
    "..........kkkkkkkkkkkkkkkkkkkkkkkkk.....................",
    "..........kBBBBBBBBBBBBBBBBBBBBBBBkkkkk.................",
    "..........kBBBBBBBBBBBBBBBBB*BBBBBkpppk.................",
    ".kkkkkkkkkkkkkkBcBBBBBBBBBBBBBBBBBkpppk.................",
    ".kBBBBBBBBBB*BkBBcBBBBBBBBcBBBBBBBkkkkkkkkkkk...........",
    ".kBBBBBBBBBBBBkBBBccBBBBccBcBBBBBBBBBBBBBBBBk...........",
    ".kBBBBcBBBBBBBkBBBBBcBccBBBBcBBBBBBBBBBBBBBBk...........",
    ".kBBBBBcBBBBBBkBBBBBBcBBBBBBBcBBBBBccBBBBBBBk...........",
    ".kBBBBBBcBBBBBkBBBBBBBBBBBBBBBcBBccBBcBBBBBBkkkkkkkkkkk.",
    ".kBBBBBBcBBBBBkBBBBBBBBBBBBBBBBccBBBBBcBBBBBBBBBBBBBBBk.",
    ".kBBBBBBBcBBBBkBBBB*BBBBBBBBBBBBBBBBBBBcBBBBBBBBBBBBBBk.",
    ".kBBBBBBcBBBBBkBBBBBBBBBBBBBBBBBBBBBBBBBcBBBccccBBBBBBk.",
    ".kBBBBBcBBBBBBkBBBBBBBBBBeBBBBBBBBBBBBBBBcccBBBBcBBBBBk.",
    ".kBBBBcBBBBBBBkBBBBBBBBBBeBBBeBBBBBBBB*BBBBBBBBBBcBBBBk.",
    ".kBBBcBBBBBBBBkBBBBBBBBBBBeBBBeBBBBBBBBBBBBBBBBBBcBBBBk.",
    ".kBBBBcBBBBBBkkkkkkkkkkkkkeBBBBeeBBBBBBBBBBBBBBBBBcBBBk.",
    ".kBBBBBcBBBBBkBBBBBBBBBBBkBeBBBBBeBBBBBBBBBBBBBBBBBcBBk.",
    ".kBBBBBcBBBBBkBkBBBBBBkBBkBeBBBBBBeBBBBBBBBBBBBBBBBBBBk.",
    ".kBBBBBBcBBBBkBeeBBBBeeBBkeBBBBBBeBBBBBBBBBBBBBBBBBBBBk.",
    ".kBBBBBBBcBBBkBBBBBBBBBBBkBBBBBBeBBBBBBBBBBBBBBBBBBBBBk.",
    ".kBBBBBBcBBBBkBBBBBBBBBBekBBBBBBeBBeeeeBBBBBBBB*BBBBBBk.",
    ".kBBBBBBcBBBBkBkckckckckBkBBBBBeeeeBBBBeeBBBBBBBBBBBBBk.",
    ".kB*BBBBcBBBBkBkkkkkkkkkBkBBBBBBBBBBBBBBBeBBBBBBBeeBBBk.",
    ".kBBBBBcBBBBBkBkkkkkkkkkBkBBBBBBB*BBBBBBBBeeBBeeeBBBBBk.",
    ".kBBBBcBBBBBBkBkkkkkkkkkBkBBBBBBBBBBBBBBBBBBeeBBBBBBBBk.",
    ".kBBBBcBBBBBBkBBBBBBBBBBBkkkkkkBBBBBBBBBBBBBBBBBBBBBBBk.",
    ".kBBBBBBBBBBBkkkkkkkkkkkkkddddkBBBBBBBBBBBBBBBBBBBBB*Bk.",
    ".kBBBBBBBBB*BBk.....kdddddddddkkkkkkkkkkkkkBBBBBBBBBBBk.",
    ".kBBBBBBBBBBBBk.....kdddddddddk.......kddckBBBBBBBBBBBk.",
    "kkkkkkkkkkkkkkkkk...kdddddddddk.......kdddkkkkkkkkkkkkk.",
    "kpppppppppppppppk...kdddddddddk.......kdddcdddkbbbbbbk..",
    "kpppppppppppppppk.kkkkkkkkkkkkkkk.....kdddcdddkbbbbbbk..",
    "kpppkpppkpppkpppk.kdddddddddddddk.....kddddcddkbbbbbbk..",
    "kpppkpppkpppkpppk.kdddddddddddddk.....kdddcdddkbbbbbbk..",
    "kpppppppppppppppk.kdddddddddddddk.....kdddcdddkbbbbbbk..",
    "kpppppppppppppppk.kdddddddddddddk.....kdddcdddkbbbbbbk..",
    "kpppppppppppppppk.kdddddddddddddk.....kddcddddkbbbbbbk..",
    "kpppppppppppppppk.kdddddddddddddk.....kdddddddkbbbbbbk..",
    "kkkkkkkkkkkkkkkkk.kkkkkkkkkkkkkkk.....kkkkkkkkkkkkkkkk.."
,
  ], { k: "#05031a", b: "#1a1850", B: "#2b2a7a", d: "#110f38", p: "#5a1fb8", e: "#ff5cf0", c: "#7ee8ff", "*": "#ffffff" });
  // its mini version: the pet you get for escaping it (pets face right)
  const petGalaxy = paintMap([
    "...kkkkkk.....",
    "...kpkkkkkkk..",
    ".kkkkkkkkppk..",
    ".kbbbbbbkkkk..",
    ".kb*bbbbkkkkkk",
    ".kbbbbbbkbbbbk",
    ".kbb*b*bkbebek",
    ".kbbbbbbkbbcbk",
    ".kkkkkkkkkkkkk",
    ".kbk..kppk....",
    ".kkk..kkkk....",
  ], { k: "#05031a", b: "#1a1850", B: "#2b2a7a", p: "#5a1fb8", e: "#ff5cf0", c: "#7ee8ff", "*": "#ffffff" });

  // Sir Rock, from the original Pick Right adventure: "It does nothing."
  const petRock = paintMap([
    "....dddddd....",
    "..ddGGGGGGdd..",
    ".dGGLLGGGGGGd.",
    "dGGLGGGGGGGGGd",
    "dGGGeGGGGeGGGd",
    "dGGGGGGGGGGGGd",
    "dGGGGkkkkGGGGd",
    ".dGGGGGGGGGGd.",
    "..dddddddddd..",
  ], { d: "#4a4a4a", G: "#8a8a8a", L: "#b8b8b8", e: "#1a1a1a", k: "#2a2a2a" });

  const SPRITES = {
    petRock: petRock,
    petGlitch: petGlitch,
    petGalaxy: petGalaxy,
    galaxyMonster: galaxyMonster,
    armorSuit: armorSuit,
    petCat: petCat,
    petDog: petDog,
    petFrog: petFrog,
    petParrot: petParrot,
    petDragon: petDragon,
    g: grass,
    dirt: dirt,
    s: stone,
    p: deepslate,
    A: spike,
    K: dialogMark,
    O: stopMark,
    M: freeMark,
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
    9: enderPearl,
    H: craftingTable,
    R: portalFrame,
    frameOn: frameOn,
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
    G: bossPortal,
    J: bossPlat,
    boss: boss,
    dragon: dragon,
    B: bush,
    $: emerald,
    "+": goldBar,
    "@": megatite,
    "%": bolt, // fake lightning: the same picture on purpose
    8: megaTnt,
    0: megaSlime,
    "&": megaBush,
    "\u0180": doorNormal,
    "\u0181": doorNether,
    "\u0182": doorEnd,
    "\u0183": doorMushroom,
    "\u0184": doorMech,
    "\u0185": doorLocked,
    "\u0186": keyItem,
    "\u0187": glitchStone,
    "\u0188": glitchIron,
    "\u0189": water,
    "\u018a": iron,
    "\u018b": fakeCrash,
    enderBullet: enderBullet,
    swordStone: swordStone,
    swordIron: swordIron,
    swordDiamond: swordDiamond,
    shield: shield,
    coin: coin,
    megacoin: megacoin,
    P: spawnMark,
    cloud: cloud,
    player: player,
    playerGalaxy: playerGalaxy,
    explosion1: explosion1,
    explosion2: explosion2,
  };

  // Editor-facing list: which sprites can be repainted, and what to call them.
  const SPRITE_INFO = [
    { key: "player", label: "Player" },
    { key: "g", label: "Grass" },
    { key: "dirt", label: "Dirt" },
    { key: "s", label: "Stone" },
    { key: "p", label: "Deepslate" },
    { key: "A", label: "Spike" },
    { key: "K", label: "Dialog block" },
    { key: "O", label: "Stop block" },
    { key: "M", label: "Free move block" },
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
    { key: "9", label: "Ender pearl" },
    { key: "H", label: "Crafting table" },
    { key: "R", label: "Portal frame" },
    { key: "frameOn", label: "Portal frame (with eye)" },
    { key: "V", label: "End watcher" },
    { key: "Q", label: "Corrupted end watcher" },
    { key: "N", label: "Short-legged enderman" },
    { key: "blaze", label: "Blaze" },
    { key: "r", label: "Blaze rod" },
    { key: "fireball", label: "Fireball" },
    { key: "wingsWorn", label: "Wings (worn)" },
    { key: "E", label: "Portal" },
    { key: "G", label: "Boss portal" },
    { key: "J", label: "Boss platform" },
    { key: "boss", label: "TNT Mech boss" },
    { key: "dragon", label: "Dragon" },
    { key: "B", label: "Bush" },
    { key: "$", label: "Emerald" },
    { key: "+", label: "Gold" },
    { key: "@", label: "Megatite" },
    { key: "8", label: "Mega TNT" },
    { key: "0", label: "Mega slime" },
    { key: "&", label: "Mega bush" },
    { key: "\u0180", label: "Normal door" },
    { key: "\u0181", label: "Nether door" },
    { key: "\u0182", label: "End door" },
    { key: "\u0183", label: "Mushroom door" },
    { key: "\u0184", label: "Mechanical door" },
    { key: "\u0185", label: "Upgraded door" },
    { key: "\u0186", label: "Key" },
    { key: "\u018a", label: "Iron" },
    { key: "\u0187", label: "Glitchy stone" },
    { key: "\u0188", label: "Glitchy iron" },
    { key: "\u0189", label: "Water" },
    { key: "\u018b", label: "Fake crash block" },
    { key: "enderBullet", label: "Ender bullet" },
    { key: "playerGalaxy", label: "Galaxy skin" },
    { key: "galaxyMonster", label: "Galactic Monstrosity" },
    { key: "armorSuit", label: "Armor" },
    { key: "swordStone", label: "Stone sword" },
    { key: "swordIron", label: "Iron sword" },
    { key: "swordDiamond", label: "Diamond sword" },
    { key: "shield", label: "Shield" },
    { key: "P", label: "Start" },
    { key: "cloud", label: "Cloud" },
    { key: "explosion1", label: "Boom 1" },
    { key: "explosion2", label: "Boom 2" },
    { key: "petCat", label: "Cat pet" },
    { key: "petDog", label: "Dog pet" },
    { key: "petFrog", label: "Frog pet" },
    { key: "petParrot", label: "Parrot pet" },
    { key: "petDragon", label: "Baby dragon pet" },
    { key: "petGlitch", label: "Glitch pet" },
    { key: "petGalaxy", label: "Galaxy pet" },
    { key: "petRock", label: "Sir Rock" },
  ];

  // The built-in look, kept aside so "reset" can always get back to it.
  // Mega versions of ordinary blocks: block -> its mega's letter. A square
  // holds one letter, so each mega needs its own. These come from Latin
  // Extended-A, well clear of the letters handed out for the player's own
  // blocks (LEGACY_SLOTS and the private-use range). Never reuse or reorder
  // them: saved levels store these letters. Mega TNT (8), Mega slime (0) and
  // Mega bush (&) came first, with their own hand-drawn pictures.
  const MEGA = {
    g: "\u0100", s: "\u0101", p: "\u0102", n: "\u0103", k: "\u0104", e: "\u0105",
    A: "\u0106", "%": "\u0107", I: "\u0108", S: "\u0109", Z: "\u010a", W: "\u010b",
    Y: "\u010c", U: "\u010d", D: "\u010e", d: "\u010f", "+": "\u0110", $: "\u0111",
    "@": "\u0112", r: "\u0113", 9: "\u0114", o: "\u0115", T: "\u0116", b: "\u0117",
    w: "\u0118", L: "\u0119", F: "\u011a", f: "\u011b",
  };
  const MEGA_BASE = {};
  for (const [b, m] of Object.entries(MEGA)) MEGA_BASE[m] = b;

  // A mega's picture is a picture of its own, so it can be repainted in the
  // Art Studio separately (whether or not the mega has been bought). Until it
  // is, it's whatever its ordinary block looks like right now (repaints
  // included) with a megatite-pink border: see syncDerived.
  const megaLook = (base) => {
    const w = base.width || base.naturalWidth, h = base.height || base.naturalHeight;
    return mk(w, h, (c) => {
      c.drawImage(base, 0, 0, w, h);
      rect(c, 0, 0, w, 1, "#f08bff");
      rect(c, 0, h - 1, w, 1, "#f08bff");
      rect(c, 0, 0, 1, h, "#f08bff");
      rect(c, w - 1, 0, 1, h, "#f08bff");
      rect(c, 1, 1, 1, 1, "#fff4ff");
      rect(c, w - 2, h - 2, 1, 1, "#fff4ff");
    });
  };
  for (const [b, m] of Object.entries(MEGA)) {
    SPRITES[m] = megaLook(SPRITES[b]);
    const info = SPRITE_INFO.find((x) => x.key === b);
    const label = { "%": "fake lightning", w: "wither rose" }[b] || (info ? info.label : b).toLowerCase();
    SPRITE_INFO.push({ key: m, label: "Mega " + label });
  }

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

  // ---------- the player's own blocks ----------
  //
  // A block a player invents is a second look for something that already
  // exists: it keeps a name, the block it acts like (`base`), and its pixels.
  // It lives in the same store as repainted art, so art files and art codes
  // carry it, and adding it to the shipped art pack makes it permanent.
  //
  // A level square holds one character, so each of these gets a character of
  // its own from Unicode's private-use range: thousands of single characters
  // that mean nothing elsewhere. They are handed out at random so blocks made
  // in two different browsers almost never land on the same one.
  const LEGACY_SLOTS = "acijquvxyz"; // the first version handed out these letters
  const PUA_FIRST = 0xe000;
  const PUA_COUNT = 6400;
  const MAX_CUSTOM = 200; // a guard against filling the browser's storage, not a design limit
  const CUSTOM = {}; // character -> { name, base, shipped }

  const isMine = (k) => {
    if (typeof k !== "string" || k.length !== 1) return false;
    const c = k.charCodeAt(0);
    return LEGACY_SLOTS.includes(k) || (c >= PUA_FIRST && c < PUA_FIRST + PUA_COUNT);
  };

  const cleanName = (n) => (typeof n === "string" ? n.trim().slice(0, 20) : "");
  const cleanBase = (b) => (typeof b === "string" && b in ORIGINALS && !isMine(b) ? b : "s");

  const baseOf = (k) => (CUSTOM[k] ? CUSTOM[k].base : null);

  const customBlocks = () =>
    Object.keys(CUSTOM).map((k) => ({ key: k, label: CUSTOM[k].name, base: CUSTOM[k].base, shipped: CUSTOM[k].shipped }));

  // from: the sprite to start from (which also decides what the new block
  // acts like), or "blank" for a plain grey solid block
  const addBlock = (name, from) => {
    if (Object.values(CUSTOM).filter((c) => !c.shipped).length >= MAX_CUSTOM) return null;
    const look = from === "blank"
      ? { w: S, h: S, px: Array(S * S).fill("#8a8a8a") }
      : getPixels(from);
    if (!look) return null;
    let key;
    do key = String.fromCharCode(PUA_FIRST + Math.floor(Math.random() * PUA_COUNT));
    while (key in CUSTOM);
    look.name = cleanName(name) || "My block";
    look.base = from === "blank" ? "s" : CUSTOM[from] ? CUSTOM[from].base : from;
    return applyPack({ [key]: look }, true).length ? key : null;
  };

  // Blocks that ship with the game can't be deleted: shipped levels use them.
  const removeBlock = (key) => {
    if (!(key in CUSTOM) || CUSTOM[key].shipped) return;
    delete CUSTOM[key];
    delete SPRITES[key];
    const store = readStore();
    delete store[key];
    writeStore(store);
  };

  // Apply a whole set of repainted sprites at once. Unknown keys and malformed
  // entries are skipped, so a hand-edited art file can never break the game.
  const applyPack = (pack, persist) => {
    const good = {};
    for (const [key, data] of Object.entries(pack || {})) {
      const mine = isMine(key);
      if (!mine && !(key in ORIGINALS)) continue;
      const clean = cleanPixels(data);
      if (!clean) continue;
      if (mine) {
        const was = CUSTOM[key];
        // a repaint of a shipped block keeps the shipped name and behaviour
        const name = was && was.shipped ? was.name : cleanName(data.name) || (was && was.name) || "My block";
        const base = was && (was.shipped || data.base === undefined) ? was.base : cleanBase(data.base);
        CUSTOM[key] = { name, base, shipped: !!(was && was.shipped) };
        clean.name = name;
        clean.base = base;
      }
      SPRITES[key] = bake(clean);
      good[key] = clean;
    }
    const keys = Object.keys(good);
    if (persist && keys.length) writeStore(Object.assign(readStore(), good));
    syncDerived();
    return keys;
  };

  // Some pictures follow another one: Hidden TNT is a faded copy of whatever
  // TNT looks like right now, and each mega is its ordinary block plus a pink
  // border. A repaint of the original carries over, unless the follower was
  // repainted on its own.
  const syncDerived = () => {
    const own = Object.assign({}, window.BDArtPack || {}, readStore());
    if (!("h" in own)) SPRITES.h = ghostOf(SPRITES.t);
    for (const [b, m] of Object.entries(MEGA)) if (!(m in own)) SPRITES[m] = megaLook(SPRITES[b]);
  };

  const setPixels = (key, data) => applyPack({ [key]: data }, true).length > 0;

  const resetSprite = (key) => {
    if (!(key in ORIGINALS)) return;
    SPRITES[key] = ORIGINALS[key];
    const store = readStore();
    delete store[key];
    writeStore(store);
    syncDerived();
  };

  const resetAllSprites = () => {
    Object.assign(SPRITES, ORIGINALS);
    // "Reset art" means repaints; blocks the player invented are theirs to delete
    const store = readStore();
    const kept = {};
    for (const k of Object.keys(CUSTOM)) if (store[k] && !CUSTOM[k].shipped) kept[k] = store[k];
    writeStore(kept);
    syncDerived();
  };

  const customArt = () => readStore();
  const isCustom = (key) => key in readStore();

  // Art shipped with the game (docs/blockdash-artpack.js) loads first; anything
  // painted in this browser wins over it. Once the pack has been applied it
  // becomes the baseline, so "reset" goes back to the art the game ships with
  // rather than to whatever the code drew before the pack existed.
  applyPack(window.BDArtPack || {}, false);
  Object.assign(ORIGINALS, SPRITES);
  for (const k of Object.keys(CUSTOM)) CUSTOM[k].shipped = true;
  applyPack(readStore(), false);

  const blit = (ctx, sprite, x, y, w, h) => {
    if (!sprite) return;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(sprite, Math.round(x), Math.round(y), Math.ceil(w), Math.ceil(h));
  };

  // covered = something solid sits directly above, so grass shows as plain dirt

  // On top of a mega's own picture: a sparkle that moves round the corners,
  // like the rays in the kids' drawing.
  const drawMegaGlow = (ctx, x, y, size, time) => {
    const pulse = 0.5 + 0.5 * Math.sin(time * 4 + x * 0.05);
    ctx.save();
    // a little four-point sparkle that moves round the corners
    const c = Math.floor(time * 1.5 + x * 0.01) % 4;
    const sx = x + (c === 1 || c === 2 ? size * 0.78 : size * 0.22);
    const sy = y + (c >= 2 ? size * 0.78 : size * 0.22);
    const r = size * (0.08 + 0.06 * pulse);
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = "#fff4ff";
    ctx.fillRect(sx - r, sy - size * 0.02, r * 2, size * 0.04);
    ctx.fillRect(sx - size * 0.02, sy - r, size * 0.04, r * 2);
    ctx.restore();
  };

  const drawTile = (ctx, key, x, y, size, time, covered) => {
    drawTileBody(ctx, key, x, y, size, time, covered);
    if (MEGA_BASE[key]) drawMegaGlow(ctx, x, y, size, time);
  };

  const drawTileBody = (ctx, key, x, y, size, time, covered) => {
    if (key === "g" && covered) return blit(ctx, SPRITES.dirt, x, y, size, size);
    // one of the player's own blocks (or a mega) wobbles, bobs or glows like
    // the block it acts as, using its own picture
    const ch = MEGA_BASE[key] || (CUSTOM[key] ? CUSTOM[key].base : key);
    // fake lightning borrows the real bolt's picture, repaints included
    const sp = SPRITES[key === "%" ? "b" : key] || (isMine(key) ? SPRITES.s : null);
    if (!sp) return;
    const sw = sp.width || sp.naturalWidth, sh = sp.height || sp.naturalHeight;
    if (sh > sw) {
      const w = size * sw / sh;
      return blit(ctx, sp, x + (size - w) / 2, y, w, size);
    }
    if (ch === "\u0189") {
      // see-through, with a slow shimmer drifting along
      ctx.save();
      ctx.globalAlpha = 0.7;
      blit(ctx, sp, x, y, size, size);
      ctx.globalAlpha = 0.18 + 0.1 * Math.sin(time * 2 + x * 0.04);
      ctx.fillStyle = "#cfe6ff";
      ctx.fillRect(x, y + size * (0.2 + 0.1 * Math.sin(time * 1.5 + x * 0.02)), size, size * 0.08);
      ctx.restore();
      return;
    }
    if (ch === "\u0187" || ch === "\u0188") {
      // now and then a slice of it jumps sideways, tinted like The Glitch
      blit(ctx, sp, x, y, size, size);
      if ((time * 1.7 + x * 0.013) % 1 > 0.1) return;
      const band = Math.max(1, Math.round(sh * 3 / 16));
      const row = Math.floor((time * 23 + x * 0.07) % (sh - band));
      const k = size / sh;
      ctx.drawImage(sp, 0, row, sw, band, x + 3 * k, y + row * k, size, band * k);
      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = row % 2 ? "#ff2bd6" : "#21e6ff";
      ctx.fillRect(x, y + row * k, size, band * k);
      ctx.restore();
      return;
    }
    if (ch === "m" || ch === "0") {
      // slime squishes gently
      const wob = (Math.sin(time * 4 + x * 0.03) * 0.04 + 0.04) * size;
      return blit(ctx, sp, x, y + wob, size, size - wob);
    }
    if (ch === "d" || ch === "r" || ch === "o" || ch === "9" || ch === "$" || ch === "+" || ch === "@") {
      const bob = Math.sin(time * 3 + x * 0.05) * size * 0.08;
      return blit(ctx, sp, x, y + bob, size, size);
    }
    if (ch === "b" || ch === "%") {
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

  // look: one of the player's own player looks, if the level picked one
  const drawPlayer = (ctx, x, y, w, h, rot, look) => {
    ctx.save();
    ctx.translate(x + w / 2, y + h / 2);
    ctx.rotate(rot);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(SPRITES[look] || SPRITES.player, -w / 2, -h / 2, w, h);
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
    { key: "deepCave", label: "⛏ Deep cave" },
    // mega: bought in the shop, then pickable in the Level Maker
    { key: "megaOverworld", label: "✨ Mega Overworld", mega: true, base: "overworld" },
    { key: "megaNether", label: "✨ Mega Nether", mega: true, base: "nether" },
    { key: "megaMooshroom", label: "✨ Mega Mooshroom", mega: true, base: "mooshroom" },
    { key: "megaEnd", label: "✨ Mega End", mega: true, base: "end" },
    { key: "megaEndStorage", label: "✨ Mega End storage", mega: true, base: "endStorage" },
    { key: "megaDeepCave", label: "✨ Mega Deep cave", mega: true, base: "deepCave" },
  ];
  // the ordinary background a mega one is built on (or the key itself)
  const bgBase = (k) => {
    const b = BACKGROUNDS.find((x) => x.key === k);
    return b && b.base ? b.base : k;
  };

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

  // ---- mega backgrounds: extra layers drawn over the ordinary one ----
  // Everything scales from the screen height, so shop thumbnails work too.

  const glowDot = (ctx, x, y, r, color) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color);
    g.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  };

  // a blocky crystal: a diamond shape made of stacked rectangles
  const crystal = (ctx, x, baseY, w, h, color, light, up) => {
    const rows = 6;
    for (let i = 0; i < rows; i++) {
      const k = i < rows / 2 ? (i + 1) / (rows / 2) : (rows - i) / (rows / 2);
      const rw = Math.max(2, w * k);
      const y = up ? baseY - h + (i * h) / rows : baseY + (i * h) / rows;
      ctx.fillStyle = i % 2 ? color : light;
      ctx.fillRect(x + (w - rw) / 2, y, rw, h / rows + 1);
    }
  };

  const MEGA_LAYERS = {
    // drawn whole rather than over the ordinary Overworld, so the sunset sky
    // and mountains sit behind the clouds and hills instead of tinting them
    megaOverworld(ctx, W, H, scroll, ts, t) {
      const groundY = H - ts;
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, "#3d2c6e");
      sky.addColorStop(0.45, "#e0607e");
      sky.addColorStop(0.8, "#ffa66b");
      sky.addColorStop(1, "#ffd59a");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, H);
      // the sun, low on the horizon
      const sx = wrapX(W * 0.7, scroll, 0.02, W + H * 0.6, H * 0.3), sy = groundY - H * 0.3;
      glowDot(ctx, sx, sy, H * 0.35, "rgba(255, 230, 150, 0.7)");
      ctx.fillStyle = "#ffe08a";
      const sr = Math.round(H * 0.08);
      ctx.fillRect(Math.round(sx - sr), Math.round(sy - sr), sr * 2, sr * 2);
      // a blocky rainbow
      const cols = ["#e53935", "#fb8c00", "#fdd835", "#43a047", "#1e88e5", "#5e35b1", "#8e24aa"];
      const rx = wrapX(W * 0.35, scroll, 0.05, W + H * 1.6, H * 0.8);
      const band = H * 0.025;
      ctx.globalAlpha = 0.5;
      cols.forEach((c, i) => {
        const r = H * 0.6 - i * band;
        ctx.fillStyle = c;
        for (let a = 0; a <= 40; a++) {
          const ang = Math.PI + (a / 40) * Math.PI;
          ctx.fillRect(rx + Math.cos(ang) * r - band / 2, groundY + Math.sin(ang) * r - band / 2, band * 1.3, band * 1.3);
        }
      });
      ctx.globalAlpha = 1;
      // far-off purple mountains with snowy tips
      const span = W + H * 1.6;
      for (let i = 0; i < 5; i++) {
        const mx = wrapX(i * H * 0.55, scroll, 0.08, span, H * 0.5);
        const mh = H * (0.3 + ((i * 37) % 10) / 50);
        const step = Math.max(1, Math.round(mh / 8));
        ctx.fillStyle = i % 2 ? "#6b4a86" : "#5a3d76";
        for (let k = 0; k < 8; k++) {
          const w = Math.round(((mh * (8 - k)) / 8) * 1.6);
          ctx.fillRect(Math.round(mx - w / 2), Math.round(groundY - step * (k + 1)), w, step + 1);
        }
        ctx.fillStyle = "#f4eaff";
        ctx.fillRect(Math.round(mx - mh * 0.1), Math.round(groundY - step * 8), Math.round(mh * 0.2), step);
      }
      // pink-lit clouds
      const cspan = W + H;
      for (let i = 0; i < 6; i++) {
        const size = H * (0.2 + (i % 3) * 0.1);
        ctx.globalAlpha = 0.85;
        drawCloud(ctx, wrapX(i * H * 0.62, scroll, 0.22, cspan, H * 0.4), H * (0.04 + ((i * 71) % 110) / 540), size);
        ctx.globalAlpha = 1;
      }
      ctx.fillStyle = "rgba(255, 130, 150, 0.25)";
      ctx.fillRect(0, 0, W, H * 0.45);
      // green hills in the evening light
      const hspan = W + H;
      for (let i = 0; i < 10; i++) {
        const x = wrapX(i * H * 0.48, scroll, 0.5, hspan, H * 0.48);
        const hgt = H * (0.075 + ((i * 53) % 70) / 540);
        ctx.fillStyle = "#4f6b3a";
        ctx.fillRect(x, groundY - hgt, H * 0.37, hgt + ts);
        ctx.fillStyle = "#8aa060";
        ctx.fillRect(x, groundY - hgt, H * 0.37, H * 0.018);
      }
      // birds
      ctx.fillStyle = "#2b1f33";
      for (let i = 0; i < 5; i++) {
        const bx = wrapX(i * W * 0.31 + t * H * 0.08, scroll, 0.15, W + 100, 50);
        const by = H * (0.12 + ((i * 29) % 25) / 100) + Math.sin(t * 2 + i) * H * 0.01;
        const p = Math.max(1, H * 0.006);
        const flap = Math.sin(t * 9 + i * 2) > 0 ? -p : p;
        ctx.fillRect(bx, by, p * 2, p);
        ctx.fillRect(bx - p * 2, by + flap, p * 2, p);
        ctx.fillRect(bx + p * 2, by + flap, p * 2, p);
      }
    },

    megaNether(ctx, W, H, scroll, ts, t) {
      const groundY = H - ts;
      // lava waterfalls pouring from the ceiling
      const span = W + H;
      for (let i = 0; i < 3; i++) {
        const x = wrapX(i * H * 0.7 + H * 0.2, scroll, 0.3, span, H * 0.1);
        const w = H * 0.05;
        // dim, so they read as far away and not as lava you can touch
        ctx.fillStyle = "rgba(200, 80, 20, 0.5)";
        ctx.fillRect(x, 0, w, groundY);
        ctx.fillStyle = "rgba(255, 170, 70, 0.4)";
        const step = H * 0.06;
        for (let y = ((t * H * 0.5) % step) - step; y < groundY; y += step) ctx.fillRect(x + w * 0.25, y, w * 0.3, step * 0.4);
        glowDot(ctx, x + w / 2, groundY, H * 0.12, "rgba(255, 140, 40, 0.5)");
      }
      // crimson trees
      const tspan = W + H * 1.2;
      for (let i = 0; i < 4; i++) {
        const x = wrapX(i * H * 0.6 + H * 0.45, scroll, 0.45, tspan, H * 0.3);
        const th = H * (0.18 + (i % 3) * 0.04), tw = H * 0.03;
        ctx.fillStyle = "#6b1f2a";
        ctx.fillRect(x, groundY - th, tw, th);
        ctx.fillStyle = "#b0222f";
        ctx.fillRect(x - tw * 2.5, groundY - th - tw * 2, tw * 6, tw * 2.5);
        ctx.fillRect(x - tw * 1.5, groundY - th - tw * 3.5, tw * 4, tw * 1.6);
        ctx.fillStyle = "#ffb347"; // shroomlights
        ctx.fillRect(x - tw * 1.5, groundY - th - tw * 1.2, tw * 0.8, tw * 0.8);
        ctx.fillRect(x + tw * 2, groundY - th - tw * 2.2, tw * 0.8, tw * 0.8);
      }
      // lots more embers, glowing
      for (let i = 0; i < 30; i++) {
        const x = wrapX(i * 97 + Math.sin(t + i) * 20, scroll, 0.6, W + 40, 20);
        const y = H - ((t * H * 0.06 + i * 53) % (H + 20));
        glowDot(ctx, x, y, H * 0.012, "rgba(255, 190, 90, 0.9)");
      }
    },

    megaMooshroom(ctx, W, H, scroll, ts, t) {
      const groundY = H - ts;
      ctx.fillStyle = "rgba(255, 120, 200, 0.22)"; // pink sky
      ctx.fillRect(0, 0, W, H);
      // giant glowing mushrooms
      const span = W + H * 1.4;
      for (let i = 0; i < 4; i++) {
        const x = wrapX(i * H * 0.7, scroll, 0.2, span, H * 0.4);
        const capW = H * (0.32 + (i % 2) * 0.1);
        const h = H * (0.35 + (i % 3) * 0.06);
        const pulse = 0.35 + 0.15 * Math.sin(t * 1.5 + i);
        glowDot(ctx, x + capW / 2, groundY - h, capW * 0.9, `rgba(255, 140, 220, ${pulse})`);
        drawMushroom(ctx, x, groundY, h, capW, i % 2 === 0);
      }
      // sparkly spores drifting up
      for (let i = 0; i < 26; i++) {
        const x = wrapX(i * 83 + Math.sin(t * 0.8 + i) * 25, scroll, 0.5, W + 40, 20);
        const y = H - ((t * H * 0.04 + i * 41) % (H + 20));
        const c = ["rgba(255, 200, 240, 0.9)", "rgba(200, 255, 230, 0.9)", "rgba(255, 255, 200, 0.9)"][i % 3];
        glowDot(ctx, x, y, H * 0.01, c);
      }
    },

    megaEnd(ctx, W, H, scroll, ts, t) {
      // a purple galaxy swirl
      const cx = wrapX(W * 0.65, scroll, 0.03, W + H, H * 0.5), cy = H * 0.32;
      glowDot(ctx, cx, cy, H * 0.35, "rgba(170, 90, 255, 0.35)");
      for (let arm = 0; arm < 2; arm++) {
        for (let i = 0; i < 40; i++) {
          const a = i * 0.25 + arm * Math.PI + t * 0.15;
          const r = i * H * 0.0065;
          ctx.fillStyle = i % 3 ? "rgba(220, 180, 255, 0.7)" : "rgba(255, 255, 255, 0.9)";
          const d = Math.max(1, H * 0.006);
          ctx.fillRect(cx + Math.cos(a) * r * 1.6, cy + Math.sin(a) * r * 0.7, d, d);
        }
      }
      // floating End islands, bobbing
      const span = W + H * 1.2;
      for (let i = 0; i < 3; i++) {
        const x = wrapX(i * H * 0.65 + H * 0.3, scroll, 0.18, span, H * 0.4);
        const y = H * (0.25 + i * 0.12) + Math.sin(t * 0.7 + i * 2) * H * 0.015;
        const w = H * (0.22 - i * 0.03);
        ctx.fillStyle = "rgba(225, 222, 160, 0.75)";
        ctx.fillRect(x, y, w, w * 0.15);
        ctx.fillRect(x + w * 0.15, y + w * 0.15, w * 0.7, w * 0.12);
        ctx.fillRect(x + w * 0.35, y + w * 0.27, w * 0.3, w * 0.1);
        ctx.fillStyle = "rgba(40, 20, 50, 0.8)"; // a little obsidian pillar
        ctx.fillRect(x + w * 0.45, y - w * 0.4, w * 0.1, w * 0.4);
      }
      // shooting stars, one every couple of seconds
      for (let i = 0; i < 2; i++) {
        const k = ((t * 0.45 + i * 0.5) % 1);
        if (k > 0.35) continue;
        const sx = W * (0.15 + 0.55 * ((Math.floor(t * 0.45 + i * 0.5) * 0.37 + i * 0.3) % 1)) + k * W * 0.9;
        const sy = H * 0.05 + k * H * 0.45;
        ctx.strokeStyle = `rgba(255, 255, 255, ${1 - k / 0.35})`;
        ctx.lineWidth = Math.max(1, H * 0.005);
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx - H * 0.12, sy - H * 0.06);
        ctx.stroke();
      }
    },

    megaEndStorage(ctx, W, H, scroll, ts, t) {
      const groundY = H - ts;
      // the whole room slowly pulses purple
      ctx.fillStyle = `rgba(160, 60, 255, ${0.08 + 0.06 * Math.sin(t * 2)})`;
      ctx.fillRect(0, 0, W, H);
      // glowing purple crystals, floor and ceiling
      const span = W + H;
      for (let i = 0; i < 6; i++) {
        const x = wrapX(i * H * 0.33, scroll, 0.35, span, H * 0.2);
        const up = i % 2 === 0;
        const h = H * (0.2 + (i % 3) * 0.06), w = H * 0.08;
        const y = up ? groundY : 0;
        glowDot(ctx, x + w / 2, up ? groundY - h / 2 : h / 2, h, `rgba(190, 100, 255, ${0.3 + 0.2 * Math.sin(t * 3 + i)})`);
        crystal(ctx, x, y, w, h, "#9b4dff", "#d9b3ff", up);
      }
      // floating crates
      const cspan = W + H * 1.3;
      for (let i = 0; i < 4; i++) {
        const x = wrapX(i * H * 0.45 + H * 0.15, scroll, 0.25, cspan, H * 0.2);
        const y = H * (0.2 + (i % 3) * 0.15) + Math.sin(t * 1.1 + i * 1.7) * H * 0.02;
        const s = H * 0.07;
        ctx.fillStyle = "rgba(150, 100, 60, 0.85)";
        ctx.fillRect(x, y, s, s);
        ctx.fillStyle = "rgba(100, 65, 35, 0.9)";
        ctx.fillRect(x, y, s, s * 0.12);
        ctx.fillRect(x, y + s * 0.88, s, s * 0.12);
        ctx.fillRect(x + s * 0.44, y, s * 0.12, s);
      }
    },

    megaDeepCave(ctx, W, H, scroll, ts, t) {
      const groundY = H - ts;
      // a waterfall
      const wx = wrapX(H * 0.9, scroll, 0.3, W + H, H * 0.1), ww = H * 0.07;
      ctx.fillStyle = "rgba(60, 140, 230, 0.75)";
      ctx.fillRect(wx, 0, ww, groundY);
      ctx.fillStyle = "rgba(220, 240, 255, 0.7)";
      const step = H * 0.05;
      for (let y = ((t * H * 0.6) % step) - step; y < groundY; y += step) {
        ctx.fillRect(wx + ww * 0.15, y, ww * 0.15, step * 0.5);
        ctx.fillRect(wx + ww * 0.6, y + step * 0.4, ww * 0.15, step * 0.4);
      }
      glowDot(ctx, wx + ww / 2, groundY, H * 0.1, "rgba(200, 230, 255, 0.5)"); // splash mist
      // dripstone hanging from the roof, with sparkles
      const span = W + H;
      for (let i = 0; i < 7; i++) {
        const x = wrapX(i * H * 0.3 + H * 0.1, scroll, 0.4, span, H * 0.1);
        const h = H * (0.08 + ((i * 13) % 5) / 40), w = H * 0.03;
        ctx.fillStyle = "#7a6a58";
        for (let k = 0; k < 4; k++) ctx.fillRect(x + (w * k) / 8, (h * k) / 4, w - (w * k) / 4, h / 4 + 1);
        if (Math.sin(t * 3 + i * 1.3) > 0.7) glowDot(ctx, x + w / 2, h, H * 0.015, "rgba(255, 255, 255, 0.95)");
      }
      // glowing crystals on the floor
      for (let i = 0; i < 5; i++) {
        const x = wrapX(i * H * 0.4 + H * 0.25, scroll, 0.5, W + H, H * 0.1);
        const h = H * (0.14 + (i % 3) * 0.05), w = H * 0.065;
        const c = i % 2 ? ["#36d6e7", "#b8f6ff"] : ["#3f7bff", "#bcd0ff"];
        glowDot(ctx, x + w / 2, groundY - h / 2, h, `rgba(80, 200, 255, ${0.3 + 0.15 * Math.sin(t * 2 + i)})`);
        crystal(ctx, x, groundY, w, h, c[0], c[1], true);
      }
    },
  };

  // effect: null | "fast" | "slow" (lightning / wither rose tints)
  const drawBackground = (ctx, kind, W, H, scroll, ts, t, effect) => {
    if (MEGA_LAYERS[kind]) {
      if (kind !== "megaOverworld") drawBackground(ctx, bgBase(kind), W, H, scroll, ts, t, null);
      MEGA_LAYERS[kind](ctx, W, H, scroll, ts, t);
      if (effect) {
        ctx.fillStyle = effect === "fast" ? "rgba(255, 190, 60, 0.25)" : "rgba(40, 40, 60, 0.4)";
        ctx.fillRect(0, 0, W, H);
      }
      return;
    }
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
    } else if (kind === "deepCave") {
      // Far underground: near-black deepslate all around, with ore glinting
      // in the far wall and big sculk patches that pulse with light.
      ctx.fillStyle = skyGrad(ctx, H, "#08080c", "#1d1d26");
      ctx.fillRect(0, 0, W, H);
      // ore in the far wall: diamond, redstone, gold, each catching the light now and then
      // One vein somewhere inside each square of a loose 5x3 grid, with a few
      // squares left empty: spread over the whole wall, but never in rows.
      // Sized off the block size, so the Level Maker's smaller picture shows
      // the same cave as the game.
      const ores = ["#4fe0d8", "#e0483a", "#ffd54a"];
      const u = ts / 45;
      const rnd = (n) => { const v = Math.sin(n * 12.9898 + 4.1) * 43758.5453; return v - Math.floor(v); };
      const span = W + 60 * u;
      for (let i = 0; i < 15; i++) {
        if (rnd(i + 50) < 0.2) continue;
        const x = wrapX((i % 5 + 0.1 + rnd(i) * 0.8) / 5 * span, scroll, 0.08, span, 30 * u);
        const y = (0.12 + (Math.floor(i / 5) + 0.1 + rnd(i + 20) * 0.8) / 3 * 0.66) * H;
        ctx.globalAlpha = 0.4 + 0.4 * Math.max(0, Math.sin(t * 1.3 + i * 2.1));
        ctx.fillStyle = ores[(i * 2 + Math.floor(i / 5)) % 3]; // an even mix of the three
        ctx.fillRect(x, y, 6 * u, 6 * u);
        ctx.fillRect(x + 9 * u, y + 6 * u, 6 * u, 6 * u);
        if (rnd(i + 110) < 0.5) ctx.fillRect(x - 3 * u, y + 12 * u, 6 * u, 6 * u);
      }
      ctx.globalAlpha = 1;
      // Sculk: two big dark patches spreading over the far wall, ragged at
      // the edges, with thin veins creeping out around them. Every few seconds a ring of light starts at a patch's
      // heart and ripples out to its rim.
      const cell = 10 * u;
      for (let p = 0; p < 2; p++) {
        const cx = wrapX((p + 0.25 + rnd(p + 200) * 0.5) / 2 * span, scroll, 0.08, span, 30 * u);
        const cy = (0.32 + rnd(p + 210) * 0.3) * H;
        const R = 6 + p; // in sculk squares
        const phase = (t * 5 + p * 19) % 46; // one ripple, then a long dark wait
        // Veins: thin tendrils creeping out from under the patch in every
        // direction, each wandering as it goes. The ripple runs on along them.
        const thin = cell / 2;
        for (let v = 0; v < 7; v++) {
          const ang = (v + rnd(p * 50 + v + 700) * 0.7) / 7 * Math.PI * 2;
          const ax = Math.cos(ang), ay = Math.sin(ang);
          // step along whichever way it mostly points; sideways now and then
          const main = Math.abs(ax) > Math.abs(ay) ? [Math.sign(ax), 0] : [0, Math.sign(ay)];
          const side = Math.abs(ax) > Math.abs(ay) ? [0, Math.sign(ay) || 1] : [Math.sign(ax) || 1, 0];
          let hx = Math.round(ax * R * 0.8), hy = Math.round(ay * R * 0.6); // in half squares
          const len = 12 + Math.floor(rnd(p * 50 + v + 720) * 12);
          for (let k = 0; k < len; k++) {
            const r = rnd(p * 5000 + v * 100 + k + 800);
            const step = r < 0.55 ? main : r < 0.85 ? side : [-side[0], -side[1]];
            hx += step[0];
            hy += step[1];
            ctx.fillStyle = "#0b2a33";
            ctx.fillRect(cx + hx * thin, cy + hy * thin, thin, thin);
            const g = Math.max(0, 1 - Math.abs(phase - Math.hypot(hx / 2, hy / 2 * 1.3)) / 2);
            if (g > 0) {
              ctx.fillStyle = `rgba(70, 235, 225, ${g * 0.85})`;
              ctx.fillRect(cx + hx * thin, cy + hy * thin, thin, thin);
            }
          }
        }
        for (let gy = -R; gy <= R; gy++) {
          for (let gx = -R; gx <= R; gx++) {
            const d = Math.hypot(gx, gy * 1.3); // wider than tall
            // a lumpy outline, with squares missing here and there near the rim
            const reach = R * (0.72 + 0.28 * Math.sin(Math.atan2(gy, gx) * 3 + p * 2)) - rnd(p * 1000 + gx * 31 + gy * 57 + 300) * 1.6;
            if (d > reach) continue;
            const x = cx + gx * cell, y = cy + gy * cell;
            ctx.fillStyle = rnd(p * 1000 + gx * 13 + gy * 71 + 600) < 0.12 ? "#12414c" : "#0b2a33";
            ctx.fillRect(x, y, cell, cell);
            const g = Math.max(0, 1 - Math.abs(phase - d) / 2);
            if (g > 0) {
              ctx.fillStyle = `rgba(70, 235, 225, ${g * 0.85})`;
              ctx.fillRect(x, y, cell, cell);
            }
          }
        }
      }
      jagged(ctx, W, 0, 1, scroll, 0.15, 48, 24, 70, 3, "#1a1a22");
      jagged(ctx, W, 0, 1, scroll, 0.3, 36, 8, 34, 11, "#2a2a35");
      jagged(ctx, W, groundY + ts * 0.3, -1, scroll, 0.25, 44, 30, 90, 5, "#1c1c25");
      jagged(ctx, W, groundY + ts * 0.3, -1, scroll, 0.5, 32, 10, 46, 17, "#30303c");
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
    MEGA,
    MEGA_BASE,
    drawTile,
    drawPlayer,
    drawExplosion,
    drawCloud,
    drawEraser,
    drawBackground,
    BACKGROUNDS,
    bgBase,
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
    isMine,
    baseOf,
    MAX_CUSTOM,
    customBlocks,
    addBlock,
    removeBlock,
  };
})();
