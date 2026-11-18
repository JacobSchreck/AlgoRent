CREATE TABLE saved_merge_stays (
    id BIGSERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    first_listing_id BIGINT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    second_listing_id BIGINT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    move_in DATE NOT NULL,
    move_out DATE NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT merge_distinct_listings CHECK (first_listing_id <> second_listing_id),
    CONSTRAINT merge_valid_dates CHECK (move_in < move_out),
    CONSTRAINT merge_unique_pair UNIQUE (user_id, first_listing_id, second_listing_id, move_in, move_out)
);
