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
    off: { name: "No music", icon: "🔇", what: "Quiet. Boss fights stay quiet too." },
  };
  const VOLUMES = { quiet: 0.25, mid: 0.55, loud: 1 };

  let settings = { song: "calm", vol: "mid" };
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || "{}") || {};
    if (SONGS[s.song]) settings.song = s.song;
    if (VOLUMES[s.vol]) settings.vol = s.vol;
  } catch (e) { /* first visit */ }
  const save = () => {
    try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch (e) { /* ignore */ }
  };

  let ctx = null, master, echo, pulse, noise;
  let inBoss = false, levelSong = null, playing = null, bus = null, step = 0, nextT = 0, timer = 0;

  const freq = (m) => 440 * Math.pow(2, (m - 69) / 12);

  const setup = () => {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    const comp = ctx.createDynamicsCompressor();
    comp.connect(ctx.destination);
    master = ctx.createGain();
    master.gain.value = VOLUMES[settings.vol] * 0.5;
    master.connect(comp);
    // a soft echo, mostly for the calm song's notes to ring out
    echo = ctx.createDelay(1);
    echo.delayTime.value = 0.42;
    const fb = ctx.createGain();
    fb.gain.value = 0.38;
    const wet = ctx.createGain();
    wet.gain.value = 0.5;
    echo.connect(fb).connect(echo);
    echo.connect(wet).connect(master);
    // a 25% pulse wave sounds more like an old game console than a plain square
    const n = 32, re = new Float32Array(n), im = new Float32Array(n);
    for (let i = 1; i < n; i++) re[i] = (2 * Math.sin(i * Math.PI * 0.25)) / (i * Math.PI);
    pulse = ctx.createPeriodicWave(re, im);
    noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return true;
  };

  // ----- instruments -----

  const tone = (t, m, dur, o) => {
    const osc = ctx.createOscillator();
    if (o.wave === "pulse") osc.setPeriodicWave(pulse);
    else osc.type = o.wave;
    osc.frequency.setValueAtTime(freq(m), t);
    // slide: glide to another note over the note's length (bloops, sirens)
    if (o.slide != null) osc.frequency.exponentialRampToValueAtTime(freq(o.slide), t + (o.decay || dur));
    const g = ctx.createGain();
    const a = o.attack || 0.005, peak = o.gain;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + a);
    if (o.decay) g.gain.exponentialRampToValueAtTime(0.0001, t + a + o.decay);
    else {
      g.gain.setValueAtTime(peak, t + Math.max(a, dur - 0.03));
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur + (o.release || 0.03));
    }
    let out = g;
    if (o.lowpass) {
      const f = ctx.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.value = o.lowpass;
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
  const hat = (t, gain = 0.12) => hiss(t, 0.04, gain, "highpass", 7000);
  const snare = (t, gain = 0.3) => hiss(t, 0.14, gain, "bandpass", 1800);
  const kick = (t, gain = 0.9) => {
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

  const PLAY = {
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

  // ----- sound effects (pets) -----
  // They get their own output, because the song's `bus` is missing when
  // music is off and swapped out whenever the song changes.
  let sfxBus = null, sfxAt = 0;
  const chirp = (t) => {
    tone(t, 91, 0.07, { wave: "sine", gain: 0.2, slide: 96 });
    tone(t + 0.1, 93, 0.07, { wave: "sine", gain: 0.2, slide: 98 });
  };
  const roar = (t) => {
    tone(t, 50, 0.45, { wave: "sawtooth", gain: 0.25, lowpass: 900, slide: 43 });
    hiss(t, 0.35, 0.15, "lowpass", 900);
  };
  const SFX = {
    cat: (t) => meow(t, 77, 0.35, 0.3),
    dog: (t) => bark(t, 64, 0.35),
    frog: (t) => ribbit(t, 57, 0.3),
    parrot: chirp,
    dragon: roar,
  };

  // ----- playing -----

  const wanted = () => {
    if (settings.song === "off") return null;
    if (inBoss) return "boss";
    if (levelSong === "off") return null;
    return levelSong || settings.song;
  };

  const tick = () => {
    if (!playing || !ctx) return;
    const song = PLAY[playing], d = 60 / song.bpm / 4;
    while (nextT < ctx.currentTime + 0.15) {
      song.step(step, nextT, d);
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
    if (window.BDBadges) window.BDBadges.heard(want, Object.keys(SONGS).filter((k) => k !== "off"));
    bus = ctx.createGain();
    bus.connect(master);
    step = 0;
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

  window.BDMusic = {
    SONGS,
    VOLUMES,
    get song() { return settings.song; },
    get vol() { return settings.vol; },
    get playing() { return playing; },
    get running() { return !!ctx && ctx.state; },
    setSong(k) {
      if (!SONGS[k]) return;
      settings.song = k;
      save();
      unlock();
      // picking a song again restarts it, so you can hear it from the top
      playing = playing === wanted() ? "restart" : playing;
      update();
    },
    setVolume(k) {
      if (!VOLUMES[k]) return;
      settings.vol = k;
      save();
      if (ctx) master.gain.setTargetAtTime(VOLUMES[k] * 0.5, ctx.currentTime, 0.05);
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
      if (!SFX[kind] || !ctx || ctx.state !== "running") return;
      if (ctx.currentTime - sfxAt < 0.3) return;
      sfxAt = ctx.currentTime;
      if (!sfxBus) { sfxBus = ctx.createGain(); sfxBus.connect(master); }
      const songBus = bus;
      bus = sfxBus;
      try { SFX[kind](ctx.currentTime + 0.01); } finally { bus = songBus; }
    },
    // the game calls this every frame; it only acts when the fight starts or ends
    boss(on) {
      on = !!on;
      if (on === inBoss) return;
      inBoss = on;
      update();
    },
  };
})();
