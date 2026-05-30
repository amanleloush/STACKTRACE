// Single source of truth for the DSA phase metadata. Consumed by
// /dsa/index.astro (topic grid) and /dsa/[phase].astro (phase landing).
// The `slug` matches entry.data.phase in the dsa content collection.

export interface DsaPhase {
  slug: string;
  num: string;
  title: string;
  blurb: string;
}

export const PHASES: DsaPhase[] = [
  { slug: '00-foundations', num: '00', title: 'Foundations', blurb: "Big-O, recursion, the pattern map — read this first if you're rusty." },
  { slug: '01-two-pointers', num: '01', title: 'Two Pointers', blurb: 'Pairs of indices walking the array — converge from ends, slow/fast, partition.' },
  { slug: '02-sliding-window', num: '02', title: 'Sliding Window', blurb: 'Maintain a window [l, r] over a sequence; expand right, shrink left.' },
  { slug: '03-binary-search', num: '03', title: 'Binary Search', blurb: 'Halve the search space — over indices, over answers, over rotated arrays.' },
  { slug: '04-bfs', num: '04', title: 'BFS', blurb: 'Layered exploration — shortest path in unweighted graphs and grids.' },
  { slug: '05-dfs', num: '05', title: 'DFS', blurb: 'Go deep first — flood fill, cycle detection, tree traversals.' },
  { slug: '06-backtracking', num: '06', title: 'Backtracking', blurb: 'Try, recurse, undo — subsets, permutations, N-queens, word search.' },
  { slug: '07-heap', num: '07', title: 'Heap / Priority Queue', blurb: 'Top-K, median of stream, K closest, scheduling — anywhere you need fast min/max.' },
  { slug: '08-graphs', num: '08', title: 'Graph Algorithms', blurb: 'Dijkstra, Bellman-Ford, MST, Union-Find, topological sort, SCC.' },
  { slug: '09-dp', num: '09', title: 'Dynamic Programming', blurb: 'Tabulation vs memoization — Fibonacci, knapsack, LIS, LCS, edit distance.' },
  { slug: '10-greedy', num: '10', title: 'Greedy', blurb: 'Local choice → global optimum when an exchange argument holds.' },
  { slug: '11-trie', num: '11', title: 'Trie', blurb: 'Prefix trees for autocomplete, word dictionaries, multi-pattern search.' },
  { slug: '12-bit-manipulation', num: '12', title: 'Bit Manipulation', blurb: 'XOR tricks, popcount DP, bitmask DP for exponential state compression.' },
  { slug: '13-sorting', num: '13', title: 'Sorting', blurb: 'Bubble, insertion, selection, merge, quick, heap, counting, radix.' },
  { slug: '14-linked-list', num: '14', title: 'Linked List', blurb: 'Reverse, cycle, merge, LRU cache — pointer surgery patterns.' },
  { slug: '15-stack-monotonic', num: '15', title: 'Monotonic Stack', blurb: 'Next greater element, daily temperatures, largest rectangle.' },
];
