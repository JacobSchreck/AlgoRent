package com.algorent.saved;

import com.algorent.saved.SavedListingRepository.SavedListing;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import java.util.ArrayList;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/**
 * The signed-in user's saved listings, with the status and notes shown on the Saved page.
 * Every endpoint needs a signed-in session, and a user only ever sees their own list.
 */
@RestController
@RequestMapping("/api/saved")
public class SavedListingController {

    // Must match the columns on the Saved page and the check in migration V6.
    private static final List<String> STATUSES =
            List.of("Interested", "Messaged host", "Toured", "Applied");

    private static final int MAX_NOTES = 20;
    private static final int MAX_NOTE_LENGTH = 2_000;

    private final SavedListingRepository repository;

    public SavedListingController(SavedListingRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public List<SavedListing> list(HttpServletRequest request) {
        int userId = requireSignedIn(request);
        return repository.findAll(userId);
    }

    /** Saves the listing, or replaces its status and notes if it is already saved. */
    @PutMapping("/{listingId}")
    public SavedListing save(
            @PathVariable long listingId,
            @RequestBody SaveRequest body,
            HttpServletRequest request) {
        int userId = requireSignedIn(request);
        String status = cleanStatus(body.status());
        List<String> notes = cleanNotes(body.notes());

        if (!repository.listingExists(listingId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Listing not found.");
        }

        repository.save(userId, listingId, status, notes);
        return new SavedListing(listingId, status, notes);
    }

    @DeleteMapping("/{listingId}")
    public ResponseEntity<Void> remove(@PathVariable long listingId, HttpServletRequest request) {
        int userId = requireSignedIn(request);
        repository.delete(userId, listingId);
        return ResponseEntity.noContent().build();
    }

    private int requireSignedIn(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session == null || !(session.getAttribute("userId") instanceof Integer userId)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sign in to use saved listings.");
        }
        if (!repository.userExists(userId)) {
            session.invalidate();
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sign in to use saved listings.");
        }
        return userId;
    }

    private String cleanStatus(String value) {
        if (value == null || value.isBlank()) {
            return STATUSES.get(0);
        }
        String status = value.trim();
        if (!STATUSES.contains(status)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Status must be one of: " + String.join(", ", STATUSES) + ".");
        }
        return status;
    }

    // Empty notes are dropped, the same way the Saved page ignores them.
    private List<String> cleanNotes(List<String> values) {
        List<String> notes = new ArrayList<>();
        if (values == null) {
            return notes;
        }
        for (String value : values) {
            if (value == null || value.isBlank()) {
                continue;
            }
            if (value.length() > MAX_NOTE_LENGTH) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Each note must be " + MAX_NOTE_LENGTH + " characters or fewer.");
            }
            notes.add(value);
        }
        if (notes.size() > MAX_NOTES) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "A saved listing can have at most " + MAX_NOTES + " notes.");
        }
        return notes;
    }

    public record SaveRequest(String status, List<String> notes) {
    }
}
