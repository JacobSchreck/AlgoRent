package com.algorent.auth;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Component;

/**
 * Blocks sign-in for an email after 5 wrong passwords in 15 minutes, so passwords can't be
 * guessed quickly. Kept in memory, so it resets when the backend restarts.
 */
@Component
public class LoginAttemptLimiter {

    static final int MAX_FAILURES = 5;
    static final Duration WINDOW = Duration.ofMinutes(15);
    private static final int MAX_TRACKED_EMAILS = 10_000;

    private final Map<String, Failures> failures = new ConcurrentHashMap<>();

    public boolean isBlocked(String email) {
        Failures current = failures.get(email);
        if (current == null) {
            return false;
        }
        if (current.isExpired(Instant.now())) {
            failures.remove(email, current);
            return false;
        }
        return current.count() >= MAX_FAILURES;
    }

    public void recordFailure(String email) {
        Instant now = Instant.now();
        failures.compute(email, (key, current) ->
                current == null || current.isExpired(now)
                        ? new Failures(1, now)
                        : new Failures(current.count() + 1, current.firstFailure()));

        // don't let the map grow forever if someone tries lots of different emails
        if (failures.size() > MAX_TRACKED_EMAILS) {
            failures.values().removeIf(entry -> entry.isExpired(now));
        }
    }

    public void recordSuccess(String email) {
        failures.remove(email);
    }

    /** For tests. */
    void clear() {
        failures.clear();
    }

    private record Failures(int count, Instant firstFailure) {
        boolean isExpired(Instant now) {
            return firstFailure.plus(WINDOW).isBefore(now);
        }
    }
}
