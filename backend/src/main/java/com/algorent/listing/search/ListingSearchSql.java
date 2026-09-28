package com.algorent.listing.search;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Builds the SQL for a listing search. Pure Java with no Spring dependency, so the generated
 * queries can be checked directly against Postgres.
 *
 * <p>Only fixed SQL fragments are concatenated; every user-supplied value is a named parameter.
 *
 * <p>Matching rules:
 * <ul>
 *   <li>Only ACTIVE listings are returned.</li>
 *   <li>City, state and type filters are case-insensitive exact matches.</li>
 *   <li>For a date range, a listing must be available for the whole stay:
 *       available_from on or before move-in, and available_until on or after move-out.
 *       A missing available_from or available_until counts as open-ended. Scraped listings often
 *       omit dates, and hiding them all would hide much of the supply.</li>
 *   <li>A price or bedroom filter excludes listings where that value is unknown.</li>
 * </ul>
 */
public final class ListingSearchSql {

    private static final String SELECT_COLUMNS = """
            SELECT
                l.id,
                l.title,
                l.address,
                l.city,
                l.state,
                l.zip_code,
                l.latitude,
                l.longitude,
                l.monthly_rent,
                l.bedrooms,
                l.bathrooms,
                l.property_type,
                l.listing_type,
                l.furnished,
                l.utilities_included,
                l.available_from,
                l.available_until,
                l.source_url,
                s.name AS source_name,
                (
                    SELECT i.image_url
                    FROM listing_images i
                    WHERE i.listing_id = l.id
                    ORDER BY i.display_order ASC NULLS LAST, i.id ASC
                    LIMIT 1
                ) AS thumbnail_url
            FROM listings l
            JOIN sources s ON s.id = l.source_id
            """;

    private static final String COUNT_FROM = """
            SELECT count(*)
            FROM listings l
            """;

    private final String whereClause;
    private final String orderByClause;
    private final Map<String, Object> filterParams;
    private final Map<String, Object> pageParams;

    public ListingSearchSql(ListingSearchCriteria criteria) {
        Map<String, Object> params = new LinkedHashMap<>();
        StringBuilder where = new StringBuilder("WHERE l.status = 'ACTIVE'\n");

        where.append("  AND lower(l.city) = :city\n");
        params.put("city", criteria.city());

        if (criteria.state() != null) {
            where.append("  AND lower(l.state) = :state\n");
            params.put("state", criteria.state());
        }

        if (criteria.moveIn() != null) {
            where.append("  AND (l.available_from IS NULL OR l.available_from <= :moveIn)\n");
            where.append("  AND (l.available_until IS NULL OR l.available_until >= :moveOut)\n");
            params.put("moveIn", criteria.moveIn());
            params.put("moveOut", criteria.moveOut());
        }

        if (criteria.minRent() != null) {
            where.append("  AND l.monthly_rent >= :minRent\n");
            params.put("minRent", criteria.minRent());
        }
        if (criteria.maxRent() != null) {
            where.append("  AND l.monthly_rent <= :maxRent\n");
            params.put("maxRent", criteria.maxRent());
        }

        if (criteria.propertyType() != null) {
            where.append("  AND lower(l.property_type) = :propertyType\n");
            params.put("propertyType", criteria.propertyType());
        }
        if (criteria.listingType() != null) {
            where.append("  AND lower(l.listing_type) = :listingType\n");
            params.put("listingType", criteria.listingType());
        }

        if (criteria.minBedrooms() != null) {
            where.append("  AND l.bedrooms >= :minBedrooms\n");
            params.put("minBedrooms", criteria.minBedrooms());
        }

        if (criteria.furnished() != null) {
            where.append("  AND l.furnished = :furnished\n");
            params.put("furnished", criteria.furnished());
        }
        if (criteria.utilitiesIncluded() != null) {
            where.append("  AND l.utilities_included = :utilitiesIncluded\n");
            params.put("utilitiesIncluded", criteria.utilitiesIncluded());
        }

        this.whereClause = where.toString();
        this.orderByClause = "ORDER BY " + criteria.sort().orderByClause() + "\n";
        this.filterParams = Map.copyOf(params);

        Map<String, Object> withPaging = new LinkedHashMap<>(params);
        withPaging.put("limit", criteria.size());
        withPaging.put("offset", criteria.offset());
        this.pageParams = Map.copyOf(withPaging);
    }

    /** One page of results, in the requested order. Use with {@link #pageParams()}. */
    public String pageQuery() {
        return SELECT_COLUMNS + whereClause + orderByClause + "LIMIT :limit OFFSET :offset";
    }

    /** Total number of matches across all pages. Use with {@link #countParams()}. */
    public String countQuery() {
        return COUNT_FROM + whereClause;
    }

    public Map<String, Object> pageParams() {
        return pageParams;
    }

    public Map<String, Object> countParams() {
        return filterParams;
    }
}
