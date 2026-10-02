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
                s.name AS source_name
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
        return new ListingDetail(
                rs.getLong("id"),
                rs.getString("title"),
                rs.getString("description"),
                rs.getString("property_type"),
                rs.getString("listing_type"),
                rs.getBigDecimal("monthly_rent"),
                rs.getBigDecimal("security_deposit"),
                rs.getBigDecimal("bedrooms"),
                rs.getBigDecimal("bathrooms"),
                rs.getObject("square_feet", Integer.class),
                rs.getString("address"),
                rs.getString("city"),
                rs.getString("state"),
                rs.getString("zip_code"),
                rs.getObject("latitude", Double.class),
                rs.getObject("longitude", Double.class),
                rs.getObject("available_from", LocalDate.class),
                rs.getObject("available_until", LocalDate.class),
                rs.getObject("furnished", Boolean.class),
                rs.getObject("utilities_included", Boolean.class),
                rs.getObject("parking_available", Boolean.class),
                rs.getObject("laundry_available", Boolean.class),
                rs.getObject("pets_allowed", Boolean.class),
                rs.getString("contact_name"),
                rs.getString("contact_email"),
                rs.getString("contact_phone"),
                rs.getString("status"),
                rs.getString("source_name"),
                rs.getString("source_url"),
                rs.getObject("last_seen_at", LocalDateTime.class),
                List.copyOf(imageUrls));
    }
}
