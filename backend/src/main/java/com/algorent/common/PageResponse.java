package com.algorent.common;

import java.util.List;

/**
 * A page of results plus what the UI needs for paging controls. Pages are numbered from 0.
 */
public record PageResponse<T>(
        List<T> results,
        int page,
        int size,
        long totalResults,
        int totalPages) {

    public static <T> PageResponse<T> of(List<T> results, int page, int size, long totalResults) {
        int totalPages = (int) Math.ceil((double) totalResults / size);
        return new PageResponse<>(List.copyOf(results), page, size, totalResults, totalPages);
    }
}
