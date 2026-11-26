// Play counts: how many times each official level has been played and beaten,
// from the private pickright2-backend. Shown on the level cards.
//
// Each level is counted by its fixed `statId` (in blockdash-levels.js), so
// renaming a level keeps its count. Levels without one (players' own levels)
// aren't counted. Only the real site sends counts, and each browser counts a
// level at most once a day, so one player replaying a level all afternoon
// doesn't look like a crowd.
(() => {
  const API = "https://oyhcfkmrv5.execute-api.us-east-1.amazonaws.com/prod"; // the backend's ApiUrl output after `sam deploy`; empty = off
  const SENT_KEY = "blockdash_counted_v1";
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

  const record = (level, result) => {
    const id = idOf(level);
    if (!live || !id || alreadySent(id + ":" + result)) return;
    markSent(id + ":" + result);
    fetch(`${API}/stats/play-counts/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ result }),
    }).catch(() => {}); // a missed count never gets in the way of playing
  };

  // fetched once per page load, shared by every card
  let all = null;
  // (no fetch: the replay test's pretend browser, which shouldn't reach the real API)
  const counts = () => (all = all || (API && typeof window.fetch === "function" ? fetch(`${API}/stats/play-counts`).then((r) => r.json()).catch(() => ({})) : Promise.resolve({})));

  // adds "· ▶ 123 plays" to a level card once the counts arrive
  const show = (metaEl, level) => {
    const id = idOf(level);
    if (!id || !metaEl) return;
    counts().then((c) => {
      const n = c[id] && c[id].plays;
      if (n) metaEl.append(` · ▶ ${n.toLocaleString()} play${n === 1 ? "" : "s"}`);
    });
  };

  window.BDPlayCounts = { record, show };
})();
