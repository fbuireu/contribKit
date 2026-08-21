# ContribKit

ContribKit renders a GitHub user's public contribution calendar as a customizable image that can be viewed, exported, embedded, or pinned to a phone's home screen.

This is the language the web and the mobile app are meant to share. It is prescriptive: where the code still says something else, the code is the thing that is wrong. Known departures that are deliberate rather than pending are recorded in `docs/adr/`.

## Contribution Data

**Contribution**:
A single recorded activity on a GitHub account on a given date. Never a synonym for the square that represents it.

**Contribution Day**:
One calendar date belonging to a user, carrying its contribution count and its level. The unit of data the calendar is built from.
_Avoid_: cell, day entry, contribution entry

**Contribution Week**:
Seven consecutive Contribution Days forming one column of the calendar, starting on Sunday.
_Avoid_: column

**Contribution Calendar**:
The full set of a user's Contribution Days for one Year, together with their Total Contributions. The central concept of the product.
_Avoid_: chart, graph, heatmap, contribution graph

**Count**:
The exact number of contributions on a Contribution Day. Unknown for some days, which is distinct from a known zero.
_Avoid_: contributions, amount, value

**Total Contributions**:
The sum of every known Count in a Contribution Calendar.
_Avoid_: total, sum, contributions count

**Contribution Level**:
The intensity band of a Contribution Day, from none through low, medium, high, to very high. It determines which Palette color the day is painted with.
_Avoid_: intensity, bucket, tier, shade, heat

**Contribution Stats**:
Aggregate figures derived from a Contribution Calendar — streaks, best day, best month, weekly average, and active days.
_Avoid_: metrics, summary, cell summary, analytics

**Streak**:
A run of consecutive Contribution Days that each have at least one contribution. The current streak ends today; the longest streak is the largest ever recorded in the calendar.
_Avoid_: run, chain

## Identity and Scope

**Username**:
The handle identifying a GitHub account whose calendar is being rendered. Valid on construction — an invalid handle never becomes a Username.
_Avoid_: user, handle, account, profile, login

**Suggested Username**:
One of the curated handles offered to a visitor who has not typed one of their own, so the product is never shown empty.
_Avoid_: example user, demo user, default user, featured user

**Year**:
The single calendar year a Contribution Calendar covers. Bounded below by 2005, the earliest year the product accepts.
_Avoid_: period, range, timeframe

## Appearance

**Palette**:
A named set of colors that gives the calendar its look: one per Contribution Level, plus a lighter variant of the none color for use against a light background. Identified by a stable key, distinct from the name shown to a person.
_Avoid_: theme, color scheme, colorway, skin

**Cell**:
The single rendered square standing for one Contribution Day. A Cell is the visual form; the Contribution Day is the data behind it.
_Avoid_: tile, box, pixel — and "square" or "dot" as a name for the Cell itself, which is what they name the *shape* of.

**Cell Tooltip**:
The transient label revealing a Contribution Day's date and Count when its Cell is pointed at or focused. Never shortened to "tip", which in this domain means a payment.
_Avoid_: cell tip, tip, hint, popover

**Cell Shape**:
The geometry every Cell is drawn with — rounded, square, circle, dot, or hex.
_Avoid_: shape kind, ShapeKind, style, form

**Cell Size**:
How large each Cell is drawn, and the gap left between neighbours. Chosen from a small set of named sizes rather than typed as a number.
_Avoid_: scale, density, zoom, grid preset

**Background**:
What sits behind the calendar when it is rendered — a color, or nothing at all so whatever is underneath shows through.
_Avoid_: card background, backdrop, canvas, fill

**Background Preset**:
One of the curated Backgrounds offered by name rather than typed as a color. Identified by a stable key with a separate display label, the same way a Palette is.
_Avoid_: background option, card background, preset color

**Calendar Labels**:
The month strip along the top of the Contribution Grid and the weekday strip down its side, which can be shown or hidden.
_Avoid_: axis, headers, legend, DOW

**Contribution Grid**:
The fixed lattice of Contribution Weeks the calendar is laid out on, including the leading and trailing days needed to make whole weeks. Always the same dimensions regardless of the Year requested.
_Avoid_: matrix, board, layout, table

## Delivery

**Viewer**:
The place a person looks at a rendered Contribution Calendar and changes whose calendar it is.
_Avoid_: home, main screen, dashboard

**Customizer**:
The place a person changes a calendar's Palette, Cell Shape, Cell Size, and Background.
_Avoid_: customize, settings, options, editor, controls

**Export**:
Producing a standalone artifact of a rendered Contribution Calendar that a person can save or share.
_Avoid_: download, save, render out

**Export Format**:
The form an Export takes — an image, a vector, or a snippet of markup.
_Avoid_: output type, file type, extension

**Embed**:
A live reference to a user's Contribution Calendar placed in someone else's document, which re-renders with current data every time it is displayed. Unlike an Export, it is never a fixed copy.
_Avoid_: link, badge, hotlink, remote image

**Home Screen Widget**:
The small always-visible surface on a phone's home screen showing a user's calendar or streak without opening the app. Always qualified — never bare "widget", which means a unit of UI construction.
_Avoid_: widget, applet, tile, glance

## Support

**Tip**:
A voluntary one-off payment a person makes to support the project. Buys no feature, unlocks nothing, and is never a purchase, subscription, or donation to a cause.
_Avoid_: donation, purchase, IAP, contribution, support payment

**Tip Product**:
One named amount a Tip can be given at, as offered by the platform's store.
_Avoid_: tier, package, SKU, product, offering

**Tip Jar**:
The place a person chooses a Tip Product and pays.
_Avoid_: paywall, store, shop, support page
