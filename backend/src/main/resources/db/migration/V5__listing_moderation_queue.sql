-- Roles gate access to the moderation queue. Existing accounts remain regular users.
ALTER TABLE users
    ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'USER',
    ADD CONSTRAINT users_role_valid
        CHECK (role IN ('USER', 'ADMIN'));

ALTER TABLE listings
    ADD COLUMN flagged BOOLEAN NOT NULL DEFAULT FALSE;

-- One row per user report. Listing metadata stays on listings; this table records
-- why it was flagged and the review outcome.
CREATE TABLE listing_flags (
    id SERIAL PRIMARY KEY,

    listing_id INTEGER NOT NULL
        REFERENCES listings(id)
        ON DELETE CASCADE,

    reporter_user_id INTEGER
        REFERENCES users(id)
        ON DELETE SET NULL,

    reason VARCHAR(30) NOT NULL,
    details TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',

    decided_at TIMESTAMP,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT listing_flags_reason_valid
        CHECK (reason IN (
            'SCAM', 'INACCURATE', 'UNAVAILABLE',
            'DUPLICATE', 'INAPPROPRIATE', 'OTHER'
        )),
    CONSTRAINT listing_flags_status_valid
        CHECK (status IN ('PENDING', 'APPROVED', 'DISMISSED')),
    CONSTRAINT listing_flags_details_length
        CHECK (details IS NULL OR char_length(details) <= 1000),
    CONSTRAINT listing_flags_decision_consistent
        CHECK (
            (status = 'PENDING' AND decided_at IS NULL)
            OR
            (status <> 'PENDING' AND decided_at IS NOT NULL)
        )
);

-- A user cannot put the same listing into the pending queue more than once.
CREATE UNIQUE INDEX uq_listing_flags_pending_reporter
    ON listing_flags (listing_id, reporter_user_id)
    WHERE status = 'PENDING' AND reporter_user_id IS NOT NULL;

CREATE INDEX idx_listing_flags_pending_created
    ON listing_flags (created_at)
    WHERE status = 'PENDING';

