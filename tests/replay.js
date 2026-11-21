// Replay test for Block Dash: plays every level with scripted key presses and
// checks that each frame draws exactly what it drew last time.
//
//   npm test                 compare against tests/replay-golden.json
//   npm run test:update      save new results (after a change you meant to make)
//
// It runs the game in jsdom with a fake clock, a seeded Math.random and a
// canvas that only records its draw calls. Any change to how the game plays or
// looks shows up as a different fingerprint, and the report says which run and
// roughly when it first differs. Changes that are meant to happen (a new block,
// a tweaked jump) also show up here: check the game, then run test:update.
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { JSDOM } = require("jsdom");

const DOCS = path.join(__dirname, "..", "docs");
const GOLDEN = path.join(__dirname, "replay-golden.json");
const FRAMES = 2400; // 40 seconds at 60 frames a second
const CHUNK = 60; // one fingerprint per second of play keeps the golden file small

const html = fs.readFileSync(path.join(DOCS, "blockdash.html"), "utf8");
const scripts = [...html.matchAll(/<script src="([^"?]+)/g)].map((m) => m[1]);
const code = scripts.map((s) => fs.readFileSync(path.join(DOCS, s), "utf8"));
// Hand the test the play screen's entry points. This is the only change to the game's code.
const HOOK = "\n  window.__T = { showPlay, makeEndless, makeDaily, GLITCH_LEVEL };\n  showMenu();\n})();\n";
code[code.length - 1] = code[code.length - 1].replace(/\n  showMenu\(\);\n\}\)\(\);\s*$/, HOOK);
if (!code[code.length - 1].includes("window.__T")) throw new Error("blockdash.js no longer ends with showMenu(); })();");

// "rich" turns on the things you only see after playing a while: shop items,
// a pet, Badge Master's crown, the Glitch look and the 7-day rainbow trail.
const PROFILES = {
  empty: {},
  rich: {
    blockdash_bag_v1: { rods: 3, pearls: 2, eyes: 2, shields: 2, sword: 1, coins: 50, mega: 3 },
    blockdash_pets_v1: { owned: ["petCat"], pick: "petCat" },
    blockdash_badges_v1: { got: { master: 1, glitch: 1, first: 1 }, stats: {}, heard: [], cleared: [] },
    blockdash_daily_v1: { day: "2026-11-21", got: { 7: true }, streak: 8 },
  },
};

const seeded = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

function boot(profile) {
  const dom = new JSDOM(html.replace(/<script[^>]*><\/script>/g, ""), {
    url: "http://localhost:8765/blockdash.html", runScripts: "outside-only",
  });
  const w = dom.window;
  for (const [k, v] of Object.entries(PROFILES[profile])) w.localStorage.setItem(k, JSON.stringify(v));

  // a fixed day (for the daily level) and a clock that only moves when we say
  let now = 0;
  const DAY = new Date("2026-11-21T12:00:00Z").getTime();
  const RealDate = w.Date;
  w.Date = class extends RealDate {
    constructor(...a) { if (a.length) super(...a); else super(DAY + now); }
    static now() { return DAY + now; }
  };
  w.performance.now = () => now;
  w.Math.random = seeded(12345);
  let frame = null;
  w.requestAnimationFrame = (cb) => { frame = cb; return 1; };
  w.cancelAnimationFrame = () => { frame = null; };
  w.AudioContext = undefined;
  w.webkitAudioContext = undefined;
  w.HTMLMediaElement.prototype.play = () => Promise.resolve();
  w.HTMLMediaElement.prototype.pause = () => {};
  w.alert = () => {}; w.confirm = () => true; w.prompt = () => null;

  // canvases record what they're asked to draw
  let log = [];
  // Canvases set up while loading (sprites) are named "art", the rest by the
  // order play creates them, so adding new art doesn't renumber everything.
  let canvases = 0;
  let prefix = "art";
  const fmt = (v) => typeof v === "number" ? Math.round(v * 1000) / 1000
    : v && v.tagName ? v.tagName : v && v.__id ? v.__id : typeof v === "object" ? "obj" : v;
  w.HTMLCanvasElement.prototype.getContext = function () {
    if (this.__ctx) return this.__ctx;
    const id = prefix === "art" ? "art" : prefix + (++canvases);
    const target = { canvas: this, __id: id };
    this.__ctx = new Proxy(target, {
      get(t, k) {
        if (k in t) return t[k];
        if (k === "measureText") return (s) => ({ width: String(s).length * 7 });
        if (k === "createLinearGradient" || k === "createRadialGradient" || k === "createPattern") {
          return () => ({ __id: "grad", addColorStop: (...b) => log.push("stop" + b.map(fmt)) });
        }
        if (k === "getImageData") return (x, y, ww, hh) => ({ data: new Uint8ClampedArray(Math.max(1, ww * hh * 4)), width: ww, height: hh });
        if (k === "createImageData") return (ww, hh) => ({ data: new Uint8ClampedArray(ww * hh * 4), width: ww, height: hh });
        if (k === "getTransform") return () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 });
        if (k === "getLineDash") return () => [];
        return (...a) => { log.push(`${id}.${String(k)}(${a.map(fmt).join(",")})`); };
      },
      set(t, k, v) { t[k] = v; log.push(`${id}.${String(k)}=${fmt(v)}`); return true; },
    });
    return this.__ctx;
  };
  w.HTMLCanvasElement.prototype.toDataURL = () => "data:,";

  code.forEach((c, i) => w.eval(c + "\n//# sourceURL=" + scripts[i]));
  prefix = "cv";
  log = []; // drawing done while loading isn't part of play
  return {
    w,
    tick(ms) { now += ms; const cb = frame; frame = null; if (cb) cb(now); },
    takeLog() { const l = log; log = []; return l; },
  };
}

// A short run straight into a Boss portal, so the boss fight gets played.
const bossLevel = (l) => Object.assign({}, l, {
  name: l.name + " boss test",
  rows: Array.from({ length: 12 }, (_, y) => y === 11 ? "g".repeat(20) : y === 10 ? "..P..G" + ".".repeat(14) : ".".repeat(20)),
});
// A short run to the End, so winning and its buttons get played.
const winLevel = (l) => Object.assign({}, l, {
  name: "win test", arena: undefined,
  rows: Array.from({ length: 12 }, (_, y) => y === 11 ? "g".repeat(20) : y === 10 ? "..P.....E" + ".".repeat(11) : ".".repeat(20)),
});

function play(profile, which, seed) {
  const g = boot(profile);
  const { w } = g;
  const T = w.__T;
  const levels = w.BLOCKDASH_LEVELS;
  const lvl = which === "endless" ? T.makeEndless()
    : which === "daily" ? T.makeDaily()
    : which === "glitch" ? T.GLITCH_LEVEL
    : which.startsWith("win") ? winLevel(levels[0])
    : which.startsWith("boss:") ? bossLevel(levels.find((l) => l.name === which.slice(5)))
    : levels.find((l) => l.name === which);
  const editor = which === "win-editor";
  const chain = which === "win-chain" ? { i: 0, count: 2, carried: 5, playNext: () => {} } : undefined;
  const key = (type, k) => w.dispatchEvent(new w.KeyboardEvent(type, { key: k }));
  const errors = [];
  w.addEventListener("error", (e) => errors.push(String(e.message)));
  const chunks = [];
  try {
    T.showPlay(lvl, () => {}, editor, chain);
    const rnd = seeded(seed);
    const held = new Set();
    const clickOrder = ["Play again", "Next level", "Editor", "Levels", "Ghost"];
    let hash = crypto.createHash("md5");
    for (let f = 0; f < FRAMES; f++) {
      // every 6 frames maybe press or let go of something; even seeds also keep running right
      if (f % 6 === 0) {
        const r = rnd();
        const pick = r < 0.45 ? "ArrowRight" : r < 0.6 ? "ArrowLeft" : r < 0.9 ? " " : r < 0.97 ? "Shift" : r < 0.975 ? "r" : null;
        if (pick) {
          if (held.has(pick)) { key("keyup", pick); held.delete(pick); }
          else { key("keydown", pick); if (pick !== "r" && pick !== "Shift") held.add(pick); }
        }
        if (seed % 2 === 0 && !held.has("ArrowRight")) { key("keydown", "ArrowRight"); held.add("ArrowRight"); }
      }
      if (which.startsWith("win") && f % 300 === 299) {
        const want = clickOrder[(f / 300 | 0) % clickOrder.length];
        const b = [...w.document.querySelectorAll("button")].find((x) => x.textContent.includes(want));
        if (b) { b.dispatchEvent(new w.Event("pointerdown")); b.click(); }
      }
      g.tick(1000 / 60);
      hash.update(g.takeLog().join("\n") + "|" + w.document.getElementById("bd-root").textContent + "\n");
      if (f % CHUNK === CHUNK - 1) { chunks.push(hash.digest("hex").slice(0, 12)); hash = crypto.createHash("md5"); }
    }
  } catch (e) {
    errors.push("crashed: " + e.stack.split("\n").slice(0, 3).join(" "));
  }
  return { chunks, errors };
}

function allRuns() {
  const levels = boot("empty").w.BLOCKDASH_LEVELS;
  const which = [
    ...levels.map((l) => l.name),
    "endless", "daily", "glitch",
    ...levels.filter((l) => l.arena).map((l) => "boss:" + l.name),
    "win-editor", "win-chain",
  ];
  const runs = [];
  for (const p of Object.keys(PROFILES)) for (const x of which) for (const s of [1, 2]) runs.push([p, x, s]);
  return runs;
}

const update = process.argv.includes("--update");
const golden = !update && fs.existsSync(GOLDEN) ? JSON.parse(fs.readFileSync(GOLDEN, "utf8")) : null;
if (!update && !golden) { console.log("No saved results yet: run  npm run test:update"); process.exit(1); }

const results = {};
const problems = [];
for (const [p, x, s] of allRuns()) {
  const name = `${p} / ${x} / keys ${s}`;
  const r = play(p, x, s);
  results[name] = r.chunks;
  if (r.errors.length) problems.push(`${name}: ERROR ${r.errors.join("; ")}`);
  if (!golden) continue;
  const was = golden[name];
  if (!was) { problems.push(`${name}: new run, nothing saved to compare with`); continue; }
  const i = r.chunks.findIndex((h, j) => h !== was[j]);
  if (i >= 0 || r.chunks.length !== was.length) {
    problems.push(`${name}: plays differently from second ${i >= 0 ? i : was.length} on`);
  }
}
if (golden) for (const name of Object.keys(golden)) if (!results[name]) problems.push(`${name}: run no longer exists`);

const n = Object.keys(results).length;
if (update) {
  fs.writeFileSync(GOLDEN, JSON.stringify(results, null, 0).replace(/\],"/g, '],\n"') + "\n");
  console.log(`Saved results for ${n} runs to tests/replay-golden.json`);
  if (problems.length) { console.log(problems.join("\n")); process.exit(1); }
} else if (problems.length) {
  console.log(problems.join("\n"));
  console.log(`\n${problems.length} of ${n} runs changed. If you meant it, check the game, then: npm run test:update`);
  process.exit(1);
} else {
  console.log(`All ${n} runs play exactly as before.`);
}
