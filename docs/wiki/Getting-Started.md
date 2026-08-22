# Getting Started

There's nothing to install to use ContribKit; it works with any public GitHub username. Pick the path that fits you.

---

## 1. Use the web app

1. Open **[contribkit.app](https://contribkit.app)**.
2. Type a GitHub username and hit **render**.
3. Tweak the **palette**, **shape**, and **background** in the customizer.
4. Pick a **year** (anything from 2005 to today) or keep the latest rolling year.
5. Copy or export from the **export** section (PNG, SVG, or Markdown).

No login and no token: ContribKit only reads **public** contribution data.

### What you can customize

| Option | Choices |
|--------|---------|
| Palette | GitHub, Catppuccin, Nord, Dracula, Gruvbox, Sunset, Tokyo Night, One Dark, Rosé Pine, Solarized, Monokai |
| Shape | rounded, square, circle, dot, hex |
| Background | transparent, any hex (`#101010`), or a CSS color name |
| Year | any integer from **2005** to the current year |

---

## 2. Embed it in your README

The simplest embed renders your calendar live every time someone views your profile:

```markdown
![contributions](https://contribkit.app/user/YOUR_USERNAME.svg)
```

With customization:

```markdown
![contributions](https://contribkit.app/user/YOUR_USERNAME.svg?palette=catppuccin&shape=hex&background=transparent)
```

Unknown option values silently fall back to the default, so the image never breaks. See **[API Reference](API-Reference)** for every parameter.

---

## 3. Install the mobile app

1. Install from **[Google Play](https://play.google.com/store/apps/details?id=com.fbuireu.contribkit)** (App Store coming soon).
2. Enter your username.
3. On Android, add a **Home Screen Widget**: small (streak counter) or medium (grid, streak and total). iOS has none: the app carries no WidgetKit extension.

Widgets refresh once a day in the background. See **[Mobile App](Mobile-App)** for details.

---

## 4. Run it locally

ContribKit is a pnpm-workspace monorepo (`web/`, `app/`, `shared/`).

**Prerequisites:** Node `26.7.0` (the same in the root `engines`, in `web/engines` and in `web/.nvmrc`, which is what CI installs) plus `pnpm@11.21.0`, and, for the app, Flutter `3.47.0` / Dart `3.13.0` exactly as pinned in `app/pubspec.yaml`. [lefthook](Git-Hooks) comes with `pnpm install`, which wires the local checks up for you.

To work on the **web** app:

```bash
pnpm install        # from the repo root
cd web
pnpm dev            # generates wrangler types, then starts Astro
```

To work on the **Flutter app**:

```bash
cd app
flutter pub get
flutter run --dart-define-from-file=dart-defines.json
```

If you edit design tokens in `shared/`, run `pnpm sync:assets` so the app picks them up. See **[Project Structure](Project-Structure)**, **[Web Application](Web-Application)**, **[Mobile App](Mobile-App)**, and **[Git Hooks](Git-Hooks)**.

---

## Next steps

- **[How It Works](How-It-Works)** explains what happens between a username and a rendered calendar.
- **[API Reference](API-Reference)** lists the endpoints and query parameters.
- **[Troubleshooting](Troubleshooting)** helps when a calendar doesn't render.
