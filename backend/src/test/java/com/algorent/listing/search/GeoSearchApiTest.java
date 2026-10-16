package com.algorent.listing.search;

import static org.hamcrest.Matchers.closeTo;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.test.context.jdbc.Sql;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

/**
 * Location search (lat/lng/radiusMiles, sort=distance) against a real Postgres.
 *
 * <p>Reference point is Century Tower at UF. Fixture distances (search-fixtures.sql):
 * listing 1 ≈ 0.30 mi, 2 ≈ 2.38 mi, 6 ≈ 2.96 mi, 4 ≈ 8.96 mi, 3 has no coordinates,
 * 5 is next door but REMOVED.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers(disabledWithoutDocker = true)
@Sql("/search-fixtures.sql")
class GeoSearchApiTest {

    private static final String UF_LAT = "29.6487";
    private static final String UF_LNG = "-82.3433";

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:17");

    @Autowired
    private MockMvc mvc;

    @Test
    void sortsNearestFirstWithUnknownLocationsLast() throws Exception {
        mvc.perform(get("/api/listings/search")
                        .param("city", "Gainesville")
                        .param("lat", UF_LAT).param("lng", UF_LNG)
                        .param("sort", "distance"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.results[*].id").value(contains(1, 2, 6, 4, 3)))
                .andExpect(jsonPath("$.results[0].distanceMiles").value(closeTo(0.30, 0.01)))
                .andExpect(jsonPath("$.results[4].distanceMiles").value(nullValue()));
    }

    @Test
    void radiusKeepsOnlyNearbyListingsWithKnownLocations() throws Exception {
        mvc.perform(get("/api/listings/search")
                        .param("city", "Gainesville")
                        .param("lat", UF_LAT).param("lng", UF_LNG)
                        .param("radiusMiles", "3"))
                .andExpect(status().isOk())
                // default sort is still cheapest first
                .andExpect(jsonPath("$.results[*].id").value(contains(1, 6, 2)))
                .andExpect(jsonPath("$.totalResults").value(3));

        mvc.perform(get("/api/listings/search")
                        .param("city", "Gainesville")
                        .param("lat", UF_LAT).param("lng", UF_LNG)
                        .param("radiusMiles", "0.5"))
                .andExpect(jsonPath("$.results[*].id").value(contains(1)));
    }

    @Test
    void combinesRadiusWithOtherFilters() throws Exception {
        mvc.perform(get("/api/listings/search")
                        .param("city", "Gainesville")
                        .param("lat", UF_LAT).param("lng", UF_LNG)
                        .param("radiusMiles", "3")
                        .param("maxRent", "1000")
                        .param("sort", "distance"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.results[*].id").value(contains(1, 6)));
    }

    @Test
    void distanceIsNullWithoutALocation() throws Exception {
        mvc.perform(get("/api/listings/search").param("city", "Gainesville"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.results[0].distanceMiles").value(nullValue()));
    }

    @Test
    void rejectsIncompleteOrInvalidLocations() throws Exception {
        mvc.perform(get("/api/listings/search").param("city", "Gainesville").param("lat", UF_LAT))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors").value(hasItem("lat and lng must be provided together")));

        mvc.perform(get("/api/listings/search").param("city", "Gainesville").param("sort", "distance"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors").value(hasItem("sort=distance needs lat and lng")));

        mvc.perform(get("/api/listings/search").param("city", "Gainesville")
                        .param("lat", UF_LAT).param("lng", UF_LNG).param("radiusMiles", "500"))
                .andExpect(status().isBadRequest());

        mvc.perform(get("/api/listings/search").param("city", "Gainesville")
                        .param("lat", "north").param("lng", UF_LNG))
                .andExpect(status().isBadRequest());
    }
}
