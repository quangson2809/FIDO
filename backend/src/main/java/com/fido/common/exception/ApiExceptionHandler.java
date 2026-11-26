package com.fido.common.exception;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.TypeMismatchException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.annotation.AnnotatedElementUtils;
import org.springframework.dao.ConcurrencyFailureException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.AccountStatusException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.web.ErrorResponse;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.HandlerMapping;

import tools.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.stream.Collectors;

/** Giữ cấu trúc lỗi HTTP thống nhất; chỉ trả mã công khai, giữ thông tin chẩn đoán ở máy chủ. */
@ControllerAdvice
public class ApiExceptionHandler {
    private static final Logger log = LoggerFactory.getLogger(ApiExceptionHandler.class);
    private final ObjectMapper json;

    public ApiExceptionHandler() {
        this(new ObjectMapper());
    }

    @Autowired
    public ApiExceptionHandler(ObjectMapper json) {
        this.json = json;
    }

    @ExceptionHandler(Exception.class)
    public void handle(
            Exception exception, HttpServletRequest request, HttpServletResponse response)
            throws IOException {
        // Phân quyền do ExceptionTranslationFilter và AccessDeniedHandler của Spring xử lý.
        if (exception instanceof AccessDeniedException denied) throw denied;
        int status = status(exception);
        String diagnosticMessage = diagnosticMessage(exception, status);
        Object route = request.getAttribute(HandlerMapping.BEST_MATCHING_PATTERN_ATTRIBUTE);
        String context =
                "method="
                        + request.getMethod()
                        + " route="
                        + (route == null ? "unmapped" : route)
                        + " ids="
                        + numericPathIds(request)
                        + " status="
                        + status;
        if (status >= 500) {
            log.error("{}; {}", diagnosticMessage, context, diagnosticTrace(exception, 0));
        } else if (exception instanceof ConcurrencyFailureException
                || exception instanceof DataIntegrityViolationException) {
            log.warn("{}; {}", diagnosticMessage, context, diagnosticTrace(exception, 0));
        } else {
            log.warn("{}; {}", diagnosticMessage, context);
        }
        writeError(request, response, status, errorCode(exception, request, status));
    }

    /** Bộ lọc bảo mật chạy trước MVC nên cần ghi phản hồi lỗi trực tiếp tại đây. */
    public void writeSecurityError(
            HttpServletRequest request, HttpServletResponse response, int status, String code)
            throws IOException {
        writeError(request, response, status, code);
    }

    /** Lỗi do bộ lọc hoặc máy chủ chuyển tiếp cũng dùng cùng thông báo công khai. */
    public void writeHttpError(HttpServletRequest request, HttpServletResponse response, int status)
            throws IOException {
        writeError(
                request,
                response,
                status,
                errorCode(
                        new ResponseStatusException(HttpStatusCode.valueOf(status)),
                        request,
                        status));
    }

    private void writeError(
            HttpServletRequest request, HttpServletResponse response, int status, String code)
            throws IOException {
        if (response.isCommitted()) {
            return;
        }
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("timestamp", Instant.now().toString());
        body.put("status", status);
        String message = publicMessage(code);
        if (message == null) message = publicMessage("REQUEST_REJECTED");
        body.put("error", message);
        body.put("code", code);
        body.put("message", message);
        body.put("path", request.getRequestURI());
        response.setStatus(status);
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        json.writeValue(response.getOutputStream(), body);
    }

    private int status(Exception exception) {
        if (exception instanceof BusinessRuleException business) {
            return business.kind() == BusinessRuleException.Kind.INVALID_INPUT ? 400 : 409;
        }
        if (exception instanceof InvalidPaginationException
                || exception instanceof HttpMessageNotReadableException
                || exception instanceof TypeMismatchException) {
            return 400;
        }
        if (exception instanceof ConcurrencyFailureException
                || exception instanceof DataIntegrityViolationException) {
            return 409;
        }
        if (exception instanceof BadCredentialsException
                || exception instanceof UsernameNotFoundException
                || exception instanceof AccountStatusException) {
            return 401;
        }
        if (exception instanceof ErrorResponse error) {
            return error.getStatusCode().value();
        }
        ResponseStatus annotation =
                AnnotatedElementUtils.findMergedAnnotation(
                        exception.getClass(), ResponseStatus.class);
        return annotation == null ? 500 : annotation.code().value();
    }

    private String errorCode(Exception exception, HttpServletRequest request, int status) {
        String path = request.getRequestURI();
        if (status == 401) {
            return path.equals("/api/v1/auth/login") ? "INVALID_CREDENTIALS" : "UNAUTHENTICATED";
        }
        if (status == 403) return "FORBIDDEN";
        if (status < 500 || status == 502 || status == 503) {
            String code =
                    exception instanceof BusinessRuleException business
                            ? business.getMessage()
                            : exception instanceof ResponseStatusException responseStatus
                                    ? responseStatus.getReason()
                                    : null;
            if (publicMessage(code) != null) return code;
        }
        if (status == 400 || status == 422) return "VALIDATION_ERROR";
        if (status == 404) return "RESOURCE_NOT_FOUND";
        if (status == 405) return "METHOD_NOT_ALLOWED";
        if (status == 413) return "UPLOAD_TOO_LARGE";
        if (status == 415) return "UNSUPPORTED_CONTENT";
        if (status == 429) return "TOO_MANY_REQUESTS";
        if (status == 409) return "CONFLICT";
        if (status >= 500) return "INTERNAL_ERROR";
        return "REQUEST_REJECTED";
    }

    private String publicMessage(String code) {
        if (code == null) return null;
        return switch (code) {
            case "CHECKOUT_RECONFIRMATION_REQUIRED" ->
                    "Giá hoặc ưu đãi đã thay đổi. Chưa tạo đơn. Vui lòng xem và xác nhận lại báo giá mới.";
            case "PRODUCT_HAS_STOCK" ->
                    "Sản phẩm còn tồn kho. Hãy ngừng bán và xử lý tồn trước khi kết thúc quản lý.";
            case "PRODUCT_HAS_OPEN_ORDERS" ->
                    "Sản phẩm còn liên quan đơn đang xử lý. Hãy ngừng bán để chặn mua mới và tiếp tục xử lý đơn cũ.";
            case "PERMISSION_UNSUPPORTED" ->
                    "Mã quyền không gắn với thao tác được hệ thống hỗ trợ. Hãy chọn quyền từ danh mục hiện có.";
            case "VOUCHER_ISSUED_TERMS_IMMUTABLE" ->
                    "Điều kiện mã đã phát hành được giữ nguyên. Chỉ bật/tắt hoặc tạo mã mới để đổi ưu đãi.";
            case "CURRENT_PASSWORD_INVALID" -> "Mật khẩu hiện tại chưa đúng.";
            case "RECOVERY_LINK_INVALID" ->
                    "Liên kết không hợp lệ, đã sử dụng hoặc hết hạn. Vui lòng yêu cầu liên kết mới.";
            case "EMAIL_REQUIRED" -> "Vui lòng nhập email đã lưu trong hồ sơ tài khoản.";
            case "OTP_MISSING" -> "Chưa có mã xác nhận. Vui lòng yêu cầu gửi mã về email.";
            case "OTP_EXPIRED" -> "Mã xác nhận đã hết hạn sau 2 phút. Vui lòng yêu cầu mã mới.";
            case "OTP_INVALID" -> "Mã xác nhận không đúng hoặc đã sử dụng. Vui lòng kiểm tra lại.";
            case "PASSWORDS_DO_NOT_MATCH" -> "Hai mật khẩu mới chưa khớp. Vui lòng nhập lại.";
            case "RECOVERY_ACCOUNT_NOT_FOUND" ->
                    "Không tìm thấy tài khoản đang hoạt động với email này.";
            case "RECOVERY_EMAIL_AMBIGUOUS" ->
                    "Email đang được nhiều tài khoản sử dụng. Vui lòng cập nhật email riêng trong hồ sơ.";
            case "EMAIL_DELIVERY_FAILED" -> "Chưa gửi được email xác nhận. Vui lòng thử lại sau.";
            case "EMAIL_ALREADY_VERIFIED" -> "Email này đã được xác minh.";
            case "EMAIL_DELIVERY_NOT_CONFIGURED" ->
                    "Chức năng gửi email chưa được cấu hình. Vui lòng liên hệ người quản trị.";
            case "PRIVILEGED_ACCOUNT_USE_STAFF_MANAGEMENT" ->
                    "Tài khoản này có vai trò quản trị. Hãy xử lý trong mục quản lý nhân sự.";
            case "RETURN_ORDER_STATE_INVALID" ->
                    "Chỉ tiếp nhận hàng quay về của đơn đã hủy hoặc đã ghi nhận trả hàng.";
            case "RETURN_SOURCE_INVALID", "RETURN_QUANTITY_EXCEEDED", "RETURN_ALREADY_RECEIVED" ->
                    "Số nhận vượt phần hàng còn chờ tiếp nhận hoặc nguồn hàng không phù hợp. Hãy kiểm tra lịch sử nhận và số hàng thực tế.";
            case "RETURN_IDEMPOTENCY_CONFLICT",
                            "STOCKTAKE_IDEMPOTENCY_CONFLICT",
                            "CORRECTION_IDEMPOTENCY_CONFLICT" ->
                    "Yêu cầu này đã được dùng với nội dung khác. Hãy kiểm tra chứng từ đã ghi trước khi thao tác tiếp.";
            case "STOCKTAKE_STATE_CONFLICT" ->
                    "Kiểm kê này đã được xác nhận hoặc hủy. Không thể ghi lại lần nữa.";
            case "STOCKTAKE_NOT_FOUND", "RECEIPT_NOT_FOUND", "CUSTOMER_NOT_FOUND" ->
                    "Không tìm thấy dữ liệu cần xử lý.";
            case "STOCKTAKE_DUPLICATE_PRODUCT", "STOCKTAKE_ACTION_INVALID" ->
                    "Danh sách kiểm kê hoặc thao tác chưa hợp lệ.";
            case "CORRECTION_REQUIRES_CONFIRMED_RECEIPT", "CORRECTION_SOURCE_INVALID" ->
                    "Điều chỉnh phải gắn đúng dòng của phiếu nhập đã xác nhận.";
            case "CORRECTION_STALE_SOURCE" ->
                    "Phiếu đã có điều chỉnh mới. Hãy tải lại và đối chiếu trước khi sửa.";
            case "CORRECTION_NO_CHANGES" ->
                    "Chưa có thay đổi về số lượng hoặc giá vốn để ghi điều chỉnh.";
            case "REPORT_STATUS_INVALID" -> "Trạng thái lọc báo cáo chưa hợp lệ.";
            case "INVALID_CREDENTIALS" ->
                    "Số điện thoại hoặc mật khẩu chưa đúng. Vui lòng kiểm tra lại.";
            case "UNAUTHENTICATED" -> "Vui lòng đăng nhập hoặc đăng nhập lại để tiếp tục.";
            case "FORBIDDEN" ->
                    "Bạn không có quyền thực hiện thao tác này. Vui lòng liên hệ người quản trị nếu cần hỗ trợ.";
            case "VALIDATION_ERROR" ->
                    "Thông tin chưa hợp lệ. Vui lòng kiểm tra các trường đã nhập.";
            case "RESOURCE_NOT_FOUND" ->
                    "Không tìm thấy nội dung bạn cần. Vui lòng tải lại hoặc quay về danh sách.";
            case "PHONE_ALREADY_IN_USE" ->
                    "Số điện thoại này đã được đăng ký. Vui lòng đăng nhập hoặc dùng số khác.";
            case "ROLE_CODE_ALREADY_EXISTS" ->
                    "Mã vai trò này đã được sử dụng. Vui lòng chọn mã khác.";
            case "PERMISSION_CODE_ALREADY_EXISTS" ->
                    "Mã quyền này đã được sử dụng. Vui lòng chọn mã khác.";
            case "LAST_SUPERADMIN_REQUIRED" ->
                    "Cần giữ lại ít nhất một người có quyền quản trị cao nhất đang hoạt động.";
            case "ROLE_IN_USE" ->
                    "Vai trò đang được gán cho tài khoản. Vui lòng gỡ vai trò khỏi các tài khoản trước khi xóa.";
            case "PERMISSION_IN_USE" ->
                    "Quyền đang được gán cho vai trò. Vui lòng gỡ quyền khỏi các vai trò trước khi xóa.";
            case "SYSTEM_ROLE_PROTECTED" ->
                    "Vai trò mặc định này cần được giữ lại để hệ thống hoạt động.";
            case "SYSTEM_PERMISSION_PROTECTED" ->
                    "Quyền mặc định này cần được giữ lại để hệ thống hoạt động.";
            case "ACCOUNT_STATE_CONFLICT" ->
                    "Trạng thái tài khoản đã thay đổi. Vui lòng tải lại trước khi tiếp tục.";
            case "CART_EMPTY" -> "Giỏ hàng đang trống. Vui lòng thêm sản phẩm trước khi đặt hàng.";
            case "CART_ITEM_NOT_FOUND" ->
                    "Sản phẩm không còn trong giỏ hàng. Vui lòng tải lại giỏ hàng.";
            case "PRODUCT_NOT_AVAILABLE" ->
                    "Sản phẩm hiện không thể mua. Vui lòng chọn sản phẩm khác.";
            case "PRODUCT_SKU_ALREADY_EXISTS" ->
                    "Mã sản phẩm này đã được sử dụng. Vui lòng chọn mã khác.";
            case "PRODUCT_PARENT_INVALID" ->
                    "Sản phẩm đại diện chưa phù hợp. Vui lòng chọn sản phẩm không thuộc nhóm khác.";
            case "PRODUCT_PARENT_NOT_FOUND" ->
                    "Sản phẩm đại diện không còn tồn tại. Vui lòng chọn lại.";
            case "PRODUCT_CATEGORY_INACTIVE" ->
                    "Danh mục đã ngừng hoạt động. Vui lòng chọn danh mục khác.";
            case "PRODUCT_BRAND_INACTIVE" ->
                    "Thương hiệu đã ngừng hoạt động. Vui lòng chọn thương hiệu khác.";
            case "PRODUCT_CATEGORY_NOT_FOUND" ->
                    "Không tìm thấy danh mục đã chọn. Vui lòng tải lại danh sách.";
            case "PRODUCT_BRAND_NOT_FOUND" ->
                    "Không tìm thấy thương hiệu đã chọn. Vui lòng tải lại danh sách.";
            case "PRODUCT_FAMILY_ATTRIBUTES_INCONSISTENT" ->
                    "Thuộc tính trong nhóm sản phẩm chưa thống nhất. Vui lòng kiểm tra lại màu sắc và kích cỡ.";
            case "PRODUCT_FAMILY_COMBINATION_DUPLICATE" ->
                    "Nhóm sản phẩm đã có lựa chọn màu sắc và kích cỡ này. Vui lòng chọn tổ hợp khác.";
            case "PRODUCT_FAMILY_SELECTION_ATTRIBUTES_MISSING" ->
                    "Vui lòng bổ sung thuộc tính lựa chọn cho các sản phẩm trong nhóm.";
            case "CONFLICT" ->
                    "Dữ liệu đã thay đổi hoặc thao tác chưa phù hợp. Vui lòng kiểm tra lại trước khi tiếp tục.";
            case "INTERNAL_ERROR" ->
                    "Chưa thể hoàn tất thao tác lúc này. Vui lòng thử lại sau hoặc liên hệ hỗ trợ nếu lỗi tiếp diễn.";
            case "REQUEST_REJECTED" ->
                    "Chưa thể thực hiện thao tác này. Vui lòng kiểm tra lại thông tin.";
            case "NOT_IMPLEMENTED" -> "Chức năng này chưa được hỗ trợ. Vui lòng quay lại sau.";
            case "METHOD_NOT_ALLOWED" ->
                    "Thao tác này không được hỗ trợ. Vui lòng tải lại trang và thử lại.";
            case "UPLOAD_TOO_LARGE" ->
                    "Tệp tải lên vượt quá dung lượng cho phép. Vui lòng chọn tệp nhỏ hơn.";
            case "UNSUPPORTED_CONTENT" ->
                    "Định dạng nội dung chưa được hỗ trợ. Vui lòng kiểm tra lại thông tin hoặc tệp đã chọn.";
            case "TOO_MANY_REQUESTS" -> "Bạn thao tác quá nhanh. Vui lòng chờ một lát rồi thử lại.";
            case "ADDRESS_FIELDS_REQUIRED" ->
                    "Vui lòng nhập đầy đủ tên, số điện thoại và địa chỉ người nhận.";
            case "EMPTY_PATCH" -> "Vui lòng nhập thông tin cần thay đổi trước khi lưu.";
            case "CONTENT_BODY_REQUIRED" -> "Vui lòng nhập nội dung trang trước khi lưu.";
            case "CONTENT_PAGE_NOT_FOUND" ->
                    "Không tìm thấy trang nội dung. Vui lòng quay lại danh sách.";
            case "CONTENT_PATCH_EMPTY" ->
                    "Vui lòng nhập thông tin trang cần thay đổi trước khi lưu.";
            case "CONTENT_SLUG_CONFLICT" ->
                    "Đường dẫn trang này đã được sử dụng. Vui lòng chọn đường dẫn khác.";
            case "CONTENT_SLUG_INVALID" ->
                    "Đường dẫn trang chưa hợp lệ. Vui lòng dùng chữ thường không dấu, chữ số và dấu gạch ngang.";
            case "CONTENT_STATUS_TRANSITION_NOT_ALLOWED" ->
                    "Trạng thái trang đã thay đổi. Vui lòng tải lại trước khi tiếp tục.";
            case "CONTENT_TITLE_INVALID" ->
                    "Tiêu đề trang chưa hợp lệ. Vui lòng kiểm tra lại tiêu đề.";
            case "GOODS_RECEIPT_DUPLICATE_PRODUCT" ->
                    "Một sản phẩm đang xuất hiện nhiều lần trong phiếu nhập. Vui lòng gộp lại trước khi lưu.";
            case "GOODS_RECEIPT_EMPTY" ->
                    "Phiếu nhập chưa có sản phẩm. Vui lòng thêm sản phẩm trước khi tiếp tục.";
            case "GOODS_RECEIPT_INVALID_ITEM" ->
                    "Thông tin sản phẩm trong phiếu nhập chưa hợp lệ. Vui lòng kiểm tra số lượng và giá vốn.";
            case "GOODS_RECEIPT_INVALID_SOURCE" ->
                    "Nguồn nhập hàng chưa phù hợp. Vui lòng kiểm tra lại phiếu nhập.";
            case "GOODS_RECEIPT_INVALID_STATE" ->
                    "Trạng thái phiếu nhập không cho phép thao tác này. Vui lòng tải lại phiếu.";
            case "INVENTORY_INSUFFICIENT_STOCK" ->
                    "Số lượng hàng hiện có chưa đủ. Vui lòng giảm số lượng hoặc chọn sản phẩm khác.";
            case "INVENTORY_BALANCE_OVERFLOW" ->
                    "Số lượng tồn kho vượt giới hạn cho phép. Vui lòng kiểm tra lại số lượng.";
            case "INVENTORY_MOVEMENT_NOT_FOUND" ->
                    "Không tìm thấy lần nhập hoặc xuất kho này. Vui lòng tải lại danh sách.";
            case "INVENTORY_INVALID_MOVEMENT" ->
                    "Thông tin nhập hoặc xuất kho chưa phù hợp. Vui lòng kiểm tra lại số lượng và lý do.";
            case "IDEMPOTENCY_KEY_REQUIRED" ->
                    "Chưa thể xác nhận lần đặt hàng này. Vui lòng tải lại trang trước khi đặt hàng.";
            case "IDEMPOTENCY_KEY_INVALID" ->
                    "Thông tin xác nhận đặt hàng chưa hợp lệ. Vui lòng tải lại trang và kiểm tra đơn hàng trước khi thử lại.";
            case "IDEMPOTENCY_PAYLOAD_MISMATCH" ->
                    "Thông tin đặt hàng đã thay đổi. Vui lòng kiểm tra đơn đã tạo trước khi đặt lại.";
            case "ORDER_NOT_FOUND" ->
                    "Không tìm thấy đơn hàng. Vui lòng quay lại danh sách đơn hàng.";
            case "ORDER_ACTION_INVALID" ->
                    "Thao tác với đơn hàng chưa hợp lệ. Vui lòng tải lại đơn hàng.";
            case "ORDER_AFTER_SALES_ACTION_INVALID" ->
                    "Thao tác sau bán hàng chưa hợp lệ. Vui lòng kiểm tra lại lựa chọn.";
            case "ORDER_AFTER_SALES_NOT_ALLOWED" ->
                    "Đơn hàng hiện chưa thể xử lý trả hàng hoặc hoàn tiền. Vui lòng kiểm tra trạng thái đơn.";
            case "ORDER_COD_COLLECTION_NOT_ALLOWED" ->
                    "Đơn hàng hiện chưa thể ghi nhận thu tiền khi giao hàng. Vui lòng kiểm tra trạng thái đơn.";
            case "ORDER_PAYMENT_ACTION_INVALID" ->
                    "Thao tác thanh toán chưa hợp lệ. Vui lòng kiểm tra lại lựa chọn.";
            case "ORDER_REFUND_REASON_REQUIRED" ->
                    "Vui lòng nhập lý do hoàn tiền trước khi tiếp tục.";
            case "ORDER_TRANSITION_ALREADY_APPLIED" ->
                    "Đơn hàng đã được xử lý trước đó. Vui lòng tải lại để xem trạng thái mới nhất.";
            case "ORDER_TRANSITION_NOT_ALLOWED" ->
                    "Trạng thái đơn hàng hiện không cho phép thao tác này. Vui lòng tải lại đơn hàng.";
            case "PAYMENT_ALREADY_COLLECTED" ->
                    "Đơn hàng đã được ghi nhận thu tiền. Vui lòng tải lại để kiểm tra.";
            case "PAYMENT_ALREADY_REFUNDED" ->
                    "Đơn hàng đã được ghi nhận hoàn tiền. Vui lòng tải lại để kiểm tra.";
            case "VOUCHER_CODE_ALREADY_EXISTS" ->
                    "Mã giảm giá này đã được sử dụng. Vui lòng chọn mã khác.";
            case "VOUCHER_CONFIGURATION_INVALID" ->
                    "Thông tin mã giảm giá chưa hợp lệ. Vui lòng kiểm tra mức giảm và điều kiện áp dụng.";
            case "VOUCHER_MINIMUM_ORDER_NOT_MET" ->
                    "Giá trị đơn hàng chưa đạt mức tối thiểu để dùng mã giảm giá này.";
            case "VOUCHER_NOT_ELIGIBLE" ->
                    "Mã giảm giá không áp dụng cho đơn hàng này. Vui lòng kiểm tra điều kiện hoặc chọn mã khác.";
            case "VOUCHER_NOT_FOUND" ->
                    "Không tìm thấy mã giảm giá. Vui lòng kiểm tra lại mã đã nhập.";
            case "VOUCHER_PERCENT_BPS_OUT_OF_RANGE" ->
                    "Tỷ lệ giảm giá phải lớn hơn 0% và không vượt quá 100%.";
            case "VOUCHER_QUOTA_CONFLICT" ->
                    "Lượt sử dụng mã giảm giá đã thay đổi. Vui lòng kiểm tra lại hoặc chọn mã khác.";
            case "VOUCHER_STATUS_TRANSITION_INVALID" ->
                    "Trạng thái mã giảm giá không cho phép thay đổi này. Vui lòng tải lại trước khi tiếp tục.";
            case "VOUCHER_USAGE_LIMIT_INVALID" ->
                    "Giới hạn lượt sử dụng chưa hợp lệ và không được thấp hơn số lượt đã dùng.";
            case "VOUCHER_USAGE_LIMIT_REACHED" ->
                    "Mã giảm giá đã hết lượt sử dụng. Vui lòng chọn mã khác.";
            case "VOUCHER_WINDOW_INVALID" ->
                    "Thời gian kết thúc mã giảm giá phải sau thời gian bắt đầu.";
            case "MONEY_OVERFLOW" ->
                    "Số tiền vượt giới hạn cho phép. Vui lòng kiểm tra lại giá và số lượng.";
            case "MONEY_TOTAL_MISMATCH" ->
                    "Số tiền đã thay đổi. Vui lòng kiểm tra lại đơn hàng trước khi tiếp tục.";
            case "AUDIT_ACTION_FILTER_INVALID" ->
                    "Điều kiện tra cứu lịch sử hoạt động chưa hợp lệ. Vui lòng kiểm tra bộ lọc và khoảng thời gian.";
            case "AUDIT_ENTITY_ID_FILTER_INVALID" ->
                    "Điều kiện tra cứu lịch sử hoạt động chưa hợp lệ. Vui lòng kiểm tra bộ lọc và khoảng thời gian.";
            case "AUDIT_ENTITY_TYPE_FILTER_INVALID" ->
                    "Điều kiện tra cứu lịch sử hoạt động chưa hợp lệ. Vui lòng kiểm tra bộ lọc và khoảng thời gian.";
            case "AUDIT_FILTER_INVALID" ->
                    "Điều kiện tra cứu lịch sử hoạt động chưa hợp lệ. Vui lòng kiểm tra bộ lọc và khoảng thời gian.";
            case "AUDIT_FILTER_UNKNOWN" ->
                    "Điều kiện tra cứu lịch sử hoạt động chưa hợp lệ. Vui lòng kiểm tra bộ lọc và khoảng thời gian.";
            case "AUDIT_TIME_RANGE_INVALID" ->
                    "Điều kiện tra cứu lịch sử hoạt động chưa hợp lệ. Vui lòng kiểm tra bộ lọc và khoảng thời gian.";
            case "INVENTORY_IDEMPOTENCY_CONFLICT" ->
                    "Thông tin nhập hoặc xuất kho đã thay đổi hoặc chưa phù hợp. Vui lòng tải lại và kiểm tra chứng từ trước khi tiếp tục.";
            case "INVENTORY_ORDER_MOVEMENT_CONFLICT" ->
                    "Thông tin nhập hoặc xuất kho đã thay đổi hoặc chưa phù hợp. Vui lòng tải lại và kiểm tra chứng từ trước khi tiếp tục.";
            case "INVENTORY_ORDER_MOVEMENT_INVALID" ->
                    "Thông tin nhập hoặc xuất kho đã thay đổi hoặc chưa phù hợp. Vui lòng tải lại và kiểm tra chứng từ trước khi tiếp tục.";
            case "INVENTORY_ORDER_SOURCE_INVALID" ->
                    "Thông tin nhập hoặc xuất kho đã thay đổi hoặc chưa phù hợp. Vui lòng tải lại và kiểm tra chứng từ trước khi tiếp tục.";
            case "INVENTORY_SOURCE_CONFLICT" ->
                    "Thông tin nhập hoặc xuất kho đã thay đổi hoặc chưa phù hợp. Vui lòng tải lại và kiểm tra chứng từ trước khi tiếp tục.";
            case "ORDER_RETURN_WINDOW_EXPIRED" ->
                    "Đơn hàng đã quá thời hạn trả hàng trong vòng hai ngày. Vui lòng liên hệ hỗ trợ.";
            case "PHONE_INVALID" -> "Số điện thoại chưa hợp lệ. Vui lòng kiểm tra lại.";
            case "PRODUCT_FILTER_INVALID" ->
                    "Lựa chọn lọc sản phẩm chưa hợp lệ. Vui lòng chọn lại thuộc tính.";
            case "IMAGE_ADDRESS_INVALID" ->
                    "Đường dẫn ảnh chưa hợp lệ. Vui lòng chọn lại ảnh hoặc kiểm tra đường dẫn.";
            case "IMAGE_ORDER_INVALID" -> "Thứ tự ảnh chưa hợp lệ. Vui lòng sắp xếp lại ảnh.";
            case "IMAGE_ORDER_INCOMPLETE" ->
                    "Thứ tự ảnh chưa đầy đủ. Vui lòng tải lại danh sách ảnh và sắp xếp lại.";
            case "IMAGE_GALLERY_UNAVAILABLE" ->
                    "Bộ ảnh sản phẩm cần được kiểm tra trước khi chỉnh sửa. Vui lòng liên hệ hỗ trợ.";
            case "PRODUCT_STATUS_INVALID" -> "Trạng thái sản phẩm chưa hợp lệ. Vui lòng chọn lại.";
            case "CATALOG_STATUS_INVALID" ->
                    "Trạng thái danh mục hoặc thương hiệu chưa hợp lệ. Vui lòng chọn lại.";
            case "ATTRIBUTE_CODE_ALREADY_EXISTS" ->
                    "Mã thuộc tính đã được sử dụng. Vui lòng chọn mã khác.";
            case "PRODUCT_REQUIRED_ATTRIBUTE_MISSING" ->
                    "Sản phẩm đang bán chưa có đủ thuộc tính bắt buộc. Vui lòng bổ sung trước khi tiếp tục.";
            case "ATTRIBUTE_CHANGE_REQUIRED" ->
                    "Vui lòng nhập thông tin thuộc tính cần thay đổi trước khi lưu.";
            case "ATTRIBUTE_OPTION_ALREADY_EXISTS" ->
                    "Giá trị lựa chọn này đã có trong thuộc tính. Vui lòng chọn giá trị khác.";
            case "ATTRIBUTE_OPTION_CHANGE_REQUIRED" ->
                    "Vui lòng nhập giá trị lựa chọn cần thay đổi trước khi lưu.";
            case "ATTRIBUTE_NOT_FOUND" ->
                    "Không tìm thấy thuộc tính hoặc giá trị đã chọn. Vui lòng tải lại danh sách.";
            case "CATEGORY_CHANGE_REQUIRED" ->
                    "Vui lòng nhập thông tin danh mục cần thay đổi trước khi lưu.";
            case "CATEGORY_IN_USE" ->
                    "Danh mục đang có danh mục con hoặc sản phẩm sử dụng. Vui lòng kiểm tra trước khi xóa.";
            case "BRAND_CHANGE_REQUIRED" ->
                    "Vui lòng nhập thông tin thương hiệu cần thay đổi trước khi lưu.";
            case "BRAND_IN_USE" ->
                    "Thương hiệu đang được sản phẩm sử dụng. Vui lòng kiểm tra trước khi xóa.";
            case "CATEGORY_PARENT_INVALID" ->
                    "Danh mục không thể trực thuộc chính nó. Vui lòng chọn danh mục cha khác.";
            case "CATEGORY_HIERARCHY_INVALID" ->
                    "Cách chọn danh mục cha tạo ra vòng lặp. Vui lòng chọn danh mục nằm ngoài các danh mục con hiện tại.";
            case "CATEGORY_ADDRESS_ALREADY_EXISTS" ->
                    "Đường dẫn danh mục đã được sử dụng. Vui lòng chọn tên hoặc đường dẫn khác.";
            case "BRAND_ADDRESS_ALREADY_EXISTS" ->
                    "Đường dẫn thương hiệu đã được sử dụng. Vui lòng chọn tên hoặc đường dẫn khác.";
            case "CATALOG_NAME_INVALID" ->
                    "Tên chưa tạo được đường dẫn hợp lệ. Vui lòng bổ sung chữ cái hoặc chữ số.";
            case "ATTRIBUTE_VALUE_INVALID" ->
                    "Giá trị thuộc tính chưa hợp lệ. Vui lòng chọn lại từ danh sách.";
            case "ATTRIBUTE_VALUE_DUPLICATE" ->
                    "Một giá trị thuộc tính đang được chọn nhiều lần. Vui lòng bỏ lựa chọn trùng.";
            case "ATTRIBUTE_VALUE_NOT_FOUND" ->
                    "Không tìm thấy giá trị thuộc tính đã chọn. Vui lòng tải lại danh sách.";
            case "ATTRIBUTE_MULTIPLE_VALUES" ->
                    "Mỗi thuộc tính chỉ được chọn một giá trị. Vui lòng kiểm tra lại lựa chọn.";
            case "PRODUCT_ATTRIBUTES_REQUIRED" ->
                    "Vui lòng bổ sung đầy đủ thuộc tính bắt buộc trước khi cho phép bán sản phẩm.";
            case "PRODUCT_HAS_CHILDREN" ->
                    "Sản phẩm đại diện đang có sản phẩm trong nhóm. Vui lòng kiểm tra các sản phẩm trong nhóm trước khi xóa.";
            case "IMAGE_REQUIRED" -> "Vui lòng chọn ít nhất một ảnh trước khi tải lên.";
            case "IMAGE_COUNT_EXCEEDED" ->
                    "Số ảnh đã chọn vượt giới hạn một lần tải. Vui lòng bỏ bớt ảnh.";
            case "IMAGE_EMPTY" -> "Ảnh đã chọn không có nội dung. Vui lòng chọn ảnh khác.";
            case "IMAGE_TOO_LARGE" ->
                    "Ảnh vượt quá dung lượng cho phép. Vui lòng chọn ảnh nhỏ hơn.";
            case "IMAGE_FORMAT_UNSUPPORTED" ->
                    "Định dạng ảnh chưa được hỗ trợ. Vui lòng chọn ảnh đúng định dạng cho phép.";
            case "IMAGE_CONTENT_INVALID" ->
                    "Nội dung tệp không khớp định dạng ảnh. Vui lòng chọn lại ảnh.";
            case "IMAGE_UNREADABLE" ->
                    "Không đọc được ảnh đã chọn. Vui lòng chọn lại ảnh và thử lại.";
            case "PRODUCT_NOT_FOUND" -> "Không tìm thấy sản phẩm. Vui lòng chọn lại từ danh sách.";
            case "PRODUCT_FILTER_ATTRIBUTE_NOT_FOUND" ->
                    "Không tìm thấy thuộc tính dùng để lọc. Vui lòng tải lại và chọn lại bộ lọc.";
            case "PRODUCT_FILTER_OPTION_NOT_FOUND" ->
                    "Giá trị lọc sản phẩm không còn phù hợp. Vui lòng chọn lại bộ lọc.";
            case "PRODUCT_PRICE_RANGE_INVALID" ->
                    "Giá thấp nhất không được lớn hơn giá cao nhất. Vui lòng kiểm tra lại khoảng giá.";
            case "REPORT_LIMIT_INVALID" ->
                    "Số kết quả báo cáo phải từ 1 đến 100. Vui lòng chọn lại.";
            case "REPORT_PERIOD_REQUIRED" -> "Vui lòng chọn cách tổng hợp báo cáo theo thời gian.";
            case "REPORT_DATE_RANGE_INVALID" ->
                    "Khoảng thời gian báo cáo chưa hợp lệ. Vui lòng kiểm tra lại ngày bắt đầu và ngày kết thúc.";
            default -> null;
        };
    }

    private String diagnosticMessage(Exception exception, int status) {
        if (exception instanceof ConcurrencyFailureException) {
            return "Database concurrency conflict: transaction could not acquire or retain its lock";
        }
        if (exception instanceof DataIntegrityViolationException) {
            return "Database write rejected by an integrity constraint";
        }
        return switch (status) {
            case 400 -> "Request validation or format is invalid";
            case 403 -> "Access to the requested operation was denied";
            case 404 -> "Requested resource was not found";
            case 409 -> "Operation conflicts with the current resource state";
            case 501 -> "Requested operation is not implemented";
            case 502 -> "Upstream service rejected the request or returned invalid data";
            case 503 -> "Required service is unavailable or not configured";
            case 504 -> "Upstream service request timed out";
            default ->
                    status >= 500
                            ? "Unexpected server failure while processing request"
                            : "Request was rejected";
        };
    }

    private String numericPathIds(HttpServletRequest request) {
        Object variables = request.getAttribute(HandlerMapping.URI_TEMPLATE_VARIABLES_ATTRIBUTE);
        if (!(variables instanceof Map<?, ?> paths)) return "{}";
        return paths.entrySet().stream()
                .filter(
                        entry ->
                                entry.getValue() instanceof String value
                                        && value.matches("[0-9]{1,19}"))
                .map(entry -> entry.getKey() + "=" + entry.getValue())
                .collect(Collectors.joining(",", "{", "}"));
    }

    private Throwable diagnosticTrace(Throwable failure, int depth) {
        // Thông báo lỗi gốc có thể chứa tham số SQL, mật khẩu hoặc URL/token của dịch vụ ngoài.
        Throwable safe = new Throwable(failure.getClass().getName());
        safe.setStackTrace(failure.getStackTrace());
        if (failure.getCause() != null && failure.getCause() != failure && depth < 8) {
            safe.initCause(diagnosticTrace(failure.getCause(), depth + 1));
        }
        return safe;
    }
}
