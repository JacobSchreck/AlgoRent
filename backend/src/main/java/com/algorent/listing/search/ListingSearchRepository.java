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
        return new ListingSummary(
                rs.getLong("id"),
                rs.getString("title"),
                rs.getString("address"),
                rs.getString("city"),
                rs.getString("state"),
                rs.getString("zip_code"),
                rs.getObject("latitude", Double.class),
                rs.getObject("longitude", Double.class),
                rs.getBigDecimal("monthly_rent"),
                rs.getBigDecimal("bedrooms"),
                rs.getBigDecimal("bathrooms"),
                rs.getString("property_type"),
                rs.getString("listing_type"),
                rs.getObject("furnished", Boolean.class),
                rs.getObject("utilities_included", Boolean.class),
                rs.getObject("available_from", LocalDate.class),
                rs.getObject("available_until", LocalDate.class),
                rs.getString("source_url"),
                rs.getString("source_name"),
                rs.getString("thumbnail_url"));
    }
}
