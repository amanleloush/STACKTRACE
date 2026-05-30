/* ===========================================================
   Brain Detox Arc — DSA visualizations: Tries, Bit, Greedy
   ----------------------------------------------------------
   Registers 11 algorithms via window.DSA.register. The engine
   handles play/pause/step controls; each cfg below owns its
   own state machine and renders into the stage.
   =========================================================== */
(function () {
  "use strict";
  if (!window.DSA) return;
  const { primitives: P, register } = window.DSA;
  const SVGNS = "http://www.w3.org/2000/svg";

  // ---------- shared helpers ------------------------------------------
  function svgEl(tag, attrs) {
    const el = document.createElementNS(SVGNS, tag);
    for (const k in attrs) el.setAttribute(k, attrs[k]);
    return el;
  }
  function htmlEl(tag, style, html) {
    const el = document.createElement(tag);
    if (style) el.setAttribute("style", style);
    if (html !== undefined) el.innerHTML = html;
    return el;
  }
  function escapeHtml(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function bin(n, w) {
    return (n >>> 0).toString(2).padStart(w, "0");
  }

  // Build a prebuilt trie from a list of words. Returns nodes with
  // {id, ch, parent, x, y, end} placed via a simple subtree-width layout.
  function buildTrie(words) {
    // node: {id, ch, parent, end, children: {ch -> id}}
    const nodes = [{ id: 0, ch: null, parent: null, end: false, children: {} }];
    function insert(word) {
      let cur = 0;
      for (const c of word) {
        if (!(c in nodes[cur].children)) {
          const id = nodes.length;
          nodes.push({ id, ch: c, parent: cur, end: false, children: {} });
          nodes[cur].children[c] = id;
        }
        cur = nodes[cur].children[c];
      }
      nodes[cur].end = true;
    }
    words.forEach(insert);
    // layout: leaf-count subtree width
    const width = new Array(nodes.length).fill(0);
    function leafW(id) {
      const ch = Object.values(nodes[id].children);
      if (!ch.length) { width[id] = 1; return 1; }
      let s = 0; ch.forEach(c => s += leafW(c));
      width[id] = s;
      return s;
    }
    leafW(0);
    const colPx = 60, rowPx = 70, originX = 240, originY = 30;
    function layout(id, leftPx, depth) {
      const ch = Object.values(nodes[id].children).sort((a, b) => nodes[a].ch.localeCompare(nodes[b].ch));
      const mySpan = width[id] * colPx;
      nodes[id].x = leftPx + mySpan / 2;
      nodes[id].y = originY + depth * rowPx;
      let off = 0;
      ch.forEach(c => {
        layout(c, leftPx + off, depth + 1);
        off += width[c] * colPx;
      });
    }
    layout(0, originX - width[0] * colPx / 2, 0);
    return nodes.map(n => ({
      id: n.id, ch: n.ch, parent: n.parent, end: n.end,
      x: n.x, y: n.y,
      children: n.children,
    }));
  }
  function findChildId(nodes, parentId, ch) {
    const p = nodes.find(n => n.id === parentId);
    if (!p || !p.children) return -1;
    return (ch in p.children) ? p.children[ch] : -1;
  }
  function ancestorChain(nodes, id) {
    const out = [];
    let cur = id;
    while (cur != null) {
      out.push(cur);
      const n = nodes.find(x => x.id === cur);
      cur = n ? n.parent : null;
    }
    return out;
  }

  // ===================================================================
  // 1) TRIE SEARCH
  // ===================================================================
  let TRIE_SEARCH_WORD = "cat";
  register("trie-search", {
    title: "Trie — search word",
    caption: "Pre-built trie of {car, cat, cab, dog, do}. Walk down matching each char; success only if the final node has end flag.",
    code: [
      "def search(word):",
      "  node = root",
      "  for ch in word:",
      "    if ch not in node.children:",
      "      return False",
      "    node = node.children[ch]",
      "  return node.end",
    ],
    inputs: [
      { label: "word", type: "text", default: TRIE_SEARCH_WORD, onChange: v => { TRIE_SEARCH_WORD = (v || "").toLowerCase(); } },
    ],
    init() {
      const trieNodes = buildTrie(["car", "cat", "cab", "dog", "do"]);
      return {
        trieNodes,
        word: TRIE_SEARCH_WORD,
        ci: 0,
        cursor: 0,
        path: [0],
        found: null,
        missing: null,
        line: 0,
        desc: `search "${TRIE_SEARCH_WORD}" — start at root`,
      };
    },
    step(s) {
      if (s.found != null || s.missing != null) return null;
      if (s.ci >= s.word.length) {
        const cur = s.trieNodes.find(n => n.id === s.cursor);
        const ok = !!(cur && cur.end);
        return { ...s, line: 6, found: ok, desc: ok ? `node.end = true → "${s.word}" FOUND` : `final node not marked end → "${s.word}" NOT found`, done: true };
      }
      const ch = s.word[s.ci];
      const childId = findChildId(s.trieNodes, s.cursor, ch);
      if (childId < 0) {
        return { ...s, line: 4, missing: ch, desc: `'${ch}' not in node.children → "${s.word}" NOT found`, done: true };
      }
      return {
        ...s, cursor: childId, ci: s.ci + 1, path: [...s.path, childId],
        line: 5, desc: `match '${ch}' → descend to child node #${childId}`,
      };
    },
    render(s, stage) {
      const onPath = new Set(s.path);
      const ns = s.trieNodes.map(n => {
        let hl = null;
        if (n.id === s.cursor) hl = s.found === true ? "done" : (s.missing ? "target" : "visit");
        else if (onPath.has(n.id)) hl = "path";
        return {
          id: n.id, ch: n.ch, x: n.x, y: n.y, parent: n.parent,
          end: n.end, highlight: hl,
        };
      });
      P.trie(stage, { nodes: ns });
    },
    readout: s => [
      { label: "word", value: `"${s.word}"` },
      { label: "ci", value: s.ci },
      { label: "ch", value: s.ci < s.word.length ? `'${s.word[s.ci]}'` : "—" },
      { label: "result", value: s.found === true ? "FOUND" : s.found === false ? "no end-flag" : s.missing ? `no '${s.missing}'` : "…" },
    ],
  });

  // ===================================================================
  // 2) WORD DICTIONARY (search with '.')
  // ===================================================================
  register("word-dictionary", {
    title: "Word Dictionary — wildcard search",
    caption: "Search 'c.t' over the trie. On '.', fan out into every child; otherwise descend the matching child. DFS via an explicit frame stack.",
    code: [
      "def search(word):",
      "  stack = [(root, 0)]",
      "  while stack:",
      "    node, i = stack.pop()",
      "    if i == len(word): return node.end",
      "    ch = word[i]",
      "    if ch == '.':",
      "      for c in node.children: stack.append((c, i+1))",
      "    elif ch in node.children:",
      "      stack.append((node.children[ch], i+1))",
      "  return False",
    ],
    init() {
      const trieNodes = buildTrie(["car", "cat", "cab", "dog", "do"]);
      const word = "c.t";
      return {
        trieNodes,
        word,
        frames: [{ cursor: 0, ci: 0 }],
        visited: [0],
        cursor: 0,
        result: null,
        line: 0,
        desc: `search "${word}" — push (root, 0)`,
      };
    },
    step(s) {
      if (s.result != null) return null;
      if (!s.frames.length) {
        return { ...s, line: 10, result: false, desc: "stack drained — NOT found", done: true };
      }
      const frames = s.frames.slice();
      const frame = frames.pop();
      const cursor = frame.cursor;
      const ci = frame.ci;
      const node = s.trieNodes.find(n => n.id === cursor);
      const visited = s.visited.includes(cursor) ? s.visited : [...s.visited, cursor];

      if (ci === s.word.length) {
        if (node.end) {
          return { ...s, frames, cursor, visited, line: 4, result: true, desc: `at node #${cursor}, end=true → FOUND`, done: true };
        }
        return { ...s, frames, cursor, visited, line: 4, desc: `at node #${cursor}, end=false → backtrack` };
      }
      const ch = s.word[ci];
      if (ch === ".") {
        const kids = Object.values(node.children);
        if (!kids.length) {
          return { ...s, frames, cursor, visited, line: 7, desc: `at #${cursor}, '.' has no children — dead end` };
        }
        const pushed = kids.map(k => ({ cursor: k, ci: ci + 1 }));
        return {
          ...s, frames: [...frames, ...pushed], cursor, visited,
          line: 7, desc: `'.' at i=${ci} → fan out to {${kids.map(k => "'" + s.trieNodes.find(n => n.id === k).ch + "'").join(",")}}`,
        };
      }
      const childId = findChildId(s.trieNodes, cursor, ch);
      if (childId < 0) {
        return { ...s, frames, cursor, visited, line: 9, desc: `'${ch}' not present at #${cursor} — backtrack` };
      }
      return {
        ...s, frames: [...frames, { cursor: childId, ci: ci + 1 }], cursor, visited,
        line: 9, desc: `descend '${ch}' → push (#${childId}, ${ci + 1})`,
      };
    },
    render(s, stage) {
      const visited = new Set(s.visited);
      const frameCursors = new Set(s.frames.map(f => f.cursor));
      const ns = s.trieNodes.map(n => {
        let hl = null;
        if (n.id === s.cursor) hl = s.result === true ? "done" : "visit";
        else if (frameCursors.has(n.id)) hl = "queue";
        else if (visited.has(n.id)) hl = "path";
        return { id: n.id, ch: n.ch, x: n.x, y: n.y, parent: n.parent, end: n.end, highlight: hl };
      });
      P.trie(stage, { nodes: ns });
    },
    readout: s => [
      { label: "word", value: `"${s.word}"` },
      { label: "cursor", value: `#${s.cursor}` },
      { label: "stack", value: s.frames.length },
      { label: "result", value: s.result === true ? "FOUND" : s.result === false ? "no match" : "…" },
    ],
  });

  // ===================================================================
  // 3) WORD SEARCH II (grid DFS + trie)
  // ===================================================================
  register("word-search-ii", {
    title: "Word Search II — grid DFS pruned by trie",
    caption: "Trie of {oath, oat, eat}. DFS the grid; each step requires the cell's char to be a trie child. Collect end-flag nodes as found words.",
    code: [
      "for each (r,c) start cell:",
      "  dfs(r, c, root)",
      "def dfs(r, c, node):",
      "  ch = grid[r][c]",
      "  if ch not in node.children: return",
      "  nxt = node.children[ch]",
      "  if nxt.end: found.add(word(nxt))",
      "  mark (r,c) visited",
      "  for (dr,dc) in 4-dirs: dfs(r+dr, c+dc, nxt)",
      "  unmark (r,c)",
    ],
    init() {
      const grid = [["o", "a", "t"], ["e", "a", "h"]];
      const trieNodes = buildTrie(["oath", "oat", "eat"]);
      // pre-compute the word from root to a given node id (for found words)
      function wordOf(id) {
        const chain = ancestorChain(trieNodes, id).reverse();
        return chain.map(c => trieNodes.find(n => n.id === c).ch).filter(Boolean).join("");
      }
      // seed frames for every start cell
      const frames = [];
      for (let r = 0; r < grid.length; r++) {
        for (let c = 0; c < grid[0].length; c++) {
          frames.push({ r, c, cursor: 0, dir: 0, visitedKey: "" });
        }
      }
      return {
        grid, trieNodes,
        frames,
        visited: {}, // "r,c" -> true while on the current dfs path
        cursor: 0,
        cur: null,
        foundWords: [],
        line: 0,
        desc: `seed ${frames.length} start cells`,
        _wordOf: wordOf,
      };
    },
    step(s) {
      if (!s.frames.length) {
        return { ...s, line: 9, desc: `done — found {${s.foundWords.join(", ") || "—"}}`, done: true };
      }
      const frames = s.frames.slice();
      const top = { ...frames[frames.length - 1] };
      const key = `${top.r},${top.c}`;

      // dir == 0 → first visit: check trie + record end
      if (top.dir === 0) {
        const ch = s.grid[top.r][top.c];
        const childId = findChildId(s.trieNodes, top.cursor, ch);
        if (childId < 0) {
          frames.pop();
          return {
            ...s, frames, cursor: top.cursor, cur: { r: top.r, c: top.c },
            line: 5, desc: `(${top.r},${top.c})='${ch}' not under #${top.cursor} — prune`,
          };
        }
        if (s.visited[key]) {
          frames.pop();
          return { ...s, frames, cursor: top.cursor, cur: { r: top.r, c: top.c }, line: 5, desc: `(${top.r},${top.c}) already on path — skip` };
        }
        const visited = { ...s.visited, [key]: true };
        top.cursor = childId;
        top.dir = 1;
        frames[frames.length - 1] = top;
        const child = s.trieNodes.find(n => n.id === childId);
        let foundWords = s.foundWords;
        let extra = "";
        if (child.end && !foundWords.includes(s._wordOf(childId))) {
          foundWords = [...foundWords, s._wordOf(childId)];
          extra = ` → WORD "${s._wordOf(childId)}"`;
        }
        return {
          ...s, frames, visited, cursor: childId, cur: { r: top.r, c: top.c }, foundWords,
          line: 7, desc: `enter (${top.r},${top.c})='${ch}' → trie #${childId}${extra}`,
        };
      }
      // dir 1..4 → spawn neighbours one by one
      if (top.dir >= 1 && top.dir <= 4) {
        const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        const [dr, dc] = dirs[top.dir - 1];
        const nr = top.r + dr, nc = top.c + dc;
        top.dir += 1;
        frames[frames.length - 1] = top;
        const R = s.grid.length, C = s.grid[0].length;
        if (nr < 0 || nc < 0 || nr >= R || nc >= C) {
          return { ...s, frames, cursor: top.cursor, cur: { r: top.r, c: top.c }, line: 9, desc: `neighbour (${nr},${nc}) out of bounds` };
        }
        if (s.visited[`${nr},${nc}`]) {
          return { ...s, frames, cursor: top.cursor, cur: { r: top.r, c: top.c }, line: 9, desc: `neighbour (${nr},${nc}) already visited` };
        }
        frames.push({ r: nr, c: nc, cursor: top.cursor, dir: 0 });
        return {
          ...s, frames, cursor: top.cursor, cur: { r: top.r, c: top.c },
          line: 9, desc: `spawn DFS into (${nr},${nc}) from trie #${top.cursor}`,
        };
      }
      // dir 5 → backtrack: unmark + pop
      const visited = { ...s.visited };
      delete visited[key];
      frames.pop();
      const parent = frames.length ? frames[frames.length - 1] : null;
      return {
        ...s, frames, visited,
        cursor: parent ? parent.cursor : 0, cur: { r: top.r, c: top.c },
        line: 10, desc: `unmark (${top.r},${top.c}) and pop`,
      };
    },
    render(s, stage) {
      stage.innerHTML = "";
      const wrap = htmlEl("div", "display:flex;flex-direction:column;gap:0.6rem;width:100%;align-items:center;");

      // ----- grid -----
      const gridHost = htmlEl("div", null);
      gridHost.innerHTML = `<div style="font-size:0.65rem;color:var(--md-default-fg-color--light);text-align:center;margin-bottom:0.25rem;">grid · DFS path</div>`;
      const gWrap = document.createElement("div");
      const R = s.grid.length, C = s.grid[0].length;
      const cs = 50, pad = 20;
      const W = pad * 2 + C * cs, H = pad * 2 + R * cs;
      const svg = svgEl("svg", { viewBox: `0 0 ${W} ${H}`, width: W, style: "max-width:100%;height:auto;" });
      for (let r = 0; r < R; r++) {
        for (let c = 0; c < C; c++) {
          const x = pad + c * cs, y = pad + r * cs;
          let cls = "dsa-gridcell";
          const isCur = s.cur && s.cur.r === r && s.cur.c === c;
          if (s.visited[`${r},${c}`]) cls += " dsa-gridcell--path";
          if (isCur) cls += " dsa-gridcell--visit";
          svg.appendChild(svgEl("rect", { x, y, width: cs - 2, height: cs - 2, rx: 4, class: cls }));
          const t = svgEl("text", { x: x + (cs - 2) / 2, y: y + (cs - 2) / 2 + 4, "text-anchor": "middle", class: "dsa-gridcell-text" });
          t.textContent = s.grid[r][c];
          svg.appendChild(t);
        }
      }
      gWrap.appendChild(svg);
      gridHost.appendChild(gWrap);
      wrap.appendChild(gridHost);

      // ----- trie -----
      const trieHost = htmlEl("div", null);
      trieHost.innerHTML = `<div style="font-size:0.65rem;color:var(--md-default-fg-color--light);text-align:center;margin-bottom:0.25rem;">trie · cursor</div>`;
      const trieWrap = document.createElement("div");
      const ns = s.trieNodes.map(n => ({
        id: n.id, ch: n.ch, x: n.x, y: n.y, parent: n.parent, end: n.end,
        highlight: n.id === s.cursor ? "visit" : null,
      }));
      P.trie(trieWrap, { nodes: ns });
      trieHost.appendChild(trieWrap);
      wrap.appendChild(trieHost);

      // ----- found list -----
      const found = htmlEl("div", "font-family:var(--md-code-font);font-size:0.72rem;",
        `<strong>found (${s.foundWords.length}):</strong> ${s.foundWords.map(w => `"${escapeHtml(w)}"`).join(" · ") || "—"}`);
      wrap.appendChild(found);

      stage.appendChild(wrap);
    },
    readout: s => [
      { label: "frames", value: s.frames.length },
      { label: "cursor", value: `#${s.cursor}` },
      { label: "cell", value: s.cur ? `(${s.cur.r},${s.cur.c})` : "—" },
      { label: "found", value: s.foundWords.length },
    ],
  });

  // ===================================================================
  // 4) AUTOCOMPLETE (top-k per prefix)
  // ===================================================================
  register("autocomplete", {
    title: "Autocomplete — trie + top-K cache",
    caption: "Insert words with frequencies; each node caches the top-K best descendants. Query walks the prefix and reads the cache.",
    code: [
      "K = 2",
      "def insert(word, freq):",
      "  node = root",
      "  for ch in word:",
      "    node = node.children[ch] or new()",
      "    node.topK.add((freq, word))",
      "    node.topK = sorted(...)[:K]",
      "def query(prefix):",
      "  node = root",
      "  for ch in prefix: node = node.children[ch]",
      "  return node.topK",
    ],
    init() {
      const words = [["car", 5], ["cat", 3], ["cab", 2]];
      const trieNodes = [{ id: 0, ch: null, parent: null, end: false, children: {}, topK: [] }];
      return {
        words,
        K: 2,
        trieNodes,
        phase: "insert",
        wordIdx: 0,
        ci: 0,
        cursor: 0,
        path: [0],
        queryPrefix: "ca",
        queryCi: 0,
        result: null,
        line: 0,
        desc: `insert "${words[0][0]}" (freq ${words[0][1]})`,
      };
    },
    step(s) {
      // ------------- insert phase -----------------
      if (s.phase === "insert") {
        if (s.wordIdx >= s.words.length) {
          return { ...s, phase: "query", cursor: 0, path: [0], queryCi: 0, line: 7, desc: `inserts done — query prefix "${s.queryPrefix}"` };
        }
        const [word, freq] = s.words[s.wordIdx];
        if (s.ci >= word.length) {
          // mark end
          const tn = s.trieNodes.map(n => n.id === s.cursor ? { ...n, end: true } : n);
          return {
            ...s, trieNodes: tn,
            wordIdx: s.wordIdx + 1, ci: 0, cursor: 0, path: [0],
            line: 5,
            desc: s.wordIdx + 1 < s.words.length
              ? `mark end for "${word}" — next: "${s.words[s.wordIdx + 1][0]}"`
              : `mark end for "${word}" — inserts complete`,
          };
        }
        const ch = word[s.ci];
        let trieNodes = s.trieNodes.slice();
        let cursor = s.cursor;
        const parent = trieNodes[cursor];
        let childId = (ch in parent.children) ? parent.children[ch] : -1;
        if (childId < 0) {
          childId = trieNodes.length;
          // layout: spread children below parent
          const siblings = trieNodes.filter(n => n.parent === cursor);
          const k = siblings.length;
          const dx = (k === 0 ? 0 : (k % 2 ? 1 : -1) * 70 * Math.ceil(k / 2));
          const px = parent.x != null ? parent.x : 220;
          const py = parent.y != null ? parent.y : 30;
          trieNodes.push({
            id: childId, ch, parent: cursor, end: false, children: {}, topK: [],
            x: px + dx, y: py + 70,
          });
          trieNodes[cursor] = { ...parent, children: { ...parent.children, [ch]: childId } };
        }
        // update topK on the *child* and on every ancestor along the path
        const newPath = [...s.path, childId];
        trieNodes = trieNodes.map(n => {
          if (newPath.includes(n.id)) {
            const merged = [...(n.topK || []), [freq, word]];
            // dedupe by word
            const seen = {};
            const dedup = merged.filter(([f, w]) => seen[w] ? false : (seen[w] = true));
            dedup.sort((a, b) => b[0] - a[0]);
            return { ...n, topK: dedup.slice(0, s.K) };
          }
          return n;
        });
        return {
          ...s, trieNodes, cursor: childId, ci: s.ci + 1, path: newPath,
          line: 4, desc: `'${ch}' → node #${childId}; update topK along the path with ("${word}", ${freq})`,
        };
      }

      // ------------- query phase -----------------
      if (s.phase === "query") {
        if (s.queryCi >= s.queryPrefix.length) {
          const cur = s.trieNodes.find(n => n.id === s.cursor);
          const result = (cur && cur.topK ? cur.topK : []).slice();
          return { ...s, phase: "done", result, line: 11, desc: `prefix walked → topK = [${result.map(([f, w]) => `"${w}":${f}`).join(", ")}]`, done: true };
        }
        const ch = s.queryPrefix[s.queryCi];
        const childId = findChildId(s.trieNodes, s.cursor, ch);
        if (childId < 0) {
          return { ...s, phase: "done", result: [], line: 9, desc: `'${ch}' missing — empty suggestions`, done: true };
        }
        return {
          ...s, cursor: childId, queryCi: s.queryCi + 1, path: [...s.path, childId],
          line: 10, desc: `walk '${ch}' → #${childId}`,
        };
      }
      return null;
    },
    render(s, stage) {
      stage.innerHTML = "";
      const wrap = htmlEl("div", "display:flex;flex-direction:column;gap:0.5rem;width:100%;align-items:center;");
      const onPath = new Set(s.path);

      const ns = s.trieNodes.map(n => {
        let hl = null;
        if (n.id === s.cursor) hl = s.phase === "done" ? "done" : "visit";
        else if (onPath.has(n.id)) hl = "path";
        const tag = (n.topK && n.topK.length)
          ? n.topK.map(([f, w]) => `${w}:${f}`).join(",")
          : (n.end ? "$" : undefined);
        return {
          id: n.id, ch: n.ch, x: n.x, y: n.y, parent: n.parent, end: n.end,
          highlight: hl, tag,
        };
      });
      const trieHost = htmlEl("div");
      P.trie(trieHost, { nodes: ns });
      wrap.appendChild(trieHost);

      // suggestions panel
      const sug = htmlEl("div", "font-family:var(--md-code-font);font-size:0.74rem;text-align:center;");
      if (s.phase === "done") {
        sug.innerHTML = `<strong>suggestions for "${escapeHtml(s.queryPrefix)}"</strong>: ${s.result.length ? s.result.map(([f, w]) => `"${escapeHtml(w)}" (${f})`).join(" · ") : "—"}`;
      } else {
        sug.innerHTML = `<strong>phase:</strong> ${s.phase}${s.phase === "insert" && s.wordIdx < s.words.length ? ` "${escapeHtml(s.words[s.wordIdx][0])}"` : ""}`;
      }
      wrap.appendChild(sug);
      stage.appendChild(wrap);
    },
    readout: s => [
      { label: "phase", value: s.phase },
      { label: "word", value: s.phase === "insert" && s.wordIdx < s.words.length ? `"${s.words[s.wordIdx][0]}"` : "—" },
      { label: "cursor", value: `#${s.cursor}` },
      { label: "K", value: s.K },
    ],
  });

  // ===================================================================
  // 5) COUNTING BITS
  // ===================================================================
  register("counting-bits", {
    title: "Counting Bits — dp[i] = dp[i>>1] + (i&1)",
    caption: "Number of set bits via DP: drop the low bit (i>>1, already computed) and add 1 if i was odd.",
    code: [
      "dp = [0] * (n+1)",
      "for i in 1..n:",
      "  dp[i] = dp[i >> 1] + (i & 1)",
      "return dp",
    ],
    init() {
      const n = 10;
      const dp = new Array(n + 1).fill(null);
      dp[0] = 0;
      return { n, dp, i: 1, line: 0, desc: "dp[0] = 0" };
    },
    step(s) {
      if (s.i > s.n) return { ...s, line: 3, desc: `done — dp[0..${s.n}] computed`, done: true };
      const dp = s.dp.slice();
      const half = s.i >> 1;
      const lo = s.i & 1;
      dp[s.i] = dp[half] + lo;
      return {
        ...s, dp, i: s.i + 1, line: 2,
        desc: `dp[${s.i}] = dp[${s.i}>>1] + (${s.i}&1) = dp[${half}] + ${lo} = ${dp[half]} + ${lo} = ${dp[s.i]}`,
      };
    },
    render(s, stage) {
      stage.innerHTML = "";
      const wrap = htmlEl("div", "display:flex;flex-direction:column;gap:0.55rem;width:100%;");
      // dp table
      const cur = s.i;
      const half = cur >> 1;
      const dpHost = htmlEl("div");
      P.dpTable(dpHost, {
        rows: 1, cols: s.n + 1,
        colLabels: Array.from({ length: s.n + 1 }, (_, k) => `i=${k}`),
        cellOf: (r, c) => {
          let cls = s.dp[c] == null ? "" : "filled";
          if (!s.done) {
            if (c === cur && cur <= s.n) cls = "current";
            else if (c === half && cur <= s.n) cls = "read";
          }
          return { val: s.dp[c] == null ? "" : s.dp[c], cls };
        },
      });
      wrap.appendChild(dpHost);
      // binary rows
      const binWrap = htmlEl("div", "font-family:var(--md-code-font);font-size:0.66rem;line-height:1.5;text-align:center;color:var(--md-default-fg-color--light);");
      const w = (s.n).toString(2).length;
      const rows = [];
      for (let i = 0; i <= s.n; i++) {
        const isCur = !s.done && i === cur && cur <= s.n;
        const isHalf = !s.done && i === half && cur <= s.n;
        const bg = isCur ? "background:rgba(251,191,36,0.25);color:#fbbf24;" : isHalf ? "background:rgba(34,211,238,0.18);color:#22d3ee;" : "";
        const v = s.dp[i] == null ? "·" : s.dp[i];
        rows.push(`<span style="display:inline-block;padding:.1rem .35rem;margin:.1rem;border-radius:4px;${bg}">i=${String(i).padStart(2)} ${bin(i, w)} → ${v}</span>`);
      }
      binWrap.innerHTML = rows.join("");
      wrap.appendChild(binWrap);
      stage.appendChild(wrap);
    },
    readout: s => [
      { label: "i", value: s.i <= s.n ? s.i : "—" },
      { label: "i>>1", value: s.i <= s.n ? (s.i >> 1) : "—" },
      { label: "i&1", value: s.i <= s.n ? (s.i & 1) : "—" },
      { label: "dp[i]", value: s.i <= s.n && s.dp[s.i] != null ? s.dp[s.i] : "—" },
    ],
  });

  // ===================================================================
  // 6) POWER OF TWO  (n & (n-1) == 0 trick)
  // ===================================================================
  register("power-of-two", {
    title: "Power of Two — n & (n-1) trick",
    caption: "A power of two has exactly one set bit. Subtracting 1 flips that bit and sets every lower bit → the AND must be zero.",
    code: [
      "def isPow2(n):",
      "  if n <= 0: return False",
      "  return (n & (n - 1)) == 0",
    ],
    init() {
      const n = 16, bits = 8;
      return {
        n, bits,
        phase: "input",
        result: null,
        isPow: null,
        line: 0,
        desc: `input n = ${n}`,
      };
    },
    step(s) {
      if (s.phase === "input") {
        return { ...s, phase: "compute-minus", line: 2, desc: `compute n - 1 = ${s.n - 1}` };
      }
      if (s.phase === "compute-minus") {
        return { ...s, phase: "and", line: 2, desc: `AND bit-by-bit: ${bin(s.n, s.bits)} & ${bin(s.n - 1, s.bits)}` };
      }
      if (s.phase === "and") {
        const result = s.n & (s.n - 1);
        return { ...s, phase: "check", result, line: 2, desc: `result = ${bin(result, s.bits)} (decimal ${result})` };
      }
      if (s.phase === "check") {
        const isPow = s.result === 0 && s.n > 0;
        return { ...s, phase: "done", isPow, line: 2, desc: isPow ? `result == 0 → ${s.n} IS a power of two` : `result != 0 → ${s.n} is NOT a power of two`, done: true };
      }
      return null;
    },
    render(s, stage) {
      stage.innerHTML = "";
      const W = s.bits;
      const nBits = bin(s.n, W).split("").map(Number);
      const mBits = bin(s.n - 1, W).split("").map(Number);
      const andBits = nBits.map((b, i) => (s.phase === "and" || s.phase === "check" || s.phase === "done") ? (b & mBits[i]) : null);
      const showM = s.phase !== "input";
      const showAnd = s.phase === "and" || s.phase === "check" || s.phase === "done";

      const cellW = 38, cellH = 38, gap = 4, pad = 60, labelW = 110;
      const rows = 3;
      const Wpx = pad + labelW + W * (cellW + gap);
      const Hpx = pad * 2 + rows * (cellH + 18);
      const svg = svgEl("svg", { viewBox: `0 0 ${Wpx} ${Hpx}`, width: Wpx, style: "max-width:100%;height:auto;" });

      function drawRow(rowIdx, label, bits, dim, diffMask) {
        const y = pad + rowIdx * (cellH + 18);
        const lt = svgEl("text", { x: pad + labelW - 12, y: y + cellH / 2 + 5, "text-anchor": "end", class: "dsa-dp-label" });
        lt.textContent = label;
        svg.appendChild(lt);
        bits.forEach((b, i) => {
          const x = pad + labelW + i * (cellW + gap);
          const differing = diffMask && diffMask[i];
          let cls = "dsa-cell";
          if (b === 1) cls += " dsa-cell--cmp";
          else cls += " dsa-cell--ghost";
          if (differing) cls += " dsa-cell--pivot";
          const r = svgEl("rect", { x, y, width: cellW, height: cellH, rx: 6, class: cls });
          if (dim) r.setAttribute("opacity", "0.4");
          svg.appendChild(r);
          const t = svgEl("text", { x: x + cellW / 2, y: y + cellH / 2 + 5, "text-anchor": "middle", class: "dsa-cell-text" });
          t.textContent = b == null ? "?" : b;
          if (dim) t.setAttribute("opacity", "0.4");
          svg.appendChild(t);
        });
      }
      const diff = nBits.map((b, i) => b !== mBits[i]);
      drawRow(0, `n = ${s.n}`, nBits, false, showM ? diff : null);
      drawRow(1, `n-1 = ${s.n - 1}`, showM ? mBits : new Array(W).fill(null), !showM, showM ? diff : null);
      drawRow(2, `n & (n-1)`, showAnd ? andBits : new Array(W).fill(null), !showAnd, null);

      stage.appendChild(svg);
    },
    readout: s => [
      { label: "n", value: s.n },
      { label: "n-1", value: s.n - 1 },
      { label: "n & (n-1)", value: s.result == null ? "—" : s.result },
      { label: "isPow2", value: s.isPow == null ? "…" : (s.isPow ? "YES" : "NO") },
    ],
  });

  // ===================================================================
  // 7) BITMASK TSP
  // ===================================================================
  register("bitmask-tsp", {
    title: "Bitmask TSP — dp[mask][i]",
    caption: "dp[mask][i] = min cost ending at city i with visited-set mask. Relax in increasing popcount order; tour cost = min(dp[FULL][i] + dist[i][0]).",
    code: [
      "dp[{0}][0] = 0",
      "for mask in masks (incl 0):",
      "  for i where mask has i:",
      "    for j not in mask:",
      "      nm = mask | (1<<j)",
      "      dp[nm][j] = min(dp[nm][j], dp[mask][i] + dist[i][j])",
    ],
    init() {
      const dist = [
        [0, 10, 15, 20],
        [10, 0, 35, 25],
        [15, 35, 0, 30],
        [20, 25, 30, 0],
      ];
      const N = 4;
      // dp[mask][i] keyed by `${mask},${i}`
      const dp = { "1,0": 0 };
      // queue of states to expand, ordered by popcount then mask
      const queue = [{ mask: 1, i: 0 }];
      return {
        dist, N, dp, queue, expanded: [],
        cur: null, edge: null,
        bestTour: null,
        phase: "expand",
        line: 0,
        desc: `dp[mask={0}][0] = 0 — start tour at city 0`,
      };
    },
    step(s) {
      const FULL = (1 << s.N) - 1;
      if (s.phase === "expand") {
        if (!s.queue.length) {
          // close the tour
          let best = Infinity, who = -1;
          for (let i = 1; i < s.N; i++) {
            const k = `${FULL},${i}`;
            if (s.dp[k] != null) {
              const c = s.dp[k] + s.dist[i][0];
              if (c < best) { best = c; who = i; }
            }
          }
          return { ...s, phase: "done", bestTour: { cost: best, last: who }, line: 5, desc: `close tour: min over i of dp[FULL][i] + dist[i][0] = ${best}`, done: true };
        }
        const queue = s.queue.slice();
        const { mask, i } = queue.shift();
        const k = `${mask},${i}`;
        const baseCost = s.dp[k];
        const expanded = [...s.expanded, { mask, i }];
        // enumerate transitions
        const transitions = [];
        for (let j = 0; j < s.N; j++) {
          if (mask & (1 << j)) continue;
          transitions.push(j);
        }
        return {
          ...s, queue, expanded,
          cur: { mask, i },
          edge: null,
          phase: transitions.length ? "relax" : "expand",
          _pendingJs: transitions,
          line: 2, desc: `pop (mask=${bin(mask, s.N)}, i=${i}) with dp=${baseCost} — relax to ${transitions.length} unvisited`,
        };
      }
      if (s.phase === "relax") {
        const pending = (s._pendingJs || []).slice();
        if (!pending.length) {
          return { ...s, phase: "expand", _pendingJs: null, edge: null, line: 2, desc: "no more unvisited from this state" };
        }
        const j = pending.shift();
        const { mask, i } = s.cur;
        const nm = mask | (1 << j);
        const baseCost = s.dp[`${mask},${i}`];
        const cand = baseCost + s.dist[i][j];
        const k = `${nm},${j}`;
        const dp = { ...s.dp };
        let updated = false;
        if (dp[k] == null || cand < dp[k]) {
          dp[k] = cand;
          updated = true;
        }
        let queue = s.queue.slice();
        // enqueue (nm, j) once
        const inQ = queue.some(q => q.mask === nm && q.i === j);
        if (!inQ && nm !== ((1 << s.N) - 1) + 999) queue = [...queue, { mask: nm, i: j }];
        // sort queue by popcount asc, then mask asc
        queue.sort((a, b) => {
          const pa = a.mask.toString(2).replace(/0/g, "").length;
          const pb = b.mask.toString(2).replace(/0/g, "").length;
          if (pa !== pb) return pa - pb;
          if (a.mask !== b.mask) return a.mask - b.mask;
          return a.i - b.i;
        });
        return {
          ...s, dp, queue, _pendingJs: pending,
          edge: { from: i, to: j, cost: s.dist[i][j], total: cand, updated },
          line: 5, desc: `try i=${i}→j=${j}: dp[${bin(nm, s.N)}][${j}] = min(${dp[k] === cand && updated ? "∞" : dp[k]}, ${baseCost}+${s.dist[i][j]}) = ${dp[k]}${updated ? " ✓" : ""}`,
        };
      }
      return null;
    },
    render(s, stage) {
      stage.innerHTML = "";
      const wrap = htmlEl("div", "display:flex;flex-direction:column;gap:0.6rem;width:100%;align-items:center;");

      // ----- city graph -----
      const N = s.N;
      const radius = 90, cx = 130, cy = 110;
      const nodes = [];
      for (let i = 0; i < N; i++) {
        const a = -Math.PI / 2 + (2 * Math.PI * i) / N;
        nodes.push({ id: i, x: cx + radius * Math.cos(a), y: cy + radius * Math.sin(a), val: i });
      }
      const edges = [];
      for (let i = 0; i < N; i++) {
        for (let j = i + 1; j < N; j++) {
          let hl = null;
          if (s.edge && ((s.edge.from === i && s.edge.to === j) || (s.edge.from === j && s.edge.to === i))) hl = "active";
          edges.push({ a: i, b: j, w: s.dist[i][j], highlight: hl });
        }
      }
      if (s.cur) {
        nodes[s.cur.i].highlight = "visit";
        // tag the visited mask members
        for (let i = 0; i < N; i++) {
          if (s.cur.mask & (1 << i)) {
            if (i !== s.cur.i) nodes[i].highlight = "done";
          }
        }
      }
      if (s.phase === "done" && s.bestTour) {
        nodes.forEach(n => n.highlight = "done");
      }
      const gh = htmlEl("div");
      gh.innerHTML = `<div style="font-size:0.65rem;color:var(--md-default-fg-color--light);text-align:center;margin-bottom:0.25rem;">4 cities · symmetric distance</div>`;
      const ghi = htmlEl("div");
      P.graph(ghi, { nodes, edges });
      gh.appendChild(ghi);
      wrap.appendChild(gh);

      // ----- dp grid: rows = 16 masks, cols = 4 cities -----
      const dpHost = htmlEl("div");
      dpHost.innerHTML = `<div style="font-size:0.65rem;color:var(--md-default-fg-color--light);text-align:center;margin-bottom:0.25rem;">dp[mask][i]   ·   rows = subset, cols = last city</div>`;
      const dpInner = htmlEl("div");
      const rows = 1 << N;
      P.dpTable(dpInner, {
        rows, cols: N,
        rowLabels: Array.from({ length: rows }, (_, m) => bin(m, N)),
        colLabels: Array.from({ length: N }, (_, i) => `i=${i}`),
        cellOf: (r, c) => {
          const k = `${r},${c}`;
          const v = s.dp[k];
          let cls = v == null ? "" : "filled";
          if (s.cur && s.cur.mask === r && s.cur.i === c) cls = "current";
          if (s.edge && s.edge.to === c && (s.cur.mask | (1 << s.edge.to)) === r) {
            cls = s.edge.updated ? "answer" : "read";
          }
          return { val: v == null ? "" : v, cls };
        },
      });
      dpHost.appendChild(dpInner);
      wrap.appendChild(dpHost);

      if (s.bestTour) {
        const t = htmlEl("div", "font-family:var(--md-code-font);font-size:0.74rem;text-align:center;color:#34d399;",
          `<strong>best tour cost = ${s.bestTour.cost}</strong> (end at city ${s.bestTour.last}, then back to 0)`);
        wrap.appendChild(t);
      }
      stage.appendChild(wrap);
    },
    readout: s => [
      { label: "queue", value: s.queue.length },
      { label: "expanded", value: s.expanded.length },
      { label: "state", value: s.cur ? `(${bin(s.cur.mask, s.N)},${s.cur.i})` : "—" },
      { label: "best", value: s.bestTour ? s.bestTour.cost : "…" },
    ],
  });

  // ===================================================================
  // 8) ACTIVITY SELECTION
  // ===================================================================
  register("activity-selection", {
    title: "Activity Selection — earliest-finish greedy",
    caption: "Sort by finish time. Scan; pick the next activity whose start ≥ previous chosen finish. Always optimal.",
    code: [
      "acts.sort(key=finish)",
      "last = -inf; chosen = []",
      "for (s, f) in acts:",
      "  if s >= last:",
      "    chosen.append((s,f)); last = f",
      "return chosen",
    ],
    init() {
      const raw = [[1, 4], [3, 5], [0, 6], [5, 7], [3, 9], [5, 9], [6, 10], [8, 11], [8, 12], [2, 14], [12, 16]];
      const activities = raw.slice().sort((a, b) => a[1] - b[1]).map(([s, f], k) => ({ s, f, id: k }));
      return {
        activities,
        idx: 0,
        lastFinish: -Infinity,
        chosen: [], rejected: [],
        decision: null, // 'accept' | 'reject'
        line: 0, desc: "sorted by finish time",
      };
    },
    step(s) {
      if (s.idx >= s.activities.length) {
        return { ...s, line: 5, decision: null, desc: `done — chose ${s.chosen.length} activities`, done: true };
      }
      const a = s.activities[s.idx];
      if (a.s >= s.lastFinish) {
        return {
          ...s, chosen: [...s.chosen, s.idx], lastFinish: a.f, idx: s.idx + 1,
          line: 4, decision: "accept",
          desc: `[${a.s},${a.f}] start ${a.s} ≥ last finish ${s.lastFinish === -Infinity ? "-∞" : s.lastFinish} → ACCEPT (last ← ${a.f})`,
        };
      }
      return {
        ...s, rejected: [...s.rejected, s.idx], idx: s.idx + 1,
        line: 3, decision: "reject",
        desc: `[${a.s},${a.f}] start ${a.s} < last finish ${s.lastFinish} → SKIP`,
      };
    },
    render(s, stage) {
      stage.innerHTML = "";
      const acts = s.activities;
      const T = Math.max(...acts.map(a => a.f)) + 1;
      const rowH = 22, gap = 2, pad = 40, labelW = 70;
      const trackW = 480;
      const Wpx = pad + labelW + trackW + 40;
      const Hpx = pad + acts.length * (rowH + gap) + 40;
      const svg = svgEl("svg", { viewBox: `0 0 ${Wpx} ${Hpx}`, width: Wpx, style: "max-width:100%;height:auto;" });

      // axis ticks
      for (let t = 0; t <= T; t += 2) {
        const x = pad + labelW + (t / T) * trackW;
        svg.appendChild(svgEl("line", { x1: x, y1: pad - 4, x2: x, y2: Hpx - 16, stroke: "rgba(120,120,140,0.18)" }));
        const tt = svgEl("text", { x, y: Hpx - 4, "text-anchor": "middle", class: "dsa-cell-index" });
        tt.textContent = t;
        svg.appendChild(tt);
      }

      acts.forEach((a, k) => {
        const y = pad + k * (rowH + gap);
        // label
        const lt = svgEl("text", { x: pad + labelW - 8, y: y + rowH / 2 + 4, "text-anchor": "end", class: "dsa-cell-index" });
        lt.textContent = `[${a.s},${a.f}]`;
        svg.appendChild(lt);
        const x = pad + labelW + (a.s / T) * trackW;
        const w = ((a.f - a.s) / T) * trackW;
        const isCur = k === s.idx && !s.done;
        const isChosen = s.chosen.includes(k);
        const isRejected = s.rejected.includes(k);
        let cls = "dsa-cell";
        if (isChosen) cls += " dsa-cell--done";
        else if (isRejected) cls += " dsa-cell--ghost";
        else if (isCur) cls += " dsa-cell--cmp";
        else cls += " dsa-cell--window";
        svg.appendChild(svgEl("rect", { x, y, width: w, height: rowH, rx: 4, class: cls }));
      });

      // last-finish marker
      if (s.lastFinish !== -Infinity) {
        const x = pad + labelW + (s.lastFinish / T) * trackW;
        svg.appendChild(svgEl("line", { x1: x, y1: pad - 4, x2: x, y2: Hpx - 16, stroke: "#34d399", "stroke-width": 2, "stroke-dasharray": "4 3" }));
        const t = svgEl("text", { x: x + 4, y: pad - 6, class: "dsa-cell-index", fill: "#34d399" });
        t.textContent = `last=${s.lastFinish}`;
        svg.appendChild(t);
      }

      stage.appendChild(svg);
    },
    readout: s => [
      { label: "idx", value: s.idx },
      { label: "last finish", value: s.lastFinish === -Infinity ? "-∞" : s.lastFinish },
      { label: "chosen", value: s.chosen.length },
      { label: "rejected", value: s.rejected.length },
    ],
  });

  // ===================================================================
  // 9) GAS STATION
  // ===================================================================
  register("gas-station", {
    title: "Gas Station — single-pass tank",
    caption: "Track running tank and total. Whenever tank goes negative, no station before i+1 can be the start; reset.",
    code: [
      "tank = total = 0; start = 0",
      "for i in 0..n-1:",
      "  diff = gas[i] - cost[i]",
      "  tank += diff; total += diff",
      "  if tank < 0:",
      "    start = i + 1; tank = 0",
      "return start if total >= 0 else -1",
    ],
    init() {
      const gas = [1, 2, 3, 4, 5], cost = [3, 4, 5, 1, 2];
      return {
        gas, cost,
        i: 0, tank: 0, total: 0, start: 0,
        lastDiff: null, resetHappened: false,
        line: 0, desc: "tank=0, total=0, start=0",
      };
    },
    step(s) {
      if (s.i >= s.gas.length) {
        const ok = s.total >= 0;
        return { ...s, line: 6, desc: ok ? `total=${s.total} ≥ 0 → start at index ${s.start}` : `total=${s.total} < 0 → no solution`, done: true };
      }
      const diff = s.gas[s.i] - s.cost[s.i];
      let tank = s.tank + diff;
      const total = s.total + diff;
      let start = s.start, reset = false;
      let line = 3;
      if (tank < 0) {
        start = s.i + 1;
        tank = 0;
        reset = true;
        line = 5;
      }
      return {
        ...s,
        i: s.i + 1, tank, total, start, lastDiff: diff, resetHappened: reset,
        line,
        desc: `i=${s.i}: diff=${s.gas[s.i]}-${s.cost[s.i]}=${diff}; tank→${reset ? "<0 → reset, start=" + start : s.tank + diff}; total=${total}`,
      };
    },
    render(s, stage) {
      stage.innerHTML = "";
      const wrap = htmlEl("div", "display:flex;flex-direction:column;gap:0.5rem;width:100%;");

      const cur = s.i - 1; // last consumed
      const ptrIdx = s.i < s.gas.length ? s.i : null;

      // gas row
      const gasHost = htmlEl("div");
      gasHost.innerHTML = `<div style="font-size:0.65rem;color:var(--md-default-fg-color--light);text-align:center;margin-bottom:0.2rem;">gas</div>`;
      const gw = htmlEl("div");
      const hiG = {};
      if (ptrIdx != null) hiG[ptrIdx] = "cmp";
      for (let k = 0; k < (ptrIdx == null ? s.gas.length : ptrIdx); k++) hiG[k] = "window";
      P.array(gw, { arr: s.gas, pointers: ptrIdx != null ? { i: ptrIdx } : {}, highlight: hiG });
      gasHost.appendChild(gw);
      wrap.appendChild(gasHost);

      // cost row
      const cHost = htmlEl("div");
      cHost.innerHTML = `<div style="font-size:0.65rem;color:var(--md-default-fg-color--light);text-align:center;margin-bottom:0.2rem;">cost</div>`;
      const cw = htmlEl("div");
      const hiC = {};
      if (ptrIdx != null) hiC[ptrIdx] = "cmp";
      for (let k = 0; k < (ptrIdx == null ? s.cost.length : ptrIdx); k++) hiC[k] = "window";
      hiC[s.start] = "target";
      P.array(cw, { arr: s.cost, pointers: { start: s.start }, highlight: hiC });
      cHost.appendChild(cw);
      wrap.appendChild(cHost);

      // tank gauge
      const gauge = htmlEl("div", "display:flex;justify-content:center;gap:1rem;font-family:var(--md-code-font);font-size:0.78rem;margin-top:0.2rem;");
      const tankColor = s.tank >= 0 ? "#34d399" : "#fb7185";
      gauge.innerHTML = `
        <span style="padding:.15rem .5rem;border-radius:6px;background:rgba(167,139,250,0.18);color:#a78bfa;"><em>start</em> = ${s.start}</span>
        <span style="padding:.15rem .5rem;border-radius:6px;background:rgba(${s.tank >= 0 ? "52,211,153" : "251,113,133"},0.18);color:${tankColor};"><em>tank</em> = ${s.tank}</span>
        <span style="padding:.15rem .5rem;border-radius:6px;background:rgba(34,211,238,0.18);color:#22d3ee;"><em>total</em> = ${s.total}</span>
      `;
      wrap.appendChild(gauge);

      if (s.resetHappened) {
        const note = htmlEl("div", "text-align:center;color:#fb7185;font-size:0.7rem;font-family:var(--md-code-font);", "tank went negative → start reset");
        wrap.appendChild(note);
      }
      stage.appendChild(wrap);
    },
    readout: s => [
      { label: "i", value: s.i < s.gas.length ? s.i : "—" },
      { label: "tank", value: s.tank },
      { label: "total", value: s.total },
      { label: "start", value: s.start },
    ],
  });

  // ===================================================================
  // 10) HUFFMAN
  // ===================================================================
  register("huffman", {
    title: "Huffman — greedy tree from a min-heap",
    caption: "Pop two smallest-freq nodes, merge into a parent with freq=sum, push back. Repeat until one node remains: the Huffman tree.",
    code: [
      "heap = min-heap of leaf nodes",
      "while len(heap) > 1:",
      "  a = pop_min(heap)",
      "  b = pop_min(heap)",
      "  m = Node(a.freq + b.freq, left=a, right=b)",
      "  push(heap, m)",
      "return heap[0]   # root",
    ],
    init() {
      const items = [["a", 5], ["b", 9], ["c", 12], ["d", 13], ["e", 16], ["f", 45]];
      const nodes = items.map(([ch, freq], i) => ({
        id: i, ch, freq, left: null, right: null, isLeaf: true, x: 0, y: 0, parent: null,
      }));
      // leaves placed evenly along bottom
      const slotW = 80;
      nodes.forEach((n, i) => { n.x = 40 + i * slotW; n.y = 260; });
      const heap = nodes.map(n => n.id).sort((a, b) => nodes[a].freq - nodes[b].freq);
      return {
        nodes, heap,
        nextId: nodes.length,
        a: null, b: null, merged: null,
        line: 0,
        desc: `heap initialized — leaves [${heap.map(i => nodes[i].ch + ":" + nodes[i].freq).join(", ")}]`,
        phase: "loop",
      };
    },
    step(s) {
      if (s.heap.length === 1) {
        return { ...s, line: 6, desc: `one node remains — root has freq ${s.nodes[s.heap[0]].freq}`, done: true, a: null, b: null, merged: null };
      }
      if (s.phase === "loop") {
        const heap = s.heap.slice();
        const aId = heap.shift();
        return { ...s, heap, a: aId, phase: "popB", line: 2, desc: `pop min #1 → ${s.nodes[aId].ch || "·"}(${s.nodes[aId].freq})` };
      }
      if (s.phase === "popB") {
        const heap = s.heap.slice();
        const bId = heap.shift();
        return { ...s, heap, b: bId, phase: "merge", line: 3, desc: `pop min #2 → ${s.nodes[bId].ch || "·"}(${s.nodes[bId].freq})` };
      }
      if (s.phase === "merge") {
        const a = s.nodes[s.a], b = s.nodes[s.b];
        const newId = s.nextId;
        const newFreq = a.freq + b.freq;
        // place merged node above and between the two children
        const newNode = {
          id: newId, ch: null, freq: newFreq,
          left: a.id, right: b.id, isLeaf: false,
          x: (a.x + b.x) / 2,
          y: Math.min(a.y, b.y) - 60,
          parent: null,
        };
        const nodes = s.nodes.slice();
        nodes[a.id] = { ...a, parent: newId };
        nodes[b.id] = { ...b, parent: newId };
        nodes[newId] = newNode;
        return { ...s, nodes, nextId: newId + 1, merged: newId, phase: "push", line: 4, desc: `merge into node #${newId} (freq=${newFreq})` };
      }
      if (s.phase === "push") {
        const heap = [...s.heap, s.merged].sort((x, y) => s.nodes[x].freq - s.nodes[y].freq);
        return { ...s, heap, phase: "loop", a: null, b: null, line: 5, desc: `push #${s.merged}(${s.nodes[s.merged].freq}) — heap now [${heap.map(i => (s.nodes[i].ch || "·") + ":" + s.nodes[i].freq).join(", ")}]` };
      }
      return null;
    },
    render(s, stage) {
      stage.innerHTML = "";
      const wrap = htmlEl("div", "display:flex;flex-direction:column;gap:0.6rem;width:100%;align-items:center;");

      const treeNodes = s.nodes.map(n => {
        let hl = null;
        if (s.a === n.id || s.b === n.id) hl = "visit";
        else if (s.merged === n.id) hl = "done";
        return {
          id: n.id, val: (n.ch ? n.ch : "·") + ":" + n.freq,
          x: n.x, y: n.y, parent: n.parent, highlight: hl,
        };
      });
      const treeHost = htmlEl("div");
      P.tree(treeHost, { nodes: treeNodes });
      wrap.appendChild(treeHost);

      const heapEl = htmlEl("div", "font-family:var(--md-code-font);font-size:0.75rem;text-align:center;");
      heapEl.innerHTML = `<strong>heap:</strong> [${s.heap.map(i => `<span style="padding:.05rem .35rem;margin:.1rem;border-radius:4px;background:rgba(34,211,238,0.18);color:#22d3ee;">${s.nodes[i].ch || "·"}:${s.nodes[i].freq}</span>`).join("")}]`;
      wrap.appendChild(heapEl);

      stage.appendChild(wrap);
    },
    readout: s => [
      { label: "heap size", value: s.heap.length },
      { label: "popped a", value: s.a != null ? `${s.nodes[s.a].ch || "·"}:${s.nodes[s.a].freq}` : "—" },
      { label: "popped b", value: s.b != null ? `${s.nodes[s.b].ch || "·"}:${s.nodes[s.b].freq}` : "—" },
      { label: "merged", value: s.merged != null ? `freq=${s.nodes[s.merged].freq}` : "—" },
    ],
  });

  // ===================================================================
  // 11) INTERVAL MERGING
  // ===================================================================
  register("intervals", {
    title: "Merge Intervals — sweep & extend",
    caption: "Sort by start. Walk; if current.start ≤ last.end, extend last.end. Otherwise append a new interval.",
    code: [
      "intervals.sort(key=start)",
      "out = []",
      "for [s, e] in intervals:",
      "  if out and s <= out[-1].end:",
      "    out[-1].end = max(out[-1].end, e)",
      "  else:",
      "    out.append([s, e])",
      "return out",
    ],
    init() {
      const intervals = [[1, 3], [2, 6], [8, 10], [15, 18]];
      return {
        intervals,
        i: 0,
        out: [],
        action: null, // 'merge' | 'append'
        line: 0,
        desc: "intervals already sorted by start",
      };
    },
    step(s) {
      if (s.i >= s.intervals.length) {
        return { ...s, line: 7, action: null, desc: `done — ${s.out.length} merged interval(s)`, done: true };
      }
      const [a, b] = s.intervals[s.i];
      if (s.out.length && a <= s.out[s.out.length - 1][1]) {
        const out = s.out.slice();
        const last = out[out.length - 1].slice();
        const before = last[1];
        last[1] = Math.max(last[1], b);
        out[out.length - 1] = last;
        return {
          ...s, out, i: s.i + 1, action: "merge",
          line: 4, desc: `[${a},${b}] overlaps last [${out[out.length - 1][0]},${before}] → extend end to ${last[1]}`,
        };
      }
      return {
        ...s, out: [...s.out, [a, b]], i: s.i + 1, action: "append",
        line: 6, desc: `[${a},${b}] disjoint — append`,
      };
    },
    render(s, stage) {
      stage.innerHTML = "";
      const all = s.intervals;
      const merged = s.out;
      const maxT = Math.max(
        ...all.flat(),
        ...(merged.length ? merged.flat() : [0])
      ) + 1;
      const minT = 0;
      const pad = 40, labelW = 90, trackW = 460, rowH = 26, rowGap = 6;
      const inputRows = all.length;
      const outputRows = Math.max(1, merged.length);
      const Hpx = pad + (inputRows + outputRows + 2) * (rowH + rowGap) + 40;
      const Wpx = pad + labelW + trackW + 40;
      const svg = svgEl("svg", { viewBox: `0 0 ${Wpx} ${Hpx}`, width: Wpx, style: "max-width:100%;height:auto;" });

      function xAt(t) { return pad + labelW + ((t - minT) / (maxT - minT)) * trackW; }

      // axis ticks
      for (let t = minT; t <= maxT; t++) {
        const x = xAt(t);
        svg.appendChild(svgEl("line", { x1: x, y1: pad - 4, x2: x, y2: Hpx - 24, stroke: "rgba(120,120,140,0.12)" }));
      }
      for (let t = minT; t <= maxT; t += 2) {
        const x = xAt(t);
        const tt = svgEl("text", { x, y: Hpx - 6, "text-anchor": "middle", class: "dsa-cell-index" });
        tt.textContent = t;
        svg.appendChild(tt);
      }

      // section label: input
      const lbl1 = svgEl("text", { x: pad + labelW - 8, y: pad - 8, "text-anchor": "end", class: "dsa-cell-index" });
      lbl1.textContent = "input";
      svg.appendChild(lbl1);

      all.forEach(([a, b], k) => {
        const y = pad + k * (rowH + rowGap);
        const x = xAt(a), w = xAt(b) - xAt(a);
        let cls = "dsa-cell";
        if (k < s.i) cls += " dsa-cell--ghost";
        else if (k === s.i && !s.done) cls += " dsa-cell--cmp";
        else cls += " dsa-cell--window";
        svg.appendChild(svgEl("rect", { x, y, width: w, height: rowH, rx: 4, class: cls }));
        const t = svgEl("text", { x: x + w / 2, y: y + rowH / 2 + 4, "text-anchor": "middle", class: "dsa-cell-text" });
        t.textContent = `[${a},${b}]`;
        svg.appendChild(t);
      });

      // section label: output
      const outY0 = pad + (inputRows + 1) * (rowH + rowGap);
      const lbl2 = svgEl("text", { x: pad + labelW - 8, y: outY0 - 8, "text-anchor": "end", class: "dsa-cell-index" });
      lbl2.textContent = "merged";
      svg.appendChild(lbl2);

      merged.forEach(([a, b], k) => {
        const y = outY0 + k * (rowH + rowGap);
        const x = xAt(a), w = xAt(b) - xAt(a);
        const isLast = k === merged.length - 1;
        let cls = "dsa-cell dsa-cell--done";
        if (isLast && s.action === "merge") cls = "dsa-cell dsa-cell--swap";
        if (isLast && s.action === "append") cls = "dsa-cell dsa-cell--target";
        svg.appendChild(svgEl("rect", { x, y, width: w, height: rowH, rx: 4, class: cls }));
        const t = svgEl("text", { x: x + w / 2, y: y + rowH / 2 + 4, "text-anchor": "middle", class: "dsa-cell-text" });
        t.textContent = `[${a},${b}]`;
        svg.appendChild(t);
      });

      stage.appendChild(svg);
    },
    readout: s => [
      { label: "i", value: s.i < s.intervals.length ? s.i : "—" },
      { label: "action", value: s.action || "—" },
      { label: "out", value: s.out.length },
      { label: "last", value: s.out.length ? `[${s.out[s.out.length - 1].join(",")}]` : "—" },
    ],
  });

})();
