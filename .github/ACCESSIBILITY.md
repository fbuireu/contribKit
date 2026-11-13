# Accessibility

ContribKit draws a GitHub contribution calendar three ways: a web app at [contribkit.app](https://contribkit.app),
an image to embed in a README, and an Android app with home-screen widgets. Each should work with a keyboard or a
screen reader, with large text, and in a light or dark theme. This page says what each does toward that, what is
and is not tested, how to report a barrier, and what a pull request has to keep working.

## The web app

- **A skip link.** The first Tab stop jumps past the header to the main content.
- **A declared language.** The page declares English, so a screen reader reads it with the right voice.
- **Pickers that behave like pickers.** The palette and cell-shape choices are radio groups and the export formats
  are tabs. Tab enters a group and the arrow keys move within it. The option that looks selected is the one a
  screen reader reports as selected, because both change in the same step.
- **Spoken changes.** The calendar preview, an error in the username field and the contact form's result are
  announced when they change.
- **A named calendar.** The drawn calendar is an image named "GitHub contribution calendar".
- **Less motion.** Animations and transitions stop when your system's reduce-motion setting is on.
- **Light and dark themes.** The page follows your system until you pick one.

## The README image

The Markdown snippet the web app copies gives the image the alt text *contributions*. That is what a screen reader
reads in your README, not the calendar's numbers. Change the alt text to say whose calendar it is, and write any
number that matters as text next to the image.

## The Android app

- **Every control says what it is.** Each tappable control has a label and a role, and says whether it is selected,
  switched on or disabled. Icon-only buttons have a label of their own.
- **Text follows your font size.** Rows wrap or truncate instead of clamping the size you set in Android.
- **Light and dark themes.** The app follows your system unless you pick one in its settings.

## What is tested

- The web app's end-to-end tests run on every pull request in desktop Chromium and desktop WebKit, the engine
  behind Safari. Phones and tablets are not part of these runs.
- An accessibility test checks the app's Viewer, Customizer, Export, Contact, Tip Jar and Privacy screens against
  Flutter's guidelines for tap-target size on Android and iOS, text contrast and labelled controls. A text-scaling
  test renders the same screens at 1x, 1.3x, 2x and 3x text on two small phone sizes, and fails if anything
  overflows. Both run in CI whenever the app changes.
- The app supports Android 12 and later. The same code builds for iOS, but no iOS app is released.
- No screen reader, voice control or switch access is tested on a schedule, and no automated accessibility scan of
  the web app runs in CI. Reports from people who use them are the main way barriers there come to light.
- Neither the web app nor the Android app has been audited against WCAG, so this page makes no conformance claim.

## Known barriers

Barriers already found are tracked as
[open issues with the `accessibility` label](https://github.com/fbuireu/contribKit/issues?q=is%3Aissue%20state%3Aopen%20label%3Aaccessibility).

## Reporting a barrier

If part of the web app, the image or the Android app is hard or impossible for you to use,
[open a bug report](https://github.com/fbuireu/contribKit/issues/new?template=bug_report.yml). Without a GitHub
account, use the [contact form](https://contribkit.app/contact) or the Contact sheet in the app, and say the
message is about accessibility. You don't need to say anything about a disability.

Include as much of this as you can:

- What you were trying to do, and what happened instead.
- Where: the page URL, or the app screen or widget.
- Your browser and operating system, or your device, Android version and app version, in the form's *Browser, or
  device and OS version* field.
- Any assistive technology you use, such as TalkBack, a screen reader, a magnifier or Switch Access, and its
  version. It goes in the same field.
- Settings that change how things look or move: font or display size, zoom, high contrast or forced colours, dark
  mode, reduced motion or removed animations.
- A screenshot or recording, if you're comfortable sharing one.

### What happens next

- The issue gets the `accessibility` label, so it joins the list above.
- Questions about missing details, and a workaround when there is one, come in the issue.
- No date is promised for a fix. The fix links the issue, which closes when it ships.

## For contributors

A change to either client keeps the above working:

- In the app, follow `A34` to `A36` in [CODING_STANDARDS.md](../CODING_STANDARDS.md): a label and a role on every
  tappable control, a label on every icon-only button, and text left free to scale. A new sheet joins both the
  accessibility test and the text-scaling test.
- On the web, follow `W42` and `W43`: set the selected state and its styling in the same function, and make a call
  to action that navigates a link.
- Before opening a pull request that changes the web UI, use it with the keyboard alone: every control reachable
  with Tab, operable with Enter, Space or the arrow keys its pattern expects, and focus visible throughout. For an
  app change, try it with TalkBack and at the largest font size.
- If a change adds a barrier it cannot avoid, say so in the pull request and open an issue with the
  `accessibility` label.

## Ownership

[Ferran Buireu](https://github.com/fbuireu) maintains the web app, the Android app and this page. The page changes
in the same commit as the behaviour it describes.

## Feedback on this page

If something here is wrong, unclear or missing,
[open a documentation issue](https://github.com/fbuireu/contribKit/issues/new?template=documentation.yml). To
report a barrier, see [Reporting a barrier](#reporting-a-barrier).
