package com.algorent.auth;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;

import org.springframework.dao.DuplicateKeyException;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Pattern;
import java.security.SecureRandom;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");

    private static final Pattern CODE_PATTERN = Pattern.compile("^\\d{6}$");

    private static final SecureRandom RANDOM = new SecureRandom();

    private final JdbcTemplate jdbc;
    private final JavaMailSender mailSender;

    private final PasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    public AuthController(JdbcTemplate jdbc, JavaMailSender mailSender) {
        this.jdbc = jdbc;
        this.mailSender = mailSender;
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
            return badRequest(
                    "A valid email is required."
            );
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

        String fullName =
                request.fullName().trim();

        String[] nameParts =
                fullName.split("\\s+", 2);

        String firstName =
                nameParts[0];

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

        Integer userId =
                jdbc.queryForObject(
                        """
                        SELECT id
                        FROM users
                        WHERE email = ?
                        """,
                        Integer.class,
                        email
                );

        sendVerificationCode(
                userId,
                email
        );

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(
                        Map.of(
                                "message",
                                "Verification code sent."
                        )
                );
    }

    @PostMapping("/verify")
    @Transactional
    public ResponseEntity<?> verify(
            @RequestBody VerifyRequest request
    ) {
        if (request.email() == null
                || !EMAIL_PATTERN.matcher(
                        request.email().trim()
                ).matches()
                || request.code() == null
                || !CODE_PATTERN.matcher(
                        request.code().trim()
                ).matches()) {

            return badRequest(
                    "Email and 6-digit verification code are required."
            );
        }

        String email = request.email()
                .trim()
                .toLowerCase(Locale.ROOT);

        Integer userId;

        try {
            userId = jdbc.queryForObject(
                    """
                    SELECT id
                    FROM users
                    WHERE email = ?
                    """,
                    Integer.class,
                    email
            );

        } catch (EmptyResultDataAccessException e) {
            return badRequest(
                    "Invalid or expired verification code."
            );
        }

        VerificationToken token;

        try {
            token = jdbc.queryForObject(
                    """
                    SELECT
                        id,
                        token_hash
                    FROM verification_tokens
                    WHERE user_id = ?
                      AND channel = 'EMAIL'
                      AND used_at IS NULL
                      AND expires_at > (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')
                    ORDER BY created_at DESC
                    LIMIT 1
                    """,
                    (rs, rowNum) ->
                            new VerificationToken(
                                    rs.getInt("id"),
                                    rs.getString(
                                            "token_hash"
                                    )
                            ),
                    userId
            );

        } catch (EmptyResultDataAccessException e) {
            return badRequest(
                    "Invalid or expired verification code."
            );
        }

        if (token == null
                || !passwordEncoder.matches(
                        request.code().trim(),
                        token.tokenHash()
                )) {

            return badRequest(
                    "Invalid or expired verification code."
            );
        }

        jdbc.update(
                """
                UPDATE verification_tokens
                SET used_at = CURRENT_TIMESTAMP
                WHERE id = ?
                """,
                token.id()
        );

        jdbc.update(
                """
                UPDATE users
                SET email_verified_at = CURRENT_TIMESTAMP
                WHERE id = ?
                """,
                userId
        );

        return ResponseEntity.ok(
                Map.of(
                        "message",
                        "Email verified."
                )
        );
    }

    @PostMapping("/resend")
    public ResponseEntity<?> resend(
            @RequestBody ResendRequest request
    ) {
        if (request.email() == null
                || !EMAIL_PATTERN.matcher(
                        request.email().trim()
                ).matches()) {

            return badRequest(
                    "A valid email is required."
            );
        }

        String email = request.email()
                .trim()
                .toLowerCase(Locale.ROOT);

        Integer userId;

        try {
            userId = jdbc.queryForObject(
                    """
                    SELECT id
                    FROM users
                    WHERE email = ?
                    """,
                    Integer.class,
                    email
            );

        } catch (EmptyResultDataAccessException e) {
            return badRequest(
                    "Account not found."
            );
        }

        sendVerificationCode(
                userId,
                email
        );

        return ResponseEntity.ok(
                Map.of(
                        "message",
                        "Verification code sent."
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
                        last_name,
                        email_verified_at
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
                                    ),
                                    rs.getObject(
                                            "email_verified_at",
                                            LocalDateTime.class
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

        if (user.emailVerifiedAt() == null) {
            return ResponseEntity
                    .status(HttpStatus.FORBIDDEN)
                    .body(
                            Map.of(
                                    "message",
                                    "Verify your email before signing in."
                            )
                    );
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

    private void sendVerificationCode(
            int userId,
            String email
    ) {
        String code =
                "%06d".formatted(
                        RANDOM.nextInt(1_000_000)
                );

        jdbc.update(
                """
                INSERT INTO verification_tokens
                (user_id, channel, token_hash, expires_at)
                VALUES (?, 'EMAIL', ?, (CURRENT_TIMESTAMP AT TIME ZONE 'UTC') + INTERVAL '10 minutes')
                """,
                userId,
                passwordEncoder.encode(code)
        );

        SimpleMailMessage message =
                new SimpleMailMessage();

        message.setTo(email);

        message.setSubject(
                "AlgoRent verification code"
        );

        message.setText(
                "Your AlgoRent verification code is: "
                        + code
        );

        mailSender.send(message);
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

    public record VerifyRequest(
            String email,
            String code
    ) {
    }

    public record ResendRequest(
            String email
    ) {
    }

    private record VerificationToken(
            int id,
            String tokenHash
    ) {
    }

    private record UserRow(
            int id,
            String email,
            String passwordHash,
            String firstName,
            String lastName,
            LocalDateTime emailVerifiedAt
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