package com.fido.modules.product.repository;

import com.fido.modules.product.entity.Color;
import org.springframework.data.repository.Repository;
import java.util.Optional;

/** Persistence only. Delete operations are intentionally not exposed by default. */
public interface ColorRepository extends Repository<Color, Long> {
    Optional<Color> findById(Long id);
    Color save(Color entity);
}
