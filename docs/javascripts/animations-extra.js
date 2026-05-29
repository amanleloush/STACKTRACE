/* ===========================================================
   SDE Growth Arc — extra animations
   Hooks into the registry exposed by animations.js via
   window.__SDE_REG and window.__SDE_HELPERS. Safe to omit
   from extra_javascript without breaking the original engine.
   =========================================================== */

(function () {
  "use strict";
  if (!window.__SDE_REG || !window.__SDE_HELPERS) return;
  const REG = window.__SDE_REG;
  const { $svg, $el, frame, btn, hash32, PALETTE } = window.__SDE_HELPERS;

  // tiny helper: an animated dot from (x1,y1) -> (x2,y2) inside an svg.
  function flashDot(svg, from, to, color, ms) {
    color = color || "#a78bfa";
    ms = ms || 600;
    const dot = $svg("circle", { r: 4, cx: from.x, cy: from.y, fill: color });
    svg.appendChild(dot);
    const t0 = performance.now();
    function step(t) {
      const u = Math.min(1, (t - t0) / ms);
      dot.setAttribute("cx", from.x + (to.x - from.x) * u);
      dot.setAttribute("cy", from.y + (to.y - from.y) * u);
      dot.setAttribute("opacity", 1 - u * 0.6);
      if (u < 1) requestAnimationFrame(step);
      else dot.remove();
    }
    requestAnimationFrame(step);
  }

  // -------------------------------------------------------------------
  // 1) PAXOS — single-decree (Prepare + Accept phases)
  // -------------------------------------------------------------------
  function animPaxos(host) {
    const { stage, controls, readout } = frame(host, {
      title: "Paxos — single-decree (Prepare + Accept)",
      caption: "Proposer picks ballot n, sends Prepare(n) to acceptors. Quorum replies with their highest accepted value. Proposer then sends Accept(n, v). Quorum accepts; learners learn v.",
    });

    const svg = $svg("svg", { viewBox: "0 0 480 240", width: 480, style: "max-width:100%;height:auto;" });
    stage.appendChild(svg);

    // 1 proposer (left) · 3 acceptors (middle) · 1 learner (right)
    const proposer = { x: 50, y: 120, label: "P" };
    const acceptors = [
      { x: 230, y: 60,  label: "A1", accepted: null },
      { x: 230, y: 120, label: "A2", accepted: null },
      { x: 230, y: 180, label: "A3", accepted: null },
    ];
    const learner = { x: 430, y: 120, label: "L" };

    const STEPS = [
      { name: "prepare(n)",       phase: 1, desc: "Proposer broadcasts Prepare(n=5) to acceptors" },
      { name: "promise",          phase: 1, desc: "Quorum (≥2 of 3) promises not to accept ballots < n; returns max prior (n', v')" },
      { name: "accept(n, v)",     phase: 2, desc: "Proposer sends Accept(n, v=42). v = highest-numbered prior value, or its own if none." },
      { name: "accepted",         phase: 2, desc: "Quorum accepts; each acceptor remembers (n, v)" },
      { name: "learn",            phase: 3, desc: "Learner gathers quorum of accepted notifications → value chosen = 42" },
    ];

    let stepIdx = 0;
    let ballot = 5;
    let playing = false;
    let timer = null;

    function reset() {
      stepIdx = 0;
      ballot = 5;
      acceptors.forEach(a => a.accepted = null);
      stopPlay();
      draw();
    }

    function nodeBox(p, role, highlight) {
      const g = $svg("g");
      const fill = highlight ? "#fbbf24" : "rgba(99,102,241,0.18)";
      const stroke = highlight ? "#f59e0b" : "rgba(167,139,250,0.55)";
      g.appendChild($svg("circle", { cx: p.x, cy: p.y, r: 22, fill, stroke, "stroke-width": highlight ? 2.5 : 1.5 }));
      const lbl = $svg("text", { x: p.x, y: p.y + 5, "text-anchor": "middle", class: "anim-label",
        fill: highlight ? "#0b0d18" : "#fff", "font-weight": 700 });
      lbl.textContent = p.label;
      g.appendChild(lbl);
      const role_lbl = $svg("text", { x: p.x, y: p.y + 40, "text-anchor": "middle", class: "anim-label--mono" });
      role_lbl.textContent = role;
      g.appendChild(role_lbl);
      return g;
    }

    function draw() {
      svg.innerHTML = "";
      const cur = STEPS[stepIdx] || null;
      // header
      const ht = $svg("text", { x: 240, y: 22, "text-anchor": "middle", class: "anim-label--big" });
      ht.textContent = cur ? `step ${stepIdx + 1}/${STEPS.length}: ${cur.name}` : "done — value chosen";
      svg.appendChild(ht);

      svg.appendChild(nodeBox(proposer, "proposer", cur && cur.phase === 1));
      acceptors.forEach((a, i) => {
        const hi = cur && (cur.phase === 1 || cur.phase === 2);
        const g = nodeBox(a, "acceptor", hi);
        svg.appendChild(g);
        if (a.accepted) {
          const t = $svg("text", { x: a.x + 36, y: a.y + 4, class: "anim-label--mono", fill: "#10b981" });
          t.textContent = `(n=${a.accepted.n}, v=${a.accepted.v})`;
          svg.appendChild(t);
        }
      });
      svg.appendChild(nodeBox(learner, "learner", cur && cur.phase === 3));

      // step description
      if (cur) {
        const dt = $svg("text", { x: 240, y: 222, "text-anchor": "middle", class: "anim-label" });
        dt.textContent = cur.desc;
        svg.appendChild(dt);
      } else {
        const dt = $svg("text", { x: 240, y: 222, "text-anchor": "middle", class: "anim-label", fill: "#10b981" });
        dt.textContent = "Value 42 has been chosen. Any future proposer must propose 42 too (Paxos safety).";
        svg.appendChild(dt);
      }

      readout.innerHTML = "";
      readout.appendChild($el("span", null, `ballot: <strong>n=${ballot}</strong>`));
      readout.appendChild($el("span", null, `quorum: <strong>2 of 3</strong>`));
      const accCount = acceptors.filter(a => a.accepted).length;
      readout.appendChild($el("span", null, `accepted: <strong>${accCount}/3</strong>`));
    }

    function doStep() {
      if (stepIdx >= STEPS.length) { reset(); return; }
      const cur = STEPS[stepIdx];
      if (cur.name === "prepare(n)") {
        acceptors.forEach(a => flashDot(svg, proposer, a, "#60a5fa", 500));
      } else if (cur.name === "promise") {
        // first two acceptors reply
        [0, 1].forEach(i => setTimeout(() => flashDot(svg, acceptors[i], proposer, "#fbbf24", 500), i * 120));
      } else if (cur.name === "accept(n, v)") {
        acceptors.forEach((a, i) => setTimeout(() => flashDot(svg, proposer, a, "#a78bfa", 500), i * 60));
      } else if (cur.name === "accepted") {
        [0, 1].forEach(i => {
          acceptors[i].accepted = { n: ballot, v: 42 };
          setTimeout(() => flashDot(svg, acceptors[i], proposer, "#10b981", 500), i * 120);
        });
        // third one lags a bit then accepts
        setTimeout(() => { acceptors[2].accepted = { n: ballot, v: 42 }; draw(); }, 600);
      } else if (cur.name === "learn") {
        acceptors.forEach((a, i) => {
          if (a.accepted) setTimeout(() => flashDot(svg, a, learner, "#34d399", 600), i * 80);
        });
      }
      stepIdx++;
      draw();
    }

    function play() {
      if (playing) return;
      playing = true;
      timer = setInterval(() => {
        if (stepIdx >= STEPS.length) { stopPlay(); return; }
        doStep();
      }, 1100);
    }
    function stopPlay() { playing = false; if (timer) { clearInterval(timer); timer = null; } }

    controls.appendChild(btn("step", "primary", doStep));
    controls.appendChild(btn("▶ play", null, play));
    controls.appendChild(btn("⏸ pause", null, stopPlay));
    controls.appendChild(btn("reset", "danger", reset));

    draw();
  }
  REG["paxos"] = animPaxos;

  // -------------------------------------------------------------------
  // 2) TWO-PHASE COMMIT (2PC)
  // -------------------------------------------------------------------
  function anim2PC(host) {
    const { stage, controls, readout } = frame(host, {
      title: "Two-phase commit — coordinator + participants",
      caption: "Phase 1: coordinator asks PREPARE; each participant votes YES (logged, locked) or NO. Phase 2: if all YES → COMMIT; any NO → ABORT. Toggle to force one participant to vote NO.",
    });

    const svg = $svg("svg", { viewBox: "0 0 480 260", width: 480, style: "max-width:100%;height:auto;" });
    stage.appendChild(svg);

    const coord = { x: 240, y: 50, label: "C" };
    const parts = [
      { x: 90,  y: 180, label: "P1", vote: null, state: "idle" },
      { x: 240, y: 180, label: "P2", vote: null, state: "idle" },
      { x: 390, y: 180, label: "P3", vote: null, state: "idle" },
    ];

    let forceNo = false;       // toggle
    let stepIdx = 0;
    const STEPS = ["prepare", "votes", "decide", "act"];

    function reset() {
      stepIdx = 0;
      parts.forEach(p => { p.vote = null; p.state = "idle"; });
      draw();
    }

    function nodeBox(n, role, color, sub) {
      const g = $svg("g");
      g.appendChild($svg("circle", { cx: n.x, cy: n.y, r: 22, fill: color, stroke: "rgba(167,139,250,0.6)", "stroke-width": 1.6 }));
      const lbl = $svg("text", { x: n.x, y: n.y + 5, "text-anchor": "middle", class: "anim-label",
        fill: "#0b0d18", "font-weight": 700 });
      lbl.textContent = n.label;
      g.appendChild(lbl);
      const role_lbl = $svg("text", { x: n.x, y: n.y - 32, "text-anchor": "middle", class: "anim-label--mono" });
      role_lbl.textContent = role;
      g.appendChild(role_lbl);
      if (sub) {
        const s = $svg("text", { x: n.x, y: n.y + 42, "text-anchor": "middle", class: "anim-label--mono", fill: sub.color });
        s.textContent = sub.text;
        g.appendChild(s);
      }
      return g;
    }

    function draw() {
      svg.innerHTML = "";
      const phase = STEPS[stepIdx] || "done";
      const ht = $svg("text", { x: 240, y: 22, "text-anchor": "middle", class: "anim-label--big" });
      ht.textContent = `phase: ${phase}`;
      svg.appendChild(ht);

      const allYes = parts.every(p => p.vote === "YES");
      const decided = (stepIdx >= 3);
      const willCommit = allYes;

      svg.appendChild(nodeBox(coord, "coordinator", "#fbbf24",
        decided ? { text: willCommit ? "COMMIT" : "ABORT", color: willCommit ? "#10b981" : "#ef4444" } : null));
      parts.forEach(p => {
        let color = "#a78bfa";
        let sub = null;
        if (p.vote === "YES") { color = "#34d399"; sub = { text: "vote YES (prepared)", color: "#10b981" }; }
        if (p.vote === "NO")  { color = "#ef4444"; sub = { text: "vote NO", color: "#ef4444" }; }
        if (p.state === "committed") sub = { text: "✓ committed", color: "#10b981" };
        if (p.state === "aborted")   sub = { text: "✗ aborted", color: "#ef4444" };
        svg.appendChild(nodeBox(p, "participant", color, sub));
      });

      // arrows
      parts.forEach(p => {
        svg.appendChild($svg("line", { x1: coord.x, y1: coord.y + 24, x2: p.x, y2: p.y - 24,
          stroke: "rgba(167,139,250,0.18)", "stroke-width": 1, "stroke-dasharray": "3 4" }));
      });

      readout.innerHTML = "";
      readout.appendChild($el("span", null, `step: <strong>${stepIdx + 1}/4</strong>`));
      readout.appendChild($el("span", null, `force-NO from P2: <strong>${forceNo ? "ON" : "off"}</strong>`));
      const votes = parts.map(p => p.vote || "?").join(", ");
      readout.appendChild($el("span", null, `votes: <strong>${votes}</strong>`));
    }

    function doStep() {
      if (stepIdx >= STEPS.length) { reset(); return; }
      const phase = STEPS[stepIdx];
      if (phase === "prepare") {
        // coordinator → participants
        parts.forEach((p, i) => setTimeout(() => flashDot(svg, coord, p, "#60a5fa", 500), i * 80));
      } else if (phase === "votes") {
        parts.forEach((p, i) => {
          // P2 may force NO; otherwise everyone says YES
          if (forceNo && p.label === "P2") p.vote = "NO";
          else p.vote = "YES";
          setTimeout(() => flashDot(svg, p, coord,
            p.vote === "YES" ? "#10b981" : "#ef4444", 500), i * 80);
        });
      } else if (phase === "decide") {
        // coordinator computes decision (no visual flight here — it's local)
      } else if (phase === "act") {
        const allYes = parts.every(p => p.vote === "YES");
        parts.forEach((p, i) => {
          p.state = allYes ? "committed" : "aborted";
          setTimeout(() => flashDot(svg, coord, p, allYes ? "#10b981" : "#ef4444", 500), i * 80);
        });
      }
      stepIdx++;
      setTimeout(draw, 50);
    }

    controls.appendChild(btn("step", "primary", doStep));
    controls.appendChild(btn("reset", null, reset));
    controls.appendChild(btn("toggle force-NO from P2", "danger", () => { forceNo = !forceNo; reset(); }));
    draw();
  }
  REG["2pc"] = anim2PC;

  // -------------------------------------------------------------------
  // 3) MAPREDUCE — shards → mappers → shuffle → reducers → output
  // -------------------------------------------------------------------
  function animMapReduce(host) {
    const { stage, controls, readout } = frame(host, {
      title: "MapReduce — map → shuffle → reduce",
      caption: "Each input shard is read by a mapper, which emits (k, v) pairs. Shuffle groups all values for the same key onto one reducer. Reducers fold each group into the final output.",
    });
    const svg = $svg("svg", { viewBox: "0 0 480 280", width: 480, style: "max-width:100%;height:auto;" });
    stage.appendChild(svg);

    // 4 shards · 3 mappers · 2 reducers
    const shards = [
      { x: 40, y: 40,  text: "the cat sat" },
      { x: 40, y: 90,  text: "on the mat" },
      { x: 40, y: 140, text: "the dog ran" },
      { x: 40, y: 190, text: "and ran fast" },
    ];
    const mappers = [
      { x: 180, y: 50 },
      { x: 180, y: 130 },
      { x: 180, y: 210 },
    ];
    const reducers = [
      { x: 340, y: 90  },
      { x: 340, y: 170 },
    ];
    const outputs = [
      { x: 440, y: 90,  text: "the:3 cat:1 ran:2" },
      { x: 440, y: 170, text: "sat:1 mat:1 dog:1 fast:1 and:1 on:1" },
    ];

    let phase = 0; // 0=idle, 1=map, 2=shuffle, 3=reduce, 4=done
    let playing = false, timer = null;

    function reset() { phase = 0; stopPlay(); draw(); }

    function rectShard(x, y, text, fill) {
      const g = $svg("g");
      g.appendChild($svg("rect", { x, y, width: 110, height: 32, rx: 6,
        fill: fill || "rgba(99,102,241,0.18)", stroke: "rgba(167,139,250,0.55)" }));
      const t = $svg("text", { x: x + 55, y: y + 20, "text-anchor": "middle", class: "anim-label--mono" });
      t.textContent = text;
      g.appendChild(t);
      return g;
    }

    function circleNode(x, y, label, fill) {
      const g = $svg("g");
      g.appendChild($svg("circle", { cx: x, cy: y, r: 20, fill: fill || "#a78bfa",
        stroke: "rgba(255,255,255,0.4)", "stroke-width": 1.5 }));
      const t = $svg("text", { x, y: y + 4, "text-anchor": "middle", class: "anim-label",
        fill: "#0b0d18", "font-weight": 700 });
      t.textContent = label;
      g.appendChild(t);
      return g;
    }

    function draw() {
      svg.innerHTML = "";
      // labels
      ["input shards", "mappers", "shuffle", "reducers", "output"].forEach((lbl, i) => {
        const xs = [85, 180, 260, 340, 440];
        const t = $svg("text", { x: xs[i], y: 260, "text-anchor": "middle", class: "anim-label--mono" });
        t.textContent = lbl;
        svg.appendChild(t);
      });

      shards.forEach((s, i) => {
        const hl = phase >= 1;
        svg.appendChild(rectShard(s.x, s.y - 8, s.text, hl ? "rgba(99,102,241,0.30)" : "rgba(99,102,241,0.10)"));
      });
      mappers.forEach((m, i) => {
        svg.appendChild(circleNode(m.x, m.y, "M" + (i + 1), phase >= 1 ? "#fbbf24" : "rgba(251,191,36,0.5)"));
      });
      // shuffle visual: vertical bar between mappers and reducers
      if (phase >= 2) {
        svg.appendChild($svg("rect", { x: 245, y: 40, width: 30, height: 180, rx: 4,
          fill: "rgba(236,72,153,0.20)", stroke: "rgba(236,72,153,0.55)" }));
        const t = $svg("text", { x: 260, y: 130, "text-anchor": "middle", class: "anim-label--mono", transform: "rotate(-90 260 130)" });
        t.textContent = "sort by key";
        svg.appendChild(t);
      }
      reducers.forEach((r, i) => {
        svg.appendChild(circleNode(r.x, r.y, "R" + (i + 1), phase >= 3 ? "#34d399" : "rgba(52,211,153,0.5)"));
      });
      outputs.forEach((o, i) => {
        if (phase >= 4) svg.appendChild(rectShard(o.x - 55, o.y - 16, o.text, "rgba(52,211,153,0.20)"));
      });

      // connecting lines (decorative)
      shards.forEach(s => {
        mappers.forEach(m => {
          svg.appendChild($svg("line", {
            x1: s.x + 110, y1: s.y + 8, x2: m.x - 20, y2: m.y,
            stroke: "rgba(167,139,250,0.10)", "stroke-width": 1,
          }));
        });
      });
      mappers.forEach(m => {
        reducers.forEach(r => {
          svg.appendChild($svg("line", {
            x1: m.x + 20, y1: m.y, x2: r.x - 20, y2: r.y,
            stroke: "rgba(167,139,250,0.10)", "stroke-width": 1,
          }));
        });
      });

      readout.innerHTML = "";
      const phaseName = ["idle", "map", "shuffle", "reduce", "done"][phase];
      readout.appendChild($el("span", null, `phase: <strong>${phaseName}</strong>`));
      readout.appendChild($el("span", null, `shards: <strong>${shards.length}</strong>`));
      readout.appendChild($el("span", null, `mappers: <strong>${mappers.length}</strong>`));
      readout.appendChild($el("span", null, `reducers: <strong>${reducers.length}</strong>`));
    }

    function doStep() {
      if (phase >= 4) { reset(); return; }
      phase++;
      if (phase === 1) {
        shards.forEach((s, i) => {
          const m = mappers[i % mappers.length];
          setTimeout(() => flashDot(svg, { x: s.x + 110, y: s.y + 8 }, m, "#fbbf24", 600), i * 80);
        });
      } else if (phase === 2) {
        mappers.forEach((m, i) => {
          setTimeout(() => flashDot(svg, { x: m.x + 20, y: m.y }, { x: 260, y: 130 }, "#f472b6", 500), i * 80);
        });
      } else if (phase === 3) {
        reducers.forEach((r, i) => {
          setTimeout(() => flashDot(svg, { x: 260, y: 130 }, r, "#34d399", 600), i * 80);
        });
      } else if (phase === 4) {
        reducers.forEach((r, i) => {
          setTimeout(() => flashDot(svg, r, { x: outputs[i].x - 55, y: outputs[i].y }, "#22d3ee", 500), i * 80);
        });
      }
      setTimeout(draw, 40);
    }

    function play() {
      if (playing) return;
      playing = true;
      timer = setInterval(() => {
        if (phase >= 4) { stopPlay(); return; }
        doStep();
      }, 1100);
    }
    function stopPlay() { playing = false; if (timer) { clearInterval(timer); timer = null; } }

    controls.appendChild(btn("step", "primary", doStep));
    controls.appendChild(btn("▶ play", null, play));
    controls.appendChild(btn("⏸ pause", null, stopPlay));
    controls.appendChild(btn("reset", "danger", reset));
    draw();
  }
  REG["mapreduce"] = animMapReduce;

  // -------------------------------------------------------------------
  // 4) GOSSIP — infection model on a ring of 8 nodes
  // -------------------------------------------------------------------
  function animGossip(host) {
    const { stage, controls, readout } = frame(host, {
      title: "Gossip protocol — epidemic propagation",
      caption: "8 nodes in a circle. One starts infected (knows the fact). Each tick, each infected node picks a random peer and with 50% probability infects it. The propagation curve is roughly logistic.",
    });
    const svg = $svg("svg", { viewBox: "0 0 480 320", width: 480, style: "max-width:100%;height:auto;" });
    stage.appendChild(svg);

    const N = 8;
    const cx = 140, cy = 120, R = 80;
    const nodes = [];
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2 - Math.PI / 2;
      nodes.push({ i, x: cx + Math.cos(a) * R, y: cy + Math.sin(a) * R, infected: i === 0 });
    }
    let tick = 0;
    let history = [{ tick: 0, infected: 1 }];
    let playing = false, timer = null;

    function reset() {
      tick = 0;
      nodes.forEach((n, i) => n.infected = (i === 0));
      history = [{ tick: 0, infected: 1 }];
      stopPlay();
      draw();
    }

    function doStep() {
      tick++;
      const infectedNow = nodes.filter(n => n.infected);
      const newlyInfected = [];
      infectedNow.forEach(n => {
        // pick random peer
        let peer = nodes[Math.floor(Math.random() * N)];
        while (peer === n) peer = nodes[Math.floor(Math.random() * N)];
        if (!peer.infected && Math.random() < 0.5) newlyInfected.push(peer);
      });
      newlyInfected.forEach(p => p.infected = true);
      history.push({ tick, infected: nodes.filter(n => n.infected).length });
      if (history.length > 30) history.shift();
      draw(newlyInfected.map(p => p.i));
    }

    function draw(highlightIds) {
      svg.innerHTML = "";
      highlightIds = highlightIds || [];
      // ring
      svg.appendChild($svg("circle", { cx, cy, r: R, fill: "none", stroke: "rgba(167,139,250,0.15)", "stroke-dasharray": "3 4" }));
      // edges (faint)
      for (let i = 0; i < N; i++) {
        for (let j = i + 1; j < N; j++) {
          svg.appendChild($svg("line", { x1: nodes[i].x, y1: nodes[i].y, x2: nodes[j].x, y2: nodes[j].y,
            stroke: "rgba(167,139,250,0.06)", "stroke-width": 1 }));
        }
      }
      // nodes
      nodes.forEach(n => {
        const fill = n.infected ? "#fb7185" : "rgba(99,102,241,0.30)";
        const stroke = highlightIds.indexOf(n.i) !== -1 ? "#fbbf24" : (n.infected ? "#ef4444" : "rgba(167,139,250,0.6)");
        const sw = highlightIds.indexOf(n.i) !== -1 ? 3 : 1.5;
        svg.appendChild($svg("circle", { cx: n.x, cy: n.y, r: 16, fill, stroke, "stroke-width": sw }));
        const t = $svg("text", { x: n.x, y: n.y + 4, "text-anchor": "middle", class: "anim-label",
          "font-weight": 700, fill: n.infected ? "#0b0d18" : "#fff" });
        t.textContent = n.i;
        svg.appendChild(t);
      });

      // chart on right
      const cx0 = 260, cy0 = 40, cw = 200, ch = 160;
      svg.appendChild($svg("rect", { x: cx0, y: cy0, width: cw, height: ch, rx: 6,
        fill: "rgba(15,23,42,0.45)", stroke: "rgba(167,139,250,0.25)" }));
      svg.appendChild($svg("text", { x: cx0 + cw / 2, y: cy0 - 4, "text-anchor": "middle", class: "anim-label--mono" }))
        .textContent = "infected over time";
      // axes
      svg.appendChild($svg("line", { x1: cx0 + 24, y1: cy0 + ch - 16, x2: cx0 + cw - 8, y2: cy0 + ch - 16, stroke: "rgba(255,255,255,0.25)" }));
      svg.appendChild($svg("line", { x1: cx0 + 24, y1: cy0 + 12, x2: cx0 + 24, y2: cy0 + ch - 16, stroke: "rgba(255,255,255,0.25)" }));
      // points
      let d = "";
      const xMax = Math.max(history.length - 1, 1);
      history.forEach((h, i) => {
        const x = cx0 + 24 + (i / xMax) * (cw - 36);
        const y = cy0 + ch - 16 - (h.infected / N) * (ch - 30);
        d += (i === 0 ? "M" : "L") + ` ${x} ${y}`;
      });
      svg.appendChild($svg("path", { d, fill: "none", stroke: "#fb7185", "stroke-width": 2 }));
      // last point dot
      if (history.length) {
        const lastH = history[history.length - 1];
        const x = cx0 + 24 + ((history.length - 1) / xMax) * (cw - 36);
        const y = cy0 + ch - 16 - (lastH.infected / N) * (ch - 30);
        svg.appendChild($svg("circle", { cx: x, cy: y, r: 4, fill: "#fbbf24" }));
      }
      // y label N
      const yl = $svg("text", { x: cx0 + 18, y: cy0 + 16, "text-anchor": "end", class: "anim-label--mono" });
      yl.textContent = N;
      svg.appendChild(yl);

      // table on bottom-left
      const infected = nodes.filter(n => n.infected).length;
      const bg = $svg("text", { x: 140, y: 240, "text-anchor": "middle", class: "anim-label--big",
        fill: infected === N ? "#10b981" : "#fbbf24" });
      bg.textContent = `tick ${tick}:  ${infected}/${N} infected`;
      svg.appendChild(bg);

      readout.innerHTML = "";
      readout.appendChild($el("span", null, `tick: <strong>${tick}</strong>`));
      readout.appendChild($el("span", null, `infected: <strong>${infected}/${N}</strong>`));
      readout.appendChild($el("span", null, `fanout: <strong>1 peer / tick / node</strong>`));
      readout.appendChild($el("span", null, `infect prob: <strong>50%</strong>`));
    }

    function play() {
      if (playing) return;
      playing = true;
      timer = setInterval(() => {
        if (nodes.every(n => n.infected)) { stopPlay(); return; }
        doStep();
      }, 700);
    }
    function stopPlay() { playing = false; if (timer) { clearInterval(timer); timer = null; } }

    controls.appendChild(btn("step", "primary", doStep));
    controls.appendChild(btn("▶ play", null, play));
    controls.appendChild(btn("⏸ pause", null, stopPlay));
    controls.appendChild(btn("reset", "danger", reset));
    draw();
  }
  REG["gossip"] = animGossip;

  // -------------------------------------------------------------------
  // 5) LEADER ELECTION — Bully algorithm
  // -------------------------------------------------------------------
  function animLeaderElection(host) {
    const { stage, controls, readout } = frame(host, {
      title: "Leader election — Bully algorithm",
      caption: "5 nodes with IDs 1..5. Initially leader = 5. Crash the leader; a lower-ID node detects it, broadcasts ELECTION to higher IDs. Highest alive replies OK, eventually announces itself COORDINATOR.",
    });
    const svg = $svg("svg", { viewBox: "0 0 480 280", width: 480, style: "max-width:100%;height:auto;" });
    stage.appendChild(svg);

    const N = 5;
    const cx = 240, cy = 130, R = 95;
    const nodes = [];
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2 - Math.PI / 2;
      nodes.push({ id: i + 1, x: cx + Math.cos(a) * R, y: cy + Math.sin(a) * R,
        alive: true, role: (i + 1 === N) ? "leader" : "follower" });
    }
    let log = ["init: node 5 is leader"];
    let step = 0;
    const SCRIPT = [
      { do: () => { /* noop */ }, msg: "crash leader (use button) to begin election" },
    ];

    function reset() {
      nodes.forEach((n, i) => { n.alive = true; n.role = (n.id === N) ? "leader" : "follower"; });
      log = ["init: node 5 is leader"];
      step = 0;
      stopPlay();
      draw();
    }

    function draw(highlightSet) {
      svg.innerHTML = "";
      highlightSet = highlightSet || new Set();
      svg.appendChild($svg("circle", { cx, cy, r: R, fill: "none", stroke: "rgba(167,139,250,0.12)", "stroke-dasharray": "3 4" }));
      nodes.forEach(n => {
        const fill = !n.alive ? "rgba(239,68,68,0.20)" :
                     n.role === "leader" ? "#34d399" :
                     n.role === "candidate" ? "#fbbf24" : "rgba(99,102,241,0.30)";
        const stroke = highlightSet.has(n.id) ? "#fbbf24" :
                       !n.alive ? "#ef4444" : "rgba(167,139,250,0.55)";
        const sw = highlightSet.has(n.id) ? 3 : 1.5;
        svg.appendChild($svg("circle", { cx: n.x, cy: n.y, r: 22, fill, stroke, "stroke-width": sw }));
        const t = $svg("text", { x: n.x, y: n.y + 5, "text-anchor": "middle", class: "anim-label",
          "font-weight": 700, fill: n.alive ? "#0b0d18" : "#ef4444" });
        t.textContent = n.id;
        svg.appendChild(t);
        const rt = $svg("text", { x: n.x, y: n.y + 40, "text-anchor": "middle", class: "anim-label--mono",
          fill: n.role === "leader" ? "#10b981" : null });
        rt.textContent = !n.alive ? "(down)" : n.role;
        svg.appendChild(rt);
      });

      // log on right
      const lx = 8, ly = 230;
      const lt = $svg("text", { x: lx, y: ly, class: "anim-label--mono", fill: "#a78bfa" });
      lt.textContent = "log:";
      svg.appendChild(lt);
      log.slice(-3).forEach((m, i) => {
        const t = $svg("text", { x: lx, y: ly + 16 + i * 14, class: "anim-label--mono" });
        t.textContent = "  " + m;
        svg.appendChild(t);
      });

      readout.innerHTML = "";
      const leader = nodes.find(n => n.role === "leader" && n.alive);
      readout.appendChild($el("span", null, `leader: <strong>${leader ? "n" + leader.id : "(electing)"}</strong>`));
      readout.appendChild($el("span", null, `alive: <strong>${nodes.filter(n => n.alive).length}/${N}</strong>`));
    }

    let playing = false, timer = null;

    // crash the current leader and run a bully election by id 2 (the "detector")
    function crashLeader() {
      const leader = nodes.find(n => n.role === "leader" && n.alive);
      if (!leader) return;
      leader.alive = false;
      leader.role = "down";
      log.push(`n${leader.id} crashed`);
      draw();

      // detector = lowest alive non-leader, here n2
      const detector = nodes.find(n => n.alive && n.id < leader.id);
      if (!detector) return;
      log.push(`n${detector.id} detects crash → starts election`);
      // ELECTION → higher ids that are still alive
      const higher = nodes.filter(n => n.alive && n.id > detector.id);
      higher.forEach((h, i) => setTimeout(() => flashDot(svg, detector, h, "#60a5fa", 500), 300 + i * 120));
      setTimeout(() => {
        log.push(`n${detector.id} → ELECTION to ${higher.map(h => "n" + h.id).join(", ")}`);
        // higher ids reply OK and start their own elections
        higher.forEach((h, i) => {
          h.role = "candidate";
          setTimeout(() => flashDot(svg, h, detector, "#fbbf24", 500), i * 120);
        });
        draw(new Set(higher.map(h => h.id).concat([detector.id])));
        log.push(`higher ids reply OK and join election`);
        // highest alive wins
        setTimeout(() => {
          const winner = higher[higher.length - 1];
          if (!winner) { reset(); return; }
          nodes.forEach(n => { if (n.alive) n.role = (n === winner) ? "leader" : "follower"; });
          // broadcast COORDINATOR
          log.push(`n${winner.id} → COORDINATOR broadcast`);
          nodes.forEach((n, i) => {
            if (n.alive && n !== winner) setTimeout(() => flashDot(svg, winner, n, "#34d399", 500), i * 60);
          });
          setTimeout(draw, 700);
        }, 1100);
      }, 900);
    }

    function play() {
      if (playing) return;
      playing = true;
      // automated demo: crash leader once, then stop.
      crashLeader();
      setTimeout(() => { playing = false; }, 2500);
    }
    function stopPlay() { playing = false; if (timer) { clearInterval(timer); timer = null; } }

    function stepFn() {
      // each "step" press just runs the next portion of the election if available
      if (step === 0) { crashLeader(); step++; return; }
      // subsequent presses just refresh / reset cleanly
      reset();
      step = 0;
    }

    controls.appendChild(btn("step", "primary", stepFn));
    controls.appendChild(btn("▶ play", null, play));
    controls.appendChild(btn("crash leader", "danger", crashLeader));
    controls.appendChild(btn("reset", null, reset));
    draw();
  }
  REG["leader-election"] = animLeaderElection;

  // -------------------------------------------------------------------
  // 6) SNAPSHOTTING — growing log + periodic compaction
  // -------------------------------------------------------------------
  function animSnapshot(host) {
    const { stage, controls, readout } = frame(host, {
      title: "Snapshotting — log truncation + compact state",
      caption: "Operations append to the log. A snapshot freezes the current state, then everything before the snapshot index is discarded. Restart = load snapshot + replay tail (much faster than replaying full log).",
    });
    const svg = $svg("svg", { viewBox: "0 0 480 240", width: 480, style: "max-width:100%;height:auto;" });
    stage.appendChild(svg);

    // log entries: { idx, op, snapshotted }
    let entries = [];
    let nextIdx = 1;
    let snapshotIdx = 0; // entries with idx <= snapshotIdx are gone, replaced by snapshot
    let snapshotState = ""; // small text representation
    let playing = false, timer = null;
    const MAX_VISIBLE = 12;
    const OPS = ["set x=1", "set y=2", "incr x", "set z=3", "del y", "incr x", "set w=9", "incr z", "set a=1", "del z", "incr w"];

    function reset() {
      entries = [];
      nextIdx = 1;
      snapshotIdx = 0;
      snapshotState = "";
      stopPlay();
      draw();
    }

    function appendOp() {
      const op = OPS[(nextIdx - 1) % OPS.length];
      entries.push({ idx: nextIdx++, op });
      draw();
    }

    function takeSnapshot() {
      // produce a tiny "state" string from ops applied so far (visual only)
      const upTo = entries.filter(e => e.idx > snapshotIdx).slice(-3).map(e => e.op).join(" · ");
      snapshotState = "state@" + (nextIdx - 1) + " — " + (upTo || "(empty)");
      snapshotIdx = nextIdx - 1;
      // drop truncated entries
      entries = entries.filter(e => e.idx > snapshotIdx);
      draw();
    }

    function draw() {
      svg.innerHTML = "";

      // snapshot block
      const sx = 10, sy = 30, sw = 130, sh = 90;
      svg.appendChild($svg("rect", { x: sx, y: sy, width: sw, height: sh, rx: 8,
        fill: snapshotIdx ? "rgba(52,211,153,0.18)" : "rgba(99,102,241,0.10)",
        stroke: snapshotIdx ? "#34d399" : "rgba(167,139,250,0.55)",
        "stroke-width": 1.8 }));
      const t = $svg("text", { x: sx + sw / 2, y: sy - 6, "text-anchor": "middle", class: "anim-label",
        "font-weight": 700, fill: snapshotIdx ? "#10b981" : null });
      t.textContent = snapshotIdx ? `snapshot @ idx=${snapshotIdx}` : "(no snapshot)";
      svg.appendChild(t);
      const t2 = $svg("text", { x: sx + sw / 2, y: sy + sh / 2 + 4, "text-anchor": "middle", class: "anim-label--mono" });
      t2.textContent = snapshotState || "(empty)";
      svg.appendChild(t2);
      const t3 = $svg("text", { x: sx + sw / 2, y: sy + sh + 18, "text-anchor": "middle", class: "anim-label--mono", fill: "#a78bfa" });
      t3.textContent = "compact, O(state)";
      svg.appendChild(t3);

      // arrow to log
      svg.appendChild($svg("path", { d: `M${sx + sw} ${sy + sh / 2} L${sx + sw + 22} ${sy + sh / 2}`,
        stroke: "rgba(167,139,250,0.6)", "stroke-width": 2, fill: "none", "marker-end": "url(#snap-arrow)" }));
      const defs = $svg("defs", {});
      const marker = $svg("marker", { id: "snap-arrow", viewBox: "0 0 10 10", refX: 8, refY: 5, markerWidth: 6, markerHeight: 6, orient: "auto" });
      marker.appendChild($svg("path", { d: "M0 0 L10 5 L0 10 z", fill: "rgba(167,139,250,0.8)" }));
      defs.appendChild(marker);
      svg.appendChild(defs);

      // log entries
      const lx0 = 170, ly = 60;
      const cellW = 26, cellH = 36;
      const visible = entries.slice(-MAX_VISIBLE);
      svg.appendChild($svg("text", { x: lx0, y: ly - 14, class: "anim-label",
        "font-weight": 700 })).textContent = "log (tail)";
      visible.forEach((e, i) => {
        const x = lx0 + i * cellW;
        svg.appendChild($svg("rect", { x, y: ly, width: cellW - 2, height: cellH, rx: 4,
          fill: "rgba(251,191,36,0.25)", stroke: "rgba(251,191,36,0.7)" }));
        const t = $svg("text", { x: x + cellW / 2 - 1, y: ly + cellH / 2 + 4, "text-anchor": "middle",
          class: "anim-label--mono", fill: "#fbbf24" });
        t.textContent = e.idx;
        svg.appendChild(t);
      });
      // truncation marker
      if (snapshotIdx > 0) {
        const tm = $svg("text", { x: lx0 - 8, y: ly + cellH + 18, class: "anim-label--mono", fill: "#ef4444" });
        tm.textContent = `(everything ≤ ${snapshotIdx} discarded)`;
        svg.appendChild(tm);
      }
      // op text under each
      visible.forEach((e, i) => {
        const x = lx0 + i * cellW;
        const t = $svg("text", { x: x + cellW / 2, y: ly + cellH + 32 - (i % 2) * 12, "text-anchor": "middle",
          class: "anim-label--mono" });
        t.textContent = e.op;
        svg.appendChild(t);
      });

      // restart cost annotation
      const cost = snapshotIdx ? `restart cost: load snapshot + replay ${entries.length} entries` :
                                  `restart cost: replay all ${entries.length} entries`;
      const ct = $svg("text", { x: 240, y: 220, "text-anchor": "middle", class: "anim-label",
        fill: snapshotIdx ? "#10b981" : "#fbbf24" });
      ct.textContent = cost;
      svg.appendChild(ct);

      readout.innerHTML = "";
      readout.appendChild($el("span", null, `next idx: <strong>${nextIdx}</strong>`));
      readout.appendChild($el("span", null, `log tail entries: <strong>${entries.length}</strong>`));
      readout.appendChild($el("span", null, `last snapshot: <strong>${snapshotIdx || "(none)"}</strong>`));
    }

    function play() {
      if (playing) return;
      playing = true;
      let count = 0;
      timer = setInterval(() => {
        appendOp();
        count++;
        // auto snapshot every 5 ops
        if (nextIdx > 1 && (nextIdx - 1) % 5 === 0) {
          setTimeout(takeSnapshot, 300);
        }
        if (count > 20) stopPlay();
      }, 600);
    }
    function stopPlay() { playing = false; if (timer) { clearInterval(timer); timer = null; } }

    controls.appendChild(btn("append op", "primary", appendOp));
    controls.appendChild(btn("take snapshot", null, takeSnapshot));
    controls.appendChild(btn("▶ play", null, play));
    controls.appendChild(btn("⏸ pause", null, stopPlay));
    controls.appendChild(btn("reset", "danger", reset));
    draw();
  }
  REG["snapshot"] = animSnapshot;

})();
