/* ===========================================================
   Brain Detox Arc — DSA visualization upgrades (graph batch)
   ----------------------------------------------------------
   Step-by-step visualizations for advanced graph algorithms:
     - bellman-ford       (relax edges V-1 times, neg-cycle scan)
     - floyd-warshall     (all-pairs DP via intermediate k)
     - kruskal            (sorted edges + DSU, MST)
     - prim               (frontier-grown MST)
     - tarjan-scc         (DFS lowlinks, SCC pop)
   These overrides replace the codeWalk stubs registered in
   dsa-algorithms.js. Each tells a real, evolving story per step.
   =========================================================== */
(function () {
  "use strict";
  if (!window.DSA) { console.error("dsa-viz.js must load first"); return; }
  const { primitives: P, register } = window.DSA;

  // small helpers ------------------------------------------------------
  const fmt = v => (v === Infinity || v === -Infinity ? "∞" : String(v));
  const cloneMat = m => m.map(r => r.slice());
  const valOf = (nodes, id) => (nodes.find(n => n.id === id) || {}).val ?? String(id);

  // ===================================================================
  // 1. BELLMAN-FORD
  // ===================================================================
  register("bellman-ford", {
    title: "Bellman-Ford — shortest paths with negative edges",
    caption:
      "Relax every edge V-1 times. After V-1 passes, one more pass that still relaxes any edge proves a negative cycle is reachable.",
    code: [
      "dist = [∞]*V; dist[src] = 0",
      "for pass in 1..V-1:",
      "  for (u, v, w) in edges:",
      "    if dist[u] + w < dist[v]:",
      "      dist[v] = dist[u] + w",
      "for (u, v, w) in edges:           # cycle check",
      "  if dist[u] + w < dist[v]:",
      "    return 'negative cycle'",
    ],
    init() {
      // 5 nodes: S(0), A(1), B(2), C(3), D(4)
      const nodes = [
        { id: 0, x: 60,  y: 80,  val: "S" },
        { id: 1, x: 170, y: 35,  val: "A" },
        { id: 2, x: 170, y: 125, val: "B" },
        { id: 3, x: 290, y: 35,  val: "C" },
        { id: 4, x: 290, y: 125, val: "D" },
      ];
      // 7 directed edges, including one negative
      const edges = [
        { a: 0, b: 1, w:  6, directed: true },
        { a: 0, b: 2, w:  7, directed: true },
        { a: 1, b: 2, w:  8, directed: true },
        { a: 1, b: 3, w:  5, directed: true },
        { a: 2, b: 3, w: -3, directed: true }, // negative edge
        { a: 2, b: 4, w:  9, directed: true },
        { a: 3, b: 4, w:  2, directed: true },
      ];
      const dist = { 0: 0, 1: Infinity, 2: Infinity, 3: Infinity, 4: Infinity };
      const V = nodes.length;
      return {
        nodes, edges, V,
        dist,
        pass: 1,             // 1..V-1 relax passes, then V = cycle-check pass
        edgeIdx: 0,
        relaxedThisPass: 0,
        lastRelaxed: null,   // edge object just updated
        lastConsidered: null,
        negCycle: false,
        line: 0,
        desc: "init dist[S]=0; all others ∞",
      };
    },
    step(s) {
      // terminal
      if (s.done) return null;
      if (s.negCycle) return null;

      // out of passes → finished cleanly
      if (s.pass > s.V) {
        return { ...s, line: 7, lastConsidered: null, desc: "no negative cycle reachable — distances are final", done: true };
      }

      // start of a new pass
      if (s.edgeIdx === 0 && s.lastConsidered == null && s.lastRelaxed == null && s.relaxedThisPass === 0) {
        if (s.pass <= s.V - 1) {
          return { ...s, line: 1, desc: `pass ${s.pass} / ${s.V - 1}: scan every edge` };
        }
        // pass === V → the cycle-detection sweep
        return { ...s, line: 5, desc: "extra pass: any relaxation here ⇒ negative cycle" };
      }

      // consider current edge
      const e = s.edges[s.edgeIdx];
      const du = s.dist[e.a];
      const dv = s.dist[e.b];
      const nd = du === Infinity ? Infinity : du + e.w;
      const improves = nd < dv;

      // edge being looked at — sub-step 1 of 2: "consider"
      if (s.lastConsidered !== e) {
        const tag = improves
          ? `dist[${valOf(s.nodes, e.a)}] + ${e.w} = ${fmt(nd)} < dist[${valOf(s.nodes, e.b)}] = ${fmt(dv)}  ✓ relax`
          : `dist[${valOf(s.nodes, e.a)}] + ${e.w} = ${fmt(nd)} ≥ dist[${valOf(s.nodes, e.b)}] = ${fmt(dv)}  — skip`;
        return {
          ...s,
          line: s.pass <= s.V - 1 ? 3 : 6,
          lastConsidered: e,
          lastRelaxed: null,
          desc: `edge (${valOf(s.nodes, e.a)} → ${valOf(s.nodes, e.b)}, w=${e.w}): ${tag}`,
        };
      }

      // sub-step 2 of 2: apply (or not) and advance
      let dist = s.dist;
      let lastRelaxed = null;
      let relaxedThisPass = s.relaxedThisPass;
      let negCycle = s.negCycle;
      let line = s.line;
      let desc;
      if (improves) {
        if (s.pass === s.V) {
          // cycle-detection pass — any improvement is a witness
          negCycle = true;
          line = 7;
          desc = `relaxation possible after V-1 passes ⇒ NEGATIVE CYCLE reachable via ${valOf(s.nodes, e.a)} → ${valOf(s.nodes, e.b)}`;
          return { ...s, dist, line, lastRelaxed: e, negCycle, desc, done: true };
        }
        dist = { ...s.dist, [e.b]: nd };
        lastRelaxed = e;
        relaxedThisPass += 1;
        line = 4;
        desc = `update dist[${valOf(s.nodes, e.b)}] ← ${nd}`;
      } else {
        desc = `no update — move on`;
        line = s.pass <= s.V - 1 ? 2 : 5;
      }

      // advance edgeIdx; if wrapped, finish pass
      let edgeIdx = s.edgeIdx + 1;
      let pass = s.pass;
      let lastConsidered = e;
      if (edgeIdx >= s.edges.length) {
        // pass complete
        if (pass <= s.V - 1) {
          // early exit: no relaxations this pass means we converged
          if (relaxedThisPass === 0) {
            desc = `pass ${pass} relaxed 0 edges — converged early; skip remaining passes, run cycle check`;
            pass = s.V;
          } else {
            desc = `pass ${pass} relaxed ${relaxedThisPass} edge${relaxedThisPass === 1 ? "" : "s"} — start next pass`;
            pass += 1;
          }
        } else {
          // cycle pass swept clean
          desc = "cycle-check pass found no improvements — distances are stable";
          pass = s.V + 1;
        }
        edgeIdx = 0;
        relaxedThisPass = 0;
        lastConsidered = null;
        lastRelaxed = lastRelaxed; // keep flash of last relaxed edge briefly
      }

      return { ...s, dist, edgeIdx, pass, relaxedThisPass, lastRelaxed, lastConsidered, line, negCycle, desc };
    },
    render(s, stage) {
      const ns = s.nodes.map(n => {
        let h = null;
        if (n.id === 0) h = s.done && !s.negCycle ? "done" : "start";
        if (s.dist[n.id] !== Infinity && n.id !== 0) h = h || "queue";
        if (s.lastRelaxed && n.id === s.lastRelaxed.b) h = "visit";
        if (s.done && !s.negCycle && s.dist[n.id] !== Infinity) h = "done";
        return { ...n, highlight: h, tag: fmt(s.dist[n.id]) };
      });
      const es = s.edges.map(e => {
        let highlight = null;
        if (s.lastRelaxed && s.lastRelaxed.a === e.a && s.lastRelaxed.b === e.b) {
          highlight = s.negCycle ? "reject" : "done";
        } else if (s.lastConsidered && s.lastConsidered.a === e.a && s.lastConsidered.b === e.b) {
          highlight = "active";
        }
        return { ...e, highlight };
      });
      P.graph(stage, { nodes: ns, edges: es });
    },
    readout: s => [
      { label: "pass", value: s.pass <= s.V - 1 ? `${s.pass}/${s.V - 1}` : (s.pass === s.V ? "cycle-check" : "done") },
      { label: "edge", value: s.edges[s.edgeIdx] ? `${valOf(s.nodes, s.edges[s.edgeIdx].a)}→${valOf(s.nodes, s.edges[s.edgeIdx].b)}` : "—" },
      { label: "relaxed (pass)", value: s.relaxedThisPass },
      { label: "neg-cycle", value: s.negCycle ? "YES" : "no" },
    ],
  });

  // ===================================================================
  // 2. FLOYD-WARSHALL
  // ===================================================================
  register("floyd-warshall", {
    title: "Floyd-Warshall — all-pairs shortest paths",
    caption:
      "dist[i][j] = min(dist[i][j], dist[i][k] + dist[k][j]) over every intermediate k. After k = V-1 the matrix holds all-pairs shortest paths.",
    code: [
      "for k in 0..V-1:",
      "  for i in 0..V-1:",
      "    for j in 0..V-1:",
      "      if dist[i][k] + dist[k][j] < dist[i][j]:",
      "        dist[i][j] = dist[i][k] + dist[k][j]",
    ],
    init() {
      // 4-node directed weighted graph
      const nodes = [
        { id: 0, x: 80,  y: 50, val: "0" },
        { id: 1, x: 220, y: 50, val: "1" },
        { id: 2, x: 80,  y: 130, val: "2" },
        { id: 3, x: 220, y: 130, val: "3" },
      ];
      const edges = [
        { a: 0, b: 1, w: 3, directed: true },
        { a: 0, b: 3, w: 7, directed: true },
        { a: 1, b: 0, w: 8, directed: true },
        { a: 1, b: 2, w: 2, directed: true },
        { a: 2, b: 0, w: 5, directed: true },
        { a: 2, b: 3, w: 1, directed: true },
        { a: 3, b: 0, w: 2, directed: true },
      ];
      const V = nodes.length;
      const INF = Infinity;
      const dist = Array.from({ length: V }, (_, i) =>
        Array.from({ length: V }, (_, j) => (i === j ? 0 : INF))
      );
      edges.forEach(e => { dist[e.a][e.b] = e.w; });
      return {
        nodes, edges, V, dist,
        k: 0, i: 0, j: 0,
        considered: false,    // two-phase per cell: read → maybe-update
        lastUpdated: null,    // {i,j,oldVal,newVal} for the cell just changed
        line: 0,
        desc: "init: dist[i][j] = weight if edge exists else ∞ (diagonal = 0)",
      };
    },
    step(s) {
      if (s.done) return null;
      if (s.k >= s.V) {
        return { ...s, line: 4, considered: false, lastUpdated: null, desc: "all k processed — matrix holds shortest paths", done: true };
      }

      const { i, j, k, dist, V } = s;
      const through = dist[i][k] + dist[k][j];
      const improves = through < dist[i][j];

      // phase 1: announce the comparison for cell (i,j) via intermediate k
      if (!s.considered) {
        let line = 3;
        let desc;
        if (i === k || j === k) {
          desc = `cell (${i},${j}) via k=${k}: trivial — dist[${i}][${k}] + dist[${k}][${j}] = ${fmt(dist[i][k])} + ${fmt(dist[k][j])} = ${fmt(through)} (no progress)`;
        } else {
          desc = `cell (${i},${j}) via k=${k}: ${fmt(dist[i][k])} + ${fmt(dist[k][j])} = ${fmt(through)}  vs  current ${fmt(dist[i][j])} → ${improves ? "BETTER, update" : "keep current"}`;
        }
        return { ...s, considered: true, lastUpdated: null, line, desc };
      }

      // phase 2: apply (if better) and advance
      let nextDist = dist;
      let lastUpdated = null;
      let line = 2;
      if (improves) {
        nextDist = cloneMat(dist);
        const oldVal = nextDist[i][j];
        nextDist[i][j] = through;
        lastUpdated = { i, j, oldVal, newVal: through };
        line = 4;
      }

      // advance (i,j) then k
      let ni = i, nj = j + 1, nk = k;
      if (nj >= V) { nj = 0; ni += 1; }
      if (ni >= V) {
        ni = 0; nj = 0; nk = k + 1;
      }

      let desc;
      if (improves) {
        desc = `dist[${i}][${j}] ← ${through} (was ${fmt(lastUpdated.oldVal)})`;
      } else if (ni === 0 && nj === 0 && nk !== k) {
        desc = `finished sweep with k=${k}; advance to k=${nk}`;
      } else {
        desc = "no update — next cell";
      }

      return {
        ...s,
        dist: nextDist,
        i: ni, j: nj, k: nk,
        considered: false,
        lastUpdated,
        line,
        desc,
      };
    },
    render(s, stage) {
      stage.innerHTML = "";
      const wrap = document.createElement("div");
      wrap.style.display = "flex";
      wrap.style.flexDirection = "column";
      wrap.style.gap = "0.5rem";
      wrap.style.alignItems = "center";
      wrap.style.width = "100%";

      // -- top: graph showing edges + current k node
      const gWrap = document.createElement("div");
      const ns = s.nodes.map(n => ({
        ...n,
        highlight: n.id === s.k ? "visit" : (n.id === s.i ? "start" : (n.id === s.j ? "target" : null)),
        tag: n.id === s.k ? "k" : (n.id === s.i ? "i" : (n.id === s.j ? "j" : undefined)),
      }));
      const es = s.edges.map(e => ({
        ...e,
        highlight: (e.a === s.i && e.b === s.k) || (e.a === s.k && e.b === s.j) ? "active" : null,
      }));
      P.graph(gWrap, { nodes: ns, edges: es });
      wrap.appendChild(gWrap);

      // -- bottom: 4x4 dist matrix
      const tWrap = document.createElement("div");
      const labels = s.nodes.map(n => n.val);
      P.dpTable(tWrap, {
        rows: s.V,
        cols: s.V,
        rowLabels: labels,
        colLabels: labels,
        cellOf: (r, c) => {
          let cls = "filled";
          if (r === c) cls = "base";
          if (s.dist[r][c] === Infinity) cls = null; // empty look
          // read cells: dist[i][k] and dist[k][j] when in phase 1 OR after update
          if (!s.done) {
            if (r === s.i && c === s.k) cls = "read";
            else if (r === s.k && c === s.j) cls = "read";
            if (r === s.i && c === s.j) cls = "current";
            if (s.lastUpdated && r === s.lastUpdated.i && c === s.lastUpdated.j) cls = "answer";
          }
          const v = s.dist[r][c];
          return { val: v === Infinity ? "∞" : v, cls };
        },
      });
      wrap.appendChild(tWrap);
      stage.appendChild(wrap);
    },
    readout: s => [
      { label: "k", value: s.k < s.V ? s.k : "✓" },
      { label: "(i,j)", value: s.i < s.V && s.j < s.V ? `(${s.i},${s.j})` : "—" },
      { label: "dist[i][k]+dist[k][j]", value: s.i < s.V && s.j < s.V && s.k < s.V ? fmt(s.dist[s.i][s.k] + s.dist[s.k][s.j]) : "—" },
      { label: "dist[i][j]", value: s.i < s.V && s.j < s.V ? fmt(s.dist[s.i][s.j]) : "—" },
    ],
  });

  // ===================================================================
  // Shared 6-node graph for Kruskal & Prim
  // ===================================================================
  function mstGraph() {
    const nodes = [
      { id: 0, x: 60,  y: 50,  val: "A" },
      { id: 1, x: 170, y: 30,  val: "B" },
      { id: 2, x: 280, y: 50,  val: "C" },
      { id: 3, x: 60,  y: 130, val: "D" },
      { id: 4, x: 170, y: 130, val: "E" },
      { id: 5, x: 280, y: 130, val: "F" },
    ];
    // 8 weighted undirected edges
    const edges = [
      { a: 0, b: 1, w: 4 },
      { a: 0, b: 3, w: 1 },
      { a: 1, b: 2, w: 3 },
      { a: 1, b: 4, w: 2 },
      { a: 2, b: 5, w: 5 },
      { a: 3, b: 4, w: 6 },
      { a: 4, b: 5, w: 7 },
      { a: 1, b: 3, w: 8 },
    ];
    return { nodes, edges };
  }

  // ===================================================================
  // 3. KRUSKAL
  // ===================================================================
  register("kruskal", {
    title: "Kruskal MST — sorted edges + union-find",
    caption:
      "Sort all edges by weight. Walk the list; include an edge if its endpoints sit in different DSU components (else it would close a cycle).",
    code: [
      "edges.sort(by=weight)",
      "dsu = DSU(V); mst = []",
      "for (u, v, w) in edges:",
      "  if dsu.find(u) != dsu.find(v):",
      "    dsu.union(u, v)",
      "    mst.append((u, v, w))",
      "    if len(mst) == V-1: break",
    ],
    init() {
      const { nodes, edges } = mstGraph();
      // sort ascending by weight; tag each with original index for stable render
      const sorted = edges
        .map((e, i) => ({ ...e, idx: i }))
        .sort((a, b) => a.w - b.w);
      const V = nodes.length;
      return {
        nodes,
        edges,                    // original layout
        sortedEdges: sorted,      // walk order
        V,
        parent: nodes.map((_, i) => i),
        rank: nodes.map(() => 0),
        edgeIdx: 0,
        considered: false,        // phase: announce → decide
        mst: [],                  // list of accepted sorted-edge entries
        rejected: [],             // indices into sortedEdges
        totalWeight: 0,
        lastDecision: null,       // 'accept' | 'reject'
        line: 0,
        desc: `sort the ${edges.length} edges ascending by weight`,
      };
    },
    step(s) {
      if (s.done) return null;

      // finished MST early
      if (s.mst.length === s.V - 1) {
        return { ...s, line: 6, considered: false, desc: `MST complete with V-1 = ${s.V - 1} edges, total weight = ${s.totalWeight}`, done: true };
      }
      if (s.edgeIdx >= s.sortedEdges.length) {
        return { ...s, line: 6, considered: false, desc: `edges exhausted — MST weight = ${s.totalWeight}`, done: true };
      }

      const e = s.sortedEdges[s.edgeIdx];
      const find = (p, x) => p[x] === x ? x : find(p, p[x]);
      const ru = find(s.parent, e.a);
      const rv = find(s.parent, e.b);

      // phase 1: announce candidate
      if (!s.considered) {
        const sameComp = ru === rv;
        return {
          ...s,
          considered: true,
          line: 2,
          lastDecision: null,
          desc: `consider (${valOf(s.nodes, e.a)}-${valOf(s.nodes, e.b)}, w=${e.w}): root(${valOf(s.nodes, e.a)})=${ru}, root(${valOf(s.nodes, e.b)})=${rv} → ${sameComp ? "same component, REJECT (cycle)" : "different components, ACCEPT"}`,
        };
      }

      // phase 2: decide
      if (ru === rv) {
        return {
          ...s,
          edgeIdx: s.edgeIdx + 1,
          considered: false,
          rejected: [...s.rejected, e.idx],
          lastDecision: "reject",
          line: 3,
          desc: `reject (${valOf(s.nodes, e.a)}-${valOf(s.nodes, e.b)}, w=${e.w}) — would create a cycle`,
        };
      }
      // union by rank
      const parent = s.parent.slice();
      const rank = s.rank.slice();
      if (rank[ru] < rank[rv]) parent[ru] = rv;
      else if (rank[ru] > rank[rv]) parent[rv] = ru;
      else { parent[rv] = ru; rank[ru] += 1; }

      return {
        ...s,
        parent, rank,
        edgeIdx: s.edgeIdx + 1,
        considered: false,
        mst: [...s.mst, e.idx],
        totalWeight: s.totalWeight + e.w,
        lastDecision: "accept",
        line: 5,
        desc: `accept (${valOf(s.nodes, e.a)}-${valOf(s.nodes, e.b)}, w=${e.w}) → MST (running total ${s.totalWeight + e.w})`,
      };
    },
    render(s, stage) {
      const cur = s.edgeIdx < s.sortedEdges.length ? s.sortedEdges[s.edgeIdx] : null;
      const mstSet = new Set(s.mst);
      const rejSet = new Set(s.rejected);
      const find = (p, x) => p[x] === x ? x : find(p, p[x]);

      const es = s.edges.map((e, i) => {
        let highlight = null;
        if (mstSet.has(i)) highlight = "mst";
        else if (rejSet.has(i)) highlight = "reject";
        if (cur && cur.idx === i && s.considered) highlight = "active";
        return { ...e, highlight };
      });

      const ns = s.nodes.map(n => {
        let h = null;
        // colour by component if MST started forming
        if (s.mst.length > 0) h = "done";
        if (cur && s.considered && (cur.a === n.id || cur.b === n.id)) h = "visit";
        return { ...n, highlight: h, tag: `c${find(s.parent, n.id)}` };
      });

      P.graph(stage, { nodes: ns, edges: es });
    },
    readout: s => {
      const find = (p, x) => p[x] === x ? x : find(p, p[x]);
      const roots = new Set();
      s.parent.forEach((_, i) => roots.add(find(s.parent, i)));
      const cur = s.edgeIdx < s.sortedEdges.length ? s.sortedEdges[s.edgeIdx] : null;
      return [
        { label: "next edge", value: cur ? `${valOf(s.nodes, cur.a)}-${valOf(s.nodes, cur.b)} (${cur.w})` : "—" },
        { label: "mst edges", value: `${s.mst.length}/${s.V - 1}` },
        { label: "weight", value: s.totalWeight },
        { label: "components", value: roots.size },
      ];
    },
  });

  // ===================================================================
  // 4. PRIM
  // ===================================================================
  register("prim", {
    title: "Prim MST — grow tree by lightest crossing edge",
    caption:
      "Maintain a `visited` set starting at one vertex. Each step: pick the lightest edge with exactly one endpoint in `visited`; add it to the MST and absorb the new endpoint.",
    code: [
      "visited = {start}; cand = [edges from start]",
      "while len(visited) < V:",
      "  pop min-weight edge (u, v, w) from cand",
      "  if v in visited: discard (would cycle)",
      "  visited.add(v); mst.append((u,v,w))",
      "  add edges (v, x, w') with x not visited",
    ],
    init() {
      const { nodes, edges } = mstGraph();
      const start = 0;
      const visited = { [start]: true };
      // candidate list = edges incident to start
      const cand = [];
      edges.forEach((e, idx) => {
        if (e.a === start || e.b === start) {
          const other = e.a === start ? e.b : e.a;
          cand.push({ from: start, to: other, w: e.w, idx });
        }
      });
      cand.sort((x, y) => x.w - y.w);
      return {
        nodes, edges, V: nodes.length,
        visited,
        cand,                  // sorted ascending
        mst: [],               // edge indices accepted
        rejected: [],          // edge indices popped but already-visited
        totalWeight: 0,
        currentCand: null,     // popped edge under inspection
        currentAccepted: false,
        line: 0,
        desc: `start at ${valOf(nodes, start)}; seed candidates with its incident edges`,
      };
    },
    step(s) {
      if (s.done) return null;
      const visitedCount = Object.keys(s.visited).length;
      if (visitedCount === s.V) {
        return { ...s, line: 6, currentCand: null, desc: `MST spans all ${s.V} vertices — total weight ${s.totalWeight}`, done: true };
      }
      if (!s.cand.length) {
        return { ...s, line: 6, currentCand: null, desc: "no more candidate edges — graph disconnected or done", done: true };
      }

      // phase 1: pop & inspect
      if (!s.currentCand) {
        const cand = s.cand.slice();
        const e = cand.shift();
        return {
          ...s,
          cand,
          currentCand: e,
          currentAccepted: false,
          line: 2,
          desc: `pop lightest candidate (${valOf(s.nodes, e.from)}→${valOf(s.nodes, e.to)}, w=${e.w}) from frontier`,
        };
      }

      // phase 2: accept or reject
      const e = s.currentCand;
      if (s.visited[e.to]) {
        return {
          ...s,
          currentCand: null,
          rejected: [...s.rejected, e.idx],
          line: 3,
          desc: `${valOf(s.nodes, e.to)} already in tree → discard (would form cycle)`,
        };
      }

      const visited = { ...s.visited, [e.to]: true };
      const mst = [...s.mst, e.idx];
      const totalWeight = s.totalWeight + e.w;

      // add new crossing edges from e.to
      const newCand = s.cand.slice();
      s.edges.forEach((edge, idx) => {
        if (edge.a === e.to || edge.b === e.to) {
          const other = edge.a === e.to ? edge.b : edge.a;
          if (!visited[other]) {
            newCand.push({ from: e.to, to: other, w: edge.w, idx });
          }
        }
      });
      newCand.sort((x, y) => x.w - y.w);

      return {
        ...s,
        visited,
        mst,
        totalWeight,
        cand: newCand,
        currentCand: null,
        currentAccepted: true,
        line: 5,
        desc: `absorb ${valOf(s.nodes, e.to)} via edge (${valOf(s.nodes, e.from)}-${valOf(s.nodes, e.to)}, w=${e.w}); push its crossing edges`,
      };
    },
    render(s, stage) {
      const mstSet = new Set(s.mst);
      const rejSet = new Set(s.rejected);
      const frontierTo = new Set(s.cand.map(c => c.to));
      const curIdx = s.currentCand ? s.currentCand.idx : -1;

      const es = s.edges.map((e, i) => {
        let highlight = null;
        if (mstSet.has(i)) highlight = "mst";
        else if (rejSet.has(i)) highlight = "reject";
        if (i === curIdx) highlight = "active";
        return { ...e, highlight };
      });

      const ns = s.nodes.map(n => {
        let h = null;
        if (s.visited[n.id]) h = "done";
        else if (frontierTo.has(n.id)) h = "queue";
        if (s.currentCand && s.currentCand.to === n.id) h = "visit";
        return { ...n, highlight: h };
      });

      P.graph(stage, { nodes: ns, edges: es });
    },
    readout: s => {
      const next = s.cand[0];
      return [
        { label: "visited", value: `${Object.keys(s.visited).length}/${s.V}` },
        { label: "frontier", value: s.cand.length },
        { label: "next cand", value: next ? `${valOf(s.nodes, next.from)}-${valOf(s.nodes, next.to)} (${next.w})` : "—" },
        { label: "mst weight", value: s.totalWeight },
      ];
    },
  });

  // ===================================================================
  // 5. TARJAN SCC
  // ===================================================================
  // Graph: 6 nodes with two SCCs of size > 1 plus a singleton-ish structure.
  //   0 → 1 → 2 → 0     (SCC {0,1,2})
  //   1 → 3            (bridge into next region)
  //   3 → 4 → 3        (SCC {3,4})
  //   4 → 5            (bridge to singleton)
  //   5 → 5? no — keep 5 as a singleton SCC
  register("tarjan-scc", {
    title: "Tarjan SCC — DFS with index / lowlink",
    caption:
      "DFS each vertex; assign index = low = counter, push on stack. Update low from tree children and from any neighbour already on the stack. When low == index, pop the stack down to v — that block is one strongly-connected component.",
    code: [
      "def dfs(v):",
      "  v.index = v.low = counter; counter += 1",
      "  stack.append(v); on_stack.add(v)",
      "  for w in adj[v]:",
      "    if w.index is None: dfs(w); v.low = min(v.low, w.low)",
      "    elif w in on_stack: v.low = min(v.low, w.index)",
      "  if v.low == v.index:",
      "    pop stack down to v into a new SCC",
    ],
    init() {
      const nodes = [
        { id: 0, x: 60,  y: 50,  val: "A" },
        { id: 1, x: 160, y: 30,  val: "B" },
        { id: 2, x: 160, y: 100, val: "C" },
        { id: 3, x: 260, y: 30,  val: "D" },
        { id: 4, x: 260, y: 100, val: "E" },
        { id: 5, x: 370, y: 65,  val: "F" },
      ];
      const edges = [
        { a: 0, b: 1, directed: true },
        { a: 1, b: 2, directed: true },
        { a: 2, b: 0, directed: true },   // closes SCC {0,1,2}
        { a: 1, b: 3, directed: true },   // bridge
        { a: 3, b: 4, directed: true },
        { a: 4, b: 3, directed: true },   // closes SCC {3,4}
        { a: 4, b: 5, directed: true },   // bridge to F singleton
      ];
      // adjacency
      const adj = {};
      nodes.forEach(n => { adj[n.id] = []; });
      edges.forEach(e => { adj[e.a].push(e.b); });
      // Build a fully scripted action queue so each "step" is a single
      // meaningful transition. This lets us render every classic Tarjan
      // event (visit / explore / back-edge / return / pop-scc) on its own.
      const V = nodes.length;
      const index = {};
      const low = {};
      const onStack = {};
      const stack = [];
      const sccs = [];
      const actions = [];
      const visitedRoots = {};
      let counter = 0;

      function dfs(v) {
        index[v] = counter;
        low[v] = counter;
        counter += 1;
        stack.push(v);
        onStack[v] = true;
        actions.push({ type: "visit", v, index: index[v], low: low[v] });
        for (const w of adj[v]) {
          if (index[w] === undefined) {
            actions.push({ type: "explore-tree", v, w });
            dfs(w);
            const oldLow = low[v];
            low[v] = Math.min(low[v], low[w]);
            actions.push({ type: "return", v, w, oldLow, newLow: low[v], childLow: low[w] });
          } else if (onStack[w]) {
            const oldLow = low[v];
            low[v] = Math.min(low[v], index[w]);
            actions.push({ type: "back-edge", v, w, oldLow, newLow: low[v], wIndex: index[w] });
          } else {
            actions.push({ type: "cross-edge", v, w });
          }
        }
        if (low[v] === index[v]) {
          const scc = [];
          let popped;
          do {
            popped = stack.pop();
            onStack[popped] = false;
            scc.push(popped);
          } while (popped !== v);
          sccs.push(scc.slice());
          actions.push({ type: "pop-scc", v, members: scc.slice(), sccIdx: sccs.length - 1 });
        }
      }

      // run DFS from each unvisited root in id order
      for (const n of nodes) {
        if (index[n.id] === undefined) {
          actions.push({ type: "new-root", v: n.id });
          visitedRoots[n.id] = true;
          dfs(n.id);
        }
      }

      return {
        nodes, edges, adj, V,
        actions,
        step_i: 0,
        // live state, evolves as we replay actions
        index: {},
        low: {},
        onStack: {},
        stack: [],
        sccs: [],            // list of arrays of node ids (completed SCCs)
        sccOfNode: {},       // id → sccIdx
        currentNode: null,
        exploring: null,     // {v, w, kind} for highlighted edge
        line: 0,
        desc: "ready: DFS from each unvisited node in id order",
      };
    },
    step(s) {
      if (s.done) return null;
      if (s.step_i >= s.actions.length) {
        return { ...s, line: 7, currentNode: null, exploring: null, desc: `done — ${s.sccs.length} strongly-connected component${s.sccs.length === 1 ? "" : "s"} found`, done: true };
      }
      const a = s.actions[s.step_i];
      const i = s.step_i + 1;
      switch (a.type) {
        case "new-root":
          return {
            ...s, step_i: i, currentNode: a.v, exploring: null, line: 0,
            desc: `outer loop: start fresh DFS at ${valOf(s.nodes, a.v)} (unvisited)`,
          };
        case "visit": {
          const index = { ...s.index, [a.v]: a.index };
          const low = { ...s.low, [a.v]: a.low };
          const onStack = { ...s.onStack, [a.v]: true };
          const stack = [...s.stack, a.v];
          return {
            ...s, step_i: i,
            index, low, onStack, stack,
            currentNode: a.v, exploring: null, line: 1,
            desc: `visit ${valOf(s.nodes, a.v)}: assign index=low=${a.index}; push on stack`,
          };
        }
        case "explore-tree":
          return {
            ...s, step_i: i, currentNode: a.v,
            exploring: { v: a.v, w: a.w, kind: "tree" },
            line: 4,
            desc: `from ${valOf(s.nodes, a.v)}: ${valOf(s.nodes, a.w)} is unvisited → recurse (tree edge)`,
          };
        case "back-edge": {
          const low = { ...s.low, [a.v]: a.newLow };
          return {
            ...s, step_i: i, low, currentNode: a.v,
            exploring: { v: a.v, w: a.w, kind: "back" }, line: 5,
            desc: `back-edge ${valOf(s.nodes, a.v)} → ${valOf(s.nodes, a.w)} (on stack); low[${valOf(s.nodes, a.v)}] = min(${a.oldLow}, index[${valOf(s.nodes, a.w)}]=${a.wIndex}) = ${a.newLow}`,
          };
        }
        case "cross-edge":
          return {
            ...s, step_i: i, currentNode: a.v,
            exploring: { v: a.v, w: a.w, kind: "cross" }, line: 5,
            desc: `cross-edge ${valOf(s.nodes, a.v)} → ${valOf(s.nodes, a.w)} (already popped into another SCC) — ignore`,
          };
        case "return": {
          const low = { ...s.low, [a.v]: a.newLow };
          return {
            ...s, step_i: i, low, currentNode: a.v,
            exploring: { v: a.v, w: a.w, kind: "tree" }, line: 4,
            desc: `return from ${valOf(s.nodes, a.w)}: low[${valOf(s.nodes, a.v)}] = min(${a.oldLow}, low[${valOf(s.nodes, a.w)}]=${a.childLow}) = ${a.newLow}`,
          };
        }
        case "pop-scc": {
          const onStack = { ...s.onStack };
          const stack = s.stack.slice();
          a.members.forEach(m => { onStack[m] = false; });
          // remove from stack tail until v
          while (stack.length && a.members.includes(stack[stack.length - 1])) stack.pop();
          const sccs = [...s.sccs, a.members];
          const sccOfNode = { ...s.sccOfNode };
          a.members.forEach(m => { sccOfNode[m] = a.sccIdx; });
          return {
            ...s, step_i: i, onStack, stack, sccs, sccOfNode,
            currentNode: a.v, exploring: null, line: 7,
            desc: `low[${valOf(s.nodes, a.v)}] == index[${valOf(s.nodes, a.v)}] — pop SCC #${a.sccIdx + 1}: {${a.members.map(m => valOf(s.nodes, m)).join(", ")}}`,
          };
        }
        default:
          return { ...s, step_i: i };
      }
    },
    render(s, stage) {
      // 6 distinct accent classes available: visit, queue, done, start, target, stack
      // We map: currently-processing → visit; on-stack but not current → stack;
      // already-popped (in some SCC) → done; for multiple SCCs we alternate
      // visit / queue / target / done by SCC index so the eye can see groups.
      // But since they're all done, "done" is the meaning. We use `start` and `target`
      // for the most recent two completed SCCs to differentiate.
      const sccAccent = (idx) => {
        // round-robin among visually distinct done-ish accents:
        const palette = ["done", "queue", "target", "start"];
        return palette[idx % palette.length];
      };

      const ns = s.nodes.map(n => {
        let h = null;
        if (s.sccOfNode[n.id] !== undefined) {
          h = sccAccent(s.sccOfNode[n.id]);
        } else if (s.onStack[n.id]) {
          h = "stack";
        }
        if (s.currentNode === n.id && !s.done) h = "visit";
        const idx = s.index[n.id];
        const low = s.low[n.id];
        const tag = idx !== undefined ? `${idx}/${low}` : "·/·";
        return { ...n, highlight: h, tag };
      });

      const es = s.edges.map(e => {
        let highlight = null;
        // explored edge
        if (s.exploring && s.exploring.v === e.a && s.exploring.w === e.b) {
          if (s.exploring.kind === "tree") highlight = "tree";
          else if (s.exploring.kind === "back") highlight = "back";
          else if (s.exploring.kind === "cross") highlight = "cross";
        } else {
          // already inside a completed SCC?
          const sa = s.sccOfNode[e.a], sb = s.sccOfNode[e.b];
          if (sa !== undefined && sa === sb) highlight = "done";
          // or already traversed as a tree edge (target visited, both have index)
          else if (s.index[e.a] !== undefined && s.index[e.b] !== undefined && highlight == null) {
            highlight = null; // leave default
          }
        }
        return { ...e, highlight };
      });

      P.graph(stage, { nodes: ns, edges: es });
    },
    readout: s => [
      { label: "current", value: s.currentNode != null ? valOf(s.nodes, s.currentNode) : "—" },
      { label: "stack", value: s.stack.length ? s.stack.map(i => valOf(s.nodes, i)).join(",") : "∅" },
      { label: "SCCs found", value: s.sccs.length },
      { label: "step", value: `${s.step_i}/${s.actions.length}` },
    ],
  });

})();
