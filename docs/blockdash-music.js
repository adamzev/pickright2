// Block Dash background music. Every song is played live by the browser's
// sound chip (Web Audio), so there are no music files to download.
// The game talks to it through window.BDMusic.
(() => {
  "use strict";

  const KEY = "blockdash-music";
  const SONGS = {
    fire: { name: "Rapid Fire", icon: "🔥", what: "Fast 8-bit. No relaxing." },
    calm: { name: "Background", icon: "🌙", what: "Slow and calm, for exploring." },
    boss: { name: "Boss Fight", icon: "💀", what: "Scary and loud. Also plays in every boss fight." },
    speed: { name: "Speedrun", icon: "🏃", what: "Even faster than Rapid Fire. Race the clock!" },
    nether: { name: "Nether", icon: "🌋", what: "Spooky, low and rumbly." },
    fortress: { name: "Fortress", icon: "🏰", what: "Marching drums. An army is coming." },
    end: { name: "The End", icon: "🌌", what: "Floaty, spacey and mysterious." },
    victory: { name: "Victory", icon: "🎉", what: "Happy and bouncy. You're winning!" },
    meow: { name: "Meow", icon: "🐱", what: "A happy sparkly cat song. Meow!" },
    woof: { name: "Woof", icon: "🐶", what: "Like Meow, but with dogs. Woof woof!" },
    frog: { name: "Frog Pond", icon: "🐸", what: "Bouncy, with ribbits and plops." },
    pirate: { name: "Pirate", icon: "🏴‍☠️", what: "A jolly sea-shanty bounce. Yo-ho!" },
    party: { name: "Party", icon: "🎂", what: "Dance beat with claps." },
    robot: { name: "Robot", icon: "🤖", what: "Beepy, bloopy computer sounds." },
    rain: { name: "Rainy Day", icon: "🌧️", what: "Soft and sleepy, with raindrops." },
    spooky: { name: "Spooky", icon: "🎃", what: "Halloween organ and ghosts. WoooOOooo!" },
    final: { name: "Final Boss", icon: "🏁", what: "Even scarier than Boss Fight." },
    // secret: only listed once you're a Badge Master
    champion: { name: "Champion", icon: "👑", what: "For a true Badge Master.", secret: true },
    // hidden: only ever plays in The Glitch's fight, never listed
    glitch: { name: "Glitch", icon: "🌀", what: "", hidden: true },
    off: { name: "No music", icon: "🔇", what: "Quiet. Boss fights stay quiet too." },
    // a level's own song, made in the Music Maker; only that level plays it
    custom: { name: "My song", icon: "🎼", what: "Made in the Music Maker.", hidden: true },
  };
  // every song gets a mega version, listed once it's unlocked in the shop
  for (const [k, sg] of Object.entries(SONGS)) {
    if (k === "off" || sg.hidden) continue;
    SONGS["mega_" + k] = { name: "Mega " + sg.name, icon: "✨", what: "The epic remix of " + sg.name + ".", mega: true, base: k };
  }
  const VOLUMES = { quiet: 0.25, mid: 0.55, loud: 1 };

  let settings = { song: "calm", vol: "mid" };
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || "{}") || {};
    if (SONGS[s.song] || /^my_/.test(s.song)) settings.song = s.song; // my_ ones arrive later (mine)
    if (VOLUMES[s.vol]) settings.vol = s.vol;
  } catch (e) { /* first visit */ }
  const save = () => {
    try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch (e) { /* ignore */ }
  };

  // Every visit starts quiet; the speaker button turns sound on. Not saved,
  // so nobody gets blasted by music they turned on last time.
  let muted = true;

  let ctx = null, master, echo, pulse, noise;
  let inBoss = false, levelSong = null, playing = null, bus = null, step = 0, nextT = 0, timer = 0;
  // Mega versions: a separate remix of each song, unlocked in the shop.
  // While one plays: section is which part of the remix we're in, shift
  // is the key change, and songDrums is off so the remix's own drums play.
  let upgraded = [], shift = 0, section = null, muffle = null, songDrums = true;

  const freq = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const MASTER_LEVEL = 0.36; // was 0.5: everything a bit quieter
  const HARSH = ["pulse", "square", "sawtooth"]; // these get their edges filed off (see tone)

  const setup = () => {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    const comp = ctx.createDynamicsCompressor();
    comp.connect(ctx.destination);
    master = ctx.createGain();
    master.gain.value = VOLUMES[settings.vol] * MASTER_LEVEL;
    // Softer overall: the very top is rounded off (it's what makes beeps
    // grate), and a little room echo makes it sound played, not printed.
    const tame = ctx.createBiquadFilter();
    tame.type = "lowpass";
    tame.frequency.value = 4500;
    tame.Q.value = 0.5;
    master.connect(tame).connect(comp);
    const room = ctx.createConvolver();
    const len = Math.floor(ctx.sampleRate * 1.6), ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = ir.getChannelData(ch);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    }
    room.buffer = ir;
    const roomLevel = ctx.createGain();
    roomLevel.gain.value = 0.22;
    tame.connect(room).connect(roomLevel).connect(comp);
    // a soft echo, mostly for the calm song's notes to ring out
    echo = ctx.createDelay(1);
    echo.delayTime.value = 0.42;
    const fb = ctx.createGain();
    fb.gain.value = 0.38;
    const wet = ctx.createGain();
    wet.gain.value = 0.5;
    echo.connect(fb).connect(echo);
    echo.connect(wet).connect(master);
    // a 25% pulse wave sounds more like an old game console than a plain
    // square; its high overtones are turned down so it's less buzzy
    const n = 32, re = new Float32Array(n), im = new Float32Array(n);
    for (let i = 1; i < n; i++) re[i] = (2 * Math.sin(i * Math.PI * 0.25)) / (i * Math.PI) / Math.pow(i, 0.6);
    pulse = ctx.createPeriodicWave(re, im);
    noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return true;
  };

  // ----- instruments -----

  const tone = (t, m, dur, o) => {
    if (section && !o.extra && remixNote(t, m, dur, o)) return;
    m += shift;
    if (o.slide != null) o = Object.assign({}, o, { slide: o.slide + shift });
    const osc = ctx.createOscillator();
    if (o.wave === "pulse") osc.setPeriodicWave(pulse);
    else osc.type = o.wave;
    osc.frequency.setValueAtTime(freq(m), t);
    if (o.detune) osc.detune.value = o.detune;
    // slide: glide to another note over the note's length (bloops, sirens)
    if (o.slide != null) osc.frequency.exponentialRampToValueAtTime(freq(o.slide), t + (o.decay || dur));
    const g = ctx.createGain();
    const harsh = HARSH.includes(o.wave);
    // a softer start, so notes don't click on
    const a = Math.max(o.attack || 0.005, harsh ? 0.012 : 0.005), peak = o.gain;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + a);
    if (o.decay) g.gain.exponentialRampToValueAtTime(0.0001, t + a + o.decay);
    else {
      g.gain.setValueAtTime(peak, t + Math.max(a, dur - 0.03));
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur + (o.release || 0.03));
    }
    let out = g;
    if (o.lowpass || harsh) {
      const f = ctx.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.value = o.lowpass || Math.min(2800, freq(m) * 6); // keep a few overtones, lose the fizz
      g.connect(f);
      out = f;
    }
    osc.connect(g);
    out.connect(bus);
    if (o.echo) out.connect(echo);
    osc.start(t);
    osc.stop(t + a + (o.decay || dur + (o.release || 0.03)) + 0.05);
  };

  const hiss = (t, dur, gain, type, f) => {
    const src = ctx.createBufferSource();
    src.buffer = noise;
    const flt = ctx.createBiquadFilter();
    flt.type = type;
    flt.frequency.value = f;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(flt).connect(g).connect(bus);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.02);
  };
  const hat = (t, gain = 0.12) => songDrums && hiss(t, 0.04, gain, "highpass", 7000);
  const snare = (t, gain = 0.3) => songDrums && hiss(t, 0.14, gain, "bandpass", 1800);
  const kick = (t, gain = 0.9) => {
    if (!songDrums) return;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.12);
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    osc.connect(g).connect(bus);
    osc.start(t);
    osc.stop(t + 0.2);
  };

  // A cat: the pitch slides up then down while a filter opens and closes,
  // which turns a buzz into "mee-ow".
  const meow = (t, m, dur = 0.38, gain = 0.25) => {
    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(freq(m), t);
    osc.frequency.linearRampToValueAtTime(freq(m + 4), t + dur * 0.35);
    osc.frequency.linearRampToValueAtTime(freq(m - 3), t + dur);
    const f = ctx.createBiquadFilter();
    f.type = "bandpass";
    f.Q.value = 4;
    f.frequency.setValueAtTime(700, t);
    f.frequency.linearRampToValueAtTime(2400, t + dur * 0.35);
    f.frequency.linearRampToValueAtTime(800, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.04);
    g.gain.setValueAtTime(gain, t + dur * 0.6);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(f).connect(g).connect(bus);
    g.connect(echo);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  };

  // A dog: two quick barks that drop in pitch, with a bit of breath.
  const bark = (t, m, gain = 0.3) => {
    for (const at of [0, 0.16]) {
      const osc = ctx.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(freq(m + 5), t + at);
      osc.frequency.exponentialRampToValueAtTime(freq(m - 7), t + at + 0.11);
      const f = ctx.createBiquadFilter();
      f.type = "bandpass";
      f.Q.value = 2;
      f.frequency.value = 1100;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t + at);
      g.gain.linearRampToValueAtTime(gain, t + at + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + at + 0.12);
      osc.connect(f).connect(g).connect(bus);
      osc.start(t + at);
      osc.stop(t + at + 0.15);
      hiss(t + at, 0.06, gain * 0.4, "bandpass", 1500);
    }
  };

  // A frog: a fast rattle of tiny buzzes, "rib-bit".
  const ribbit = (t, m, gain = 0.25) => {
    for (let part = 0; part < 2; part++) {
      for (let i = 0; i < 5; i++) {
        const at = t + part * 0.2 + i * 0.026;
        tone(at, m + part * 3, 0.018, { wave: "sawtooth", gain, lowpass: 1400 });
      }
    }
  };

  const clap = (t, gain = 0.3) => {
    if (!songDrums) return;
    for (const at of [0, 0.012, 0.024]) hiss(t + at, at < 0.02 ? 0.015 : 0.16, gain, "bandpass", 1400);
  };

  // An old church organ: a few pipes sounding at once
  const organ = (t, m, dur, gain = 0.06) => {
    for (const [up, g] of [[0, 1], [12, 0.6], [19, 0.35], [24, 0.25]]) {
      tone(t, m + up, dur, { wave: "sine", gain: gain * g, attack: 0.04, release: 0.25 });
    }
  };

  // A ghost: a wobbly whistle sliding up and back down
  const ghost = (t, m, dur = 1.6, gain = 0.1) => {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq(m), t);
    osc.frequency.linearRampToValueAtTime(freq(m + 7), t + dur * 0.4);
    osc.frequency.linearRampToValueAtTime(freq(m - 2), t + dur);
    const wob = ctx.createOscillator();
    wob.frequency.value = 6;
    const depth = ctx.createGain();
    depth.gain.value = 12;
    wob.connect(depth).connect(osc.frequency);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.3);
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(bus);
    g.connect(echo);
    osc.start(t);
    wob.start(t);
    osc.stop(t + dur + 0.05);
    wob.stop(t + dur + 0.05);
  };

  // Steady rain: soft, muffled noise that runs for a while
  const rainfall = (t, dur, gain = 0.05) => {
    const src = ctx.createBufferSource();
    src.buffer = noise;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = 1800;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.5);
    g.gain.setValueAtTime(gain, t + dur - 0.5);
    g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.3);
    src.connect(f).connect(g).connect(bus);
    src.start(t);
    src.stop(t + dur + 0.4);
  };

  // A tune where every entry is one step (for songs that aren't in 8ths)
  const noteEach = (mel, s) => {
    const i = s % mel.length;
    if (mel[i] == null) return null;
    let len = 1;
    while (len < mel.length && mel[(i + len) % mel.length] == null) len++;
    return [mel[i], len];
  };
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  // A melody is a list of 8th notes (null = keep holding). Returns the note
  // starting on this 16th step and how many steps it lasts.
  const noteAt = (mel, s) => {
    if (s % 2) return null;
    const i = (s / 2) % mel.length;
    if (mel[i] == null) return null;
    let len = 1;
    while (len < mel.length && mel[(i + len) % mel.length] == null) len++;
    return [mel[i], len * 2];
  };

  // ----- the songs: each plays one 16th-note step at time t -----

  const MINOR = [0, 3, 7, 12], MAJOR = [0, 4, 7, 12];
  const FIRE_BARS = [[57, MINOR], [53, MAJOR], [60, MAJOR], [55, MAJOR]]; // Am F C G
  const FIRE_LEAD = [
    81, null, 79, 81, 84, null, 81, 79,
    77, null, 76, 77, 81, null, 77, 76,
    79, null, 76, 79, 84, null, 83, 84,
    86, null, 83, 79, 83, null, 79, 74,
  ];
  const BOSS_ROOTS = [40, 40, 36, 38]; // E E C D
  const BOSS_LEAD = [
    76, null, null, 74, 75, null, null, 71,
    76, null, 79, null, 78, null, 75, null,
    72, null, null, 71, 72, null, 76, null,
    74, null, 78, null, 75, null, 71, null,
  ];
  const CALM_CHORDS = [[48, [0, 4, 7, 11]], [45, [0, 3, 7, 10]], [41, [0, 4, 7, 11]], [43, [0, 4, 7, 9]]];
  const CALM_NOTES = [72, 74, 76, 79, 81, 84, 86, 88];
  let calmAt = 3;

  // ----- the Music Maker's songs -----
  // A song is a row of boxes, one bar (16 steps) each. Every box has a premade
  // tune piece, how far it's moved up or down (p, in steps of the scale, so it
  // always stays in key) and a drum beat. The bass follows on its own.
  // { bpm, mood, sound, slots: [{ t: tune, p: up/down, b: beat }] }
  // Tunes are [step, note, length] with notes counted up the scale from the
  // home note (0); more can be added here and the Music Maker lists them.
  const MAKER = {
    SLOTS: 16,
    TUNES: {
      hop: { name: "Hop", icon: "🐇", notes: [[0, 0, 2], [2, 2, 2], [4, 4, 2], [6, 2, 2], [8, 0, 2], [10, 2, 2], [12, 4, 4]] },
      rocket: { name: "Rocket", icon: "🚀", notes: [[0, 0, 2], [2, 1, 2], [4, 2, 2], [6, 3, 2], [8, 4, 2], [10, 5, 2], [12, 6, 2], [14, 7, 2]] },
      parachute: { name: "Parachute", icon: "🪂", notes: [[0, 7, 2], [2, 6, 2], [4, 5, 2], [6, 4, 2], [8, 3, 2], [10, 2, 2], [12, 1, 2], [14, 0, 2]] },
      wave: { name: "Wave", icon: "🌊", notes: [[0, 2, 2], [2, 3, 2], [4, 4, 2], [6, 3, 2], [8, 2, 2], [10, 1, 2], [12, 0, 4]] },
      ding: { name: "Ding dong", icon: "🔔", notes: [[0, 4, 7], [8, 0, 7]] },
      fanfare: { name: "Fanfare", icon: "🎺", notes: [[0, 0, 1], [2, 0, 1], [4, 0, 1], [6, 4, 6], [12, 4, 1], [14, 7, 2]] },
      shout: { name: "Shout", icon: "📣", notes: [[0, 4, 2], [2, 4, 2], [4, 5, 2], [6, 4, 6], [12, 2, 4]] },
      stomp: { name: "Stomp", icon: "🥾", notes: [[0, 0, 3], [4, 0, 1], [6, 2, 2], [8, 4, 3], [12, 2, 4]] },
      jumpy: { name: "Jumpy", icon: "🦘", notes: [[0, 0, 2], [2, 7, 2], [4, 0, 2], [6, 7, 2], [8, 2, 2], [10, 9, 2], [12, 4, 2], [14, 9, 2]] },
      twirl: { name: "Twirl", icon: "🌀", notes: [[0, 4, 1], [1, 5, 1], [2, 4, 1], [3, 3, 1], [4, 4, 2], [8, 2, 1], [9, 3, 1], [10, 2, 1], [11, 1, 1], [12, 2, 4]] },
      sparkle: { name: "Sparkle", icon: "⭐", notes: [[0, 7, 1], [2, 9, 1], [4, 11, 1], [6, 9, 1], [8, 7, 1], [10, 9, 1], [12, 11, 1], [14, 14, 2]] },
      long: { name: "Long note", icon: "🐢", notes: [[0, 2, 15]] },
      end: { name: "The end", icon: "🏁", notes: [[0, 4, 2], [2, 2, 2], [4, 1, 2], [6, -1, 2], [8, 0, 8]] },
      quiet: { name: "Quiet", icon: "🤫", notes: [] },
    },
    // drums for one bar: kick, snare and hi-hat steps; bass: how the bass plays
    BEATS: {
      pop: { name: "Pop", icon: "🥁", k: [0, 8], s: [4, 12], h: [0, 2, 4, 6, 8, 10, 12, 14], bass: "half" },
      dance: { name: "Dance", icon: "💃", k: [0, 4, 8, 12], s: [4, 12], h: [2, 6, 10, 14], bass: "pump" },
      rock: { name: "Rock", icon: "🎸", k: [0, 7, 8, 10], s: [4, 12], h: [0, 2, 4, 6, 8, 10, 12, 14], bass: "pump" },
      march: { name: "March", icon: "🪖", k: [0, 8], s: [0, 3, 4, 8, 11, 12, 14], h: [], bass: "half" },
      soft: { name: "Soft", icon: "🌙", k: [0], s: [], h: [8], bass: "long" },
      roll: { name: "Drum roll", icon: "💥", k: [0], s: [8, 10, 12, 13, 14, 15], h: [], bass: "long" },
      none: { name: "No drums", icon: "🔇", k: [], s: [], h: [], bass: "long" },
    },
    MOODS: { happy: { name: "Happy", icon: "😀", scale: [0, 2, 4, 5, 7, 9, 11] }, spooky: { name: "Spooky", icon: "👻", scale: [0, 2, 3, 5, 7, 8, 10] } },
    SOUNDS: {
      beep: { name: "Beep", icon: "🎮", o: { wave: "pulse", gain: 0.16 } },
      bell: { name: "Bell", icon: "🔔", o: { wave: "sine", gain: 0.24, decay: 0.7, echo: true } },
      buzz: { name: "Buzz", icon: "🎸", o: { wave: "sawtooth", gain: 0.1, lowpass: 2200 } },
      flute: { name: "Flute", icon: "🪈", o: { wave: "triangle", gain: 0.28, attack: 0.03 } },
    },
  };
  let customSong = null;
  // a note counted up the scale from the home note, as a piano key number
  const scaleNote = (deg, mood, home) => {
    const sc = (MAKER.MOODS[mood] || MAKER.MOODS.happy).scale;
    return home + 12 * Math.floor(deg / 7) + sc[((deg % 7) + 7) % 7];
  };
  // How many bars (boxes' worth) a tune lasts: piano tunes can be up to 4.
  const tuneBars = (tune) => Math.max(1, Math.min(4, Math.ceil(Math.max(0, ...((tune && tune.notes) || []).map(([at, , len]) => at + len)) / 16)));
  // a song carries copies of any tunes made on the piano (song.tunes)
  const tuneIn = (song, k) => (song.tunes && song.tunes[k]) || MAKER.TUNES[k];
  // which box is playing at step s, and how far into it: [slot index, step in it]
  const slotAt = (song, s) => {
    const bars = song.slots.map((x) => tuneBars(tuneIn(song, x.t)));
    let bar = Math.floor(s / 16) % bars.reduce((a, b) => a + b, 0);
    for (let k = 0; k < bars.length; k++) {
      if (bar < bars[k]) return [k, bar * 16 + (s % 16)];
      bar -= bars[k];
    }
    return [0, 0];
  };
  const makerStep = (song, s, t, d) => {
    if (!song || !song.slots.length) return;
    const [k, local] = slotAt(song, s), slot = song.slots[k], i = s % 16;
    const tune = tuneIn(song, slot.t), beat = MAKER.BEATS[slot.b] || MAKER.BEATS.none;
    const o = (MAKER.SOUNDS[song.sound] || MAKER.SOUNDS.beep).o;
    if (tune) {
      for (const [at, deg, len] of tune.notes) {
        if (at === local) tone(t, scaleNote(deg + slot.p, song.mood, 72), d * len * 0.92, o);
      }
    }
    // the bass: the home note of where the tune's been moved to, down low
    const root = scaleNote(slot.p, song.mood, 36);
    const low = root >= 48 ? root - 12 : root;
    if (beat.bass === "pump" ? i % 2 === 0 : beat.bass === "half" ? i % 8 === 0 : i === 0) {
      tone(t, low + (beat.bass === "pump" && i % 4 === 2 ? 12 : 0), d * (beat.bass === "pump" ? 1.8 : beat.bass === "half" ? 7.5 : 15.5), { wave: "triangle", gain: 0.4 });
    }
    if (beat.k.includes(i)) kick(t);
    if (beat.s.includes(i)) snare(t);
    if (beat.h.includes(i)) hat(t);
  };
  const makerPlayer = (get) => ({ get bpm() { return (get() && get().bpm) || 120; }, step: (s, t, d) => makerStep(get(), s, t, d) });

  const PLAY = {
    custom: makerPlayer(() => customSong),
    fire: {
      bpm: 168,
      step(s, t, d) {
        const bar = Math.floor(s / 16) % 4, b = s % 16;
        const [root, chord] = FIRE_BARS[bar];
        if (b % 4 === 0) kick(t);
        if (b === 4 || b === 12) snare(t);
        if (b % 2) hat(t);
        if (b % 2 === 0) tone(t, root - 24 + ((b / 2) % 2 ? 12 : 0), d * 2, { wave: "triangle", gain: 0.5 });
        tone(t, root + 12 + chord[b % 4], d * 0.9, { wave: "square", gain: 0.06 });
        const n = noteAt(FIRE_LEAD, s % 64);
        if (n) tone(t, n[0], n[1] * d * 0.95, { wave: "pulse", gain: 0.18 });
      },
    },
    calm: {
      bpm: 66,
      step(s, t, d) {
        const bar = Math.floor(s / 16) % 8, b = s % 16;
        const [root, chord] = CALM_CHORDS[Math.floor(bar / 2)];
        if (b === 0 && bar % 2 === 0) {
          tone(t, root - 12, d * 30, { wave: "sine", gain: 0.3, attack: 0.8, release: 1.5 });
          for (const c of chord) tone(t, root + 12 + c, d * 30, { wave: "sine", gain: 0.05, attack: 2, release: 2 });
        }
        // a few soft piano-ish notes, different every time round
        if (b % 4 === 0 && Math.random() < (b === 0 ? 0.7 : 0.3)) {
          calmAt = Math.max(0, Math.min(CALM_NOTES.length - 1, calmAt + Math.floor(Math.random() * 5) - 2));
          tone(t, CALM_NOTES[calmAt], 0, { wave: "triangle", gain: 0.22, decay: 2.2, echo: true });
          if (Math.random() < 0.3) tone(t, CALM_NOTES[calmAt] - 12, 0, { wave: "sine", gain: 0.12, decay: 2.5, echo: true });
        }
      },
    },
    boss: {
      bpm: 150,
      step(s, t, d) {
        const bar = Math.floor(s / 16) % 4, b = s % 16;
        const root = BOSS_ROOTS[bar];
        if (b === 0 || b === 3 || b === 8 || b === 10) kick(t, 1);
        if (b === 4 || b === 12) snare(t, 0.4);
        if (b % 2 === 0) hat(t, 0.08);
        const bass = b === 14 ? root + 1 : b % 4 === 2 ? root + 12 : root;
        tone(t, bass, d * 0.9, { wave: "sawtooth", gain: 0.3, lowpass: 900 });
        if (b === 0) tone(t, root + 24, d * 14, { wave: "sawtooth", gain: 0.05, lowpass: 1400, attack: 0.3 });
        const n = noteAt(BOSS_LEAD, s % 64);
        if (n) tone(t, n[0], n[1] * d * 0.95, { wave: "pulse", gain: 0.16 });
        // second time round, an alarm-like high line on top
        if (Math.floor(s / 64) % 2 && b % 2) tone(t, (b % 4 === 1 ? 88 : 87), d * 0.8, { wave: "square", gain: 0.03 });
      },
    },
  };

  const SPEED_BARS = [[64, MAJOR], [59, MAJOR], [61, MINOR], [57, MAJOR]]; // E B C#m A
  const NETHER_NOTES = [62, 63, 65, 67, 68, 70, 74, 75];
  const FORT_ROOTS = [43, 41, 39, 38]; // Gm F Eb D
  const FORT_LEAD = [
    67, null, 67, 70, 74, null, 72, 70,
    69, null, 65, 69, 72, null, 70, 69,
    67, null, 70, 74, 79, null, 77, 75,
    74, null, 72, null, 67, null, null, null,
  ];
  const END_CHORDS = [[40, [0, 7, 14, 15, 19]], [36, [0, 7, 11, 16, 19]], [43, [0, 7, 11, 14, 16]], [38, [0, 7, 9, 14, 18]]];
  const VIC_BARS = [[48, MAJOR], [45, MINOR], [41, MAJOR], [43, MAJOR]]; // C Am F G
  const VIC_LEAD = [
    72, 76, 79, null, 76, 79, 84, null,
    81, null, 79, 76, 72, null, 76, null,
    77, 81, 84, null, 81, 77, 72, null,
    79, null, 83, null, 86, null, 84, null,
  ];
  const MEOW_BARS = [[53, MAJOR], [50, MINOR], [46, MAJOR], [48, MAJOR]]; // F Dm Bb C
  const MEOW_LEAD = [
    77, 79, 81, null, 79, 77, 72, null,
    74, 77, null, 74, 72, null, null, null,
    70, 74, 77, 82, 81, null, 77, null,
    79, null, 76, 79, 84, null, null, null,
  ];
  // [bar, step, note] of each meow, filling every gap in the tune
  const MEOWS = [
    [0, 6, 79], [0, 14, 77],
    [1, 4, 81], [1, 10, 76], [1, 13, 72],
    [2, 10, 79], [2, 14, 77],
    [3, 2, 81], [3, 10, 79], [3, 12, 76], [3, 14, 72],
  ];

  Object.assign(PLAY, {
    speed: {
      bpm: 188,
      step(s, t, d) {
        const bar = Math.floor(s / 16) % 4, b = s % 16;
        const [root, chord] = SPEED_BARS[bar];
        if (b % 4 === 0) kick(t);
        if (b === 4 || b === 12) snare(t);
        hat(t, b % 2 ? 0.1 : 0.05);
        tone(t, root - 24 + (b % 2 ? 12 : 0), d * 0.9, { wave: "triangle", gain: 0.45 });
        const run = [0, 1, 2, 3, 4, 3, 2, 1][b % 8];
        const up = Math.floor(s / 64) % 2 ? 12 : 0;
        tone(t, root + up + chord[run % 4] + (run === 4 ? 12 : 0), d * 0.85, { wave: "pulse", gain: 0.14 });
      },
    },
    nether: {
      bpm: 76,
      step(s, t, d) {
        const bar = Math.floor(s / 16) % 4, b = s % 16;
        if (s % 64 === 0) tone(t, 26, d * 62, { wave: "sawtooth", gain: 0.35, lowpass: 260, attack: 1.5, release: 1 });
        if (b === 0 || b === 3) kick(t, b ? 0.5 : 0.8);
        if (bar === 2 && (b === 0 || b === 8)) {
          tone(t, b ? 37 : 38, d * 7, { wave: "sawtooth", gain: 0.2, lowpass: 500, attack: 0.2 });
        }
        if (b % 4 === 2 && Math.random() < 0.35) {
          const m = NETHER_NOTES[Math.floor(Math.random() * NETHER_NOTES.length)];
          tone(t, m, 0, { wave: "triangle", gain: 0.16, decay: 1.6, echo: true });
        }
      },
    },
    fortress: {
      bpm: 112,
      step(s, t, d) {
        const bar = Math.floor(s / 16) % 4, b = s % 16;
        const root = FORT_ROOTS[bar];
        if (b === 0 || b === 8) kick(t);
        if (b === 4 || b === 12 || b === 14) snare(t, 0.3);
        if (bar === 3 && b >= 12) snare(t, 0.2 + (b - 12) * 0.05); // drum roll into the loop
        if (b % 2 === 0) tone(t, root + (b % 4 ? 7 : 0), d * 1.6, { wave: "triangle", gain: 0.45 });
        const n = noteAt(FORT_LEAD, s % 64);
        if (n) tone(t, n[0], n[1] * d * 0.9, { wave: "sawtooth", gain: 0.12, lowpass: 1600, attack: 0.02 });
        if (n && Math.floor(s / 64) % 2) tone(t, n[0] - 12, n[1] * d * 0.9, { wave: "sawtooth", gain: 0.08, lowpass: 1000 });
      },
    },
    end: {
      bpm: 70,
      step(s, t, d) {
        const bar = Math.floor(s / 16) % 8, b = s % 16;
        const [root, chord] = END_CHORDS[Math.floor(bar / 2)];
        if (b === 0 && bar % 2 === 0) {
          tone(t, root, d * 30, { wave: "sine", gain: 0.25, attack: 1.5, release: 2 });
          for (const c of chord.slice(1, 4)) tone(t, root + 12 + c, d * 30, { wave: "triangle", gain: 0.035, attack: 2.5, release: 2.5 });
        }
        if (b % 2 === 0) {
          const c = chord[[0, 1, 2, 3, 4, 3, 2, 1][(b / 2) % 8]];
          tone(t, root + 36 + c, 0, { wave: "sine", gain: 0.07, decay: 0.9, echo: true });
        }
        if (b === 8 && Math.random() < 0.4) tone(t, root + 48 + chord[4], 0, { wave: "sine", gain: 0.06, decay: 2.5, echo: true });
      },
    },
    victory: {
      bpm: 132,
      step(s, t, d) {
        const bar = Math.floor(s / 16) % 4, b = s % 16;
        const [root, chord] = VIC_BARS[bar];
        if (b % 4 === 0) kick(t, 0.7);
        if (b === 4 || b === 12) snare(t, 0.25);
        if (b % 4 === 2) hat(t, 0.12);
        if (b % 2 === 0) tone(t, root - 12 + (b % 4 ? 7 : 0), d * 1.5, { wave: "triangle", gain: 0.5 });
        if (b % 4 === 2) for (const c of chord.slice(0, 3)) tone(t, root + 12 + c, d * 0.8, { wave: "square", gain: 0.035 });
        const n = noteAt(VIC_LEAD, s % 64);
        if (n) tone(t, n[0], n[1] * d * 0.9, { wave: "pulse", gain: 0.17 });
      },
    },
    meow: {
      bpm: 144,
      step(s, t, d) {
        const bar = Math.floor(s / 16) % 4, b = s % 16;
        const [root, chord] = MEOW_BARS[bar];
        if (b % 4 === 0) tone(t, root - 12, d * 1.5, { wave: "triangle", gain: 0.5 }); // oom
        if (b % 4 === 2) for (const c of chord.slice(0, 3)) tone(t, root + 12 + c, d * 0.9, { wave: "pulse", gain: 0.045 }); // pah
        if (b % 2) hat(t, 0.06);
        if (b === 4 || b === 12) snare(t, 0.18);
        const n = noteAt(MEOW_LEAD, s % 64);
        if (n) tone(t, n[0], n[1] * d * 0.85, { wave: "square", gain: 0.11 });
        for (const [mb, ms, mm] of MEOWS) if (bar === mb && b === ms) meow(t, mm, mm < 76 ? 0.45 : 0.32);
        // every other time round, a big low cat joins in on each bar
        if (Math.floor(s / 64) % 2 && b === 0) meow(t, 67, 0.55, 0.22);
        // sparkles, a little different every time
        if (Math.random() < 0.18) tone(t, 96 + chord[Math.floor(Math.random() * 3)], 0, { wave: "triangle", gain: 0.04, decay: 0.3, echo: true });
      },
    },
  });

  const WOOF_BARS = [[48, MAJOR], [43, MAJOR], [45, MINOR], [41, MAJOR]]; // C G Am F
  const WOOF_LEAD = [
    72, 74, 76, null, 79, null, 76, null,
    74, null, 71, null, 67, null, null, null,
    72, 76, 81, null, 79, 76, 72, null,
    77, null, 76, null, 74, null, null, null,
  ];
  const WOOFS = [[0, 14, 62], [1, 9, 64], [1, 13, 60], [2, 14, 62], [3, 9, 65], [3, 13, 62]];

  const FROG_BARS = [[48, MAJOR], [53, MAJOR], [55, MAJOR], [48, MAJOR]]; // C F G C
  const FROG_LEAD = [
    72, null, 76, null, 79, null, null, null,
    77, null, 81, null, 84, null, null, null,
    83, null, 79, null, 74, null, null, null,
    76, null, 72, null, null, null, null, null,
  ];
  const RIBBITS = [[0, 10, 55], [1, 10, 57], [1, 13, 55], [2, 11, 59], [3, 7, 55], [3, 10, 52], [3, 13, 57]];

  // six 8th-note steps per bar: a jig
  const PIRATE_ROOTS = [50, 50, 48, 48, 46, 46, 45, 50]; // Dm Dm C C Bb Bb A Dm
  const PIRATE_LEAD = [
    62, null, 65, 69, null, 67,
    65, null, 64, 62, null, null,
    60, null, 64, 67, null, 65,
    64, null, 62, 60, null, null,
    58, null, 62, 65, null, 67,
    69, null, 70, 69, null, 65,
    64, null, 61, 57, null, 64,
    62, null, null, null, null, null,
  ];

  const PARTY_BARS = [[55, MAJOR], [52, MINOR], [48, MAJOR], [50, MAJOR]]; // G Em C D
  const PARTY_LEAD = [
    79, null, 79, 81, 83, null, 79, null,
    76, null, 76, 79, 83, null, 81, null,
    79, null, 76, null, 72, null, 76, 79,
    81, null, 79, null, 78, null, 74, null,
  ];

  const ROBOT_BARS = [[48, MINOR], [44, MAJOR], [51, MAJOR], [46, MAJOR]]; // Cm Ab Eb Bb

  const RAIN_CHORDS = [[45, [0, 7, 12, 15]], [41, [0, 7, 12, 16]], [48, [0, 7, 12, 16]], [43, [0, 7, 11, 14]]];
  const RAIN_NOTES = [69, 72, 74, 76, 79, 81];

  const SPOOKY_ROOTS = [38, 43, 45, 38]; // Dm Gm A Dm
  const SPOOKY_CHORDS = [[0, 3, 7], [0, 3, 7], [0, 4, 7], [0, 3, 7]];
  const SPOOKY_LEAD = [
    74, null, 72, 74, null, null, 69, null,
    70, null, 69, 67, null, null, 62, null,
    73, null, 76, null, 79, null, 76, 73,
    74, null, null, null, null, null, null, null,
  ];

  const FINAL_ROOTS = [40, 41, 40, 46]; // E F E Bb
  const FINAL_LEAD = [
    76, 75, 76, null, 79, null, 82, null,
    77, 76, 77, null, 80, null, 83, null,
    76, 75, 76, null, 79, 82, 85, 88,
    86, null, 82, null, 79, null, 76, null,
  ];

  Object.assign(PLAY, {
    woof: {
      bpm: 120,
      step(s, t, d) {
        const bar = Math.floor(s / 16) % 4, b = s % 16;
        const [root, chord] = WOOF_BARS[bar];
        if (b % 4 === 0) { tone(t, root - 12, d * 1.5, { wave: "triangle", gain: 0.5 }); kick(t, 0.5); }
        if (b % 4 === 2) for (const c of chord.slice(0, 3)) tone(t, root + 12 + c, d * 0.9, { wave: "pulse", gain: 0.045 });
        if (b === 4 || b === 12) snare(t, 0.2);
        if (b % 2) hat(t, 0.05);
        const n = noteAt(WOOF_LEAD, s % 64);
        if (n) tone(t, n[0], n[1] * d * 0.85, { wave: "square", gain: 0.1 });
        for (const [wb, ws, wm] of WOOFS) if (bar === wb && b === ws) bark(t, wm);
        // every other time round, a dog howls along at the end
        if (Math.floor(s / 64) % 2 && bar === 3 && b === 0) {
          tone(t, 67, d * 7, { wave: "sawtooth", gain: 0.08, lowpass: 1200, attack: 0.15, slide: 74 });
        }
      },
    },
    frog: {
      bpm: 112,
      step(s, t, d) {
        const bar = Math.floor(s / 16) % 4, b = s % 16;
        const [root, chord] = FROG_BARS[bar];
        if (b % 4 === 0) tone(t, root - 12 + (b % 8 ? 7 : 0), d * 1.5, { wave: "triangle", gain: 0.45 });
        if (b % 4 === 2) for (const c of chord.slice(0, 3)) tone(t, root + 12 + c, 0, { wave: "sine", gain: 0.07, decay: 0.25 });
        if (b % 2 === 0) hat(t, 0.04);
        const n = noteAt(FROG_LEAD, s % 64);
        if (n) tone(t, n[0], 0, { wave: "sine", gain: 0.22, decay: 0.5, echo: true }); // a wooden xylophone plink
        for (const [rb, rs, rm] of RIBBITS) if (bar === rb && rs === b) ribbit(t, rm);
        // something jumps in the pond now and then
        if (b % 4 === 3 && Math.random() < 0.15) tone(t, 72, 0, { wave: "sine", gain: 0.12, decay: 0.12, slide: 96 });
      },
    },
    pirate: {
      bpm: 75, // each step is an 8th note, six to a bar
      step(s, t, d) {
        const bar = Math.floor(s / 6) % 8, b = s % 6;
        const root = PIRATE_ROOTS[bar];
        const chord = root === 50 ? [0, 3, 7] : [0, 4, 7]; // D is minor, the rest major
        if (b === 0) { tone(t, root - 12, d * 2.5, { wave: "triangle", gain: 0.5 }); kick(t, 0.6); }
        if (b === 3) { tone(t, root - 5, d * 2.5, { wave: "triangle", gain: 0.4 }); snare(t, 0.12); }
        if (b === 2 || b === 5) for (const c of chord) tone(t, root + 12 + c, d * 0.8, { wave: "sawtooth", gain: 0.03, lowpass: 1800 });
        const n = noteEach(PIRATE_LEAD, s);
        if (n) {
          tone(t, n[0], n[1] * d * 0.9, { wave: "sawtooth", gain: 0.07, lowpass: 2200 }); // squeezebox
          tone(t, n[0] + 12, n[1] * d * 0.9, { wave: "pulse", gain: 0.05 });
        }
      },
    },
    party: {
      bpm: 124,
      step(s, t, d) {
        const bar = Math.floor(s / 16) % 4, b = s % 16;
        const [root, chord] = PARTY_BARS[bar];
        if (b % 4 === 0) kick(t, 1);
        if (b === 4 || b === 12) clap(t);
        if (b % 4 === 2) hiss(t, 0.12, 0.1, "highpass", 6000); // open hat
        else if (b % 2) hat(t, 0.05);
        if ([0, 3, 6, 8, 11, 14].includes(b)) tone(t, root - 12 + (b === 3 || b === 11 ? 12 : 0), d * 1.2, { wave: "sawtooth", gain: 0.25, lowpass: 600 });
        if (b === 2 || b === 7 || b === 10) for (const c of chord.slice(0, 3)) tone(t, root + 12 + c, d * 1.2, { wave: "square", gain: 0.035 });
        const n = noteAt(PARTY_LEAD, s % 64);
        if (n && Math.floor(s / 64) % 2) tone(t, n[0], n[1] * d * 0.9, { wave: "pulse", gain: 0.15 });
        // a party horn at the end of every second time round
        if (s % 128 === 120) tone(t, 76, d * 6, { wave: "sawtooth", gain: 0.07, lowpass: 2500, slide: 88 });
      },
    },
    robot: {
      bpm: 128,
      step(s, t, d) {
        const bar = Math.floor(s / 16) % 4, b = s % 16;
        const [root, chord] = ROBOT_BARS[bar];
        if (b % 4 === 0) kick(t);
        if (b === 4 || b === 12) snare(t, 0.25);
        if (b % 2) hat(t, 0.06);
        if (b % 2 === 0 || b === 7) tone(t, root - 12 + (b % 8 === 6 ? 12 : 0), d * 0.6, { wave: "square", gain: 0.12, lowpass: 900 });
        // the computer "talking": random chord notes, short and choppy
        if (Math.random() < 0.45) tone(t, root + 24 + pick(chord), d * 0.5, { wave: "square", gain: 0.05 });
        // bloops: quick slides up or down
        if (b % 8 === 6 && Math.random() < 0.6) {
          const up = Math.random() < 0.5;
          tone(t, up ? 72 : 96, d * 1.5, { wave: "square", gain: 0.06, slide: up ? 96 : 72 });
        }
      },
    },
    rain: {
      bpm: 60,
      step(s, t, d) {
        const bar = Math.floor(s / 16) % 8, b = s % 16;
        const [root, chord] = RAIN_CHORDS[Math.floor(bar / 2)];
        if (s % 128 === 0) rainfall(t, d * 128);
        if (b === 0 && bar % 2 === 0) {
          tone(t, root - 12, d * 30, { wave: "sine", gain: 0.25, attack: 1, release: 2 });
          for (const c of chord) tone(t, root + 12 + c, d * 30, { wave: "sine", gain: 0.04, attack: 2, release: 2 });
        }
        // raindrops on the window
        if (Math.random() < 0.4) tone(t + Math.random() * d, 88 + Math.floor(Math.random() * 12), 0, { wave: "sine", gain: 0.03, decay: 0.08 });
        if (b % 4 === 0 && Math.random() < 0.3) tone(t, pick(RAIN_NOTES), 0, { wave: "triangle", gain: 0.15, decay: 2, echo: true });
      },
    },
    spooky: {
      bpm: 92,
      step(s, t, d) {
        const bar = Math.floor(s / 16) % 4, b = s % 16;
        const root = SPOOKY_ROOTS[bar];
        if (b === 0) for (const c of SPOOKY_CHORDS[bar]) organ(t, root + 12 + c, d * 15, 0.035);
        if (b === 0 || b === 3) kick(t, b ? 0.4 : 0.7); // heartbeat
        if (bar === 0 && b === 0) tone(t, 86, 0, { wave: "triangle", gain: 0.12, decay: 3, echo: true }); // a bell
        const n = noteAt(SPOOKY_LEAD, s % 64);
        if (n) organ(t, n[0], n[1] * d * 0.95, 0.05);
        if (Math.floor(s / 64) % 2 && bar === 3 && b === 2) ghost(t, 72);
        if (bar === 1 && b === 8 && Math.random() < 0.5) ghost(t, 79, 1.2, 0.06);
      },
    },
    final: {
      bpm: 172,
      step(s, t, d) {
        const bar = Math.floor(s / 16) % 4, b = s % 16;
        const root = FINAL_ROOTS[bar];
        if (b % 2 === 0) kick(t, 1);
        if (b === 4 || b === 12) snare(t, 0.45);
        if (bar === 3 && b >= 8) snare(t, 0.15 + (b - 8) * 0.04); // roll
        hat(t, b % 2 ? 0.09 : 0.04);
        tone(t, root + (b % 4 === 2 ? 12 : 0) + (b === 15 ? 1 : 0), d * 0.9, { wave: "sawtooth", gain: 0.3, lowpass: 1100 });
        if (b === 0) for (const c of [12, 15, 18]) tone(t, root + c, d * 15, { wave: "sawtooth", gain: 0.03, lowpass: 1500, attack: 0.2 });
        const n = noteAt(FINAL_LEAD, s % 64);
        if (n) tone(t, n[0], n[1] * d * 0.95, { wave: "pulse", gain: 0.16 });
        // second time round, a siren wails over the top
        if (Math.floor(s / 64) % 2 && b === 0) tone(t, 84, d * 15, { wave: "square", gain: 0.025, slide: bar % 2 ? 84 : 96 });
      },
    },
  });

  // The Glitch's fight: Final Boss, skipping, stuttering and going out of tune
  PLAY.glitch = {
    bpm: 172,
    step(s, t, d) {
      const r = Math.random();
      const src = r < 0.12 ? Math.max(0, s - 1 - (s % 2)) : s; // a stutter replays a step
      const was = shift;
      if (r > 0.93) shift = Math.floor(Math.random() * 12) - 6;
      PLAY.final.step(src, t, d);
      shift = was;
      if (Math.random() < 0.08) hiss(t, d * 0.8, 0.12, "bandpass", 300 + Math.random() * 4000);
      if (Math.random() < 0.05) tone(t, 30 + Math.floor(Math.random() * 80), d, { wave: "square", gain: 0.05 });
    },
  };

  // ----- sound effects (pets) -----
  // They get their own output, because the song's `bus` is missing when
  // music is off and swapped out whenever the song changes.
  let sfxBus = null, sfxAt = 0, previewBus = null;
  const chirp = (t) => {
    tone(t, 91, 0.07, { wave: "sine", gain: 0.2, slide: 96 });
    tone(t + 0.1, 93, 0.07, { wave: "sine", gain: 0.2, slide: 98 });
  };
  const roar = (t) => {
    tone(t, 50, 0.45, { wave: "sawtooth", gain: 0.25, lowpass: 900, slide: 43 });
    hiss(t, 0.35, 0.15, "lowpass", 900);
  };
  // a pile of random computer blips
  const blips = (t) => {
    for (let i = 0; i < 4; i++) {
      tone(t + i * 0.045, 70 + Math.floor(Math.random() * 30), 0.035, { wave: "square", gain: 0.12 });
    }
  };
  const SFX = {
    glitch: blips,
    galaxy: (t) => tone(t, 84, 0.3, { wave: "sine", gain: 0.15, slide: 96 }), // a spacey woo-oo
    cat: (t) => meow(t, 77, 0.35, 0.3),
    // a horse: a quick wobbly neigh, high then sliding down
    horse: (t) => { for (const [at, m] of [[0, 84], [0.12, 86], [0.24, 81]]) tone(t + at, m, 0.14, { wave: "sawtooth", gain: 0.07, lowpass: 2200, slide: m - 7 }); },
    dog: (t) => bark(t, 64, 0.35),
    frog: (t) => ribbit(t, 57, 0.3),
    parrot: chirp,
    dragon: roar,
  };

  const CHAMP_ROOTS = [48, 53, 55, 48]; // C F G C
  const CHAMP_LEAD = [
    72, null, 72, 72, 79, null, null, null,
    77, 76, 74, 76, 72, null, null, null,
    72, null, 76, 79, 84, null, 83, 81,
    79, null, 77, null, 79, null, null, null,
  ];
  PLAY.champion = {
    bpm: 116,
    step(s, t, d) {
      const bar = Math.floor(s / 16) % 4, b = s % 16;
      const root = CHAMP_ROOTS[bar];
      const chord = [0, 4, 7];
      if (b === 0) for (const c of chord) tone(t, root + 12 + c, d * 15, { wave: "sawtooth", gain: 0.035, lowpass: 1500, attack: 0.1 });
      if (b === 0 || b === 8) tone(t, root - 12, 0, { wave: "sine", gain: 0.5, decay: 0.5, slide: root - 14 }); // timpani
      if (b === 4 || b === 12) snare(t, 0.2);
      if (bar === 3 && b >= 12) snare(t, 0.12 + (b - 12) * 0.04);
      if (b === 0 && bar === 0) hiss(t, 1.2, 0.08, "highpass", 5000); // cymbal
      if (b % 4 === 2) tone(t, root + (b % 8 === 2 ? 7 : 12), d * 1.5, { wave: "triangle", gain: 0.35 });
      const n = noteAt(CHAMP_LEAD, s % 64);
      if (n) {
        tone(t, n[0], n[1] * d * 0.9, { wave: "sawtooth", gain: 0.1, lowpass: 2400, attack: 0.02 }); // trumpets
        tone(t, n[0] - 12, n[1] * d * 0.9, { wave: "square", gain: 0.04 });
      }
    },
  };

  // ----- playing -----

  const wanted = () => {
    if (muted || settings.song === "off") return null;
    if (inBoss) return inBoss;
    if (levelSong === "off") return null;
    const k = levelSong || settings.song;
    return SONGS[k] ? k : "calm"; // e.g. a song of yours that's been deleted
  };

  // ----- mega versions -----
  // A remix, not just extra layers: the song's own tune and bass notes are
  // caught and played on new instruments over new drums. One time through
  // the remix is 7 times through the song:
  //   intro · DROP ×2 · breakdown · build-up · DROP 2 (key change) ×2
  const PARTS = ["intro", "drop", "drop", "break", "build", "drop2", "drop2"];
  const MEGA_SPEED = 1.12;
  const LOOP = { calm: 128, end: 128, rain: 128, pirate: 48 }; // steps per time through; most are 64
  const loopOf = (k) => LOOP[k] || 64;
  let root = null, padRoot = null, megaD = 0.1, lastD = 0.1;

  // the song's own drums are swapped for these
  const drum = (fn) => { songDrums = true; fn(); songDrums = false; };

  // Returns true when the remix plays this note its own way instead.
  const remixNote = (t, m, dur, o) => {
    const len = dur || o.decay || 0.2;
    const drop = section === "drop" || section === "drop2";
    if (m < 52 && o.gain >= 0.2) {
      // a bass note: remember it for the rolling bass, and in the quiet
      // parts give it a choir chord instead
      root = 36 + (((m - 36) % 12) + 12) % 12;
      if (!drop && root !== padRoot) {
        padRoot = root;
        tone(t, root - 12, megaD * 16, { wave: "sine", gain: 0.25, attack: 0.2, release: 0.6, extra: true });
        for (const up of [24, 31, 36, 40]) {
          tone(t, root + up, megaD * 16, { wave: "triangle", gain: 0.028, attack: 0.5, release: 0.8, lowpass: 1800, extra: true });
        }
      }
      return true;
    }
    if (m >= 60 && o.gain >= 0.09 && o.wave !== "sine") {
      // a tune note
      if (drop) {
        for (const dt of [-12, 0, 12]) { // supersaw: three saws a little out of tune
          tone(t, m, len, { wave: "sawtooth", gain: o.gain * 0.45, lowpass: 2600, detune: dt, attack: 0.01, extra: true });
        }
        if (section === "drop2") tone(t, m + 7, len, { wave: "sawtooth", gain: o.gain * 0.25, lowpass: 2000, extra: true }); // harmony
      } else if (section === "intro") {
        tone(t, m, len, { wave: "triangle", gain: o.gain * 0.9, extra: true });
      } else {
        tone(t, m + 12, 0, { wave: "sine", gain: o.gain * 0.8, decay: 0.6, echo: true, extra: true }); // plinks
      }
      return true;
    }
    return false;
  };

  const megaStep = (base, s, t, d) => {
    const L = loopOf(base), part = Math.floor(s / L) % 7, i = s % L;
    section = PARTS[part];
    shift = part >= 5 ? 2 : 0;
    megaD = d;
    if (i === 0) {
      muffle.frequency.cancelScheduledValues(t);
      if (section === "intro" || section === "build") {
        muffle.frequency.setValueAtTime(section === "intro" ? 300 : 700, t);
        muffle.frequency.exponentialRampToValueAtTime(18000, t + L * d);
      } else muffle.frequency.setValueAtTime(18000, t);
      if (part === 1 || part === 5) drum(() => hiss(t, 2, 0.2, "highpass", 4000)); // crash into each drop
      padRoot = null;
    }
    if (section === "drop" || section === "drop2") {
      drum(() => {
        if (i % 4 === 0) kick(t, 1);
        if (i % 8 === 4) clap(t, 0.3);
        hat(t, i % 2 ? 0.05 : 0.025);
        if (i % 4 === 2) hiss(t, 0.1, 0.08, "highpass", 6000);
      });
      if (root != null) {
        tone(t, root + (i % 2 ? 12 : 0), d * 0.9, { wave: "sawtooth", gain: 0.2, lowpass: 650, extra: true });
        if (section === "drop2" && i % 2 === 0) {
          tone(t, root + 36 + [0, 7, 12, 7][(i / 2) % 4], 0, { wave: "sine", gain: 0.06, decay: 0.25, echo: true, extra: true });
        }
      }
    } else if (section === "build") {
      // a snare roll that keeps getting faster
      const every = Math.max(1, 4 - Math.floor((4 * i) / L));
      if (i % every === 0) drum(() => snare(t, 0.08 + (0.25 * i) / L));
      if (i % 4 === 0) drum(() => kick(t, 0.5));
    }
    songDrums = false;
    PLAY[base].step(s, t, d);
    songDrums = true;
    section = null;
    shift = 0;
  };

  const tick = () => {
    if (!playing || !ctx) return;
    const info = SONGS[playing], base = info.base || playing, song = PLAY[base];
    const d = 60 / (song.bpm * (info.mega ? MEGA_SPEED : 1)) / 4;
    lastD = d;
    while (nextT < ctx.currentTime + 0.15) {
      if (info.mega) megaStep(base, step, nextT, d);
      else song.step(step, nextT, d);
      step++;
      nextT += d;
    }
  };

  // Fade out whatever is on and start the right song from its beginning.
  const update = () => {
    if (!ctx) return;
    const want = wanted();
    if (want === playing) return;
    if (bus) {
      const old = bus;
      old.gain.setTargetAtTime(0, ctx.currentTime, 0.15);
      setTimeout(() => old.disconnect(), 1500);
      bus = null;
    }
    playing = want;
    clearInterval(timer);
    if (!want) return;
    if (window.BDBadges) window.BDBadges.heard(want, Object.keys(SONGS).filter((k) => k !== "off" && !SONGS[k].secret && !SONGS[k].mega && !SONGS[k].hidden && !SONGS[k].mine));
    bus = ctx.createGain();
    muffle = ctx.createBiquadFilter();
    muffle.type = "lowpass";
    muffle.frequency.value = 18000;
    bus.connect(muffle).connect(master);
    step = 0;
    root = padRoot = null;
    nextT = ctx.currentTime + 0.1;
    timer = setInterval(tick, 25);
    tick();
  };

  // Browsers only allow sound after the player clicks or presses a key.
  const unlock = () => {
    if (!ctx && !setup()) return;
    if (ctx.state === "suspended") ctx.resume();
    update();
  };
  for (const ev of ["pointerdown", "keydown", "touchend"]) window.addEventListener(ev, unlock, true);
  document.addEventListener("visibilitychange", () => {
    if (!ctx) return;
    if (document.hidden) ctx.suspend();
    else ctx.resume();
  });

  // ----- the speaker button, in the corner of every screen -----
  const speaker = document.createElement("button");
  speaker.className = "bd-speaker";
  const setMuted = (m) => {
    muted = m;
    speaker.textContent = m ? "🔇" : "🔊";
    speaker.title = m ? "Sound is off. Click to turn it on" : "Sound is on. Click to turn it off";
    update();
  };
  // pointerdown would also reach unlock first, which is what starts audio
  speaker.addEventListener("click", (e) => { e.stopPropagation(); setMuted(!muted); speaker.blur(); });
  setMuted(true);
  const addSpeaker = () => document.body.appendChild(speaker);
  if (document.body) addSpeaker(); else document.addEventListener("DOMContentLoaded", addSpeaker);

  window.BDMusic = {
    SONGS,
    MAKER,
    // the song the "My song" choice plays (a level's own, from the Music Maker)
    custom(song) { customSong = song || null; },
    // your saved songs from the Music Maker: [{ id, name, song }], listed as my_<id>
    mine(list) {
      for (const k of Object.keys(SONGS)) if (SONGS[k].mine) { delete SONGS[k]; delete PLAY[k]; }
      for (const { id, name, song } of list) {
        const k = "my_" + id;
        SONGS[k] = { name, icon: "🎼", what: "Your song, made in the Music Maker.", mine: true };
        PLAY[k] = makerPlayer(() => song);
      }
      update();
    },
    bpmOf: (k) => (PLAY[(SONGS[k] && SONGS[k].base) || k] || {}).bpm || 120,
    // hear one box of a song once, when it's placed in the Music Maker
    preview(song) {
      if (!ctx || ctx.state !== "running") return;
      if (muted) setMuted(false);
      if (!sfxBus) { sfxBus = ctx.createGain(); sfxBus.connect(master); }
      if (previewBus) previewBus.gain.setTargetAtTime(0, ctx.currentTime, 0.03); // stop the last one
      previewBus = ctx.createGain();
      previewBus.connect(sfxBus);
      const songBus = bus, t0 = ctx.currentTime + 0.03, d = 60 / song.bpm / 4;
      bus = previewBus;
      songDrums = true;
      const steps = 16 * tuneBars(tuneIn(song, song.slots[0].t));
      try { for (let s = 0; s < steps; s++) makerStep(song, s, t0 + s * d, d); } finally { bus = songBus; }
    },
    tuneBars,
    // which box of a Music Maker song is playing at step s
    slotAt: (song, s) => slotAt(song, s)[0],
    // which step you're hearing right now (the playing line in the Music Maker)
    get stepNow() { return playing && ctx ? step - Math.ceil((nextT - ctx.currentTime) / lastD) : -1; },
    get muted() { return muted; },
    setMuted,
    VOLUMES,
    get song() { return settings.song; },
    get vol() { return settings.vol; },
    get playing() { return playing; },
    // the songs that have their mega upgrade; a change restarts the song
    // which songs have their mega version unlocked (bought in the shop)
    setUpgrades(list) {
      upgraded = Array.isArray(list) ? list.filter((k) => PLAY[k]) : [];
    },
    isUpgraded: (k) => upgraded.includes(k),
    // can this song be picked right now? (secret and mega ones need unlocking)
    available(k) {
      const sg = SONGS[k];
      if (!sg || sg.hidden) return false;
      const base = sg.base || k;
      if (SONGS[base].secret && !(window.BDBadges && window.BDBadges.has("master"))) return false;
      return !sg.mega || upgraded.includes(base);
    },
    get running() { return !!ctx && ctx.state; },
    setSong(k) {
      if (!SONGS[k]) return;
      settings.song = k;
      save();
      // picking a song means you want to hear it
      setMuted(false);
      unlock();
      // picking a song again restarts it, so you can hear it from the top
      playing = playing === wanted() ? "restart" : playing;
      update();
    },
    setVolume(k) {
      if (!VOLUMES[k]) return;
      settings.vol = k;
      save();
      if (ctx) master.gain.setTargetAtTime(VOLUMES[k] * MASTER_LEVEL, ctx.currentTime, 0.05);
    },
    // a level with its own song plays it until you leave; null goes back to yours
    level(k) {
      k = SONGS[k] ? k : null;
      if (k === levelSong) return;
      levelSong = k;
      update();
    },
    // kind: cat, dog, frog, parrot or dragon. A run of diamonds is one sound,
    // not a pile of them.
    sfx(kind) {
      if (muted || !SFX[kind] || !ctx || ctx.state !== "running") return;
      if (ctx.currentTime - sfxAt < 0.3) return;
      sfxAt = ctx.currentTime;
      if (!sfxBus) { sfxBus = ctx.createGain(); sfxBus.connect(master); }
      const songBus = bus;
      bus = sfxBus;
      try { SFX[kind](ctx.currentTime + 0.01); } finally { bus = songBus; }
    },
    // the game calls this every frame; it only acts when the fight starts or
    // ends. on: false, true (the boss song) or which song the fight plays.
    boss(on) {
      on = on === true ? "boss" : on || false;
      if (on === inBoss) return;
      inBoss = on;
      update();
    },
  };
})();
