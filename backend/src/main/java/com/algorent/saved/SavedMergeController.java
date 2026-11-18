package com.algorent.saved;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/saved/merges")
public class SavedMergeController {
    private final NamedParameterJdbcTemplate jdbc;

    public SavedMergeController(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    private int userId(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session == null || !(session.getAttribute("userId") instanceof Integer id)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        }
        return id;
    }

    @GetMapping
    public List<SavedMerge> list(HttpServletRequest request) {
        return jdbc.query("""
            SELECT id, first_listing_id, second_listing_id, move_in, move_out
            FROM saved_merge_stays WHERE user_id = :userId ORDER BY created_at DESC
            """, Map.of("userId", userId(request)), (rs, row) -> new SavedMerge(
                rs.getLong("id"), rs.getLong("first_listing_id"),
                rs.getLong("second_listing_id"), rs.getObject("move_in", LocalDate.class),
                rs.getObject("move_out", LocalDate.class)));
    }

    @PostMapping
    public ResponseEntity<Void> save(@RequestBody SaveMerge body, HttpServletRequest request) {
        int id = userId(request);
        if (body.firstId() == body.secondId() || body.moveIn() == null || body.moveOut() == null
                || !body.moveIn().isBefore(body.moveOut())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
        }
        Integer count = jdbc.queryForObject("""
            SELECT count(*) FROM listings a
            JOIN listings b ON b.id = :secondId AND LOWER(a.city) = LOWER(b.city)
            JOIN sources sa ON sa.id = a.source_id
            JOIN sources sb ON sb.id = b.source_id
            WHERE a.id = :firstId
              AND a.status = 'ACTIVE' AND b.status = 'ACTIVE'
              AND a.flagged = FALSE AND b.flagged = FALSE
              AND COALESCE(sa.source_type, '') <> 'LINK_ONLY'
              AND COALESCE(sb.source_type, '') <> 'LINK_ONLY'
              AND a.available_from <= :moveIn AND a.available_until < :moveOut
              AND b.available_from > :moveIn
              AND b.available_from <= a.available_until + INTERVAL '1 day'
              AND b.available_until >= :moveOut
            """, Map.of("firstId", body.firstId(), "secondId", body.secondId(),
                    "moveIn", body.moveIn(), "moveOut", body.moveOut()), Integer.class);
        if (count == null || count == 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Listings do not match dates.");
        }
        jdbc.update("""
            INSERT INTO saved_merge_stays (user_id, first_listing_id, second_listing_id, move_in, move_out)
            VALUES (:userId, :firstId, :secondId, :moveIn, :moveOut)
            ON CONFLICT DO NOTHING
            """, Map.of("userId", id, "firstId", body.firstId(), "secondId", body.secondId(),
                    "moveIn", body.moveIn(), "moveOut", body.moveOut()));
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{mergeId}")
    public ResponseEntity<Void> delete(@PathVariable long mergeId, HttpServletRequest request) {
        jdbc.update("DELETE FROM saved_merge_stays WHERE id = :id AND user_id = :userId",
                Map.of("id", mergeId, "userId", userId(request)));
        return ResponseEntity.noContent().build();
    }

    public record SaveMerge(long firstId, long secondId, LocalDate moveIn, LocalDate moveOut) {}
    public record SavedMerge(long id, long firstListingId, long secondListingId, LocalDate moveIn, LocalDate moveOut) {}
}
