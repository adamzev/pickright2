// Play counts, from the private pickright2-backend: for each official level,
// how many players started it, every attempt (each try, respawns included) and
// every win. Under the game you see your own attempts and wins (kept in this
// browser only) beside everyone's; the levels list shows only your own.
//
// Each level is counted by its fixed `statId` (in blockdash-levels.js), so
// renaming a level keeps its count. Levels without one (players' own levels)
// aren't counted. Only the real site sends counts, and each browser counts a
// level at most once a day, so one player replaying a level all afternoon
// doesn't look like a crowd.
(() => {
  const API = "https://oyhcfkmrv5.execute-api.us-east-1.amazonaws.com/prod"; // the backend's ApiUrl output after `sam deploy`; empty = off
  const SENT_KEY = "blockdash_counted_v1";
  // Your own attempts and wins, per level: always every one you made. Any the
  // backend never confirmed (offline, a failed request, localhost) are also
  // kept as "unsent", and added to everyone's numbers on screen, so yours can
  // never be more than everyone's. (v2: v1 didn't track unsent ones.)
  const MINE_KEY = "blockdash_mystats_v2";
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

  // resolves true once the backend has counted it
  const send = (id, result) => {
    if (!live || !id) return Promise.resolve(false);
    return fetch(`${API}/stats/play-counts/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ result }),
    }).then((r) => r.ok, () => false); // a missed count never gets in the way of playing
  };

  // "start" counts players, so it goes at most once per browser per day
  const record = (level, result) => {
    const id = idOf(level);
    if (!id || alreadySent(id + ":" + result)) return;
    markSent(id + ":" + result);
    send(id, result);
  };

  const readMine = () => { try { return JSON.parse(localStorage.getItem(MINE_KEY) || "{}"); } catch (e) { return {}; } };
  const blank = () => ({ attempts: 0, wins: 0, unsentAttempts: 0, unsentWins: 0 });
  // adds `by` to each named field of this level's record, and returns it
  const bumpMine = (key, changes) => {
    const all = readMine();
    const m = { ...blank(), ...all[key] };
    for (const [field, by] of Object.entries(changes)) m[field] += by;
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
    let mine = { ...blank(), ...readMine()[key] };
    let all = null;
    const render = () => {
      el.textContent = "";
      const you = document.createElement("span");
      you.textContent = "You: " + pair(mine);
      el.append(you);
      if (all) {
        const everyone = document.createElement("span");
        // the backend's count plus yours it never got
        everyone.textContent = "Everyone: " + pair({ attempts: all.attempts + mine.unsentAttempts, wins: all.wins + mine.unsentWins });
        el.append(everyone);
      }
    };
    // Your counts are sent only after everyone's have loaded, so each one the
    // backend confirms is added on screen exactly once.
    let loaded = Promise.resolve();
    if (id && API && typeof window.fetch === "function") {
      loaded = fetch(`${API}/stats/play-counts/${id}`).then((r) => r.json())
        .then((c) => { if (typeof c.attempts === "number") { all = c; render(); } }).catch(() => {});
    }
    render();
    // counted for you straight away, and as unsent until the backend confirms it
    const bump = (field, unsent, result) => {
      mine = bumpMine(key, { [field]: 1, [unsent]: 1 });
      render();
      loaded.then(() => send(id, result)).then((ok) => {
        if (!ok) return;
        mine = bumpMine(key, { [unsent]: -1 });
        if (all) all[field]++;
        render();
      });
    };
    return { el, attempt: () => bump("attempts", "unsentAttempts", "attempt"), win: () => bump("wins", "unsentWins", "win") };
  };

  // a level card's "· you: 12 attempts · 3 wins" (the levels list shows only your own)
  const show = (metaEl, key) => {
    const m = readMine()[key];
    if (metaEl && m && m.attempts) metaEl.append(" · you: " + pair(m));
  };

  window.BDPlayCounts = { record, show, forPlay };
})();
