// Play counts, from the private pickright2-backend: for each official level,
// how many players started it, every attempt (each try, respawns included) and
// every win. Shown on the level cards, and under the game while you play,
// beside your own attempts and wins (kept in this browser only).
//
// Each level is counted by its fixed `statId` (in blockdash-levels.js), so
// renaming a level keeps its count. Levels without one (players' own levels)
// aren't counted. Only the real site sends counts, and each browser counts a
// level at most once a day, so one player replaying a level all afternoon
// doesn't look like a crowd.
(() => {
  const API = "https://oyhcfkmrv5.execute-api.us-east-1.amazonaws.com/prod"; // the backend's ApiUrl output after `sam deploy`; empty = off
  const SENT_KEY = "blockdash_counted_v1";
  const MINE_KEY = "blockdash_mystats_v1"; // your own attempts and wins, per level
  const live = API && /(^|\.)pickright2\.com$/.test(location.hostname);

  const idOf = (level) => (level && level.daily ? "daily" : level && level.builtin && level.statId) || null;

  const today = () => new Date().toISOString().slice(0, 10);
  const alreadySent = (key) => {
    try {
      const s = JSON.parse(localStorage.getItem(SENT_KEY) || "{}");
      if (s.day !== today()) return false;
      return s.sent.includes(key);
    } catch (e) { return false; }
  };
  const markSent = (key) => {
    try {
      const s = JSON.parse(localStorage.getItem(SENT_KEY) || "{}");
      const sent = s.day === today() ? s.sent : [];
      localStorage.setItem(SENT_KEY, JSON.stringify({ day: today(), sent: [...sent, key] }));
    } catch (e) { /* no storage: it just may count twice */ }
  };

  const send = (id, result) => {
    if (!live || !id) return;
    fetch(`${API}/stats/play-counts/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ result }),
    }).catch(() => {}); // a missed count never gets in the way of playing
  };

  // "start" counts players, so it goes at most once per browser per day
  const record = (level, result) => {
    const id = idOf(level);
    if (!id || alreadySent(id + ":" + result)) return;
    markSent(id + ":" + result);
    send(id, result);
  };

  const readMine = () => { try { return JSON.parse(localStorage.getItem(MINE_KEY) || "{}"); } catch (e) { return {}; } };
  const bumpMine = (key, field) => {
    const all = readMine();
    const m = all[key] || { attempts: 0, wins: 0 };
    m[field]++;
    all[key] = m;
    try { localStorage.setItem(MINE_KEY, JSON.stringify(all)); } catch (e) { /* no storage: counts just reset */ }
    return m;
  };

  const plural = (n, word) => `${n.toLocaleString()} ${word}${n === 1 ? "" : "s"}`;
  const pair = (c) => `${plural(c.attempts, "attempt")} · ${plural(c.wins, "win")}`;

  // The line under the game: your numbers, and everyone's for official levels.
  // `key` is the level's own key in this browser (the same one best scores use).
  const forPlay = (level, key, fromEditor) => {
    const el = document.createElement("div");
    el.className = "play-stats";
    if (fromEditor) return { el, attempt() {}, win() {} }; // testing from the Level Maker doesn't count
    const id = idOf(level);
    let mine = readMine()[key] || { attempts: 0, wins: 0 };
    let all = null;
    const render = () => {
      el.textContent = "";
      const you = document.createElement("span");
      you.textContent = "You: " + pair(mine);
      el.append(you);
      if (all) {
        const everyone = document.createElement("span");
        everyone.textContent = "Everyone: " + pair(all);
        el.append(everyone);
      }
    };
    if (id && API && typeof window.fetch === "function") {
      fetch(`${API}/stats/play-counts/${id}`).then((r) => r.json())
        .then((c) => { if (typeof c.attempts === "number") { all = c; render(); } }).catch(() => {});
    }
    render();
    const bump = (field, result) => {
      mine = bumpMine(key, field);
      if (all) all[field]++;
      send(id, result);
      render();
    };
    return { el, attempt: () => bump("attempts", "attempt"), win: () => bump("wins", "win") };
  };

  // fetched once per page load, shared by every card
  let all = null;
  // (no fetch: the replay test's pretend browser, which shouldn't reach the real API)
  const counts = () => (all = all || (API && typeof window.fetch === "function" ? fetch(`${API}/stats/play-counts`).then((r) => r.json()).catch(() => ({})) : Promise.resolve({})));

  // adds "· 1,240 attempts · 88 wins · 57 players" to a level card once the
  // counts arrive. "Players" is really player-days: each browser counts once a day.
  const show = (metaEl, level) => {
    const id = idOf(level);
    if (!id || !metaEl) return;
    counts().then((all) => {
      const c = all[id];
      if (c && (c.attempts || c.wins || c.plays)) {
        metaEl.append(` · ${plural(c.attempts || 0, "attempt")} · ${plural(c.wins || 0, "win")} · ${plural(c.plays || 0, "player")}`);
      }
    });
  };

  window.BDPlayCounts = { record, show, forPlay };
})();
