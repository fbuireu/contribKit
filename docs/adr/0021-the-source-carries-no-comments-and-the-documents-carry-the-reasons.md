# 21. The source carries no comments and the documents carry the reasons

Date: 2026-08-21

## Status

Accepted. Recorded late: the rule has been in force since the first commit and was stated only as a one-line convention. [15](0015-the-maintenance-contract-is-enforced-by-a-test.md) records the test that enforces it, not the decision itself.

## Context

Every explanation in this project has to live somewhere. The usual answer is a comment beside the code, and the usual result is that the comment and the code drift, because nothing compares them and a stale comment costs nothing to leave behind.

The alternative is to put the reasoning in documents and hold those documents to a check. That only works if the code is genuinely comment-free. A codebase that is *mostly* comment-free gets the worst of both: the reader does not know whether the absence of a comment means "nothing to say" or "the explanation is elsewhere", so they stop looking for the elsewhere.

Doc comments complicate this. `///` in Dart and JSDoc in TypeScript are normally good practice, and both are a partial answer to the same problem. But they are the wedge: once one file has them the rule becomes "comments are fine if they are the right kind", which is not a rule a test can hold.

## Decision

**No `//` and no `/* */` in hand-written source, of any kind, including doc comments.** The reason a piece of code is the way it is goes in the folder's `CLAUDE.md`, in an ADR, or in the commit message. Naming is the only in-file explanation: a constant named `WEYL_INCREMENT` replaces the comment that would have said "Weyl increment".

The ban covers [`app/lib`](../../app/lib), [`app/test`](../../app/test), [`web/src`](../../web/src), [`web/e2e`](../../web/e2e), [`web/workers`](../../web/workers), `docs/`, `scripts/` and the three `web/*.config.ts`. Generated Dart is excluded because it is generated. The exception list is exactly two directives the tooling reads and would break without: `// @vitest-environment` and `/// <reference>`.

**Kotlin, XML and the root config files are outside it, deliberately.** `ContribKitWidgetProvider.kt` carries comments, `AndroidManifest.xml` carries XML comments, and [`commitlint.config.cjs`](../../commitlint.config.cjs) opens with a JSDoc block. The rule earns its keep where the reasoning has a document to live in; the Android sources have no colocated guide of their own, and [`app/lib/ui/CLAUDE.md`](../../app/lib/ui/CLAUDE.md) documents them from the Dart side instead. Extending the ban there means giving them a guide first.

The rejected alternative is the ordinary one: allow doc comments, ban the rest. It was rejected because the boundary is unenforceable. `///` above a class and `//` inside a method are the same characters to a regex, and the moment the rule needs judgement it stops being checked, which is how the block form `/* */` went unnoticed here for a year while the line form was policed.

## Consequences

- **The rationale is further from the code, by design.** Reading a function tells you what it does; the folder's `CLAUDE.md` tells you why it is shaped that way and what broke last time. Anyone who does not open the guide is missing the argument, which is the accepted cost, and the reason the guides are prose rather than reference tables.
- **The documents are load-bearing, so they cannot be optional.** This is what makes the maintenance contract in [15](0015-the-maintenance-contract-is-enforced-by-a-test.md) necessary rather than nice: deleting it would leave the reasoning in files nothing checks.
- **No published API documentation can be generated from this source.** `dart doc` and TypeDoc produce nothing useful. Neither is published, and adopting either means reopening this decision rather than adding comments quietly.
- **Commented-out code has nowhere to live.** Deleting it is the only option, which is the intent: git holds it.
- **A `// @TODO` is a build failure, not a note.** Deferred work goes in [`docs/plans/`](../plans) with the reason it was deferred, or it goes nowhere.
- Where it bites: the **Conventions** list in [`CLAUDE.md`](../../CLAUDE.md), the maintenance-contract table beneath it, and [`CONTRIBUTING.md`](../../CONTRIBUTING.md) under "Improving documentation".
