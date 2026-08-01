# 3. Both clients use the same layered architecture

Date: 2026-07-26

## Status

Accepted.

## Context

The same domain is implemented twice, in two languages, by one maintainer. The risk is not that either implementation is bad; it is that they drift into different shapes and stop being reviewable against each other. Once that happens, "does the app do what the web does?" has no cheap answer.

A layered architecture is heavier than a project of this size would normally justify. The reason to take that weight is the second implementation, not the first.

## Decision

`domain` → `application` → `infrastructure` / `ui`, with a strict inward dependency direction, in both clients. The domain layer imports nothing from its host framework: on the web it is pure TypeScript with no Astro, Cloudflare or `fetch`; in the app it is pure Dart with no Flutter, Riverpod or `dart:ui` — hence the project's own `Color` value object rather than the framework's.

Each layer states its own rules in a colocated `CLAUDE.md`.

## Consequences

- The parallel structure is what makes the two implementations comparable. Diffing them concept by concept is how the level-derivation divergence recorded in [8](0008-the-mobile-app-fetches-github-directly.md) was found.
- Those per-layer files were originally named `CONTEXT.md`, which collided with the root `CONTEXT.md` once that became the domain glossary — one filename meaning two things. They are now `CLAUDE.md`, which both removes the collision and makes them load: an agent editing a file in `web/src/domain/` gets that folder's guide automatically, which `ARCHITECTURE.md` never did. Three filenames, three jobs — `CONTEXT.md` defines what the words mean, a `CLAUDE.md` states the rules its directory obeys, and the root [`ARCHITECTURE.md`](../../ARCHITECTURE.md) is the picture the layers add up to. A stray `CONTEXT.md` outside the root fails [0015](0015-the-maintenance-contract-is-enforced-by-a-test.md), and so does a layer with no nested guide.
- Ceremony has a cost. A one-line change can touch a value object, a repository interface and its implementation, and there is no plan to relax that.
