package com.algorent.listing.detail;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * One listing with all its details and photos, for the listing detail page.
 *
 * <p>Example: {@code GET /api/listings/42}
 */
@RestController
@RequestMapping("/api/listings")
public class ListingDetailController {

    private final ListingDetailRepository repository;

    public ListingDetailController(ListingDetailRepository repository) {
        this.repository = repository;
    }

    @GetMapping("/{id}")
    public ListingDetail getListing(@PathVariable long id) {
        return repository.findById(id).orElseThrow(() -> new ListingNotFoundException(id));
    }
}
