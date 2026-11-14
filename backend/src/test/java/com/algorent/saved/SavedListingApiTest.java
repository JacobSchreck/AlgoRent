package com.algorent.saved;

import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
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

/**
 * Saved listings API against a real Postgres. Uses the users and listings from
 * search-fixtures.sql: user 1 is a regular user, user 2 is the admin.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers(disabledWithoutDocker = true)
@Sql("/search-fixtures.sql")
class SavedListingApiTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:17");

    @Autowired
    private MockMvc mvc;

    @Test
    void everyEndpointRequiresSignIn() throws Exception {
        mvc.perform(get("/api/saved"))
                .andExpect(status().isUnauthorized());
        mvc.perform(put("/api/saved/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"Interested\",\"notes\":[]}"))
                .andExpect(status().isUnauthorized());
        mvc.perform(delete("/api/saved/1"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void savingAListingAddsItToTheUsersList() throws Exception {
        MockHttpSession user = sessionFor(1);

        mvc.perform(get("/api/saved").session(user))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));

        mvc.perform(put("/api/saved/1")
                        .session(user)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"Interested\",\"notes\":[]}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.status").value("Interested"))
                .andExpect(jsonPath("$.notes", hasSize(0)));

        mvc.perform(get("/api/saved").session(user))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].id").value(1))
                .andExpect(jsonPath("$[0].status").value("Interested"));
    }

    @Test
    void savingAgainReplacesStatusAndNotesAndKeepsNoteOrder() throws Exception {
        MockHttpSession user = sessionFor(1);

        mvc.perform(put("/api/saved/2")
                        .session(user)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"Interested\",\"notes\":[\"old note\"]}"))
                .andExpect(status().isOk());

        // The empty note is dropped, like the Saved page does.
        mvc.perform(put("/api/saved/2")
                        .session(user)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"status":"Messaged host","notes":["Host replied Tuesday","  ","Tour on Friday at 3"]}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.notes", hasSize(2)));

        mvc.perform(get("/api/saved").session(user))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].id").value(2))
                .andExpect(jsonPath("$[0].status").value("Messaged host"))
                .andExpect(jsonPath("$[0].notes").value(contains("Host replied Tuesday", "Tour on Friday at 3")));
    }

    @Test
    void statusDefaultsToInterestedWhenLeftOut() throws Exception {
        mvc.perform(put("/api/saved/1")
                        .session(sessionFor(1))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("Interested"))
                .andExpect(jsonPath("$.notes", hasSize(0)));
    }

    @Test
    void usersOnlySeeTheirOwnSavedListings() throws Exception {
        mvc.perform(put("/api/saved/1")
                        .session(sessionFor(1))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"Toured\",\"notes\":[\"mine\"]}"))
                .andExpect(status().isOk());
        mvc.perform(put("/api/saved/7")
                        .session(sessionFor(2))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"Applied\",\"notes\":[]}"))
                .andExpect(status().isOk());

        mvc.perform(get("/api/saved").session(sessionFor(1)))
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].id").value(1));
        mvc.perform(get("/api/saved").session(sessionFor(2)))
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].id").value(7));

        // Removing listing 1 as user 2 must not touch user 1's copy.
        mvc.perform(delete("/api/saved/1").session(sessionFor(2)))
                .andExpect(status().isNoContent());
        mvc.perform(get("/api/saved").session(sessionFor(1)))
                .andExpect(jsonPath("$", hasSize(1)));
    }

    @Test
    void removingASavedListingAlsoRemovesItsNotes() throws Exception {
        MockHttpSession user = sessionFor(1);

        mvc.perform(put("/api/saved/1")
                        .session(user)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"Interested\",\"notes\":[\"a note\"]}"))
                .andExpect(status().isOk());

        mvc.perform(delete("/api/saved/1").session(user))
                .andExpect(status().isNoContent());
        // Removing something that is not saved is fine too.
        mvc.perform(delete("/api/saved/1").session(user))
                .andExpect(status().isNoContent());

        mvc.perform(get("/api/saved").session(user))
                .andExpect(jsonPath("$", hasSize(0)));

        // Saving it again starts with no notes.
        mvc.perform(put("/api/saved/1")
                        .session(user)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"Interested\"}"))
                .andExpect(status().isOk());
        mvc.perform(get("/api/saved").session(user))
                .andExpect(jsonPath("$[0].notes", hasSize(0)));
    }

    @Test
    void rejectsUnknownListingsBadStatusesAndOversizedNotes() throws Exception {
        MockHttpSession user = sessionFor(1);

        mvc.perform(put("/api/saved/9999")
                        .session(user)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"Interested\",\"notes\":[]}"))
                .andExpect(status().isNotFound());

        mvc.perform(put("/api/saved/1")
                        .session(user)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"Moved in\",\"notes\":[]}"))
                .andExpect(status().isBadRequest());

        String longNote = "x".repeat(2001);
        mvc.perform(put("/api/saved/1")
                        .session(user)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"Interested\",\"notes\":[\"" + longNote + "\"]}"))
                .andExpect(status().isBadRequest());

        mvc.perform(get("/api/saved").session(user))
                .andExpect(jsonPath("$", hasSize(0)));
    }

    private static MockHttpSession sessionFor(int userId) {
        MockHttpSession session = new MockHttpSession();
        session.setAttribute("userId", userId);
        return session;
    }
}
