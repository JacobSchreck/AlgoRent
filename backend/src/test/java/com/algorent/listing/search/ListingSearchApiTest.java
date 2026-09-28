package com.algorent.listing.search;

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
 * End-to-end test of GET /api/listings/search against a real Postgres (the same major version as
 * docker-compose.yml), with the Flyway migrations applied. Needs Docker; skipped when Docker is not
 * running. CI always runs it.
 *
 * <p>Fixture listings are described at the top of search-fixtures.sql.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers(disabledWithoutDocker = true)
@Sql("/search-fixtures.sql")
class ListingSearchApiTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:17");

    @Autowired
    private MockMvc mvc;

    @Test
    void cityOnlyReturnsActiveListingsCheapestFirstWithUnpricedLast() throws Exception {
        mvc.perform(get("/api/listings/search").param("city", "GAINESVILLE"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.results[*].id").value(contains(3, 1, 6, 2, 4)))
                .andExpect(jsonPath("$.totalResults").value(5))
                .andExpect(jsonPath("$.totalPages").value(1))
                .andExpect(jsonPath("$.page").value(0))
                .andExpect(jsonPath("$.size").value(20));
    }

    @Test
    void neverReturnsInactiveListings() throws Exception {
        mvc.perform(get("/api/listings/search").param("city", "Gainesville").param("size", "100"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.results[?(@.id == 5)]").isEmpty());
    }

    @Test
    void dateRangeKeepsListingsAvailableForTheWholeStayAndOpenEndedOnes() throws Exception {
        mvc.perform(get("/api/listings/search")
                        .param("city", "Gainesville")
                        .param("moveIn", "2027-05-20")
                        .param("moveOut", "2027-08-10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.results[*].id").value(contains(3, 1, 2, 4)));

        // Listing 2 ends Aug 15, so a stay through Aug 20 excludes it.
        mvc.perform(get("/api/listings/search")
                        .param("city", "Gainesville")
                        .param("moveIn", "2027-05-01")
                        .param("moveOut", "2027-08-20"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.results[*].id").value(contains(3, 1, 4)));
    }

    @Test
    void priceRangeExcludesUnpricedListings() throws Exception {
        mvc.perform(get("/api/listings/search")
                        .param("city", "Gainesville")
                        .param("minRent", "700")
                        .param("maxRent", "1000"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.results[*].id").value(contains(1, 6)));
    }

    @Test
    void combinesFeatureFilters() throws Exception {
        mvc.perform(get("/api/listings/search")
                        .param("city", "Gainesville")
                        .param("furnished", "true")
                        .param("minBedrooms", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.results[*].id").value(contains(3, 6, 4)));

        mvc.perform(get("/api/listings/search")
                        .param("city", "Gainesville")
                        .param("propertyType", "STUDIO"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.results[*].id").value(contains(1)));
    }

    @Test
    void pagesThroughResults() throws Exception {
        mvc.perform(get("/api/listings/search")
                        .param("city", "Gainesville")
                        .param("page", "1")
                        .param("size", "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.results[*].id").value(contains(6, 2)))
                .andExpect(jsonPath("$.totalResults").value(5))
                .andExpect(jsonPath("$.totalPages").value(3));
    }

    @Test
    void supportsOtherSortOrders() throws Exception {
        mvc.perform(get("/api/listings/search").param("city", "Gainesville").param("sort", "price_desc"))
                .andExpect(jsonPath("$.results[*].id").value(contains(2, 6, 1, 3, 4)));
        mvc.perform(get("/api/listings/search").param("city", "Gainesville").param("sort", "newest"))
                .andExpect(jsonPath("$.results[*].id").value(contains(6, 4, 3, 2, 1)));
        mvc.perform(get("/api/listings/search").param("city", "Gainesville").param("sort", "available_soonest"))
                .andExpect(jsonPath("$.results[*].id").value(contains(4, 1, 2, 6, 3)));
    }

    @Test
    void returnsListingFieldsAndFirstPhotoAsThumbnail() throws Exception {
        mvc.perform(get("/api/listings/search").param("city", "Gainesville").param("propertyType", "studio"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.results[0].title").value("Gainesville studio near UF"))
                .andExpect(jsonPath("$.results[0].monthlyRent").value(750.00))
                .andExpect(jsonPath("$.results[0].availableFrom").value("2027-05-01"))
                .andExpect(jsonPath("$.results[0].availableUntil").value("2027-08-31"))
                .andExpect(jsonPath("$.results[0].furnished").value(true))
                .andExpect(jsonPath("$.results[0].sourceName").value("Test Source"))
                .andExpect(jsonPath("$.results[0].sourceUrl").value("https://example.com/1"))
                .andExpect(jsonPath("$.results[0].thumbnailUrl").value("https://img.example.com/1-first.jpg"));

        mvc.perform(get("/api/listings/search").param("city", "Gainesville").param("propertyType", "room"))
                .andExpect(jsonPath("$.results[0].thumbnailUrl").value(nullValue()));
    }

    @Test
    void returnsEmptyPageForUnknownCity() throws Exception {
        mvc.perform(get("/api/listings/search").param("city", "Nowhere"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.results").isEmpty())
                .andExpect(jsonPath("$.totalResults").value(0))
                .andExpect(jsonPath("$.totalPages").value(0));
    }

    @Test
    void treatsSqlInCityAsPlainText() throws Exception {
        mvc.perform(get("/api/listings/search").param("city", "x' OR '1'='1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalResults").value(0));
    }

    @Test
    void rejectsInvalidParametersWithProblemDetail() throws Exception {
        mvc.perform(get("/api/listings/search").param("moveIn", "2027-08-01").param("moveOut", "2027-05-01"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.title").value("Invalid search"))
                .andExpect(jsonPath("$.errors").value(hasItem("city is required")))
                .andExpect(jsonPath("$.errors").value(hasItem("moveOut must be after moveIn")));
    }

    @Test
    void rejectsMalformedDatesAndNumbers() throws Exception {
        mvc.perform(get("/api/listings/search").param("city", "Gainesville").param("moveIn", "05/20/2027")
                        .param("moveOut", "2027-08-10"))
                .andExpect(status().isBadRequest());
        mvc.perform(get("/api/listings/search").param("city", "Gainesville").param("maxRent", "cheap"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void healthEndpointIsUp() throws Exception {
        mvc.perform(get("/actuator/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"));
    }
}
