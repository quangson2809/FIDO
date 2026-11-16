package com.fido.modules.account.service;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** Chuẩn hóa số điện thoại trước khi tra cứu, kiểm tra trùng hoặc ghi DB. */
@Service
public class PhoneNumberCanonicalizer {
    private static final Pattern NATIONAL = Pattern.compile("0([0-9]{9})");
    private static final Pattern INTERNATIONAL = Pattern.compile("\\+84([0-9]{9})");

    /**
     * input là điện thoại từ request/cấu hình; bỏ dấu cách, gạch nối và ngoặc rồi chấp nhận dạng 0
     * hoặc +84.
     * Kết quả hiện tại luôn là +84 kèm chín chữ số, dùng để so trùng và ghi dữ liệu mới.
     */
    public String canonicalize(String input) {
        if (input == null) {
            throw invalidPhone();
        }

        String normalized = input.trim().replaceAll("\\s+", "").replace("-", "").replace("(", "").replace(")", "");

        Matcher national = NATIONAL.matcher(normalized);
        if (national.matches()) {
            return "+84" + national.group(1);
        }

        Matcher international = INTERNATIONAL.matcher(normalized);
        if (international.matches()) {
            return normalized;
        }

        throw invalidPhone();
    }

    /** Tra cả dạng +84 và dạng 0 của dữ liệu cũ; dữ liệu ghi mới dùng giá trị chuẩn đầu tiên. */
    public List<String> lookupValues(String canonicalPhone) {
        String canonical = canonicalize(canonicalPhone);
        return List.of(canonical, "0" + canonical.substring(3));
    }

    private static ResponseStatusException invalidPhone() {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid phone format");
    }
}
