package com.fido.modules.product.service;

import org.springframework.web.multipart.MultipartFile;

/**
 * Che giao tiếp riêng của nhà cung cấp ảnh; catalog chỉ nhận URL tải lên. Xóa liên kết ảnh không xóa
 * tài nguyên từ xa vì đơn cũ còn tham chiếu URL; chưa tự dọn ảnh theo thời hạn.
 */
public interface ImageStorageGateway {

    UploadedImage upload(MultipartFile image);

    record UploadedImage(String url) {}
}
