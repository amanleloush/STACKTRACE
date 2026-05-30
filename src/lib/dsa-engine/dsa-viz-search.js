/* ===========================================================
   Brain Detox Arc — DSA visualization upgrades (search batch)
   ----------------------------------------------------------
   Replaces the codeWalk stubs in dsa-algorithms.js for
   binary-search variants:
     - first-last-occurrence
     - rotated-search
     - 2d-matrix
     - median-of-two
   Engine just sets REG[key] = cfg so the latest registration
   wins.
   =========================================================== */
(function () {
  "use strict";
  if (!window.DSA) { console.error("dsa-viz.js must load first"); return; }
  const { primitives: P, register } = window.DSA;

  // ===================================================================
  // First / Last occurrence — biased binary search (two phases)
  // ===================================================================
  register("first-last-occurrence", {
    title: "First / Last occurrence — biased binary search",
    caption: "Two binary searches. Phase 1 records ans on equality and pushes hi left (find leftmost). Phase 2 records ans and pushes lo right (find rightmost).",
    code: [
      "# phase 1: first occurrence",
      "lo, hi, first = 0, n-1, -1",
      "while lo <= hi:",
      "  mid = (lo+hi)//2",
      "  if a[mid] == t: first = mid; hi = mid - 1",
      "  elif a[mid] < t: lo = mid + 1",
      "  else: hi = mid - 1",
      "# phase 2: last occurrence (lo = mid+1 on equality)",
    ],
    init() {
      const arr = [1, 2, 2, 2, 3, 4, 5, 5, 5, 6];
      const target = 2;
      return {
        arr, target,
        lo: 0, hi: arr.length - 1, mid: -1, ans: -1,
        firstIdx: -1, lastIdx: -1,
        phase: "first",
        line: 0,
        desc: "phase 1: search for leftmost 2",
      };
    },
    step(s) {
      if (s.phase === "done") return { ...s, done: true };

      // current phase exhausted?
      if (s.lo > s.hi) {
        if (s.phase === "first") {
          // commit ans to firstIdx, start phase 2
          return {
            ...s,
            firstIdx: s.ans,
            phase: "last",
            line: 7,
            lo: 0, hi: s.arr.length - 1, mid: -1, ans: -1,
            desc: s.ans >= 0
              ? `first occurrence = index ${s.ans}; now find last`
              : `target not present (first = -1); skipping phase 2`,
          };
        }
        // phase "last" exhausted
        return {
          ...s,
          lastIdx: s.ans,
          phase: "done",
          line: 7,
          desc: `first = ${s.firstIdx}, last = ${s.ans}`,
          done: true,
        };
      }

      // compute mid (every cycle except right after we computed it on line 3)
      if (s.line !== 3) {
        const mid = Math.floor((s.lo + s.hi) / 2);
        return { ...s, mid, line: 3, desc: `mid = (${s.lo} + ${s.hi}) // 2 = ${mid}` };
      }

      // compare
      const v = s.arr[s.mid];
      if (v === s.target) {
        if (s.phase === "first") {
          return {
            ...s,
            ans: s.mid,
            hi: s.mid - 1,
            line: 4,
            desc: `a[${s.mid}] = ${v} == ${s.target}: record ans = ${s.mid}, push hi → ${s.mid - 1} (look further left)`,
          };
        }
        // phase "last"
        return {
          ...s,
          ans: s.mid,
          lo: s.mid + 1,
          line: 4,
          desc: `a[${s.mid}] = ${v} == ${s.target}: record ans = ${s.mid}, push lo → ${s.mid + 1} (look further right)`,
        };
      }
      if (v < s.target) {
        return {
          ...s,
          lo: s.mid + 1,
          line: 5,
          desc: `a[${s.mid}] = ${v} < ${s.target} — search right (lo → ${s.mid + 1})`,
        };
      }
      return {
        ...s,
        hi: s.mid - 1,
        line: 6,
        desc: `a[${s.mid}] = ${v} > ${s.target} — search left (hi → ${s.mid - 1})`,
      };
    },
    render(s, stage) {
      stage.innerHTML = "";
      const wrap = document.createElement("div");
      wrap.style.display = "flex";
      wrap.style.flexDirection = "column";
      wrap.style.gap = "0.55rem";
      wrap.style.width = "100%";

      // phase tag
      const tag = document.createElement("div");
      tag.style.textAlign = "center";
      tag.style.fontSize = "0.72rem";
      tag.style.fontFamily = "var(--md-code-font)";
      const phaseLabel = s.phase === "first" ? "phase 1 — first occurrence" :
        s.phase === "last" ? "phase 2 — last occurrence" : "done";
      tag.innerHTML = `<strong>${phaseLabel}</strong> &nbsp;·&nbsp; target = <strong>${s.target}</strong>`;
      wrap.appendChild(tag);

      // array
      const hi = {};
      for (let i = 0; i < s.arr.length; i++) {
        if (i < s.lo || i > s.hi) hi[i] = "ghost";
      }
      // highlight firstIdx and lastIdx as found
      if (s.firstIdx >= 0) hi[s.firstIdx] = "found";
      if (s.lastIdx >= 0) hi[s.lastIdx] = "found";
      // active mid
      if (s.mid >= 0 && !s.done) hi[s.mid] = "cmp";
      // tentative ans within current phase
      if (s.ans >= 0 && !s.done) hi[s.ans] = "target";

      const ptrs = { lo: s.lo, hi: s.hi };
      if (s.mid >= 0) ptrs.mid = s.mid;
      if (s.ans >= 0) ptrs.ans = s.ans;

      const aHost = document.createElement("div");
      P.array(aHost, { arr: s.arr, pointers: ptrs, highlight: hi });
      wrap.appendChild(aHost);

      stage.appendChild(wrap);
    },
    readout: s => [
      { label: "phase", value: s.phase },
      { label: "lo", value: s.lo },
      { label: "hi", value: s.hi },
      { label: "mid", value: s.mid >= 0 ? s.mid : "—" },
      { label: "ans", value: s.ans >= 0 ? s.ans : "—" },
      { label: "first", value: s.firstIdx >= 0 ? s.firstIdx : "—" },
      { label: "last", value: s.lastIdx >= 0 ? s.lastIdx : "—" },
    ],
  });

  // ===================================================================
  // Search in rotated sorted array
  // ===================================================================
  register("rotated-search", {
    title: "Search in rotated sorted array",
    caption: "At every mid, exactly one half [lo..mid] or [mid..hi] is sorted. Identify it, check if target lies inside, then descend into the half that must contain it.",
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
    init() {
      const arr = [4, 5, 6, 7, 0, 1, 2, 3];
      return {
        arr, target: 1,
        lo: 0, hi: arr.length - 1, mid: -1,
        sortedHalf: null, // "left" | "right" | null
        line: 0,
        desc: "search begins on the full rotated array",
      };
    },
    step(s) {
      if (s.lo > s.hi) {
        return { ...s, line: 9, mid: -1, sortedHalf: null, desc: "lo > hi — target not found", done: true };
      }
      // 1) compute mid
      if (s.line === 0 || s.line === 4 || s.line === 5 || s.line === 7 || s.line === 8) {
        const mid = Math.floor((s.lo + s.hi) / 2);
        return { ...s, mid, line: 1, sortedHalf: null, desc: `mid = (${s.lo} + ${s.hi}) // 2 = ${mid}` };
      }
      // 2) check equality
      if (s.line === 1) {
        if (s.arr[s.mid] === s.target) {
          return { ...s, line: 2, desc: `a[${s.mid}] = ${s.arr[s.mid]} == target — found!`, done: true };
        }
        // determine sorted half
        if (s.arr[s.lo] <= s.arr[s.mid]) {
          return { ...s, line: 3, sortedHalf: "left", desc: `a[lo]=${s.arr[s.lo]} ≤ a[mid]=${s.arr[s.mid]} → LEFT half [${s.lo}..${s.mid}] is sorted` };
        }
        return { ...s, line: 6, sortedHalf: "right", desc: `a[lo]=${s.arr[s.lo]} > a[mid]=${s.arr[s.mid]} → RIGHT half [${s.mid}..${s.hi}] is sorted` };
      }
      // left half sorted: check whether target lies in [a[lo], a[mid])
      if (s.line === 3) {
        if (s.arr[s.lo] <= s.target && s.target < s.arr[s.mid]) {
          return { ...s, hi: s.mid - 1, line: 4, desc: `target ${s.target} ∈ [${s.arr[s.lo]}, ${s.arr[s.mid]}) — descend LEFT (hi → ${s.mid - 1})` };
        }
        return { ...s, lo: s.mid + 1, line: 5, desc: `target ${s.target} ∉ sorted-left — descend RIGHT (lo → ${s.mid + 1})` };
      }
      // right half sorted: check whether target lies in (a[mid], a[hi]]
      if (s.line === 6) {
        if (s.arr[s.mid] < s.target && s.target <= s.arr[s.hi]) {
          return { ...s, lo: s.mid + 1, line: 7, desc: `target ${s.target} ∈ (${s.arr[s.mid]}, ${s.arr[s.hi]}] — descend RIGHT (lo → ${s.mid + 1})` };
        }
        return { ...s, hi: s.mid - 1, line: 8, desc: `target ${s.target} ∉ sorted-right — descend LEFT (hi → ${s.mid - 1})` };
      }
    },
    render(s, stage) {
      stage.innerHTML = "";
      const wrap = document.createElement("div");
      wrap.style.display = "flex";
      wrap.style.flexDirection = "column";
      wrap.style.gap = "0.5rem";
      wrap.style.width = "100%";

      const tag = document.createElement("div");
      tag.style.textAlign = "center";
      tag.style.fontSize = "0.72rem";
      tag.style.fontFamily = "var(--md-code-font)";
      const sortedTxt = s.sortedHalf === "left"
        ? `<span style="color:#38bdf8">LEFT [${s.lo}..${s.mid}] sorted</span>`
        : s.sortedHalf === "right"
          ? `<span style="color:#38bdf8">RIGHT [${s.mid}..${s.hi}] sorted</span>`
          : "<em style='color:var(--md-default-fg-color--light)'>pending</em>";
      tag.innerHTML = `target = <strong>${s.target}</strong> &nbsp;·&nbsp; sorted half: ${sortedTxt}`;
      wrap.appendChild(tag);

      const hi = {};
      for (let i = 0; i < s.arr.length; i++) {
        if (i < s.lo || i > s.hi) hi[i] = "ghost";
      }
      // mark known-sorted half as window
      if (s.sortedHalf === "left" && s.mid >= 0) {
        for (let i = s.lo; i <= s.mid; i++) hi[i] = "window";
      } else if (s.sortedHalf === "right" && s.mid >= 0) {
        for (let i = s.mid; i <= s.hi; i++) hi[i] = "window";
      }
      if (s.mid >= 0) hi[s.mid] = s.done && s.arr[s.mid] === s.target ? "found" : "cmp";

      const ptrs = { lo: s.lo, hi: s.hi };
      if (s.mid >= 0) ptrs.mid = s.mid;

      const aHost = document.createElement("div");
      P.array(aHost, { arr: s.arr, pointers: ptrs, highlight: hi });
      wrap.appendChild(aHost);

      stage.appendChild(wrap);
    },
    readout: s => [
      { label: "lo", value: s.lo },
      { label: "hi", value: s.hi },
      { label: "mid", value: s.mid >= 0 ? s.mid : "—" },
      { label: "a[mid]", value: s.mid >= 0 ? s.arr[s.mid] : "—" },
      { label: "sorted", value: s.sortedHalf || "—" },
      { label: "target", value: s.target },
    ],
  });

  // ===================================================================
  // Search a 2D matrix — staircase from top-right
  // ===================================================================
  register("2d-matrix", {
    title: "Search 2D Matrix — staircase from top-right",
    caption: "Rows and columns are both sorted ascending. From top-right: if cell == target done; if cell > target step left (eliminate column); else step down (eliminate row).",
    code: [
      "r, c = 0, cols - 1",
      "while r < rows and c >= 0:",
      "  if M[r][c] == t: return True",
      "  elif M[r][c] > t: c -= 1   # column eliminated",
      "  else: r += 1               # row eliminated",
      "return False",
    ],
    init() {
      const M = [
        [1, 4, 7, 11],
        [2, 5, 8, 12],
        [3, 6, 9, 16],
        [10, 13, 14, 17],
      ];
      const target = 5;
      const rows = M.length, cols = M[0].length;
      // eliminated[r][c] = "col" | "row" | null
      const eliminated = Array.from({ length: rows }, () => new Array(cols).fill(null));
      return {
        M, rows, cols, target,
        r: 0, c: cols - 1,
        eliminated,
        found: false,
        line: 0,
        desc: `start at top-right (0, ${cols - 1})`,
      };
    },
    step(s) {
      if (s.found || s.r >= s.rows || s.c < 0) {
        return {
          ...s,
          line: s.found ? 2 : 5,
          desc: s.found ? `found target ${s.target} at (${s.r}, ${s.c})` : `walked off the matrix — target ${s.target} not present`,
          done: true,
        };
      }
      const v = s.M[s.r][s.c];
      if (v === s.target) {
        return { ...s, found: true, line: 2, desc: `M[${s.r}][${s.c}] = ${v} == target — found!` };
      }
      const eliminated = s.eliminated.map(row => row.slice());
      if (v > s.target) {
        // eliminate the whole current column from row r downward (those are all > target)
        for (let rr = s.r; rr < s.rows; rr++) {
          if (eliminated[rr][s.c] == null) eliminated[rr][s.c] = "col";
        }
        return {
          ...s,
          eliminated,
          c: s.c - 1,
          line: 3,
          desc: `M[${s.r}][${s.c}] = ${v} > ${s.target} — column ${s.c} eliminated; step left (c → ${s.c - 1})`,
        };
      }
      // v < target: eliminate the whole current row from col 0 to c (those are all ≤ v < target)
      for (let cc = 0; cc <= s.c; cc++) {
        if (eliminated[s.r][cc] == null) eliminated[s.r][cc] = "row";
      }
      return {
        ...s,
        eliminated,
        r: s.r + 1,
        line: 4,
        desc: `M[${s.r}][${s.c}] = ${v} < ${s.target} — row ${s.r} eliminated; step down (r → ${s.r + 1})`,
      };
    },
    render(s, stage) {
      P.grid(stage, {
        rows: s.rows, cols: s.cols,
        cellSize: 48,
        cellOf: (r, c) => {
          const v = s.M[r][c];
          let cls = "";
          if (s.eliminated[r][c]) cls = "done";
          if (!s.done && r === s.r && c === s.c) cls = "visit";
          if (s.found && r === s.r && c === s.c) cls = "path";
          if (!s.done && !s.found && r === s.r && c === s.c) cls = "queue";
          // Color current cell distinctly
          if (!s.done && r === s.r && c === s.c) cls = "start";
          return { val: v, cls };
        },
      });
    },
    readout: s => [
      { label: "r", value: s.r < s.rows ? s.r : "—" },
      { label: "c", value: s.c >= 0 ? s.c : "—" },
      { label: "M[r][c]", value: (s.r < s.rows && s.c >= 0) ? s.M[s.r][s.c] : "—" },
      { label: "target", value: s.target },
      { label: "found", value: s.found ? "yes" : "no" },
    ],
  });

  // ===================================================================
  // Median of two sorted arrays — partition binary search
  // ===================================================================
  register("median-of-two", {
    title: "Median of two sorted arrays — partition binary search",
    caption: "Binary-search a partition i in the smaller array. j = half − i. Valid when maxLeftA ≤ minRightB and maxLeftB ≤ minRightA. Median falls on the four boundary values.",
    code: [
      "ensure |A| <= |B|",
      "lo, hi = 0, len(A); half = (m + n + 1) // 2",
      "while lo <= hi:",
      "  i = (lo + hi) // 2; j = half - i",
      "  maxLeftA  = -inf if i==0 else A[i-1]",
      "  minRightA =  inf if i==m else A[i]",
      "  maxLeftB  = -inf if j==0 else B[j-1]",
      "  minRightB =  inf if j==n else B[j]",
      "  if maxLeftA > minRightB: hi = i - 1",
      "  elif maxLeftB > minRightA: lo = i + 1",
      "  else: median from boundary values",
    ],
    init() {
      // Already in size order: |A| ≤ |B|
      const A = [1, 3, 8];
      const B = [7, 9, 10, 11];
      const m = A.length, n = B.length;
      const half = Math.floor((m + n + 1) / 2);
      return {
        A, B, m, n, half,
        lo: 0, hi: m,
        i: -1, j: -1,
        maxLeftA: null, minRightA: null,
        maxLeftB: null, minRightB: null,
        median: null,
        line: 0,
        desc: `|A|=${m} ≤ |B|=${n}; half=${half}. Binary-search partition i in A.`,
      };
    },
    step(s) {
      if (s.median != null) return { ...s, done: true };
      if (s.lo > s.hi) {
        return { ...s, line: 10, desc: "binary search exhausted (should not happen on sorted inputs)", done: true };
      }
      // 1) compute i, j
      if (s.line === 0 || s.line === 1 || s.line === 8 || s.line === 9) {
        const i = Math.floor((s.lo + s.hi) / 2);
        const j = s.half - i;
        return {
          ...s,
          i, j,
          maxLeftA: null, minRightA: null, maxLeftB: null, minRightB: null,
          line: 3,
          desc: `i = (${s.lo} + ${s.hi}) // 2 = ${i}; j = ${s.half} - ${i} = ${j}`,
        };
      }
      // 2) gather four boundaries
      if (s.line === 3) {
        const NEG = "−∞", POS = "+∞";
        const maxLeftA = s.i === 0 ? NEG : s.A[s.i - 1];
        const minRightA = s.i === s.m ? POS : s.A[s.i];
        const maxLeftB = s.j === 0 ? NEG : s.B[s.j - 1];
        const minRightB = s.j === s.n ? POS : s.B[s.j];
        return {
          ...s,
          maxLeftA, minRightA, maxLeftB, minRightB,
          line: 7,
          desc: `boundaries: maxLA=${maxLeftA}, minRA=${minRightA}, maxLB=${maxLeftB}, minRB=${minRightB}`,
        };
      }
      // 3) decide direction
      if (s.line === 7) {
        const NEG = "−∞", POS = "+∞";
        const numLA = s.maxLeftA === NEG ? -Infinity : s.maxLeftA;
        const numRA = s.minRightA === POS ? Infinity : s.minRightA;
        const numLB = s.maxLeftB === NEG ? -Infinity : s.maxLeftB;
        const numRB = s.minRightB === POS ? Infinity : s.minRightB;

        if (numLA > numRB) {
          return {
            ...s,
            hi: s.i - 1,
            line: 8,
            desc: `maxLA=${s.maxLeftA} > minRB=${s.minRightB} — i too large; hi → ${s.i - 1}`,
          };
        }
        if (numLB > numRA) {
          return {
            ...s,
            lo: s.i + 1,
            line: 9,
            desc: `maxLB=${s.maxLeftB} > minRA=${s.minRightA} — i too small; lo → ${s.i + 1}`,
          };
        }
        // valid partition: compute median
        const totalEven = (s.m + s.n) % 2 === 0;
        let median;
        if (totalEven) {
          median = (Math.max(numLA, numLB) + Math.min(numRA, numRB)) / 2;
        } else {
          median = Math.max(numLA, numLB);
        }
        return {
          ...s,
          median,
          line: 10,
          desc: `valid partition! median = ${totalEven
            ? `(max(${s.maxLeftA},${s.maxLeftB}) + min(${s.minRightA},${s.minRightB})) / 2 = ${median}`
            : `max(${s.maxLeftA},${s.maxLeftB}) = ${median}`}`,
          done: true,
        };
      }
    },
    render(s, stage) {
      stage.innerHTML = "";
      const wrap = document.createElement("div");
      wrap.style.display = "flex";
      wrap.style.flexDirection = "column";
      wrap.style.gap = "0.55rem";
      wrap.style.width = "100%";

      // header
      const hdr = document.createElement("div");
      hdr.style.textAlign = "center";
      hdr.style.fontSize = "0.72rem";
      hdr.style.fontFamily = "var(--md-code-font)";
      hdr.innerHTML = `half = <strong>${s.half}</strong> &nbsp;·&nbsp; lo=<strong>${s.lo}</strong> hi=<strong>${s.hi}</strong>${s.i >= 0 ? ` &nbsp;·&nbsp; partition i=<strong>${s.i}</strong>, j=<strong>${s.j}</strong>` : ""}`;
      wrap.appendChild(hdr);

      // A row
      const aWrap = document.createElement("div");
      aWrap.innerHTML = `<div style="font-size:0.62rem;color:var(--md-default-fg-color--light);text-align:center;margin-bottom:0.2rem;">A (smaller) — partition at i = ${s.i >= 0 ? s.i : "?"}</div>`;
      const aHost = document.createElement("div");
      const hiA = {};
      if (s.i >= 1 && s.i - 1 < s.A.length) hiA[s.i - 1] = "cmp";   // maxLeftA
      if (s.i >= 0 && s.i < s.A.length) hiA[s.i] = "cmp";           // minRightA
      const ptrsA = {};
      if (s.i >= 0) ptrsA["i"] = Math.min(s.i, s.A.length - 1);
      P.array(aHost, { arr: s.A, highlight: hiA, pointers: ptrsA });
      aWrap.appendChild(aHost);
      wrap.appendChild(aWrap);

      // B row
      const bWrap = document.createElement("div");
      bWrap.innerHTML = `<div style="font-size:0.62rem;color:var(--md-default-fg-color--light);text-align:center;margin-bottom:0.2rem;">B (larger) — partition at j = ${s.j >= 0 ? s.j : "?"}</div>`;
      const bHost = document.createElement("div");
      const hiB = {};
      if (s.j >= 1 && s.j - 1 < s.B.length) hiB[s.j - 1] = "cmp";   // maxLeftB
      if (s.j >= 0 && s.j < s.B.length) hiB[s.j] = "cmp";           // minRightB
      const ptrsB = {};
      if (s.j >= 0) ptrsB["j"] = Math.min(Math.max(s.j, 0), s.B.length - 1);
      P.array(bHost, { arr: s.B, highlight: hiB, pointers: ptrsB });
      bWrap.appendChild(bHost);
      wrap.appendChild(bWrap);

      // boundaries readout
      if (s.maxLeftA != null) {
        const bnd = document.createElement("div");
        bnd.style.textAlign = "center";
        bnd.style.fontSize = "0.7rem";
        bnd.style.fontFamily = "var(--md-code-font)";
        bnd.style.color = "var(--md-default-fg-color--light)";
        bnd.style.lineHeight = "1.7";
        bnd.innerHTML = `
          <span style="margin:0 .4rem;">maxLeftA=<strong>${s.maxLeftA}</strong></span>
          <span style="margin:0 .4rem;">minRightA=<strong>${s.minRightA}</strong></span>
          <span style="margin:0 .4rem;">maxLeftB=<strong>${s.maxLeftB}</strong></span>
          <span style="margin:0 .4rem;">minRightB=<strong>${s.minRightB}</strong></span>
        `;
        wrap.appendChild(bnd);
      }

      // median
      if (s.median != null) {
        const m = document.createElement("div");
        m.style.textAlign = "center";
        m.style.fontSize = "0.9rem";
        m.style.fontFamily = "var(--md-code-font)";
        m.style.fontWeight = "700";
        m.style.color = "#34d399";
        m.innerHTML = `median = ${s.median}`;
        wrap.appendChild(m);
      }

      stage.appendChild(wrap);
    },
    readout: s => [
      { label: "lo", value: s.lo },
      { label: "hi", value: s.hi },
      { label: "i", value: s.i >= 0 ? s.i : "—" },
      { label: "j", value: s.j >= 0 ? s.j : "—" },
      { label: "median", value: s.median != null ? s.median : "—" },
    ],
  });

})();
