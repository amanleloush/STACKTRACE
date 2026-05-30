// Single source of truth for the DSA phase metadata. Consumed by
// /dsa/index.astro (topic grid) and /dsa/[phase].astro (phase landing).
// The `slug` matches entry.data.phase in the dsa content collection.
//
// Prose fields (whenToUse / shapeOfSolution / commonVariations / extras)
// are faithfully copied from doc/docs/11-dsa/<slug>/index.md (the archived
// Brain Detox Arc source).
// They may contain light inline markdown (`**bold**`, `` `code` ``) which
// the [phase].astro page converts to <strong>/<code> at render time.

export interface DsaPhase {
  slug: string;
  num: string;
  title: string;
  blurb: string;
  whenToUse?: string[];
  shapeOfSolution?: string;
  commonVariations?: string[];
  extras?: string;
}

export const PHASES: DsaPhase[] = [
  {
    slug: '00-foundations',
    num: '00',
    title: 'Foundations',
    blurb: "Big-O, recursion, the pattern map — read this first if you're rusty.",
  },
  {
    slug: '01-two-pointers',
    num: '01',
    title: 'Two Pointers',
    blurb: 'Pairs of indices walking the array — converge from ends, slow/fast, partition.',
    whenToUse: [
      'The input is a **sorted array** and the question asks about a **pair / triplet** with some sum or difference property.',
      'The problem says **"in place"** — remove an element, compact zeros, dedupe — and bans extra memory.',
      "You're checking a **palindrome** or any symmetric property where the ends matter.",
      'Two **walls / heights** define an area, volume, or capacity (`container with most water`, `trapping rain water`).',
      'A **slow/fast** split is needed to partition the array (move zeros, sort colors, Dutch flag).',
    ],
    shapeOfSolution:
      "Maintain two indices — most often `l` at the left and `r` at the right, or `slow` and `fast` both starting at 0. On each step, look at the elements they point to and **make one decision**: which pointer advances, and what (if anything) gets written. The invariant is that everything outside `[l, r]` (or before `slow`) has already been resolved correctly, so when the pointers meet or cross you're done. The trick is choosing the comparison: `arr[l] + arr[r]` vs `target`, `height[l]` vs `height[r]`, `arr[fast]` vs `arr[slow]`. Get the comparison right and the rest is mechanical.",
    commonVariations: [
      '**Same direction (slow/fast)** vs **opposite directions (l/r).** Slow/fast partitions in place; opposite-end converges on a sum or area.',
      '**Need to sort first.** 3Sum, 4Sum, K-diff pairs — sorting is the enabling step; budget it into your complexity.',
      '**Skip duplicates.** When the array can contain repeats and the question asks for *unique* tuples, advance the pointer past equal neighbours after each match.',
      '**Circular array.** Concatenate the array with itself and run a windowed two-pointer over `2n`.',
      '**Linked list flavour.** Slow/fast on a list gives you cycle detection (Floyd) and middle-of-list — the same pattern, different cursor type.',
    ],
  },
  {
    slug: '02-sliding-window',
    num: '02',
    title: 'Sliding Window',
    blurb: 'Maintain a window [l, r] over a sequence; expand right, shrink left.',
    whenToUse: [
      'The problem asks for the **longest / shortest contiguous** subarray or substring satisfying some property.',
      'A **fixed-size window** of length `k` slides across the array (max sum / max average / specific counts).',
      'You see phrasing like **"at most K of something"**, **"at most K distinct"**, or **"exactly K"** — the latter reduces to "at most K minus at most K - 1".',
      'The problem involves **anagrams / permutations** of a target inside a string.',
      'Brute force is "for every pair `(l, r)`" — that\'s O(n²) and is almost always replaceable by a window.',
    ],
    shapeOfSolution:
      'Keep two indices `l` and `r` and a small piece of *window state* — a counter, a sum, a hash map of character frequencies. Expand: move `r` right, ingest `s[r]`. While the window violates the invariant, shrink: evict `s[l]`, move `l` right. Record the answer when the window is valid. Each index enters and leaves the window at most once, so the whole sweep is O(n) regardless of how nested the inner while looks. The art is choosing the right window state and the right "is this window valid?" check.',
    commonVariations: [
      '**Fixed vs variable size.** Fixed: enforce window length `== k` every step. Variable: the window grows and shrinks based on a predicate.',
      '**"At most K" vs "exactly K".** Compute "at most K" and "at most K - 1"; subtract. A classic trick used in subarrays-with-K-distinct-integers.',
      "**String windows with frequency maps.** Track a `matched` counter that increments only when a character's count *hits* the required count, decrements only when it *falls past*. Saves a costly dict comparison every step.",
      "**Window over a stream.** When n doesn't fit in memory, use a deque for the window contents.",
      '**Two-pointer vs sliding-window distinction.** Both walk indices, but a window keeps *state about everything inside* `[l, r]`; pure two-pointer only cares about the endpoints.',
    ],
  },
  {
    slug: '03-binary-search',
    num: '03',
    title: 'Binary Search',
    blurb: 'Halve the search space — over indices, over answers, over rotated arrays.',
    whenToUse: [
      'The input is **sorted** (or you can sort it cheaply), or has a **monotonic property** along some axis.',
      'The problem asks "find / check if there exists an element" in O(log n) instead of O(n).',
      'You see phrasing like **"minimum X such that ..."** or **"maximum X such that ..."** — that\'s binary search on the answer.',
      'The array is sorted but **rotated** — search still collapses to O(log n) with a twist.',
      "You're hunting a **boundary** (first/last occurrence, leftmost true in a `FFFTTT` predicate).",
    ],
    shapeOfSolution:
      "Maintain two pointers `lo` and `hi` that bracket the candidate range. Each iteration computes `mid = (lo + hi) // 2`, evaluates a **predicate** at `mid`, and discards half the range. The predicate is what changes between variants — for classic search it's `arr[mid] == target`; for \"search on answer\" it's `feasible(mid)`. The invariant is that the answer always lives in `[lo, hi]`. Pick your loop condition (`lo < hi` vs `lo <= hi`) and your halving (`hi = mid` vs `hi = mid - 1`) deliberately — off-by-one is the single biggest source of bugs in this family.",
    commonVariations: [
      '**Inclusive vs exclusive bounds.** `lo <= hi` with `mid - 1 / mid + 1` updates is the safest default; `lo < hi` with `hi = mid` is cleaner for boundary searches but trickier.',
      '**Overflow on `mid`.** In languages with fixed-width ints, use `mid = lo + (hi - lo) // 2` to avoid `lo + hi` overflow. Python is immune but the habit is good.',
      "**Predicate shape `FFFTTT`.** When searching for a boundary, mentally label each index as F or T — you're hunting the first T (or last F).",
      '**Duplicates flip the math.** With duplicates, you may need to advance `lo` past equal elements (e.g. rotated array II) which degrades the worst case to O(n).',
      '**Floating-point search.** Loop until `hi - lo < ε`, not until they meet exactly.',
    ],
  },
  {
    slug: '04-bfs',
    num: '04',
    title: 'BFS',
    blurb: 'Layered exploration — shortest path in unweighted graphs and grids.',
    whenToUse: [
      'The problem asks for **shortest path / fewest steps** between two nodes in an **unweighted** graph.',
      'You need to process nodes **level by level** — e.g. tree-by-depth, all cells at distance `k`.',
      'The state space is a graph or grid maze, and you can model moves as edges.',
      'You have multiple sources expanding simultaneously (rotting oranges, walls-and-gates).',
      'The "edges" are abstract — string transformations (Word Ladder), lock combinations, sliding puzzles.',
    ],
    shapeOfSolution:
      "Push the start node(s) into a queue, mark them visited, then repeatedly pop and expand neighbours. Each level of the queue corresponds to one extra step of distance from the source(s). The visited set (or distance map) prevents re-expanding nodes and guarantees O(V + E) total work. The key invariant: **the first time BFS reaches a node, it does so via a shortest path** — that's why BFS beats DFS for unweighted shortest path. For grids, neighbours are the 4 (or 8) adjacent cells; for graphs, they're adjacency-list entries; for abstract puzzles, they're whatever moves the problem defines.",
    commonVariations: [
      '**Bidirectional BFS** — expand from source and target simultaneously, stop when they meet. Cuts search space from `b^d` to `2·b^(d/2)`.',
      '**0-1 BFS** — for graphs with edge weights 0 and 1, use a deque (push-front for 0, push-back for 1) instead of a heap. O(V + E).',
      '**Multi-source seed** — instead of running BFS from each source independently, seed them all into the queue at distance 0.',
      '**Track parents** — to reconstruct the shortest path itself, store `parent[node]` and walk back from the target.',
      '**Distance vs visited** — use a distance map when you need the actual distance; a visited set when you only need reachability.',
    ],
  },
  {
    slug: '05-dfs',
    num: '05',
    title: 'DFS',
    blurb: 'Go deep first — flood fill, cycle detection, tree traversals.',
    whenToUse: [
      'You need to **explore every node of a connected region** (islands, flood fill, enclaves).',
      'You want **any path** from A to B, not the shortest one (BFS owns shortest-in-unweighted).',
      "You're working on a **tree** — preorder, inorder, postorder, path sums, diameter.",
      'You need to **detect a cycle** in a directed or undirected graph.',
      "The recursion depth fits the stack (or you've rewritten it iteratively for huge inputs).",
    ],
    shapeOfSolution:
      "DFS is a single recursive function — `dfs(node)` — that marks the node visited, then calls itself on each unvisited neighbour. The recursion stack *is* the path you're currently exploring; when the function returns, you've finished one branch and the caller continues with the next. For graphs you carry a `visited` set; for trees you don't need one because there are no back-edges. The two superpowers are **returning a value from below** (subtree sum, height, path-existence) and **mutating state on the way down and undoing it on the way up** (backtracking, three-color cycle detection).",
    commonVariations: [
      'Iterative DFS with an explicit stack mirrors the recursive version one-to-one and avoids stack overflow on deep graphs. For undirected graphs cycle detection only needs a `visited` set plus the parent pointer; for directed graphs you need the **three-color** trick (white = unseen, gray = on current path, black = finished) because revisiting a black node is fine but hitting a gray one is a back-edge. Tree problems often blend DFS with **postorder accumulation** — compute children first, then combine — which is how diameter, balanced-check, and max-path-sum all work in one pass.',
    ],
  },
  {
    slug: '06-backtracking',
    num: '06',
    title: 'Backtracking',
    blurb: 'Try, recurse, undo — subsets, permutations, N-queens, word search.',
    whenToUse: [
      'The problem says **"generate all ..."**, **"find all ..."**, or **"count all ..."** valid configurations.',
      'You need every **path, combination, or permutation** — not just one optimal answer.',
      'The input is small (typically `n ≤ 20`) and the search space is exponential but heavily prunable.',
      'You can describe the state as a **partial solution** that can be extended one decision at a time.',
      'A natural pruning rule exists (constraint, used-set, monotonicity) that lets you abandon subtrees early.',
    ],
    shapeOfSolution:
      'Backtracking is DFS on a **decision tree**. At each node you make a choice, recurse, then **undo the choice** before trying the next. The choice you just made is the difference between this branch and its sibling — undoing it is what lets you reuse the same `path` buffer across the whole search instead of allocating fresh state per leaf. The skeleton is always: *base case → capture solution → loop over candidates → choose → recurse → un-choose*. Pruning is what separates a 2-second solution from a 2-hour timeout — sort, dedupe, and add constraint checks **before** the recursive call.',
    commonVariations: [
      "**Subsets / combinations** use a monotone `start` index to avoid duplicate orderings. **Permutations** use a `used[]` array (or pick-from-remaining) because order matters. **Sorted-input + skip-duplicates** (`if i > start and nums[i] == nums[i-1]: continue`) is the dedupe trick that turns `Subsets II` and `Permutations II` from broken to correct. **Constraint propagation** (columns/diagonals for N-Queens, character counts for word puzzles) is how interview-quality solutions hit the time limit. When the problem only asks for **one** valid configuration, return `True` up the stack the moment you find it — no need to enumerate the rest.",
    ],
  },
  {
    slug: '07-heap',
    num: '07',
    title: 'Heap / Priority Queue',
    blurb: 'Top-K, median of stream, K closest, scheduling — anywhere you need fast min/max.',
    whenToUse: [
      'The problem mentions **"top K"**, **"K largest"**, **"K smallest"**, or **"K closest"**.',
      'You need the **median** of a running stream or the smallest/largest element repeatedly.',
      "You're **merging K sorted sequences** and want the next item in O(log K).",
      "You're **scheduling** jobs by priority, cooldown, or cost (Dijkstra, task scheduler, IPO).",
      'You need **frequency-based** answers ("top K frequent") and a sort would be overkill.',
    ],
    shapeOfSolution:
      "A heap is a binary tree stored as an array where each parent is ≤ (min-heap) or ≥ (max-heap) its children. Python's `heapq` is a min-heap; negate values for max-heap behavior. The two operations you care about are `push` and `pop`, both O(log n). Building a heap from a list is O(n) via `heapify`. The common trick for top-K is to keep a heap of size K and evict the worst — that gives O(n log K) instead of O(n log n) for a full sort.\n\nWhen you see \"running\" or \"stream\" or \"as elements arrive,\" reach for a heap. When you see \"K of something,\" reach for a size-K heap.",
    commonVariations: [
      "**Lazy deletion** — when you can't remove an arbitrary heap entry, mark it stale and skip it on pop.",
      '**Indexed heap / heap + hash** — supports `decrease-key` in O(log n) (Dijkstra with updates).',
      '**Two-heap pattern** — median, sliding-window median, IPO-style "pick best feasible."',
      '**Fixed-size heap** — for top-K, the heap size is bounded by K, not n.',
    ],
  },
  {
    slug: '08-graphs',
    num: '08',
    title: 'Graph Algorithms',
    blurb: 'Dijkstra, Bellman-Ford, MST, Union-Find, topological sort, SCC.',
    whenToUse: [
      '**Shortest paths** between nodes with non-negative weights → Dijkstra; with negatives → Bellman-Ford; all-pairs → Floyd-Warshall.',
      '**Minimum spanning tree** for "connect everything cheapest" → Kruskal or Prim.',
      '**Dependencies / ordering** ("course schedule", "alien dictionary") → topological sort.',
      '**Connectivity / grouping** ("number of provinces", "redundant connection") → Union-Find.',
      '**Strongly connected components** in a directed graph ("critical connections") → Tarjan.',
    ],
    shapeOfSolution:
      "Graph problems factor into two questions: *what representation?* (adjacency list almost always) and *what traversal?* (BFS for unweighted shortest paths, DFS for connectivity / topo, priority queue for weighted). The algorithms in this section are specialized traversals — Dijkstra is BFS with a priority queue, Kahn's topo is BFS over an in-degree map, Union-Find is \"implicit\" graph traversal via merging, and Tarjan is DFS with low-link bookkeeping.\n\nPick the algorithm by reading the problem's *operation* (shortest, connect, order, partition) and the *edge weight constraints* (none, non-negative, possibly negative, all-pairs).",
    commonVariations: [
      '**Multi-source** — seed Dijkstra/BFS with multiple starts; distance 0 for each.',
      '**K-shortest paths** — relax the "visited" invariant; allow up to K relaxations per node.',
      '**0-1 BFS** — deque + push to front for 0-weight edges, back for 1-weight; replaces Dijkstra at O(V+E).',
      '**A\\*** — Dijkstra + admissible heuristic; same code, different key.',
      '**Bidirectional search** — meet in the middle; halves the explored frontier on average.',
    ],
  },
  {
    slug: '09-dp',
    num: '09',
    title: 'Dynamic Programming',
    blurb: 'Tabulation vs memoization — Fibonacci, knapsack, LIS, LCS, edit distance.',
    whenToUse: [
      'The problem asks for **min / max / longest / shortest** over a sequence of choices.',
      'The problem asks to **count the number of ways** to reach a target, partition a set, or arrange items.',
      'A **yes/no** feasibility question that has *optimal substructure* — the answer for size n is composed from answers for smaller sizes.',
      'A naive recursion **revisits the same subproblem** many times (overlapping subproblems).',
      'Greedy fails — local optima do not yield the global optimum, but the search space is still polynomial after deduplication.',
    ],
    shapeOfSolution:
      'Every DP follows the same four moves. **First**, identify the state — the minimal tuple of variables that fully describes a subproblem (e.g. `(i, capacity)` for knapsack, `(i, j)` for two-string DPs). **Second**, write the recurrence — express `dp[state]` in terms of strictly smaller states; this is where the *decision* at each step lives (take / skip, match / replace, jump 1 / jump 2). **Third**, pin down the base case — the smallest state whose answer is trivial (empty string, zero amount, single element). **Fourth**, choose direction: *top-down* memoization mirrors the recurrence and is easy to reason about; *bottom-up* tabulation fills a table in dependency order and is usually faster with less stack risk. Finally, if `dp[i]` only depends on a constant window of previous rows, **roll the table** down to O(1) or O(n) extra space.',
    extras:
      '## DP problem-recognition cheat sheet\n\n- **1D DP** when state is a single index — Fibonacci, House Robber, Climbing Stairs, Coin Change, LIS, Word Break.\n- **2D DP** when state involves two pointers or two dimensions — LCS, Edit Distance, knapsack `(i, capacity)`, palindrome interval `dp[i][j]`.\n- **Knapsack family** — outer loop choice matters. *0/1*: items outer, capacity inner descending (so each item is used once). *Unbounded*: items outer, capacity inner ascending (reuse allowed). *Combination Sum IV (permutation count)*: capacity outer, items inner.\n- **LIS pattern** — when the recurrence is `dp[i] = max(dp[j]+1)` over `j < i` with a predicate; if the predicate is "strictly less", patience sorting gives O(n log n).\n- **Counting vs optimizing** — counting uses `+=` over transitions; optimizing uses `min`/`max`. Watch the initial value: 0 for sums, ∞ for min, -∞ for max.\n- **Bitmask DP** when `n ≤ 20` and the state is "which subset have I used" — `dp[mask]` with `2^n` states.\n- **Interval DP** — `dp[i][j]` depends on a split `k` between `i` and `j`; iterate by increasing length (matrix chain, palindrome partitioning, burst balloons).\n- **Space optimization** — if `dp[i]` only uses `dp[i-1]` (and maybe `dp[i-2]`), reduce 1D to two scalars; if a 2D table only uses the previous row, reduce to a 1D rolling array.',
  },
  {
    slug: '10-greedy',
    num: '10',
    title: 'Greedy',
    blurb: 'Local choice → global optimum when an exchange argument holds.',
    whenToUse: [
      'The problem asks for a "minimum/maximum X with constraints" and a sort order makes the right choice obvious.',
      'Interval problems: pick the one that ends first, the one that starts latest, the one that covers the most.',
      'Jump-style problems where you track the farthest you can reach and ratchet a frontier forward.',
      'Scheduling, partitioning, and packing where you can prove "swapping in the greedy choice never makes the answer worse."',
      'Huffman-like constructions where repeatedly taking the two smallest elements rebuilds an optimal tree.',
    ],
    shapeOfSolution:
      'Sort the input by the right key — earliest finish time, smallest weight, longest reach — and sweep once. Maintain a tiny piece of state (a running frontier, a current end, a heap of pending items) and commit to the greedy choice without looking back. The hard work isn\'t the loop; it\'s the **exchange argument** that says "for any optimal solution that disagrees with my choice, I can swap in my choice and not get worse." When that argument doesn\'t hold (e.g., coin change with arbitrary denominations), greedy silently lies — fall back to DP.',
    commonVariations: [
      '"Pick the interval that ends earliest" solves activity selection, arrow shots, and non-overlap counts — they\'re the same problem with different objectives. Jump-style problems (Jump Game I/II, Video Stitching, Tap Watering) all reduce to "what\'s the farthest I can reach from anywhere in the current frontier?" Huffman generalizes to any "merge two smallest" cost-minimization (connect sticks, halve array sum). When a greedy proof fails, it usually fails because the input has a hidden dependency that DP would catch — e.g., gas station works greedy because the total-fuel test guarantees a solution exists.',
    ],
  },
  {
    slug: '11-trie',
    num: '11',
    title: 'Trie',
    blurb: 'Prefix trees for autocomplete, word dictionaries, multi-pattern search.',
    whenToUse: [
      'Many strings share prefixes and you want one structure that indexes them all.',
      'Queries are by **prefix** rather than exact match — autocomplete, "starts with X", suggestion lists.',
      'You have a dictionary of words and a grid/stream to scan for **all** matches simultaneously (otherwise it\'s N × M substring checks).',
      'You need wildcard matching (`.`) over a fixed alphabet — branch the search at the wildcard step.',
      'XOR-maximization problems on integers — a binary trie of bits is the secret weapon.',
    ],
    shapeOfSolution:
      'Every node holds an array (or hashmap) of children, indexed by character, plus a flag for "a word ends here." Insertion walks the string and creates nodes on demand; search walks and asks "does the path exist?"; `startsWith` is the same as search but doesn\'t require the end flag. Once you have this skeleton, every variant — wildcards, weighted suggestions, grid DFS — just adds a small piece of per-node state (a count, a top-K cache, the word string) without changing the traversal.',
    commonVariations: [
      '**Binary tries** (32-level trees over bit positions) solve "max XOR pair" in O(n · 32). **Suffix tries / suffix arrays** generalize to substring queries. For huge alphabets, swap fixed-size arrays for hash maps. When the dictionary is static, you can compress single-child chains into a "radix tree" for less memory, but the textbook trie is almost always fast enough. The Aho-Corasick automaton is "trie + failure links" — the next step up for multi-pattern matching at scale.',
    ],
  },
  {
    slug: '12-bit-manipulation',
    num: '12',
    title: 'Bit Manipulation',
    blurb: 'XOR tricks, popcount DP, bitmask DP for exponential state compression.',
    whenToUse: [
      'The phrase "appears once, all others appear twice" almost always wants XOR.',
      '"Power of two / four / single bit set" reduces to one line with `n & (n-1)`.',
      'Subset enumeration with `n ≤ 20` — an `int` is your subset, bit `i` means element `i` is in.',
      'Counting bits across a range — recursive DP `f(x) = f(x >> 1) + (x & 1)`.',
      'TSP-style problems on small graphs — state = `(visited_mask, last_node)`.',
    ],
    shapeOfSolution:
      'Every problem in this section pivots on one of four primitives. **XOR** ( `a ^ a = 0`, `a ^ 0 = a`, commutative ) for "cancel duplicates." **`n & (n-1)`** to clear the lowest set bit — counts bits in O(popcount) and detects powers of two. **`n & -n`** to isolate the lowest set bit (the "Brian Kernighan trick"). **Iterating subsets** of a mask with `sub = (sub - 1) & mask` — used in submask DP. Once you recognize which primitive applies, the code is usually shorter than its proof.',
    commonVariations: [
      'For "single number among triples" (LC 137), simulate a 3-state counter per bit with two ints and bit ops. For "two singles among pairs" (LC 260), XOR the whole array → result is `a^b`; pick any set bit of that, partition by that bit, XOR each half. Bitmask DP scales as O(2^n · n²) for TSP and O(3^n) for "iterate all submasks of all masks" — the second sum is famous: `Σ C(n,k) · 2^k = 3^n`. For huge `n`, switch to meet-in-the-middle (split into two halves of 2^(n/2) each).',
    ],
  },
  {
    slug: '13-sorting',
    num: '13',
    title: 'Sorting',
    blurb: 'Bubble, insertion, selection, merge, quick, heap, counting, radix.',
    whenToUse: [
      'Output needs to be ordered — by a key, by frequency, by custom comparator.',
      'A faster downstream algorithm requires sorted input (binary search, two pointers, sweep line).',
      'You need a stable order that preserves the relative position of equal keys.',
      'Input keys are small integers or fixed-width strings — non-comparison sorts win.',
      'The data is mostly sorted already — insertion sort is linear; quicksort degrades.',
    ],
    shapeOfSolution:
      'Every comparison sort is bounded by Ω(n log n) — you cannot beat it without exploiting structure in the keys. Within that bound the trade-offs are about *stability*, *in-place behavior*, *cache locality*, and *worst-case vs average*. Merge sort guarantees O(n log n) but allocates; quicksort is faster in practice but quadratic on adversarial input; heap sort is in-place O(n log n) but cache-hostile. When keys are integers in a bounded range, counting and radix sort drop to O(n + k) — linear time, at the cost of O(n + k) auxiliary memory. Pick by reading the constraints: range of values, stability requirement, memory budget.',
    extras:
      '## Comparison table\n\n| Algorithm | Time avg | Time worst | Space | Stable | In-place |\n| --- | --- | --- | --- | --- | --- |\n| Bubble | O(n²) | O(n²) | O(1) | yes | yes |\n| Insertion | O(n²) | O(n²) | O(1) | yes | yes |\n| Selection | O(n²) | O(n²) | O(1) | no | yes |\n| Merge | O(n log n) | O(n log n) | O(n) | yes | no |\n| Quick | O(n log n) | O(n²) | O(log n) stack | no | yes |\n| Heap | O(n log n) | O(n log n) | O(1) | no | yes |\n| Counting | O(n + k) | O(n + k) | O(n + k) | yes | no |\n| Radix | O(d·(n + k)) | O(d·(n + k)) | O(n + k) | yes | no |',
    commonVariations: [
      "**Hybrid sorts** — Timsort (Python, Java) and Introsort (C++ STL) blend insertion / merge / quick / heap to win on real-world data. **Partial sorts** — `nth_element` (quickselect) returns the k-th order statistic in O(n) average. **External sorts** — when data doesn't fit in memory, merge sort streams runs from disk. **Custom comparators** — most languages let you sort by key (Python `key=`, Java `Comparator`), which is how \"sort by frequency then lexicographic\" problems are usually solved.",
    ],
  },
  {
    slug: '14-linked-list',
    num: '14',
    title: 'Linked List',
    blurb: 'Reverse, cycle, merge, LRU cache — pointer surgery patterns.',
    whenToUse: [
      'The problem statement literally hands you a `ListNode head` — most LC linked-list tags.',
      'You need to detect a cycle, find its entry, or measure list length without extra memory.',
      'Two lists must be merged or intersected without converting to arrays.',
      'You need O(1) insert/delete given a node reference (LRU/LFU caches).',
      'A position is described relative to the end ("Nth from end", "middle") — two-pointer or fast/slow wins.',
    ],
    shapeOfSolution:
      "Almost every linked-list problem is one of three pointer tricks. **Dummy head** — allocate a placeholder before the real head so you don't special-case the first node. **Fast/slow pointers** — fast moves two steps for every one of slow; they detect cycles, find the middle, and locate the N-th-from-end node in one pass. **Three-pointer reverse** — `prev`, `cur`, `next` walk the list flipping arrows. Combined with a hash map (node → DLL node) you get the constant-time LRU cache. The discipline is to draw the arrows on paper before you write code — pointer bugs are silent and brutal.",
    commonVariations: [
      "**Doubly-linked lists** add `prev` pointers — a few problems (LRU, design problems) genuinely need them. **Circular lists** show up in Josephus and round-robin schedulers. **Random pointers** (LC 138) test deep-copy with mapping tables. **Skip lists** appear in some design problems but aren't typical interview fare. The same pointer-surgery skills generalize to trees — many tree problems are easier once you think of them as linked lists with two children.",
    ],
  },
  {
    slug: '15-stack-monotonic',
    num: '15',
    title: 'Monotonic Stack',
    blurb: 'Next greater element, daily temperatures, largest rectangle.',
    whenToUse: [
      'Problem mentions "next greater / previous smaller / nearest taller" — verbatim trigger.',
      'You need histogram-style answers: largest rectangle, maximal trapping, span.',
      'Brackets / expression matching / score-of-parentheses — a vanilla stack pattern.',
      'A scan needs to remember a *sorted* subset of indices seen so far.',
      'You\'re doing O(n²) range comparisons that boil down to "for each i, find the closest j with property P".',
    ],
    shapeOfSolution:
      'Sweep the array once with an auxiliary stack of **indices** (not values — you usually need the position). Maintain a monotone order: e.g., values **strictly decreasing** from bottom to top for "next greater". Before pushing the current index, **pop** every stacked index whose value violates the order — those popped indices have their answer right now (the current index is their next-greater). Amortized analysis: every index is pushed and popped at most once, so total work across the loop is O(n) even though the inner pop loop can spike. Brackets are a degenerate special case: push openers, pop on matching closers.',
    commonVariations: [
      '**Two passes** — left-to-right for "previous smaller", right-to-left for "next smaller". **Circular arrays** (LC 503) — extend the sweep to `2n` iterations. **Monotonic deques** (LC 239 sliding window max) — same monotone discipline, both ends mutable. **Cartesian trees** are built from a monotonic stack and unlock RMQ-flavored problems. The hardest monotonic-stack problems are the ones where the *invariant changes* (e.g., LC 84 → LC 85 maximal rectangle of 0/1 matrix).',
    ],
  },
];
