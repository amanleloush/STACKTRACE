# Google

> Experiences • Position 1/13

## At a glance

<div class="company-meta">
  <span><strong>Loop size</strong> 1 phone screen + 4-5 onsites</span>
  <span><strong>Total time</strong> ~5-6 hours of interview, plus prep</span>
  <span><strong>Style</strong> Structured, rubric-driven, algorithm-first</span>
  <span><strong>Difficulty</strong> Hard, but predictable</span>
</div>

## The loop

A typical Google loop in recent cycles looks roughly like this. Exact mix varies by ladder (L3 vs L5 vs L6) and team.

- **Recruiter screen (~30 min)** — Resume walkthrough, level-fit conversation, logistics. Mostly informational, but they're checking communication and seriousness.
- **Phone screen / tech screen (45 min)** — One coding problem, usually medium-hard on LeetCode terms. Trees, hashmaps, two-pointers, light DP. Done in a shared doc (Google Docs historically; some teams use a coding tool now).
- **Coding round 1 (45 min)** — Algorithms. Often graph / tree / two-pointer / interval. Expect an extension or follow-up after you solve the base case.
- **Coding round 2 (45 min)** — Algorithms, different topic. DP, recursion with memoization, or a careful data-structure design (LRU-style) are common. Code must run / pass test cases mentally.
- **System design round (45-60 min)** — Senior+ only. Open-ended design (e.g., "design a feature like X"). Capacity math + tradeoffs are expected at L5+; L4 can usually skate by with a clean component diagram.
- **Googleyness & Leadership (45 min)** — Behavioral + values. No code. They're checking collaboration, conflict handling, navigating ambiguity. Not a soft round — many candidates report it being the one that flips the packet.

## What's different here

- **Rubric-driven scoring.** Each interviewer fills out a structured rubric (problem solving / coding / communication / Googleyness). Vague "felt good" feedback rarely overrides a low rubric score.
- **Hiring committee, not interviewers, decides.** Your interviewers write notes; a separate committee reads packets and votes. This is why "the interviewer loved me" doesn't always convert.
- **They care about how you got there, not just the answer.** Talking through tradeoffs and edge cases out loud matters as much as the final solution.
- **No specific language preference.** Use what you're fastest in. Python and Java are most common in reported loops.
- **Levelling is rigorous.** It's common to be down-levelled (e.g., applying for L5 but offered L4). The packet drives the level.

## Common question themes

- **Graphs and trees** — BFS / DFS variants, shortest path on a grid, tree traversal with state.
- **Dynamic programming** — Classic 1D/2D DP. Usually a medium DP, not a hard one.
- **Intervals and sweep line** — Merge, overlap, scheduling.
- **String manipulation with structure** — Parsing, sliding window, prefix tries.
- **Light system design even in coding rounds** — Sometimes a coding round extends into "now design how this scales."

## Sample questions

(Generic forms — not actual interview questions.)

- BFS / shortest path on a weighted or unweighted grid with constraints.
- Tree problem with a non-trivial state (e.g., DP-on-tree, LCA variant).
- Implement an LRU cache or LFU cache from scratch.
- Interval merging or scheduling with a twist (max non-overlapping, min rooms).
- DP on a 2D grid with at most K moves / changes / constraints.
- Design something Google-flavored: shared doc collaboration, search autocomplete, basic indexer.
- Googleyness: "Tell me about a time you disagreed with a teammate." / "Walk me through navigating an ambiguous project."

## How to prep

- **LeetCode medium fluency over hard volume.** A confident medium is worth more than a half-finished hard. Aim for ~100 well-understood mediums across the topics above.
- **Think out loud.** Practice narrating your approach before you code, including what you'd do if a constraint changed.
- **Drill graph + DP patterns.** They show up disproportionately. Have BFS/DFS templates muscle-memorized.
- **For senior+, do at least 5 mock HLD rounds.** Capacity math is the #1 missing piece in reported feedback.
- **Prepare 6-8 STAR stories for Googleyness.** Conflict, ambiguity, mentorship, failure, cross-functional work.

## Recent vibe (2024-2026)

After the 2023 freeze and the gradual 2024-2025 reopen, the bar has tightened, especially at L5+. Reported loops have leaned harder on tradeoff reasoning and behavioral signal rather than pure algorithm difficulty. AI/ML-adjacent teams are hiring more aggressively; some product teams are still slow. Levelling has stayed strict — downlevels are common.
