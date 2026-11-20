# BillBuddy: Single-File HTML App

## GitHub Copilot build prompt

Copy the prompt below into GitHub Copilot Agent Mode in VS Code.
It replaces the earlier multi-file PWA approach with a self-contained
web page that can be hosted on GitHub Pages.

---

## Project and role

Act as a senior front-end developer and UI/UX designer.

Build **BillBuddy**, a lightweight service fee and bill split calculator
for South African Rand (ZAR).

Brand personality: **fun and catchy, while modern and professional**.
Tagline: **Split smart. Tip happy.**
Use teal as the primary colour, amber accents, rounded cards, generous
spacing and large, easy-to-read payment amounts.

I am learning software development. Explain important decisions in plain
language and build in phases, waiting for my approval after each phase.

## 1. Mandatory delivery format

Deliver the entire working app as **one self-contained `index.html` file**:

- Semantic HTML for structure.
- All CSS inside a `<style>` element.
- All JavaScript inside a `<script>` element.
- Inline SVG for branding and icons where needed.
- System fonts; no remote font downloads.
- No frameworks, npm dependencies, build step or CDN resources.
- No external CSS, JavaScript, image files or runtime imports.
- No backend, database, accounts, API keys or analytics.
- A single responsive page, not multiple pages or routes.

The only file required to run or publish the app must be `index.html`.
Documentation and development tests may live separately, but must not
be runtime dependencies.

Inspect the existing workspace and read relevant files before editing.
Reuse useful existing work, including BillBuddy branding and calculation
contracts. Do not delete the existing scaffold or unrelated files.
Consolidate the app into `index.html`; make sure it no longer depends on
the existing CSS, JavaScript, manifest or icon files.

Keep code organised within the file:

1. Design tokens and styles.
2. Semantic interface markup.
3. Pure money, validation, optimisation and splitting functions.
4. Storage and sharing helpers.
5. DOM rendering and event handling.

Use clear functions rather than mixing calculations into event handlers.
Do not create an unnecessarily elaborate architecture just because the
app is in one file.

## 2. Hosting and local preview

Make the app compatible with **GitHub Pages**, including project sites
served at `https://USERNAME.github.io/REPOSITORY/`.

- Do not assume the site is hosted at the domain root.
- Do not require server-side code or special rewrite rules.
- The app must work when only `index.html` is published.
- Explain that GitHub Pages serves the website; simply viewing an HTML
  file on github.com is not the same as opening the live app.
- Do not create a repository, push code or enable public hosting without
  my explicit approval.
- Explain that publishing a public repository exposes its source code;
  never include private information or credentials.

Allow a basic preview by opening `index.html` directly in a browser.
The core calculator must work in that mode. Clipboard and storage
capabilities can vary for file URLs, so detect failures and explain them
to the user rather than claiming they always work.

Also provide localhost instructions using the existing local server
command if available, and validate the final app over HTTP.
GitHub Pages provides HTTPS, which supports secure-context features
such as the Clipboard API.

### PWA scope

This version is a single-file web app, **not a full offline PWA**.
Do not add a manifest or service worker dependency, and do not promise
installability or reliable offline reloads from GitHub Pages.

A downloaded HTML file can run its core calculator without a network.
That is different from a hosted site supporting offline navigation.
If I later request a proper installable offline PWA, explain that we
will need to relax the strict single-file requirement to add the
necessary manifest, service worker and icons.

## 3. Calculator inputs and validation

Include:

1. Original bill amount in ZAR.
2. Number of people sharing the bill.
3. Minimum service fee percentage, default 10%.
4. Maximum service fee percentage, default 12%.
5. Target increment: R1, R2, R5 or R10; default R5.
6. Automatic optimisation or manual service fee selection.

Rules:

- Bill amount must be positive, with at most two decimal places.
- People must be a positive whole number.
- Fee percentages must be between 0% and 30%, inclusive.
- Minimum must not exceed maximum.
- Accept fee percentages in steps of 0.01%.
- Manual fees must stay inside the configured minimum and maximum.
- Reject empty, negative, non-finite and malformed values.
- Reject unsupported increments.
- Define and display sensible supported upper limits for money and
  people before implementation; explain and get approval for those limits.
- Do not silently clamp or replace invalid user input.
- Show helpful field-specific errors and remove or clearly mark stale
  results when current inputs are invalid.

Provide useful starting values, such as R1,500 and five people, so I can
immediately try the example after the calculator is implemented.

## 4. Money accuracy and optimisation

All monetary calculations must use **integer cents**.
Represent percentages as integer basis points: 10.25% = 1025.

Parse decimal input deliberately; avoid floating-point arithmetic for
money. Round the calculated service fee once to the nearest cent using
a documented half-up rule, then add it to the original bill.
Guard intermediate calculations against exceeding JavaScript's safe
integer range, or use BigInt consistently for the exact arithmetic.

Search every basis point in the user's inclusive fee range (at most
3,001 candidates for 0%-30%). Do not test only whole percentages.

For each candidate:

1. Calculate the service fee in cents.
2. Calculate the total bill including the service fee.
3. Determine the equal share without prematurely rounding it.
4. Find the nearest multiple of the selected increment.
5. Calculate the distance from that target.
6. Calculate actual cent-accurate individual payments.

Use exact integer comparisons for ranking, even when the theoretical
equal share contains fractions of a cent. For example, compare the
distance between the total and `people * targetCents`; dividing this
distance by the number of people is only necessary for display.
Define a deterministic nearest-target tie rule.

### Exact matches and ranking

An exact match requires the total to be divisible by
`people * incrementCents`. This ensures **every actual payment** is
the same exact multiple of the increment.

Do not label a rounded average as exact when distributed cents mean
individual payments differ.

Rank candidates by:

1. Exact matches first.
2. Smallest distance from the nearest target.
3. Fees inside the preferred 10%-12% band.
4. Lower fee when otherwise tied.

The preferred band never overrides a better distance or the user's
configured bounds.

Show the recommendation and up to four useful alternatives. Avoid
cluttering the comparison with multiple fee percentages that produce
the same final bill; keep the best-ranked representative of each total.
If only one distinct total exists, say no distinct alternatives are
available rather than fabricating them.

Example:

- Bill: R1,500.00.
- People: 5.
- Fee range: 10%-12%.
- Target increment: R5.
- Recommendation: 10%, R150.00 tip, R1,650.00 total.
- Each person: R330.00, an exact R5 match.

When no exact match exists, show the closest available result and
label it honestly as a near match. If a nonzero distance would round
to R0.00 on display, show enough precision or say "less than R0.01";
never imply that it is exact.

Manual mode must use the same validated money and splitting functions,
but label the fee as manually selected rather than optimised.

## 5. Results and payment splitting

Display prominently:

- Original bill before the tip.
- Recommended or manually selected fee percentage.
- Service fee amount.
- Total including the service fee.
- Number of people.
- Per-person payment, or the payment range when shares differ.
- Nearest target for the chosen increment.
- Distance of the theoretical equal share from that target.
- Exact or near-match status.

Include a responsive alternatives comparison with selectable
alternatives. Selecting one must update all dependent totals, shares
and sharing text together.

Split the final total in integer cents:

- Each person starts with the whole-cent quotient.
- Give one extra cent to the first people until the remainder is used.
- All individual shares must sum exactly to the total.
- Shares must differ by no more than one cent.
- Clearly explain any extra-cent distribution.

Example: R1,001.00 divided among three people must produce
R333.67, R333.67 and R333.66.

Show each person's payment and allow optional names. Treat names as
plain text; never inject user or stored content using unsafe HTML.

### Out of scope for this version

Do not add accounts, payment collection, unequal item-based splits or
bundled payments. Bundling people may be added later by summing their
actual distributed shares, not recalculating a rounded average.

## 6. Interface and accessibility

Make BillBuddy feel like a polished mobile utility, not a spreadsheet:

- Mobile-first layout, comfortable on phones, tablets and desktops.
- No horizontal page overflow at 320 CSS pixels.
- Visible labels, clear headings and accessible input descriptions.
- Touch-friendly controls, ideally at least 44 by 44 CSS pixels.
- Visible keyboard focus and complete keyboard operation.
- Sufficient text/background contrast.
- Green styling plus text for exact matches.
- Neutral styling plus text for near matches; never rely on colour alone.
- Accessible announcements for results, errors and copy feedback.
- Reduced-motion support if animations are used.
- No external assets needed for the design.

Keep advanced settings and history unobtrusive, using expandable
sections where helpful. Do not sacrifice clarity for decorative effects.

## 7. Reset, sharing and local persistence

Include:

- Reset calculator to documented defaults.
- Copy the selected calculation to the clipboard.
- Share the selected calculation through WhatsApp.
- Copy or share an individual's actual payment.
- Save preferred fee range and increment locally.
- Calculation history in localStorage, newest first, capped at 20 entries.
- Restore a history entry and clear history with confirmation.

Save history only on an explicit calculation action, not every keystroke.
Store validated serialisable data; if using BigInt internally, convert
it safely for storage and reconstruct it after validation.
Use the existing `billbuddy:` storage namespace where compatible.

Handle unavailable storage, corrupted entries and clipboard failures
explicitly, with a useful notice. The calculator must still work without
persistence. Do not show "copied" unless copying actually succeeded;
offer selectable text for manual copying if necessary.

Build WhatsApp links using correctly URL-encoded text. Sharing is a
user-triggered external action that requires connectivity; do not
automatically send data anywhere.

Share text must include the selected fee, tip, total and actual shares.
If payments differ, list those differences rather than claiming
everyone pays a rounded average. No actual payment processing is required.

## 8. Verification

Test the pure calculation functions independently of the DOM.
Use existing tooling where suitable; do not add frameworks just to test
this small app. Development-only test files are allowed, but publishing
the app must still require only `index.html`.

Automated checks must exercise the same calculation implementation
used by the page, not a separate copy of it.

Cover:

- The R1,500 / five people / 10%-12% exact-match example.
- A range with no exact match.
- Decimal fee percentages and inclusive boundary percentages.
- Preferred-band and lower-fee tie-breaking.
- No results outside the configured range.
- Small bills, large supported bills and invalid values.
- Half-cent service fee rounding.
- Fractional-cent equal shares that must not be labelled exact.
- R1, R2, R5 and R10 target increments.
- Splits with remainders and shares summing exactly to the total.
- Manual mode and selecting alternatives.
- Distinct alternatives when multiple percentages yield the same total.

Verify in a browser:

- Phone and desktop layouts, keyboard access and validation.
- All result fields stay consistent when inputs or selections change.
- Copy success and failure paths, and encoded WhatsApp sharing text.
- Settings/history persistence and unavailable-storage behaviour.
- Core calculation when opening the HTML file directly.
- The app works over localhost with no missing-resource errors.
- GitHub Pages project-path compatibility.
- No runtime network dependencies beyond user-triggered sharing.

If a test cannot be run in the available environment, identify it
explicitly and provide manual steps. Do not claim unperformed checks passed.

## 9. Build in phases

Do not generate the entire application in one uncontrolled step.

**Phase 1: Single-file foundation and visual direction**

- Inspect the workspace and existing scaffold.
- Consolidate the basic app shell and styling into `index.html`.
- Remove external runtime references from that file.
- Provide BillBuddy branding and a clearly labelled preview placeholder.
- Explain the single-file structure and the PWA trade-off.
- Provide preview instructions and demonstrate the page loads.

**Phase 2: Money, optimisation and splitting**

- Implement pure validation, cents arithmetic, ranking and splitting.
- Add and run focused automated tests.
- Explain supported limits and rounding decisions.

**Phase 3: Working calculator interface**

- Connect inputs, errors, recommendations, alternatives and manual mode.
- Add individual payment breakdowns and optional names.
- Verify the example and responsive layout in the browser.

**Phase 4: Sharing, settings and history**

- Add reset, copying, WhatsApp sharing and local persistence.
- Verify success and failure handling.

**Phase 5: Final validation and GitHub Pages instructions**

- Run the relevant automated and browser checks.
- Verify that `index.html` works as the only published file.
- Explain how to publish through GitHub Pages:
  1. Create or choose a repository.
  2. Place `index.html` in the chosen publishing folder, such as the root.
  3. Commit and push it only after my approval.
  4. In Settings > Pages, select "Deploy from a branch".
  5. Select the actual branch and publishing folder, then save.
  6. Wait for deployment and open the live URL shown by GitHub.
- Do not publish automatically or assume hosting has been configured.
- Explain how subsequent commits update the live page.

After **every phase**:

1. Explain what was created in plain language.
2. List the files changed.
3. Report checks actually run and their results.
4. Identify unfinished features or outstanding issues.
5. Give exact instructions for viewing the current result.
6. **Stop and wait for my approval before starting the next phase.**

Start with Phase 1. The final deliverable is a working, attractive
BillBuddy calculator whose complete runtime lives in one `index.html`.
