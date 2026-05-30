# 04 — Conflict stories

> Behavioral • Position 4/5

## The question family

- "Tell me about a time you disagreed with a coworker / your manager."
- "Walk me through a conflict you had on a project — how did you resolve it?"
- "Describe a time when you had to push back on a customer or stakeholder."
- "Have you ever had to deliver feedback that wasn't well-received?"

Conflict questions test **judgment, empathy, and the ability to disagree without burning a relationship.** Engineering is full of disagreements; what they're looking for is *constructive* disagreement.

## The framework

A clean conflict story has five beats. We'll call this **CAPER**:

- **Context** — the disagreement, stated neutrally. Both sides get a fair description.
- **Approach** — what you did *first* to understand the other side. (Listening shows up here.)
- **Position** — what you actually believed, with the reasoning.
- **Engagement** — how you advocated for your view: data, prototype, escalation if needed.
- **Resolution** — how it ended, and what you took away (especially if you turned out to be wrong).

The order matters. Many candidates jump straight from Context to Position — that signals "I argue." The Approach step before Position signals "I listen first, then argue."

## Story template

> **Context.** My staff engineer wanted to use gRPC for a new internal service; I wanted REST.
>
> **Approach.** Before pushing back, I asked him to walk me through his reasoning. He had two solid points: stronger schema discipline and existing tooling on his side. I wrote both down.
>
> **Position.** My concern was different: the consumers were the mobile and web teams, who'd never integrated gRPC and didn't have generated clients in their build pipelines. I estimated the integration cost at ~3 sprints for them, against ~1 sprint of REST wrappers on our side.
>
> **Engagement.** I scheduled a 30-minute meeting with the mobile and web tech leads, asked the *staff engineer to join*, and let the mobile lead describe their constraints first. We agreed on a hybrid: gRPC internally, a REST gateway for external consumers.
>
> **Resolution.** The hybrid shipped and held up. More importantly, the staff engineer and I now have a strong default — when interface choice affects another team, we loop them in *before* the architecture review. We've since used that practice on three more projects.

## 3 worked stories

### Story A — Disagreed with a more senior engineer

You believed they were wrong on a technical decision. You listened first, then advocated with data. Critically: you treated their view as smart-by-default and looked for the constraints they were seeing.

### Story B — Disagreed with a manager / PM

A timeline or scope dispute. You expressed concerns clearly, offered alternatives with their tradeoffs, and either won the argument with evidence or accepted the decision after making your case — without being passive-aggressive.

### Story C — Conflict with a peer or another team

A team boundary or ownership dispute. Resolved through a meeting, a written doc, or a small experiment that proved out one approach. Show empathy for the other team's incentives.

## Anti-patterns

- **"And then they realized I was right."** Sounds smug, even if true. Reframe as "we converged on …" or "we ran a small test."
- **"The conflict was unresolvable."** Even if true, this signals you don't know how to navigate disagreement. Pick a different story.
- **"I just escalated to my manager."** Escalation is sometimes correct, but it shouldn't be your *first* move. If you escalated, explain what you tried first.
- **Bashing the other person.** Even if they were difficult, your story is about how you handled it. Saying "he was just an arrogant jerk" tells the interviewer you'll badmouth coworkers.
- **No actual conflict.** "I disagreed with a coworker on a variable name, we discussed for 5 minutes, picked one, moved on." That's not a conflict. Pick something with real stakes.
- **You always win, you never adapt.** Have at least one story where you turned out to be wrong (or partially wrong) and you updated your view — that signals intellectual honesty.

## Prep checklist

- [ ] Can you state the other side's position *fairly*? If not, you don't understand the conflict yet.
- [ ] Did you listen before advocating? Where in your story is the listening?
- [ ] Did you use **data**, **prototype**, or **a third opinion** to break a deadlock — not just rhetorical persistence?
- [ ] What changed in your working relationship after — did you stay in regular contact, did your collaboration patterns improve?
- [ ] Do you have at least one story where you turned out to be wrong?

The single strongest signal in a conflict story: **the other person comes out of it sounding reasonable.** If they sound unreasonable, the interviewer assumes you'll cast *them* in the same light when conflict happens here.
