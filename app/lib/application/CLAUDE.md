# app/lib/application

Orchestration, in pure Dart. It composes `domain/` into whole operations. No Flutter, no Riverpod: a use case must
be constructible and testable with `const FetchContributions(repository: fake)` and nothing else on the stack.

## Invariants & rules

- **One class per use case, one public method, always named `call`.** That is what makes an instance invocable as
  `useCase(...)` at the call site, and it is why a second public method means a second use case.
- **Dependencies arrive through the constructor**, held in a private final field. No service locator, no
  `ref.read`, no `Provider.of`. The only place that knows how to build one is
  [`ui/di/providers.dart`](../ui/di/CLAUDE.md).
- **Stateless.** Every one of them is a `const` constructor over a repository. State lives in `ui/`.
- **Named parameters** for anything taking more than one argument, matching the repository interface it fronts.
  `GiveTip.call(TipProduct product)` is the one positional signature, because it has exactly one argument.

## The five use cases

| Class | Fronts | Returns |
| --- | --- | --- |
| `FetchContributions` | `ContributionRepository.fetchCalendar` | `({ ContributionCalendar calendar, bool fromCache })` |
| `InvalidateContributionCache` | `ContributionRepository.invalidateCache` | `Future<void>` |
| `ExportCalendar` | `ExportRepository.export` | `List<int>`: the encoded bytes |
| `FetchTipProducts` | `TipRepository.getProducts` | `List<TipProduct>` |
| `GiveTip` | `TipRepository.give` | `TipOutcome` |

**`GiveTip` returns a `TipOutcome`, and that is the point of it.** It returned `Future<void>`, so *completed* and
*cancelled* were the same value and the Tip Jar could not tell them apart, which is exactly why nobody noticed
that the repository below it had an unreachable cancel arm. A store sheet the person backs out of is an ordinary
outcome, not an error and not a success, and it is a value now.

All five are one-line delegations today, and that is fine. They exist so `ui/` depends on `application/` rather than
on a repository interface it would also have to call, and so a rule belonging between the widget and the repository
has an obvious home. Do not inline them into the notifiers.

**This was re-examined and upheld.** The web deleted **both** of its own thin use cases for failing the deletion
test, which invites the same question here, and the answer is not the same. `renderCalendarSvg` was
`renderer => params => renderer(params)`; `fetchContributions` was `repository => params =>
repository.fetch(params)`, and its stated justification (that a route could then depend on `@application/*` alone)
was an import path rather than a behaviour. Neither bound anything, and neither survives. These five bind a
dependency in a constructor and name the operation in the domain's language, which is the difference that keeps
them.

**`InvalidateContributionCache` is the fifth, and it exists to close a hole this guide used to record rather than
fix.** `ViewerNotifier.refreshContributions` called
`ref.read(contributionRepositoryProvider).invalidateCache(username)` directly, so `ui/` reached a repository method
with no use case in front of it: the one place the boundary these classes draw was not actually drawn. The honest
options were a fifth use case or an admission that `invalidateCache` was exempt; this is the first. Every
`ContributionRepository` method now has a use case, and `ui/` names no repository method of its own.

## Gotchas

- **`fetchCalendar` returns a record carrying `fromCache`, and dropping it is a real regression.** The viewer uses
  it to distinguish "this is what GitHub says right now" from "this is what we stored"; a signature returning only
  the calendar silently removes the user's ability to tell.
- **A use case never catches**, and what happens next depends on which one you called.
  `FetchContributions` is the only one wired all the way through: `ViewerNotifier` catches `on Failure` and puts it
  into state **without inspecting it**, and the single exhaustive `switch` lives further out, in `FailureMessage.of`.
  That split is what
  [ADR 0004](../../../docs/adr/0004-typed-failures-instead-of-thrown-exceptions.md) actually prescribes. The other
  three are called straight from `ConsumerState` widgets and never reach that switch, so each handles its own:
  `tip_jar_sheet.dart` and `ExportSheet` both catch and render a message through `FailureMessage.ofAny`. `ExportSheet`
  used `try`/`finally` with **no catch at all** until this was found, so a failed export stopped the spinner and said
  nothing, and the Tip Jar discarded the reason with `catch (_)` until later still. None of these may switch over
  `Failure`: the exhaustive match is `FailureMessage.of`'s alone, so anything caring about one kind tests it with
  `is`. Adding a `try`/`catch` in this layer would not have fixed any of it: it would have hidden it
  one layer earlier.
- **`GiveTip` returns a `TipOutcome`, and a `TipOutcome` is not an entitlement.** It says only whether the store
  sheet finished or the person backed out, which is what the Tip Jar needs to decide between "Thanks! ❤️" and
  saying nothing at all. It carries no receipt, no product state and no expiry, and **nothing may branch on it
  other than the sheet that offered the Tip**
  ([ADR 0009](../../../docs/adr/0009-tips-are-unconditional-and-unlock-nothing.md)). It returned `void` before,
  which is what let a cancelled Tip look identical to a completed one; a signature that returned anything
  *persisted* would be the first step toward breaking ADR 0009, and this one deliberately does not.
- `ExportCalendar` returns bytes, not a file path. Writing and sharing them is `infrastructure/export/` and the UI's
  share flow; this layer never touches the filesystem.
