/* ===========================================================
   SDE Growth Arc — interactive animation engine
   Original SVG + vanilla JS. No external dependencies (beyond
   the Mermaid bundle loaded by mkdocs.yml).
   =========================================================== */

(function () {
  "use strict";

  const SVGNS = "http://www.w3.org/2000/svg";

  const PALETTE = [
    "#a78bfa", "#f472b6", "#fbbf24", "#34d399",
    "#60a5fa", "#fb7185", "#22d3ee", "#fde047",
  ];

  // ---------- helpers ----------------------------------------------------
  function $svg(tag, attrs) {
    const el = document.createElementNS(SVGNS, tag);
    for (const k in attrs) el.setAttribute(k, attrs[k]);
    return el;
  }
  function $el(tag, cls, html) {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (html !== undefined) el.innerHTML = html;
    return el;
  }
  function hash32(str) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h;
  }

  // Shared frame wrapper around an animation
  function frame(host, opts) {
    host.innerHTML = "";
    host.classList.add("sde-anim");
    const header = $el("div", "sde-anim__header");
    const titleWrap = $el("div");
    titleWrap.appendChild($el("h4", "sde-anim__title", opts.title));
    if (opts.caption) titleWrap.appendChild($el("p", "sde-anim__caption", opts.caption));
    header.appendChild(titleWrap);
    header.appendChild($el("span", "sde-anim__badge", "Interactive"));
    host.appendChild(header);
    const stage = $el("div", "sde-anim__stage");
    host.appendChild(stage);
    const controls = $el("div", "sde-anim__controls");
    host.appendChild(controls);
    const readout = $el("div", "sde-anim__readout");
    host.appendChild(readout);
    return { stage, controls, readout };
  }
  // Shared SVG defs injected into every animation's SVG so we can reference them
  // by id (url(#bda-soft-glow), url(#bda-aurora) etc.) for cheap polish.
  function injectDefs(svg) {
    if (svg.querySelector("defs[data-bda='shared']")) return;
    const defs = $svg("defs", { "data-bda": "shared" });
    defs.innerHTML = `
      <linearGradient id="bda-aurora" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%"  stop-color="#6366f1"/>
        <stop offset="55%" stop-color="#06b6d4"/>
        <stop offset="100%" stop-color="#34d399"/>
      </linearGradient>
      <linearGradient id="bda-warm" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%"  stop-color="#fbbf24"/>
        <stop offset="100%" stop-color="#fb7185"/>
      </linearGradient>
      <radialGradient id="bda-spot" cx="50%" cy="50%" r="50%">
        <stop offset="0%"  stop-color="#a78bfa" stop-opacity="0.6"/>
        <stop offset="100%" stop-color="#a78bfa" stop-opacity="0"/>
      </radialGradient>
      <filter id="bda-soft-glow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="3" result="b"/>
        <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
      <filter id="bda-shadow" x="-50%" y="-50%" width="200%" height="200%">
        <feDropShadow dx="0" dy="3" stdDeviation="4" flood-color="#000" flood-opacity="0.3"/>
      </filter>
    `;
    svg.insertBefore(defs, svg.firstChild);
  }
  function btn(label, kind, onClick) {
    const b = $el("button", "sde-anim__btn" + (kind ? " sde-anim__btn--" + kind : ""), label);
    b.type = "button";
    b.addEventListener("click", onClick);
    return b;
  }
  // Segmented control: keeps the active button highlighted when clicked.
  // items = [{label, value}], getActive returns current value, onSelect(value)
  function modeGroup(parent, items, getActive, onSelect) {
    const wrap = $el("div", "sde-anim__mode");
    items.forEach(it => {
      const b = $el("button", "sde-anim__btn", it.label);
      b.type = "button";
      b.dataset.value = it.value;
      b.addEventListener("click", () => {
        onSelect(it.value);
        refresh();
      });
      wrap.appendChild(b);
    });
    function refresh() {
      const active = getActive();
      [...wrap.children].forEach(b => {
        b.classList.toggle("sde-anim__btn--primary", b.dataset.value === active);
      });
    }
    refresh();
    parent.appendChild(wrap);
    return refresh;
  }

  // =====================================================================
  //  1) CONSISTENT HASHING RING
  // =====================================================================
  function animConsistentHash(host) {
    const { stage, controls, readout } = frame(host, {
      title: "Consistent hashing ring",
      caption: "Add or remove servers; only keys whose nearest node changes get re-routed. Without consistent hashing, removing one of N servers would re-shuffle (N-1)/N of all keys.",
    });

    const size = 460;
    const cx = size / 2;
    const cy = size / 2;
    const rRing = 170;
    const rNode = 14;

    const svg = $svg("svg", {
      viewBox: `0 0 ${size} ${size}`,
      width: 460,
      style: "max-width:100%;height:auto;",
    });
    stage.appendChild(svg);

    // Defs: gradient for keys
    const defs = $svg("defs", {});
    const grad = $svg("radialGradient", { id: "ch-key-grad" });
    grad.appendChild($svg("stop", { offset: "0%", "stop-color": "#fbbf24" }));
    grad.appendChild($svg("stop", { offset: "100%", "stop-color": "#f97316" }));
    defs.appendChild(grad);
    svg.appendChild(defs);

    // Animated dashed ring track
    svg.appendChild($svg("circle", {
      cx, cy, r: rRing, class: "ring-track",
    }));

    const state = {
      nodes: ["alpha", "bravo", "charlie"],
      replicas: 6,
      keys: ["user:42", "cart:7", "session:91", "obj:120", "tag:99", "row:55", "post:3", "img:200"],
    };

    function angleOf(label) {
      return (hash32(label) % 360) * Math.PI / 180;
    }
    function pointOnRing(angle, r) {
      return [cx + Math.sin(angle) * r, cy - Math.cos(angle) * r];
    }

    function nodePositions() {
      const all = [];
      state.nodes.forEach((n, idx) => {
        for (let r = 0; r < state.replicas; r++) {
          const label = `${n}#${r}`;
          all.push({
            node: n,
            replica: r,
            label,
            angle: angleOf(label),
            color: PALETTE[idx % PALETTE.length],
          });
        }
      });
      return all.sort((a, b) => a.angle - b.angle);
    }
    function nearestNode(keyAngle, vnodes) {
      for (const v of vnodes) if (v.angle >= keyAngle) return v;
      return vnodes[0];
    }

    function render() {
      // wipe previous
      [...svg.querySelectorAll(".ring-node,.ring-vnode,.ring-key,.ring-key-line,.ring-key-label")]
        .forEach(n => n.remove());

      const vnodes = nodePositions();

      // virtual nodes (small)
      vnodes.forEach(v => {
        const [x, y] = pointOnRing(v.angle, rRing);
        const g = $svg("g", { class: "ring-node ring-vnode" });
        g.style.color = v.color;
        const c = $svg("circle", { cx: x, cy: y, r: 5, fill: v.color });
        g.appendChild(c);
        svg.appendChild(g);
      });

      // primary node labels — placed at first replica of each
      state.nodes.forEach((n, idx) => {
        const v0 = vnodes.find(v => v.node === n);
        const [x, y] = pointOnRing(v0.angle, rRing + 26);
        const g = $svg("g", { class: "ring-node" });
        g.style.color = PALETTE[idx % PALETTE.length];
        const lbl = $svg("text", {
          x, y,
          "text-anchor": "middle",
          "dominant-baseline": "middle",
          class: "anim-label",
          fill: PALETTE[idx % PALETTE.length],
        });
        lbl.textContent = n;
        g.appendChild(lbl);
        svg.appendChild(g);
      });

      // keys
      let routed = {};
      state.keys.forEach((k) => {
        const a = angleOf(k);
        const owner = nearestNode(a, vnodes);
        routed[k] = owner.node;
        const [kx, ky] = pointOnRing(a, rRing - 36);
        const [ox, oy] = pointOnRing(owner.angle, rRing);
        // line to owner
        const line = $svg("line", {
          x1: kx, y1: ky, x2: ox, y2: oy, class: "ring-key-line",
        });
        line.classList.add("ring-key-line");
        svg.appendChild(line);
        // key dot
        const kCircle = $svg("circle", {
          cx: kx, cy: ky, r: 6,
          fill: "url(#ch-key-grad)",
          class: "ring-key",
          stroke: owner.color,
          "stroke-width": 1.5,
        });
        svg.appendChild(kCircle);
        const t = $svg("text", {
          x: kx, y: ky - 12,
          "text-anchor": "middle",
          class: "anim-label--mono",
        });
        t.classList.add("ring-key-label");
        t.textContent = k;
        svg.appendChild(t);
      });

      // readout
      readout.innerHTML = "";
      readout.appendChild($el("span", null, `<strong>${state.nodes.length}</strong> nodes`));
      readout.appendChild($el("span", null, `<strong>${state.replicas}</strong> v-nodes each`));
      readout.appendChild($el("span", null, `<strong>${state.keys.length}</strong> keys placed`));
      readout.appendChild($el("span", null, `re-route on remove: ~<strong>${(100/state.nodes.length).toFixed(0)}%</strong>`));
    }

    // controls
    let counter = 4;
    controls.appendChild(btn("+ add node", "primary", () => {
      if (state.nodes.length >= 6) return;
      state.nodes.push(["delta","echo","foxtrot","golf","hotel"][counter++ - 4] || ("node" + counter));
      render();
    }));
    controls.appendChild(btn("– remove node", "danger", () => {
      if (state.nodes.length <= 2) return;
      state.nodes.pop();
      render();
    }));
    controls.appendChild(btn("shuffle keys", null, () => {
      state.keys = state.keys.map((_, i) => "k:" + Math.floor(Math.random() * 9999));
      render();
    }));
    controls.appendChild(btn("more v-nodes", null, () => {
      state.replicas = Math.min(20, state.replicas + 2);
      render();
    }));
    controls.appendChild(btn("fewer v-nodes", null, () => {
      state.replicas = Math.max(2, state.replicas - 2);
      render();
    }));

    render();
  }

  // =====================================================================
  //  2) RAFT — leader election + log replication
  // =====================================================================
  function animRaft(host) {
    const { stage, controls, readout } = frame(host, {
      title: "Raft — leader election & log replication",
      caption: "Five-node cluster. Kill the leader to trigger an election; partition the network to see how Raft refuses progress without a quorum.",
    });

    const size = 460;
    const svg = $svg("svg", { viewBox: `0 0 ${size} 260`, width: 460, style: "max-width:100%;height:auto;" });
    stage.appendChild(svg);

    const N = 5;
    const nodes = [];
    const cx = size / 2, cy = 130, R = 95;
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2 - Math.PI / 2;
      nodes.push({
        i, x: cx + Math.cos(a) * R, y: cy + Math.sin(a) * R,
        state: i === 0 ? "leader" : "follower",
        term: 1, log: [], down: false,
      });
    }

    let term = 1;
    let leaderId = 0;
    let timer = null;

    function draw() {
      svg.innerHTML = "";

      // links between nodes (mesh)
      for (let i = 0; i < N; i++) {
        for (let j = i + 1; j < N; j++) {
          const ln = $svg("line", {
            x1: nodes[i].x, y1: nodes[i].y, x2: nodes[j].x, y2: nodes[j].y,
            stroke: "rgba(167,139,250,0.12)", "stroke-width": 1,
          });
          svg.appendChild(ln);
        }
      }

      nodes.forEach(n => {
        const stateClass = n.down ? "raft-node--down" : "raft-node--" + n.state;
        const g = $svg("g", { class: "raft-node " + stateClass });
        g.style.transform = `translate(${n.x}px, ${n.y}px)`;
        const c = $svg("circle", { r: 22, cx: 0, cy: 0 });
        g.appendChild(c);
        const lbl = $svg("text", {
          x: 0, y: 4, "text-anchor": "middle", class: "anim-label",
          fill: "#fff", "font-weight": 700,
        });
        lbl.textContent = n.state === "leader" ? "L" : n.state === "candidate" ? "C" : "F";
        g.appendChild(lbl);

        const sub = $svg("text", {
          x: 0, y: 40, "text-anchor": "middle", class: "anim-label--mono",
        });
        sub.textContent = `n${n.i}·t${n.term}`;
        g.appendChild(sub);

        if (n.log.length) {
          for (let li = 0; li < Math.min(n.log.length, 5); li++) {
            const sq = $svg("rect", {
              x: -22 + li * 9, y: -38, width: 7, height: 7, rx: 1.5,
              fill: "#fbbf24",
              opacity: n.log[li].committed ? 1 : 0.45,
            });
            g.appendChild(sq);
          }
        }
        svg.appendChild(g);
      });

      readout.innerHTML = "";
      readout.appendChild($el("span", null, `term: <strong>${term}</strong>`));
      readout.appendChild($el("span", null, `leader: <strong>${leaderId === -1 ? "(none)" : "n" + leaderId}</strong>`));
      const alive = nodes.filter(n => !n.down).length;
      readout.appendChild($el("span", null, `quorum: <strong>${Math.floor(N/2) + 1}</strong> · alive: <strong>${alive}</strong>`));
    }

    function flashMsg(from, to) {
      const dot = $svg("circle", { r: 4, cx: from.x, cy: from.y, fill: "#a78bfa" });
      svg.appendChild(dot);
      const start = performance.now();
      function step(t) {
        const u = Math.min(1, (t - start) / 600);
        dot.setAttribute("cx", from.x + (to.x - from.x) * u);
        dot.setAttribute("cy", from.y + (to.y - from.y) * u);
        dot.setAttribute("opacity", 1 - u * 0.7);
        if (u < 1) requestAnimationFrame(step);
        else dot.remove();
      }
      requestAnimationFrame(step);
    }

    function elect() {
      term++;
      const alive = nodes.filter(n => !n.down);
      if (alive.length < Math.floor(N/2) + 1) {
        nodes.forEach(n => { if (!n.down) n.state = "candidate"; });
        leaderId = -1;
        draw();
        return;
      }
      // pick a candidate
      const cand = alive.find(n => n.state !== "leader") || alive[0];
      nodes.forEach(n => { if (!n.down) n.state = n === cand ? "candidate" : "follower"; n.term = term; });
      draw();
      // vote messages
      alive.forEach(n => { if (n !== cand) flashMsg(cand, n); });
      setTimeout(() => {
        nodes.forEach(n => n.state = n === cand ? "leader" : n.down ? n.state : "follower");
        leaderId = cand.i;
        draw();
      }, 700);
    }

    function appendLog() {
      const leader = nodes[leaderId];
      if (!leader || leader.down) return;
      const entry = { id: leader.log.length + 1, committed: false };
      leader.log.push(entry);
      // replicate
      nodes.forEach(n => { if (n !== leader && !n.down) flashMsg(leader, n); });
      setTimeout(() => {
        nodes.forEach(n => { if (!n.down) n.log.push({ ...entry }); });
        // ack
        nodes.forEach(n => { if (n !== leader && !n.down) flashMsg(n, leader); });
        setTimeout(() => {
          nodes.forEach(n => n.log.forEach(e => { if (e.id === entry.id) e.committed = true; }));
          draw();
        }, 600);
        draw();
      }, 700);
    }

    function killLeader() {
      if (leaderId === -1) return;
      nodes[leaderId].down = true;
      leaderId = -1;
      draw();
      setTimeout(elect, 600);
    }

    function partition() {
      // take down minority (2 nodes) — quorum survives
      nodes[3].down = true;
      nodes[4].down = true;
      draw();
    }
    function heal() {
      nodes.forEach(n => n.down = false);
      draw();
    }

    controls.appendChild(btn("append log entry", "primary", appendLog));
    controls.appendChild(btn("kill leader", "danger", killLeader));
    controls.appendChild(btn("partition (–2)", null, partition));
    controls.appendChild(btn("heal cluster", null, heal));

    draw();
  }

  // =====================================================================
  //  3) TOKEN BUCKET + LEAKY BUCKET
  // =====================================================================
  function animBuckets(host) {
    const { stage, controls, readout } = frame(host, {
      title: "Token bucket vs leaky bucket",
      caption: "Token bucket allows bursts up to capacity; leaky bucket smooths to a constant rate. Click ‘send 10 burst’ to compare.",
    });

    const svg = $svg("svg", { viewBox: "0 0 460 230", width: 460, style: "max-width:100%;height:auto;" });
    stage.appendChild(svg);

    const defs = $svg("defs", {});
    const g1 = $svg("linearGradient", { id: "bucket-grad", x1: 0, y1: 0, x2: 0, y2: 1 });
    g1.appendChild($svg("stop", { offset: "0%", "stop-color": "#7dd3fc" }));
    g1.appendChild($svg("stop", { offset: "100%", "stop-color": "#3b82f6" }));
    defs.appendChild(g1);
    svg.appendChild(defs);

    // -- Token bucket box --
    function bucketShape(x0, y0, label) {
      const g = $svg("g", { transform: `translate(${x0},${y0})` });
      const wall = $svg("path", {
        d: "M0 0 L0 120 L80 120 L80 0",
        fill: "none", stroke: "rgba(167,139,250,0.6)", "stroke-width": 2,
      });
      g.appendChild(wall);
      const t = $svg("text", {
        x: 40, y: -10, "text-anchor": "middle", class: "anim-label",
      });
      t.textContent = label;
      g.appendChild(t);
      return g;
    }

    const tbG = bucketShape(60, 70, "token bucket (cap 10, refill 2/s)");
    svg.appendChild(tbG);
    const lbG = bucketShape(290, 70, "leaky bucket (leak 2/s)");
    svg.appendChild(lbG);

    const tokens = [];
    const TB_CAP = 10;
    let tbCount = 5;
    let lbLevel = 0;
    const LB_CAP = 10;
    let allowed = 0, denied = 0, leaked = 0;

    function drawTokens() {
      tbG.querySelectorAll(".bucket-token").forEach(n => n.remove());
      for (let i = 0; i < tbCount; i++) {
        const col = i % 4;
        const row = Math.floor(i / 4);
        const c = $svg("circle", {
          cx: 14 + col * 18, cy: 108 - row * 18, r: 6,
          class: "bucket-token",
        });
        tbG.appendChild(c);
      }
      // leaky water
      lbG.querySelectorAll(".bucket-water").forEach(n => n.remove());
      const h = (lbLevel / LB_CAP) * 116;
      const w = $svg("rect", {
        x: 2, y: 118 - h, width: 76, height: h,
        class: "bucket-water",
      });
      lbG.appendChild(w);

      readout.innerHTML = "";
      readout.appendChild($el("span", null, `TB tokens: <strong>${tbCount}/${TB_CAP}</strong>`));
      readout.appendChild($el("span", null, `LB level: <strong>${lbLevel.toFixed(1)}/${LB_CAP}</strong>`));
      readout.appendChild($el("span", null, `allowed: <strong>${allowed}</strong>`));
      readout.appendChild($el("span", null, `denied: <strong>${denied}</strong>`));
    }

    function sendOne() {
      const okTB = tbCount > 0;
      if (okTB) { tbCount--; allowed++; }
      else denied++;

      const okLB = lbLevel < LB_CAP;
      if (okLB) lbLevel = Math.min(LB_CAP, lbLevel + 1);

      // visual request dots
      function flashReq(parent, ok, yOff) {
        const dot = $svg("circle", {
          cx: -20, cy: 60 + yOff, r: 7,
          fill: ok ? "#10b981" : "#ef4444",
          opacity: 0,
        });
        parent.appendChild(dot);
        const start = performance.now();
        const targetX = ok ? 100 : -30;
        function step(t) {
          const u = Math.min(1, (t - start) / 500);
          dot.setAttribute("cx", -20 + (targetX - (-20)) * u);
          dot.setAttribute("opacity", u < 0.2 ? u * 5 : 1 - (u - 0.2) * 1.25);
          if (u < 1) requestAnimationFrame(step);
          else dot.remove();
        }
        requestAnimationFrame(step);
      }
      flashReq(tbG, okTB, 0);
      flashReq(lbG, okLB, 0);
      drawTokens();
    }

    function burst(n) {
      let i = 0;
      const id = setInterval(() => {
        sendOne();
        i++;
        if (i >= n) clearInterval(id);
      }, 90);
    }

    // refill / leak loop
    setInterval(() => {
      tbCount = Math.min(TB_CAP, tbCount + 1);
      if (lbLevel > 0) { lbLevel = Math.max(0, lbLevel - 1); leaked++; }
      drawTokens();
    }, 500);

    controls.appendChild(btn("send 1 request", "primary", () => sendOne()));
    controls.appendChild(btn("send burst (10)", null, () => burst(10)));
    controls.appendChild(btn("send burst (20)", "danger", () => burst(20)));
    controls.appendChild(btn("reset", null, () => { tbCount = 5; lbLevel = 0; allowed = 0; denied = 0; drawTokens(); }));

    drawTokens();
  }

  // =====================================================================
  //  4) KAFKA PARTITIONS + CONSUMER GROUPS
  // =====================================================================
  function animKafka(host) {
    const { stage, controls, readout } = frame(host, {
      title: "Kafka — producer, partitions, consumer group",
      caption: "Producer hashes keys to one of 4 partitions. A 3-consumer group splits partitions; rebalance redistributes when one consumer leaves.",
    });
    const svg = $svg("svg", { viewBox: "0 0 480 240", width: 480, style: "max-width:100%;height:auto;" });
    stage.appendChild(svg);

    const PARTITIONS = 4;
    let consumers = 3;
    let produced = 0, consumed = 0;

    function assign() {
      const map = {};
      for (let p = 0; p < PARTITIONS; p++) map[p] = p % consumers;
      return map;
    }

    function draw() {
      svg.innerHTML = "";
      // producer
      const prod = $svg("rect", { x: 20, y: 90, width: 80, height: 50, rx: 8, fill: "#7c3aed" });
      svg.appendChild(prod);
      const pt = $svg("text", { x: 60, y: 122, "text-anchor": "middle", class: "anim-label", fill: "#fff" });
      pt.textContent = "Producer";
      svg.appendChild(pt);

      // partitions
      for (let p = 0; p < PARTITIONS; p++) {
        const y = 20 + p * 50;
        const r = $svg("rect", { x: 170, y, width: 130, height: 38, rx: 6, fill: "rgba(167,139,250,0.12)", stroke: "rgba(167,139,250,0.4)" });
        svg.appendChild(r);
        const t = $svg("text", { x: 175, y: y + 22, class: "anim-label--mono" });
        t.textContent = `partition ${p}`;
        svg.appendChild(t);
        // offset markers
        for (let o = 0; o < 6; o++) {
          const oc = $svg("rect", {
            x: 250 + o * 8, y: y + 12, width: 6, height: 14, rx: 1.5,
            fill: PALETTE[p % PALETTE.length],
            opacity: 0.6,
          });
          svg.appendChild(oc);
        }
      }

      // consumers
      const map = assign();
      for (let c = 0; c < consumers; c++) {
        const y = 30 + c * (180 / consumers);
        const rect = $svg("rect", { x: 370, y, width: 90, height: 40, rx: 8, fill: PALETTE[c] });
        svg.appendChild(rect);
        const txt = $svg("text", { x: 415, y: y + 24, "text-anchor": "middle", class: "anim-label", fill: "#0b0d18", "font-weight": 700 });
        txt.textContent = `C${c}`;
        svg.appendChild(txt);
        // connect to partitions it owns
        for (let p = 0; p < PARTITIONS; p++) {
          if (map[p] === c) {
            const px = 300, py = 20 + p * 50 + 19;
            const cx2 = 370, cy2 = y + 20;
            const ln = $svg("path", {
              d: `M${px} ${py} C${(px + cx2) / 2} ${py} ${(px + cx2) / 2} ${cy2} ${cx2} ${cy2}`,
              stroke: PALETTE[c], "stroke-width": 1.5, fill: "none", opacity: 0.7,
            });
            svg.appendChild(ln);
          }
        }
      }

      readout.innerHTML = "";
      readout.appendChild($el("span", null, `partitions: <strong>${PARTITIONS}</strong>`));
      readout.appendChild($el("span", null, `consumers: <strong>${consumers}</strong>`));
      readout.appendChild($el("span", null, `produced: <strong>${produced}</strong>`));
      readout.appendChild($el("span", null, `consumed: <strong>${consumed}</strong>`));
    }

    function send() {
      const p = Math.floor(Math.random() * PARTITIONS);
      const dot = $svg("circle", { cx: 100, cy: 115, r: 6, fill: PALETTE[p % PALETTE.length] });
      svg.appendChild(dot);
      const targetX = 235, targetY = 20 + p * 50 + 19;
      const start = performance.now();
      function step(t) {
        const u = Math.min(1, (t - start) / 600);
        dot.setAttribute("cx", 100 + (targetX - 100) * u);
        dot.setAttribute("cy", 115 + (targetY - 115) * u);
        if (u < 1) requestAnimationFrame(step);
        else {
          produced++;
          // consume after a tick
          const c = p % consumers;
          const cx2 = 415, cy2 = 30 + c * (180 / consumers) + 20;
          const s2 = performance.now();
          function step2(t) {
            const u = Math.min(1, (t - s2) / 600);
            dot.setAttribute("cx", targetX + (cx2 - targetX) * u);
            dot.setAttribute("cy", targetY + (cy2 - targetY) * u);
            dot.setAttribute("opacity", 1 - u * 0.8);
            if (u < 1) requestAnimationFrame(step2);
            else { consumed++; dot.remove(); draw(); }
          }
          requestAnimationFrame(step2);
          draw();
        }
      }
      requestAnimationFrame(step);
    }

    controls.appendChild(btn("publish 1", "primary", send));
    controls.appendChild(btn("publish burst", null, () => { for (let i = 0; i < 8; i++) setTimeout(send, i * 120); }));
    controls.appendChild(btn("+ consumer", null, () => { if (consumers < PARTITIONS) { consumers++; draw(); } }));
    controls.appendChild(btn("– consumer (rebalance)", "danger", () => { if (consumers > 1) { consumers--; draw(); } }));

    draw();
  }

  // =====================================================================
  //  5) LSM vs B+TREE
  // =====================================================================
  function animLsmBtree(host) {
    const { stage, controls, readout } = frame(host, {
      title: "LSM tree vs B+ tree on writes",
      caption: "B+ tree updates pages in place (random I/O, low write-amp on the leaves, high on the journal). LSM appends to memtable then flushes; periodic compaction merges SSTables.",
    });
    const svg = $svg("svg", { viewBox: "0 0 480 260", width: 480, style: "max-width:100%;height:auto;" });
    stage.appendChild(svg);

    let bpFill = 0; // bytes written
    let lsmMemtable = 0;
    let lsmL0 = 0;
    let lsmL1 = 0;

    function draw() {
      svg.innerHTML = "";
      // B+ side
      const t1 = $svg("text", { x: 60, y: 24, class: "anim-label--big" }); t1.textContent = "B+ tree (Postgres / InnoDB)"; svg.appendChild(t1);
      // root
      const root = $svg("rect", { x: 100, y: 40, width: 80, height: 24, rx: 4, fill: "#6366f1" }); svg.appendChild(root);
      const rt = $svg("text", { x: 140, y: 56, "text-anchor": "middle", class: "anim-label", fill: "#fff" }); rt.textContent = "root"; svg.appendChild(rt);
      for (let i = 0; i < 3; i++) {
        const x = 30 + i * 60;
        const internal = $svg("rect", { x, y: 90, width: 50, height: 22, rx: 3, fill: "#8b5cf6" }); svg.appendChild(internal);
        // edge
        svg.appendChild($svg("line", { x1: 140, y1: 64, x2: x + 25, y2: 90, stroke: "rgba(167,139,250,0.4)" }));
        // leaves
        for (let j = 0; j < 2; j++) {
          const lx = x - 5 + j * 28;
          const ly = 140;
          const opacity = (bpFill > i * 2 + j) ? 1 : 0.35;
          const leaf = $svg("rect", { x: lx, y: ly, width: 22, height: 20, rx: 2, fill: "#a78bfa", opacity }); svg.appendChild(leaf);
          svg.appendChild($svg("line", { x1: x + 25, y1: 112, x2: lx + 11, y2: 140, stroke: "rgba(167,139,250,0.3)" }));
        }
      }
      const wal = $svg("rect", { x: 30, y: 200, width: 200, height: 26, rx: 4, fill: "rgba(245,158,11,0.2)", stroke: "#f59e0b" }); svg.appendChild(wal);
      const wt = $svg("text", { x: 130, y: 218, "text-anchor": "middle", class: "anim-label" }); wt.textContent = `WAL (${Math.min(20, bpFill * 2)} pages)`; svg.appendChild(wt);

      // LSM side
      const t2 = $svg("text", { x: 290, y: 24, class: "anim-label--big" }); t2.textContent = "LSM tree (Cassandra / RocksDB)"; svg.appendChild(t2);

      // memtable
      const mm = $svg("rect", { x: 260, y: 40, width: 200, height: 28, rx: 4, fill: "rgba(16,185,129,0.18)", stroke: "#10b981" }); svg.appendChild(mm);
      const mt = $svg("text", { x: 360, y: 58, "text-anchor": "middle", class: "anim-label" });
      mt.textContent = `memtable (${lsmMemtable}/8)`;
      svg.appendChild(mt);

      // L0
      const l0 = $svg("text", { x: 260, y: 92, class: "anim-label" }); l0.textContent = `L0:`; svg.appendChild(l0);
      for (let i = 0; i < lsmL0; i++) {
        svg.appendChild($svg("rect", { x: 290 + i * 22, y: 78, width: 18, height: 18, rx: 2, fill: "#34d399" }));
      }
      // L1
      const l1 = $svg("text", { x: 260, y: 132, class: "anim-label" }); l1.textContent = `L1:`; svg.appendChild(l1);
      for (let i = 0; i < lsmL1; i++) {
        svg.appendChild($svg("rect", { x: 290 + i * 38, y: 118, width: 34, height: 18, rx: 2, fill: "#22d3ee" }));
      }

      // commit log
      const cl = $svg("rect", { x: 260, y: 200, width: 200, height: 26, rx: 4, fill: "rgba(167,139,250,0.18)", stroke: "#a78bfa" }); svg.appendChild(cl);
      const ct = $svg("text", { x: 360, y: 218, "text-anchor": "middle", class: "anim-label" }); ct.textContent = `commit log (append-only)`; svg.appendChild(ct);

      readout.innerHTML = "";
      readout.appendChild($el("span", null, `B+ amp: ~<strong>${(bpFill > 0 ? "8x" : "1x")}</strong> (page+WAL)`));
      readout.appendChild($el("span", null, `LSM amp: ~<strong>${(lsmL1 > 1 ? "12x" : "2x")}</strong> (after compaction)`));
      readout.appendChild($el("span", null, `B+ reads: <strong>O(log n)</strong>`));
      readout.appendChild($el("span", null, `LSM reads: <strong>O(levels)</strong> + bloom`));
    }

    function write() {
      bpFill = Math.min(8, bpFill + 1);
      lsmMemtable++;
      if (lsmMemtable >= 8) {
        lsmMemtable = 0; lsmL0++;
        if (lsmL0 >= 4) { lsmL0 = 0; lsmL1++; }
      }
      draw();
    }

    controls.appendChild(btn("insert 1 row", "primary", write));
    controls.appendChild(btn("insert 50", null, () => { for (let i = 0; i < 50; i++) setTimeout(write, i * 60); }));
    controls.appendChild(btn("compact LSM", null, () => { if (lsmL0 > 0) { lsmL0 = 0; lsmL1++; draw(); } }));
    controls.appendChild(btn("reset", "danger", () => { bpFill = lsmMemtable = lsmL0 = lsmL1 = 0; draw(); }));

    draw();
  }

  // =====================================================================
  //  6) CACHE PATTERNS
  // =====================================================================
  function animCachePatterns(host) {
    const { stage, controls, readout } = frame(host, {
      title: "Cache patterns — flow comparison",
      caption: "Watch the request and response paths for each cache strategy. The number of round-trips and where staleness can creep in differs in each.",
    });
    const svg = $svg("svg", { viewBox: "0 0 480 240", width: 480, style: "max-width:100%;height:auto;" });
    stage.appendChild(svg);

    let mode = "aside";

    function draw() {
      svg.innerHTML = "";
      // boxes: App, Cache, DB
      const apps = [
        { x: 30, y: 100, w: 90, h: 50, label: "App", color: "#6366f1" },
        { x: 195, y: 30, w: 90, h: 50, label: "Cache", color: "#ec4899" },
        { x: 360, y: 170, w: 90, h: 50, label: "DB", color: "#0ea5e9" },
      ];
      apps.forEach(b => {
        svg.appendChild($svg("rect", { x: b.x, y: b.y, width: b.w, height: b.h, rx: 8, fill: b.color }));
        const t = $svg("text", { x: b.x + b.w / 2, y: b.y + b.h / 2 + 5, "text-anchor": "middle", class: "anim-label", fill: "#fff", "font-weight": 700 });
        t.textContent = b.label;
        svg.appendChild(t);
      });

      // label
      const title = $svg("text", { x: 240, y: 220, "text-anchor": "middle", class: "anim-label--big" });
      title.textContent = ({
        aside: "Cache-aside (lazy load)",
        through: "Read-through / Write-through",
        back: "Write-back (write-behind)",
        around: "Write-around",
      })[mode];
      svg.appendChild(title);

      readout.innerHTML = "";
      const r = ({
        aside: ["App talks to cache and DB", "App is responsible for filling cache on miss", "Risk: stale entries if writes bypass cache"],
        through: ["App talks only to cache", "Cache itself fetches from / writes to DB", "Higher latency on writes, simpler app code"],
        back: ["Writes go to cache, ack immediately", "Cache flushes to DB asynchronously", "Highest perf, risk of data loss on cache crash"],
        around: ["Writes go straight to DB, bypass cache", "Reads still cache-aside", "Good for write-heavy + read-rare keys"],
      })[mode];
      r.forEach(line => readout.appendChild($el("span", null, line)));
    }

    function flow() {
      const positions = ({
        aside: [
          { from: [120, 125], to: [195, 55], label: "1: get" },
          { from: [240, 80], to: [120, 125], label: "2: miss" },
          { from: [120, 125], to: [360, 195], label: "3: read" },
          { from: [360, 195], to: [120, 125], label: "4: row" },
          { from: [120, 125], to: [195, 55], label: "5: set" },
        ],
        through: [
          { from: [120, 125], to: [240, 55], label: "1: get" },
          { from: [240, 80], to: [360, 195], label: "2: load if miss" },
          { from: [360, 195], to: [240, 80], label: "3: row" },
          { from: [240, 55], to: [120, 125], label: "4: value" },
        ],
        back: [
          { from: [120, 125], to: [240, 55], label: "1: write" },
          { from: [240, 55], to: [120, 125], label: "2: ack" },
          { from: [240, 80], to: [360, 195], label: "3: async flush" },
        ],
        around: [
          { from: [120, 125], to: [405, 195], label: "1: write" },
          { from: [405, 195], to: [120, 125], label: "2: ack" },
          { from: [120, 125], to: [240, 55], label: "later: read" },
          { from: [240, 80], to: [360, 195], label: "load" },
        ],
      })[mode];

      positions.forEach((p, idx) => {
        setTimeout(() => {
          const dot = $svg("circle", { cx: p.from[0], cy: p.from[1], r: 6, fill: "#fbbf24", "filter": "drop-shadow(0 0 6px #f59e0b)" });
          svg.appendChild(dot);
          const tlbl = $svg("text", {
            x: (p.from[0] + p.to[0]) / 2, y: (p.from[1] + p.to[1]) / 2 - 6,
            "text-anchor": "middle", class: "anim-label--mono",
          });
          tlbl.textContent = p.label;
          svg.appendChild(tlbl);
          const start = performance.now();
          function step(t) {
            const u = Math.min(1, (t - start) / 700);
            dot.setAttribute("cx", p.from[0] + (p.to[0] - p.from[0]) * u);
            dot.setAttribute("cy", p.from[1] + (p.to[1] - p.from[1]) * u);
            if (u < 1) requestAnimationFrame(step);
            else { setTimeout(() => { dot.remove(); tlbl.remove(); }, 400); }
          }
          requestAnimationFrame(step);
        }, idx * 900);
      });
    }

    modeGroup(controls,
      [
        { label: "aside", value: "aside" },
        { label: "through", value: "through" },
        { label: "back", value: "back" },
        { label: "around", value: "around" },
      ],
      () => mode,
      (v) => { mode = v; draw(); }
    );
    controls.appendChild(btn("▶ play flow", "primary", flow));

    draw();
  }

  // =====================================================================
  //  7) CAP PARTITION SIMULATOR
  // =====================================================================
  function animCap(host) {
    const { stage, controls, readout } = frame(host, {
      title: "CAP — partition simulator",
      caption: "Three replicas. Drop the link between them, then choose CP (refuse) or AP (serve stale).",
    });
    const svg = $svg("svg", { viewBox: "0 0 460 240", width: 460, style: "max-width:100%;height:auto;" });
    stage.appendChild(svg);

    let linkUp = true;
    let mode = "CP";
    let primaryValue = 5;
    let replicaValue = 5;

    function draw() {
      svg.innerHTML = "";
      const A = { x: 120, y: 120 };
      const B = { x: 330, y: 80 };
      const C = { x: 330, y: 180 };

      // links
      function link(p, q) {
        return $svg("line", { x1: p.x, y1: p.y, x2: q.x, y2: q.y, class: "cap-link " + (linkUp ? "cap-link--up" : "cap-link--down") });
      }
      svg.appendChild(link(A, B));
      svg.appendChild(link(A, C));
      svg.appendChild(link(B, C));

      function node(p, role, value, ok) {
        const g = $svg("g");
        const c = $svg("circle", { cx: p.x, cy: p.y, r: 28, fill: ok ? "#10b981" : "#ef4444" });
        g.appendChild(c);
        g.appendChild(svgText(p.x, p.y + 4, role, "#fff", true));
        g.appendChild(svgText(p.x, p.y + 50, `value=${value}`, null, false, "mono"));
        return g;
      }
      svg.appendChild(node(A, "primary", primaryValue, true));
      svg.appendChild(node(B, "replica-1", linkUp ? primaryValue : replicaValue, linkUp || mode === "AP"));
      svg.appendChild(node(C, "replica-2", linkUp ? primaryValue : replicaValue, linkUp || mode === "AP"));

      const status = $svg("text", { x: 230, y: 220, "text-anchor": "middle", class: "cap-status" });
      if (linkUp) status.textContent = "network healthy · all reads consistent";
      else if (mode === "CP") status.textContent = "partition · CP mode → replicas refuse reads/writes";
      else status.textContent = "partition · AP mode → replicas serve possibly-stale value";
      svg.appendChild(status);

      readout.innerHTML = "";
      readout.appendChild($el("span", null, `link: <strong>${linkUp ? "up" : "down"}</strong>`));
      readout.appendChild($el("span", null, `mode: <strong>${mode}</strong>`));
      readout.appendChild($el("span", null, `primary: <strong>${primaryValue}</strong>`));
      readout.appendChild($el("span", null, `replicas: <strong>${linkUp ? primaryValue : replicaValue}</strong>`));
    }

    function svgText(x, y, str, fill, bold, font) {
      const t = $svg("text", { x, y, "text-anchor": "middle", class: "anim-label" + (font === "mono" ? "--mono" : "") });
      if (fill) t.setAttribute("fill", fill);
      if (bold) t.setAttribute("font-weight", 700);
      t.textContent = str;
      return t;
    }

    controls.appendChild(btn("drop network", "danger", () => { linkUp = false; replicaValue = primaryValue; draw(); }));
    controls.appendChild(btn("heal network", null, () => { linkUp = true; replicaValue = primaryValue; draw(); }));
    controls.appendChild(btn("write to primary", "primary", () => { primaryValue = Math.floor(Math.random() * 100); if (linkUp) replicaValue = primaryValue; draw(); }));
    modeGroup(controls,
      [{ label: "CP mode", value: "CP" }, { label: "AP mode", value: "AP" }],
      () => mode,
      (v) => { mode = v; draw(); }
    );

    draw();
  }

  // =====================================================================
  //  8) RATE LIMITER — fixed window vs sliding window
  // =====================================================================
  function animRateWindow(host) {
    const { stage, controls, readout } = frame(host, {
      title: "Fixed window vs sliding window",
      caption: "Send a burst right at a window boundary. Fixed window allows 2× limit at the edge; sliding window smooths it out.",
    });
    const svg = $svg("svg", { viewBox: "0 0 480 220", width: 480, style: "max-width:100%;height:auto;" });
    stage.appendChild(svg);

    const LIMIT = 5;
    const W = 5; // seconds per window
    let t = 0;
    const events = []; // {t}

    function draw() {
      svg.innerHTML = "";
      // axis
      svg.appendChild($svg("line", { x1: 30, y1: 100, x2: 460, y2: 100, stroke: "rgba(255,255,255,0.2)" }));
      svg.appendChild($svg("line", { x1: 30, y1: 200, x2: 460, y2: 200, stroke: "rgba(255,255,255,0.2)" }));

      // window markers
      for (let i = 0; i <= 4; i++) {
        const x = 30 + i * 107;
        svg.appendChild($svg("line", { x1: x, y1: 60, x2: x, y2: 220, stroke: "rgba(167,139,250,0.25)", "stroke-dasharray": "3 3" }));
      }
      svg.appendChild(svgT(30, 50, "Fixed window (counter resets every 5s)", true));
      svg.appendChild(svgT(30, 155, "Sliding window (last 5s)", true));

      // events as dots
      events.forEach(e => {
        const x = 30 + (e.t / 20) * 430;
        // fixed window: count in current window
        const win = Math.floor(e.t / W);
        const idxInWin = events.filter(x => Math.floor(x.t / W) === win && x.t <= e.t).length;
        const fixedOK = idxInWin <= LIMIT;
        // sliding: count last W seconds
        const slidIdx = events.filter(x => x.t > e.t - W && x.t <= e.t).length;
        const slidOK = slidIdx <= LIMIT;

        svg.appendChild($svg("circle", { cx: x, cy: 90, r: 6, fill: fixedOK ? "#10b981" : "#ef4444" }));
        svg.appendChild($svg("circle", { cx: x, cy: 190, r: 6, fill: slidOK ? "#10b981" : "#ef4444" }));
      });

      const fixedDenied = events.filter((e, i, arr) => {
        const win = Math.floor(e.t / W);
        const idxInWin = arr.filter(x => Math.floor(x.t / W) === win && x.t <= e.t).length;
        return idxInWin > LIMIT;
      }).length;
      const slidDenied = events.filter((e, i, arr) => {
        const idx = arr.filter(x => x.t > e.t - W && x.t <= e.t).length;
        return idx > LIMIT;
      }).length;

      readout.innerHTML = "";
      readout.appendChild($el("span", null, `limit: <strong>${LIMIT}/${W}s</strong>`));
      readout.appendChild($el("span", null, `events: <strong>${events.length}</strong>`));
      readout.appendChild($el("span", null, `fixed denied: <strong>${fixedDenied}</strong>`));
      readout.appendChild($el("span", null, `sliding denied: <strong>${slidDenied}</strong>`));
    }
    function svgT(x, y, str, mono) {
      const t = $svg("text", { x, y, class: mono ? "anim-label--mono" : "anim-label" });
      t.textContent = str;
      return t;
    }

    function pushAt(ts) { events.push({ t: ts }); draw(); }

    controls.appendChild(btn("edge-burst (worst case)", "danger", () => {
      events.length = 0;
      // 5 events at end of window 0, then 5 at start of window 1
      for (let i = 0; i < 5; i++) pushAt(4 + i * 0.15);
      for (let i = 0; i < 5; i++) pushAt(5 + i * 0.15);
    }));
    controls.appendChild(btn("steady traffic", null, () => {
      events.length = 0;
      for (let i = 0; i < 18; i++) pushAt(i * 1.1);
    }));
    controls.appendChild(btn("clear", null, () => { events.length = 0; draw(); }));

    draw();
  }

  // =====================================================================
  //  9) SAGA vs 2PC
  // =====================================================================
  function animSaga(host) {
    const { stage, controls, readout } = frame(host, {
      title: "Saga vs 2-phase commit",
      caption: "Both want atomicity across services. 2PC holds locks across all participants; Saga uses local commits + compensations.",
    });
    const svg = $svg("svg", { viewBox: "0 0 480 220", width: 480, style: "max-width:100%;height:auto;" });
    stage.appendChild(svg);

    function draw(mode) {
      svg.innerHTML = "";
      const services = ["Order", "Payment", "Inventory", "Shipping"];
      services.forEach((s, i) => {
        const x = 60 + i * 110;
        svg.appendChild($svg("rect", { x, y: 70, width: 80, height: 40, rx: 6, fill: "#a78bfa" }));
        const t = $svg("text", { x: x + 40, y: 95, "text-anchor": "middle", class: "anim-label", fill: "#0b0d18", "font-weight": 700 }); t.textContent = s; svg.appendChild(t);
      });
      svg.appendChild(svgT2(240, 40, mode === "2pc" ? "2PC — coordinator holds locks across all" : "Saga — local commits + compensations on failure", true));
      svg.appendChild(svgT2(240, 200, "(red = compensating transaction)", false));
      readout.innerHTML = "";
      if (mode === "2pc") {
        readout.appendChild($el("span", null, "phase 1: <strong>prepare</strong> (vote)"));
        readout.appendChild($el("span", null, "phase 2: <strong>commit/abort</strong>"));
        readout.appendChild($el("span", null, "lock duration: <strong>entire transaction</strong>"));
      } else {
        readout.appendChild($el("span", null, "each step commits locally"));
        readout.appendChild($el("span", null, "failure → run compensations in reverse"));
        readout.appendChild($el("span", null, "eventual consistency, no global locks"));
      }
    }
    function svgT2(x, y, str, big) {
      const t = $svg("text", { x, y, "text-anchor": "middle", class: big ? "anim-label--big" : "anim-label--mono" });
      t.textContent = str; return t;
    }

    let mode = "saga";
    function play() {
      draw(mode);
      const xs = [100, 210, 320, 430];
      // commits left-to-right
      xs.forEach((x, i) => {
        setTimeout(() => {
          const c = $svg("circle", { cx: x, cy: 130, r: 8, fill: "#10b981" });
          svg.appendChild(c);
          setTimeout(() => c.setAttribute("fill", "#34d399"), 200);
        }, i * 500);
      });
      // simulate failure at step 3 in saga
      if (mode === "saga") {
        setTimeout(() => {
          // mark step 3 as failed
          const fail = $svg("circle", { cx: xs[2], cy: 130, r: 12, fill: "#ef4444" });
          svg.appendChild(fail);
          // compensations 2,1
          [1, 0].forEach((idx, k) => {
            setTimeout(() => {
              const cc = $svg("circle", { cx: xs[idx], cy: 160, r: 8, fill: "#ef4444" });
              svg.appendChild(cc);
              const t = $svg("text", { x: xs[idx], y: 180, "text-anchor": "middle", class: "anim-label--mono", fill: "#ef4444" });
              t.textContent = "compensate"; svg.appendChild(t);
            }, k * 500 + 400);
          });
        }, 1700);
      }
    }

    modeGroup(controls,
      [{ label: "saga", value: "saga" }, { label: "2PC", value: "2pc" }],
      () => mode,
      (v) => { mode = v; draw(mode); }
    );
    controls.appendChild(btn("▶ play scenario", "primary", play));

    draw(mode);
  }

  // =====================================================================
  // 10) VECTOR CLOCKS
  // =====================================================================
  function animVectorClock(host) {
    const { stage, controls, readout } = frame(host, {
      title: "Vector clocks — causality vs concurrency",
      caption: "Three nodes. Each local event bumps that node's counter. Receiving a message takes the element-wise max + 1.",
    });
    const svg = $svg("svg", { viewBox: "0 0 480 240", width: 480, style: "max-width:100%;height:auto;" });
    stage.appendChild(svg);

    const tracks = [{ y: 60, label: "A" }, { y: 130, label: "B" }, { y: 200, label: "C" }];
    const events = []; // {t (0-19), node (0-2), kind:'local'|'send'|'recv', target?, src?, vc:[a,b,c]}

    function compute() {
      const state = [[0,0,0],[0,0,0],[0,0,0]];
      events.forEach(e => {
        if (e.kind === "local") {
          state[e.node][e.node]++;
        } else if (e.kind === "send") {
          state[e.node][e.node]++;
          e.payload = state[e.node].slice();
        } else if (e.kind === "recv") {
          const src = events.find(x => x.id === e.matchId);
          if (src && src.payload) {
            for (let i = 0; i < 3; i++) state[e.node][i] = Math.max(state[e.node][i], src.payload[i]);
            state[e.node][e.node]++;
          }
        }
        e.vc = state[e.node].slice();
      });
    }

    function draw() {
      svg.innerHTML = "";
      tracks.forEach(tr => {
        svg.appendChild($svg("line", { x1: 30, y1: tr.y, x2: 460, y2: tr.y, stroke: "rgba(255,255,255,0.2)" }));
        const lbl = $svg("text", { x: 14, y: tr.y + 4, class: "anim-label" }); lbl.textContent = tr.label; svg.appendChild(lbl);
      });

      compute();

      // draw send arrows first
      events.forEach(e => {
        if (e.kind === "send") {
          const m = events.find(x => x.id === e.matchId);
          if (m) {
            const x1 = 50 + e.t * 21, y1 = tracks[e.node].y;
            const x2 = 50 + m.t * 21, y2 = tracks[m.node].y;
            svg.appendChild($svg("path", {
              d: `M${x1} ${y1} Q${(x1+x2)/2} ${(y1+y2)/2 - 10} ${x2} ${y2}`,
              stroke: "rgba(236,72,153,0.6)", fill: "none", "stroke-width": 1.5,
              "marker-end": "url(#arrow)",
            }));
          }
        }
      });
      const defs = $svg("defs", {});
      const marker = $svg("marker", { id: "arrow", viewBox: "0 0 10 10", refX: 8, refY: 5, markerWidth: 6, markerHeight: 6, orient: "auto" });
      marker.appendChild($svg("path", { d: "M0 0 L10 5 L0 10 z", fill: "rgba(236,72,153,0.8)" }));
      defs.appendChild(marker);
      svg.appendChild(defs);

      events.forEach(e => {
        const x = 50 + e.t * 21, y = tracks[e.node].y;
        svg.appendChild($svg("circle", { cx: x, cy: y, r: 7, fill: "#a78bfa" }));
        const lbl = $svg("text", { x, y: y - 14, "text-anchor": "middle", class: "vc-cell" });
        lbl.textContent = `[${e.vc[0]},${e.vc[1]},${e.vc[2]}]`;
        svg.appendChild(lbl);
      });

      readout.innerHTML = "";
      readout.appendChild($el("span", null, `events: <strong>${events.length}</strong>`));
      readout.appendChild($el("span", null, "[A, B, C] = vector clock"));
    }

    function loadScenario() {
      events.length = 0;
      let id = 0;
      const sId = ++id;
      events.push({ id: ++id, t: 1, node: 0, kind: "local" });
      const sendId = ++id;
      events.push({ id: sendId, t: 3, node: 0, kind: "send", matchId: null });
      const recvId = ++id;
      events.push({ id: recvId, t: 6, node: 1, kind: "recv", matchId: sendId });
      events.find(e => e.id === sendId).matchId = recvId;
      events.push({ id: ++id, t: 8, node: 1, kind: "local" });
      const s2 = ++id;
      events.push({ id: s2, t: 10, node: 1, kind: "send", matchId: null });
      const r2 = ++id;
      events.push({ id: r2, t: 13, node: 2, kind: "recv", matchId: s2 });
      events.find(e => e.id === s2).matchId = r2;
      events.push({ id: ++id, t: 15, node: 2, kind: "local" });
      events.push({ id: ++id, t: 16, node: 0, kind: "local" });
      draw();
    }

    controls.appendChild(btn("load scenario", "primary", loadScenario));
    controls.appendChild(btn("clear", "danger", () => { events.length = 0; draw(); }));

    loadScenario();
  }

  // =====================================================================
  // 11) SHARDING — range vs hash vs geo, with hot key
  // =====================================================================
  function animSharding(host) {
    const { stage, controls, readout } = frame(host, {
      title: "Sharding — range / hash / geo",
      caption: "Same 24 keys, three strategies. Watch the hot user concentrate load in range sharding but spread in hash.",
    });
    const svg = $svg("svg", { viewBox: "0 0 480 230", width: 480, style: "max-width:100%;height:auto;" });
    stage.appendChild(svg);

    const keys = [];
    for (let i = 0; i < 24; i++) {
      // 8 keys are "hot user 5", rest scattered
      if (i < 8) keys.push({ user: 5, k: "u5:" + i });
      else keys.push({ user: 10 + i, k: "u" + (10 + i) + ":a" });
    }

    let strategy = "range";

    function shardOf(k) {
      if (strategy === "range") {
        return Math.min(3, Math.floor(k.user / 10));
      } else if (strategy === "hash") {
        return hash32(k.k) % 4;
      } else {
        // geo: even split based on parity of user
        return (k.user % 4);
      }
    }

    function draw() {
      svg.innerHTML = "";
      const shards = [[], [], [], []];
      keys.forEach(k => shards[shardOf(k)].push(k));
      for (let s = 0; s < 4; s++) {
        const x = 30 + s * 110;
        svg.appendChild($svg("rect", { x, y: 60, width: 100, height: 130, rx: 8, fill: "rgba(167,139,250,0.08)", stroke: "rgba(167,139,250,0.4)" }));
        const lbl = $svg("text", { x: x + 50, y: 50, "text-anchor": "middle", class: "anim-label--big" });
        lbl.textContent = `shard ${s}`; svg.appendChild(lbl);
        shards[s].forEach((k, i) => {
          const col = i % 4, row = Math.floor(i / 4);
          const cx = x + 12 + col * 22, cy = 75 + row * 22;
          const hot = k.user === 5;
          svg.appendChild($svg("circle", { cx, cy, r: 8, fill: hot ? "#ef4444" : "#a78bfa", opacity: 0.9 }));
        });
        const count = shards[s].length;
        const cl = $svg("text", { x: x + 50, y: 215, "text-anchor": "middle", class: "anim-label--mono" });
        cl.textContent = `${count} keys`;
        svg.appendChild(cl);
      }

      const counts = shards.map(s => s.length);
      const max = Math.max(...counts);
      const min = Math.min(...counts);
      readout.innerHTML = "";
      readout.appendChild($el("span", null, `strategy: <strong>${strategy}</strong>`));
      readout.appendChild($el("span", null, `max shard: <strong>${max}</strong>`));
      readout.appendChild($el("span", null, `min shard: <strong>${min}</strong>`));
      readout.appendChild($el("span", null, `skew: <strong>${(max - min)}</strong>`));
    }

    modeGroup(controls,
      [{ label: "range", value: "range" }, { label: "hash", value: "hash" }, { label: "geo", value: "geo" }],
      () => strategy,
      (v) => { strategy = v; draw(); }
    );

    draw();
  }

  // =====================================================================
  // 12) BLOOM FILTER — bit array, k hashes, FP demo
  // =====================================================================
  function animBloom(host) {
    const { stage, controls, readout } = frame(host, {
      title: "Bloom filter — set membership with k hashes",
      caption: "Insert items: each sets k bits (k=3 here). Query an item: if any of its k bits is 0 it is definitely absent; if all are 1, it might be present (false positive possible).",
    });
    const M = 32; // bits
    const K = 3;
    const bits = new Array(M).fill(0);
    const inserted = new Set();
    let lastQuery = null;

    const svg = $svg("svg", { viewBox: "0 0 480 200", width: 480, style: "max-width:100%;height:auto;" });
    stage.appendChild(svg);

    function hashes(s) {
      const h1 = hash32(s);
      const h2 = hash32(s + "::salt");
      return [0, 1, 2].map(i => (h1 + i * h2) % M);
    }

    function draw() {
      svg.innerHTML = "";
      const cw = 13, ch = 26, padX = 16, padY = 60;
      // bit grid
      for (let i = 0; i < M; i++) {
        const x = padX + i * cw, y = padY;
        const set = bits[i] === 1;
        svg.appendChild($svg("rect", {
          x, y, width: cw - 2, height: ch, rx: 2,
          fill: set ? "#34d399" : "rgba(167,139,250,0.12)",
          stroke: set ? "#10b981" : "rgba(167,139,250,0.3)",
        }));
        const t = $svg("text", {
          x: x + (cw - 2) / 2, y: y + ch / 2 + 4,
          "text-anchor": "middle", class: "anim-label--mono",
          fill: set ? "#0b0d18" : "var(--md-default-fg-color--light)",
        });
        t.textContent = set ? "1" : "0";
        svg.appendChild(t);
        const idx = $svg("text", {
          x: x + (cw - 2) / 2, y: padY - 6,
          "text-anchor": "middle", class: "anim-label--mono",
          "font-size": "8",
        });
        idx.textContent = i;
        svg.appendChild(idx);
      }
      // query highlight
      if (lastQuery) {
        const positions = hashes(lastQuery.s);
        positions.forEach(p => {
          const x = padX + p * cw, y = padY;
          const isSet = bits[p] === 1;
          svg.appendChild($svg("rect", {
            x: x - 1, y: y - 1, width: cw, height: ch + 2, rx: 2,
            fill: "none",
            stroke: isSet ? "#fbbf24" : "#ef4444",
            "stroke-width": 2,
          }));
        });
        const verdict = $svg("text", {
          x: 240, y: 150, "text-anchor": "middle", class: "anim-label--big",
          fill: lastQuery.verdict === "in" ? "#34d399" : (lastQuery.verdict === "absent" ? "#ef4444" : "#fbbf24"),
        });
        verdict.textContent =
          lastQuery.verdict === "in"        ? `'${lastQuery.s}' — maybe present`
          : lastQuery.verdict === "absent"  ? `'${lastQuery.s}' — definitely NOT present`
          :                                   `'${lastQuery.s}' — false positive!`;
        svg.appendChild(verdict);
        const subs = $svg("text", {
          x: 240, y: 175, "text-anchor": "middle", class: "anim-label--mono",
        });
        subs.textContent = `hashes → bits [${positions.join(", ")}]`;
        svg.appendChild(subs);
      }
      // header text
      const ht = $svg("text", { x: 240, y: 30, "text-anchor": "middle", class: "anim-label--big" });
      ht.textContent = `${M}-bit Bloom filter · k=${K} hash funcs`;
      svg.appendChild(ht);

      readout.innerHTML = "";
      const setBits = bits.filter(b => b === 1).length;
      const fpRate = Math.pow(1 - Math.exp(-K * inserted.size / M), K) * 100;
      readout.appendChild($el("span", null, `inserted: <strong>${inserted.size}</strong>`));
      readout.appendChild($el("span", null, `bits set: <strong>${setBits}/${M}</strong>`));
      readout.appendChild($el("span", null, `theoretical FP rate: ~<strong>${fpRate.toFixed(1)}%</strong>`));
    }

    let pool = ["alice", "bob", "carol", "dave", "eve", "frank", "grace", "henry"];
    function add() {
      if (!pool.length) return;
      const s = pool.shift();
      inserted.add(s);
      hashes(s).forEach(p => bits[p] = 1);
      lastQuery = { s, verdict: "in" };
      draw();
    }
    function query(s) {
      const positions = hashes(s);
      const allSet = positions.every(p => bits[p] === 1);
      const verdict = !allSet ? "absent" : (inserted.has(s) ? "in" : "fp");
      lastQuery = { s, verdict };
      draw();
    }

    controls.appendChild(btn("insert next item", "primary", add));
    controls.appendChild(btn("query inserted item", null, () => {
      const arr = [...inserted];
      if (arr.length) query(arr[Math.floor(Math.random() * arr.length)]);
    }));
    controls.appendChild(btn("query random item", null, () => query("rnd:" + Math.floor(Math.random() * 9999))));
    controls.appendChild(btn("reset", "danger", () => {
      bits.fill(0); inserted.clear(); lastQuery = null;
      pool = ["alice", "bob", "carol", "dave", "eve", "frank", "grace", "henry"];
      draw();
    }));

    draw();
  }

  // =====================================================================
  // 13) CIRCUIT BREAKER — state machine
  // =====================================================================
  function animCircuit(host) {
    const { stage, controls, readout } = frame(host, {
      title: "Circuit breaker — closed / open / half-open",
      caption: "Send requests; observe how a slow/failing downstream trips the breaker open (fast-fails), and how a probe in half-open decides whether to recover.",
    });
    const svg = $svg("svg", { viewBox: "0 0 480 220", width: 480, style: "max-width:100%;height:auto;" });
    stage.appendChild(svg);

    let state = "closed";        // closed / open / half-open
    let consecFails = 0;
    let consecOK = 0;
    let downstreamHealthy = true;
    const THRESH_FAIL = 3;
    const THRESH_OK = 2;
    let totalAttempts = 0, served = 0, fastFailed = 0;
    let openSince = 0;
    const COOLDOWN_MS = 6000;

    function draw() {
      svg.innerHTML = "";
      const states = [
        { name: "closed", x: 80, color: "#10b981", desc: "pass through" },
        { name: "open", x: 240, color: "#ef4444", desc: "fast-fail" },
        { name: "half-open", x: 400, color: "#f59e0b", desc: "probe" },
      ];
      states.forEach(s => {
        const active = s.name === state;
        svg.appendChild($svg("circle", {
          cx: s.x, cy: 100, r: active ? 42 : 32,
          fill: active ? s.color : "rgba(255,255,255,0.05)",
          stroke: s.color, "stroke-width": active ? 3 : 1.5,
          opacity: active ? 1 : 0.55,
        }));
        const t = $svg("text", {
          x: s.x, y: 102, "text-anchor": "middle",
          class: "anim-label", "font-weight": 700,
          fill: active ? "#fff" : s.color,
        });
        t.textContent = s.name;
        svg.appendChild(t);
        const d = $svg("text", {
          x: s.x, y: 155, "text-anchor": "middle", class: "anim-label--mono",
        });
        d.textContent = s.desc;
        svg.appendChild(d);
      });
      // arrows
      function arrow(x1, x2, label, y = 60) {
        const mid = (x1 + x2) / 2;
        svg.appendChild($svg("path", {
          d: `M${x1 + 36} ${y + 10} Q ${mid} ${y - 10} ${x2 - 36} ${y + 10}`,
          stroke: "rgba(167,139,250,0.5)", fill: "none", "stroke-width": 1.5,
          "marker-end": "url(#cb-arr)",
        }));
        const t = $svg("text", {
          x: mid, y: y, "text-anchor": "middle", class: "anim-label--mono",
        });
        t.textContent = label;
        svg.appendChild(t);
      }
      const defs = $svg("defs", {});
      const marker = $svg("marker", { id: "cb-arr", viewBox: "0 0 10 10", refX: 8, refY: 5, markerWidth: 6, markerHeight: 6, orient: "auto" });
      marker.appendChild($svg("path", { d: "M0 0 L10 5 L0 10 z", fill: "rgba(167,139,250,0.8)" }));
      defs.appendChild(marker);
      svg.appendChild(defs);
      arrow(80, 240, `${THRESH_FAIL} fails`);
      arrow(240, 400, "cooldown elapsed");
      arrow(400, 80, "probe ok", 180);

      // status
      const dh = $svg("text", { x: 240, y: 30, "text-anchor": "middle", class: "anim-label--big" });
      dh.textContent = `downstream: ${downstreamHealthy ? "healthy ✓" : "failing ✗"}`;
      dh.setAttribute("fill", downstreamHealthy ? "#10b981" : "#ef4444");
      svg.appendChild(dh);

      readout.innerHTML = "";
      readout.appendChild($el("span", null, `state: <strong>${state}</strong>`));
      readout.appendChild($el("span", null, `attempts: <strong>${totalAttempts}</strong>`));
      readout.appendChild($el("span", null, `served: <strong>${served}</strong>`));
      readout.appendChild($el("span", null, `fast-failed: <strong>${fastFailed}</strong>`));
      if (state === "open") {
        const remaining = Math.max(0, COOLDOWN_MS - (Date.now() - openSince));
        readout.appendChild($el("span", null, `cooldown: <strong>${Math.ceil(remaining / 1000)}s</strong>`));
      }
    }

    function attempt() {
      totalAttempts++;
      if (state === "open") {
        fastFailed++;
        // check cooldown elapsed
        if (Date.now() - openSince >= COOLDOWN_MS) { state = "half-open"; consecOK = 0; }
        draw();
        return;
      }
      // closed or half-open → really call downstream
      if (downstreamHealthy) {
        served++;
        consecFails = 0;
        if (state === "half-open") {
          consecOK++;
          if (consecOK >= THRESH_OK) { state = "closed"; consecOK = 0; }
        }
      } else {
        consecFails++;
        if (state === "half-open") { state = "open"; openSince = Date.now(); consecFails = 0; }
        else if (consecFails >= THRESH_FAIL) { state = "open"; openSince = Date.now(); consecFails = 0; }
      }
      draw();
    }

    controls.appendChild(btn("send request", "primary", attempt));
    controls.appendChild(btn("send 5", null, () => { for (let i = 0; i < 5; i++) setTimeout(attempt, i * 350); }));
    controls.appendChild(btn("toggle downstream", "danger", () => { downstreamHealthy = !downstreamHealthy; draw(); }));
    controls.appendChild(btn("force cooldown end", null, () => { if (state === "open") { openSince -= COOLDOWN_MS; attempt(); } }));
    controls.appendChild(btn("reset", null, () => {
      state = "closed"; consecFails = 0; consecOK = 0;
      totalAttempts = served = fastFailed = 0; downstreamHealthy = true;
      draw();
    }));
    // tick remaining cooldown display
    setInterval(() => { if (state === "open") draw(); }, 1000);
    draw();
  }

  // =====================================================================
  // 14) LOAD BALANCING ALGORITHMS — round-robin / least-conn / random / IP-hash
  // =====================================================================
  function animLoadBalancer(host) {
    const { stage, controls, readout } = frame(host, {
      title: "Load balancer — algorithm comparison",
      caption: "Same 20 requests, different algorithms. Watch how each distributes load and what happens when one backend slows down.",
    });
    const svg = $svg("svg", { viewBox: "0 0 480 240", width: 480, style: "max-width:100%;height:auto;" });
    stage.appendChild(svg);

    const N = 4;
    let mode = "rr";
    let rrIdx = 0;
    let counts = [0, 0, 0, 0];
    let inflight = [0, 0, 0, 0];
    let slowOne = false;
    let totalReqs = 0;

    function pickRR() { const r = rrIdx; rrIdx = (rrIdx + 1) % N; return r; }
    function pickLC() {
      let best = 0;
      for (let i = 1; i < N; i++) if (inflight[i] < inflight[best]) best = i;
      return best;
    }
    function pickRand() { return Math.floor(Math.random() * N); }
    function pickHash(reqIdx) { return hash32("client:" + (reqIdx % 8)) % N; }

    function pickBackend(reqIdx) {
      if (mode === "rr") return pickRR();
      if (mode === "lc") return pickLC();
      if (mode === "rand") return pickRand();
      if (mode === "hash") return pickHash(reqIdx);
      return 0;
    }

    function draw(highlight) {
      svg.innerHTML = "";
      // LB box
      svg.appendChild($svg("rect", { x: 20, y: 100, width: 90, height: 40, rx: 8, fill: "#7c3aed" }));
      const lbt = $svg("text", { x: 65, y: 125, "text-anchor": "middle", class: "anim-label", fill: "#fff", "font-weight": 700 });
      lbt.textContent = "LB";
      svg.appendChild(lbt);
      const lbm = $svg("text", { x: 65, y: 158, "text-anchor": "middle", class: "anim-label--mono" });
      lbm.textContent = ({ rr: "round-robin", lc: "least-conn", rand: "random", hash: "IP hash" })[mode];
      svg.appendChild(lbm);

      // backends
      for (let i = 0; i < N; i++) {
        const y = 30 + i * 50;
        const isSlow = slowOne && i === 0;
        svg.appendChild($svg("rect", { x: 320, y, width: 120, height: 38, rx: 6,
          fill: isSlow ? "rgba(239,68,68,0.18)" : "rgba(99,102,241,0.10)",
          stroke: isSlow ? "#ef4444" : "rgba(99,102,241,0.4)" }));
        const lbl = $svg("text", { x: 332, y: y + 22, class: "anim-label" });
        lbl.textContent = `backend ${i}` + (isSlow ? " (slow)" : "");
        svg.appendChild(lbl);
        // count badge
        const c = $svg("rect", { x: 405, y: y + 4, width: 32, height: 16, rx: 4,
          fill: highlight === i ? "#fbbf24" : "rgba(255,255,255,0.06)" });
        svg.appendChild(c);
        const ct = $svg("text", { x: 421, y: y + 16, "text-anchor": "middle", class: "anim-label--mono",
          "font-weight": 700, fill: highlight === i ? "#0b0d18" : null });
        ct.textContent = counts[i];
        svg.appendChild(ct);
        // link
        const ln = $svg("line", { x1: 110, y1: 120, x2: 320, y2: y + 19,
          stroke: highlight === i ? "#fbbf24" : "rgba(167,139,250,0.2)",
          "stroke-width": highlight === i ? 2 : 1 });
        svg.appendChild(ln);
      }

      readout.innerHTML = "";
      readout.appendChild($el("span", null, `total reqs: <strong>${totalReqs}</strong>`));
      const max = Math.max(...counts), min = Math.min(...counts);
      readout.appendChild($el("span", null, `max load: <strong>${max}</strong>`));
      readout.appendChild($el("span", null, `imbalance: <strong>${max - min}</strong>`));
      readout.appendChild($el("span", null, `slow node: <strong>${slowOne ? "on (backend 0)" : "off"}</strong>`));
    }

    function send() {
      totalReqs++;
      const b = pickBackend(totalReqs);
      counts[b]++;
      inflight[b]++;
      draw(b);
      const slow = slowOne && b === 0 ? 1500 : 350;
      setTimeout(() => { inflight[b] = Math.max(0, inflight[b] - 1); draw(); }, slow);
    }

    modeGroup(controls, [
      { label: "round-robin", value: "rr" },
      { label: "least-conn", value: "lc" },
      { label: "random", value: "rand" },
      { label: "IP hash", value: "hash" },
    ], () => mode, (v) => { mode = v; draw(); });
    controls.appendChild(btn("send request", "primary", send));
    controls.appendChild(btn("send 20", null, () => { for (let i = 0; i < 20; i++) setTimeout(send, i * 110); }));
    controls.appendChild(btn("toggle slow backend", "danger", () => { slowOne = !slowOne; draw(); }));
    controls.appendChild(btn("reset", null, () => {
      counts = [0, 0, 0, 0]; inflight = [0, 0, 0, 0]; rrIdx = 0; totalReqs = 0;
      draw();
    }));
    draw();
  }

  // =====================================================================
  // 15) STREAM WINDOWING — tumbling / sliding / session + watermark
  // =====================================================================
  function animWindowing(host) {
    const { stage, controls, readout } = frame(host, {
      title: "Stream windowing & watermarks",
      caption: "Events have event-time. Tumbling, sliding, and session windows group them differently. Watermark fires window emission once 'no more late events' is promised.",
    });
    const svg = $svg("svg", { viewBox: "0 0 480 240", width: 480, style: "max-width:100%;height:auto;" });
    stage.appendChild(svg);

    let mode = "tumbling";
    let events = [
      { t: 1 }, { t: 3 }, { t: 4 }, { t: 7 }, { t: 9 }, { t: 12 }, { t: 15 }, { t: 16 }, { t: 19 }
    ];
    let watermark = 0;

    function windows() {
      if (mode === "tumbling") {
        return [[0, 5], [5, 10], [10, 15], [15, 20]];
      } else if (mode === "sliding") {
        // size 5, step 3
        return [[0, 5], [3, 8], [6, 11], [9, 14], [12, 17], [15, 20]];
      } else {
        // session: gap 4
        const sorted = [...events].sort((a, b) => a.t - b.t);
        const wins = [];
        let cur = null;
        sorted.forEach(e => {
          if (!cur || e.t - cur[1] > 4) { if (cur) wins.push(cur); cur = [e.t, e.t]; }
          else cur[1] = e.t;
        });
        if (cur) wins.push(cur);
        return wins.map(w => [w[0] - 0.5, w[1] + 0.5]);
      }
    }

    function draw() {
      svg.innerHTML = "";
      const x0 = 30, x1 = 450, span = 21;
      function tx(t) { return x0 + (t / span) * (x1 - x0); }
      // axis
      svg.appendChild($svg("line", { x1: x0, y1: 180, x2: x1, y2: 180, stroke: "rgba(255,255,255,0.25)" }));
      for (let i = 0; i <= 20; i += 5) {
        const x = tx(i);
        svg.appendChild($svg("line", { x1: x, y1: 178, x2: x, y2: 184, stroke: "rgba(255,255,255,0.3)" }));
        const t = $svg("text", { x, y: 200, "text-anchor": "middle", class: "anim-label--mono" });
        t.textContent = "t=" + i;
        svg.appendChild(t);
      }
      // windows
      const wins = windows();
      wins.forEach((w, i) => {
        const x = tx(w[0]), wd = tx(w[1]) - tx(w[0]);
        const closed = w[1] <= watermark;
        const fill = closed ? "rgba(52,211,153,0.18)" : "rgba(99,102,241,0.10)";
        const stroke = closed ? "#10b981" : "rgba(99,102,241,0.4)";
        svg.appendChild($svg("rect", { x, y: 70, width: wd, height: 100, fill, stroke, "stroke-width": 1, rx: 6 }));
        const lbl = $svg("text", { x: x + wd / 2, y: 60, "text-anchor": "middle", class: "anim-label--mono" });
        lbl.textContent = `[${w[0]}, ${w[1]})`;
        if (closed) lbl.setAttribute("fill", "#34d399");
        svg.appendChild(lbl);
      });
      // events
      events.forEach(e => {
        const x = tx(e.t);
        const inWindow = wins.some(w => e.t >= w[0] && e.t < w[1]);
        svg.appendChild($svg("circle", { cx: x, cy: 130, r: 7, fill: inWindow ? "#fbbf24" : "#94a3b8",
          filter: "drop-shadow(0 0 4px rgba(251,191,36,0.7))" }));
        const t = $svg("text", { x, y: 110, "text-anchor": "middle", class: "anim-label--mono" });
        t.textContent = "t=" + e.t;
        svg.appendChild(t);
      });
      // watermark
      const wx = tx(watermark);
      svg.appendChild($svg("line", { x1: wx, y1: 40, x2: wx, y2: 180,
        stroke: "#ef4899", "stroke-width": 2, "stroke-dasharray": "4 4" }));
      const wt = $svg("text", { x: wx, y: 36, "text-anchor": "middle", class: "anim-label" });
      wt.textContent = `watermark ${watermark.toFixed(0)}`;
      wt.setAttribute("fill", "#ec4899");
      svg.appendChild(wt);

      readout.innerHTML = "";
      readout.appendChild($el("span", null, `mode: <strong>${mode}</strong>`));
      readout.appendChild($el("span", null, `events: <strong>${events.length}</strong>`));
      readout.appendChild($el("span", null, `watermark: <strong>${watermark}</strong>`));
      readout.appendChild($el("span", null, `closed windows: <strong>${wins.filter(w => w[1] <= watermark).length}</strong>`));
    }

    modeGroup(controls, [
      { label: "tumbling", value: "tumbling" },
      { label: "sliding", value: "sliding" },
      { label: "session", value: "session" },
    ], () => mode, (v) => { mode = v; draw(); });
    controls.appendChild(btn("+ event (late?)", "primary", () => {
      const lateT = Math.max(0, watermark - Math.floor(Math.random() * 5));
      events.push({ t: lateT });
      draw();
    }));
    controls.appendChild(btn("advance watermark", null, () => { watermark = Math.min(21, watermark + 3); draw(); }));
    controls.appendChild(btn("reset", "danger", () => {
      events = [{ t: 1 }, { t: 3 }, { t: 4 }, { t: 7 }, { t: 9 }, { t: 12 }, { t: 15 }, { t: 16 }, { t: 19 }];
      watermark = 0; draw();
    }));

    draw();
  }

  // =====================================================================
  // 16) LRU vs LFU EVICTION — same workload, different survivors
  // =====================================================================
  function animEviction(host) {
    const { stage, controls, readout } = frame(host, {
      title: "LRU vs LFU eviction — same workload, different survivors",
      caption: "A 5-slot cache, two policies, the same stream of accesses. LRU evicts the least-recently-used; LFU evicts the least-frequently-used. Watch which keys live and die in each.",
    });
    const svg = $svg("svg", { viewBox: "0 0 480 230", width: 480, style: "max-width:100%;height:auto;" });
    stage.appendChild(svg);

    const CAP = 5;
    let lru = []; // array of {k, recency}
    let lfu = []; // array of {k, freq}
    let tickCount = 0;
    let lruHits = 0, lruMiss = 0, lfuHits = 0, lfuMiss = 0;
    let lastKey = null;

    function access(k) {
      tickCount++;
      // LRU
      const lruIdx = lru.findIndex(e => e.k === k);
      if (lruIdx >= 0) { lru[lruIdx].recency = tickCount; lruHits++; }
      else {
        lruMiss++;
        if (lru.length >= CAP) {
          let worst = 0;
          for (let i = 1; i < lru.length; i++) if (lru[i].recency < lru[worst].recency) worst = i;
          lru.splice(worst, 1);
        }
        lru.push({ k, recency: tickCount });
      }
      // LFU
      const lfuIdx = lfu.findIndex(e => e.k === k);
      if (lfuIdx >= 0) { lfu[lfuIdx].freq++; lfu[lfuIdx].lastSeen = tickCount; lfuHits++; }
      else {
        lfuMiss++;
        if (lfu.length >= CAP) {
          let worst = 0;
          for (let i = 1; i < lfu.length; i++) {
            if (lfu[i].freq < lfu[worst].freq ||
              (lfu[i].freq === lfu[worst].freq && lfu[i].lastSeen < lfu[worst].lastSeen)) worst = i;
          }
          lfu.splice(worst, 1);
        }
        lfu.push({ k, freq: 1, lastSeen: tickCount });
      }
      lastKey = k;
      draw();
    }

    function colorFor(k) {
      const palette = ["#a78bfa", "#06b6d4", "#34d399", "#fbbf24", "#fb7185", "#22d3ee", "#84cc16", "#f97316"];
      return palette[hash32(k) % palette.length];
    }

    function draw() {
      svg.innerHTML = "";
      // LRU row
      const ht1 = $svg("text", { x: 30, y: 30, class: "anim-label--big" }); ht1.textContent = "LRU"; svg.appendChild(ht1);
      const ht1s = $svg("text", { x: 70, y: 30, class: "anim-label--mono" });
      ht1s.textContent = `(hit ${lruHits}/${lruHits + lruMiss})`; svg.appendChild(ht1s);
      const sorted1 = [...lru].sort((a, b) => b.recency - a.recency); // most recent first
      for (let i = 0; i < CAP; i++) {
        const x = 30 + i * 86, y = 50;
        const e = sorted1[i];
        svg.appendChild($svg("rect", {
          x, y, width: 72, height: 50, rx: 8,
          fill: e ? colorFor(e.k) : "rgba(255,255,255,0.04)",
          stroke: e && e.k === lastKey ? "#fbbf24" : "rgba(167,139,250,0.2)",
          "stroke-width": e && e.k === lastKey ? 2.5 : 1,
        }));
        if (e) {
          const t = $svg("text", { x: x + 36, y: y + 25, "text-anchor": "middle", class: "anim-label", fill: "#0b0d18", "font-weight": 700 });
          t.textContent = e.k; svg.appendChild(t);
          const r = $svg("text", { x: x + 36, y: y + 42, "text-anchor": "middle", class: "anim-label--mono" });
          r.textContent = `last @ ${e.recency}`; svg.appendChild(r);
        }
      }
      // LFU row
      const ht2 = $svg("text", { x: 30, y: 135, class: "anim-label--big" }); ht2.textContent = "LFU"; svg.appendChild(ht2);
      const ht2s = $svg("text", { x: 70, y: 135, class: "anim-label--mono" });
      ht2s.textContent = `(hit ${lfuHits}/${lfuHits + lfuMiss})`; svg.appendChild(ht2s);
      const sorted2 = [...lfu].sort((a, b) => b.freq - a.freq);
      for (let i = 0; i < CAP; i++) {
        const x = 30 + i * 86, y = 155;
        const e = sorted2[i];
        svg.appendChild($svg("rect", {
          x, y, width: 72, height: 50, rx: 8,
          fill: e ? colorFor(e.k) : "rgba(255,255,255,0.04)",
          stroke: e && e.k === lastKey ? "#fbbf24" : "rgba(167,139,250,0.2)",
          "stroke-width": e && e.k === lastKey ? 2.5 : 1,
        }));
        if (e) {
          const t = $svg("text", { x: x + 36, y: y + 25, "text-anchor": "middle", class: "anim-label", fill: "#0b0d18", "font-weight": 700 });
          t.textContent = e.k; svg.appendChild(t);
          const r = $svg("text", { x: x + 36, y: y + 42, "text-anchor": "middle", class: "anim-label--mono" });
          r.textContent = `freq ${e.freq}`; svg.appendChild(r);
        }
      }
      readout.innerHTML = "";
      readout.appendChild($el("span", null, `accesses: <strong>${tickCount}</strong>`));
      readout.appendChild($el("span", null, `last key: <strong>${lastKey ?? "—"}</strong>`));
      readout.appendChild($el("span", null, `LRU hit rate: <strong>${tickCount ? Math.round(100 * lruHits / tickCount) : 0}%</strong>`));
      readout.appendChild($el("span", null, `LFU hit rate: <strong>${tickCount ? Math.round(100 * lfuHits / tickCount) : 0}%</strong>`));
    }

    function workload(name) {
      lru = []; lfu = []; tickCount = 0; lruHits = lruMiss = lfuHits = lfuMiss = 0; lastKey = null;
      let seq;
      if (name === "trending") {
        // 'A' very popular early then forgotten; LFU keeps it long after, LRU evicts it
        seq = "AAAAAAAA B C D E F G H I J K L M N O P".split(" ");
      } else if (name === "rare-but-recent") {
        // 'Z' shown once at the very end → LRU keeps it, LFU evicts it next
        seq = "A A A A B B B B C C C C D D D D E E E E Z".split(" ");
      } else if (name === "hot-set") {
        // 5 keys cycling forever, no eviction
        seq = "A B C D E A B C D E A B C D E A B C".split(" ");
      } else { // random
        seq = [];
        for (let i = 0; i < 24; i++) seq.push(String.fromCharCode(65 + Math.floor(Math.random() * 8)));
      }
      let i = 0;
      function step() { if (i >= seq.length) return; access(seq[i++]); setTimeout(step, 320); }
      step();
    }

    controls.appendChild(btn("workload: trending", "primary", () => workload("trending")));
    controls.appendChild(btn("rare-but-recent", null, () => workload("rare-but-recent")));
    controls.appendChild(btn("hot working set", null, () => workload("hot-set")));
    controls.appendChild(btn("random", null, () => workload("random")));
    controls.appendChild(btn("reset", "danger", () => { lru = []; lfu = []; tickCount = 0; lruHits = lruMiss = lfuHits = lfuMiss = 0; lastKey = null; draw(); }));

    draw();
  }

  // =====================================================================
  // 17) MVCC — version chain + reader snapshot isolation
  // =====================================================================
  function animMvcc(host) {
    const { stage, controls, readout } = frame(host, {
      title: "MVCC — version chain, snapshots, and bloat",
      caption: "Each row holds a chain of versions. Long-running readers pin old versions; vacuum can only reclaim versions older than the oldest active snapshot. Try opening a long reader — watch the chain grow.",
    });
    const svg = $svg("svg", { viewBox: "0 0 480 240", width: 480, style: "max-width:100%;height:auto;" });
    stage.appendChild(svg);

    let txid = 1;
    let versions = [{ v: 1, xmin: 1, xmax: null, val: "alice@x.com" }];
    let readers = []; // {id, snapshotXid}
    let nextReaderId = 1;

    function commit(newVal) {
      txid++;
      const last = versions[versions.length - 1];
      last.xmax = txid;
      versions.push({ v: versions.length + 1, xmin: txid, xmax: null, val: newVal });
      draw();
    }
    function newReader() {
      txid++;
      readers.push({ id: nextReaderId++, snapshotXid: txid });
      draw();
    }
    function closeReader() {
      readers.shift();
      draw();
    }
    function vacuum() {
      if (!readers.length) return; // safe to vacuum nothing if no readers
      const oldest = Math.min(...readers.map(r => r.snapshotXid));
      versions = versions.filter(v => v.xmax === null || v.xmax >= oldest);
      draw();
    }
    function vacuumAll() {
      // no readers → reclaim all but current
      if (readers.length) return vacuum();
      versions = versions.filter(v => v.xmax === null);
      draw();
    }

    function draw() {
      svg.innerHTML = "";
      const ht = $svg("text", { x: 30, y: 28, class: "anim-label--big" });
      ht.textContent = `row=user(42)  ·  current txid=${txid}`;
      svg.appendChild(ht);

      // versions row
      versions.forEach((v, i) => {
        const x = 30 + i * 100, y = 60;
        const alive = v.xmax === null;
        svg.appendChild($svg("rect", {
          x, y, width: 85, height: 56, rx: 8,
          fill: alive ? "rgba(52,211,153,0.18)" : "rgba(239,68,68,0.10)",
          stroke: alive ? "#10b981" : "#ef4444",
        }));
        const t = $svg("text", { x: x + 4, y: y + 20, class: "anim-label", "font-weight": 700 });
        t.textContent = `v${v.v}`; svg.appendChild(t);
        const xm = $svg("text", { x: x + 4, y: y + 35, class: "anim-label--mono" });
        xm.textContent = `xmin=${v.xmin}`; svg.appendChild(xm);
        const xx = $svg("text", { x: x + 4, y: y + 48, class: "anim-label--mono" });
        xx.textContent = `xmax=${v.xmax ?? "∞"}`; svg.appendChild(xx);
        // arrow to next
        if (i < versions.length - 1) {
          svg.appendChild($svg("line", { x1: x + 85, y1: y + 28, x2: x + 100, y2: y + 28,
            stroke: "rgba(167,139,250,0.6)", "stroke-width": 1.5 }));
        }
      });

      // readers row
      const rl = $svg("text", { x: 30, y: 150, class: "anim-label--big" });
      rl.textContent = `active readers (${readers.length})`; svg.appendChild(rl);
      readers.forEach((r, i) => {
        const x = 30 + i * 100, y = 165;
        svg.appendChild($svg("rect", { x, y, width: 85, height: 40, rx: 6,
          fill: "rgba(99,102,241,0.18)", stroke: "#6366f1" }));
        const t = $svg("text", { x: x + 4, y: y + 18, class: "anim-label", "font-weight": 700 });
        t.textContent = `R${r.id}`; svg.appendChild(t);
        const sn = $svg("text", { x: x + 4, y: y + 33, class: "anim-label--mono" });
        sn.textContent = `snap=${r.snapshotXid}`; svg.appendChild(sn);
        // which version this reader sees
        const visible = [...versions].reverse().find(v => v.xmin <= r.snapshotXid && (v.xmax === null || v.xmax > r.snapshotXid));
        if (visible) {
          const vIdx = versions.indexOf(visible);
          const vx = 30 + vIdx * 100 + 42;
          svg.appendChild($svg("line", { x1: x + 42, y1: y, x2: vx, y2: 116,
            stroke: "#a78bfa", "stroke-width": 1.5, "stroke-dasharray": "3 3", opacity: 0.7 }));
        }
      });

      readout.innerHTML = "";
      readout.appendChild($el("span", null, `versions: <strong>${versions.length}</strong>`));
      readout.appendChild($el("span", null, `readers: <strong>${readers.length}</strong>`));
      const oldest = readers.length ? Math.min(...readers.map(r => r.snapshotXid)) : "—";
      readout.appendChild($el("span", null, `oldest snap: <strong>${oldest}</strong>`));
      const reclaimable = versions.filter(v => v.xmax !== null && (!readers.length || v.xmax < (oldest === "—" ? Infinity : oldest))).length;
      readout.appendChild($el("span", null, `reclaimable: <strong>${reclaimable}</strong>`));
    }

    let nv = 0;
    const newVals = ["bob@x.com", "carol@x.com", "dave@x.com", "eve@x.com", "frank@x.com", "grace@x.com"];
    controls.appendChild(btn("UPDATE row", "primary", () => { commit(newVals[nv++ % newVals.length]); }));
    controls.appendChild(btn("open reader", null, newReader));
    controls.appendChild(btn("close oldest reader", null, closeReader));
    controls.appendChild(btn("VACUUM", null, vacuumAll));
    controls.appendChild(btn("reset", "danger", () => {
      txid = 1; nv = 0; nextReaderId = 1; readers = [];
      versions = [{ v: 1, xmin: 1, xmax: null, val: "alice@x.com" }];
      draw();
    }));

    draw();
  }

  // =====================================================================
  // 18) QUORUM (W + R) — Dynamo-style read/write
  // =====================================================================
  function animQuorum(host) {
    const { stage, controls, readout } = frame(host, {
      title: "Quorum (W + R) — strong vs eventual",
      caption: "5 replicas. Pick W and R. The classic Dynamo invariant: W + R > N gives strong consistency on reads. Lower it for higher availability / latency. Press WRITE then READ to see what each replica returns.",
    });
    const svg = $svg("svg", { viewBox: "0 0 480 240", width: 480, style: "max-width:100%;height:auto;" });
    stage.appendChild(svg);

    const N = 5;
    let W = 3, R = 3;
    let nodes = []; // { value, version, lastTouch }
    for (let i = 0; i < N; i++) nodes.push({ value: 0, version: 0, lastTouch: null });
    let nextVersion = 1;
    let lastOp = null; // { kind, indices, value? , latest? }

    function write() {
      const indices = pickRandomSubset(N, W);
      const v = nextVersion++;
      const val = Math.floor(Math.random() * 100);
      indices.forEach(i => { nodes[i] = { value: val, version: v, lastTouch: "W" }; });
      lastOp = { kind: "write", indices, value: val, version: v };
      // simulate replica lag: 1-2 replicas not in W don't sync yet
      draw();
    }
    function read() {
      const indices = pickRandomSubset(N, R);
      const responses = indices.map(i => ({ i, ...nodes[i] }));
      const best = responses.reduce((a, b) => (a.version >= b.version ? a : b));
      lastOp = { kind: "read", indices, value: best.value, version: best.version, responses };
      // mark touched
      indices.forEach(i => nodes[i].lastTouch = "R");
      draw();
    }
    function pickRandomSubset(n, k) {
      const arr = [...Array(n).keys()];
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr.slice(0, k).sort((a, b) => a - b);
    }

    function draw() {
      svg.innerHTML = "";
      // top: invariant status
      const strong = (W + R) > N;
      const inv = $svg("text", { x: 240, y: 24, "text-anchor": "middle", class: "anim-label--big",
        fill: strong ? "#10b981" : "#f59e0b" });
      inv.textContent = strong ? `W(${W}) + R(${R}) > N(${N}) — strong reads` : `W(${W}) + R(${R}) ≤ N(${N}) — possibly stale`;
      svg.appendChild(inv);

      // nodes
      for (let i = 0; i < N; i++) {
        const x = 30 + i * 88, y = 70;
        const involved = lastOp && lastOp.indices.includes(i);
        const isLatest = lastOp && lastOp.kind === "read" && involved && nodes[i].version === lastOp.version;
        const stroke = involved
          ? (lastOp.kind === "write" ? "#10b981" : (isLatest ? "#fbbf24" : "#ef4444"))
          : "rgba(167,139,250,0.3)";
        svg.appendChild($svg("rect", { x, y, width: 80, height: 80, rx: 12,
          fill: "rgba(99,102,241,0.10)", stroke, "stroke-width": involved ? 3 : 1 }));
        const t = $svg("text", { x: x + 40, y: y + 28, "text-anchor": "middle", class: "anim-label", "font-weight": 700 });
        t.textContent = `n${i}`;
        svg.appendChild(t);
        const vt = $svg("text", { x: x + 40, y: y + 50, "text-anchor": "middle", class: "anim-label--mono" });
        vt.textContent = `val=${nodes[i].value}`; svg.appendChild(vt);
        const vv = $svg("text", { x: x + 40, y: y + 68, "text-anchor": "middle", class: "anim-label--mono" });
        vv.textContent = `v${nodes[i].version}`; svg.appendChild(vv);
        if (involved) {
          const lbl = $svg("text", { x: x + 40, y: y - 6, "text-anchor": "middle", class: "anim-label--mono",
            fill: lastOp.kind === "write" ? "#10b981" : "#fbbf24" });
          lbl.textContent = lastOp.kind === "write" ? "✓ written" : "← read"; svg.appendChild(lbl);
        }
      }

      // verdict
      if (lastOp) {
        const v = $svg("text", { x: 240, y: 175, "text-anchor": "middle", class: "anim-label--big" });
        if (lastOp.kind === "write") {
          v.textContent = `WRITE val=${lastOp.value} (v${lastOp.version}) to nodes ${lastOp.indices.join(",")}`;
          v.setAttribute("fill", "#10b981");
        } else {
          const seen = lastOp.responses.map(r => `n${r.i}:v${r.version}`).join("  ");
          const t = $svg("text", { x: 240, y: 175, "text-anchor": "middle", class: "anim-label" });
          t.textContent = `READ from ${lastOp.indices.join(",")} → return val=${lastOp.value} (v${lastOp.version})`;
          t.setAttribute("fill", "#fbbf24");
          svg.appendChild(t);
          const sub = $svg("text", { x: 240, y: 195, "text-anchor": "middle", class: "anim-label--mono" });
          sub.textContent = seen; svg.appendChild(sub);
          return;
        }
        svg.appendChild(v);
      }

      readout.innerHTML = "";
      readout.appendChild($el("span", null, `N=<strong>${N}</strong>  W=<strong>${W}</strong>  R=<strong>${R}</strong>`));
      readout.appendChild($el("span", null, strong ? `<strong style="color:#10b981">strong</strong>` : `<strong style="color:#f59e0b">eventual</strong>`));
      const latest = Math.max(...nodes.map(n => n.version));
      const lagging = nodes.filter(n => n.version < latest).length;
      readout.appendChild($el("span", null, `nodes lagging: <strong>${lagging}/${N}</strong>`));
    }

    controls.appendChild(btn("WRITE", "primary", write));
    controls.appendChild(btn("READ", null, read));
    modeGroup(controls, [
      { label: "W=1", value: "1" },
      { label: "W=2", value: "2" },
      { label: "W=3", value: "3" },
      { label: "W=5", value: "5" },
    ], () => String(W), v => { W = +v; draw(); });
    modeGroup(controls, [
      { label: "R=1", value: "1" },
      { label: "R=2", value: "2" },
      { label: "R=3", value: "3" },
      { label: "R=5", value: "5" },
    ], () => String(R), v => { R = +v; draw(); });

    draw();
  }

  // =====================================================================
  // 19) HYPERLOGLOG — register array + estimate
  // =====================================================================
  function animHLL(host) {
    const { stage, controls, readout } = frame(host, {
      title: "HyperLogLog — cardinality from leading zeros",
      caption: "Each item gets hashed. The top bits choose a bucket (0..15 here); the trailing bits' leading-zero count is stored if larger than what's there. Estimate = harmonic-mean trick on 2^register.",
    });
    const svg = $svg("svg", { viewBox: "0 0 480 200", width: 480, style: "max-width:100%;height:auto;" });
    stage.appendChild(svg);

    const M = 16;
    let regs = new Array(M).fill(0);
    const seen = new Set();
    let lastInsert = null;

    function leadingZeros(n, bits) {
      let z = 0;
      for (let i = bits - 1; i >= 0; i--) {
        if ((n >>> i) & 1) break;
        z++;
      }
      return z + 1; // HLL stores leading-zeros + 1
    }
    function alphaM(m) {
      if (m === 16) return 0.673;
      if (m === 32) return 0.697;
      if (m === 64) return 0.709;
      return 0.7213 / (1 + 1.079 / m);
    }
    function estimate() {
      // raw estimate; small-range correction skipped for visual simplicity
      const sum = regs.reduce((a, r) => a + Math.pow(2, -r), 0);
      const e = alphaM(M) * M * M / sum;
      return Math.round(e);
    }

    function add(s) {
      const h = hash32(s);
      const bucket = h & (M - 1); // low 4 bits = bucket idx
      const rest = h >>> 4;
      const lz = leadingZeros(rest, 28);
      const prev = regs[bucket];
      regs[bucket] = Math.max(prev, lz);
      seen.add(s);
      lastInsert = { s, bucket, lz, changed: regs[bucket] !== prev };
      draw();
    }

    function draw() {
      svg.innerHTML = "";
      // header
      const ht = $svg("text", { x: 240, y: 22, "text-anchor": "middle", class: "anim-label--big" });
      ht.textContent = `${M} registers · estimate ≈ ${estimate()} · true distincts = ${seen.size}`;
      svg.appendChild(ht);

      // registers — 8 cols × 2 rows
      const cols = 8;
      for (let i = 0; i < M; i++) {
        const col = i % cols, row = Math.floor(i / cols);
        const x = 30 + col * 55, y = 50 + row * 56;
        const active = lastInsert && lastInsert.bucket === i;
        svg.appendChild($svg("rect", { x, y, width: 50, height: 46, rx: 7,
          fill: active ? "#fbbf24" : "rgba(99,102,241,0.15)",
          stroke: active ? "#f59e0b" : "rgba(99,102,241,0.4)",
          "stroke-width": active ? 2.5 : 1 }));
        const it = $svg("text", { x: x + 25, y: y + 18, "text-anchor": "middle", class: "anim-label--mono",
          fill: active ? "#0b0d18" : null });
        it.textContent = `b${i}`; svg.appendChild(it);
        const vt = $svg("text", { x: x + 25, y: y + 38, "text-anchor": "middle", class: "anim-label",
          "font-weight": 700, fill: active ? "#0b0d18" : null });
        vt.textContent = regs[i];
        svg.appendChild(vt);
      }

      // last insert info
      if (lastInsert) {
        const lt = $svg("text", { x: 240, y: 180, "text-anchor": "middle", class: "anim-label--mono" });
        lt.textContent = `last: '${lastInsert.s}' → bucket ${lastInsert.bucket}, lz+1=${lastInsert.lz}` +
          (lastInsert.changed ? " ✓ updated" : " — no change");
        svg.appendChild(lt);
      }

      readout.innerHTML = "";
      readout.appendChild($el("span", null, `inserted: <strong>${seen.size}</strong>`));
      readout.appendChild($el("span", null, `estimate: <strong>${estimate()}</strong>`));
      const err = seen.size === 0 ? 0 : Math.abs(estimate() - seen.size) / seen.size * 100;
      readout.appendChild($el("span", null, `error: <strong>${err.toFixed(1)}%</strong>`));
      readout.appendChild($el("span", null, `memory: <strong>${M} bytes</strong>`));
    }

    controls.appendChild(btn("add 1 item", "primary", () => add("u" + Math.floor(Math.random() * 1e9))));
    controls.appendChild(btn("add 100", null, () => { for (let i = 0; i < 100; i++) setTimeout(() => add("u" + Math.floor(Math.random() * 1e9)), i * 25); }));
    controls.appendChild(btn("add 1000 (fast)", null, () => { for (let i = 0; i < 1000; i++) add("u" + Math.floor(Math.random() * 1e9)); }));
    controls.appendChild(btn("add same item ×50", null, () => { for (let i = 0; i < 50; i++) add("samekey"); }));
    controls.appendChild(btn("reset", "danger", () => { regs.fill(0); seen.clear(); lastInsert = null; draw(); }));

    draw();
  }

  // =====================================================================
  // 20) TCP CONGESTION CONTROL — slow start + AIMD sawtooth
  // =====================================================================
  function animTcpCwnd(host) {
    const { stage, controls, readout } = frame(host, {
      title: "TCP congestion control — slow start + AIMD sawtooth",
      caption: "cwnd doubles per RTT in slow-start, then grows linearly. On packet loss, cwnd halves (multiplicative decrease) and restarts linear growth (additive increase). The sawtooth is why p99 latency spikes.",
    });
    const svg = $svg("svg", { viewBox: "0 0 480 240", width: 480, style: "max-width:100%;height:auto;" });
    stage.appendChild(svg);

    const MAX_PTS = 80;
    let pts = []; // {rtt, cwnd, state} where state ∈ ss/ca/loss
    let cwnd = 1;
    let ssthresh = 32;
    let rttCount = 0;
    let state = "ss";
    let running = false;
    let timer = null;

    function step() {
      rttCount++;
      // loss probability climbs as cwnd approaches link capacity (= 40)
      const lossP = Math.min(0.6, Math.max(0, (cwnd - 28) / 28));
      const loss = Math.random() < lossP;
      let nextState = state;
      if (loss) {
        ssthresh = Math.max(2, Math.floor(cwnd / 2));
        cwnd = ssthresh;
        nextState = "ca";
        pts.push({ rtt: rttCount, cwnd, state: "loss" });
      } else {
        if (state === "ss") {
          cwnd *= 2;
          if (cwnd >= ssthresh) { cwnd = ssthresh; nextState = "ca"; }
        } else {
          cwnd += 1;
        }
        pts.push({ rtt: rttCount, cwnd, state: nextState });
      }
      state = nextState;
      if (pts.length > MAX_PTS) pts.shift();
      draw();
    }

    function start() { if (running) return; running = true; timer = setInterval(step, 220); }
    function stop() { running = false; if (timer) clearInterval(timer); }

    function draw() {
      svg.innerHTML = "";
      // axes
      svg.appendChild($svg("line", { x1: 40, y1: 200, x2: 460, y2: 200, stroke: "rgba(255,255,255,0.25)" }));
      svg.appendChild($svg("line", { x1: 40, y1: 30, x2: 40, y2: 200, stroke: "rgba(255,255,255,0.25)" }));
      const xat = $svg("text", { x: 250, y: 220, "text-anchor": "middle", class: "anim-label--mono" });
      xat.textContent = "RTTs →"; svg.appendChild(xat);
      const yat = $svg("text", { x: 14, y: 110, "text-anchor": "middle", class: "anim-label--mono", transform: "rotate(-90 14 110)" });
      yat.textContent = "cwnd"; svg.appendChild(yat);
      // grid
      for (let v of [10, 20, 30, 40]) {
        const y = 200 - (v / 40) * 165;
        svg.appendChild($svg("line", { x1: 40, y1: y, x2: 460, y2: y, stroke: "rgba(167,139,250,0.1)", "stroke-dasharray": "2 3" }));
        const tt = $svg("text", { x: 36, y: y + 4, "text-anchor": "end", class: "anim-label--mono" });
        tt.textContent = v; svg.appendChild(tt);
      }
      // ssthresh line
      const sty = 200 - (ssthresh / 40) * 165;
      svg.appendChild($svg("line", { x1: 40, y1: sty, x2: 460, y2: sty, stroke: "#fbbf24", "stroke-dasharray": "5 3", opacity: 0.5 }));
      const ssl = $svg("text", { x: 458, y: sty - 4, "text-anchor": "end", class: "anim-label--mono", fill: "#fbbf24" });
      ssl.textContent = `ssthresh = ${ssthresh}`; svg.appendChild(ssl);
      // capacity line
      const cy = 200 - (40 / 40) * 165;
      svg.appendChild($svg("line", { x1: 40, y1: cy, x2: 460, y2: cy, stroke: "#ef4444", "stroke-dasharray": "5 3", opacity: 0.4 }));
      const cl = $svg("text", { x: 458, y: cy - 4, "text-anchor": "end", class: "anim-label--mono", fill: "#ef4444" });
      cl.textContent = "capacity ≈ 40"; svg.appendChild(cl);

      // line
      const path = $svg("path", { fill: "none", stroke: "#a78bfa", "stroke-width": 2 });
      let d = "";
      pts.forEach((p, i) => {
        const x = 40 + (i / MAX_PTS) * 420;
        const y = 200 - (Math.min(p.cwnd, 45) / 40) * 165;
        d += (i === 0 ? "M" : "L") + ` ${x} ${y} `;
      });
      path.setAttribute("d", d);
      svg.appendChild(path);

      // mark loss points
      pts.forEach((p, i) => {
        if (p.state === "loss") {
          const x = 40 + (i / MAX_PTS) * 420;
          const y = 200 - (Math.min(p.cwnd, 45) / 40) * 165;
          svg.appendChild($svg("circle", { cx: x, cy: y, r: 5, fill: "#ef4444",
            filter: "drop-shadow(0 0 6px rgba(239,68,68,0.7))" }));
        }
      });
      // current cwnd dot
      if (pts.length) {
        const last = pts[pts.length - 1];
        const x = 40 + ((pts.length - 1) / MAX_PTS) * 420;
        const y = 200 - (Math.min(last.cwnd, 45) / 40) * 165;
        svg.appendChild($svg("circle", { cx: x, cy: y, r: 4, fill: "#fbbf24" }));
      }

      readout.innerHTML = "";
      readout.appendChild($el("span", null, `phase: <strong>${state === "ss" ? "slow start" : "congestion avoidance"}</strong>`));
      readout.appendChild($el("span", null, `cwnd: <strong>${cwnd.toFixed(1)}</strong>`));
      readout.appendChild($el("span", null, `ssthresh: <strong>${ssthresh}</strong>`));
      readout.appendChild($el("span", null, `RTT: <strong>${rttCount}</strong>`));
    }

    controls.appendChild(btn("▶ run", "primary", start));
    controls.appendChild(btn("⏸ pause", null, stop));
    controls.appendChild(btn("step 1 RTT", null, step));
    controls.appendChild(btn("inject loss", "danger", () => {
      ssthresh = Math.max(2, Math.floor(cwnd / 2));
      cwnd = ssthresh;
      pts.push({ rtt: ++rttCount, cwnd, state: "loss" });
      state = "ca";
      if (pts.length > MAX_PTS) pts.shift();
      draw();
    }));
    controls.appendChild(btn("reset", null, () => { stop(); pts = []; cwnd = 1; ssthresh = 32; rttCount = 0; state = "ss"; draw(); }));

    draw();
  }

  // ---------- registry & mount ------------------------------------------
  const REG = {
    "consistent-hash": animConsistentHash,
    "raft": animRaft,
    "bucket": animBuckets,
    "kafka": animKafka,
    "lsm-btree": animLsmBtree,
    "cache-patterns": animCachePatterns,
    "cap": animCap,
    "rate-window": animRateWindow,
    "saga": animSaga,
    "vector-clock": animVectorClock,
    "sharding": animSharding,
    "bloom": animBloom,
    "circuit-breaker": animCircuit,
    "load-balancer": animLoadBalancer,
    "windowing": animWindowing,
    "eviction": animEviction,
    "mvcc": animMvcc,
    "quorum": animQuorum,
    "hll": animHLL,
    "tcp-cwnd": animTcpCwnd,
  };

  function mountAll() {
    document.querySelectorAll(".sde-anim[data-anim]").forEach(host => {
      if (host.dataset.mounted) return;
      const key = host.dataset.anim;
      const fn = REG[key];
      if (!fn) {
        host.innerHTML = `<p style="color:#ef4444;font-family:monospace">Unknown animation: ${key}</p>`;
        return;
      }
      try {
        fn(host);
        host.dataset.mounted = "1";
      } catch (e) {
        console.error("sde-anim error", key, e);
        host.innerHTML = `<p style="color:#ef4444;font-family:monospace">Animation failed: ${e.message}</p>`;
      }
    });
  }

  function bootMermaid() {
    if (window.mermaid && !window.__sdeMermaidInit) {
      window.__sdeMermaidInit = true;
      const isDark = document.documentElement.getAttribute("data-md-color-scheme") === "slate";
      window.mermaid.initialize({
        startOnLoad: false,
        theme: isDark ? "dark" : "default",
        themeVariables: {
          primaryColor: "#7c3aed",
          primaryTextColor: isDark ? "#e7e9f3" : "#1e1b4b",
          primaryBorderColor: "#a78bfa",
          lineColor: "#a78bfa",
          fontFamily: "Inter, system-ui, sans-serif",
        },
      });
    }
    if (window.mermaid) {
      try { window.mermaid.run({ querySelector: ".mermaid:not([data-processed='true'])" }); } catch (e) {}
    }
  }

  function boot() {
    mountAll();
    bootMermaid();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
  // Material instant-loading hook
  if (window.document$) {
    window.document$.subscribe(() => {
      // re-mount on every nav
      document.querySelectorAll(".sde-anim[data-anim]").forEach(h => delete h.dataset.mounted);
      boot();
    });
  }
})();
