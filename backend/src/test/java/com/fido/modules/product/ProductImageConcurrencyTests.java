package com.fido.modules.product;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.doAnswer;

import com.fido.modules.product.dto.request.ProductImageReorderRequest;
import com.fido.modules.product.dto.response.AdminProductDetailDto;
import com.fido.modules.product.service.CatalogReferenceService;
import com.fido.modules.product.service.ImageStorageGateway.UploadedImage;
import com.fido.modules.product.service.ProductImageAdminService;
import java.util.List;
import java.util.Set;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.stream.IntStream;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;

class ProductImageConcurrencyTests extends CatalogHttpSupport {

    @Autowired
    ProductImageAdminService imageCommands;

    @MockitoSpyBean
    CatalogReferenceService references;

    @ParameterizedTest
    @ValueSource(booleans = {true, false})
    void parallelAppendPreservesBothBatchesAndDenseOrder(boolean emptyGallery)
            throws Exception {
        Employee writer = employee(customRole(ensurePermission("CATALOG_WRITE")));
        long productId = createCatalog(writer).productId();
        if (emptyGallery) {
            db.update("DELETE FROM product_images WHERE product_id=?", productId);
        }
        List<String> original = storedUrls(productId);
        String first = "https://storage.test/parallel-a.png";
        String second = "https://storage.test/parallel-b.png";

        meetBeforeProductLock(productId);
        runConcurrently(
                () -> imageCommands.appendUploadedImages(
                        writer.id(), productId, List.of(new UploadedImage(first))),
                () -> imageCommands.appendUploadedImages(
                        writer.id(), productId, List.of(new UploadedImage(second)))
        );

        List<String> stored = storedUrls(productId);
        assertEquals(original.size() + 2, stored.size());
        assertEquals(original, stored.subList(0, original.size()));
        assertEquals(Set.of(first, second), Set.copyOf(stored.subList(original.size(), stored.size())));
        assertDenseOrder(productId, stored.size());
    }

    @Test
    void parallelReordersCommitOneCompletePermutationWithoutLosingImages()
            throws Exception {
        Employee writer = employee(customRole(ensurePermission("CATALOG_WRITE")));
        long productId = createCatalog(writer).productId();
        db.update("INSERT INTO product_images(product_id,image_url,sort_order) VALUES (?,?,1)",
                productId, "https://storage.test/second.png");
        db.update("INSERT INTO product_images(product_id,image_url,sort_order) VALUES (?,?,2)",
                productId, "https://storage.test/third.png");
        List<Long> original = storedIds(productId);
        List<Long> first = List.of(original.get(2), original.get(0), original.get(1));
        List<Long> second = List.of(original.get(1), original.get(2), original.get(0));

        meetBeforeProductLock(productId);
        List<AdminProductDetailDto> responses = runConcurrently(
                () -> imageCommands.reorderImages(writer.id(), productId, reorder(first)),
                () -> imageCommands.reorderImages(writer.id(), productId, reorder(second))
        );

        assertEquals(first, responses.get(0).images().stream().map(image -> image.image_id()).toList());
        assertEquals(second, responses.get(1).images().stream().map(image -> image.image_id()).toList());
        List<Long> stored = storedIds(productId);
        assertTrue(stored.equals(first) || stored.equals(second), stored.toString());
        assertDenseOrder(productId, original.size());
    }

    private void meetBeforeProductLock(long productId) {
        // Both real transactions reach the lock boundary before either can mutate the gallery.
        var ready = new CountDownLatch(2);
        doAnswer(invocation -> {
            ready.countDown();
            assertTrue(ready.await(10, TimeUnit.SECONDS), "Both image commands must reach the lock");
            return invocation.callRealMethod();
        }).when(references).productForUpdate(productId);
    }

    private List<AdminProductDetailDto> runConcurrently(
            Callable<AdminProductDetailDto> first,
            Callable<AdminProductDetailDto> second
    ) throws Exception {
        var executor = Executors.newFixedThreadPool(2);
        try {
            var firstResult = executor.submit(() -> authenticated(first));
            var secondResult = executor.submit(() -> authenticated(second));
            return List.of(firstResult.get(20, TimeUnit.SECONDS), secondResult.get(20, TimeUnit.SECONDS));
        } finally {
            executor.shutdownNow();
            assertTrue(executor.awaitTermination(10, TimeUnit.SECONDS), "Image workers must terminate");
        }
    }

    private AdminProductDetailDto authenticated(Callable<AdminProductDetailDto> command)
            throws Exception {
        var context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(new UsernamePasswordAuthenticationToken(
                "phase14-test", "unused", List.of(new SimpleGrantedAuthority("PERMISSION_CATALOG_WRITE"))));
        SecurityContextHolder.setContext(context);
        try {
            return command.call();
        } finally {
            SecurityContextHolder.clearContext();
        }
    }

    private ProductImageReorderRequest reorder(List<Long> ids) {
        return new ProductImageReorderRequest(IntStream.range(0, ids.size())
                .mapToObj(index -> new ProductImageReorderRequest.ImageOrder(ids.get(index), index))
                .toList());
    }

    private List<Long> storedIds(long productId) {
        return db.query("SELECT image_id FROM product_images WHERE product_id=? ORDER BY sort_order",
                (row, index) -> row.getLong(1), productId);
    }

    private List<String> storedUrls(long productId) {
        return db.query("SELECT image_url FROM product_images WHERE product_id=? ORDER BY sort_order",
                (row, index) -> row.getString(1), productId);
    }

    private void assertDenseOrder(long productId, int size) {
        assertEquals(IntStream.range(0, size).boxed().toList(),
                db.query("SELECT sort_order FROM product_images WHERE product_id=? ORDER BY sort_order",
                        (row, index) -> row.getInt(1), productId));
    }
}
