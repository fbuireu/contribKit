# app/lib/application

Orchestration, in pure Dart. It composes `domain/` into whole operations. No Flutter, no Riverpod — a use case must
be constructible and testable with `const FetchContributions(repository: fake)` and nothing else on the stack.

## Invariants & rules

- **One class per use case, one public method, always named `call`.** That is what makes an instance invocable as
  `useCase(...)` at the call site, and it is why a second public method means a second use case.
- **Dependencies arrive through the constructor**, held in a private final field. No service locator, no
  `ref.read`, no `Provider.of`. The only place that knows how to build one is
  [`ui/di/providers.dart`](../ui/di/CLAUDE.md).
- **Stateless.** Every one of them is a `const` constructor over a repository. State lives in `ui/`.
- **Named parameters** for anything taking more than one argument, matching the repository interface it fronts.
  `PurchaseTip.call(TipProduct product)` is the one positional signature, because it has exactly one argument.

## The four use cases

| Class | Fronts | Returns |
| --- | --- | --- |
| `FetchContributions` | `ContributionRepository.fetchCalendar` | `({ ContributionCalendar calendar, bool fromCache })` |
| `ExportCalendar` | `ExportRepository.export` | `List<int>` — the encoded bytes |
| `FetchTipProducts` | `PurchaseRepository.getProducts` | `List<TipProduct>` |
| `PurchaseTip` | `PurchaseRepository.purchase` | `Future<void>` |

All four are one-line delegations today, and that is fine. They exist so `ui/` depends on `application/` rather than
on a repository interface it would also have to call, and so a rule belonging between the widget and the repository
has an obvious home. Do not inline them into the notifiers.

**This was re-examined and upheld.** The web deleted two of its own thin use cases for failing the deletion test,
which invites the same question here, and the answer is not the same: the two the web deleted were provable
identities — `renderer => params => renderer(params)`, and a factory returning a module constant. These four bind a
dependency in a constructor and name the operation in the domain's language. The web's `fetchContributions`, which
is exactly this shape, was kept for exactly this reason.

One real gap, though: `ViewerNotifier.refreshContributions` calls
`ref.read(contributionRepositoryProvider).invalidateCache(username)` directly, so `ui/` already reaches a repository
method with no use case in front of it. The boundary these four exist to draw has a hole in it, and the honest
options are a fifth use case or an admission in this guide that `invalidateCache` is exempt. It is currently
neither.

## Gotchas

- **`fetchCalendar` returns a record carrying `fromCache`, and dropping it is a real regression.** The viewer uses
  it to distinguish "this is what GitHub says right now" from "this is what we stored"; a signature returning only
  the calendar silently removes the user's ability to tell.
- **A use case never catches**, and what happens next depends on which one you called.
  `FetchContributions` is the only one wired all the way through: `ViewerNotifier` catches `on Failure` and puts it
  into state **without inspecting it**, and the single exhaustive `switch` lives further out, in `_ErrorState`
  inside `viewer_screen.dart` — that split is what
  [ADR 0004](../../../docs/adr/0004-typed-failures-instead-of-thrown-exceptions.md) actually prescribes. The other
  three are called straight from `ConsumerState` widgets and never reach that switch, so each handles its own:
  `tip_jar_sheet.dart` catches with `catch (_)` and marks the failing product, and `ExportSheet` catches and renders
  a message. It used `try`/`finally` with **no catch at all** until this was found, so a failed export stopped the
  spinner and said nothing. `ExportPanel` has the same handling — but see the note in
  [`ui/`](../ui/CLAUDE.md) before treating it as a live surface. None of these may switch over `Failure`: the
  exhaustive match is `_ErrorState`'s alone, so they test for `ExportFailure` with `is` and fall through to a
  generic sentence. Adding a `try`/`catch` in this layer would not have fixed any of it — it would have hidden it
  one layer earlier.
- **`PurchaseTip` returns `void` on purpose.** A tip unlocks nothing, so there is no entitlement to hand back and
  nothing downstream may branch on purchase state
  ([ADR 0009](../../../docs/adr/0009-tips-are-unconditional-and-unlock-nothing.md)). A future signature returning a
  receipt would be the first step toward breaking that.
- `ExportCalendar` returns bytes, not a file path. Writing and sharing them is `infrastructure/export/` and the UI's
  share flow; this layer never touches the filesystem.
