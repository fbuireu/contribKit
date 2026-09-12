# Security Policy

## Supported Versions

ContribKit is delivered as a continuously deployed web app and public API, and
a mobile app released to the stores. Only the latest of each is supported:
security fixes land on `main` and roll out from there.

| Component | Supported |
| --- | --- |
| The web app and public API, `contribkit.app` | The latest deploy from `main` |
| The mobile app | The latest store release |
| Anything older | No |

## Scope

Neither client holds a GitHub token: both read GitHub's public contributions
page. That shapes what is interesting to report.

### In scope

- **The web Worker and its public endpoints**: the SVG embed at
  `/user/<name>.svg` and the JSON API at `/api/contributions`. Output that
  interpolates a username or a query parameter incorrectly, so that a
  crafted value becomes live markup in an SVG or bypasses the rate limiter on
  the JSON API, is a vulnerability.
- **The middleware**, which sets the CSP and the other security headers on
  every response and enforces the rate limit.
- **The mobile app's storage**: the cached calendars and the settings box.
- **Telemetry.** By design no Usage Event or Diagnostic Report leaves the
  device carrying a username or a path. A report that shows one doing so is a
  real finding.

### Out of scope

- Vulnerabilities in the platforms and services the clients are built on:
  Cloudflare, GitHub, RevenueCat, Google Play, Astro, Flutter. Report those to
  them.
- Rate limiting, quota exhaustion or cost caused by ordinary use of the
  public routes, unless it bypasses the limiter that is in place on the JSON
  API.

### Documented trade-offs, not vulnerabilities

Some behaviour that looks reportable is a documented, deliberate decision.
Please check these before reporting:

- **The SVG endpoint has no rate limit.** README embeds arrive through
  GitHub's shared image proxy, so a per-IP limit would throttle everyone at
  once; only the JSON API is limited. See
  [ADR 0010](../docs/adr/0010-rate-limit-only-the-json-api.md).
- **The SVG endpoint is exempt from `Cross-Origin-Resource-Policy:
  same-origin`.** An embed has to be loadable from any origin; the exemption
  matches `/user/<segment>.svg` and nothing else. See
  [ADR 0017](../docs/adr/0017-the-svg-endpoint-opts-out-of-the-same-origin-resource-policy.md).
- **`/api/health` answers `403` to some automated clients.** Nothing in this
  tree returns a 403 for that path; that answer comes from a zone rule at the
  edge, and a browser gets the JSON. It is a Cloudflare setting, not a
  finding against the Worker.

A report that one of these exposes something *beyond* its documented scope is
very much welcome.

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues,
pull requests or discussions.** Report them privately instead.

### Preferred: GitHub private vulnerability reporting

1. Open [Report a vulnerability](https://github.com/fbuireu/contribKit/security/advisories/new)
2. Fill in the form with the details below

Private reporting is open to any GitHub account and is the channel this project
uses.

### If private reporting is unavailable

Write to **contact@contribkit.app**, and say nothing about the finding anywhere
public.

Whichever way it reaches me, include:

- The type of issue (injection into the SVG, rate-limit bypass, leaked
  secret…)
- The affected component (web app, public API or mobile app) and its version
  or URL, and the location of the relevant source code if you found it
- Any special configuration required to reproduce the issue
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code, if possible
- The impact of the issue, including how an attacker might exploit it

### What to expect

- **Acknowledgment**: I will acknowledge receipt within 48 hours
- **Updates**: I will keep you informed of the fix's progress
- **Timeline**: I aim to fix critical issues within 7 days
- **Credit**: I will credit you in the security advisory, unless you prefer to
  remain anonymous
- **Disclosure**: this project follows a 90-day responsible disclosure policy

Reports made in good faith will not result in legal action. Thank you for
helping keep ContribKit and its users safe.

## Security Updates

Web fixes ship as ordinary commits to `main`, which deploys them; there is no
release to wait for. App fixes ship in the next store release, tagged
`[Security]` in its release notes, and reach you through the store's ordinary
update.
