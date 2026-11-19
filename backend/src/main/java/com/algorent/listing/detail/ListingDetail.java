package com.algorent.listing.detail;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

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
        String status, // so a saved listing that was taken down can show as unavailable
        String sourceName,
        String sourceUrl,
        String sourceType,
        LocalDateTime lastSeenAt,
        List<String> imageUrls) {
}
