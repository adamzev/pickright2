// Block Dash badges: what you've earned, the counts behind them, and the
// "Badge unlocked!" pop-up. The game reports what happens through
// window.BDBadges; this file decides when that earns a badge.
(() => {
  "use strict";

  const KEY = "blockdash_badges_v1";

  // secret: hidden on the Badges screen until earned
  const LIST = [
    { id: "first", icon: "🥇", name: "First Win", how: "Finish any level" },
    { id: "explorer", icon: "🗺️", name: "Explorer", how: "Finish all the official levels" },
    { id: "diamonds", icon: "💎", name: "Diamond Hunter", how: "Grab 100 diamonds" },
    { id: "giveup", icon: "💀", name: "Never Give Up", how: "Die 100 times" },
    { id: "boss", icon: "🐉", name: "Boss Slayer", how: "Beat the TNT Mech" },
    { id: "bare", icon: "⚔️", name: "Bare Hands", how: "Beat the boss with no sword" },
    { id: "ghosts", icon: "👻", name: "Ghostbuster", how: "Beat your ghost 10 times" },
    { id: "pets", icon: "🐾", name: "Pet Lover", how: "Own every pet" },
    { id: "dj", icon: "🎵", name: "DJ", how: "Listen to every song" },
    { id: "builder", icon: "🏗️", name: "Builder", how: "Make a level in the Level Maker" },
    { id: "rich", icon: "💰", name: "Rich", how: "Have 10,000 coins at once" },
    { id: "perfect", icon: "✨", name: "Perfect", how: "Finish a level without dying once" },
    { id: "cat", icon: "🐱", name: "Crazy Cat Person", how: "Cat player, cat pet and the Meow song, all at once", secret: true },
    { id: "goodboy", icon: "🐶", name: "Good Boy", how: "Finish a level with the dog pet and the Woof song", secret: true },
    { id: "oops", icon: "😵", name: "Oops", how: "Die within 1 second of starting a level", secret: true },
    { id: "kaboom", icon: "💥", name: "KABOOM", how: "Get blown up by TNT 50 times", secret: true },
    { id: "owl", icon: "🦉", name: "Night Owl", how: "Play after 10 o'clock at night", secret: true },
    { id: "clicky", icon: "🖱️", name: "Clicky Fingers", how: "Click the Block Dash title 10 times", secret: true },
    { id: "photo", icon: "🤏", name: "Photo Finish", how: "Beat your ghost by less than half a second", secret: true },
    { id: "silent", icon: "🔇", name: "Silent Runner", how: "Finish a level with no music", secret: true },
  ];
  const BY_ID = Object.fromEntries(LIST.map((b) => [b.id, b]));
  // counted badges: stat name -> [badge, how many]
  const COUNTS = { diamonds: ["diamonds", 100], deaths: ["giveup", 100], tnt: ["kaboom", 50], ghostWins: ["ghosts", 10] };

  // Re-read before every change, so a second open tab can't wipe out what
  // this one earned (or the other way round).
  let data;
  const load = () => {
    data = { got: {}, stats: {}, heard: [], cleared: [] };
    try {
      const d = JSON.parse(localStorage.getItem(KEY) || "{}") || {};
      if (d.got && typeof d.got === "object") data.got = d.got;
      if (d.stats && typeof d.stats === "object") data.stats = d.stats;
      if (Array.isArray(d.heard)) data.heard = d.heard;
      if (Array.isArray(d.cleared)) data.cleared = d.cleared;
    } catch (e) { /* no badges yet */ }
  };
  load();
  const save = () => {
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* ignore */ }
  };

  // ----- the pop-up, one at a time so several at once don't pile up -----
  const queue = [];
  let showing = false;
  const showNext = () => {
    if (showing || !queue.length) return;
    showing = true;
    const b = queue.shift();
    const pop = document.createElement("div");
    pop.className = "badge-pop";
    pop.innerHTML = `<div class="badge-pop-icon">${b.icon}</div>` +
      `<div><div class="badge-pop-title">🏅 Badge unlocked!</div><div class="badge-pop-name">${b.name}</div></div>`;
    document.body.appendChild(pop);
    setTimeout(() => pop.classList.add("out"), 2600);
    setTimeout(() => { pop.remove(); showing = false; showNext(); }, 3000);
  };

  // Once earned, a badge is never taken away (even if, say, a new song
  // makes "every song" a longer list).
  const earn = (id) => {
    load();
    if (!BY_ID[id] || data.got[id]) return;
    data.got[id] = Date.now();
    save();
    queue.push(BY_ID[id]);
    showNext();
  };

  const add = (stat, n = 1) => {
    load();
    data.stats[stat] = (data.stats[stat] || 0) + n;
    save();
    const c = COUNTS[stat];
    if (c && data.stats[stat] >= c[1]) earn(c[0]);
  };

  let titleClicks = 0;

  window.BDBadges = {
    LIST,
    has: (id) => { load(); return !!data.got[id]; },
    count: () => { load(); return LIST.filter((b) => data.got[b.id]).length; },
    earn,
    add,
    // a song started playing; allSongs is every song there is
    heard(song, allSongs) {
      load();
      if (!data.heard.includes(song)) { data.heard.push(song); save(); }
      if (allSongs.every((k) => data.heard.includes(k))) earn("dj");
    },
    // a level was finished; official: every official level's key
    cleared(key, official) {
      earn("first");
      load();
      if (!data.cleared.includes(key)) { data.cleared.push(key); save(); }
      if (official.length && official.every((k) => data.cleared.includes(k))) earn("explorer");
    },
    coins(n) { if (n >= 10000) earn("rich"); },
    titleClick() { if (++titleClicks >= 10) earn("clicky"); },
    nightCheck() {
      const h = new Date().getHours();
      if (h >= 22 || h < 5) earn("owl");
    },
  };
})();
