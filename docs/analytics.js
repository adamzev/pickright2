// Google Analytics (GA4) for pickright2.com: page visits, plus Block Dash
// events (which levels get played, where players die, which screens they use).
//
// Only runs on the real site, so playing on localhost while building levels
// doesn't count as players. Ad features are switched off: this is only for
// seeing how the game is played, and many players are kids.
(() => {
  const MEASUREMENT_ID = "G-SRDSLMP9GP"; // "G-…" from the GA4 property's web stream; empty = off
  const live = MEASUREMENT_ID && /(^|\.)pickright2\.com$/.test(location.hostname);

  let send = () => {};
  if (live) {
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag("js", new Date());
    window.gtag("config", MEASUREMENT_ID, {
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
    });
    const tag = document.createElement("script");
    tag.async = true;
    tag.src = "https://www.googletagmanager.com/gtag/js?id=" + MEASUREMENT_ID;
    document.head.appendChild(tag);
    send = (name, params) => window.gtag("event", name, params);
  }

  // Player-made levels can be named anything, so only the official levels'
  // names are sent; the rest are just "custom".
  const levelName = (level) => (level && level.builtin ? level.name : level && level.daily ? "daily" : "custom");

  window.BDStats = {
    screen: (name) => send("screen_view", { screen_name: name }),
    started: (level, fromEditor) => send("level_start", { level: levelName(level), testing: !!fromEditor }),
    won: (level, deaths) => send("level_win", { level: levelName(level), deaths: deaths || 0 }),
    died: (level, how, x) => send("level_die", { level: levelName(level), how, at: Math.round(x) }),
  };
})();
