/* ===========================================================
   Brain Detox Arc — DSA algorithm registrations
   ----------------------------------------------------------
   Every algorithm registers a config:
     { title, caption, code, init, step, render, readout }
   The engine in dsa-viz.js handles UI + stepping.
   =========================================================== */
(function () {
  "use strict";
  if (!window.DSA) { console.error("dsa-viz.js must load first"); return; }
  const { primitives: P, register } = window.DSA;

  // ===================================================================
  // PATTERN 1 · TWO POINTERS
  // ===================================================================

  // ---------- Reverse array in place --------------------------------
  register("reverse-array", {
    title: "Reverse array in place — two pointers",
    caption: "Two pointers walk from ends toward the middle, swapping at each step.",
    code: [
      "l = 0",
      "r = n - 1",
      "while l < r:",
      "  swap(a[l], a[r])",
      "  l += 1",
      "  r -= 1",
    ],
    init() {
      return {
        arr: [3, 1, 4, 1, 5, 9, 2, 6],
        l: 0, r: 7, line: 0,
        desc: "initialize l = 0, r = n - 1 (point at the two ends)",
      };
    },
    step(s) {
      if (s.line === 0) return { ...s, line: 1, desc: "set r to last index" };
      if (s.line === 1) return { ...s, line: 2, desc: `check loop guard: l (${s.l}) < r (${s.r})?` };
      if (s.l >= s.r) return { ...s, line: 2, desc: "l ≥ r — pointers met, array reversed.", done: true };
      if (s.line === 2) return { ...s, line: 3, desc: `swap a[${s.l}] = ${s.arr[s.l]} ↔ a[${s.r}] = ${s.arr[s.r]}` };
      if (s.line === 3) {
        const a = s.arr.slice();
        [a[s.l], a[s.r]] = [a[s.r], a[s.l]];
        return { ...s, arr: a, line: 4, desc: "swap done — advance left pointer" };
      }
      if (s.line === 4) return { ...s, l: s.l + 1, line: 5, desc: "decrement right pointer" };
      if (s.line === 5) return { ...s, r: s.r - 1, line: 2, desc: `loop again: l = ${s.l}, r = ${s.r - 1}` };
    },
    render(s, stage) {
      const hi = {};
      hi[s.l] = "cmp";
      hi[s.r] = "cmp";
      P.array(stage, { arr: s.arr, pointers: { l: s.l, r: s.r }, highlight: hi });
    },
    readout: s => [{ label: "l", value: s.l }, { label: "r", value: s.r }, { label: "n", value: s.arr.length }],
  });

  // ---------- Two Sum on sorted array --------------------------------
  register("two-sum-sorted", {
    title: "Two Sum on sorted array — l/r converge",
    caption: "Sum at the two ends. If too big, move r left; if too small, move l right.",
    code: [
      "l = 0; r = n - 1",
      "while l < r:",
      "  s = a[l] + a[r]",
      "  if s == target: return [l, r]",
      "  elif s < target: l += 1",
      "  else: r -= 1",
      "return [-1, -1]",
    ],
    init() {
      const arr = [1, 2, 4, 7, 11, 15];
      return { arr, target: 13, l: 0, r: arr.length - 1, line: 0, sum: null, desc: `target = 13` };
    },
    step(s) {
      if (s.line === 0) return { ...s, line: 1, desc: `compare l (${s.l}) < r (${s.r})` };
      if (s.l >= s.r) return { ...s, line: 6, desc: "pointers crossed — no pair sums to target", done: true };
      if (s.line === 1) {
        const sum = s.arr[s.l] + s.arr[s.r];
        return { ...s, line: 2, sum, desc: `a[${s.l}] + a[${s.r}] = ${s.arr[s.l]} + ${s.arr[s.r]} = ${sum}` };
      }
      if (s.line === 2) {
        if (s.sum === s.target) return { ...s, line: 3, desc: `sum equals target — found! return [${s.l}, ${s.r}]`, done: true };
        if (s.sum < s.target) return { ...s, line: 4, desc: `${s.sum} < ${s.target} — need bigger, l += 1` };
        return { ...s, line: 5, desc: `${s.sum} > ${s.target} — need smaller, r -= 1` };
      }
      if (s.line === 4) return { ...s, l: s.l + 1, line: 1, sum: null, desc: "loop again" };
      if (s.line === 5) return { ...s, r: s.r - 1, line: 1, sum: null, desc: "loop again" };
    },
    render(s, stage) {
      const hi = {};
      hi[s.l] = "cmp"; hi[s.r] = "cmp";
      if (s.done && s.sum === s.target) { hi[s.l] = "found"; hi[s.r] = "found"; }
      P.array(stage, { arr: s.arr, pointers: { l: s.l, r: s.r }, highlight: hi });
    },
    readout: s => [
      { label: "l", value: s.l }, { label: "r", value: s.r },
      { label: "a[l]+a[r]", value: s.sum ?? "—" }, { label: "target", value: s.target },
    ],
  });

  // ---------- Remove duplicates from sorted array --------------------
  register("remove-duplicates", {
    title: "Remove duplicates — slow/fast pointer",
    caption: "slow tracks the write index; fast scans the array; copy only when a[fast] != a[slow].",
    code: [
      "if n == 0: return 0",
      "slow = 0",
      "for fast in 1..n-1:",
      "  if a[fast] != a[slow]:",
      "    slow += 1",
      "    a[slow] = a[fast]",
      "return slow + 1",
    ],
    init() {
      return { arr: [1, 1, 2, 2, 3, 4, 4, 5], slow: 0, fast: 1, line: 0, desc: "slow = 0, fast scans from 1" };
    },
    step(s) {
      if (s.line === 0) return { ...s, line: 1, desc: "array non-empty, set slow = 0" };
      if (s.line === 1) return { ...s, line: 2, desc: "begin scan with fast = 1" };
      if (s.fast >= s.arr.length) return { ...s, line: 6, desc: `done — unique length = slow + 1 = ${s.slow + 1}`, done: true };
      if (s.line === 2) {
        if (s.arr[s.fast] !== s.arr[s.slow]) {
          return { ...s, line: 3, desc: `a[${s.fast}] = ${s.arr[s.fast]} ≠ a[${s.slow}] = ${s.arr[s.slow]} — new unique value` };
        }
        return { ...s, line: 2, fast: s.fast + 1, desc: `a[${s.fast}] equals a[${s.slow}] — skip; fast += 1` };
      }
      if (s.line === 3) return { ...s, slow: s.slow + 1, line: 4, desc: `slow → ${s.slow + 1}` };
      if (s.line === 4) {
        const arr = s.arr.slice();
        arr[s.slow] = arr[s.fast];
        return { ...s, arr, line: 2, fast: s.fast + 1, desc: `write a[${s.slow}] = a[${s.fast}]` };
      }
    },
    render(s, stage) {
      const hi = {};
      for (let i = 0; i <= s.slow; i++) hi[i] = "done";
      if (s.fast < s.arr.length) hi[s.fast] = "cmp";
      P.array(stage, { arr: s.arr, pointers: { slow: s.slow, fast: s.fast }, highlight: hi });
    },
    readout: s => [{ label: "slow", value: s.slow }, { label: "fast", value: s.fast }, { label: "unique", value: s.slow + 1 }],
  });

  // ---------- Container With Most Water -------------------------------
  register("container-most-water", {
    title: "Container With Most Water — shrink the smaller wall",
    caption: "Area = min(h[l], h[r]) × (r - l). Always move the shorter wall inward — only that can possibly raise the min.",
    code: [
      "l = 0; r = n - 1; best = 0",
      "while l < r:",
      "  area = min(h[l], h[r]) * (r - l)",
      "  best = max(best, area)",
      "  if h[l] < h[r]: l += 1",
      "  else: r -= 1",
      "return best",
    ],
    init() {
      return {
        arr: [1, 8, 6, 2, 5, 4, 8, 3, 7],
        l: 0, r: 8, best: 0, area: 0, line: 0,
        desc: "two pointers at the ends",
      };
    },
    step(s) {
      if (s.line === 0) return { ...s, line: 1, desc: "loop while l < r" };
      if (s.l >= s.r) return { ...s, line: 6, desc: `pointers met — best area = ${s.best}`, done: true };
      if (s.line === 1) {
        const area = Math.min(s.arr[s.l], s.arr[s.r]) * (s.r - s.l);
        return { ...s, line: 2, area, desc: `area = min(${s.arr[s.l]}, ${s.arr[s.r]}) × ${s.r - s.l} = ${area}` };
      }
      if (s.line === 2) {
        const best = Math.max(s.best, s.area);
        return { ...s, line: 3, best, desc: best > s.best ? `new best = ${best}` : `best unchanged (${best})` };
      }
      if (s.line === 3) {
        if (s.arr[s.l] < s.arr[s.r]) return { ...s, line: 4, desc: `h[l] < h[r] → move l right` };
        return { ...s, line: 5, desc: `h[r] ≤ h[l] → move r left` };
      }
      if (s.line === 4) return { ...s, l: s.l + 1, line: 1, desc: "loop again" };
      if (s.line === 5) return { ...s, r: s.r - 1, line: 1, desc: "loop again" };
    },
    render(s, stage) {
      // bar chart in SVG
      stage.innerHTML = "";
      const arr = s.arr;
      const cellW = 38, gap = 4, pad = 20, maxH = 140;
      const max = Math.max(...arr);
      const W = pad * 2 + arr.length * (cellW + gap);
      const H = maxH + 80;
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
      svg.setAttribute("width", W);
      svg.style.maxWidth = "100%"; svg.style.height = "auto";

      // water area highlight
      if (!s.done && s.l < s.r) {
        const x1 = pad + s.l * (cellW + gap) + cellW / 2;
        const x2 = pad + s.r * (cellW + gap) + cellW / 2;
        const waterH = Math.min(arr[s.l], arr[s.r]) / max * maxH;
        const yTop = pad + (maxH - waterH);
        const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        rect.setAttribute("x", x1); rect.setAttribute("y", yTop);
        rect.setAttribute("width", x2 - x1); rect.setAttribute("height", waterH);
        rect.setAttribute("fill", "rgba(34, 211, 238, 0.25)");
        rect.setAttribute("stroke", "#22d3ee");
        rect.setAttribute("stroke-dasharray", "4 3");
        svg.appendChild(rect);
      }

      arr.forEach((h, i) => {
        const x = pad + i * (cellW + gap);
        const bh = h / max * maxH;
        const y = pad + (maxH - bh);
        const cls = (i === s.l || i === s.r) ? "dsa-cell--cmp" : "";
        const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        rect.setAttribute("x", x); rect.setAttribute("y", y);
        rect.setAttribute("width", cellW); rect.setAttribute("height", bh);
        rect.setAttribute("rx", 4);
        rect.setAttribute("class", "dsa-cell " + cls);
        svg.appendChild(rect);
        const t = document.createElementNS("http://www.w3.org/2000/svg", "text");
        t.setAttribute("x", x + cellW / 2); t.setAttribute("y", pad + maxH + 16);
        t.setAttribute("text-anchor", "middle"); t.setAttribute("class", "dsa-cell-text");
        t.textContent = h; svg.appendChild(t);
        const idx = document.createElementNS("http://www.w3.org/2000/svg", "text");
        idx.setAttribute("x", x + cellW / 2); idx.setAttribute("y", pad + maxH + 30);
        idx.setAttribute("text-anchor", "middle"); idx.setAttribute("class", "dsa-cell-index");
        idx.textContent = i; svg.appendChild(idx);
        if (i === s.l || i === s.r) {
          const tag = document.createElementNS("http://www.w3.org/2000/svg", "text");
          tag.setAttribute("x", x + cellW / 2); tag.setAttribute("y", pad + maxH + 46);
          tag.setAttribute("text-anchor", "middle"); tag.setAttribute("class", "dsa-ptr-label");
          tag.textContent = i === s.l ? "l" : "r"; svg.appendChild(tag);
        }
      });
      stage.appendChild(svg);
    },
    readout: s => [{ label: "l", value: s.l }, { label: "r", value: s.r }, { label: "area", value: s.area }, { label: "best", value: s.best }],
  });

  // ===================================================================
  // PATTERN 2 · SLIDING WINDOW
  // ===================================================================

  // ---------- Longest substring without repeating chars --------------
  register("longest-no-repeat", {
    title: "Longest substring without repeating chars",
    caption: "Window [l, r]. Extend r; if a[r] already in the window, shrink l until it isn't.",
    code: [
      "l = 0; best = 0; seen = {}",
      "for r in 0..n-1:",
      "  while a[r] in seen: remove a[l]; l += 1",
      "  add a[r] to seen",
      "  best = max(best, r - l + 1)",
      "return best",
    ],
    init() {
      const str = "abcabcbb";
      return { arr: str.split(""), l: 0, r: -1, best: 0, seen: {}, line: 0, desc: "begin scan" };
    },
    step(s) {
      if (s.line === 0) return { ...s, line: 1, desc: "start outer loop" };
      if (s.r + 1 >= s.arr.length) return { ...s, line: 5, desc: `done — best window = ${s.best}`, done: true };
      if (s.line === 1) return { ...s, r: s.r + 1, line: 2, desc: `extend r to ${s.r + 1} (char "${s.arr[s.r + 1]}")` };
      if (s.line === 2) {
        if (s.seen[s.arr[s.r]]) {
          return { ...s, line: 2, l: s.l + 1, seen: { ...s.seen, [s.arr[s.l]]: false }, desc: `"${s.arr[s.r]}" already in window — drop a[l]="${s.arr[s.l]}", l += 1` };
        }
        return { ...s, line: 3, desc: "no duplicate — add a[r] to window" };
      }
      if (s.line === 3) return { ...s, line: 4, seen: { ...s.seen, [s.arr[s.r]]: true }, desc: `seen ← ${s.arr[s.r]}` };
      if (s.line === 4) {
        const best = Math.max(s.best, s.r - s.l + 1);
        return { ...s, line: 1, best, desc: best > s.best ? `new best window of length ${best}` : `window length = ${s.r - s.l + 1}, best = ${best}` };
      }
    },
    render(s, stage) {
      const hi = {};
      for (let i = s.l; i <= s.r && i < s.arr.length; i++) hi[i] = "window";
      P.array(stage, { arr: s.arr, pointers: { l: s.l, r: s.r }, highlight: hi });
    },
    readout: s => [{ label: "l", value: s.l }, { label: "r", value: s.r }, { label: "window", value: Math.max(0, s.r - s.l + 1) }, { label: "best", value: s.best }],
  });

  // ---------- Fixed-size window max ---------------------------------
  register("fixed-window-max", {
    title: "Fixed-size sliding window — max sum of k",
    caption: "Add the new right element, subtract the old left element. O(n) instead of O(n·k).",
    code: [
      "sum = sum(a[0..k-1])",
      "best = sum",
      "for r in k..n-1:",
      "  sum += a[r] - a[r-k]",
      "  best = max(best, sum)",
      "return best",
    ],
    init() {
      const arr = [2, 1, 5, 1, 3, 2, 6, 1];
      const k = 3;
      const sum = arr[0] + arr[1] + arr[2];
      return { arr, k, l: 0, r: 2, sum, best: sum, line: 0, desc: `initial window sum a[0..${k - 1}] = ${sum}` };
    },
    step(s) {
      if (s.line === 0) return { ...s, line: 1, desc: `best = ${s.best}` };
      if (s.line === 1) return { ...s, line: 2, desc: "slide window" };
      if (s.r + 1 >= s.arr.length) return { ...s, line: 5, desc: `done — best = ${s.best}`, done: true };
      if (s.line === 2) {
        const add = s.arr[s.r + 1];
        const rem = s.arr[s.l];
        return { ...s, line: 3, l: s.l + 1, r: s.r + 1, sum: s.sum + add - rem, desc: `+a[${s.r + 1}] = +${add},  −a[${s.l}] = −${rem}` };
      }
      if (s.line === 3) {
        const best = Math.max(s.best, s.sum);
        return { ...s, line: 2, best, desc: best > s.best ? `new best = ${best}` : `sum = ${s.sum}` };
      }
    },
    render(s, stage) {
      const hi = {};
      for (let i = s.l; i <= s.r; i++) hi[i] = "window";
      P.array(stage, { arr: s.arr, pointers: { l: s.l, r: s.r }, highlight: hi });
    },
    readout: s => [{ label: "l", value: s.l }, { label: "r", value: s.r }, { label: "sum", value: s.sum }, { label: "best", value: s.best }],
  });

  // ===================================================================
  // PATTERN 3 · BINARY SEARCH
  // ===================================================================

  // ---------- Classic binary search ----------------------------------
  register("binary-search", {
    title: "Classic binary search",
    caption: "Halve the search range each step. lo and hi converge; mid checked against target.",
    code: [
      "lo = 0; hi = n - 1",
      "while lo <= hi:",
      "  mid = (lo + hi) // 2",
      "  if a[mid] == target: return mid",
      "  elif a[mid] < target: lo = mid + 1",
      "  else: hi = mid - 1",
      "return -1",
    ],
    init() {
      return {
        arr: [1, 3, 5, 7, 9, 11, 13, 15, 17, 19],
        target: 13, lo: 0, hi: 9, mid: -1, line: 0,
        desc: "search range = full array",
      };
    },
    step(s) {
      if (s.line === 0) return { ...s, line: 1, desc: `lo = ${s.lo}, hi = ${s.hi}` };
      if (s.lo > s.hi) return { ...s, line: 6, mid: -1, desc: "lo > hi — target not found", done: true };
      if (s.line === 1) {
        const mid = Math.floor((s.lo + s.hi) / 2);
        return { ...s, line: 2, mid, desc: `mid = (${s.lo} + ${s.hi}) // 2 = ${mid}` };
      }
      if (s.line === 2) {
        if (s.arr[s.mid] === s.target) return { ...s, line: 3, desc: `a[${s.mid}] = ${s.arr[s.mid]} = target — found!`, done: true };
        if (s.arr[s.mid] < s.target) return { ...s, line: 4, desc: `a[${s.mid}] = ${s.arr[s.mid]} < ${s.target} — search right half` };
        return { ...s, line: 5, desc: `a[${s.mid}] = ${s.arr[s.mid]} > ${s.target} — search left half` };
      }
      if (s.line === 4) return { ...s, lo: s.mid + 1, line: 1, desc: `lo = mid + 1 = ${s.mid + 1}` };
      if (s.line === 5) return { ...s, hi: s.mid - 1, line: 1, desc: `hi = mid - 1 = ${s.mid - 1}` };
    },
    render(s, stage) {
      const hi = {};
      for (let i = 0; i < s.arr.length; i++) {
        if (i < s.lo || i > s.hi) hi[i] = "ghost";
      }
      if (s.mid >= 0) hi[s.mid] = s.done && s.arr[s.mid] === s.target ? "found" : "cmp";
      const ptrs = { lo: s.lo, hi: s.hi };
      if (s.mid >= 0) ptrs.mid = s.mid;
      // mark target value for reference
      P.array(stage, { arr: s.arr, pointers: ptrs, highlight: hi });
    },
    readout: s => [{ label: "lo", value: s.lo }, { label: "hi", value: s.hi }, { label: "mid", value: s.mid }, { label: "target", value: s.target }],
  });

  // ---------- Binary search on answer (sqrt) --------------------------
  register("bsearch-on-answer", {
    title: "Binary search on answer — integer √n",
    caption: "Search space = candidate answers, not array indices. Predicate: mid² ≤ n.",
    code: [
      "lo = 0; hi = n",
      "while lo <= hi:",
      "  mid = (lo + hi) // 2",
      "  if mid * mid <= n:",
      "    ans = mid; lo = mid + 1",
      "  else:",
      "    hi = mid - 1",
      "return ans",
    ],
    init() {
      return { n: 50, lo: 0, hi: 50, mid: -1, ans: 0, line: 0, desc: "find largest x with x² ≤ 50" };
    },
    step(s) {
      if (s.line === 0) return { ...s, line: 1, desc: "loop while lo ≤ hi" };
      if (s.lo > s.hi) return { ...s, line: 7, desc: `answer = ⌊√${s.n}⌋ = ${s.ans}`, done: true };
      if (s.line === 1) {
        const mid = Math.floor((s.lo + s.hi) / 2);
        return { ...s, mid, line: 2, desc: `mid = ${mid}, mid² = ${mid * mid}` };
      }
      if (s.line === 2) {
        if (s.mid * s.mid <= s.n) return { ...s, line: 3, desc: `${s.mid * s.mid} ≤ ${s.n} — feasible, record and search right` };
        return { ...s, line: 5, desc: `${s.mid * s.mid} > ${s.n} — infeasible, search left` };
      }
      if (s.line === 3) return { ...s, line: 4, ans: s.mid, desc: `ans = ${s.mid}` };
      if (s.line === 4) return { ...s, lo: s.mid + 1, line: 1, desc: `lo = ${s.mid + 1}` };
      if (s.line === 5) return { ...s, line: 6, desc: "skip ans update" };
      if (s.line === 6) return { ...s, hi: s.mid - 1, line: 1, desc: `hi = ${s.mid - 1}` };
    },
    render(s, stage) {
      const arr = Array.from({ length: s.n + 1 }, (_, i) => i);
      const hi = {};
      for (let i = 0; i < arr.length; i++) {
        if (i < s.lo || i > s.hi) hi[i] = "ghost";
      }
      if (s.mid >= 0) hi[s.mid] = "cmp";
      if (s.ans >= 0) hi[s.ans] = "done";
      P.array(stage, {
        arr: arr.map(x => x === s.mid || x === s.ans || (x >= s.lo && x <= s.hi) ? x : ""),
        pointers: { lo: s.lo, hi: s.hi, mid: s.mid, ans: s.ans },
        highlight: hi,
        cellW: 22, cellH: 26, indexed: false,
      });
    },
    readout: s => [{ label: "n", value: s.n }, { label: "lo", value: s.lo }, { label: "hi", value: s.hi }, { label: "mid", value: s.mid }, { label: "ans", value: s.ans }],
  });

  // ===================================================================
  // PATTERN 4 · BFS
  // ===================================================================

  // ---------- BFS on graph ------------------------------------------
  register("bfs-graph", {
    title: "BFS on graph — explore in layers",
    caption: "Queue holds nodes to visit. Pop front, mark visited, enqueue unvisited neighbours.",
    code: [
      "q = [start]; visited = {start}",
      "while q:",
      "  u = q.popleft()",
      "  for v in adj[u]:",
      "    if v not in visited:",
      "      visited.add(v)",
      "      q.append(v)",
    ],
    init() {
      const nodes = [
        { id: 0, x: 60,  y: 60,  val: "A" },
        { id: 1, x: 160, y: 30,  val: "B" },
        { id: 2, x: 160, y: 100, val: "C" },
        { id: 3, x: 260, y: 30,  val: "D" },
        { id: 4, x: 260, y: 100, val: "E" },
        { id: 5, x: 360, y: 60,  val: "F" },
      ];
      const edges = [
        { a: 0, b: 1 }, { a: 0, b: 2 },
        { a: 1, b: 3 }, { a: 2, b: 4 },
        { a: 3, b: 5 }, { a: 4, b: 5 },
        { a: 1, b: 2 },
      ];
      return {
        nodes, edges, queue: [0], visited: { 0: true }, current: -1,
        line: 0, desc: "start at A, push to queue", order: [],
      };
    },
    step(s) {
      if (s.line === 0) return { ...s, line: 1, desc: "loop while queue non-empty" };
      if (!s.queue.length) return { ...s, line: 7, desc: `done — visit order: ${s.order.map(i => s.nodes[i].val).join(" → ")}`, done: true };
      if (s.line === 1) {
        const q = s.queue.slice();
        const u = q.shift();
        return { ...s, queue: q, current: u, line: 2, order: [...s.order, u], desc: `pop ${s.nodes[u].val}` };
      }
      if (s.line === 2) return { ...s, line: 3, desc: `scan neighbours of ${s.nodes[s.current].val}` };
      if (s.line === 3) {
        const u = s.current;
        const neighbours = s.edges.filter(e => e.a === u || e.b === u).map(e => e.a === u ? e.b : e.a);
        const unvisited = neighbours.filter(v => !s.visited[v]);
        if (!unvisited.length) return { ...s, line: 1, desc: `no new neighbours — back to queue` };
        const v = unvisited[0];
        return { ...s, line: 4, visited: { ...s.visited, [v]: true }, queue: [...s.queue, v], desc: `enqueue ${s.nodes[v].val}` };
      }
    },
    render(s, stage) {
      const ns = s.nodes.map(n => {
        let h = null;
        if (s.current === n.id) h = "visit";
        else if (s.queue.includes(n.id)) h = "queue";
        else if (s.visited[n.id]) h = "done";
        if (n.id === 0 && !s.current && !s.queue.length) h = "start";
        return { ...n, highlight: h };
      });
      P.graph(stage, { nodes: ns, edges: s.edges });
    },
    readout: s => [
      { label: "queue", value: s.queue.map(i => s.nodes[i].val).join(",") || "∅" },
      { label: "current", value: s.current >= 0 ? s.nodes[s.current].val : "—" },
      { label: "visited", value: Object.keys(s.visited).length },
    ],
  });

  // ===================================================================
  // PATTERN 5 · DFS
  // ===================================================================

  register("dfs-graph", {
    title: "DFS on graph — go deep first",
    caption: "Stack semantics: push start, pop top, push its unvisited neighbours. Compare with BFS (queue).",
    code: [
      "stack = [start]; visited = {}",
      "while stack:",
      "  u = stack.pop()",
      "  if u in visited: continue",
      "  visited.add(u)",
      "  for v in reversed(adj[u]):",
      "    if v not in visited: stack.append(v)",
    ],
    init() {
      const nodes = [
        { id: 0, x: 60,  y: 60,  val: "A" },
        { id: 1, x: 160, y: 30,  val: "B" },
        { id: 2, x: 160, y: 100, val: "C" },
        { id: 3, x: 260, y: 30,  val: "D" },
        { id: 4, x: 260, y: 100, val: "E" },
        { id: 5, x: 360, y: 60,  val: "F" },
      ];
      const adj = { 0: [1, 2], 1: [3], 2: [4], 3: [5], 4: [5], 5: [] };
      const edges = [
        { a: 0, b: 1, directed: true }, { a: 0, b: 2, directed: true },
        { a: 1, b: 3, directed: true }, { a: 2, b: 4, directed: true },
        { a: 3, b: 5, directed: true }, { a: 4, b: 5, directed: true },
      ];
      return { nodes, edges, adj, stack: [0], visited: {}, current: -1, line: 0, order: [], desc: "push start A" };
    },
    step(s) {
      if (s.line === 0) return { ...s, line: 1, desc: "loop while stack non-empty" };
      if (!s.stack.length) return { ...s, line: 7, desc: `done — visit order: ${s.order.map(i => s.nodes[i].val).join(" → ")}`, done: true };
      if (s.line === 1) {
        const st = s.stack.slice();
        const u = st.pop();
        return { ...s, stack: st, current: u, line: 2, desc: `pop ${s.nodes[u].val}` };
      }
      if (s.line === 2) {
        if (s.visited[s.current]) return { ...s, line: 1, current: -1, desc: "already visited — skip" };
        return { ...s, line: 3, desc: "not yet visited" };
      }
      if (s.line === 3) return { ...s, visited: { ...s.visited, [s.current]: true }, order: [...s.order, s.current], line: 4, desc: `mark ${s.nodes[s.current].val} visited` };
      if (s.line === 4) {
        const u = s.current;
        const ns = (s.adj[u] || []).slice().reverse();
        const toPush = ns.filter(v => !s.visited[v]);
        return { ...s, line: 1, stack: [...s.stack, ...toPush], desc: `push unvisited neighbours: ${toPush.map(i => s.nodes[i].val).join(",") || "(none)"}` };
      }
    },
    render(s, stage) {
      const ns = s.nodes.map(n => {
        let h = null;
        if (s.current === n.id) h = "visit";
        else if (s.visited[n.id]) h = "done";
        else if (s.stack.includes(n.id)) h = "stack";
        return { ...n, highlight: h };
      });
      P.graph(stage, { nodes: ns, edges: s.edges });
    },
    readout: s => [
      { label: "stack(top→)", value: s.stack.slice().reverse().map(i => s.nodes[i].val).join(",") || "∅" },
      { label: "current", value: s.current >= 0 ? s.nodes[s.current].val : "—" },
      { label: "visited", value: Object.keys(s.visited).length },
    ],
  });

  // ---------- Number of Islands -------------------------------------
  register("number-of-islands", {
    title: "Number of Islands — flood fill DFS",
    caption: "Scan the grid. On each unvisited '1', DFS flood-fill the whole island and increment count.",
    code: [
      "count = 0",
      "for r,c in grid:",
      "  if grid[r][c] == '1':",
      "    count += 1",
      "    dfs(r, c)  # flips connected 1s to '#'",
      "return count",
    ],
    init() {
      const g = [
        ["1", "1", "0", "0", "1"],
        ["1", "0", "0", "1", "1"],
        ["0", "0", "1", "0", "0"],
        ["1", "1", "0", "1", "1"],
      ];
      return { grid: g, r: 0, c: -1, count: 0, line: 0, stack: [], desc: "begin scan from (0,0)" };
    },
    step(s) {
      const rows = s.grid.length, cols = s.grid[0].length;
      if (s.stack && s.stack.length) {
        const st = s.stack.slice();
        const [r, c] = st.pop();
        if (r < 0 || c < 0 || r >= rows || c >= cols || s.grid[r][c] !== "1") {
          return { ...s, stack: st, desc: `out of bounds / water at (${r},${c}) — skip` };
        }
        const g = s.grid.map(row => row.slice());
        g[r][c] = "#";
        return { ...s, grid: g, stack: [...st, [r + 1, c], [r - 1, c], [r, c + 1], [r, c - 1]], r, c, line: 5, desc: `flood (${r},${c}) → '#' and push 4 neighbours` };
      }
      let nr = s.r, nc = s.c + 1;
      if (nc >= cols) { nc = 0; nr++; }
      if (nr >= rows) return { ...s, line: 5, desc: `scan complete — ${s.count} islands`, done: true };
      const cell = s.grid[nr][nc];
      if (cell === "1") {
        return { ...s, r: nr, c: nc, count: s.count + 1, stack: [[nr, nc]], line: 3, desc: `(${nr},${nc}) = '1' — new island #${s.count + 1}` };
      }
      return { ...s, r: nr, c: nc, line: 1, desc: `(${nr},${nc}) = '${cell}' — skip` };
    },
    render(s, stage) {
      P.grid(stage, {
        rows: s.grid.length, cols: s.grid[0].length,
        cellOf: (r, c) => {
          const v = s.grid[r][c];
          const isHere = (r === s.r && c === s.c);
          let cls = "water";
          if (v === "1") cls = "land";
          else if (v === "#") cls = "done";
          if (isHere) cls = "visit";
          return { val: v, cls };
        },
      });
    },
    readout: s => [{ label: "(r,c)", value: `(${s.r},${s.c})` }, { label: "islands", value: s.count }, { label: "stack", value: (s.stack || []).length }],
  });

  // ===================================================================
  // PATTERN 6 · BACKTRACKING
  // ===================================================================

  // ---------- Subsets ------------------------------------------------
  register("subsets", {
    title: "Subsets — backtracking",
    caption: "At each index, choose: include nums[i] or skip. Recurse. Every leaf is a subset.",
    code: [
      "def bt(i, path):",
      "  if i == n:",
      "    result.append(path[:])",
      "    return",
      "  bt(i + 1, path)        # skip",
      "  path.append(nums[i])",
      "  bt(i + 1, path)        # include",
      "  path.pop()",
    ],
    init() {
      return { nums: [1, 2, 3], i: 0, path: [], stack: [{ i: 0, path: [], phase: 0 }], result: [], line: 0, desc: "begin at i = 0" };
    },
    step(s) {
      if (!s.stack.length) return { ...s, line: 7, desc: `done — ${s.result.length} subsets`, done: true };
      const st = s.stack.slice();
      const top = st[st.length - 1];
      if (top.i === s.nums.length) {
        st.pop();
        return { ...s, stack: st, path: top.path.slice(), i: top.i, result: [...s.result, top.path.slice()], line: 2, desc: `leaf — record {${top.path.join(",") || "∅"}}` };
      }
      if (top.phase === 0) {
        top.phase = 1;
        st[st.length - 1] = top;
        return { ...s, stack: [...st, { i: top.i + 1, path: top.path.slice(), phase: 0 }], path: top.path.slice(), i: top.i, line: 4, desc: `at i=${top.i}: SKIP nums[${top.i}]=${s.nums[top.i]}` };
      }
      if (top.phase === 1) {
        top.phase = 2;
        st[st.length - 1] = top;
        const newPath = top.path.concat(s.nums[top.i]);
        return { ...s, stack: [...st, { i: top.i + 1, path: newPath, phase: 0 }], path: newPath.slice(), i: top.i, line: 6, desc: `at i=${top.i}: INCLUDE nums[${top.i}]=${s.nums[top.i]} → path=${JSON.stringify(newPath)}` };
      }
      st.pop();
      return { ...s, stack: st, path: top.path.slice(), i: top.i, line: 7, desc: `return from i=${top.i}` };
    },
    render(s, stage) {
      // show nums array + current path + accumulated results
      stage.innerHTML = "";
      const wrap = document.createElement("div");
      wrap.style.display = "flex"; wrap.style.flexDirection = "column"; wrap.style.gap = "0.6rem"; wrap.style.width = "100%";
      const top = document.createElement("div");
      const arrHost = document.createElement("div");
      P.array(arrHost, {
        arr: s.nums,
        pointers: { i: s.i },
        highlight: Object.fromEntries(s.path.map(v => [s.nums.indexOf(v), "done"])),
      });
      top.appendChild(arrHost);
      wrap.appendChild(top);

      const pathRow = document.createElement("div");
      pathRow.style.fontFamily = "var(--md-code-font)";
      pathRow.style.fontSize = "0.78rem";
      pathRow.innerHTML = `<strong>current path:</strong> {${s.path.join(", ") || "∅"}}`;
      wrap.appendChild(pathRow);

      const res = document.createElement("div");
      res.style.fontFamily = "var(--md-code-font)";
      res.style.fontSize = "0.74rem";
      res.style.lineHeight = "1.6";
      res.innerHTML = `<strong>found (${s.result.length}):</strong> ` + s.result.map(p => `{${p.join(",") || "∅"}}`).join(" · ");
      wrap.appendChild(res);
      stage.appendChild(wrap);
    },
    readout: s => [{ label: "i", value: s.i }, { label: "path", value: `{${s.path.join(",")}}` }, { label: "found", value: s.result.length }],
  });

  // ===================================================================
  // PATTERN 7 · HEAP
  // ===================================================================

  // ---------- Top K elements ----------------------------------------
  register("top-k", {
    title: "Top K largest — min-heap of size K",
    caption: "Keep a min-heap of size K. Push each element; if size > K, pop the smallest. End: heap holds K largest.",
    code: [
      "heap = []",
      "for x in nums:",
      "  heapq.heappush(heap, x)",
      "  if len(heap) > k:",
      "    heapq.heappop(heap)",
      "return list(heap)",
    ],
    init() {
      return { nums: [3, 2, 1, 5, 6, 4, 9, 7], k: 3, i: 0, heap: [], line: 0, desc: "k = 3, start scanning" };
    },
    step(s) {
      if (s.i >= s.nums.length) return { ...s, line: 5, desc: `done — top ${s.k}: {${s.heap.join(",")}}`, done: true };
      if (s.line === 0 || s.line === 5) return { ...s, line: 1, desc: `consider nums[${s.i}] = ${s.nums[s.i]}` };
      if (s.line === 1) {
        const heap = [...s.heap, s.nums[s.i]].sort((a, b) => a - b);
        return { ...s, line: 2, heap, desc: `push ${s.nums[s.i]} → heap = {${heap.join(",")}}` };
      }
      if (s.line === 2) {
        if (s.heap.length > s.k) return { ...s, line: 3, desc: `size ${s.heap.length} > k=${s.k} — pop min` };
        return { ...s, line: 5, i: s.i + 1, desc: "size OK, next element" };
      }
      if (s.line === 3) {
        const heap = s.heap.slice(1);
        return { ...s, line: 5, heap, i: s.i + 1, desc: `popped ${s.heap[0]} → heap = {${heap.join(",")}}` };
      }
    },
    render(s, stage) {
      stage.innerHTML = "";
      const wrap = document.createElement("div");
      wrap.style.display = "flex"; wrap.style.flexDirection = "column"; wrap.style.gap = "0.8rem"; wrap.style.width = "100%";
      const arrHost = document.createElement("div");
      P.array(arrHost, { arr: s.nums, pointers: { i: s.i }, highlight: s.i < s.nums.length ? { [s.i]: "cmp" } : {} });
      wrap.appendChild(arrHost);
      const heapHost = document.createElement("div");
      heapHost.innerHTML = `<div style="text-align:center;font-size:0.72rem;color:var(--md-default-fg-color--light);margin-bottom:0.4rem;">min-heap (k=${s.k})</div>`;
      const h2 = document.createElement("div");
      P.array(h2, { arr: s.heap, indexed: false, highlight: s.heap.length ? { 0: "target" } : {} });
      heapHost.appendChild(h2);
      wrap.appendChild(heapHost);
      stage.appendChild(wrap);
    },
    readout: s => [{ label: "i", value: s.i }, { label: "heap size", value: s.heap.length }, { label: "min in heap", value: s.heap[0] ?? "—" }],
  });

  // ===================================================================
  // PATTERN 8 · GRAPH ALGORITHMS
  // ===================================================================

  // ---------- Dijkstra -----------------------------------------------
  register("dijkstra", {
    title: "Dijkstra shortest path",
    caption: "Pop the closest unsettled node; relax all outgoing edges. Greedy + min-heap.",
    code: [
      "dist[s] = 0; pq = [(0, s)]",
      "while pq:",
      "  d, u = heappop(pq)",
      "  if d > dist[u]: continue",
      "  for (v, w) in adj[u]:",
      "    if dist[u] + w < dist[v]:",
      "      dist[v] = dist[u] + w",
      "      heappush(pq, (dist[v], v))",
    ],
    init() {
      const nodes = [
        { id: 0, x: 60,  y: 60,  val: "A" },
        { id: 1, x: 160, y: 30,  val: "B" },
        { id: 2, x: 160, y: 100, val: "C" },
        { id: 3, x: 280, y: 30,  val: "D" },
        { id: 4, x: 280, y: 100, val: "E" },
        { id: 5, x: 380, y: 65,  val: "F" },
      ];
      const edges = [
        { a: 0, b: 1, w: 4, directed: true }, { a: 0, b: 2, w: 1, directed: true },
        { a: 2, b: 1, w: 2, directed: true }, { a: 1, b: 3, w: 5, directed: true },
        { a: 2, b: 4, w: 8, directed: true }, { a: 3, b: 5, w: 2, directed: true },
        { a: 4, b: 5, w: 1, directed: true }, { a: 1, b: 4, w: 3, directed: true },
      ];
      const dist = { 0: 0, 1: Infinity, 2: Infinity, 3: Infinity, 4: Infinity, 5: Infinity };
      return { nodes, edges, dist, pq: [[0, 0]], settled: {}, current: -1, line: 0, relax: null, desc: "dist[A] = 0, push (0, A)" };
    },
    step(s) {
      if (s.line === 0) return { ...s, line: 1, desc: "loop while pq non-empty" };
      if (!s.pq.length) return { ...s, line: 8, desc: "pq empty — done", done: true };
      if (s.line === 1) {
        const pq = s.pq.slice().sort((a, b) => a[0] - b[0]);
        const [d, u] = pq.shift();
        return { ...s, pq, current: u, line: 2, desc: `pop (${d}, ${s.nodes[u].val})` };
      }
      if (s.line === 2) {
        if (s.settled[s.current]) return { ...s, line: 1, current: -1, desc: `already settled — skip` };
        return { ...s, settled: { ...s.settled, [s.current]: true }, line: 3, desc: `settle ${s.nodes[s.current].val} at dist ${s.dist[s.current]}` };
      }
      if (s.line === 3) {
        const u = s.current;
        const out = s.edges.filter(e => e.a === u);
        const toRelax = out.find(e => s.dist[u] + e.w < s.dist[e.b]);
        if (!toRelax) return { ...s, line: 1, desc: "no improvable edges — back to pop" };
        return { ...s, relax: toRelax, line: 4, desc: `try edge ${s.nodes[u].val}→${s.nodes[toRelax.b].val} (w=${toRelax.w})` };
      }
      if (s.line === 4) {
        const u = s.current, e = s.relax;
        const nd = s.dist[u] + e.w;
        const dist = { ...s.dist, [e.b]: nd };
        const pq = [...s.pq, [nd, e.b]];
        return { ...s, dist, pq, line: 3, relax: null, desc: `dist[${s.nodes[e.b].val}] = ${nd} (was ${s.dist[e.b] === Infinity ? "∞" : s.dist[e.b]}); push` };
      }
    },
    render(s, stage) {
      const ns = s.nodes.map(n => {
        let h = null;
        if (s.current === n.id) h = "visit";
        else if (s.settled[n.id]) h = "done";
        else if (s.dist[n.id] !== Infinity) h = "queue";
        if (n.id === 0 && !Object.keys(s.settled).length) h = "start";
        return { ...n, highlight: h, tag: s.dist[n.id] === Infinity ? "∞" : String(s.dist[n.id]) };
      });
      const es = s.edges.map(e => ({
        ...e, highlight: (s.relax && s.relax.a === e.a && s.relax.b === e.b) ? "active" :
                          s.settled[e.a] ? "done" : null,
      }));
      P.graph(stage, { nodes: ns, edges: es });
    },
    readout: s => [
      { label: "current", value: s.current >= 0 ? s.nodes[s.current].val : "—" },
      { label: "pq", value: s.pq.length },
      { label: "settled", value: Object.keys(s.settled).length },
    ],
  });

  // ---------- Topological sort (Kahn) -------------------------------
  register("topo-sort", {
    title: "Topological sort — Kahn's algorithm",
    caption: "Repeatedly pop a node with in-degree 0 and decrement in-degree of its children. A cycle ⇔ some node never reaches 0.",
    code: [
      "indeg = compute_indegrees()",
      "q = [u for u in V if indeg[u] == 0]",
      "while q:",
      "  u = q.popleft()",
      "  result.append(u)",
      "  for v in adj[u]:",
      "    indeg[v] -= 1",
      "    if indeg[v] == 0: q.append(v)",
    ],
    init() {
      const nodes = [
        { id: 0, x: 60,  y: 60, val: "A" },
        { id: 1, x: 60,  y: 130, val: "B" },
        { id: 2, x: 180, y: 60, val: "C" },
        { id: 3, x: 180, y: 130, val: "D" },
        { id: 4, x: 300, y: 95, val: "E" },
        { id: 5, x: 410, y: 95, val: "F" },
      ];
      const edges = [
        { a: 0, b: 2, directed: true }, { a: 1, b: 2, directed: true },
        { a: 1, b: 3, directed: true }, { a: 2, b: 4, directed: true },
        { a: 3, b: 4, directed: true }, { a: 4, b: 5, directed: true },
      ];
      const indeg = { 0: 0, 1: 0, 2: 2, 3: 1, 4: 2, 5: 1 };
      return { nodes, edges, indeg, queue: [0, 1], result: [], current: -1, line: 0, desc: "in-degree 0: A, B → queue" };
    },
    step(s) {
      if (s.line === 0) return { ...s, line: 1, desc: "loop while queue non-empty" };
      if (!s.queue.length) return { ...s, line: 7, desc: `topo order: ${s.result.map(i => s.nodes[i].val).join(" → ")}`, done: true };
      if (s.line === 1) {
        const q = s.queue.slice();
        const u = q.shift();
        return { ...s, queue: q, current: u, result: [...s.result, u], line: 2, desc: `pop ${s.nodes[u].val}` };
      }
      if (s.line === 2) {
        const u = s.current;
        const next = s.edges.find(e => e.a === u && s.indeg[e.b] > 0);
        if (!next) return { ...s, line: 1, desc: "no outgoing left — back to pop" };
        const indeg = { ...s.indeg, [next.b]: s.indeg[next.b] - 1 };
        const queue = indeg[next.b] === 0 ? [...s.queue, next.b] : s.queue;
        return { ...s, line: 5, indeg, queue, desc: `decrement in-deg(${s.nodes[next.b].val}) → ${indeg[next.b]}${indeg[next.b] === 0 ? "  ✓ enqueue" : ""}` };
      }
    },
    render(s, stage) {
      const ns = s.nodes.map(n => {
        let h = null;
        if (s.current === n.id) h = "visit";
        else if (s.result.includes(n.id)) h = "done";
        else if (s.queue.includes(n.id)) h = "queue";
        return { ...n, highlight: h, tag: `in:${s.indeg[n.id]}` };
      });
      P.graph(stage, { nodes: ns, edges: s.edges });
    },
    readout: s => [
      { label: "queue", value: s.queue.map(i => s.nodes[i].val).join(",") || "∅" },
      { label: "result", value: s.result.map(i => s.nodes[i].val).join(",") || "—" },
    ],
  });

  // ---------- Union-Find --------------------------------------------
  register("union-find", {
    title: "Union-Find — path compression + union by rank",
    caption: "find(x) climbs to the root; union merges trees by attaching the shorter to the taller. Amortized α(n).",
    code: [
      "def find(x):",
      "  if parent[x] != x:",
      "    parent[x] = find(parent[x])",
      "  return parent[x]",
      "def union(x, y):",
      "  rx, ry = find(x), find(y)",
      "  if rx == ry: return",
      "  attach smaller-rank under larger",
    ],
    init() {
      const ops = [["u", 0, 1], ["u", 2, 3], ["u", 1, 2], ["u", 4, 5], ["u", 3, 5]];
      return {
        n: 6, parent: [0, 1, 2, 3, 4, 5], rank: [0, 0, 0, 0, 0, 0],
        ops, opIdx: 0, line: 0, current: null, desc: "start: 6 singletons",
      };
    },
    step(s) {
      if (s.opIdx >= s.ops.length) return { ...s, line: 7, desc: "all ops applied", done: true };
      const op = s.ops[s.opIdx];
      const [, x, y] = op;
      const find = (parent, x) => parent[x] === x ? x : find(parent, parent[x]);
      const rx = find(s.parent, x);
      const ry = find(s.parent, y);
      const parent = s.parent.slice();
      const rank = s.rank.slice();
      if (rx === ry) {
        return { ...s, opIdx: s.opIdx + 1, line: 6, current: { x, y, rx, ry, same: true }, desc: `union(${x},${y}): roots equal (${rx}) — skip` };
      }
      if (rank[rx] < rank[ry]) parent[rx] = ry;
      else if (rank[rx] > rank[ry]) parent[ry] = rx;
      else { parent[ry] = rx; rank[rx]++; }
      return { ...s, opIdx: s.opIdx + 1, parent, rank, line: 7, current: { x, y, rx, ry }, desc: `union(${x},${y}): root(${x})=${rx}, root(${y})=${ry} → merge` };
    },
    render(s, stage) {
      // draw as a graph: each node connected to its parent
      const cols = 6;
      const nodes = s.parent.map((p, i) => ({ id: i, x: 50 + i * 70, y: 60, val: i, tag: `r${s.rank[i]}` }));
      const edges = [];
      s.parent.forEach((p, i) => {
        if (p !== i) edges.push({ a: i, b: p, directed: true });
      });
      // highlight current op
      if (s.current) {
        const { rx, ry } = s.current;
        nodes.forEach(n => {
          const find = (parent, x) => parent[x] === x ? x : find(parent, parent[x]);
          const r = find(s.parent, n.id);
          if (r === rx || r === ry) n.highlight = r === rx ? "visit" : "queue";
        });
      }
      // place by tree level
      const find = (parent, x) => parent[x] === x ? x : find(parent, parent[x]);
      const components = {};
      s.parent.forEach((p, i) => {
        const r = find(s.parent, i);
        (components[r] = components[r] || []).push(i);
      });
      let cx = 60;
      Object.keys(components).forEach(rootKey => {
        const root = +rootKey;
        const members = components[root].sort();
        // place root in center top, others below
        nodes[root].x = cx + (members.length - 1) * 30;
        nodes[root].y = 50;
        members.filter(m => m !== root).forEach((m, i) => {
          nodes[m].x = cx + i * 60;
          nodes[m].y = 130;
        });
        cx += Math.max(120, members.length * 60 + 20);
      });
      P.graph(stage, { nodes, edges });
    },
    readout: s => {
      const find = (parent, x) => parent[x] === x ? x : find(parent, parent[x]);
      const roots = new Set();
      s.parent.forEach((_, i) => roots.add(find(s.parent, i)));
      const op = s.opIdx < s.ops.length ? s.ops[s.opIdx] : null;
      return [
        { label: "components", value: roots.size },
        { label: "next op", value: op ? `union(${op[1]},${op[2]})` : "—" },
      ];
    },
  });

  // ===================================================================
  // PATTERN 9 · DYNAMIC PROGRAMMING
  // ===================================================================

  // ---------- Fibonacci (tabulation) --------------------------------
  register("fibonacci-dp", {
    title: "Fibonacci — bottom-up tabulation",
    caption: "dp[i] = dp[i-1] + dp[i-2]. Each cell reads two cells to its left.",
    code: [
      "dp = [0]*(n+1)",
      "dp[0] = 0; dp[1] = 1",
      "for i in 2..n:",
      "  dp[i] = dp[i-1] + dp[i-2]",
      "return dp[n]",
    ],
    init() {
      const n = 9;
      const dp = new Array(n + 1).fill(null);
      dp[0] = 0; dp[1] = 1;
      return { n, dp, i: 2, line: 0, desc: "base cases dp[0]=0, dp[1]=1" };
    },
    step(s) {
      if (s.i > s.n) return { ...s, line: 4, desc: `dp[${s.n}] = ${s.dp[s.n]}`, done: true };
      if (s.line === 0) return { ...s, line: 1, desc: "base cases set" };
      if (s.line === 1) return { ...s, line: 2, desc: `compute dp[${s.i}]` };
      if (s.line === 2) {
        const dp = s.dp.slice();
        dp[s.i] = dp[s.i - 1] + dp[s.i - 2];
        return { ...s, dp, line: 3, desc: `dp[${s.i}] = dp[${s.i - 1}] + dp[${s.i - 2}] = ${dp[s.i - 1]} + ${dp[s.i - 2]} = ${dp[s.i]}` };
      }
      if (s.line === 3) return { ...s, i: s.i + 1, line: 1, desc: "next i" };
    },
    render(s, stage) {
      P.dpTable(stage, {
        rows: 1, cols: s.n + 1,
        colLabels: Array.from({ length: s.n + 1 }, (_, i) => `i=${i}`),
        cellOf: (r, c) => {
          let cls = "filled";
          if (s.dp[c] == null) cls = "";
          if (c === s.i) cls = "current";
          if (c === s.i - 1 || c === s.i - 2) cls = "read";
          if (s.done && c === s.n) cls = "answer";
          return { val: s.dp[c] == null ? "" : s.dp[c], cls };
        },
      });
    },
    readout: s => [{ label: "i", value: s.i }, { label: "dp[i-1]", value: s.dp[s.i - 1] ?? "" }, { label: "dp[i-2]", value: s.dp[s.i - 2] ?? "" }],
  });

  // ---------- Coin Change -------------------------------------------
  register("coin-change", {
    title: "Coin Change — min coins for amount",
    caption: "dp[a] = min over coins c of (dp[a-c] + 1). ∞ means unreachable.",
    code: [
      "dp = [∞]*(amount+1)",
      "dp[0] = 0",
      "for a in 1..amount:",
      "  for c in coins:",
      "    if c <= a:",
      "      dp[a] = min(dp[a], dp[a-c] + 1)",
      "return dp[amount] (or -1)",
    ],
    init() {
      const coins = [1, 3, 4];
      const amount = 7;
      const dp = new Array(amount + 1).fill(Infinity);
      dp[0] = 0;
      return { coins, amount, dp, a: 1, ci: 0, line: 0, desc: "base dp[0]=0" };
    },
    step(s) {
      if (s.a > s.amount) {
        return { ...s, line: 6, desc: `dp[${s.amount}] = ${s.dp[s.amount] === Infinity ? "-1" : s.dp[s.amount]}`, done: true };
      }
      if (s.ci >= s.coins.length) return { ...s, a: s.a + 1, ci: 0, line: 2, desc: `next amount = ${s.a + 1}` };
      const c = s.coins[s.ci];
      if (c > s.a) return { ...s, ci: s.ci + 1, line: 3, desc: `coin ${c} > ${s.a} — skip` };
      const cand = s.dp[s.a - c] === Infinity ? Infinity : s.dp[s.a - c] + 1;
      const dp = s.dp.slice();
      const before = dp[s.a];
      dp[s.a] = Math.min(dp[s.a], cand);
      return {
        ...s, dp, ci: s.ci + 1, line: 5,
        desc: `a=${s.a}, coin=${c}: dp[${s.a - c}]+1 = ${cand === Infinity ? "∞" : cand}; dp[${s.a}] = ${dp[s.a] === Infinity ? "∞" : dp[s.a]}${before !== dp[s.a] ? "  ✓ updated" : ""}`,
      };
    },
    render(s, stage) {
      P.dpTable(stage, {
        rows: 1, cols: s.amount + 1,
        colLabels: Array.from({ length: s.amount + 1 }, (_, i) => i),
        cellOf: (r, c) => {
          const v = s.dp[c];
          let cls = v === Infinity ? "" : "filled";
          if (c === s.a) cls = "current";
          if (s.ci < s.coins.length && c === s.a - s.coins[s.ci] && c >= 0) cls = "read";
          if (s.done && c === s.amount) cls = "answer";
          return { val: v === Infinity ? "∞" : v, cls };
        },
      });
    },
    readout: s => [
      { label: "a", value: s.a }, { label: "coin", value: s.coins[s.ci] ?? "—" },
      { label: "dp[a]", value: s.dp[s.a] === Infinity ? "∞" : s.dp[s.a] },
    ],
  });

  // ---------- LCS (Longest Common Subsequence) ----------------------
  register("lcs", {
    title: "Longest Common Subsequence — 2D DP",
    caption: "dp[i][j] = LCS of a[..i] and b[..j]. Match: dp[i-1][j-1]+1. Mismatch: max(dp[i-1][j], dp[i][j-1]).",
    code: [
      "for i in 1..m:",
      "  for j in 1..n:",
      "    if a[i-1] == b[j-1]:",
      "      dp[i][j] = dp[i-1][j-1] + 1",
      "    else:",
      "      dp[i][j] = max(dp[i-1][j], dp[i][j-1])",
      "return dp[m][n]",
    ],
    init() {
      const a = "AGCAT", b = "GAC";
      const m = a.length, n = b.length;
      const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
      return { a, b, m, n, dp, i: 1, j: 1, line: 0, desc: "base row/col are zeros" };
    },
    step(s) {
      if (s.i > s.m) return { ...s, line: 6, desc: `LCS length = dp[${s.m}][${s.n}] = ${s.dp[s.m][s.n]}`, done: true };
      const ai = s.a[s.i - 1], bj = s.b[s.j - 1];
      const dp = s.dp.map(r => r.slice());
      let action;
      if (ai === bj) {
        dp[s.i][s.j] = dp[s.i - 1][s.j - 1] + 1;
        action = `'${ai}' == '${bj}' → dp[${s.i}][${s.j}] = dp[${s.i - 1}][${s.j - 1}] + 1 = ${dp[s.i][s.j]}`;
      } else {
        dp[s.i][s.j] = Math.max(dp[s.i - 1][s.j], dp[s.i][s.j - 1]);
        action = `'${ai}' ≠ '${bj}' → max(dp[${s.i - 1}][${s.j}]=${dp[s.i - 1][s.j]}, dp[${s.i}][${s.j - 1}]=${dp[s.i][s.j - 1]}) = ${dp[s.i][s.j]}`;
      }
      let ni = s.i, nj = s.j + 1;
      if (nj > s.n) { nj = 1; ni++; }
      return { ...s, dp, i: ni, j: nj, line: ai === bj ? 3 : 5, desc: action };
    },
    render(s, stage) {
      P.dpTable(stage, {
        rows: s.m + 1, cols: s.n + 1,
        rowLabels: ["·", ...s.a.split("")],
        colLabels: ["·", ...s.b.split("")],
        cellOf: (r, c) => {
          let cls = "filled";
          if (r === 0 || c === 0) cls = "base";
          if (r === s.i && c === s.j && !s.done) cls = "current";
          else if ((r === s.i - 1 && c === s.j - 1) || (r === s.i - 1 && c === s.j) || (r === s.i && c === s.j - 1)) {
            if (!s.done) cls = "read";
          }
          if (s.done && r === s.m && c === s.n) cls = "answer";
          return { val: s.dp[r][c], cls };
        },
      });
    },
    readout: s => [{ label: "i", value: s.i }, { label: "j", value: s.j }, { label: "dp[i][j]", value: s.i <= s.m && s.j <= s.n ? s.dp[s.i][s.j] : "—" }],
  });

  // ---------- 0/1 Knapsack ------------------------------------------
  register("knapsack-01", {
    title: "0/1 Knapsack — 2D DP",
    caption: "dp[i][w] = max value using first i items and capacity w. Take vs skip.",
    code: [
      "for i in 1..N:",
      "  for w in 0..W:",
      "    dp[i][w] = dp[i-1][w]  # skip",
      "    if wt[i-1] <= w:",
      "      dp[i][w] = max(dp[i][w],",
      "        dp[i-1][w-wt[i-1]] + val[i-1])  # take",
    ],
    init() {
      const wt = [2, 3, 4, 5];
      const val = [3, 4, 5, 6];
      const W = 5;
      const N = wt.length;
      const dp = Array.from({ length: N + 1 }, () => new Array(W + 1).fill(0));
      return { wt, val, W, N, dp, i: 1, w: 0, line: 0, desc: "base row = 0 items" };
    },
    step(s) {
      if (s.i > s.N) return { ...s, line: 6, desc: `max value = dp[${s.N}][${s.W}] = ${s.dp[s.N][s.W]}`, done: true };
      const dp = s.dp.map(r => r.slice());
      const wi = s.wt[s.i - 1], vi = s.val[s.i - 1];
      let action;
      dp[s.i][s.w] = dp[s.i - 1][s.w];
      if (wi <= s.w) {
        const take = dp[s.i - 1][s.w - wi] + vi;
        const before = dp[s.i][s.w];
        dp[s.i][s.w] = Math.max(dp[s.i][s.w], take);
        action = `(i=${s.i}, w=${s.w}) skip=${dp[s.i - 1][s.w]}, take=${take} → ${dp[s.i][s.w]}`;
      } else {
        action = `(i=${s.i}, w=${s.w}) wt=${wi} > ${s.w} — must skip → ${dp[s.i][s.w]}`;
      }
      let ni = s.i, nw = s.w + 1;
      if (nw > s.W) { nw = 0; ni++; }
      return { ...s, dp, i: ni, w: nw, line: 4, desc: action };
    },
    render(s, stage) {
      P.dpTable(stage, {
        rows: s.N + 1, cols: s.W + 1,
        rowLabels: ["·", ...s.wt.map((w, i) => `${s.val[i]}/${w}`)],
        colLabels: Array.from({ length: s.W + 1 }, (_, i) => `w=${i}`),
        cellOf: (r, c) => {
          let cls = "filled";
          if (r === 0) cls = "base";
          if (r === s.i && c === s.w && !s.done) cls = "current";
          if (s.done && r === s.N && c === s.W) cls = "answer";
          return { val: s.dp[r][c], cls };
        },
      });
    },
    readout: s => [{ label: "i", value: s.i }, { label: "w", value: s.w }, { label: "dp[i][w]", value: s.i <= s.N ? s.dp[s.i][s.w] : "—" }],
  });

  // ===================================================================
  // PATTERN 13 · SORTING
  // ===================================================================

  // ---------- Bubble sort -------------------------------------------
  register("bubble-sort", {
    title: "Bubble sort — adjacent swaps",
    caption: "Repeatedly compare adjacent pairs; swap if out of order. After pass k the k largest are sorted at the end.",
    code: [
      "for i in 0..n-1:",
      "  for j in 0..n-2-i:",
      "    if a[j] > a[j+1]:",
      "      swap(a[j], a[j+1])",
    ],
    init() {
      return { arr: [5, 2, 8, 1, 4, 7, 3], i: 0, j: 0, line: 0, sorted: 0, desc: "outer pass 0" };
    },
    step(s) {
      const n = s.arr.length;
      if (s.i >= n - 1) return { ...s, line: 4, sorted: n, desc: "sorted", done: true };
      if (s.j >= n - 1 - s.i) return { ...s, i: s.i + 1, j: 0, sorted: s.sorted + 1, line: 0, desc: `pass ${s.i} done` };
      if (s.line === 0 || s.line === 1) {
        return { ...s, line: 2, desc: `compare a[${s.j}]=${s.arr[s.j]} vs a[${s.j + 1}]=${s.arr[s.j + 1]}` };
      }
      if (s.line === 2) {
        if (s.arr[s.j] > s.arr[s.j + 1]) return { ...s, line: 3, desc: "out of order — swap" };
        return { ...s, line: 1, j: s.j + 1, desc: "in order — advance j" };
      }
      if (s.line === 3) {
        const arr = s.arr.slice();
        [arr[s.j], arr[s.j + 1]] = [arr[s.j + 1], arr[s.j]];
        return { ...s, arr, line: 1, j: s.j + 1, desc: `swapped → ${arr.join(",")}` };
      }
    },
    render(s, stage) {
      const n = s.arr.length;
      const hi = {};
      for (let k = n - s.sorted; k < n; k++) hi[k] = "done";
      hi[s.j] = "cmp"; hi[s.j + 1] = "cmp";
      if (s.line === 3) { hi[s.j] = "swap"; hi[s.j + 1] = "swap"; }
      P.array(stage, { arr: s.arr, pointers: { j: s.j }, highlight: hi });
    },
    readout: s => [{ label: "i", value: s.i }, { label: "j", value: s.j }, { label: "sorted", value: s.sorted }],
  });

  // ---------- Quick sort (partitioning step) ------------------------
  register("quick-sort", {
    title: "Quicksort — Lomuto partition",
    caption: "Pick a pivot. Walk i,j; whenever a[j] ≤ pivot, swap a[i++] and a[j]. After: pivot lands at index i.",
    code: [
      "def partition(a, lo, hi):",
      "  pivot = a[hi]; i = lo",
      "  for j in lo..hi-1:",
      "    if a[j] <= pivot:",
      "      swap(a[i], a[j]); i += 1",
      "  swap(a[i], a[hi])",
      "  return i",
    ],
    init() {
      const arr = [7, 2, 1, 8, 6, 3, 5, 4];
      return { arr, lo: 0, hi: 7, i: 0, j: 0, pivot: 4, line: 0, desc: "pivot = a[hi] = 4" };
    },
    step(s) {
      if (s.j >= s.hi) {
        // final swap pivot to i
        if (s.line !== 5) return { ...s, line: 5, desc: `swap a[${s.i}] and a[${s.hi}] (pivot)` };
        const a = s.arr.slice();
        [a[s.i], a[s.hi]] = [a[s.hi], a[s.i]];
        return { ...s, arr: a, line: 6, desc: `partition done — pivot at index ${s.i}`, done: true };
      }
      if (s.line === 0 || s.line === 1) return { ...s, line: 2, desc: `compare a[${s.j}]=${s.arr[s.j]} vs pivot=${s.pivot}` };
      if (s.line === 2) {
        if (s.arr[s.j] <= s.pivot) return { ...s, line: 3, desc: "≤ pivot — swap & advance i" };
        return { ...s, line: 2, j: s.j + 1, desc: "> pivot — only j++" };
      }
      if (s.line === 3) {
        const a = s.arr.slice();
        [a[s.i], a[s.j]] = [a[s.j], a[s.i]];
        return { ...s, arr: a, line: 4, desc: `swap a[${s.i}] ↔ a[${s.j}]; i → ${s.i + 1}` };
      }
      if (s.line === 4) return { ...s, i: s.i + 1, j: s.j + 1, line: 1, desc: "advance" };
    },
    render(s, stage) {
      const hi = {};
      hi[s.hi] = "pivot";
      if (s.j < s.hi) hi[s.j] = "cmp";
      hi[s.i] = s.i === s.j ? "cmp" : "target";
      for (let k = s.lo; k < s.i; k++) if (!hi[k]) hi[k] = "done";
      P.array(stage, { arr: s.arr, pointers: { i: s.i, j: s.j, pivot: s.hi }, highlight: hi });
    },
    readout: s => [{ label: "pivot", value: s.pivot }, { label: "i", value: s.i }, { label: "j", value: s.j }],
  });

  // ---------- Merge sort (merging step) -----------------------------
  register("merge-sort", {
    title: "Merge sort — merge two halves",
    caption: "Two sorted halves are walked with pointers i and j; the smaller front element is appended to the output.",
    code: [
      "i = lo; j = mid",
      "while i < mid and j < hi:",
      "  if a[i] <= a[j]: out.append(a[i]); i += 1",
      "  else: out.append(a[j]); j += 1",
      "append leftovers",
    ],
    init() {
      const left = [1, 4, 5, 8];
      const right = [2, 3, 6, 7];
      return { left, right, i: 0, j: 0, out: [], line: 0, desc: "two sorted halves; merge them" };
    },
    step(s) {
      if (s.i >= s.left.length && s.j >= s.right.length) {
        return { ...s, line: 4, desc: `merged = ${s.out.join(",")}`, done: true };
      }
      if (s.i >= s.left.length) return { ...s, out: [...s.out, s.right[s.j]], j: s.j + 1, line: 4, desc: `left exhausted — take ${s.right[s.j]}` };
      if (s.j >= s.right.length) return { ...s, out: [...s.out, s.left[s.i]], i: s.i + 1, line: 4, desc: `right exhausted — take ${s.left[s.i]}` };
      const li = s.left[s.i], rj = s.right[s.j];
      if (li <= rj) return { ...s, out: [...s.out, li], i: s.i + 1, line: 2, desc: `${li} ≤ ${rj} — take left` };
      return { ...s, out: [...s.out, rj], j: s.j + 1, line: 3, desc: `${rj} < ${li} — take right` };
    },
    render(s, stage) {
      stage.innerHTML = "";
      const wrap = document.createElement("div");
      wrap.style.display = "flex"; wrap.style.flexDirection = "column"; wrap.style.gap = "0.6rem"; wrap.style.width = "100%";
      const row1 = document.createElement("div");
      P.array(row1, { arr: s.left, pointers: { i: s.i }, highlight: s.i < s.left.length ? { [s.i]: "cmp" } : {} });
      wrap.appendChild(row1);
      const row2 = document.createElement("div");
      P.array(row2, { arr: s.right, pointers: { j: s.j }, highlight: s.j < s.right.length ? { [s.j]: "cmp" } : {} });
      wrap.appendChild(row2);
      const row3 = document.createElement("div");
      P.array(row3, { arr: s.out, indexed: false, highlight: Object.fromEntries(s.out.map((_, k) => [k, "done"])) });
      wrap.appendChild(row3);
      stage.appendChild(wrap);
    },
    readout: s => [{ label: "i", value: s.i }, { label: "j", value: s.j }, { label: "out", value: s.out.length }],
  });

  // ===================================================================
  // PATTERN 14 · LINKED LIST
  // ===================================================================

  // ---------- Reverse linked list -----------------------------------
  register("reverse-linked-list", {
    title: "Reverse linked list — prev/curr/next",
    caption: "Walk forward with curr. Before advancing, redirect curr.next to prev, then slide both forward.",
    code: [
      "prev = None; curr = head",
      "while curr is not None:",
      "  nxt = curr.next",
      "  curr.next = prev",
      "  prev = curr",
      "  curr = nxt",
      "return prev",
    ],
    init() {
      return {
        nodes: [{ val: 1 }, { val: 2 }, { val: 3 }, { val: 4 }, { val: 5 }],
        prev: -1, curr: 0, nxt: null, line: 0, reversed: 0, desc: "prev = ∅, curr = head",
      };
    },
    step(s) {
      if (s.curr >= s.nodes.length) return { ...s, line: 6, desc: `new head = node ${s.nodes[s.prev].val}`, done: true };
      if (s.line === 0) return { ...s, line: 1, desc: "loop while curr != ∅" };
      if (s.line === 1) return { ...s, line: 2, nxt: s.curr + 1, desc: `nxt = curr.next` };
      if (s.line === 2) return { ...s, line: 3, desc: `redirect curr.next = prev` };
      if (s.line === 3) return { ...s, line: 4, reversed: s.reversed + 1, desc: `prev = curr` };
      if (s.line === 4) return { ...s, line: 5, prev: s.curr, desc: "advance" };
      if (s.line === 5) return { ...s, curr: s.nxt, line: 1, desc: `curr = nxt` };
    },
    render(s, stage) {
      // we present the original ordering but mark how many have been reversed
      const nodes = s.nodes.map((n, i) => {
        let h = null;
        if (i === s.curr) h = "visit";
        else if (i < s.curr && i >= 0) h = "done";
        return { val: n.val, highlight: h };
      });
      const ptrs = {};
      if (s.prev >= 0) ptrs.prev = s.prev;
      if (s.curr < s.nodes.length) ptrs.curr = s.curr;
      if (s.nxt != null && s.nxt < s.nodes.length) ptrs.nxt = s.nxt;
      P.linkedList(stage, { nodes, pointers: ptrs });
    },
    readout: s => [{ label: "reversed", value: s.reversed }, { label: "prev", value: s.prev >= 0 ? s.nodes[s.prev].val : "∅" }, { label: "curr", value: s.curr < s.nodes.length ? s.nodes[s.curr].val : "∅" }],
  });

  // ---------- Floyd cycle detection ---------------------------------
  register("floyd-cycle", {
    title: "Floyd cycle detection — tortoise & hare",
    caption: "slow moves 1, fast moves 2. If a cycle exists, they meet inside it; otherwise fast reaches null.",
    code: [
      "slow = fast = head",
      "while fast and fast.next:",
      "  slow = slow.next",
      "  fast = fast.next.next",
      "  if slow == fast: return True  # cycle",
      "return False",
    ],
    init() {
      // list 1→2→3→4→5→3 (cycle back to index 2)
      return {
        nodes: [{ val: 1 }, { val: 2 }, { val: 3 }, { val: 4 }, { val: 5 }],
        cycleTo: 2,
        slow: 0, fast: 0, line: 0, desc: "both start at head", met: false,
      };
    },
    step(s) {
      if (s.line === 0) return { ...s, line: 1, desc: "loop guard" };
      if (s.line === 1) {
        const advance = (idx, n) => {
          for (let k = 0; k < n; k++) {
            if (idx === s.nodes.length - 1) idx = s.cycleTo;
            else idx++;
          }
          return idx;
        };
        const ns = advance(s.slow, 1);
        const nf = advance(s.fast, 2);
        const met = ns === nf;
        return { ...s, slow: ns, fast: nf, line: met ? 4 : 1, met, desc: met ? `slow == fast at node ${s.nodes[ns].val} — cycle detected!` : `slow → ${s.nodes[ns].val}, fast → ${s.nodes[nf].val}`, done: met };
      }
    },
    render(s, stage) {
      const nodes = s.nodes.map((n, i) => {
        let h = null;
        if (i === s.slow && i === s.fast) h = "cycle";
        else if (i === s.slow) h = "visit";
        else if (i === s.fast) h = "done";
        return { val: n.val, highlight: h };
      });
      // We render as straight list + add a cycle arc note
      P.linkedList(stage, { nodes, pointers: { slow: s.slow, fast: s.fast } });
    },
    readout: s => [
      { label: "slow", value: s.nodes[s.slow].val },
      { label: "fast", value: s.nodes[s.fast].val },
      { label: "met?", value: s.met ? "yes" : "no" },
    ],
  });

  // ===================================================================
  // PATTERN 15 · MONOTONIC STACK
  // ===================================================================

  // ---------- Next Greater Element ----------------------------------
  register("next-greater", {
    title: "Next Greater Element — monotonic stack",
    caption: "Walk left→right. Stack holds indices waiting for a greater value. On each a[i], pop everything smaller and answer them with a[i].",
    code: [
      "res = [-1]*n; stack = []",
      "for i in 0..n-1:",
      "  while stack and a[stack[-1]] < a[i]:",
      "    res[stack.pop()] = a[i]",
      "  stack.append(i)",
      "return res",
    ],
    init() {
      const arr = [2, 1, 5, 6, 2, 3];
      return { arr, i: 0, stack: [], res: arr.map(() => -1), line: 0, desc: "begin scan" };
    },
    step(s) {
      if (s.i >= s.arr.length) return { ...s, line: 5, desc: `result = [${s.res.join(",")}]`, done: true };
      if (s.line === 0) return { ...s, line: 1, desc: `consider a[${s.i}] = ${s.arr[s.i]}` };
      if (s.line === 1) {
        if (s.stack.length && s.arr[s.stack[s.stack.length - 1]] < s.arr[s.i]) {
          const st = s.stack.slice();
          const idx = st.pop();
          const res = s.res.slice();
          res[idx] = s.arr[s.i];
          return { ...s, stack: st, res, line: 2, desc: `a[${idx}]=${s.arr[idx]} < ${s.arr[s.i]} — pop; answer res[${idx}] = ${s.arr[s.i]}` };
        }
        return { ...s, line: 4, desc: `push ${s.i}` };
      }
      if (s.line === 2) return { ...s, line: 1, desc: "loop while-condition" };
      if (s.line === 4) return { ...s, stack: [...s.stack, s.i], i: s.i + 1, line: 0, desc: `stack = [${[...s.stack, s.i].join(",")}]` };
    },
    render(s, stage) {
      stage.innerHTML = "";
      const wrap = document.createElement("div");
      wrap.style.display = "flex"; wrap.style.flexDirection = "column"; wrap.style.gap = "0.6rem"; wrap.style.width = "100%";
      const a = document.createElement("div");
      const hi = {};
      s.stack.forEach(k => hi[k] = "window");
      if (s.i < s.arr.length) hi[s.i] = "cmp";
      P.array(a, { arr: s.arr, pointers: { i: s.i }, highlight: hi });
      wrap.appendChild(a);
      const r = document.createElement("div");
      r.innerHTML = `<div style="font-size:0.7rem;color:var(--md-default-fg-color--light);text-align:center;margin-bottom:0.3rem;">result so far</div>`;
      const r2 = document.createElement("div");
      P.array(r2, { arr: s.res, indexed: false });
      r.appendChild(r2);
      wrap.appendChild(r);
      stage.appendChild(wrap);
    },
    readout: s => [{ label: "i", value: s.i }, { label: "stack", value: `[${s.stack.join(",")}]` }],
  });

  // ===================================================================
  // PATTERN 11 · TRIE
  // ===================================================================

  register("trie-insert", {
    title: "Trie — insert words",
    caption: "Each character creates / reuses a node. End-of-word flag (♦) marks completed words.",
    code: [
      "def insert(word):",
      "  node = root",
      "  for ch in word:",
      "    if ch not in node.children:",
      "      node.children[ch] = TrieNode()",
      "    node = node.children[ch]",
      "  node.end = True",
    ],
    init() {
      const words = ["car", "cat", "cab"];
      return {
        words, wIdx: 0, ci: 0,
        trieNodes: [{ id: 0, ch: null, x: 200, y: 30, parent: null }],
        cursor: 0, line: 0, desc: `insert "${words[0]}"`,
      };
    },
    step(s) {
      if (s.wIdx >= s.words.length) return { ...s, line: 7, desc: "all words inserted", done: true };
      const word = s.words[s.wIdx];
      if (s.ci >= word.length) {
        // mark end
        const tn = s.trieNodes.map(n => n.id === s.cursor ? { ...n, end: true } : n);
        return { ...s, trieNodes: tn, wIdx: s.wIdx + 1, ci: 0, cursor: 0, line: 6, desc: `mark node as end for "${word}" — next word` };
      }
      const ch = word[s.ci];
      const current = s.trieNodes.find(n => n.id === s.cursor);
      const existing = s.trieNodes.find(n => n.parent === s.cursor && n.ch === ch);
      if (existing) {
        return { ...s, cursor: existing.id, ci: s.ci + 1, line: 5, desc: `'${ch}' exists — descend` };
      }
      // create new child
      const siblings = s.trieNodes.filter(n => n.parent === s.cursor);
      const newId = s.trieNodes.length;
      const dx = (siblings.length - 1) * 80; // spread
      const parentNode = current;
      const newNode = {
        id: newId, ch, parent: s.cursor,
        x: parentNode.x + (siblings.length === 0 ? 0 : (siblings.length % 2 ? 1 : -1) * 70 * Math.ceil(siblings.length / 2)),
        y: parentNode.y + 70,
      };
      return { ...s, trieNodes: [...s.trieNodes, newNode], cursor: newId, ci: s.ci + 1, line: 3, desc: `create node '${ch}'` };
    },
    render(s, stage) {
      const ns = s.trieNodes.map(n => ({
        id: n.id, ch: n.ch, x: n.x, y: n.y, parent: n.parent, end: n.end,
        highlight: n.id === s.cursor ? "visit" : null,
      }));
      P.trie(stage, { nodes: ns });
    },
    readout: s => [
      { label: "word", value: `"${s.words[s.wIdx] || ""}"` },
      { label: "char", value: s.ci < (s.words[s.wIdx] || "").length ? s.words[s.wIdx][s.ci] : "—" },
      { label: "nodes", value: s.trieNodes.length },
    ],
  });

  // ===================================================================
  // PATTERN 12 · BIT MANIPULATION
  // ===================================================================

  register("single-number-xor", {
    title: "Single Number — XOR fold",
    caption: "Every pair XORs to 0, so x ⊕ x = 0 and x ⊕ 0 = x. Fold the array with XOR; the lone survivor is the answer.",
    code: [
      "ans = 0",
      "for x in nums:",
      "  ans ^= x",
      "return ans",
    ],
    init() {
      return { arr: [4, 1, 2, 1, 2], ans: 0, i: 0, line: 0, desc: "ans = 0" };
    },
    step(s) {
      if (s.i >= s.arr.length) return { ...s, line: 3, desc: `answer = ${s.ans}`, done: true };
      if (s.line === 0) return { ...s, line: 1, desc: "begin loop" };
      const next = s.ans ^ s.arr[s.i];
      return { ...s, ans: next, i: s.i + 1, line: 2, desc: `${s.ans} ⊕ ${s.arr[s.i]} = ${next}   (bin: ${s.ans.toString(2).padStart(4, "0")} ⊕ ${s.arr[s.i].toString(2).padStart(4, "0")} = ${next.toString(2).padStart(4, "0")})` };
    },
    render(s, stage) {
      const hi = {};
      if (s.i < s.arr.length) hi[s.i] = "cmp";
      P.array(stage, { arr: s.arr, pointers: { i: s.i }, highlight: hi });
    },
    readout: s => [{ label: "i", value: s.i }, { label: "ans (dec)", value: s.ans }, { label: "ans (bin)", value: s.ans.toString(2).padStart(4, "0") }],
  });

  // ===================================================================
  // PATTERN 10 · GREEDY
  // ===================================================================

  register("jump-game", {
    title: "Jump Game — greedy farthest reach",
    caption: "Track farthest reachable index. If i ever exceeds it, return false. If farthest covers n-1, true.",
    code: [
      "far = 0",
      "for i in 0..n-1:",
      "  if i > far: return False",
      "  far = max(far, i + a[i])",
      "return True",
    ],
    init() {
      return { arr: [2, 3, 1, 1, 4], far: 0, i: 0, line: 0, desc: "far = 0" };
    },
    step(s) {
      if (s.i >= s.arr.length) return { ...s, line: 4, desc: `far = ${s.far} ≥ n-1 — reachable!`, done: true };
      if (s.line === 0 || s.line === 4) return { ...s, line: 1, desc: `i = ${s.i}` };
      if (s.line === 1) {
        if (s.i > s.far) return { ...s, line: 2, desc: `i=${s.i} > far=${s.far} — unreachable`, done: true };
        return { ...s, line: 3, desc: `i ≤ far — extend reach` };
      }
      if (s.line === 3) {
        const nf = Math.max(s.far, s.i + s.arr[s.i]);
        return { ...s, far: nf, i: s.i + 1, line: 1, desc: `far = max(${s.far}, ${s.i + s.arr[s.i]}) = ${nf}` };
      }
    },
    render(s, stage) {
      const hi = {};
      for (let k = 0; k <= s.far && k < s.arr.length; k++) hi[k] = "window";
      if (s.i < s.arr.length) hi[s.i] = "cmp";
      P.array(stage, { arr: s.arr, pointers: { i: s.i, far: s.far }, highlight: hi });
    },
    readout: s => [{ label: "i", value: s.i }, { label: "far", value: s.far }, { label: "i+a[i]", value: s.i < s.arr.length ? s.i + s.arr[s.i] : "—" }],
  });

  // ===================================================================
  // PATTERN 15 · STACK (Valid Parentheses)
  // ===================================================================

  register("valid-parens", {
    title: "Valid Parentheses — matching stack",
    caption: "Push openers. On a closer, pop and check match. End must be empty.",
    code: [
      "stack = []; pairs = {')':'(', ']':'[', '}':'{'}",
      "for ch in s:",
      "  if ch in '([{': stack.append(ch)",
      "  else:",
      "    if not stack or stack[-1] != pairs[ch]: return False",
      "    stack.pop()",
      "return len(stack) == 0",
    ],
    init() {
      const s = "([{}])";
      return { s: s.split(""), i: 0, stack: [], line: 0, desc: `input "${s}"`, ok: true };
    },
    step(s) {
      if (s.i >= s.s.length) {
        const ok = s.stack.length === 0;
        return { ...s, line: 6, ok, desc: ok ? "stack empty — valid!" : "leftover openers — invalid", done: true };
      }
      const ch = s.s[s.i];
      if ("([{".includes(ch)) {
        return { ...s, stack: [...s.stack, ch], i: s.i + 1, line: 2, desc: `push '${ch}'` };
      }
      const pairs = { ")": "(", "]": "[", "}": "{" };
      const top = s.stack[s.stack.length - 1];
      if (!s.stack.length || top !== pairs[ch]) {
        return { ...s, line: 4, ok: false, desc: `'${ch}' mismatches top '${top || "∅"}' — invalid`, done: true };
      }
      const st = s.stack.slice(); st.pop();
      return { ...s, stack: st, i: s.i + 1, line: 5, desc: `pop '${top}' (matches '${ch}')` };
    },
    render(s, stage) {
      stage.innerHTML = "";
      const wrap = document.createElement("div");
      wrap.style.display = "grid"; wrap.style.gridTemplateColumns = "2fr 1fr"; wrap.style.gap = "1rem"; wrap.style.width = "100%";
      const a = document.createElement("div");
      const hi = {};
      if (s.i < s.s.length) hi[s.i] = "cmp";
      P.array(a, { arr: s.s, pointers: { i: s.i }, highlight: hi });
      wrap.appendChild(a);
      const b = document.createElement("div");
      P.stack(b, { items: s.stack.map(c => ({ val: c })) });
      wrap.appendChild(b);
      stage.appendChild(wrap);
    },
    readout: s => [{ label: "i", value: s.i }, { label: "stack", value: `[${s.stack.join("")}]` || "∅" }, { label: "status", value: s.ok ? "ok" : "✗" }],
  });

  // ===================================================================
  // TREE DFS — preorder traversal (binary tree)
  // ===================================================================

  register("tree-preorder", {
    title: "Binary tree preorder DFS — root → L → R",
    caption: "Visit root, recurse left, recurse right. Simulated with an explicit stack here.",
    code: [
      "stack = [root]",
      "while stack:",
      "  node = stack.pop()",
      "  visit(node)",
      "  if node.right: stack.append(node.right)",
      "  if node.left:  stack.append(node.left)",
    ],
    init() {
      // build tree
      //         1
      //        / \
      //       2   3
      //      / \   \
      //     4   5   6
      const nodes = [
        { id: 0, val: 1, x: 200, y: 40,  parent: null },
        { id: 1, val: 2, x: 130, y: 100, parent: 0 },
        { id: 2, val: 3, x: 270, y: 100, parent: 0 },
        { id: 3, val: 4, x: 90,  y: 160, parent: 1 },
        { id: 4, val: 5, x: 170, y: 160, parent: 1 },
        { id: 5, val: 6, x: 310, y: 160, parent: 2 },
      ];
      const children = { 0: [1, 2], 1: [3, 4], 2: [5], 3: [], 4: [], 5: [] };
      return { nodes, children, stack: [0], visited: [], current: -1, line: 0, desc: "push root" };
    },
    step(s) {
      if (s.line === 0) return { ...s, line: 1, desc: "loop while stack" };
      if (!s.stack.length) return { ...s, line: 6, desc: `preorder: ${s.visited.map(i => s.nodes[i].val).join(" → ")}`, done: true };
      if (s.line === 1) {
        const st = s.stack.slice();
        const u = st.pop();
        return { ...s, stack: st, current: u, line: 2, desc: `pop ${s.nodes[u].val}` };
      }
      if (s.line === 2) return { ...s, visited: [...s.visited, s.current], line: 3, desc: `visit ${s.nodes[s.current].val}` };
      if (s.line === 3) {
        const [l, r] = s.children[s.current] || [];
        const ns = s.stack.slice();
        if (r != null) ns.push(r);
        if (l != null) ns.push(l);
        return { ...s, stack: ns, line: 1, current: -1, desc: `push children L then R (L on top)` };
      }
    },
    render(s, stage) {
      const ns = s.nodes.map(n => {
        let h = null;
        if (n.id === s.current) h = "visit";
        else if (s.visited.includes(n.id)) h = "done";
        else if (s.stack.includes(n.id)) h = "queue";
        return { ...n, highlight: h };
      });
      P.tree(stage, { nodes: ns });
    },
    readout: s => [
      { label: "stack", value: s.stack.map(i => s.nodes[i].val).join(",") || "∅" },
      { label: "visited", value: s.visited.map(i => s.nodes[i].val).join(",") || "—" },
    ],
  });

  // ===================================================================
  // BFS on grid (rotting oranges) — multi-source
  // ===================================================================

  register("grid-bfs", {
    title: "Grid BFS — shortest path from S to T",
    caption: "Multi-source BFS expands a wavefront layer by layer; distance to each cell = layer number it was discovered in.",
    code: [
      "q = [start]; dist[start] = 0",
      "while q:",
      "  (r,c) = q.popleft()",
      "  for (nr,nc) in 4-neighbours:",
      "    if walkable and not visited:",
      "      dist[nr][nc] = dist[r][c] + 1",
      "      q.append((nr,nc))",
    ],
    init() {
      const g = [
        [".", ".", ".", "#", ".", "."],
        [".", "#", ".", "#", ".", "."],
        [".", "#", ".", ".", ".", "."],
        [".", ".", ".", "#", "#", "."],
        [".", "#", "#", "#", ".", "T"],
      ];
      const start = [0, 0];
      const rows = g.length, cols = g[0].length;
      const dist = Array.from({ length: rows }, () => new Array(cols).fill(-1));
      dist[0][0] = 0;
      return { grid: g, dist, queue: [[0, 0]], current: null, line: 0, found: false, desc: "start at (0,0)" };
    },
    step(s) {
      if (s.line === 0) return { ...s, line: 1, desc: "loop while queue" };
      if (!s.queue.length || s.found) return { ...s, line: 7, desc: s.found ? "target reached" : "queue empty — unreachable", done: true };
      if (s.line === 1) {
        const q = s.queue.slice();
        const cur = q.shift();
        return { ...s, queue: q, current: cur, line: 2, desc: `pop (${cur[0]},${cur[1]})` };
      }
      if (s.line === 2) {
        const [r, c] = s.current;
        const rows = s.grid.length, cols = s.grid[0].length;
        const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
        for (const [dr, dc] of dirs) {
          const nr = r + dr, nc = c + dc;
          if (nr < 0 || nc < 0 || nr >= rows || nc >= cols) continue;
          const v = s.grid[nr][nc];
          if (v === "#") continue;
          if (s.dist[nr][nc] !== -1) continue;
          const dist = s.dist.map(row => row.slice());
          dist[nr][nc] = dist[r][c] + 1;
          if (v === "T") return { ...s, dist, queue: [...s.queue, [nr, nc]], line: 5, found: true, desc: `reached T at (${nr},${nc}), dist=${dist[nr][nc]}` };
          return { ...s, dist, queue: [...s.queue, [nr, nc]], line: 5, desc: `expand (${nr},${nc}) dist=${dist[nr][nc]}` };
        }
        return { ...s, line: 1, current: null, desc: "no expansions — back to pop" };
      }
      if (s.line === 5) return { ...s, line: 2, desc: "more neighbours" };
    },
    render(s, stage) {
      P.grid(stage, {
        rows: s.grid.length, cols: s.grid[0].length,
        cellOf: (r, c) => {
          const v = s.grid[r][c];
          let cls = "";
          if (v === "#") cls = "wall";
          else if (v === "T") cls = s.found ? "done" : "target";
          if (r === 0 && c === 0) cls = "start";
          if (s.current && s.current[0] === r && s.current[1] === c) cls = "visit";
          else if (s.queue.some(q => q[0] === r && q[1] === c)) cls = "queue";
          else if (s.dist[r][c] !== -1 && (v === "." || v === "T")) cls = (v === "T" && s.found) ? "done" : "done";
          if (v === "#") cls = "wall";
          return { val: v === "." ? (s.dist[r][c] === -1 ? "" : s.dist[r][c]) : v, cls };
        },
      });
    },
    readout: s => [{ label: "queue", value: s.queue.length }, { label: "found", value: s.found ? "yes" : "no" }],
  });

  // ===================================================================
  // GENERIC ALGO REGISTRATIONS via factories
  // ===================================================================
  // For algorithms where the visualization pattern is similar to one
  // already defined, we expose a "code-walk only" registration that
  // shows the input + pseudocode + line-by-line walkthrough without
  // a custom render. This keeps coverage broad while we add bespoke
  // visualizations over time.

  function codeWalk(key, cfg) {
    register(key, {
      title: cfg.title,
      caption: cfg.caption,
      code: cfg.code,
      init: () => ({
        ...((cfg.state && cfg.state()) || {}),
        stepIdx: 0,
        line: cfg.lines ? cfg.lines[0] : 0,
        desc: cfg.descs ? cfg.descs[0] : "ready",
      }),
      step: function (s) {
        const i = s.stepIdx + 1;
        if (!cfg.descs || i >= cfg.descs.length) return { ...s, done: true };
        return {
          ...s,
          stepIdx: i,
          line: cfg.lines ? cfg.lines[i] : s.line,
          desc: cfg.descs[i],
          done: i === cfg.descs.length - 1,
        };
      },
      render: cfg.render || function (s, stage) {
        stage.innerHTML = "";
        const wrap = document.createElement("div");
        wrap.style.padding = "1rem";
        wrap.style.fontFamily = "var(--md-code-font)";
        wrap.style.fontSize = "0.78rem";
        wrap.style.color = "var(--md-default-fg-color--light)";
        wrap.style.textAlign = "center";
        wrap.innerHTML = cfg.staticHTML || `<em>Step through the code panel to trace ${cfg.title}.</em>`;
        stage.appendChild(wrap);
      },
      readout: s => [{ label: "step", value: s.stepIdx }],
    });
  }

  // Expose the factory so additional algos can be added easily.
  window.DSA.codeWalk = codeWalk;

  // ---------- A few code-walk-only registrations for completeness ----
  codeWalk("first-last-occurrence", {
    title: "First / Last occurrence — biased binary search",
    caption: "Two binary searches: one biased left (lo = mid+1 only when strictly less; bookkeep mid on equality), one biased right.",
    code: [
      "# first occurrence",
      "lo, hi, first = 0, n-1, -1",
      "while lo <= hi:",
      "  mid = (lo+hi)//2",
      "  if a[mid] == t: first = mid; hi = mid - 1",
      "  elif a[mid] < t: lo = mid + 1",
      "  else: hi = mid - 1",
    ],
    lines: [0, 1, 2, 3, 4, 5, 6, 7, 7],
    descs: [
      "search range = entire array",
      "narrow down to candidates",
      "compute midpoint",
      "compare a[mid] with target",
      "on equality — record and search LEFT (for first)",
      "smaller — search right",
      "bigger — search left",
      "when lo > hi, `first` holds the leftmost match",
      "symmetric search records the rightmost match",
    ],
  });

  codeWalk("rotated-search", {
    title: "Search in rotated sorted array",
    caption: "One half of [lo..hi] is always sorted. Pick mid; check which half is sorted; check if target lies in it; descend accordingly.",
    code: [
      "while lo <= hi:",
      "  mid = (lo+hi)//2",
      "  if a[mid] == t: return mid",
      "  if a[lo] <= a[mid]:        # left half sorted",
      "    if a[lo] <= t < a[mid]: hi = mid - 1",
      "    else: lo = mid + 1",
      "  else:                       # right half sorted",
      "    if a[mid] < t <= a[hi]: lo = mid + 1",
      "    else: hi = mid - 1",
    ],
    lines: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    descs: [
      "init lo, hi over rotated array",
      "compute mid",
      "match? return",
      "check sorted half (is a[lo..mid] sorted?)",
      "yes & target lies in sorted half → descend left",
      "yes & target outside → descend right",
      "no → a[mid..hi] is sorted",
      "target in sorted right → descend right",
      "else descend left",
      "loop until match or lo > hi",
    ],
  });

  codeWalk("min-window-substring", {
    title: "Minimum Window Substring — sliding window",
    caption: "Expand right until window covers t; then contract left while still covering; track the smallest cover.",
    code: [
      "need = Counter(t); have = {}",
      "l = 0; covered = 0; best = (∞, 0, 0)",
      "for r in 0..n-1:",
      "  have[a[r]] += 1",
      "  if have[a[r]] == need[a[r]]: covered += 1",
      "  while covered == len(need):",
      "    update best with (r-l+1, l, r)",
      "    have[a[l]] -= 1",
      "    if have[a[l]] < need[a[l]]: covered -= 1",
      "    l += 1",
    ],
    lines: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    descs: [
      "count what we still need from t",
      "init left, covered count, best window",
      "extend r — pull a[r] into the window",
      "include a[r] in `have`",
      "if a[r]'s count just matched need, increment `covered`",
      "while window already covers t, try shrinking",
      "record the tightest window so far",
      "shrink from left — pull a[l] out",
      "if it drops below need, lose coverage",
      "advance l and continue",
    ],
  });

  codeWalk("word-ladder", {
    title: "Word Ladder — BFS over word transformations",
    caption: "Nodes = words. Edge = single-letter change. BFS from begin to end gives shortest transformation length.",
    code: [
      "wordSet = set(wordList); q = [(begin, 1)]; seen = {begin}",
      "while q:",
      "  word, steps = q.popleft()",
      "  if word == end: return steps",
      "  for i in range(len(word)):",
      "    for c in 'a..z':",
      "      cand = word[:i]+c+word[i+1:]",
      "      if cand in wordSet and cand not in seen:",
      "        seen.add(cand); q.append((cand, steps+1))",
      "return 0",
    ],
    lines: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    descs: [
      "start queue with (begin, 1)",
      "dequeue current word",
      "if reached end, return distance",
      "for each position",
      "try every replacement letter",
      "build candidate",
      "if candidate is in dictionary & unseen",
      "mark seen and enqueue",
      "repeat",
      "no transformation found",
    ],
  });

  codeWalk("median-of-stream", {
    title: "Median of Stream — two heaps",
    caption: "Max-heap `lo` for the lower half, min-heap `hi` for the upper half. Median = top of lo (odd) or average of both tops (even).",
    code: [
      "lo = max-heap; hi = min-heap",
      "def add(x):",
      "  if not lo or x <= -lo.top: heappush(lo, -x)",
      "  else: heappush(hi, x)",
      "  rebalance(lo, hi)",
      "def median():",
      "  if len(lo) > len(hi): return -lo.top",
      "  return (-lo.top + hi.top) / 2",
    ],
    descs: [
      "two heaps, invariant: |lo| − |hi| ∈ {0, 1}",
      "decide which heap based on value vs current median",
      "add to max-heap of lower half (stored negated)",
      "or to min-heap of upper half",
      "rebalance so size diff ≤ 1",
      "median read:",
      "odd total → top of lo",
      "even → average of both tops",
    ],
  });

  codeWalk("merge-k-sorted", {
    title: "Merge K Sorted Lists — heap of head pointers",
    caption: "Push the head of each list into a min-heap. Pop smallest, append to output, push its next.",
    code: [
      "heap = [(lst.val, i, lst) for i, lst in enumerate(lists) if lst]",
      "heapify(heap)",
      "while heap:",
      "  v, i, node = heappop(heap)",
      "  out.append(v)",
      "  if node.next: heappush(heap, (node.next.val, i, node.next))",
    ],
    descs: [
      "seed: one entry per list (its head)",
      "heapify",
      "pop smallest",
      "append to merged output",
      "push popped node's successor (if any)",
      "loop",
    ],
  });

  codeWalk("k-closest-points", {
    title: "K Closest Points to Origin — max-heap of size K",
    caption: "Keep a max-heap (by distance) of size K. New point with smaller distance kicks out the heap's max.",
    code: [
      "heap = []  # max-heap on distance",
      "for p in points:",
      "  d = p.x*p.x + p.y*p.y",
      "  heappush(heap, (-d, p))",
      "  if len(heap) > k: heappop(heap)",
      "return [p for _, p in heap]",
    ],
    descs: [
      "max-heap on distance (negate for min-heap libs)",
      "for each point",
      "compute squared distance",
      "push",
      "if heap exceeds k, drop the farthest",
      "remaining = k closest",
    ],
  });

  codeWalk("task-scheduler", {
    title: "Task Scheduler — heap + cooldown queue",
    caption: "Max-heap of task counts. Each tick: pop top, append to cooldown ring; when cooldown expires push back.",
    code: [
      "counts = Counter(tasks); heap = list(counts.values())  # max-heap",
      "queue = []  # (count, ready_time)",
      "time = 0",
      "while heap or queue:",
      "  time += 1",
      "  if heap: c = heappop(heap); if c-1 > 0: queue.append((c-1, time+n))",
      "  if queue and queue[0][1] == time: heappush(heap, queue.popleft()[0])",
      "return time",
    ],
    descs: [
      "build max-heap of task frequencies",
      "cooldown ring buffer",
      "tick simulation",
      "each tick consumes one cell",
      "decrement chosen task and park in cooldown",
      "expired cooldowns re-enter heap",
      "stop when both empty",
    ],
  });

  codeWalk("bellman-ford", {
    title: "Bellman-Ford — shortest paths with negative edges",
    caption: "Relax every edge V-1 times. One more relaxation detecting an improvement ⇒ negative cycle.",
    code: [
      "dist = [∞]*V; dist[src] = 0",
      "for _ in range(V-1):",
      "  for (u, v, w) in edges:",
      "    if dist[u] + w < dist[v]:",
      "      dist[v] = dist[u] + w",
      "for (u, v, w) in edges:           # cycle check",
      "  if dist[u] + w < dist[v]: return 'neg cycle'",
    ],
    descs: [
      "init distances",
      "V-1 outer passes",
      "scan every edge",
      "relaxation condition",
      "update tentative distance",
      "extra pass detects negative cycle",
      "any further relaxation ⇒ cycle present",
    ],
  });

  codeWalk("floyd-warshall", {
    title: "Floyd-Warshall — all-pairs shortest paths",
    caption: "dist[i][j] = min(dist[i][j], dist[i][k] + dist[k][j]) for every intermediate k.",
    code: [
      "for k in 0..V-1:",
      "  for i in 0..V-1:",
      "    for j in 0..V-1:",
      "      if dist[i][k] + dist[k][j] < dist[i][j]:",
      "        dist[i][j] = dist[i][k] + dist[k][j]",
    ],
    descs: [
      "outermost loop: candidate intermediate vertex k",
      "for each pair (i, j)",
      "test whether going through k is shorter",
      "if yes, update dist[i][j]",
      "after k = V-1, dist holds all-pairs shortest paths",
    ],
  });

  codeWalk("kruskal", {
    title: "Kruskal MST — sorted edges + union-find",
    caption: "Sort edges by weight. Take each in order; include if endpoints belong to different components (union-find).",
    code: [
      "edges.sort(by=weight)",
      "dsu = DSU(V); mst = []",
      "for (u, v, w) in edges:",
      "  if dsu.find(u) != dsu.find(v):",
      "    dsu.union(u, v)",
      "    mst.append((u, v, w))",
      "    if len(mst) == V-1: break",
    ],
    descs: [
      "sort edges ascending by weight",
      "init disjoint-set + empty MST",
      "scan edges in order",
      "skip if it would create a cycle",
      "else merge components",
      "add to MST",
      "stop once we have V-1 edges",
    ],
  });

  codeWalk("prim", {
    title: "Prim MST — min-heap from a growing tree",
    caption: "Start from any vertex; repeatedly pick the lightest edge that connects the tree to a new vertex.",
    code: [
      "heap = [(0, start)]; in_mst = {}",
      "while heap and len(in_mst) < V:",
      "  w, u = heappop(heap)",
      "  if u in in_mst: continue",
      "  in_mst.add(u); cost += w",
      "  for (v, w2) in adj[u]:",
      "    if v not in in_mst: heappush(heap, (w2, v))",
    ],
    descs: [
      "seed heap with start vertex (weight 0)",
      "while tree incomplete",
      "pop cheapest candidate",
      "skip if already in tree",
      "include in MST",
      "push all crossing edges to neighbours",
      "loop until V vertices included",
    ],
  });

  codeWalk("tarjan-scc", {
    title: "Tarjan SCC — DFS lowlinks",
    caption: "On DFS, give each node an `index` and `lowlink`. A root SCC is found when `lowlink == index`; pop the stack down to it.",
    code: [
      "def dfs(v):",
      "  v.index = v.low = counter; counter += 1",
      "  stack.append(v); on_stack.add(v)",
      "  for w in adj[v]:",
      "    if w.index is None: dfs(w); v.low = min(v.low, w.low)",
      "    elif w in on_stack: v.low = min(v.low, w.index)",
      "  if v.low == v.index:   # root of an SCC",
      "    pop stack down to v into a new SCC",
    ],
    descs: [
      "DFS visit, assign index = low = counter",
      "push on stack, mark on_stack",
      "recurse over neighbours",
      "unvisited → recurse, propagate low",
      "in stack → relax low with neighbour's index",
      "after recursion, check root condition",
      "pop stack into an SCC group",
    ],
  });

  codeWalk("house-robber", {
    title: "House Robber — 1D DP",
    caption: "dp[i] = max(dp[i-1], dp[i-2] + nums[i]). Skip the previous house and take, or skip this one.",
    code: [
      "dp = [0]*n; dp[0] = nums[0]",
      "for i in 1..n-1:",
      "  prev = dp[i-1]",
      "  pp = dp[i-2] if i >= 2 else 0",
      "  dp[i] = max(prev, pp + nums[i])",
      "return dp[n-1]",
    ],
    descs: [
      "base: rob first house, skip neighbour",
      "for each house",
      "option 1: skip this — value = dp[i-1]",
      "option 2: rob this — dp[i-2] + nums[i]",
      "take the max",
      "answer = dp[n-1]",
    ],
  });

  codeWalk("climbing-stairs", {
    title: "Climbing Stairs — Fibonacci pattern",
    caption: "Number of ways to reach step n = ways to step n-1 + ways to step n-2.",
    code: [
      "dp = [0]*(n+1); dp[0] = dp[1] = 1",
      "for i in 2..n:",
      "  dp[i] = dp[i-1] + dp[i-2]",
      "return dp[n]",
    ],
    descs: [
      "base cases",
      "iterate i from 2 upward",
      "ways(i) = ways(i-1) + ways(i-2)",
      "return ways(n)",
    ],
  });

  codeWalk("lis", {
    title: "Longest Increasing Subsequence — patience sorting O(n log n)",
    caption: "Maintain `tails` — the smallest tail of all length-k LIS so far. Binary-search-replace per element.",
    code: [
      "tails = []",
      "for x in nums:",
      "  i = bisect_left(tails, x)",
      "  if i == len(tails): tails.append(x)",
      "  else: tails[i] = x",
      "return len(tails)",
    ],
    descs: [
      "start with empty tails array",
      "for each number, find insertion point i",
      "if x extends past every tail, append",
      "otherwise overwrite the larger tail (length unchanged but smaller end)",
      "answer = length of tails",
    ],
  });

  codeWalk("edit-distance", {
    title: "Edit Distance — Levenshtein",
    caption: "dp[i][j] = edits to transform a[..i] → b[..j]. Same char: dp[i-1][j-1]. Else: 1 + min(insert, delete, replace).",
    code: [
      "dp[i][0] = i; dp[0][j] = j",
      "for i in 1..m, j in 1..n:",
      "  if a[i-1] == b[j-1]:",
      "    dp[i][j] = dp[i-1][j-1]",
      "  else:",
      "    dp[i][j] = 1 + min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1])",
    ],
    descs: [
      "base row/col = number of inserts to build prefix",
      "fill row by row",
      "if last chars match — no extra cost",
      "carry over from dp[i-1][j-1]",
      "else pick cheapest of insert/delete/replace",
      "add 1 for the new operation",
    ],
  });

  codeWalk("knapsack-unbounded", {
    title: "Unbounded Knapsack — items reusable",
    caption: "Inner loop fills capacity left-to-right so dp[w] already reflects re-using current item.",
    code: [
      "dp = [0]*(W+1)",
      "for i in items:",
      "  for w in wt[i]..W:",
      "    dp[w] = max(dp[w], dp[w-wt[i]] + val[i])",
      "return dp[W]",
    ],
    descs: [
      "init dp",
      "for each item",
      "iterate w upward — reuse permitted",
      "either skip or take one more of this item",
      "answer at dp[W]",
    ],
  });

  codeWalk("word-break", {
    title: "Word Break — DP over prefixes",
    caption: "dp[i] = can s[..i] be segmented? True if some j with dp[j] && s[j..i] in dict.",
    code: [
      "dp = [False]*(n+1); dp[0] = True",
      "for i in 1..n:",
      "  for j in 0..i-1:",
      "    if dp[j] and s[j..i] in dict:",
      "      dp[i] = True; break",
      "return dp[n]",
    ],
    descs: [
      "empty prefix is segmentable",
      "for each end i",
      "try every split point j",
      "if prefix s[..j] is segmentable and s[j..i] is a word",
      "mark dp[i] true",
      "return dp[n]",
    ],
  });

  codeWalk("palindrome-partitioning", {
    title: "Palindrome Partitioning — backtracking + memo",
    caption: "At each index, try every prefix that is a palindrome, recurse on the suffix.",
    code: [
      "def bt(start, path):",
      "  if start == n: result.append(path[:]); return",
      "  for end in start+1..n:",
      "    if isPalin(s[start..end]):",
      "      bt(end, path + [s[start..end]])",
    ],
    descs: [
      "if we've consumed s, record partition",
      "try each prefix length",
      "if prefix is palindrome",
      "recurse on remaining suffix",
      "backtrack",
    ],
  });

  codeWalk("permutations", {
    title: "Permutations — backtracking",
    caption: "Swap each remaining index into the current position; recurse; undo swap.",
    code: [
      "def bt(i):",
      "  if i == n: result.append(a[:]); return",
      "  for j in i..n-1:",
      "    swap(a[i], a[j])",
      "    bt(i+1)",
      "    swap(a[i], a[j])  # undo",
    ],
    descs: [
      "depth-i recursion: fix a[i]",
      "if i == n, leaf — record",
      "iterate j ≥ i and swap into position",
      "recurse",
      "undo swap to keep state clean",
    ],
  });

  codeWalk("combinations", {
    title: "Combinations C(n,k) — backtracking",
    caption: "Pick or skip each candidate. Stop early when remaining slots > remaining candidates.",
    code: [
      "def bt(start, path):",
      "  if len(path) == k: result.append(path[:]); return",
      "  for i in start..n:",
      "    path.append(i)",
      "    bt(i+1, path)",
      "    path.pop()",
    ],
    descs: [
      "if path length = k, record",
      "for each candidate ≥ start",
      "include it",
      "recurse on the rest",
      "backtrack",
    ],
  });

  codeWalk("n-queens", {
    title: "N-Queens — row-by-row backtracking",
    caption: "Place one queen per row. Maintain sets for occupied cols, +diagonals, −diagonals for O(1) attack checks.",
    code: [
      "def bt(row, cols, diag1, diag2, board):",
      "  if row == n: result.append(board[:]); return",
      "  for c in range(n):",
      "    if c in cols or row+c in diag1 or row-c in diag2: continue",
      "    place; bt(row+1, ...); unplace",
    ],
    descs: [
      "if row == n, record current board",
      "try each column",
      "skip if attacked (col, diag1, diag2)",
      "place queen, recurse",
      "unplace and try next column",
    ],
  });

  codeWalk("word-search", {
    title: "Word Search — grid DFS with backtracking",
    caption: "Start DFS from each matching cell. Mark visited; restore on backtrack.",
    code: [
      "def dfs(r, c, i):",
      "  if i == len(word): return True",
      "  if out_of_bounds or grid[r][c] != word[i]: return False",
      "  mark visited",
      "  for (dr,dc): if dfs(r+dr, c+dc, i+1): return True",
      "  unmark visited",
      "  return False",
    ],
    descs: [
      "i = index into word",
      "match complete — success",
      "fail fast on bounds / character mismatch",
      "mark cell to avoid reuse",
      "explore 4 neighbours for next char",
      "restore cell on backtrack",
    ],
  });

  codeWalk("generate-parens", {
    title: "Generate Parentheses — choose ( or ) under constraints",
    caption: "Track open and close counts. Add ( while open < n; add ) while close < open.",
    code: [
      "def bt(s, open, close):",
      "  if len(s) == 2*n: result.append(s); return",
      "  if open < n: bt(s + '(', open+1, close)",
      "  if close < open: bt(s + ')', open, close+1)",
    ],
    descs: [
      "build s character by character",
      "leaf when length == 2n",
      "can still open (",
      "can close ) only when open count exceeds close",
    ],
  });

  codeWalk("trie-search", {
    title: "Trie — search & startsWith",
    caption: "Walk down nodes by char; return based on whether the final node exists and `end` flag.",
    code: [
      "def search(word):",
      "  node = root",
      "  for ch in word:",
      "    if ch not in node.children: return False",
      "    node = node.children[ch]",
      "  return node.end",
      "def startsWith(prefix):",
      "  ... same walk, return True if walk completes",
    ],
    descs: [
      "begin at root",
      "for each char",
      "missing child → fail",
      "descend",
      "search requires `end` flag; startsWith doesn't",
    ],
  });

  codeWalk("word-dictionary", {
    title: "Word Dictionary — '.' wildcard via DFS over trie",
    caption: "When the next char is '.', recurse on every existing child instead of one.",
    code: [
      "def search(word, node=root, i=0):",
      "  if i == len(word): return node.end",
      "  ch = word[i]",
      "  if ch == '.':",
      "    return any(search(word, c, i+1) for c in node.children.values())",
      "  if ch not in node.children: return False",
      "  return search(word, node.children[ch], i+1)",
    ],
    descs: [
      "if consumed word, look at end flag",
      "character to match at i",
      "wildcard branches",
      "try every child",
      "exact-char branch",
      "fail or descend",
    ],
  });

  codeWalk("word-search-ii", {
    title: "Word Search II — trie + grid DFS",
    caption: "Insert all words into a trie. DFS the grid, descending the trie in parallel. Prune by trie miss.",
    code: [
      "build trie of words",
      "def dfs(r, c, node):",
      "  ch = grid[r][c]",
      "  if ch not in node.children: return",
      "  nxt = node.children[ch]",
      "  if nxt.word: result.add(nxt.word); nxt.word = None  # de-dupe",
      "  mark; for neighbours: dfs(...); unmark",
    ],
    descs: [
      "trie compresses prefix overlap across words",
      "DFS each cell as the start",
      "if current letter not in trie node's children → prune",
      "descend trie + grid together",
      "match → collect, optionally clear to dedupe",
      "restore cell on backtrack",
    ],
  });

  codeWalk("autocomplete", {
    title: "Autocomplete — trie + best children",
    caption: "Each trie node caches its top-k completions (or counts) for instant suggest.",
    code: [
      "on insert(word, freq):",
      "  descend; at each node update top-k cache",
      "on suggest(prefix):",
      "  descend by prefix; return cached top-k",
    ],
    descs: [
      "each node owns a small sorted heap of best completions",
      "insert updates this heap along the prefix path",
      "suggest is then O(prefix length)",
      "no children scan, no global re-rank",
    ],
  });

  codeWalk("counting-bits", {
    title: "Counting Bits — DP using bit trick",
    caption: "dp[i] = dp[i >> 1] + (i & 1). Each i is its right-shifted predecessor + low bit.",
    code: [
      "dp = [0]*(n+1)",
      "for i in 1..n:",
      "  dp[i] = dp[i >> 1] + (i & 1)",
      "return dp",
    ],
    descs: [
      "base dp[0] = 0",
      "iterate up",
      "dp[i>>1] already counted; add the low bit of i",
      "linear time",
    ],
  });

  codeWalk("power-of-two", {
    title: "Power of Two — n & (n-1)",
    caption: "Powers of two have exactly one set bit. n & (n-1) clears the lowest set bit; equals 0 iff n is a power of 2.",
    code: [
      "def isPow2(n):",
      "  return n > 0 and (n & (n - 1)) == 0",
    ],
    descs: [
      "binary trick: x = 1 0…0, x-1 = 0 1…1",
      "AND wipes the only set bit",
      "result is zero iff x had exactly one bit",
    ],
  });

  codeWalk("bitmask-tsp", {
    title: "Bitmask DP — Travelling Salesman O(2ⁿ · n²)",
    caption: "dp[mask][i] = min cost path visiting exactly `mask`, ending at i. Transitions: extend mask by an unset bit.",
    code: [
      "dp[1<<0][0] = 0",
      "for mask in all subsets:",
      "  for i in mask:",
      "    for j not in mask:",
      "      new = mask | (1<<j)",
      "      dp[new][j] = min(dp[new][j], dp[mask][i] + d[i][j])",
      "answer = min(dp[full][i] + d[i][0])",
    ],
    descs: [
      "base: start at city 0 with only 0 visited",
      "iterate over masks",
      "for each city in current set",
      "extend to a not-yet-visited city",
      "relax dp[new][j]",
      "close the cycle back to 0 at the end",
    ],
  });

  codeWalk("activity-selection", {
    title: "Activity Selection — greedy by finish time",
    caption: "Sort by finish time; pick first compatible activity each time. Optimal by exchange argument.",
    code: [
      "sort activities by finish",
      "last = -∞; chosen = []",
      "for (s, f) in activities:",
      "  if s >= last:",
      "    chosen.append((s, f)); last = f",
    ],
    descs: [
      "earliest finish leaves the most room",
      "scan in finish order",
      "compatible if start ≥ last finish",
      "take it, advance the boundary",
    ],
  });

  codeWalk("gas-station", {
    title: "Gas Station — circular tour",
    caption: "If total gas < total cost, no answer. Otherwise the first index where running tank never dips below 0 from there is the start.",
    code: [
      "tank = 0; total = 0; start = 0",
      "for i in 0..n-1:",
      "  diff = gas[i] - cost[i]",
      "  tank += diff; total += diff",
      "  if tank < 0: start = i + 1; tank = 0",
      "return start if total >= 0 else -1",
    ],
    descs: [
      "running diff in tank, total diff across all stations",
      "if running tank dips below 0, the start can't be in [start..i] — reset",
      "answer is feasible iff total ≥ 0",
    ],
  });

  codeWalk("huffman", {
    title: "Huffman Coding — greedy min-heap merge",
    caption: "Repeatedly merge the two least-frequent nodes into a parent until one tree remains.",
    code: [
      "heap = [(freq, char) for char, freq in counts]",
      "while len(heap) > 1:",
      "  a = heappop(heap); b = heappop(heap)",
      "  heappush(heap, (a.freq + b.freq, a, b))",
      "build codes by DFS on the tree (left=0, right=1)",
    ],
    descs: [
      "frequency-ordered heap",
      "pop the two cheapest",
      "merge into a parent",
      "push back",
      "tree shape directly gives prefix codes",
    ],
  });

  codeWalk("intervals", {
    title: "Interval Merging — sort by start",
    caption: "Sort intervals by start. Walk through; merge with last if overlapping (curr.start ≤ last.end).",
    code: [
      "intervals.sort(by=start)",
      "out = [intervals[0]]",
      "for cur in intervals[1:]:",
      "  if cur.start <= out[-1].end:",
      "    out[-1].end = max(out[-1].end, cur.end)",
      "  else: out.append(cur)",
    ],
    descs: [
      "sort by start time",
      "seed output with first interval",
      "for each subsequent",
      "overlap → extend last interval's end",
      "no overlap → append a new one",
    ],
  });

  codeWalk("merge-two-sorted-ll", {
    title: "Merge Two Sorted Lists — dummy head",
    caption: "Pick whichever current node is smaller; advance that pointer; thread it onto the tail.",
    code: [
      "dummy = Node(); tail = dummy",
      "while a and b:",
      "  if a.val <= b.val: tail.next = a; a = a.next",
      "  else: tail.next = b; b = b.next",
      "  tail = tail.next",
      "tail.next = a or b",
      "return dummy.next",
    ],
    descs: [
      "dummy head simplifies edge cases",
      "compare heads",
      "thread smaller; advance its pointer",
      "advance tail",
      "append the leftover tail",
      "return real head",
    ],
  });

  codeWalk("remove-nth-end", {
    title: "Remove Nth from End — two-pointer gap",
    caption: "Advance `fast` by n steps; then walk fast and slow together. When fast hits end, slow.next is the target.",
    code: [
      "dummy = Node(0, head); slow = fast = dummy",
      "for _ in range(n): fast = fast.next",
      "while fast.next: fast = fast.next; slow = slow.next",
      "slow.next = slow.next.next",
      "return dummy.next",
    ],
    descs: [
      "dummy lets us delete the head uniformly",
      "create gap of n",
      "drag both pointers together to the end",
      "skip the target node",
      "return potentially-new head",
    ],
  });

  codeWalk("lru-cache", {
    title: "LRU Cache — hashmap + doubly linked list",
    caption: "Hashmap → DLL node. get/put move node to head; evict tail on overflow. Both O(1).",
    code: [
      "get(k): if k in map: move node to head; return val; else -1",
      "put(k, v): if exists: update + move to head",
      "           else: insert at head; if size > cap: evict tail",
    ],
    descs: [
      "DLL maintains usage order",
      "head = most recently used, tail = LRU",
      "map gives O(1) access",
      "both ops touch O(1) pointers",
      "tail eviction on overflow keeps capacity bounded",
    ],
  });

  codeWalk("daily-temperatures", {
    title: "Daily Temperatures — monotonic stack",
    caption: "Stack holds indices whose answer is still pending. On a warmer day, pop & answer them.",
    code: [
      "stack = []; ans = [0]*n",
      "for i, t in enumerate(temps):",
      "  while stack and temps[stack[-1]] < t:",
      "    j = stack.pop(); ans[j] = i - j",
      "  stack.append(i)",
      "return ans",
    ],
    descs: [
      "monotonic non-increasing stack of indices",
      "today's temp warms older days",
      "pop them and write the wait days",
      "push current",
    ],
  });

  codeWalk("largest-rectangle", {
    title: "Largest Rectangle in Histogram — monotonic stack",
    caption: "Maintain a stack of increasing heights. On a drop, pop and compute width = i - stack.top - 1.",
    code: [
      "stack = []; best = 0",
      "for i, h in enumerate(heights + [0]):  # sentinel",
      "  while stack and heights[stack[-1]] > h:",
      "    top = stack.pop()",
      "    width = i if not stack else i - stack[-1] - 1",
      "    best = max(best, heights[top] * width)",
      "  stack.append(i)",
      "return best",
    ],
    descs: [
      "sentinel forces final drain",
      "stack contains strictly increasing heights",
      "current bar shorter → finalize taller bars",
      "width computed from neighbour indices",
      "track best area",
    ],
  });

  codeWalk("3sum", {
    title: "3Sum — sort + two-pointer per anchor",
    caption: "Sort. Fix anchor i; run two-pointer on the rest to find pairs summing to −a[i]. Skip duplicates carefully.",
    code: [
      "nums.sort()",
      "for i in 0..n-3:",
      "  if i > 0 and nums[i] == nums[i-1]: continue",
      "  l, r = i+1, n-1",
      "  while l < r:",
      "    s = nums[i]+nums[l]+nums[r]",
      "    if s == 0: record; skip dup l, r",
      "    elif s < 0: l += 1",
      "    else: r -= 1",
    ],
    descs: [
      "sort to enable two-pointer",
      "fix anchor i",
      "skip duplicate anchors",
      "two pointers within nums[i+1..n-1]",
      "compare sum with 0",
      "advance pointers and skip duplicates",
    ],
  });

  codeWalk("trapping-rain-water", {
    title: "Trapping Rain Water — two pointers + maxes",
    caption: "At each step move the side whose height is smaller; water = (its-side-max) − height.",
    code: [
      "l, r = 0, n-1; lmax = rmax = 0; water = 0",
      "while l < r:",
      "  if h[l] <= h[r]:",
      "    lmax = max(lmax, h[l]); water += lmax - h[l]; l += 1",
      "  else:",
      "    rmax = max(rmax, h[r]); water += rmax - h[r]; r -= 1",
    ],
    descs: [
      "two pointers + running side-maxes",
      "process the shorter side first",
      "water under that column = side-max − height",
      "advance toward the middle",
    ],
  });

  codeWalk("level-order", {
    title: "Tree Level Order Traversal — BFS by layer",
    caption: "Queue holds nodes of the current layer; pop size, gather values, push all children, repeat.",
    code: [
      "q = [root]; out = []",
      "while q:",
      "  layer = []; size = len(q)",
      "  for _ in range(size):",
      "    node = q.popleft(); layer.append(node.val)",
      "    if node.left: q.append(node.left)",
      "    if node.right: q.append(node.right)",
      "  out.append(layer)",
    ],
    descs: [
      "init queue with root",
      "snapshot current layer size",
      "drain those many nodes",
      "collect values, enqueue children",
      "append layer to output",
    ],
  });

  codeWalk("multi-source-bfs", {
    title: "Multi-source BFS — Rotting Oranges",
    caption: "Enqueue every rotten orange at time 0. Expand outward; minutes elapsed = maximum dist when queue drains.",
    code: [
      "q = [(r,c,0) for every rotten cell]",
      "while q:",
      "  r, c, t = q.popleft()",
      "  for (nr,nc) in neighbours:",
      "    if fresh:",
      "      mark rotten; q.append((nr,nc,t+1))",
      "      ans = max(ans, t+1)",
    ],
    descs: [
      "seed queue with all rotten sources",
      "all sources expand in lockstep",
      "neighbour fresh → rot in t+1 minutes",
      "running max of timestamps = answer",
    ],
  });

  codeWalk("path-sum", {
    title: "Path Sum — root-to-leaf DFS",
    caption: "Subtract current node's value from target; recurse; success when leaf reached with remaining target 0.",
    code: [
      "def dfs(node, target):",
      "  if not node: return False",
      "  if not node.left and not node.right: return target == node.val",
      "  rem = target - node.val",
      "  return dfs(node.left, rem) or dfs(node.right, rem)",
    ],
    descs: [
      "null node — fail",
      "leaf — check if path sum matches",
      "otherwise recurse on children with reduced target",
    ],
  });

  codeWalk("cycle-detection-graph", {
    title: "Cycle detection — DFS with three-color tracking",
    caption: "white = unvisited, gray = on current DFS stack, black = fully done. Back-edge to gray = cycle.",
    code: [
      "color = {v: WHITE for v in V}",
      "def dfs(u):",
      "  color[u] = GRAY",
      "  for v in adj[u]:",
      "    if color[v] == GRAY: return True   # back edge",
      "    if color[v] == WHITE and dfs(v): return True",
      "  color[u] = BLACK",
      "  return False",
    ],
    descs: [
      "init all white",
      "enter recursion — mark gray",
      "neighbour gray = ancestor = cycle",
      "white neighbour — recurse",
      "finish — mark black",
    ],
  });

  codeWalk("tree-traversals", {
    title: "Tree traversals — preorder / inorder / postorder",
    caption: "Differ only in when you visit the node relative to recursing left & right.",
    code: [
      "def preorder(n):  visit; pre(left); pre(right)",
      "def inorder(n):   in(left);  visit;  in(right)",
      "def postorder(n): post(left); post(right); visit",
    ],
    descs: [
      "preorder = root → L → R (used for tree copy, prefix expr)",
      "inorder = L → root → R (BST → sorted order)",
      "postorder = L → R → root (used for delete, postfix expr)",
    ],
  });

  codeWalk("insertion-sort", {
    title: "Insertion sort",
    caption: "Grow the sorted prefix one element at a time; insert a[i] backwards into its place.",
    code: [
      "for i in 1..n-1:",
      "  key = a[i]; j = i - 1",
      "  while j >= 0 and a[j] > key:",
      "    a[j+1] = a[j]; j -= 1",
      "  a[j+1] = key",
    ],
    descs: [
      "pick the next unsorted element",
      "shift larger elements one slot right",
      "drop key into the open slot",
    ],
  });

  codeWalk("selection-sort", {
    title: "Selection sort",
    caption: "Repeatedly select the min of the unsorted suffix and swap it to the front.",
    code: [
      "for i in 0..n-1:",
      "  m = argmin(a[i..n])",
      "  swap(a[i], a[m])",
    ],
    descs: [
      "find min of unsorted suffix",
      "swap into front of suffix",
      "advance front",
    ],
  });

  codeWalk("heap-sort", {
    title: "Heap sort",
    caption: "Build a max-heap, then repeatedly swap root with last and sift down on a shrinking heap.",
    code: [
      "build_max_heap(a)",
      "for i in n-1..1:",
      "  swap(a[0], a[i])",
      "  sift_down(a, 0, i)  # heap of size i",
    ],
    descs: [
      "build heap O(n)",
      "swap root (max) to the tail",
      "shrink heap and re-heapify",
      "sorted region grows from the end",
    ],
  });

  codeWalk("counting-sort", {
    title: "Counting sort",
    caption: "Tally counts for each value, then write back in order. Stable, O(n + k).",
    code: [
      "count = [0]*(K+1)",
      "for x in a: count[x] += 1",
      "for v in 0..K:",
      "  for _ in range(count[v]): out.append(v)",
    ],
    descs: [
      "tally occurrences",
      "iterate values in order",
      "emit each value `count[v]` times",
    ],
  });

  codeWalk("radix-sort", {
    title: "Radix sort — LSD",
    caption: "Stably counting-sort by each digit position from least to most significant.",
    code: [
      "for digit in 1..max_digits:",
      "  a = counting_sort_by(a, digit)",
    ],
    descs: [
      "stable subsort by current digit",
      "passes from LSD to MSD",
      "after the last pass, a is fully sorted",
    ],
  });

  codeWalk("permutation-in-string", {
    title: "Permutation in String — frequency sliding window",
    caption: "Maintain frequency map of the current window of size |s1|; check equality at each shift.",
    code: [
      "need = Counter(s1); window = Counter(s2[:len(s1)])",
      "if window == need: return True",
      "for i in len(s1)..n-1:",
      "  window[s2[i]] += 1",
      "  window[s2[i-len(s1)]] -= 1; prune zeros",
      "  if window == need: return True",
      "return False",
    ],
    descs: [
      "fixed-size window equal to |s1|",
      "compare frequency maps",
      "slide one to the right; add new char, drop old char",
      "compare again",
    ],
  });

  codeWalk("longest-subarray-sum-k", {
    title: "Longest subarray with sum ≤ K — sliding window",
    caption: "Works when all values are non-negative (window sum is monotonic in expansion).",
    code: [
      "l = 0; sum = 0; best = 0",
      "for r in 0..n-1:",
      "  sum += a[r]",
      "  while sum > k: sum -= a[l]; l += 1",
      "  best = max(best, r - l + 1)",
    ],
    descs: [
      "expand r and add",
      "while window exceeds K, shrink from l",
      "track largest valid window",
    ],
  });

  codeWalk("2d-matrix", {
    title: "Search 2D Matrix — staircase walk",
    caption: "From top-right: if target smaller go left, if bigger go down. Each step eliminates a row or column.",
    code: [
      "r = 0; c = cols - 1",
      "while r < rows and c >= 0:",
      "  if M[r][c] == t: return True",
      "  elif M[r][c] > t: c -= 1",
      "  else: r += 1",
      "return False",
    ],
    descs: [
      "start at top-right corner",
      "compare with target",
      "bigger → left",
      "smaller → down",
      "out of bounds → not found",
    ],
  });

  codeWalk("median-of-two", {
    title: "Median of Two Sorted Arrays — partition binary search",
    caption: "Binary-search the partition of the smaller array so that left halves combined = right halves combined.",
    code: [
      "ensure |A| <= |B|; lo, hi = 0, len(A)",
      "while lo <= hi:",
      "  i = (lo+hi)//2; j = half - i",
      "  if A[i-1] > B[j]: hi = i - 1",
      "  elif B[j-1] > A[i]: lo = i + 1",
      "  else: take medians from left/right boundaries",
    ],
    descs: [
      "swap so we search the shorter array",
      "binary search the i partition",
      "j is forced by the half-sum constraint",
      "violations push i left or right",
      "valid partition → median from the four boundary values",
    ],
  });

})();
