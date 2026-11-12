# Refactor backend FIDO — demo1

Ngày 2026-11-12. Source gốc: `f3a6792fdedeba641b3a6bf90571e8f45647c504` trên `quangson2809/FIDO:demo1`.

## Khôi phục và phạm vi

Môi trường cloud đã dùng trước đó không còn truy cập được, khiến bundle/patch cũ không tải được. Candidate này được tái dựng trong workspace Windows từ đúng source gốc và các bước extraction đã ghi trong cuộc trò chuyện. Không xem kết quả kiểm thử cũ là bằng chứng cho candidate mới; chạy lại build và kiểm thử riêng.

Người dùng đã yêu cầu đẩy lên remote sau khi hoàn tất refactor. Thay đổi được gom thành một commit trên `demo1`, không tạo nhánh hoặc PR mới. Không thay endpoint, shape JSON, capability, trạng thái, schema hay dependency. Không triển khai discount Strategy, State, Observer, Abstract Factory, command/event bus, CQRS hoặc async.

## Thay đổi

| Phần | Kết quả |
|---|---|
| Order vocabulary | `OrderAction` giữ sáu wire name, target status, capability và mã audit. `ValidOrderAction`, authorization, policy và OpenAPI cùng dùng nguồn này. Request vẫn là String, HTTP validation envelope không đổi. |
| Order Command | Invoker giữ authorization, transaction, khóa/tải dữ liệu, policy, audit và projection. Registry từ chối missing/duplicate registration. Handler confirm/prepare/ship/failure/cancel có dependency hẹp; dispatch và retry dùng chung execution nhưng metadata/policy riêng. |
| Gallery | `ProductAdminService` delegate replace vào `ProductImageAdminService` với Product đã khóa. Giữ no-op/image IDs, clear gallery, URL/order validation, primary và delete/flush/insert sequence. Incremental commands giữ validation/normalization riêng. Không thay adapter/provider/retention. |
| Inventory Facade | Public API, StockLine, MANDATORY propagation và opening authorization giữ nguyên. |
| Inventory composition | Receipt/opening/adjustment/order workflows package-private giữ source checks, lock order, semantic keys và reversals. Posting package-private kết hợp balance/version guard với ledger; chỉ dịch lỗi ledger theo mã workflow, không tách public balance writer khỏi ledger. Không nối return-restock vào after-sales. |

## Kiểm chứng candidate khôi phục

Môi trường: Windows, Java 17.0.18, Gradle 9.3.1, MySQL 8.4.13, UTC. Dùng MySQL riêng tại loopback port 33316, databases mới có prefix `fido_refactor_recovered_`; schema gate dùng database riêng. Không kết nối/reset database nghiệp vụ của người dùng. JDK/proxy/trust store/Mockito startup agent và công cụ chạy test nằm ngoài repo; không đổi cấu hình build hay dependency của ứng dụng.

**Build/check và test:** PASS — 278/278 test, 0 failures, 0 errors, 0 skipped; `build check` thành công.

Các test được khôi phục/bổ sung bảo vệ:

- Ma trận allowed_actions/execution theo trạng thái, stock state và quyền; valid/invalid wire actions.
- Schema action bắt buộc/string/sáu giá trị và HTTP lỗi 400/409 không gây mutation.
- Audit failure rollback confirm/cancel, gồm quantity/version/ledger/voucher quota; successful retry và repeat rejection.
- Product patch + gallery replacement rollback giữ name và nguyên IDs/URL/sort/primary, sau đó clear thành công.
- Suite hiện có cho receipt replay/double-confirm, adjustment/reversal, no-negative/overflow, nhiều item all-or-nothing, concurrency, authorization, snapshot và schema.

Hai lượt review độc lập theo tiêu chuẩn repo và theo kế hoạch đã đọc tracked diff cùng toàn bộ file Java mới của candidate khôi phục, đối chiếu source gốc/caller. Không phát hiện finding cần sửa. Review source không thay thế kiểm thử runtime.

## Giới hạn

Đây là refactor backend theo kế hoạch, không phải nghiệm thu toàn bộ sản phẩm. Không chạy frontend/browser UX hay gọi thật nhà cung cấp ảnh. Không tuyên bố tăng hiệu năng vì chưa benchmark. Không sửa các tồn đọng ngoài phạm vi chỉ để làm test xanh.

Fingerprint SHA-256 của source backend đã kiểm thử (chuẩn hóa LF, gồm backend/src và ba file build/settings/properties): `391f70ccc88b9b9c0bcaf8c71569667eb7023c985956c5c6d0bc5e46e709dc59`. Hai lượt review source đều PASS; `git diff --check` PASS.
