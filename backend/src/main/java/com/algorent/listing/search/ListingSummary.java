package com.algorent.listing.search;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * One search result: what a results card or map pin needs. Any field except id, title, city
 * and sourceUrl may be null when the source site did not provide it.
 */
public record ListingSummary(
        long id,
        String title,
        String address,
        String city,
        String state,
        String zipCode,
        Double latitude,
        Double longitude,
        BigDecimal monthlyRent,
        BigDecimal bedrooms,
        BigDecimal bathrooms,
        String propertyType,
        String listingType,
        Boolean furnished,
        Boolean utilitiesIncluded,
        LocalDate availableFrom,
        LocalDate availableUntil,
        String sourceUrl,
        String sourceName,
        String thumbnailUrl) {
}
