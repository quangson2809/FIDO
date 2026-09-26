package com.fido.modules.product.repository;

import com.fido.modules.product.entity.Color;
import java.util.List;
import java.util.Optional;
import org.springframework.data.repository.Repository;

public interface ColorRepository extends Repository<Color, Long> {
    Optional<Color> findById(Long id);
    Color save(Color entity);
    List<Color> findAllByOrderByColorIdAsc();
    void delete(Color entity);
}
