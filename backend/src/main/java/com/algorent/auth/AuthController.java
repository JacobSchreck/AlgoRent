package com.algorent.auth;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;

import org.springframework.dao.DuplicateKeyException;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Locale;
import java.util.Map;
import java.util.regex.Pattern;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private static final Pattern EMAIL_PATTERN =
            Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");

    private final JdbcTemplate jdbc;
    private final PasswordEncoder passwordEncoder =
            new BCryptPasswordEncoder();

    public AuthController(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @PostMapping("/signup")
    public ResponseEntity<?> signup(
            @RequestBody SignupRequest request
    ) {
        if (request.fullName() == null
                || request.fullName().isBlank()) {
            return badRequest("Full name is required.");
        }

        if (request.email() == null
                || !EMAIL_PATTERN.matcher(
                        request.email().trim()
                ).matches()) {
            return badRequest("A valid email is required.");
        }

        if (request.password() == null
                || request.password().length() < 8) {
            return badRequest(
                    "Password must be at least 8 characters."
            );
        }

        String email = request.email()
                .trim()
                .toLowerCase(Locale.ROOT);

        String fullName = request.fullName().trim();

        String[] nameParts = fullName.split("\\s+", 2);

        String firstName = nameParts[0];

        String lastName =
                nameParts.length > 1
                        ? nameParts[1]
                        : null;

        if (firstName.length() > 100
                || (lastName != null
                    && lastName.length() > 100)
                || email.length() > 255) {
            return badRequest(
                    "Name or email is too long."
            );
        }

        String passwordHash =
                passwordEncoder.encode(
                        request.password()
                );

        try {
            jdbc.update(
                    """
                    INSERT INTO users
                        (
                            email,
                            password_hash,
                            first_name,
                            last_name
                        )
                    VALUES (?, ?, ?, ?)
                    """,
                    email,
                    passwordHash,
                    firstName,
                    lastName
            );

        } catch (DuplicateKeyException e) {
            return ResponseEntity
                    .status(HttpStatus.CONFLICT)
                    .body(
                            Map.of(
                                    "message",
                                    "An account with that email already exists."
                            )
                    );
        }

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(
                        Map.of(
                                "message",
                                "Account created successfully."
                        )
                );
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(
            @RequestBody LoginRequest request,
            HttpServletRequest httpRequest
    ) {
        if (request.email() == null
                || request.email().isBlank()
                || request.password() == null
                || request.password().isBlank()) {

            return badRequest(
                    "Email and password are required."
            );
        }

        String email = request.email()
                .trim()
                .toLowerCase(Locale.ROOT);

        UserRow user;

        try {
            user = jdbc.queryForObject(
                    """
                    SELECT
                        id,
                        email,
                        password_hash,
                        first_name,
                        last_name
                    FROM users
                    WHERE email = ?
                    """,
                    (rs, rowNum) ->
                            new UserRow(
                                    rs.getInt("id"),
                                    rs.getString("email"),
                                    rs.getString(
                                            "password_hash"
                                    ),
                                    rs.getString(
                                            "first_name"
                                    ),
                                    rs.getString(
                                            "last_name"
                                    )
                            ),
                    email
            );

        } catch (EmptyResultDataAccessException e) {
            return unauthorized();
        }

        if (user == null
                || !passwordEncoder.matches(
                        request.password(),
                        user.passwordHash()
                )) {
            return unauthorized();
        }

        HttpSession oldSession =
                httpRequest.getSession(false);

        if (oldSession != null) {
            oldSession.invalidate();
        }

        HttpSession session =
                httpRequest.getSession(true);

        session.setAttribute(
                "userId",
                user.id()
        );

        return ResponseEntity.ok(
                Map.of(
                        "message",
                        "Signed in successfully.",
                        "userId",
                        user.id(),
                        "email",
                        user.email()
                )
        );
    }

    @GetMapping("/me")
    public ResponseEntity<?> me(
            HttpServletRequest request
    ) {
        HttpSession session =
                request.getSession(false);

        if (session == null
                || session.getAttribute(
                        "userId"
                ) == null) {

            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body(
                            Map.of(
                                    "message",
                                    "Not signed in."
                            )
                    );
        }

        int userId =
                (Integer) session.getAttribute(
                        "userId"
                );

        try {
            UserProfile user =
                    jdbc.queryForObject(
                            """
                            SELECT
                                id,
                                email,
                                first_name,
                                last_name
                            FROM users
                            WHERE id = ?
                            """,
                            (rs, rowNum) ->
                                    new UserProfile(
                                            rs.getInt("id"),
                                            rs.getString(
                                                    "email"
                                            ),
                                            rs.getString(
                                                    "first_name"
                                            ),
                                            rs.getString(
                                                    "last_name"
                                            )
                                    ),
                            userId
                    );

            if (user == null) {
                session.invalidate();

                return ResponseEntity
                        .status(
                                HttpStatus.UNAUTHORIZED
                        )
                        .body(
                                Map.of(
                                        "message",
                                        "Not signed in."
                                )
                        );
            }

            return ResponseEntity.ok(user);

        } catch (
                EmptyResultDataAccessException e
        ) {
            session.invalidate();

            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body(
                            Map.of(
                                    "message",
                                    "Not signed in."
                            )
                    );
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(
            HttpServletRequest request
    ) {
        HttpSession session =
                request.getSession(false);

        if (session != null) {
            session.invalidate();
        }

        return ResponseEntity.ok(
                Map.of(
                        "message",
                        "Logged out."
                )
        );
    }

    private ResponseEntity<?> badRequest(
            String message
    ) {
        return ResponseEntity
                .badRequest()
                .body(
                        Map.of(
                                "message",
                                message
                        )
                );
    }

    private ResponseEntity<?> unauthorized() {
        return ResponseEntity
                .status(HttpStatus.UNAUTHORIZED)
                .body(
                        Map.of(
                                "message",
                                "Invalid email or password."
                        )
                );
    }

    public record SignupRequest(
            String fullName,
            String email,
            String password
    ) {
    }

    public record LoginRequest(
            String email,
            String password
    ) {
    }

    private record UserRow(
            int id,
            String email,
            String passwordHash,
            String firstName,
            String lastName
    ) {
    }

    public record UserProfile(
            int id,
            String email,
            String firstName,
            String lastName
    ) {
    }
}