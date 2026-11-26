// Every official level needs a unique statId, or its plays aren't counted:
// the backend only accepts ids it finds in blockdash-levels.js.
global.window = {};
require("../docs/blockdash-levels.js");
const seen = new Set();
const bad = [];
for (const l of window.BLOCKDASH_LEVELS) {
  if (!/^[a-z0-9-]{1,40}$/.test(l.statId || "")) bad.push(`"${l.name}" has no statId (add one like "my-level")`);
  else if (seen.has(l.statId)) bad.push(`"${l.name}" reuses statId "${l.statId}"`);
  seen.add(l.statId);
}
if (bad.length) { console.error(bad.join("\n")); process.exit(1); }
console.log(`All ${seen.size} official levels have their own statId.`);
