# 6. The page is parsed with regexes, not a DOM parser

Date: 2026-07-26

## Status

Accepted.

## Context

Parsing HTML with regular expressions is the canonical wrong answer, and a reader who finds it here will assume it is an oversight. It is worth writing down why it is not.

The web renderer runs inside a Cloudflare Worker. There is no DOM, so "just use the DOM" is not available; the alternative is bundling an HTML parsing library into a Worker where bundle size and cold-start time are real costs. What is being extracted is two element shapes this project already depends on by name.

## Decision

Both clients extract the data with a handful of focused regular expressions over the response text: the contribution-day `<td>` and its attributes, and the `<tool-tip>` that carries the exact count.

A DOM or HTML-parser dependency is the rejected alternative: it buys generality this parser does not need, at a cost the runtime does charge.

## Consequences

- The regexes are the coupling point named in [5](0005-scrape-githubs-public-contributions-html.md). They must stay tolerant of attribute order and of extra classes on the element. A pattern that demanded `class="ContributionCalendar-day"` exactly would break the moment GitHub adds a second class, which is a difference the two clients once had.
- This is not a licence to parse HTML with regexes generally. It holds because the target is two known shapes in an environment where the usual tool is not free.
