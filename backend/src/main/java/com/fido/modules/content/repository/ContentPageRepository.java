package com.fido.modules.content.repository;

import com.fido.modules.content.entity.ContentPage;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

/** Persistence only. Content pages are archived, never hard-deleted through the application. */
public interface ContentPageRepository extends Repository<ContentPage, Long> {
    Optional<ContentPage> findById(Long id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select page from ContentPage page where page.pageId = :pageId")
    Optional<ContentPage> findByIdForUpdate(@Param("pageId") Long pageId);

    ContentPage save(ContentPage entity);

    Optional<ContentPage> findBySlugAndStatus(String slug, String status);

    boolean existsBySlug(String slug);

    List<ContentPage> findAllByOrderByPageIdAsc();

    void flush();
}
