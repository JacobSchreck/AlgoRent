package com.algorent.listing.search;

import com.algorent.common.PageResponse;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class ListingSearchRepository {

    private static final RowMapper<ListingSummary> ROW_MAPPER = ListingSearchRepository::mapRow;

    private final NamedParameterJdbcTemplate jdbc;

    public ListingSearchRepository(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public PageResponse<ListingSummary> search(ListingSearchCriteria criteria) {
        ListingSearchSql sql = new ListingSearchSql(criteria);

        Long total = jdbc.queryForObject(sql.countQuery(), sql.countParams(), Long.class);
        long totalResults = total == null ? 0 : total;

        List<ListingSummary> results = totalResults == 0
                ? List.of()
                : jdbc.query(sql.pageQuery(), sql.pageParams(), ROW_MAPPER);

        return PageResponse.of(results, criteria.page(), criteria.size(), totalResults);
    }

    public List<ListingSummary> merge(ListingSearchCriteria criteria) {
        String pairSql = """
                SELECT
                    a.id AS first_id,
                    b.id AS second_id
                FROM listings a
                JOIN listings b
                    ON LOWER(a.city) = LOWER(b.city)
                    AND a.id <> b.id
                JOIN sources sa ON sa.id = a.source_id
                JOIN sources sb ON sb.id = b.source_id
                WHERE a.status = 'ACTIVE'
                AND b.status = 'ACTIVE'
                -- same rules as search: no reported listings, and link-only listings
                -- can't be merged because their dates are hidden
                AND a.flagged = FALSE
                AND b.flagged = FALSE
                AND COALESCE(sa.source_type, '') <> 'LINK_ONLY'
                AND COALESCE(sb.source_type, '') <> 'LINK_ONLY'
                AND LOWER(a.city) = LOWER(:city)
                AND a.available_from IS NOT NULL
                AND a.available_until IS NOT NULL
                AND b.available_from IS NOT NULL
                AND b.available_until IS NOT NULL
                AND a.available_from <= :moveIn
                AND a.available_until < :moveOut
                AND b.available_from > :moveIn
                AND b.available_from <= a.available_until + INTERVAL '1 day'
                AND b.available_until >= :moveOut
                ORDER BY a.available_until DESC
                LIMIT 1
                """;

        List<long[]> pair = jdbc.query(
                pairSql,
                Map.of(
                        "city", criteria.city(),
                        "moveIn", criteria.moveIn(),
                        "moveOut", criteria.moveOut()),
                (rs, rowNum) -> new long[]{
                        rs.getLong("first_id"),
                        rs.getLong("second_id")
                });

        if (pair.isEmpty()) {
            return List.of();
        }

        long firstId = pair.get(0)[0];
        long secondId = pair.get(0)[1];

        String detailSql = """
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
                    s.source_type,
                    (
                        SELECT i.image_url
                        FROM listing_images i
                        WHERE i.listing_id = l.id
                        ORDER BY i.display_order ASC NULLS LAST, i.id ASC
                        LIMIT 1
                    ) AS thumbnail_url,
                    NULL AS distance_miles
                FROM listings l
                JOIN sources s
                    ON s.id = l.source_id
                WHERE l.id IN (:firstId, :secondId)
                ORDER BY
                    CASE
                        WHEN l.id = :firstId THEN 1
                        ELSE 2
                    END
                """;

        return jdbc.query(
                detailSql,
                Map.of(
                        "firstId", firstId,
                        "secondId", secondId),
                ROW_MAPPER);
    }
    
    private static ListingSummary mapRow(ResultSet rs, int rowNum) throws SQLException {
        String sourceType = rs.getString("source_type");
        boolean linkOnly = "LINK_ONLY".equalsIgnoreCase(sourceType);
        return new ListingSummary(
                rs.getLong("id"),
                rs.getString("title"),
                linkOnly ? null : rs.getString("address"),
                linkOnly ? null : rs.getString("city"),
                linkOnly ? null : rs.getString("state"),
                linkOnly ? null : rs.getString("zip_code"),
                linkOnly ? null : rs.getObject("latitude", Double.class),
                linkOnly ? null : rs.getObject("longitude", Double.class),
                linkOnly ? null : rs.getBigDecimal("monthly_rent"),
                linkOnly ? null : rs.getBigDecimal("bedrooms"),
                linkOnly ? null : rs.getBigDecimal("bathrooms"),
                linkOnly ? null : rs.getString("property_type"),
                linkOnly ? null : rs.getString("listing_type"),
                linkOnly ? null : rs.getObject("furnished", Boolean.class),
                linkOnly ? null : rs.getObject("utilities_included", Boolean.class),
                linkOnly ? null : rs.getObject("available_from", LocalDate.class),
                linkOnly ? null : rs.getObject("available_until", LocalDate.class),
                rs.getString("source_url"),
                rs.getString("source_name"),
                sourceType,
                linkOnly ? null : rs.getString("thumbnail_url"),
                linkOnly ? null : rs.getBigDecimal("distance_miles"));
    }
}
