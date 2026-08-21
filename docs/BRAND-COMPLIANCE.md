# Brand Compliance

How this app implements **ATT - BRAND STYLEGUIDE UPDATE 2025 v1.1**, page by
page, plus the three places where a field-safety application has to depart from
the guide and why.

Everything below is enforced in `css/app.css` (tokens at the top of the file),
`js/components/logo.js`, and the icon set in `icons/`.

## 1. Logo (guide pages 2-7)

The mark is **not a redraw**. The three concentric ring paths in
`js/components/logo.js` were extracted as exact vectors from the EPS artwork
embedded in the style guide PDF, so the geometry is bit-identical to the master
artwork. The same source produced:

| Asset | Contents | Used for |
|---|---|---|
| `icons/at-symbol.svg` | Symbol, three brand colours | Browser favicon |
| `icons/at-logo.svg` | Full primary lockup, symbol + wordmark | Launch screen, PDF export header |
| `js/components/logo.js` | Inline symbol, colour and mono variants | Top bar |
| `icons/icon-*.png`, `maskable-*.png`, `apple-touch-icon.png` | Mono symbol on Dark Gunmetal | Home Screen / install icons |

Applications follow the guide:

* **Top bar** uses the **mono white** symbol on Independence — page 5/6 show the
  mono treatment wherever the ground is dark, and the colour version's outer
  ring is Independence, which would vanish on an Independence bar.
* **Launch screen** (survey selection) carries the **full primary lockup** in
  colour on white, which is the guide's default presentation (page 2).
* **Home Screen icon** is the mono symbol on Dark Gunmetal, matching the guide's
  own dark cover treatments (pages 14, 22).
* **Clear space** (page 4) is respected: the top-bar mark sits in a 40px box at
  26px, giving well over the specified 2x margin; the launch-screen lockup has
  its own padded row.
* Minimum size: the guide's 4 cm print minimum does not translate to screens.
  The lockup renders at 260 px wide, the symbol never below 26 px, and both stay
  legible because they are vectors.
* The mark is never recoloured, stretched, rotated, or placed on a texture.

Regenerate the icon set after any logo change:

```bash
python make-icons.py
```

(kept in the session scratchpad; the source of truth is `icons/at-symbol.svg`)

## 2. Colour (guide page 8)

Every palette colour is declared verbatim as a CSS custom property, then mapped
to a semantic role:

| Guide name | Hex | Role in the app |
|---|---|---|
| Independence | `#425563` | `--chrome` — top bar, section ribbon; PDF headings |
| CG Blue | `#0076A8` | `--primary` — CTAs, progress bar, active nav, links, tick marks |
| Philippine Gray | `#888B8D` | Signature placeholder, PDF secondary labels |
| Dark Gunmetal | `#1A232B` | `--on-surface` body text; dark-theme ground; icon ground; toasts |
| Jet Stream | `#BCCED6` | Top-bar subtitle, "N/A" selected state, not-started badge |
| Spiro Disco Ball | `#22C4FB` | Confirmed answers (`--done`), completion ticks, dark-theme primary |
| Deep Saffron | `#FC8F2E` | In-progress badges, offline pill, warning banner |
| Flame | `#E55526` | Faults: delete controls, error toasts, destructive actions |

### Status colours

The palette contains no green and no red, so checklist status does **not** use
the traffic-light convention the Android app had:

| State | Colour | Also signalled by |
|---|---|---|
| Answered / done | Spiro Disco Ball fill, Dark Gunmetal text, 2px border | Filled check-circle icon |
| Not required | Jet Stream fill, Independence border | The "N/A" label itself |
| Section complete | — | Spiro tick icon in the ribbon |
| Section in progress | Deep Saffron badge | The `answered/total` count |
| Section not started | Jet Stream badge | The `0/total` count |
| Fault / destructive | Flame | Icon plus explicit wording |

Status is never carried by hue alone — every state has an icon or a number
beside it. That is a hard requirement for a safety checklist and it also makes
the app usable for colour-blind technicians.

The unselected → selected transition on the Done button is CG Blue → Spiro Disco
Ball, a jump in both hue and lightness, so a technician in bright sun can see at
a glance which items are answered.

### Two derived shades

Deep Saffron reaches only **2.3:1** against white and Flame **3.7:1**, both
below the WCAG AA 4.5:1 needed for body text. Where either is used as small text
on a light ground, the app substitutes a darker shade of the same hue:

| Token | Hex | Contrast on white | Used for |
|---|---|---|---|
| `--flame-shade` | `#B33C15` | 5.9:1 | Destructive text and filled destructive buttons |
| `--saffron-shade` | `#A85E12` | 4.9:1 | Warning values on the diagnostics screen |

Both palette colours are still used unmodified as **fills** (badges, banners,
the offline pill), where dark text on top of them measures 6.9:1 and 7.9:1.

Measured contrast for every pair the UI actually renders:

| Pair | Ratio | WCAG |
|---|---|---|
| White on Independence | 7.75:1 | AA |
| Jet Stream on Independence | 4.77:1 | AA |
| White on CG Blue | 5.05:1 | AA |
| Dark Gunmetal on Spiro Disco Ball | 7.85:1 | AA |
| Dark Gunmetal on Deep Saffron | 6.90:1 | AA |
| Dark Gunmetal on Jet Stream | 9.81:1 | AA |
| CG Blue on white | 5.05:1 | AA |
| White on `--flame-shade` | 5.88:1 | AA |

## 3. Gradients (guide page 9)

Not used. The guide restricts gradients to "luxury or special celebration
content" and warns they must not compete with content contrast. A checklist read
in direct sunlight needs flat, maximum-contrast fields. Flat brand colour is
used throughout instead.

## 4. Typography (guide page 10)

| Guide role | Guide face | In the app |
|---|---|---|
| Headers, buttons, CTAs (capitals only) | Acumin Variable Concept Italic, condensed/extracondensed | `--font-display`, applied italic + uppercase |
| Text box, small texts | Montserrat | `--font-body` |

Applied as display type: top-bar title and subtitle, page titles, section
headings inside the checklist, all buttons and CTAs, ribbon tabs, bottom-nav
labels, field labels, settings section headers, dialog titles, progress labels,
the offline pill, and the PDF export headings.

Applied as body type: question text, descriptions, notes, report text,
diagnostics values, and every text input.

**Question text stays in Montserrat on purpose.** It is content, not a header,
and the guide reserves the display face for capitals — a 47-question checklist
set in condensed italic capitals would be materially harder to read in the
field. This is the one typographic judgement call in the build.

### Font substitution — needs a decision

**Acumin is not in this repo.** It is an Adobe-licensed family, available
through Adobe Fonts or the brand folder package, and it cannot be redistributed
in a source repository. The app ships **Barlow Condensed Italic** in its place:
the same condensed italic grotesque proportions, open licence (SIL OFL),
self-hostable.

To switch to the real face:

1. Obtain `Acumin Variable Concept` condensed italic as WOFF2 (Adobe Fonts web
   project, or convert from the brand folder package if the licence permits
   self-hosting).
2. Drop the files into `fonts/`.
3. Add matching `@font-face` rules at the top of `css/app.css`.
4. Add the filenames to the `SHELL` array in `sw.js` so they cache offline.

No other change is needed — `'Acumin Variable Concept'` is already first in
`--font-display`, so it takes over the moment it loads.

Both faces are **self-hosted**, latin subset, ~157 KB total. A webfont CDN was
rejected deliberately: this app must render correctly with no network, and a
CDN-hosted brand face silently degrades to a system font exactly when a
technician is off-grid.

## 5. Photography, textures, 3D assets (guide pages 11-13)

Not used, and deliberately so. The guide's own instruction is that background
imagery must not compromise contrast; this is a data-entry tool read outdoors,
often in gloves and glare. Screen space goes to controls.

The one motif carried across is page 13's **"playful and modern circular
containers"**: every button, badge, tab, toggle and progress bar is a pill, and
cards use a 14 px radius.

## 6. What was replaced

The pre-brand build used Material 3 Indigo/Blue with a warm cream "sun mode".
Everything below changed:

| Element | Before | After |
|---|---|---|
| Chrome | Indigo `#1A237E` | Independence `#425563` |
| Primary | Blue `#1565C0` | CG Blue `#0076A8` |
| Done state | Green `#2E7D32` | Spiro Disco Ball `#22C4FB` |
| In progress | Orange `#F57C00` | Deep Saffron `#FC8F2E` |
| Not started | Red `#B71C1C` | Jet Stream `#BCCED6` |
| Error | Material red `#B3261E` | Flame `#E55526` / `#B33C15` |
| Body type | System sans | Montserrat |
| Display type | System sans | Acumin (Barlow Condensed stand-in) |
| Sun mode | Cream `#FFFDE7` | Pure white, black text — brand-compliant *and* higher contrast |
| Button shape | 8 px radius | Pill |
| App icon | Generic turntable glyph | Real Australian Turntables symbol |
| `theme_color` | `#1A237E` | `#425563` |

## 7. Open items for sign-off

1. **Acumin licence.** Confirm whether the company's Adobe licence allows
   self-hosting the WOFF2, or whether Barlow Condensed stays as the shipped
   face. Until then the app is brand-*compatible* rather than brand-exact on
   the display face.
2. **Derived shades.** Approve `#B33C15` and `#A85E12` as accessibility shades
   of Flame and Deep Saffron, or supply preferred darker values from the brand
   team.
3. **Status colour convention.** Confirm that Spiro Disco Ball reading as
   "done" (in place of green) is acceptable to field staff — worth a specific
   question during the field trial in `TESTING.md`.
4. **Application name.** The app is titled "Site Reporter" inside an Australian
   Turntables shell. Confirm whether it should be presented as
   "Australian Turntables Site Reporter" in the manifest and install prompt.
