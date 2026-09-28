package com.algorent.backend;

import java.util.Map;

import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "http://localhost:3000")
public class AuthController {

    private final JdbcTemplate jdbc;
    private final BCryptPasswordEncoder passwordEncoder =
            new BCryptPasswordEncoder();

    public AuthController(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @PostMapping("/signup")
    public ResponseEntity<?> signup(@RequestBody SignupRequest request) {

        if (request.fullName() == null || request.fullName().isBlank()
                || request.email() == null || request.email().isBlank()
                || request.password() == null || request.password().isBlank()) {

            return ResponseEntity.badRequest()
                    .body(Map.of("message", "All fields are required."));
        }

        String email = request.email().trim().toLowerCase();

        Integer count = jdbc.queryForObject(
                "SELECT COUNT(*) FROM users WHERE email = ?",
                Integer.class,
                email
        );

        if (count != null && count > 0) {
            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message",
                            "An account with this email already exists."
                    ));
        }

        String[] nameParts =
                request.fullName().trim().split("\\s+", 2);

        String firstName = nameParts[0];
        String lastName =
                nameParts.length > 1 ? nameParts[1] : "";

        String passwordHash =
                passwordEncoder.encode(request.password());

        jdbc.update(
                """
                INSERT INTO users
                    (email, password_hash, first_name, last_name)
                VALUES (?, ?, ?, ?)
                """,
                email,
                passwordHash,
                firstName,
                lastName
        );

        return ResponseEntity.ok(
                Map.of("message", "Account created successfully.")
        );
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {

        if (request.email() == null || request.email().isBlank()
                || request.password() == null || request.password().isBlank()) {

            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message",
                            "Email and password are required."
                    ));
        }

        String email = request.email().trim().toLowerCase();

        try {
            UserRow user = jdbc.queryForObject(
                    """
                    SELECT id, email, password_hash
                    FROM users
                    WHERE email = ?
                    """,
                    (result, rowNum) -> new UserRow(
                            result.getInt("id"),
                            result.getString("email"),
                            result.getString("password_hash")
                    ),
                    email
            );

            if (user == null
                    || !passwordEncoder.matches(
                            request.password(),
                            user.passwordHash())) {

                return ResponseEntity.status(401)
                        .body(Map.of(
                                "message",
                                "Invalid email or password."
                        ));
            }

            return ResponseEntity.ok(
                    Map.of(
                            "message", "Login successful.",
                            "userId", user.id(),
                            "email", user.email()
                    )
            );

        } catch (EmptyResultDataAccessException exception) {

            return ResponseEntity.status(401)
                    .body(Map.of(
                            "message",
                            "Invalid email or password."
                    ));
        }
    }

    public record SignupRequest(
            String fullName,
            String email,
            String password
    ) {}

    public record LoginRequest(
            String email,
            String password
    ) {}

    private record UserRow(
            int id,
            String email,
            String passwordHash
    ) {}
}