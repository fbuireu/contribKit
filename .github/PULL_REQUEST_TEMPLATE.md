## Description

<!-- What does this change, and why? -->

## Type of Change

<!-- Check exactly one box, with an "x" -->

- [ ] 🐛 Bug fix (non-breaking change which fixes an issue)
- [ ] ✨ New feature (non-breaking change which adds functionality)
- [ ] 💥 Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] 📝 Documentation update
- [ ] 🔧 Configuration or workflow change
- [ ] ♻️ Code refactoring
- [ ] ⚡ Performance improvement
- [ ] ✅ Test update

## Related Issue

<!-- If this PR closes an issue, uncomment the line below and fill in the number. Otherwise leave it as is. -->
<!-- Fixes #123 -->

## Changes Made

<!-- Describe the changes in detail -->

-
-

## Testing

<!-- Describe how you verified your changes -->

- [ ] Web: existing unit tests pass (`pnpm test:ut` from `web/`) and the build passes (`pnpm build`)
- [ ] App: existing tests pass (`flutter test`), `flutter analyze --fatal-infos` is clean and a debug build passes (`flutter build apk --debug`)
- [ ] Added new tests for changes
- [ ] Manually tested in a browser, or on a device or emulator

## Screenshots (if applicable)

<!-- Before and after, as rendered -->

## Checklist

<!-- Check all that apply, with an "x" -->

- [ ] Web: `pnpm verify` passes (format check, typecheck, `astro check` and coverage)
- [ ] App: `dart format` ran, no `dynamic` outside the JSON boundary, spacing and colours go through the tokens, and generated files (`*.freezed.dart`, `*.g.dart`) are up to date
- [ ] I have performed a self-review of my own code
- [ ] My change carries no inline comments; rationale lives in this PR, the commit messages, an ADR or the folder's guide
- [ ] I used the glossary's words ([`CONTEXT.md`](../CONTEXT.md)) rather than synonyms, and edited `shared/` rather than `app/assets/`
- [ ] I updated any `CLAUDE.md`, `CONTEXT.md`, ADR, [`ARCHITECTURE.md`](../ARCHITECTURE.md) or wiki page my change affects, in this same PR, and `pnpm test:docs` passes
- [ ] My changes generate no new warnings or errors
- [ ] I have added tests that prove my fix is effective or that my feature works

## Additional Notes

<!-- Anything else worth knowing -->

---

## GIF (mandatory)

<div align="center">

<!-- Add a funny or cute GIF here. Yes, really. -->

_Thanks for contributing!_ ✨

</div>
