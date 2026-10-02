-- =========================
-- ACCOUNT VERIFICATION
-- Supports the Sprint 2 goal of "a verified test account" and the
-- email / phone verification tiers in the architecture.
-- A NULL *_verified_at means "not verified yet".
-- =========================

ALTER TABLE users
    ADD COLUMN email_verified_at TIMESTAMP,
    ADD COLUMN phone VARCHAR(30),
    ADD COLUMN phone_verified_at TIMESTAMP;


-- =========================
-- VERIFICATION TOKENS
-- One row per code or link sent to a user.
-- Store only a hash of the token (e.g. SHA-256 hex), never the token itself,
-- so a database leak cannot be used to verify accounts.
-- =========================

CREATE TABLE verification_tokens (
    id SERIAL PRIMARY KEY,

    user_id INTEGER NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    channel VARCHAR(10) NOT NULL,

    token_hash VARCHAR(128) NOT NULL UNIQUE,

    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT verification_tokens_channel_valid
        CHECK (channel IN ('EMAIL', 'PHONE'))
);

CREATE INDEX idx_verification_tokens_user ON verification_tokens (user_id, channel);
