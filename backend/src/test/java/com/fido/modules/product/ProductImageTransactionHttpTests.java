package com.fido.modules.product;

import static java.nio.charset.StandardCharsets.UTF_8;
import static org.junit.jupiter.api.Assertions.assertEquals;

import java.io.ByteArrayOutputStream;
import java.net.URI;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Import;

@Import(ProductImageUploadHttpTests.StorageTestConfig.class)
class ProductImageTransactionHttpTests extends CatalogHttpSupport {

    @Autowired
    ProductImageUploadHttpTests.StubImageStorageGateway storage;

    @BeforeEach
    void resetStorage() {
        storage.reset();
    }

    @Test
    void databaseConflictRollsBackNewImageRowAfterProviderUpload()
            throws Exception {
        Employee writer = employee(customRole(ensurePermission("CATALOG_WRITE")));
        var fixture = createCatalog(writer);

        db.update(
                "DELETE FROM product_images WHERE product_id=?",
                fixture.productId()
        );
        insertImage(fixture.productId(), "https://cdn.test/existing-cover.jpg", 0);
        insertImage(fixture.productId(), "https://cdn.test/existing-gap.jpg", 2);

        storage.succeed("https://cdn.test/provider-upload.jpg");

        Result response = uploadImage(
                fixture.productId(),
                writer.token(),
                "new.png"
        );

        assertEquals(409, response.status(), response.body());
        assertEquals(List.of("new.png"), storage.uploadedFilenames());
        assertEquals(
                2,
                db.queryForObject(
                        "SELECT COUNT(*) FROM product_images WHERE product_id=?",
                        Integer.class,
                        fixture.productId()
                )
        );
        assertEquals(
                0,
                db.queryForObject(
                        """
                        SELECT COUNT(*)
                        FROM product_images
                        WHERE product_id=? AND image_url=?
                        """,
                        Integer.class,
                        fixture.productId(),
                        "https://cdn.test/provider-upload.jpg"
                )
        );
    }

    private void insertImage(long productId, String url, int sortOrder) {
        db.update(
                """
                INSERT INTO product_images(product_id,image_url,alt_text,sort_order)
                VALUES (?,?,NULL,?)
                """,
                productId,
                url,
                sortOrder
        );
    }

    private Result uploadImage(
            long productId,
            String token,
            String filename
    ) throws Exception {
        String boundary = "----FidoBoundary" + UUID.randomUUID();
        byte[] body = multipartBody(boundary, filename);

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

    private byte[] multipartBody(String boundary, String filename) {
        var output = new ByteArrayOutputStream();
        write(output, "--" + boundary + "\r\n");
        write(
                output,
                "Content-Disposition: form-data; name=\"images\"; filename=\""
                        + filename
                        + "\"\r\n"
        );
        write(output, "Content-Type: image/png\r\n\r\n");
        output.writeBytes(pngBytes());
        write(output, "\r\n--" + boundary + "--\r\n");
        return output.toByteArray();
    }

    private void write(ByteArrayOutputStream output, String value) {
        output.writeBytes(value.getBytes(UTF_8));
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
}
