-- Saved listings move from the browser into the user's account.
-- The favorites table already links a user to a listing; this adds the column the
-- Saved page shows (which stage the user is at) and the notes they keep on each place.

ALTER TABLE favorites
    ADD COLUMN status VARCHAR(30) NOT NULL DEFAULT 'Interested',
    ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD CONSTRAINT favorites_status_valid
        CHECK (status IN ('Interested', 'Messaged host', 'Toured', 'Applied'));

-- Notes a user writes about one saved listing, for example what the host said.
-- They are deleted with the saved listing.
CREATE TABLE favorite_notes (
    id SERIAL PRIMARY KEY,

    user_id INTEGER NOT NULL,
    listing_id INTEGER NOT NULL,

    display_order INTEGER NOT NULL,
    body TEXT NOT NULL,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id, listing_id)
        REFERENCES favorites (user_id, listing_id)
        ON DELETE CASCADE,

    CONSTRAINT favorite_notes_body_length
        CHECK (char_length(body) BETWEEN 1 AND 2000)
);

CREATE INDEX idx_favorite_notes_saved_listing
    ON favorite_notes (user_id, listing_id, display_order);
