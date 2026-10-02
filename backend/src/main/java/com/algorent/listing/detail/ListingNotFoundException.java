package com.algorent.listing.detail;

public class ListingNotFoundException extends RuntimeException {

    public ListingNotFoundException(long id) {
        super("No listing with id " + id);
    }
}
