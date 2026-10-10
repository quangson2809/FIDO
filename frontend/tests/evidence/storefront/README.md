# Real-browser screenshot evidence

Captured from Vite running actual FIDO source with isolated contract fixtures. These are application screenshots, not design mockups. Original before captures use detached base `6697fa037bc58914ce32b02e5abc833628246669`; original after captures document the first implementation delivered at `41ecb709818621eabe398dac3ecc4a1c276ab242`. Images in the gallery fixtures are original local FIDO illustrations, not claims about real catalog inventory.

| Scenario | Before (375px) | After (375px) | Desktop after |
| --- | --- | --- | --- |
| Catalog / mobile filters | [Catalog: filters remain hidden](before-catalog-375.png) | [Working modal](after-filters-375.png), [results](after-catalog-375.png) | [1440px sidebar](after-catalog-1440.png) |
| Product / gallery | [Product](before-product-375.png) | [Product, accessible gallery and controls](after-product-375.png) | [1440px](after-product-1440.png) |
| Cart | — | [Drawer, local icons, 44px controls](after-cart-375.png) | Full browser-run artifact |
| Checkout | [Implicit first address](before-checkout-375.png) | [Explicit saved/new choice](after-checkout-375.png), [confirmation](after-confirmation-375.png) | [1440px](after-checkout-1440.png) |
| Customer orders | [Raw status/time presentation](before-orders-375.png) | [Localized cards](after-orders-375.png), [real-data progress](after-order-375.png) | Full browser-run artifact |
| Home | — | Full browser-run artifact | [Local illustration](after-home-1440.png) |

Each browser run produces the broader 375/768/1024/1440 coverage in `frontend/.browser-evidence`; Actions uploads that directory as `storefront-browser-evidence`. The verification report is [storefront-ui-ux.md](../../storefront-ui-ux.md).

## Follow-up revalidation

Before images below use detached `41ecb709818621eabe398dac3ecc4a1c276ab242`; after images use the supplemental source committed with them. The final Actions artifact regenerates the full responsive evidence for the exact pushed revision.

| Scenario | Before (375px) | After (375px) |
| --- | --- | --- |
| Home metadata fails while products succeed | [Both sections unavailable](review-before-home-partial-375.png) | [Product section preserved, independent category retry](review-after-home-partial-375.png) |
| Quote expires while confirmation is open | [Misleading changed-data message](review-before-expired-confirmation-375.png) | [Specific expiry message, disabled submit, modal focus/scroll guards](review-after-expired-confirmation-375.png) |
