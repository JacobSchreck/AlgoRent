package com.algorent.listing.search;

import com.algorent.common.PageResponse;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.util.List;
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
