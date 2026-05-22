# ui/components/core/

Reusable infrastructure-level UI components with no domain coupling. These components are consumed by layouts and pages, not by feature components.

## Contents

| File | Purpose |
|---|---|
| `SEO.astro` | Full SEO head block — title, description, canonical, Open Graph, Twitter card, robots directive |

## Rules

- Components here must be fully generic and reusable across any page.
- No domain imports. No palette, shape, or contribution logic.
- Props must have sensible defaults so callers only pass what they need.
- `SEO.astro` is the single source of truth for meta tags — never add `<title>` or `<meta>` manually in a page that uses it.
