package com.fido.modules.content.repository;

import com.fido.modules.content.entity.ContentPage;
import org.springframework.data.repository.Repository;
import java.util.Optional;

/** Persistence only. Delete operations are intentionally not exposed by default. */
public interface ContentPageRepository extends Repository<ContentPage, Long> {
    Optional<ContentPage> findById(Long id);
    ContentPage save(ContentPage entity);
}
