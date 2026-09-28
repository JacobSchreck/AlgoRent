package com.algorent.listing.search;

import com.algorent.common.PageResponse;
import java.math.BigDecimal;
import java.time.LocalDate;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * City and date-range listing search.
 *
 * <p>Example: {@code GET /api/listings/search?city=Gainesville&moveIn=2027-05-15&moveOut=2027-08-10&maxRent=900}
 *
 * <p>See backend/README.md for every parameter and the response shape.
 */
@RestController
@RequestMapping("/api/listings")
public class ListingSearchController {

    private final ListingSearchRepository repository;

    public ListingSearchController(ListingSearchRepository repository) {
        this.repository = repository;
    }

    @GetMapping("/search")
    public PageResponse<ListingSummary> search(
            @RequestParam(required = false) String city,
            @RequestParam(required = false) String state,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate moveIn,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate moveOut,
            @RequestParam(required = false) BigDecimal minRent,
            @RequestParam(required = false) BigDecimal maxRent,
            @RequestParam(required = false) String propertyType,
            @RequestParam(required = false) String listingType,
            @RequestParam(required = false) BigDecimal minBedrooms,
            @RequestParam(required = false) Boolean furnished,
            @RequestParam(required = false) Boolean utilitiesIncluded,
            @RequestParam(required = false) String sort,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size) {

        ListingSearchCriteria criteria = ListingSearchCriteria.of(
                city, state, moveIn, moveOut, minRent, maxRent, propertyType, listingType,
                minBedrooms, furnished, utilitiesIncluded, sort, page, size);

        return repository.search(criteria);
    }
}
