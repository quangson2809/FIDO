package com.fido.common.exception;

/** Tách lỗi phân trang do client nhập khỏi lỗi lập trình để trả đúng phản hồi 400. */
public class InvalidPaginationException extends IllegalArgumentException {
    public InvalidPaginationException() {
        super("Invalid pagination bounds");
    }
}
