package com.algorent.listing.search;

import java.util.List;

/**
 * Thrown when search parameters fail validation. Carries every problem found, not just the first,
 * so the front end can show them all at once.
 */
public class InvalidSearchException extends RuntimeException {

    private final List<String> errors;

    public InvalidSearchException(List<String> errors) {
        super(String.join("; ", errors));
        this.errors = List.copyOf(errors);
    }

    public List<String> getErrors() {
        return errors;
    }
}
