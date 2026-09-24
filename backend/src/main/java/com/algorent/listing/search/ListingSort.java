package com.algorent.listing.search;

import java.util.Arrays;
import java.util.Locale;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * Sort orders the search API accepts. Each maps to a fixed ORDER BY clause, so user input
 * never reaches the SQL text. Every clause ends with l.id so paging is stable.
 *
 * <p>The default is cheapest first: research on rental platforms (Costa et al., 2021) found
 * listings skew expensive, so the default view should not add to that.
 */
public enum ListingSort {

    PRICE_ASC("price_asc", "l.monthly_rent ASC NULLS LAST, l.id ASC"),
    PRICE_DESC("price_desc", "l.monthly_rent DESC NULLS LAST, l.id ASC"),
    NEWEST("newest", "l.first_seen_at DESC, l.id DESC"),
    AVAILABLE_SOONEST("available_soonest", "l.available_from ASC NULLS LAST, l.id ASC");

    public static final ListingSort DEFAULT = PRICE_ASC;

    private final String paramValue;
    private final String orderByClause;

    ListingSort(String paramValue, String orderByClause) {
        this.paramValue = paramValue;
        this.orderByClause = orderByClause;
    }

    public String paramValue() {
        return paramValue;
    }

    String orderByClause() {
        return orderByClause;
    }

    public static Optional<ListingSort> fromParam(String value) {
        String normalized = value.trim().toLowerCase(Locale.ROOT);
        return Arrays.stream(values())
                .filter(sort -> sort.paramValue.equals(normalized))
                .findFirst();
    }

    public static String allowedValues() {
        return Arrays.stream(values())
                .map(ListingSort::paramValue)
                .collect(Collectors.joining(", "));
    }
}
