# Amazon

> Experiences • Position 2/13

## At a glance

<div class="company-meta">
  <span><strong>Loop size</strong> OA + 4-5 onsites</span>
  <span><strong>Total time</strong> ~6 hours interview + ~90 min OA</span>
  <span><strong>Style</strong> Leadership Principles + Bar Raiser</span>
  <span><strong>Difficulty</strong> Medium-Hard; behavioral bar is the wildcard</span>
</div>

## The loop

A typical Amazon SDE loop in recent cycles. Variants exist for SDE-I / II / III and for AWS vs Retail orgs.

- **Online Assessment (60-90 min)** — Usually two coding problems plus a work-style survey. Time-pressured. Some loops also include a work simulation / debugging section. SDE-I sees this most often; senior loops often skip it.
- **Phone screen (45-60 min)** — One coding problem (medium) + 1-2 behavioral questions tied to Leadership Principles. The behavioral half is real — don't treat it as small talk.
- **Onsite — Coding round (60 min)** — One DSA problem + behavioral questions woven in. Expect "tell me about a time…" before or after coding.
- **Onsite — LLD / Object Design (60 min)** — For SDE-II+. Design a small system (parking lot, ride matcher, file system). Class diagram, interfaces, key methods. Sometimes pure HLD instead for senior IC tracks.
- **Onsite — System Design (60 min)** — Senior+ only. Open-ended. Heavy on tradeoffs, data flow, scaling, and ownership boundaries.
- **Bar Raiser (60 min)** — A trained interviewer from a different team. Heavy behavioral. They have veto power. The deciding round more often than not.
- **Hiring Manager (45-60 min)** — Fit, motivation, team-specific scenarios, and one or two LP-rooted behavioral questions.

## What's different here

- **Leadership Principles (LPs) are the spine of the loop.** All 16 LPs are fair game. Every behavioral question maps to one. You should know which LP each of your stories signals.
- **STAR format is mandatory, not stylistic.** Situation, Task, Action, Result — in that order, with concrete metrics. Vague answers tank rounds.
- **Bar Raiser can override.** A weak Bar Raiser score, even with strong technicals, often kills the loop.
- **"I" vs "we" matters.** Bar Raisers explicitly probe for what *you* did vs the team. Be ready to defend your specific contribution.
- **Levelling is conservative.** Down-levels are common, especially when LP stories sound too senior-level for your reported scope.

## Common question themes

- **Coding** — Arrays, hashmaps, BFS/DFS, sliding window, intervals. Less DP-heavy than Meta/Google. Slightly more "implement-this-cleanly" than "puzzle-it-out."
- **LLD** — OO modeling: parking lot, elevator, splitwise, ride share, vending machine, file system.
- **HLD** — Service decomposition, queue-based architectures, idempotency, retries. AWS service knowledge helps but isn't required.
- **Behavioral** — Conflict, ownership, delivering under deadlines, customer obsession, ambiguous priorities, mentorship, failure.

## Sample questions

(Generic forms — not actual interview questions.)

- LRU cache, or other "design a data structure" question.
- BFS / shortest path on a grid with obstacles.
- Merge intervals or k sorted lists.
- Sliding window max / longest substring variants.
- Design a parking lot, elevator system, or ride-matcher (LLD).
- Design a notification system, a URL shortener, or a "service like Prime Video recommendations" (HLD).
- "Tell me about a time you disagreed with your manager." (Have Backbone; Disagree and Commit)
- "Tell me about a time you missed a deadline." (Deliver Results; Earn Trust)
- "Tell me about a time you took ownership of something outside your scope." (Ownership; Bias for Action)

## How to prep

- **Write down 12-15 STAR stories, tagged to LPs.** Make sure each one has a metric in the Result. "Saved 30% on cost" or "cut p99 from 800ms to 250ms" beats "made it faster."
- **For the Bar Raiser, drill the harder LPs.** Earn Trust, Have Backbone, Are Right A Lot, and Insist on the Highest Standards are the ones candidates most often fumble.
- **Practice LLD aloud.** Class names, responsibilities, public methods. Don't draw too much; talk through the design.
- **For senior+, do mock HLD with explicit capacity numbers.** They will ask "how many writes per second."
- **Time-box your OA practice.** The OA is more about not getting stuck than solving optimally.

## Recent vibe (2024-2026)

After the 2022-2023 corrections, hiring resumed in 2024-2025 but with stricter levelling and a sharper Bar Raiser bar. Several reported loops mention "STAR rigor" as the dominant differentiator — candidates with similar technical signal split on behavioral storytelling. AWS continues to hire at scale; retail / consumer orgs are more cautious.
