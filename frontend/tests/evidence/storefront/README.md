# Real-browser screenshot evidence

Captured from Vite running actual FIDO source with isolated contract fixtures. These are application screenshots, not design mockups. Before captures use detached base `6697fa037bc58914ce32b02e5abc833628246669`; after captures use the implementation committed with this evidence. Images in the gallery fixtures are original local FIDO illustrations, not claims about real catalog inventory.

| Scenario | Before (375px) | After (375px) | Desktop after |
| --- | --- | --- | --- |
| Catalog / mobile filters | [Catalog: filters remain hidden](before-catalog-375.png) | [Working modal](after-filters-375.png), [results](after-catalog-375.png) | [1440px sidebar](after-catalog-1440.png) |
| Product / gallery | [Product](before-product-375.png) | [Product, accessible gallery and controls](after-product-375.png) | [1440px](after-product-1440.png) |
| Cart | — | [Drawer, local icons, 44px controls](after-cart-375.png) | Full browser-run artifact |
| Checkout | [Implicit first address](before-checkout-375.png) | [Explicit saved/new choice](after-checkout-375.png), [confirmation](after-confirmation-375.png) | [1440px](after-checkout-1440.png) |
| Customer orders | [Raw status/time presentation](before-orders-375.png) | [Localized cards](after-orders-375.png), [real-data progress](after-order-375.png) | Full browser-run artifact |
| Home | — | Full browser-run artifact | [Local illustration](after-home-1440.png) |

Each browser run produces the broader 375/768/1024/1440 coverage in `frontend/.browser-evidence`; Actions uploads that directory as `storefront-browser-evidence`. The verification report is [storefront-ui-ux.md](../../storefront-ui-ux.md).
