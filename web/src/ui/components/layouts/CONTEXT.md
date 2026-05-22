# ui/components/layouts/

Astro layout components that wrap pages with the full HTML shell. Every page must use a layout — never write `<!doctype html>` or `<html>` directly in a page.

## Contents

| File | Purpose |
|---|---|
| `BaseLayout.astro` | Root layout — HTML shell, fonts, favicons, color-scheme script, `<SEO>`, `<TopNav>`, `<Footer>` |

## Rules

- Layouts own the `<head>` — fonts, favicon links, and SEO meta tags all live here via `<SEO>`.
- Pages pass SEO props (`title`, `description`, `url`, `robots`) to the layout; they never write meta tags themselves.
- Use `<slot name="head" />` for page-specific head injections (e.g. preload hints, page-specific styles).
- Do not add layout-specific business logic. Layouts are structural only.
