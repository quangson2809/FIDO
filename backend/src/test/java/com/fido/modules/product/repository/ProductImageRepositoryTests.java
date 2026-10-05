package com.fido.modules.product.repository;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.fido.modules.product.entity.ProductImage;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.jdbc.Sql;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
@Sql("/persistence-fixture.sql")
class ProductImageRepositoryTests {

    @Autowired private ProductImageRepository images;
    @Autowired private JdbcTemplate db;

    @Test
    void galleryQueryOrdersBySortOrderAscending() {
        insertImage("https://cdn.test/third.jpg", 2);
        insertImage("https://cdn.test/second.jpg", 1);

        List<ProductImage> gallery = images.findAllByProductIdOrderBySortOrderAsc(1L);

        assertEquals(
                List.of(0, 1, 2),
                gallery.stream().map(ProductImage::getSortOrder).toList()
        );
        assertEquals(
                List.of(
                        "https://example.invalid/test.png",
                        "https://cdn.test/second.jpg",
                        "https://cdn.test/third.jpg"
                ),
                gallery.stream().map(ProductImage::getImageUrl).toList()
        );
    }

    @Test
    void representativeQueryUsesSortOrderZeroInsteadOfLowestImageId() {
        db.update("UPDATE product_images SET sort_order=1 WHERE product_id=1");
        insertImage("https://cdn.test/new-cover.jpg", 0);

        var covers = images.findRepresentativeImagesByProductIdIn(List.of(1L));

        assertEquals(1, covers.size());
        assertEquals(1L, covers.get(0).getProductId());
        assertEquals("https://cdn.test/new-cover.jpg", covers.get(0).getImageUrl());
    }

    @Test
    void duplicateProductAndSortOrderIsRejectedOnFlush() {
        ProductImage duplicate = new ProductImage();
        duplicate.setProductId(1L);
        duplicate.setImageUrl("https://cdn.test/duplicate.jpg");
        duplicate.setSortOrder(0);

        assertThrows(
                DataIntegrityViolationException.class,
                () -> {
                    images.save(duplicate);
                    images.flush();
                }
        );
    }

    private void insertImage(String url, int sortOrder) {
        db.update(
                """
                INSERT INTO product_images(product_id,image_url,alt_text,sort_order)
                VALUES (1,?,NULL,?)
                """,
                url,
                sortOrder
        );
    }
}
