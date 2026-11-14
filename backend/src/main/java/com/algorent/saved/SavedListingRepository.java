package com.algorent.saved;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public class SavedListingRepository {

    private final NamedParameterJdbcTemplate jdbc;

    public SavedListingRepository(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public boolean userExists(int userId) {
        Long count = jdbc.queryForObject(
                "SELECT count(*) FROM users WHERE id = :id",
                Map.of("id", userId),
                Long.class);
        return count != null && count > 0;
    }

    public boolean listingExists(long listingId) {
        Long count = jdbc.queryForObject(
                "SELECT count(*) FROM listings WHERE id = :id",
                Map.of("id", listingId),
                Long.class);
        return count != null && count > 0;
    }

    /** Everything one user has saved, oldest first, each with its notes in order. */
    public List<SavedListing> findAll(int userId) {
        Map<String, Object> params = Map.of("userId", userId);

        List<SavedRow> rows = jdbc.query(
                """
                SELECT listing_id, status
                FROM favorites
                WHERE user_id = :userId
                ORDER BY created_at ASC, listing_id ASC
                """,
                params,
                (rs, rowNum) -> new SavedRow(rs.getLong("listing_id"), rs.getString("status")));

        List<NoteRow> noteRows = jdbc.query(
                """
                SELECT listing_id, body
                FROM favorite_notes
                WHERE user_id = :userId
                ORDER BY listing_id ASC, display_order ASC, id ASC
                """,
                params,
                (rs, rowNum) -> new NoteRow(rs.getLong("listing_id"), rs.getString("body")));

        // group the notes under the listing they belong to
        Map<Long, List<String>> notesByListing = new LinkedHashMap<>();
        for (NoteRow note : noteRows) {
            notesByListing.computeIfAbsent(note.listingId(), id -> new ArrayList<>()).add(note.body());
        }

        List<SavedListing> saved = new ArrayList<>();
        for (SavedRow row : rows) {
            List<String> notes = notesByListing.getOrDefault(row.listingId(), List.of());
            saved.add(new SavedListing(row.listingId(), row.status(), List.copyOf(notes)));
        }
        return saved;
    }

    /** Saves a listing, or replaces the status and notes of one that is already saved. */
    @Transactional
    public void save(int userId, long listingId, String status, List<String> notes) {
        MapSqlParameterSource key = new MapSqlParameterSource()
                .addValue("userId", userId)
                .addValue("listingId", listingId);

        jdbc.update(
                """
                INSERT INTO favorites (user_id, listing_id, status)
                VALUES (:userId, :listingId, :status)
                ON CONFLICT (user_id, listing_id) DO UPDATE
                SET status = EXCLUDED.status,
                    updated_at = CURRENT_TIMESTAMP
                """,
                new MapSqlParameterSource()
                        .addValue("userId", userId)
                        .addValue("listingId", listingId)
                        .addValue("status", status));

        jdbc.update(
                "DELETE FROM favorite_notes WHERE user_id = :userId AND listing_id = :listingId",
                key);

        for (int i = 0; i < notes.size(); i++) {
            jdbc.update(
                    """
                    INSERT INTO favorite_notes (user_id, listing_id, display_order, body)
                    VALUES (:userId, :listingId, :displayOrder, :body)
                    """,
                    new MapSqlParameterSource()
                            .addValue("userId", userId)
                            .addValue("listingId", listingId)
                            .addValue("displayOrder", i)
                            .addValue("body", notes.get(i)));
        }
    }

    /** Removes a saved listing and its notes. Does nothing if it was not saved. */
    public void delete(int userId, long listingId) {
        jdbc.update(
                "DELETE FROM favorites WHERE user_id = :userId AND listing_id = :listingId",
                new MapSqlParameterSource()
                        .addValue("userId", userId)
                        .addValue("listingId", listingId));
    }

    /** One saved listing as the Saved page uses it. id is the listing id. */
    public record SavedListing(long id, String status, List<String> notes) {
    }

    private record SavedRow(long listingId, String status) {
    }

    private record NoteRow(long listingId, String body) {
    }
}
