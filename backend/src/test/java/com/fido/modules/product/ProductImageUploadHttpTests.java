package com.fido.modules.product;

import static java.nio.charset.StandardCharsets.UTF_8;
import static org.junit.jupiter.api.Assertions.assertEquals;

import com.fido.modules.product.service.ImageStorageGateway;
import com.fido.modules.product.service.ProductImageStorageException;
import java.io.ByteArrayOutputStream;
import java.net.URI;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Deque;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.http.HttpStatus;
import org.springframework.web.multipart.MultipartFile;

@Import(ProductImageUploadHttpTests.StorageTestConfig.class)
class ProductImageUploadHttpTests extends CatalogHttpSupport {

    @Autowired
    StubImageStorageGateway storage;

    @BeforeEach
    void resetStorage() {
        storage.reset();
    }

    @Test
    void multipartUploadPersistsImagesInRequestOrderAndEstablishesCover()
            throws Exception {
        Employee writer = employee(customRole(ensurePermission("CATALOG_WRITE")));
        var fixture = createCatalog(writer);
        clearImages(fixture.productId());

        storage.succeed(
                "https://storage.test/front.png",
                "https://storage.test/back.png"
        );

        var response = uploadImages(
                fixture.productId(),
                writer.token(),
                List.of(
                        imagePart("front.png"),
                        imagePart("back.png")
                )
        );

        assertEquals(201, response.status(), response.body());
        assertEquals(
                List.of(
                        "https://storage.test/front.png",
                        "https://storage.test/back.png"
                ),
                responseImageUrls(response)
        );
        assertEquals(List.of(0, 1), responseSortOrders(response));
        assertEquals(List.of("front.png", "back.png"), storage.uploadedFilenames());
        assertEquals(
                List.of(
                        "https://storage.test/front.png",
                        "https://storage.test/back.png"
                ),
                storedImageUrls(fixture.productId())
        );

        var publicList = call(
                "GET",
                "/api/v1/catalog/products?q=FIDO",
                null,
                null
        );
        assertEquals(200, publicList.status(), publicList.body());
        assertEquals(
                "https://storage.test/front.png",
                publicList.data().get("data").get(0).get("thumbnail").asText()
        );

        var publicDetail = call(
                "GET",
                "/api/v1/catalog/products/" + fixture.productId(),
                null,
                null
        );
        assertEquals(200, publicDetail.status(), publicDetail.body());
        assertEquals(
                "https://storage.test/front.png",
                publicDetail.data().get("data").get("images").get(0)
                        .get("image_url").asText()
        );
        assertEquals(
                0,
                publicDetail.data().get("data").get("images").get(0)
                        .get("sort_order").asInt()
        );
    }

    @Test
    void multipartUploadRequiresCatalogWriteBeforeCallingStorage()
            throws Exception {
        Employee writer = employee(customRole(ensurePermission("CATALOG_WRITE")));
        Employee reader = employee(customRole(ensurePermission("CATALOG_READ")));
        var fixture = createCatalog(writer);
        int imagesBefore = imageCount(fixture.productId());

        storage.succeed("https://storage.test/forbidden.png");

        var response = uploadImages(
                fixture.productId(),
                reader.token(),
                List.of(imagePart("forbidden.png"))
        );

        assertEquals(403, response.status(), response.body());
        assertEquals(List.of(), storage.uploadedFilenames());
        assertEquals(imagesBefore, imageCount(fixture.productId()));
    }

    @Test
    void multipartUploadRejectsForgedMimeBeforeCallingStorage()
            throws Exception {
        Employee writer = employee(customRole(ensurePermission("CATALOG_WRITE")));
        var fixture = createCatalog(writer);
        int imagesBefore = imageCount(fixture.productId());

        var response = uploadImages(
                fixture.productId(),
                writer.token(),
                List.of(
                        new UploadPart(
                                "forged.png",
                                "image/png",
                                "not-an-image".getBytes(UTF_8)
                        )
                )
        );

        assertEquals(400, response.status(), response.body());
        assertEquals(List.of(), storage.uploadedFilenames());
        assertEquals(imagesBefore, imageCount(fixture.productId()));
    }

    @Test
    void multipartUploadRejectsUnsupportedFormatBeforeCallingStorage()
            throws Exception {
        Employee writer = employee(customRole(ensurePermission("CATALOG_WRITE")));
        var fixture = createCatalog(writer);
        int imagesBefore = imageCount(fixture.productId());

        var response = uploadImages(
                fixture.productId(),
                writer.token(),
                List.of(
                        new UploadPart(
                                "animation.gif",
                                "image/gif",
                                "GIF89a".getBytes(UTF_8)
                        )
                )
        );

        assertEquals(400, response.status(), response.body());
        assertEquals(List.of(), storage.uploadedFilenames());
        assertEquals(imagesBefore, imageCount(fixture.productId()));
    }

    @Test
    void multipartUploadRejectsEmptyFileBeforeCallingStorage()
            throws Exception {
        Employee writer = employee(customRole(ensurePermission("CATALOG_WRITE")));
        var fixture = createCatalog(writer);
        int imagesBefore = imageCount(fixture.productId());

        var response = uploadImages(
                fixture.productId(),
                writer.token(),
                List.of(new UploadPart("empty.png", "image/png", new byte[0]))
        );

        assertEquals(400, response.status(), response.body());
        assertEquals(List.of(), storage.uploadedFilenames());
        assertEquals(imagesBefore, imageCount(fixture.productId()));
    }

    @Test
    void multipartLayerRejectsExcessiveFileCountBeforeCallingStorage()
            throws Exception {
        Employee writer = employee(customRole(ensurePermission("CATALOG_WRITE")));
        var fixture = createCatalog(writer);
        int imagesBefore = imageCount(fixture.productId());

        var parts = new ArrayList<UploadPart>();
        for (int index = 0; index < 11; index++) {
            parts.add(imagePart("image-" + index + ".png"));
        }

        var response = uploadImages(
                fixture.productId(),
                writer.token(),
                List.copyOf(parts)
        );

        assertEquals(413, response.status(), response.body());
        assertEquals(List.of(), storage.uploadedFilenames());
        assertEquals(imagesBefore, imageCount(fixture.productId()));
    }

    @Test
    void storageFailureReturnsGatewayErrorWithoutPersistingProductImage()
            throws Exception {
        Employee writer = employee(customRole(ensurePermission("CATALOG_WRITE")));
        var fixture = createCatalog(writer);
        clearImages(fixture.productId());

        storage.fail(
                HttpStatus.BAD_GATEWAY,
                "Image storage request failed"
        );

        var response = uploadImages(
                fixture.productId(),
                writer.token(),
                List.of(imagePart("failed.png"))
        );

        assertEquals(502, response.status(), response.body());
        assertEquals(List.of("failed.png"), storage.uploadedFilenames());
        assertEquals(0, imageCount(fixture.productId()));
    }

    @Test
    void laterProviderFailureKeepsExistingGalleryAndDoesNotPersistSuccessfulPrefix()
            throws Exception {
        Employee writer = employee(customRole(ensurePermission("CATALOG_WRITE")));
        long productId = createCatalog(writer).productId();
        List<String> before = storedImageUrls(productId);
        storage.succeedThenFail("https://storage.test/orphan.png", HttpStatus.BAD_GATEWAY);

        Result response = uploadImages(productId, writer.token(), List.of(
                imagePart("success.png"), imagePart("failure.png"), imagePart("not-attempted.png")));

        assertEquals(502, response.status(), response.body());
        assertEquals(List.of("success.png", "failure.png"), storage.uploadedFilenames());
        assertEquals(before, storedImageUrls(productId));
    }

    @Test
    void providerTimeoutReturns504AndKeepsExistingGallery() throws Exception {
        Employee writer = employee(customRole(ensurePermission("CATALOG_WRITE")));
        long productId = createCatalog(writer).productId();
        List<String> before = storedImageUrls(productId);
        storage.fail(HttpStatus.GATEWAY_TIMEOUT, "Image storage request timed out");

        Result response = uploadImages(productId, writer.token(), List.of(imagePart("timeout.png")));

        assertEquals(504, response.status(), response.body());
        assertEquals(List.of("timeout.png"), storage.uploadedFilenames());
        assertEquals(before, storedImageUrls(productId));
    }

    @Test
    void invalidSecondProviderUrlRollsBackAlreadyInsertedPrefix() throws Exception {
        Employee writer = employee(customRole(ensurePermission("CATALOG_WRITE")));
        long productId = createCatalog(writer).productId();
        List<String> before = storedImageUrls(productId);
        // The second provider URL is rejected before it reaches VARCHAR(1000); the first insert must roll back.
        storage.succeed("https://storage.test/valid.png", "https://storage.test/" + "x".repeat(1001));

        Result response = uploadImages(productId, writer.token(),
                List.of(imagePart("first.png"), imagePart("second.png")));

        assertEquals(502, response.status(), response.body());
        assertEquals(List.of("first.png", "second.png"), storage.uploadedFilenames());
        assertEquals(before, storedImageUrls(productId));
    }

    private Result uploadImages(
            long productId,
            String token,
            List<UploadPart> parts
    ) throws Exception {
        String boundary = "----FidoBoundary" + UUID.randomUUID();
        byte[] body = multipartBody(boundary, parts);

        var request = HttpRequest.newBuilder(
                        URI.create(
                                "http://localhost:" + port
                                        + "/api/v1/admin/products/"
                                        + productId
                                        + "/images"
                        )
                )
                .header("Accept", "application/json")
                .header("Authorization", "Bearer " + token)
                .header(
                        "Content-Type",
                        "multipart/form-data; boundary=" + boundary
                )
                .POST(HttpRequest.BodyPublishers.ofByteArray(body))
                .build();

        var response = client.send(
                request,
                HttpResponse.BodyHandlers.ofString()
        );

        return new Result(
                response.statusCode(),
                response.body().isBlank()
                        ? null
                        : json.readTree(response.body()),
                response.body()
        );
    }

    private byte[] multipartBody(
            String boundary,
            List<UploadPart> parts
    ) {
        var output = new ByteArrayOutputStream();

        for (UploadPart part : parts) {
            write(output, "--" + boundary + "\r\n");
            write(
                    output,
                    "Content-Disposition: form-data; name=\"images\"; filename=\""
                            + part.filename()
                            + "\"\r\n"
            );
            write(output, "Content-Type: " + part.contentType() + "\r\n\r\n");
            output.writeBytes(part.content());
            write(output, "\r\n");
        }

        write(output, "--" + boundary + "--\r\n");
        return output.toByteArray();
    }

    private void write(ByteArrayOutputStream output, String value) {
        output.writeBytes(value.getBytes(UTF_8));
    }

    private UploadPart imagePart(String filename) {
        return new UploadPart(
                filename,
                "image/png",
                pngBytes()
        );
    }

    private byte[] pngBytes() {
        return new byte[]{
                (byte) 0x89,
                0x50,
                0x4E,
                0x47,
                0x0D,
                0x0A,
                0x1A,
                0x0A,
                0,
                0,
                0,
                0
        };
    }

    private void clearImages(long productId) {
        db.update(
                "DELETE FROM product_images WHERE product_id=?",
                productId
        );
    }

    private int imageCount(long productId) {
        return db.queryForObject(
                "SELECT COUNT(*) FROM product_images WHERE product_id=?",
                Integer.class,
                productId
        );
    }

    private List<String> storedImageUrls(long productId) {
        return db.query(
                """
                SELECT image_url
                FROM product_images
                WHERE product_id=?
                ORDER BY sort_order
                """,
                (resultSet, rowNumber) -> resultSet.getString(1),
                productId
        );
    }

    private List<String> responseImageUrls(Result response) {
        var urls = new ArrayList<String>();
        for (var image : response.data().get("data").get("images")) {
            urls.add(image.get("image_url").asText());
        }
        return List.copyOf(urls);
    }

    private List<Integer> responseSortOrders(Result response) {
        var orders = new ArrayList<Integer>();
        for (var image : response.data().get("data").get("images")) {
            orders.add(image.get("sort_order").asInt());
        }
        return List.copyOf(orders);
    }

    private record UploadPart(
            String filename,
            String contentType,
            byte[] content
    ) {
    }

    @TestConfiguration(proxyBeanMethods = false)
    static class StorageTestConfig {

        @Bean
        @Primary
        StubImageStorageGateway imageStorageGateway() {
            return new StubImageStorageGateway();
        }
    }

    static final class StubImageStorageGateway implements ImageStorageGateway {

        private final Deque<String> urls = new ArrayDeque<>();
        private final List<String> uploadedFilenames = new ArrayList<>();
        private ProductImageStorageException failure;

        synchronized void reset() {
            urls.clear();
            uploadedFilenames.clear();
            failure = null;
        }

        synchronized void succeed(String... uploadedUrls) {
            reset();
            urls.addAll(Arrays.asList(uploadedUrls));
        }

        synchronized void fail(HttpStatus status, String reason) {
            reset();
            failure = new ProductImageStorageException(status, reason);
        }

        synchronized void succeedThenFail(String uploadedUrl, HttpStatus status) {
            succeed(uploadedUrl);
            failure = new ProductImageStorageException(status, "Image storage request failed");
        }

        synchronized List<String> uploadedFilenames() {
            return List.copyOf(uploadedFilenames);
        }

        @Override
        public synchronized UploadedImage upload(MultipartFile image) {
            uploadedFilenames.add(image.getOriginalFilename());

            if (failure != null && urls.isEmpty()) {
                throw failure;
            }
            if (urls.isEmpty()) {
                throw new IllegalStateException(
                        "No test image URL configured for upload"
                );
            }

            return new UploadedImage(urls.removeFirst());
        }
    }
}
