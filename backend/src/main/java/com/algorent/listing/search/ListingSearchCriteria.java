package com.algorent.listing.search;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * A validated, normalized listing search. Build one with {@link #of}; the record's fields are then
 * safe to hand to {@link ListingSearchSql}.
 *
 * <p>Text filters are trimmed and lower-cased (blank means "not set"). Dates are the guest's stay:
 * a listing matches when it is available for the whole stay, from move-in through move-out.
 */
public record ListingSearchCriteria(
        String city,
        String state,
        LocalDate moveIn,
        LocalDate moveOut,
        BigDecimal minRent,
        BigDecimal maxRent,
        String propertyType,
        String listingType,
        BigDecimal minBedrooms,
        Boolean furnished,
        Boolean utilitiesIncluded,
        ListingSort sort,
        int page,
        int size) {

    public static final int DEFAULT_PAGE_SIZE = 20;
    public static final int MAX_PAGE_SIZE = 100;

    private static final int MAX_CITY_LENGTH = 100;
    private static final int MAX_STATE_LENGTH = 50;
    private static final int MAX_TYPE_LENGTH = 50;

    /**
     * Validates raw request values. Any argument may be null (meaning "not provided").
     *
     * @throws InvalidSearchException listing every problem found
     */
    public static ListingSearchCriteria of(
            String city,
            String state,
            LocalDate moveIn,
            LocalDate moveOut,
            BigDecimal minRent,
            BigDecimal maxRent,
            String propertyType,
            String listingType,
            BigDecimal minBedrooms,
            Boolean furnished,
            Boolean utilitiesIncluded,
            String sort,
            Integer page,
            Integer size) {

        List<String> errors = new ArrayList<>();

        String normalizedCity = normalize(city);
        if (normalizedCity == null) {
            errors.add("city is required");
        } else if (normalizedCity.length() > MAX_CITY_LENGTH) {
            errors.add("city must be at most " + MAX_CITY_LENGTH + " characters");
        }

        String normalizedState = normalize(state);
        if (normalizedState != null && normalizedState.length() > MAX_STATE_LENGTH) {
            errors.add("state must be at most " + MAX_STATE_LENGTH + " characters");
        }

        if ((moveIn == null) != (moveOut == null)) {
            errors.add("moveIn and moveOut must be provided together");
        } else if (moveIn != null && !moveOut.isAfter(moveIn)) {
            errors.add("moveOut must be after moveIn");
        }

        if (minRent != null && minRent.signum() < 0) {
            errors.add("minRent must be 0 or more");
        }
        if (maxRent != null && maxRent.signum() < 0) {
            errors.add("maxRent must be 0 or more");
        }
        if (minRent != null && maxRent != null && minRent.compareTo(maxRent) > 0) {
            errors.add("minRent must not be greater than maxRent");
        }

        String normalizedPropertyType = normalize(propertyType);
        if (normalizedPropertyType != null && normalizedPropertyType.length() > MAX_TYPE_LENGTH) {
            errors.add("propertyType must be at most " + MAX_TYPE_LENGTH + " characters");
        }
        String normalizedListingType = normalize(listingType);
        if (normalizedListingType != null && normalizedListingType.length() > MAX_TYPE_LENGTH) {
            errors.add("listingType must be at most " + MAX_TYPE_LENGTH + " characters");
        }

        if (minBedrooms != null && minBedrooms.signum() < 0) {
            errors.add("minBedrooms must be 0 or more");
        }

        ListingSort parsedSort = ListingSort.DEFAULT;
        if (sort != null && !sort.isBlank()) {
            parsedSort = ListingSort.fromParam(sort).orElse(null);
            if (parsedSort == null) {
                errors.add("sort must be one of: " + ListingSort.allowedValues());
            }
        }

        int resolvedPage = page == null ? 0 : page;
        if (resolvedPage < 0) {
            errors.add("page must be 0 or more");
        }

        int resolvedSize = size == null ? DEFAULT_PAGE_SIZE : size;
        if (resolvedSize < 1 || resolvedSize > MAX_PAGE_SIZE) {
            errors.add("size must be between 1 and " + MAX_PAGE_SIZE);
        }

        if (!errors.isEmpty()) {
            throw new InvalidSearchException(errors);
        }

        return new ListingSearchCriteria(
                normalizedCity,
                normalizedState,
                moveIn,
                moveOut,
                minRent,
                maxRent,
                normalizedPropertyType,
                normalizedListingType,
                minBedrooms,
                furnished,
                utilitiesIncluded,
                parsedSort,
                resolvedPage,
                resolvedSize);
    }

    /** Row offset for this page. A long, so a very large page number cannot overflow. */
    public long offset() {
        return (long) page * size;
    }

    private static String normalize(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim().toLowerCase(Locale.ROOT);
    }
}
