# Seed catalog theo manifest ảnh

Nhánh thực hiện: `demo1`, đã nhận `main` tại `ce44bdd0`.

## Dữ liệu và nguồn

- Manifest gốc gồm 200 ảnh, 40 thư mục sản phẩm, tám nhóm hàng. Bản đối chiếu kiểm thử: `backend/src/test/resources/devseed/image-manifest.csv`.
- `catalog-image-map.csv` ánh xạ từng thư mục ảnh sang Product đại diện, Product gia đình và các SKU. Mỗi bộ năm ảnh là gallery của một mẫu; không phải năm SKU.
- 25 mẫu được đối chiếu bằng `product_datasets.csv` của `pazhanir/product-images` (blob `ed35085634bd597fa4f9e6dd3dadbc67b48ba545`), theo đúng `product_id` trong thư mục ảnh. 15 mẫu còn lại dùng metadata sản phẩm công khai của GRIP6, Sock It to Me và 34 Heritage tại các URL ghi trong mapping, kiểm tra ngày 17/11/2026.
- Tên/mô tả tiếng Việt tóm tắt thông tin model, màu, kiểu dáng và chất liệu đã xác định; không chép quảng cáo hoặc suy diễn thông số còn thiếu. Số cỡ giày giữ ký hiệu nguồn, không tự chuyển UK sang EU.
- Giá bán là giá demo nguyên VND, không phải giá niêm yết hay quy đổi ngoại tệ của các hãng. `cost_price` để NULL khi không có dữ liệu giá vốn. Chín đơn mẫu giữ tiền lịch sử để tiếp tục đối chiếu báo cáo; tên/SKU/Option snapshot lấy từ catalog mới.

## Quan hệ schema

- Giữ nguyên schema 30 bảng và Option-only; dữ liệu catalog đặt trong `backend/src/main/resources/devseed/catalog.sql`, chỉ nạp qua seeder dev/test, không phải migration Flyway.
- 12 danh mục: bốn nhóm cha và tám danh mục bán hàng; 22 thương hiệu đúng nguồn.
- 40 bộ ảnh ứng với 36 gia đình sản phẩm và 75 SKU độc lập. Năm màu Verona cùng dòng 34 Heritage dùng một Product cha bán được và chín con (năm màu, hai cỡ vòng eo/dài ống). Các mẫu còn lại có tối đa hai cỡ minh họa lấy từ nguồn; đây không phải toàn bộ danh sách cỡ bán của hãng.
- Cha là một tổ hợp bán được, sở hữu SKU/giá/Option/tồn kho như con. Mỗi con có đầy đủ danh mục, thương hiệu và mô tả riêng; không dựa vào NULL để kế thừa.
- Các trục cỡ tách theo giày, áo sơ mi, áo phông, jeans, vòng eo/dài ống, thắt lưng và độ tuổi trẻ em. Thông tin màu/chất liệu/phom/đối tượng/họa tiết/kiểu sản phẩm chỉ dùng Option định nghĩa sẵn. Vớ có một cấu hình nguồn không tự tạo cỡ hoặc biến thể.
- Không chèn `product_images`, không chèn URL ảnh vào snapshot đơn; `image_url_snapshot` dùng chuỗi rỗng vì schema bắt buộc NOT NULL. Upload ảnh sau theo mapping. Seeder không yêu cầu bảng ảnh phải trống khi chạy lại.
- Mọi SKU có tồn kho riêng; 75 bút toán OPENING và tám bút toán nghiệp vụ khớp 75 số dư kho. Giữ tách trạng thái đơn/thanh toán/vận chuyển và nguyên tắc trả hàng không tự nhập kho.

## Cách dùng

Trên database dev/test mới đã áp dụng schema, cấu hình profile `dev` và `DEV_SEED_ENABLED=true`, sau đó chạy backend. Seed đầy đủ được bỏ qua khi chạy lại, không tự ghi đè dữ liệu người dùng.

Nếu database đang có bộ seed cũ 17 sản phẩm hoặc dữ liệu dở dang, seeder sẽ từ chối thay đổi và rollback. Bộ dữ liệu này không phải trình nâng cấp database có dữ liệu; không tự xóa hoặc reset database đang dùng.

## Kiểm chứng tập trung

`[seed-catalog-focus]` chọn test seed (idempotency, manifest, API catalog, snapshot/ledger, rollback, API báo cáo) và fixture schema liên quan. Compile và Java format vẫn được kiểm tra. Các workflow khác giữ cách chạy cũ.
