package com.algorent.listing.search;

import java.math.BigDecimal;
import java.time.LocalDate;

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
        String sourceType,
        String thumbnailUrl,
        BigDecimal distanceMiles) {
}
