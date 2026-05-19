(() => {
  const screen = document.getElementById("screen");
  const controls = document.getElementById("controls");

  const escapeHtml = (s) =>
    String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

  const setScreen = (html, ctrl = "") => {
    screen.innerHTML = html;
    controls.innerHTML = ctrl;
    window.scrollTo({ top: 0, behavior: "instant" });
  };

  const art = (lines) =>
    lines && lines.length
      ? `<pre class="art">${lines.map(escapeHtml).join("\n")}</pre>`
      : "";

  const button = (label, onClick, cls = "primary", attrs = "") => {
    const id = "btn_" + Math.random().toString(36).slice(2, 9);
    setTimeout(() => {
      const el = document.getElementById(id);
      if (el) el.addEventListener("click", onClick);
    }, 0);
    return `<button id="${id}" class="${cls}" ${attrs}>${label}</button>`;
  };

  // ---------- Pick-right round game ----------

  let roundIdx = 0;

  const renderTitle = () => {
    roundIdx = 0;
    setScreen(
      `
      <h1>Pick Right 2</h1>
      <p class="dim">A choose-your-fate adventure. Pick wisely.</p>
      <div class="confetti">* . * o * . o *</div>
      <pre class="art">       .-------.
      /         \\
     /   .   .   \\
    |             |
    |     ___     |
     \\   '   '  /
      \\_________/

     ~ Sir Rock ~</pre>
      <p>Help your hero survive and build a home for Sir Rock!</p>
      <div class="options">
        ${button("Start Game", () => renderRound(0))}
      </div>
    `,
    );
  };

  const renderRound = (idx) => {
    roundIdx = idx;
    const round = window.GAME_DATA.rounds[idx];
    const opts = round.options
      .map(
        (opt, i) =>
          `<button class="option" data-idx="${i}">${escapeHtml(opt.name)}</button>`,
      )
      .join("");

    setScreen(`
      <h2>Round ${idx + 1} of ${window.GAME_DATA.rounds.length}</h2>
      <div class="prompt">${escapeHtml(round.prompt)}</div>
      <div class="options">${opts}</div>
    `);

    screen.querySelectorAll("button.option").forEach((b) => {
      b.addEventListener("click", () => {
        const i = parseInt(b.dataset.idx, 10);
        renderPickPreview(round.options[i]);
      });
    });
  };

  const renderPickPreview = (option) => {
    // If both picture and result_picture exist: show preview first
    if (option.picture && option.picture.length && option.result_picture) {
      setScreen(`
        <h2>You picked:</h2>
        <div class="prompt">${escapeHtml(option.name)}</div>
        ${art(option.picture)}
        <div class="options">
          ${button("See what happens →", () => renderPickResult(option, true))}
        </div>
      `);
    } else {
      renderPickResult(option, false);
    }
  };

  const renderPickResult = (option, alreadyPreviewed) => {
    const pic = alreadyPreviewed
      ? option.result_picture
      : option.picture && option.picture.length
        ? option.picture
        : option.result_picture;

    setScreen(`
      <div class="result">${escapeHtml(option.result)}</div>
      ${art(pic)}
      <div class="options">
        ${
          option.game_over
            ? button("Game Over — Restart", () => renderTitle())
            : button("Continue →", () => advanceRound())
        }
      </div>
    `);
  };

  const advanceRound = () => {
    const next = roundIdx + 1;
    if (next < window.GAME_DATA.rounds.length) {
      renderRound(next);
    } else {
      renderPickRightWin();
    }
  };

  const renderPickRightWin = () => {
    setScreen(`
      <div class="confetti">* . o * o . * o . *</div>
      <div class="win-banner">
        <div class="big">YOU WIN!</div>
        <div>You and Sir Rock live happily ever after!</div>
      </div>
      <pre class="art good">    .-------.
   /   ^_^  \\
  |  HAPPY  |
   \\_________/

   ~ Sir Rock ~</pre>
      <div class="confetti">o * . o * . * o . *</div>
      <div class="options">
        ${button("Build Sir Rock a house →", () => startHouseGame())}
      </div>
    `);
  };

  // ---------- House-building game ----------

  let resources = {};
  let generators = {};
  let generatorRates = {};
  let roomIdx = 0;
  let tickInterval = null;
  let waitRender = null;

  const resourceLines = () => {
    const keys = Object.keys(resources).sort();
    return keys
      .map((k) => {
        const amt = Math.floor(resources[k]);
        const gen = generators[k] || 0;
        if (amt <= 0 && gen <= 0) return null;
        return `<span class="res-chip">${k}: ${amt}${gen > 0 ? `<span class="gen">+${gen}</span>` : ""}</span>`;
      })
      .filter(Boolean)
      .join("");
  };

  const canAfford = (cost) => {
    if (!cost) return true;
    for (const k of Object.keys(cost)) {
      if ((resources[k] || 0) < cost[k]) return false;
    }
    return true;
  };

  const spend = (cost) => {
    if (!cost) return;
    for (const k of Object.keys(cost)) {
      resources[k] = (resources[k] || 0) - cost[k];
    }
  };

  const startHouseGame = () => {
    const data = window.HOUSE_DATA;
    resources = {};
    generators = {};
    generatorRates = { ...data.resource_generators };
    Object.assign(resources, data.starting_resources);
    for (const [k, v] of Object.entries(data.starting_generators || {})) {
      generators[k] = v;
    }
    roomIdx = 0;
    startResourceTicking();
    renderHouseIntro();
  };

  const startResourceTicking = () => {
    if (tickInterval) clearInterval(tickInterval);
    tickInterval = setInterval(() => {
      for (const k of Object.keys(generators)) {
        const count = generators[k];
        const rate = generatorRates[k];
        if (count > 0 && rate) {
          resources[k] = (resources[k] || 0) + count / rate;
        }
      }
      if (waitRender) waitRender();
    }, 1000);
  };

  const stopResourceTicking = () => {
    if (tickInterval) clearInterval(tickInterval);
    tickInterval = null;
  };

  const renderHouseIntro = () => {
    setScreen(`
      <h1>Build Sir Rock a house</h1>
      <p>Decorate rooms the way the AI likes them.</p>
      <ul class="dim">
        <li>Correct choices unlock resource generators</li>
        <li>Wrong choices = GAME OVER</li>
        <li>You start with 6 wood, 2 iron, and an iron generator</li>
      </ul>
      <div class="options">
        ${button("Start building →", () => renderHouseRoom(0))}
      </div>
    `);
  };

  const renderHouseWait = (onContinue) => {
    const update = () => {
      const resEl = document.getElementById("res-line");
      if (resEl) resEl.innerHTML = resourceLines();
    };
    waitRender = update;
    setScreen(`
      <h2>Resources are growing…</h2>
      <p class="dim">Wait for resources to build up, or play a minigame for diamonds!</p>
      <div class="resources" id="res-line">${resourceLines()}</div>
      <div class="options">
        ${button("Continue to next room →", () => {
          waitRender = null;
          onContinue();
        })}
        ${button("Play minigame (cost: 5 copper)", () => {
          waitRender = null;
          tryStartMinigame(onContinue);
        }, "option")}
      </div>
      <p class="footer-note">Resources tick every second while you wait.</p>
    `);
  };

  const renderHouseRoom = (idx) => {
    roomIdx = idx;
    const data = window.HOUSE_DATA;
    const room = data.rooms[idx];

    const optsHtml = room.decorations
      .map((d, i) => {
        const costStr = d.cost && Object.keys(d.cost).length
          ? Object.entries(d.cost).map(([k, v]) => `${v} ${k}`).join(", ")
          : "free";
        const affordable = canAfford(d.cost);
        return `<button class="option ${affordable ? "" : "disabled"}" data-idx="${i}" ${affordable ? "" : "disabled"}>
          ${escapeHtml(d.name)}
          <span class="cost">${affordable ? "" : "[CAN'T AFFORD] "}costs: ${costStr}</span>
        </button>`;
      })
      .join("");

    setScreen(`
      <div class="resources">${resourceLines()}</div>
      <h2>Room ${idx + 1}: ${escapeHtml(room.name)}</h2>
      <div class="ai-hint">AI says: ${escapeHtml(room.ai_hint)}</div>
      <div class="prompt">Pick a decoration:</div>
      <div class="options">${optsHtml}</div>
    `);

    screen.querySelectorAll("button.option:not(.disabled)").forEach((b) => {
      b.addEventListener("click", () => {
        const i = parseInt(b.dataset.idx, 10);
        const d = room.decorations[i];
        if (!canAfford(d.cost)) return;
        spend(d.cost);
        renderDecorationPreview(d);
      });
    });
  };

  const renderDecorationPreview = (decoration) => {
    setScreen(`
      <div class="resources">${resourceLines()}</div>
      <h2>You picked:</h2>
      <div class="prompt">${escapeHtml(decoration.name)}</div>
      ${art(decoration.picture)}
      <div class="options">
        ${button("See the result →", () => renderDecorationResult(decoration))}
      </div>
    `);
  };

  const renderDecorationResult = (decoration) => {
    if (decoration.correct) {
      if (decoration.unlocks_generator) {
        generators[decoration.unlocks_generator] =
          (generators[decoration.unlocks_generator] || 0) + 1;
      }
      const isLastRoom = roomIdx + 1 >= window.HOUSE_DATA.rooms.length;
      setScreen(`
        <div class="resources">${resourceLines()}</div>
        <div class="result good">${escapeHtml(decoration.success_message)}</div>
        ${decoration.unlocks_generator
          ? `<p>You now have a <strong>${escapeHtml(decoration.unlocks_generator)}</strong> generator!</p>`
          : ""}
        <div class="options">
          ${
            isLastRoom
              ? button("See your house →", () => renderHouseWin())
              : button("Continue →", () => renderHouseWait(() => renderHouseRoom(roomIdx + 1)))
          }
        </div>
      `);
    } else {
      stopResourceTicking();
      setScreen(`
        <div class="result bad">${escapeHtml(decoration.game_over_message || "Game over!")}</div>
        ${art(decoration.picture)}
        <div class="options">
          ${button("Restart from beginning", () => renderTitle())}
        </div>
      `);
    }
  };

  const renderHouseWin = () => {
    stopResourceTicking();
    setScreen(`
      <div class="confetti">* o . * o . * o . *</div>
      <div class="win-banner">
        <div class="big">HOUSE COMPLETE!</div>
        <div>The AI loves your house! Sir Rock has a cozy home.</div>
      </div>
      <pre class="art good">        /\\
       /  \\
      /____\\
     |      |
     |  []  |
     |______|

    .-------.
   /   ^_^  \\   <- Sir Rock!
   \\________/</pre>
      <div class="confetti">o . * o * . * o *</div>
      <div class="options">
        ${button("Play again", () => renderTitle())}
      </div>
    `);
  };

  // ---------- Minigame ----------

  const tryStartMinigame = (onExit) => {
    if (!canAfford({ copper: 5 })) {
      setScreen(`
        <div class="result bad">Not enough copper! Need 5 copper.</div>
        <div class="options">
          ${button("Back", () => renderHouseWait(onExit))}
        </div>
      `);
      return;
    }
    spend({ copper: 5 });
    startMinigame(onExit);
  };

  const startMinigame = (onExit) => {
    const NUM_LANES = 6;
    const WIN_DISTANCE = 150;
    const PLAYER_X = 5;
    const GAME_WIDTH = 60;

    const LEVEL = [
      [10, 0, 1, false, "░"], [15, 5, 1, false, "░"], [20, 2, 1, true, "*"],
      [30, 1, 2, false, "░"], [35, 3, 1, true, "*"],
      [40, 0, 2, false, "▒"], [45, 4, 2, false, "▒"], [50, 2, 1, true, "*"],
      [55, 1, 3, false, "▓"], [60, 5, 1, false, "░"],
      [65, 0, 1, false, "#"], [65, 3, 2, false, "▓"], [70, 2, 1, true, "*"],
      [80, 3, 3, false, "▓"], [85, 0, 2, false, "░"],
      [90, 4, 1, true, "*"], [90, 2, 1, false, "#"],
      [95, 0, 1, false, "▓"], [95, 5, 1, false, "▓"],
      [110, 1, 3, false, "▓"], [115, 3, 1, true, "*"],
      [120, 0, 2, false, "▒"], [120, 5, 1, false, "#"],
      [125, 2, 2, false, "▓"], [130, 4, 1, true, "*"], [130, 0, 1, false, "░"],
      [140, 3, 2, false, "▓"], [145, 0, 1, false, "░"], [145, 4, 1, true, "*"],
      [148, 2, 1, false, "▒"],
    ];

    let playerLane = 3;
    let obstacles = [];
    let distance = 0;
    let speedups = 0;
    let levelI = 0;
    let won = false;
    let dead = false;
    let raf = null;
    let tickCount = 0;

    setScreen(`
      <div id="minigame-area">
        <div class="minigame-stats">
          <span id="mg-dist">Dist: 0 / ${WIN_DISTANCE}</span>
          <span id="mg-speed">Speedups: 0</span>
        </div>
        <canvas id="minigame-canvas" width="600" height="240"></canvas>
        <div class="swipe-hint">Swipe ↑ / ↓ on the screen, or use the buttons</div>
        <div class="minigame-buttons">
          <button id="mg-up">▲ UP</button>
          <button id="mg-down">▼ DOWN</button>
        </div>
        <div class="options">
          ${button("Quit minigame", () => endMinigame(false), "option")}
        </div>
      </div>
    `);

    const canvas = document.getElementById("minigame-canvas");
    const ctx = canvas.getContext("2d");
    const distEl = document.getElementById("mg-dist");
    const speedEl = document.getElementById("mg-speed");

    const moveUp = () => { if (playerLane > 0) playerLane--; };
    const moveDown = () => { if (playerLane < NUM_LANES - 1) playerLane++; };
    document.getElementById("mg-up").addEventListener("click", moveUp);
    document.getElementById("mg-down").addEventListener("click", moveDown);

    const keyHandler = (e) => {
      if (e.key === "ArrowUp") { e.preventDefault(); moveUp(); }
      else if (e.key === "ArrowDown") { e.preventDefault(); moveDown(); }
    };
    window.addEventListener("keydown", keyHandler);

    // Touch swipe
    let touchY = null;
    canvas.addEventListener("touchstart", (e) => {
      if (e.touches.length) touchY = e.touches[0].clientY;
    }, { passive: true });
    canvas.addEventListener("touchmove", (e) => {
      if (touchY == null || !e.touches.length) return;
      const dy = e.touches[0].clientY - touchY;
      if (dy < -25) { moveUp(); touchY = e.touches[0].clientY; }
      else if (dy > 25) { moveDown(); touchY = e.touches[0].clientY; }
    }, { passive: true });
    canvas.addEventListener("touchend", () => { touchY = null; });

    const colorFor = (style, isSpeedup) => {
      if (isSpeedup) return "#ffd54a";
      if (style === "░") return "#5a3030";
      if (style === "▒") return "#8a3a3a";
      if (style === "▓") return "#c14a4a";
      if (style === "#") return "#ff5050";
      return "#aa4040";
    };

    const draw = () => {
      const W = canvas.width;
      const H = canvas.height;
      const laneH = H / NUM_LANES;
      const cellW = W / GAME_WIDTH;

      // Background
      ctx.fillStyle = "#050507";
      ctx.fillRect(0, 0, W, H);

      // Lane lines
      ctx.strokeStyle = "#1a1a22";
      ctx.lineWidth = 1;
      for (let i = 0; i <= NUM_LANES; i++) {
        ctx.beginPath();
        ctx.moveTo(0, i * laneH);
        ctx.lineTo(W, i * laneH);
        ctx.stroke();
      }

      // Obstacles
      for (const obs of obstacles) {
        const [x, lane, size, isSpeedup] = obs;
        const px = x * cellW;
        ctx.fillStyle = colorFor(obs[4], isSpeedup);
        if (isSpeedup) {
          ctx.beginPath();
          const cx = px + cellW / 2;
          const cy = lane * laneH + laneH / 2;
          const r = Math.min(cellW, laneH) * 0.45;
          for (let i = 0; i < 5; i++) {
            const a = (i * 2 * Math.PI) / 5 - Math.PI / 2;
            const a2 = a + Math.PI / 5;
            ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
            ctx.lineTo(cx + Math.cos(a2) * (r * 0.45), cy + Math.sin(a2) * (r * 0.45));
          }
          ctx.closePath();
          ctx.fill();
        } else {
          for (let s = 0; s < size; s++) {
            if (lane + s < NUM_LANES) {
              ctx.fillRect(px, (lane + s) * laneH + 2, cellW * 1.4, laneH - 4);
            }
          }
        }
      }

      // Player
      const py = playerLane * laneH;
      ctx.fillStyle = "#6ee7b7";
      ctx.fillRect(PLAYER_X * cellW, py + 4, cellW * 2, laneH - 8);
      ctx.fillStyle = "#0b0b0e";
      ctx.font = "bold 14px ui-monospace, monospace";
      ctx.textBaseline = "middle";
      ctx.textAlign = "center";
      ctx.fillText(">", PLAYER_X * cellW + cellW, py + laneH / 2);
    };

    const step = () => {
      tickCount++;
      if (tickCount % 3 === 0) {
        distance++;
        for (const obs of obstacles) obs[0] -= 1;
        while (levelI < LEVEL.length && LEVEL[levelI][0] === distance) {
          const [, lane, size, isSpeedup, style] = LEVEL[levelI];
          obstacles.push([GAME_WIDTH, lane, size, isSpeedup, style]);
          levelI++;
        }

        // Collisions
        for (let i = obstacles.length - 1; i >= 0; i--) {
          const obs = obstacles[i];
          const [x, lane, size, isSpeedup] = obs;
          if (Math.abs(x - PLAYER_X) <= 1) {
            if (isSpeedup) {
              if (lane === playerLane) {
                speedups++;
                obstacles.splice(i, 1);
              }
            } else {
              if (lane <= playerLane && playerLane < lane + size) {
                dead = true;
              }
            }
          }
        }
        obstacles = obstacles.filter((o) => o[0] > -5);

        if (distance >= WIN_DISTANCE && !won) {
          won = true;
          awardWin();
        }

        distEl.textContent = `Dist: ${distance} / ${WIN_DISTANCE}`;
        speedEl.textContent = `Speedups: ${speedups}`;
      }
      draw();

      if (dead && !won) {
        endMinigame(false);
        return;
      }
      raf = requestAnimationFrame(step);
    };

    const awardWin = () => {
      const reward = 200 + speedups * 10;
      resources.diamond = (resources.diamond || 0) + reward;
      // Briefly flash a banner over the canvas
      const banner = document.createElement("div");
      banner.className = "win-banner";
      banner.innerHTML = `<div class="big">YOU WON!</div><div>+${reward} diamonds!</div><div class="dim">Keep playing or quit when ready.</div>`;
      canvas.insertAdjacentElement("afterend", banner);
      setTimeout(() => banner.remove(), 2500);
    };

    const endMinigame = (alreadyStopped) => {
      if (raf) cancelAnimationFrame(raf);
      raf = null;
      window.removeEventListener("keydown", keyHandler);

      if (!won) {
        resources.copper = (resources.copper || 0) + 50;
      }

      setScreen(`
        <h2>${won ? "Great run!" : "Game Over"}</h2>
        <p>Final distance: <strong>${distance}</strong></p>
        <p>Speedups collected: <strong>${speedups}</strong></p>
        ${won
          ? `<p class="good">You earned ${200 + speedups * 10} diamonds!</p>`
          : `<p class="accent">Consolation prize: +50 copper</p>`}
        <div class="options">
          ${button("Back to building →", () => renderHouseWait(onExit))}
        </div>
      `);
    };

    raf = requestAnimationFrame(step);
  };

  // ---------- Boot ----------
  renderTitle();
})();
