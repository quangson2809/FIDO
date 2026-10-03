# Image management impact

## Hiện trạng

- Analyst baseline hiện mô tả `product_images(image_id, product_id, image_url, alt_text)` và chưa có `sort_order`; `order_items` chưa có trường snapshot ảnh.
- Code trên `feature/backend-phase-0-discovery` đã đi trước baseline tài liệu do refinement ngày 03/10/2026: `ProductCreateRequest`/`ProductPatchRequest` nhận `images` chứa URL; `POST /api/v1/admin/products` hỗ trợ cả JSON và multipart; multipart upload được `ProductCreationService` đẩy qua `ProductImageStorage`/`ImgBbImageStorage` rồi chuyển lại thành URL để lưu cùng lúc tạo Product.
- `ProductImage` hiện chỉ lưu `imageId`, `product`, `imageUrl`, `altText`. Repository đọc gallery theo `image_id ASC`; ảnh đại diện được chọn bằng `MIN(image_id)`.
- Product summary/admin summary và cart hiện đã có `image_url` lấy từ ảnh đại diện hiện tại. Product detail/admin detail trả `images[]` nhưng `ProductImageDto` chưa có `sort_order`.
- `CheckoutItemDto` chưa có ảnh. `OrderItem` chưa lưu ảnh snapshot. `OrderItemDto` có `image_url`, nhưng giá trị này được dựng từ ảnh catalog hiện tại ở query/read path chứ không được snapshot khi tạo đơn.
- `OrderCreationService` hiện snapshot tên sản phẩm, SKU, size, màu, giá, số lượng và line total; chưa snapshot ảnh.
- Source-of-truth xác định được: refinement code ngày 03/10/2026 là quyết định vật lý cũ; yêu cầu image-management ngày 04/10/2026 là yêu cầu mới hơn và thay thế phần contract ảnh cũ. Vì vậy Phase 0 gate không bị BLOCKED.

## Các contract bị thay đổi

- `POST /api/v1/admin/products`: bỏ `images` khỏi create contract và bỏ multipart-create; endpoint chỉ tạo Product + Variant + metadata.
- `PATCH /api/v1/admin/products/{productId}`: không còn dùng để thay toàn bộ collection ảnh bằng URL client gửi.
- Thêm `POST /api/v1/admin/products/{productId}/images` với `multipart/form-data`; backend nhận file, validate, upload qua storage boundary, rồi persist `ProductImage`.
- Thêm `PATCH /api/v1/admin/products/{productId}/images` cho reorder/metadata của collection ảnh.
- Thêm `DELETE /api/v1/admin/products/{productId}/images/{imageId}` để bỏ ảnh khỏi catalog sau khi xác minh ảnh thuộc Product; không có GET image riêng.
- `ProductImageDto` bổ sung `sort_order`; gallery Product detail phải trả theo `sort_order ASC`.
- Product summary/admin summary dùng cover hiện tại thay vì `MIN(image_id)`; cover được xác định bởi vị trí đầu gallery (`sort_order = 0`).
- Cart item dùng cover hiện tại tại thời điểm đọc cart.
- Order creation snapshot cover hiện tại vào `OrderItem`; order read trả ảnh snapshot, không đọc lại ảnh catalog hiện tại.
- Contract cũ cho client gửi `image_url` khi create/update Product bị loại bỏ, nên đây là breaking change với client/back-office đang dùng payload cũ.

## DB migration cần thiết

- Tạo migration mới sau baseline hiện tại để thêm `product_images.sort_order`.
- Backfill thứ tự cho dữ liệu ảnh hiện hữu theo thứ tự ổn định `image_id ASC` trong từng Product, bắt đầu từ `0`, để cover cũ (ảnh có `image_id` nhỏ nhất) tiếp tục là cover sau migration.
- Thêm ràng buộc `sort_order >= 0` và `UNIQUE(product_id, sort_order)`.
- Bổ sung `order_items.image_url_snapshot`. Cột phải tương thích với OrderItem lịch sử đã tồn tại; các đơn cũ không thể suy ra chính xác ảnh lịch sử nếu catalog đã thay đổi, nên migration không được giả tạo snapshot quá khứ.
- Reorder phải được triển khai theo cách không vi phạm tạm thời unique `(product_id, sort_order)` trong cùng transaction.

## Module bị ảnh hưởng

- `product`: controller, create/update command flow, image storage boundary/provider adapter, `ProductImage` entity/repository/read service, mapper, product/admin DTO, catalog query, audit và tests.
- `cart`: cart query/mapping và `CartItemDto` để bảo đảm luôn dùng current cover.
- `checkout`: checkout view/mapping phải mang current cover tới order creation snapshot; quote response chỉ đổi nếu contract được đồng bộ yêu cầu hiển thị ảnh.
- `order`: `OrderItem` entity, order creation snapshot flow, mapper/query và `OrderItemDto`.
- `security/config`: xác minh ba endpoint image admin mới kế thừa authentication/authorization backend và quyền catalog write; không mở rộng `permitAll`.
- `migration/persistence`: Flyway migration, schema mapping/constraint tests.
- `tests`: product HTTP/service/storage/read tests, cart/checkout tests, order creation/query tests, migration/schema/constraint tests và API contract tests.
- Frontend/API client: create/update Product payload, upload flow, reorder/remove flow, gallery ordering, summary/cart cover và order snapshot rendering.

## Compatibility risk

- Client cũ gửi `images[].image_url` trong create/patch Product sẽ không còn đúng contract.
- Client cũ gọi multipart trực tiếp vào `POST /admin/products` phải chuyển sang tạo Product trước rồi upload ảnh qua resource con.
- Semantics ảnh đại diện đổi từ `MIN(image_id)` sang `sort_order = 0`; backfill phải giữ cover hiện tại để tránh thay đổi hình ngoài ý muốn.
- `UNIQUE(product_id, sort_order)` có thể gây collision tạm thời khi reorder nếu update tuần tự không có chiến lược an toàn.
- Xóa ảnh catalog không được tự xóa remote asset vì URL có thể đang được OrderItem lịch sử tham chiếu; cleanup remote asset là lifecycle riêng, không được suy diễn trong change này.
- Order mới có snapshot ảnh; Order lịch sử trước migration có thể có `image_url_snapshot = NULL` và không được backfill từ catalog hiện tại như thể đó là ảnh lịch sử.
- API/DTO additions có thể làm snapshot/schema contract tests thay đổi; backend implementation và frontend rollout phải được phối hợp để tránh client/server lệch phiên bản.