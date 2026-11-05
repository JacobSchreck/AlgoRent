package com.algorent.moderation;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.context.jdbc.Sql;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers(disabledWithoutDocker = true)
@Sql("/search-fixtures.sql")
class ListingFlagApiTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:17");

    @Autowired
    private MockMvc mvc;

    @Test
    void signedInUserCanSubmitOnePendingReportPerListing() throws Exception {
        MockHttpSession reporter = sessionFor(1);
        String body = """
                {"reason":"SCAM","details":"The contact asks for payment off-platform."}
                """;

        mvc.perform(post("/api/listings/1/flags")
                        .session(reporter)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.message").value("Report submitted for review."));

        mvc.perform(post("/api/listings/1/flags")
                        .session(reporter)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isConflict());
    }

    @Test
    void reportRequiresAuthenticationAndAValidReason() throws Exception {
        mvc.perform(post("/api/listings/1/flags")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"SCAM\"}"))
                .andExpect(status().isUnauthorized());

        mvc.perform(post("/api/listings/1/flags")
                        .session(sessionFor(1))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"NOT_A_REASON\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void adminCanResolveAReportAndHideTheFlaggedListing() throws Exception {
        mvc.perform(post("/api/listings/1/flags")
                        .session(sessionFor(1))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"INACCURATE\",\"details\":\"Wrong rent\"}"))
                .andExpect(status().isCreated());

        mvc.perform(get("/api/moderation/flags").session(sessionFor(2)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].listingId").value(1))
                .andExpect(jsonPath("$[0].listingTitle").value("Gainesville studio near UF"))
                .andExpect(jsonPath("$[0].reason").value("INACCURATE"))
                .andExpect(jsonPath("$[0].reporterEmail").value("reporter@example.com"));

        mvc.perform(patch("/api/moderation/flags/1")
                        .session(sessionFor(2))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"APPROVED\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("APPROVED"));

        mvc.perform(get("/api/moderation/flags").session(sessionFor(2)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));

        mvc.perform(get("/api/listings/1"))
                .andExpect(status().isNotFound());

        mvc.perform(get("/api/listings/search").param("city", "Gainesville"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.results[?(@.id == 1)]").isEmpty());
    }

    @Test
    void regularUserCannotOpenTheAdminQueue() throws Exception {
        mvc.perform(get("/api/moderation/flags").session(sessionFor(1)))
                .andExpect(status().isForbidden());
    }

    private static MockHttpSession sessionFor(int userId) {
        MockHttpSession session = new MockHttpSession();
        session.setAttribute("userId", userId);
        return session;
    }
}
