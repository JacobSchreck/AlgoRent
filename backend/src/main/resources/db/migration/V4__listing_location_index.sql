-- =========================
-- LOCATION SEARCH
-- Supports distance search (lat/lng/radiusMiles on GET /api/listings/search).
-- The search narrows rows with a latitude/longitude bounding box before computing exact
-- distances, and this index serves that box for active listings that have coordinates.
-- =========================

CREATE INDEX idx_listings_active_location
    ON listings (latitude, longitude)
    WHERE status = 'ACTIVE' AND latitude IS NOT NULL AND longitude IS NOT NULL;

-- Coordinates must be real points on Earth. NOT VALID: checked for new and updated rows
-- without failing on anything already loaded.
ALTER TABLE listings
    ADD CONSTRAINT listings_coordinates_valid
    CHECK (
        (latitude IS NULL OR latitude BETWEEN -90 AND 90)
        AND (longitude IS NULL OR longitude BETWEEN -180 AND 180)
    )
    NOT VALID;
