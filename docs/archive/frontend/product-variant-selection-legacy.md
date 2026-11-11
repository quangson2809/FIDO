# Archived test note: retired Product Variant flow

**Status: deprecated; not part of current acceptance.**

The historical browser test documentation described a size/color Product Variant model. The current Backend contract for this FIDO branch is Product-centric: Product Detail and Cart use `product_id` and quantity, while Admin inventory and goods receipts use Product ID. The old test source is not present in the active test scripts and must not be used as an acceptance gate.

Current test entry points are defined in `frontend/package.json` and `.github/workflows/frontend-verification.yml`. This archive preserves only the fact that the older test notes have been retired; it does not claim that the historical test passed against the current API.
