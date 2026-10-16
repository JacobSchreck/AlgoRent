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
 *   <li>With a location (lat/lng), each result gets its great-circle distance in miles
 *       (haversine). A radius keeps only listings within that distance; listings without
 *       coordinates are then excluded, since their distance is unknown. A bounding box on
 *       latitude/longitude narrows the rows first so the index can be used.</li>
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
                ) AS thumbnail_url,
            """;

    private static final String FROM_LISTINGS = """
            FROM listings l
            JOIN sources s ON s.id = l.source_id
            """;

    /** Haversine distance in miles from (:lat, :lng); NULL when the listing has no coordinates. */
    private static final String DISTANCE_JOIN = """
            CROSS JOIN LATERAL (
                SELECT CASE
                    WHEN l.latitude IS NULL OR l.longitude IS NULL THEN NULL
                    ELSE 7917.6 * asin(sqrt(least(1.0,
                        power(sin(radians(l.latitude - :lat) / 2), 2)
                        + cos(radians(:lat)) * cos(radians(l.latitude))
                          * power(sin(radians(l.longitude - :lng) / 2), 2))))
                END AS distance_miles
            ) geo
            """;

    /** Miles per degree of latitude, rounded down so the bounding box is never too small. */
    private static final double MILES_PER_DEGREE = 68.0;

    private final String fromClause;
    private final String distanceColumn;
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

        if (criteria.hasLocation()) {
            params.put("lat", criteria.latitude());
            params.put("lng", criteria.longitude());

            if (criteria.radiusMiles() != null) {
                double radius = criteria.radiusMiles();
                double latDelta = radius / MILES_PER_DEGREE;
                double cosLat = Math.max(Math.cos(Math.toRadians(criteria.latitude())), 0.01);
                double lngDelta = radius / (MILES_PER_DEGREE * cosLat);

                where.append("  AND l.latitude BETWEEN :minLat AND :maxLat\n");
                where.append("  AND l.longitude BETWEEN :minLng AND :maxLng\n");
                where.append("  AND geo.distance_miles <= :radiusMiles\n");
                params.put("minLat", criteria.latitude() - latDelta);
                params.put("maxLat", criteria.latitude() + latDelta);
                params.put("minLng", criteria.longitude() - lngDelta);
                params.put("maxLng", criteria.longitude() + lngDelta);
                params.put("radiusMiles", radius);
            }

            this.fromClause = FROM_LISTINGS + DISTANCE_JOIN;
            this.distanceColumn = "    round(geo.distance_miles::numeric, 2) AS distance_miles\n";
        } else {
            this.fromClause = FROM_LISTINGS;
            this.distanceColumn = "    NULL::numeric AS distance_miles\n";
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
        return SELECT_COLUMNS + distanceColumn + fromClause + whereClause + orderByClause
                + "LIMIT :limit OFFSET :offset";
    }

    /** Total number of matches across all pages. Use with {@link #countParams()}. */
    public String countQuery() {
        return "SELECT count(*)\n" + fromClause + whereClause;
    }

    public Map<String, Object> pageParams() {
        return pageParams;
    }

    public Map<String, Object> countParams() {
        return filterParams;
    }
}
