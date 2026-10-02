package com.algorent.listing.detail;

import static org.hamcrest.Matchers.contains;
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
 * GET /api/listings/{id} against a real Postgres. Uses the same fixture listings as the search
 * tests (see search-fixtures.sql).
 */
@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers(disabledWithoutDocker = true)
@Sql("/search-fixtures.sql")
class ListingDetailApiTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:17");

    @Autowired
    private MockMvc mvc;

    @Test
    void returnsListingWithAllPhotosInDisplayOrder() throws Exception {
        mvc.perform(get("/api/listings/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.title").value("Gainesville studio near UF"))
                .andExpect(jsonPath("$.city").value("Gainesville"))
                .andExpect(jsonPath("$.state").value("FL"))
                .andExpect(jsonPath("$.monthlyRent").value(750.00))
                .andExpect(jsonPath("$.availableFrom").value("2027-05-01"))
                .andExpect(jsonPath("$.availableUntil").value("2027-08-31"))
                .andExpect(jsonPath("$.furnished").value(true))
                .andExpect(jsonPath("$.status").value("ACTIVE"))
                .andExpect(jsonPath("$.sourceName").value("Test Source"))
                .andExpect(jsonPath("$.sourceUrl").value("https://example.com/1"))
                .andExpect(jsonPath("$.imageUrls").value(contains(
                        "https://img.example.com/1-first.jpg",
                        "https://img.example.com/1-second.jpg")));
    }

    @Test
    void returnsEmptyPhotoListWhenListingHasNone() throws Exception {
        mvc.perform(get("/api/listings/3"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.imageUrls").isEmpty());
    }

    @Test
    void stillReturnsRemovedListingsWithTheirStatus() throws Exception {
        mvc.perform(get("/api/listings/5"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("REMOVED"));
    }

    @Test
    void returns404ForUnknownListing() throws Exception {
        mvc.perform(get("/api/listings/9999"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.title").value("Listing not found"));
    }

    @Test
    void returns400ForNonNumericId() throws Exception {
        mvc.perform(get("/api/listings/abc"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void searchPathIsNotMistakenForAnId() throws Exception {
        mvc.perform(get("/api/listings/search").param("city", "Gainesville"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalResults").value(5));
    }
}
