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
 *
 * <p>Location is optional: latitude and longitude (for example a campus or workplace) add a
 * distance to every result and allow {@code sort=distance}; radiusMiles then limits results to
 * listings within that many miles.
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
        Double latitude,
        Double longitude,
        Double radiusMiles,
        ListingSort sort,
        int page,
        int size) {

    public static final int DEFAULT_PAGE_SIZE = 20;
    public static final double MAX_RADIUS_MILES = 100;
    public static final int MAX_PAGE_SIZE = 100;

    private static final int MAX_CITY_LENGTH = 100;
    private static final int MAX_STATE_LENGTH = 50;
    private static final int MAX_TYPE_LENGTH = 50;

    /** Search without a location. See the full {@link #of} for details. */
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
        return of(city, state, moveIn, moveOut, minRent, maxRent, propertyType, listingType,
                minBedrooms, furnished, utilitiesIncluded, null, null, null, sort, page, size);
    }

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
            Double latitude,
            Double longitude,
            Double radiusMiles,
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

        boolean hasLocation = latitude != null && longitude != null;
        if ((latitude == null) != (longitude == null)) {
            errors.add("lat and lng must be provided together");
        }
        if (latitude != null && (latitude.isNaN() || latitude < -90 || latitude > 90)) {
            errors.add("lat must be between -90 and 90");
        }
        if (longitude != null && (longitude.isNaN() || longitude < -180 || longitude > 180)) {
            errors.add("lng must be between -180 and 180");
        }
        if (radiusMiles != null) {
            if (!hasLocation) {
                errors.add("radiusMiles needs lat and lng");
            }
            if (radiusMiles.isNaN() || radiusMiles <= 0 || radiusMiles > MAX_RADIUS_MILES) {
                errors.add("radiusMiles must be more than 0 and at most " + (int) MAX_RADIUS_MILES);
            }
        }

        ListingSort parsedSort = ListingSort.DEFAULT;
        if (sort != null && !sort.isBlank()) {
            parsedSort = ListingSort.fromParam(sort).orElse(null);
            if (parsedSort == null) {
                errors.add("sort must be one of: " + ListingSort.allowedValues());
            } else if (parsedSort == ListingSort.DISTANCE && !hasLocation) {
                errors.add("sort=distance needs lat and lng");
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
                latitude,
                longitude,
                radiusMiles,
                parsedSort,
                resolvedPage,
                resolvedSize);
    }

    /** True when the search is centred on a location, so results carry a distance. */
    public boolean hasLocation() {
        return latitude != null && longitude != null;
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
