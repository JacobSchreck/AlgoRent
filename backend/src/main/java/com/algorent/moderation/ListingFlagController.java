package com.algorent.moderation;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import java.util.List;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api")
public class ListingFlagController {

    private static final int MAX_DETAILS_LENGTH = 1_000;

    private final ListingFlagRepository repository;

    public ListingFlagController(ListingFlagRepository repository) {
        this.repository = repository;
    }

    @PostMapping("/listings/{listingId}/flags")
    public ResponseEntity<CreateFlagResponse> report(
            @PathVariable long listingId,
            @RequestBody CreateFlagRequest request,
            HttpServletRequest httpRequest) {
        int reporterUserId = requireSignedIn(httpRequest);
        ListingFlagReason reason = ListingFlagReason.parse(request.reason())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.BAD_REQUEST, "Choose a valid report reason."));
        String details = normalizeDetails(request.details());

        if (!repository.listingExists(listingId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Listing not found.");
        }

        try {
            int id = repository.create(listingId, reporterUserId, reason, details);
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(new CreateFlagResponse(id, "PENDING", "Report submitted for review."));
        } catch (DuplicateKeyException ex) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "You already have a pending report for this listing.");
        }
    }

    @GetMapping("/moderation/flags")
    public List<ListingFlagRepository.QueueItem> pending(HttpServletRequest request) {
        requireAdmin(request);
        return repository.findPending();
    }

    @PatchMapping("/moderation/flags/{flagId}")
    public ReviewFlagResponse review(
            @PathVariable int flagId,
            @RequestBody ReviewFlagRequest request,
            HttpServletRequest httpRequest) {
        requireAdmin(httpRequest);
        String status = request.status() == null ? "" : request.status().trim().toUpperCase();
        if (!status.equals("APPROVED") && !status.equals("DISMISSED")) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Status must be APPROVED or DISMISSED.");
        }
        if (!repository.review(flagId, status)) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Pending moderation item not found.");
        }
        return new ReviewFlagResponse(flagId, status);
    }

    private int requireSignedIn(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session == null || !(session.getAttribute("userId") instanceof Integer userId)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sign in to report a listing.");
        }
        if (!repository.userExists(userId)) {
            session.invalidate();
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sign in to report a listing.");
        }
        return userId;
    }

    private int requireAdmin(HttpServletRequest request) {
        int userId = requireSignedIn(request);
        if (!repository.isAdmin(userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Admin access is required.");
        }
        return userId;
    }

    private String normalizeDetails(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String details = value.trim();
        if (details.length() > MAX_DETAILS_LENGTH) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Report details must be 1000 characters or fewer.");
        }
        return details;
    }

    public record CreateFlagRequest(String reason, String details) {
    }

    public record CreateFlagResponse(int id, String status, String message) {
    }

    public record ReviewFlagRequest(String status) {
    }

    public record ReviewFlagResponse(int id, String status) {
    }
}
