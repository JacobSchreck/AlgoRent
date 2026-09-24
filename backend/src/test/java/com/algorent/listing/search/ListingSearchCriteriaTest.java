package com.algorent.listing.search;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;

class ListingSearchCriteriaTest {

    private static final LocalDate MAY_1 = LocalDate.of(2027, 5, 1);
    private static final LocalDate AUG_1 = LocalDate.of(2027, 8, 1);

    @Test
    void normalizesTextAndAppliesDefaults() {
        ListingSearchCriteria criteria = ListingSearchCriteria.of(
                "  Gainesville ", " FL ", null, null, null, null, " Studio ", "", null, null, null, null, null, null);

        assertThat(criteria.city()).isEqualTo("gainesville");
        assertThat(criteria.state()).isEqualTo("fl");
        assertThat(criteria.propertyType()).isEqualTo("studio");
        assertThat(criteria.listingType()).isNull();
        assertThat(criteria.sort()).isEqualTo(ListingSort.PRICE_ASC);
        assertThat(criteria.page()).isZero();
        assertThat(criteria.size()).isEqualTo(ListingSearchCriteria.DEFAULT_PAGE_SIZE);
    }

    @Test
    void acceptsAValidStayAndSortIgnoringCase() {
        ListingSearchCriteria criteria = ListingSearchCriteria.of(
                "Austin", null, MAY_1, AUG_1, new BigDecimal("500"), new BigDecimal("1500"),
                null, null, BigDecimal.ONE, true, false, " Price_Desc ", 2, 50);

        assertThat(criteria.moveIn()).isEqualTo(MAY_1);
        assertThat(criteria.moveOut()).isEqualTo(AUG_1);
        assertThat(criteria.sort()).isEqualTo(ListingSort.PRICE_DESC);
        assertThat(criteria.offset()).isEqualTo(100L);
    }

    @Test
    void requiresCity() {
        assertThatThrownBy(() -> ListingSearchCriteria.of(
                "   ", null, null, null, null, null, null, null, null, null, null, null, null, null))
                .isInstanceOfSatisfying(InvalidSearchException.class,
                        ex -> assertThat(ex.getErrors()).containsExactly("city is required"));
    }

    @Test
    void requiresBothDatesTogether() {
        assertThatThrownBy(() -> ListingSearchCriteria.of(
                "Austin", null, MAY_1, null, null, null, null, null, null, null, null, null, null, null))
                .isInstanceOfSatisfying(InvalidSearchException.class,
                        ex -> assertThat(ex.getErrors()).containsExactly("moveIn and moveOut must be provided together"));
    }

    @Test
    void rejectsMoveOutOnOrBeforeMoveIn() {
        assertThatThrownBy(() -> ListingSearchCriteria.of(
                "Austin", null, MAY_1, MAY_1, null, null, null, null, null, null, null, null, null, null))
                .isInstanceOfSatisfying(InvalidSearchException.class,
                        ex -> assertThat(ex.getErrors()).containsExactly("moveOut must be after moveIn"));
    }

    @Test
    void reportsEveryProblemAtOnce() {
        assertThatThrownBy(() -> ListingSearchCriteria.of(
                "Austin", null, null, null, new BigDecimal("900"), new BigDecimal("800"),
                null, null, new BigDecimal("-1"), null, null, "cheapest", -1, 101))
                .isInstanceOfSatisfying(InvalidSearchException.class, ex -> assertThat(ex.getErrors())
                        .containsExactly(
                                "minRent must not be greater than maxRent",
                                "minBedrooms must be 0 or more",
                                "sort must be one of: price_asc, price_desc, newest, available_soonest",
                                "page must be 0 or more",
                                "size must be between 1 and 100"));
    }

    @Test
    void rejectsNegativeRent() {
        assertThatThrownBy(() -> ListingSearchCriteria.of(
                "Austin", null, null, null, new BigDecimal("-5"), null, null, null, null, null, null, null, null, 0))
                .isInstanceOfSatisfying(InvalidSearchException.class, ex -> assertThat(ex.getErrors())
                        .containsExactly("minRent must be 0 or more", "size must be between 1 and 100"));
    }

    @Test
    void largePageNumberDoesNotOverflowOffset() {
        ListingSearchCriteria criteria = ListingSearchCriteria.of(
                "Austin", null, null, null, null, null, null, null, null, null, null, null, Integer.MAX_VALUE, 100);

        assertThat(criteria.offset()).isEqualTo(214_748_364_700L);
    }
}
