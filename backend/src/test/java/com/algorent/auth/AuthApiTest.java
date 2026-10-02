package com.algorent.auth;

import static org.hamcrest.Matchers.startsWith;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.context.jdbc.Sql;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

/**
 * Sign-up, login, current user and logout against a real Postgres.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers(disabledWithoutDocker = true)
@Sql("/reset-users.sql")
class AuthApiTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:17");

    private static final String SIGNUP_BODY = """
            {"fullName": "Test Guest", "email": "Guest@Example.com", "password": "correct-horse"}
            """;

    @Autowired
    private MockMvc mvc;

    @Autowired
    private JdbcTemplate jdbc;

    @Test
    void signUpCreatesAccountWithHashedPassword() throws Exception {
        signUp().andExpect(status().isCreated())
                .andExpect(jsonPath("$.message").value("Account created successfully."));

        String email = jdbc.queryForObject("SELECT email FROM users", String.class);
        String hash = jdbc.queryForObject("SELECT password_hash FROM users", String.class);
        assertThat(email).isEqualTo("guest@example.com");
        assertThat(hash).startsWith("$2").doesNotContain("correct-horse");
    }

    @Test
    void newAccountsStartUnverified() throws Exception {
        signUp().andExpect(status().isCreated());

        Integer unverified = jdbc.queryForObject(
                "SELECT count(*) FROM users WHERE email_verified_at IS NULL AND phone_verified_at IS NULL",
                Integer.class);
        assertThat(unverified).isEqualTo(1);
    }

    @Test
    void rejectsDuplicateEmailIgnoringCase() throws Exception {
        signUp().andExpect(status().isCreated());

        mvc.perform(post("/api/auth/signup").contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"fullName": "Someone Else", "email": "guest@example.com", "password": "another-pass"}
                                """))
                .andExpect(status().isConflict());
    }

    @Test
    void rejectsInvalidSignUps() throws Exception {
        mvc.perform(post("/api/auth/signup").contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"fullName": "Test", "email": "not-an-email", "password": "long-enough"}
                                """))
                .andExpect(status().isBadRequest());

        mvc.perform(post("/api/auth/signup").contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"fullName": "Test", "email": "a@b.com", "password": "short"}
                                """))
                .andExpect(status().isBadRequest());
    }

    @Test
    void wrongPasswordIsRejected() throws Exception {
        signUp().andExpect(status().isCreated());

        login("guest@example.com", "wrong-password").andExpect(status().isUnauthorized());
        login("nobody@example.com", "correct-horse").andExpect(status().isUnauthorized());
    }

    @Test
    void loginThenMeThenLogout() throws Exception {
        signUp().andExpect(status().isCreated());

        MvcResult loginResult = login("GUEST@example.com", "correct-horse")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("guest@example.com"))
                .andReturn();
        MockHttpSession session = (MockHttpSession) loginResult.getRequest().getSession(false);
        assertThat(session).isNotNull();

        mvc.perform(get("/api/auth/me").session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("guest@example.com"))
                .andExpect(jsonPath("$.firstName").value("Test"))
                .andExpect(jsonPath("$.lastName").value("Guest"));

        mvc.perform(post("/api/auth/logout").session(session))
                .andExpect(status().isOk());

        mvc.perform(get("/api/auth/me").session(session))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void meWithoutSessionIsUnauthorized() throws Exception {
        mvc.perform(get("/api/auth/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message", startsWith("Not signed in")));
    }

    private org.springframework.test.web.servlet.ResultActions signUp() throws Exception {
        return mvc.perform(post("/api/auth/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(SIGNUP_BODY));
    }

    private org.springframework.test.web.servlet.ResultActions login(String email, String password)
            throws Exception {
        return mvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\": \"" + email + "\", \"password\": \"" + password + "\"}"));
    }
}
