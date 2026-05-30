/* ===========================================================
   Brain Detox Arc — DSA visualization upgrades (misc batch)
   ----------------------------------------------------------
   Step-by-step visualizations for two-pointer / sliding window /
   BFS / DFS / backtracking algorithms. Each register() call
   overrides any earlier codeWalk stub.
   =========================================================== */
(function () {
  "use strict";
  if (!window.DSA) return;
  const { primitives: P, register } = window.DSA;

  // ===================================================================
  // TWO POINTERS
  // ===================================================================

  // ---------- 3-Sum ----------------------------------------------------
  register("3sum", {
    title: "3Sum — anchor + two pointers",
    caption: "Fix anchor i, then converge l/r on the rest to sum to -arr[i]. Skip duplicates to avoid repeating triples.",
    code: [
      "sort(arr)",
      "for i in 0..n-3:",
      "  if i > 0 and arr[i] == arr[i-1]: continue",
      "  l = i+1; r = n-1; target = -arr[i]",
      "  while l < r:",
      "    s = arr[l] + arr[r]",
      "    if s == target: record; l++, r--, dedupe",
      "    elif s < target: l++",
      "    else: r--",
    ],
    init() {
      const arr = [-4, -1, -1, 0, 1, 2];
      return {
        arr, n: arr.length,
        i: 0, l: 1, r: arr.length - 1,
        target: -arr[0],
        sum: null,
        result: [],
        phase: "anchor",
        line: 0,
        desc: `anchor at i=0 (arr[i]=${arr[0]}), target = ${-arr[0]}`,
      };
    },
    step(s) {
      const { arr, n } = s;

      if (s.phase === "anchor") {
        if (s.i > n - 3) {
          return { ...s, line: 9, phase: "done", desc: `done — ${s.result.length} unique triples`, done: true };
        }
        if (s.i > 0 && arr[s.i] === arr[s.i - 1]) {
          return { ...s, i: s.i + 1, target: -arr[s.i + 1], line: 2, desc: `arr[${s.i}]=${arr[s.i]} equals arr[${s.i - 1}] — skip duplicate anchor` };
        }
        return {
          ...s, phase: "two-pointer",
          l: s.i + 1, r: n - 1,
          target: -arr[s.i], sum: null,
          line: 3,
          desc: `anchor i=${s.i} (arr[i]=${arr[s.i]}), set l=${s.i + 1}, r=${n - 1}, target=${-arr[s.i]}`,
        };
      }

      if (s.phase === "two-pointer") {
        if (s.l >= s.r) {
          return { ...s, phase: "anchor", i: s.i + 1, line: 1, desc: `pointers crossed — next anchor i=${s.i + 1}` };
        }
        if (s.sum == null) {
          const sum = arr[s.l] + arr[s.r];
          return { ...s, sum, line: 5, desc: `arr[${s.l}] + arr[${s.r}] = ${arr[s.l]} + ${arr[s.r]} = ${sum}` };
        }
        if (s.sum === s.target) {
          const triple = [arr[s.i], arr[s.l], arr[s.r]];
          // advance with dup-skip
          let nl = s.l + 1, nr = s.r - 1;
          while (nl < nr && arr[nl] === arr[nl - 1]) nl++;
          while (nl < nr && arr[nr] === arr[nr + 1]) nr--;
          return {
            ...s, result: [...s.result, triple],
            l: nl, r: nr, sum: null, line: 6,
            desc: `sum = target → record (${triple.join(",")}); advance & skip dupes`,
          };
        }
        if (s.sum < s.target) {
          return { ...s, l: s.l + 1, sum: null, line: 7, desc: `${s.sum} < ${s.target} — need bigger, l++` };
        }
        return { ...s, r: s.r - 1, sum: null, line: 8, desc: `${s.sum} > ${s.target} — need smaller, r--` };
      }
    },
    render(s, stage) {
      stage.innerHTML = "";
      const wrap = document.createElement("div");
      wrap.style.display = "flex"; wrap.style.flexDirection = "column"; wrap.style.gap = "0.6rem"; wrap.style.width = "100%";

      const arrHost = document.createElement("div");
      const hi = {};
      if (s.phase === "two-pointer" || s.phase === "anchor") {
        if (s.i < s.n) hi[s.i] = "target";
        if (s.phase === "two-pointer") {
          if (s.l < s.n) hi[s.l] = "cmp";
          if (s.r < s.n && s.r !== s.l) hi[s.r] = "cmp";
        }
      }
      const ptrs = {};
      if (s.i < s.n) ptrs.i = s.i;
      if (s.phase === "two-pointer" && s.l < s.n) ptrs.l = s.l;
      if (s.phase === "two-pointer" && s.r < s.n) ptrs.r = s.r;
      P.array(arrHost, { arr: s.arr, pointers: ptrs, highlight: hi });
      wrap.appendChild(arrHost);

      const res = document.createElement("div");
      res.style.fontFamily = "var(--md-code-font)";
      res.style.fontSize = "0.72rem";
      res.style.textAlign = "center";
      res.style.color = "var(--md-default-fg-color--light)";
      res.innerHTML = `<strong>triples found (${s.result.length}):</strong> ${s.result.map(t => `[${t.join(",")}]`).join("  ·  ") || "—"}`;
      wrap.appendChild(res);

      stage.appendChild(wrap);
    },
    readout: s => [
      { label: "i", value: s.i < s.n ? `${s.i} (${s.arr[s.i]})` : "—" },
      { label: "l", value: s.phase === "two-pointer" ? s.l : "—" },
      { label: "r", value: s.phase === "two-pointer" ? s.r : "—" },
      { label: "target", value: s.target },
      { label: "sum", value: s.sum ?? "—" },
    ],
  });

  // ---------- Trapping Rain Water -------------------------------------
  register("trapping-rain-water", {
    title: "Trapping Rain Water — two pointers + running max",
    caption: "Walk l/r inward. The shorter side's water level is bounded by its running max — add (max − h) units and advance.",
    code: [
      "l=0; r=n-1; lmax=0; rmax=0; water=0",
      "while l < r:",
      "  if h[l] <= h[r]:",
      "    lmax = max(lmax, h[l])",
      "    water += lmax - h[l]; l++",
      "  else:",
      "    rmax = max(rmax, h[r])",
      "    water += rmax - h[r]; r--",
    ],
    init() {
      const arr = [0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1];
      return {
        arr, n: arr.length,
        l: 0, r: arr.length - 1,
        lmax: 0, rmax: 0, water: 0,
        added: 0, side: null,
        filled: arr.map(() => 0),
        line: 0,
        desc: `start with l=0, r=${arr.length - 1}, lmax=rmax=0`,
      };
    },
    step(s) {
      if (s.l >= s.r) return { ...s, line: 8, side: null, desc: `done — total water = ${s.water}`, done: true };
      const { arr } = s;
      if (arr[s.l] <= arr[s.r]) {
        const lmax = Math.max(s.lmax, arr[s.l]);
        const add = lmax - arr[s.l];
        const filled = s.filled.slice();
        filled[s.l] = add;
        return {
          ...s, lmax, water: s.water + add, added: add, side: "l",
          filled, l: s.l + 1, line: 3,
          desc: `h[${s.l}]=${arr[s.l]} ≤ h[${s.r}]=${arr[s.r]} → lmax=${lmax}, +${add} water → l++`,
        };
      } else {
        const rmax = Math.max(s.rmax, arr[s.r]);
        const add = rmax - arr[s.r];
        const filled = s.filled.slice();
        filled[s.r] = add;
        return {
          ...s, rmax, water: s.water + add, added: add, side: "r",
          filled, r: s.r - 1, line: 6,
          desc: `h[${s.r}]=${arr[s.r]} < h[${s.l}]=${arr[s.l]} → rmax=${rmax}, +${add} water → r--`,
        };
      }
    },
    render(s, stage) {
      stage.innerHTML = "";
      const arr = s.arr;
      const cellW = 36, gap = 3, pad = 24, maxH = 140;
      const max = Math.max(...arr, 1);
      const n = arr.length;
      const W = pad * 2 + n * (cellW + gap);
      const H = maxH + 80;
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
      svg.setAttribute("width", W);
      svg.style.maxWidth = "100%"; svg.style.height = "auto";

      // water fills behind bars
      arr.forEach((h, idx) => {
        const fill = s.filled[idx];
        if (!fill) return;
        const x = pad + idx * (cellW + gap);
        const barH = h / max * maxH;
        const waterH = fill / max * maxH;
        const y = pad + (maxH - barH - waterH);
        const r = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        r.setAttribute("x", x); r.setAttribute("y", y);
        r.setAttribute("width", cellW); r.setAttribute("height", waterH);
        r.setAttribute("fill", "rgba(34, 211, 238, 0.45)");
        r.setAttribute("stroke", "#22d3ee");
        r.setAttribute("stroke-width", "1");
        svg.appendChild(r);
      });

      // bars
      arr.forEach((h, idx) => {
        const x = pad + idx * (cellW + gap);
        const bh = h / max * maxH;
        const y = pad + (maxH - bh);
        let cls = "dsa-cell";
        if (idx === s.l && s.l < s.r) cls = "dsa-cell dsa-cell--cmp";
        else if (idx === s.r && s.l < s.r) cls = "dsa-cell dsa-cell--cmp";
        else if (idx < s.l || idx > s.r) cls = "dsa-cell dsa-cell--done";
        if (h === 0) {
          // zero-height: just show an index label and pointers
          if (idx === s.l || idx === s.r) {
            const stub = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            stub.setAttribute("x", x); stub.setAttribute("y", pad + maxH - 2);
            stub.setAttribute("width", cellW); stub.setAttribute("height", 2);
            stub.setAttribute("class", cls);
            svg.appendChild(stub);
          }
        } else {
          const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
          rect.setAttribute("x", x); rect.setAttribute("y", y);
          rect.setAttribute("width", cellW); rect.setAttribute("height", bh);
          rect.setAttribute("rx", 3);
          rect.setAttribute("class", cls);
          svg.appendChild(rect);
        }
        const t = document.createElementNS("http://www.w3.org/2000/svg", "text");
        t.setAttribute("x", x + cellW / 2); t.setAttribute("y", pad + maxH + 14);
        t.setAttribute("text-anchor", "middle");
        t.setAttribute("class", "dsa-cell-text");
        t.textContent = h;
        svg.appendChild(t);
        const idxT = document.createElementNS("http://www.w3.org/2000/svg", "text");
        idxT.setAttribute("x", x + cellW / 2); idxT.setAttribute("y", pad + maxH + 28);
        idxT.setAttribute("text-anchor", "middle");
        idxT.setAttribute("class", "dsa-cell-index");
        idxT.textContent = idx;
        svg.appendChild(idxT);
        if (idx === s.l && s.l < s.r) {
          const tag = document.createElementNS("http://www.w3.org/2000/svg", "text");
          tag.setAttribute("x", x + cellW / 2); tag.setAttribute("y", pad + maxH + 44);
          tag.setAttribute("text-anchor", "middle");
          tag.setAttribute("class", "dsa-ptr-label");
          tag.textContent = "l";
          svg.appendChild(tag);
        }
        if (idx === s.r && s.l < s.r) {
          const tag = document.createElementNS("http://www.w3.org/2000/svg", "text");
          tag.setAttribute("x", x + cellW / 2); tag.setAttribute("y", pad + maxH + 44);
          tag.setAttribute("text-anchor", "middle");
          tag.setAttribute("class", "dsa-ptr-label");
          tag.textContent = "r";
          svg.appendChild(tag);
        }
      });

      stage.appendChild(svg);
    },
    readout: s => [
      { label: "l", value: s.l < s.n ? s.l : "—" },
      { label: "r", value: s.r >= 0 ? s.r : "—" },
      { label: "lmax", value: s.lmax },
      { label: "rmax", value: s.rmax },
      { label: "water", value: s.water },
    ],
  });

  // ===================================================================
  // SLIDING WINDOW
  // ===================================================================

  // ---------- Minimum Window Substring --------------------------------
  register("min-window-substring", {
    title: "Min Window Substring — expand then shrink",
    caption: "Expand r until every char in t is covered; then shrink l while still covering. Track the smallest cover.",
    code: [
      "need = Counter(t); have = {}",
      "l = 0; covered = 0; best = (∞, 0, 0)",
      "for r in 0..n-1:",
      "  have[s[r]] += 1",
      "  if have[s[r]] == need[s[r]]: covered += 1",
      "  while covered == len(need):",
      "    update best with (r-l+1, l, r)",
      "    have[s[l]] -= 1",
      "    if have[s[l]] < need[s[l]]: covered -= 1",
      "    l += 1",
    ],
    init() {
      const sStr = "ADOBECODEBANC";
      const t = "ABC";
      const need = {};
      for (const c of t) need[c] = (need[c] || 0) + 1;
      const have = {};
      for (const c of t) have[c] = 0;
      return {
        s: sStr.split(""), t,
        need, have,
        l: 0, r: -1,
        covered: 0,
        needKeys: Object.keys(need).length,
        best: null,  // [len, l, r]
        phase: "expand",
        line: 0,
        desc: `need = ${Object.entries(need).map(([k, v]) => `${k}:${v}`).join(",")}`,
      };
    },
    step(s) {
      const n = s.s.length;
      if (s.phase === "expand") {
        if (s.r + 1 >= n) {
          if (s.covered === s.needKeys) {
            // can still shrink
            return { ...s, phase: "shrink", line: 5, desc: "scan complete; try shrinking the cover" };
          }
          return { ...s, phase: "done", line: 9, desc: s.best ? `best = "${s.s.slice(s.best[1], s.best[2] + 1).join("")}"` : "no valid window", done: true };
        }
        const r = s.r + 1;
        const ch = s.s[r];
        const have = { ...s.have };
        have[ch] = (have[ch] || 0) + 1;
        let covered = s.covered;
        if (s.need[ch] != null && have[ch] === s.need[ch]) covered += 1;
        const next = { ...s, r, have, covered, line: 4, desc: `r=${r}: pull '${ch}' into window; have[${ch}]=${have[ch]}${s.need[ch] != null && have[ch] === s.need[ch] ? "  ✓ covered" : ""}` };
        if (covered === s.needKeys) next.phase = "shrink";
        return next;
      }
      if (s.phase === "shrink") {
        if (s.covered < s.needKeys) {
          // back to expanding
          return { ...s, phase: "expand", line: 2, desc: "lost coverage — expand again" };
        }
        const winLen = s.r - s.l + 1;
        let best = s.best;
        let updated = false;
        if (!best || winLen < best[0]) {
          best = [winLen, s.l, s.r];
          updated = true;
        }
        if (updated) {
          return { ...s, best, line: 6, desc: `cover [${s.l},${s.r}] = "${s.s.slice(s.l, s.r + 1).join("")}" (len ${winLen}) — new best` };
        }
        // try drop left
        const ch = s.s[s.l];
        const have = { ...s.have };
        have[ch] = (have[ch] || 0) - 1;
        let covered = s.covered;
        if (s.need[ch] != null && have[ch] < s.need[ch]) covered -= 1;
        return {
          ...s, have, l: s.l + 1, covered, line: 8,
          desc: `shrink: drop '${ch}'; have[${ch}]=${have[ch]}${covered < s.needKeys ? "  ✗ lost" : ""}`,
        };
      }
    },
    render(s, stage) {
      stage.innerHTML = "";
      const wrap = document.createElement("div");
      wrap.style.display = "flex"; wrap.style.flexDirection = "column"; wrap.style.gap = "0.6rem"; wrap.style.width = "100%";

      // string with window
      const a1 = document.createElement("div");
      const hi = {};
      for (let k = s.l; k <= s.r && k < s.s.length; k++) hi[k] = "window";
      const ptrs = {};
      if (s.l < s.s.length) ptrs.l = s.l;
      if (s.r >= 0 && s.r < s.s.length) ptrs.r = s.r;
      P.array(a1, { arr: s.s, pointers: ptrs, highlight: hi, indexed: false });
      wrap.appendChild(a1);

      // have vs need
      const tab = document.createElement("div");
      tab.style.display = "flex"; tab.style.justifyContent = "center"; tab.style.gap = "0.5rem";
      tab.style.fontFamily = "var(--md-code-font)"; tab.style.fontSize = "0.7rem";
      const keys = Object.keys(s.need);
      keys.forEach(k => {
        const ok = (s.have[k] || 0) >= s.need[k];
        const box = document.createElement("div");
        box.style.padding = "0.3rem 0.5rem"; box.style.borderRadius = "6px";
        box.style.background = ok ? "rgba(52,211,153,0.18)" : "rgba(251,191,36,0.18)";
        box.style.color = ok ? "#34d399" : "#fbbf24";
        box.innerHTML = `<strong>${k}</strong>: have <b>${s.have[k] || 0}</b> / need <b>${s.need[k]}</b>`;
        tab.appendChild(box);
      });
      wrap.appendChild(tab);

      // best so far
      const best = document.createElement("div");
      best.style.fontFamily = "var(--md-code-font)"; best.style.fontSize = "0.72rem";
      best.style.textAlign = "center"; best.style.color = "var(--md-default-fg-color--light)";
      best.innerHTML = s.best
        ? `<strong>best:</strong> "${s.s.slice(s.best[1], s.best[2] + 1).join("")}" (len ${s.best[0]}, [${s.best[1]},${s.best[2]}])`
        : `<strong>best:</strong> —`;
      wrap.appendChild(best);

      stage.appendChild(wrap);
    },
    readout: s => [
      { label: "l", value: s.l },
      { label: "r", value: s.r },
      { label: "covered", value: `${s.covered}/${s.needKeys}` },
      { label: "best.len", value: s.best ? s.best[0] : "—" },
    ],
  });

  // ---------- Longest subarray with sum ≤ K (non-negative) ------------
  register("longest-subarray-sum-k", {
    title: "Longest subarray with sum ≤ K — sliding window",
    caption: "Extend r and add to sum. While sum > K, drop the left edge. Track the widest window seen.",
    code: [
      "l = 0; sum = 0; best = 0",
      "for r in 0..n-1:",
      "  sum += a[r]",
      "  while sum > K:",
      "    sum -= a[l]; l += 1",
      "  best = max(best, r - l + 1)",
      "return best",
    ],
    init() {
      const arr = [2, 1, 5, 1, 3, 2];
      return {
        arr, K: 7,
        l: 0, r: -1,
        sum: 0, best: 0,
        phase: "extend",
        line: 0,
        desc: `K = 7; begin scan`,
      };
    },
    step(s) {
      const n = s.arr.length;
      if (s.phase === "extend") {
        if (s.r + 1 >= n) {
          return { ...s, phase: "done", line: 6, desc: `done — best = ${s.best}`, done: true };
        }
        const r = s.r + 1;
        const sum = s.sum + s.arr[r];
        const next = { ...s, r, sum, line: 2, desc: `extend r to ${r}: sum += ${s.arr[r]} → ${sum}` };
        if (sum > s.K) next.phase = "shrink";
        else next.phase = "update";
        return next;
      }
      if (s.phase === "shrink") {
        if (s.sum <= s.K) {
          return { ...s, phase: "update", line: 5, desc: `sum ${s.sum} ≤ K — stop shrinking` };
        }
        const drop = s.arr[s.l];
        return { ...s, sum: s.sum - drop, l: s.l + 1, line: 4, desc: `sum ${s.sum} > ${s.K}: drop arr[${s.l}]=${drop} → sum=${s.sum - drop}` };
      }
      if (s.phase === "update") {
        const len = s.r - s.l + 1;
        const best = Math.max(s.best, len);
        return { ...s, best, phase: "extend", line: 5, desc: best > s.best ? `new best window of length ${best}` : `window length ${len}, best stays ${best}` };
      }
    },
    render(s, stage) {
      const hi = {};
      for (let k = s.l; k <= s.r && k < s.arr.length; k++) hi[k] = "window";
      const ptrs = {};
      if (s.l < s.arr.length) ptrs.l = s.l;
      if (s.r >= 0 && s.r < s.arr.length) ptrs.r = s.r;
      P.array(stage, { arr: s.arr, pointers: ptrs, highlight: hi });
    },
    readout: s => [
      { label: "l", value: s.l },
      { label: "r", value: s.r },
      { label: "sum", value: s.sum },
      { label: "K", value: s.K },
      { label: "best", value: s.best },
    ],
  });

  // ---------- Permutation in String -----------------------------------
  register("permutation-in-string", {
    title: "Permutation in String — fixed-size window of len(s1)",
    caption: "Slide a window of |s1| chars across s2; compare letter frequencies. Match means s2 contains a permutation of s1.",
    code: [
      "need = Counter(s1); window = Counter(s2[0..k-1])",
      "if window == need: return True",
      "for r in k..n-1:",
      "  window[s2[r]] += 1",
      "  window[s2[r-k]] -= 1",
      "  if window == need: return True",
      "return False",
    ],
    init() {
      const s1 = "ab";
      const s2 = "eidbaooo";
      const need = {};
      for (const c of s1) need[c] = (need[c] || 0) + 1;
      const window = {};
      for (let i = 0; i < s1.length; i++) window[s2[i]] = (window[s2[i]] || 0) + 1;
      const eq = (a, b) => {
        const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
        for (const k of keys) if ((a[k] || 0) !== (b[k] || 0)) return false;
        return true;
      };
      return {
        s1, s2: s2.split(""), k: s1.length,
        need, window,
        l: 0, r: s1.length - 1,
        matched: eq(window, need),
        phase: "check",
        line: 0,
        desc: `init window over s2[0..${s1.length - 1}] = "${s2.slice(0, s1.length)}"`,
      };
    },
    step(s) {
      const n = s.s2.length;
      const eq = (a, b) => {
        const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
        for (const k of keys) if ((a[k] || 0) !== (b[k] || 0)) return false;
        return true;
      };
      if (s.phase === "check") {
        if (s.matched) {
          return { ...s, phase: "done", line: 5, desc: `window "${s.s2.slice(s.l, s.r + 1).join("")}" is a permutation of "${s.s1}" — return True`, done: true };
        }
        if (s.r + 1 >= n) {
          return { ...s, phase: "done", line: 6, desc: `scanned all windows — no permutation found`, done: true };
        }
        return { ...s, phase: "slide", line: 2, desc: `window ≠ need — slide right` };
      }
      if (s.phase === "slide") {
        const addCh = s.s2[s.r + 1];
        const dropCh = s.s2[s.l];
        const window = { ...s.window };
        window[addCh] = (window[addCh] || 0) + 1;
        window[dropCh] = (window[dropCh] || 0) - 1;
        if (window[dropCh] === 0) delete window[dropCh];
        const matched = eq(window, s.need);
        return {
          ...s, window, l: s.l + 1, r: s.r + 1, matched,
          phase: "check", line: 4,
          desc: `+'${addCh}', -'${dropCh}': window over "${s.s2.slice(s.l + 1, s.r + 2).join("")}"`,
        };
      }
    },
    render(s, stage) {
      stage.innerHTML = "";
      const wrap = document.createElement("div");
      wrap.style.display = "flex"; wrap.style.flexDirection = "column"; wrap.style.gap = "0.6rem"; wrap.style.width = "100%";

      const ttl = document.createElement("div");
      ttl.style.fontFamily = "var(--md-code-font)"; ttl.style.fontSize = "0.72rem";
      ttl.style.textAlign = "center"; ttl.style.color = "var(--md-default-fg-color--light)";
      ttl.innerHTML = `<strong>s1 =</strong> "${s.s1}"  (window size = ${s.k})`;
      wrap.appendChild(ttl);

      const a1 = document.createElement("div");
      const hi = {};
      for (let k = s.l; k <= s.r && k < s.s2.length; k++) hi[k] = s.matched ? "found" : "window";
      const ptrs = {};
      if (s.l < s.s2.length) ptrs.l = s.l;
      if (s.r < s.s2.length) ptrs.r = s.r;
      P.array(a1, { arr: s.s2, pointers: ptrs, highlight: hi, indexed: false });
      wrap.appendChild(a1);

      // mini-table comparison
      const tab = document.createElement("div");
      tab.style.display = "flex"; tab.style.justifyContent = "center"; tab.style.gap = "0.5rem";
      tab.style.fontFamily = "var(--md-code-font)"; tab.style.fontSize = "0.7rem";
      const keys = new Set([...Object.keys(s.need), ...Object.keys(s.window)]);
      [...keys].sort().forEach(k => {
        const w = s.window[k] || 0;
        const need = s.need[k] || 0;
        const ok = w === need;
        const box = document.createElement("div");
        box.style.padding = "0.3rem 0.5rem"; box.style.borderRadius = "6px";
        box.style.background = ok ? "rgba(52,211,153,0.18)" : "rgba(239,68,68,0.18)";
        box.style.color = ok ? "#34d399" : "#ef4444";
        box.innerHTML = `<strong>${k}</strong>: win <b>${w}</b> / need <b>${need}</b>`;
        tab.appendChild(box);
      });
      wrap.appendChild(tab);

      stage.appendChild(wrap);
    },
    readout: s => [
      { label: "l", value: s.l },
      { label: "r", value: s.r },
      { label: "matched", value: s.matched ? "yes" : "no" },
    ],
  });

  // ===================================================================
  // BFS / DFS EXTRAS
  // ===================================================================

  // ---------- Level-order traversal -----------------------------------
  register("level-order", {
    title: "Binary tree level-order BFS",
    caption: "Drain the queue one level at a time: snapshot size, pop that many nodes, push their children. Each drain = one level.",
    code: [
      "q = [root]; out = []",
      "while q:",
      "  sz = len(q); level = []",
      "  for _ in range(sz):",
      "    u = q.popleft(); level.append(u.val)",
      "    if u.left:  q.append(u.left)",
      "    if u.right: q.append(u.right)",
      "  out.append(level)",
    ],
    init() {
      //          1
      //        /   \
      //       2     3
      //      / \   / \
      //     4   5 6   7
      const nodes = [
        { id: 0, val: 1, x: 200, y: 40,  parent: null },
        { id: 1, val: 2, x: 120, y: 110, parent: 0 },
        { id: 2, val: 3, x: 280, y: 110, parent: 0 },
        { id: 3, val: 4, x: 70,  y: 180, parent: 1 },
        { id: 4, val: 5, x: 170, y: 180, parent: 1 },
        { id: 5, val: 6, x: 240, y: 180, parent: 2 },
        { id: 6, val: 7, x: 330, y: 180, parent: 2 },
      ];
      const children = { 0: [1, 2], 1: [3, 4], 2: [5, 6], 3: [], 4: [], 5: [], 6: [] };
      return {
        nodes, children,
        queue: [0],
        currentLevel: [],
        levelSize: 1, levelTaken: 0,
        done_ids: {},
        out: [],
        line: 0,
        phase: "snapshot",
        desc: "queue starts with root; level snapshot size = 1",
      };
    },
    step(s) {
      if (s.phase === "snapshot") {
        if (!s.queue.length) {
          return { ...s, phase: "done", line: 8, desc: `level order: [${s.out.map(lvl => "[" + lvl.map(i => s.nodes[i].val).join(",") + "]").join(", ")}]`, done: true };
        }
        return { ...s, phase: "drain", levelSize: s.queue.length, levelTaken: 0, currentLevel: [], line: 2, desc: `snapshot level size = ${s.queue.length}` };
      }
      if (s.phase === "drain") {
        if (s.levelTaken >= s.levelSize) {
          // mark all currentLevel as done, push currentLevel to out
          const done_ids = { ...s.done_ids };
          s.currentLevel.forEach(id => done_ids[id] = true);
          return {
            ...s, phase: "snapshot",
            out: [...s.out, s.currentLevel],
            done_ids, currentLevel: [],
            line: 7,
            desc: `level complete: [${s.currentLevel.map(i => s.nodes[i].val).join(",")}]`,
          };
        }
        const q = s.queue.slice();
        const u = q.shift();
        const kids = s.children[u] || [];
        const newQ = [...q, ...kids];
        return {
          ...s, queue: newQ,
          currentLevel: [...s.currentLevel, u],
          levelTaken: s.levelTaken + 1,
          line: 4,
          desc: `pop ${s.nodes[u].val}; push children [${kids.map(i => s.nodes[i].val).join(",") || "none"}]`,
        };
      }
    },
    render(s, stage) {
      stage.innerHTML = "";
      const wrap = document.createElement("div");
      wrap.style.display = "flex"; wrap.style.flexDirection = "column"; wrap.style.gap = "0.6rem"; wrap.style.width = "100%";

      const treeHost = document.createElement("div");
      const ns = s.nodes.map(n => {
        let h = null;
        if (s.currentLevel.includes(n.id)) h = "visit";
        else if (s.done_ids[n.id]) h = "done";
        else if (s.queue.includes(n.id)) h = "queue";
        return { ...n, highlight: h };
      });
      P.tree(treeHost, { nodes: ns });
      wrap.appendChild(treeHost);

      const out = document.createElement("div");
      out.style.fontFamily = "var(--md-code-font)"; out.style.fontSize = "0.72rem";
      out.style.textAlign = "center"; out.style.color = "var(--md-default-fg-color--light)";
      out.innerHTML = `<strong>levels:</strong> ${s.out.map(lvl => `[${lvl.map(i => s.nodes[i].val).join(",")}]`).join(" · ") || "—"}`;
      wrap.appendChild(out);

      stage.appendChild(wrap);
    },
    readout: s => [
      { label: "queue", value: s.queue.map(i => s.nodes[i].val).join(",") || "∅" },
      { label: "level", value: `[${s.currentLevel.map(i => s.nodes[i].val).join(",")}]` },
      { label: "levels done", value: s.out.length },
    ],
  });

  // ---------- Multi-source BFS (Rotting Oranges) ---------------------
  register("multi-source-bfs", {
    title: "Rotting Oranges — multi-source BFS",
    caption: "Seed the queue with every rotten orange (time 0). Each round of BFS rots fresh neighbours and stamps them with time+1.",
    code: [
      "q = [(r,c,0) for every rotten cell]",
      "while q:",
      "  (r,c,t) = q.popleft()",
      "  for (nr,nc) in 4-neighbours:",
      "    if grid[nr][nc] == 'F':",
      "      grid[nr][nc] = 'R'; time[nr][nc] = t+1",
      "      maxTime = max(maxTime, t+1)",
      "      q.append((nr,nc,t+1))",
    ],
    init() {
      // 5x5 grid
      // O = rotten (initially), F = fresh, # = wall, . = empty
      const g = [
        ["O", "F", "F", "#", "F"],
        ["F", "F", "#", "F", "F"],
        ["F", "F", "F", "F", "F"],
        ["F", "#", "F", "#", "F"],
        ["F", "F", "F", "F", "O"],
      ];
      const rows = g.length, cols = g[0].length;
      const time = Array.from({ length: rows }, () => new Array(cols).fill(-1));
      time[0][0] = 0; time[4][4] = 0;
      return {
        grid: g, time,
        queue: [[0, 0, 0], [4, 4, 0]],
        current: null,
        maxTime: 0,
        line: 0,
        desc: "two rotten sources seeded at (0,0) and (4,4), time 0",
      };
    },
    step(s) {
      if (!s.queue.length) {
        // verify no fresh leftovers
        let leftovers = 0;
        for (const row of s.grid) for (const v of row) if (v === "F") leftovers++;
        return { ...s, line: 7, current: null, desc: leftovers ? `queue empty — ${leftovers} fresh oranges remain (unreachable)` : `all oranges rotten by time ${s.maxTime}`, done: true };
      }
      const q = s.queue.slice();
      const cur = q.shift();
      const [r, c, t] = cur;
      const rows = s.grid.length, cols = s.grid[0].length;
      const grid = s.grid.map(row => row.slice());
      const time = s.time.map(row => row.slice());
      const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      const added = [];
      let maxTime = s.maxTime;
      for (const [dr, dc] of dirs) {
        const nr = r + dr, nc = c + dc;
        if (nr < 0 || nc < 0 || nr >= rows || nc >= cols) continue;
        if (grid[nr][nc] !== "F") continue;
        grid[nr][nc] = "R";
        time[nr][nc] = t + 1;
        maxTime = Math.max(maxTime, t + 1);
        q.push([nr, nc, t + 1]);
        added.push(`(${nr},${nc})`);
      }
      return {
        ...s, grid, time, queue: q, current: cur, maxTime, line: 5,
        desc: `pop (${r},${c}) t=${t}; rot ${added.length ? added.join(", ") : "no neighbours"}`,
      };
    },
    render(s, stage) {
      P.grid(stage, {
        rows: s.grid.length, cols: s.grid[0].length,
        cellOf: (r, c) => {
          const v = s.grid[r][c];
          let cls = "";
          let val = v;
          if (v === "#") { cls = "wall"; val = "#"; }
          else if (v === "O") { cls = "target"; val = "O"; }
          else if (v === "R") {
            cls = "done"; val = `R${s.time[r][c]}`;
          }
          else if (v === "F") { cls = "land"; val = "F"; }
          if (s.current && s.current[0] === r && s.current[1] === c) cls = "visit";
          if (s.queue.some(q => q[0] === r && q[1] === c) && !(s.current && s.current[0] === r && s.current[1] === c)) cls = "queue";
          return { val, cls };
        },
      });
    },
    readout: s => [
      { label: "queue", value: s.queue.length },
      { label: "maxTime", value: s.maxTime },
      { label: "current", value: s.current ? `(${s.current[0]},${s.current[1]},t=${s.current[2]})` : "—" },
    ],
  });

  // ---------- Path Sum (root-to-leaf with target) --------------------
  register("path-sum", {
    title: "Path Sum — DFS with running remainder",
    caption: "Carry a remainder down each branch. At every leaf, check remainder == leaf value.",
    code: [
      "def dfs(node, rem):",
      "  if not node: return False",
      "  if leaf(node): return node.val == rem",
      "  return dfs(node.left,  rem - node.val) or",
      "         dfs(node.right, rem - node.val)",
    ],
    init() {
      // Classic LC 112 tree, target = 22
      //              5
      //            /   \
      //           4     8
      //          /     / \
      //        11    13   4
      //       /  \         \
      //      7    2         1
      const nodes = [
        { id: 0, val: 5,  x: 230, y: 40,  parent: null },
        { id: 1, val: 4,  x: 140, y: 100, parent: 0 },
        { id: 2, val: 8,  x: 320, y: 100, parent: 0 },
        { id: 3, val: 11, x: 100, y: 160, parent: 1 },
        { id: 4, val: 13, x: 270, y: 160, parent: 2 },
        { id: 5, val: 4,  x: 360, y: 160, parent: 2 },
        { id: 6, val: 7,  x: 60,  y: 220, parent: 3 },
        { id: 7, val: 2,  x: 140, y: 220, parent: 3 },
        { id: 8, val: 1,  x: 400, y: 220, parent: 5 },
      ];
      const children = { 0: [1, 2], 1: [3], 2: [4, 5], 3: [6, 7], 4: [], 5: [8], 6: [], 7: [], 8: [] };
      return {
        nodes, children,
        target: 22,
        // frames: array of { id, remaining, childIdx } simulating DFS
        frames: [{ id: 0, remaining: 22, childIdx: 0 }],
        visited: {},
        current: 0,
        found: false,
        pathIds: [0],
        line: 0,
        desc: `dfs(node 5, rem 22)`,
      };
    },
    step(s) {
      if (s.found) return { ...s, line: 4, desc: `found root-to-leaf path summing to ${s.target}!`, done: true };
      if (!s.frames.length) return { ...s, line: 4, desc: `done — no path sums to ${s.target}`, done: true };

      const frames = s.frames.map(f => ({ ...f }));
      const top = frames[frames.length - 1];
      const node = s.nodes[top.id];
      const kids = s.children[top.id];

      // first visit: check leaf
      if (top.childIdx === 0 && kids.length === 0) {
        // leaf
        const visited = { ...s.visited, [top.id]: true };
        if (node.val === top.remaining) {
          return { ...s, found: true, visited, current: top.id, pathIds: frames.map(f => f.id), line: 2, desc: `leaf ${node.val} == remainder ${top.remaining} — FOUND` };
        }
        frames.pop();
        return { ...s, frames, visited, current: frames.length ? frames[frames.length - 1].id : -1, pathIds: frames.map(f => f.id), line: 2, desc: `leaf ${node.val} ≠ remainder ${top.remaining} — backtrack` };
      }

      if (top.childIdx >= kids.length) {
        // exhausted children
        const visited = { ...s.visited, [top.id]: true };
        frames.pop();
        return { ...s, frames, visited, current: frames.length ? frames[frames.length - 1].id : -1, pathIds: frames.map(f => f.id), line: 4, desc: `done with node ${node.val} — backtrack` };
      }

      // descend into next child
      const childId = kids[top.childIdx];
      top.childIdx += 1;
      frames[frames.length - 1] = top;
      const newRem = top.remaining - node.val;
      const newFrames = [...frames, { id: childId, remaining: newRem, childIdx: 0 }];
      return {
        ...s, frames: newFrames,
        current: childId,
        pathIds: newFrames.map(f => f.id),
        line: 3,
        desc: `descend into ${s.nodes[childId].val}: rem = ${top.remaining} - ${node.val} = ${newRem}`,
      };
    },
    render(s, stage) {
      stage.innerHTML = "";
      const wrap = document.createElement("div");
      wrap.style.display = "flex"; wrap.style.flexDirection = "column"; wrap.style.gap = "0.5rem"; wrap.style.width = "100%";

      const ns = s.nodes.map(n => {
        let h = null;
        if (s.found && s.pathIds.includes(n.id)) h = "target";
        else if (n.id === s.current && !s.found) h = "visit";
        else if (s.pathIds.includes(n.id)) h = "path";
        else if (s.visited[n.id]) h = "done";
        return { ...n, highlight: h };
      });
      const treeHost = document.createElement("div");
      P.tree(treeHost, { nodes: ns });
      wrap.appendChild(treeHost);

      const meta = document.createElement("div");
      meta.style.fontFamily = "var(--md-code-font)"; meta.style.fontSize = "0.72rem";
      meta.style.textAlign = "center"; meta.style.color = "var(--md-default-fg-color--light)";
      const top = s.frames[s.frames.length - 1];
      meta.innerHTML = `<strong>target:</strong> ${s.target}  ·  <strong>path:</strong> ${s.pathIds.map(i => s.nodes[i].val).join(" → ") || "—"}  ·  <strong>rem at current:</strong> ${top ? top.remaining : "—"}`;
      wrap.appendChild(meta);

      stage.appendChild(wrap);
    },
    readout: s => {
      const top = s.frames[s.frames.length - 1];
      return [
        { label: "current", value: s.current >= 0 ? s.nodes[s.current]?.val : "—" },
        { label: "remainder", value: top ? top.remaining : "—" },
        { label: "depth", value: s.frames.length },
        { label: "found", value: s.found ? "yes" : "no" },
      ];
    },
  });

  // ---------- Cycle detection (directed graph, DFS colors) -----------
  register("cycle-detection-graph", {
    title: "Cycle detection — DFS with white/gray/black",
    caption: "Gray = on the current DFS path. A back-edge to a gray node = cycle. After finishing, mark the node black.",
    code: [
      "color = {v: 'white' for v in V}",
      "def dfs(u):",
      "  color[u] = 'gray'",
      "  for v in adj[u]:",
      "    if color[v] == 'gray': return CYCLE",
      "    if color[v] == 'white' and dfs(v): return CYCLE",
      "  color[u] = 'black'",
    ],
    init() {
      // 6 nodes, edges include a back-edge forming a cycle
      const nodes = [
        { id: 0, x: 60,  y: 60,  val: "A" },
        { id: 1, x: 170, y: 30,  val: "B" },
        { id: 2, x: 170, y: 110, val: "C" },
        { id: 3, x: 290, y: 30,  val: "D" },
        { id: 4, x: 290, y: 110, val: "E" },
        { id: 5, x: 410, y: 70,  val: "F" },
      ];
      // adjacency: A→B, A→C, B→D, C→D (cross), D→E, E→B (back edge → cycle), D→F
      const adj = { 0: [1, 2], 1: [3], 2: [3], 3: [4, 5], 4: [1], 5: [] };
      const edges = [
        { a: 0, b: 1, directed: true },
        { a: 0, b: 2, directed: true },
        { a: 1, b: 3, directed: true },
        { a: 2, b: 3, directed: true },
        { a: 3, b: 4, directed: true },
        { a: 4, b: 1, directed: true },
        { a: 3, b: 5, directed: true },
      ];
      const color = { 0: "white", 1: "white", 2: "white", 3: "white", 4: "white", 5: "white" };
      const edgeKind = {};  // key "a-b" -> "tree"|"back"|"cross"
      return {
        nodes, edges, adj, color,
        frames: [{ id: 0, childIdx: 0 }],
        current: 0,
        edgeKind,
        cycleFound: false,
        line: 0,
        desc: "start DFS at A; color A gray",
      };
    },
    step(s) {
      if (s.cycleFound) return { ...s, line: 3, desc: `cycle detected — stop`, done: true };
      if (!s.frames.length) return { ...s, line: 6, desc: `DFS complete — no cycle`, done: true };

      const frames = s.frames.map(f => ({ ...f }));
      const top = frames[frames.length - 1];
      const u = top.id;
      const color = { ...s.color };

      // newly entered (first visit, color was white)
      if (color[u] === "white") {
        color[u] = "gray";
        return { ...s, color, line: 2, desc: `enter ${s.nodes[u].val}; color gray` };
      }

      const nbrs = s.adj[u] || [];
      if (top.childIdx >= nbrs.length) {
        // finished
        color[u] = "black";
        frames.pop();
        return {
          ...s, color, frames,
          current: frames.length ? frames[frames.length - 1].id : -1,
          line: 6,
          desc: `done with ${s.nodes[u].val}; color black; backtrack`,
        };
      }

      const v = nbrs[top.childIdx];
      top.childIdx += 1;
      frames[frames.length - 1] = top;
      const edgeKind = { ...s.edgeKind };
      const key = `${u}-${v}`;

      if (color[v] === "gray") {
        edgeKind[key] = "back";
        return { ...s, frames, edgeKind, cycleFound: true, line: 4, desc: `edge ${s.nodes[u].val}→${s.nodes[v].val}: ${s.nodes[v].val} is gray → BACK edge → CYCLE` };
      }
      if (color[v] === "black") {
        edgeKind[key] = "cross";
        return { ...s, frames, edgeKind, line: 5, desc: `edge ${s.nodes[u].val}→${s.nodes[v].val}: ${s.nodes[v].val} black → cross/forward edge; skip` };
      }
      // white -> tree edge, descend
      edgeKind[key] = "tree";
      return {
        ...s, frames: [...frames, { id: v, childIdx: 0 }],
        edgeKind, current: v, line: 5,
        desc: `edge ${s.nodes[u].val}→${s.nodes[v].val}: ${s.nodes[v].val} white → TREE edge; descend`,
      };
    },
    render(s, stage) {
      const ns = s.nodes.map(n => {
        let h = null;
        if (s.color[n.id] === "gray") h = "visit";
        else if (s.color[n.id] === "black") h = "done";
        if (n.id === s.current && !s.cycleFound) h = "visit";
        return { ...n, highlight: h, tag: s.color[n.id] };
      });
      const es = s.edges.map(e => {
        const k = `${e.a}-${e.b}`;
        const kind = s.edgeKind[k];
        let highlight = null;
        if (kind === "tree") highlight = "done";
        else if (kind === "back") highlight = "active";
        else if (kind === "cross") highlight = "ghost";
        return { ...e, highlight };
      });
      P.graph(stage, { nodes: ns, edges: es });
    },
    readout: s => {
      const colors = Object.entries(s.color).map(([k, v]) => `${s.nodes[k].val}:${v[0]}`).join(" ");
      return [
        { label: "current", value: s.current >= 0 ? s.nodes[s.current].val : "—" },
        { label: "colors", value: colors },
        { label: "cycle?", value: s.cycleFound ? "yes" : "no" },
      ];
    },
  });

  // ---------- Tree traversals (pre / in / post) ----------------------
  let TT_KIND = "in";  // default

  register("tree-traversals", {
    title: "Tree traversal — pre / in / post (toggle)",
    caption: "Same DFS skeleton, different visit-time. Preorder visits before recursing, inorder visits between L and R, postorder visits after both.",
    code: [
      "def pre(u):  visit; pre(L); pre(R)",
      "def in_(u):  in_(L); visit; in_(R)",
      "def post(u): post(L); post(R); visit",
    ],
    inputs: [
      { label: "order (pre/in/post)", type: "text", default: "in", onChange: v => { TT_KIND = (v || "in").trim().toLowerCase(); } },
    ],
    init() {
      // Same 7-node tree as level-order
      const nodes = [
        { id: 0, val: 1, x: 200, y: 40,  parent: null },
        { id: 1, val: 2, x: 120, y: 110, parent: 0 },
        { id: 2, val: 3, x: 280, y: 110, parent: 0 },
        { id: 3, val: 4, x: 70,  y: 180, parent: 1 },
        { id: 4, val: 5, x: 170, y: 180, parent: 1 },
        { id: 5, val: 6, x: 240, y: 180, parent: 2 },
        { id: 6, val: 7, x: 330, y: 180, parent: 2 },
      ];
      const children = { 0: [1, 2], 1: [3, 4], 2: [5, 6], 3: [], 4: [], 5: [], 6: [] };
      const kind = (TT_KIND === "pre" || TT_KIND === "in" || TT_KIND === "post") ? TT_KIND : "in";
      return {
        nodes, children,
        kind,
        // frames track {id, step}; step encodes progress through visit/L/R
        // pre: 0=visit, 1=descend L, 2=descend R, 3=done
        // in:  0=descend L, 1=visit, 2=descend R, 3=done
        // post:0=descend L, 1=descend R, 2=visit, 3=done
        frames: [{ id: 0, step: 0 }],
        current: 0,
        visited: [],
        line: kind === "pre" ? 0 : (kind === "in" ? 1 : 2),
        desc: `${kind}-order traversal starting at root`,
      };
    },
    step(s) {
      if (!s.frames.length) {
        return { ...s, current: -1, desc: `done — order: ${s.visited.map(i => s.nodes[i].val).join(" → ")}`, done: true };
      }
      const frames = s.frames.map(f => ({ ...f }));
      const top = frames[frames.length - 1];
      const kids = s.children[top.id];
      const L = kids[0], R = kids[1];
      const kind = s.kind;

      // Step encoding per kind
      if (kind === "pre") {
        if (top.step === 0) {
          top.step = 1; frames[frames.length - 1] = top;
          return { ...s, frames, current: top.id, visited: [...s.visited, top.id], desc: `visit ${s.nodes[top.id].val}` };
        }
        if (top.step === 1) {
          top.step = 2; frames[frames.length - 1] = top;
          if (L != null) return { ...s, frames: [...frames, { id: L, step: 0 }], current: L, desc: `descend left into ${s.nodes[L].val}` };
          return { ...s, frames, desc: `no left child` };
        }
        if (top.step === 2) {
          top.step = 3; frames[frames.length - 1] = top;
          if (R != null) return { ...s, frames: [...frames, { id: R, step: 0 }], current: R, desc: `descend right into ${s.nodes[R].val}` };
          return { ...s, frames, desc: `no right child` };
        }
        frames.pop();
        return { ...s, frames, current: frames.length ? frames[frames.length - 1].id : -1, desc: `return from ${s.nodes[top.id].val}` };
      }
      if (kind === "in") {
        if (top.step === 0) {
          top.step = 1; frames[frames.length - 1] = top;
          if (L != null) return { ...s, frames: [...frames, { id: L, step: 0 }], current: L, desc: `descend left into ${s.nodes[L].val}` };
          return { ...s, frames, desc: `no left child` };
        }
        if (top.step === 1) {
          top.step = 2; frames[frames.length - 1] = top;
          return { ...s, frames, current: top.id, visited: [...s.visited, top.id], desc: `visit ${s.nodes[top.id].val}` };
        }
        if (top.step === 2) {
          top.step = 3; frames[frames.length - 1] = top;
          if (R != null) return { ...s, frames: [...frames, { id: R, step: 0 }], current: R, desc: `descend right into ${s.nodes[R].val}` };
          return { ...s, frames, desc: `no right child` };
        }
        frames.pop();
        return { ...s, frames, current: frames.length ? frames[frames.length - 1].id : -1, desc: `return from ${s.nodes[top.id].val}` };
      }
      // post
      if (top.step === 0) {
        top.step = 1; frames[frames.length - 1] = top;
        if (L != null) return { ...s, frames: [...frames, { id: L, step: 0 }], current: L, desc: `descend left into ${s.nodes[L].val}` };
        return { ...s, frames, desc: `no left child` };
      }
      if (top.step === 1) {
        top.step = 2; frames[frames.length - 1] = top;
        if (R != null) return { ...s, frames: [...frames, { id: R, step: 0 }], current: R, desc: `descend right into ${s.nodes[R].val}` };
        return { ...s, frames, desc: `no right child` };
      }
      if (top.step === 2) {
        top.step = 3; frames[frames.length - 1] = top;
        return { ...s, frames, current: top.id, visited: [...s.visited, top.id], desc: `visit ${s.nodes[top.id].val}` };
      }
      frames.pop();
      return { ...s, frames, current: frames.length ? frames[frames.length - 1].id : -1, desc: `return from ${s.nodes[top.id].val}` };
    },
    render(s, stage) {
      stage.innerHTML = "";
      const wrap = document.createElement("div");
      wrap.style.display = "flex"; wrap.style.flexDirection = "column"; wrap.style.gap = "0.5rem"; wrap.style.width = "100%";

      const ns = s.nodes.map(n => {
        let h = null;
        if (s.visited.includes(n.id)) h = "done";
        if (n.id === s.current) h = "visit";
        return { ...n, highlight: h };
      });
      const treeHost = document.createElement("div");
      P.tree(treeHost, { nodes: ns });
      wrap.appendChild(treeHost);

      const meta = document.createElement("div");
      meta.style.fontFamily = "var(--md-code-font)"; meta.style.fontSize = "0.74rem";
      meta.style.textAlign = "center"; meta.style.color = "var(--md-default-fg-color--light)";
      meta.innerHTML = `<strong>${s.kind}-order:</strong> ${s.visited.map(i => s.nodes[i].val).join(" → ") || "—"}`;
      wrap.appendChild(meta);

      stage.appendChild(wrap);
    },
    readout: s => [
      { label: "order", value: s.kind },
      { label: "current", value: s.current >= 0 ? s.nodes[s.current]?.val : "—" },
      { label: "visited", value: s.visited.length },
      { label: "depth", value: s.frames.length },
    ],
  });

  // ===================================================================
  // BACKTRACKING
  // ===================================================================

  // ---------- Word Search ---------------------------------------------
  register("word-search", {
    title: "Word Search — DFS + backtracking",
    caption: "From each cell that matches word[0], DFS into 4 neighbours, marking cells visited. Unmark on the way back.",
    code: [
      "def dfs(r, c, wi):",
      "  if wi == len(word): return True",
      "  if oob or visited or grid[r][c] != word[wi]: return False",
      "  visited[r][c] = True",
      "  for (dr,dc) in 4-neighbours:",
      "    if dfs(r+dr, c+dc, wi+1): return True",
      "  visited[r][c] = False",
    ],
    init() {
      const grid = [
        ["A", "B", "C", "E"],
        ["S", "F", "C", "S"],
        ["A", "D", "E", "E"],
      ];
      const word = "ABCCED";
      const rows = grid.length, cols = grid[0].length;
      const visited = Array.from({ length: rows }, () => new Array(cols).fill(false));
      visited[0][0] = true;
      return {
        grid, word,
        // frames: { r, c, wi, dirIdx }
        frames: [{ r: 0, c: 0, wi: 0, dirIdx: 0 }],
        visited,
        current: [0, 0],
        found: false,
        line: 0,
        desc: `start at (0,0) for word[0]='${word[0]}'`,
      };
    },
    step(s) {
      if (s.found) return { ...s, line: 1, desc: `word "${s.word}" found!`, done: true };
      if (!s.frames.length) return { ...s, line: 6, current: null, desc: `exhausted — word not found`, done: true };

      const rows = s.grid.length, cols = s.grid[0].length;
      const frames = s.frames.map(f => ({ ...f }));
      const top = frames[frames.length - 1];

      // First entry: check match for word[wi]
      if (top.dirIdx === 0 && !top.checked) {
        top.checked = true;
        frames[frames.length - 1] = top;
        // Already pre-validated when pushed; nothing to do.
        // Check if this completes the word
        if (top.wi === s.word.length - 1) {
          return { ...s, frames, found: true, line: 1, desc: `at (${top.r},${top.c}) matches '${s.word[top.wi]}' — word complete!` };
        }
        return { ...s, frames, line: 4, desc: `at (${top.r},${top.c}) matches '${s.word[top.wi]}'; explore neighbours for '${s.word[top.wi + 1]}'` };
      }

      const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
      if (top.dirIdx >= dirs.length) {
        // unmark and pop
        const visited = s.visited.map(row => row.slice());
        visited[top.r][top.c] = false;
        frames.pop();
        return {
          ...s, frames, visited,
          current: frames.length ? [frames[frames.length - 1].r, frames[frames.length - 1].c] : null,
          line: 7,
          desc: `unmark (${top.r},${top.c}); backtrack`,
        };
      }

      const [dr, dc] = dirs[top.dirIdx];
      top.dirIdx += 1;
      frames[frames.length - 1] = top;
      const nr = top.r + dr, nc = top.c + dc;
      const nwi = top.wi + 1;
      if (nr < 0 || nc < 0 || nr >= rows || nc >= cols) {
        return { ...s, frames, line: 2, desc: `try (${nr},${nc}) — out of bounds; skip` };
      }
      if (s.visited[nr][nc]) {
        return { ...s, frames, line: 2, desc: `try (${nr},${nc}) — already visited; skip` };
      }
      if (s.grid[nr][nc] !== s.word[nwi]) {
        return { ...s, frames, line: 2, desc: `try (${nr},${nc}) = '${s.grid[nr][nc]}' ≠ '${s.word[nwi]}'; skip` };
      }
      // valid; descend
      const visited = s.visited.map(row => row.slice());
      visited[nr][nc] = true;
      return {
        ...s, frames: [...frames, { r: nr, c: nc, wi: nwi, dirIdx: 0 }],
        visited, current: [nr, nc], line: 5,
        desc: `descend to (${nr},${nc}) = '${s.grid[nr][nc]}' matches word[${nwi}]`,
      };
    },
    render(s, stage) {
      stage.innerHTML = "";
      const wrap = document.createElement("div");
      wrap.style.display = "flex"; wrap.style.flexDirection = "column"; wrap.style.gap = "0.5rem"; wrap.style.width = "100%";

      // matched prefix display
      const matched = s.frames.length ? s.frames[s.frames.length - 1].wi + 1 : 0;
      const prefix = document.createElement("div");
      prefix.style.fontFamily = "var(--md-code-font)"; prefix.style.fontSize = "0.9rem";
      prefix.style.textAlign = "center"; prefix.style.fontWeight = "700";
      prefix.innerHTML = s.word.split("").map((ch, k) => {
        const cls = k < matched ? "color:#34d399;" : "color:var(--md-default-fg-color--lighter);";
        return `<span style="${cls};padding:0 0.15rem;">${ch}</span>`;
      }).join("");
      wrap.appendChild(prefix);

      const gridHost = document.createElement("div");
      P.grid(gridHost, {
        rows: s.grid.length, cols: s.grid[0].length,
        cellSize: 48,
        cellOf: (r, c) => {
          let cls = "";
          const onPath = s.visited[r][c];
          const isCurrent = s.current && s.current[0] === r && s.current[1] === c;
          if (s.found && onPath) cls = "done";
          else if (isCurrent) cls = "visit";
          else if (onPath) cls = "path";
          return { val: s.grid[r][c], cls };
        },
      });
      wrap.appendChild(gridHost);

      stage.appendChild(wrap);
    },
    readout: s => {
      const top = s.frames[s.frames.length - 1];
      return [
        { label: "current", value: s.current ? `(${s.current[0]},${s.current[1]})` : "—" },
        { label: "wi", value: top ? top.wi : "—" },
        { label: "matched", value: top ? `"${s.word.slice(0, top.wi + 1)}"` : "" },
        { label: "depth", value: s.frames.length },
        { label: "found", value: s.found ? "yes" : "no" },
      ];
    },
  });

})();
