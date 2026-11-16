# Rà soát nội dung hiển thị client và admin

Nhánh: `refactor/backend-pattern-safe-v2`. Source gốc: `dddd5bf6c31ae9e2d73945171f4e93f4ae4cc5fd`.

Đã rà các chuỗi JSX, nhãn, thông báo lỗi và đường đi dữ liệu ở 87 file TSX, gồm 14 screen cấp ngoài (có shell admin), 17 view admin và các component dùng chung. Đây là rà soát source và kiểm tra bằng fixture, không phải xác nhận nội dung CMS/dữ liệu thực tế trên môi trường triển khai.

## Các vấn đề và cách xử lý

| Khu vực | Nội dung gây nhiễu trước sửa | Xử lý |
| --- | --- | --- |
| Thẻ sản phẩm, khối mua hàng | Mã trạng thái quản trị `ACTIVE`/`INACTIVE`; giải thích dữ liệu đến từ Product/kho vận hành | Không render mã trạng thái. Giữ giá, SKU, thuộc tính và thông báo còn/hết hàng. Bỏ chú thích triển khai. |
| Thông số sản phẩm | Lặp SKU đã có ở khối mua hàng; thêm trạng thái quản trị vào thông số | Bỏ hai ô lặp/thừa, giữ danh mục, thương hiệu và thuộc tính mô tả. |
| Hộp xem thuộc tính | Chú thích “Giá, trạng thái và thuộc tính được lấy từ thông tin sản phẩm hiện hành” | Bỏ. |
| Checkout và xác nhận | “Báo giá từ Backend”, giao dịch tạo đơn, nguồn chuẩn, mã chống trùng; lặp số tồn ở nhiều danh sách | Viết thông báo theo việc khách cần làm; giữ kiểm tra lại giá, kết quả đặt hàng chưa xác định và nút xác minh. Bỏ số tồn lặp ở tóm tắt checkout; giữ cảnh báo vượt tồn và logic kiểm tra. |
| Đặt hàng thành công | ID database được đặt tên “Mã đơn” bên cạnh `order_code` | Bỏ ô ID nội bộ, tiếp tục hiển thị `order_code` và dùng ID cho điều hướng. |
| Hồ sơ | Tên vai trò nội bộ được đưa ra màn hình cửa hàng | Hiển thị tên khách thay cho danh sách vai trò. |
| Lỗi client và màn hình đăng nhập | Bộ lọc cũ có thể đưa mã lỗi, tên trường hoặc đường dẫn kỹ thuật từ lỗi 4xx lên UI | Dịch các mã công khai đã đối chiếu backend; chặn mã/tham số/JSON/đường dẫn kỹ thuật, giữ hướng dẫn nhập liệu dễ hiểu và các nhánh 401/403/404/5xx. Không sửa payload lỗi gốc. |
| Admin thuộc tính, sản phẩm, danh mục | `attribute_value_id`, `PATCH`, “Option-backed Attribute values”, “Variant legacy”, thông báo “metadata” | Bỏ giải thích giao thức/cấu trúc code; dùng tên tác vụ và dữ liệu trong nghiệp vụ. Giá trị đã lưu nhưng thiếu thông tin vẫn được giữ trong form. |
| Admin chỉ đọc | Banner chỉ đọc xuất hiện ở shell và lặp lại ở view thuộc tính/danh mục/nội dung | Giữ banner chung tại shell; giữ nguyên việc ẩn/khóa các thao tác ghi. |
| Nhật ký admin | JSON trước/sau trải dài ở mỗi dòng; ví dụ mã hành động `ORDER_CONFIRMED` không đúng mã backend | Thu gọn vào `details` “Xem thay đổi”, mở được bằng bàn phím; tách trước/sau khi mở. Sửa ví dụ thành `ORDER_CONFIRM`. |
| Footer | Đoạn mô tả ngôn ngữ thị giác và trải nghiệm thiết kế | Đổi thành giới thiệu trang phục dành cho người mua. |
| Header và footer sau đăng nhập | Lời nhắc đăng nhập và nút đăng nhập còn hiện với tài khoản đã đăng nhập | Chỉ hiện cho khách chưa đăng nhập. |
| Liên hệ footer | “Chưa cập nhật email/hotline CSKH” khi chưa cấu hình thông tin liên hệ | Chỉ hiện kênh liên hệ hợp lệ đã có dữ liệu. Giữ đường dẫn chính sách; không tạo số điện thoại/email giả. |

## Thông tin giữ lại có chủ đích

- `p` và `span` là thẻ trình bày/ngữ nghĩa hợp lệ; không xóa theo tên thẻ. Chỉ xử lý nội dung gây nhiễu.
- Tên danh mục, thương hiệu, màu/kích cỡ, chất liệu, giá, SKU, mã đơn công khai, trạng thái giao hàng bằng tiếng Việt và hướng dẫn nhập liệu phục vụ mua hàng được giữ lại.
- Metadata catalog vẫn được dùng để tạo bộ lọc và tổ hợp sản phẩm. Không chặn request metadata, không đổi hợp đồng API hoặc cách chọn Product/SKU.
- ID, mã quyền, phiên bản tồn kho, mã hành động và dữ liệu audit vẫn phục vụ admin. Audit không mất dữ liệu; chỉ thu gọn khi chưa cần xem.
- Các thông báo cảnh báo trả hàng, hoàn tiền, chế độ chỉ đọc, lỗi tải lại và xác minh đơn chưa rõ kết quả được giữ vì ảnh hưởng trực tiếp quyết định thao tác.
- Chỉ đổi phần hiển thị. Không thay đổi quyền, logic mua hàng, idempotency, số tiền, tồn kho hoặc backend. Dữ liệu không render trên UI vẫn có thể cần trong response và được xem trong công cụ phát triển.

## Kiểm chứng

- `npm run lint`, `npm run build`, `npm run test:architecture`, `npm run test:render` đã qua cục bộ.
- Bổ sung kiểm tra không hiện mã trạng thái nội bộ, nội dung kỹ thuật, lỗi 4xx có mã/JSON/đường dẫn; giữ thông báo nhập liệu hữu ích và giá trị thuộc tính đã lưu.
- Các bài browser hiện có được cập nhật để kiểm tra nội dung client ở 10 trang × 4 kích thước và mở chi tiết audit bằng bàn phím. Chromium cục bộ không khởi động được do môi trường chặn socket; kết quả browser chính thức nằm ở workflow Frontend verification của commit tương ứng.
