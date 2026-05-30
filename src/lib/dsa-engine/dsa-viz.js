/* ===========================================================
   Brain Detox Arc — DSA visualization engine
   ----------------------------------------------------------
   Each algorithm registers a config object:
     DSA.register("binary-search", {
       title, caption, code: [..lines..],
       init(): state,           // build starting state
       step(state): state|null, // produce next state (null = done)
       render(state, stage),    // draw the state into the stage
       readout(state): [{label,value}, ...]
     });

   The engine handles: layout (header, code panel, stage, readout,
   controls), Play/Pause/Step/Reset, speed, and code-line highlight.
   =========================================================== */

(function () {
  "use strict";

  const SVGNS = "http://www.w3.org/2000/svg";

  // ---------- DOM helpers -----------------------------------------------
  function $el(tag, cls, html) {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (html !== undefined) el.innerHTML = html;
    return el;
  }
  function $svg(tag, attrs) {
    const el = document.createElementNS(SVGNS, tag);
    for (const k in attrs) el.setAttribute(k, attrs[k]);
    return el;
  }

  // ---------- frame -----------------------------------------------------
  function frame(host, cfg) {
    host.innerHTML = "";
    host.classList.add("dsa-viz");

    // header
    const header = $el("div", "dsa-viz__header");
    const titleWrap = $el("div");
    titleWrap.appendChild($el("h4", "dsa-viz__title", cfg.title || ""));
    if (cfg.caption) titleWrap.appendChild($el("p", "dsa-viz__caption", cfg.caption));
    header.appendChild(titleWrap);
    header.appendChild($el("span", "dsa-viz__badge", "Step-by-step"));
    host.appendChild(header);

    // main body: two columns (stage left, code right)
    const body = $el("div", "dsa-viz__body");
    const stageWrap = $el("div", "dsa-viz__stagewrap");
    const stage = $el("div", "dsa-viz__stage");
    stageWrap.appendChild(stage);

    const readout = $el("div", "dsa-viz__readout");
    stageWrap.appendChild(readout);

    const codeWrap = $el("div", "dsa-viz__codewrap");
    const codeHeader = $el("div", "dsa-viz__codehead", "PSEUDOCODE");
    const code = $el("pre", "dsa-viz__code");
    codeWrap.appendChild(codeHeader);
    codeWrap.appendChild(code);

    body.appendChild(stageWrap);
    body.appendChild(codeWrap);
    host.appendChild(body);

    // description (current step text)
    const desc = $el("div", "dsa-viz__desc", "<span class='dsa-viz__desc-prefix'>step 0 ›</span> ready");
    host.appendChild(desc);

    // controls
    const controls = $el("div", "dsa-viz__controls");
    host.appendChild(controls);

    return { stage, code, readout, desc, controls };
  }

  // ---------- buttons ---------------------------------------------------
  function btn(label, kind, onClick) {
    const b = $el("button", "dsa-viz__btn" + (kind ? " dsa-viz__btn--" + kind : ""), label);
    b.type = "button";
    b.addEventListener("click", onClick);
    return b;
  }

  // ---------- registry --------------------------------------------------
  const REG = {};
  function register(key, cfg) { REG[key] = cfg; }

  // ---------- render code panel -----------------------------------------
  function renderCode(codeEl, lines, activeLine) {
    codeEl.innerHTML = "";
    lines.forEach((ln, i) => {
      const row = $el("span", "dsa-viz__codeline" + (i === activeLine ? " is-active" : ""));
      const num = $el("span", "dsa-viz__lineno", String(i + 1).padStart(2, " "));
      const txt = $el("span", "dsa-viz__linetext", escapeHtml(ln));
      row.appendChild(num);
      row.appendChild(txt);
      codeEl.appendChild(row);
    });
  }
  function escapeHtml(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function renderReadout(el, items) {
    el.innerHTML = "";
    (items || []).forEach(it => {
      const chip = $el("span", "dsa-viz__chip");
      chip.innerHTML = `<em>${it.label}</em><strong>${it.value}</strong>`;
      el.appendChild(chip);
    });
  }

  // ---------- mount -----------------------------------------------------
  function mount(host) {
    const key = host.dataset.algo;
    const cfg = REG[key];
    if (!cfg) {
      host.innerHTML = `<p style="color:#ef4444;font-family:monospace">Unknown DSA viz: ${key}</p>`;
      return;
    }

    const ui = frame(host, cfg);
    let state = cfg.init();
    let history = [state];
    let stepIdx = 0;
    let timer = null;
    let speed = 700; // ms per step

    function draw() {
      cfg.render(state, ui.stage);
      renderCode(ui.code, cfg.code || [], state.line == null ? -1 : state.line);
      ui.desc.innerHTML = `<span class='dsa-viz__desc-prefix'>step ${stepIdx} ›</span> ${state.desc || ""}`;
      renderReadout(ui.readout, cfg.readout ? cfg.readout(state) : []);
    }

    function doStep() {
      if (state.done) { stop(); return; }
      const next = cfg.step(state);
      if (!next) { state.done = true; draw(); stop(); return; }
      state = next;
      stepIdx++;
      history.push(state);
      draw();
      if (state.done) stop();
    }

    function doBack() {
      if (history.length <= 1) return;
      history.pop();
      state = history[history.length - 1];
      stepIdx = Math.max(0, stepIdx - 1);
      draw();
    }

    function play() {
      if (timer) return;
      if (state.done) reset();
      timer = setInterval(doStep, speed);
    }
    function stop() { if (timer) { clearInterval(timer); timer = null; } }
    function reset() {
      stop();
      state = cfg.init();
      history = [state];
      stepIdx = 0;
      draw();
    }
    function setSpeed(ms) {
      speed = ms;
      if (timer) { stop(); play(); }
    }

    ui.controls.appendChild(btn("▶ play", "primary", play));
    ui.controls.appendChild(btn("⏸ pause", null, stop));
    ui.controls.appendChild(btn("step ›", null, doStep));
    ui.controls.appendChild(btn("‹ back", null, doBack));
    ui.controls.appendChild(btn("↺ reset", "ghost", reset));

    // speed selector
    const speedWrap = $el("div", "dsa-viz__speed");
    [["slow", 1100], ["normal", 700], ["fast", 320], ["max", 120]].forEach(([lbl, ms], i) => {
      const b = $el("button", "dsa-viz__sbtn" + (ms === 700 ? " is-active" : ""), lbl);
      b.type = "button";
      b.addEventListener("click", () => {
        setSpeed(ms);
        speedWrap.querySelectorAll(".dsa-viz__sbtn").forEach(x => x.classList.remove("is-active"));
        b.classList.add("is-active");
      });
      speedWrap.appendChild(b);
    });
    ui.controls.appendChild(speedWrap);

    // optional input controls
    if (cfg.inputs) {
      cfg.inputs.forEach(input => {
        const wrap = $el("label", "dsa-viz__input");
        wrap.appendChild($el("span", null, input.label));
        const el = document.createElement("input");
        el.type = input.type || "text";
        el.value = input.default;
        el.addEventListener("change", () => {
          input.onChange(el.value);
          reset();
        });
        wrap.appendChild(el);
        ui.controls.appendChild(wrap);
      });
    }

    draw();
  }

  // ---------- primitive renderers ---------------------------------------
  // Reusable building blocks every algo can call from its render().
  const P = {};

  // -- Array of integers, with optional pointer/highlight maps -----------
  // opts: { arr, pointers: {name: idx}, highlight: {idx: 'cmp'|'swap'|'done'|'window'},
  //         cellW, cellH, indexed }
  P.array = function (stage, opts) {
    stage.innerHTML = "";
    const arr = opts.arr || [];
    const n = arr.length;
    const cellW = opts.cellW || Math.max(36, Math.min(58, Math.floor(560 / Math.max(n, 1))));
    const cellH = opts.cellH || 48;
    const gap = 4;
    const pad = 36;
    const width = pad * 2 + n * (cellW + gap);
    const height = cellH + 70;

    const svg = $svg("svg", {
      viewBox: `0 0 ${width} ${height}`,
      width: width,
      style: "max-width:100%;height:auto;",
    });

    const highlight = opts.highlight || {};
    const pointers = opts.pointers || {};
    // group pointers by index
    const ptrByIdx = {};
    Object.keys(pointers).forEach(name => {
      const idx = pointers[name];
      if (idx == null || idx < 0 || idx >= n) return;
      (ptrByIdx[idx] = ptrByIdx[idx] || []).push(name);
    });

    for (let i = 0; i < n; i++) {
      const x = pad + i * (cellW + gap);
      const y = 24;
      const h = highlight[i];
      const cls = "dsa-cell" + (h ? " dsa-cell--" + h : "");
      const rect = $svg("rect", {
        x, y, width: cellW, height: cellH, rx: 8,
        class: cls,
      });
      svg.appendChild(rect);
      const t = $svg("text", {
        x: x + cellW / 2, y: y + cellH / 2 + 5,
        "text-anchor": "middle", class: "dsa-cell-text",
      });
      t.textContent = arr[i];
      svg.appendChild(t);
      if (opts.indexed !== false) {
        const idx = $svg("text", {
          x: x + cellW / 2, y: y + cellH + 14,
          "text-anchor": "middle", class: "dsa-cell-index",
        });
        idx.textContent = i;
        svg.appendChild(idx);
      }
      // pointers below
      if (ptrByIdx[i]) {
        const names = ptrByIdx[i];
        const py = y + cellH + 30;
        const triangle = $svg("path", {
          d: `M ${x + cellW / 2 - 6} ${py - 2} L ${x + cellW / 2 + 6} ${py - 2} L ${x + cellW / 2} ${py - 10} Z`,
          class: "dsa-ptr-arrow",
        });
        svg.appendChild(triangle);
        const tx = $svg("text", {
          x: x + cellW / 2, y: py + 12,
          "text-anchor": "middle", class: "dsa-ptr-label",
        });
        tx.textContent = names.join(" / ");
        svg.appendChild(tx);
      }
    }
    stage.appendChild(svg);
  };

  // -- Binary tree (array-encoded levels or explicit nodes) --------------
  // opts: { nodes: [{id, val, x, y, parent, highlight}], edges? }
  P.tree = function (stage, opts) {
    stage.innerHTML = "";
    const nodes = opts.nodes || [];
    if (!nodes.length) return;
    const minX = Math.min(...nodes.map(n => n.x));
    const maxX = Math.max(...nodes.map(n => n.x));
    const minY = Math.min(...nodes.map(n => n.y));
    const maxY = Math.max(...nodes.map(n => n.y));
    const W = maxX - minX + 80;
    const H = maxY - minY + 80;
    const svg = $svg("svg", {
      viewBox: `${minX - 40} ${minY - 40} ${W} ${H}`,
      width: Math.max(W * 1.2, 320),
      style: "max-width:100%;height:auto;",
    });

    // edges (parent → child)
    const byId = {};
    nodes.forEach(n => byId[n.id] = n);
    nodes.forEach(n => {
      if (n.parent != null && byId[n.parent]) {
        const p = byId[n.parent];
        const line = $svg("line", {
          x1: p.x, y1: p.y, x2: n.x, y2: n.y, class: "dsa-tree-edge",
        });
        svg.appendChild(line);
      }
    });

    nodes.forEach(n => {
      const cls = "dsa-tree-node" + (n.highlight ? " dsa-tree-node--" + n.highlight : "");
      const c = $svg("circle", { cx: n.x, cy: n.y, r: 20, class: cls });
      svg.appendChild(c);
      const t = $svg("text", {
        x: n.x, y: n.y + 5, "text-anchor": "middle", class: "dsa-tree-text",
      });
      t.textContent = n.val;
      svg.appendChild(t);
      if (n.tag) {
        const tg = $svg("text", {
          x: n.x, y: n.y + 38, "text-anchor": "middle", class: "dsa-tree-tag",
        });
        tg.textContent = n.tag;
        svg.appendChild(tg);
      }
    });
    stage.appendChild(svg);
  };

  // -- General graph (force-free, caller provides coordinates) -----------
  // opts: { nodes: [{id, x, y, val, highlight, tag}],
  //         edges: [{a, b, w, highlight, directed}] }
  P.graph = function (stage, opts) {
    stage.innerHTML = "";
    const nodes = opts.nodes || [];
    const edges = opts.edges || [];
    if (!nodes.length) return;
    const minX = Math.min(...nodes.map(n => n.x));
    const maxX = Math.max(...nodes.map(n => n.x));
    const minY = Math.min(...nodes.map(n => n.y));
    const maxY = Math.max(...nodes.map(n => n.y));
    const W = maxX - minX + 100;
    const H = maxY - minY + 100;
    const svg = $svg("svg", {
      viewBox: `${minX - 50} ${minY - 50} ${W} ${H}`,
      width: Math.max(W * 1.2, 360),
      style: "max-width:100%;height:auto;",
    });

    // arrowhead marker
    const defs = $svg("defs", {});
    defs.innerHTML = `
      <marker id="dsa-arrow" viewBox="0 0 10 10" refX="22" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 0 L 10 5 L 0 10 z" fill="#a78bfa"/>
      </marker>
      <marker id="dsa-arrow-hot" viewBox="0 0 10 10" refX="22" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 0 L 10 5 L 0 10 z" fill="#fbbf24"/>
      </marker>`;
    svg.appendChild(defs);

    const byId = {};
    nodes.forEach(n => byId[n.id] = n);
    edges.forEach(e => {
      const a = byId[e.a], b = byId[e.b];
      if (!a || !b) return;
      const cls = "dsa-graph-edge" + (e.highlight ? " dsa-graph-edge--" + e.highlight : "");
      const line = $svg("line", {
        x1: a.x, y1: a.y, x2: b.x, y2: b.y, class: cls,
      });
      if (e.directed) {
        line.setAttribute("marker-end", e.highlight === "active" ? "url(#dsa-arrow-hot)" : "url(#dsa-arrow)");
      }
      svg.appendChild(line);
      if (e.w != null) {
        const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        const wbg = $svg("rect", { x: mx - 14, y: my - 10, width: 28, height: 18, rx: 6, class: "dsa-graph-wbg" });
        svg.appendChild(wbg);
        const wt = $svg("text", { x: mx, y: my + 4, "text-anchor": "middle", class: "dsa-graph-w" });
        wt.textContent = e.w;
        svg.appendChild(wt);
      }
    });

    nodes.forEach(n => {
      const cls = "dsa-graph-node" + (n.highlight ? " dsa-graph-node--" + n.highlight : "");
      svg.appendChild($svg("circle", { cx: n.x, cy: n.y, r: 18, class: cls }));
      const t = $svg("text", { x: n.x, y: n.y + 4, "text-anchor": "middle", class: "dsa-graph-text" });
      t.textContent = n.val != null ? n.val : n.id;
      svg.appendChild(t);
      if (n.tag != null) {
        const tg = $svg("text", { x: n.x, y: n.y - 26, "text-anchor": "middle", class: "dsa-graph-tag" });
        tg.textContent = n.tag;
        svg.appendChild(tg);
      }
    });
    stage.appendChild(svg);
  };

  // -- Grid (2D matrix), used for grid BFS/DFS, DP tables, etc. ----------
  // opts: { rows, cols, cellOf(r,c) -> {val, cls, tag}, cellSize? }
  P.grid = function (stage, opts) {
    stage.innerHTML = "";
    const rows = opts.rows, cols = opts.cols;
    const cs = opts.cellSize || Math.max(28, Math.min(48, Math.floor(520 / Math.max(cols, 1))));
    const pad = 30;
    const W = pad * 2 + cols * cs;
    const H = pad * 2 + rows * cs;
    const svg = $svg("svg", {
      viewBox: `0 0 ${W} ${H}`,
      width: W,
      style: "max-width:100%;height:auto;",
    });

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const meta = opts.cellOf(r, c) || {};
        const x = pad + c * cs;
        const y = pad + r * cs;
        const cls = "dsa-gridcell" + (meta.cls ? " dsa-gridcell--" + meta.cls : "");
        svg.appendChild($svg("rect", { x, y, width: cs - 2, height: cs - 2, rx: 4, class: cls }));
        if (meta.val !== undefined && meta.val !== "") {
          const t = $svg("text", {
            x: x + (cs - 2) / 2, y: y + (cs - 2) / 2 + 4,
            "text-anchor": "middle", class: "dsa-gridcell-text",
          });
          t.textContent = meta.val;
          svg.appendChild(t);
        }
        if (meta.tag) {
          const tg = $svg("text", {
            x: x + (cs - 2) / 2, y: y + (cs - 2) - 4,
            "text-anchor": "middle", class: "dsa-gridcell-tag",
          });
          tg.textContent = meta.tag;
          svg.appendChild(tg);
        }
      }
    }
    stage.appendChild(svg);
  };

  // -- Linked list ------------------------------------------------------
  // opts: { nodes: [{val, highlight}], pointers: {name: idx} }
  P.linkedList = function (stage, opts) {
    stage.innerHTML = "";
    const nodes = opts.nodes || [];
    const n = nodes.length;
    const cellW = 56;
    const cellH = 40;
    const gap = 26;
    const pad = 30;
    const width = pad * 2 + n * (cellW + gap);
    const height = cellH + 70;
    const svg = $svg("svg", { viewBox: `0 0 ${width} ${height}`, width, style: "max-width:100%;height:auto;" });

    const ptrByIdx = {};
    const ptrs = opts.pointers || {};
    Object.keys(ptrs).forEach(name => {
      const idx = ptrs[name];
      if (idx == null || idx < 0 || idx >= n) return;
      (ptrByIdx[idx] = ptrByIdx[idx] || []).push(name);
    });

    for (let i = 0; i < n; i++) {
      const x = pad + i * (cellW + gap);
      const y = 24;
      const meta = nodes[i] || {};
      const cls = "dsa-ll-node" + (meta.highlight ? " dsa-ll-node--" + meta.highlight : "");
      svg.appendChild($svg("rect", { x, y, width: cellW, height: cellH, rx: 6, class: cls }));
      const t = $svg("text", { x: x + cellW / 2, y: y + cellH / 2 + 4, "text-anchor": "middle", class: "dsa-cell-text" });
      t.textContent = meta.val;
      svg.appendChild(t);
      if (i < n - 1) {
        const ax = x + cellW;
        const ay = y + cellH / 2;
        svg.appendChild($svg("line", { x1: ax, y1: ay, x2: ax + gap - 6, y2: ay, class: "dsa-ll-arrow" }));
        svg.appendChild($svg("path", { d: `M ${ax + gap - 6} ${ay - 4} L ${ax + gap} ${ay} L ${ax + gap - 6} ${ay + 4} Z`, class: "dsa-ll-arrow-tip" }));
      } else {
        const ax = x + cellW;
        const ay = y + cellH / 2;
        const tn = $svg("text", { x: ax + 14, y: ay + 4, class: "dsa-ll-null" });
        tn.textContent = "∅";
        svg.appendChild(tn);
      }
      if (ptrByIdx[i]) {
        const names = ptrByIdx[i];
        const py = y + cellH + 24;
        svg.appendChild($svg("path", {
          d: `M ${x + cellW / 2 - 6} ${py - 2} L ${x + cellW / 2 + 6} ${py - 2} L ${x + cellW / 2} ${py - 10} Z`,
          class: "dsa-ptr-arrow",
        }));
        const tx = $svg("text", { x: x + cellW / 2, y: py + 12, "text-anchor": "middle", class: "dsa-ptr-label" });
        tx.textContent = names.join(" / ");
        svg.appendChild(tx);
      }
    }
    stage.appendChild(svg);
  };

  // -- DP table (1D / 2D) ------------------------------------------------
  // opts: { rows, cols, rowLabels?, colLabels?, cellOf(r,c) -> {val, cls} }
  P.dpTable = function (stage, opts) {
    stage.innerHTML = "";
    const rows = opts.rows, cols = opts.cols;
    const cs = opts.cellSize || Math.max(34, Math.min(54, Math.floor(560 / Math.max(cols + 1, 1))));
    const cs2 = cs;
    const labelW = opts.rowLabels ? cs : 0;
    const labelH = opts.colLabels ? cs : 0;
    const pad = 30;
    const W = pad * 2 + labelW + cols * cs;
    const H = pad * 2 + labelH + rows * cs2;
    const svg = $svg("svg", { viewBox: `0 0 ${W} ${H}`, width: W, style: "max-width:100%;height:auto;" });

    if (opts.colLabels) {
      for (let c = 0; c < cols; c++) {
        const x = pad + labelW + c * cs;
        const y = pad;
        const t = $svg("text", { x: x + cs / 2, y: y + cs / 2 + 4, "text-anchor": "middle", class: "dsa-dp-label" });
        t.textContent = opts.colLabels[c];
        svg.appendChild(t);
      }
    }
    if (opts.rowLabels) {
      for (let r = 0; r < rows; r++) {
        const x = pad;
        const y = pad + labelH + r * cs2;
        const t = $svg("text", { x: x + cs / 2, y: y + cs2 / 2 + 4, "text-anchor": "middle", class: "dsa-dp-label" });
        t.textContent = opts.rowLabels[r];
        svg.appendChild(t);
      }
    }

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const meta = opts.cellOf(r, c) || {};
        const x = pad + labelW + c * cs;
        const y = pad + labelH + r * cs2;
        const cls = "dsa-dp-cell" + (meta.cls ? " dsa-dp-cell--" + meta.cls : "");
        svg.appendChild($svg("rect", { x: x + 1, y: y + 1, width: cs - 2, height: cs2 - 2, rx: 4, class: cls }));
        if (meta.val !== undefined && meta.val !== "") {
          const t = $svg("text", { x: x + cs / 2, y: y + cs2 / 2 + 4, "text-anchor": "middle", class: "dsa-dp-text" });
          t.textContent = meta.val;
          svg.appendChild(t);
        }
      }
    }
    stage.appendChild(svg);
  };

  // -- Stack (vertical) --------------------------------------------------
  P.stack = function (stage, opts) {
    stage.innerHTML = "";
    const items = opts.items || [];
    const cellW = 80;
    const cellH = 32;
    const pad = 20;
    const W = cellW + pad * 2 + 80;
    const H = pad * 2 + Math.max(items.length, 3) * (cellH + 4) + 40;
    const svg = $svg("svg", { viewBox: `0 0 ${W} ${H}`, width: W, style: "max-width:100%;height:auto;" });

    // base
    const baseY = H - pad;
    svg.appendChild($svg("line", { x1: pad, y1: baseY, x2: pad + cellW, y2: baseY, class: "dsa-stack-base" }));
    svg.appendChild($svg("line", { x1: pad, y1: baseY, x2: pad, y2: baseY - 8 - items.length * (cellH + 4), class: "dsa-stack-base" }));
    svg.appendChild($svg("line", { x1: pad + cellW, y1: baseY, x2: pad + cellW, y2: baseY - 8 - items.length * (cellH + 4), class: "dsa-stack-base" }));

    items.forEach((it, i) => {
      const y = baseY - (i + 1) * (cellH + 4);
      const cls = "dsa-stack-cell" + (it.highlight ? " dsa-stack-cell--" + it.highlight : "");
      svg.appendChild($svg("rect", { x: pad + 2, y, width: cellW - 4, height: cellH, rx: 4, class: cls }));
      const t = $svg("text", { x: pad + cellW / 2, y: y + cellH / 2 + 4, "text-anchor": "middle", class: "dsa-cell-text" });
      t.textContent = it.val;
      svg.appendChild(t);
    });

    if (items.length) {
      const topY = baseY - items.length * (cellH + 4);
      const tt = $svg("text", { x: pad + cellW + 14, y: topY + cellH / 2 + 4, class: "dsa-stack-top" });
      tt.textContent = "← top";
      svg.appendChild(tt);
    }
    stage.appendChild(svg);
  };

  // -- Trie --------------------------------------------------------------
  // opts: { nodes: [{id, ch, x, y, parent, highlight, end}] }
  P.trie = function (stage, opts) {
    P.tree(stage, {
      nodes: (opts.nodes || []).map(n => ({
        id: n.id,
        val: n.ch === null || n.ch === undefined ? "•" : n.ch,
        x: n.x, y: n.y,
        parent: n.parent,
        highlight: n.highlight,
        tag: n.end ? "$" : undefined,
      })),
    });
  };

  // ---------- public API -----------------------------------------------
  const API = {
    register,
    mount,                      // sysviz: exposed so the bridge can mount one host directly
    primitives: P,
    util: {
      $el, $svg, escapeHtml,
    },
  };
  window.DSA = API;

  // sysviz: auto-boot intentionally disabled. The sysviz anim runtime
  // (src/lib/anim/mount.ts) drives mounting via the dsa-bridge module.
})();
