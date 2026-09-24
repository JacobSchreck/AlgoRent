-- =========================
-- USERS
-- =========================

CREATE TABLE users (
    id SERIAL PRIMARY KEY,

    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,

    first_name VARCHAR(100),
    last_name VARCHAR(100),

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- =========================
-- SOURCES
-- =========================

CREATE TABLE sources (
    id SERIAL PRIMARY KEY,

    name VARCHAR(150) NOT NULL UNIQUE,
    base_url TEXT,
    source_type VARCHAR(50),

    enabled BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- =========================
-- LISTINGS
-- =========================

CREATE TABLE listings (
    id SERIAL PRIMARY KEY,

    -- Where we found the listing
    source_id INTEGER NOT NULL
        REFERENCES sources(id),

    external_id TEXT,
    source_url TEXT NOT NULL,

    -- Basic listing information
    title TEXT NOT NULL,
    description TEXT,

    property_type VARCHAR(50),
    listing_type VARCHAR(50),

    -- Pricing
    monthly_rent NUMERIC(10,2),
    security_deposit NUMERIC(10,2),

    -- Property details
    bedrooms NUMERIC(3,1),
    bathrooms NUMERIC(3,1),
    square_feet INTEGER,

    -- Location
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(50),
    zip_code VARCHAR(20),

    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,

    -- Availability
    available_from DATE,
    available_until DATE,

    -- Features
    furnished BOOLEAN,
    utilities_included BOOLEAN,
    parking_available BOOLEAN,
    laundry_available BOOLEAN,
    pets_allowed BOOLEAN,

    -- Contact information if available
    contact_name VARCHAR(150),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),

    -- Listing state
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',

    -- Tracking scraper freshness
    first_seen_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_seen_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(source_id, external_id)
);


-- =========================
-- FAVORITES
-- =========================

CREATE TABLE favorites (
    user_id INTEGER NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    listing_id INTEGER NOT NULL
        REFERENCES listings(id)
        ON DELETE CASCADE,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (user_id, listing_id)
);


-- =========================
-- LISTING IMAGES
-- =========================

CREATE TABLE listing_images (
    id SERIAL PRIMARY KEY,

    listing_id INTEGER NOT NULL
        REFERENCES listings(id)
        ON DELETE CASCADE,

    image_url TEXT NOT NULL,

    display_order INTEGER DEFAULT 0
);