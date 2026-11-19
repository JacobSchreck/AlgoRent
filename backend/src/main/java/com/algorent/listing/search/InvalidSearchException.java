package com.algorent.listing.search;

import java.util.List;

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
