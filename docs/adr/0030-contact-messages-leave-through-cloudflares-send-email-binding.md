# 30. Contact Messages leave through Cloudflare's send_email binding

Date: 2026-09-16

## Status

Accepted. Amends [28](0028-telemetry-consent-is-asked-twice-and-answered-asymmetrically.md), whose store declarations no longer describe everything the app collects.

## Context

Until now the only way to reach the maintainer was the `mailto:contact@contribkit.app` link on the three legal
pages. That is a dead end for anyone whose browser has no mail client configured, and it is unreachable from the
app, which has no such link at all. A form is the obvious answer, and the obvious ways to deliver one all cost the
same thing: a secret.

- **Resend, Postmark, SendGrid.** An API key that has to reach the Worker at runtime, which means
  `wrangler secret put` and a credential to rotate. The Resend account this project could have used already has its
  one free custom-domain slot spent on a sibling site, so this one would have meant a second account or a paid plan.
- **A webhook into a chat or an issue tracker.** Same shape: a URL that is itself the credential, and a message
  that then lives in a third party's system rather than in a mailbox.
- **A hosted form service.** No secret, but the submission goes to someone else's server, the page has to load
  their script past a CSP that names every origin explicitly, and the privacy policy grows a processor whose
  only job is to forward an email.

Every one of them also changes what `_deploy.yml` has to do. That workflow handles wrangler's own credentials and
nothing else, and a Worker runtime secret is a thing no push can see: rotating one changes no file, so nothing
redeploys and nothing notices until a send fails.

Email Routing is already enabled on `contribkit.app`, because that is what makes the `mailto:` address work at all.
A Worker on the same zone can send through it with a binding rather than a key.

## Decision

A Contact Message leaves through a Cloudflare `send_email` binding named `CONTACT_EMAIL`, declared in
[`web/wrangler.toml`](../../web/wrangler.toml) at the top level **and** under `[env.production]` and
`[env.development]`, because wrangler inherits no binding into a named environment. The binding carries
`destination_address = "contact@contribkit.app"`, so the platform itself refuses a send to anywhere else: the
address is not a value the code chooses per request and cannot become one.

Sender and recipient are both `contact@contribkit.app`, and `Reply-To` carries the visitor's address, which is what
makes answering a message a reply rather than a copy-paste. The alternative, putting the visitor in `From`, is what
DMARC exists to reject.

**The MIME document is built by hand**, in `buildMimeMessage`, rather than by adding `mimetext`. It is a short
header block and a base64 body, and the reason is the same one that keeps the scraper on regexes
([6](0006-parse-the-contributions-page-with-regexes.md)): a dependency whose whole job is string concatenation is a
supply chain for a function that fits on a screen. The body is base64 over UTF-8 bytes folded at 76 characters, so a message may carry any
line break it likes; every **header** value has its CR and LF replaced with a space before it is written, which is
the second of two guards against header injection. The first is
[`web/src/domain/value-objects/contact-message.ts`](../../web/src/domain/value-objects/contact-message.ts), whose email rule
rejects whitespace, `<`, `>` and `"` outright and therefore doubles as that guard.

**Anti-abuse is a honeypot field plus a dedicated rate limiter, not Turnstile.** Turnstile needs a secret key at
verification time, which is the thing this decision exists to avoid. `CONTACT_RATE_LIMITER` is its own binding at
five requests a minute rather than the hundred `API_RATE_LIMITER` allows, because the two protect different things:
one protects an upstream we do not own, the other protects a mailbox. A non-empty `website` field answers **202**
without delivering, so a bot is told nothing.

**Delivery failure is a `Failure` kind of its own**, `Delivery` on the web and `DeliveryFailure` in the app, mapping
to **502**. In the app it is one `DiagnosticReportService.warrants` answers **false** for, beside `NetworkFailure`
and `RateLimitedFailure`: a refused send is the world's doing, and there is no defect in the app to fix from a
report of it. `messageFor` answers the fixed literal `"Could not send your message"` for it, the same way it does for
`NotFound`, because the failure's own message is the platform's wording and belongs in the log rather than in a
response body. A rejected address or an empty message is `InvalidInput` with a new `FailureField`, not a second new
kind: those are the same class of thing `parseUsername` already produces.

**The app talks to our own `/api/contact`** rather than sending mail itself, which is the first request the app
makes to a ContribKit server. That does not reopen
[11](0011-keep-the-apps-own-scraper-for-now.md): the contributions scrape stays a direct GitHub call, and this is
a surface the app could not implement on its own at all.

## Consequences

- **`contact@contribkit.app` has to be a verified destination address in Email Routing, and nothing in this
  repository can assert that.** It is a name resolved in the Cloudflare dashboard, the same class of fact as the
  observability destinations ([26](0026-observability-is-cloudflares-exported-to-better-stack.md)). Until the
  verification mail that arrives through the existing forward is answered, **every send is refused**, and the
  failure mode is a `Delivery` 502 carrying the platform's own reason into Better Stack while the visitor is told
  only that the message could not be sent. That is the first place to look when the form stops working.
- **Local development has no Email Routing, so the form answers 502 there.** `pnpm wrangler:dev` binds no
  `send_email`, and the repository answers `Delivery` when the binding is absent rather than pretending to send.
  "It did not work locally" therefore proves nothing, exactly as it does for the rate limiter.
- **The deploy still needs no secret and no new workflow input.** That is the property being bought, and it is what
  makes rotating nothing possible: there is nothing to rotate. Replacing this with any provider gives it back.
- **The published privacy policy grows a section, and both store declarations grow two rows.** The policy in
  [`web/src/pages/privacy.astro`](../../web/src/pages/privacy.astro) now says what a Contact Message carries, where it
  travels and that nothing is stored on the server; it also had to soften the app section's claim that we operate no
  server receiving personal data, which this makes false. Google Play's *Data safety* form needs
  **Personal info → Name, Email address** and **Messages → Other in-app messages**, and the form has to be
  resubmitted: [28](0028-telemetry-consent-is-asked-twice-and-answered-asymmetrically.md) is where that table lives
  and it now carries them. They are also the only rows no consent switch governs, because a Contact Message is sent
  when a person presses Send. This
  is the part that is hard to reverse, for the same reason [28](0028-telemetry-consent-is-asked-twice-and-answered-asymmetrically.md)
  gives: a declared data type that stops being collected has to be re-declared, and the declaration is public.
- **The five-a-minute limit is shared by every visitor behind one address.** A campus or an office NAT can exhaust
  it for everybody, and the answer is a 429 rather than a queue. That is accepted: a mailbox is a worse thing to
  lose than a form submission is to retry.
- **The message-length contract now exists in two languages**, and the docs contract diffs them the way it already
  diffs the Embed contract ([20](0020-the-cell-geometry-is-the-apps-in-three-languages.md) is the same shape for
  geometry). Change a limit in one and the test fails until the other agrees.
- Where this bites: the [pages guide](../../web/src/pages/CLAUDE.md), the
  [web infrastructure guide](../../web/src/infrastructure/CLAUDE.md), the
  [app infrastructure guide](../../app/lib/infrastructure/CLAUDE.md), the Deploy section of
  [`CLAUDE.md`](../../CLAUDE.md), and [`docs/wiki/API-Reference.md`](../wiki/API-Reference.md).
