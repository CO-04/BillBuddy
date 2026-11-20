# 🧾 BillBuddy

**Split smart. Tip happy.**

BillBuddy is a free service-fee and bill-split calculator for South African
Rand (ZAR). Enter the bill, how many people are sharing, and your tip range —
BillBuddy finds the fee percentage that lands everyone's share on a nice
round number. No more awkward 37-cent EFTs.

The entire app is **one `index.html` file** that runs completely in your
browser: no sign-ups, no servers, no tracking, nothing installed.

## ✨ Features

- 🎯 **Smart tip optimiser** — searches every 0.01% step in your fee range
  (default 10–12%) to make each share a clean multiple of R1, R2, R5 or R10.
- 🔢 **Exact to the cent** — all money maths uses integer cents; shares
  always add up to the total, and anyone carrying an extra cent is shown
  honestly.
- ✅ **Honest labels** — results are marked as an *exact match* only when
  every single person pays the same round amount; otherwise it's a clearly
  explained *near match*.
- 📊 **Compare options** — up to four alternative fees with distinct totals,
  plus the standard 10% tip always pinned for reference.
- ✍️ **Manual mode** — prefer to pick the fee yourself? Same exact maths,
  clearly labelled.
- 👥 **Who pays what** — per-person breakdown with optional names and
  one-tap copy of any individual's payment.
- 💬 **Share anywhere** — copy the summary or send it to WhatsApp with one
  tap (you always press send yourself — nothing is sent automatically).
- 💾 **Remembers your preferences** — fee range and increment are saved
  locally on your device only.
- 📱 **Mobile-first and accessible** — works from 320px phones to desktops,
  fully keyboard operable, screen-reader announcements, reduced-motion
  support.

## 🚀 Try it

### Example

| Input | Value |
|---|---|
| Bill | R1,500.00 |
| People | 5 |
| Fee range | 10% – 12% |
| Round shares to | R5 |

**Result:** 10% fee → R150.00 tip → **R1,650.00 total → R330.00 each** —
an exact R5 match. 🎯

### Run it

- **Live site:** publish with GitHub Pages — see
  [PUBLISH-GUIDE.md](PUBLISH-GUIDE.md) for click-by-click steps.
- **Locally:** just open `index.html` in any modern browser.
  (Clipboard copying works best over HTTPS or localhost; the calculator
  itself works everywhere, even offline.)

## 🛠️ Tech notes

- Single self-contained HTML file: semantic HTML + CSS + vanilla
  JavaScript, inline SVG logo, system fonts. No frameworks, build step,
  CDN or runtime dependencies.
- Money is computed in **integer cents** and percentages in **basis
  points** (10.25% = 1025), so there is no floating-point drift. The
  service fee is rounded once, half-up, to the nearest cent.
- Supported limits: bills R0.01 – R10,000.00 · 1–10 people ·
  fees 0–30% in 0.01% steps.
- Preferences use `localStorage` under the `billbuddy:` namespace; the app
  degrades gracefully when storage or the clipboard is unavailable.

## 🧪 Tests

Development-only tests exercise the exact same script the page runs
(extracted straight out of `index.html`), using Node's built-in test
runner — no frameworks:

```powershell
node --test tests/core.test.js
```

Covers the exact-match example, near-match ranges, boundary and decimal
percentages, tie-breaking rules, half-cent rounding, remainder splitting,
manual mode, and input validation.

## 📂 Repository layout

| Path | Purpose |
|---|---|
| `index.html` | The complete app — the only file needed to run or publish |
| `tests/core.test.js` | Development test suite |
| `PUBLISH-GUIDE.md` | Step-by-step GitHub Pages publishing guide |

---

Made with ♥ — everything runs right in your browser.
