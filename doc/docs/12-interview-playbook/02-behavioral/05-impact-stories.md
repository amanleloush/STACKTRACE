# 05 — Impact stories

> Behavioral • Position 5/5

## The question family

- "Walk me through your proudest project."
- "Tell me about a time you moved a key metric."
- "Describe something you shipped that mattered."
- "What's the most ambitious thing you've taken on?"

Impact questions test whether you can **frame your work in terms of outcome**, not effort. Senior candidates can speak in metrics; junior candidates often can't, and that distinction is what's being measured.

## The framework

Use **PROBE**:

- **Problem** — the business or customer pain. Numbers if you have them.
- **Role** — what you owned vs. what the team did. Use "I" for your part and "we" for shared work — both intentionally.
- **Options** — what alternatives you considered. (This is what proves judgment, not just execution.)
- **Build** — the action you took. Tight; don't get lost in implementation details unless asked.
- **Effect** — the measurable outcome. Numbers, percentages, $ if available; if not, qualitative outcomes are OK.

The **Options** step is the part many candidates skip. Without it, the interviewer can't tell whether you picked the right thing — only that you executed *something*.

## Story template

> **Problem.** Our checkout flow had a 14% drop-off at the address-entry step on mobile. That was costing us roughly $4M in annual GMV.
>
> **Role.** I tech-led a four-person team across mobile, backend, and ML. I owned the architecture decisions and the rollout plan. PM owned the metric, designers owned the UX.
>
> **Options.** We considered three approaches: (1) full address autocomplete via Google Places, which would cost ~$0.017/lookup at our scale = ~$80K/year, (2) building our own autocomplete from past addresses + open postal data, (3) a no-autocomplete redesign of the form. We modeled the conversion lift at 4% / 3% / 1% respectively against the cost; option (2) had the best return.
>
> **Build.** Built a service that indexed historical user addresses + open Indian postal data into Elasticsearch. The hard part wasn't search — it was deduplication, since the same building name shows up 40 different ways across user input. I built a normalizer + canonical-form index. Mobile team plugged it into the form with debounced calls.
>
> **Effect.** Address-entry drop-off went from 14% to 9.2% — a 4.8 pp lift, which translated to ~$1.3M incremental annual GMV in the first quarter post-launch. The deduplication index also got picked up by the address-verification service later, saving another team three months of work.

## 3 worked stories

### Story A — Direct business metric

You moved revenue, conversion, retention, or cost in a measurable way. State the number, the % delta, and the time to impact. Bonus: mention the metric *didn't* move on a control group.

### Story B — Engineering / system metric

You moved a system metric: P99 latency, error rate, build time, deployment frequency, infra cost. Quantify it. Tie it back to a business or customer outcome if possible ("dropped P99 from 800ms to 220ms; bounce rate on the landing page fell 6%").

### Story C — Scope / organizational impact

You shipped something that unblocked other teams or became a building block. Quantify it differently: "three teams adopted it within the quarter," "saved an estimated 6 engineer-months."

## Anti-patterns

- **No numbers.** "It improved performance a lot" is not a metric. Even rough estimates ("we shaved ~30% off the latency") are better than nothing.
- **All "I", no "we".** Engineering is a team sport. Over-claiming credit signals immaturity.
- **All "we", no "I".** The opposite problem. The interviewer needs to know what *you* specifically contributed.
- **Effort over outcome.** "I worked on this for six months" — they don't care about the time you spent; they care about what changed.
- **Hidden trade-offs.** If you optimized for one metric and silently regressed another (latency went up, cost went up, etc.), be honest about it. Owning trade-offs signals seniority.
- **Speculative impact.** "If it ships next quarter, we expect..." — pick a story where the impact already landed.

## The metrics ladder

If you're not sure your impact story is strong enough, climb this ladder:

1. **Output**: I shipped X. (Weak — anyone can ship.)
2. **Activity**: X is now used by Y users / Y teams. (Better.)
3. **Outcome**: X moved metric M by Δ. (Strong.)
4. **Compounding outcome**: X moved M by Δ, *and* enabled further work on Z. (Strongest — shows your work compounds.)

Aim for at least level 3 in your top two impact stories.

## Prep checklist

- [ ] One sentence: what specifically moved? Be ready to say the number out loud.
- [ ] Can you describe a non-trivial trade-off you made and own it?
- [ ] What was your unique contribution vs. the team's?
- [ ] How long after shipping did the impact actually land? (If they ask "was it sustained?" — be ready.)
- [ ] Do you have a "compounding" story — one where your work created leverage for others?

The most compelling impact stories sound like this: *"I owned X. We considered options A, B, C; we picked B because of reason R. We shipped, and metric M moved by Δ within T weeks. The thing I'd do differently is …"* — that's a complete answer in under 90 seconds and it covers everything they want to know.
