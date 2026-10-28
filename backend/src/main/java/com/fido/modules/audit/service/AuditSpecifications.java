package com.fido.modules.audit.service;

import com.fido.modules.audit.entity.AuditLog;

import jakarta.persistence.criteria.Predicate;

import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;

public final class AuditSpecifications {

    private AuditSpecifications() {}

    public static Specification<AuditLog> search(AuditSearchFilter filter) {
        return (root, query, cb) -> {
            var predicates = new ArrayList<Predicate>();

            if (filter.actorAccountId() != null) {
                predicates.add(cb.equal(root.get("actorAccountId"), filter.actorAccountId()));
            }

            if (filter.action() != null) {
                predicates.add(cb.equal(root.get("action"), filter.action()));
            }

            if (filter.entityType() != null) {
                predicates.add(cb.equal(root.get("entityType"), filter.entityType()));
            }

            if (filter.entityId() != null) {
                predicates.add(cb.equal(root.get("entityId"), filter.entityId()));
            }

            if (filter.from() != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("createdAt"), filter.from()));
            }

            if (filter.to() != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("createdAt"), filter.to()));
            }

            return cb.and(predicates.toArray(Predicate[]::new));
        };
    }
}
