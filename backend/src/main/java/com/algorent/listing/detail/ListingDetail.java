package com.algorent.listing.detail;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Everything the listing detail page shows. Any field except id, title, city, sourceUrl, status
 * and imageUrls may be null when the source site did not provide it.
 *
 * <p>status is returned rather than hiding non-active listings, so a saved listing that was taken
 * down can still be shown as "no longer available".
 */
public record ListingDetail(
        long id,
        String title,
        String description,
        String propertyType,
        String listingType,
        BigDecimal monthlyRent,
        BigDecimal securityDeposit,
        BigDecimal bedrooms,
        BigDecimal bathrooms,
        Integer squareFeet,
        String address,
        String city,
        String state,
        String zipCode,
        Double latitude,
        Double longitude,
        LocalDate availableFrom,
        LocalDate availableUntil,
        Boolean furnished,
        Boolean utilitiesIncluded,
        Boolean parkingAvailable,
        Boolean laundryAvailable,
        Boolean petsAllowed,
        String contactName,
        String contactEmail,
        String contactPhone,
        String status,
        String sourceName,
        String sourceUrl,
        LocalDateTime lastSeenAt,
        List<String> imageUrls) {
}
