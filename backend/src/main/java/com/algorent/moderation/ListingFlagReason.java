package com.algorent.moderation;

import java.util.Locale;
import java.util.Optional;

public enum ListingFlagReason {
    SCAM,
    INACCURATE,
    UNAVAILABLE,
    DUPLICATE,
    INAPPROPRIATE,
    OTHER;

    public static Optional<ListingFlagReason> parse(String value) {
        if (value == null || value.isBlank()) {
            return Optional.empty();
        }
        try {
            return Optional.of(valueOf(value.trim().toUpperCase(Locale.ROOT)));
        } catch (IllegalArgumentException ignored) {
            return Optional.empty();
        }
    }
}
