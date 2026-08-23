# Support

ContribKit is two clients built from one repository, and where you ask depends on which one you are using.
Everything here is best effort: one maintainer, no SLA.

## If you use the web app

[contribkit.app](https://contribkit.app) needs no account and stores nothing about you. If a calendar comes
back empty or wrong, the username and the year you asked for are what makes it reproducible, so start with
those. [Troubleshooting](./docs/wiki/Troubleshooting.md) covers the usual causes, including the ones that are
GitHub's rather than ours.

## If you use the mobile app

Report through the store listing you installed from, or open a
[bug report](https://github.com/fbuireu/contribKit/issues/new?template=bug_report.yml) here with the platform,
the OS version and the app version from the settings screen. A screenshot of the calendar is worth more than a
description of it. [Mobile App](./docs/wiki/Mobile-App.md) documents what the app does on device, including
the widget and the tip jar.

## If you are working on the code

| You want to | Go to |
| --- | --- |
| Ask a question, or propose something before requesting it | [Discussions](https://github.com/fbuireu/contribKit/discussions) |
| Report something broken | [Bug report](https://github.com/fbuireu/contribKit/issues/new?template=bug_report.yml) |
| Request a feature | [Feature request](https://github.com/fbuireu/contribKit/issues/new?template=feature_request.yml) |
| Fix the docs | [Documentation issue](https://github.com/fbuireu/contribKit/issues/new?template=documentation.yml) |
| Understand the shape of it first | [ARCHITECTURE.md](./ARCHITECTURE.md) and [CONTRIBUTING.md](./CONTRIBUTING.md) |

Contributions that touch both clients need both to stay in step:
[How It Works](./docs/wiki/How-It-Works.md) is the shared model, and the web is not the source of truth for
the app.

## Vulnerabilities

Privately, through the [security policy](https://github.com/fbuireu/contribKit/security/policy) or
<contact@contribkit.app>, never as a public issue. Scraping GitHub's public contributions page is what this
project does, so a report about rate limits or blocked requests is a bug rather than a vulnerability, and
belongs in the tracker.
