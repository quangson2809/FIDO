# 21 — Phase 12 Image security & operational hardening — 2026-10-05

## Scope

Phase 12 hardens the existing backend-owned Product image upload/mutation flow. It does not add a new public API, schema, storage provider, asset registry or garbage collector.

## Authorization boundary

Backend authorization is authoritative.

All Product image mutations are protected by the existing catalog write rule:

```text
ROLE_SUPERADMIN OR PERMISSION_CATALOG_WRITE
```

This covers:

- multipart `POST /api/v1/admin/products/{productId}/images`;
- image reorder `PATCH /api/v1/admin/products/{productId}/images`;
- image removal `DELETE /api/v1/admin/products/{productId}/images/{imageId}`;
- the existing Product PATCH command when it changes catalog image associations.

Frontend visibility is UX only and is never treated as an authorization boundary.

## Upload validation

Validation executes in the backend before any provider upload starts. The entire batch is validated before the first remote call so an invalid later part does not produce a partially uploaded batch.

The baseline checks are:

- request contains at least one file;
- no file is empty;
- each file is at most `IMAGE_STORAGE_MAX_UPLOAD_SIZE` (default `32MB`);
- each request contains at most `IMAGE_STORAGE_MAX_FILES_PER_REQUEST` files (default `10`);
- declared MIME is allowlisted;
- actual file signature is detected independently from filename/declared MIME;
- detected type must match the declared MIME.

Supported upload formats for this baseline are:

- JPEG — `image/jpeg`;
- PNG — `image/png`;
- WebP — `image/webp`.

The 10-file value is an operational batch limit, not a maximum number of images that a Product may own. It is configurable without changing the Product data model or API shape.

The signature check is intentionally dependency-free and narrow. It prevents trusting only a filename or client-controlled `Content-Type`; it is not presented as malware scanning, content disarm/reconstruction or a general-purpose media parser.

## HTTP client hardening

The ImgBB adapter keeps explicit, externally configurable timeouts:

- connect timeout: `IMGBB_CONNECT_TIMEOUT` (default `5s`);
- read timeout: `IMGBB_READ_TIMEOUT` (default `20s`).

Provider failures are translated at the integration boundary:

- provider HTTP rejection -> `502 Bad Gateway`;
- provider timeout -> `504 Gateway Timeout`;
- provider unavailable/client/invalid-response failures -> `502 Bad Gateway`;
- missing backend provider configuration -> `503 Service Unavailable`.

Provider response bodies, request URIs and raw client exception messages are not propagated as API errors or application logs.

## Secret boundary

`IMGBB_API_KEY` is backend runtime configuration only.

It must not be:

- logged;
- included in API responses;
- persisted in repositories/database rows;
- exposed through frontend `VITE_*` variables;
- committed as a real value to Git.

The committed `.env.example` contains only an empty placeholder. Real `.env` files remain ignored by Git.

## Logging

Operational logs are intentionally structured around non-secret identifiers/results. The image path may log:

- `productId`;
- `imageId` where an image mutation already has it;
- provider result category/status;
- request duration.

The provider adapter does not log the request URI, API key, multipart payload, provider response body or exception message because those surfaces could expose credentials or untrusted data.

## Verification targets

- CATALOG_READ-only principal receives 403 for POST/PATCH/DELETE image mutation paths;
- invalid/empty/oversized/too-many/unsupported/spoofed files are rejected before storage upload;
- JPEG/PNG/WebP signatures with matching MIME are accepted;
- provider timeout and provider HTTP/client failures map to safe gateway errors;
- no persisted ProductImage row appears after validation/provider failure;
- backend and MySQL verification suites remain green.

## Deferred by scope / YAGNI

This phase does not add antivirus scanning, image transcoding, EXIF stripping, quarantine infrastructure, WAF rules, rate-limiter infrastructure, asset reference tracking or remote-asset garbage collection. Those require separate operational/security requirements and should not be inferred from upload validation alone.
