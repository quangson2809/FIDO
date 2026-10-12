# FIDO audit follow-up — 2026-10-10

## Revision and finding validation

- Branch: `feature/client-storefront-ui-ux-improvements`.
- Fetched remote baseline: `5d834dc956820832dd47a212e53e32650a83ad85`; initial worktree clean.
- The reported `6697fa0` is an ancestor, not the current storefront branch HEAD.
- `audit.one` was inspected, including its three reference images. The written requirements ask for contact information, hierarchical category navigation, Admin search/filter, logout, usable size forms, category pages without filters, multiple Home category cards, and richer product summaries.

| Item | Revalidation | Result and evidence |
| --- | --- | --- |
| 1. Footer contact | CONFIRMED | CSKH section, validated public email/hotline configuration, `mailto:`/`tel:` links; blank configuration has explicit missing-contact copy. Render smoke checks the blank state; audit browser checks configured links. Official store contact remains missing. |
| 2. Category menu | CONFIRMED | API metadata tree, nested links, desktop hover, click/touch, keyboard/Escape/focus return, loading/error/retry/empty. Audit browser checks three levels and mobile overflow; recovery suite preserves click/tap coverage. |
| 3. Admin search/filter | CONFIRMED for metadata/access/content | Search complete metadata by name/code/size name, category root/child filter; role and permission searches; content title/code search. Existing paginated operational screens retain their server filters. Audit browser covers each added search and empty/read-only states. |
| 4. Logout | CONFIRMED | Shared button in desktop Header, mobile menu, Profile and Admin; existing session logout and sign-in destinations. Admin preserves a cancelled dirty form and asks once before accepted logout. Browser checks token removal and both customer/Admin navigation. |
| 5. Size forms | CONFIRMED | Dedicated creation dialog, reusable labelled size rows, responsive fields and named actions; technical IDs hidden from presentation and retained in edit payload. Browser checks create, retained ID/order, 409 input preservation, read-only, and 375/768/1440 screenshots. |
| 6. Category page | CONFIRMED for page/descendants; URL sync ALREADY_FIXED | `/categories/:categoryId` has breadcrumbs, child links and paging without Catalog filters. Existing API #11 now resolves selected category plus descendants. Browser covers route changes/history, empty/missing category, metadata failure/retry and no unscoped fallback. `CatalogPublicHttpTests` covers deep ancestry, leaves, unrelated/empty/unknown categories and stopped products. |
| 7. Home category cards | ALREADY_FIXED | Dynamic cards retained; links now target the dedicated category page. Browser checks multiple cards. |
| 8. Product summaries | CONFIRMED | Shared Home/Catalog card shows actual category/brand, sale status, base-price label and detail action. Existing API #12 supplies size/color/material in a user-opened information dialog with retry/focus return. No eager detail request per card. Unsupported fake rating/reviews/stock placeholders removed from summary view model. |

The reference image's wishlist, new-arrival and bestseller badges have no supporting
contract/data in this repo. They are not fabricated or implemented as new business
features. Size/material data uses the existing detail contract on demand; it is not
added to the list DTO. This keeps the API shape and initial list-request cost intact.

## Pre-push verification

Executed on the implementation worktree:

- `npm run lint`: PASS.
- `npm run build`: PASS, including strict TypeScript.
- `npm run test:api`: PASS.
- `npm run test:architecture`: PASS.
- `npm run test:render`: PASS, including contact unavailable states.
- Catalog, product-variant and checkout browser suites: PASS.
- Storefront browser suite: PASS, including the continuous purchase path and 10 pages at four viewports.
- Storefront recovery suite: PASS, all fourteen cases.
- `node tests/audit-followup-browser.mjs`: PASS using isolated HTTP fixtures against the real Vite/React application.
- `git diff --check`: PASS.

Browser execution used the existing standalone Chromium executable through
`CHROMIUM_EXECUTABLE_PATH`; no runtime/dependency upgrade was introduced. The
versioned `test:browser` command includes the new audit suite, and existing Actions
retains screenshots in the browser artifact.

Initial verification caught TypeScript narrowing, an unused field and a duplicate
test import; these were corrected. Browser verification caught the competing
Profile logout destination and ambiguous/obsolete test locators after adding the
new card action and semantic links. Corrected tests retain their navigation and
behavior assertions. No test was disabled or weakened.

Local `./gradlew --no-daemon compileJava` could not download Gradle 9.3.1 due to
`Network is unreachable`; this is not a local compile/test PASS. Backend compile,
H2, MySQL/Flyway and broader regressions require the normal Actions result on the
commit containing this report. Final CI evidence is recorded in the completion
message; browser fixtures do not substitute for backend integration results.

## Architecture and UX review

- Page → feature/hook → existing service → centralized HTTP client retained.
- Category resolution stays inside `product`; SQL owns product filtering/count/paging. The hierarchy is read once, with a visited set; no product-table filtering in Java and no repository access from Controllers or other modules.
- No schema, DTO fields, endpoint additions, role matrix, money/stock/order lifecycle or application dependencies changed.
- UI components have focused responsibilities: category navigation, summary card, size fields, list search and logout. Existing session and dirty-form ownership are reused.
- Summary information is real and explicitly labels base price; the dialog explains variant-specific price/availability. No fake favorite action, promotional badge, stock or rating is presented.
- Native dialogs, labels, Escape/focus restoration, read-only behavior and mobile sizing were exercised. Mobile menu and size screenshots were visually inspected.
- Dashboard Analytics, About and existing cart/voucher/checkout behavior are preserved.

## Remaining input

Provide the actual store email/hotline and set `VITE_SUPPORT_EMAIL` /
`VITE_SUPPORT_HOTLINE` before publishing contact links. The sample number in the
reference image is not verified FIDO business data. Audit acceptance remains
PARTIAL for official contact content even when implementation CI passes.
