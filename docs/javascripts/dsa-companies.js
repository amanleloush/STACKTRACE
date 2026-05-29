/* ===========================================================
   Brain Detox Arc — DSA company tags
   ----------------------------------------------------------
   Each algorithm key maps to a list of companies that ask it,
   tiered as either "hot" (very frequent in interview prep
   lists) or "common" (regular but not dominant).
   The renderer finds every `.dsa-viz[data-algo]` on the page
   and injects an "Asked by" chip row immediately above it.
   =========================================================== */
(function () {
  "use strict";

  // tier = "hot" (a signature question for this company — appears in their interview prep lists
  //                 or shows up disproportionately in candidate write-ups)
  //      = "common" (asked, but not particularly characteristic of that company)
  // Empty list = the algorithm is foundational / pattern-y enough that it doesn't have
  //              strong company association. Showing nothing beats showing noise.
  // Data: synthesized from LeetCode company filters, Glassdoor, Blind, Indian product-co
  // candidate write-ups (Meesho/Flipkart/Razorpay/Swiggy/Cred). 2024-2026 vintage.
  const COMPANIES = {
    // ---- Two pointers ----
    "reverse-array":          [["Microsoft","common"], ["Adobe","common"]],
    "two-sum-sorted":         [["Amazon","common"], ["Meesho","common"]],
    "remove-duplicates":      [["Microsoft","common"], ["Adobe","common"]],
    "container-most-water":   [["Amazon","hot"], ["Bloomberg","common"]],
    "3sum":                   [["Meta","hot"], ["Amazon","hot"], ["Adobe","common"]],
    "trapping-rain-water":    [["Amazon","hot"], ["Goldman Sachs","hot"], ["Meta","common"]],

    // ---- Sliding window ----
    "fixed-window-max":       [["Amazon","common"]],
    "longest-no-repeat":      [["Amazon","hot"], ["Meta","hot"], ["Adobe","common"]],
    "min-window-substring":   [["Meta","hot"], ["LinkedIn","common"], ["Amazon","common"]],
    "longest-subarray-sum-k": [["Amazon","common"]],
    "permutation-in-string":  [["Microsoft","hot"], ["Adobe","common"]],

    // ---- Binary search ----
    "binary-search":          [["Microsoft","common"], ["Meesho","common"]],
    "first-last-occurrence":  [["LinkedIn","hot"], ["Microsoft","common"]],
    "rotated-search":         [["Microsoft","hot"], ["Adobe","common"], ["Razorpay","common"]],
    "bsearch-on-answer":      [["Google","common"], ["Cred","common"]],
    "2d-matrix":              [["Amazon","common"], ["Bloomberg","common"]],
    "median-of-two":          [["Google","hot"], ["Adobe","common"]],

    // ---- BFS ----
    "bfs-graph":              [["Amazon","common"]],
    "grid-bfs":               [["Amazon","hot"], ["Flipkart","common"]],
    "level-order":            [["Amazon","common"], ["Microsoft","common"]],
    "multi-source-bfs":       [["Amazon","hot"], ["Swiggy","common"]],
    "word-ladder":            [["Amazon","hot"], ["Google","hot"]],

    // ---- DFS ----
    "dfs-graph":              [["Amazon","common"]],
    "number-of-islands":      [["Amazon","hot"], ["Bloomberg","common"], ["Meesho","common"], ["Flipkart","common"]],
    "tree-preorder":          [["Amazon","common"], ["Microsoft","common"]],
    "tree-traversals":        [["Amazon","common"], ["Bloomberg","common"]],
    "path-sum":               [["Amazon","common"]],
    "cycle-detection-graph":  [["Microsoft","common"], ["Google","common"]],

    // ---- Backtracking ----
    "subsets":                [["Meta","hot"], ["Bloomberg","common"]],
    "permutations":           [["Microsoft","hot"], ["LinkedIn","common"]],
    "combinations":           [["Microsoft","common"]],
    "n-queens":               [["Google","common"]],
    "word-search":            [["Microsoft","hot"], ["Bloomberg","common"]],
    "generate-parens":        [["Google","hot"], ["Amazon","common"]],

    // ---- Heap ----
    "top-k":                  [["Amazon","hot"], ["Meta","hot"], ["Apple","common"]],
    "merge-k-sorted":         [["Amazon","hot"], ["Google","hot"], ["LinkedIn","common"]],
    "median-of-stream":       [["Amazon","hot"], ["Google","hot"], ["Bloomberg","common"]],
    "k-closest-points":       [["Meta","hot"], ["Amazon","common"]],
    "task-scheduler":         [["Amazon","hot"], ["Meta","common"]],

    // ---- Graphs ----
    "topo-sort":              [["Amazon","hot"], ["Google","common"], ["Meesho","common"]],
    "dijkstra":               [["Uber","hot"], ["Swiggy","hot"], ["Google","common"], ["Amazon","common"]],
    "bellman-ford":           [["Google","common"]],
    "floyd-warshall":         [["Google","common"]],
    "union-find":             [["Google","hot"], ["Amazon","common"]],
    "kruskal":                [["Google","common"]],
    "prim":                   [["Google","common"]],
    "tarjan-scc":             [["Google","common"], ["Bloomberg","common"]],

    // ---- DP ----
    "fibonacci-dp":           [["Adobe","common"]],
    "house-robber":           [["LinkedIn","hot"], ["Amazon","common"]],
    "climbing-stairs":        [["Adobe","common"]],
    "coin-change":            [["Amazon","hot"], ["Goldman Sachs","common"], ["Meesho","common"]],
    "lis":                    [["Microsoft","hot"], ["Adobe","common"]],
    "lcs":                    [["Amazon","common"], ["Microsoft","common"]],
    "edit-distance":          [["Google","hot"], ["Microsoft","hot"], ["Meta","common"]],
    "knapsack-01":            [["Amazon","common"], ["Flipkart","common"]],
    "knapsack-unbounded":     [["Amazon","common"]],
    "word-break":             [["Meta","hot"], ["Amazon","common"], ["Google","common"]],
    "palindrome-partitioning":[["Bloomberg","common"]],

    // ---- Greedy ----
    "activity-selection":     [["Microsoft","common"]],
    "jump-game":              [["Amazon","hot"]],
    "gas-station":            [["Amazon","hot"], ["Bloomberg","common"]],
    "huffman":                [["Google","common"]],
    "intervals":              [["Amazon","hot"], ["Bloomberg","hot"], ["Google","common"]],

    // ---- Trie ----
    "trie-insert":            [["Amazon","hot"], ["Microsoft","hot"]],
    "trie-search":            [["Amazon","common"], ["Microsoft","common"]],
    "word-dictionary":        [["Microsoft","hot"], ["Bloomberg","common"]],
    "word-search-ii":         [["Amazon","hot"], ["Microsoft","common"], ["Meta","common"]],
    "autocomplete":           [["Amazon","hot"], ["Google","hot"]],

    // ---- Bit ----
    "single-number-xor":      [["Amazon","common"]],
    "counting-bits":          [["Apple","common"]],
    "power-of-two":           [["Amazon","common"]],
    "bitmask-tsp":            [["Google","common"]],

    // ---- Sorting (foundational — rarely the literal interview question) ----
    "bubble-sort":            [],
    "insertion-sort":         [["Microsoft","common"]],
    "selection-sort":         [],
    "merge-sort":             [["Amazon","common"], ["Google","common"]],
    "quick-sort":             [["Microsoft","hot"], ["Amazon","hot"]],
    "heap-sort":              [["Adobe","common"]],
    "counting-sort":          [],
    "radix-sort":             [["Google","common"]],

    // ---- Linked list ----
    "reverse-linked-list":    [["Microsoft","hot"], ["Adobe","common"]],
    "floyd-cycle":            [["Amazon","hot"], ["Microsoft","common"]],
    "merge-two-sorted-ll":    [["Amazon","common"], ["Microsoft","common"]],
    "remove-nth-end":         [["Microsoft","common"], ["Bloomberg","common"]],
    "lru-cache":              [["Amazon","hot"], ["Meta","hot"], ["Uber","hot"], ["Flipkart","hot"], ["Bloomberg","common"]],

    // ---- Monotonic stack ----
    "valid-parens":           [["Amazon","hot"], ["Bloomberg","hot"], ["Microsoft","common"]],
    "next-greater":           [["Bloomberg","hot"], ["Amazon","common"]],
    "daily-temperatures":     [["Amazon","hot"]],
    "largest-rectangle":      [["Amazon","hot"], ["Google","hot"], ["Bloomberg","common"]],
  };

  // The ones below would also be valid keys but don't need their own viz tags
  // (alias common-substring searches handled above)

  // ---------- renderer --------------------------------------------------
  function chip(co, tier) {
    const isHot = tier === "hot";
    const el = document.createElement("span");
    el.className = "dsa-co" + (isHot ? " dsa-co--hot" : "");
    el.innerHTML = (isHot ? "🔥 " : "") + co;
    return el;
  }

  function buildRow(key) {
    const list = COMPANIES[key];
    if (!list || !list.length) return null;
    const wrap = document.createElement("div");
    wrap.className = "dsa-companies";
    wrap.title = "Companies that ask this problem disproportionately often (🔥 = signature question for them). Synthesized from public LeetCode tags, Glassdoor and candidate write-ups — directional, not authoritative.";
    const label = document.createElement("span");
    label.className = "dsa-companies__label";
    label.textContent = "Asked by";
    wrap.appendChild(label);
    list.forEach(([co, tier]) => wrap.appendChild(chip(co, tier)));
    return wrap;
  }

  // Find the best place near the top of the article to inject the chip row.
  // Preference order: right after the first blockquote (the "Pattern • Position M/N" subtitle),
  //                   else right after the first <h1>.
  function findInsertAfter(article) {
    const blockquote = article.querySelector(":scope > blockquote");
    if (blockquote) return blockquote;
    const h1 = article.querySelector(":scope > h1");
    if (h1) return h1;
    return null;
  }

  function mountAll() {
    // Find an algo key from any viz on the page (one page = one algo).
    const viz = document.querySelector(".dsa-viz[data-algo]");
    if (!viz) return;
    const key = viz.dataset.algo;

    // Find the article container the chip row should be inserted into.
    const article = document.querySelector("article.md-content__inner") ||
                    document.querySelector(".md-content__inner") ||
                    document.querySelector("article") ||
                    viz.closest("article") || viz.parentNode;
    if (!article) return;

    // Avoid double-inserting on instant-navigation re-runs.
    if (article.querySelector(":scope > .dsa-companies")) return;

    const row = buildRow(key);
    if (!row) return;

    const anchor = findInsertAfter(article);
    if (anchor && anchor.parentNode === article) {
      anchor.insertAdjacentElement("afterend", row);
    } else {
      article.insertBefore(row, article.firstChild);
    }
  }

  function boot() { mountAll(); }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
  if (window.document$) {
    window.document$.subscribe(() => {
      // re-mount on navigation
      document.querySelectorAll(".dsa-companies").forEach(el => el.remove());
      boot();
    });
  }
})();
