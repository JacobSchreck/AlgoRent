package com.algorent.moderation;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public class ListingFlagRepository {

    private final NamedParameterJdbcTemplate jdbc;

    public ListingFlagRepository(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public boolean listingExists(long listingId) {
        Long count = jdbc.queryForObject(
                "SELECT count(*) FROM listings WHERE id = :id AND flagged = FALSE",
                Map.of("id", listingId),
                Long.class);
        return count != null && count > 0;
    }

    public boolean userExists(int userId) {
        Long count = jdbc.queryForObject(
                "SELECT count(*) FROM users WHERE id = :id",
                Map.of("id", userId),
                Long.class);
        return count != null && count > 0;
    }

    public boolean isAdmin(int userId) {
        Long count = jdbc.queryForObject(
                """
                SELECT count(*)
                FROM users
                WHERE id = :id AND role = 'ADMIN'
                """,
                Map.of("id", userId),
                Long.class);
        return count != null && count > 0;
    }

    public int create(long listingId, int reporterUserId, ListingFlagReason reason, String details) {
        MapSqlParameterSource params = new MapSqlParameterSource()
                .addValue("listingId", listingId)
                .addValue("reporterUserId", reporterUserId)
                .addValue("reason", reason.name())
                .addValue("details", details);
        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbc.update(
                """
                INSERT INTO listing_flags (listing_id, reporter_user_id, reason, details)
                VALUES (:listingId, :reporterUserId, :reason, :details)
                """,
                params,
                keyHolder,
                new String[] {"id"});
        Number key = keyHolder.getKey();
        if (key == null) {
            throw new IllegalStateException("Database did not return the new listing flag id");
        }
        return key.intValue();
    }

    public List<QueueItem> findPending() {
        return jdbc.query(
                """
                SELECT
                    f.id,
                    f.listing_id,
                    l.title AS listing_title,
                    l.source_url,
                    s.name AS source_name,
                    f.reason,
                    f.details,
                    f.status,
                    u.email AS reporter_email,
                    f.created_at
                FROM listing_flags f
                JOIN listings l ON l.id = f.listing_id
                JOIN sources s ON s.id = l.source_id
                LEFT JOIN users u ON u.id = f.reporter_user_id
                WHERE f.status = 'PENDING'
                ORDER BY f.created_at ASC, f.id ASC
                """,
                Map.of(),
                (rs, rowNum) -> new QueueItem(
                        rs.getInt("id"),
                        rs.getLong("listing_id"),
                        rs.getString("listing_title"),
                        rs.getString("source_url"),
                        rs.getString("source_name"),
                        rs.getString("reason"),
                        rs.getString("details"),
                        rs.getString("status"),
                        rs.getString("reporter_email"),
                        rs.getTimestamp("created_at").toLocalDateTime()));
    }

    @Transactional
    public boolean review(int flagId, String status) {
        List<Long> listingIds = jdbc.query(
                """
                UPDATE listing_flags
                SET status = :status,
                    decided_at = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = :flagId
                  AND status = 'PENDING'
                RETURNING listing_id
                """,
                Map.of(
                        "flagId", flagId,
                        "status", status),
                (rs, rowNum) -> rs.getLong("listing_id"));
        if (listingIds.isEmpty()) {
            return false;
        }

        if (status.equals("APPROVED")) {
            long listingId = listingIds.getFirst();
            jdbc.update(
                    """
                    UPDATE listings
                    SET flagged = TRUE,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = :listingId
                    """,
                    Map.of("listingId", listingId));
            jdbc.update(
                    """
                    UPDATE listing_flags
                    SET status = 'APPROVED',
                        decided_at = CURRENT_TIMESTAMP,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE listing_id = :listingId
                      AND status = 'PENDING'
                    """,
                    Map.of("listingId", listingId));
        }
        return true;
    }

    public record QueueItem(
            int id,
            long listingId,
            String listingTitle,
            String sourceUrl,
            String sourceName,
            String reason,
            String details,
            String status,
            String reporterEmail,
            LocalDateTime createdAt) {
    }
}
