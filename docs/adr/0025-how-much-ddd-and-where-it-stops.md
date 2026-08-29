# 25. How much DDD, and where it stops

Date: 2026-08-29

## Status

Accepted. Sits beside [3](0003-layered-domain-architecture-in-both-clients.md), which decided the layers and the dependency direction. This one decides how far the tactical patterns go inside them.

## Context

Four documents call this project's architecture "DDD-ish": the root [`README.md`](../../README.md), [`web/README.md`](../../web/README.md), [`app/README.md`](../../app/README.md) and the wiki's [Architecture](../wiki/Architecture.md) page. None of them says what the `-ish` is doing, so the label reads as a hedge rather than a decision, and every reviewer has to re-derive the boundary from scratch.

That cost became concrete during a modelling audit of both clients. It produced findings that were textbook-correct and disproportionate in the same list. Some named real defects: an aggregate that could be built inconsistently, a rule living in infrastructure while the domain implemented it again, a value object downgraded to a `string` at the one boundary where the guarantee mattered most. Others prescribed machinery for surface nobody reads.

Applied uniformly, the textbook answer would have added a nested value object for every pair of fields, a smart constructor for every record, and a wrapper type for every primitive, in a two-client project whose whole point is that the same small domain is diffable across two languages. That is the failure mode this decision exists to name: **DDD asks for the abstraction before the code has earned it, and the boilerplate then hides the rules it was meant to protect.**

## Decision

The strategic half is not negotiable, and [3](0003-layered-domain-architecture-in-both-clients.md) already fixed it: the ubiquitous language of [`CONTEXT.md`](../../CONTEXT.md), the layer boundaries, the dependency direction, the pure domain, repositories as ports, and the sealed `Failure` set of [4](0004-typed-failures-instead-of-thrown-exceptions.md).

The tactical half is applied where it pays, and the test is **three questions asked in order**:

1. **Can the illegal state actually be reached?** A shape the type permits but no code path produces is a guard, not a bug. Guard it in the cheapest way that makes it a compile error or a debug failure, and say in the commit that it is a guard.
2. **Does anything read it?** Modelling a concept nothing consumes invents a type whose only reader is its own test. The root [`CLAUDE.md`](../../CLAUDE.md) already names the shared-token-nothing-reads trap; a value object nothing reads is the same trap wearing a pattern's name.
3. **Does it cross a boundary?** A concept that leaves the domain, reaches a public payload, is persisted, or is spelled in both languages earns a real type. One that lives inside a single function does not.

A "no" to all three means write the rule down instead of encoding it: an assert, a doc line, or an ADR. **A divergence or a rule that is named is finished work.** That is why [24](0024-calendar-labels-are-a-web-only-surface.md) is an ADR and not a feature.

## Consequences

- **Worked examples, in both directions.** These are the calls this rule produced, kept here because the rule is only as clear as what it rejected:

| Finding | Textbook answer | What was done, and why |
| --- | --- | --- |
| `ContributionDay` had no constructor, so `clampLevel` was re-applied defensively downstream and tests cast with `as unknown as` | Smart constructor | **Modelled.** Reachable, crosses the scraper and the client's JSON boundary, and removing it deleted two defensive re-clamps |
| `date: string` keyed a map, ordered comparisons, and was sliced at magic offsets | `IsoDate` value object | **Modelled.** It crosses every boundary in the layer, and the type immediately caught an unparsed API response being cast into the domain |
| `Color` took any `int` unchecked in Dart | Private constructor plus masking factory | **Asserted.** The factory would have cost every `const Color(0x...)` in the tree; no path reaches an out-of-range value because `fromHex` parses at most eight hex digits |
| `ContributionStats` let `bestDayCount` exist without `bestDayDate` | Nested `BestDay` value object | **Asserted.** Six of its eight fields have no reader in `lib/`; the pair had shipped broken once, so the rule needed enforcing, not a type |
| Calendar Labels exist on the web and not in the app | Model them in the app | **Recorded** as [24](0024-calendar-labels-are-a-web-only-surface.md). Modelling them is a rendering feature, not a refactor |

- **A commit that guards rather than fixes must say so.** Several of the above are guards against states nothing produces. Describing one as a bug fix overstates it and misleads whoever reads the log looking for what actually broke.
- **The `-ish` now has a definition, so it can be argued with.** A reviewer who thinks a call fell on the wrong side of the three questions has something specific to disagree with, which is the point of writing it down.
- **This does not license skipping the strategic half.** Layer direction and domain purity are enforced by assertions in [`docs/docs-consistency.test.ts`](../docs-consistency.test.ts) for both clients, and this ADR is not an argument against adding more of those. Enforcement is cheap; types are not always.
