/* ===========================================================
   Brain Detox Arc — DSA visualization upgrades (batch 1)
   ----------------------------------------------------------
   These register() calls override the codeWalk stubs in
   dsa-algorithms.js. Engine just sets REG[key] = cfg so the
   latest registration wins.
   =========================================================== */
(function () {
  "use strict";
  if (!window.DSA) { console.error("dsa-viz.js must load first"); return; }
  const { primitives: P, register } = window.DSA;

  // ===================================================================
  // DYNAMIC PROGRAMMING
  // ===================================================================

  // ---------- House Robber -----------------------------------------
  register("house-robber", {
    title: "House Robber — 1D DP",
    caption: "dp[i] = max(dp[i-1], dp[i-2] + nums[i]). Skip this house (carry forward) or rob it (and skip the previous).",
    code: [
      "dp[0] = nums[0]",
      "dp[1] = max(nums[0], nums[1])",
      "for i in 2..n-1:",
      "  skip = dp[i-1]",
      "  take = dp[i-2] + nums[i]",
      "  dp[i] = max(skip, take)",
      "return dp[n-1]",
    ],
    init() {
      const nums = [2, 7, 9, 3, 1, 5, 8];
      const dp = new Array(nums.length).fill(null);
      dp[0] = nums[0];
      dp[1] = Math.max(nums[0], nums[1]);
      return { nums, dp, i: 2, line: 0, skip: null, take: null, desc: `dp[0] = ${dp[0]}, dp[1] = ${dp[1]}` };
    },
    step(s) {
      if (s.i >= s.nums.length) return { ...s, line: 6, desc: `max = dp[${s.nums.length - 1}] = ${s.dp[s.nums.length - 1]}`, done: true };
      if (s.line === 0 || s.line === 6) return { ...s, line: 2, desc: `consider house ${s.i} (value ${s.nums[s.i]})` };
      if (s.line === 2) return { ...s, line: 3, skip: s.dp[s.i - 1], desc: `skip → carry dp[${s.i - 1}] = ${s.dp[s.i - 1]}` };
      if (s.line === 3) return { ...s, line: 4, take: s.dp[s.i - 2] + s.nums[s.i], desc: `take → dp[${s.i - 2}] + nums[${s.i}] = ${s.dp[s.i - 2]} + ${s.nums[s.i]} = ${s.dp[s.i - 2] + s.nums[s.i]}` };
      if (s.line === 4) {
        const dp = s.dp.slice();
        dp[s.i] = Math.max(s.skip, s.take);
        const choice = s.take >= s.skip ? "TAKE" : "SKIP";
        return { ...s, line: 5, dp, desc: `dp[${s.i}] = max(${s.skip}, ${s.take}) = ${dp[s.i]}  (${choice})` };
      }
      if (s.line === 5) return { ...s, line: 2, i: s.i + 1, skip: null, take: null, desc: "next house" };
    },
    render(s, stage) {
      stage.innerHTML = "";
      const wrap = document.createElement("div");
      wrap.style.display = "flex"; wrap.style.flexDirection = "column"; wrap.style.gap = "0.6rem"; wrap.style.width = "100%";
      // nums
      const nh = document.createElement("div");
      nh.innerHTML = `<div style="font-size:0.65rem;color:var(--md-default-fg-color--light);text-align:center;margin-bottom:0.25rem;">nums (house values)</div>`;
      const h1 = document.createElement("div");
      const hi1 = {};
      if (s.i < s.nums.length) hi1[s.i] = "cmp";
      P.array(h1, { arr: s.nums, pointers: { i: s.i < s.nums.length ? s.i : null }, highlight: hi1 });
      nh.appendChild(h1);
      wrap.appendChild(nh);
      // dp
      const dh = document.createElement("div");
      dh.innerHTML = `<div style="font-size:0.65rem;color:var(--md-default-fg-color--light);text-align:center;margin-bottom:0.25rem;">dp (best loot up to index)</div>`;
      const h2 = document.createElement("div");
      const hi2 = {};
      for (let k = 0; k < s.dp.length; k++) {
        if (s.dp[k] != null) hi2[k] = "filled";
      }
      if (s.i < s.dp.length) hi2[s.i] = "current";
      if (s.i - 1 >= 0 && s.i < s.dp.length) hi2[s.i - 1] = "read";
      if (s.i - 2 >= 0 && s.i < s.dp.length) hi2[s.i - 2] = "read";
      if (s.done) hi2[s.dp.length - 1] = "answer";
      P.array(h2, { arr: s.dp.map(v => v == null ? "" : v), highlight: hi2 });
      dh.appendChild(h2);
      wrap.appendChild(dh);
      stage.appendChild(wrap);
    },
    readout: s => [
      { label: "i", value: s.i < s.nums.length ? s.i : "—" },
      { label: "skip", value: s.skip ?? "—" },
      { label: "take", value: s.take ?? "—" },
      { label: "dp[i]", value: s.i < s.dp.length && s.dp[s.i] != null ? s.dp[s.i] : "—" },
    ],
  });

  // ---------- Climbing Stairs --------------------------------------
  register("climbing-stairs", {
    title: "Climbing Stairs — Fibonacci pattern",
    caption: "ways(n) = ways(n-1) + ways(n-2). Reach step n by a 1-step from n-1 or a 2-step from n-2.",
    code: [
      "dp[0] = 1; dp[1] = 1",
      "for i in 2..n:",
      "  dp[i] = dp[i-1] + dp[i-2]",
      "return dp[n]",
    ],
    init() {
      const n = 8;
      const dp = new Array(n + 1).fill(null);
      dp[0] = 1; dp[1] = 1;
      return { n, dp, i: 2, line: 0, desc: "dp[0] = dp[1] = 1 (one way to stand still or take one step)" };
    },
    step(s) {
      if (s.i > s.n) return { ...s, line: 3, desc: `dp[${s.n}] = ${s.dp[s.n]} ways to climb ${s.n} stairs`, done: true };
      if (s.line === 0 || s.line === 3) return { ...s, line: 1, desc: `compute dp[${s.i}]` };
      if (s.line === 1) {
        const dp = s.dp.slice();
        dp[s.i] = dp[s.i - 1] + dp[s.i - 2];
        return { ...s, dp, line: 2, desc: `dp[${s.i}] = dp[${s.i - 1}] + dp[${s.i - 2}] = ${s.dp[s.i - 1]} + ${s.dp[s.i - 2]} = ${dp[s.i]}` };
      }
      if (s.line === 2) return { ...s, i: s.i + 1, line: 1, desc: "next step" };
    },
    render(s, stage) {
      P.dpTable(stage, {
        rows: 1, cols: s.n + 1,
        colLabels: Array.from({ length: s.n + 1 }, (_, i) => `n=${i}`),
        cellOf: (r, c) => {
          let cls = s.dp[c] == null ? "" : "filled";
          if (c === s.i) cls = "current";
          if (c === s.i - 1 || c === s.i - 2) cls = "read";
          if (s.done && c === s.n) cls = "answer";
          return { val: s.dp[c] == null ? "" : s.dp[c], cls };
        },
      });
    },
    readout: s => [
      { label: "i", value: s.i <= s.n ? s.i : "—" },
      { label: "dp[i-1]", value: s.dp[s.i - 1] ?? "—" },
      { label: "dp[i-2]", value: s.dp[s.i - 2] ?? "—" },
    ],
  });

  // ---------- LIS (patience sorting) -------------------------------
  register("lis", {
    title: "Longest Increasing Subsequence — O(n log n) patience",
    caption: "tails[k] = smallest possible tail of any length-(k+1) increasing subsequence seen so far. Binary search to place each value.",
    code: [
      "tails = []",
      "for x in nums:",
      "  i = bisect_left(tails, x)",
      "  if i == len(tails): tails.append(x)",
      "  else: tails[i] = x",
      "return len(tails)",
    ],
    init() {
      return { nums: [10, 9, 2, 5, 3, 7, 101, 18, 4], i: 0, tails: [], line: 0, ins: null, desc: "begin scan" };
    },
    step(s) {
      if (s.i >= s.nums.length) return { ...s, line: 5, desc: `LIS length = ${s.tails.length}`, done: true };
      if (s.line === 0 || s.line === 5) return { ...s, line: 1, desc: `consider nums[${s.i}] = ${s.nums[s.i]}` };
      if (s.line === 1) {
        // bisect_left
        const x = s.nums[s.i];
        let lo = 0, hi = s.tails.length;
        while (lo < hi) {
          const mid = (lo + hi) >> 1;
          if (s.tails[mid] < x) lo = mid + 1; else hi = mid;
        }
        return { ...s, line: 2, ins: lo, desc: `bisect_left(tails, ${x}) = ${lo}` };
      }
      if (s.line === 2) {
        const tails = s.tails.slice();
        if (s.ins === tails.length) {
          tails.push(s.nums[s.i]);
          return { ...s, line: 3, tails, desc: `append ${s.nums[s.i]} — LIS grows to length ${tails.length}` };
        }
        const old = tails[s.ins];
        tails[s.ins] = s.nums[s.i];
        return { ...s, line: 4, tails, desc: `replace tails[${s.ins}] = ${old} → ${s.nums[s.i]} (same length, smaller tail)` };
      }
      if (s.line === 3 || s.line === 4) return { ...s, i: s.i + 1, ins: null, line: 1, desc: "next value" };
    },
    render(s, stage) {
      stage.innerHTML = "";
      const wrap = document.createElement("div");
      wrap.style.display = "flex"; wrap.style.flexDirection = "column"; wrap.style.gap = "0.7rem"; wrap.style.width = "100%";
      const top = document.createElement("div");
      top.innerHTML = `<div style="font-size:0.65rem;color:var(--md-default-fg-color--light);text-align:center;margin-bottom:0.25rem;">nums</div>`;
      const t1 = document.createElement("div");
      const hi = {};
      for (let k = 0; k < s.i; k++) hi[k] = "done";
      if (s.i < s.nums.length) hi[s.i] = "cmp";
      P.array(t1, { arr: s.nums, pointers: s.i < s.nums.length ? { i: s.i } : {}, highlight: hi });
      top.appendChild(t1);
      wrap.appendChild(top);
      const bot = document.createElement("div");
      bot.innerHTML = `<div style="font-size:0.65rem;color:var(--md-default-fg-color--light);text-align:center;margin-bottom:0.25rem;">tails (length = LIS length so far)</div>`;
      const t2 = document.createElement("div");
      const hi2 = {};
      if (s.ins != null && s.ins < s.tails.length) hi2[s.ins] = "cmp";
      P.array(t2, { arr: s.tails.length ? s.tails : ["∅"], indexed: !!s.tails.length, highlight: hi2 });
      bot.appendChild(t2);
      wrap.appendChild(bot);
      stage.appendChild(wrap);
    },
    readout: s => [
      { label: "i", value: s.i < s.nums.length ? s.i : "—" },
      { label: "x", value: s.i < s.nums.length ? s.nums[s.i] : "—" },
      { label: "tails.len", value: s.tails.length },
    ],
  });

  // ---------- Edit Distance ----------------------------------------
  register("edit-distance", {
    title: "Edit Distance (Levenshtein) — 2D DP",
    caption: "dp[i][j] = edits to transform a[..i] → b[..j]. Same char: carry diagonal. Else: 1 + min(insert, delete, replace).",
    code: [
      "dp[i][0] = i; dp[0][j] = j",
      "for i in 1..m, j in 1..n:",
      "  if a[i-1] == b[j-1]:",
      "    dp[i][j] = dp[i-1][j-1]",
      "  else:",
      "    dp[i][j] = 1 + min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1])",
      "return dp[m][n]",
    ],
    init() {
      const a = "HORSE", b = "ROS";
      const m = a.length, n = b.length;
      const dp = Array.from({ length: m + 1 }, (_, i) => {
        const row = new Array(n + 1).fill(null);
        row[0] = i;
        return row;
      });
      for (let j = 0; j <= n; j++) dp[0][j] = j;
      return { a, b, m, n, dp, i: 1, j: 1, line: 0, desc: "base: dp[i][0]=i (delete-all), dp[0][j]=j (insert-all)" };
    },
    step(s) {
      if (s.i > s.m) return { ...s, line: 6, desc: `edit distance = dp[${s.m}][${s.n}] = ${s.dp[s.m][s.n]}`, done: true };
      const ai = s.a[s.i - 1], bj = s.b[s.j - 1];
      const dp = s.dp.map(r => r.slice());
      let action;
      if (ai === bj) {
        dp[s.i][s.j] = dp[s.i - 1][s.j - 1];
        action = `a[${s.i - 1}]='${ai}' == b[${s.j - 1}]='${bj}' → carry dp[${s.i - 1}][${s.j - 1}] = ${dp[s.i][s.j]}`;
      } else {
        const ins = dp[s.i][s.j - 1];
        const del = dp[s.i - 1][s.j];
        const rep = dp[s.i - 1][s.j - 1];
        dp[s.i][s.j] = 1 + Math.min(ins, del, rep);
        action = `'${ai}'≠'${bj}': 1 + min(ins=${ins}, del=${del}, rep=${rep}) = ${dp[s.i][s.j]}`;
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
          let cls = s.dp[r][c] == null ? "" : "filled";
          if (r === 0 || c === 0) cls = "base";
          if (!s.done && r === s.i && c === s.j) cls = "current";
          else if (!s.done && ((r === s.i - 1 && c === s.j - 1) || (r === s.i - 1 && c === s.j) || (r === s.i && c === s.j - 1))) cls = "read";
          if (s.done && r === s.m && c === s.n) cls = "answer";
          return { val: s.dp[r][c] == null ? "" : s.dp[r][c], cls };
        },
      });
    },
    readout: s => [
      { label: "(i,j)", value: `(${s.i},${s.j})` },
      { label: "a[i-1]", value: s.i <= s.m ? `'${s.a[s.i - 1]}'` : "—" },
      { label: "b[j-1]", value: s.j <= s.n ? `'${s.b[s.j - 1]}'` : "—" },
    ],
  });

  // ---------- Unbounded Knapsack -----------------------------------
  register("knapsack-unbounded", {
    title: "Unbounded Knapsack — items reusable",
    caption: "dp[w] = max value with capacity w. Inner loop fills LEFT→RIGHT so dp[w-wt] may already include the current item again.",
    code: [
      "dp = [0]*(W+1)",
      "for i in items:",
      "  for w in wt[i]..W:",
      "    dp[w] = max(dp[w], dp[w-wt[i]] + val[i])",
      "return dp[W]",
    ],
    init() {
      const wt = [2, 3, 4], val = [4, 5, 6], W = 8;
      const dp = new Array(W + 1).fill(0);
      return { wt, val, W, dp, i: 0, w: 0, line: 0, desc: "dp all zero (no items chosen)" };
    },
    step(s) {
      if (s.i >= s.wt.length) return { ...s, line: 4, desc: `max value at W=${s.W} → ${s.dp[s.W]}`, done: true };
      const minW = s.wt[s.i];
      let nw = s.w < minW ? minW : s.w + 1;
      let ni = s.i;
      if (nw > s.W) { nw = 0; ni++; if (ni < s.wt.length) nw = s.wt[ni]; }
      if (ni >= s.wt.length) return { ...s, line: 4, i: ni, desc: `max value = ${s.dp[s.W]}`, done: true };
      const dp = s.dp.slice();
      const take = dp[nw - s.wt[ni]] + s.val[ni];
      const before = dp[nw];
      dp[nw] = Math.max(dp[nw], take);
      const updated = dp[nw] !== before;
      return {
        ...s, dp, i: ni, w: nw, line: 3,
        desc: `item ${ni} (wt=${s.wt[ni]}, val=${s.val[ni]}), w=${nw}: dp[${nw - s.wt[ni]}]+${s.val[ni]} = ${take} vs dp[${nw}]=${before} → ${dp[nw]}${updated ? " ✓" : ""}`,
      };
    },
    render(s, stage) {
      stage.innerHTML = "";
      const wrap = document.createElement("div");
      wrap.style.display = "flex"; wrap.style.flexDirection = "column"; wrap.style.gap = "0.7rem"; wrap.style.width = "100%";
      // items list
      const itemRow = document.createElement("div");
      itemRow.style.fontSize = "0.7rem";
      itemRow.style.fontFamily = "var(--md-code-font)";
      itemRow.style.textAlign = "center";
      itemRow.innerHTML = "<strong>items:</strong> " + s.wt.map((w, k) => `<span style="margin:0 .3rem;padding:.1rem .35rem;border-radius:4px;${k === s.i && !s.done ? "background:rgba(251,191,36,.3);color:#fbbf24;" : ""}">${k}: val=${s.val[k]}, wt=${w}</span>`).join("");
      wrap.appendChild(itemRow);
      // dp table
      const dpHost = document.createElement("div");
      P.dpTable(dpHost, {
        rows: 1, cols: s.W + 1,
        colLabels: Array.from({ length: s.W + 1 }, (_, k) => `w=${k}`),
        cellOf: (r, c) => {
          let cls = "filled";
          if (!s.done && c === s.w) cls = "current";
          else if (!s.done && s.i < s.wt.length && c === s.w - s.wt[s.i]) cls = "read";
          if (s.done && c === s.W) cls = "answer";
          return { val: s.dp[c], cls };
        },
      });
      wrap.appendChild(dpHost);
      stage.appendChild(wrap);
    },
    readout: s => [
      { label: "item", value: s.i < s.wt.length ? `${s.i}(val=${s.val[s.i]},wt=${s.wt[s.i]})` : "—" },
      { label: "w", value: s.w },
      { label: "dp[w]", value: s.dp[s.w] },
    ],
  });

  // ---------- Word Break -------------------------------------------
  register("word-break", {
    title: "Word Break — boolean DP over prefixes",
    caption: "dp[i] = can s[0..i] be split into dictionary words? True if some j with dp[j] AND s[j..i] in dict.",
    code: [
      "dp[0] = True",
      "for i in 1..n:",
      "  for j in 0..i-1:",
      "    if dp[j] and s[j..i] in dict:",
      "      dp[i] = True; break",
      "return dp[n]",
    ],
    init() {
      const s = "leetcode", dict = ["leet", "code"];
      const dp = new Array(s.length + 1).fill(false);
      dp[0] = true;
      return { s, dict, dp, i: 1, j: 0, line: 0, fragment: "", desc: "dp[0] = true (empty prefix is segmentable)" };
    },
    step(s) {
      if (s.i > s.s.length) return { ...s, line: 5, desc: `dp[${s.s.length}] = ${s.dp[s.s.length]}`, done: true };
      if (s.line === 0 || s.line === 5) return { ...s, line: 2, j: 0, desc: `try splits ending at i=${s.i}` };
      if (s.j >= s.i) return { ...s, line: 1, i: s.i + 1, j: 0, desc: `no split worked — dp[${s.i}] stays false` };
      const fragment = s.s.slice(s.j, s.i);
      if (s.line === 2) return { ...s, line: 3, fragment, desc: `j=${s.j}: dp[${s.j}]=${s.dp[s.j]} && "${fragment}" in dict?` };
      if (s.line === 3) {
        if (s.dp[s.j] && s.dict.includes(fragment)) {
          const dp = s.dp.slice();
          dp[s.i] = true;
          return { ...s, dp, line: 4, desc: `✓ "${fragment}" is in dict and dp[${s.j}]=true → dp[${s.i}] = true; break` };
        }
        return { ...s, line: 2, j: s.j + 1, fragment: "", desc: `✗ skip; try next j` };
      }
      if (s.line === 4) return { ...s, line: 1, i: s.i + 1, j: 0, fragment: "", desc: "next i" };
    },
    render(s, stage) {
      stage.innerHTML = "";
      const wrap = document.createElement("div");
      wrap.style.display = "flex"; wrap.style.flexDirection = "column"; wrap.style.gap = "0.7rem"; wrap.style.width = "100%";
      const dictRow = document.createElement("div");
      dictRow.style.fontSize = "0.7rem";
      dictRow.style.fontFamily = "var(--md-code-font)";
      dictRow.style.textAlign = "center";
      dictRow.innerHTML = `<strong>dict:</strong> {${s.dict.map(w => `"${w}"`).join(", ")}}`;
      wrap.appendChild(dictRow);
      // string with markers j and i
      const strRow = document.createElement("div");
      const arr = s.s.split("");
      const hi = {};
      for (let k = s.j; k < s.i && k < arr.length; k++) hi[k] = "window";
      const ptrs = {};
      if (s.j < arr.length) ptrs.j = s.j;
      if (s.i <= arr.length && s.i > 0) ptrs.i = s.i - 1;
      P.array(strRow, { arr, pointers: ptrs, highlight: hi, indexed: false });
      wrap.appendChild(strRow);
      // dp array
      const dpHost = document.createElement("div");
      dpHost.innerHTML = `<div style="font-size:0.62rem;color:var(--md-default-fg-color--light);text-align:center;margin-bottom:0.25rem;">dp[0..n]: can prefix be segmented?</div>`;
      const dp2 = document.createElement("div");
      P.array(dp2, {
        arr: s.dp.map(b => b ? "T" : "·"),
        indexed: true,
        highlight: Object.fromEntries(s.dp.map((b, k) => [k, b ? "done" : null]).filter(([, v]) => v)),
      });
      dpHost.appendChild(dp2);
      wrap.appendChild(dpHost);
      stage.appendChild(wrap);
    },
    readout: s => [
      { label: "i", value: s.i <= s.s.length ? s.i : "—" },
      { label: "j", value: s.j },
      { label: "s[j..i]", value: s.fragment || "—" },
    ],
  });

  // ---------- Palindrome Partitioning (count min cuts) -------------
  register("palindrome-partitioning", {
    title: "Palindrome Partitioning — minimum cuts",
    caption: "cuts[i] = min cuts for s[0..i]. If s[j..i] is a palindrome and dp[j-1] is solved, cuts[i] = min(cuts[i], cuts[j-1]+1).",
    code: [
      "for i in 0..n-1:",
      "  cuts[i] = i  # worst case",
      "  for j in 0..i:",
      "    if s[j..i] is palindrome:",
      "      cuts[i] = 0 if j == 0",
      "              else min(cuts[i], cuts[j-1]+1)",
    ],
    init() {
      const s = "aabbcc";
      const cuts = new Array(s.length).fill(null);
      return { s, cuts, i: 0, j: 0, line: 0, frag: "", desc: "compute cuts left-to-right" };
    },
    isPal(s) { return s === s.split("").reverse().join(""); },
    step(s) {
      if (s.i >= s.s.length) return { ...s, line: 5, desc: `min cuts = cuts[${s.s.length - 1}] = ${s.cuts[s.s.length - 1]}`, done: true };
      if (s.line === 0 || s.line === 5) {
        const cuts = s.cuts.slice();
        cuts[s.i] = s.i;
        return { ...s, cuts, line: 2, j: 0, frag: "", desc: `i=${s.i}: start with worst cuts[${s.i}] = ${s.i}` };
      }
      if (s.j > s.i) return { ...s, line: 1, i: s.i + 1, j: 0, desc: `cuts[${s.i}] settled at ${s.cuts[s.i]}` };
      const frag = s.s.slice(s.j, s.i + 1);
      if (s.line === 2) return { ...s, line: 3, frag, desc: `j=${s.j}: try "${frag}"` };
      if (s.line === 3) {
        const pal = frag === frag.split("").reverse().join("");
        if (pal) {
          const cuts = s.cuts.slice();
          const cand = s.j === 0 ? 0 : s.cuts[s.j - 1] + 1;
          const before = cuts[s.i];
          cuts[s.i] = Math.min(cuts[s.i], cand);
          return { ...s, cuts, line: 4, j: s.j + 1, frag: "", desc: `"${frag}" is palindrome → cand = ${cand}; cuts[${s.i}] = min(${before}, ${cand}) = ${cuts[s.i]}` };
        }
        return { ...s, line: 2, j: s.j + 1, frag: "", desc: `"${frag}" not palindrome — skip` };
      }
      if (s.line === 4) return { ...s, line: 2, frag: "", desc: "next j" };
    },
    render(s, stage) {
      stage.innerHTML = "";
      const wrap = document.createElement("div");
      wrap.style.display = "flex"; wrap.style.flexDirection = "column"; wrap.style.gap = "0.7rem"; wrap.style.width = "100%";
      const strHost = document.createElement("div");
      const arr = s.s.split("");
      const hi = {};
      for (let k = s.j; k <= s.i && k < arr.length; k++) hi[k] = "window";
      const ptrs = {};
      if (s.j < arr.length) ptrs.j = s.j;
      if (s.i < arr.length) ptrs.i = s.i;
      P.array(strHost, { arr, pointers: ptrs, highlight: hi, indexed: true });
      wrap.appendChild(strHost);
      const cutsHost = document.createElement("div");
      cutsHost.innerHTML = `<div style="font-size:0.62rem;color:var(--md-default-fg-color--light);text-align:center;margin-bottom:0.25rem;">cuts[0..n-1]</div>`;
      const c2 = document.createElement("div");
      P.array(c2, {
        arr: s.cuts.map(v => v == null ? "" : v),
        indexed: true,
        highlight: Object.fromEntries(s.cuts.map((v, k) => [k, v == null ? null : (k === s.i ? "current" : "filled")]).filter(([, v]) => v)),
      });
      cutsHost.appendChild(c2);
      wrap.appendChild(cutsHost);
      stage.appendChild(wrap);
    },
    readout: s => [
      { label: "i", value: s.i < s.s.length ? s.i : "—" },
      { label: "j", value: s.j },
      { label: "s[j..i]", value: s.frag || "—" },
      { label: "cuts[i]", value: s.i < s.cuts.length ? (s.cuts[s.i] ?? "—") : "—" },
    ],
  });

  // ===================================================================
  // BACKTRACKING (overrides for permutations, combinations, n-queens, generate-parens, word-search)
  // ===================================================================

  // ---------- Permutations (swap-based) ----------------------------
  register("permutations", {
    title: "Permutations — swap-into-position",
    caption: "At depth i, swap each j ≥ i into position i, recurse on i+1, undo the swap. Each leaf is a permutation.",
    code: [
      "def bt(i):",
      "  if i == n: emit a[:]",
      "  for j in i..n-1:",
      "    swap(a[i], a[j])",
      "    bt(i + 1)",
      "    swap(a[i], a[j])",
    ],
    init() {
      const a = [1, 2, 3];
      // stack frames: { i, j, phase: 0=enter, 1=after-swap-recurse, 2=done }
      return { a, frames: [{ i: 0, j: 0, phase: 0 }], result: [], line: 0, desc: "enter bt(0)" };
    },
    step(s) {
      if (!s.frames.length) return { ...s, line: 6, desc: `done — ${s.result.length} permutations`, done: true };
      const frames = s.frames.map(f => ({ ...f }));
      const top = frames[frames.length - 1];
      if (top.i === s.a.length) {
        frames.pop();
        return { ...s, frames, result: [...s.result, s.a.slice()], line: 1, desc: `leaf — record ${JSON.stringify(s.a)}` };
      }
      if (top.j >= s.a.length) {
        frames.pop();
        return { ...s, frames, line: 6, desc: `return from bt(${top.i})` };
      }
      if (top.phase === 0) {
        // do swap
        const a = s.a.slice();
        [a[top.i], a[top.j]] = [a[top.j], a[top.i]];
        top.phase = 1;
        frames[frames.length - 1] = top;
        return { ...s, a, frames, line: 3, desc: `at depth ${top.i}: swap a[${top.i}] ↔ a[${top.j}] → ${JSON.stringify(a)}` };
      }
      if (top.phase === 1) {
        top.phase = 2;
        frames[frames.length - 1] = top;
        return { ...s, frames: [...frames, { i: top.i + 1, j: top.i + 1, phase: 0 }], line: 4, desc: `recurse bt(${top.i + 1})` };
      }
      if (top.phase === 2) {
        // undo swap, advance j
        const a = s.a.slice();
        [a[top.i], a[top.j]] = [a[top.j], a[top.i]];
        top.j += 1;
        top.phase = 0;
        frames[frames.length - 1] = top;
        return { ...s, a, frames, line: 5, desc: `undo swap; next j = ${top.j}` };
      }
    },
    render(s, stage) {
      stage.innerHTML = "";
      const wrap = document.createElement("div");
      wrap.style.display = "flex"; wrap.style.flexDirection = "column"; wrap.style.gap = "0.6rem"; wrap.style.width = "100%";
      // current array
      const arrHost = document.createElement("div");
      const top = s.frames[s.frames.length - 1];
      const hi = {};
      if (top) {
        for (let k = 0; k < top.i; k++) hi[k] = "done";
        if (top.i < s.a.length) hi[top.i] = "current";
        if (top.j !== top.i && top.j < s.a.length) hi[top.j] = "cmp";
      }
      P.array(arrHost, { arr: s.a, highlight: hi });
      wrap.appendChild(arrHost);
      // call stack depth
      const stk = document.createElement("div");
      stk.style.fontSize = "0.72rem";
      stk.style.fontFamily = "var(--md-code-font)";
      stk.style.color = "var(--md-default-fg-color--light)";
      stk.style.textAlign = "center";
      stk.innerHTML = `<strong>call stack:</strong> ${s.frames.map(f => `bt(${f.i}, j=${f.j})`).join(" → ") || "—"}`;
      wrap.appendChild(stk);
      // results
      const res = document.createElement("div");
      res.style.fontFamily = "var(--md-code-font)";
      res.style.fontSize = "0.72rem";
      res.style.color = "var(--md-default-fg-color--light)";
      res.style.textAlign = "center";
      res.innerHTML = `<strong>found (${s.result.length}):</strong> ${s.result.map(p => JSON.stringify(p)).join("  ·  ") || "—"}`;
      wrap.appendChild(res);
      stage.appendChild(wrap);
    },
    readout: s => {
      const top = s.frames[s.frames.length - 1];
      return [
        { label: "depth", value: s.frames.length },
        { label: "i", value: top ? top.i : "—" },
        { label: "j", value: top ? top.j : "—" },
        { label: "found", value: s.result.length },
      ];
    },
  });

  // ---------- Combinations C(n,k) ----------------------------------
  register("combinations", {
    title: "Combinations C(n, k) — choose-or-skip",
    caption: "Walk candidates left→right. At each, include it and recurse, then exclude it and continue.",
    code: [
      "def bt(start, path):",
      "  if len(path) == k: emit path",
      "  for i in start..n:",
      "    path.append(i)",
      "    bt(i + 1, path)",
      "    path.pop()",
    ],
    init() {
      return { n: 4, k: 2, path: [], frames: [{ start: 1, i: 1, phase: 0 }], result: [], line: 0, desc: "begin bt(start=1, path=[])" };
    },
    step(s) {
      if (!s.frames.length) return { ...s, line: 5, desc: `done — ${s.result.length} combinations`, done: true };
      const frames = s.frames.map(f => ({ ...f }));
      const top = frames[frames.length - 1];
      if (s.path.length === s.k) {
        frames.pop();
        return { ...s, frames, path: s.path.slice(0, -0), result: [...s.result, s.path.slice()], line: 1, desc: `emit ${JSON.stringify(s.path)}` };
      }
      if (top.i > s.n) {
        frames.pop();
        return { ...s, frames, line: 5, desc: `return — exhausted at start=${top.start}` };
      }
      if (top.phase === 0) {
        top.phase = 1;
        frames[frames.length - 1] = top;
        return { ...s, frames: [...frames, { start: top.i + 1, i: top.i + 1, phase: 0 }], path: [...s.path, top.i], line: 3, desc: `include ${top.i}; recurse` };
      }
      if (top.phase === 1) {
        top.phase = 0;
        top.i += 1;
        frames[frames.length - 1] = top;
        return { ...s, frames, path: s.path.slice(0, -1), line: 4, desc: `pop ${s.path[s.path.length - 1]}; try i=${top.i}` };
      }
    },
    render(s, stage) {
      stage.innerHTML = "";
      const wrap = document.createElement("div");
      wrap.style.display = "flex"; wrap.style.flexDirection = "column"; wrap.style.gap = "0.6rem"; wrap.style.width = "100%";
      // candidates
      const arr = Array.from({ length: s.n }, (_, k) => k + 1);
      const hi = {};
      s.path.forEach(v => { hi[v - 1] = "done"; });
      const top = s.frames[s.frames.length - 1];
      if (top && top.i <= s.n) hi[top.i - 1] = "current";
      const arrHost = document.createElement("div");
      P.array(arrHost, { arr, highlight: hi, indexed: false });
      wrap.appendChild(arrHost);
      const p = document.createElement("div");
      p.style.fontFamily = "var(--md-code-font)";
      p.style.fontSize = "0.74rem";
      p.style.textAlign = "center";
      p.innerHTML = `<strong>path:</strong> ${JSON.stringify(s.path)}`;
      wrap.appendChild(p);
      const r = document.createElement("div");
      r.style.fontFamily = "var(--md-code-font)";
      r.style.fontSize = "0.7rem";
      r.style.color = "var(--md-default-fg-color--light)";
      r.style.textAlign = "center";
      r.innerHTML = `<strong>found (${s.result.length}):</strong> ${s.result.map(p => JSON.stringify(p)).join(" · ") || "—"}`;
      wrap.appendChild(r);
      stage.appendChild(wrap);
    },
    readout: s => [
      { label: "n,k", value: `${s.n},${s.k}` },
      { label: "path", value: JSON.stringify(s.path) },
      { label: "found", value: s.result.length },
    ],
  });

  // ---------- Generate Parentheses ---------------------------------
  register("generate-parens", {
    title: "Generate Parentheses — open/close constraints",
    caption: "open < n → can add '('. close < open → can add ')'. Each leaf at length 2n is a valid string.",
    code: [
      "def bt(s, open, close):",
      "  if len(s) == 2*n: emit s",
      "  if open < n: bt(s + '(', open+1, close)",
      "  if close < open: bt(s + ')', open, close+1)",
    ],
    init() {
      return { n: 3, frames: [{ s: "", open: 0, close: 0, phase: 0 }], result: [], line: 0, desc: "begin bt('', 0, 0)" };
    },
    step(s) {
      if (!s.frames.length) return { ...s, line: 3, desc: `done — ${s.result.length} strings`, done: true };
      const frames = s.frames.map(f => ({ ...f }));
      const top = frames[frames.length - 1];
      if (top.s.length === 2 * s.n) {
        frames.pop();
        return { ...s, frames, result: [...s.result, top.s], line: 1, desc: `emit "${top.s}"` };
      }
      if (top.phase === 0) {
        top.phase = 1;
        frames[frames.length - 1] = top;
        if (top.open < s.n) {
          return { ...s, frames: [...frames, { s: top.s + "(", open: top.open + 1, close: top.close, phase: 0 }], line: 2, desc: `open<${s.n}: add '(' → "${top.s}("` };
        }
        return { ...s, frames, line: 2, desc: `open=${top.open}≥n — skip '('` };
      }
      if (top.phase === 1) {
        top.phase = 2;
        frames[frames.length - 1] = top;
        if (top.close < top.open) {
          return { ...s, frames: [...frames, { s: top.s + ")", open: top.open, close: top.close + 1, phase: 0 }], line: 3, desc: `close<open: add ')' → "${top.s})"` };
        }
        return { ...s, frames, line: 3, desc: `close=${top.close}≥open=${top.open} — skip ')'` };
      }
      if (top.phase === 2) {
        frames.pop();
        return { ...s, frames, line: 3, desc: `return from bt("${top.s}")` };
      }
    },
    render(s, stage) {
      stage.innerHTML = "";
      const wrap = document.createElement("div");
      wrap.style.display = "flex"; wrap.style.flexDirection = "column"; wrap.style.gap = "0.5rem"; wrap.style.width = "100%";
      const top = s.frames[s.frames.length - 1];
      const cur = document.createElement("div");
      cur.style.fontFamily = "var(--md-code-font)";
      cur.style.fontSize = "1.1rem";
      cur.style.fontWeight = "700";
      cur.style.textAlign = "center";
      cur.style.padding = "0.6rem";
      cur.innerHTML = top ? `"${top.s}"` : `"<em style="color:var(--md-default-fg-color--light)">—</em>"`;
      wrap.appendChild(cur);
      const meta = document.createElement("div");
      meta.style.textAlign = "center";
      meta.style.fontSize = "0.74rem";
      meta.style.fontFamily = "var(--md-code-font)";
      meta.innerHTML = top ? `open: <strong>${top.open}</strong>  ·  close: <strong>${top.close}</strong>  ·  remaining: <strong>${2 * s.n - top.s.length}</strong>` : "";
      wrap.appendChild(meta);
      const stk = document.createElement("div");
      stk.style.fontSize = "0.7rem";
      stk.style.fontFamily = "var(--md-code-font)";
      stk.style.color = "var(--md-default-fg-color--light)";
      stk.style.textAlign = "center";
      stk.innerHTML = `<strong>call stack depth:</strong> ${s.frames.length}`;
      wrap.appendChild(stk);
      const r = document.createElement("div");
      r.style.fontFamily = "var(--md-code-font)";
      r.style.fontSize = "0.72rem";
      r.style.color = "var(--md-default-fg-color--light)";
      r.style.textAlign = "center";
      r.style.lineHeight = "1.7";
      r.innerHTML = `<strong>found (${s.result.length}):</strong> ${s.result.map(x => `"${x}"`).join(" · ") || "—"}`;
      wrap.appendChild(r);
      stage.appendChild(wrap);
    },
    readout: s => {
      const top = s.frames[s.frames.length - 1];
      return [
        { label: "n", value: s.n },
        { label: "depth", value: s.frames.length },
        { label: "open", value: top ? top.open : "—" },
        { label: "close", value: top ? top.close : "—" },
      ];
    },
  });

  // ---------- N-Queens ---------------------------------------------
  register("n-queens", {
    title: "N-Queens — row-by-row with attack sets",
    caption: "Place one queen per row. cols, diag1 (r+c), diag2 (r-c) give O(1) attack checks. Backtrack on conflict.",
    code: [
      "def bt(row, cols, d1, d2):",
      "  if row == n: emit board",
      "  for c in 0..n-1:",
      "    if c in cols or row+c in d1 or row-c in d2: skip",
      "    place; bt(row+1, cols∪{c}, d1∪{row+c}, d2∪{row-c}); unplace",
    ],
    init() {
      const n = 5;
      return {
        n, board: new Array(n).fill(-1), frames: [{ row: 0, c: 0 }],
        cols: {}, d1: {}, d2: {}, result: [], line: 0, attacked: null,
        desc: `try queen in row 0`,
      };
    },
    step(s) {
      if (!s.frames.length) return { ...s, line: 5, desc: `done — ${s.result.length} solutions`, done: true };
      const frames = s.frames.map(f => ({ ...f }));
      const top = frames[frames.length - 1];
      if (top.row === s.n) {
        frames.pop();
        return { ...s, frames, result: [...s.result, s.board.slice()], line: 1, desc: `solution recorded` };
      }
      if (top.c >= s.n) {
        frames.pop();
        // unplace previous row's queen (if any)
        if (frames.length) {
          const parent = frames[frames.length - 1];
          const r = parent.row;
          const c = s.board[r];
          const board = s.board.slice();
          board[r] = -1;
          const cols = { ...s.cols }; delete cols[c];
          const d1 = { ...s.d1 }; delete d1[r + c];
          const d2 = { ...s.d2 }; delete d2[r - c];
          parent.c = c + 1;
          frames[frames.length - 1] = parent;
          return { ...s, frames, board, cols, d1, d2, line: 5, desc: `backtrack: unplace queen at (${r},${c}); try next col` };
        }
        return { ...s, frames, line: 5, desc: "no more cols at row 0 — finished" };
      }
      const r = top.row, c = top.c;
      if (s.cols[c] || s.d1[r + c] || s.d2[r - c]) {
        const reason = s.cols[c] ? "col" : s.d1[r + c] ? "↘ diag" : "↙ diag";
        top.c += 1;
        frames[frames.length - 1] = top;
        return { ...s, frames, attacked: { r, c, reason }, line: 4, desc: `(${r},${c}) attacked (${reason}) — skip` };
      }
      const board = s.board.slice();
      board[r] = c;
      const cols = { ...s.cols, [c]: true };
      const d1 = { ...s.d1, [r + c]: true };
      const d2 = { ...s.d2, [r - c]: true };
      return { ...s, frames: [...frames, { row: r + 1, c: 0 }], board, cols, d1, d2, attacked: null, line: 5, desc: `place queen at (${r},${c}); recurse row ${r + 1}` };
    },
    render(s, stage) {
      P.grid(stage, {
        rows: s.n, cols: s.n,
        cellSize: 36,
        cellOf: (r, c) => {
          let cls = (r + c) % 2 === 0 ? "" : "water";
          let val = "";
          if (s.board[r] === c) { cls = "start"; val = "♛"; }
          if (s.attacked && s.attacked.r === r && s.attacked.c === c) cls = "wall";
          const top = s.frames[s.frames.length - 1];
          if (top && top.row === r && top.c === c && s.board[r] !== c) cls = "visit";
          return { val, cls };
        },
      });
    },
    readout: s => {
      const top = s.frames[s.frames.length - 1];
      return [
        { label: "row", value: top ? top.row : "—" },
        { label: "trying c", value: top ? top.c : "—" },
        { label: "solutions", value: s.result.length },
      ];
    },
  });

  // ===================================================================
  // SORTING (overrides for insertion, selection, heap, counting, radix)
  // ===================================================================

  // ---------- Insertion sort ---------------------------------------
  register("insertion-sort", {
    title: "Insertion sort — grow the sorted prefix",
    caption: "Pick a[i] as the key. Shift larger elements one slot right until the key fits.",
    code: [
      "for i in 1..n-1:",
      "  key = a[i]; j = i - 1",
      "  while j >= 0 and a[j] > key:",
      "    a[j+1] = a[j]; j -= 1",
      "  a[j+1] = key",
    ],
    init() {
      return { arr: [5, 2, 4, 6, 1, 3], i: 1, j: 0, key: 2, line: 0, phase: "start", desc: "start outer loop" };
    },
    step(s) {
      const n = s.arr.length;
      if (s.i >= n) return { ...s, line: 5, phase: "done", desc: "sorted", done: true };
      if (s.phase === "start") {
        return { ...s, phase: "key", key: s.arr[s.i], j: s.i - 1, line: 1, desc: `key = a[${s.i}] = ${s.arr[s.i]}; j = ${s.i - 1}` };
      }
      if (s.phase === "key") return { ...s, phase: "compare", line: 2, desc: `loop while j ≥ 0 and a[j] > key` };
      if (s.phase === "compare") {
        if (s.j < 0 || s.arr[s.j] <= s.key) return { ...s, phase: "insert", line: 4, desc: s.j < 0 ? `j < 0 — insert at 0` : `a[${s.j}] = ${s.arr[s.j]} ≤ ${s.key} — insert at ${s.j + 1}` };
        return { ...s, phase: "shift", line: 3, desc: `a[${s.j}] = ${s.arr[s.j]} > ${s.key} — shift right` };
      }
      if (s.phase === "shift") {
        const a = s.arr.slice();
        a[s.j + 1] = a[s.j];
        return { ...s, arr: a, phase: "compare", j: s.j - 1, line: 2, desc: `a[${s.j + 1}] ← a[${s.j}]; j → ${s.j - 1}` };
      }
      if (s.phase === "insert") {
        const a = s.arr.slice();
        a[s.j + 1] = s.key;
        return { ...s, arr: a, phase: "start", i: s.i + 1, line: 0, desc: `drop key ${s.key} at index ${s.j + 1}` };
      }
    },
    render(s, stage) {
      const hi = {};
      for (let k = 0; k < s.i; k++) hi[k] = "done";
      if (s.i < s.arr.length) hi[s.i] = "target";
      if (s.phase === "compare" && s.j >= 0) hi[s.j] = "cmp";
      if (s.phase === "shift" && s.j >= 0) hi[s.j] = "swap";
      P.array(stage, { arr: s.arr, pointers: { i: s.i, j: s.j }, highlight: hi });
    },
    readout: s => [
      { label: "i", value: s.i },
      { label: "j", value: s.j },
      { label: "key", value: s.key },
      { label: "sorted", value: s.i },
    ],
  });

  // ---------- Selection sort ---------------------------------------
  register("selection-sort", {
    title: "Selection sort — pick the min, swap to front",
    caption: "Scan the unsorted suffix for the minimum, swap it into a[i].",
    code: [
      "for i in 0..n-1:",
      "  m = i",
      "  for j in i+1..n-1:",
      "    if a[j] < a[m]: m = j",
      "  swap(a[i], a[m])",
    ],
    init() {
      return { arr: [29, 10, 14, 37, 13, 25, 8], i: 0, j: 1, m: 0, line: 0, phase: "scan", desc: "scan for min from index 0" };
    },
    step(s) {
      const n = s.arr.length;
      if (s.i >= n - 1) return { ...s, line: 4, desc: "sorted", done: true };
      if (s.phase === "scan") {
        if (s.j >= n) return { ...s, phase: "swap", line: 4, desc: `min at index ${s.m} (value ${s.arr[s.m]}); swap with index ${s.i}` };
        const m = s.arr[s.j] < s.arr[s.m] ? s.j : s.m;
        const changed = m !== s.m;
        return { ...s, m, j: s.j + 1, line: changed ? 3 : 2, desc: changed ? `a[${s.j}]=${s.arr[s.j]} < a[m]=${s.arr[s.m]} → m = ${s.j}` : `a[${s.j}]=${s.arr[s.j]} ≥ a[m]=${s.arr[s.m]} — skip` };
      }
      if (s.phase === "swap") {
        const a = s.arr.slice();
        [a[s.i], a[s.m]] = [a[s.m], a[s.i]];
        return { ...s, arr: a, phase: "scan", i: s.i + 1, j: s.i + 2, m: s.i + 1, line: 1, desc: `swapped → sorted prefix grows to ${s.i + 1}` };
      }
    },
    render(s, stage) {
      const hi = {};
      for (let k = 0; k < s.i; k++) hi[k] = "done";
      hi[s.m] = "target";
      if (s.j < s.arr.length && s.phase === "scan") hi[s.j] = "cmp";
      if (s.phase === "swap") { hi[s.i] = "swap"; hi[s.m] = "swap"; }
      P.array(stage, { arr: s.arr, pointers: { i: s.i, j: s.j, m: s.m }, highlight: hi });
    },
    readout: s => [{ label: "i", value: s.i }, { label: "j", value: s.j }, { label: "m", value: s.m }, { label: "a[m]", value: s.arr[s.m] }],
  });

  // ---------- Heap sort --------------------------------------------
  register("heap-sort", {
    title: "Heap sort — build max-heap, repeatedly swap root to tail",
    caption: "First build a max-heap. Then swap root with last, shrink the heap, sift the root down. Sorted region grows from the end.",
    code: [
      "build_max_heap(a)",
      "for end in n-1..1:",
      "  swap(a[0], a[end])",
      "  sift_down(a, 0, end)",
    ],
    init() {
      // pre-built max-heap to keep viz short: original [3,9,2,1,4,5] heapified → [9,4,5,1,3,2]
      const arr = [9, 4, 5, 1, 3, 2];
      return { arr, end: arr.length - 1, sifting: -1, phase: "swap", line: 0, desc: "max-heap is built; sorted region empty" };
    },
    step(s) {
      const a = s.arr.slice();
      if (s.end < 1) return { ...s, line: 4, desc: "fully sorted", done: true };
      if (s.phase === "swap") {
        [a[0], a[s.end]] = [a[s.end], a[0]];
        return { ...s, arr: a, phase: "sift", sifting: 0, line: 2, desc: `swap root (max) ↔ a[${s.end}]; sorted region grows to ${s.arr.length - s.end}` };
      }
      if (s.phase === "sift") {
        const heapSize = s.end;
        const i = s.sifting;
        const l = 2 * i + 1, r = 2 * i + 2;
        let largest = i;
        if (l < heapSize && a[l] > a[largest]) largest = l;
        if (r < heapSize && a[r] > a[largest]) largest = r;
        if (largest === i) {
          return { ...s, phase: "swap", end: s.end - 1, sifting: -1, line: 3, desc: `sift down complete at index ${i}; shrink heap` };
        }
        [a[i], a[largest]] = [a[largest], a[i]];
        return { ...s, arr: a, sifting: largest, line: 3, desc: `sift: a[${i}]=${s.arr[i]} ↔ a[${largest}]=${s.arr[largest]}` };
      }
    },
    render(s, stage) {
      const hi = {};
      const sorted = s.arr.length - 1 - s.end;
      for (let k = s.end + 1; k < s.arr.length; k++) hi[k] = "done";
      if (s.phase === "swap" && s.end >= 0) { hi[0] = "swap"; hi[s.end] = "swap"; }
      if (s.phase === "sift" && s.sifting >= 0) hi[s.sifting] = "cmp";
      P.array(stage, { arr: s.arr, highlight: hi });
    },
    readout: s => [{ label: "heap end", value: s.end }, { label: "sifting", value: s.sifting }, { label: "sorted", value: s.arr.length - 1 - s.end }],
  });

  // ---------- Counting sort ----------------------------------------
  register("counting-sort", {
    title: "Counting sort — tally and emit",
    caption: "Build a count array of size K+1. Then walk values 0..K, emit each value count[v] times into the output.",
    code: [
      "count = [0]*(K+1)",
      "for x in a: count[x] += 1",
      "out = []",
      "for v in 0..K:",
      "  out += [v] * count[v]",
    ],
    init() {
      const arr = [4, 2, 2, 8, 3, 3, 1];
      const K = Math.max(...arr);
      return { arr, K, count: new Array(K + 1).fill(0), out: [], i: 0, v: 0, line: 0, phase: "tally", desc: "tally counts" };
    },
    step(s) {
      if (s.phase === "tally") {
        if (s.i >= s.arr.length) return { ...s, phase: "emit-prep", i: 0, v: 0, line: 2, desc: "tally complete; begin emit phase" };
        const x = s.arr[s.i];
        const count = s.count.slice();
        count[x] += 1;
        return { ...s, count, i: s.i + 1, line: 1, desc: `count[${x}] += 1 → ${count[x]}` };
      }
      if (s.phase === "emit-prep") return { ...s, phase: "emit", line: 3, desc: "walk values 0..K" };
      if (s.phase === "emit") {
        if (s.v > s.K) return { ...s, phase: "done", line: 4, desc: `output = ${s.out.join(",")}`, done: true };
        const c = s.count[s.v];
        if (c === 0) return { ...s, v: s.v + 1, line: 3, desc: `count[${s.v}] = 0 — skip` };
        return { ...s, out: [...s.out, ...new Array(c).fill(s.v)], v: s.v + 1, line: 4, desc: `emit ${s.v} × ${c}` };
      }
    },
    render(s, stage) {
      stage.innerHTML = "";
      const wrap = document.createElement("div");
      wrap.style.display = "flex"; wrap.style.flexDirection = "column"; wrap.style.gap = "0.55rem"; wrap.style.width = "100%";
      // input
      const i1 = document.createElement("div");
      i1.innerHTML = `<div style="font-size:0.62rem;color:var(--md-default-fg-color--light);text-align:center;margin-bottom:0.2rem;">input</div>`;
      const t1 = document.createElement("div");
      const hi1 = {};
      if (s.phase === "tally" && s.i < s.arr.length) hi1[s.i] = "cmp";
      P.array(t1, { arr: s.arr, highlight: hi1 });
      i1.appendChild(t1);
      wrap.appendChild(i1);
      // count
      const i2 = document.createElement("div");
      i2.innerHTML = `<div style="font-size:0.62rem;color:var(--md-default-fg-color--light);text-align:center;margin-bottom:0.2rem;">count[v]</div>`;
      const t2 = document.createElement("div");
      const hi2 = {};
      if (s.phase === "tally" && s.i < s.arr.length) hi2[s.arr[s.i]] = "current";
      if (s.phase === "emit" && s.v <= s.K) hi2[s.v] = "current";
      P.array(t2, { arr: s.count, indexed: true, highlight: hi2 });
      i2.appendChild(t2);
      wrap.appendChild(i2);
      // out
      const i3 = document.createElement("div");
      i3.innerHTML = `<div style="font-size:0.62rem;color:var(--md-default-fg-color--light);text-align:center;margin-bottom:0.2rem;">output</div>`;
      const t3 = document.createElement("div");
      P.array(t3, { arr: s.out.length ? s.out : ["—"], indexed: !!s.out.length, highlight: s.out.length ? Object.fromEntries(s.out.map((_, k) => [k, "done"])) : {} });
      i3.appendChild(t3);
      wrap.appendChild(i3);
      stage.appendChild(wrap);
    },
    readout: s => [{ label: "phase", value: s.phase }, { label: "i", value: s.i }, { label: "v", value: s.v }, { label: "out.len", value: s.out.length }],
  });

  // ---------- Radix sort -------------------------------------------
  register("radix-sort", {
    title: "Radix sort — LSD, stable per-digit",
    caption: "Stably sort by digit position from least to most significant. Here: 10 buckets per pass.",
    code: [
      "for digit_pos in 0, 1, 2, ...:",
      "  buckets = [[] for _ in range(10)]",
      "  for x in a: buckets[digit(x, pos)].append(x)",
      "  a = flatten(buckets)",
    ],
    init() {
      return { arr: [170, 45, 75, 90, 802, 24, 2, 66], pos: 0, buckets: null, line: 0, phase: "start", desc: "start at LSD (pos=0)" };
    },
    step(s) {
      const maxNum = Math.max(...s.arr);
      const maxPos = Math.floor(Math.log10(maxNum || 1));
      if (s.phase === "done") return { ...s, done: true };
      if (s.pos > maxPos) return { ...s, phase: "done", line: 3, desc: `sorted: ${s.arr.join(",")}`, done: true };
      if (s.phase === "start") {
        const buckets = Array.from({ length: 10 }, () => []);
        return { ...s, buckets, phase: "distribute", line: 1, desc: `pass ${s.pos}: bucketize by digit at 10^${s.pos}` };
      }
      if (s.phase === "distribute") {
        const buckets = s.buckets.map(b => b.slice());
        s.arr.forEach(x => {
          const d = Math.floor(x / Math.pow(10, s.pos)) % 10;
          buckets[d].push(x);
        });
        return { ...s, buckets, phase: "collect", line: 2, desc: `distributed into 10 buckets by digit` };
      }
      if (s.phase === "collect") {
        const arr = [].concat(...s.buckets);
        return { ...s, arr, buckets: null, phase: "start", pos: s.pos + 1, line: 3, desc: `collected: ${arr.join(",")}` };
      }
    },
    render(s, stage) {
      stage.innerHTML = "";
      const wrap = document.createElement("div");
      wrap.style.display = "flex"; wrap.style.flexDirection = "column"; wrap.style.gap = "0.6rem"; wrap.style.width = "100%";
      const top = document.createElement("div");
      top.innerHTML = `<div style="font-size:0.62rem;color:var(--md-default-fg-color--light);text-align:center;margin-bottom:0.2rem;">array</div>`;
      const t1 = document.createElement("div");
      P.array(t1, { arr: s.arr });
      top.appendChild(t1);
      wrap.appendChild(top);
      if (s.buckets) {
        const b = document.createElement("div");
        b.style.display = "grid";
        b.style.gridTemplateColumns = "repeat(10, 1fr)";
        b.style.gap = "0.25rem";
        b.style.fontSize = "0.66rem";
        b.style.fontFamily = "var(--md-code-font)";
        s.buckets.forEach((bk, d) => {
          const col = document.createElement("div");
          col.style.textAlign = "center";
          col.style.padding = "0.3rem 0.2rem";
          col.style.background = bk.length ? "rgba(167,139,250,0.12)" : "rgba(120,120,140,0.06)";
          col.style.borderRadius = "6px";
          col.innerHTML = `<div style="font-weight:700;color:#a78bfa;">d=${d}</div>${bk.map(v => `<div>${v}</div>`).join("")}`;
          b.appendChild(col);
        });
        wrap.appendChild(b);
      }
      stage.appendChild(wrap);
    },
    readout: s => [{ label: "pos (10^k)", value: s.pos }, { label: "phase", value: s.phase }],
  });

  // ===================================================================
  // MONOTONIC STACK (overrides for daily-temperatures, largest-rectangle)
  // ===================================================================

  // ---------- Daily Temperatures -----------------------------------
  register("daily-temperatures", {
    title: "Daily Temperatures — monotonic decreasing stack of indices",
    caption: "Stack stores indices waiting for a warmer day. On each i, pop everything cooler and answer those days with (i - popped).",
    code: [
      "res = [0]*n; stack = []",
      "for i in 0..n-1:",
      "  while stack and t[stack[-1]] < t[i]:",
      "    j = stack.pop(); res[j] = i - j",
      "  stack.append(i)",
    ],
    init() {
      const arr = [73, 74, 75, 71, 69, 72, 76, 73];
      return { arr, i: 0, stack: [], res: arr.map(() => 0), line: 0, phase: "consider", desc: "begin scan" };
    },
    step(s) {
      if (s.i >= s.arr.length) return { ...s, line: 4, desc: `result = [${s.res.join(",")}]`, done: true };
      if (s.phase === "consider") return { ...s, phase: "while", line: 1, desc: `consider day ${s.i} (temp ${s.arr[s.i]})` };
      if (s.phase === "while") {
        if (s.stack.length && s.arr[s.stack[s.stack.length - 1]] < s.arr[s.i]) {
          const st = s.stack.slice();
          const j = st.pop();
          const res = s.res.slice();
          res[j] = s.i - j;
          return { ...s, stack: st, res, line: 3, desc: `t[${j}]=${s.arr[j]} < t[${s.i}]=${s.arr[s.i]} — answer day ${j}: wait ${s.i - j}` };
        }
        return { ...s, phase: "push", line: 4, desc: `nothing cooler on stack — push ${s.i}` };
      }
      if (s.phase === "push") {
        return { ...s, stack: [...s.stack, s.i], i: s.i + 1, phase: "consider", line: 0, desc: `stack = [${[...s.stack, s.i].join(",")}]` };
      }
    },
    render(s, stage) {
      stage.innerHTML = "";
      const wrap = document.createElement("div");
      wrap.style.display = "flex"; wrap.style.flexDirection = "column"; wrap.style.gap = "0.55rem"; wrap.style.width = "100%";
      const a1 = document.createElement("div");
      a1.innerHTML = `<div style="font-size:0.62rem;color:var(--md-default-fg-color--light);text-align:center;margin-bottom:0.2rem;">temperatures</div>`;
      const t1 = document.createElement("div");
      const hi = {};
      s.stack.forEach(k => hi[k] = "window");
      if (s.i < s.arr.length) hi[s.i] = "cmp";
      P.array(t1, { arr: s.arr, pointers: s.i < s.arr.length ? { i: s.i } : {}, highlight: hi });
      a1.appendChild(t1);
      wrap.appendChild(a1);
      const a2 = document.createElement("div");
      a2.innerHTML = `<div style="font-size:0.62rem;color:var(--md-default-fg-color--light);text-align:center;margin-bottom:0.2rem;">days to wait</div>`;
      const t2 = document.createElement("div");
      P.array(t2, { arr: s.res, indexed: true });
      a2.appendChild(t2);
      wrap.appendChild(a2);
      stage.appendChild(wrap);
    },
    readout: s => [{ label: "i", value: s.i < s.arr.length ? s.i : "—" }, { label: "stack", value: `[${s.stack.join(",")}]` }, { label: "phase", value: s.phase }],
  });

  // ---------- Largest Rectangle in Histogram -----------------------
  register("largest-rectangle", {
    title: "Largest Rectangle in Histogram — monotonic stack",
    caption: "Maintain a stack of strictly increasing heights. On a drop, pop and compute the rectangle bounded by neighbours.",
    code: [
      "stack = []; best = 0",
      "for i in 0..n (sentinel 0 at end):",
      "  while stack and heights[stack[-1]] > h[i]:",
      "    top = stack.pop()",
      "    width = i if not stack else i - stack[-1] - 1",
      "    area = heights[top] * width",
      "    best = max(best, area)",
      "  stack.append(i)",
    ],
    init() {
      const heights = [2, 1, 5, 6, 2, 3];
      return { heights, i: 0, stack: [], best: 0, lastArea: null, line: 0, phase: "consider", desc: "scan with sentinel 0 at the end" };
    },
    step(s) {
      const n = s.heights.length;
      const cur = s.i < n ? s.heights[s.i] : 0;
      if (s.phase === "consider") {
        if (s.i > n) return { ...s, line: 7, desc: `best area = ${s.best}`, done: true };
        return { ...s, phase: "while", line: 1, desc: s.i === n ? `sentinel: i=${n} (h=0)` : `consider i=${s.i} (h=${cur})` };
      }
      if (s.phase === "while") {
        if (s.stack.length && s.heights[s.stack[s.stack.length - 1]] > cur) {
          const st = s.stack.slice();
          const top = st.pop();
          const width = st.length === 0 ? s.i : s.i - st[st.length - 1] - 1;
          const area = s.heights[top] * width;
          const best = Math.max(s.best, area);
          return { ...s, stack: st, best, lastArea: { top, width, area }, line: 5, desc: `pop index ${top} (h=${s.heights[top]}); width=${width}; area=${area}; best=${best}` };
        }
        return { ...s, phase: "push", line: 7, desc: `stack monotone non-decreasing — push ${s.i}` };
      }
      if (s.phase === "push") {
        if (s.i >= n) return { ...s, phase: "consider", i: s.i + 1, line: 7, desc: `all popped, best=${s.best}` };
        return { ...s, stack: [...s.stack, s.i], i: s.i + 1, phase: "consider", line: 7, desc: `stack = [${[...s.stack, s.i].join(",")}]` };
      }
    },
    render(s, stage) {
      stage.innerHTML = "";
      const arr = s.heights;
      const cellW = 44, gap = 3, pad = 30, maxH = 120;
      const max = Math.max(...arr, 1);
      const n = arr.length;
      const W = pad * 2 + n * (cellW + gap);
      const H = maxH + 70;
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
      svg.setAttribute("width", W);
      svg.style.maxWidth = "100%"; svg.style.height = "auto";

      // bars
      arr.forEach((h, idx) => {
        const x = pad + idx * (cellW + gap);
        const bh = h / max * maxH;
        const y = pad + (maxH - bh);
        let cls = "dsa-cell";
        if (s.stack.includes(idx)) cls = "dsa-cell dsa-cell--window";
        if (idx === s.i && s.i < n) cls = "dsa-cell dsa-cell--cmp";
        const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        rect.setAttribute("x", x); rect.setAttribute("y", y);
        rect.setAttribute("width", cellW); rect.setAttribute("height", bh);
        rect.setAttribute("rx", 4);
        rect.setAttribute("class", cls);
        svg.appendChild(rect);
        const t = document.createElementNS("http://www.w3.org/2000/svg", "text");
        t.setAttribute("x", x + cellW / 2); t.setAttribute("y", pad + maxH + 16);
        t.setAttribute("text-anchor", "middle");
        t.setAttribute("class", "dsa-cell-text");
        t.textContent = h;
        svg.appendChild(t);
        const idxT = document.createElementNS("http://www.w3.org/2000/svg", "text");
        idxT.setAttribute("x", x + cellW / 2); idxT.setAttribute("y", pad + maxH + 30);
        idxT.setAttribute("text-anchor", "middle");
        idxT.setAttribute("class", "dsa-cell-index");
        idxT.textContent = idx;
        svg.appendChild(idxT);
      });
      // highlight last computed rectangle
      if (s.lastArea) {
        const { top, width } = s.lastArea;
        const startIdx = s.stack.length ? s.stack[s.stack.length - 1] + 1 : 0;
        const x0 = pad + startIdx * (cellW + gap);
        const w = (cellW + gap) * width - gap;
        const bh = s.heights[top] / max * maxH;
        const y = pad + (maxH - bh);
        const r = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        r.setAttribute("x", x0); r.setAttribute("y", y);
        r.setAttribute("width", w); r.setAttribute("height", bh);
        r.setAttribute("fill", "rgba(52, 211, 153, 0.18)");
        r.setAttribute("stroke", "#34d399");
        r.setAttribute("stroke-dasharray", "5 3");
        svg.appendChild(r);
      }
      stage.appendChild(svg);
    },
    readout: s => [
      { label: "i", value: s.i },
      { label: "stack", value: `[${s.stack.join(",")}]` },
      { label: "last area", value: s.lastArea ? s.lastArea.area : "—" },
      { label: "best", value: s.best },
    ],
  });

  // ===================================================================
  // LINKED LIST (overrides for merge-two-sorted-ll, remove-nth-end, lru-cache)
  // ===================================================================

  // ---------- Merge two sorted lists -------------------------------
  register("merge-two-sorted-ll", {
    title: "Merge two sorted lists — dummy head + tail",
    caption: "Compare a.head vs b.head; thread the smaller onto the merged tail; advance that pointer. Append the leftover list at the end.",
    code: [
      "dummy = Node(0); tail = dummy",
      "while a and b:",
      "  if a.val <= b.val: tail.next = a; a = a.next",
      "  else: tail.next = b; b = b.next",
      "  tail = tail.next",
      "tail.next = a or b",
    ],
    init() {
      return {
        a: [1, 4, 5, 8],
        b: [2, 3, 6, 7],
        ai: 0, bi: 0, out: [], line: 0, took: null,
        desc: "two sorted lists; dummy head ready",
      };
    },
    step(s) {
      if (s.ai >= s.a.length && s.bi >= s.b.length) return { ...s, line: 5, desc: `merged = ${s.out.join(",")}`, done: true };
      if (s.ai >= s.a.length) return { ...s, out: [...s.out, s.b[s.bi]], bi: s.bi + 1, line: 5, took: "b", desc: `a exhausted — append b[${s.bi}] = ${s.b[s.bi]}` };
      if (s.bi >= s.b.length) return { ...s, out: [...s.out, s.a[s.ai]], ai: s.ai + 1, line: 5, took: "a", desc: `b exhausted — append a[${s.ai}] = ${s.a[s.ai]}` };
      const av = s.a[s.ai], bv = s.b[s.bi];
      if (av <= bv) return { ...s, out: [...s.out, av], ai: s.ai + 1, line: 2, took: "a", desc: `a.val ${av} ≤ b.val ${bv} — take a` };
      return { ...s, out: [...s.out, bv], bi: s.bi + 1, line: 3, took: "b", desc: `b.val ${bv} < a.val ${av} — take b` };
    },
    render(s, stage) {
      stage.innerHTML = "";
      const wrap = document.createElement("div");
      wrap.style.display = "flex"; wrap.style.flexDirection = "column"; wrap.style.gap = "0.55rem"; wrap.style.width = "100%";
      const a1 = document.createElement("div");
      a1.innerHTML = `<div style="font-size:0.62rem;color:var(--md-default-fg-color--light);text-align:center;margin-bottom:0.2rem;">list a</div>`;
      const t1 = document.createElement("div");
      const ha = {};
      for (let k = 0; k < s.ai; k++) ha[k] = "done";
      if (s.ai < s.a.length) ha[s.ai] = s.took === "a" ? "swap" : "cmp";
      P.linkedList(t1, { nodes: s.a.map((v, k) => ({ val: v, highlight: ha[k] })), pointers: s.ai < s.a.length ? { a: s.ai } : {} });
      a1.appendChild(t1);
      wrap.appendChild(a1);
      const a2 = document.createElement("div");
      a2.innerHTML = `<div style="font-size:0.62rem;color:var(--md-default-fg-color--light);text-align:center;margin-bottom:0.2rem;">list b</div>`;
      const t2 = document.createElement("div");
      const hb = {};
      for (let k = 0; k < s.bi; k++) hb[k] = "done";
      if (s.bi < s.b.length) hb[s.bi] = s.took === "b" ? "swap" : "cmp";
      P.linkedList(t2, { nodes: s.b.map((v, k) => ({ val: v, highlight: hb[k] })), pointers: s.bi < s.b.length ? { b: s.bi } : {} });
      a2.appendChild(t2);
      wrap.appendChild(a2);
      const a3 = document.createElement("div");
      a3.innerHTML = `<div style="font-size:0.62rem;color:var(--md-default-fg-color--light);text-align:center;margin-bottom:0.2rem;">merged (dummy → tail)</div>`;
      const t3 = document.createElement("div");
      P.linkedList(t3, { nodes: s.out.length ? s.out.map((v) => ({ val: v, highlight: "done" })) : [{ val: "ø" }] });
      a3.appendChild(t3);
      wrap.appendChild(a3);
      stage.appendChild(wrap);
    },
    readout: s => [{ label: "a→", value: s.ai < s.a.length ? s.a[s.ai] : "—" }, { label: "b→", value: s.bi < s.b.length ? s.b[s.bi] : "—" }, { label: "merged.len", value: s.out.length }],
  });

  // ---------- Remove Nth from end ----------------------------------
  register("remove-nth-end", {
    title: "Remove Nth from end — gap pointers",
    caption: "Advance fast n+1 steps so the gap is n. Walk slow & fast together until fast hits null — slow.next is the target.",
    code: [
      "dummy = Node(0, head)",
      "slow = fast = dummy",
      "for _ in range(n+1): fast = fast.next",
      "while fast: slow = slow.next; fast = fast.next",
      "slow.next = slow.next.next  # delete",
    ],
    init() {
      const nodes = [
        { val: "•" /* dummy */ },
        { val: 1 }, { val: 2 }, { val: 3 }, { val: 4 }, { val: 5 },
      ];
      return { nodes, n: 2, slow: 0, fast: 0, phase: "advance-fast", advanced: 0, line: 0, desc: "dummy node prepended; slow & fast at dummy" };
    },
    step(s) {
      if (s.phase === "advance-fast") {
        if (s.advanced > s.n) return { ...s, phase: "walk-both", line: 3, desc: `gap of ${s.n} established` };
        if (s.advanced === s.n + 1) return { ...s, phase: "walk-both", line: 3, desc: `gap of ${s.n} established` };
        if (s.fast + 1 >= s.nodes.length) {
          // already at end — corner case
          return { ...s, phase: "walk-both", line: 3, desc: `fast reached end during pre-advance` };
        }
        return { ...s, fast: s.fast + 1, advanced: s.advanced + 1, line: 2, desc: `advance fast (${s.advanced + 1}/${s.n + 1})` };
      }
      if (s.phase === "walk-both") {
        if (s.fast >= s.nodes.length) return { ...s, phase: "delete", line: 4, desc: `fast walked off the end (null); slow.next is the target` };
        const slowVal = s.nodes[s.slow + 1].val;
        const fastVal = s.fast + 1 < s.nodes.length ? s.nodes[s.fast + 1].val : "null";
        return { ...s, slow: s.slow + 1, fast: s.fast + 1, line: 3, desc: `slow → ${slowVal}, fast → ${fastVal}` };
      }
      if (s.phase === "delete") {
        const nodes = s.nodes.slice();
        const target = nodes[s.slow + 1].val;
        nodes.splice(s.slow + 1, 1);
        return { ...s, nodes, phase: "done", line: 4, desc: `delete node with value ${target}`, done: true };
      }
    },
    render(s, stage) {
      const ptrs = {};
      if (s.slow < s.nodes.length) ptrs.slow = s.slow;
      if (s.fast < s.nodes.length) ptrs.fast = s.fast;
      const hi = {};
      hi[s.slow] = "visit";
      hi[s.fast] = "cycle";
      if (s.slow === s.fast) hi[s.slow] = "visit";
      if (s.phase === "delete" || s.phase === "done") {
        // mark dummy
        if (s.nodes[0] && s.nodes[0].val === "•") hi[0] = null;
      }
      P.linkedList(stage, {
        nodes: s.nodes.map((n, k) => ({ val: n.val, highlight: hi[k] })),
        pointers: ptrs,
      });
    },
    readout: s => [{ label: "phase", value: s.phase }, { label: "slow", value: s.nodes[s.slow]?.val }, { label: "fast", value: s.nodes[s.fast]?.val }, { label: "advanced", value: s.advanced }],
  });

  // ---------- LRU Cache (DLL + hashmap) ----------------------------
  register("lru-cache", {
    title: "LRU Cache — doubly linked list + hashmap",
    caption: "Most-recent at head, LRU at tail. get/put move/insert at head; if size exceeds cap, evict tail. Map gives O(1) node lookup.",
    code: [
      "get(k): if k in map: move node to head; return val",
      "put(k, v): if exists: update + move to head",
      "           else: insert at head;",
      "                 if size > cap: evict tail",
    ],
    init() {
      const ops = [["put", 1, 1], ["put", 2, 2], ["get", 1], ["put", 3, 3], ["get", 2], ["put", 4, 4], ["get", 1], ["get", 3]];
      return { cap: 2, list: [], opIdx: 0, ops, lastEvict: null, lastResult: null, line: 0, desc: "empty cache (cap=2)" };
    },
    step(s) {
      if (s.opIdx >= s.ops.length) return { ...s, line: 4, desc: "ops complete", done: true };
      const op = s.ops[s.opIdx];
      let list = s.list.slice();
      let lastEvict = null, lastResult = null, desc = "";
      if (op[0] === "get") {
        const k = op[1];
        const idx = list.findIndex(e => e.k === k);
        if (idx === -1) {
          lastResult = -1;
          desc = `get(${k}) → -1 (miss)`;
        } else {
          const node = list.splice(idx, 1)[0];
          list.unshift(node);
          lastResult = node.v;
          desc = `get(${k}) → ${node.v}; moved to head`;
        }
        return { ...s, list, opIdx: s.opIdx + 1, lastEvict, lastResult, line: 1, desc };
      }
      // put
      const [, k, v] = op;
      const idx = list.findIndex(e => e.k === k);
      if (idx !== -1) {
        list.splice(idx, 1);
        list.unshift({ k, v });
        desc = `put(${k},${v}) — update + move to head`;
        return { ...s, list, opIdx: s.opIdx + 1, lastResult: null, line: 2, desc };
      }
      list.unshift({ k, v });
      if (list.length > s.cap) {
        lastEvict = list.pop();
        desc = `put(${k},${v}) — insert at head; evict LRU (${lastEvict.k},${lastEvict.v})`;
      } else {
        desc = `put(${k},${v}) — insert at head`;
      }
      return { ...s, list, opIdx: s.opIdx + 1, lastEvict, lastResult: null, line: 3, desc };
    },
    render(s, stage) {
      stage.innerHTML = "";
      const wrap = document.createElement("div");
      wrap.style.display = "flex"; wrap.style.flexDirection = "column"; wrap.style.gap = "0.55rem"; wrap.style.width = "100%";
      const opRow = document.createElement("div");
      opRow.style.fontFamily = "var(--md-code-font)";
      opRow.style.fontSize = "0.72rem";
      opRow.style.textAlign = "center";
      const ops = s.ops.map((o, k) => {
        const txt = o[0] === "get" ? `get(${o[1]})` : `put(${o[1]},${o[2]})`;
        const cls = k === s.opIdx - 1 ? "background:rgba(251,191,36,0.3);color:#fbbf24;" : (k < s.opIdx ? "color:var(--md-default-fg-color--lighter);" : "");
        return `<span style="margin:0 .25rem;padding:.1rem .35rem;border-radius:4px;${cls}">${txt}</span>`;
      }).join("");
      opRow.innerHTML = `<strong>ops:</strong> ${ops}`;
      wrap.appendChild(opRow);
      const dllRow = document.createElement("div");
      dllRow.innerHTML = `<div style="font-size:0.62rem;color:var(--md-default-fg-color--light);text-align:center;margin-bottom:0.2rem;">head ← (most recent → least recent) → tail</div>`;
      const t = document.createElement("div");
      P.linkedList(t, {
        nodes: s.list.length ? s.list.map((e, k) => ({ val: `${e.k}=${e.v}`, highlight: k === 0 ? "visit" : (k === s.list.length - 1 ? "cycle" : null) })) : [{ val: "ø" }],
      });
      dllRow.appendChild(t);
      wrap.appendChild(dllRow);
      const ev = document.createElement("div");
      ev.style.fontFamily = "var(--md-code-font)";
      ev.style.fontSize = "0.7rem";
      ev.style.textAlign = "center";
      ev.style.color = "var(--md-default-fg-color--light)";
      const evictTxt = s.lastEvict ? `<span style="color:#ef4444;">evicted: (${s.lastEvict.k},${s.lastEvict.v})</span>` : "";
      const resTxt = s.lastResult != null ? `<span style="color:#34d399;">returned: ${s.lastResult}</span>` : "";
      ev.innerHTML = [evictTxt, resTxt].filter(Boolean).join("  ·  ") || "&nbsp;";
      wrap.appendChild(ev);
      stage.appendChild(wrap);
    },
    readout: s => [{ label: "cap", value: s.cap }, { label: "size", value: s.list.length }, { label: "op", value: `${s.opIdx}/${s.ops.length}` }],
  });

})();
