package com.algorent.listing.detail;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class ListingDetailRepository {

    static final String LISTING_SQL = """
            SELECT
                l.id, l.title, l.description, l.property_type, l.listing_type,
                l.monthly_rent, l.security_deposit, l.bedrooms, l.bathrooms, l.square_feet,
                l.address, l.city, l.state, l.zip_code, l.latitude, l.longitude,
                l.available_from, l.available_until,
                l.furnished, l.utilities_included, l.parking_available, l.laundry_available, l.pets_allowed,
                l.contact_name, l.contact_email, l.contact_phone,
                l.status, l.source_url, l.last_seen_at,
                s.name AS source_name,
                COALESCE(s.source_type, 'PROPERTY_SITE') AS source_type
            FROM listings l
            JOIN sources s ON s.id = l.source_id
            WHERE l.id = :id
            """;

    static final String IMAGES_SQL = """
            SELECT image_url
            FROM listing_images
            WHERE listing_id = :id
            ORDER BY display_order ASC NULLS LAST, id ASC
            """;

    private final NamedParameterJdbcTemplate jdbc;

    public ListingDetailRepository(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public Optional<ListingDetail> findById(long id) {
        Map<String, Object> params = Map.of("id", id);

        List<String> imageUrls = jdbc.queryForList(IMAGES_SQL, params, String.class);

        return jdbc.query(LISTING_SQL, params, (rs, rowNum) -> mapRow(rs, imageUrls))
                .stream()
                .findFirst();
    }

    private static ListingDetail mapRow(ResultSet rs, List<String> imageUrls) throws SQLException {
        String sourceType = rs.getString("source_type");
        boolean linkOnly = "LINK_ONLY".equalsIgnoreCase(sourceType);
        return new ListingDetail(
                rs.getLong("id"),
                rs.getString("title"),
                linkOnly ? null : rs.getString("description"),
                linkOnly ? null : rs.getString("property_type"),
                linkOnly ? null : rs.getString("listing_type"),
                linkOnly ? null : rs.getBigDecimal("monthly_rent"),
                linkOnly ? null : rs.getBigDecimal("security_deposit"),
                linkOnly ? null : rs.getBigDecimal("bedrooms"),
                linkOnly ? null : rs.getBigDecimal("bathrooms"),
                linkOnly ? null : rs.getObject("square_feet", Integer.class),
                linkOnly ? null : rs.getString("address"),
                linkOnly ? null : rs.getString("city"),
                linkOnly ? null : rs.getString("state"),
                linkOnly ? null : rs.getString("zip_code"),
                linkOnly ? null : rs.getObject("latitude", Double.class),
                linkOnly ? null : rs.getObject("longitude", Double.class),
                linkOnly ? null : rs.getObject("available_from", LocalDate.class),
                linkOnly ? null : rs.getObject("available_until", LocalDate.class),
                linkOnly ? null : rs.getObject("furnished", Boolean.class),
                linkOnly ? null : rs.getObject("utilities_included", Boolean.class),
                linkOnly ? null : rs.getObject("parking_available", Boolean.class),
                linkOnly ? null : rs.getObject("laundry_available", Boolean.class),
                linkOnly ? null : rs.getObject("pets_allowed", Boolean.class),
                linkOnly ? null : rs.getString("contact_name"),
                linkOnly ? null : rs.getString("contact_email"),
                linkOnly ? null : rs.getString("contact_phone"),
                linkOnly ? null : rs.getString("status"),
                rs.getString("source_name"),
                rs.getString("source_url"),
                sourceType,
                linkOnly ? null : rs.getObject("last_seen_at", LocalDateTime.class),
                linkOnly ? List.of() : List.copyOf(imageUrls));
    }
}
