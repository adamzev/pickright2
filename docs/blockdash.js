// Block Dash — a blocky platformer with a built-in level editor.
(() => {
  "use strict";

  // ---------- constants ----------

  const H = 12; // level height in blocks (fixed — one screen tall)
  const AIR = ".";
  const ERASER = "X";

  const TILES = {
    g: { name: "Grass", solid: true },
    s: { name: "Stone", solid: true },
    m: { name: "Slime", solid: true },
    t: { name: "TNT" },
    h: { name: "Hidden TNT" },
    C: { name: "Save point" },
    // Hidden TNT sharing a square with an item. A square holds one letter, so
    // each combo gets its own: in play it looks like the item but explodes.
    1: { name: "Hidden TNT", over: "d" },
    2: { name: "Hidden TNT", over: "b" },
    3: { name: "Hidden TNT", over: "w" },
    4: { name: "Hidden TNT", over: "B" },
    5: { name: "Hidden TNT", over: "f" },
    d: { name: "Diamond" },
    b: { name: "Bolt" },
    w: { name: "Rose" },
    f: { name: "Wings" },
    E: { name: "End" },
    B: { name: "Bush" },
    P: { name: "Start" },
  };

  const PALETTE = ["g", "s", "m", "t", "h", "C", "d", "b", "w", "f", "E", "B", "P", ERASER];

  const isSolid = (ch) => !!(TILES[ch] && TILES[ch].solid);
  const overOf = (ch) => TILES[ch] && TILES[ch].over;
  const isHiddenTnt = (ch) => ch === "h" || !!overOf(ch);
  const TRAP_OVER = { d: "1", b: "2", w: "3", B: "4", f: "5" };

  // physics, in blocks and seconds
  const GRAVITY = 62;
  const JUMP_V = 17.5;
  const BOUNCE_V = 25;
  const SPEED_BASE = 7.5;
  const SPEED_FAST = 12;
  const SPEED_SLOW = 4.2;
  const EFFECT_TIME = 3;
  const FLY_THRUST = 110; // upward push while jump is held (beats GRAVITY)
  const FLY_UP_V = 10; // fastest climb
  const GLIDE_FALL = 3; // fastest fall with wings on and jump let go
  const PLAYER_W = 0.7;
  const PLAYER_H = 0.9;
  const COYOTE = 0.1;
  const JUMP_BUFFER = 0.14;

  const STORE_KEY = "blockdash_levels_v1";
  const BEST_KEY = "blockdash_best_v1";
  const DEV_KEY = "blockdash_dev_v1";

  const root = document.getElementById("bd-root");

  // Dev mode gates the Art Studio: it's for building the art that ships in
  // blockdash-artpack.js, not something a random visitor should stumble into.
  // On automatically when serving locally; elsewhere add ?dev=1 to the URL once
  // (it sticks in this browser) and ?dev=0 to turn it back off.
  const devMode = (() => {
    const flag = new URLSearchParams(location.search).get("dev");
    try {
      if (flag === "1" || flag === "on") localStorage.setItem(DEV_KEY, "1");
      if (flag === "0" || flag === "off") localStorage.removeItem(DEV_KEY);
    } catch (e) { /* private browsing — fall through to the URL flag */ }
    if (flag === "1" || flag === "on") return true;
    if (flag === "0" || flag === "off") return false;
    if (["localhost", "127.0.0.1", "[::1]", ""].includes(location.hostname)) return true;
    try {
      return localStorage.getItem(DEV_KEY) === "1";
    } catch (e) {
      return false;
    }
  })();

  // set by the editor; used to warn before losing unsaved work
  let editorDirty = false;

  // ---------- tiny helpers ----------

  const el = (tag, cls, html) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  };

  const clear = () => { root.innerHTML = ""; };

  const toast = (msg) => {
    const t = el("div", "toast", msg);
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 1800);
  };

  const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

  // ---------- storage ----------

  const loadLevels = () => {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      return [];
    }
  };

  const saveLevels = (levels) => {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(levels));
      return true;
    } catch (e) {
      toast("Could not save (storage full?)");
      return false;
    }
  };

  const getBest = (name) => {
    try {
      return (JSON.parse(localStorage.getItem(BEST_KEY) || "{}")[name]) || 0;
    } catch (e) {
      return 0;
    }
  };

  const setBest = (name, score) => {
    try {
      const all = JSON.parse(localStorage.getItem(BEST_KEY) || "{}");
      if (!(all[name] > score)) {
        all[name] = score;
        localStorage.setItem(BEST_KEY, JSON.stringify(all));
      }
    } catch (e) { /* ignore */ }
  };

  // ---------- grid helpers ----------

  const newGrid = (width) => {
    const g = Array.from({ length: H }, () => Array(width).fill(AIR));
    for (let x = 0; x < width; x++) g[H - 1][x] = "g"; // start with a floor
    g[H - 2][2] = "P";
    return g;
  };

  const gridToRows = (g) => g.map((r) => r.join(""));

  const rowsToGrid = (rows) => {
    const width = Math.max(...rows.map((r) => r.length));
    return Array.from({ length: H }, (_, y) => {
      const row = rows[y] || "";
      return Array.from({ length: width }, (_, x) => {
        const ch = row[x];
        return ch && (TILES[ch] || ch === AIR) ? ch : AIR;
      });
    });
  };

  const resizeGrid = (g, width) =>
    g.map((row) =>
      Array.from({ length: width }, (_, x) => (x < row.length ? row[x] : AIR)),
    );

  const findSpawn = (g) => {
    const width = g[0].length;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < width; x++) {
        if (g[y][x] === "P") return { x, y };
      }
    }
    // no start block placed — drop in above the first floor we can find
    for (let x = 0; x < width; x++) {
      for (let y = H - 1; y >= 0; y--) {
        if (isSolid(g[y][x])) return { x, y: y - 1 };
      }
    }
    return { x: 1, y: H - 2 };
  };

  const countDiamonds = (g) => {
    let n = 0;
    for (const row of g) for (const ch of row) if (ch === "d") n++;
    return n;
  };

  // ---------- levels that ship with the game (blockdash-levels.js) ----------

  // Normalise anything that claims to be a level into { name, rows } with
  // exactly H rows of equal length, or throw.
  const normalizeLevel = (o, fallbackName) => {
    if (!o || typeof o !== "object" || !Array.isArray(o.rows) || !o.rows.length) {
      throw new Error("not a level");
    }
    const rows = o.rows.map(String);
    if (!rows.some((r) => r.length)) throw new Error("empty level");
    return {
      name: String(o.name || fallbackName || "Untitled"),
      rows: gridToRows(rowsToGrid(rows)),
    };
  };

  const builtinLevels = () =>
    (window.BLOCKDASH_LEVELS || []).flatMap((l, i) => {
      try {
        return [{ ...normalizeLevel(l, `Level ${i + 1}`), builtin: true }];
      } catch (e) {
        return [];
      }
    });

  // best scores are namespaced so a built-in and a custom level can share a name
  const bestKey = (lvl) => (lvl.builtin ? "b:" : "m:") + lvl.name;

  // ---------- files ----------

  const download = (filename, text, mime) => {
    const blob = new Blob([text], { type: mime || "application/json" });
    const url = URL.createObjectURL(blob);
    const a = el("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const slug = (s) =>
    s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "level";

  const levelJson = (lvl) =>
    JSON.stringify({ name: lvl.name, rows: lvl.rows }, null, 2) + "\n";

  // The whole My Levels list as a drop-in replacement for blockdash-levels.js
  const packJs = (levels) =>
    "// Built-in levels for Block Dash — the ones that ship with the game.\n" +
    "//\n" +
    "// This file is GENERATED. Build levels in the level maker, then use\n" +
    '// "Download pack" in the Level pack tools section and replace this whole\n' +
    "// file with the download. Don't hand-edit it.\n" +
    "window.BLOCKDASH_LEVELS = [\n" +
    levels
      .map((l) =>
        JSON.stringify({ name: l.name, rows: l.rows }, null, 2)
          .split("\n")
          .map((line) => "  " + line)
          .join("\n"),
      )
      .join(",\n") +
    (levels.length ? "\n" : "") +
    "];\n";

  // Accepts a .json level, a .json array of levels, or a blockdash-levels.js file
  const parseLevelFile = (text, filename) => {
    const trimmed = text.trim();
    let data;
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      data = JSON.parse(trimmed);
    } else {
      const start = trimmed.indexOf("[");
      const end = trimmed.lastIndexOf("]");
      if (start < 0 || end < start) throw new Error("no level data found");
      data = JSON.parse(trimmed.slice(start, end + 1));
    }
    const list = Array.isArray(data) ? data : [data];
    const base = (filename || "").replace(/\.[^.]*$/, "");
    return list.map((o, i) => normalizeLevel(o, list.length > 1 ? `${base} ${i + 1}` : base));
  };

  // ---------- share codes ----------

  const encodeLevel = (lvl) => {
    const json = JSON.stringify({ n: lvl.name, r: lvl.rows });
    const bytes = new TextEncoder().encode(json);
    let s = "";
    for (const b of bytes) s += String.fromCharCode(b);
    return btoa(s);
  };

  const decodeLevel = (code) => {
    const bin = atob(code.trim());
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    const o = JSON.parse(new TextDecoder().decode(bytes));
    if (!o || !Array.isArray(o.r) || !o.r.length) throw new Error("bad code");
    return { name: String(o.n || "Imported level"), rows: o.r.map(String) };
  };

  // ---------- block art (see blockdash-art.js) ----------

  const { drawTile, drawPlayer, drawExplosion, drawCloud, drawEraser } = window.BDArt;
  const Art = window.BDArt;

  // ---------- screen: main menu ----------

  const levelCard = (lvl, actions, num) => {
    const g = rowsToGrid(lvl.rows);
    const card = el("div", "level-card");
    const best = getBest(bestKey(lvl));
    if (num) card.appendChild(el("div", "num", num));
    card.appendChild(
      el("div", "name",
        `${lvl.name}<span class="meta">${g[0].length} blocks long · ` +
        `${countDiamonds(g)} diamonds${best ? ` · best ${best}` : ""}</span>`),
    );
    actions.forEach((b) => card.appendChild(b));
    return card;
  };

  // Play a list of levels back to back — finishing one offers up the next, and
  // diamonds carry over so a whole run has a single total.
  const playSeries = (levels, i, carried, onExit) =>
    showPlay(levels[i], onExit, false, {
      i,
      count: levels.length,
      carried,
      playNext: (total) => playSeries(levels, i + 1, total, onExit),
    });

  const stack = () => {
    const list = el("div", "row");
    list.style.flexDirection = "column";
    list.style.alignItems = "stretch";
    return list;
  };

  const showMenu = () => {
    clear();
    const levels = loadLevels();
    const builtin = builtinLevels();

    const head = el("div", "row");
    head.appendChild(el("h1", null, "Block Dash"));
    head.appendChild(el("div", "spacer"));
    if (devMode) {
      const artBtn = el("button", "small", "🎨 Art");
      artBtn.onclick = () => showArtStudio();
      head.appendChild(artBtn);
    }
    const home = el("a", "btn small", "← Pick Right");
    home.href = "index.html";
    head.appendChild(home);
    root.appendChild(head);
    root.appendChild(el("p", "sub", "Build a level. Then survive it."));

    // ---- levels that ship with the game ----
    if (builtin.length) {
      const bp = el("div", "panel");
      bp.appendChild(el("h2", null, "Levels"));
      const list = stack();
      builtin.forEach((lvl, i) => {
        const play = el("button", "green small", i ? "▶ Play" : "▶ Start");
        play.onclick = () => playSeries(builtin, i, 0, () => showMenu());
        const copy = el("button", "small", "✏ Copy & edit");
        copy.onclick = () => showEditor({ name: lvl.name + " copy", rows: lvl.rows }, -1);
        list.appendChild(levelCard(lvl, [play, copy], i + 1));
      });
      bp.appendChild(list);
      if (builtin.length > 1) {
        bp.appendChild(el("p", "hint",
          "Finish one level and it leads straight into the next. Diamonds add up " +
          "across the whole run."));
      }
      root.appendChild(bp);
    }

    // ---- levels saved in this browser ----
    const panel = el("div", "panel");
    panel.appendChild(el("h2", null, "My levels"));

    if (!levels.length) {
      panel.appendChild(
        el("div", "empty-note",
          "No levels yet!<br>Hit <b>+ New Level</b> to open the level maker<br>and build your first one."),
      );
    } else {
      const list = stack();
      // swapping two neighbours is how the play order (and the pack order) is set
      const move = (i, dir) => {
        const all = loadLevels();
        const j = i + dir;
        if (j < 0 || j >= all.length) return;
        [all[i], all[j]] = [all[j], all[i]];
        saveLevels(all);
        showMenu();
      };
      levels.forEach((lvl, i) => {
        const up = el("button", "small", "▲");
        up.title = "Play this one earlier";
        up.disabled = i === 0;
        up.onclick = () => move(i, -1);
        const down = el("button", "small", "▼");
        down.title = "Play this one later";
        down.disabled = i === levels.length - 1;
        down.onclick = () => move(i, 1);
        const play = el("button", "green small", i ? "▶ Play" : "▶ Start");
        play.onclick = () => playSeries(levels, i, 0, () => showMenu());
        const edit = el("button", "small", "✏ Edit");
        edit.onclick = () => showEditor(lvl, i);
        const share = el("button", "small", "⧉ Code");
        share.onclick = () => showShare(lvl);
        const file = el("button", "small", "⬇ File");
        file.onclick = () => {
          download(slug(lvl.name) + ".json", levelJson(lvl));
          toast("Saved " + slug(lvl.name) + ".json");
        };
        const del = el("button", "danger small", "🗑");
        del.onclick = () => {
          if (!confirm(`Delete "${lvl.name}"?`)) return;
          const all = loadLevels();
          all.splice(i, 1);
          saveLevels(all);
          showMenu();
        };
        const order = levels.length > 1 ? [up, down] : [];
        list.appendChild(levelCard(lvl, [...order, play, edit, share, file, del], i + 1));
      });
      panel.appendChild(list);
      if (levels.length > 1) {
        panel.appendChild(el("p", "hint",
          "The number is where a level comes in the run — use <b>▲ ▼</b> to move it. " +
          "<b>▶ Start</b> on level 1 plays straight through all of them."));
      }
    }

    const newBtn = el("button", "green wide", "+ New Level");
    newBtn.style.marginTop = "10px";
    newBtn.onclick = () => showEditor(null, -1);
    panel.appendChild(newBtn);
    root.appendChild(panel);

    // ---- share codes ----
    const imp = el("div", "panel");
    imp.appendChild(el("h2", null, "Level code"));
    imp.appendChild(el("p", "hint",
      "Paste a level code someone shared with you, then press Import."));
    const ta = el("textarea");
    ta.placeholder = "paste code here…";
    imp.appendChild(ta);
    const impBtn = el("button", "small", "Import");
    impBtn.style.marginTop = "8px";
    impBtn.onclick = () => {
      try {
        const lvl = normalizeLevel(decodeLevel(ta.value));
        const all = loadLevels();
        all.push(lvl);
        saveLevels(all);
        toast("Level imported!");
        showMenu();
      } catch (e) {
        toast("That code didn't work");
      }
    };
    imp.appendChild(impBtn);
    root.appendChild(imp);

    // ---- dev tools: turn saved levels into the game's built-in pack ----
    const pack = el("details", "panel");
    const sum = el("summary", null, "Level pack tools");
    sum.style.cursor = "pointer";
    sum.style.letterSpacing = "1px";
    sum.style.textTransform = "uppercase";
    pack.appendChild(sum);
    pack.appendChild(el("p", "hint",
      "For building the levels that ship with the game. <b>Download pack</b> " +
      "saves all of My Levels as <code>blockdash-levels.js</code>, in the order " +
      "they're listed above — drop that file into <code>docs/</code>, replacing " +
      "the old one, and those levels show up at the top of this page for " +
      "everyone, played in that same order. <b>Load file</b> reads a " +
      "<code>.json</code> level or a <code>blockdash-levels.js</code> pack back " +
      "into My Levels so you can keep editing them."));

    const packRow = el("div", "row");
    packRow.style.marginTop = "8px";

    const dlPack = el("button", "small", "⬇ Download pack (.js)");
    dlPack.disabled = !levels.length;
    dlPack.onclick = () => {
      download("blockdash-levels.js", packJs(levels), "text/javascript");
      toast(`Saved ${levels.length} level${levels.length === 1 ? "" : "s"}`);
    };

    const dlJson = el("button", "small", "⬇ Download all (.json)");
    dlJson.disabled = !levels.length;
    dlJson.onclick = () => {
      const data = levels.map((l) => ({ name: l.name, rows: l.rows }));
      download("blockdash-levels.json", JSON.stringify(data, null, 2) + "\n");
      toast("Saved blockdash-levels.json");
    };

    const fileInput = el("input");
    fileInput.type = "file";
    fileInput.accept = ".json,.js,application/json,text/javascript";
    fileInput.multiple = true;
    fileInput.style.display = "none";
    fileInput.onchange = async () => {
      const files = [...fileInput.files];
      fileInput.value = "";
      if (!files.length) return;
      const all = loadLevels();
      let added = 0;
      for (const f of files) {
        try {
          const parsed = parseLevelFile(await f.text(), f.name);
          parsed.forEach((lvl) => { all.push(lvl); added++; });
        } catch (e) {
          toast(`Couldn't read ${f.name}`);
        }
      }
      if (added) {
        saveLevels(all);
        toast(`Loaded ${added} level${added === 1 ? "" : "s"}`);
        showMenu();
      }
    };
    const loadBtn = el("button", "small", "⬆ Load file");
    loadBtn.onclick = () => fileInput.click();

    packRow.append(dlPack, dlJson, loadBtn, fileInput);
    pack.appendChild(packRow);
    if (builtin.length) {
      pack.appendChild(el("p", "hint",
        `Currently shipping ${builtin.length} built-in ` +
        `level${builtin.length === 1 ? "" : "s"}.`));
    }
    root.appendChild(pack);

    // ---- block reference ----
    const rules = el("div", "panel");
    rules.appendChild(el("h2", null, "Block rules"));
    const tbl = stack();
    tbl.style.gap = "6px";
    [
      ["g", "Grass — solid ground to run on"],
      ["s", "Stone — solid block, build walls and towers"],
      ["m", "Slime — land on it and you bounce way up"],
      ["t", "TNT — touch it and you explode. Game over!"],
      ["h", "Hidden TNT — invisible when you play. Hide it somewhere tempting!"],
      ["C", "Saving point — die after passing it and you come back here"],
      ["d", "Diamond — worth 10 points"],
      ["b", "Lightning — go super fast for 3 seconds"],
      ["w", "Wither rose — slows you down for 3 seconds"],
      ["f", "Wings + firework — hold jump to fly up, let go to glide. They come off at the next save point"],
      ["E", "End portal — finish the level here"],
      ["B", "Bush — just decoration, safe to touch"],
      ["P", "Start — where you spawn"],
    ].forEach(([ch, text]) => {
      const r = el("div", "row tight");
      const c = el("canvas");
      c.width = c.height = 30;
      drawTile(c.getContext("2d"), ch, 0, 0, 30, 0, false);
      r.appendChild(c);
      const label = el("span", "hint", text);
      label.style.flex = "1";
      r.appendChild(label);
      if (devMode) {
        const paint = el("button", "small", "🎨");
        paint.title = "Repaint this block";
        paint.onclick = () => showArtStudio(ch);
        r.appendChild(paint);
      }
      tbl.appendChild(r);
    });
    rules.appendChild(tbl);
    if (devMode) {
      rules.appendChild(el("p", "hint",
        "Hit 🎨 to repaint any block in the Art Studio."));
    }
    root.appendChild(rules);

    const legal = el("p", "hint",
      "An unofficial fan-made game with original art. Not affiliated with, " +
      "endorsed by, or connected to Mojang, Microsoft, or any other game.");
    legal.style.textAlign = "center";
    root.appendChild(legal);
  };

  const showShare = (lvl) => {
    clear();
    root.appendChild(el("h1", null, "Level code"));
    const p = el("div", "panel");
    p.appendChild(el("p", "hint",
      `Copy this code to share <b>${lvl.name}</b> with someone else.`));
    const ta = el("textarea");
    ta.value = encodeLevel(lvl);
    ta.readOnly = true;
    p.appendChild(ta);
    const row = el("div", "row");
    row.style.marginTop = "8px";
    const copy = el("button", "green small", "Copy");
    copy.onclick = () => {
      ta.select();
      try {
        navigator.clipboard ? navigator.clipboard.writeText(ta.value) : document.execCommand("copy");
        toast("Copied!");
      } catch (e) {
        toast("Select the text and copy it");
      }
    };
    const back = el("button", "small", "← Back");
    back.onclick = showMenu;
    row.append(copy, back);
    p.appendChild(row);
    root.appendChild(p);
  };

  // ---------- screen: art studio ----------

  // Paint box: greys, browns/skins, greens, teals/blues, purples, hots, pinks.
  const ART_COLORS = [
    "#000000", "#1c1c1a", "#3a3a48", "#5c5c5c", "#8a8a8a", "#b8b8b8", "#e6e6e6", "#ffffff",
    "#42230f", "#633718", "#8b5a2b", "#b8813f", "#d29a58", "#eab06a", "#f6d6a8", "#ffe9c9",
    "#1d3a12", "#3c7023", "#4a8b2c", "#5fa83c", "#7cb342", "#8bc34a", "#b6e06a", "#dff5a8",
    "#04565d", "#05777f", "#07aeb4", "#3ad0c8", "#8ff5ee", "#152438", "#093a80", "#0c4699",
    "#1f56a8", "#2f65b8", "#5aa9e6", "#6ec0ff", "#5b1f96", "#7b2fbe", "#a855e8", "#dcb6ff",
    "#7a1410", "#a8291f", "#d1402f", "#e5401f", "#ff6b3d", "#ff9800", "#ffc107", "#ffe98a",
    "#7a1a4a", "#c2185b", "#e91e63", "#ff8fb1", "#4a3520", "#9c6b43", "#23232c", "#6b4220",
  ];

  // px stays one flat array — but broken one image row per line, so a saved art
  // file is still readable and diffs a pixel change to a single line.
  const artJson = (art) => {
    const parts = Object.entries(art).map(([key, s]) => {
      const rows = [];
      for (let y = 0; y < s.h; y++) {
        rows.push("      " + s.px.slice(y * s.w, (y + 1) * s.w)
          .map((p) => JSON.stringify(p === undefined ? null : p)).join(","));
      }
      return `  ${JSON.stringify(key)}: {\n    "w": ${s.w},\n    "h": ${s.h},\n` +
        `    "px": [\n${rows.join(",\n")}\n    ]\n  }`;
    });
    return `{\n${parts.join(",\n")}\n}`;
  };

  // Accepts a .json art file or a blockdash-artpack.js pack
  const parseArtFile = (text) => {
    const trimmed = text.trim();
    if (trimmed.startsWith("{")) return JSON.parse(trimmed);
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start < 0 || end < start) throw new Error("no art data found");
    return JSON.parse(trimmed.slice(start, end + 1));
  };

  const artPackJs = (art) =>
    "// Built-in art for Block Dash — repainted sprites that ship with the game.\n" +
    "//\n" +
    "// This file is GENERATED. Paint sprites in the Art Studio, then use\n" +
    "// \"Download art pack\" and replace this whole file with the download. Don't\n" +
    "// hand-edit it. An empty pack means everyone gets the original pixel art.\n" +
    "//\n" +
    "// Anything painted in a player's own browser wins over this file.\n" +
    `window.BDArtPack = ${artJson(art)};\n`;

  // Draw a sprite into a canvas at its own aspect ratio, bottom-aligned.
  const spriteThumb = (key, boxW, boxH) => {
    const c = el("canvas");
    c.width = boxW;
    c.height = boxH;
    const sp = Art.SPRITES[key];
    const cx = c.getContext("2d");
    cx.imageSmoothingEnabled = false;
    if (!sp) return c;
    const sw = sp.width || sp.naturalWidth;
    const sh = sp.height || sp.naturalHeight;
    const scale = Math.min(boxW / sw, boxH / sh);
    const w = Math.round(sw * scale);
    const h = Math.round(sh * scale);
    cx.drawImage(sp, Math.round((boxW - w) / 2), boxH - h, w, h);
    return c;
  };

  const showArtStudio = (startKey) => {
    clear();

    const info = Art.SPRITE_INFO;
    let key = info.some((s) => s.key === startKey) ? startKey : info[0].key;
    let img = Art.getPixels(key);
    let color = "#e5401f";
    let tool = "pen"; // pen | fill | erase | pick
    let undoStack = [];

    const header = el("div", "row");
    header.appendChild(el("h1", null, "Art Studio"));
    header.appendChild(el("div", "spacer"));
    const backBtn = el("button", "small", "← Levels");
    backBtn.onclick = showMenu;
    header.appendChild(backBtn);
    root.appendChild(header);
    root.appendChild(el("p", "sub",
      "Repaint the blocks and the player. It saves itself in this browser — " +
      "use Art pack tools at the bottom to make it stick for everyone."));

    // ---- which sprite are we painting? ----
    const pickPanel = el("div", "panel");
    pickPanel.appendChild(el("h2", null, "Pick something to paint"));
    const pickGrid = el("div", "palette");
    const pickItems = {};
    info.forEach(({ key: k, label }) => {
      const item = el("div", "pal-item");
      const holder = el("div");
      item.appendChild(holder);
      const lbl = el("div", "lbl");
      item.appendChild(lbl);
      item.onclick = () => selectSprite(k);
      pickItems[k] = { item, holder, lbl, label };
      pickGrid.appendChild(item);
    });
    pickPanel.appendChild(pickGrid);
    root.appendChild(pickPanel);

    const refreshThumbs = () => {
      info.forEach(({ key: k }) => {
        const { item, holder, lbl, label } = pickItems[k];
        holder.innerHTML = "";
        holder.appendChild(spriteThumb(k, 32, 32));
        lbl.textContent = Art.isCustom(k) ? label + " ✎" : label;
        item.classList.toggle("sel", k === key);
      });
    };

    // ---- the paint grid ----
    const gridPanel = el("div", "panel");
    const title = el("h2", null, "");
    gridPanel.appendChild(title);
    const wrap = el("div", "art-wrap");
    const canvas = el("canvas");
    canvas.id = "art-canvas";
    const ctx = canvas.getContext("2d");
    wrap.appendChild(canvas);
    gridPanel.appendChild(wrap);

    const tools = el("div", "row tight");
    tools.style.marginTop = "8px";

    const toolBtns = {};
    const addTool = (id, label) => {
      const b = el("button", "small tool-btn", label);
      b.onclick = () => {
        tool = id;
        Object.entries(toolBtns).forEach(([t, n]) => n.classList.toggle("sel", t === tool));
      };
      toolBtns[id] = b;
      tools.appendChild(b);
    };
    addTool("pen", "✏ Paint");
    addTool("fill", "🪣 Fill");
    addTool("erase", "🧽 Rub out");
    addTool("pick", "💧 Grab colour");
    toolBtns.pen.classList.add("sel");

    const undoBtn = el("button", "small", "↶ Undo");
    undoBtn.onclick = () => {
      const prev = undoStack.pop();
      if (!prev) { toast("Nothing to undo"); return; }
      img.px = prev;
      commit();
    };
    const resetBtn = el("button", "small", "↺ Original");
    resetBtn.onclick = () => {
      if (!confirm(`Put ${pickItems[key].label} back the way it was?`)) return;
      Art.resetSprite(key);
      undoStack = [];
      img = Art.getPixels(key);
      render();
      refreshThumbs();
      renderPreview();
      toast("Back to the original");
    };
    tools.append(undoBtn, resetBtn);
    gridPanel.appendChild(tools);
    gridPanel.appendChild(el("p", "hint",
      "Tap or drag on the big grid to paint. <b>🪣 Fill</b> floods everything the " +
      "same colour that's touching, <b>🧽 Rub out</b> makes pixels see-through, and " +
      "<b>💧 Grab colour</b> picks a colour up off the picture."));
    root.appendChild(gridPanel);

    // ---- colours ----
    const colPanel = el("div", "panel");
    colPanel.appendChild(el("h2", null, "Colours"));
    const colRow = el("div", "row");
    const chip = el("input");
    chip.type = "color";
    chip.className = "color-chip";
    chip.value = color;
    chip.oninput = () => { setColor(chip.value, true); };
    colRow.appendChild(chip);
    const colLabel = el("span", "hint");
    colRow.appendChild(colLabel);
    colPanel.appendChild(colRow);

    const swatchWrap = el("div", "swatches");
    swatchWrap.style.marginTop = "8px";
    const swatches = [];
    ART_COLORS.forEach((hex) => {
      const sw = el("div", "swatch");
      sw.style.background = hex;
      sw.title = hex;
      sw.onclick = () => setColor(hex, false);
      swatches.push({ hex, node: sw });
      swatchWrap.appendChild(sw);
    });
    colPanel.appendChild(swatchWrap);
    colPanel.appendChild(el("p", "hint",
      "Tap a colour, or use the box on the left to mix your own."));
    root.appendChild(colPanel);

    const setColor = (hex, fromChip) => {
      color = hex.toLowerCase();
      if (!fromChip) chip.value = color;
      colLabel.textContent = color;
      swatches.forEach(({ hex: h, node }) => node.classList.toggle("sel", h === color));
      if (tool === "erase" || tool === "pick") toolBtns.pen.onclick();
    };

    // ---- preview at game size ----
    const prevPanel = el("div", "panel");
    prevPanel.appendChild(el("h2", null, "In the game"));
    const preview = el("div", "art-preview");
    prevPanel.appendChild(preview);
    root.appendChild(prevPanel);

    const renderPreview = () => {
      preview.innerHTML = "";
      [24, 40, 72].forEach((size) => {
        const sp = Art.SPRITES[key];
        const sw = sp.width || sp.naturalWidth;
        const sh = sp.height || sp.naturalHeight;
        const c = el("canvas");
        c.width = size;
        c.height = Math.round((size * sh) / sw);
        const cx = c.getContext("2d");
        cx.imageSmoothingEnabled = false;
        cx.drawImage(sp, 0, 0, c.width, c.height);
        preview.appendChild(c);
      });
    };

    // ---- saving, sharing, starting over ----
    const filePanel = el("details", "panel");
    const sum = el("summary", null, "Art pack tools");
    sum.style.cursor = "pointer";
    sum.style.letterSpacing = "1px";
    sum.style.textTransform = "uppercase";
    filePanel.appendChild(sum);
    filePanel.appendChild(el("p", "hint",
      "Your art is already saved in this browser. <b>Download art</b> saves a " +
      "backup you can load on another device. <b>Download art pack</b> saves " +
      "<code>blockdash-artpack.js</code> — drop that into <code>docs/</code>, " +
      "replacing the old one, and everyone who plays gets your art."));

    const fileRow = el("div", "row");
    fileRow.style.marginTop = "8px";

    const dlJson = el("button", "small", "⬇ Download art (.json)");
    dlJson.onclick = () => {
      const art = Art.customArt();
      if (!Object.keys(art).length) { toast("Nothing painted yet"); return; }
      download("blockdash-art.json", artJson(art) + "\n");
      toast("Saved blockdash-art.json");
    };

    const dlPack = el("button", "small", "⬇ Download art pack (.js)");
    dlPack.onclick = () => {
      download("blockdash-artpack.js", artPackJs(Art.customArt()), "text/javascript");
      toast("Saved blockdash-artpack.js");
    };

    const fileInput = el("input");
    fileInput.type = "file";
    fileInput.accept = ".json,.js,application/json,text/javascript";
    fileInput.style.display = "none";
    fileInput.onchange = async () => {
      const f = fileInput.files[0];
      fileInput.value = "";
      if (!f) return;
      try {
        const loaded = Art.applyPack(parseArtFile(await f.text()), true);
        if (!loaded.length) { toast("No art in that file"); return; }
        undoStack = [];
        img = Art.getPixels(key);
        render();
        refreshThumbs();
        renderPreview();
        toast(`Loaded ${loaded.length} sprite${loaded.length === 1 ? "" : "s"}`);
      } catch (e) {
        toast("Couldn't read that file");
      }
    };
    const loadBtn = el("button", "small", "⬆ Load art file");
    loadBtn.onclick = () => fileInput.click();

    const resetAllBtn = el("button", "danger small", "Reset ALL art");
    resetAllBtn.onclick = () => {
      if (!confirm("Throw away every painting and go back to the original art?")) return;
      Art.resetAllSprites();
      undoStack = [];
      img = Art.getPixels(key);
      render();
      refreshThumbs();
      renderPreview();
      toast("All art reset");
    };

    fileRow.append(dlJson, dlPack, loadBtn, resetAllBtn, fileInput);
    filePanel.appendChild(fileRow);
    root.appendChild(filePanel);

    // ---- painting ----

    const pushUndo = () => {
      undoStack.push(img.px.slice());
      if (undoStack.length > 80) undoStack.shift();
    };

    // Save straight away — a kid shouldn't have to remember a save button.
    const commit = () => {
      if (!Art.setPixels(key, img)) toast("Could not save (storage full?)");
      render();
      refreshThumbs();
      renderPreview();
    };

    const setPx = (x, y) => {
      if (x < 0 || y < 0 || x >= img.w || y >= img.h) return false;
      const i = y * img.w + x;
      const want = tool === "erase" ? null : color;
      if (img.px[i] === want) return false;
      img.px[i] = want;
      return true;
    };

    const floodFill = (x, y) => {
      if (x < 0 || y < 0 || x >= img.w || y >= img.h) return;
      const target = img.px[y * img.w + x];
      const want = tool === "erase" ? null : color;
      if (target === want) return;
      pushUndo();
      const stack = [[x, y]];
      while (stack.length) {
        const [cx, cy] = stack.pop();
        if (cx < 0 || cy < 0 || cx >= img.w || cy >= img.h) continue;
        const i = cy * img.w + cx;
        if (img.px[i] !== target) continue;
        img.px[i] = want;
        stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
      }
      commit();
    };

    let painting = false;
    let lastCell = null;

    // The canvas is sized to whatever space it has, so work the cell out from
    // the rendered box rather than a fixed pixel size.
    const cellFrom = (e) => {
      const r = canvas.getBoundingClientRect();
      return {
        x: Math.floor(((e.clientX - r.left) / r.width) * img.w),
        y: Math.floor(((e.clientY - r.top) / r.height) * img.h),
      };
    };

    canvas.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      const c = cellFrom(e);
      if (tool === "pick") {
        if (c.x < 0 || c.y < 0 || c.x >= img.w || c.y >= img.h) return;
        const hex = img.px[c.y * img.w + c.x];
        if (!hex) { toast("That bit is see-through"); return; }
        setColor(hex, false);
        return;
      }
      if (tool === "fill") { floodFill(c.x, c.y); return; }
      painting = true;
      pushUndo();
      lastCell = c;
      if (setPx(c.x, c.y)) render();
      if (canvas.setPointerCapture) canvas.setPointerCapture(e.pointerId);
    });

    canvas.addEventListener("pointermove", (e) => {
      if (!painting) return;
      const c = cellFrom(e);
      if (lastCell && c.x === lastCell.x && c.y === lastCell.y) return;
      // Fill in the cells a fast drag skipped over, or strokes come out dotty.
      let changed = false;
      if (lastCell) {
        const steps = Math.max(Math.abs(c.x - lastCell.x), Math.abs(c.y - lastCell.y));
        for (let i = 1; i < steps; i++) {
          changed = setPx(
            Math.round(lastCell.x + ((c.x - lastCell.x) * i) / steps),
            Math.round(lastCell.y + ((c.y - lastCell.y) * i) / steps),
          ) || changed;
        }
      }
      lastCell = c;
      if (setPx(c.x, c.y) || changed) render();
    });

    const endPaint = () => {
      if (!painting) return;
      painting = false;
      lastCell = null;
      commit();
    };
    canvas.addEventListener("pointerup", endPaint);
    canvas.addEventListener("pointercancel", endPaint);
    canvas.addEventListener("contextmenu", (e) => e.preventDefault());

    // ---- drawing the paint grid ----

    const render = () => {
      // one canvas pixel per screen pixel, as big as fits without scrolling
      const availW = Math.max(120, wrap.clientWidth - 12);
      const availH = clamp(window.innerHeight * 0.62, 200, 520);
      const z = clamp(Math.min(Math.floor(availW / img.w), Math.floor(availH / img.h)), 6, 30);
      if (canvas.width !== img.w * z) {
        canvas.width = img.w * z;
        canvas.height = img.h * z;
      }

      // checkerboard behind see-through pixels
      for (let y = 0; y < img.h; y++) {
        for (let x = 0; x < img.w; x++) {
          ctx.fillStyle = (x + y) % 2 ? "#23232c" : "#2e2e3a";
          ctx.fillRect(x * z, y * z, z, z);
        }
      }

      for (let y = 0; y < img.h; y++) {
        for (let x = 0; x < img.w; x++) {
          const hex = img.px[y * img.w + x];
          if (!hex) continue;
          ctx.fillStyle = hex;
          ctx.fillRect(x * z, y * z, z, z);
        }
      }

      ctx.lineWidth = 1;
      for (let x = 0; x <= img.w; x++) {
        ctx.strokeStyle = x % 4 ? "rgba(0,0,0,0.25)" : "rgba(255,255,255,0.22)";
        ctx.beginPath();
        ctx.moveTo(x * z + 0.5, 0);
        ctx.lineTo(x * z + 0.5, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y <= img.h; y++) {
        ctx.strokeStyle = y % 4 ? "rgba(0,0,0,0.25)" : "rgba(255,255,255,0.22)";
        ctx.beginPath();
        ctx.moveTo(0, y * z + 0.5);
        ctx.lineTo(canvas.width, y * z + 0.5);
        ctx.stroke();
      }
    };

    const selectSprite = (k) => {
      key = k;
      img = Art.getPixels(key);
      undoStack = [];
      title.textContent = `${pickItems[k].label} — ${img.w} × ${img.h}`;
      render();
      refreshThumbs();
      renderPreview();
    };

    const onResize = () => render();
    window.addEventListener("resize", onResize);
    // drop the listener once this screen is replaced
    const observer = new MutationObserver(() => {
      if (!document.body.contains(canvas)) {
        window.removeEventListener("resize", onResize);
        observer.disconnect();
      }
    });
    observer.observe(root, { childList: true });

    setColor(color, false);
    selectSprite(key);
  };

  // ---------- screen: editor ----------

  const showEditor = (existing, index) => {
    clear();

    let grid = existing ? rowsToGrid(existing.rows) : newGrid(48);
    let name = existing ? existing.name : "My Level " + (loadLevels().length + 1);
    let slot = index;
    let sel = "g";
    let mode = "draw"; // draw | pan
    editorDirty = false;
    const undoStack = [];

    const TS = 36; // editor block size in px

    const header = el("div", "row");
    header.appendChild(el("h1", null, "Level Maker"));
    header.appendChild(el("div", "spacer"));
    const backBtn = el("button", "small", "← Levels");
    backBtn.onclick = () => {
      if (editorDirty && !confirm("Leave without saving? Your changes will be lost.")) return;
      showMenu();
    };
    header.appendChild(backBtn);
    root.appendChild(header);

    // name + save row
    const namePanel = el("div", "panel");
    const nameRow = el("div", "row");
    const nameInput = el("input");
    nameInput.type = "text";
    nameInput.value = name;
    nameInput.placeholder = "Level name";
    nameInput.oninput = () => { name = nameInput.value; editorDirty = true; };
    const saveBtn = el("button", "green", "💾 Save");
    saveBtn.onclick = () => {
      const all = loadLevels();
      const lvl = { name: (nameInput.value || "Untitled").trim(), rows: gridToRows(grid) };
      if (slot >= 0 && slot < all.length) all[slot] = lvl;
      else { all.push(lvl); slot = all.length - 1; }
      if (saveLevels(all)) { editorDirty = false; toast("Saved!"); }
    };
    const testBtn = el("button", "", "▶ Test");
    testBtn.onclick = () => {
      const lvl = { name: (nameInput.value || "Untitled").trim(), rows: gridToRows(grid) };
      showPlay(lvl, () => showEditor(lvl, slot), true);
    };
    nameRow.append(nameInput, saveBtn, testBtn);
    namePanel.appendChild(nameRow);
    root.appendChild(namePanel);

    // palette
    const palPanel = el("div", "panel");
    palPanel.appendChild(el("h2", null, "Blocks"));
    const pal = el("div", "palette");
    const palItems = {};
    PALETTE.forEach((ch) => {
      const item = el("div", "pal-item" + (ch === sel ? " sel" : ""));
      const c = el("canvas");
      c.width = c.height = 32;
      const cx = c.getContext("2d");
      if (ch === ERASER) drawEraser(cx, 0, 0, 32);
      else drawTile(cx, ch, 0, 0, 32, 0, false);
      item.appendChild(c);
      item.appendChild(el("div", "lbl", ch === ERASER ? "Erase" : TILES[ch].name));
      item.onclick = () => {
        sel = ch;
        Object.values(palItems).forEach((n) => n.classList.remove("sel"));
        item.classList.add("sel");
      };
      palItems[ch] = item;
      pal.appendChild(item);
    });
    palPanel.appendChild(pal);
    root.appendChild(palPanel);

    // canvas
    const gridPanel = el("div", "panel");
    const wrap = el("div", "grid-wrap");
    const canvas = el("canvas");
    canvas.id = "editor-canvas";
    canvas.className = "draw-mode";
    const ctx = canvas.getContext("2d");
    wrap.appendChild(canvas);
    gridPanel.appendChild(wrap);

    // tools under the canvas
    const tools = el("div", "row tight");
    tools.style.marginTop = "8px";

    const modeBtn = el("button", "small", "✏ Draw");
    modeBtn.onclick = () => {
      mode = mode === "draw" ? "pan" : "draw";
      modeBtn.textContent = mode === "draw" ? "✏ Draw" : "✋ Scroll";
      canvas.classList.toggle("draw-mode", mode === "draw");
    };

    const undoBtn = el("button", "small", "↶ Undo");
    undoBtn.onclick = () => {
      const prev = undoStack.pop();
      if (!prev) { toast("Nothing to undo"); return; }
      grid = prev;
      editorDirty = true;
      render();
    };

    const leftBtn = el("button", "small", "◀");
    leftBtn.onclick = () => { wrap.scrollLeft -= TS * 8; };
    const rightBtn = el("button", "small", "▶");
    rightBtn.onclick = () => { wrap.scrollLeft += TS * 8; };

    const floorBtn = el("button", "small", "Fill floor");
    floorBtn.onclick = () => {
      pushUndo();
      for (let x = 0; x < grid[0].length; x++) grid[H - 1][x] = "g";
      editorDirty = true;
      render();
    };

    const shorterBtn = el("button", "small", "− Shorter");
    shorterBtn.onclick = () => setWidth(grid[0].length - 10);
    const longerBtn = el("button", "small", "+ Longer");
    longerBtn.onclick = () => setWidth(grid[0].length + 10);

    const clearBtn = el("button", "danger small", "Clear all");
    clearBtn.onclick = () => {
      if (!confirm("Erase the whole level?")) return;
      pushUndo();
      const w = grid[0].length;
      grid = Array.from({ length: H }, () => Array(w).fill(AIR));
      grid[H - 2][2] = "P";
      editorDirty = true;
      render();
    };

    const lenLabel = el("span", "hint");

    tools.append(modeBtn, undoBtn, leftBtn, rightBtn, floorBtn,
      shorterBtn, longerBtn, clearBtn, lenLabel);
    gridPanel.appendChild(tools);
    gridPanel.appendChild(
      el("p", "hint",
        "Tap or drag on the grid to place the selected block. " +
        "Switch to <b>✋ Scroll</b> if you want to swipe along the level instead of drawing. " +
        "Every level needs a <b>Start</b> block and an <b>End</b> portal.")
    );
    root.appendChild(gridPanel);

    const pushUndo = () => {
      undoStack.push(grid.map((r) => r.slice()));
      if (undoStack.length > 60) undoStack.shift();
    };

    const setWidth = (w) => {
      w = clamp(w, 20, 400);
      if (w === grid[0].length) return;
      pushUndo();
      grid = resizeGrid(grid, w);
      editorDirty = true;
      render();
    };

    const setCell = (cx, cy) => {
      const w = grid[0].length;
      if (cx < 0 || cx >= w || cy < 0 || cy >= H) return false;
      let ch = sel === ERASER ? AIR : sel;
      const cur = grid[cy][cx];
      // Hidden TNT and an item stack into one trapped square, in either order.
      if (ch === "h" && overOf(cur)) return false;
      if (ch === "h" && TRAP_OVER[cur]) ch = TRAP_OVER[cur];
      else if (TRAP_OVER[ch] && isHiddenTnt(cur)) ch = TRAP_OVER[ch];
      if (cur === ch) return false;
      if (ch === "P") {
        for (let y = 0; y < H; y++) {
          for (let x = 0; x < w; x++) if (grid[y][x] === "P") grid[y][x] = AIR;
        }
      }
      grid[cy][cx] = ch;
      editorDirty = true;
      return true;
    };

    const paint = (cx, cy) => {
      if (setCell(cx, cy)) render();
    };

    // pointer painting
    let painting = false;
    let lastCell = null;

    const cellFrom = (e) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: Math.floor((e.clientX - rect.left) / TS),
        y: Math.floor((e.clientY - rect.top) / TS),
      };
    };

    canvas.addEventListener("pointerdown", (e) => {
      if (mode !== "draw") return;
      e.preventDefault();
      painting = true;
      pushUndo();
      const c = cellFrom(e);
      lastCell = c;
      paint(c.x, c.y);
      if (canvas.setPointerCapture) canvas.setPointerCapture(e.pointerId);
    });

    canvas.addEventListener("pointermove", (e) => {
      if (!painting || mode !== "draw") return;
      const c = cellFrom(e);
      if (lastCell && c.x === lastCell.x && c.y === lastCell.y) return;
      // Pointer events are sampled coarsely — fill in the cells the drag
      // skipped over, or fast swipes leave gaps.
      if (lastCell) {
        const steps = Math.max(Math.abs(c.x - lastCell.x), Math.abs(c.y - lastCell.y));
        for (let i = 1; i < steps; i++) {
          setCell(
            Math.round(lastCell.x + ((c.x - lastCell.x) * i) / steps),
            Math.round(lastCell.y + ((c.y - lastCell.y) * i) / steps),
          );
        }
      }
      lastCell = c;
      paint(c.x, c.y);
    });

    const endPaint = () => { painting = false; lastCell = null; };
    canvas.addEventListener("pointerup", endPaint);
    canvas.addEventListener("pointercancel", endPaint);
    canvas.addEventListener("contextmenu", (e) => e.preventDefault());

    let animT = 0;
    let raf = null;

    const render = () => {
      const w = grid[0].length;
      if (canvas.width !== w * TS) {
        canvas.width = w * TS;
        canvas.height = H * TS;
      }
      lenLabel.textContent = `${w} blocks · ${countDiamonds(grid)} 💎`;

      // sky
      const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
      sky.addColorStop(0, "#5aa9e6");
      sky.addColorStop(1, "#bfe7ff");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      for (let y = 0; y < H; y++) {
        for (let x = 0; x < w; x++) {
          const ch = grid[y][x];
          if (ch !== AIR) {
            if (overOf(ch)) {
              drawTile(ctx, overOf(ch), x * TS, y * TS, TS, animT, false);
              drawTile(ctx, "h", x * TS, y * TS, TS, animT, false);
            } else {
              drawTile(ctx, ch, x * TS, y * TS, TS, animT, y > 0 && isSolid(grid[y - 1][x]));
            }
          }
        }
      }

      // grid lines + a marker every 5 columns
      ctx.strokeStyle = "rgba(0,0,0,0.12)";
      ctx.lineWidth = 1;
      for (let x = 0; x <= w; x++) {
        ctx.beginPath();
        ctx.moveTo(x * TS + 0.5, 0);
        ctx.lineTo(x * TS + 0.5, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y <= H; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * TS + 0.5);
        ctx.lineTo(canvas.width, y * TS + 0.5);
        ctx.stroke();
      }
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      ctx.font = `${Math.round(TS * 0.3)}px ui-monospace, monospace`;
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      for (let x = 0; x < w; x += 5) ctx.fillText(String(x), x * TS + 3, 3);
    };

    const tick = () => {
      animT += 1 / 60;
      render();
      raf = requestAnimationFrame(tick);
    };
    tick();

    // stop animating when we leave this screen
    const observer = new MutationObserver(() => {
      if (!document.body.contains(canvas)) {
        cancelAnimationFrame(raf);
        observer.disconnect();
      }
    });
    observer.observe(root, { childList: true });

  };

  // warn once, globally, if the editor has unsaved work when the tab closes
  window.addEventListener("beforeunload", (e) => {
    if (editorDirty) { e.preventDefault(); e.returnValue = ""; }
  });

  // ---------- screen: play ----------

  // `chain` links a level to the ones after it: { i, count, carried, playNext }.
  // Absent when a level is played on its own (from the editor's Test button).
  const showPlay = (level, onExit, fromEditor, chain) => {
    clear();

    const template = rowsToGrid(level.rows);
    const width = template[0].length;
    const spawn = findSpawn(template);

    const header = el("div", "row");
    header.appendChild(el("h1", null, level.name || "Level"));
    header.appendChild(el("div", "spacer"));
    const quit = el("button", "small", fromEditor ? "← Editor" : "← Levels");
    quit.onclick = () => { stop(); onExit(); };
    header.appendChild(quit);
    root.appendChild(header);

    const panel = el("div", "panel");
    const hud = el("div", "play-hud");
    const scoreEl = el("span", "score", "💎 0");
    const attEl = el("span", "att", "Attempt 1");
    const pctEl = el("span", "att", "0%");
    hud.append(scoreEl, pctEl, attEl);
    panel.appendChild(hud);

    if (chain && chain.count > 1) {
      const step = el("div", "play-step");
      step.innerHTML = `Level ${chain.i + 1} of ${chain.count}` +
        (chain.carried ? ` · ${chain.carried} carried over` : "");
      panel.appendChild(step);
    }

    const prog = el("div", "progress");
    const fill = el("div", "fill");
    prog.appendChild(fill);
    panel.appendChild(prog);
    prog.style.margin = "8px 0";

    const canvas = el("canvas");
    canvas.id = "play-canvas";
    canvas.width = 960;
    canvas.height = 540;
    panel.appendChild(canvas);
    const ctx = canvas.getContext("2d");

    const msgSlot = el("div");
    panel.appendChild(msgSlot);

    const jumpBtn = el("button", "green", "JUMP");
    jumpBtn.id = "jump-btn";
    jumpBtn.style.marginTop = "8px";
    panel.appendChild(jumpBtn);
    panel.appendChild(el("p", "hint",
      "Tap the screen, press SPACE or ▲ to jump. Hold to keep jumping."));
    root.appendChild(panel);

    const TS = canvas.height / H; // 45px per block
    const VIEW_COLS = canvas.width / TS;

    let grid, player, score, attempts = 0, state, camX, effect, effectT,
      rot, coyote, buffer, particles, deadT, time = 0, holding = false,
      checkpoint = null, flying = false;

    // fromStart: R / Play again. Otherwise (after dying) respawn at the last
    // checkpoint with the level as it was when you got there, so diamonds
    // grabbed before it stay grabbed.
    const reset = (fromStart) => {
      if (fromStart) checkpoint = null;
      const at = checkpoint || spawn;
      grid = (checkpoint ? checkpoint.grid : template).map((r) => r.slice());
      player = {
        x: at.x + 0.15,
        y: at.y + (1 - PLAYER_H),
        vy: 0,
        onGround: false,
      };
      score = checkpoint ? checkpoint.score : 0;
      scoreEl.textContent = "💎 " + score;
      state = "run";
      camX = clamp(player.x - VIEW_COLS * 0.32, 0, Math.max(0, width - VIEW_COLS));
      effect = null;
      effectT = 0;
      flying = false;
      rot = 0;
      coyote = 0;
      buffer = 0;
      particles = [];
      deadT = 0;
      attempts++;
      attEl.textContent = "Attempt " + attempts;
      msgSlot.innerHTML = "";
      jumpBtn.disabled = false;
    };

    const solidAt = (x, y) =>
      x >= 0 && x < width && y >= 0 && y < H && isSolid(grid[y][x]);

    const doJump = () => {
      if (state !== "run") return;
      if (player.onGround || coyote > 0) {
        player.vy = -JUMP_V;
        player.onGround = false;
        coyote = 0;
        buffer = 0;
      } else {
        buffer = JUMP_BUFFER;
      }
    };

    const explode = (cx, cy, colors) => {
      for (let i = 0; i < 34; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = 3 + Math.random() * 11;
        particles.push({
          x: cx, y: cy,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp - 4,
          life: 0.5 + Math.random() * 0.6,
          c: colors[(Math.random() * colors.length) | 0],
        });
      }
    };

    const die = () => {
      if (state !== "run") return;
      state = "dead";
      deadT = 0;
      explode(player.x + PLAYER_W / 2, player.y + PLAYER_H / 2,
        ["#ffd54a", "#ff8a3d", "#e04a2f", "#8c8c8c"]);
      jumpBtn.disabled = true;
    };

    const win = () => {
      if (state !== "run") return;
      state = "win";
      setBest(bestKey(level), score);
      jumpBtn.disabled = true;
      explode(player.x + PLAYER_W / 2, player.y + PLAYER_H / 2,
        ["#4fe0d8", "#b6fffa", "#ffd54a", "#c58bff"]);
      const carried = chain ? chain.carried : 0;
      const runTotal = carried + score;
      const more = chain && chain.i + 1 < chain.count;

      const box = el("div", "overlay-msg");
      box.innerHTML =
        `<div class="big">${more || !chain ? "Level Complete!" : "You Finished!"}</div>` +
        `<div>Score: ${score} · Best: ${getBest(bestKey(level))}</div>` +
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
        next.onclick = () => { stop(); chain.playNext(runTotal); };
        row.appendChild(next);
      }
      const again = el("button", more ? "small" : "green small", "▶ Play again");
      again.onclick = () => reset(true);
      const out = el("button", "small", fromEditor ? "← Editor" : "← Levels");
      out.onclick = () => { stop(); onExit(); };
      row.append(again, out);
      box.appendChild(row);
      msgSlot.innerHTML = "";
      msgSlot.appendChild(box);
      msgSlot.style.marginTop = "8px";
    };

    // --- physics ---
    const update = (dt) => {
      time += dt;

      for (const p of particles) {
        p.vy += 26 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt;
      }
      particles = particles.filter((p) => p.life > 0);

      if (state === "dead") {
        deadT += dt;
        if (deadT > 0.9) reset();
        return;
      }
      if (state !== "run") return;

      if (effect) {
        effectT -= dt;
        if (effectT <= 0) effect = null;
      }

      const speed = effect === "fast" ? SPEED_FAST : effect === "slow" ? SPEED_SLOW : SPEED_BASE;

      // horizontal
      const oldX = player.x;
      player.x += speed * dt;
      const y0 = Math.floor(player.y + 0.02);
      const y1 = Math.floor(player.y + PLAYER_H - 0.02);
      const rightCol = Math.floor(player.x + PLAYER_W);
      let hitRow = -1;
      for (let y = y0; y <= y1; y++) {
        if (solidAt(rightCol, y)) { hitRow = y; break; }
      }
      if (hitRow >= 0) {
        const overlap = player.y + PLAYER_H - hitRow;
        if (grid[hitRow][rightCol] === "m") {
          // Slime launches you off any side, not just the top.
          player.x = oldX;
          player.vy = -BOUNCE_V;
          player.onGround = false;
          rot = 0;
        } else if (player.vy >= 0 && overlap < 0.35) {
          // Clipped the very top of the block on the way down? Slide up onto
          // the ledge instead of exploding — much kinder than pure GD rules.
          player.y = hitRow - PLAYER_H;
          player.vy = 0;
          player.onGround = true;
          rot = 0;
        } else {
          player.x = oldX;
          die(); // ran straight into a wall
          return;
        }
      }

      // vertical
      player.vy += GRAVITY * dt;
      if (flying) {
        if (holding) {
          player.vy = Math.max(player.vy - FLY_THRUST * dt, -FLY_UP_V);
          if (Math.random() < 0.35) {
            particles.push({
              x: player.x + PLAYER_W * 0.3, y: player.y + PLAYER_H,
              vx: -2 - Math.random() * 3, vy: 2 + Math.random() * 3,
              life: 0.3 + Math.random() * 0.3,
              c: ["#ffd54a", "#ff8a3d", "#e04a2f", "#c58bff"][(Math.random() * 4) | 0],
            });
          }
        } else {
          player.vy = Math.min(player.vy, GLIDE_FALL);
        }
      }
      player.y += player.vy * dt;
      if (flying && player.y < 0) { player.y = 0; player.vy = Math.max(0, player.vy); }
      player.onGround = false;
      const cx0 = Math.floor(player.x + 0.02);
      const cx1 = Math.floor(player.x + PLAYER_W - 0.02);

      if (player.vy > 0) {
        const footRow = Math.floor(player.y + PLAYER_H);
        for (let x = cx0; x <= cx1; x++) {
          if (solidAt(x, footRow)) {
            player.y = footRow - PLAYER_H;
            if (grid[footRow][x] === "m") {
              player.vy = -BOUNCE_V;
              rot = 0;
            } else {
              player.vy = 0;
              player.onGround = true;
              rot = 0;
            }
            break;
          }
        }
      } else if (player.vy < 0) {
        const headRow = Math.floor(player.y);
        for (let x = cx0; x <= cx1; x++) {
          if (solidAt(x, headRow)) {
            player.y = headRow + 1;
            player.vy = 0;
            break;
          }
        }
      }

      coyote = player.onGround ? COYOTE : Math.max(0, coyote - dt);
      if (buffer > 0) {
        buffer -= dt;
        if (player.onGround) doJump();
      }
      if (holding && player.onGround) doJump();
      if (flying) rot = holding ? -0.25 : 0.1; // nose up when climbing
      else if (!player.onGround) rot += dt * 7;

      // items — a slightly smaller box, so near-misses are forgiving
      const inset = 0.14;
      const ix0 = Math.floor(player.x + inset);
      const ix1 = Math.floor(player.x + PLAYER_W - inset);
      const iy0 = Math.floor(player.y + inset);
      const iy1 = Math.floor(player.y + PLAYER_H - inset);
      for (let y = iy0; y <= iy1; y++) {
        for (let x = ix0; x <= ix1; x++) {
          if (x < 0 || x >= width || y < 0 || y >= H) continue;
          const ch = grid[y][x];
          if (ch === "t") { die(); return; }
          if (isHiddenTnt(ch)) { die(); return; }
          if (ch === "C") {
            // Wings come off here, so each stretch between save points
            // has to earn its own pair.
            flying = false;
            grid[y][x] = "checkpointOn";
            checkpoint = { x, y, score, grid: grid.map((r) => r.slice()) };
            toast("Checkpoint!");
          }
          if (ch === "d") {
            grid[y][x] = AIR;
            score += 10;
            scoreEl.textContent = "💎 " + score;
          } else if (ch === "b") {
            effect = "fast";
            effectT = EFFECT_TIME;
          } else if (ch === "w") {
            effect = "slow";
            effectT = EFFECT_TIME;
          } else if (ch === "f") {
            grid[y][x] = AIR;
            flying = true;
          } else if (ch === "E") {
            win();
            return;
          }
        }
      }

      if (player.y > H + 1) { die(); return; }
      if (player.x > width) { win(); return; }

      camX = clamp(player.x - VIEW_COLS * 0.32, 0, Math.max(0, width - VIEW_COLS));

      const pct = clamp(Math.round((player.x / width) * 100), 0, 100);
      fill.style.width = pct + "%";
      pctEl.textContent = pct + "%";
    };

    // --- rendering ---
    const drawBackground = () => {
      const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
      if (effect === "fast") { sky.addColorStop(0, "#e8a93a"); sky.addColorStop(1, "#ffe6a8"); }
      else if (effect === "slow") { sky.addColorStop(0, "#3a3a4a"); sky.addColorStop(1, "#8f8fa5"); }
      else { sky.addColorStop(0, "#4c9fe0"); sky.addColorStop(1, "#bfe7ff"); }
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // clouds (slow parallax)
      const span = canvas.width + 400;
      for (let i = 0; i < 7; i++) {
        const size = 110 + (i % 3) * 55;
        let x = ((i * 337 - camX * TS * 0.22) % span + span) % span - 200;
        const y = 20 + ((i * 71) % 110);
        drawCloud(ctx, x, y, size);
      }

      // blocky hills on the horizon (faster parallax, always behind the floor)
      const groundY = canvas.height - TS;
      const hspan = canvas.width + 520;
      for (let i = 0; i < 10; i++) {
        const x = ((i * 260 - camX * TS * 0.5) % hspan + hspan) % hspan - 260;
        const hgt = 40 + ((i * 53) % 70);
        ctx.fillStyle = "rgba(72, 116, 58, 0.45)";
        ctx.fillRect(x, groundY - hgt, 200, hgt + TS);
        ctx.fillStyle = "rgba(110, 170, 80, 0.45)";
        ctx.fillRect(x, groundY - hgt, 200, 10);
      }
    };

    const render = () => {
      drawBackground();

      const startX = Math.max(0, Math.floor(camX) - 1);
      const endX = Math.min(width - 1, Math.ceil(camX + VIEW_COLS) + 1);
      for (let x = startX; x <= endX; x++) {
        for (let y = 0; y < H; y++) {
          const ch = grid[y][x];
          if (ch !== AIR && ch !== "P" && ch !== "h") {
            drawTile(ctx, overOf(ch) || ch, (x - camX) * TS, y * TS, TS, time,
              y > 0 && isSolid(grid[y - 1][x]));
          }
        }
      }

      if (state !== "dead" && flying) {
        const ws = TS * 1.5;
        const flap = Math.sin(time * (holding ? 22 : 8)) * TS * 0.08;
        drawTile(ctx, "wingsWorn",
          (player.x + PLAYER_W / 2 - camX) * TS - ws / 2,
          (player.y + PLAYER_H * 0.45) * TS - ws / 2 + flap, ws, time, false);
      }
      if (state !== "dead") {
        drawPlayer(ctx, (player.x - camX) * TS, player.y * TS,
          PLAYER_W * TS, PLAYER_H * TS, rot);
      }

      for (const p of particles) {
        ctx.globalAlpha = clamp(p.life, 0, 1);
        ctx.fillStyle = p.c;
        ctx.fillRect((p.x - camX) * TS, p.y * TS, TS * 0.16, TS * 0.16);
      }
      ctx.globalAlpha = 1;

      if (effect) {
        ctx.fillStyle = effect === "fast" ? "#ffd54a" : "#c9c9d6";
        ctx.font = "bold 26px ui-monospace, monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillText(effect === "fast" ? "⚡ FAST!" : "🥀 SLOW…", canvas.width / 2, 16);
      }
      if (flying && state === "run") {
        const y = effect ? 52 : 16;
        ctx.fillStyle = "#e2dcf2";
        ctx.font = "bold 26px ui-monospace, monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillText("🪽 FLY! hold jump", canvas.width / 2, y);
      }

      if (state === "dead") {
        ctx.fillStyle = "rgba(0,0,0,0.35)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        drawExplosion(ctx,
          (player.x + PLAYER_W / 2 - camX) * TS,
          (player.y + PLAYER_H / 2) * TS,
          TS * 3.2, deadT);
        ctx.fillStyle = "#ff6b6b";
        ctx.font = "bold 46px ui-monospace, monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("BOOM!", canvas.width / 2, canvas.height / 2);
      }
    };

    // --- loop ---
    const STEP = 1 / 120;
    let acc = 0;
    let last = performance.now();
    let raf = null;
    let running = true;

    const loop = (now) => {
      if (!running) return;
      let dt = (now - last) / 1000;
      last = now;
      if (dt > 0.1) dt = 0.1;
      acc += dt;
      let guard = 0;
      while (acc >= STEP && guard++ < 30) { update(STEP); acc -= STEP; }
      render();
      raf = requestAnimationFrame(loop);
    };

    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };

    const onKeyDown = (e) => {
      if (e.key === " " || e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
        e.preventDefault();
        if (!holding) doJump();
        holding = true;
      } else if (e.key === "r" || e.key === "R") {
        reset(true);
      }
    };
    const onKeyUp = (e) => {
      if (e.key === " " || e.key === "ArrowUp" || e.key === "w" || e.key === "W") holding = false;
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    const press = (e) => { e.preventDefault(); holding = true; doJump(); };
    const release = () => { holding = false; };
    canvas.addEventListener("pointerdown", press);
    canvas.addEventListener("pointerup", release);
    canvas.addEventListener("pointercancel", release);
    jumpBtn.addEventListener("pointerdown", press);
    jumpBtn.addEventListener("pointerup", release);
    jumpBtn.addEventListener("pointercancel", release);

    reset();
    loop(performance.now());
  };

  // ---------- go ----------
  showMenu();
})();
