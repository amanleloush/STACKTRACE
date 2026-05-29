# Meta

> Experiences • Position 3/13

## At a glance

<div class="company-meta">
  <span><strong>Loop size</strong> Phone screen + 4-5 onsites</span>
  <span><strong>Total time</strong> ~5-6 hours of interview</span>
  <span><strong>Style</strong> Fast-paced, algorithm-heavy, sharp SD bar</span>
  <span><strong>Difficulty</strong> Hard; speed matters more here than at most peers</span>
</div>

## The loop

A typical Meta loop in recent cycles. Variants exist for E4 / E5 / E6 and for Product vs Infra orgs.

- **Recruiter screen (~30 min)** — Logistics, level, motivation.
- **Phone screen (45 min)** — One or two coding problems (usually two mediums, sometimes one hard). Speed is the differentiator — they expect both to be solved cleanly.
- **Coding round 1 — "Ninja" (45 min)** — Two medium problems back to back. Yes, in 45 minutes. Optimal solution + clean code expected. This round is famously fast.
- **Coding round 2 — "Ninja" (45 min)** — Same format. Often graphs / DP / trees / arrays.
- **System Design (45-60 min)** — E5+ only. Sharp bar. They want capacity math, data model, sharding strategy, and explicit failure analysis. Less hand-waving tolerated than at most peers.
- **Behavioral / "Jedi" (45 min)** — Conflict, leadership, scope, ambiguity. Less rigidly STAR than Amazon, but still structured.
- **Product Architecture (E6+, optional)** — Open-ended, more about how you'd evolve a Meta-like product. Sometimes folded into the SD round.

## What's different here

- **Speed is the signal.** Meta interviews are infamous for "two mediums in 45 minutes." If you can't solve a medium in 18-20 minutes, you'll feel it.
- **DP and graphs are favored.** More so than at any other big-tech peer. Reported loops over-index on these vs arrays / hashmaps.
- **System Design is harder at E5 than at most peers.** Less "draw the boxes," more "show me the failure modes, the consistency tradeoffs, and the math."
- **Less behavioral weight at junior levels.** E4 candidates report behavioral being mostly fit-check; E5+ candidates report it being a real gate.
- **No language preference, but speed in your language matters.** Most reported loops use Python or C++.

## Common question themes

- **Graphs** — BFS/DFS variants, shortest path, connected components, topological sort.
- **Dynamic programming** — 1D, 2D, DP on grids, DP with state compression. Often the optimal solution is required, not just any solution.
- **Trees** — Binary tree problems, LCA, serialize/deserialize, path sums.
- **Hashmaps + intervals** — Range problems, frequency-based problems.
- **System design for social / feed / messaging** — News feed, messaging, notifications, ads infrastructure.

## Sample questions

(Generic forms — not actual interview questions.)

- BFS on a grid with constraints (e.g., minimum moves with obstacles or portals).
- DP problems: longest valid sequence with constraints, edit distance, partition variants.
- Tree problems: LCA, vertical order traversal, diameter with constraints.
- Two-sum / k-sum variants under tight time pressure.
- Design a news feed at scale (push vs pull, fan-out, ranking pipeline).
- Design a messenger-like system (1:1 messaging, presence, delivery guarantees).
- Design an ad-serving system (targeting, budget tracking, eventual consistency).
- "Tell me about a project you led end-to-end." / "Tell me about a time you had to make a tough technical tradeoff."

## How to prep

- **Drill speed, not just correctness.** Practice solving mediums in 18-20 min. The two-problems-in-45 format is the bar.
- **Get DP comfortable.** If DP is your weak spot, fix it before applying. It will come up. Cover 1D, 2D, knapsack-family, DP-on-trees, state compression.
- **For E5+, do at least 8-10 mock HLDs.** Include news feed, messaging, and ranking pipelines specifically. Bring capacity math by default.
- **Practice "explain the optimal" out loud.** Even if you can solve, you'll lose points if you can't articulate why your solution is optimal.
- **Behavioral prep is lighter than Amazon but still mandatory.** 6-8 STAR stories with a focus on scope and leadership.

## Recent vibe (2024-2026)

After the 2022-2023 Meta layoffs ("Year of Efficiency"), hiring resumed but with a notably sharper bar — multiple reports describe the post-2024 loop as harder than pre-pandemic. AI infra and Reality Labs have hired aggressively; Family of Apps is more cautious. Down-levelling appears more common than before. The speed expectation in coding rounds has not softened.
