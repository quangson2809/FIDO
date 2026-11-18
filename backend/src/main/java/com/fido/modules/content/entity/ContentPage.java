package com.fido.modules.content.entity;

import com.fido.common.exception.BusinessRuleException;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;

@Entity
@Table(
        name = "content_pages",
        uniqueConstraints =
                @UniqueConstraint(
                        name = "uq_content_pages_slug",
                        columnNames = {"slug"}))
@Getter
@Setter
@NoArgsConstructor
public class ContentPage {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Long pageId;

    @Column(name = "slug", nullable = false, length = 180)
    private String slug;

    @Column(name = "title", nullable = false, length = 255)
    private String title;

    @Column(name = "content", nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(name = "updated_by")
    private Long updatedByAccountId;

    @Column(name = "status", nullable = false, length = 20)
    @Setter(AccessLevel.NONE)
    private String status = "DRAFT";

    @Column(name = "updated_at", nullable = false, columnDefinition = "TIMESTAMP(6)")
    private LocalDateTime updatedAt;

    public void changeStatus(String next) {
        String current = status;
        if (current.equals(next)) {
            return;
        }
        boolean allowed =
                switch (current) {
                    case "DRAFT" -> "PUBLISHED".equals(next) || "ARCHIVED".equals(next);
                    case "PUBLISHED" -> "DRAFT".equals(next) || "ARCHIVED".equals(next);
                    case "ARCHIVED" -> "DRAFT".equals(next);
                    default -> false;
                };
        if (!allowed) {
            throw BusinessRuleException.conflict("CONTENT_STATUS_TRANSITION_NOT_ALLOWED");
        }
        status = next;
    }

    @PrePersist
    void onCreate() {
        if (status == null) status = "DRAFT";
        updatedAt = LocalDateTime.now(ZoneOffset.UTC).truncatedTo(ChronoUnit.MICROS);
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now(ZoneOffset.UTC).truncatedTo(ChronoUnit.MICROS);
    }
}
