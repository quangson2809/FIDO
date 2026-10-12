package com.fido.modules.product.repository;

import com.fido.modules.product.entity.Color;

import org.springframework.data.repository.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface ColorRepository extends Repository<Color, Long> {
    Optional<Color> findById(Long id);

    Color save(Color entity);

    List<Color> findAllByOrderByColorIdAsc();

    List<Color> findAllByColorIdIn(Collection<Long> colorIds);

    void delete(Color entity);
}
