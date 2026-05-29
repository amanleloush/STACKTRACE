/* ===========================================================
   Brain Detox Arc — DSA visualization upgrades (heap pack)
   ----------------------------------------------------------
   Four heap-driven algorithms:
     · merge-k-sorted
     · median-of-stream
     · k-closest-points
     · task-scheduler
   Each renders inputs on top, heap(s) below as P.array with
   the root marked `target`.
   =========================================================== */
(function () {
  "use strict";
  if (!window.DSA) return;
  const { primitives: P, register } = window.DSA;

  // ---------- shared helpers ------------------------------------------
  // Build a host div with a centered small label above the primitive.
  function panel(label) {
    const wrap = document.createElement("div");
    wrap.style.width = "100%";
    if (label) {
      const head = document.createElement("div");
      head.style.fontSize = "0.65rem";
      head.style.color = "var(--md-default-fg-color--light)";
      head.style.textAlign = "center";
      head.style.margin = "0 0 0.25rem 0";
      head.style.fontFamily = "var(--md-code-font)";
      head.innerHTML = label;
      wrap.appendChild(head);
    }
    return wrap;
  }
  function column(gap) {
    const w = document.createElement("div");
    w.style.display = "flex";
    w.style.flexDirection = "column";
    w.style.gap = (gap || 0.7) + "rem";
    w.style.width = "100%";
    return w;
  }
  function row(gap) {
    const w = document.createElement("div");
    w.style.display = "flex";
    w.style.flexDirection = "row";
    w.style.gap = (gap || 1.0) + "rem";
    w.style.width = "100%";
    w.style.alignItems = "flex-start";
    w.style.justifyContent = "center";
    w.style.flexWrap = "wrap";
    return w;
  }

  // Insert into a sorted-by-key list (stable, ascending by key(item)).
  function pushHeap(heap, item, key) {
    const h = heap.slice();
    const k = key(item);
    let i = 0;
    while (i < h.length && key(h[i]) <= k) i++;
    h.splice(i, 0, item);
    return h;
  }

  // ===================================================================
  // 1) MERGE K SORTED LISTS
  // ===================================================================
  register("merge-k-sorted", {
    title: "Merge K sorted lists — min-heap of heads",
    caption: "Put each list's head into a min-heap. Pop the smallest, append to output, push the next value from the same source list.",
    code: [
      "heap = [(lists[i][0], i, 0) for i in 0..k-1]",
      "while heap:",
      "  (val, li, pi) = heappop(heap)",
      "  out.append(val)",
      "  if pi + 1 < len(lists[li]):",
      "    heappush(heap, (lists[li][pi+1], li, pi+1))",
      "return out",
    ],
    init() {
      const lists = [[1, 4, 7], [2, 5, 8], [3, 6, 9]];
      // initial heap: heads of every non-empty list, sorted by val
      const heap = [];
      for (let li = 0; li < lists.length; li++) {
        if (lists[li].length) heap.push({ val: lists[li][0], li, pi: 0 });
      }
      heap.sort((a, b) => a.val - b.val);
      // heads[li] = posInList of the current head living in the heap (-1 if list exhausted)
      const heads = lists.map(() => 0);
      const consumed = lists.map(l => new Array(l.length).fill(false));
      return {
        lists, heap, out: [], heads, consumed,
        popped: null, pushed: null,
        line: 0,
        desc: `seed heap with ${heap.length} heads`,
      };
    },
    step(s) {
      // First step: just acknowledge the seeded heap.
      if (s.line === 0) {
        return { ...s, line: 1, popped: null, pushed: null, desc: "loop while heap non-empty" };
      }
      if (!s.heap.length) {
        return { ...s, line: 6, popped: null, pushed: null, desc: `done — merged ${s.out.length} values`, done: true };
      }
      // Phase A: pop and append
      if (s.line === 1 || s.line === 5) {
        const heap = s.heap.slice();
        const top = heap.shift();
        const out = [...s.out, top.val];
        const consumed = s.consumed.map(r => r.slice());
        consumed[top.li][top.pi] = true;
        // mark this list's head as "no live head in heap" until we push next (heads[li] -> next index or -1)
        const heads = s.heads.slice();
        heads[top.li] = top.pi + 1 < s.lists[top.li].length ? top.pi + 1 : -1;
        return {
          ...s, heap, out, consumed, heads,
          popped: top, pushed: null,
          line: 2,
          desc: `pop (val=${top.val}, list=${top.li}, pos=${top.pi}) → append ${top.val} to output`,
        };
      }
      // Phase B: push the next value from the popped list, if any
      if (s.line === 2) {
        const p = s.popped;
        if (!p) return { ...s, line: 1, desc: "back to top of loop" };
        const nextPos = p.pi + 1;
        if (nextPos >= s.lists[p.li].length) {
          return {
            ...s, line: 5, popped: null, pushed: null,
            desc: `list ${p.li} exhausted — nothing to push`,
          };
        }
        const item = { val: s.lists[p.li][nextPos], li: p.li, pi: nextPos };
        const heap = pushHeap(s.heap, item, x => x.val);
        return {
          ...s, heap, pushed: item, popped: null, line: 5,
          desc: `push (val=${item.val}, list=${item.li}, pos=${item.pi}) into heap`,
        };
      }
    },
    render(s, stage) {
      stage.innerHTML = "";
      const wrap = column(0.7);

      // three input lists stacked
      const listsLabel = panel(`<strong>input lists</strong> (live head highlighted; consumed values dimmed)`);
      s.lists.forEach((arr, li) => {
        const lh = document.createElement("div");
        lh.style.fontSize = "0.6rem";
        lh.style.color = "var(--md-default-fg-color--light)";
        lh.style.textAlign = "center";
        lh.style.marginBottom = "0.2rem";
        lh.style.fontFamily = "var(--md-code-font)";
        lh.textContent = `list ${li}`;
        listsLabel.appendChild(lh);
        const host = document.createElement("div");
        const hi = {};
        for (let k = 0; k < arr.length; k++) {
          if (s.consumed[li][k]) hi[k] = "done";
        }
        if (s.heads[li] >= 0 && s.heads[li] < arr.length) hi[s.heads[li]] = "cmp";
        if (s.popped && s.popped.li === li) hi[s.popped.pi] = "done";
        if (s.pushed && s.pushed.li === li) hi[s.pushed.pi] = "cmp";
        const ptrs = {};
        if (s.heads[li] >= 0 && s.heads[li] < arr.length) ptrs[`head${li}`] = s.heads[li];
        P.array(host, { arr, pointers: ptrs, highlight: hi });
        listsLabel.appendChild(host);
      });
      wrap.appendChild(listsLabel);

      // heap (as an array, root = idx 0)
      const heapPanel = panel(`<strong>min-heap</strong> of (val, list, pos) — root = next to pop`);
      const heapHost = document.createElement("div");
      const heapArr = s.heap.map(x => `${x.val}·L${x.li}`);
      const heapHi = {};
      if (heapArr.length) heapHi[0] = "target";
      if (s.pushed) {
        const idx = s.heap.findIndex(x => x.val === s.pushed.val && x.li === s.pushed.li && x.pi === s.pushed.pi);
        if (idx > 0) heapHi[idx] = "cmp";
      }
      P.array(heapHost, {
        arr: heapArr.length ? heapArr : ["∅"],
        indexed: heapArr.length > 0,
        highlight: heapHi,
      });
      heapPanel.appendChild(heapHost);
      wrap.appendChild(heapPanel);

      // output array
      const outPanel = panel(`<strong>output</strong> (merged, sorted)`);
      const outHost = document.createElement("div");
      const outHi = {};
      for (let k = 0; k < s.out.length; k++) outHi[k] = "done";
      if (s.popped && s.out.length) outHi[s.out.length - 1] = "found";
      P.array(outHost, {
        arr: s.out.length ? s.out : ["∅"],
        indexed: s.out.length > 0,
        highlight: outHi,
      });
      outPanel.appendChild(outHost);
      wrap.appendChild(outPanel);

      stage.appendChild(wrap);
    },
    readout: s => [
      { label: "heap size", value: s.heap.length },
      { label: "merged", value: s.out.length },
      { label: "next out", value: s.heap.length ? s.heap[0].val : "—" },
      { label: "last popped", value: s.popped ? `${s.popped.val} (L${s.popped.li})` : "—" },
    ],
  });

  // ===================================================================
  // 2) MEDIAN OF DATA STREAM
  // ===================================================================
  register("median-of-stream", {
    title: "Median of stream — two heaps",
    caption: "Lower half is a max-heap (we store negatives so the array-sort visual still shows the root at index 0). Upper half is a min-heap. Keep sizes within one.",
    code: [
      "if not lo or x <= -lo[0]: push(lo, -x)",
      "else: push(hi, x)",
      "# rebalance so |lo| - |hi| ∈ {0, 1}",
      "if len(lo) > len(hi) + 1: push(hi, -pop(lo))",
      "elif len(hi) > len(lo):  push(lo, -pop(hi))",
      "median = -lo[0] if |lo|>|hi| else (-lo[0]+hi[0])/2",
    ],
    init() {
      return {
        stream: [5, 15, 1, 3, 8, 7, 9, 10, 6],
        i: 0,
        lo: [], // max-heap stored as negatives, sorted ascending → root at idx 0 is most-negative = largest original
        hi: [], // min-heap, sorted ascending → root at idx 0 is smallest
        medians: [],
        phase: "push",
        last: null,
        line: 0,
        desc: "stream is empty; lo and hi are both empty",
      };
    },
    step(s) {
      // Done when we've consumed and rebalanced everything.
      if (s.i >= s.stream.length && s.phase === "push") {
        return { ...s, line: 5, desc: `done — final median = ${s.medians[s.medians.length - 1]}`, done: true };
      }
      // PUSH a value
      if (s.phase === "push") {
        const x = s.stream[s.i];
        const loTopOriginal = s.lo.length ? -s.lo[0] : null;
        if (!s.lo.length || x <= loTopOriginal) {
          // push to lo (negated)
          const lo = pushHeap(s.lo, -x, v => v);
          return {
            ...s, lo, phase: "rebalance", last: { side: "lo", x }, line: 0,
            desc: `consume ${x}: ${!s.lo.length ? "lo empty" : `${x} ≤ lo.top=${loTopOriginal}`} → push to lo (max-heap)`,
          };
        } else {
          const hi = pushHeap(s.hi, x, v => v);
          return {
            ...s, hi, phase: "rebalance", last: { side: "hi", x }, line: 1,
            desc: `consume ${x}: ${x} > lo.top=${loTopOriginal} → push to hi (min-heap)`,
          };
        }
      }
      // REBALANCE
      if (s.phase === "rebalance") {
        if (s.lo.length > s.hi.length + 1) {
          const lo = s.lo.slice();
          const moved = -lo.shift();
          const hi = pushHeap(s.hi, moved, v => v);
          return {
            ...s, lo, hi, phase: "median", line: 3,
            desc: `|lo|=${s.lo.length} > |hi|=${s.hi.length}+1 → move ${moved} from lo → hi`,
          };
        }
        if (s.hi.length > s.lo.length) {
          const hi = s.hi.slice();
          const moved = hi.shift();
          const lo = pushHeap(s.lo, -moved, v => v);
          return {
            ...s, lo, hi, phase: "median", line: 4,
            desc: `|hi|=${s.hi.length} > |lo|=${s.lo.length} → move ${moved} from hi → lo`,
          };
        }
        return { ...s, phase: "median", line: 2, desc: "sizes within one — no rebalance needed" };
      }
      // COMPUTE MEDIAN
      if (s.phase === "median") {
        const loTop = s.lo.length ? -s.lo[0] : null;
        const hiTop = s.hi.length ? s.hi[0] : null;
        let med;
        if (s.lo.length > s.hi.length) med = loTop;
        else med = (loTop + hiTop) / 2;
        return {
          ...s, medians: [...s.medians, med], phase: "push", i: s.i + 1, line: 5,
          desc: s.lo.length > s.hi.length
            ? `odd count → median = lo.top = ${loTop}`
            : `even count → median = (${loTop} + ${hiTop})/2 = ${med}`,
        };
      }
    },
    render(s, stage) {
      stage.innerHTML = "";
      const wrap = column(0.7);

      // stream on top
      const streamPanel = panel(`<strong>stream</strong> (consumed values dimmed; current highlighted)`);
      const streamHost = document.createElement("div");
      const sHi = {};
      for (let k = 0; k < s.i; k++) sHi[k] = "done";
      if (s.i < s.stream.length) sHi[s.i] = "cmp";
      const ptrs = {};
      if (s.i < s.stream.length) ptrs.i = s.i;
      P.array(streamHost, { arr: s.stream, pointers: ptrs, highlight: sHi });
      streamPanel.appendChild(streamHost);
      wrap.appendChild(streamPanel);

      // two heaps side-by-side
      const heapsRow = row(1.2);

      const loPanel = panel(`<strong>lower half (max-heap)</strong> — shown as actual values, root = max`);
      const loHost = document.createElement("div");
      const loArr = s.lo.map(v => -v); // de-negate for display
      const loHi = {};
      if (loArr.length) loHi[0] = "target";
      P.array(loHost, { arr: loArr.length ? loArr : ["∅"], indexed: loArr.length > 0, highlight: loHi });
      loPanel.appendChild(loHost);
      loPanel.style.flex = "1 1 280px";
      heapsRow.appendChild(loPanel);

      const hiPanel = panel(`<strong>upper half (min-heap)</strong> — root = min`);
      const hiHost = document.createElement("div");
      const hiHi = {};
      if (s.hi.length) hiHi[0] = "target";
      P.array(hiHost, { arr: s.hi.length ? s.hi : ["∅"], indexed: s.hi.length > 0, highlight: hiHi });
      hiPanel.appendChild(hiHost);
      hiPanel.style.flex = "1 1 280px";
      heapsRow.appendChild(hiPanel);

      wrap.appendChild(heapsRow);

      // medians history
      const medPanel = panel(`<strong>running median</strong> after each insert`);
      const medHost = document.createElement("div");
      const mHi = {};
      for (let k = 0; k < s.medians.length; k++) mHi[k] = "done";
      if (s.medians.length) mHi[s.medians.length - 1] = "found";
      P.array(medHost, {
        arr: s.medians.length ? s.medians.map(x => Number.isInteger(x) ? x : x.toFixed(1)) : ["∅"],
        indexed: s.medians.length > 0,
        highlight: mHi,
      });
      medPanel.appendChild(medHost);
      wrap.appendChild(medPanel);

      stage.appendChild(wrap);
    },
    readout: s => [
      { label: "i", value: s.i < s.stream.length ? s.i : "done" },
      { label: "|lo|", value: s.lo.length },
      { label: "|hi|", value: s.hi.length },
      { label: "median", value: s.medians.length ? s.medians[s.medians.length - 1] : "—" },
    ],
  });

  // ===================================================================
  // 3) K CLOSEST POINTS TO ORIGIN
  // ===================================================================
  register("k-closest-points", {
    title: "K closest points — max-heap of size K",
    caption: "Maintain a max-heap of size ≤ K keyed by squared distance. If size exceeds K, pop the farthest. The K closest survive.",
    code: [
      "heap = []  # max-heap by squared distance",
      "for idx in 0..n-1:",
      "  d = x*x + y*y",
      "  heappush(heap, (-d, idx))",
      "  if len(heap) > k:",
      "    heappop(heap)",
      "return [pt for (_, idx) in heap]",
    ],
    init() {
      const points = [[1, 3], [-2, 2], [5, 8], [0, 1], [3, -1], [-3, 4], [2, 2], [6, -2]];
      return {
        points, k: 3,
        heap: [], // sorted by dist desc → root at idx 0 is the max (farthest)
        i: 0,
        last: null, // { kind: 'push' | 'pop', idx, dist }
        line: 0,
        desc: "begin scan",
      };
    },
    step(s) {
      if (s.i >= s.points.length) {
        return { ...s, line: 6, last: null, desc: `done — ${s.heap.length} closest points selected`, done: true };
      }
      // Phase: compute + push
      if (s.line === 0 || s.line === 6 || s.line === 4) {
        const [x, y] = s.points[s.i];
        const d = x * x + y * y;
        // max-heap → sort descending by dist
        const item = { idx: s.i, dist: d };
        const heap = s.heap.slice();
        let j = 0;
        while (j < heap.length && heap[j].dist >= d) j++;
        heap.splice(j, 0, item);
        return {
          ...s, heap, line: 3, last: { kind: "push", idx: s.i, dist: d },
          desc: `point ${s.i}=(${x},${y}) → d² = ${x}² + ${y}² = ${d}; push into heap`,
        };
      }
      // Phase: maybe pop
      if (s.line === 3) {
        if (s.heap.length > s.k) {
          const heap = s.heap.slice();
          const popped = heap.shift();
          return {
            ...s, heap, line: 4, i: s.i + 1,
            last: { kind: "pop", idx: popped.idx, dist: popped.dist },
            desc: `size ${s.heap.length} > k=${s.k} — pop farthest (idx ${popped.idx}, d²=${popped.dist})`,
          };
        }
        return {
          ...s, line: 4, i: s.i + 1, last: null,
          desc: `size ${s.heap.length} ≤ k=${s.k} — keep all`,
        };
      }
    },
    render(s, stage) {
      stage.innerHTML = "";
      const wrap = column(0.7);

      // points list with squared distances
      const ptsPanel = panel(`<strong>points</strong> with squared distance d² = x² + y² (current highlighted)`);
      const ptsHost = document.createElement("div");
      const labels = s.points.map(([x, y], k) => `(${x},${y})=${x * x + y * y}`);
      const ptHi = {};
      for (let k = 0; k < s.i; k++) ptHi[k] = "done";
      if (s.i < s.points.length) ptHi[s.i] = "cmp";
      // mark final K survivors as found
      if (s.done || s.i >= s.points.length) {
        s.heap.forEach(h => { ptHi[h.idx] = "found"; });
      }
      // mark just-popped as ghost-ish (use 'done' since 'ghost' exists)
      if (s.last && s.last.kind === "pop") ptHi[s.last.idx] = "ghost";
      P.array(ptsHost, { arr: labels, highlight: ptHi, cellW: 80 });
      ptsPanel.appendChild(ptsHost);
      wrap.appendChild(ptsPanel);

      // scatter SVG
      const scatterPanel = panel(`<strong>scatter</strong> — origin at center; final K marked, current ringed`);
      const SVGNS = "http://www.w3.org/2000/svg";
      const svg = document.createElementNS(SVGNS, "svg");
      const W = 320, H = 200;
      const cx = W / 2, cy = H / 2;
      const scale = 16;
      svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
      svg.setAttribute("width", W);
      svg.style.maxWidth = "100%";
      svg.style.height = "auto";
      svg.style.border = "1px solid var(--md-default-fg-color--lightest)";
      svg.style.borderRadius = "6px";
      svg.style.background = "rgba(255,255,255,0.02)";
      // axes
      const axL = document.createElementNS(SVGNS, "line");
      axL.setAttribute("x1", 8); axL.setAttribute("x2", W - 8);
      axL.setAttribute("y1", cy); axL.setAttribute("y2", cy);
      axL.setAttribute("stroke", "var(--md-default-fg-color--lightest)");
      axL.setAttribute("stroke-width", 1);
      svg.appendChild(axL);
      const axV = document.createElementNS(SVGNS, "line");
      axV.setAttribute("y1", 8); axV.setAttribute("y2", H - 8);
      axV.setAttribute("x1", cx); axV.setAttribute("x2", cx);
      axV.setAttribute("stroke", "var(--md-default-fg-color--lightest)");
      axV.setAttribute("stroke-width", 1);
      svg.appendChild(axV);
      // origin marker
      const origin = document.createElementNS(SVGNS, "circle");
      origin.setAttribute("cx", cx); origin.setAttribute("cy", cy);
      origin.setAttribute("r", 3);
      origin.setAttribute("fill", "var(--md-default-fg-color--light)");
      svg.appendChild(origin);
      // points
      const heapIdxSet = new Set(s.heap.map(h => h.idx));
      const lastIdx = s.last ? s.last.idx : -1;
      s.points.forEach(([x, y], idx) => {
        const px = cx + x * scale;
        const py = cy - y * scale;
        const c = document.createElementNS(SVGNS, "circle");
        c.setAttribute("cx", px); c.setAttribute("cy", py);
        c.setAttribute("r", 6);
        let fill = "var(--md-default-fg-color--lightest)";
        let stroke = "var(--md-default-fg-color--lighter)";
        if (heapIdxSet.has(idx)) { fill = "#22c55e"; stroke = "#16a34a"; }
        else if (idx < s.i) { fill = "var(--md-default-fg-color--lighter)"; }
        if (idx === s.i && s.i < s.points.length) { stroke = "#fbbf24"; }
        if (s.last && s.last.kind === "pop" && lastIdx === idx) { fill = "#ef4444"; stroke = "#dc2626"; }
        c.setAttribute("fill", fill);
        c.setAttribute("stroke", stroke);
        c.setAttribute("stroke-width", idx === s.i && s.i < s.points.length ? 3 : 1.5);
        svg.appendChild(c);
        const lab = document.createElementNS(SVGNS, "text");
        lab.setAttribute("x", px + 8);
        lab.setAttribute("y", py - 6);
        lab.setAttribute("font-size", "10");
        lab.setAttribute("fill", "var(--md-default-fg-color--light)");
        lab.setAttribute("font-family", "var(--md-code-font)");
        lab.textContent = idx;
        svg.appendChild(lab);
      });
      scatterPanel.appendChild(svg);
      wrap.appendChild(scatterPanel);

      // heap as array (root = max distance)
      const heapPanel = panel(`<strong>max-heap</strong> of squared distances (root = farthest, gets popped if size > k=${s.k})`);
      const heapHost = document.createElement("div");
      const heapArr = s.heap.map(h => `${h.dist}·p${h.idx}`);
      const heapHi = {};
      if (heapArr.length) heapHi[0] = "target";
      P.array(heapHost, {
        arr: heapArr.length ? heapArr : ["∅"],
        indexed: heapArr.length > 0,
        highlight: heapHi,
        cellW: 70,
      });
      heapPanel.appendChild(heapHost);
      wrap.appendChild(heapPanel);

      stage.appendChild(wrap);
    },
    readout: s => [
      { label: "i", value: s.i < s.points.length ? s.i : "done" },
      { label: "k", value: s.k },
      { label: "heap size", value: s.heap.length },
      { label: "heap max d²", value: s.heap.length ? s.heap[0].dist : "—" },
    ],
  });

  // ===================================================================
  // 4) TASK SCHEDULER (LeetCode 621)
  // ===================================================================
  register("task-scheduler", {
    title: "Task scheduler — max-heap + cooldown queue",
    caption: "Each tick, pop the most-frequent ready task and emit it. If its count is still positive, park it in a cooldown queue for n ticks. When the front of the queue is ready, push it back to the heap.",
    code: [
      "heap = max-heap of remaining counts",
      "queue = [] of (count, readyTime)",
      "while heap or queue:",
      "  time += 1",
      "  if queue and queue[0].readyTime == time:",
      "    push(heap, queue.pop_front())",
      "  if heap:",
      "    (cnt, t) = pop(heap); emit t",
      "    if cnt-1 > 0: queue.push((cnt-1, time+n))",
      "  else: emit 'idle'",
    ],
    init() {
      const tasks = ["A", "A", "A", "B", "B", "B"];
      const n = 2;
      const counts = {};
      tasks.forEach(t => { counts[t] = (counts[t] || 0) + 1; });
      // heap: sorted by count desc, ties broken alphabetically
      const heap = Object.keys(counts).map(t => ({ task: t, count: counts[t] }))
        .sort((a, b) => b.count - a.count || a.task.localeCompare(b.task));
      return {
        tasks, n, heap,
        queue: [], // [{ task, count, readyTime }]
        time: 0,
        schedule: [],
        phase: "tick",
        last: null,
        line: 0,
        desc: `n=${n} cooldown; initial heap from tasks {${tasks.join(",")}}`,
      };
    },
    step(s) {
      // Done when nothing left in heap or queue and we've already shown the final state.
      if (s.phase === "tick" && !s.heap.length && !s.queue.length && s.schedule.length > 0) {
        return { ...s, line: 9, desc: `done — total time = ${s.schedule.length}, schedule emitted`, done: true };
      }
      // Phase 1: tick clock
      if (s.phase === "tick") {
        return {
          ...s, time: s.time + 1, phase: "release", line: 3, last: null,
          desc: `time ${s.time + 1}: tick`,
        };
      }
      // Phase 2: release ready tasks from cooldown queue back into heap
      if (s.phase === "release") {
        const queue = s.queue.slice();
        const ready = [];
        while (queue.length && queue[0].readyTime <= s.time) {
          ready.push(queue.shift());
        }
        if (ready.length) {
          let heap = s.heap.slice();
          ready.forEach(r => {
            heap = pushHeap(heap, { task: r.task, count: r.count }, x => -x.count);
            // pushHeap sorts ascending by key, so -count ascending = count descending.
          });
          // also break ties: re-sort by (count desc, task asc)
          heap.sort((a, b) => b.count - a.count || a.task.localeCompare(b.task));
          return {
            ...s, queue, heap, phase: "emit", line: 4,
            desc: `release ${ready.length} task(s) from cooldown → ${ready.map(r => `${r.task}(×${r.count})`).join(", ")}`,
          };
        }
        return { ...s, phase: "emit", line: 3, desc: "no tasks ready to release from cooldown" };
      }
      // Phase 3: emit
      if (s.phase === "emit") {
        if (s.heap.length) {
          const heap = s.heap.slice();
          const top = heap.shift();
          const schedule = [...s.schedule, top.task];
          let queue = s.queue;
          let parkMsg = "";
          if (top.count - 1 > 0) {
            queue = [...s.queue, { task: top.task, count: top.count - 1, readyTime: s.time + s.n }];
            parkMsg = ` → park (${top.task}, count=${top.count - 1}, ready@${s.time + s.n})`;
          } else {
            parkMsg = " (last copy — not parked)";
          }
          return {
            ...s, heap, queue, schedule,
            phase: "tick", line: 7, last: { task: top.task, time: s.time },
            desc: `emit ${top.task} at time ${s.time}${parkMsg}`,
          };
        }
        // idle tick — only if queue still has pending work
        if (s.queue.length) {
          const schedule = [...s.schedule, "idle"];
          return {
            ...s, schedule, phase: "tick", line: 9,
            last: { task: "idle", time: s.time },
            desc: `heap empty but cooldown not — emit idle at time ${s.time}`,
          };
        }
        // truly done
        return {
          ...s, phase: "tick", line: 9,
          desc: `done — total time = ${s.schedule.length}`, done: true,
        };
      }
    },
    render(s, stage) {
      stage.innerHTML = "";
      const wrap = column(0.7);

      // input task list (for context)
      const taskPanel = panel(`<strong>input tasks</strong> (cooldown n=${s.n})`);
      const taskHost = document.createElement("div");
      P.array(taskHost, { arr: s.tasks, indexed: false, cellW: 40 });
      taskPanel.appendChild(taskHost);
      wrap.appendChild(taskPanel);

      // max-heap of counts
      const heapPanel = panel(`<strong>max-heap</strong> (task × remaining-count, root = most frequent ready)`);
      const heapHost = document.createElement("div");
      const heapArr = s.heap.map(h => `${h.task}×${h.count}`);
      const heapHi = {};
      if (heapArr.length) heapHi[0] = "target";
      P.array(heapHost, {
        arr: heapArr.length ? heapArr : ["∅"],
        indexed: heapArr.length > 0,
        highlight: heapHi,
        cellW: 60,
      });
      heapPanel.appendChild(heapHost);
      wrap.appendChild(heapPanel);

      // cooldown queue
      const qPanel = panel(`<strong>cooldown queue</strong> — (task, count, readyTime); front pops back to heap when readyTime == time`);
      const qHost = document.createElement("div");
      const qArr = s.queue.map(q => `${q.task}×${q.count}@${q.readyTime}`);
      const qHi = {};
      if (qArr.length) qHi[0] = "window";
      P.array(qHost, {
        arr: qArr.length ? qArr : ["∅"],
        indexed: qArr.length > 0,
        highlight: qHi,
        cellW: 80,
      });
      qPanel.appendChild(qHost);
      wrap.appendChild(qPanel);

      // schedule timeline
      const sPanel = panel(`<strong>schedule</strong> — emitted task per time-step (idle = wait)`);
      const sHost = document.createElement("div");
      const sHi = {};
      for (let k = 0; k < s.schedule.length; k++) {
        sHi[k] = s.schedule[k] === "idle" ? "ghost" : "done";
      }
      if (s.last && s.schedule.length) sHi[s.schedule.length - 1] = "found";
      P.array(sHost, {
        arr: s.schedule.length ? s.schedule : ["∅"],
        indexed: s.schedule.length > 0,
        highlight: sHi,
        cellW: 44,
      });
      sPanel.appendChild(sHost);
      wrap.appendChild(sPanel);

      stage.appendChild(wrap);
    },
    readout: s => [
      { label: "time", value: s.time },
      { label: "heap size", value: s.heap.length },
      { label: "cooldown", value: s.queue.length },
      { label: "emitted", value: s.schedule.length },
    ],
  });
})();
