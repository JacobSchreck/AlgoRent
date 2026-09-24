-- =========================
-- INQUIRIES
-- A guest's request about one listing for one date range.
-- The status column drives the "status board" that tracks each conversation to a decision.
-- Hosts are not AlgoRent users (listings come from other sites), so an inquiry belongs to the guest only.
-- =========================

CREATE TABLE inquiries (
    id SERIAL PRIMARY KEY,

    user_id INTEGER NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    listing_id INTEGER NOT NULL
        REFERENCES listings(id)
        ON DELETE CASCADE,

    requested_from DATE NOT NULL,
    requested_until DATE NOT NULL,

    status VARCHAR(30) NOT NULL DEFAULT 'DRAFT',

    notes TEXT,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT inquiries_dates_ordered
        CHECK (requested_until > requested_from),

    CONSTRAINT inquiries_status_valid
        CHECK (status IN ('DRAFT', 'SENT', 'REPLIED', 'ACCEPTED', 'DECLINED', 'WITHDRAWN'))
);

CREATE INDEX idx_inquiries_user ON inquiries (user_id);
CREATE INDEX idx_inquiries_listing ON inquiries (listing_id);


-- =========================
-- MESSAGES
-- The in-app record of what the guest sent to, and received from, the host.
-- direction: OUTBOUND = guest -> host, INBOUND = host -> guest.
-- =========================

CREATE TABLE messages (
    id SERIAL PRIMARY KEY,

    inquiry_id INTEGER NOT NULL
        REFERENCES inquiries(id)
        ON DELETE CASCADE,

    direction VARCHAR(10) NOT NULL,
    body TEXT NOT NULL,

    -- When the message was actually sent or received, which can be earlier than when it was logged.
    sent_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT messages_direction_valid
        CHECK (direction IN ('OUTBOUND', 'INBOUND'))
);

CREATE INDEX idx_messages_inquiry_sent ON messages (inquiry_id, sent_at);


-- =========================
-- LISTING DATA INTEGRITY
-- NOT VALID: enforced for new and updated rows without failing on rows the scraper already loaded.
-- =========================

ALTER TABLE listings
    ADD CONSTRAINT listings_availability_ordered
    CHECK (available_until IS NULL OR available_from IS NULL OR available_until >= available_from)
    NOT VALID;


-- =========================
-- SEARCH INDEXES
-- Support GET /api/listings/search (city first, then dates and price).
-- =========================

CREATE INDEX idx_listings_active_city_availability
    ON listings (lower(city), available_from, available_until)
    WHERE status = 'ACTIVE';

CREATE INDEX idx_listings_active_city_rent
    ON listings (lower(city), monthly_rent)
    WHERE status = 'ACTIVE';

-- Thumbnail lookup (first image by display_order) and favorites by listing.
CREATE INDEX idx_listing_images_listing_order ON listing_images (listing_id, display_order);
CREATE INDEX idx_favorites_listing ON favorites (listing_id);
