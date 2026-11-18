package com.algorent.common;

import java.util.List;

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
